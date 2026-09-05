/**
 * Premier Padel simulation. Metres / seconds, positive Z is the home pair.
 * The camera keeps the home team near the viewer after changes of ends.
 * Rules reference: FIP Rules of Padel, application 01.01.2026.
 * Deliberate prototype limits: no exterior retrieval/body-contact faults;
 * spin and racket contact are assisted approximations, not rigid-body simulation.
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
export type Smash = 'retorno' | 'por3' | 'por4';
export type Team = 0 | 1;
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
}
export interface Ball {
  x: number;
  y: number;
  z: number;
  vx: number;
  vy: number;
  vz: number;
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
  energy: number;
  preparation: number;
  movementIntent: 'espera' | 'red' | 'defensa' | 'giro' | 'pared' | 'remate';
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
    | 'punto';
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
  } | null;
  lastBounce: {
    x: number;
    y: number;
    z: number;
    time: number;
    surface: 'suelo' | 'vidrio' | 'malla' | 'red';
  } | null;
  stats: {
    winners: [number, number];
    errors: [number, number];
    longestRally: number;
    totalPoints: number;
    maxSpeed: number;
  };
}
export interface MatchOptions {
  difficulty?: 'facil' | 'normal' | 'dificil';
  gamesToWin?: number;
  setsToWin?: number;
  training?: boolean;
  autoPlay?: boolean;
  scoring?: 'ventaja' | 'star';
  drill?: 'libre' | 'pared' | 'doble-pared' | 'remate';
}
export const COURT = {
  halfWidth: 5,
  halfLength: 10,
  serviceLine: 6.95,
  netHeight: 0.88,
  sideHeight: 3,
  endHeight: 4,
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

/** Analytic launch to a target on the floor. Used by assisted racket contact. */
export function solveTrajectory(
  from: { x: number; y: number; z: number },
  target: { x: number; z: number },
  flightTime: number,
): Ball {
  const t = Math.max(0.12, flightTime);
  return {
    ...from,
    vx: (target.x - from.x) / t,
    vz: (target.z - from.z) / t,
    vy: (R - from.y + 0.5 * G * t * t) / t,
  };
}

/** Pure integration helper. Collision rules are applied by PadelMatch. */
export function integrateBall(ball: Ball, dt: number): void {
  const damping = Math.exp(-0.025 * dt);
  ball.x += ball.vx * dt;
  ball.y += ball.vy * dt - 0.5 * G * dt * dt;
  ball.z += ball.vz * dt;
  ball.vx *= damping;
  ball.vz *= damping;
  ball.vy -= G * dt;
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
  private requestedWall = false;
  private plannedWalls = 0;
  private plannedPlayer = 0;
  private plannedContactTime = 0;
  private reactionUntil = 0;
  private wallTime = -10;
  private teamDepth: [number, number] = [3.2, 7.2];
  private hitWasDown = false;
  private switchWasDown = false;
  private spin = 0;
  private smashKick = 0;
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
    };
    this.keeper = new ScoreKeeper(
      this.options.gamesToWin,
      this.options.setsToWin,
      this.options.scoring,
    );
    this.state = {
      ball: { x: 2.4, y: 0.85, z: 7.8, vx: 0, vy: 0, vz: 0 },
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
        preparation: 0,
        movementIntent: 'espera',
        reachAcross: false,
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
      this.hitBuffer = 0.42;
      this.bufferedShot = input.shot;
      this.bufferedPower = clamp(input.power, 0, 1);
      this.bufferedAim = clamp(input.aim, -1, 1);
      this.bufferedSmash = input.smash ?? 'retorno';
    }
    if (input.switchPlayer && !this.switchWasDown && s.phase !== 'serve')
      s.controlled = s.controlled === 0 ? 1 : 0;
    this.switchWasDown = !!input.switchPlayer;
    for (const p of s.players) p.swing = Math.max(0, p.swing - dt * 2.6);
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
    const oldZ = s.ball.z;
    integrateBall(s.ball, dt);
    // Small lateral Magnus approximation; slice varies the post-bounce response.
    s.ball.vx += this.spin * dt;
    this.spin *= Math.exp(-0.34 * dt);
    this.collisions(oldZ);
    if (s.phase !== 'rally') {
      this.hitWasDown = input.hit;
      return;
    }
    s.speed = Math.hypot(s.ball.vx, s.ball.vy, s.ball.vz) * 3.6;
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
      else this.movePlayer(p, targets[p.id].x, targets[p.id].z, speed, dt);
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
      if (p.preparation > 0.3 && s.ball.y > 1.9) p.movementIntent = 'remate';
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
    this.spin = 0;
    this.smashKick = 0;
    this.hitBuffer = 0;
    const pointCount = s.score.points[0] + s.score.points[1];
    if (s.score.tieBreak) {
      const offset = pointCount === 0 ? 0 : Math.floor((pointCount + 1) / 2);
      s.server = this.serviceOrder[(this.tieBreakStartServer + offset) % 4];
    } else s.server = this.serviceOrder[this.gameServerIndex % 4];
    if (this.options.training) s.server = 2;
    const server = s.players[s.server],
      sign = signFor(server.team);
    this.serveSign = (pointCount % 2 === 0 ? 1 : -1) * sign;
    for (const p of s.players) {
      p.x = p.id % 2 === 0 ? 2.4 : -2.4;
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
    this.teamDepth[server.team] = 3.1;
    this.teamDepth[s.incomingTeam] = 7.3;
    s.teamTactics[server.team] = 'red';
    s.teamTactics[s.incomingTeam] = 'defensa';
    if (this.options.training && this.options.drill !== 'libre') {
      s.players[0].x = this.options.drill === 'doble-pared' ? 3.1 : 1.8;
      s.players[0].z = this.options.drill === 'remate' ? 3.1 : 7.2;
      s.players[1].x = -3.7;
      s.players[1].z = 7.7;
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
        (this.options.drill === 'doble-pared'
          ? 'Esperá los dos vidrios'
          : this.options.drill === 'pared'
            ? 'Dejá pasar al vidrio y acompañá la salida'
            : 'Globo corto · Prepará tu remate');
    this.emit('ready');
  }
  private placeServeBall() {
    const s = this.state,
      p = s.players[s.server];
    Object.assign(s.ball, {
      x: p.x - this.serveSign * 0.4,
      y: 0.8,
      z: p.z - signFor(p.team) * 0.25,
      vx: 0,
      vy: 0,
      vz: 0,
    });
  }
  private updateServe(dt: number, input: Input) {
    const s = this.state,
      p = s.players[s.server];
    if (s.needsReceivingSide) return;
    if (this.options.training && this.options.drill !== 'libre') {
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

  private recordContact(p: Player, shot: Shot) {
    const s = this.state;
    s.lastHitterId = p.id;
    s.contactPoint = {
      x: s.ball.x,
      y: s.ball.y,
      z: s.ball.z,
      time: s.time,
      playerId: p.id,
      shot,
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
    if (sideOf(b.z) !== p.team && !reachingAcross) return false;
    if (p.z * signFor(p.team) < 0.35) return false;
    if (this.serveLive && !this.bounced) return false;
    if (
      p.id === s.controlled &&
      this.requestedWall &&
      s.wallBounces < this.plannedWalls
    )
      return false;
    const overhead = ['bandeja', 'vibora', 'remate', 'bajada'].includes(shot);
    const maxHeight = overhead ? 3.02 : shot === 'volea' ? 2.55 : 1.98;
    const reach =
      b.y > 2.9
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
      b = s.ball;
    if (s.returnedToHitter) return 'volea';
    if (s.wallBounces > 0) {
      if (b.y > 1.35 && Math.abs(p.z) > 5) return 'bajada';
      if (b.y < 0.65 && Math.abs(p.z) > 8.2 && b.vz * signFor(p.team) > 0)
        return 'contrapared';
      return s.rally % 3 === 0 ? 'chiquita' : 'globo';
    }
    if (b.y > 1.9) {
      if (Math.abs(p.z) < 4.6 && b.y > 2.3 && s.rally % 3 === 0)
        return 'remate';
      return s.rally % 3 === 1 && Math.abs(p.z) < 5.6 ? 'vibora' : 'bandeja';
    }
    if (Math.abs(p.z) > 5.5)
      return s.rally % 3 === 0
        ? 'chiquita'
        : s.rally % 3 === 1
          ? 'globo'
          : 'plano';
    if (Math.abs(p.z) < 4.7 && !this.bounced)
      return s.rally % 8 === 5 ? 'dejada' : 'volea';
    return b.y < 0.9 ? 'chiquita' : 'plano';
  }

  private hit(
    p: Player,
    selected: Shot,
    power: number,
    aim: number,
    smash: Smash = 'retorno',
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
    const automatic = this.options.autoPlay || p.id !== s.controlled;
    const err = (this.random() - 0.5) * (automatic ? 0.28 : 0);
    let target = {
      x: clamp(aim * 3.8 + err, -4.45, 4.45),
      z: -sign * (6.6 + power * 1.45),
    };
    let t = Math.hypot(target.x - b.x, target.z - b.z) / (12 + power * 5);
    this.spin = 0;
    this.smashKick = 0;
    s.smashMode = smash;
    if (shot === 'globo') {
      target.z = -sign * (7.8 + power * 0.95);
      const apex = 5.4 + power * 1.8;
      t =
        Math.sqrt((2 * Math.max(0.2, apex - b.y)) / G) +
        Math.sqrt((2 * (apex - R)) / G);
    } else if (shot === 'chiquita') {
      // Slow dipping ball to the net pair's feet, not a short winner.
      target.z = -sign * (3.0 + (1 - power) * 0.9);
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
      this.spin = aim * 0.4;
    } else if (shot === 'bandeja') {
      // Controlled sliced overhead toward the deep corner, buying net recovery.
      target.x = clamp((aim || (b.x > 0 ? -0.78 : 0.78)) * 4.6, -4.4, 4.4);
      target.z = -sign * 8.25;
      t = Math.max(
        0.62,
        Math.hypot(target.x - b.x, target.z - b.z) / (13 + power * 2.5),
      );
      this.spin = aim * 0.35;
    } else if (shot === 'vibora') {
      // Faster, more lateral slice; low skid and a wider wall rebound.
      target.x = clamp((aim || (b.x > 0 ? -0.82 : 0.82)) * 4.4, -4.45, 4.45);
      target.z = -sign * 7.65;
      t = Math.max(
        0.43,
        Math.hypot(target.x - b.x, target.z - b.z) / (18 + power * 5),
      );
      this.spin = (aim || 0.7) * 2.0;
    } else if (shot === 'bajada') {
      target.z = -sign * (4.7 + power * 1.2);
      t = Math.max(
        0.44,
        Math.hypot(target.x - b.x, target.z - b.z) / (19 + power * 6),
      );
      this.spin = aim * 0.8;
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
        this.smashKick =
          power > 0.6 && b.y > 2.05
            ? Math.sign(aim || b.x || 1) * (0.75 + Math.abs(aim) * 0.25)
            : 0;
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
    if (shot === 'remate' && smash === 'por3' && this.smashKick) {
      const side = Math.sign(this.smashKick),
        afterBounce = 0.335;
      // Aim the first bounce so the lateral exit occurs while the kicked ball
      // is above the 3m middle enclosure, before reaching the 4m end zone.
      const projectedX = b.x * side;
      target.x =
        side *
        clamp(
          (5 +
            (afterBounce * 0.93 * projectedX) / t -
            afterBounce * Math.abs(this.smashKick) * 7.2) /
            (1 + (afterBounce * 0.93) / t),
          0.55,
          3.35,
        );
    }
    const errorRate =
      this.options.difficulty === 'facil'
        ? 0.08
        : this.options.difficulty === 'dificil'
          ? 0.02
          : 0.04;
    const mishit =
      automatic &&
      s.rally > 3 &&
      this.random() < errorRate + Math.max(0, s.rally - 18) * 0.002;
    Object.assign(b, solveTrajectory(b, target, t));
    if (shot === 'contrapared') {
      // Launch towards our own back glass. The collision reflects it over the
      // net; no invented opponent target or teleportation is involved.
      const toGlass = 10 - R - Math.abs(b.z);
      const vz = sign * (17 + power * 5);
      const toNetTime = toGlass / Math.abs(vz) + 10 / (Math.abs(vz) * 0.85);
      b.vx = (aim * 3 - b.x) / Math.max(1, toNetTime + 0.35);
      b.vz = vz;
      b.vy = (2.05 - b.y + 0.5 * G * toNetTime * toNetTime) / toNetTime;
      target = { x: aim * 3, z: -sign * 6.5 };
    }
    if (mishit) b.vy -= 3.6 + this.random() * 2;
    this.lastHitter = p.team;
    this.lastHitterId = p.id;
    this.recordContact(p, shot);
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
    s.ballSituation = 'vuelo';
    p.shot = shot;
    p.swing = 1;
    p.preparation = 0;
    const recoveredNet = [
      'globo',
      'bandeja',
      'vibora',
      'volea',
      'remate',
      'bajada',
    ].includes(shot);
    this.teamDepth[p.team] = recoveredNet
      ? 3.05
      : shot === 'chiquita'
        ? 4.45
        : Math.abs(p.z) > 5
          ? 6.8
          : 3.6;
    this.teamDepth[s.incomingTeam] =
      shot === 'globo' ? 7.7 : this.teamDepth[s.incomingTeam];
    s.teamTactics[p.team] = recoveredNet
      ? 'subida en pareja'
      : shot === 'chiquita'
        ? 'transición'
        : 'defensa';
    if (shot === 'globo') s.teamTactics[s.incomingTeam] = 'giro y retroceso';
    s.tacticalHint =
      shot === 'globo'
        ? 'Globo profundo: subí con tu compañero'
        : shot === 'chiquita'
          ? 'A los pies: avanzá detrás de la chiquita'
          : shot === 'bandeja'
            ? 'Bandeja profunda: recuperá la red'
            : shot === 'vibora'
              ? 'Víbora cortada: buscá el rebote bajo'
              : shot === 'remate'
                ? smash === 'retorno'
                  ? 'Pique, vidrio y vuelta: el receptor todavía puede llegar'
                  : smash === 'por3'
                    ? 'Buscá la salida lateral después del pique'
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
              : ' · Por 4'
          : ''),
    );
  }

  private launchDrill() {
    const s = this.state,
      p = s.players[2];
    s.phase = 'rally';
    this.phaseTime = 0;
    Object.assign(s.ball, {
      x: this.options.drill === 'doble-pared' ? -0.8 : 1.5,
      y: 1.25,
      z: -4.2,
    });
    p.x = s.ball.x;
    p.z = s.ball.z;
    this.hit(p, this.options.drill === 'remate' ? 'globo' : 'plano', 0.65, 0.4);
    let target = {
      x: this.options.drill === 'doble-pared' ? 4.32 : 2.05,
      z: 8.65,
    };
    let t = 0.82;
    if (this.options.drill === 'remate') {
      target = { x: 1.55, z: 3.8 };
      const apex = 5.2;
      t =
        Math.sqrt((2 * (apex - s.ball.y)) / G) +
        Math.sqrt((2 * (apex - R)) / G);
      this.teamDepth[0] = 3.2;
    }
    Object.assign(s.ball, solveTrajectory(s.ball, target, t));
    s.predictedBounce = target;
    s.incomingTeam = 0;
    this.plannedPlayer = 0;
    s.tacticalHint =
      this.options.drill === 'remate'
        ? 'Esperá que el globo baje a tu pala'
        : 'Dejá pasar la pelota y acompañá el rebote del vidrio';
    this.emit('hit', 'Ejercicio · ' + this.options.drill);
  }

  private groundBounce(b: Ball, kick: number): void {
    const shot = this.state.lastShot,
      mode = this.state.smashMode;
    const restitution =
      shot === 'dejada'
        ? 0.4
        : shot === 'chiquita'
          ? 0.64
          : shot === 'vibora'
            ? 0.53
            : shot === 'bandeja'
              ? 0.61
              : shot === 'volea'
                ? 0.67
                : shot === 'bajada'
                  ? 0.69
                  : shot === 'remate' && mode === 'retorno'
                    ? 0.48
                    : shot === 'remate' && mode === 'por4'
                      ? 0.88
                      : 0.78;
    b.y = R;
    b.vy = Math.abs(b.vy) * restitution;
    const grip =
      shot === 'dejada'
        ? 0.58
        : shot === 'chiquita'
          ? 0.79
          : shot === 'vibora'
            ? 0.97
            : 0.93;
    b.vx *= grip;
    b.vz *= grip;
    if (shot === 'remate' && mode === 'retorno') {
      b.vy += 0.48;
      b.vz *= 1.015;
    }
    if (kick) {
      const pace = Math.hypot(b.vx, b.vz);
      b.vy += Math.min(4, pace * 0.17);
      b.vx += kick * 7.2;
      b.vz *= 0.84;
    }
  }
  private recordBounce(surface: 'suelo' | 'vidrio' | 'malla' | 'red') {
    const s = this.state;
    s.lastBounce = {
      x: s.ball.x,
      y: s.ball.y,
      z: s.ball.z,
      time: s.time,
      surface,
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
  private collisions(oldZ: number) {
    const s = this.state,
      b = s.ball;
    const crossedNet = oldZ * b.z < 0;
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
        this.emit('net', 'Red');
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
          s.returnedToHitter
            ? 'Remate que vuelve · Segundo pique'
            : 'Doble pique',
          true,
        );
        return;
      }
      this.groundBounce(b, this.smashKick);
      this.smashKick = 0;
      s.ballBounce = this.bounces;
      this.recordBounce('suelo');
      this.emit('bounce');
    }
    if (Math.abs(b.x) + R > 5 && b.x * b.vx > 0) {
      const wallHeight = Math.abs(b.z) > 8 ? 4 : 3;
      if (b.y - R > wallHeight) {
        this.outOfCourt('Remate por 3');
        return;
      }
      const mesh = Math.abs(b.z) < 6 || b.y > 3;
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
      b.vx *= mesh ? -0.56 : -0.84;
      if (mesh) b.vz *= 0.83;
      else if (s.lastShot === 'vibora') b.vz *= 0.93;
      this.spin *= -0.5;
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
    if (Math.abs(b.z) + R > 10 && b.z * b.vz > 0) {
      if (b.y - R > 4) {
        this.outOfCourt('Remate por 4');
        return;
      }
      const mesh = b.y > 3;
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
      b.vz *= mesh
        ? -0.6
        : s.lastShot === 'remate' && s.smashMode === 'retorno'
          ? -0.94
          : -0.85;
      b.vx *= 0.96;
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
    const result = this.options.training
      ? { game: false, set: false, match: false }
      : this.keeper.award(winner);
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
    p.x = clamp(p.x + p.vx * dt, -4.55, 4.55);
    p.z =
      p.team === 0
        ? clamp(p.z + p.vz * dt, 0.4, 9.5)
        : clamp(p.z + p.vz * dt, -9.5, -0.4);
  }
  private separatePlayers() {
    const players = this.state.players;
    for (const [a, b] of [
      [players[0], players[1]],
      [players[2], players[3]],
    ]) {
      const d = distance(a, b);
      if (d > 0.001 && d < 0.75) {
        const push = (0.75 - d) * 0.5;
        const dx = (a.x - b.x) / d,
          dz = (a.z - b.z) / d;
        a.x += dx * push;
        b.x -= dx * push;
        a.z += dz * push;
        b.z -= dz * push;
      }
    }
  }

  /** A shared physical preview includes floor, both glasses and the return over net. */
  private previewFlight() {
    const s = this.state,
      ball = { ...s.ball };
    let bounceCount = this.bounces,
      walls = s.wallBounces,
      kick = this.smashKick,
      curve = this.spin;
    const samples: Array<
      Ball & { t: number; bounces: number; walls: number; returned: boolean }
    > = [];
    let returned = s.returnedToHitter;
    for (let i = 1; i <= 95; i++) {
      const oldZ = ball.z;
      integrateBall(ball, 0.035);
      ball.vx += curve * 0.035;
      curve *= Math.exp(-0.34 * 0.035);
      if (oldZ * ball.z < 0 && ball.y < 0.92) break;
      if (ball.y < R) {
        bounceCount++;
        if (
          bounceCount > 1 ||
          (!this.bounced && sideOf(ball.z) === this.lastHitter)
        )
          break;
        this.groundBounce(ball, kick);
        kick = 0;
      }
      if (Math.abs(ball.x) > 5 - R && ball.x * ball.vx > 0) {
        const mesh = Math.abs(ball.z) < 6 || ball.y > 3;
        if (ball.y > (Math.abs(ball.z) > 8 ? 4 : 3)) break;
        if (bounceCount === 0 && (sideOf(ball.z) !== this.lastHitter || mesh))
          break;
        ball.x = Math.sign(ball.x) * (5 - R);
        ball.vx *= mesh ? -0.56 : -0.84;
        if (mesh) ball.vz *= 0.83;
        else if (bounceCount > 0) walls++;
        curve *= -0.5;
      }
      if (Math.abs(ball.z) > 10 - R && ball.z * ball.vz > 0) {
        const mesh = ball.y > 3;
        if (
          ball.y > 4 ||
          (bounceCount === 0 && sideOf(ball.z) !== this.lastHitter)
        )
          break;
        ball.z = Math.sign(ball.z) * (10 - R);
        ball.vz *= mesh
          ? -0.6
          : s.lastShot === 'remate' && s.smashMode === 'retorno'
            ? -0.94
            : -0.85;
        ball.vx *= 0.96;
        if (!mesh && bounceCount > 0) walls++;
      }
      if (bounceCount > 0 && sideOf(ball.z) === this.lastHitter)
        returned = true;
      samples.push({
        ...ball,
        t: i * 0.035,
        bounces: bounceCount,
        walls,
        returned,
      });
    }
    return samples;
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
    const deepBall = Math.abs(s.predictedBounce.z) > 6.8;
    const defending = pair.reduce((sum, p) => sum + Math.abs(p.z), 0) / 2 > 4.8;
    const lobPassed = s.lastShot === 'globo' && (s.ball.y > 3.05 || defending);
    const drillWall =
      this.options.training &&
      ['pared', 'doble-pared'].includes(this.options.drill);
    const wantWall =
      maxWalls > 0 &&
      ((deepBall && (defending || lobPassed)) ||
        (this.requestedWall && incoming === 0) ||
        drillWall);
    if (s.lastShot === 'remate' && s.smashMode === 'retorno') {
      // Read a powerful smash off the back wall and close the net for the return.
      this.plannedWalls = 0;
      this.teamDepth[incoming] = 1.3;
      s.teamTactics[incoming] = 'buscar el retorno';
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
    const result = s.players.map((p) => ({
      x: (p.id % 2 === 0 ? 1 : -1) * 2.35,
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
      null;
    for (const sample of samples) {
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
    this.plannedPlayer = chosen.player;
    this.plannedContactTime = s.time + chosen.t;
    result[chosen.player] = { x: chosen.x, z: chosen.z };
    const partnerId = incoming === 0 ? 1 - chosen.player : 5 - chosen.player;
    const partnerDepth =
      this.plannedWalls > 0
        ? clamp(Math.abs(chosen.z) - 0.45, 5.8, 8.1)
        : clamp(
            Math.abs(chosen.z),
            this.teamDepth[incoming] - 0.9,
            this.teamDepth[incoming] + 0.9,
          );
    result[partnerId] = {
      x: chosen.x > 0 ? -2.25 : 2.25,
      z: sign * partnerDepth,
    };
    // Both members recover to the same depth; a globo pulls them forward
    // together while the receiving pair turns toward its back glass.
    const hitting = s.players.filter((p) => p.team === this.lastHitter);
    const pairMean = (Math.abs(hitting[0].z) + Math.abs(hitting[1].z)) / 2;
    if (pairMean > this.teamDepth[this.lastHitter] + 2) {
      const depth = Math.max(this.teamDepth[this.lastHitter], pairMean - 1.5);
      for (const p of hitting) result[p.id].z = signFor(p.team) * depth;
    }
    return result;
  }
}
