import test from 'node:test';
import assert from 'node:assert/strict';
import { createDemoMatch } from './demo-match';
import { matchAppearances } from './player-profiles';
import { MatchPresentation } from './match-presentation';
import type { Input } from './physics';
const idle: Input = {
  moveX: 0,
  moveZ: 0,
  hit: false,
  shot: 'plano',
  power: 0.6,
  aim: 0,
};
void test('the menu exhibition reaches a real ten-second bench and resumes unchanged', () => {
  const profiles = matchAppearances(),
    match = createDemoMatch(profiles),
    state = match.getState(),
    director = new MatchPresentation();
  assert.ok(state.stats.totalPoints > 0);
  assert.ok(state.lastPoint && state.lastPoint.gameNumber >= 2);
  let entered = false,
    exited = false,
    benchFrames = 0,
    benchScore = '';
  for (let frame = 0; frame < 60 * 180; frame++) {
    if (!director.active) match.update(1 / 60, idle);
    const p = director.update(
      state,
      1 / 60,
      profiles.map((p) => p.id),
    );
    if (p?.phase === 'bench') {
      if (!entered) {
        entered = true;
        benchScore = JSON.stringify(state.score);
      }
      benchFrames++;
      assert.equal(JSON.stringify(state.score), benchScore);
    }
    if (entered && !p) {
      exited = true;
      if (state.phase === 'point') match.nextPoint();
      break;
    }
    if (!p && state.phase === 'point') match.nextPoint();
  }
  assert.ok(
    entered && exited,
    'a real game outcome triggers and completes the menu break',
  );
  assert.ok(
    benchFrames >= 598 && benchFrames <= 602,
    `bench lasts ten seconds: ${benchFrames} frames`,
  );
  assert.equal(state.phase, 'serve');
});
