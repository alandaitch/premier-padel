/** Input intent is independent of the keyboard layout and controller brand. */
export type ControlScheme = 'simple' | 'clasico';
export type ComboIntent = 'base' | 'control' | 'lob' | 'touch' | 'together';
export type ControlAction =
  | 'up'
  | 'down'
  | 'left'
  | 'right'
  | 'base'
  | 'control'
  | 'smash'
  | 'quick'
  | 'aimLeft'
  | 'aimRight'
  | 'wall'
  | 'switch'
  | 'smashMode'
  | 'exteriorMode'
  | 'pause'
  | 'lob'
  | 'touch'
  | 'bandeja'
  | 'vibora'
  | 'wallshot'
  | 'volley'
  | 'chiquita'
  | 'bajada';
export const ACTION_LABELS: Record<ControlAction, string> = {
  up: 'Avanzar',
  down: 'Retroceder',
  left: 'Mover izquierda',
  right: 'Mover derecha',
  base: 'Golpe base',
  control: 'Control / bandeja',
  smash: 'Cargar remate',
  quick: 'Sacar / golpe directo',
  aimLeft: 'Apuntar izquierda',
  aimRight: 'Apuntar derecha',
  wall: 'Esperar pared',
  switch: 'Cambiar jugador',
  smashMode: 'Tipo de remate',
  exteriorMode: 'Devolución exterior',
  pause: 'Pausa / continuar',
  lob: 'Globo',
  touch: 'Toque corto',
  bandeja: 'Bandeja',
  vibora: 'Víbora',
  wallshot: 'Contrapared',
  volley: 'Volea',
  chiquita: 'Chiquita',
  bajada: 'Bajada',
};
export const SIMPLE_ACTIONS: ControlAction[] = [
  'up',
  'down',
  'left',
  'right',
  'base',
  'control',
  'smash',
  'quick',
  'aimLeft',
  'aimRight',
  'wall',
  'switch',
  'smashMode',
  'exteriorMode',
  'pause',
];
export const CLASSIC_ACTIONS: ControlAction[] = [
  'up',
  'down',
  'left',
  'right',
  'base',
  'lob',
  'smash',
  'bandeja',
  'vibora',
  'touch',
  'wallshot',
  'volley',
  'chiquita',
  'bajada',
  'quick',
  'aimLeft',
  'aimRight',
  'wall',
  'switch',
  'smashMode',
  'exteriorMode',
  'pause',
];
export type ControlBindings = {
  keyboard: Record<ControlAction, string>;
  gamepad: Partial<Record<ControlAction, number>>;
};
export const DEFAULT_BINDINGS: ControlBindings = {
  keyboard: {
    up: 'KeyW',
    down: 'KeyS',
    left: 'KeyA',
    right: 'KeyD',
    base: 'KeyJ',
    control: 'KeyK',
    smash: 'KeyL',
    quick: 'Space',
    aimLeft: 'KeyQ',
    aimRight: 'KeyE',
    wall: 'KeyB',
    switch: 'Tab',
    smashMode: 'KeyR',
    exteriorMode: 'KeyF',
    pause: 'Escape',
    lob: 'KeyK',
    touch: 'KeyO',
    bandeja: 'KeyU',
    vibora: 'KeyI',
    wallshot: 'KeyH',
    volley: 'Digit7',
    chiquita: 'Digit8',
    bajada: 'Digit9',
  },
  gamepad: {
    base: 0,
    control: 1,
    smash: 2,
    quick: 3,
    wall: 4,
    switch: 5,
    smashMode: 6,
    exteriorMode: 7,
    pause: 9,
    up: 12,
    down: 13,
    left: 14,
    right: 15,
    lob: 1,
    touch: 3,
    bandeja: 4,
    vibora: 6,
    wallshot: 7,
  },
};
export const relevantActions = (scheme: ControlScheme) =>
  scheme === 'simple' ? SIMPLE_ACTIONS : CLASSIC_ACTIONS;
export function normalizeBindings(value: unknown): ControlBindings {
  const result: ControlBindings = {
    keyboard: { ...DEFAULT_BINDINGS.keyboard },
    gamepad: { ...DEFAULT_BINDINGS.gamepad },
  };
  if (!value || typeof value !== 'object') return result;
  const saved = value as Partial<ControlBindings>;
  for (const action of Object.keys(ACTION_LABELS) as ControlAction[]) {
    const code = saved.keyboard?.[action];
    if (
      typeof code === 'string' &&
      /^(Key[A-Z]|Digit[0-9]|Arrow(Up|Down|Left|Right)|Space|Tab|Escape|Shift(Left|Right)|Enter|Backspace|Comma|Period|Slash|Semicolon|Quote|Bracket(Left|Right)|Minus|Equal)$/.test(
        code,
      )
    )
      result.keyboard[action] = code;
    const button = saved.gamepad?.[action];
    if (Number.isInteger(button) && button! >= -1 && button! < 32)
      result.gamepad[action] = button;
  }
  return result;
}
export function rebindControl(
  bindings: ControlBindings,
  scheme: ControlScheme,
  device: 'keyboard' | 'gamepad',
  action: ControlAction,
  value: string | number,
) {
  const next = normalizeBindings(bindings);
  const map = next[device] as Record<
    ControlAction,
    string | number | undefined
  >;
  const previous = map[action];
  const conflict = relevantActions(scheme).find(
    (item) => item !== action && map[item] === value,
  );
  if (conflict) {
    if (previous === undefined) {
      if (device === 'gamepad') map[conflict] = -1;
      else delete map[conflict];
    } else map[conflict] = previous;
  }
  map[action] = value;
  return { bindings: next, conflict };
}
export function keyLabel(code: string) {
  return (
    (
      {
        Space: 'ESPACIO',
        Tab: 'TAB',
        Escape: 'ESC',
        ArrowUp: '↑',
        ArrowDown: '↓',
        ArrowLeft: '←',
        ArrowRight: '→',
        ShiftLeft: 'SHIFT',
        ShiftRight: 'SHIFT',
      } as Record<string, string>
    )[code] ?? code.replace(/^Key|^Digit/, '')
  );
}
export function padLabel(button: number | undefined) {
  if (button === undefined || button < 0) return 'Sin asignar';
  return (
    (
      {
        0: 'A / ✕',
        1: 'B / ○',
        2: 'X / □',
        3: 'Y / △',
        4: 'LB / L1',
        5: 'RB / R1',
        6: 'LT / L2',
        7: 'RT / R2',
        8: 'SELECT',
        9: 'START',
        10: 'L3',
        11: 'R3',
        12: '↑',
        13: '↓',
        14: '←',
        15: '→',
      } as Record<number, string>
    )[button] ?? `Botón ${button + 1}`
  );
}
export function axisWithDeadzone(value: number, deadzone: number) {
  const zone = Math.max(0.05, Math.min(0.5, deadzone));
  return Math.abs(value) <= zone
    ? 0
    : Math.sign(value) * Math.min(1, (Math.abs(value) - zone) / (1 - zone));
}
/** Delay only the first family button; the second resolves exactly one stroke. */
export class ShotCombos {
  private pending: { button: 'base' | 'control'; at: number } | null = null;
  private held = new Set<'base' | 'control'>();
  static simultaneousMs = 70;
  static sequenceMs = 220;
  press(button: 'base' | 'control', now: number): ComboIntent[] {
    if (this.held.has(button)) return [];
    const due = this.flush(now);
    const first = this.pending;
    this.held.add(button);
    if (!first) {
      this.pending = { button, at: now };
      return due;
    }
    if (first.button === button) return due;
    this.pending = null;
    if (
      now - first.at <= ShotCombos.simultaneousMs &&
      this.held.has(first.button)
    )
      return [...due, 'together'];
    return [...due, first.button === 'base' ? 'lob' : 'touch'];
  }
  release(button: 'base' | 'control') {
    this.held.delete(button);
  }
  flush(now: number): ComboIntent[] {
    if (!this.pending || now - this.pending.at < ShotCombos.sequenceMs)
      return [];
    const intent = this.pending.button;
    this.pending = null;
    return [intent];
  }
  reset() {
    this.pending = null;
    this.held.clear();
  }
}

/** Preserve unique active keys when switching between layouts with shared defaults. */
export function bindingsForScheme(
  bindings: ControlBindings,
  scheme: ControlScheme,
): ControlBindings {
  const next = normalizeBindings(bindings);
  const used = new Set<string>();
  const fallback = [
    ...'GTVNYZXCMP'.split('').map((letter) => `Key${letter}`),
    ...'1234567890'.split('').map((digit) => `Digit${digit}`),
  ];
  for (const action of relevantActions(scheme)) {
    let code = next.keyboard[action];
    if (used.has(code))
      code = [DEFAULT_BINDINGS.keyboard[action], ...fallback].find(
        (candidate) => !used.has(candidate),
      )!;
    next.keyboard[action] = code;
    used.add(code);
  }
  return next;
}
