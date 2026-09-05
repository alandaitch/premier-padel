import type { MotionVector } from './shot-motion-v10';

/** Original rig interpretation of the user's public Paquito celebration clip. */
export const PAQUITO_GUITAR_SECONDS = 3.6;

const unit = (value: number) =>
  Math.max(0, Math.min(1, Number.isFinite(value) ? value : 0));
const ease = (value: number) => {
  const t = unit(value);
  return t * t * (3 - 2 * t);
};
const mix = (a: number, b: number, t: number) => a + (b - a) * t;

/**
 * The racket remains in his RIGHT hand beside the hip. His LEFT arm mimes an
 * imaginary guitar neck; do not transfer the racket to the free hand.
 * Variant chosen: the right-knee-down celebration at 6.7–7.9s in 3zVCJP2-jCI.
 * bodyHeight and foot landmarks use unscaled rig.root units. The renderer must
 * solve both legs AFTER setting bodyHeight, then apply the arm/racket targets.
 * State, scoring, winner selection and the presentation clock remain external.
 */
export function paquitoGuitarPose(progress: number) {
  const t = unit(progress);
  const enter = ease(t / 0.16);
  const leave = 1 - ease((t - 0.79) / 0.21);
  const active = enter * leave;
  const kneel = ease((t - 0.1) / 0.17) * (1 - ease((t - 0.71) / 0.23));
  const pulseWindow = ease((t - 0.16) / 0.07) * (1 - ease((t - 0.69) / 0.07));
  const strum = Math.sin((t - 0.19) * Math.PI * 2 * 5.3) * pulseWindow;
  const wristY = 0.18 + strum * 0.105;
  return {
    active,
    kneel,
    bodyHeight: mix(0.87, 0.495, kneel),
    bodyPitch: active * (-0.035 + strum * 0.013),
    bodyYaw: active * -0.1,
    chestYaw: active * (0.06 + strum * 0.035),
    headPitch: -0.09 * active,
    headYaw: -0.1 * active,
    mouthOpen: active * (0.7 + pulseWindow * 0.3),
    // At full kneel: left sole is ahead, right foot behind the vertical thigh.
    leftAnkleRoot: [-0.23, 0.088, mix(-0.04, -0.47, kneel)] as MotionVector,
    rightAnkleRoot: [0.22, 0.088, mix(0.04, 0.35, kneel)] as MotionVector,
    dominantElbow: [0.31, 0.37 + strum * 0.07, -0.065] as MotionVector,
    dominantWrist: [0.18, wristY, -0.22] as MotionVector,
    freeElbow: [-0.43, 0.41, -0.14] as MotionVector,
    freeWrist: [-0.68, 0.42, -0.29] as MotionVector,
    // Desired racket axis in rig.upper frame, independent of elbow rotation.
    // Downward face moves past the right thigh, matching the visible reference.
    racketUp: [0.12, -0.985, -0.12] as MotionVector,
    racketNormal: [0.02, 0.08, -0.99] as MotionVector,
    strum,
  };
}
