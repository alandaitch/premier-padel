import type { PresentationAudioCue } from './presentation-audio';

/** Local Web Audio synthesis: no streaming, no external audio assets. */
export class PadelAudio {
  private ctx: AudioContext | null = null;
  private master: GainNode | null = null;
  private ambience: AudioBufferSourceNode | null = null;
  private volume = 0.45;
  private enabled = true;
  async start() {
    if (!this.ctx) {
      this.ctx = new AudioContext();
      this.master = this.ctx.createGain();
      this.master.gain.value = this.enabled ? this.volume : 0;
      this.master.connect(this.ctx.destination);
      const buf = this.noise(3);
      const src = this.ctx.createBufferSource();
      src.buffer = buf;
      src.loop = true;
      const filter = this.ctx.createBiquadFilter();
      filter.type = 'lowpass';
      filter.frequency.value = 480;
      const gain = this.ctx.createGain();
      gain.gain.value = 0.018;
      src.connect(filter).connect(gain).connect(this.master);
      src.start();
      this.ambience = src;
    }
    if (this.ctx.state === 'suspended') await this.ctx.resume();
  }
  setVolume(v: number) {
    this.volume = v;
    if (this.master && this.ctx)
      this.master.gain.setTargetAtTime(
        this.enabled ? v : 0,
        this.ctx.currentTime,
        0.08,
      );
  }
  setEnabled(v: boolean) {
    this.enabled = v;
    this.setVolume(this.volume);
  }
  private noise(seconds: number) {
    const c = this.ctx!;
    const b = c.createBuffer(
      1,
      Math.ceil(c.sampleRate * seconds),
      c.sampleRate,
    );
    const a = b.getChannelData(0);
    for (let i = 0; i < a.length; i++) a[i] = Math.random() * 2 - 1;
    return b;
  }
  playPresentationCue(cue: PresentationAudioCue) {
    if (cue.kind === 'bench-voice') this.playBenchVoice(cue);
    else this.playSmashExhale(cue);
  }
  private playBenchVoice(
    cue: Extract<PresentationAudioCue, { kind: 'bench-voice' }>,
  ) {
    const c = this.ctx,
      m = this.master;
    if (!c || !m || c.state !== 'running') return;
    const now = c.currentTime,
      pan = c.createStereoPanner(),
      base =
        cue.speaker === 'coach' ? 142 : cue.speaker === 'player-a' ? 188 : 218,
      moodLift =
        cue.mood === 'frustrated' ? 1.16 : cue.mood === 'tense' ? 1.08 : 1,
      pace =
        cue.mood === 'frustrated'
          ? 0.125
          : cue.mood === 'tense'
            ? 0.145
            : 0.165,
      contours = [
        [0, 3, -2],
        [0, -2, 4, 1],
        [0, 5, 2],
      ] as const,
      contour = contours[cue.variant];
    pan.pan.value = Math.max(-0.75, Math.min(0.75, cue.pan));
    pan.connect(m);

    contour.forEach((semitones, index) => {
      const delay = index * pace,
        duration = pace * 0.72,
        frequency = base * moodLift * 2 ** (semitones / 12),
        tone = c.createOscillator(),
        filter = c.createBiquadFilter(),
        envelope = c.createGain();
      tone.type = cue.speaker === 'coach' ? 'sawtooth' : 'triangle';
      tone.frequency.setValueAtTime(frequency, now + delay);
      tone.frequency.exponentialRampToValueAtTime(
        frequency * (cue.mood === 'frustrated' ? 0.91 : 0.97),
        now + delay + duration,
      );
      filter.type = 'lowpass';
      filter.frequency.value =
        900 + index * 115 + (cue.speaker === 'coach' ? 0 : 280);
      filter.Q.value = 1.35;
      envelope.gain.setValueAtTime(0.001, now + delay);
      envelope.gain.linearRampToValueAtTime(
        (0.045 + index * 0.003) * cue.intensity,
        now + delay + 0.012,
      );
      envelope.gain.exponentialRampToValueAtTime(0.001, now + delay + duration);
      tone.connect(filter).connect(envelope).connect(pan);
      tone.start(now + delay);
      tone.stop(now + delay + duration + 0.01);
      tone.onended = () => {
        tone.disconnect();
        filter.disconnect();
        envelope.disconnect();
      };

      // Tiny filtered attacks turn the notes into abstract syllables, not words.
      const attack = c.createBufferSource(),
        attackFilter = c.createBiquadFilter(),
        attackGain = c.createGain();
      attack.buffer = this.noise(0.026);
      attackFilter.type = 'bandpass';
      attackFilter.frequency.value = 1250 + index * 170;
      attackFilter.Q.value = 1.8;
      attackGain.gain.setValueAtTime(0.014 * cue.intensity, now + delay);
      attackGain.gain.exponentialRampToValueAtTime(0.001, now + delay + 0.024);
      attack.connect(attackFilter).connect(attackGain).connect(pan);
      attack.start(now + delay);
      attack.stop(now + delay + 0.026);
      attack.onended = () => {
        attack.disconnect();
        attackFilter.disconnect();
        attackGain.disconnect();
      };
    });

    const cleanup = c.createOscillator(),
      cleanupGain = c.createGain();
    cleanupGain.gain.value = 0;
    cleanup.connect(cleanupGain).connect(pan);
    cleanup.start(now);
    cleanup.stop(now + contour.length * pace + 0.08);
    cleanup.onended = () => {
      cleanup.disconnect();
      cleanupGain.disconnect();
      pan.disconnect();
    };
  }
  private playSmashExhale(
    cue: Extract<PresentationAudioCue, { kind: 'smash-exhale' }>,
  ) {
    const c = this.ctx,
      m = this.master;
    if (!c || !m || c.state !== 'running') return;
    const now = c.currentTime,
      intensity = Math.max(0.35, Math.min(0.75, cue.intensity)),
      pan = c.createStereoPanner(),
      breath = c.createBufferSource(),
      breathFilter = c.createBiquadFilter(),
      breathGain = c.createGain();
    pan.pan.value = Math.max(-0.8, Math.min(0.8, cue.x / 7));
    pan.connect(m);
    breath.buffer = this.noise(0.18);
    breathFilter.type = 'bandpass';
    breathFilter.frequency.value = 820;
    breathFilter.Q.value = 0.72;
    breathGain.gain.setValueAtTime(0.001, now);
    breathGain.gain.linearRampToValueAtTime(0.055 * intensity, now + 0.014);
    breathGain.gain.exponentialRampToValueAtTime(0.001, now + 0.17);
    breath.connect(breathFilter).connect(breathGain).connect(pan);
    breath.start(now);
    breath.stop(now + 0.18);

    const effort = c.createOscillator(),
      effortFilter = c.createBiquadFilter(),
      effortGain = c.createGain();
    effort.type = 'triangle';
    effort.frequency.setValueAtTime(145 + intensity * 32, now);
    effort.frequency.exponentialRampToValueAtTime(82, now + 0.13);
    effortFilter.type = 'lowpass';
    effortFilter.frequency.value = 520;
    effortGain.gain.setValueAtTime(0.001, now);
    effortGain.gain.linearRampToValueAtTime(0.033 * intensity, now + 0.009);
    effortGain.gain.exponentialRampToValueAtTime(0.001, now + 0.14);
    effort.connect(effortFilter).connect(effortGain).connect(pan);
    effort.start(now);
    effort.stop(now + 0.15);
    effort.onended = () => {
      effort.disconnect();
      effortFilter.disconnect();
      effortGain.disconnect();
    };
    breath.onended = () => {
      breath.disconnect();
      breathFilter.disconnect();
      breathGain.disconnect();
      pan.disconnect();
    };
  }
  play(type: string, x = 0, power = 0.6) {
    const c = this.ctx,
      m = this.master;
    if (!c || !m || c.state !== 'running') return;
    const pan = c.createStereoPanner();
    pan.pan.value = Math.max(-0.8, Math.min(0.8, x / 7));
    pan.connect(m);
    const now = c.currentTime;
    const gain = c.createGain();
    gain.connect(pan);
    const applause = /point|win|finish|match|game/.test(type);
    const glass = /wall|glass/.test(type);
    const bounce = /bounce/.test(type);
    if (type === 'signature') {
      // Original short stadium sting, independent of the reference video's audio.
      for (const [frequency, delay] of [
        [196, 0],
        [261.63, 0.11],
        [392, 0.24],
        [523.25, 0.4],
      ]) {
        const tone = c.createOscillator(),
          envelope = c.createGain();
        tone.type = 'triangle';
        tone.frequency.value = frequency;
        envelope.gain.setValueAtTime(0, now + delay);
        envelope.gain.linearRampToValueAtTime(0.1, now + delay + 0.018);
        envelope.gain.exponentialRampToValueAtTime(0.001, now + delay + 0.38);
        tone.connect(envelope).connect(pan);
        tone.start(now + delay);
        tone.stop(now + delay + 0.42);
        tone.onended = () => {
          tone.disconnect();
          envelope.disconnect();
        };
      }
      const roar = c.createBufferSource(),
        filter = c.createBiquadFilter();
      roar.buffer = this.noise(2.5);
      filter.type = 'bandpass';
      filter.frequency.value = 1150;
      filter.Q.value = 0.6;
      roar.connect(filter).connect(gain);
      gain.gain.setValueAtTime(0.001, now);
      gain.gain.linearRampToValueAtTime(0.12, now + 0.55);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 2.45);
      roar.start();
      roar.stop(now + 2.5);
      roar.onended = () => {
        roar.disconnect();
        filter.disconnect();
        gain.disconnect();
        pan.disconnect();
      };
      return;
    }
    if (type === 'perfect') {
      // A short racket crack, body thump and bright tail; the ball remains audible.
      const crack = c.createBufferSource();
      crack.buffer = this.noise(0.14);
      const filter = c.createBiquadFilter();
      filter.type = 'highpass';
      filter.frequency.value = 950;
      crack.connect(filter).connect(gain);
      gain.gain.setValueAtTime(0.28, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.14);
      crack.start();
      for (const [frequency, delay, level] of [
        [155, 0, 0.3],
        [850, 0.045, 0.065],
        [1280, 0.075, 0.035],
      ]) {
        const tone = c.createOscillator(),
          envelope = c.createGain();
        tone.type = 'sine';
        tone.frequency.setValueAtTime(frequency, now + delay);
        tone.frequency.exponentialRampToValueAtTime(
          frequency * 0.5,
          now + delay + 0.17,
        );
        envelope.gain.setValueAtTime(level, now + delay);
        envelope.gain.exponentialRampToValueAtTime(0.001, now + delay + 0.22);
        tone.connect(envelope).connect(pan);
        tone.start(now + delay);
        tone.stop(now + delay + 0.25);
        tone.onended = () => {
          tone.disconnect();
          envelope.disconnect();
        };
      }
      crack.onended = () => {
        crack.disconnect();
        filter.disconnect();
        gain.disconnect();
      };
      // All tails end before the final silent scheduled source disconnects the pan.
      const cleanup = c.createOscillator();
      cleanup.connect(c.createGain());
      cleanup.start(now);
      cleanup.stop(now + 0.36);
      cleanup.onended = () => {
        cleanup.disconnect();
        pan.disconnect();
      };
      return;
    }
    if (applause) {
      const n = c.createBufferSource();
      n.buffer = this.noise(1.7);
      const f = c.createBiquadFilter();
      f.type = 'bandpass';
      f.frequency.value = 1250;
      f.Q.value = 0.5;
      n.connect(f).connect(gain);
      gain.gain.setValueAtTime(0.001, now);
      gain.gain.linearRampToValueAtTime(0.1, now + 0.16);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 1.6);
      n.start();
      n.stop(now + 1.7);
      n.onended = () => {
        gain.disconnect();
        pan.disconnect();
      };
      return;
    }
    if (type === 'mesh') {
      const intensity = Math.max(0.12, Math.min(1, power));
      const crack = c.createBufferSource(),
        crackFilter = c.createBiquadFilter();
      crack.buffer = this.noise(0.045);
      crackFilter.type = 'highpass';
      crackFilter.frequency.value = 1650;
      crackFilter.Q.value = 0.7;
      gain.gain.setValueAtTime(0.045 + intensity * 0.075, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.04);
      crack.connect(crackFilter).connect(gain);
      crack.start(now);
      crack.stop(now + 0.045);

      // Short, uneven wire chatter after the initial metal snap.
      const wire = c.createBufferSource(),
        wireFilter = c.createBiquadFilter(),
        wireGain = c.createGain();
      wire.buffer = this.noise(0.24);
      wireFilter.type = 'bandpass';
      wireFilter.frequency.value = 1450 + intensity * 420;
      wireFilter.Q.value = 4.2;
      wireGain.gain.setValueAtTime(0.001, now);
      const chatter = [0.008, 0.026, 0.051, 0.087, 0.136];
      chatter.forEach((delay, index) => {
        const peak =
          (0.018 + intensity * 0.035) *
          Math.pow(0.76, index) *
          (0.82 + Math.random() * 0.32);
        wireGain.gain.setValueAtTime(peak, now + delay);
        wireGain.gain.exponentialRampToValueAtTime(
          0.001,
          now + delay + 0.014 + index * 0.002,
        );
      });
      wire.connect(wireFilter).connect(wireGain).connect(pan);
      wire.start(now);
      wire.stop(now + 0.24);

      // Inharmonic modes keep the reja distinct from racket, turf and glass.
      [720, 1115, 1690].forEach((base, index) => {
        const tone = c.createOscillator(),
          envelope = c.createGain(),
          delay = 0.006 + index * 0.011,
          duration = 0.11 + index * 0.035 + intensity * 0.045,
          frequency = base * (0.975 + Math.random() * 0.05);
        tone.type = index === 1 ? 'triangle' : 'sine';
        tone.frequency.setValueAtTime(frequency, now + delay);
        tone.frequency.exponentialRampToValueAtTime(
          frequency * (0.93 + index * 0.012),
          now + delay + duration,
        );
        envelope.gain.setValueAtTime(0.001, now + delay);
        envelope.gain.linearRampToValueAtTime(
          (0.012 + intensity * 0.014) / (1 + index * 0.28),
          now + delay + 0.003,
        );
        envelope.gain.exponentialRampToValueAtTime(
          0.001,
          now + delay + duration,
        );
        tone.connect(envelope).connect(pan);
        tone.start(now + delay);
        tone.stop(now + delay + duration + 0.01);
        tone.onended = () => {
          tone.disconnect();
          envelope.disconnect();
        };
      });
      crack.onended = () => {
        crack.disconnect();
        crackFilter.disconnect();
        gain.disconnect();
      };
      wire.onended = () => {
        wire.disconnect();
        wireFilter.disconnect();
        wireGain.disconnect();
      };
      const cleanup = c.createOscillator();
      const cleanupGain = c.createGain();
      cleanupGain.gain.value = 0;
      cleanup.connect(cleanupGain).connect(pan);
      cleanup.start(now);
      cleanup.stop(now + 0.32);
      cleanup.onended = () => {
        cleanup.disconnect();
        cleanupGain.disconnect();
        pan.disconnect();
      };
      return;
    }
    if (/hit|serve|shot|bounce|wall|glass|net|mesh/.test(type)) {
      const o = c.createOscillator();
      o.type = 'triangle';
      o.frequency.setValueAtTime(
        glass ? 370 : bounce ? 135 : 230 + power * 110,
        now,
      );
      o.frequency.exponentialRampToValueAtTime(glass ? 150 : 55, now + 0.11);
      gain.gain.setValueAtTime(glass ? 0.1 : bounce ? 0.12 : 0.24, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.14);
      o.connect(gain);
      o.start();
      o.stop(now + 0.15);
      const n = c.createBufferSource();
      n.buffer = this.noise(0.055);
      const ng = c.createGain();
      ng.gain.setValueAtTime(bounce ? 0.06 : 0.12, now);
      ng.gain.exponentialRampToValueAtTime(0.001, now + 0.05);
      n.connect(ng).connect(pan);
      n.start();
      o.onended = () => {
        gain.disconnect();
        ng.disconnect();
        pan.disconnect();
      };
    }
  }
  dispose() {
    this.ambience?.stop();
    void this.ctx?.close();
    this.ctx = null;
  }
}
