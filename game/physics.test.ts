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
  hit(p: Player, shot: Shot, power: number, aim: number, smash?: Smash): void;
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

test('ballistic launch lands on target; gravity is frame-rate independent', () => {
  const ball = solveTrajectory({ x: 2, y: 1.2, z: 5 }, { x: -2, z: -6 }, 1.6);
  const initial = { ...ball };
  for (let i = 0; i < 192; i++) integrateBall(ball, 1 / 120);
  assert.ok(Math.abs(ball.y - 0.033) < 1e-9);
  assert.ok(Math.abs(ball.x + 2) < 0.1);
  assert.ok(Math.abs(ball.z + 6) < 0.25, 'small drag reduces range slightly');
  assert.ok(initial.vy > 0);
});

test('deuce needs two consecutive points; advantage labels reset', () => {
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

test('six-all tie-break needs seven points and two-point lead', () => {
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

test('match needs configured number of sets', () => {
  const keeper = new ScoreKeeper(2, 2);
  for (let i = 0; i < 2; i++) winGame(keeper, 0);
  assert.equal(keeper.winner, null);
  for (let i = 0; i < 2; i++) winGame(keeper, 0);
  assert.equal(keeper.winner, 0);
  assert.deepEqual(keeper.score.sets, [2, 0]);
});

test('serve visibly bounces then launches below waist diagonally', () => {
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

test('glass is live after legal bounce; glass before bounce loses point', () => {
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

test('second ground bounce awards hitter the point', () => {
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

test('wrong service box causes second serve, then double fault', () => {
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

test('six shots have distinct launch or bounce properties', () => {
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

test('training feeds resume automatically without changing competitive score', () => {
  const match = new PadelMatch({ training: true });
  assert.equal(match.getState().server, 2);
  step(match, 1.9);
  assert.equal(match.getState().phase, 'rally');
  assert.deepEqual(match.getState().score.points, [0, 0]);
});

test('AI exhibition plays rallies and reaches match point and completion', () => {
  const match = new PadelMatch({ autoPlay: true, gamesToWin: 1, setsToWin: 1 });
  let maxRally = 0;
  for (
    let i = 0;
    i < 120 * 1200 && match.getState().phase !== 'finished';
    i++
  ) {
    match.update(1 / 120, idle);
    maxRally = Math.max(maxRally, match.getState().rally);
    for (const value of Object.values(match.getState().ball))
      assert.ok(Number.isFinite(value));
  }
  assert.ok(maxRally >= 4, `longest rally was ${maxRally}`);
  assert.equal(match.getState().phase, 'finished');
  assert.notEqual(match.getState().winner, null);
  assert.ok(match.getState().stats.totalPoints >= 8);
});

test('high diagonal smash exits over three-metre side wall after a legal bounce', () => {
  const match = new PadelMatch();
  const s = match.getState(),
    h = internal(match);
  s.phase = 'rally';
  Object.assign(s.ball, { x: 0, y: 2.5, z: 1.2 });
  h.hit(s.players[0], 'remate', 1, 0.95, 'por3');
  for (let i = 0; i < 1000 && s.phase === 'rally'; i++) {
    const oldZ = s.ball.z;
    integrateBall(s.ball, 1 / 120);
    h.collisions(oldZ);
  }
  assert.equal(s.pointWinner, 0);
  assert.match(s.message, /Remate por 3/);
});

test('Star Point allows two advantages, then one deciding point at third deuce', () => {
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

test('conventional advantage still permits further deuces', () => {
  const keeper = new ScoreKeeper(6, 2, 'ventaja');
  for (let i = 0; i < 5; i++) {
    keeper.award(0);
    keeper.award(1);
  }
  assert.equal(keeper.score.starPoint, false);
  assert.equal(keeper.award(0).game, false);
  assert.deepEqual(keeper.score.pointLabels, ['AD', '40']);
});

test('Star Point does not apply to tie-breaks', () => {
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

test('PadelMatch uses Star Point by default and supports advantage override', () => {
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

test('a powerful smash bounces, hits back glass and crosses back without ending point', () => {
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

test('only receiving pair can reach across net after natural smash return', () => {
  const match = new PadelMatch(),
    s = match.getState(),
    h = internal(match);
  s.phase = 'rally';
  Object.assign(s.ball, { x: 0, y: 2.65, z: 2.2 });
  h.hit(s.players[0], 'remate', 1, 0.1, 'retorno');
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

test('unreturned smash wins only on second floor bounce after coming back', () => {
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

test('wall and double-wall drills preserve one floor bounce and a human return window', () => {
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

test('wait-wall intention prevents an early swing and predicts double-glass exit', () => {
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

test('all three smash selections work from a naturally intercepted practice lob at button power', () => {
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
        mode === 'por3' ? /Remate por 3/ : /Remate por 4/,
      );
    }
  }
});

test('contrapared really hits own glass before crossing and landing legally', () => {
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

test('bajada requires glass while bandeja and vibora have distinct speed and skid', () => {
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
  h.hit(s.players[0], 'chiquita', 0.65, 0);
  assert.ok(
    Math.abs(s.predictedBounce.z) > 2.5 && Math.abs(s.predictedBounce.z) < 4,
  );
});

test('deep lob moves the hitting pair forward together and receiving pair turns back', () => {
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
  assert.equal(s.teamTactics[1], 'giro y retroceso');
  step(match, 0.4);
  assert.ok(s.players.some((p) => p.team === 1 && p.movementIntent === 'giro'));
});

test('let waits for outcome: tape plus legal box then mesh is service fault', () => {
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

test('receiver contact after tape and a legal bounce repeats serve instead of playing rally', () => {
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
