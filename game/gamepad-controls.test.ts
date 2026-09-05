import assert from 'node:assert/strict';
import { test } from 'node:test';
import {
  DEFAULT_BINDINGS,
  ShotCombos,
  normalizeBindings,
  padLabel,
  rebindControl,
  relevantActions,
} from './control-mapping';

void test('a release and opposite press in one polling timestamp remain an ordered combo', () => {
  // The polling adapter must dispatch ALL releases before new presses.
  const c = new ShotCombos();
  c.press('control', 0);
  c.release('control');
  assert.deepEqual(c.press('base', 50), ['touch']);
  assert.deepEqual(c.flush(400), []);
});

void test('two held buttons entering in one frame resolve exactly one simultaneous stroke', () => {
  const c = new ShotCombos();
  assert.deepEqual(c.press('base', 100), []);
  assert.deepEqual(c.press('control', 100), ['together']);
  for (const now of [116, 133, 150, 350]) {
    assert.deepEqual(c.press('base', now), []);
    assert.deepEqual(c.press('control', now), []);
    assert.deepEqual(c.flush(now), []);
  }
  c.release('base');
  c.release('control');
  assert.deepEqual(c.press('base', 500), []);
  assert.deepEqual(c.flush(720), ['base']);
});

void test('remapping an unassigned controller action survives JSON without reviving its conflict', () => {
  const reassigned = rebindControl(
    DEFAULT_BINDINGS,
    'simple',
    'gamepad',
    'aimLeft',
    0,
  ).bindings;
  const restored = normalizeBindings(JSON.parse(JSON.stringify(reassigned)));
  assert.equal(restored.gamepad.aimLeft, 0);
  assert.equal(
    restored.gamepad.base,
    -1,
    'Explicit unassigned sentinel must survive serialization',
  );
  assert.equal(padLabel(restored.gamepad.base), 'Sin asignar');
  const assigned = relevantActions('simple')
    .map((action) => restored.gamepad[action])
    .filter((button): button is number => button !== undefined && button >= 0);
  assert.equal(
    new Set(assigned).size,
    assigned.length,
    'Every active physical button belongs to at most one action',
  );
});

void test('controller remapping stays unique after several captures and a reload', () => {
  let current = rebindControl(
    DEFAULT_BINDINGS,
    'simple',
    'gamepad',
    'aimLeft',
    0,
  ).bindings;
  current = rebindControl(current, 'simple', 'gamepad', 'smash', 5).bindings;
  current = rebindControl(current, 'simple', 'gamepad', 'base', 20).bindings;
  current = normalizeBindings(JSON.parse(JSON.stringify(current)));
  assert.equal(current.gamepad.smash, 5);
  assert.equal(current.gamepad.switch, 2);
  assert.equal(current.gamepad.base, 20);
  assert.equal(current.gamepad.aimLeft, 0);
  const assigned = relevantActions('simple')
    .map((action) => current.gamepad[action])
    .filter((button): button is number => button !== undefined && button >= 0);
  assert.equal(new Set(assigned).size, assigned.length);
});

void test('explicit unassigned survives while invalid button numbers are rejected', () => {
  const restored = normalizeBindings({
    gamepad: { base: -1, smash: -2, control: 99 },
  });
  assert.equal(restored.gamepad.base, -1);
  assert.equal(restored.gamepad.smash, DEFAULT_BINDINGS.gamepad.smash);
  assert.equal(restored.gamepad.control, DEFAULT_BINDINGS.gamepad.control);
});
