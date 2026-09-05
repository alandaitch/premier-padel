import test from 'node:test';
import assert from 'node:assert/strict';
import {
  PadelMatch,
  ScoreKeeper,
  integrateBall,
  solveTrajectory,
  type Input,
  type Team,
  type Player,
  type Shot,
  type Smash,
  type Ball,
  BALL_PHYSICS,
  collideBall,
  kineticEnergy,
  COURT,
  type TimingQuality,
  type ExteriorReturn,
} from './physics';
const idle: Input = {
  moveX: 0,
  moveZ: 0,
  hit: false,
  shot: 'plano',
  power: 0.6,
  aim: 0,
};
const step = (match: PadelMatch, seconds: number, input = idle) => {
  for (let i = 0; i < seconds * 120; i++) match.update(1 / 120, input);
};
const winGame = (score: ScoreKeeper, team: Team) => {
  for (let i = 0; i < 4; i++) score.award(team);
};
// Controlled rule scenarios inspect the same collision path used by real play.
interface Harness {
  collisions(oldZ: number): void;
  hit(
    p: Player,
    shot: Shot,
    power: number,
    aim: number,
    smash?: Smash,
    quality?: TimingQuality,
    exteriorReturn?: ExteriorReturn,
  ): void;
  finishPoint(winner: Team, reason: string, isWinner: boolean): void;
  movePlayer(p: Player, x: number, z: number, speed: number, dt: number): void;
  routePlayer(
    p: Player,
    target: { x: number; z: number },
  ): { waypoint: { x: number; z: number }; length: number };
  canContact(p: Player, shot: Shot): boolean;
  getTargets(): Array<{ x: number; z: number }>;
  wantsAIContact(p: Player): boolean;
  requestedWall: boolean;
  plannedWalls: number;
  teamDepth: [number, number];
  lastHitter: Team;
  bounced: boolean;
  bounces: number;
  serveLive: boolean;
  serveSign: number;
  contactTime: number;
}
const internal = (m: PadelMatch) => m as unknown as Harness;

const v6Profiles = [
  { height: 1.79, handedness: 'right' as const, playingSide: 'left' as const },
  { height: 1.9, handedness: 'left' as const, playingSide: 'right' as const },
  { height: 1.86, handedness: 'right' as const, playingSide: 'left' as const },
  { height: 1.7, handedness: 'right' as const, playingSide: 'right' as const },
];

void test('powerful natural por3 can land far beyond the old retrieval rectangle', () => {
  const match = new PadelMatch({
    training: true,
    drill: 'remate',
    difficulty: 'dificil',
    playerProfiles: v6Profiles,
  });
  const s = match.getState();
  let fired = false,
    exited = false,
    retrieved = false;
  for (let i = 0; i < 1200 && s.phase !== 'point'; i++) {
    const hit = !fired && s.canHit;
    if (hit) fired = true;
    match.update(1 / 120, {
      ...idle,
      shot: 'remate',
      smash: 'por3',
      aim: -0.9,
      power: 1,
      hit,
      perfect: true,
    });
    exited ||= s.ballOutside;
    retrieved ||=
      !!s.contactPoint &&
      s.contactPoint.playerId >= 2 &&
      Math.abs(s.contactPoint.x) > 5;
  }
  assert.equal(exited, true);
  assert.equal(retrieved, false);
  assert.equal(s.pointWinner, 0);
  assert.ok(Math.abs(s.ball.x) > 10 && Math.abs(s.ball.z) > 10);
  assert.match(s.message, /Segundo pique exterior/);
});

void test('natural rally recovers outside through the door, hits opponent net face, then wins on second bounce', () => {
  const match = new PadelMatch({
    training: true,
    drill: 'remate',
    difficulty: 'dificil',
    playerProfiles: v6Profiles,
  });
  const s = match.getState();
  let fired = false,
    door = false,
    net = false,
    first = false;
  for (let i = 0; i < 1600 && s.phase !== 'point'; i++) {
    const hit = !fired && s.canHit;
    if (hit) fired = true;
    match.update(1 / 120, {
      ...idle,
      shot: 'remate',
      smash: 'por3',
      aim: 0.9,
      power: 0.82,
      hit,
    });
    if (s.exteriorReturnMode === 'red' && s.eventType === 'outside-return')
      door = true;
    if (door && !net && s.eventType === 'net') {
      net = true;
      assert.equal(s.pointWinner, null);
    }
    if (net && !first && s.ballBounce === 1) {
      first = true;
      assert.ok(s.ball.z > 0);
      assert.equal(s.phase, 'rally');
    }
  }
  assert.ok(door && net && first);
  assert.equal(s.pointWinner, 1);
});

void test('door return can exit opposite door with a legal bounce, but without it loses', () => {
  for (const side of [-1, 1])
    for (const high of [false, true]) {
      const match = new PadelMatch(),
        s = match.getState(),
        h = internal(match),
        p = s.players[2];
      s.phase = 'rally';
      s.ballOutside = true;
      h.bounced = true;
      h.bounces = 1;
      // A high, flatter strike farther from the gate can cross the whole court airborne.
      // This is a controlled contact fixture, not a claim that AI always finds it.
      const contactX = high ? 8 : 6.2;
      Object.assign(p, { x: side * (contactX - 0.1), z: 0.65, outside: true });
      Object.assign(s.ball, { x: side * contactX, y: high ? 2 : 1.7, z: 0.65 });
      h.hit(p, 'plano', high ? 1 : 0.9, 0, 'retorno', 'good', 'puerta');
      flyWithoutPlayers(match, () => !s.ballOutside);
      assert.equal(s.phase, 'rally');
      flyWithoutPlayers(match, () => s.ballOutside);
      assert.ok(s.ball.x * side < -5);
      assert.equal(s.ballBounce, high ? 0 : 1);
      assert.equal(s.pointWinner, null);
      flyWithoutPlayers(match);
      assert.equal(s.pointWinner, high ? 0 : 1);
    }
});

void test('a reachable parallel alto smash rises above four metres after the bounce without returning', () => {
  const match = new PadelMatch({
    playerProfiles: [{ height: 1.9, handedness: 'right', playingSide: 'left' }],
  });
  const s = match.getState(),
    h = internal(match),
    p = s.players[0];
  s.phase = 'rally';
  h.lastHitter = 1;
  Object.assign(p, { x: 2, z: 1.5 });
  Object.assign(s.ball, { x: 2, y: 2.3, z: 1.3, vx: 0, vy: -1, vz: 0 });
  assert.equal(h.canContact(p, 'remate'), true);
  h.hit(p, 'remate', 1, 0, 'alto', 'perfect');
  assert.equal(s.contactPoint?.shot, 'remate');
  assert.equal(s.contactPoint?.quality, 'perfect');
  assert.equal(s.smashMode, 'alto');
  flyWithoutPlayers(match, () => s.ballBounce === 1);
  assert.equal(s.ballBounce, 1);
  assert.ok(
    s.ball.z < 0 && Math.abs(s.ball.x - 2) < 0.001,
    'parallel first bounce is legal in opponent court',
  );
  let peak = s.ball.y;
  let returned = false;
  // Passive flight harness isolates the real bounce; it does not promise an AI winner.
  flyWithoutPlayers(match, () => {
    peak = Math.max(peak, s.ball.y);
    returned ||= s.returnedToHitter;
    return false;
  });
  peak = Math.max(peak, s.ball.y);
  assert.ok(peak > 4, `post-bounce peak reached ${peak.toFixed(3)} m`);
  assert.equal(returned, false);
  assert.ok(
    Math.abs(s.ball.x - 2) < 0.001 && s.ball.z < -10,
    'ball leaves parallel above the far end wall',
  );
  assert.equal(s.pointWinner, 0);
  assert.match(s.message, /Remate por 4/);
});

void test('door accuracy matters and the net on the receiving side never awards before ground bounces', () => {
  for (const side of [-1, 1])
    for (const mode of ['puerta', 'red'] as const) {
      const match = new PadelMatch(),
        s = match.getState(),
        h = internal(match),
        p = s.players[2];
      s.phase = 'rally';
      s.ballOutside = true;
      h.bounced = true;
      h.bounces = 1;
      Object.assign(p, { x: side * 6.1, z: 1.8, outside: true });
      Object.assign(s.ball, { x: side * 6.2, y: 1.7, z: 1.8 });
      h.hit(
        p,
        'plano',
        0.9,
        mode === 'puerta' ? 0.85 : 0,
        'retorno',
        'good',
        mode,
      );
      if (mode === 'red') {
        flyWithoutPlayers(match, () => s.eventType === 'net');
        assert.equal(s.pointWinner, null);
        assert.equal(s.ballBounce, 0);
        assert.ok(s.ball.z > 0);
        flyWithoutPlayers(match, () => s.ballBounce === 1);
        assert.equal(s.pointWinner, null);
        assert.ok(s.ball.z > 0);
        flyWithoutPlayers(match);
        assert.equal(s.pointWinner, 1);
      } else {
        flyWithoutPlayers(match);
        assert.equal(s.pointWinner, 0);
        assert.match(s.message, /exterior del cerramiento/);
      }
    }
});

void test('odd games change ends once, first game has no bench rest, sets have their own break', () => {
  const match = new PadelMatch({ gamesToWin: 6, setsToWin: 2 }),
    h = internal(match),
    s = match.getState();
  for (let game = 1; game <= 6; game++) {
    for (let point = 0; point < 4; point++) {
      h.finishPoint(0, 'Fixture de puntuación', true);
      if (point < 3) match.nextPoint();
    }
    assert.equal(s.lastPoint?.gameNumber, game);
    assert.equal(s.lastPoint?.changeEnds, game % 2 === 1);
    assert.equal(
      s.lastPoint?.rest,
      game === 6 ? 'set' : game > 1 && game % 2 === 1 ? 'changeover' : 'none',
    );
    const before = s.endsSwapped;
    match.nextPoint();
    assert.equal(s.endsSwapped, game % 2 === 1 ? !before : before);
    match.nextPoint();
    assert.equal(s.endsSwapped, game % 2 === 1 ? !before : before);
  }
  assert.equal(s.score.sets[0], 1);
});

void test('tie-break changes ends every six points without sitting', () => {
  const match = new PadelMatch(),
    h = internal(match),
    s = match.getState();
  s.score.tieBreak = true;
  s.score.points = [3, 2];
  h.finishPoint(1, 'Fixture tie-break', true);
  assert.equal(s.lastPoint?.changeEnds, true);
  assert.equal(s.lastPoint?.rest, 'none');
  match.nextPoint();
  assert.equal(s.endsSwapped, true);
});

void test('assisted launch reaches target under quadratic drag', () => {
  const ball = solveTrajectory({ x: 2, y: 1.2, z: 5 }, { x: -2, z: -6 }, 1.6);
  const initial = { ...ball };
  for (let i = 0; i < 192; i++) integrateBall(ball, 1 / 120);
  assert.ok(Math.abs(ball.y - 0.033) < 0.0001);
  assert.ok(Math.abs(ball.x + 2) < 0.001);
  assert.ok(
    Math.abs(ball.z + 6) < 0.001,
    'aim compensates the measured-order air drag',
  );
  assert.ok(initial.vy > 0);
});

void test('deuce needs two consecutive points; advantage labels reset', () => {
  const keeper = new ScoreKeeper();
  for (let i = 0; i < 3; i++) {
    keeper.award(0);
    keeper.award(1);
  }
  assert.deepEqual(keeper.score.pointLabels, ['40', '40']);
  keeper.award(0);
  assert.deepEqual(keeper.score.pointLabels, ['AD', '40']);
  keeper.award(1);
  assert.deepEqual(keeper.score.pointLabels, ['40', '40']);
  keeper.award(1);
  const result = keeper.award(1);
  assert.equal(result.game, true);
  assert.deepEqual(keeper.score.games, [0, 1]);
  assert.deepEqual(keeper.score.pointLabels, ['0', '0']);
});

void test('six-all tie-break needs seven points and two-point lead', () => {
  const keeper = new ScoreKeeper(6, 1);
  for (let i = 0; i < 6; i++) {
    winGame(keeper, 0);
    winGame(keeper, 1);
  }
  assert.equal(keeper.score.tieBreak, true);
  for (let i = 0; i < 6; i++) {
    keeper.award(0);
    keeper.award(1);
  }
  keeper.award(0);
  assert.equal(keeper.winner, null);
  keeper.award(1);
  keeper.award(1);
  assert.equal(keeper.winner, null);
  assert.equal(keeper.award(1).match, true);
  assert.equal(keeper.winner, 1);
  assert.deepEqual(keeper.score.history, [[6, 7]]);
});

void test('match needs configured number of sets', () => {
  const keeper = new ScoreKeeper(2, 2);
  for (let i = 0; i < 2; i++) winGame(keeper, 0);
  assert.equal(keeper.winner, null);
  for (let i = 0; i < 2; i++) winGame(keeper, 0);
  assert.equal(keeper.winner, 0);
  assert.deepEqual(keeper.score.sets, [2, 0]);
});

void test('serve visibly bounces then launches below waist diagonally', () => {
  const match = new PadelMatch();
  step(match, 0.01, { ...idle, hit: true });
  step(match, 0.38);
  assert.ok(match.getState().ball.y < 0.2);
  step(match, 0.34);
  const state = match.getState();
  assert.equal(state.phase, 'rally');
  assert.ok(state.ball.y < 0.9);
  assert.ok(state.ball.vx < 0 && state.ball.vz < 0);
  assert.ok(state.predictedBounce.x < 0 && state.predictedBounce.z > -6.95);
});

void test('glass is live after legal bounce; glass before bounce loses point', () => {
  const match = new PadelMatch();
  const s = match.getState(),
    h = internal(match);
  s.phase = 'rally';
  Object.assign(s.ball, { x: 5, y: 1.3, z: -7, vx: 5, vy: 1, vz: -1 });
  h.bounced = true;
  h.bounces = 1;
  h.collisions(-7);
  assert.equal(s.phase, 'rally');
  assert.ok(s.ball.vx < 0);
  assert.equal(s.eventType, 'glass');
  h.bounced = false;
  Object.assign(s.ball, { x: 5, y: 1.3, z: -7, vx: 5 });
  h.collisions(-7);
  assert.equal(s.phase, 'point');
  assert.equal(s.pointWinner, 1);
});

void test('second ground bounce awards hitter the point', () => {
  const match = new PadelMatch();
  const s = match.getState(),
    h = internal(match);
  s.phase = 'rally';
  Object.assign(s.ball, { x: 1, y: 0.02, z: -4, vx: 1, vy: -3, vz: -1 });
  h.collisions(-4);
  assert.equal(s.ballBounce, 1);
  assert.equal(s.phase, 'rally');
  Object.assign(s.ball, { y: 0.02, vy: -1 });
  h.collisions(-4);
  assert.equal(s.phase, 'point');
  assert.equal(s.pointWinner, 0);
});

void test('wrong service box causes second serve, then double fault', () => {
  const match = new PadelMatch();
  const s = match.getState(),
    h = internal(match);
  for (let attempt = 0; attempt < 2; attempt++) {
    s.phase = 'rally';
    h.serveLive = true;
    h.bounced = false;
    h.serveSign = 1;
    Object.assign(s.ball, { x: 2, y: 0.02, z: -4, vx: 1, vy: -3, vz: -1 });
    h.collisions(-4);
    if (attempt === 0)
      assert.ok(
        Math.abs(s.players[s.server].z) > 6.95,
        'second serve resets server behind service line',
      );
  }
  assert.equal(s.pointWinner, 1);
  assert.match(s.message, /Doble falta/);
});

void test('six shots have distinct launch or bounce properties', () => {
  const shots: Shot[] = [
    'plano',
    'globo',
    'bandeja',
    'vibora',
    'remate',
    'dejada',
  ];
  const trajectories = shots.map((shot) => {
    const match = new PadelMatch();
    const s = match.getState();
    s.phase = 'rally';
    Object.assign(s.ball, { x: 0.4, y: 2.4, z: 2.6 });
    internal(match).hit(s.players[0], shot, 0.9, 0.75);
    assert.equal(s.lastShot, shot);
    return {
      shot,
      speed: Math.hypot(s.ball.vx, s.ball.vy, s.ball.vz),
      vy: s.ball.vy,
      target: s.predictedBounce,
    };
  });
  assert.ok(trajectories[1].vy > trajectories[0].vy + 4);
  assert.ok(trajectories[4].speed > trajectories[0].speed);
  assert.ok(Math.abs(trajectories[5].target.z) < 2);
  assert.equal(new Set(trajectories.map((t) => t.speed.toFixed(3))).size, 6);
});

void test('training feeds resume automatically without changing competitive score', () => {
  const match = new PadelMatch({ training: true });
  assert.equal(match.getState().server, 2);
  step(match, 1.9);
  assert.equal(match.getState().phase, 'rally');
  assert.deepEqual(match.getState().score.points, [0, 0]);
});

void test('AI exhibition plays rallies and reaches match point and completion', () => {
  const match = new PadelMatch({ autoPlay: true, gamesToWin: 1, setsToWin: 1 });
  let maxRally = 0;
  const shots = new Set<Shot>();
  let glasses = 0,
    lastEvent = -1;
  for (
    let i = 0;
    i < 120 * 1200 && match.getState().phase !== 'finished';
    i++
  ) {
    match.update(1 / 120, idle);
    maxRally = Math.max(maxRally, match.getState().rally);
    const state = match.getState();
    if (state.contactPoint) shots.add(state.contactPoint.shot);
    if (state.eventId !== lastEvent && state.eventType === 'glass') glasses++;
    lastEvent = state.eventId;
    for (const value of Object.values(match.getState().ball))
      assert.ok(Number.isFinite(value));
  }
  assert.ok(maxRally >= 4, `longest rally was ${maxRally}`);
  assert.equal(match.getState().phase, 'finished');
  assert.notEqual(match.getState().winner, null);
  assert.ok(shots.has('remate'), 'AI must attack a reachable short lob');
  assert.ok(shots.has('bandeja') || shots.has('vibora'));
  assert.ok(glasses > 0, 'aerial interceptions preserve glass defence');
  assert.ok(match.getState().stats.totalPoints >= 8);
});

void test('high diagonal smash exits over three-metre side wall after a legal bounce', () => {
  const match = new PadelMatch();
  const s = match.getState(),
    h = internal(match);
  s.phase = 'rally';
  Object.assign(s.ball, { x: 0, y: 2.5, z: 1.2 });
  h.hit(s.players[0], 'remate', 1, 0.95, 'por3');
  for (let i = 0; i < 1000 && s.phase === 'rally' && !s.ballOutside; i++) {
    const oldZ = s.ball.z;
    integrateBall(s.ball, 1 / 120);
    h.collisions(oldZ);
  }
  assert.equal(s.ballOutside, true);
  assert.equal(s.phase, 'rally');
  assert.equal(s.pointWinner, null);
  flyWithoutPlayers(match);
  assert.equal(s.pointWinner, 0);
  assert.match(s.message, /Segundo pique exterior/);
});

void test('Star Point allows two advantages, then one deciding point at third deuce', () => {
  for (const winner of [0, 1] as Team[]) {
    const keeper = new ScoreKeeper(6, 2, 'star');
    for (let i = 0; i < 3; i++) {
      keeper.award(0);
      keeper.award(1);
    }
    assert.equal(keeper.score.starPoint, false);
    keeper.award(0); // First advantage.
    assert.deepEqual(keeper.score.pointLabels, ['AD', '40']);
    keeper.award(1); // Second deuce.
    assert.equal(keeper.score.starPoint, false);
    keeper.award(1); // Second advantage may belong to either pair.
    assert.deepEqual(keeper.score.pointLabels, ['40', 'AD']);
    keeper.award(0); // Third deuce activates the deciding point.
    assert.deepEqual(keeper.score.points, [5, 5]);
    assert.equal(keeper.score.starPoint, true);
    assert.equal(keeper.award(winner).game, true);
    assert.equal(keeper.score.games[winner], 1);
    assert.equal(keeper.score.starPoint, false);
    assert.deepEqual(keeper.score.points, [0, 0]);
  }
});

void test('conventional advantage still permits further deuces', () => {
  const keeper = new ScoreKeeper(6, 2, 'ventaja');
  for (let i = 0; i < 5; i++) {
    keeper.award(0);
    keeper.award(1);
  }
  assert.equal(keeper.score.starPoint, false);
  assert.equal(keeper.award(0).game, false);
  assert.deepEqual(keeper.score.pointLabels, ['AD', '40']);
});

void test('Star Point does not apply to tie-breaks', () => {
  const keeper = new ScoreKeeper(6, 1, 'star');
  for (let i = 0; i < 6; i++) {
    winGame(keeper, 0);
    winGame(keeper, 1);
  }
  for (let i = 0; i < 6; i++) {
    keeper.award(0);
    keeper.award(1);
  }
  assert.equal(keeper.score.starPoint, false);
  assert.equal(keeper.award(0).game, false);
  assert.equal(keeper.award(0).match, true);
});

void test('PadelMatch uses Star Point by default and supports advantage override', () => {
  for (const mode of ['star', 'ventaja'] as const) {
    const match = new PadelMatch(mode === 'star' ? {} : { scoring: mode });
    const s = match.getState(),
      h = internal(match);
    for (let i = 0; i < 5; i++) {
      for (const team of [0, 1] as Team[]) {
        s.phase = 'rally';
        h.lastHitter = team;
        h.bounced = true;
        h.bounces = 1;
        Object.assign(s.ball, {
          x: 0,
          y: 0.02,
          z: team === 0 ? -5 : 5,
          vx: 0,
          vy: -1,
          vz: 0,
        });
        h.collisions(s.ball.z);
        match.nextPoint();
      }
    }
    assert.equal(s.score.starPoint, mode === 'star');
    if (mode === 'star') assert.match(s.message, /Star Point/);
  }
});

function flyWithoutPlayers(
  match: PadelMatch,
  stop: () => boolean = () => false,
  seconds = 5,
) {
  const s = match.getState(),
    h = internal(match);
  for (let i = 0; i < seconds * 120 && s.phase === 'rally' && !stop(); i++) {
    s.time += 1 / 120;
    const oldZ = s.ball.z;
    integrateBall(s.ball, 1 / 120);
    h.collisions(oldZ);
  }
}

void test('a powerful smash bounces, hits back glass and crosses back without ending point', () => {
  const match = new PadelMatch(),
    s = match.getState(),
    h = internal(match);
  s.phase = 'rally';
  Object.assign(s.ball, { x: 0, y: 2.65, z: 2.2 });
  h.hit(s.players[0], 'remate', 1, 0.1, 'retorno');
  flyWithoutPlayers(match, () => s.returnedToHitter);
  assert.equal(s.ballBounce, 1);
  assert.equal(s.wallBounces, 1);
  assert.ok(s.ball.z > 0 && s.ball.y > 0.94);
  assert.equal(s.phase, 'rally');
  assert.equal(s.pointWinner, null);
  assert.equal(
    s.incomingTeam,
    1,
    'receiving team remains opponent even after crossing back',
  );
  assert.equal(s.ballSituation, 'retorno');
});

void test('only receiving pair can reach across net after natural smash return', () => {
  const match = new PadelMatch(),
    s = match.getState(),
    h = internal(match);
  s.phase = 'rally';
  Object.assign(s.ball, { x: 0, y: 2.65, z: 2.2 });
  // A medium smash returns within a volley's reach; a full-power smash
  // can cross several metres overhead under the same passive ball model.
  h.hit(s.players[0], 'remate', 0.35, 0.1, 'retorno');
  flyWithoutPlayers(match, () => s.returnedToHitter);
  Object.assign(s.players[2], { x: s.ball.x, z: -0.42 });
  Object.assign(s.players[0], { x: s.ball.x, z: 0.42 });
  Object.assign(s.players[1], { x: s.ball.x, z: 0.42 });
  assert.equal(h.canContact(s.players[2], 'volea'), true);
  assert.equal(h.canContact(s.players[0], 'volea'), false);
  assert.equal(
    h.canContact(s.players[1], 'volea'),
    false,
    'striker teammate cannot touch either',
  );
  h.hit(s.players[2], 'volea', 0.55, 0.3);
  assert.equal(s.lastHitterId, 2);
  assert.equal(s.lastShot, 'volea');
  assert.ok(s.players[2].z < 0, 'feet stay in receiver court');
  flyWithoutPlayers(match, () => s.ballBounce === 1);
  assert.equal(s.phase, 'rally');
  assert.equal(s.ballBounce, 1);
  assert.ok(
    s.ball.z > 0,
    'receiver can place return directly into striker court',
  );
});

void test('unreturned smash wins only on second floor bounce after coming back', () => {
  const match = new PadelMatch(),
    s = match.getState(),
    h = internal(match);
  s.phase = 'rally';
  Object.assign(s.ball, { x: 0, y: 2.65, z: 2.2 });
  h.hit(s.players[0], 'remate', 1, 0, 'retorno');
  flyWithoutPlayers(match, () => s.returnedToHitter);
  assert.equal(s.phase, 'rally');
  flyWithoutPlayers(match);
  assert.equal(s.pointWinner, 0);
  assert.match(s.message, /Segundo pique/);
});

void test('wall and double-wall drills preserve one floor bounce and a human return window', () => {
  for (const drill of ['pared', 'doble-pared'] as const) {
    const match = new PadelMatch({ training: true, drill }),
      s = match.getState();
    const expectedWalls = drill === 'pared' ? 1 : 2;
    let sawWall = false,
      playableWindow = false;
    for (let i = 0; i < 120 * 5 && s.phase !== 'point'; i++) {
      match.update(1 / 120, { ...idle, shot: 'plano', waitWall: true });
      if (s.wallBounces >= expectedWalls) {
        sawWall = true;
        assert.equal(s.ballBounce, 1, 'glasses do not count as ground bounces');
        if (s.canHit) {
          playableWindow = true;
          match.update(1 / 120, {
            ...idle,
            hit: true,
            shot: 'globo',
            waitWall: true,
          });
          break;
        }
      }
    }
    assert.ok(sawWall, drill);
    assert.ok(playableWindow, drill);
    assert.equal(s.lastHitterId, 0);
    assert.equal(s.lastShot, 'globo');
    assert.equal(s.wallBounces, 0, 'new shot starts a fresh bounce cycle');
  }
});

void test('wait-wall intention prevents an early swing and predicts double-glass exit', () => {
  const match = new PadelMatch({ training: true, drill: 'doble-pared' }),
    s = match.getState(),
    h = internal(match);
  step(match, 1.9, { ...idle, waitWall: true });
  h.requestedWall = true;
  h.getTargets();
  assert.equal(h.plannedWalls, 2);
  assert.equal(s.ballSituation, 'esperando-pared');
  Object.assign(s.players[0], { x: s.ball.x, z: s.ball.z });
  assert.equal(h.canContact(s.players[0], 'plano'), false);
});

void test('all three smash selections work from a naturally intercepted practice lob at button power', () => {
  for (const mode of ['retorno', 'por3', 'por4'] as const) {
    const match = new PadelMatch({ training: true, drill: 'remate' }),
      s = match.getState();
    for (let i = 0; i < 120 * 5 && s.contactPoint?.playerId !== 0; i++) {
      match.update(1 / 120, {
        ...idle,
        shot: 'remate',
        power: 0.68,
        aim: 0.8,
        smash: mode,
        hit: s.canHit,
      });
    }
    assert.equal(s.contactPoint?.playerId, 0);
    assert.equal(s.contactPoint?.shot, 'remate');
    assert.ok(s.contactPoint.y > 2.6 && s.contactPoint.z < 3);
    flyWithoutPlayers(match, () => s.returnedToHitter);
    if (mode === 'retorno') {
      assert.equal(s.returnedToHitter, true);
      assert.equal(s.phase, 'rally');
    } else {
      assert.equal(s.pointWinner, 0);
      assert.match(
        s.message,
        mode === 'por3' ? /Segundo pique exterior/ : /Remate por 4/,
      );
    }
  }
});

void test('contrapared really hits own glass before crossing and landing legally', () => {
  const match = new PadelMatch(),
    s = match.getState(),
    h = internal(match);
  s.phase = 'rally';
  Object.assign(s.ball, { x: 1.1, y: 0.65, z: 8.5 });
  h.hit(s.players[0], 'contrapared', 0.6, 0.3);
  assert.ok(s.ball.vz > 0, 'initial launch is toward own back glass');
  flyWithoutPlayers(match, () => s.lastBounce?.surface === 'vidrio');
  assert.ok(s.ball.vz < 0);
  assert.equal(s.ballBounce, 0);
  assert.equal(s.phase, 'rally');
  flyWithoutPlayers(match, () => s.ballBounce === 1);
  assert.equal(s.ballBounce, 1);
  assert.ok(s.ball.z < 0);
  assert.equal(s.phase, 'rally');
});

void test('bajada requires glass while bandeja and vibora have distinct speed and skid', () => {
  const sample = (shot: Shot, afterWall: boolean) => {
    const match = new PadelMatch(),
      s = match.getState(),
      h = internal(match);
    s.phase = 'rally';
    s.wallBounces = afterWall ? 1 : 0;
    Object.assign(s.ball, { x: 1, y: 2.1, z: 7 });
    h.hit(s.players[0], shot, 0.75, 0.4);
    const speed = Math.hypot(s.ball.vx, s.ball.vy, s.ball.vz);
    flyWithoutPlayers(match, () => s.ballBounce === 1);
    return { shot: s.lastShot, speed, up: s.ball.vy };
  };
  assert.equal(sample('bajada', true).shot, 'bajada');
  assert.equal(sample('bajada', false).shot, 'bandeja');
  const bandeja = sample('bandeja', false),
    vibora = sample('vibora', false);
  assert.ok(vibora.speed > bandeja.speed + 2);
  assert.ok(vibora.up < bandeja.up, 'vibora stays lower after bounce');
  const match = new PadelMatch(),
    s = match.getState(),
    h = internal(match);
  s.phase = 'rally';
  Object.assign(s.ball, { x: 0, y: 0.9, z: 6 });
  Object.assign(s.players[2], { x: 0, z: -3.3 });
  h.hit(s.players[0], 'chiquita', 0.65, 0);
  assert.ok(
    Math.abs(s.predictedBounce.z) > 2.5 && Math.abs(s.predictedBounce.z) < 4,
  );
});

void test('deep lob moves the hitting pair forward together and receiving pair turns back', () => {
  const match = new PadelMatch(),
    s = match.getState(),
    h = internal(match);
  s.phase = 'rally';
  Object.assign(s.players[0], { x: 2, z: 7 });
  Object.assign(s.players[1], { x: -2, z: 7 });
  Object.assign(s.players[2], { x: 2, z: -3 });
  Object.assign(s.players[3], { x: -2, z: -3 });
  Object.assign(s.ball, { x: 2, y: 1, z: 7 });
  h.hit(s.players[0], 'globo', 0.75, 0.3);
  const targets = h.getTargets();
  assert.ok(targets[0].z < 7 && targets[1].z < 7);
  assert.ok(Math.abs(targets[0].z - targets[1].z) < 0.1);
  assert.equal(s.teamTactics[0], 'subida en pareja');
  assert.ok(
    targets.some((target, index) => index >= 2 && Math.abs(target.z) > 3.5),
    'receiving pair retreats to meet the lob',
  );
  step(match, 0.4);
  assert.ok(s.players.some((p) => p.team === 1 && p.movementIntent === 'giro'));
});

void test('let waits for outcome: tape plus legal box then mesh is service fault', () => {
  const match = new PadelMatch(),
    s = match.getState(),
    h = internal(match);
  s.phase = 'rally';
  h.serveLive = true;
  h.serveSign = 1;
  Object.assign(s.ball, { x: -1, y: 0.89, z: -0.05, vx: -1, vy: 1, vz: -7 });
  h.collisions(0.05);
  Object.assign(s.ball, { x: -2, y: 0.02, z: -4, vx: -5, vy: -2, vz: -1 });
  h.collisions(-4);
  assert.equal(s.phase, 'rally', 'do not call let at first legal bounce');
  Object.assign(s.ball, { x: -5, y: 0.6, z: -4, vx: -5, vy: 1, vz: -1 });
  h.collisions(-4);
  assert.equal(s.serveAttempt, 2);
  assert.equal(s.eventType, 'fault');
});

void test('receiver contact after tape and a legal bounce repeats serve instead of playing rally', () => {
  const match = new PadelMatch(),
    s = match.getState(),
    h = internal(match);
  s.phase = 'rally';
  h.serveLive = true;
  h.serveSign = 1;
  Object.assign(s.ball, { x: -1, y: 0.89, z: -0.05, vx: -1, vy: 1, vz: -7 });
  h.collisions(0.05);
  Object.assign(s.ball, { x: -2, y: 0.02, z: -4, vx: 0, vy: -2, vz: -1 });
  h.collisions(-4);
  const rally = s.rally;
  h.hit(s.players[2], 'plano', 0.6, 0);
  assert.equal(s.phase, 'serve');
  assert.equal(s.eventType, 'let');
  assert.equal(s.serveAttempt, 1);
  assert.equal(s.rally, rally);
  assert.deepEqual(s.score.points, [0, 0]);
});

void test('new-ball vertical drop meets FIP 1.35–1.45 m band from 2.54 m', () => {
  assert.ok(BALL_PHYSICS.mass >= 0.056 && BALL_PHYSICS.mass <= 0.0594);
  assert.ok(
    BALL_PHYSICS.radius * 2 >= 0.0635 && BALL_PHYSICS.radius * 2 <= 0.0677,
  );
  for (const dt of [1 / 120, 1 / 1000]) {
    const ball: Ball = { x: 0, y: 2.54, z: 0, vx: 0, vy: 0, vz: 0 };
    let bounced = false,
      apex = 0;
    for (let t = 0; t < 2; t += dt) {
      integrateBall(ball, dt);
      if (ball.y <= BALL_PHYSICS.radius && !bounced) {
        ball.y = BALL_PHYSICS.radius;
        collideBall(ball, { x: 0, y: 1, z: 0 }, 'hard');
        bounced = true;
      }
      if (bounced) apex = Math.max(apex, ball.y);
    }
    assert.ok(apex >= 1.35 && apex <= 1.45, `drop at dt=${dt}: ${apex}m`);
  }
});

void test('passive impacts never add total translational plus rotational energy', () => {
  let seed = 17079;
  const random = () => {
    seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0;
    return seed / 4294967296;
  };
  for (const material of ['hard', 'turf', 'glass', 'mesh', 'net'] as const) {
    for (let i = 0; i < 100; i++) {
      const n = {
        x: random() * 2 - 1,
        y: random() * 2 - 1,
        z: random() * 2 - 1,
      };
      const len = Math.hypot(n.x, n.y, n.z);
      n.x /= len;
      n.y /= len;
      n.z /= len;
      const b: Ball = {
        x: 0,
        y: 1,
        z: 0,
        vx: (random() - 0.5) * 35,
        vy: (random() - 0.5) * 35,
        vz: (random() - 0.5) * 35,
        wx: (random() - 0.5) * 900,
        wy: (random() - 0.5) * 900,
        wz: (random() - 0.5) * 900,
      };
      const dot = b.vx * n.x + b.vy * n.y + b.vz * n.z;
      const incoming = 1 + random() * 30;
      b.vx -= (dot + incoming) * n.x;
      b.vy -= (dot + incoming) * n.y;
      b.vz -= (dot + incoming) * n.z;
      const before = kineticEnergy(b);
      const result = collideBall(b, n, material);
      assert.ok(
        kineticEnergy(b) <= before + 1e-10,
        `${material} generated energy`,
      );
      assert.ok(result.energyRatio <= 1 + 1e-12);
      assert.ok(
        b.vx * n.x + b.vy * n.y + b.vz * n.z >= 0,
        'normal velocity must leave surface',
      );
      assert.ok(result.normalSpeedAfter < result.normalSpeedBefore);
    }
  }
});

void test('topspin can release rotational energy into forward pace without adding energy', () => {
  const launch = { x: 0, y: 0.033, z: 0, vx: 0, vy: -8, vz: -12, wy: 0, wz: 0 };
  const top: Ball = { ...launch, wx: -500 },
    slice: Ball = { ...launch, wx: 500 };
  const initial = kineticEnergy(top);
  collideBall(top, { x: 0, y: 1, z: 0 }, 'turf');
  collideBall(slice, { x: 0, y: 1, z: 0 }, 'turf');
  assert.ok(
    Math.abs(top.vz) > 12,
    'overspin accelerates tangential translation',
  );
  assert.ok(Math.abs(slice.vz) < 12, 'underspin loses forward pace');
  assert.ok(Math.abs(top.wx!) < 500);
  assert.ok(kineticEnergy(top) < initial);
  assert.equal(
    top.vy,
    slice.vy,
    'same incident normal velocity has same material restitution',
  );
});

void test('opposite sidespin produces opposite glass deflection through friction', () => {
  const base = { x: 0, y: 1.5, z: -9.967, vx: 0, vy: 0, vz: -18, wx: 0, wz: 0 };
  const a: Ball = { ...base, wy: 300 },
    b: Ball = { ...base, wy: -300 };
  const before = kineticEnergy(a);
  collideBall(a, { x: 0, y: 0, z: 1 }, 'glass');
  collideBall(b, { x: 0, y: 0, z: 1 }, 'glass');
  assert.ok(a.vx * b.vx < 0);
  assert.ok(Math.abs(a.vx) > 1);
  assert.equal(a.vz, b.vz);
  assert.ok(kineticEnergy(a) < before && kineticEnergy(b) < before);
});

void test('quadratic air drag and Magnus curve affect actual trajectories', () => {
  const base = { x: 0, y: 3, z: 0, vx: 0, vy: 2, vz: -25, wy: 0, wz: 0 };
  const top: Ball = { ...base, wx: -250 },
    flat: Ball = { ...base, wx: 0 },
    slice: Ball = { ...base, wx: 250 };
  for (let i = 0; i < 60; i++) {
    integrateBall(top, 1 / 120);
    integrateBall(flat, 1 / 120);
    integrateBall(slice, 1 / 120);
  }
  assert.ok(top.y < flat.y - 0.15);
  assert.ok(slice.y > flat.y + 0.15);
  assert.ok(
    Math.abs(flat.vz) < 22,
    'quadratic drag slows a 25 m/s ball appreciably',
  );
  assert.ok(Math.abs(top.wx!) < 250, 'spin decays in flight');
});

void test('air integration converges across rendering frame rates', () => {
  const start: Ball = {
    x: 1,
    y: 3,
    z: 4,
    vx: 4,
    vy: 5,
    vz: -21,
    wx: -250,
    wy: 80,
    wz: 40,
  };
  const coarse = { ...start },
    fine = { ...start };
  for (let i = 0; i < 60; i++) integrateBall(coarse, 1 / 60);
  for (let i = 0; i < 240; i++) integrateBall(fine, 1 / 240);
  assert.ok(
    Math.hypot(coarse.x - fine.x, coarse.y - fine.y, coarse.z - fine.z) < 0.008,
  );
  assert.ok(
    Math.hypot(coarse.vx - fine.vx, coarse.vy - fine.vy, coarse.vz - fine.vz) <
      0.01,
  );
});

void test('player height limits overhead reach and playing side determines recovery', () => {
  const profiles = [
    { height: 1.79, handedness: 'right', playingSide: 'left' },
    { height: 1.9, handedness: 'left', playingSide: 'right' },
    { height: 1.86, handedness: 'right', playingSide: 'left' },
    { height: 1.7, handedness: 'right', playingSide: 'right' },
  ] as const;
  const match = new PadelMatch({
      playerProfiles: profiles.map((x) => ({ ...x })),
    }),
    s = match.getState(),
    h = internal(match);
  assert.equal(s.players[1].handedness, 'left');
  s.phase = 'rally';
  s.time = 1;
  h.lastHitter = 0;
  Object.assign(s.ball, { x: 0, y: 2.95, z: -3 });
  Object.assign(s.players[2], { x: 0, z: -3 });
  Object.assign(s.players[3], { x: 0, z: -3 });
  assert.equal(h.canContact(s.players[2], 'remate'), true);
  assert.equal(h.canContact(s.players[3], 'remate'), false);
  const targets = h.getTargets();
  assert.ok(
    targets[0].x < 0 && targets[1].x > 0,
    'Tapia recovers to left, Coello to right',
  );
  assert.equal(s.players[0].height, 1.79);
});

void test('chiquita follows the chosen net player feet instead of fixed court depth', () => {
  for (const depth of [2.2, 4.3]) {
    const match = new PadelMatch(),
      s = match.getState(),
      h = internal(match);
    s.phase = 'rally';
    Object.assign(s.ball, { x: 0, y: 0.9, z: 6 });
    Object.assign(s.players[2], { x: 2, z: -depth });
    Object.assign(s.players[3], { x: -2, z: -3 });
    h.hit(s.players[0], 'chiquita', 0.65, 0.55);
    assert.ok(Math.abs(s.predictedBounce.z + (depth - 0.4)) < 0.001);
  }
});

void test('short-player practice preserves a natural reachable smash and live return', () => {
  const match = new PadelMatch({
      training: true,
      drill: 'remate',
      playerProfiles: [
        { height: 1.7, handedness: 'right', playingSide: 'left' },
      ],
    }),
    s = match.getState();
  for (let i = 0; i < 600 && s.contactPoint?.playerId !== 0; i++) {
    match.update(1 / 120, {
      ...idle,
      shot: 'remate',
      power: 0.85,
      smash: 'retorno',
      hit: s.canHit,
    });
  }
  assert.equal(s.contactPoint?.playerId, 0);
  assert.ok(
    s.contactPoint.y < 2.8,
    'short player waits until a reachable contact height',
  );
  flyWithoutPlayers(match, () => s.returnedToHitter);
  assert.equal(s.returnedToHitter, true);
  assert.equal(s.phase, 'rally');
});

void test('smash charge increases real contact speed and full power exceeds 120 km/h', () => {
  const speeds: number[] = [];
  for (const power of [0.35, 0.68, 1]) {
    const match = new PadelMatch({
        training: true,
        drill: 'remate',
        playerProfiles: [
          { height: 1.79, handedness: 'right', playingSide: 'left' },
        ],
      }),
      s = match.getState();
    for (let i = 0; i < 600 && s.contactPoint?.playerId !== 0; i++)
      match.update(1 / 120, {
        ...idle,
        shot: 'remate',
        power,
        aim: 0,
        smash: 'retorno',
        hit: s.canHit,
      });
    assert.equal(s.contactPoint?.playerId, 0);
    speeds.push(Math.hypot(s.ball.vx, s.ball.vy, s.ball.vz) * 3.6);
    flyWithoutPlayers(match, () => s.returnedToHitter);
    assert.equal(s.returnedToHitter, true);
    assert.equal(s.phase, 'rally');
  }
  assert.ok(speeds[1] > speeds[0] + 10);
  assert.ok(speeds[2] > speeds[1] + 10);
  assert.ok(speeds[1] > 100 && speeds[2] > 120, `speeds: ${speeds.join(', ')}`);
});

void test('players leave and re-enter through their doorway but cannot cross walls or opposing court', () => {
  const match = new PadelMatch(),
    s = match.getState(),
    h = internal(match),
    p = s.players[0];
  Object.assign(p, { x: 4.4, z: 3, vx: 0, vz: 0 });
  for (let i = 0; i < 120; i++) h.movePlayer(p, 8, 3, 5.7, 1 / 120);
  assert.ok(p.x <= 5 - COURT.playerRadius + 1e-6);
  assert.ok(
    Math.abs(p.z - 3) < 0.01,
    'wall collision cannot teleport player to gate',
  );
  Object.assign(p, { x: 4.4, z: 0.65, vx: 0, vz: 0 });
  for (let i = 0; i < 100; i++) h.movePlayer(p, 7, 0.65, 5.7, 1 / 120);
  assert.equal(p.outside, true);
  assert.ok(p.x > 5.4);
  for (let i = 0; i < 150; i++) h.movePlayer(p, 12, -3.5, 5.7, 1 / 120);
  assert.ok(p.x <= 5 + COURT.exteriorWidth - COURT.playerRadius + 1e-6);
  assert.ok(p.z < 0, 'outside route may go around the net post');
  Object.assign(p, { x: 5.5, z: -0.65, vx: 0, vz: 0 });
  for (let i = 0; i < 100; i++) h.movePlayer(p, 3, -0.65, 5.7, 1 / 120);
  assert.ok(
    p.x >= 5 + COURT.playerRadius - 1e-6,
    'cannot enter opposing court',
  );
  Object.assign(p, { x: 6, z: 0.65, vx: 0, vz: 0 });
  for (let i = 0; i < 150; i++) h.movePlayer(p, 3, 0.65, 5.7, 1 / 120);
  assert.equal(p.outside, false);
  assert.ok(p.x < 4.5);
});

void test('ball passes the actual opening but strikes mesh above it; net ends at its post', () => {
  for (const y of [1.1, 2.4]) {
    const match = new PadelMatch(),
      s = match.getState(),
      h = internal(match);
    s.phase = 'rally';
    h.bounced = true;
    h.bounces = 1;
    Object.assign(s.ball, { x: 5.02, y, z: -0.65, vx: 7, vy: 0, vz: 0 });
    h.collisions(-0.65);
    assert.equal(s.ballOutside, y < 2.2);
    assert.equal(s.phase, 'rally');
    assert.ok(y < 2.2 ? s.ball.vx > 0 : s.ball.vx < 0);
  }
  const match = new PadelMatch(),
    s = match.getState(),
    h = internal(match);
  s.phase = 'rally';
  s.ballOutside = true;
  h.bounced = true;
  h.bounces = 1;
  Object.assign(s.ball, { x: 6, y: 0.5, z: 0.05, vx: 0, vy: 0, vz: 4 });
  h.collisions(-0.05);
  assert.equal(s.ball.vz, 4);
  assert.equal(s.phase, 'rally');
});

void test('service through gate is live with exterior authorization and a fault without it', () => {
  for (const exteriorPlay of [true, false]) {
    const match = new PadelMatch({ exteriorPlay }),
      s = match.getState(),
      h = internal(match);
    s.phase = 'rally';
    h.serveLive = true;
    h.bounced = true;
    h.bounces = 1;
    Object.assign(s.ball, { x: -5.01, y: 1, z: -0.65, vx: -6, vy: 0, vz: 0 });
    h.collisions(-0.65);
    assert.equal(s.phase, exteriorPlay ? 'rally' : 'serve');
    assert.equal(s.serveAttempt, exteriorPlay ? 1 : 2);
  }
});

void test('a legal exterior return re-enters over the fence and first bounces in opponent court', () => {
  const match = new PadelMatch(),
    s = match.getState(),
    h = internal(match),
    p = s.players[2];
  s.phase = 'rally';
  s.ballOutside = true;
  s.exteriorSide = 1;
  h.bounced = true;
  h.bounces = 1;
  Object.assign(p, { x: 6.1, z: -2, outside: true });
  Object.assign(s.ball, { x: 6.2, y: 1.2, z: -2, vx: 2, vy: -2, vz: 0 });
  assert.equal(h.canContact(p, 'globo'), true);
  h.hit(p, 'globo', 0.7, 0);
  flyWithoutPlayers(match, () => !s.ballOutside);
  assert.equal(s.phase, 'rally');
  assert.equal(s.ballOutside, false);
  flyWithoutPlayers(match, () => s.ballBounce === 1);
  assert.equal(s.phase, 'rally');
  assert.equal(s.ballBounce, 1);
  assert.ok(s.ball.z > 0 && Math.abs(s.ball.x) < 5);
  for (let i = 0; i < 240; i++) {
    const route = h.routePlayer(p, { x: 2, z: -3 });
    h.movePlayer(p, route.waypoint.x, route.waypoint.z, 5.7, 1 / 120);
  }
  assert.equal(p.outside, false, 'retriever returns through own gate');
});

void test('outside floor is not a legal first bounce and side exit is immediate only with exterior disabled', () => {
  const match = new PadelMatch(),
    s = match.getState(),
    h = internal(match);
  s.phase = 'rally';
  s.ballOutside = true;
  Object.assign(s.ball, { x: 6, y: 0.02, z: -2, vx: 0, vy: -2, vz: 0 });
  h.collisions(-2);
  assert.equal(s.pointWinner, 1);
  const closed = new PadelMatch({ exteriorPlay: false }),
    c = closed.getState(),
    ch = internal(closed);
  c.phase = 'rally';
  ch.bounced = true;
  ch.bounces = 1;
  Object.assign(c.ball, { x: 5.02, y: 3.5, z: -3, vx: 7, vy: 0, vz: 0 });
  ch.collisions(-3);
  assert.equal(c.pointWinner, 0);
});

void test('holding charge only prepares and perfect quality appears on a real reachable smash contact', () => {
  const match = new PadelMatch({ training: true, drill: 'remate' }),
    s = match.getState();
  for (let i = 0; i < 260; i++)
    match.update(1 / 120, {
      ...idle,
      shot: 'remate',
      charging: true,
      charge: 0.8,
      perfect: true,
      timingQuality: 'perfect',
    });
  assert.notEqual(s.contactPoint?.playerId, 0);
  assert.equal(s.players[0].charging, true);
  assert.ok(s.players[0].preparation > 0.5);
  for (let i = 0; i < 300 && s.contactPoint?.playerId !== 0; i++)
    match.update(1 / 120, {
      ...idle,
      shot: 'remate',
      power: 1,
      perfect: true,
      timingQuality: 'perfect',
      hit: s.canHit,
    });
  assert.equal(s.contactPoint?.playerId, 0);
  assert.equal(s.contactPoint?.shot, 'remate');
  assert.equal(s.contactPoint?.quality, 'perfect');
  const low = new PadelMatch(),
    ls = low.getState(),
    lh = internal(low);
  ls.phase = 'rally';
  Object.assign(ls.ball, { x: ls.players[0].x, y: 0.8, z: ls.players[0].z });
  lh.hit(ls.players[0], 'remate', 1, 0, 'por3', 'perfect');
  assert.equal(ls.contactPoint?.shot, 'plano');
  assert.equal(ls.contactPoint?.quality, 'good');
});

void test('a placed por3 is recovered through either gate without constraining all powerful smashes', () => {
  const playerProfiles = [
    {
      height: 1.79,
      handedness: 'right' as const,
      playingSide: 'left' as const,
    },
    { height: 1.9, handedness: 'left' as const, playingSide: 'right' as const },
    {
      height: 1.86,
      handedness: 'right' as const,
      playingSide: 'left' as const,
    },
    {
      height: 1.7,
      handedness: 'right' as const,
      playingSide: 'right' as const,
    },
  ];
  for (const aim of [-0.9, 0.9]) {
    const match = new PadelMatch({
        training: true,
        drill: 'remate',
        difficulty: 'dificil',
        playerProfiles,
      }),
      s = match.getState();
    let fired = false,
      exited = false,
      retrieved = false,
      reentered = false,
      playerReturned = false;
    const doorCrossings: number[] = [];
    for (let i = 0; i < 1200 && s.phase !== 'point'; i++) {
      const previous = s.players.map((p) => ({ x: p.x, z: p.z }));
      const hit = !fired && s.canHit;
      if (hit) fired = true;
      match.update(1 / 120, {
        ...idle,
        hit,
        shot: 'remate',
        power: 0.55,
        aim,
        smash: 'por3',
        perfect: false,
        timingQuality: 'good',
      });
      if (s.ballOutside && !exited) {
        exited = true;
        assert.equal(Math.sign(s.ball.x), Math.sign(aim));
        assert.equal(s.phase, 'rally');
        assert.equal(s.pointWinner, null);
      }
      for (const p of s.players.filter((p) => p.team === 1)) {
        if (Math.abs(previous[p.id].x) < 5 && Math.abs(p.x) >= 5) {
          doorCrossings.push(p.id);
          assert.ok(
            p.z < 0 &&
              Math.abs(p.z) > COURT.doorMinZ &&
              Math.abs(p.z) < COURT.doorMaxZ,
            'feet cross own doorway only',
          );
        }
      }
      if (
        s.contactPoint &&
        s.contactPoint.playerId >= 2 &&
        Math.abs(s.contactPoint.x) > 5
      ) {
        retrieved = true;
        assert.ok(doorCrossings.includes(s.contactPoint.playerId));
      }
      if (retrieved && !s.ballOutside) {
        reentered = true;
        assert.equal(s.phase, 'rally');
      }
      if (reentered && doorCrossings.every((id) => !s.players[id].outside)) {
        playerReturned = true;
        break;
      }
    }
    assert.equal(fired, true);
    assert.equal(exited, true);
    assert.equal(retrieved, true);
    assert.equal(reentered, true);
    assert.equal(playerReturned, true);
  }
});

void test('charged smash keeps its released command and quality for the practice timing window', () => {
  const match = new PadelMatch({
      training: true,
      drill: 'remate',
      playerProfiles: [{ height: 1.79, handedness: 'right' }],
    }),
    s = match.getState();
  // Start loading with the feed; release after .86s, before the lob is in reach.
  for (let i = 0; i < 240; i++)
    match.update(1 / 120, {
      ...idle,
      shot: 'remate',
      charging: true,
      charge: 0.82,
    });
  match.update(1 / 120, {
    ...idle,
    shot: 'remate',
    power: 1,
    aim: 0.9,
    smash: 'por3',
    hit: true,
    charge: 0.82,
    perfect: true,
    timingQuality: 'perfect',
  });
  const releaseTime = s.time;
  for (let i = 0; i < 102 && s.contactPoint?.playerId !== 0; i++)
    match.update(1 / 120, { ...idle, shot: 'plano', power: 0.2, aim: -0.9 });
  assert.equal(s.contactPoint?.playerId, 0);
  assert.equal(s.contactPoint?.shot, 'remate');
  assert.equal(s.contactPoint?.quality, 'perfect');
  assert.equal(s.smashMode, 'por3');
  assert.ok(s.contactPoint.time - releaseTime > 0.75);
  assert.ok(s.contactPoint.time - releaseTime < 0.85);
  flyWithoutPlayers(match, () => s.ballOutside);
  assert.equal(s.ballOutside, true);
  assert.ok(s.ball.x > 0, 'queued aim survives later input changes');
});
