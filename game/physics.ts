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
  | 'dejada';
export type Team = 0 | 1;
export interface Input {
  moveX: number;
  moveZ: number;
  hit: boolean;
  shot: Shot;
  power: number;
  aim: number;
  switchPlayer?: boolean;
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
  serviceMotion: number;
  ballBounce: number;
  predictedBounce: { x: number; z: number };
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
      serviceMotion: 0,
      ballBounce: 0,
      predictedBounce: { x: -2.4, z: -5.8 },
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
      p.facing = Math.atan2(p.x - s.ball.x, p.z - s.ball.z);
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
      );
      this.hitBuffer = 0;
    } else {
      // Only one member of a pair can touch the ball on each return.
      const candidates = s.players.filter(
        (p) =>
          (this.options.autoPlay || p.id !== s.controlled) &&
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
    this.placeServeBall();
    s.message =
      server.team === 0 && !this.options.autoPlay
        ? 'Tu saque · Espacio para sacar de abajo'
        : 'Preparados · Saque rival';
    if (this.options.autoPlay) s.message = 'Exhibición · Saque de abajo';
    // Receiver-choice UI is deferred: use the regular diagonal receiving box.
    if (s.score.starPoint)
      s.message = 'Star Point · Este punto define el juego';
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
    this.serveLive = true;
    this.bounced = false;
    this.bounces = 0;
    this.serveNet = false;
    this.contactTime = s.time;
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

  private canContact(p: Player, shot: Shot): boolean {
    const s = this.state,
      b = s.ball;
    if (
      s.phase !== 'rally' ||
      s.time - this.contactTime < 0.26 ||
      p.team === this.lastHitter
    )
      return false;
    if (sideOf(b.z) !== p.team || Math.abs(b.z) < 0.15 || b.y < 0.16)
      return false;
    if (this.serveLive && !this.bounced) return false;
    const overhead =
      shot === 'bandeja' || shot === 'vibora' || shot === 'remate';
    const maxHeight = overhead ? 3.0 : 1.95;
    // A low selected overhead becomes a safe ground stroke when contact is low.
    return (
      b.y <= maxHeight &&
      distance(p, b) <
        (p.id === s.controlled && !this.options.autoPlay ? 1.62 : 1.38)
    );
  }

  private chooseShot(p: Player): Shot {
    const b = this.state.ball;
    if (b.y > 2.0) {
      if (Math.abs(p.z) < 5.2 && this.state.rally % 4 === 0) return 'remate';
      return this.state.rally % 3 === 0 ? 'vibora' : 'bandeja';
    }
    if (Math.abs(p.z) > 5 && this.state.rally % 4 === 2) return 'globo';
    if (Math.abs(p.z) < 4.5 && this.state.rally % 7 === 5) return 'dejada';
    return 'plano';
  }

  private hit(p: Player, selected: Shot, power: number, aim: number) {
    const s = this.state,
      b = s.ball;
    let shot = selected;
    if (
      b.y < 1.35 &&
      (shot === 'remate' || shot === 'bandeja' || shot === 'vibora')
    )
      shot = 'plano';
    const sign = signFor(p.team);
    const errorScale =
      p.id === s.controlled && !this.options.autoPlay
        ? 0
        : this.options.difficulty === 'facil'
          ? 0.35
          : 0.15;
    const err = (this.random() - 0.5) * errorScale;
    let target = {
      x: clamp(aim * 3.8 + err, -4.5, 4.5),
      z: -sign * (6.2 + power * 1.3),
    };
    let t = Math.hypot(target.x - b.x, target.z - b.z) / (12 + power * 5);
    this.spin = 0;
    this.smashKick = 0;
    if (shot === 'globo') {
      target.z = -sign * (7.5 + power * 1.1);
      const apex = 5.4 + power * 2.1;
      t =
        Math.sqrt((2 * Math.max(0.2, apex - b.y)) / G) +
        Math.sqrt((2 * (apex - R)) / G);
    } else if (shot === 'dejada') {
      target.z = -sign * (1.2 + (1 - power) * 0.6);
      target.x = clamp(aim * 3.9, -4.3, 4.3);
      t = Math.max(0.65, Math.hypot(target.x - b.x, target.z - b.z) / 8);
    } else if (shot === 'bandeja') {
      target.z = -sign * 7.8;
      t = Math.max(
        0.63,
        Math.hypot(target.x - b.x, target.z - b.z) / (14 + power * 3),
      );
      this.spin = aim * 0.5;
    } else if (shot === 'vibora') {
      target.x = clamp((aim || (b.x > 0 ? -0.65 : 0.65)) * 4, -4.5, 4.5);
      target.z = -sign * 7.1;
      t = Math.max(
        0.55,
        Math.hypot(target.x - b.x, target.z - b.z) / (17 + power * 4),
      );
      this.spin = (aim || 0.65) * 2.5;
    } else if (shot === 'remate') {
      target.z = -sign * (2.8 + (1 - power) * 1.2);
      target.x = clamp(b.x * 0.25 + aim * 0.8, -2.0, 2.0);
      t = Math.max(
        0.19,
        Math.hypot(target.x - b.x, target.z - b.z) / (23 + power * 10),
      );
      this.smashKick =
        power > 0.6 && b.y > 2.05 ? aim || (b.x >= 0 ? 0.7 : -0.7) : 0;
    }
    // AI errors affect the actual trajectory, never the score directly.
    const automatic = this.options.autoPlay || p.id !== s.controlled;
    const errorRate =
      this.options.difficulty === 'facil'
        ? 0.09
        : this.options.difficulty === 'dificil'
          ? 0.025
          : 0.045;
    const mishit =
      automatic &&
      s.rally > 3 &&
      this.random() < errorRate + Math.max(0, s.rally - 15) * 0.002;
    if (mishit) {
      target.x = (target.x >= 0 ? 1 : -1) * (5.4 + this.random() * 1.2);
    }
    t = Math.max(0.3, t);
    // Choose the minimum flight time that clears the net. Shots remain ballistic.
    const fraction = Math.abs(b.z) / Math.max(0.1, Math.abs(target.z - b.z));
    if (fraction > 0 && fraction < 1) {
      const linearY = b.y * (1 - fraction) + R * fraction;
      const margin = shot === 'dejada' ? 1.01 : shot === 'globo' ? 1.65 : 1.08;
      const minimum = Math.sqrt(
        Math.max(0, ((margin - linearY) * 2) / (G * fraction * (1 - fraction))),
      );
      t = Math.max(t, minimum);
    }
    Object.assign(b, solveTrajectory(b, target, t));
    if (mishit) b.vy -= 4.5 + this.random() * 2;
    this.lastHitter = p.team;
    this.lastHitterId = p.id;
    this.bounced = false;
    this.bounces = 0;
    this.serveLive = false;
    this.serveNet = false;
    this.contactTime = s.time;
    s.ballBounce = 0;
    s.incomingTeam = opposite(p.team);
    s.rally++;
    s.lastShot = shot;
    s.predictedBounce = target;
    s.canHit = false;
    p.shot = shot;
    p.swing = 1;
    this.pointAim = (this.random() - 0.5) * 1.8;
    s.stats.longestRally = Math.max(s.stats.longestRally, s.rally);
    this.emit(
      'hit',
      SHOT_NAMES[shot] + (this.smashKick ? ' · Buscando la salida por 3' : ''),
    );
  }

  private collisions(oldZ: number) {
    const s = this.state,
      b = s.ball;
    if (oldZ * b.z < 0 && b.y - R < 0.88 + Math.abs(b.x) * 0.008) {
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
        // The net is physical: a tape clip can cross; a low impact falls back.
        b.z = Math.sign(oldZ) * 0.08;
        b.vz *= -0.1;
        b.vx *= 0.4;
        b.vy = Math.min(0, b.vy) * 0.3;
        this.emit('net', 'Red');
      }
    }
    if (b.y <= R && b.vy < 0) {
      b.y = R;
      const side = sideOf(b.z);
      if (!this.bounced) {
        if (side === this.lastHitter) {
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
        if (this.serveNet && this.serveLive) {
          this.repeatServe();
          return;
        }
        this.bounced = true;
        this.bounces = 1;
      } else {
        this.bounces++;
        this.finishPoint(this.lastHitter, 'Doble pique', true);
        return;
      }
      const restitution =
        s.lastShot === 'dejada'
          ? 0.43
          : s.lastShot === 'vibora'
            ? 0.62
            : s.lastShot === 'bandeja'
              ? 0.66
              : 0.79;
      b.vy = Math.abs(b.vy) * restitution;
      const grip =
        s.lastShot === 'dejada' ? 0.63 : s.lastShot === 'vibora' ? 0.91 : 0.92;
      b.vx *= grip;
      b.vz *= grip;
      if (this.smashKick) {
        // Topsin converts some pace into a high, sideways post-bounce kick.
        const pace = Math.hypot(b.vx, b.vz);
        b.vy += Math.min(4, pace * 0.17);
        b.vx += this.smashKick * 7.2;
        b.vz *= 0.84;
        this.smashKick = 0;
      }
      s.ballBounce = this.bounces;
      this.emit('bounce');
    }
    if (Math.abs(b.x) + R > 5) {
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
      this.spin *= -0.5;
      this.emit(
        mesh ? 'mesh' : 'glass',
        mesh ? 'Rebote en la malla' : 'Rebote en el vidrio',
      );
    }
    if (Math.abs(b.z) + R > 10) {
      if (b.y - R > 4) {
        this.outOfCourt('Remate por 4');
        return;
      }
      if (!this.bounced && sideOf(b.z) !== this.lastHitter) {
        this.failReturn('Pared de fondo antes del pique');
        return;
      }
      if (this.serveLive && this.bounced && b.y > 3) {
        this.serveFault('Saque a la malla de fondo');
        return;
      }
      b.z = Math.sign(b.z) * (10 - R);
      b.vz *= b.y > 3 ? -0.6 : -0.85;
      b.vx *= 0.96;
      this.emit(b.y > 3 ? 'mesh' : 'glass', 'Rebote en el vidrio de fondo');
    }
    // A dying net roll cannot leave the simulation stuck at near-zero height.
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
        ? clamp(p.z + p.vz * dt, 0.55, 9.5)
        : clamp(p.z + p.vz * dt, -9.5, -0.55);
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

  private getTargets(): Array<{ x: number; z: number }> {
    const s = this.state,
      incoming = opposite(this.lastHitter);
    const result = s.players.map((p) => ({
      x: (p.id % 2 === 0 ? 1 : -1) * 2.4,
      z: signFor(p.team) * (p.team === incoming ? 6.9 : 3.0),
    }));
    // Preview the actual free trajectory, including glass. Earliest reachable
    // racket-height interception avoids teleporting and supports wall defense.
    const prediction = { ...s.ball };
    let predictionBounces = this.bounces;
    let chosen: { x: number; z: number; player: number } | null = null;
    for (let i = 1; i <= 65; i++) {
      integrateBall(prediction, 0.045);
      if (prediction.y < R) {
        prediction.y = R;
        prediction.vy = Math.abs(prediction.vy) * 0.77;
        prediction.vx *= 0.92;
        prediction.vz *= 0.92;
        predictionBounces++;
      }
      if (Math.abs(prediction.x) > 4.96) {
        prediction.x = Math.sign(prediction.x) * 4.96;
        prediction.vx *= -0.82;
      }
      if (Math.abs(prediction.z) > 9.96) {
        prediction.z = Math.sign(prediction.z) * 9.96;
        prediction.vz *= -0.84;
      }
      if (predictionBounces > 1) break;
      if (
        sideOf(prediction.z) !== incoming ||
        prediction.y > 2.6 ||
        prediction.y < 0.25
      )
        continue;
      if (this.serveLive && predictionBounces === 0) continue;
      const candidates = s.players
        .filter((p) => p.team === incoming)
        .sort((a, b) => distance(a, prediction) - distance(b, prediction));
      const p = candidates[0];
      const runSpeed =
        incoming === 0
          ? 5.6
          : this.options.difficulty === 'facil'
            ? 4.7
            : this.options.difficulty === 'dificil'
              ? 6
              : 5.3;
      if (distance(p, prediction) < i * 0.045 * runSpeed + 0.72) {
        chosen = { x: prediction.x, z: prediction.z, player: p.id };
        break;
      }
    }
    if (!chosen) {
      const target =
        sideOf(s.ball.z) === incoming
          ? {
              x: clamp(s.ball.x + s.ball.vx * 0.13, -4.5, 4.5),
              z: s.ball.z + s.ball.vz * 0.13,
            }
          : s.predictedBounce;
      const pair = s.players
        .filter((p) => p.team === incoming)
        .sort((a, b) => distance(a, target) - distance(b, target));
      chosen = { ...target, player: pair[0].id };
    }
    const targetSign = signFor(incoming);
    chosen.z = targetSign * clamp(Math.abs(chosen.z), 0.7, 9.4);
    chosen.x = clamp(chosen.x, -4.5, 4.5);
    result[chosen.player] = chosen;
    const partnerId = incoming === 0 ? 1 - chosen.player : 5 - chosen.player;
    result[partnerId] = {
      x: chosen.x > 0 ? -2.35 : 2.35,
      z: targetSign * clamp(Math.abs(chosen.z) + 0.6, 2.8, 8),
    };
    return result;
  }
}
