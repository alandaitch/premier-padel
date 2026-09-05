import {
  constrainArenaMotion,
  firstArenaObstacleHit,
  findArenaPath,
  type ArenaPoint,
  type ArenaSpatialPoint,
} from './arena-layout';

/**
 * Premier Padel simulation. Metres / seconds, positive Z is the home pair.
 * The camera keeps the home team near the viewer after changes of ends.
 * Rules reference: FIP Rules of Padel, application 01.01.2026.
 * Deliberate prototype limits: no exhaustive body-contact faults;
 * racket aiming is assisted; passive impacts use a hollow-sphere impulse model.
 */
export type Shot =
  | 'plano'
  | 'globo'
  | 'bandeja'
  | 'vibora'
  | 'remate'
  | 'dejada'
  | 'bajada'
  | 'chiquita'
  | 'volea'
  | 'contrapared';
export type Smash = 'retorno' | 'por3' | 'por4' | 'alto';
export type ExteriorReturn = 'auto' | 'puerta' | 'alta' | 'red';
export type TrainingFeed =
  | 'rally'
  | 'serve'
  | 'ground'
  | 'volley'
  | 'lob'
  | 'wall'
  | 'double-wall'
  | 'exterior';
export interface TrainingDrill {
  id: string;
  label: string;
  description: string;
  targetShot: Shot | 'saque' | null;
  feedBehavior: TrainingFeed;
  smash?: Smash;
  waitWall?: boolean;
}
/** Prepared feeds use the regular flight, contact and collision simulation. */
export const TRAINING_DRILLS = [
  {
    id: 'libre',
    label: 'Peloteo libre',
    description: 'Devolvé el saque y construí el punto con tu compañero.',
    targetShot: null,
    feedBehavior: 'rally',
  },
  {
    id: 'saque',
    label: 'Saque de abajo',
    description:
      'Picá, sacá cruzado bajo la cintura y acompañá a tu compañero a la red.',
    targetShot: 'saque',
    feedBehavior: 'serve',
  },
  {
    id: 'plano',
    label: 'Derecha y revés',
    description:
      'Esperá el pique. Contactá delante del cuerpo y recuperá el fondo.',
    targetShot: 'plano',
    feedBehavior: 'ground',
  },
  {
    id: 'volea',
    label: 'Volea',
    description: 'En la red, bloqueá delante del cuerpo antes del pique.',
    targetShot: 'volea',
    feedBehavior: 'volley',
  },
  {
    id: 'globo',
    label: 'Globo',
    description: 'Desde el fondo, pasá a los rivales antes de subir en pareja.',
    targetShot: 'globo',
    feedBehavior: 'ground',
  },
  {
    id: 'bandeja',
    label: 'Bandeja',
    description:
      'Perfilate, contactá a la altura de los ojos y recuperá la red.',
    targetShot: 'bandeja',
    feedBehavior: 'lob',
  },
  {
    id: 'vibora',
    label: 'Víbora',
    description:
      'Perfilate y acelerá por el costado para producir un rebote bajo.',
    targetShot: 'vibora',
    feedBehavior: 'lob',
  },
  {
    id: 'remate',
    label: 'Remate · Traérmela',
    description: 'Cargá y apuntá: pique, vidrio de fondo y vuelta a tu campo.',
    targetShot: 'remate',
    feedBehavior: 'lob',
    smash: 'retorno',
  },
  {
    id: 'remate-por3',
    label: 'Remate · Por 3',
    description:
      'Buscá el ángulo lateral después del pique. El rival puede salir a rescatar.',
    targetShot: 'remate',
    feedBehavior: 'lob',
    smash: 'por3',
  },
  {
    id: 'remate-por4',
    label: 'Remate · Por 4',
    description:
      'Cerca de la red, impactá alto para superar el fondo después del pique.',
    targetShot: 'remate',
    feedBehavior: 'lob',
    smash: 'por4',
  },
  {
    id: 'remate-alto',
    label: 'Remate · Paralelo alto',
    description:
      'Impactá arriba y en paralelo: el pique debe elevarse lejos del rival.',
    targetShot: 'remate',
    feedBehavior: 'lob',
    smash: 'alto',
  },
  {
    id: 'dejada',
    label: 'Dejada',
    description:
      'Desde la red, amortiguá una pelota cómoda para dejarla corta.',
    targetShot: 'dejada',
    feedBehavior: 'volley',
  },
  {
    id: 'chiquita',
    label: 'Chiquita',
    description:
      'Jugá lento a los pies; avanzá cuando el rival tenga que levantarla.',
    targetShot: 'chiquita',
    feedBehavior: 'ground',
  },
  {
    id: 'bajada',
    label: 'Bajada de pared',
    description:
      'Dejá pasar el vidrio y atacá la salida alta con el peso hacia delante.',
    targetShot: 'bajada',
    feedBehavior: 'wall',
    waitWall: true,
  },
  {
    id: 'contrapared',
    label: 'Contrapared',
    description:
      'De espaldas a la red, elevá contra tu vidrio para ganar tiempo.',
    targetShot: 'contrapared',
    feedBehavior: 'wall',
    waitWall: true,
  },
  {
    id: 'pared',
    label: 'Salida de pared',
    description:
      'Dejá pasar al vidrio y acompañá la pelota después de un único pique.',
    targetShot: 'globo',
    feedBehavior: 'wall',
    waitWall: true,
  },
  {
    id: 'doble-pared',
    label: 'Doble pared',
    description:
      'Esperá los dos vidrios, abrí espacio y devolvé antes del segundo pique.',
    targetShot: 'globo',
    feedBehavior: 'double-wall',
    waitWall: true,
  },
  {
    id: 'rescate',
    label: 'Rescate exterior',
    description:
      'Salí por la puerta tras el por 3; apuntá de vuelta por la puerta, arriba o a la red.',
    targetShot: 'plano',
    feedBehavior: 'exterior',
  },
] as const satisfies readonly TrainingDrill[];
export type TrainingDrillId = (typeof TRAINING_DRILLS)[number]['id'];
export type Team = 0 | 1;
export type TimingQuality = 'perfect' | 'good' | 'late';
export interface Input {
  moveX: number;
  moveZ: number;
  hit: boolean;
  shot: Shot;
  power: number;
  aim: number;
  switchPlayer?: boolean;
  waitWall?: boolean;
  smash?: Smash;
  charging?: boolean;
  charge?: number;
  perfect?: boolean;
  timingQuality?: TimingQuality;
  exteriorReturn?: ExteriorReturn;
}
export interface Ball {
  x: number;
  y: number;
  z: number;
  vx: number;
  vy: number;
  vz: number;
  /** Angular velocity in world axes, rad/s. Missing values mean no spin. */
  wx?: number;
  wy?: number;
  wz?: number;
}
export interface Player {
  id: number;
  team: Team;
  x: number;
  z: number;
  vx: number;
  vz: number;
  facing: number;
  swing: number;
  shot: Shot;
  preparedShot?: Shot;
  energy: number;
  height: number;
  handedness: 'left' | 'right';
  playingSide: 'left' | 'right';
  preparation: number;
  movementIntent:
    | 'espera'
    | 'red'
    | 'defensa'
    | 'giro'
    | 'pared'
    | 'remate'
    | 'exterior'
    | 'regreso';
  outside: boolean;
  charging: boolean;
  charge: number;
  reachAcross: boolean;
}
export interface Score {
  points: [number, number];
  games: [number, number];
  sets: [number, number];
  history: Array<[number, number]>;
  pointLabels: [string, string];
  tieBreak: boolean;
  starPoint: boolean;
}
export interface GameState {
  ball: Ball;
  ballSpin: { x: number; y: number; z: number; rpm: number };
  players: Player[];
  score: Score;
  phase: 'serve' | 'rally' | 'point' | 'finished';
  server: number;
  controlled: number;
  message: string;
  winner: Team | null;
  rally: number;
  speed: number;
  lastShot: Shot;
  eventId: number;
  eventType: string;
  /** Present on live V9 states; optional so archived V7/V8 captures still replay. */
  meshImpactId?: number;
  meshImpact?: {
    id: number;
    type: 'mesh';
    x: number;
    y: number;
    z: number;
    time: number;
    /** Incoming speed normal to the fence, in metres per second. */
    normalSpeed: number;
    /** Normalized excitation used by presentation and audio. */
    power: number;
  } | null;
  time: number;
  serveAttempt: 1 | 2;
  incomingTeam: Team;
  pointWinner: Team | null;
  canHit: boolean;
  needsReceivingSide: boolean;
  serviceMotion: number;
  ballBounce: number;
  predictedBounce: { x: number; z: number };
  ballSituation:
    | 'saque'
    | 'vuelo'
    | 'esperando-pared'
    | 'pared'
    | 'doble-pared'
    | 'retorno'
    | 'exterior'
    | 'punto';
  ballOutside: boolean;
  exteriorSide: -1 | 0 | 1;
  exteriorReturnMode: ExteriorReturn;
  /** Court-relative coordinates keep the home pair near the broadcast camera. */
  endsSwapped: boolean;
  lastPoint: PointOutcome | null;
  tacticalHint: string;
  wallBounces: number;
  returnedToHitter: boolean;
  teamTactics: [string, string];
  smashMode: Smash;
  lastHitterId: number;
  contactPoint: {
    x: number;
    y: number;
    z: number;
    time: number;
    playerId: number;
    shot: Shot;
    quality?: TimingQuality;
  } | null;
  lastBounce: {
    x: number;
    y: number;
    z: number;
    time: number;
    surface: 'suelo' | 'vidrio' | 'malla' | 'red';
    normalSpeedBefore?: number;
    normalSpeedAfter?: number;
    energyRatio?: number;
  } | null;
  stats: {
    winners: [number, number];
    errors: [number, number];
    longestRally: number;
    totalPoints: number;
    maxSpeed: number;
  };
}
export interface PointOutcome {
  /** Snapshot only for a winning stroke, never an opponent error. */
  winningPlayerId?: number;
  winningShot?: Shot;
  id: number;
  winner: Team;
  game: boolean;
  set: boolean;
  match: boolean;
  gameNumber: number;
  setNumber: number;
  changeEnds: boolean;
  rest: 'none' | 'changeover' | 'set';
}
export interface MatchOptions {
  difficulty?: 'facil' | 'normal' | 'dificil';
  gamesToWin?: number;
  setsToWin?: number;
  training?: boolean;
  autoPlay?: boolean;
  scoring?: 'ventaja' | 'star';
  drill?: TrainingDrillId;
  exteriorPlay?: boolean;
  playerProfiles?: Array<{
    height: number;
    handedness: 'left' | 'right';
    playingSide?: 'left' | 'right';
  }>;
}
export const COURT = {
  halfWidth: 5,
  halfLength: 10,
  serviceLine: 6.95,
  netHeight: 0.88,
  sideHeight: 3,
  endHeight: 4,
  doorMinZ: 0.1,
  doorMaxZ: 1.2,
  doorHeight: 2.2,
  exteriorWidth: 8,
  exteriorHalfLength: 7,
  playerRadius: 0.22,
} as const;
export const SHOT_NAMES: Record<Shot, string> = {
  plano: 'Golpe plano',
  globo: 'Globo',
  bandeja: 'Bandeja',
  vibora: 'Víbora',
  remate: 'Remate',
  dejada: 'Dejada',
  bajada: 'Bajada de pared',
  chiquita: 'Chiquita',
  volea: 'Volea',
  contrapared: 'Contrapared',
};
const G = 9.81;
const R = 0.033;
const clamp = (v: number, a: number, b: number) => Math.max(a, Math.min(b, v));
const opposite = (t: Team): Team => (t === 0 ? 1 : 0);
const signFor = (t: Team) => (t === 0 ? 1 : -1);
const sideOf = (z: number): Team => (z >= 0 ? 0 : 1);
const distance = (a: { x: number; z: number }, b: { x: number; z: number }) =>
  Math.hypot(a.x - b.x, a.z - b.z);
const homeX = (p: Pick<Player, 'team' | 'playingSide'>) =>
  (p.playingSide === 'left' ? -1 : 1) * signFor(p.team) * 2.35;
const labels = ['0', '15', '30', '40'];

/** Advantage or Premier Padel 2026 Star Point, plus seven-point tie-break. */
export class ScoreKeeper {
  readonly score: Score = {
    points: [0, 0],
    games: [0, 0],
    sets: [0, 0],
    history: [],
    pointLabels: ['0', '0'],
    tieBreak: false,
    starPoint: false,
  };
  winner: Team | null = null;
  gamesPlayed = 0;
  constructor(
    readonly gamesToWin = 6,
    readonly setsToWin = 2,
    readonly scoring: 'ventaja' | 'star' = 'ventaja',
  ) {}
  award(team: Team): { game: boolean; set: boolean; match: boolean } {
    const result = { game: false, set: false, match: false };
    if (this.winner !== null) return result;
    const s = this.score,
      other = opposite(team);
    const decisive =
      this.scoring === 'star' &&
      !s.tieBreak &&
      s.points[0] >= 5 &&
      s.points[0] === s.points[1];
    s.points[team]++;
    const required = s.tieBreak ? 7 : 4;
    if (
      decisive ||
      (s.points[team] >= required && s.points[team] - s.points[other] >= 2)
    ) {
      result.game = true;
      this.gamesPlayed++;
      s.games[team]++;
      const wasTieBreak = s.tieBreak;
      s.points = [0, 0];
      if (
        wasTieBreak ||
        (s.games[team] >= this.gamesToWin &&
          s.games[team] - s.games[other] >= 2)
      ) {
        result.set = true;
        s.history.push([...s.games]);
        s.sets[team]++;
        s.games = [0, 0];
        s.tieBreak = false;
        if (s.sets[team] >= this.setsToWin) {
          this.winner = team;
          result.match = true;
        }
      } else if (
        s.games[0] === this.gamesToWin &&
        s.games[1] === this.gamesToWin
      )
        s.tieBreak = true;
    }
    this.refreshLabels();
    return result;
  }
  refreshLabels() {
    const s = this.score;
    s.starPoint =
      this.scoring === 'star' &&
      !s.tieBreak &&
      s.points[0] >= 5 &&
      s.points[0] === s.points[1];
    if (s.tieBreak) s.pointLabels = [String(s.points[0]), String(s.points[1])];
    else if (s.points[0] >= 3 && s.points[1] >= 3) {
      s.pointLabels =
        s.points[0] === s.points[1]
          ? ['40', '40']
          : s.points[0] > s.points[1]
            ? ['AD', '40']
            : ['40', 'AD'];
    } else
      s.pointLabels = [
        labels[Math.min(3, s.points[0])],
        labels[Math.min(3, s.points[1])],
      ];
  }
}

/** FIP size/mass; surface/aerodynamic assumptions are documented in PHYSICS-V4.md. */
export const BALL_PHYSICS = {
  radius: R,
  mass: 0.0577,
  inertiaRatio: 2 / 3,
  airDensity: 1.21,
  dragCoefficient: 0.55,
  spinDecay: 0.12,
  materials: {
    hard: { restitution: 0.768, friction: 0.3 },
    turf: { restitution: 0.75, friction: 0.55 },
    glass: { restitution: 0.768, friction: 0.22 },
    mesh: { restitution: 0.48, friction: 0.65 },
    net: { restitution: 0.12, friction: 0.75 },
  },
} as const;
export type Surface = keyof typeof BALL_PHYSICS.materials;
export interface Vector3 {
  x: number;
  y: number;
  z: number;
}
export interface ContactResult {
  normalSpeedBefore: number;
  normalSpeedAfter: number;
  energyRatio: number;
  sliding: boolean;
}
export function kineticEnergy(b: Ball): number {
  const rotational =
    BALL_PHYSICS.inertiaRatio *
    R *
    R *
    ((b.wx ?? 0) ** 2 + (b.wy ?? 0) ** 2 + (b.wz ?? 0) ** 2);
  return (
    0.5 *
    BALL_PHYSICS.mass *
    (b.vx * b.vx + b.vy * b.vy + b.vz * b.vz + rotational)
  );
}
/** Passive rigid hollow-sphere impact. No shot names or additional energy enter here. */
export function collideBall(
  b: Ball,
  normal: Vector3,
  surface: Surface,
): ContactResult {
  const nLen = Math.hypot(normal.x, normal.y, normal.z);
  const nx = normal.x / nLen,
    ny = normal.y / nLen,
    nz = normal.z / nLen;
  const vn = b.vx * nx + b.vy * ny + b.vz * nz,
    before = kineticEnergy(b);
  if (vn >= 0)
    return {
      normalSpeedBefore: 0,
      normalSpeedAfter: 0,
      energyRatio: 1,
      sliding: false,
    };
  const material = BALL_PHYSICS.materials[surface];
  // Viscoelastic speed dependence is an approximation, shared by every shot.
  const e = clamp(
    material.restitution - 0.004 * Math.max(0, -vn - 7),
    0.5 * material.restitution,
    material.restitution,
  );
  const normalImpulse = -(1 + e) * vn; // impulse per mass, m/s
  b.vx += normalImpulse * nx;
  b.vy += normalImpulse * ny;
  b.vz += normalImpulse * nz;
  const wx = b.wx ?? 0,
    wy = b.wy ?? 0,
    wz = b.wz ?? 0;
  const rx = -R * nx,
    ry = -R * ny,
    rz = -R * nz;
  const cx = b.vx + wy * rz - wz * ry,
    cy = b.vy + wz * rx - wx * rz,
    cz = b.vz + wx * ry - wy * rx;
  const cn = cx * nx + cy * ny + cz * nz;
  const tx = cx - cn * nx,
    ty = cy - cn * ny,
    tz = cz - cn * nz,
    slip = Math.hypot(tx, ty, tz);
  const effective = 1 + 1 / BALL_PHYSICS.inertiaRatio;
  const needed = slip / effective,
    allowed = material.friction * normalImpulse;
  const magnitude = Math.min(needed, allowed),
    factor = slip > 1e-9 ? -magnitude / slip : 0;
  const jx = tx * factor,
    jy = ty * factor,
    jz = tz * factor;
  b.vx += jx;
  b.vy += jy;
  b.vz += jz;
  const inertia = BALL_PHYSICS.inertiaRatio * R * R;
  b.wx = wx + (ry * jz - rz * jy) / inertia;
  b.wy = wy + (rz * jx - rx * jz) / inertia;
  b.wz = wz + (rx * jy - ry * jx) / inertia;
  return {
    normalSpeedBefore: -vn,
    normalSpeedAfter: -vn * e,
    energyRatio: before > 0 ? kineticEnergy(b) / before : 1,
    sliding: needed > allowed,
  };
}
function acceleration(b: Ball): Vector3 {
  const speed = Math.hypot(b.vx, b.vy, b.vz);
  if (speed < 1e-8) return { x: 0, y: -G, z: 0 };
  const factor =
    (0.5 * BALL_PHYSICS.airDensity * Math.PI * R * R) / BALL_PHYSICS.mass;
  const drag = factor * BALL_PHYSICS.dragCoefficient * speed;
  const wx = b.wx ?? 0,
    wy = b.wy ?? 0,
    wz = b.wz ?? 0;
  const mx = wy * b.vz - wz * b.vy,
    my = wz * b.vx - wx * b.vz,
    mz = wx * b.vy - wy * b.vx;
  const cross = Math.hypot(mx, my, mz),
    peripheral = (R * cross) / speed;
  // Cross/Stepanek felt-ball lift fit; using transverse spin avoids fake lift
  // when the spin axis is parallel to flight.
  const lift =
    peripheral > 1e-8 ? 1 / (2.022 + (0.981 * speed) / peripheral) : 0;
  const magnus = cross > 1e-8 ? (factor * lift * speed * speed) / cross : 0;
  return {
    x: -drag * b.vx + magnus * mx,
    y: -G - drag * b.vy + magnus * my,
    z: -drag * b.vz + magnus * mz,
  };
}
/** Midpoint integration with quadratic drag, gravity and vector Magnus lift. */
export function integrateBall(ball: Ball, dt: number): void {
  const a = acceleration(ball);
  const mid = {
    ...ball,
    vx: ball.vx + (a.x * dt) / 2,
    vy: ball.vy + (a.y * dt) / 2,
    vz: ball.vz + (a.z * dt) / 2,
  };
  const am = acceleration(mid);
  ball.x += mid.vx * dt;
  ball.y += mid.vy * dt;
  ball.z += mid.vz * dt;
  ball.vx += am.x * dt;
  ball.vy += am.y * dt;
  ball.vz += am.z * dt;
  const decay = Math.exp(-BALL_PHYSICS.spinDecay * dt);
  ball.wx = (ball.wx ?? 0) * decay;
  ball.wy = (ball.wy ?? 0) * decay;
  ball.wz = (ball.wz ?? 0) * decay;
}
/** Assisted launch: numerical shooting compensates the actual air model. */
export function solveTrajectory(
  from: { x: number; y: number; z: number },
  target: { x: number; z: number; y?: number },
  flightTime: number,
  spin: Vector3 = { x: 0, y: 0, z: 0 },
): Ball {
  const t = Math.max(target.y === undefined ? 0.12 : 0.03, flightTime);
  const targetY = target.y ?? R;
  const launch: Ball = {
    ...from,
    vx: (target.x - from.x) / t,
    vy: (targetY - from.y + 0.5 * G * t * t) / t,
    vz: (target.z - from.z) / t,
    wx: spin.x,
    wy: spin.y,
    wz: spin.z,
  };
  const count = Math.ceil(t * 120),
    dt = t / count;
  for (let iteration = 0; iteration < 7; iteration++) {
    const b = { ...launch };
    for (let i = 0; i < count; i++) integrateBall(b, dt);
    const gain = 1.05 / t;
    launch.vx += (target.x - b.x) * gain;
    launch.vy += (targetY - b.y) * gain;
    launch.vz += (target.z - b.z) * gain;
  }
  return launch;
}

interface FlightAssessment {
  kind: 'net' | 'fault' | 'floor' | 'retorno' | 'por3' | 'por4' | 'long';
  height: number;
  landing: { x: number; z: number } | null;
  walls: number;
  exit?: Ball;
  peak?: number;
}
/** Used only to aim the racket; it runs the same passive ball/surface model. */
function assessLaunch(launch: Ball, team: Team): FlightAssessment {
  const b = { ...launch },
    sign = signFor(team);
  let bounced = false,
    walls = 0,
    peak = 0,
    landing: { x: number; z: number } | null = null;
  for (let i = 0; i < 480; i++) {
    const oldZ = b.z;
    integrateBall(b, 1 / 120);
    if (bounced) peak = Math.max(peak, b.y);
    if (oldZ * b.z < 0 && b.y < 0.95)
      return { kind: 'net', height: b.y, landing, walls };
    if (b.y < R) {
      if (bounced) return { kind: 'floor', height: b.y, landing, walls, peak };
      if (b.z * sign > 0) return { kind: 'fault', height: b.y, landing, walls };
      bounced = true;
      landing = { x: b.x, z: b.z };
      b.y = R;
      collideBall(b, { x: 0, y: 1, z: 0 }, 'turf');
    }
    if (Math.abs(b.x) + R > 5 && b.vx * b.x > 0) {
      const top = Math.abs(b.z) > 8 ? 4 : 3;
      if (b.y - R > top)
        return {
          kind: bounced ? 'por3' : 'fault',
          exit: { ...b },
          height: b.y,
          landing,
          walls,
        };
      const mesh = Math.abs(b.z) < 6 || b.y > 3;
      if (!bounced && (b.z * sign < 0 || mesh))
        return { kind: 'fault', height: b.y, landing, walls };
      b.x = Math.sign(b.x) * (5 - R);
      collideBall(
        b,
        { x: -Math.sign(b.x), y: 0, z: 0 },
        mesh ? 'mesh' : 'glass',
      );
      walls++;
    }
    if (Math.abs(b.z) + R > 10 && b.vz * b.z > 0) {
      if (b.y - R > 4)
        return {
          kind: bounced ? 'por4' : 'fault',
          height: b.y,
          landing,
          walls,
        };
      const mesh = b.y > 3;
      if (!bounced && (b.z * sign < 0 || mesh))
        return { kind: 'fault', height: b.y, landing, walls };
      b.z = Math.sign(b.z) * (10 - R);
      collideBall(
        b,
        { x: 0, y: 0, z: -Math.sign(b.z) },
        mesh ? 'mesh' : 'glass',
      );
      walls++;
    }
    if (bounced && b.z * sign > 0 && b.y > 0.94)
      return { kind: 'retorno', height: b.y, landing, walls };
  }
  return { kind: 'long', height: b.y, landing, walls };
}
function strokeSpin(
  from: Vector3,
  target: { x: number; z: number },
  shot: Shot,
  power: number,
  aim: number,
  smash: Smash,
): Vector3 {
  const horizontal = Math.hypot(target.x - from.x, target.z - from.z) || 1;
  const dx = (target.x - from.x) / horizontal,
    dz = (target.z - from.z) / horizontal;
  const top =
    shot === 'remate'
      ? smash === 'por4' || smash === 'alto'
        ? 90
        : smash === 'retorno'
          ? 0
          : 260 + power * 70
      : shot === 'bandeja'
        ? -150
        : shot === 'vibora'
          ? -230
          : shot === 'volea'
            ? -90
            : shot === 'dejada'
              ? -140
              : shot === 'chiquita'
                ? -35
                : shot === 'bajada'
                  ? 80
                  : shot === 'globo'
                    ? 15
                    : 45;
  const tilt =
    shot === 'remate' && smash === 'por3'
      ? Math.sign(aim || from.x || 1) * (300 + power * 100)
      : 0;
  return {
    x: dz * top + dx * tilt,
    y: shot === 'vibora' ? aim * 100 : aim * 20,
    z: -dx * top + dz * tilt,
  };
}
function aimSmash(
  from: Vector3,
  team: Team,
  power: number,
  aim: number,
  smash: Smash,
  fallback: Ball,
) {
  const sign = signFor(team),
    side = Math.sign(aim || from.x || 1);
  const depths =
    smash === 'alto'
      ? [1.0, 1.7, 2.5, 3.5, 4.7, 5.8, 6.8, 7.7, 8.5, 9.15]
      : smash === 'retorno'
        ? [4.7, 5.8, 6.8, 7.8, 8.5]
        : smash === 'por3'
          ? [2.0, 3.2, 4.4, 5.5]
          : [1.0, 1.7, 2.5];
  const widths =
    smash === 'alto'
      ? [clamp(from.x + aim * 2.8, -4.2, 4.2)]
      : smash === 'por3'
        ? [0, 0.4, 0.8, 1.2, 1.6, 2.4, 3.2]
        : [clamp(from.x * 0.3 + aim * 1.1, -3, 3)];
  const times =
    smash === 'alto'
      ? [0.16, 0.2, 0.24, 0.28, 0.32, 0.38, 0.44, 0.5]
      : smash === 'retorno'
        ? [0.22, 0.26, 0.3, 0.34, 0.38, 0.42, 0.46, 0.5]
        : smash === 'por3'
          ? [0.16, 0.2, 0.24, 0.28, 0.32]
          : [0.14, 0.18, 0.22, 0.26];
  let best = { ball: fallback, target: { x: fallback.x, z: -sign * 4.5 } },
    bestScore = -1e9;
  for (const depth of depths)
    for (const width of widths)
      for (const t of times) {
        const target = {
          x: smash === 'por3' ? side * width : width,
          z: -sign * depth,
        };
        const spin = strokeSpin(from, target, 'remate', power, aim, smash);
        if (smash === 'por3') {
          spin.x *= 0.5;
          spin.z *= 0.5;
        }
        const ball = solveTrajectory(from, target, t, spin);
        const speed = Math.hypot(ball.vx, ball.vy, ball.vz);
        if (speed > 22 + power * 19) continue;
        const outcome = assessLaunch(ball, team);
        if (['net', 'fault', 'long'].includes(outcome.kind)) continue;
        if (
          smash === 'por3' &&
          outcome.kind === 'por3' &&
          Math.sign(outcome.exit?.x ?? 0) !== side
        )
          continue;
        const highKick =
          outcome.kind === 'floor' &&
          outcome.walls > 0 &&
          (outcome.peak ?? 0) > 3.6;
        const desired =
          smash === 'alto'
            ? highKick || outcome.kind === 'por4'
            : outcome.kind === smash;
        const requestedSpeed = 20 + power * 18;
        const score =
          (desired ? 1000 : 0) +
          (smash === 'alto' && outcome.kind === 'por4' ? 250 : 0) -
          (smash === 'alto'
            ? Math.abs(speed - requestedSpeed) * 14 -
              (outcome.peak ?? outcome.height) * 5
            : smash === 'retorno'
              ? Math.abs(speed - requestedSpeed) * 30 +
                Math.abs(outcome.height - 2.4)
              : smash === 'por3'
                ? Math.abs(outcome.height - (3.3 + power * 2.2)) * 3 +
                  Math.abs(speed - requestedSpeed) * 5
                : Math.abs(outcome.height - 4.7) * 10 +
                  Math.abs(speed - requestedSpeed));
        if (score > bestScore) {
          best = { ball, target };
          bestScore = score;
        }
      }
  return best;
}
function aimContrapared(
  from: Vector3,
  team: Team,
  power: number,
  aim: number,
): Ball {
  const sign = signFor(team);
  let best: Ball = {
      ...from,
      vx: aim * 2,
      vy: 9,
      vz: sign * (18 + power * 5),
      wx: 0,
      wy: 0,
      wz: 0,
    },
    score = -1e9;
  for (const pace of [17, 20, 23, 26])
    for (const up of [7, 9, 11, 13]) {
      const b: Ball = {
        ...from,
        vx: (aim * 3 - from.x) / 1.2,
        vy: up,
        vz: sign * pace,
        wx: 0,
        wy: aim * 40,
        wz: 0,
      };
      const outcome = assessLaunch(b, team);
      if (
        !outcome.landing ||
        outcome.landing.z * sign >= 0 ||
        outcome.walls < 1
      )
        continue;
      const value =
        -Math.abs(Math.abs(outcome.landing.z) - 6.5) * 10 -
        Math.hypot(b.vx, b.vy, b.vz);
      if (value > score) {
        best = b;
        score = value;
      }
    }
  return best;
}

/** Aim is an angle through the aperture, not a guarantee that the return is in. */
export function aimExteriorReturn(
  from: Vector3,
  team: Team,
  power: number,
  aim: number,
  requested: ExteriorReturn = 'auto',
): { ball: Ball; target: { x: number; z: number }; mode: ExteriorReturn } {
  const opponentSign = -signFor(team);
  const side = Math.sign(from.x) || 1;
  const gateX = side * COURT.halfWidth;
  const gateZ = (opponentSign * (COURT.doorMinZ + COURT.doorMaxZ)) / 2;
  let mode = requested;
  if (mode === 'auto') {
    const nearDoor = Math.abs(from.x) < 7.5 && from.y < 2.15;
    mode =
      nearDoor &&
      from.z * opponentSign > 1.1 &&
      from.z * opponentSign < 2.8 &&
      Math.abs(aim) < 0.24
        ? 'red'
        : nearDoor && Math.abs(from.z - gateZ) < 0.55 && Math.abs(aim) < 0.45
          ? 'puerta'
          : 'alta';
  }
  if (mode === 'puerta') {
    // Aiming off centre really misses a jamb; power can carry it through both doors.
    const crossing = {
      x: gateX,
      z: gateZ + aim * 1.6,
      y: clamp(from.y - 0.08, 0.38, 1.92),
    };
    const time = Math.max(
      0.035,
      Math.hypot(from.x - gateX, from.z - crossing.z) / (9 + power * 18),
    );
    return {
      ball: solveTrajectory(from, crossing, time),
      target: crossing,
      mode,
    };
  }
  if (mode === 'red') {
    // Extend a ray through the opponent's opening toward their face of the net.
    // Poor position/angle can strike the fence or the wrong face: collisions decide.
    const denominator = gateZ - from.z;
    const projectedX =
      Math.abs(denominator) > 0.05
        ? from.x +
          ((-opponentSign * 0.12 - from.z) / denominator) * (gateX - from.x)
        : side * 4.0;
    const target = {
      x: clamp(projectedX + aim * 2.4, -4.7, 4.7),
      z: -opponentSign * 0.12,
      y: 0.38 + power * 0.28,
    };
    const time = Math.max(
      0.22,
      Math.hypot(target.x - from.x, target.z - from.z) / (8 + power * 10),
    );
    return { ball: solveTrajectory(from, target, time), target, mode };
  }
  const target = {
    x: clamp(aim * 4.2, -4.3, 4.3),
    z: opponentSign * (2.1 + power * 6.1),
  };
  const horizontal = Math.hypot(target.x - from.x, target.z - from.z);
  let time = Math.max(1.16, horizontal / (8 + power * 2));
  let ball = solveTrajectory(from, target, time);
  for (let attempt = 0; attempt < 12; attempt++) {
    ball = solveTrajectory(from, target, time);
    const check = { ...ball };
    let clears = false;
    for (let i = 0; i < 520; i++) {
      integrateBall(check, 1 / 120);
      if (Math.abs(check.x) <= 5 + R) {
        clears = check.y - R > (Math.abs(check.z) > 8 ? 4 : 3);
        break;
      }
      if (check.y < R) break;
    }
    if (clears) break;
    time += 0.12;
  }
  return { ball, target, mode: 'alta' };
}

export class PadelMatch {
  private readonly keeper: ScoreKeeper;
  private readonly options: Required<MatchOptions>;
  private readonly state: GameState;
  private lastHitter: Team = 0;
  private lastHitterId = 0;
  private bounced = false;
  private bounces = 0;
  private serveLive = false;
  private serveNet = false;
  private serveSign = 1;
  private serveAnimating = false;
  private servePower = 0.55;
  private serveAim = 0;
  private phaseTime = 0;
  private contactTime = -10;
  private hitBuffer = 0;
  private bufferedShot: Shot = 'plano';
  private bufferedPower = 0.6;
  private bufferedAim = 0;
  private bufferedSmash: Smash = 'retorno';
  private bufferedQuality: TimingQuality = 'good';
  private bufferedCharged = false;
  private bufferedExterior: ExteriorReturn = 'auto';
  private returnedFromOutside = false;
  private pendingEndsChange = false;
  private requestedWall = false;
  private plannedWalls = 0;
  private plannedPlayer = 0;
  private plannedContactTime = 0;
  private reactionUntil = 0;
  private wallTime = -10;
  private teamDepth: [number, number] = [3.2, 7.2];
  private netControl: [boolean, boolean] = [true, false];
  private pressureTeam: Team | null = null;
  private tacticalFlight: {
    team: Team;
    shot: Shot;
    opponentDepth: number;
    opponentBack: number;
    advanced: boolean;
  } | null = null;
  private hitWasDown = false;
  private switchWasDown = false;
  private latestImpact: ContactResult | null = null;
  private tieBreakStartServer = 0;
  private gameServerIndex = 0;
  private randomState = 41927;
  private pointAim = 0;
  private readonly serviceOrder = [0, 2, 1, 3];

  constructor(options: MatchOptions = {}) {
    this.options = {
      difficulty: options.difficulty ?? 'normal',
      gamesToWin: clamp(options.gamesToWin ?? 6, 1, 6),
      setsToWin: clamp(options.setsToWin ?? 2, 1, 3),
      training: options.training ?? false,
      autoPlay: options.autoPlay ?? false,
      scoring: options.scoring ?? 'star',
      drill: options.drill ?? 'libre',
      exteriorPlay: options.exteriorPlay ?? true,
      playerProfiles: options.playerProfiles ?? [],
    };
    this.keeper = new ScoreKeeper(
      this.options.gamesToWin,
      this.options.setsToWin,
      this.options.scoring,
    );
    this.state = {
      ball: {
        x: 2.4,
        y: 0.85,
        z: 7.8,
        vx: 0,
        vy: 0,
        vz: 0,
        wx: 0,
        wy: 0,
        wz: 0,
      },
      ballSpin: { x: 0, y: 0, z: 0, rpm: 0 },
      players: [0, 1, 2, 3].map((id) => ({
        id,
        team: (id < 2 ? 0 : 1) as Team,
        x: id % 2 === 0 ? 2.4 : -2.4,
        z: id < 2 ? 7.6 : -7.6,
        vx: 0,
        vz: 0,
        facing: id < 2 ? 0 : Math.PI,
        swing: 0,
        shot: 'plano',
        energy: 1,
        height: clamp(options.playerProfiles?.[id]?.height ?? 1.85, 1.55, 2.15),
        handedness: options.playerProfiles?.[id]?.handedness ?? 'right',
        playingSide:
          options.playerProfiles?.[id]?.playingSide ??
          (id % 2 === 0 ? 'left' : 'right'),
        preparation: 0,
        movementIntent: 'espera',
        reachAcross: false,
        outside: false,
        charging: false,
        charge: 0,
      })),
      score: this.keeper.score,
      phase: 'serve',
      server: 0,
      controlled: 0,
      message: 'Tu saque · Espacio para sacar de abajo',
      winner: null,
      rally: 0,
      speed: 0,
      lastShot: 'plano',
      eventId: 0,
      eventType: 'ready',
      meshImpactId: 0,
      meshImpact: null,
      time: 0,
      serveAttempt: 1,
      incomingTeam: 1,
      pointWinner: null,
      canHit: false,
      needsReceivingSide: false,
      serviceMotion: 0,
      ballBounce: 0,
      predictedBounce: { x: -2.4, z: -5.8 },
      ballSituation: 'saque',
      ballOutside: false,
      exteriorSide: 0,
      exteriorReturnMode: 'auto',
      endsSwapped: false,
      lastPoint: null,
      tacticalHint: 'Saque y subida de la pareja a la red',
      wallBounces: 0,
      returnedToHitter: false,
      teamTactics: ['red', 'defensa'],
      smashMode: 'retorno',
      lastHitterId: 0,
      contactPoint: null,
      lastBounce: null,
      stats: {
        winners: [0, 0],
        errors: [0, 0],
        longestRally: 0,
        totalPoints: 0,
        maxSpeed: 0,
      },
    };
    this.setupPoint();
  }

  /** Live read-only-by-convention view, intentionally allocation-free for the renderer. */
  getState(): GameState {
    return this.state;
  }

  nextPoint(): void {
    if (this.state.phase === 'finished') return;
    if (this.state.phase === 'point') this.setupPoint();
  }

  /** Star Point reception choice; side is the sign of world X. */
  chooseReceivingSide(side: -1 | 1): void {
    const s = this.state;
    if (!s.needsReceivingSide || s.phase !== 'serve') return;
    this.serveSign = -side;
    const server = s.players[s.server];
    server.x = this.serveSign * 2.4;
    const partner =
      s.players[server.team === 0 ? 1 - server.id : 5 - server.id];
    partner.x = -server.x;
    s.needsReceivingSide = false;
    s.message = 'Star Point · Cuadro elegido';
    this.placeServeBall();
  }

  update(dt: number, input: Input): void {
    // Stay stable when a background tab wakes or a renderer has a long frame.
    dt = clamp(Number.isFinite(dt) ? dt : 0, 0, 0.05);
    if (!dt) return;
    const s = this.state;
    s.time += dt;
    this.phaseTime += dt;
    const previousBuffer = this.hitBuffer;
    this.hitBuffer = Math.max(0, this.hitBuffer - dt);
    if (previousBuffer > 0 && this.hitBuffer === 0 && s.phase === 'rally') {
      s.players[s.controlled].swing = 1;
      s.players[s.controlled].shot = this.bufferedShot;
      this.emit('miss', 'Golpe fuera de alcance');
    }
    if (input.hit) {
      this.bufferedCharged =
        input.shot === 'remate' && (input.charge ?? 0) > 0.2;
      this.hitBuffer = this.bufferedCharged ? 0.85 : 0.42;
      this.bufferedShot = input.shot;
      this.bufferedPower = clamp(input.power, 0, 1);
      this.bufferedAim = clamp(input.aim, -1, 1);
      this.bufferedSmash = input.smash ?? 'retorno';
      this.bufferedExterior = input.exteriorReturn ?? 'auto';
      this.bufferedQuality =
        input.timingQuality ?? (input.perfect ? 'perfect' : 'good');
    }
    if (input.switchPlayer && !this.switchWasDown && s.phase !== 'serve')
      s.controlled = s.controlled === 0 ? 1 : 0;
    this.switchWasDown = !!input.switchPlayer;
    for (const p of s.players) {
      p.swing = Math.max(0, p.swing - dt * 2.6);
      p.charging =
        p.id === s.controlled && !!input.charging && !this.options.autoPlay;
      p.charge = p.charging ? clamp(input.charge ?? 0, 0, 1) : 0;
      if (p.charging) p.shot = input.shot;
      p.preparedShot =
        p.id === s.controlled && !this.options.autoPlay
          ? this.hitBuffer > 0
            ? this.bufferedShot
            : input.shot
          : this.chooseShot(p);
    }
    if (s.phase === 'finished') {
      this.hitWasDown = input.hit;
      return;
    }
    if (s.phase === 'point') {
      for (const p of s.players) {
        p.vx *= Math.exp(-7 * dt);
        p.vz *= Math.exp(-7 * dt);
      }
      if (
        this.phaseTime > 2.7 ||
        (input.hit && !this.hitWasDown && this.phaseTime > 0.5)
      )
        this.setupPoint();
      this.hitWasDown = input.hit;
      return;
    }
    if (s.phase === 'serve') {
      this.updateServe(dt, input);
      this.hitWasDown = input.hit;
      return;
    }
    this.requestedWall = !!input.waitWall;
    const oldBall = { x: s.ball.x, y: s.ball.y, z: s.ball.z };
    integrateBall(s.ball, dt);

    this.collisions(oldBall.z, oldBall);
    if (s.phase !== 'rally') {
      this.hitWasDown = input.hit;
      return;
    }
    s.speed = Math.hypot(s.ball.vx, s.ball.vy, s.ball.vz) * 3.6;
    s.ballSpin = {
      x: s.ball.wx ?? 0,
      y: s.ball.wy ?? 0,
      z: s.ball.wz ?? 0,
      rpm:
        (Math.hypot(s.ball.wx ?? 0, s.ball.wy ?? 0, s.ball.wz ?? 0) * 60) /
        (2 * Math.PI),
    };
    s.stats.maxSpeed = Math.max(s.stats.maxSpeed, s.speed);
    const targets = this.getTargets();
    for (const p of s.players) {
      const manual =
        p.id === s.controlled &&
        !this.options.autoPlay &&
        Math.hypot(input.moveX, input.moveZ) > 0.1;
      const speed =
        p.team === 0
          ? 5.7
          : this.options.difficulty === 'facil'
            ? 4.65
            : this.options.difficulty === 'dificil'
              ? 6.1
              : 5.4;
      if (manual)
        this.movePlayer(
          p,
          p.x + clamp(input.moveX, -1, 1) * 10,
          p.z + clamp(input.moveZ, -1, 1) * 10,
          speed,
          dt,
        );
      else {
        const waypoint = this.routePlayer(p, targets[p.id]).waypoint;
        this.movePlayer(p, waypoint.x, waypoint.z, speed, dt);
      }
      p.energy = clamp(
        p.energy + (Math.hypot(p.vx, p.vz) > 4.5 ? -0.018 : 0.026) * dt,
        0.35,
        1,
      );
      const turning =
        p.team === s.incomingTeam &&
        s.lastShot === 'globo' &&
        p.vz * signFor(p.team) > 1.3;
      p.movementIntent = turning
        ? 'giro'
        : p.id === this.plannedPlayer && this.plannedWalls > s.wallBounces
          ? 'pared'
          : this.teamDepth[p.team] < 4
            ? 'red'
            : 'defensa';
      p.facing = turning
        ? Math.atan2(-p.vx, -p.vz)
        : Math.atan2(p.x - s.ball.x, p.z - s.ball.z);
      p.preparation =
        p.id === this.plannedPlayer
          ? clamp(1 - (this.plannedContactTime - s.time) / 0.65, 0, 1)
          : 0;
      p.reachAcross =
        p.team === s.incomingTeam && s.returnedToHitter && Math.abs(p.z) < 1.4;
      if (p.charging)
        p.preparation = Math.max(p.preparation, 0.25 + p.charge * 0.75);
      if (p.preparation > 0.3 && s.ball.y > 1.9) p.movementIntent = 'remate';
      if (p.outside)
        p.movementIntent = p.team === s.incomingTeam ? 'exterior' : 'regreso';
    }
    this.separatePlayers();
    s.canHit = this.canContact(
      s.players[s.controlled],
      this.hitBuffer > 0 ? this.bufferedShot : input.shot,
    );
    if (!this.options.autoPlay && this.hitBuffer > 0 && s.canHit) {
      this.hit(
        s.players[s.controlled],
        this.bufferedShot,
        this.bufferedPower,
        this.bufferedAim,
        this.bufferedSmash,
        !this.bufferedCharged && this.hitBuffer < 0.1
          ? 'late'
          : this.bufferedQuality,
        this.bufferedExterior,
      );
      this.hitBuffer = 0;
    } else {
      // Only one member of a pair can touch the ball on each return.
      const candidates = s.players.filter(
        (p) =>
          (this.options.autoPlay || p.id !== s.controlled) &&
          !(this.options.training && p.team === 0 && !this.options.autoPlay) &&
          this.wantsAIContact(p) &&
          this.canContact(p, this.chooseShot(p)),
      );
      candidates.sort((a, b) => distance(a, s.ball) - distance(b, s.ball));
      const p = candidates[0];
      if (p) {
        const controlled = s.players[s.controlled];
        const humanPriority =
          !this.options.autoPlay &&
          p.team === 0 &&
          distance(controlled, s.ball) < distance(p, s.ball) + 0.3;
        if (!humanPriority)
          this.hit(
            p,
            this.chooseShot(p),
            this.options.difficulty === 'dificil' ? 0.8 : 0.6,
            this.pointAim,
            Math.abs(this.pointAim) > 0.72 ? 'por3' : 'retorno',
          );
      }
    }
    this.hitWasDown = input.hit;
  }

  private random(): number {
    this.randomState =
      (Math.imul(1664525, this.randomState) + 1013904223) >>> 0;
    return this.randomState / 4294967296;
  }
  private emit(type: string, message?: string) {
    this.state.eventId++;
    this.state.eventType = type;
    if (message) this.state.message = message;
  }
  private setupPoint() {
    const s = this.state;
    if (this.pendingEndsChange) s.endsSwapped = !s.endsSwapped;
    this.pendingEndsChange = false;
    this.returnedFromOutside = false;
    s.phase = 'serve';
    this.phaseTime = 0;
    s.pointWinner = null;
    s.rally = 0;
    s.ballBounce = 0;
    s.speed = 0;
    s.canHit = false;
    s.serveAttempt = 1;
    s.serviceMotion = 0;
    s.ballSituation = 'saque';
    s.ballOutside = false;
    s.exteriorSide = 0;
    for (const p of s.players) {
      p.outside = false;
      p.charging = false;
      p.charge = 0;
    }
    s.wallBounces = 0;
    s.returnedToHitter = false;
    s.contactPoint = null;
    s.lastBounce = null;
    this.plannedWalls = 0;
    this.requestedWall = false;
    this.bounces = 0;
    this.bounced = false;
    this.serveLive = false;
    this.serveNet = false;
    this.serveAnimating = false;
    this.latestImpact = null;
    this.hitBuffer = 0;
    const pointCount = s.score.points[0] + s.score.points[1];
    if (s.score.tieBreak) {
      const offset = pointCount === 0 ? 0 : Math.floor((pointCount + 1) / 2);
      s.server = this.serviceOrder[(this.tieBreakStartServer + offset) % 4];
    } else s.server = this.serviceOrder[this.gameServerIndex % 4];
    if (this.options.training)
      s.server = this.options.drill === 'saque' ? 0 : 2;
    const server = s.players[s.server],
      sign = signFor(server.team);
    this.serveSign = (pointCount % 2 === 0 ? 1 : -1) * sign;
    for (const p of s.players) {
      p.x = homeX(p);
      p.z = signFor(p.team) * 7.6;
      p.vx = 0;
      p.vz = 0;
      p.swing = 0;
      p.energy = Math.min(1, p.energy + 0.08);
    }
    server.x = this.serveSign * 2.4;
    server.z = sign * 7.6;
    const partner =
      s.players[server.team === 0 ? 1 - server.id : 5 - server.id];
    partner.x = -server.x;
    partner.z = sign * 3.2;
    if (server.team === 0) s.controlled = server.id;
    if (this.options.training) s.controlled = 0;
    s.incomingTeam = opposite(server.team);
    s.needsReceivingSide =
      s.score.starPoint && s.incomingTeam === 0 && !this.options.autoPlay;
    this.netControl = [false, false];
    this.netControl[server.team] = true;
    this.pressureTeam = null;
    this.tacticalFlight = null;
    this.teamDepth[server.team] = 3.1;
    this.teamDepth[s.incomingTeam] = 7.3;
    s.teamTactics[server.team] = 'red';
    s.teamTactics[s.incomingTeam] = 'defensa';
    if (
      this.options.training &&
      !['libre', 'saque'].includes(this.options.drill)
    ) {
      s.players[0].x = this.options.drill === 'doble-pared' ? 3.1 : 1.8;
      const drill = TRAINING_DRILLS.find(
        (entry) => entry.id === this.options.drill,
      )!;
      const net = ['lob', 'volley', 'exterior'].includes(drill.feedBehavior);
      s.players[0].z = net ? 3.1 : 7.2;
      if (
        this.options.drill === 'remate-por4' ||
        this.options.drill === 'remate-alto'
      )
        s.players[0].z = 1.5;
      if (this.options.drill === 'rescate') {
        s.players[0].x = 4.1;
        s.players[0].z = 1.1;
      }
      s.players[1].x = -3.7;
      s.players[1].z = net ? 3.2 : 7.7;
      this.teamDepth[0] = net ? 3.1 : 7.2;
      this.netControl[0] = net;
      this.netControl[1] = !net;
    }
    this.placeServeBall();
    s.message =
      server.team === 0 && !this.options.autoPlay
        ? 'Tu saque · Espacio para sacar de abajo'
        : 'Preparados · Saque rival';
    if (this.options.autoPlay) s.message = 'Exhibición · Saque de abajo';
    if (s.score.starPoint)
      s.message = 'Star Point · Este punto define el juego';
    if (this.options.training && this.options.drill !== 'libre')
      s.message =
        'Ejercicio · ' +
        TRAINING_DRILLS.find((drill) => drill.id === this.options.drill)!
          .description;
    this.emit('ready');
  }
  private placeServeBall() {
    this.state.ballOutside = false;
    this.state.exteriorSide = 0;
    const s = this.state,
      p = s.players[s.server];
    Object.assign(s.ball, {
      x: p.x - this.serveSign * 0.4,
      y: 0.8,
      z: p.z - signFor(p.team) * 0.25,
      vx: 0,
      vy: 0,
      vz: 0,
      wx: 0,
      wy: 0,
      wz: 0,
    });
  }
  private updateServe(dt: number, input: Input) {
    const s = this.state,
      p = s.players[s.server];
    if (s.needsReceivingSide) return;
    if (
      this.options.training &&
      !['libre', 'saque'].includes(this.options.drill)
    ) {
      if (this.phaseTime > 1.2) this.launchDrill();
      return;
    }
    const automatic = this.options.autoPlay || p.team === 1;
    if (
      !this.serveAnimating &&
      ((automatic && this.phaseTime > 1.1) ||
        (!automatic && input.hit && !this.hitWasDown))
    ) {
      this.serveAnimating = true;
      s.serviceMotion = 0.001;
      this.servePower = automatic ? 0.55 : clamp(input.power, 0, 1);
      this.serveAim = automatic ? 0 : clamp(input.aim, -1, 1);
      this.emit('serve-drop', 'Saque de abajo');
    }
    if (!this.serveAnimating) {
      this.placeServeBall();
      return;
    }
    s.serviceMotion += dt / 0.72;
    const progress = s.serviceMotion;
    // Visible release, mandatory ground bounce, then below-waist racket contact.
    if (progress < 0.55)
      s.ball.y = Math.max(R, 0.8 * (1 - (progress / 0.55) ** 2));
    else s.ball.y = R + Math.sin(((progress - 0.55) / 0.45) * 0.8) * 0.82;
    if (progress >= 0.55 && progress - dt / 0.72 < 0.55) this.emit('bounce');
    p.swing = progress > 0.7 ? clamp((progress - 0.7) * 3.3, 0, 1) : 0;
    if (progress < 1) return;
    s.ball.y = 0.67;
    const target = {
      x: -this.serveSign * clamp(2.1 + this.serveAim * 1.8, 0.45, 4.1),
      z: -signFor(p.team) * (5.5 + this.servePower * 0.85),
    };
    // A ~0.85 s diagonal trajectory clears the net from sub-waist contact.
    Object.assign(
      s.ball,
      solveTrajectory(s.ball, target, 0.92 - this.servePower * 0.12),
    );
    this.lastHitter = p.team;
    this.lastHitterId = p.id;
    this.recordContact(p, 'plano');
    this.serveLive = true;
    this.bounced = false;
    this.bounces = 0;
    this.serveNet = false;
    this.contactTime = s.time;
    this.reactionUntil = s.time + 0.18;
    s.ballSituation = 'vuelo';
    this.phaseTime = 0;
    s.phase = 'rally';
    s.rally = 1;
    s.lastShot = 'plano';
    s.serviceMotion = 1;
    p.swing = 1;
    p.shot = 'plano';
    s.predictedBounce = target;
    this.pointAim = (this.random() - 0.5) * 1.5;
    this.emit('serve', 'Saque diagonal · Esperá el pique para devolver');
  }

  private recordContact(
    p: Player,
    shot: Shot,
    quality: TimingQuality = 'good',
  ) {
    const s = this.state;
    s.lastHitterId = p.id;
    s.contactPoint = {
      x: s.ball.x,
      y: s.ball.y,
      z: s.ball.z,
      time: s.time,
      playerId: p.id,
      shot,
      quality,
    };
  }

  private canContact(p: Player, shot: Shot): boolean {
    const s = this.state,
      b = s.ball;
    if (
      s.phase !== 'rally' ||
      s.time - this.contactTime < 0.12 ||
      p.team === this.lastHitter ||
      b.y < 0.14
    )
      return false;
    // FIP 14.1g: after a legal bounce, the receiving pair can reach over the
    // net to return a ball that has come back. Feet remain in their own court.
    const reachingAcross =
      this.bounced &&
      s.returnedToHitter &&
      sideOf(b.z) === this.lastHitter &&
      Math.abs(b.z) < 0.88 &&
      b.y > 0.96;
    const outsideContact =
      this.options.exteriorPlay &&
      s.ballOutside &&
      Math.abs(p.x) > COURT.halfWidth - COURT.playerRadius &&
      this.inSafeArea(b);
    if (sideOf(b.z) !== p.team && !reachingAcross && !outsideContact)
      return false;
    if (p.z * signFor(p.team) < 0.35 && !p.outside) return false;
    // A racket cannot reach through a side wall from an inside defender.
    if (s.ballOutside && !outsideContact) return false;
    if (!s.ballOutside && p.outside && Math.abs(b.x) < 4.7) return false;
    if (
      p.x * b.x > 0 &&
      (Math.abs(p.x) - 5) * (Math.abs(b.x) - 5) < 0 &&
      b.y < (Math.abs(b.z) > 8 ? 4 : 3) &&
      !this.inDoor(b.z, b.y, R)
    )
      return false;
    if (this.serveLive && !this.bounced) return false;
    if (
      p.id === s.controlled &&
      this.requestedWall &&
      s.wallBounces < this.plannedWalls
    )
      return false;
    const overhead = ['bandeja', 'vibora', 'remate', 'bajada'].includes(shot);
    const jump = shot === 'remate' ? 0.65 : shot === 'bajada' ? 0.45 : 0.3;
    const overheadReach = p.height * 0.79 + 0.9 * (p.height / 1.95) + jump;
    const maxHeight =
      shot === 'bandeja'
        ? p.height * 0.94 + 0.38
        : shot === 'vibora'
          ? p.height + 0.42
          : overhead
            ? overheadReach
            : shot === 'volea'
              ? p.height + 0.65
              : p.height + 0.13;
    const reach =
      b.y < 0.5
        ? p.id === s.controlled && !this.options.autoPlay
          ? 0.88
          : 0.62
        : b.y > 2.9
          ? 0.65
          : b.y > 2.6
            ? 0.85
            : p.id === s.controlled && !this.options.autoPlay
              ? 1.36
              : 1.2;
    return b.y <= maxHeight && distance(p, b) < reach;
  }

  private wantsAIContact(p: Player): boolean {
    const s = this.state;
    if (p.team !== s.incomingTeam || s.time < this.reactionUntil) return false;
    if (p.id !== this.plannedPlayer && distance(p, s.ball) > 0.72) return false;
    if (s.wallBounces < this.plannedWalls) return false;
    // Let a wall ball separate from the glass before the swing. Defenders
    // play after the bounce; volleys belong to the pair occupying the net.
    if (s.wallBounces && s.time - this.wallTime < 0.09) return false;
    if (
      !this.bounced &&
      !s.returnedToHitter &&
      Math.abs(p.z) > 5.6 &&
      s.ball.y < 1.7
    )
      return false;
    return (
      s.time >= this.plannedContactTime - 0.08 || distance(p, s.ball) < 0.65
    );
  }

  private chooseShot(p: Player): Shot {
    const s = this.state,
      b = s.ball,
      depth = Math.abs(p.z);
    const opponents = s.players.filter((other) => other.team !== p.team);
    const netPair = opponents.every((other) => Math.abs(other.z) < 4.8);
    const openWidth = Math.abs(opponents[0].x - opponents[1].x);
    const comfortable = distance(p, b) < 0.9 && b.y > 0.55;
    if (s.ballOutside) return s.ball.y < 1.4 ? 'globo' : 'plano';
    if (s.returnedToHitter) return 'volea';
    if (s.wallBounces > 0) {
      if (b.y > p.height * 0.78 && depth > 5 && b.vz * signFor(p.team) < 0)
        return 'bajada';
      if (b.y < 0.65 && depth > 8.2 && b.vz * signFor(p.team) > 0)
        return 'contrapared';
      return netPair && comfortable && depth < 7.7 && b.y < 1.3
        ? 'chiquita'
        : 'globo';
    }
    if (b.y > p.height * 0.95) {
      if (b.y > p.height + 0.45 && depth < 4.2 && comfortable) return 'remate';
      if (
        b.y > p.height + 0.05 &&
        depth < 5.4 &&
        (openWidth > 3.8 || Math.abs(b.x) > 1.6)
      )
        return 'vibora';
      return 'bandeja';
    }
    if (depth > 5.5) {
      if (netPair)
        return comfortable && depth < 7.7 && b.y < 1.3 ? 'chiquita' : 'globo';
      return 'plano';
    }
    if (depth < 4.7 && !this.bounced)
      return opponents.every((other) => Math.abs(other.z) > 7) && comfortable
        ? 'dejada'
        : 'volea';
    return netPair && b.y < 1.25 ? 'chiquita' : 'plano';
  }

  private hit(
    p: Player,
    selected: Shot,
    power: number,
    aim: number,
    smash: Smash = 'retorno',
    timingQuality: TimingQuality = 'good',
    exteriorReturn: ExteriorReturn = 'auto',
  ) {
    const s = this.state,
      b = s.ball;
    if (this.serveLive && this.serveNet && this.bounced) {
      this.repeatServe();
      return;
    }
    let shot = selected;
    if (b.y < 1.35 && ['remate', 'bandeja', 'vibora', 'bajada'].includes(shot))
      shot = 'plano';
    const sign = signFor(p.team),
      wallExit = s.wallBounces > 0;
    if (shot === 'bajada' && !wallExit) shot = b.y > 1.65 ? 'bandeja' : 'plano';
    if (shot === 'volea' && this.bounced && !s.returnedToHitter)
      shot = wallExit && b.y > 1.35 ? 'bajada' : 'plano';
    const quality: TimingQuality =
      timingQuality === 'perfect' &&
      shot === 'remate' &&
      b.y > p.height + 0.35 &&
      b.vy <= 0 &&
      distance(p, b) < 0.95
        ? 'perfect'
        : timingQuality === 'late'
          ? 'late'
          : 'good';
    power =
      quality === 'perfect'
        ? Math.min(1, power + 0.07)
        : quality === 'late'
          ? power * 0.88
          : power;
    const automatic = this.options.autoPlay || p.id !== s.controlled;
    const err = (this.random() - 0.5) * (automatic ? 0.28 : 0);
    let target = {
      x: clamp(aim * 3.8 + err, -4.45, 4.45),
      z: -sign * (6.6 + power * 1.45),
    };
    let t = Math.hypot(target.x - b.x, target.z - b.z) / (12 + power * 5);
    this.latestImpact = null;
    s.smashMode = smash;
    if (shot === 'globo') {
      target.z = -sign * (7.8 + power * 0.95);
      if (automatic) {
        // A low ball played while running makes a shorter lob. This creates
        // actual attackable errors from footwork, rather than scripted shots.
        const balance = clamp(1 - Math.hypot(p.vx, p.vz) / 5.8, 0, 1);
        const heightQuality = clamp((b.y - 0.3) / 1.0, 0, 1);
        const quality = balance * 0.6 + heightQuality * 0.4;
        target.z = -sign * (5 + quality * 3.4);
      }
      const apex = 5.4 + power * 1.8;
      t =
        Math.sqrt((2 * Math.max(0.2, apex - b.y)) / G) +
        Math.sqrt((2 * (apex - R)) / G);
    } else if (shot === 'chiquita') {
      // Slow dipping ball to the net pair's feet, not a short winner.
      const receiver = [...s.players]
        .filter((other) => other.team !== p.team)
        .sort((a, b) => Math.abs(a.x - target.x) - Math.abs(b.x - target.x))[0];
      target.z = -sign * clamp(Math.abs(receiver.z) - 0.4, 1.6, 8.0);
      t = Math.max(
        0.72,
        Math.hypot(target.x - b.x, target.z - b.z) / (9 + power),
      );
    } else if (shot === 'dejada') {
      target.z = -sign * (1.05 + (1 - power) * 0.55);
      t = Math.max(0.55, Math.hypot(target.x - b.x, target.z - b.z) / 7.4);
    } else if (shot === 'volea') {
      target.z = -sign * (6.4 + power * 1.7);
      t = Math.max(
        0.36,
        Math.hypot(target.x - b.x, target.z - b.z) / (15 + power * 6),
      );
    } else if (shot === 'bandeja') {
      // Controlled sliced overhead toward the deep corner, buying net recovery.
      target.x = clamp((aim || (b.x > 0 ? -0.78 : 0.78)) * 4.6, -4.4, 4.4);
      target.z = -sign * 8.25;
      t = Math.max(
        0.62,
        Math.hypot(target.x - b.x, target.z - b.z) / (13 + power * 2.5),
      );
    } else if (shot === 'vibora') {
      // Faster, more lateral slice; low skid and a wider wall rebound.
      target.x = clamp((aim || (b.x > 0 ? -0.82 : 0.82)) * 4.4, -4.45, 4.45);
      target.z = -sign * 7.65;
      t = Math.max(
        0.43,
        Math.hypot(target.x - b.x, target.z - b.z) / (18 + power * 5),
      );
    } else if (shot === 'bajada') {
      target.z = -sign * (4.7 + power * 1.2);
      t = Math.max(
        0.44,
        Math.hypot(target.x - b.x, target.z - b.z) / (19 + power * 6),
      );
    } else if (shot === 'remate') {
      if (smash === 'retorno') {
        target.z = -sign * 5.15;
        target.x = clamp(b.x * 0.3 + aim * 1.1, -2.6, 2.6);
        t = Math.max(
          0.2,
          Math.hypot(target.x - b.x, target.z - b.z) / (27 + power * 11),
        );
      } else if (smash === 'por3') {
        target.z = -sign * (2.35 + (1 - power) * 0.4);
        target.x = clamp(b.x * 0.25 + aim * 0.8, -2, 2);
        t = Math.max(
          0.25,
          Math.hypot(target.x - b.x, target.z - b.z) / (23 + power * 10),
        );
      } else {
        target.z = -sign * clamp(1.1 + (Math.abs(p.z) - 1) * 0.25, 1.1, 2.2);
        target.x = clamp(b.x * 0.6 + aim * 0.6, -3.2, 3.2);
        t = Math.max(
          0.14 + (1 - power) * 0.16,
          Math.hypot(target.x - b.x, target.z - b.z) / (30 + power * 13),
        );
      }
    }
    t = Math.max(shot === 'remate' ? 0.14 : 0.3, t);
    // Clearance correction only if the outgoing trajectory crosses the net.
    if (b.z * target.z < 0) {
      const fraction = Math.abs(b.z) / Math.abs(target.z - b.z);
      const linearY = b.y * (1 - fraction) + R * fraction;
      const margin = ['dejada', 'chiquita'].includes(shot)
        ? 1.015
        : shot === 'globo'
          ? 1.65
          : 1.08;
      t = Math.max(
        t,
        Math.sqrt(
          Math.max(
            0,
            ((margin - linearY) * 2) / (G * fraction * (1 - fraction)),
          ),
        ),
      );
    }
    const errorRate =
      this.options.difficulty === 'facil'
        ? 0.08
        : this.options.difficulty === 'dificil'
          ? 0.02
          : 0.04;
    const contactStress =
      clamp((distance(p, b) - 0.65) / 0.65, 0, 1) * 0.08 +
      clamp(Math.hypot(p.vx, p.vz) / 5.8, 0, 1) * 0.035 +
      (b.y < 0.5 ? 0.025 : 0);
    const mishit =
      automatic &&
      s.rally > 3 &&
      this.random() <
        errorRate + contactStress + Math.max(0, s.rally - 18) * 0.002;
    const from = { x: b.x, y: b.y, z: b.z };
    const spin = strokeSpin(from, target, shot, power, aim, smash);
    let launch = solveTrajectory(from, target, t, spin);
    if (shot === 'remate') {
      const planned = aimSmash(from, p.team, power, aim, smash, launch);
      launch = planned.ball;
      target = planned.target;
    } else if (shot === 'contrapared') {
      launch = aimContrapared(from, p.team, power, aim);
      target = { x: aim * 3, z: -sign * 6.5 };
    }
    if (s.ballOutside) {
      const plan = aimExteriorReturn(
        from,
        p.team,
        power,
        automatic && exteriorReturn === 'auto' ? 0 : aim,
        exteriorReturn,
      );
      launch = plan.ball;
      target = plan.target;
      s.exteriorReturnMode = plan.mode;
    }
    this.returnedFromOutside = s.ballOutside;
    Object.assign(b, launch);
    if (mishit) {
      // A rushed lob tends to sail long; a poorly centred drive loses lift.
      if (shot === 'globo') {
        b.vz *= 1.18;
        b.vy += 0.7;
      } else b.vy -= 3.6 + this.random() * 2;
    }
    this.lastHitter = p.team;
    this.lastHitterId = p.id;
    this.recordContact(p, shot, quality);
    this.bounced = false;
    this.bounces = 0;
    this.serveLive = false;
    this.serveNet = false;
    this.contactTime = s.time;
    this.reactionUntil =
      s.time +
      (this.options.difficulty === 'facil'
        ? 0.28
        : this.options.difficulty === 'dificil'
          ? 0.15
          : 0.21);
    s.ballBounce = 0;
    s.wallBounces = 0;
    s.returnedToHitter = false;
    this.plannedWalls = 0;
    s.incomingTeam = opposite(p.team);
    s.rally++;
    s.lastShot = shot;
    s.predictedBounce = target;
    s.canHit = false;
    s.ballSituation = s.ballOutside ? 'exterior' : 'vuelo';
    p.shot = shot;
    p.swing = 1;
    p.preparation = 0;
    // The stroke name does not earn the net. Keep an existing attacking
    // position, otherwise wait for a ball that actually displaces the rivals.
    const ownPair = s.players.filter((other) => other.team === p.team);
    const ownDepth =
      ownPair.reduce((sum, other) => sum + Math.abs(other.z), 0) / 2;
    const retainedNet =
      this.netControl[p.team] &&
      (ownDepth < 5.8 || ['bandeja', 'vibora'].includes(shot));
    this.netControl[p.team] =
      retainedNet || ownPair.every((other) => Math.abs(other.z) < 4.2);
    this.teamDepth[p.team] = this.netControl[p.team] ? 3.1 : 7.1;
    s.teamTactics[p.team] = this.netControl[p.team]
      ? 'recuperar red en pareja'
      : 'defensa en pareja';
    if (this.pressureTeam === s.incomingTeam) {
      // A low, upward reply confirms the chiquita worked. A high attacking
      // contact cancels the approach, rather than dragging defenders forward.
      if (s.contactPoint!.y < 1.25 && b.vy > 1.1) {
        this.netControl[s.incomingTeam] = true;
        this.teamDepth[s.incomingTeam] = 3.25;
        s.teamTactics[s.incomingTeam] = 'subida tras devolución baja';
      } else if (!this.netControl[s.incomingTeam]) {
        this.teamDepth[s.incomingTeam] = 7.1;
      }
      this.pressureTeam = null;
    }
    const opposition = s.players.filter((other) => other.team !== p.team);
    this.tacticalFlight = {
      team: p.team,
      shot,
      opponentDepth:
        opposition.reduce((sum, other) => sum + Math.abs(other.z), 0) / 2,
      opponentBack: Math.max(...opposition.map((other) => Math.abs(other.z))),
      advanced: false,
    };
    s.tacticalHint =
      shot === 'globo'
        ? 'Leé el globo: subí sólo si pasa a los rivales y los obliga a retroceder'
        : shot === 'chiquita'
          ? 'A los pies: esperá una devolución baja antes de avanzar'
          : shot === 'bandeja'
            ? 'Bandeja profunda: recuperá la red'
            : shot === 'vibora'
              ? 'Víbora cortada: buscá el rebote bajo'
              : shot === 'remate'
                ? smash === 'retorno'
                  ? 'Pique, vidrio y vuelta: el receptor todavía puede llegar'
                  : smash === 'por3'
                    ? 'Buscá la salida lateral después del pique'
                    : smash === 'alto'
                      ? 'Paralelo alto: buscá altura, ángulo y un espacio libre'
                      : 'Remate por 4: necesitás altura y cercanía a la red'
                : wallExit
                  ? 'Salí con la pelota después del vidrio'
                  : 'Mantené la distancia con tu compañero';
    this.pointAim = (this.random() - 0.5) * 1.8;
    s.stats.longestRally = Math.max(s.stats.longestRally, s.rally);
    this.emit(
      'hit',
      SHOT_NAMES[shot] +
        (shot === 'remate'
          ? smash === 'retorno'
            ? ' · Traérmela'
            : smash === 'por3'
              ? ' · Por 3'
              : smash === 'alto'
                ? ' · Paralelo alto'
                : ' · Por 4'
          : ''),
    );
  }

  private launchDrill() {
    const s = this.state,
      p = s.players[2];
    const drill = TRAINING_DRILLS.find(
      (entry) => entry.id === this.options.drill,
    )!;
    s.phase = 'rally';
    this.phaseTime = 0;
    Object.assign(s.ball, {
      x: drill.feedBehavior === 'double-wall' ? -0.8 : 1.5,
      y: 1.25,
      z: -4.2,
    });
    if (drill.feedBehavior === 'exterior') {
      // An actual opponent smash supplies the exercise. The defender starts
      // inside, then runs through the door using the regular route planner.
      Object.assign(s.ball, { x: -1.6, y: 2.65, z: -2.7, vy: -1 });
      p.x = s.ball.x;
      p.z = s.ball.z;
      this.hit(p, 'remate', 0.58, 0.9, 'por3');
      this.netControl[0] = false;
      s.tacticalHint = drill.description;
      this.emit('hit', 'Ejercicio · ' + drill.label);
      return;
    }
    p.x = s.ball.x;
    p.z = s.ball.z;
    this.hit(p, drill.feedBehavior === 'lob' ? 'globo' : 'plano', 0.65, 0.4);
    let target = {
      x: drill.feedBehavior === 'double-wall' ? 4.32 : 2.05,
      z: 8.65,
    };
    let t = 0.82;
    if (drill.feedBehavior === 'lob') {
      target = {
        x: 1.55,
        z: ['remate-por4', 'remate-alto'].includes(drill.id) ? 2.05 : 3.8,
      };
      const apex = 5.2;
      t =
        Math.sqrt((2 * (apex - s.ball.y)) / G) +
        Math.sqrt((2 * (apex - R)) / G);
      this.teamDepth[0] = target.z < 3 ? 1.55 : 3.2;
      this.teamDepth[1] = 3.1;
      this.netControl[1] = true;
    } else if (drill.feedBehavior === 'ground') {
      target = { x: 1.8, z: 6.35 };
      t = 1.15;
    } else if (drill.feedBehavior === 'volley') {
      target = { x: 1.75, z: 6.3 };
      t = 1;
    } else if (drill.id === 'bajada') {
      target = { x: 2.05, z: 8.6 };
      t = 1.88;
    }
    Object.assign(s.ball, solveTrajectory(s.ball, target, t));
    s.predictedBounce = target;
    s.incomingTeam = 0;
    this.plannedPlayer = 0;
    s.tacticalHint = drill.description;
    this.emit('hit', 'Ejercicio · ' + drill.label);
  }

  private groundBounce(b: Ball): void {
    b.y = R;
    this.latestImpact = collideBall(b, { x: 0, y: 1, z: 0 }, 'turf');
  }
  private recordBounce(surface: 'suelo' | 'vidrio' | 'malla' | 'red') {
    const s = this.state;
    s.lastBounce = {
      x: s.ball.x,
      y: s.ball.y,
      z: s.ball.z,
      time: s.time,
      surface,
      ...this.latestImpact,
    };
    if (surface === 'vidrio' && this.bounced) {
      s.wallBounces++;
      this.wallTime = s.time;
      s.ballSituation = s.wallBounces > 1 ? 'doble-pared' : 'pared';
      s.tacticalHint =
        s.wallBounces > 1
          ? 'Dos vidrios, un solo pique: acompañá la salida'
          : 'Dejá salir la pelota del vidrio antes de pegar';
    }
  }
  private recordMeshImpact(normalSpeed: number) {
    const s = this.state;
    const speed = Math.max(0, normalSpeed);
    const id = (s.meshImpactId ?? 0) + 1;
    s.meshImpactId = id;
    s.meshImpact = {
      id,
      type: 'mesh',
      x: s.ball.x,
      y: s.ball.y,
      z: s.ball.z,
      time: s.time,
      normalSpeed: speed,
      power: clamp(speed / 18, 0.12, 1),
    };
  }
  private hitArenaObstacle(oldBall?: ArenaSpatialPoint) {
    const s = this.state;
    if (!oldBall || !s.ballOutside) return false;
    const hit = firstArenaObstacleHit(oldBall, s.ball, R);
    if (!hit) return false;
    Object.assign(s.ball, hit.point, { vx: 0, vy: 0, vz: 0 });
    const label =
      hit.obstacle.kind === 'bench'
        ? 'el banco'
        : hit.obstacle.kind === 'umpire-chair'
          ? 'la silla del árbitro'
          : hit.obstacle.kind === 'railing'
            ? 'la baranda'
            : 'la grada';
    this.outOfCourt(`La pelota tocó ${label}`);
    return true;
  }
  private collisions(oldZ: number, oldBall?: ArenaSpatialPoint) {
    const s = this.state,
      b = s.ball;
    const crossedNet = oldZ * b.z < 0 && Math.abs(b.x) <= 5 + R;
    if (crossedNet && b.y - R < 0.88 + Math.abs(b.x) * 0.008) {
      this.recordBounce('red');
      if (this.serveLive) {
        this.serveNet = true;
        if (b.y > 0.8) {
          b.vz *= 0.7;
          b.vy *= 0.7;
          this.emit('net', 'Red en el saque');
        } else {
          this.serveFault('Saque a la red');
          return;
        }
      } else {
        b.z = Math.sign(oldZ) * 0.08;
        b.vz *= -0.1;
        b.vx *= 0.4;
        b.vy = Math.min(0, b.vy) * 0.3;
        this.emit(
          'net',
          this.returnedFromOutside && sideOf(oldZ) !== this.lastHitter
            ? 'Cara rival de la red · Tiene que picar en su campo'
            : 'Red',
        );
      }
    }
    if (
      crossedNet &&
      this.bounced &&
      sideOf(b.z) === this.lastHitter &&
      b.y > 0.94
    ) {
      // The returning ball is still owned by the RECEIVING pair. It is not a
      // point until a second floor bounce; the striker cannot touch it again.
      if (!s.returnedToHitter)
        this.emit(
          'return',
          'La pelota volvió · El receptor todavía puede llegar',
        );
      s.returnedToHitter = true;
      s.ballSituation = 'retorno';
      s.tacticalHint =
        'El receptor puede cruzar la pala, sin tocar red ni campo rival';
    }
    if (b.y <= R && b.vy < 0) {
      b.y = R;
      if (!this.bounced) {
        if (Math.abs(b.x) > 5 || Math.abs(b.z) > 10) {
          this.failReturn('Primer pique fuera de la cancha');
          return;
        }
        if (sideOf(b.z) === this.lastHitter) {
          this.failReturn('La pelota quedó en tu campo');
          return;
        }
        if (
          this.serveLive &&
          (b.x * this.serveSign >= 0 || Math.abs(b.z) > COURT.serviceLine + R)
        ) {
          this.serveFault('Saque fuera del cuadro diagonal');
          return;
        }
        this.bounced = true;
        this.bounces = 1;
      } else {
        // A serve touching the tape is a let only if it did not hit the mesh.
        if (this.serveLive && this.serveNet) {
          this.repeatServe();
          return;
        }
        this.bounces++;
        this.finishPoint(
          this.lastHitter,
          s.ballOutside
            ? 'Segundo pique exterior'
            : s.returnedToHitter
              ? 'Remate que vuelve · Segundo pique'
              : 'Doble pique',
          true,
        );
        return;
      }
      this.groundBounce(b);
      s.ballBounce = this.bounces;
      this.recordBounce('suelo');
      this.emit('bounce');
    }
    if (this.hitArenaObstacle(oldBall)) return;
    if (!s.ballOutside && Math.abs(b.x) + R > 5 && b.x * b.vx > 0) {
      const wallHeight = Math.abs(b.z) > 8 ? 4 : 3;
      if (b.y - R > wallHeight || this.inDoor(b.z, b.y, R)) {
        if (!this.options.exteriorPlay) {
          if (this.serveLive && this.inDoor(b.z, b.y, R)) {
            this.serveFault('Saque por la puerta sin juego exterior');
            return;
          }
          this.outOfCourt(
            b.y - R > wallHeight ? 'Remate por 3' : 'Salida por la puerta',
          );
          return;
        }
        if (this.serveLive && this.serveNet && this.bounced) {
          this.repeatServe();
          return;
        }
        s.ballOutside = true;
        s.exteriorSide = Math.sign(b.x) as -1 | 1;
        s.ballSituation = 'exterior';
        s.tacticalHint = 'Salí por la puerta y devolvé antes del segundo pique';
        this.emit(
          'outside',
          b.y - R > wallHeight
            ? 'Por 3 · Recuperación exterior habilitada'
            : 'Salida por la puerta · Sigue en juego',
        );
      } else {
        const mesh = Math.abs(b.z) < 6 || b.y > 3;
        if (mesh) this.recordMeshImpact(Math.abs(b.vx));
        if (this.serveLive && this.bounced && mesh) {
          this.serveFault('Saque a la malla después del pique');
          return;
        }
        if (!this.bounced && sideOf(b.z) !== this.lastHitter) {
          this.failReturn('Pared antes del primer pique');
          return;
        }
        if (!this.bounced && mesh) {
          this.failReturn('Malla del propio campo');
          return;
        }
        b.x = Math.sign(b.x) * (5 - R);
        this.latestImpact = collideBall(
          b,
          { x: -Math.sign(b.x), y: 0, z: 0 },
          mesh ? 'mesh' : 'glass',
        );
        this.recordBounce(mesh ? 'malla' : 'vidrio');
        this.emit(
          mesh ? 'mesh' : 'glass',
          mesh
            ? 'Rebote en la malla'
            : s.wallBounces > 1
              ? 'Doble pared · Sigue en juego'
              : 'Rebote en el vidrio',
        );
      }
    } else if (s.ballOutside && Math.abs(b.x) < 5 + R && b.x * b.vx < 0) {
      const top = Math.abs(b.z) > 8 ? 4 : 3;
      if (b.y - R > top || this.inDoor(b.z, b.y, R)) {
        s.ballOutside = false;
        s.exteriorSide = 0;
        s.ballSituation = 'vuelo';
        this.emit('outside-return', 'Devolución desde afuera · Sigue en juego');
      } else {
        const mesh = Math.abs(b.z) < 6 || b.y > 3;
        if (mesh) this.recordMeshImpact(Math.abs(b.vx));
        if (this.bounced)
          this.finishPoint(
            this.lastHitter,
            'La pelota tocó el exterior del cerramiento',
            true,
          );
        else this.failReturn('Devolución contra el exterior del cerramiento');
        return;
      }
    }
    if (this.hitArenaObstacle(oldBall)) return;
    if (!s.ballOutside && Math.abs(b.z) + R > 10 && b.z * b.vz > 0) {
      if (b.y - R > 4) {
        this.outOfCourt('Remate por 4');
        return;
      }
      const mesh = b.y > 3;
      if (mesh) this.recordMeshImpact(Math.abs(b.vz));
      if (!this.bounced && sideOf(b.z) !== this.lastHitter) {
        this.failReturn('Pared de fondo antes del pique');
        return;
      }
      if (!this.bounced && mesh) {
        this.failReturn('Malla del propio campo');
        return;
      }
      if (this.serveLive && this.bounced && mesh) {
        this.serveFault('Saque a la malla de fondo');
        return;
      }
      b.z = Math.sign(b.z) * (10 - R);
      this.latestImpact = collideBall(
        b,
        { x: 0, y: 0, z: -Math.sign(b.z) },
        mesh ? 'mesh' : 'glass',
      );
      this.recordBounce(mesh ? 'malla' : 'vidrio');
      this.emit(
        mesh ? 'mesh' : 'glass',
        s.wallBounces > 1
          ? 'Doble pared · Sigue en juego'
          : 'Rebote en el vidrio de fondo',
      );
    }
    if (b.y < 0.07 && Math.hypot(b.vx, b.vy, b.vz) < 0.15)
      this.finishPoint(
        this.bounced ? this.lastHitter : opposite(this.lastHitter),
        'Pelota sin devolución',
        false,
      );
  }
  private outOfCourt(reason: string) {
    if (this.bounced) this.finishPoint(this.lastHitter, reason, true);
    else this.failReturn('Fuera sin pique');
  }
  private failReturn(reason: string) {
    if (this.serveLive) this.serveFault(reason);
    else this.finishPoint(opposite(this.lastHitter), reason, false);
  }
  private repeatServe() {
    this.state.phase = 'serve';
    this.phaseTime = 0;
    this.serveAnimating = false;
    this.state.serviceMotion = 0;
    this.serveLive = false;
    this.serveNet = false;
    this.bounced = false;
    this.bounces = 0;
    this.state.ballBounce = 0;
    this.state.wallBounces = 0;
    this.state.returnedToHitter = false;
    this.state.ballSituation = 'saque';
    this.plannedWalls = 0;
    const server = this.state.players[this.state.server];
    server.x = this.serveSign * 2.4;
    server.z = signFor(server.team) * 7.6;
    server.vx = 0;
    server.vz = 0;
    this.placeServeBall();
    this.emit('let', 'Let · Se repite el saque');
  }
  private serveFault(reason: string) {
    if (this.state.serveAttempt === 2) {
      this.finishPoint(
        opposite(this.lastHitter),
        'Doble falta · ' + reason,
        false,
      );
      return;
    }
    this.state.serveAttempt = 2;
    this.repeatServe();
    this.emit('fault', 'Segundo saque · ' + reason);
  }
  private finishPoint(winner: Team, reason: string, isWinner: boolean) {
    const s = this.state;
    s.pointWinner = winner;
    s.ballSituation = 'punto';
    s.stats.totalPoints++;
    if (isWinner) s.stats.winners[winner]++;
    else s.stats.errors[opposite(winner)]++;
    const wasTieBreak = s.score.tieBreak;
    const gamesBefore = s.score.games[0] + s.score.games[1];
    const tiePoints = s.score.points[0] + s.score.points[1] + 1;
    const result = this.options.training
      ? { game: false, set: false, match: false }
      : this.keeper.award(winner);
    const gameNumber = gamesBefore + (result.game ? 1 : 0);
    const changeEnds =
      !this.options.training &&
      !result.match &&
      ((result.game && gameNumber % 2 === 1) ||
        (wasTieBreak && !result.game && tiePoints % 6 === 0));
    this.pendingEndsChange = changeEnds;
    s.lastPoint = {
      winningPlayerId:
        isWinner && this.lastHitter === winner ? this.lastHitterId : undefined,
      winningShot:
        isWinner && this.lastHitter === winner ? s.lastShot : undefined,
      id: s.stats.totalPoints,
      winner,
      ...result,
      gameNumber,
      setNumber: s.score.history.length + (result.set ? 0 : 1),
      changeEnds,
      rest:
        result.match || this.options.training
          ? 'none'
          : result.set
            ? 'set'
            : result.game && gameNumber > 1 && gameNumber % 2 === 1
              ? 'changeover'
              : 'none',
    };
    if (result.game) {
      if (wasTieBreak)
        this.gameServerIndex = (this.tieBreakStartServer + 1) % 4;
      else this.gameServerIndex = (this.gameServerIndex + 1) % 4;
      if (s.score.tieBreak) this.tieBreakStartServer = this.gameServerIndex;
    }
    s.phase = result.match ? 'finished' : 'point';
    s.winner = this.keeper.winner;
    this.phaseTime = 0;
    s.canHit = false;
    const prefix = result.match
      ? 'Partido'
      : result.set
        ? 'Set'
        : result.game
          ? 'Juego'
          : 'Punto';
    const teamLabel = winner === 0 ? 'para tu pareja' : 'para los rivales';
    this.emit(
      result.match
        ? 'match'
        : result.set
          ? 'set'
          : result.game
            ? 'game'
            : 'point',
      `${prefix} ${teamLabel} · ${reason}`,
    );
  }

  private inDoor(z: number, y: number, radius = 0) {
    return (
      Math.abs(z) > COURT.doorMinZ + radius &&
      Math.abs(z) < COURT.doorMaxZ - radius &&
      y + radius < COURT.doorHeight
    );
  }
  private inSafeArea(point: { x: number; z: number }) {
    return (
      Math.abs(point.x) <= 5 + COURT.exteriorWidth &&
      Math.abs(point.z) <= COURT.exteriorHalfLength
    );
  }
  private arenaRoute(from: { x: number; z: number }, target: ArenaPoint) {
    const route = findArenaPath(from, target, COURT.playerRadius);
    return {
      waypoint: route.points[1] ?? route.target,
      length: route.length,
    };
  }
  private routePlayer(p: Player, target: { x: number; z: number }) {
    const targetOutside = Math.abs(target.x) > 5;
    const ownOutside = Math.abs(p.x) > 5;
    if (!targetOutside && !ownOutside)
      return { waypoint: target, length: distance(p, target) };
    if (targetOutside && ownOutside && p.x * target.x > 0) {
      if (Math.abs(p.x) >= 5.35) return this.arenaRoute(p, target);
      const waypoint = {
        x: Math.sign(p.x) * 5.45,
        z: (signFor(p.team) * (COURT.doorMinZ + COURT.doorMaxZ)) / 2,
      };
      return {
        waypoint,
        length: distance(p, waypoint) + distance(waypoint, target),
      };
    }
    if (targetOutside && ownOutside) {
      const currentSide = Math.sign(p.x) || 1,
        gateZ = (signFor(p.team) * (COURT.doorMinZ + COURT.doorMaxZ)) / 2,
        outer = { x: currentSide * 5.45, z: gateZ },
        inner = { x: currentSide * 4.55, z: gateZ };
      if (Math.abs(p.z - gateZ) > 0.12) {
        const route = this.arenaRoute(p, outer);
        return {
          waypoint: route.waypoint,
          length:
            route.length + distance(outer, inner) + distance(inner, target),
        };
      }
      return {
        waypoint: inner,
        length: distance(p, inner) + distance(inner, target),
      };
    }
    const side = Math.sign(targetOutside ? target.x : p.x) || 1;
    const z = (signFor(p.team) * (COURT.doorMinZ + COURT.doorMaxZ)) / 2;
    const inner = { x: side * 4.55, z },
      outer = { x: side * 5.45, z };
    if (targetOutside) {
      const waypoint =
        Math.abs(p.x) < 4.65 && Math.abs(p.z - z) > 0.12 ? inner : outer;
      return {
        waypoint,
        length:
          distance(p, inner) + distance(inner, outer) + distance(outer, target),
      };
    }
    if (Math.abs(p.x) > 5.35 && Math.abs(p.z - z) > 0.12) {
      const route = this.arenaRoute(p, outer);
      return {
        waypoint: route.waypoint,
        length: route.length + distance(outer, inner) + distance(inner, target),
      };
    }
    const waypoint = inner;
    return {
      waypoint,
      length:
        distance(p, outer) + distance(outer, inner) + distance(inner, target),
    };
  }
  private constrainPlayer(p: Player, oldX: number, oldZ: number) {
    const radius = COURT.playerRadius,
      sign = signFor(p.team);
    if (!this.options.exteriorPlay) {
      p.x = clamp(p.x, -4.55, 4.55);
      p.z = sign * clamp(p.z * sign, 0.4, 9.5);
      p.outside = false;
      return;
    }
    p.x = clamp(
      p.x,
      -5 - COURT.exteriorWidth + radius,
      5 + COURT.exteriorWidth - radius,
    );
    // Sweep across the wall plane: only the player's own protected doorway is open.
    const nearWall =
      (Math.abs(p.x) > 5 - radius && Math.abs(oldX) < 5 + radius) ||
      (Math.abs(p.x) < 5 + radius && Math.abs(oldX) > 5 - radius);
    if (nearWall) {
      const gate =
        Math.abs(p.z) > COURT.doorMinZ + radius &&
        Math.abs(p.z) < COURT.doorMaxZ - radius &&
        p.z * sign > 0;
      if (!gate) {
        p.x =
          Math.sign(oldX || p.x) *
          (Math.abs(oldX) > 5 ? 5 + radius : 5 - radius);
        p.vx = 0;
      }
    }
    if (Math.abs(p.x) <= 5 - radius + 1e-8) {
      p.z = sign * clamp(p.z * sign, 0.4, 9.5);
    } else if (Math.abs(p.x) >= 5 + radius - 1e-8) {
      p.z = clamp(
        p.z,
        -COURT.exteriorHalfLength + radius,
        COURT.exteriorHalfLength - radius,
      );
    } else {
      // Prevent sliding sideways through the doorpost while crossing the gap.
      p.z =
        sign *
        clamp(p.z * sign, COURT.doorMinZ + radius, COURT.doorMaxZ - radius);
    }
    const usesExteriorArena =
      Math.abs(oldX) >= 5 + radius - 1e-8 || Math.abs(p.x) >= 5 + radius - 1e-8;
    if (usesExteriorArena) {
      const arena = constrainArenaMotion(
        { x: oldX, z: oldZ },
        { x: p.x, z: p.z },
        radius,
      );
      p.x = arena.point.x;
      p.z = arena.point.z;
      if (arena.blockedX) p.vx = 0;
      if (arena.blockedZ) p.vz = 0;
    }
    if (Math.abs(p.z - oldZ) < 1e-8) p.vz = 0;
    p.outside = Math.abs(p.x) > 5;
  }

  private movePlayer(
    p: Player,
    x: number,
    z: number,
    speed: number,
    dt: number,
  ) {
    const dx = x - p.x,
      dz = z - p.z,
      len = Math.hypot(dx, dz);
    const desired = Math.min(speed * (0.85 + p.energy * 0.15), len * 8);
    const factor = 1 - Math.exp(-15 * dt);
    p.vx += ((len > 0.02 ? (dx / len) * desired : 0) - p.vx) * factor;
    p.vz += ((len > 0.02 ? (dz / len) * desired : 0) - p.vz) * factor;
    const oldX = p.x,
      oldZ = p.z;
    p.x += p.vx * dt;
    p.z += p.vz * dt;
    this.constrainPlayer(p, oldX, oldZ);
  }
  private separatePlayers() {
    const players = this.state.players;
    for (const [a, b] of [
      [players[0], players[1]],
      [players[2], players[3]],
    ]) {
      const d = distance(a, b);
      if (d > 0.001 && d < 0.75) {
        const ax = a.x,
          az = a.z,
          bx = b.x,
          bz = b.z;
        const push = (0.75 - d) * 0.5;
        const dx = (a.x - b.x) / d,
          dz = (a.z - b.z) / d;
        a.x += dx * push;
        b.x -= dx * push;
        a.z += dz * push;
        b.z -= dz * push;
        this.constrainPlayer(a, ax, az);
        this.constrainPlayer(b, bx, bz);
      }
    }
  }

  /** A shared physical preview includes floor, both glasses and the return over net. */
  private previewFlight() {
    const s = this.state,
      ball = { ...s.ball };
    let bounceCount = this.bounces,
      walls = s.wallBounces;
    const samples: Array<
      Ball & {
        t: number;
        bounces: number;
        walls: number;
        returned: boolean;
        outside: boolean;
      }
    > = [];
    let returned = s.returnedToHitter;
    let outside = s.ballOutside;
    for (let i = 1; i <= 95; i++) {
      const oldZ = ball.z;
      integrateBall(ball, 0.035);

      if (oldZ * ball.z < 0 && Math.abs(ball.x) < 5 && ball.y < 0.92) break;
      if (ball.y < R) {
        bounceCount++;
        if (
          bounceCount > 1 ||
          (!this.bounced &&
            (sideOf(ball.z) === this.lastHitter || Math.abs(ball.x) > 5))
        )
          break;
        ball.y = R;
        collideBall(ball, { x: 0, y: 1, z: 0 }, 'turf');
      }
      if (!outside && Math.abs(ball.x) > 5 - R && ball.x * ball.vx > 0) {
        const mesh = Math.abs(ball.z) < 6 || ball.y > 3;
        if (
          ball.y - R > (Math.abs(ball.z) > 8 ? 4 : 3) ||
          this.inDoor(ball.z, ball.y, R)
        ) {
          if (!this.options.exteriorPlay) break;
          outside = true;
        } else {
          if (bounceCount === 0 && (sideOf(ball.z) !== this.lastHitter || mesh))
            break;
          ball.x = Math.sign(ball.x) * (5 - R);
          collideBall(
            ball,
            { x: -Math.sign(ball.x), y: 0, z: 0 },
            mesh ? 'mesh' : 'glass',
          );
          if (!mesh && bounceCount > 0) walls++;
        }
      } else if (outside && Math.abs(ball.x) < 5 + R && ball.x * ball.vx < 0) {
        if (
          ball.y - R > (Math.abs(ball.z) > 8 ? 4 : 3) ||
          this.inDoor(ball.z, ball.y, R)
        )
          outside = false;
        else break;
      }
      if (!outside && Math.abs(ball.z) > 10 - R && ball.z * ball.vz > 0) {
        const mesh = ball.y > 3;
        if (
          ball.y > 4 ||
          (bounceCount === 0 && sideOf(ball.z) !== this.lastHitter)
        )
          break;
        ball.z = Math.sign(ball.z) * (10 - R);
        collideBall(
          ball,
          { x: 0, y: 0, z: -Math.sign(ball.z) },
          mesh ? 'mesh' : 'glass',
        );
        if (!mesh && bounceCount > 0) walls++;
      }
      if (!outside && bounceCount > 0 && sideOf(ball.z) === this.lastHitter)
        returned = true;
      samples.push({
        ...ball,
        t: i * 0.035,
        bounces: bounceCount,
        walls,
        returned,
        outside,
      });
    }
    return samples;
  }

  private readNetOpportunity(contact: {
    x: number;
    z: number;
    player: number;
    t: number;
  }) {
    const s = this.state,
      flight = this.tacticalFlight;
    if (
      !flight ||
      flight.advanced ||
      flight.team !== this.lastHitter ||
      flight.shot === 'remate' ||
      this.serveLive ||
      s.ballOutside
    )
      return;
    const team = flight.team,
      receiving = opposite(team),
      sign = signFor(receiving);
    const rivals = s.players.filter((p) => p.team === receiving);
    const depth = s.ball.z * sign;
    const receiver = s.players[contact.player];
    const beyondInitialLine = depth > flight.opponentBack + 0.55;
    const beyondCurrentLine =
      depth > Math.max(...rivals.map((p) => Math.abs(p.z))) + 0.4;
    const forcesBack =
      Math.abs(contact.z) > Math.max(5.8, flight.opponentBack + 1.6);
    const passed =
      beyondInitialLine &&
      forcesBack &&
      (beyondCurrentLine ||
        (Math.abs(contact.z) > 7.2 &&
          s.ball.y > Math.max(...rivals.map((p) => p.height)) + 0.6)) &&
      s.ball.vz * sign > 0 &&
      Math.abs(s.predictedBounce.z) < 9.8;
    if (passed) {
      flight.advanced = true;
      this.netControl[team] = true;
      this.netControl[receiving] = false;
      this.teamDepth[team] = 3.1;
      this.teamDepth[receiving] = Math.max(6.6, Math.abs(contact.z) - 0.4);
      s.teamTactics[team] = 'subida en pareja';
      s.teamTactics[receiving] = 'giro y retroceso';
      s.tacticalHint = 'La pelota pasó a los rivales: avanzá con tu compañero';
    } else if (
      flight.shot === 'chiquita' &&
      !this.netControl[team] &&
      flight.opponentDepth < 4.8 &&
      depth > 0.5 &&
      s.ball.y < 0.98 &&
      s.ball.vy < 0 &&
      distance(receiver, s.ball) < 1.9
    ) {
      flight.advanced = true;
      this.pressureTeam = team;
      this.teamDepth[team] = 4.65;
      s.teamTactics[team] = 'presionar chiquita en pareja';
      s.tacticalHint =
        'Chiquita a los pies: avanzá y frená cuando el rival golpee';
    }
  }

  private getTargets(): Array<{ x: number; z: number }> {
    const s = this.state,
      incoming = opposite(this.lastHitter),
      sign = signFor(incoming);
    s.incomingTeam = incoming;
    const samples = this.previewFlight();
    const pair = s.players.filter((p) => p.team === incoming);
    const maxWalls = samples.reduce(
      (n, p) => Math.max(n, p.walls),
      s.wallBounces,
    );
    const firstWall = samples.find((p) => p.walls > s.wallBounces);
    let exterior: { x: number; z: number; player: number; t: number } | null =
      null;
    if (this.options.exteriorPlay && samples.some((sample) => sample.outside)) {
      let bestScore = Infinity;
      const allowed =
        this.options.training && incoming === 0 && !this.options.autoPlay
          ? [s.players[s.controlled]]
          : pair;
      for (const sample of samples) {
        if (
          !sample.outside ||
          !this.inSafeArea(sample) ||
          sample.y < 0.3 ||
          sample.y > 2.4
        )
          continue;
        const target = {
          x:
            Math.sign(sample.x) *
            clamp(
              Math.abs(sample.x) - 0.2,
              5.45,
              5 + COURT.exteriorWidth - 0.3,
            ),
          z: clamp(
            sample.z,
            -COURT.exteriorHalfLength + 0.35,
            COURT.exteriorHalfLength - 0.35,
          ),
        };
        for (const p of allowed) {
          const route = this.routePlayer(p, target);
          const available = Math.max(
            0,
            sample.t - Math.max(0, this.reactionUntil - s.time),
          );
          const pace =
            incoming === 0
              ? 5.7
              : this.options.difficulty === 'dificil'
                ? 6.1
                : this.options.difficulty === 'facil'
                  ? 4.65
                  : 5.4;
          const late = Math.max(0, route.length - 0.75 - pace * available);
          const score = late * 15 + sample.t + Math.abs(sample.y - 1.2) * 0.15;
          if (score < bestScore) {
            bestScore = score;
            exterior = { ...target, player: p.id, t: sample.t };
          }
        }
      }
    }
    const deepBall = Math.abs(s.predictedBounce.z) > 6.8;
    const defending = pair.reduce((sum, p) => sum + Math.abs(p.z), 0) / 2 > 4.8;
    const lobPassed =
      s.lastShot === 'globo' &&
      s.ball.z * sign > Math.max(...pair.map((p) => Math.abs(p.z))) + 0.4;
    const drillWall =
      this.options.training &&
      ['pared', 'doble-pared', 'bajada', 'contrapared'].includes(
        this.options.drill,
      );
    // Read a reachable descending overhead before deciding to concede the glass.
    // The former blanket 'deep lob => wall' rule discarded every aerial option.
    let aerial: { x: number; z: number; player: number; t: number } | null =
      null;
    if (
      s.lastShot === 'globo' &&
      !this.bounced &&
      !this.serveLive &&
      !(this.requestedWall && incoming === 0) &&
      !(this.options.training && incoming === 0 && !this.options.autoPlay)
    ) {
      const runSpeed =
        incoming === 0
          ? 5.6
          : this.options.difficulty === 'facil'
            ? 4.7
            : this.options.difficulty === 'dificil'
              ? 5.9
              : 5.3;
      for (const sample of samples) {
        if (
          sample.bounces ||
          sample.walls ||
          sample.vy > 0 ||
          sample.z * sign < 0 ||
          Math.abs(sample.z) > 8.7
        )
          continue;
        for (const p of [...pair].sort(
          (a, b) => distance(a, sample) - distance(b, sample),
        )) {
          const attacking = Math.abs(sample.z) < 4.0;
          const ceiling = attacking
            ? p.height * 0.79 + 0.9 * (p.height / 1.95) + 0.62
            : p.height * 0.94 + 0.34;
          const floor = attacking ? p.height + 0.5 : p.height * 0.94;
          if (sample.y < floor || sample.y > ceiling) continue;
          const target = {
            x: clamp(sample.x + (sample.x > 0 ? -0.2 : 0.2), -4.4, 4.4),
            z: sign * clamp(Math.abs(sample.z) + 0.35, 0.5, 9.15),
          };
          const available = Math.max(
            0,
            sample.t - Math.max(0, this.reactionUntil - s.time) - 0.13,
          );
          if (distance(p, target) > runSpeed * available + 0.3) continue;
          aerial = { ...target, player: p.id, t: sample.t };
          break;
        }
        if (aerial) break;
      }
    }
    const wantWall =
      !aerial &&
      !exterior &&
      maxWalls > 0 &&
      ((deepBall && (defending || lobPassed)) ||
        (this.requestedWall && incoming === 0) ||
        drillWall);
    if (exterior) {
      this.plannedWalls = 0;
      s.teamTactics[incoming] = 'recuperación exterior';
      s.tacticalHint = 'Buscá la puerta y seguí la pelota por afuera';
    } else if (s.lastShot === 'remate' && s.smashMode === 'retorno') {
      // Read a powerful smash off the back wall and close the net for the return.
      this.plannedWalls = 0;
      this.teamDepth[incoming] = 1.3;
      s.teamTactics[incoming] = 'buscar el retorno';
    } else if (aerial) {
      this.plannedWalls = 0;
      this.teamDepth[incoming] = clamp(Math.abs(aerial.z) - 0.5, 2.5, 6.8);
      s.teamTactics[incoming] =
        Math.abs(aerial.z) < 4.3
          ? 'atacar globo corto'
          : 'bandeja y recuperar red';
    } else if (wantWall) {
      this.plannedWalls =
        maxWalls >= 2 &&
        firstWall &&
        samples.some(
          (p) => p.walls >= 2 && p.t < firstWall.t + 0.4 && p.y > 0.27,
        )
          ? 2
          : 1;
      this.teamDepth[incoming] = 7.5;
      s.teamTactics[incoming] =
        this.plannedWalls > 1 ? 'defensa de doble pared' : 'defensa de vidrio';
      if (s.wallBounces < this.plannedWalls) {
        s.ballSituation = 'esperando-pared';
        s.tacticalHint =
          this.plannedWalls > 1
            ? 'Dejá pasar los dos vidrios; buscá la salida'
            : 'Abrí espacio al vidrio y seguí la salida de la pelota';
      }
    } else if (s.wallBounces === 0) this.plannedWalls = 0;
    const coverShift = clamp(s.ball.x * 0.2, -0.7, 0.7);
    const result = s.players.map((p) => ({
      x: clamp(homeX(p) + coverShift, -3.7, 3.7),
      z: signFor(p.team) * this.teamDepth[p.team],
    }));
    const speed =
      incoming === 0
        ? 5.6
        : this.options.difficulty === 'facil'
          ? 4.7
          : this.options.difficulty === 'dificil'
            ? 5.9
            : 5.3;
    let chosen: { x: number; z: number; player: number; t: number } | null =
      exterior ?? aerial;
    for (const sample of samples) {
      if (chosen) break;
      if (sample.outside) continue;
      if (
        sample.y < 0.28 ||
        sample.y > 2.85 ||
        sample.walls < this.plannedWalls
      )
        continue;
      if (this.serveLive && sample.bounces === 0) continue;
      const across =
        sample.returned &&
        sample.z * sign < 0 &&
        Math.abs(sample.z) < 0.75 &&
        sample.y > 1.02;
      if (sample.z * sign < 0 && !across) continue;
      const candidates =
        this.options.training && incoming === 0 && !this.options.autoPlay
          ? [s.players[s.controlled]]
          : [...pair].sort((a, b) => distance(a, sample) - distance(b, sample));
      for (const p of candidates) {
        const overhead = sample.y > 1.65 && s.lastShot === 'globo';
        if (sample.bounces === 0 && !overhead && !across && Math.abs(p.z) > 5.6)
          continue;
        // Hold the volley line against a deep ball. Sprinting to intercept
        // every shot at the net tape erases both chiquitas and split steps.
        if (
          !overhead &&
          !across &&
          !s.returnedToHitter &&
          this.netControl[incoming] &&
          sample.bounces === 0 &&
          Math.abs(s.predictedBounce.z) > this.teamDepth[incoming] - 0.6 &&
          Math.abs(sample.z) < Math.max(1.4, this.teamDepth[incoming] - 1)
        )
          continue;
        const target = {
          x: clamp(sample.x + (sample.x > 0 ? -0.25 : 0.25), -4.45, 4.45),
          z: across
            ? sign * 0.42
            : sign * clamp(Math.abs(sample.z) - 0.3, 0.48, 9.35),
        };
        const available = Math.max(
          0,
          sample.t - Math.max(0, this.reactionUntil - s.time),
        );
        if (distance(p, target) < speed * available + 0.78) {
          chosen = { ...target, player: p.id, t: sample.t };
          break;
        }
      }
      if (chosen) break;
    }
    if (!chosen) {
      const eligible = samples.filter(
        (p) =>
          !p.outside &&
          p.walls >= this.plannedWalls &&
          p.bounces <= 1 &&
          p.y > 0.25 &&
          p.y < 2.7 &&
          (p.z * sign > 0 || p.returned),
      );
      const sample =
        eligible[
          Math.min(eligible.length - 1, Math.floor(eligible.length * 0.5))
        ];
      const target = sample ?? s.predictedBounce;
      const candidates =
        this.options.training && incoming === 0 && !this.options.autoPlay
          ? [s.players[s.controlled]]
          : [...pair].sort((a, b) => distance(a, target) - distance(b, target));
      chosen = {
        x: clamp(target.x, -4.45, 4.45),
        z: sign * clamp(Math.abs(target.z), 0.45, 9.35),
        player: candidates[0].id,
        t: sample?.t ?? 0.4,
      };
    }
    this.readNetOpportunity(chosen);
    this.plannedPlayer = chosen.player;
    this.plannedContactTime = s.time + chosen.t;
    result[chosen.player] = { x: chosen.x, z: chosen.z };
    const partnerId = incoming === 0 ? 1 - chosen.player : 5 - chosen.player;
    const partnerDepth = exterior
      ? 2.6
      : this.plannedWalls > 0
        ? clamp(Math.abs(chosen.z) - 0.45, 5.8, 8.1)
        : clamp(
            Math.abs(chosen.z),
            this.teamDepth[incoming] - 0.9,
            this.teamDepth[incoming] + 0.9,
          );
    result[partnerId] = {
      x:
        chosen.x > 0
          ? clamp(chosen.x - 4.4, -3.2, -0.4)
          : clamp(chosen.x + 4.4, 0.4, 3.2),
      z: sign * partnerDepth,
    };
    // Partners recover along the same line and shade toward the ball. Targets
    // are waypoints: acceleration, speed and the physical doors still apply.
    const hitting = s.players.filter((p) => p.team === this.lastHitter);
    const desired = this.teamDepth[this.lastHitter];
    const front = Math.min(...hitting.map((p) => Math.abs(p.z)));
    const back = Math.max(...hitting.map((p) => Math.abs(p.z)));
    const depth =
      desired < front
        ? Math.max(desired, Math.min(front, back - 1.5))
        : desired;
    for (const p of hitting) result[p.id].z = signFor(p.team) * depth;
    return result;
  }
}
