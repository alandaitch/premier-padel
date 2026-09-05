import test from 'node:test';
import assert from 'node:assert/strict';
import {
  sampleSmashCharge,
  PERFECT_CENTER,
  PERFECT_WIDTH,
  SMASH_CHARGE_MS,
} from './smash-charge';

void test('all timing presets reward the same centre but have distinct real time tolerances', () => {
  for (const difficulty of ['facil', 'normal', 'dificil'] as const) {
    const centre = PERFECT_CENTER * SMASH_CHARGE_MS;
    assert.equal(sampleSmashCharge(centre, difficulty).perfect, true);
    const edge = centre + (PERFECT_WIDTH[difficulty] * SMASH_CHARGE_MS) / 2;
    assert.equal(sampleSmashCharge(edge, difficulty).perfect, true);
    assert.equal(sampleSmashCharge(edge + 1, difficulty).perfect, false);
    assert.equal(sampleSmashCharge(centre, difficulty).power, 1);
  }
  assert.equal(sampleSmashCharge(760, 'facil').perfect, true);
  assert.equal(sampleSmashCharge(760, 'dificil').perfect, false);
});
void test('tap and excessive hold never become perfect; overcharge loses power', () => {
  assert.equal(sampleSmashCharge(20, 'facil').perfect, false);
  assert.equal(sampleSmashCharge(6000, 'facil').quality, 'late');
  assert.ok(
    sampleSmashCharge(6000, 'facil').power <
      sampleSmashCharge(1050, 'facil').power,
  );
  assert.equal(sampleSmashCharge(-100, 'normal').progress, 0);
});
