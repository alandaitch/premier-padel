export const VICTORY_SEQUENCE = [
  'down',
  'down',
  'up',
  'right',
  'base',
  'control',
] as const;
export const VICTORY_COMBO_TOTAL_MS = 3200;
export const VICTORY_COMBO_GAP_MS = 900;

/**
 * Consumes logical actions, never physical keys or controller button indices.
 * The caller feeds only press edges: ignore keyboard repeats and held-pad frames.
 * Availability, winning player and celebration playback belong to the caller.
 */
export class VictoryCombo {
  private matched = 0;
  private startedAt: number | null = null;
  private lastAt: number | null = null;
  private completed = false;

  /** Number of accepted actions, 0–6. A completed combo stays at 6 until reset. */
  get progress(): number {
    return this.matched;
  }

  reset(): void {
    this.matched = 0;
    this.startedAt = null;
    this.lastAt = null;
    this.completed = false;
  }

  /** Expires an unfinished attempt for RAF-driven hints; completed combos stay locked. */
  expire(now: number): void {
    if (this.completed) return;
    if (
      !Number.isFinite(now) ||
      now < 0 ||
      (this.lastAt !== null &&
        (now < this.lastAt ||
          now - this.lastAt > VICTORY_COMBO_GAP_MS ||
          now - this.startedAt! > VICTORY_COMBO_TOTAL_MS))
    )
      this.reset();
  }

  /** Returns true only on the completing press, once per reset. Times are ms. */
  feed(action: string, now: number): boolean {
    if (this.completed) return false;
    this.expire(now);
    if (!Number.isFinite(now) || now < 0) return false;

    if (action !== VICTORY_SEQUENCE[this.matched]) this.reset();
    // A mistake or timeout can itself begin a fresh attempt when it is 'down'.
    if (action !== VICTORY_SEQUENCE[this.matched]) return false;
    if (this.matched === 0) this.startedAt = now;
    this.lastAt = now;
    this.matched++;
    if (this.matched !== VICTORY_SEQUENCE.length) return false;
    this.completed = true;
    return true;
  }
}
