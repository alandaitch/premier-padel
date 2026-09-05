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

function finalFor(winner: 0 | 1): GameState {
  const state = fixture({ winner, game: true, set: true, match: true });
  state.phase = 'finished';
  state.winner = winner;
  state.pointWinner = winner;
  return state;
}
void test('signature is available only when Lebron is on the winning match team, in either slot', () => {
  for (const position of [0, 1, 2, 3])
    for (const winner of [0, 1] as const) {
      const names = ['tapia', 'coello', 'galan', 'chingotto'];
      names[position] = 'lebron';
      const d = new MatchPresentation(),
        s = finalFor(winner);
      const scene = d.update(s, 0, names)!;
      assert.equal(d.signatureAvailable, Math.floor(position / 2) === winner);
      assert.equal(
        scene.signaturePlayerId,
        Math.floor(position / 2) === winner ? position : undefined,
      );
      assert.equal(d.triggerSignature(), Math.floor(position / 2) === winner);
    }
  const absent = new MatchPresentation();
  absent.update(finalFor(0), 0, ['tapia', 'coello', 'galan', 'chingotto']);
  assert.equal(absent.triggerSignature(), false);
});
void test('winning a point, game or set does not unlock the signature', () => {
  for (const outcome of [{}, { game: true }, { game: true, set: true }]) {
    const d = new MatchPresentation(),
      s = fixture({ winner: 0, ...outcome });
    d.update(s, 0, roster);
    assert.equal(d.signatureAvailable, false);
    assert.equal(d.triggerSignature(), false);
  }
  const contradictory = finalFor(0);
  contradictory.winner = 1;
  const d = new MatchPresentation();
  d.update(contradictory, 0, roster);
  assert.equal(d.triggerSignature(), false);
});
void test('signature window expires, a paused clock does not, and playback is once per victory', () => {
  const s = finalFor(0),
    d = new MatchPresentation();
  d.update(s, 0, roster);
  for (let i = 0; i < 200; i++) d.update(s, 0, roster);
  assert.equal(d.signatureAvailable, true);
  for (let i = 0; i < 81; i++) d.update(s, 0.1, roster);
  assert.equal(d.signatureAvailable, false);
  assert.equal(d.triggerSignature(), false);
  d.reset();
  d.update(s, 0, roster);
  const before = JSON.stringify(s);
  assert.equal(d.triggerSignature(), true);
  assert.equal(d.triggerSignature(), false);
  const p = d.update(s, 0.1, roster)!;
  assert.equal(p.phase, 'signature');
  assert.equal(p.signaturePlayerId, 0);
  assert.equal(p.signatureAvailable, false);
  assert.equal(d.active, true);
  for (let i = 0; i < 90; i++) d.update(s, 0.1, roster);
  assert.equal(d.active, false);
  assert.equal(d.update(s, 0, roster), null);
  assert.equal(JSON.stringify(s), before);
});
void test('skipping the secret restores normal result flow without replaying it', () => {
  const d = new MatchPresentation(),
    s = finalFor(0);
  d.update(s, 0, roster);
  d.triggerSignature();
  d.skip();
  assert.equal(d.active, false);
  assert.equal(d.signatureAvailable, false);
  assert.equal(d.update(s, 0.1, roster), null);
  assert.equal(d.triggerSignature(), false);
  d.reset();
  assert.equal(d.update(s, 0, roster)?.signatureAvailable, true);
});
