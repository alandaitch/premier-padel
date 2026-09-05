export type PerfectDifficulty = 'facil' | 'normal' | 'dificil';
export const SMASH_CHARGE_MS = 1050;
export const PERFECT_CENTER = 0.82;
export const PERFECT_WIDTH: Record<PerfectDifficulty, number> = {
  facil: 0.28,
  normal: 0.16,
  dificil: 0.07,
};

/** One rising meter. Waiting beyond the green zone cannot grant perfect contact. */
export function sampleSmashCharge(
  elapsedMs: number,
  difficulty: PerfectDifficulty,
) {
  const raw = Math.max(0, elapsedMs) / SMASH_CHARGE_MS;
  const width = PERFECT_WIDTH[difficulty] ?? PERFECT_WIDTH.facil;
  const perfect = Math.abs(raw - PERFECT_CENTER) <= width / 2 + 1e-9;
  const late = raw > PERFECT_CENTER + width / 2;
  const progress = Math.min(1, raw);
  const power = perfect
    ? 1
    : Math.max(0.7, 1 - Math.max(0, raw - 1) * 0.6) * (0.38 + 0.62 * progress);
  return {
    progress,
    power,
    perfect,
    quality: perfect
      ? ('perfect' as const)
      : late
        ? ('late' as const)
        : ('good' as const),
    late,
  };
}
