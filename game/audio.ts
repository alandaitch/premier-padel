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
