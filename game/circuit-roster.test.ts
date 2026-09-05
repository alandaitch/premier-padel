import test from 'node:test';
import assert from 'node:assert/strict';
import {
  circuitTeams,
  circuitRounds,
  circuitOpponents,
  matchAppearances,
  teamAppearances,
  type Circuit,
} from './circuit-roster';
import { PadelMatch, type Input } from './physics';
import { MatchPresentation } from './match-presentation';
const idle: Input = {
  moveX: 0,
  moveZ: 0,
  hit: false,
  shot: 'plano',
  power: 0.6,
  aim: 0,
};
for (const circuit of ['masculino', 'femenino'] as Circuit[]) {
  void test(`${circuit}: every selected pair reaches physics and its tournament uses distinct rivals`, () => {
    const teams = circuitTeams(circuit),
      all = new Set();
    teams.forEach((team, index) => {
      const roster = teamAppearances(index, circuit);
      assert.deepEqual(
        roster.map((p) => p.name),
        team.players,
      );
      for (const p of roster) {
        assert.ok(!all.has(p.id));
        all.add(p.id);
        if (circuit === 'femenino') assert.equal(p.gender, 'female');
      }
      const opponents = circuitOpponents(circuit, index);
      assert.equal(opponents.length, circuitRounds(circuit).length);
      assert.equal(new Set(opponents).size, opponents.length);
      assert.ok(opponents.every((i) => i !== index && teams[i]));
      const appearances = matchAppearances(index, opponents[0], circuit),
        s = new PadelMatch({ playerProfiles: appearances }).getState();
      assert.deepEqual(
        s.players.map((p) => [p.height, p.handedness]),
        appearances.map((p) => [p.height, p.handedness]),
      );
    });
  });
}
void test('a women match completes with real scoring, pauses and no Lebron signature', () => {
  const profiles = matchAppearances(0, 1, 'femenino'),
    m = new PadelMatch({
      autoPlay: true,
      gamesToWin: 1,
      setsToWin: 1,
      playerProfiles: profiles,
    }),
    d = new MatchPresentation();
  let finished = false;
  for (let tick = 0; tick < 180000; tick++) {
    if (!d.active) m.update(1 / 60, idle);
    const s = m.getState(),
      was = d.active;
    d.update(
      s,
      1 / 60,
      profiles.map((p) => p.id),
    );
    assert.equal(d.signatureAvailable, false);
    if (was && !d.active && s.phase === 'point') m.nextPoint();
    if (s.phase === 'finished' && !d.active) {
      finished = true;
      assert.ok(s.stats.totalPoints > 0);
      assert.equal(Math.max(...s.score.sets), 1);
      break;
    }
  }
  assert.ok(
    finished,
    'the women circuit must remain a playable complete match',
  );
});
