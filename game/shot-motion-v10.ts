/**
 * Víbora landmarks observed in https://www.youtube.com/shorts/wzJP9SfqjEQ.
 * These are an interpreted animation, not motion capture or a ball trajectory.
 * Arm landmarks use the existing rig.upper coordinates; +Z is behind the body.
 * Root landmarks use the unscaled rig.root coordinates. All angles are radians.
 */
export type MotionVector = [number, number, number];

const unit = (value: number) =>
  Math.max(0, Math.min(1, Number.isFinite(value) ? value : 0));
const ease = (value: number) => {
  const t = unit(value);
  return t * t * (3 - 2 * t);
};
const mix = (a: number, b: number, t: number) => a + (b - a) * t;
const vector = (
  x: number,
  y: number,
  z: number,
  hand: number,
): MotionVector => [x * hand, y, z];

/**
 * Load the dominant elbow beside the shoulder and the racket beside the head.
 * anticipation is the final 100–140ms BEFORE contact, when the free arm opens.
 * Do not drive anticipation from elapsed time since the ball has been struck.
 */
export function viboraPreparation(
  preparation: number,
  handedness = 1,
  anticipation = 0,
) {
  const hand = handedness < 0 ? -1 : 1;
  const load = ease(preparation);
  const open = ease(anticipation) * load;
  return {
    bodyYaw: hand * (-0.76 * load + open * 0.2),
    chestYaw: hand * (-0.6 * load + open * 0.14),
    bodyPitch: 0.065 * load,
    bodyRoll: hand * -0.035 * load,
    headPitch: -0.075 * load,
    kneeLoad: 0.07 * load,
    dominantElbow: vector(0.53, mix(0.56, 0.77, load), 0.19, hand),
    dominantWrist: vector(
      0.4,
      mix(0.72, 0.97, load),
      0.22 + open * 0.085,
      hand,
    ),
    freeElbow: vector(
      -0.3 - open * 0.19,
      mix(0.66, 1.0, load) - open * 0.32,
      -0.12,
      hand,
    ),
    freeWrist: vector(
      -0.32 - open * 0.35,
      mix(0.88, 1.27, load) - open * 0.68,
      -0.19,
      hand,
    ),
    // Tall at setup, then briefly laid back ACROSS the nape by wrist lag.
    // This is not the deep, vertically downward racket-drop of a smash.
    racketUp: vector(
      mix(0.19, -0.78, open),
      mix(0.96, 0.24, open),
      mix(0.2, 0.53, open),
      hand,
    ),
  };
}

/**
 * Contact stays owned by anchorRacket(worldPhysicsContact). Only its later
 * target blends toward finishRoot; at age=0 the blend is exactly zero.
 * The opposite shoulder receives the finish, above a low forehand finish.
 */
export function viboraFollowThrough(ageSeconds: number, handedness = 1) {
  const hand = handedness < 0 ? -1 : 1;
  const age = Number.isFinite(ageSeconds) ? Math.max(0, ageSeconds) : 0;
  const turn = ease(age / 0.24);
  const recovery = 1 - ease((age - 0.4) / 0.18);
  const crossing = ease((age - 0.025) / 0.245);
  const pivot = Math.sin(unit(age / 0.42) * Math.PI);
  return {
    weight: recovery,
    bodyYaw: hand * mix(-0.31, 0.5, turn) * recovery,
    chestYaw: hand * mix(-0.24, 0.58, turn) * recovery,
    bodyPitch: mix(0.035, -0.075, turn) * recovery,
    bodyRoll: hand * 0.035 * pivot * recovery,
    headPitch: mix(-0.02, 0.04, turn) * recovery,
    freeElbow: vector(-0.47, mix(0.68, 0.49, turn), -0.12, hand),
    freeWrist: vector(
      mix(-0.66, -0.28, turn),
      mix(0.61, 0.35, turn),
      -0.27,
      hand,
    ),
    finishRoot: vector(
      -0.53,
      mix(1.5, 1.15, ease((age - 0.16) / 0.24)),
      -0.3,
      hand,
    ),
    finishBlend: crossing,
    faceLift: 0.11,
    pronation: hand * Math.sin(unit(age / 0.29) * Math.PI) * 0.28,
    // Use as a foot-pivot accent after leg IK, never to move the player state.
    rearHeelLift: 0.055 * pivot * recovery,
    recoveryStep: 0.12 * ease((age - 0.17) / 0.25) * recovery,
  };
}
