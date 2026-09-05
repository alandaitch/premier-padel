import { PadelMatch, type Input } from './physics';
import type { PlayerAppearance } from './player-profiles';
const idle: Input = {
  moveX: 0,
  moveZ: 0,
  hit: false,
  shot: 'plano',
  power: 0.6,
  aim: 0,
};

/** Start the attract match at its first ordinary rest, using actual AI play.
 * The opening exhibition shows the changeover, then resumes the match.
 * No score, outcome or player position is fabricated for the exhibition. */
export function createDemoMatch(profiles: PlayerAppearance[]): PadelMatch {
  const match = new PadelMatch({
    autoPlay: true,
    difficulty: 'normal',
    gamesToWin: 6,
    setsToWin: 2,
    playerProfiles: profiles,
  });
  for (let step = 0; step < 90000; step++) {
    match.update(1 / 60, idle);
    const state = match.getState();
    if (state.phase === 'point') {
      if (
        state.lastPoint?.rest !== 'none' &&
        (state.lastPoint?.gameNumber ?? 0) >= 3
      )
        break;
      match.nextPoint();
    }
    if (state.phase === 'finished') break;
  }
  return match;
}
