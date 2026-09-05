export interface ArenaPoint {
  x: number;
  z: number;
}

export interface ArenaSpatialPoint extends ArenaPoint {
  y: number;
}

export interface ArenaObstacle {
  id: string;
  kind: 'bench' | 'umpire-chair' | 'grandstand' | 'railing';
  minX: number;
  maxX: number;
  minZ: number;
  maxZ: number;
  height: number;
}

export const ARENA_BOUNDS = {
  minX: -13,
  maxX: 13,
  minZ: -7,
  maxZ: 7,
} as const;

export const ARENA_OBSTACLES: readonly ArenaObstacle[] = [
  {
    id: 'bench-north',
    kind: 'bench',
    minX: 7.2,
    maxX: 9,
    minZ: 3.35,
    maxZ: 9.05,
    height: 1.7,
  },
  {
    id: 'bench-south',
    kind: 'bench',
    minX: 7.2,
    maxX: 9,
    minZ: -8.25,
    maxZ: -2.55,
    height: 1.7,
  },
  {
    id: 'umpire-chair',
    kind: 'umpire-chair',
    minX: 6.55,
    maxX: 7.65,
    minZ: -0.65,
    maxZ: 0.65,
    height: 3,
  },
  ...([-1, 1] as const).flatMap((end) => [
    {
      id: `grandstand-right-${end < 0 ? 'south' : 'north'}`,
      kind: 'grandstand' as const,
      minX: 10.17,
      maxX: 16.13,
      minZ: end < 0 ? -8.2 : 1.6,
      maxZ: end < 0 ? -1.6 : 8.2,
      height: 3.52,
    },
    {
      id: `grandstand-left-${end < 0 ? 'south' : 'north'}`,
      kind: 'grandstand' as const,
      minX: -15.53,
      maxX: -9.57,
      minZ: end < 0 ? -8.2 : 1.6,
      maxZ: end < 0 ? -1.6 : 8.2,
      height: 3.52,
    },
    {
      id: `railing-right-${end < 0 ? 'south' : 'north'}`,
      kind: 'railing' as const,
      minX: 9.925,
      maxX: 9.975,
      minZ: end < 0 ? -8.2 : 1.6,
      maxZ: end < 0 ? -1.6 : 8.2,
      height: 1.05,
    },
    {
      id: `railing-left-${end < 0 ? 'south' : 'north'}`,
      kind: 'railing' as const,
      minX: -9.375,
      maxX: -9.325,
      minZ: end < 0 ? -8.2 : 1.6,
      maxZ: end < 0 ? -1.6 : 8.2,
      height: 1.05,
    },
  ]),
];

const EPSILON = 1e-6;
const ROUTE_CLEARANCE = 0.035;

const clamp = (value: number, min: number, max: number) =>
  Math.max(min, Math.min(max, value));

const distance = (a: ArenaPoint, b: ArenaPoint) =>
  Math.hypot(a.x - b.x, a.z - b.z);

function expanded(obstacle: ArenaObstacle, padding: number) {
  return {
    minX: obstacle.minX - padding,
    maxX: obstacle.maxX + padding,
    minZ: obstacle.minZ - padding,
    maxZ: obstacle.maxZ + padding,
  };
}

export function arenaObstacleAt(
  point: ArenaPoint,
  padding = 0,
  y = 0,
): ArenaObstacle | null {
  return (
    ARENA_OBSTACLES.find((obstacle) => {
      const box = expanded(obstacle, padding);
      return (
        y <= obstacle.height + padding &&
        point.x > box.minX &&
        point.x < box.maxX &&
        point.z > box.minZ &&
        point.z < box.maxZ
      );
    }) ?? null
  );
}

function clampToArena(point: ArenaPoint, padding: number): ArenaPoint {
  return {
    x: clamp(point.x, ARENA_BOUNDS.minX + padding, ARENA_BOUNDS.maxX - padding),
    z: clamp(point.z, ARENA_BOUNDS.minZ + padding, ARENA_BOUNDS.maxZ - padding),
  };
}

function projectOutsideObstacles(
  point: ArenaPoint,
  padding: number,
): ArenaPoint {
  let result = clampToArena(point, padding);
  for (let pass = 0; pass < ARENA_OBSTACLES.length; pass++) {
    const obstacle = arenaObstacleAt(result, padding);
    if (!obstacle) return result;
    const box = expanded(obstacle, padding + ROUTE_CLEARANCE);
    const candidates = [
      { x: box.minX, z: result.z },
      { x: box.maxX, z: result.z },
      { x: result.x, z: box.minZ },
      { x: result.x, z: box.maxZ },
    ]
      .map((candidate) => clampToArena(candidate, padding))
      .filter((candidate) => !arenaObstacleAt(candidate, padding));
    if (!candidates.length) return result;
    candidates.sort((a, b) => distance(point, a) - distance(point, b));
    result = candidates[0];
  }
  return result;
}

function segmentInterval(
  from: ArenaPoint,
  to: ArenaPoint,
  obstacle: ArenaObstacle,
  padding: number,
) {
  const box = expanded(obstacle, padding);
  const dx = to.x - from.x,
    dz = to.z - from.z;
  let entry = 0,
    exit = 1,
    entryAxis: 'x' | 'z' = 'x';
  for (const [origin, delta, min, max, axis] of [
    [from.x, dx, box.minX, box.maxX, 'x'],
    [from.z, dz, box.minZ, box.maxZ, 'z'],
  ] as const) {
    if (Math.abs(delta) < EPSILON) {
      if (origin <= min || origin >= max) return null;
      continue;
    }
    const a = (min - origin) / delta,
      b = (max - origin) / delta,
      near = Math.min(a, b),
      far = Math.max(a, b);
    if (near > entry) {
      entry = near;
      entryAxis = axis;
    }
    exit = Math.min(exit, far);
    if (entry > exit) return null;
  }
  if (exit <= EPSILON || entry >= 1 - EPSILON) return null;
  return { entry: Math.max(0, entry), axis: entryAxis };
}

function segmentBlocked(from: ArenaPoint, to: ArenaPoint, padding: number) {
  return ARENA_OBSTACLES.some((obstacle) =>
    segmentInterval(from, to, obstacle, padding),
  );
}

export interface ArenaObstacleHit {
  obstacle: ArenaObstacle;
  point: ArenaSpatialPoint;
  fraction: number;
}

/** First swept-sphere contact with exterior furniture. */
export function firstArenaObstacleHit(
  from: ArenaSpatialPoint,
  to: ArenaSpatialPoint,
  radius: number,
): ArenaObstacleHit | null {
  let first: ArenaObstacleHit | null = null;
  for (const obstacle of ARENA_OBSTACLES) {
    let entry = 0,
      exit = 1;
    for (const [origin, delta, min, max] of [
      [from.x, to.x - from.x, obstacle.minX - radius, obstacle.maxX + radius],
      [from.y, to.y - from.y, -radius, obstacle.height + radius],
      [from.z, to.z - from.z, obstacle.minZ - radius, obstacle.maxZ + radius],
    ] as const) {
      if (Math.abs(delta) < EPSILON) {
        if (origin < min || origin > max) {
          entry = 2;
          break;
        }
        continue;
      }
      const a = (min - origin) / delta,
        b = (max - origin) / delta;
      entry = Math.max(entry, Math.min(a, b));
      exit = Math.min(exit, Math.max(a, b));
      if (entry > exit) break;
    }
    if (entry > exit || exit < 0 || entry > 1) continue;
    const fraction = clamp(entry, 0, 1);
    if (first && fraction >= first.fraction) continue;
    first = {
      obstacle,
      fraction,
      point: {
        x: from.x + (to.x - from.x) * fraction,
        y: from.y + (to.y - from.y) * fraction,
        z: from.z + (to.z - from.z) * fraction,
      },
    };
  }
  return first;
}

export interface ArenaPath {
  points: ArenaPoint[];
  target: ArenaPoint;
  length: number;
}

/** Visibility routing around expanded furniture, while preserving existing bounds. */
export function findArenaPath(
  from: ArenaPoint,
  requestedTarget: ArenaPoint,
  radius: number,
): ArenaPath {
  const start = projectOutsideObstacles(from, radius),
    target = projectOutsideObstacles(requestedTarget, radius),
    cornerPadding = radius + ROUTE_CLEARANCE;
  const nodes: ArenaPoint[] = [start, target];
  for (const obstacle of ARENA_OBSTACLES) {
    const box = expanded(obstacle, cornerPadding);
    for (const corner of [
      { x: box.minX, z: box.minZ },
      { x: box.minX, z: box.maxZ },
      { x: box.maxX, z: box.minZ },
      { x: box.maxX, z: box.maxZ },
    ]) {
      const point = clampToArena(corner, radius);
      if (!arenaObstacleAt(point, radius)) nodes.push(point);
    }
  }
  const costs = nodes.map(() => Number.POSITIVE_INFINITY),
    previous = nodes.map(() => -1),
    visited = nodes.map(() => false);
  costs[0] = 0;
  for (let step = 0; step < nodes.length; step++) {
    let current = -1;
    for (let index = 0; index < nodes.length; index++)
      if (!visited[index] && (current < 0 || costs[index] < costs[current]))
        current = index;
    if (current < 0 || !Number.isFinite(costs[current]) || current === 1) break;
    visited[current] = true;
    for (let next = 0; next < nodes.length; next++) {
      if (
        next === current ||
        visited[next] ||
        segmentBlocked(nodes[current], nodes[next], radius + EPSILON)
      )
        continue;
      const cost = costs[current] + distance(nodes[current], nodes[next]);
      if (cost < costs[next]) {
        costs[next] = cost;
        previous[next] = current;
      }
    }
  }
  if (!Number.isFinite(costs[1])) return { points: [start], target, length: 0 };
  const points: ArenaPoint[] = [];
  for (let cursor = 1; cursor >= 0; cursor = previous[cursor]) {
    points.push(nodes[cursor]);
    if (cursor === 0) break;
  }
  points.reverse();
  return { points, target, length: costs[1] };
}

export interface ConstrainedArenaMotion {
  point: ArenaPoint;
  blockedX: boolean;
  blockedZ: boolean;
  obstacle: ArenaObstacle | null;
}

/** Swept circle collision with tangent sliding for manual player movement. */
export function constrainArenaMotion(
  from: ArenaPoint,
  requested: ArenaPoint,
  radius: number,
): ConstrainedArenaMotion {
  let point = projectOutsideObstacles(from, radius),
    target = clampToArena(requested, radius),
    blockedX = target.x !== requested.x,
    blockedZ = target.z !== requested.z,
    hit: ArenaObstacle | null = null;
  for (let pass = 0; pass < 3; pass++) {
    let collision:
      | { obstacle: ArenaObstacle; entry: number; axis: 'x' | 'z' }
      | undefined;
    for (const obstacle of ARENA_OBSTACLES) {
      const interval = segmentInterval(point, target, obstacle, radius);
      if (interval && (!collision || interval.entry < collision.entry))
        collision = { obstacle, ...interval };
    }
    if (!collision) {
      point = target;
      break;
    }
    hit = collision.obstacle;
    const dx = target.x - point.x,
      dz = target.z - point.z,
      travel = Math.max(0, collision.entry - 1e-5),
      contact = { x: point.x + dx * travel, z: point.z + dz * travel },
      remaining = 1 - collision.entry;
    if (collision.axis === 'x') {
      blockedX = true;
      target = { x: contact.x, z: contact.z + dz * remaining };
    } else {
      blockedZ = true;
      target = { x: contact.x + dx * remaining, z: contact.z };
    }
    point = contact;
  }
  return {
    point: clampToArena(point, radius),
    blockedX,
    blockedZ,
    obstacle: hit,
  };
}
