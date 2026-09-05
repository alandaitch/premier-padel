import test from 'node:test';
import assert from 'node:assert/strict';
import type { PresentationState } from './match-presentation';
import {
  BENCH_AUDIO_TURNS,
  PresentationAudioScheduler,
  type PresentationAudioCue,
} from './presentation-audio';

function bench(
  progress: number,
  id = 7,
  frustration: [number, number] = [0.2, 0.2],
): PresentationState {
  return {
    id,
    phase: 'bench',
    progress,
    winnerTeam: 0,
    focusTeam: 0,
    frustration,
    lebronIntensity: 0,
    dialogue: '',
    changeEnds: true,
  };
}

const voices = (cues: PresentationAudioCue[]) =>
  cues.filter((cue) => cue.kind === 'bench-voice');

void test('bench cues alternate for ten seconds and never duplicate', () => {
  const scheduler = new PresentationAudioScheduler();
  const cues: PresentationAudioCue[] = [];
  for (const turn of BENCH_AUDIO_TURNS) {
    const frame = bench(turn.at / 10 + 0.001);
    cues.push(...scheduler.update({ presentation: frame }));
    assert.deepEqual(scheduler.update({ presentation: frame }), []);
  }
  assert.deepEqual(
    voices(cues).map((cue) => cue.speaker),
    ['coach', 'player-a', 'coach', 'player-b', 'coach', 'player-a'],
  );
  assert.equal(new Set(cues.map((cue) => cue.key)).size, 6);
  assert.deepEqual(scheduler.update({ presentation: bench(1) }), []);
});

void test('pause freezes turns and muted frames consume them silently', () => {
  const scheduler = new PresentationAudioScheduler();
  assert.deepEqual(
    scheduler.update({ presentation: bench(0.07), paused: true }),
    [],
  );
  assert.equal(
    voices(scheduler.update({ presentation: bench(0.08) })).length,
    1,
  );
  assert.deepEqual(
    scheduler.update({ presentation: bench(0.4), enabled: false }),
    [],
  );
  assert.deepEqual(scheduler.update({ presentation: bench(0.4) }), []);
});

void test('skip closes a bench until a new match reset', () => {
  const scheduler = new PresentationAudioScheduler();
  assert.equal(
    voices(scheduler.update({ presentation: bench(0.08) })).length,
    1,
  );
  assert.deepEqual(scheduler.update({ presentation: null }), []);
  assert.deepEqual(scheduler.update({ presentation: bench(0.9) }), []);
  assert.equal(
    voices(scheduler.update({ presentation: bench(0.08, 8) })).length,
    1,
  );
  scheduler.reset();
  assert.equal(
    voices(scheduler.update({ presentation: bench(0.08) })).length,
    1,
  );
});

void test('one exhale is emitted for each smash contact', () => {
  const scheduler = new PresentationAudioScheduler();
  const contact = {
    playerId: 2,
    time: 12.5,
    shot: 'remate' as const,
    x: -3.2,
    quality: 'perfect' as const,
  };
  const first = scheduler.update({ presentation: null, contact });
  assert.deepEqual(first, [
    {
      kind: 'smash-exhale',
      key: 'smash:2:12.5',
      x: -3.2,
      intensity: 0.7,
    },
  ]);
  assert.deepEqual(scheduler.update({ presentation: null, contact }), []);
  assert.deepEqual(
    scheduler.update({
      presentation: null,
      contact: { ...contact, time: 13, shot: 'plano' },
    }),
    [],
  );
  assert.deepEqual(
    scheduler.update({
      presentation: null,
      contact: { ...contact, time: 14 },
      paused: true,
    }),
    [],
  );
  assert.deepEqual(
    scheduler.update({
      presentation: null,
      contact: { ...contact, time: 14 },
    }),
    [],
  );
});
