import type { PresentationState } from './match-presentation';
import type { GameState, TimingQuality } from './physics';

export const BENCH_AUDIO_DURATION = 10;

export type BenchVoiceSpeaker = 'coach' | 'player-a' | 'player-b';
export type BenchVoiceMood = 'calm' | 'tense' | 'frustrated';

export type PresentationAudioCue =
  | {
      kind: 'bench-voice';
      key: string;
      speaker: BenchVoiceSpeaker;
      mood: BenchVoiceMood;
      variant: 0 | 1 | 2;
      /** Stereo position, already normalized to -1..1. */
      pan: number;
      /** Bounded expressive level, normalized to 0..1. */
      intensity: number;
    }
  | {
      kind: 'smash-exhale';
      key: string;
      x: number;
      intensity: number;
    };

export interface SmashAudioContact {
  playerId: number;
  time: number;
  shot: GameState['lastShot'];
  x: number;
  quality?: TimingQuality;
  /** Optional physical or input power, normalized to 0..1. */
  power?: number;
}

export interface PresentationAudioFrame {
  presentation: PresentationState | null;
  contact?: SmashAudioContact | null;
  /** False consumes cues silently, preventing catch-up bursts after unmuting. */
  enabled?: boolean;
  /** Paused scenes keep their bench cursor while current contacts stay silent. */
  paused?: boolean;
}

type BenchTurn = {
  at: number;
  speaker: BenchVoiceSpeaker;
  variant: 0 | 1 | 2;
  pan: number;
};

/** Short alternating turns remain inside the exact ten-second bench phase. */
export const BENCH_AUDIO_TURNS: readonly BenchTurn[] = [
  { at: 0.75, speaker: 'coach', variant: 0, pan: 0.35 },
  { at: 2.15, speaker: 'player-a', variant: 0, pan: 0.16 },
  { at: 3.65, speaker: 'coach', variant: 1, pan: 0.35 },
  { at: 5.2, speaker: 'player-b', variant: 1, pan: 0.52 },
  { at: 6.9, speaker: 'coach', variant: 2, pan: 0.35 },
  { at: 8.25, speaker: 'player-a', variant: 2, pan: 0.16 },
];

const clamp = (value: number) => Math.max(0, Math.min(1, value));

function moodFor(presentation: PresentationState): BenchVoiceMood {
  const focus = presentation.focusTeam ?? 0;
  const stress = Math.max(
    presentation.frustration[focus],
    presentation.lebronIntensity,
  );
  return stress >= 0.65 ? 'frustrated' : stress >= 0.32 ? 'tense' : 'calm';
}

function intensityFor(presentation: PresentationState): number {
  const focus = presentation.focusTeam ?? 0;
  const stress = Math.max(
    presentation.frustration[focus],
    presentation.lebronIntensity,
  );
  return 0.38 + clamp(stress) * 0.24;
}

function exhaleIntensity(contact: SmashAudioContact): number {
  if (contact.power !== undefined) return 0.42 + clamp(contact.power) * 0.28;
  return contact.quality === 'perfect'
    ? 0.7
    : contact.quality === 'late'
      ? 0.5
      : 0.6;
}

/** Pure cue scheduler. It never touches Web Audio, timers or match state. */
export class PresentationAudioScheduler {
  private emitted = new Set<string>();
  private closedBenches = new Set<string>();
  private activeBench: string | null = null;

  reset(): void {
    this.emitted.clear();
    this.closedBenches.clear();
    this.activeBench = null;
  }

  update(frame: PresentationAudioFrame): PresentationAudioCue[] {
    const enabled = frame.enabled ?? true;
    const paused = frame.paused ?? false;
    const cues: PresentationAudioCue[] = [];
    const presentation = frame.presentation;
    const benchKey =
      presentation?.phase === 'bench' ? `bench:${presentation.id}` : null;

    if (this.activeBench && this.activeBench !== benchKey) {
      this.closedBenches.add(this.activeBench);
      this.activeBench = null;
    }

    if (benchKey && !this.closedBenches.has(benchKey)) {
      this.activeBench = benchKey;
      if (!paused) {
        const elapsed = clamp(presentation!.progress) * BENCH_AUDIO_DURATION;
        const mood = moodFor(presentation!);
        const intensity = intensityFor(presentation!);
        BENCH_AUDIO_TURNS.forEach((turn, index) => {
          if (turn.at > elapsed) return;
          const key = `${benchKey}:turn:${index}`;
          if (this.emitted.has(key)) return;
          this.emitted.add(key);
          if (enabled)
            cues.push({
              kind: 'bench-voice',
              key,
              speaker: turn.speaker,
              mood,
              variant: turn.variant,
              pan: turn.pan,
              intensity,
            });
        });
      }
    }

    const contact = frame.contact;
    if (contact?.shot === 'remate') {
      const key = `smash:${contact.playerId}:${contact.time}`;
      if (!this.emitted.has(key)) {
        this.emitted.add(key);
        if (enabled && !paused)
          cues.push({
            kind: 'smash-exhale',
            key,
            x: contact.x,
            intensity: exhaleIntensity(contact),
          });
      }
    }

    return cues;
  }
}
