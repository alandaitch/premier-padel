import assert from 'node:assert/strict';
import { test } from 'node:test';
import {
  VictoryCombo,
  VICTORY_SEQUENCE,
  VICTORY_COMBO_TOTAL_MS,
  VICTORY_COMBO_GAP_MS,
} from './victory-combo';

void test('victory sequence emits success once and locks until reset', () => {
  const combo = new VictoryCombo();
  const results = VICTORY_SEQUENCE.map((action, index) => {
    const result = combo.feed(action, index * 300);
    assert.equal(combo.progress, index + 1);
    return result;
  });
  assert.deepEqual(results, [false, false, false, false, false, true]);
  for (const [index, action] of VICTORY_SEQUENCE.entries())
    assert.equal(combo.feed(action, 2000 + index * 300), false);
  assert.equal(combo.progress, 6);
  combo.reset();
  assert.equal(combo.progress, 0);
  assert.equal(
    VICTORY_SEQUENCE.reduce(
      (_, action, i) => combo.feed(action, 5000 + i * 100),
      false,
    ),
    true,
  );
});

void test('wrong actions reset, while a wrong down begins a fresh prefix', () => {
  const combo = new VictoryCombo();
  combo.feed('down', 0);
  combo.feed('down', 100);
  assert.equal(combo.feed('left', 200), false);
  assert.equal(combo.progress, 0);
  combo.feed('down', 300);
  combo.feed('down', 400);
  combo.feed('up', 500);
  assert.equal(combo.feed('down', 600), false);
  assert.equal(combo.progress, 1);
  for (const [i, action] of VICTORY_SEQUENCE.slice(1).entries())
    assert.equal(combo.feed(action, 700 + i * 100), i === 4);
});

void test('per-press gap includes 900ms but rejects 901ms and restarts on down', () => {
  const combo = new VictoryCombo();
  combo.feed('down', 0);
  assert.equal(combo.feed('down', VICTORY_COMBO_GAP_MS), false);
  assert.equal(combo.progress, 2);
  combo.reset();
  combo.feed('down', 0);
  assert.equal(combo.feed('down', VICTORY_COMBO_GAP_MS + 1), false);
  assert.equal(
    combo.progress,
    1,
    'late down is the beginning of a new attempt',
  );
  assert.equal(combo.feed('up', 1000), false);
  assert.equal(combo.progress, 0, 'a new second down is still required');
});

void test('total duration includes 3200ms and rejects longer attempts despite short gaps', () => {
  for (const over of [0, 1]) {
    const combo = new VictoryCombo();
    const times = [0, 600, 1200, 1800, 2500, VICTORY_COMBO_TOTAL_MS + over];
    let completed = false;
    VICTORY_SEQUENCE.forEach((action, i) => {
      completed = combo.feed(action, times[i]);
    });
    assert.equal(completed, over === 0);
    assert.equal(combo.progress, over === 0 ? 6 : 0);
  }
});

void test('reset drops partial input and invalid clocks cannot complete a sequence', () => {
  const combo = new VictoryCombo();
  combo.feed('down', 100);
  combo.feed('down', 200);
  combo.reset();
  assert.equal(combo.feed('up', 300), false);
  assert.equal(combo.progress, 0);
  combo.feed('down', 400);
  combo.feed('down', 500);
  assert.equal(combo.feed('up', 450), false);
  assert.equal(combo.progress, 0);
  for (const time of [Number.NaN, Infinity, -1]) {
    combo.feed('down', 0);
    assert.equal(combo.feed('down', time), false);
    assert.equal(combo.progress, 0);
  }
});

void test('caller press-edge contract ignores hold/repeat events without inventing a second down', () => {
  const combo = new VictoryCombo();
  const events = [
    { action: 'down', at: 0, repeat: false },
    { action: 'down', at: 40, repeat: true },
    { action: 'down', at: 80, repeat: true },
    { action: 'up', at: 120, repeat: false },
  ];
  for (const event of events)
    if (!event.repeat) assert.equal(combo.feed(event.action, event.at), false);
  assert.equal(
    combo.progress,
    0,
    'holding one down did not supply two press edges',
  );
});

void test('logical actions allow remapped keyboard or controller buttons identically', () => {
  const layouts = [
    { Down: 'down', Up: 'up', Right: 'right', A: 'base', B: 'control' },
    { KeyX: 'down', KeyY: 'up', KeyZ: 'right', KeyN: 'base', KeyM: 'control' },
  ];
  for (const layout of layouts) {
    const combo = new VictoryCombo();
    const physical = VICTORY_SEQUENCE.map(
      (action) =>
        Object.entries(layout).find(([, mapped]) => mapped === action)![0],
    );
    const results = physical.map((button, i) =>
      combo.feed(layout[button as keyof typeof layout]!, i * 150),
    );
    assert.deepEqual(results, [false, false, false, false, false, true]);
  }
});

void test('RAF expiration clears unfinished hints without consuming another action', () => {
  const combo = new VictoryCombo();
  combo.feed('down', 0);
  combo.expire(900);
  assert.equal(combo.progress, 1);
  combo.expire(901);
  assert.equal(combo.progress, 0);
  VICTORY_SEQUENCE.slice(0, 5).forEach((action, i) =>
    combo.feed(action, i * 625),
  );
  combo.expire(3200);
  assert.equal(combo.progress, 5);
  combo.expire(3201);
  assert.equal(combo.progress, 0);
  VICTORY_SEQUENCE.forEach((action, i) => combo.feed(action, 4000 + i * 100));
  combo.expire(100000);
  assert.equal(combo.progress, 6);
  assert.equal(
    combo.feed('down', 100001),
    false,
    'expiry does not unlock a completed celebration',
  );
});
