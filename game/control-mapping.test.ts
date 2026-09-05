import assert from 'node:assert/strict';
import { test } from 'node:test';
import {
  ShotCombos,
  bindingsForScheme,
  relevantActions,
  DEFAULT_BINDINGS,
  normalizeBindings,
  rebindControl,
  axisWithDeadzone,
} from './control-mapping';

void test('single press waits for combo window and fires once', () => {
  const c = new ShotCombos();
  assert.deepEqual(c.press('base', 0), []);
  c.release('base');
  assert.deepEqual(c.flush(219), []);
  assert.deepEqual(c.flush(220), ['base']);
  assert.deepEqual(c.flush(300), []);
});
void test('simultaneous families resolve one shot without early base', () => {
  for (const order of [
    ['base', 'control'],
    ['control', 'base'],
  ] as const) {
    const c = new ShotCombos();
    assert.deepEqual(c.press(order[0], 0), []);
    assert.deepEqual(c.press(order[1], 70), ['together']);
    assert.deepEqual(c.flush(400), []);
  }
});
void test('sequences respect order even when first was released quickly', () => {
  const c = new ShotCombos();
  c.press('base', 0);
  c.release('base');
  assert.deepEqual(c.press('control', 40), ['lob']);
  c.reset();
  c.press('control', 0);
  c.release('control');
  assert.deepEqual(c.press('base', 200), ['touch']);
});
void test('late second button begins a new stroke and key repeat cannot duplicate', () => {
  const c = new ShotCombos();
  c.press('base', 0);
  assert.deepEqual(c.press('base', 150), []);
  assert.deepEqual(c.press('control', 221), ['base']);
  assert.deepEqual(c.flush(441), ['control']);
});
void test('reset drops pending actions when pausing or disconnecting', () => {
  const c = new ShotCombos();
  c.press('base', 0);
  c.reset();
  assert.deepEqual(c.flush(500), []);
  assert.deepEqual(c.press('base', 600), []);
});
void test('keyboard and controller remaps swap conflicting current actions', () => {
  const keyboard = rebindControl(
    DEFAULT_BINDINGS,
    'simple',
    'keyboard',
    'base',
    'KeyK',
  );
  assert.equal(keyboard.conflict, 'control');
  assert.equal(keyboard.bindings.keyboard.base, 'KeyK');
  assert.equal(keyboard.bindings.keyboard.control, 'KeyJ');
  const pad = rebindControl(DEFAULT_BINDINGS, 'simple', 'gamepad', 'smash', 0);
  assert.equal(pad.bindings.gamepad.base, 2);
  assert.equal(pad.bindings.gamepad.smash, 0);
  assert.equal(DEFAULT_BINDINGS.keyboard.base, 'KeyJ');
});
void test('saved invalid bindings fall back and analog deadzone has continuous range', () => {
  const saved = normalizeBindings({
    keyboard: { base: '<script>', smash: 'KeyZ' },
    gamepad: { base: 99, smash: 8 },
  });
  assert.equal(saved.keyboard.base, 'KeyJ');
  assert.equal(saved.keyboard.smash, 'KeyZ');
  assert.equal(saved.gamepad.base, 0);
  assert.equal(saved.gamepad.smash, 8);
  assert.equal(axisWithDeadzone(0.12, 0.18), 0);
  assert.equal(axisWithDeadzone(1, 0.18), 1);
  assert.equal(axisWithDeadzone(-1, 0.18), -1);
  assert.ok(axisWithDeadzone(0.6, 0.18) > 0);
});

void test('switching schemes resolves shared default keys without duplicates', () => {
  const remapped = rebindControl(
    DEFAULT_BINDINGS,
    'simple',
    'keyboard',
    'base',
    'KeyK',
  ).bindings;
  const classic = bindingsForScheme(remapped, 'clasico');
  const codes = relevantActions('clasico').map(
    (action) => classic.keyboard[action],
  );
  assert.equal(new Set(codes).size, codes.length);
  assert.equal(classic.keyboard.base, 'KeyK');
});
