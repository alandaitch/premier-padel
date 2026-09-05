import test from 'node:test';
import assert from 'node:assert/strict';
import {
  ARENA_BOUNDS,
  ARENA_OBSTACLES,
  arenaObstacleAt,
  constrainArenaMotion,
  firstArenaObstacleHit,
  findArenaPath,
} from './arena-layout';

void test('shared arena geometry exposes furniture, stands and front railings', () => {
  assert.deepEqual(ARENA_BOUNDS, { minX: -13, maxX: 13, minZ: -7, maxZ: 7 });
  assert.equal(ARENA_OBSTACLES.length, 11);
  assert.equal(arenaObstacleAt({ x: 8, z: 5.8 })?.id, 'bench-north');
  assert.equal(arenaObstacleAt({ x: 7, z: 0 })?.id, 'umpire-chair');
  assert.equal(arenaObstacleAt({ x: 9.95, z: 4 })?.id, 'railing-right-north');
  assert.equal(arenaObstacleAt({ x: -12, z: -4 })?.id, 'grandstand-left-south');
});

void test('visibility path uses the central gap and never crosses expanded solids', () => {
  const radius = 0.22;
  const path = findArenaPath({ x: 5.45, z: 0.65 }, { x: 9.5, z: -4 }, radius);
  assert.ok(path.points.length > 2);
  assert.ok(path.length > 0);
  for (const point of path.points)
    assert.equal(arenaObstacleAt(point, radius - 1e-4), null);
  assert.ok(
    path.points.some((point) => Math.abs(point.z) < 1.6),
    'route preserves the central grandstand gap',
  );
});

void test('swept motion stops at the railing and preserves arena bounds', () => {
  const radius = 0.22;
  const result = constrainArenaMotion(
    { x: 9.4, z: 4 },
    { x: 14, z: 4 },
    radius,
  );
  assert.ok(result.blockedX);
  assert.equal(result.obstacle?.id, 'railing-right-north');
  assert.ok(result.point.x <= 9.925 - radius + 0.002);
  assert.ok(result.point.x <= ARENA_BOUNDS.maxX - radius);
});

void test('swept ball contact detects thin furniture and respects its height', () => {
  const hit = firstArenaObstacleHit(
    { x: 9.5, y: 0.8, z: 4 },
    { x: 10.4, y: 0.8, z: 4 },
    0.065,
  );
  assert.equal(hit?.obstacle.id, 'railing-right-north');
  assert.ok(hit && hit.point.x < 9.925);
  assert.equal(
    firstArenaObstacleHit(
      { x: 9.5, y: 1.3, z: 4 },
      { x: 10.4, y: 1.3, z: 4 },
      0.065,
    )?.obstacle.id,
    'grandstand-right-north',
  );
});
