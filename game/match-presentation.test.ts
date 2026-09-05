import test from 'node:test';
import assert from 'node:assert/strict';
import {
  PadelMatch,
  type GameState,
  type Input,
  type PointOutcome,
} from './physics';
import { MatchPresentation, teamFrustration } from './match-presentation';
const roster = ['lebron', 'augsburger', 'galan', 'chingotto'];
const idle: Input = {
  moveX: 0,
  moveZ: 0,
  hit: false,
  shot: 'plano',
  power: 0.6,
  aim: 0,
};
function fixture(patch: Partial<PointOutcome> = {}): GameState {
  const state = new PadelMatch().getState();
  state.phase = 'point';
  state.pointWinner = 1;
  state.lastPoint = {
    id: 1,
    winner: 1,
    game: false,
    set: false,
    match: false,
    gameNumber: 0,
    setNumber: 1,
    changeEnds: false,
    rest: 'none',
    ...patch,
  };
  return state;
}
function phases(state: GameState) {
  const director = new MatchPresentation(),
    result = new Set<string>();
  for (let i = 0; i < 350; i++) {
    const p = director.update(state, 0.1, roster);
    if (p) result.add(p.phase);
  }
  return result;
}
void test('first game and tie-break changes never contain a bench scene; later rest does', () => {
  assert.deepEqual(
    [...phases(fixture({ game: true, gameNumber: 1, changeEnds: true }))],
    ['celebration', 'walk', 'return'],
  );
  assert.deepEqual(
    [
      ...phases(
        fixture({
          game: true,
          gameNumber: 3,
          changeEnds: true,
          rest: 'changeover',
        }),
      ),
    ],
    ['celebration', 'walk', 'bench', 'return'],
  );
  assert.ok(
    phases(fixture({ game: true, set: true, rest: 'set' })).has('bench'),
  );
  assert.deepEqual(
    [...phases(fixture({ game: true, set: true, match: true }))],
    ['celebration'],
  );
});
void test('skip never repeats the same point; resetting permits a new match', () => {
  const director = new MatchPresentation(),
    state = fixture();
  assert.ok(director.update(state, 0, roster));
  director.skip();
  assert.equal(director.update(state, 0.05, roster), null);
  director.reset();
  assert.ok(director.update(state, 0, roster));
});
void test('frustration and original Lebron scene grow with the score deficit', () => {
  const state = fixture({ game: true, rest: 'changeover' });
  const tied = teamFrustration(state, 0);
  state.score.games = [0, 3];
  const behind = teamFrustration(state, 0);
  state.score.sets = [0, 1];
  assert.ok(tied < behind && behind < teamFrustration(state, 0));
  const director = new MatchPresentation();
  let dialogue = '';
  for (let i = 0; i < 140; i++) {
    const p = director.update(state, 0.1, roster);
    if (p?.phase === 'bench') dialogue = p.dialogue;
  }
  assert.match(dialogue, /Lebrón.*carajo/);
  assert.equal(director.update(state, 0, roster, false), null);
});
void test('a real AI match can pause for every presentation and still reach result with score intact', () => {
  const match = new PadelMatch({ autoPlay: true, gamesToWin: 3, setsToWin: 2 });
  const director = new MatchPresentation(),
    state = match.getState();
  const seen = new Set<number>();
  let benches = 0,
    returns = 0,
    lastPhase = '';
  for (let frame = 0; frame < 360000; frame++) {
    if (!director.active) match.update(1 / 60, idle);
    const p = director.update(state, 1 / 60, roster);
    if (p) {
      seen.add(p.id);
      if (p.phase !== lastPhase && p.phase === 'bench') benches++;
      if (p.phase !== lastPhase && p.phase === 'return') returns++;
      lastPhase = p.phase;
    } else {
      lastPhase = '';
      if (state.phase === 'point') match.nextPoint();
      if (state.phase === 'finished') break;
    }
  }
  assert.equal(
    state.phase,
    'finished',
    JSON.stringify({ score: state.score, points: state.stats.totalPoints }),
  );
  assert.equal(seen.size, state.stats.totalPoints);
  assert.ok(benches > 0 && returns > 0);
  assert.ok(state.score.sets.some((s) => s === 2));
});
