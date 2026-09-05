import type { GameState, Shot } from './physics';

export const SHOT_KEYS: Record<Shot, string> = {
  plano: 'J',
  globo: 'K',
  remate: 'L',
  bandeja: 'U',
  vibora: 'I',
  dejada: 'O',
  volea: '7',
  chiquita: '8',
  bajada: '9',
  contrapared: 'H',
};

/** The normal shot and soft touch adapt to the ball, keeping six main keys. */
export function keyboardShot(code: string, state: GameState): Shot | null {
  const player = state.players[state.controlled];
  if (code === 'KeyJ' || code === 'Space') {
    if (state.wallBounces > 0 && state.ball.y > 1.35) return 'bajada';
    if (
      state.phase === 'rally' &&
      state.ballBounce === 0 &&
      Math.abs(player.z) < 5.6
    )
      return 'volea';
    return 'plano';
  }
  if (code === 'KeyO') return Math.abs(player.z) > 5.5 ? 'chiquita' : 'dejada';
  return (
    (
      {
        KeyK: 'globo',
        KeyL: 'remate',
        KeyU: 'bandeja',
        KeyI: 'vibora',
        KeyH: 'contrapared',
      } as Record<string, Shot>
    )[code] ?? null
  );
}

/** Families share preparation and choose the appropriate contact from the ball. */
export function familyShot(
  intent: import('./control-mapping').ComboIntent,
  state: GameState,
): Shot {
  const player = state.players[state.controlled];
  if (intent === 'lob') return 'globo';
  if (intent === 'touch')
    return Math.abs(player.z) > 5.5 ? 'chiquita' : 'dejada';
  if (intent === 'together') return state.ball.y > 1.6 ? 'vibora' : 'volea';
  if (intent === 'control') {
    if (state.wallBounces > 0 && state.ball.y > 1.35) return 'bajada';
    if (state.ball.y > 1.6) return 'bandeja';
    return state.ballBounce === 0 && Math.abs(player.z) < 5.6
      ? 'volea'
      : 'chiquita';
  }
  return keyboardShot('KeyJ', state) ?? 'plano';
}
