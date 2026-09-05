'use client';
import { useEffect, useRef, useState } from 'react';
import {
  ArrowUpRight,
  ArrowRight,
  Play,
  Pause,
  Volume2,
  VolumeX,
  Maximize,
  Settings2,
  X,
  Trophy,
  Target,
  ChevronLeft,
  CircleHelp,
  Camera,
  Check,
  RotateCcw,
  Activity,
  Gamepad2,
  Keyboard,
} from 'lucide-react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog';
import { Slider } from '@/components/ui/slider';
import {
  PadelMatch,
  TRAINING_DRILLS,
  type TrainingDrill,
  type TrainingDrillId,
  type GameState,
  type Input,
  type Shot,
} from '@/game/physics';
import { PadelRenderer } from '@/game/renderer';
import { createDemoMatch } from '@/game/demo-match';
import {
  MatchPresentation,
  type PresentationState,
} from '@/game/match-presentation';
import { PadelAudio } from '@/game/audio';
import { PresentationAudioScheduler } from '@/game/presentation-audio';
import { VENUES, SHOTS } from '@/game/catalog';
import { familyShot } from '@/game/controls';
import { VictoryCombo, VICTORY_SEQUENCE } from '@/game/victory-combo';
import {
  ACTION_LABELS,
  DEFAULT_BINDINGS,
  ShotCombos,
  axisWithDeadzone,
  bindingsForScheme,
  keyLabel,
  normalizeBindings,
  padLabel,
  rebindControl,
  relevantActions,
  type ComboIntent,
  type ControlAction,
  type ControlBindings,
  type ControlScheme,
} from '@/game/control-mapping';
import {
  matchAppearances,
  teamAppearances,
  circuitTeams,
  circuitRounds,
  circuitOpponents,
  type Circuit,
} from '@/game/circuit-roster';
import {
  sampleSmashCharge,
  PERFECT_CENTER,
  PERFECT_WIDTH,
  type PerfectDifficulty,
} from '@/game/smash-charge';

type Screen = 'menu' | 'play' | 'pause' | 'help' | 'result';
type Mode = 'partido' | 'circuito' | 'entrenamiento';
type Settings = {
  circuit: Circuit;
  team: number;
  opponent: number;
  venue: number;
  difficulty: 'facil' | 'normal' | 'dificil';
  format: 'rapido' | 'set' | 'partido';
  camera: 'tv' | 'cerca' | 'cenital';
  volume: number;
  perfectDifficulty: PerfectDifficulty;
  controlScheme: ControlScheme;
  bindings: ControlBindings;
  gamepadDeadzone: number;
  vibration: boolean;
};
const DEFAULTS: Settings = {
  circuit: 'masculino',
  team: 0,
  opponent: 1,
  venue: 0,
  difficulty: 'normal',
  format: 'rapido',
  camera: 'tv',
  volume: 0.45,
  perfectDifficulty: 'facil',
  controlScheme: 'simple',
  bindings: normalizeBindings(DEFAULT_BINDINGS),
  gamepadDeadzone: 0.18,
  vibration: true,
};
const BASE_INPUT: Input = {
  moveX: 0,
  moveZ: 0,
  hit: false,
  shot: 'plano',
  power: 0.6,
  aim: 0,
};
function Choice({
  label,
  value,
  items,
  onChange,
}: {
  label: string;
  value: string;
  items: { value: string; label: string }[];
  onChange: (v: string) => void;
}) {
  return (
    <label className="choice">
      <span>{label}</span>
      <Select value={value} onValueChange={(v) => v !== null && onChange(v)}>
        <SelectTrigger aria-label={label}>
          <SelectValue>
            {items.find((i) => i.value === value)?.label}
          </SelectValue>
        </SelectTrigger>
        <SelectContent className="padel-select">
          {items.map((i) => (
            <SelectItem key={i.value} value={i.value}>
              {i.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </label>
  );
}
function GameDialog({
  title,
  onClose,
  children,
}: {
  title: string;
  onClose: () => void;
  children: React.ReactNode;
}) {
  return (
    <Dialog open onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="modal-shell" showCloseButton={false}>
        <DialogTitle className="sr-only">{title}</DialogTitle>
        {children}
      </DialogContent>
    </Dialog>
  );
}
export default function PadelGame() {
  const host = useRef<HTMLDivElement>(null);
  const renderer = useRef<PadelRenderer | null>(null);
  const match = useRef<PadelMatch | null>(null);
  const audio = useRef<PadelAudio | null>(null);
  const keys = useRef(new Set<string>());
  const combos = useRef(new ShotCombos());
  const director = useRef(new MatchPresentation());
  const victoryCombo = useRef(new VictoryCombo());
  const [victoryProgress, setVictoryProgress] = useState(0);
  const scene = useRef<PresentationState | null>(null);
  const training = useRef(false);
  const trainingExercise = useRef<TrainingDrill | undefined>(undefined);
  const roster = useRef<string[]>([]);
  const [presentation, setPresentation] = useState<PresentationState | null>(
    null,
  );
  const padState = useRef({
    x: 0,
    z: 0,
    aim: 0,
    held: new Set<ControlAction>(),
    index: -1,
  });
  const captureBinding = useRef<{
    device: 'keyboard' | 'gamepad';
    action: ControlAction;
  } | null>(null);
  const settingsOpen = useRef(false);
  const [bindingCapture, setBindingCapture] =
    useState<typeof captureBinding.current>(null);
  const [bindingMessage, setBindingMessage] = useState('');
  const [mappingDevice, setMappingDevice] = useState<'keyboard' | 'gamepad'>(
    'keyboard',
  );
  const [padInfo, setPadInfo] = useState({
    connected: false,
    name: '',
    standard: true,
    buttons: '',
  });
  const [activeDevice, setActiveDevice] = useState<'keyboard' | 'gamepad'>(
    'keyboard',
  );
  const [advancedShots, setAdvancedShots] = useState(false);
  const input = useRef<Input>({ ...BASE_INPUT });
  const screenRef = useRef<Screen>('menu');
  const charge = useRef<number | null>(null);
  const chargeKey = useRef<string | null>(null);
  const chargeMeter = useRef<HTMLDivElement>(null);
  const startFromKeyboard = useRef<() => void>(() => {});
  const touch = useRef({ x: 0, z: 0 });
  const hydrated = useRef(false);
  const [screen, setScreen] = useState<Screen>('menu');
  const [ready, setReady] = useState(false);
  const [error, setError] = useState('');
  const [state, setState] = useState<GameState | null>(null);
  const [settings, setSettings] = useState<Settings>(DEFAULTS);
  const teams = circuitTeams(settings.circuit);
  const roundNames = circuitRounds(settings.circuit);
  const settingsRef = useRef(DEFAULTS);
  const [mode, setMode] = useState<Mode>('partido');
  const [shot, setShot] = useState<Shot>('plano');
  const [power, setPower] = useState(0);
  const [charging, setCharging] = useState(false);
  const [chargeAim, setChargeAim] = useState(0);
  const [chargeLate, setChargeLate] = useState(false);
  const [waitWall, setWaitWall] = useState(false);
  const [smash, setSmash] = useState<'retorno' | 'por3' | 'por4' | 'alto'>(
    'retorno',
  );
  const [exteriorReturn, setExteriorReturn] = useState<
    'auto' | 'puerta' | 'alta' | 'red'
  >('auto');
  const [drill, setDrill] = useState<TrainingDrillId>('libre');
  const [muted, setMuted] = useState(false);
  const [round, setRound] = useState(0);
  const [tournamentOpponents, setTournamentOpponents] = useState<number[]>([
    7, 3, 1,
  ]);
  const [wins, setWins] = useState(0);
  const [showSettings, setShowSettings] = useState(false);
  const [showBracket, setShowBracket] = useState(false);
  const [fps, setFps] = useState(60);
  const returnTo = useRef<Screen>('menu');
  const resultRecorded = useRef(false);
  const [matchOpponent, setMatchOpponent] = useState(1);
  const [roundResults, setRoundResults] = useState<string[]>([]);
  const cancelCharge = () => {
    charge.current = null;
    chargeKey.current = null;
    input.current.charging = false;
    input.current.charge = 0;
    input.current.aim = 0;
    input.current.perfect = false;
    input.current.timingQuality = 'good';
    setCharging(false);
    setChargeAim(0);
    setPower(0);
    setChargeLate(false);
  };
  const beginCharge = (key: string | null = null) => {
    if (
      charge.current !== null ||
      screenRef.current !== 'play' ||
      director.current.active
    )
      return;
    const current = match.current?.getState();
    if (!current || current.phase !== 'rally') return;
    charge.current = performance.now();
    chargeKey.current = key;
    input.current.shot = 'remate';
    input.current.charging = true;
    input.current.hit = false;
    input.current.perfect = false;
    input.current.aim = 0;
    setShot('remate');
    setCharging(true);
    setChargeLate(false);
    setChargeAim(0);
    setPower(0);
    void audio.current?.start();
  };
  const releaseCharge = () => {
    if (charge.current === null) return;
    const sample = sampleSmashCharge(
      performance.now() - charge.current,
      settingsRef.current.perfectDifficulty,
    );
    charge.current = null;
    chargeKey.current = null;
    input.current.charging = false;
    input.current.charge = sample.progress;
    input.current.power = sample.power;
    input.current.perfect = sample.perfect;
    input.current.timingQuality = sample.quality;
    input.current.hit = true;
    setCharging(false);
    setPower(sample.progress);
    setChargeLate(sample.late);
  };
  const skipPresentation = () => {
    director.current.skip();
    scene.current = null;
    renderer.current?.setPresentation(null);
    setPresentation(null);
    keys.current.clear();
    combos.current.reset();
    victoryCombo.current.reset();
    cancelCharge();
    input.current.hit = false;
    if (match.current?.getState().phase === 'point') match.current.nextPoint();
  };
  const changeScreen = (s: Screen) => {
    if (s === 'menu') {
      director.current.reset();
      scene.current = null;
      setPresentation(null);
      renderer.current?.setPresentation(null);
    }
    screenRef.current = s;
    setScreen(s);
    keys.current.clear();
    combos.current.reset();
    victoryCombo.current.reset();
    padState.current.x = padState.current.z = padState.current.aim = 0;
    cancelCharge();
    input.current.hit = false;
    setPower(0);
  };
  const config = (patch: Partial<Settings>) => {
    setSettings((p) => ({
      ...p,
      ...patch,
      ...(patch.controlScheme
        ? {
            bindings: bindingsForScheme(
              patch.bindings ?? p.bindings,
              patch.controlScheme,
            ),
          }
        : {}),
    }));
    if (patch.controlScheme || patch.bindings) {
      keys.current.clear();
      combos.current.reset();
      victoryCombo.current.reset();
      cancelCharge();
    }
  };
  useEffect(() => {
    settingsOpen.current = showSettings;
  }, [showSettings]);
  const beginMapping = (action: ControlAction) => {
    const request = { device: mappingDevice, action };
    captureBinding.current = request;
    setBindingCapture(request);
    setBindingMessage('');
  };
  const cancelMapping = () => {
    captureBinding.current = null;
    setBindingCapture(null);
  };
  const acceptMapping = (value: string | number) => {
    const pending = captureBinding.current;
    if (!pending) return;
    const current = settingsRef.current;
    if (pending.device === 'keyboard') {
      const probe = normalizeBindings({
        keyboard: { [pending.action]: value },
      });
      if (
        probe.keyboard[pending.action] !== value ||
        (value === 'Escape' && pending.action !== 'pause')
      ) {
        setBindingMessage(
          value === 'Escape'
            ? 'Esc queda reservado para pausar. Elegí otra tecla.'
            : 'Esa tecla no es compatible. Elegí una letra, número, flecha o modificador.',
        );
        return;
      }
    }
    const result = rebindControl(
      current.bindings,
      pending.device === 'gamepad' ? 'simple' : current.controlScheme,
      pending.device,
      pending.action,
      value,
    );
    config({ bindings: result.bindings });
    setBindingMessage(
      result.conflict
        ? `Asignado. Se intercambió con «${ACTION_LABELS[result.conflict]}».`
        : 'Asignación guardada.',
    );
    cancelMapping();
  };
  useEffect(() => {
    // A scrolled short menu must never crop the scoreboard when a match starts.
    window.scrollTo({ top: 0, left: 0, behavior: 'instant' });
  }, [screen]);
  useEffect(() => {
    settingsRef.current = settings;
    renderer.current?.setCamera(settings.camera);
    renderer.current?.setVenue(VENUES[settings.venue].id);
    audio.current?.setVolume(settings.volume);
    if (hydrated.current)
      try {
        localStorage.setItem(
          'premier-padel-settings',
          JSON.stringify(settings),
        );
      } catch {}
  }, [settings]);
  useEffect(() => {
    try {
      const saved = JSON.parse(
        localStorage.getItem('premier-padel-settings') || 'null',
      );
      if (saved)
        setSettings({
          ...DEFAULTS,
          ...saved,
          circuit: saved.circuit === 'femenino' ? 'femenino' : 'masculino',
          team: Math.max(
            0,
            Math.min(
              circuitTeams(saved.circuit).length - 1,
              Number(saved.team) || 0,
            ),
          ),
          opponent: Math.max(
            0,
            Math.min(
              circuitTeams(saved.circuit).length - 1,
              Number(saved.opponent) || 1,
            ),
          ),
          controlScheme:
            saved.controlScheme === 'clasico' ? 'clasico' : 'simple',
          bindings: bindingsForScheme(
            normalizeBindings(saved.bindings),
            saved.controlScheme === 'clasico' ? 'clasico' : 'simple',
          ),
          gamepadDeadzone: Math.max(
            0.05,
            Math.min(0.5, Number(saved.gamepadDeadzone) || 0.18),
          ),
        });
      setWins(Number(localStorage.getItem('premier-padel-trophies') || 0));
    } catch {}
    hydrated.current = true;
  }, []);
  useEffect(() => {
    if (screenRef.current !== 'menu' || !renderer.current) return;
    const profiles = matchAppearances(
      settings.team,
      settings.opponent,
      settings.circuit,
    );
    renderer.current.setPlayers(profiles);
    director.current.reset();
    scene.current = null;
    setPresentation(null);
    training.current = false;
    roster.current = profiles.map((profile) => profile.id);
    match.current = createDemoMatch(profiles);
  }, [settings.team, settings.opponent, settings.circuit]);
  useEffect(() => {
    if (!host.current) return;
    let raf = 0;
    let previous = performance.now();
    let accumulator = 0;
    let publish = 0;
    let lastEvent = -1;
    const presentationAudio = new PresentationAudioScheduler();
    let lastMeshImpact = 0;
    let meshMatch: PadelMatch | null = null;
    let lastPerfectContact = -1;
    let pointTimer = 0;
    let measured = 0;
    let frames = 0;
    let dead = false;
    let lastPadPublish = 0;
    let previousPadButtons = new Set<number>();
    let previousPadIndex = -1;
    try {
      renderer.current = new PadelRenderer(host.current, {
        quality: 'alta',
        venue: VENUES[settingsRef.current.venue].id,
        players: matchAppearances(
          settingsRef.current.team,
          settingsRef.current.opponent,
          settingsRef.current.circuit,
        ),
      });
      renderer.current.setCamera(settingsRef.current.camera);
      const profiles = matchAppearances(
        settingsRef.current.team,
        settingsRef.current.opponent,
        settingsRef.current.circuit,
      );
      roster.current = profiles.map((profile) => profile.id);
      match.current = createDemoMatch(profiles);
      audio.current = new PadelAudio();
      setReady(true);
    } catch (e) {
      setError(
        e instanceof Error ? e.message : 'No pudimos iniciar el motor 3D.',
      );
      return;
    }
    const fireStroke = (chosen: Shot) => {
      const current = match.current?.getState();
      if (!current || screenRef.current !== 'play') return;
      if (director.current.active) return;
      if (current.phase === 'point') {
        match.current?.nextPoint();
        return;
      }
      cancelCharge();
      input.current.shot = chosen;
      input.current.power =
        keys.current.has('ShiftLeft') || keys.current.has('ShiftRight')
          ? 0.95
          : 0.68;
      input.current.hit = true;
      setShot(chosen);
      void audio.current?.start();
    };
    const runIntents = (intents: ComboIntent[]) => {
      const current = match.current?.getState();
      if (current)
        for (const intent of intents) fireStroke(familyShot(intent, current));
    };
    const pressAction = (
      action: ControlAction,
      now: number,
      device: 'keyboard' | 'gamepad',
      source: string,
    ) => {
      if (action === 'pause') {
        if (settingsOpen.current) return;
        if (screenRef.current === 'play') changeScreen('pause');
        else if (screenRef.current === 'pause') changeScreen('play');
        else if (screenRef.current === 'help') changeScreen(returnTo.current);
        return;
      }
      if (
        (screenRef.current === 'menu' || screenRef.current === 'result') &&
        device === 'gamepad' &&
        (action === 'base' || action === 'quick')
      ) {
        startFromKeyboard.current();
        return;
      }
      if (screenRef.current !== 'play') return;
      const current = match.current?.getState();
      if (!current) return;
      if (director.current.active) {
        if (director.current.signatureAvailable) {
          const token =
            device === 'keyboard' &&
            settingsRef.current.controlScheme === 'clasico' &&
            action === 'lob'
              ? 'control'
              : action;
          if (
            victoryCombo.current.feed(token, now) &&
            director.current.triggerSignature()
          ) {
            scene.current = director.current.update(current, 0, roster.current);
            renderer.current?.setPresentation(scene.current);
            setPresentation(scene.current);
            audio.current?.play('signature');
          }
          setVictoryProgress(victoryCombo.current.progress);
          if (action === 'quick') skipPresentation();
        } else if (action === 'quick' || action === 'base') skipPresentation();
        return;
      }
      if (action === 'switch') {
        combos.current.reset();
        victoryCombo.current.reset();
        cancelCharge();
        input.current.switchPlayer = true;
        return;
      }
      if (action === 'smashMode') {
        const modes = ['retorno', 'por3', 'alto', 'por4'] as const;
        const next =
          modes[
            (modes.indexOf(input.current.smash ?? 'retorno') + 1) % modes.length
          ];
        input.current.smash = next;
        setSmash(next);
        return;
      }
      if (action === 'exteriorMode') {
        const modes = ['auto', 'puerta', 'alta', 'red'] as const;
        const next =
          modes[
            (modes.indexOf(input.current.exteriorReturn ?? 'auto') + 1) %
              modes.length
          ];
        input.current.exteriorReturn = next;
        setExteriorReturn(next);
        return;
      }
      if (action === 'smash') {
        combos.current.reset();
        victoryCombo.current.reset();
        if (current.phase === 'rally') beginCharge(source);
        else fireStroke('plano');
        return;
      }
      if (action === 'quick') {
        combos.current.reset();
        victoryCombo.current.reset();
        const practiced = training.current
          ? trainingExercise.current?.targetShot
          : null;
        fireStroke(
          practiced && practiced !== 'saque'
            ? practiced
            : familyShot('base', current),
        );
        return;
      }
      if (
        (action === 'base' || action === 'control') &&
        (device === 'gamepad' || settingsRef.current.controlScheme === 'simple')
      ) {
        if (current.phase !== 'rally') {
          fireStroke(familyShot(action, current));
          return;
        }
        runIntents(combos.current.press(action, now));
        return;
      }
      const direct: Partial<Record<ControlAction, Shot>> = {
        base: familyShot('base', current),
        control: familyShot('control', current),
        lob: 'globo',
        touch: familyShot('touch', current),
        bandeja: 'bandeja',
        vibora: 'vibora',
        wallshot: 'contrapared',
        volley: 'volea',
        chiquita: 'chiquita',
        bajada: 'bajada',
      };
      if (direct[action]) {
        combos.current.reset();
        victoryCombo.current.reset();
        fireStroke(direct[action]!);
      }
    };
    const releaseAction = (action: ControlAction, source: string) => {
      if (action === 'base' || action === 'control')
        combos.current.release(action);
      if (
        action === 'smash' &&
        chargeKey.current === source &&
        screenRef.current === 'play'
      )
        releaseCharge();
    };
    const readGamepads = (): (Gamepad | null)[] => {
      try {
        return Array.from(navigator.getGamepads?.() ?? []);
      } catch {
        return [];
      }
    };
    const pollGamepad = (now: number) => {
      const pads = readGamepads();
      const pad =
        Array.from(pads).find((candidate) => candidate?.connected) ?? null;
      if (!pad) {
        if (previousPadIndex !== -1) {
          combos.current.reset();
          victoryCombo.current.reset();
          cancelCharge();
          input.current.hit = false;
          padState.current = { x: 0, z: 0, aim: 0, held: new Set(), index: -1 };
          previousPadButtons.clear();
          previousPadIndex = -1;
          setPadInfo({
            connected: false,
            name: '',
            standard: true,
            buttons: '',
          });
          if (screenRef.current === 'play') changeScreen('pause');
        }
        return;
      }
      const pressed = new Set(
        pad.buttons.flatMap((button, index) => (button.pressed ? [index] : [])),
      );
      const newDevice = previousPadIndex !== pad.index;
      if (newDevice) {
        if (previousPadIndex >= 0) {
          combos.current.reset();
          victoryCombo.current.reset();
          cancelCharge();
          input.current.hit = false;
          padState.current = { x: 0, z: 0, aim: 0, held: new Set(), index: -1 };
          if (screenRef.current === 'play') changeScreen('pause');
        }
        previousPadButtons = new Set(pressed);
        previousPadIndex = pad.index;
      }
      const pending = captureBinding.current;
      if (pending?.device === 'gamepad') {
        const button = [...pressed].find(
          (index) => !previousPadButtons.has(index),
        );
        if (button !== undefined) acceptMapping(button);
      } else if (
        !settingsOpen.current &&
        screenRef.current !== 'help' &&
        !document.hidden
      ) {
        const bindings = settingsRef.current.bindings.gamepad;
        const held = new Set(
          relevantActions('simple').filter(
            (action) =>
              bindings[action] !== undefined && pressed.has(bindings[action]!),
          ),
        );
        padState.current = {
          x: axisWithDeadzone(
            pad.axes[0] ?? 0,
            settingsRef.current.gamepadDeadzone,
          ),
          z: axisWithDeadzone(
            pad.axes[1] ?? 0,
            settingsRef.current.gamepadDeadzone,
          ),
          aim: axisWithDeadzone(
            pad.axes[2] ?? 0,
            settingsRef.current.gamepadDeadzone,
          ),
          held,
          index: pad.index,
        };
        if (
          Math.abs(padState.current.x) +
            Math.abs(padState.current.z) +
            Math.abs(padState.current.aim) >
          0.1
        )
          setActiveDevice('gamepad');
        if (!newDevice) {
          if (
            screenRef.current === 'play' &&
            director.current.signatureAvailable &&
            [...pressed].some(
              (button) =>
                !previousPadButtons.has(button) &&
                !relevantActions('simple').some(
                  (action) => bindings[action] === button,
                ),
            )
          ) {
            victoryCombo.current.reset();
            setVictoryProgress(0);
          }
          // Releases must precede presses so a sequential combination stays sequential.
          for (const action of relevantActions('simple')) {
            const button = bindings[action];
            if (
              button !== undefined &&
              !pressed.has(button) &&
              previousPadButtons.has(button)
            )
              releaseAction(action, `pad:${pad.index}:${button}`);
          }
          for (const action of relevantActions('simple')) {
            const button = bindings[action];
            if (
              button !== undefined &&
              pressed.has(button) &&
              !previousPadButtons.has(button)
            ) {
              setActiveDevice('gamepad');
              pressAction(action, now, 'gamepad', `pad:${pad.index}:${button}`);
            }
          }
        }
      }
      previousPadButtons = pressed;
      if (newDevice || now - lastPadPublish > 350) {
        setPadInfo({
          connected: true,
          name: pad.id,
          standard: pad.mapping === 'standard',
          buttons: [...pressed].map(padLabel).join(' · '),
        });
        lastPadPublish = now;
      }
    };
    const tick = (now: number) => {
      if (dead) return;
      const dt = Math.min((now - previous) / 1000, 0.05);
      previous = now;
      accumulator += dt;
      publish += dt;
      measured += dt;
      frames++;
      pollGamepad(now);
      if (screenRef.current === 'play') victoryCombo.current.expire(now);
      if (screenRef.current === 'play' && !director.current.active)
        runIntents(combos.current.flush(now));
      const m = match.current!;
      if (m !== meshMatch) {
        meshMatch = m;
        lastMeshImpact = 0;
        presentationAudio.reset();
      }
      const active =
        screenRef.current === 'play' || screenRef.current === 'menu';
      if (active) {
        while (accumulator >= 1 / 120) {
          if (
            (screenRef.current === 'play' || screenRef.current === 'menu') &&
            director.current.active
          ) {
            accumulator = 0;
            break;
          }
          const k = keys.current;
          const bindings = settingsRef.current.bindings.keyboard;
          const held = (action: ControlAction) =>
            k.has(bindings[action]) || padState.current.held.has(action);
          const sx =
            (held('right') ? 1 : 0) - (held('left') ? 1 : 0) ||
            padState.current.x;
          const sz =
            (held('down') ? 1 : 0) - (held('up') ? 1 : 0) || padState.current.z;
          const aimInput =
            (held('aimRight') ? 1 : 0) - (held('aimLeft') ? 1 : 0) ||
            padState.current.aim;
          const isCharging = charge.current !== null;
          if (isCharging) {
            const direction = sx || aimInput || touch.current.x;
            input.current.aim = Math.max(
              -1,
              Math.min(1, input.current.aim + (direction * 1.7) / 120),
            );
            const sample = sampleSmashCharge(
              now - charge.current!,
              settingsRef.current.perfectDifficulty,
            );
            input.current.charge = sample.progress;
            input.current.power = sample.power;
          }
          const command = {
            ...input.current,
            moveX: isCharging ? 0 : sx || touch.current.x,
            moveZ: sz || touch.current.z,
            waitWall: input.current.waitWall || held('wall'),
            aim: isCharging
              ? input.current.aim
              : aimInput
                ? aimInput * 0.95
                : input.current.aim,
          };
          m.update(
            1 / 120,
            screenRef.current === 'menu' ? BASE_INPUT : command,
          );
          if (
            screenRef.current === 'menu' ||
            (screenRef.current === 'play' && !training.current)
          ) {
            const wasPresenting = director.current.active;
            scene.current = director.current.update(
              m.getState(),
              0,
              roster.current,
            );
            if (!wasPresenting && director.current.active) {
              combos.current.reset();
              victoryCombo.current.reset();
              keys.current.clear();
              cancelCharge();
              touch.current = { x: 0, z: 0 };
              input.current.hit = false;
            }
          }
          input.current.hit = false;
          input.current.switchPlayer = false;
          accumulator -= 1 / 120;
        }
      } else accumulator = 0;
      const s = m.getState();
      if (
        screenRef.current === 'menu' ||
        (screenRef.current === 'play' && !training.current)
      ) {
        const wasActive = director.current.active;
        scene.current = director.current.update(s, dt, roster.current);
        if (wasActive && !director.current.active && s.phase === 'point')
          m.nextPoint();
      }
      renderer.current!.setPresentation(scene.current);
      if (s.phase === 'serve') lastPerfectContact = -1;
      if (charge.current !== null && s.phase !== 'rally') cancelCharge();
      renderer.current!.setChargePreview({
        active: charge.current !== null,
        progress: input.current.charge ?? 0,
        aim: input.current.aim,
        smash: true,
      });
      renderer.current!.render(s, dt);
      for (const cue of presentationAudio.update({
        presentation: scene.current,
        contact: s.contactPoint,
        enabled: active,
        paused: !active,
      }))
        audio.current?.playPresentationCue(cue);
      if (
        s.contactPoint?.quality === 'perfect' &&
        s.contactPoint.time !== lastPerfectContact
      ) {
        lastPerfectContact = s.contactPoint.time;
        if (screenRef.current === 'play') {
          audio.current?.play('perfect', s.contactPoint.x, 1);
          if (settingsRef.current.vibration && padState.current.index >= 0) {
            const actuator =
              readGamepads()[padState.current.index]?.vibrationActuator;
            void actuator
              ?.playEffect?.('dual-rumble', {
                duration: 150,
                strongMagnitude: 0.65,
                weakMagnitude: 0.35,
              })
              .catch(() => {});
          }
        }
      }
      if (active && s.meshImpact && (s.meshImpactId ?? 0) !== lastMeshImpact) {
        if (screenRef.current === 'play')
          audio.current?.play(
            s.meshImpact.type,
            s.meshImpact.x,
            s.meshImpact.power,
          );
        lastMeshImpact = s.meshImpactId ?? 0;
      }
      if (active && s.eventId !== lastEvent) {
        if (screenRef.current === 'play' && s.eventType !== 'mesh')
          audio.current?.play(
            s.eventType,
            s.ball.x,
            Math.max(
              0.12,
              Math.min(1, Math.hypot(s.ball.vx, s.ball.vy, s.ball.vz) / 34),
            ),
          );
        lastEvent = s.eventId;
      }
      if (active && s.phase === 'point' && !director.current.active) {
        pointTimer += dt;
        if (pointTimer > 3.1) {
          m.nextPoint();
          pointTimer = 0;
        }
      } else pointTimer = 0;
      if (
        screenRef.current === 'menu' &&
        s.phase === 'finished' &&
        !director.current.active
      ) {
        director.current.reset();
        scene.current = null;
        const profiles = matchAppearances(
          settingsRef.current.team,
          settingsRef.current.opponent,
          settingsRef.current.circuit,
        );
        roster.current = profiles.map((profile) => profile.id);
        match.current = createDemoMatch(profiles);
      }
      if (
        screenRef.current === 'play' &&
        s.phase === 'finished' &&
        !director.current.active
      ) {
        screenRef.current = 'result';
        setScreen('result');
      }
      if (charge.current !== null) {
        const sample = sampleSmashCharge(
          now - charge.current,
          settingsRef.current.perfectDifficulty,
        );
        chargeMeter.current?.style.setProperty(
          '--charge',
          `${sample.progress * 100}%`,
        );
      }
      if (publish > (charge.current === null ? 0.09 : 0.033)) {
        setState(JSON.parse(JSON.stringify(s)));
        setPresentation(scene.current);
        setVictoryProgress(victoryCombo.current.progress);
        if (charge.current !== null) {
          const sample = sampleSmashCharge(
            now - charge.current,
            settingsRef.current.perfectDifficulty,
          );
          setPower(sample.progress);
          setChargeLate(sample.late);
          setChargeAim(input.current.aim);
        }
        publish = 0;
      }
      if (measured > 1) {
        setFps(Math.round(frames / measured));
        measured = 0;
        frames = 0;
      }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    const resize = () => renderer.current?.resize();
    window.addEventListener('resize', resize);
    const keydown = (e: KeyboardEvent) => {
      if (e.ctrlKey || e.metaKey || e.altKey || e.isComposing) return;
      const pending = captureBinding.current;
      if (pending?.device === 'keyboard') {
        e.preventDefault();
        e.stopPropagation();
        if (!e.repeat) acceptMapping(e.code);
        return;
      }
      const target = e.target as HTMLElement;
      if (
        screenRef.current === 'pause' &&
        !settingsOpen.current &&
        (e.code === settingsRef.current.bindings.keyboard.pause ||
          e.code === 'Escape')
      ) {
        e.preventDefault();
        e.stopPropagation();
        if (!e.repeat)
          pressAction('pause', performance.now(), 'keyboard', e.code);
        return;
      }
      if (
        target?.closest(
          'input,textarea,[contenteditable="true"],[role="combobox"],[role="listbox"],select,[role="dialog"]',
        )
      )
        return;
      if (
        screenRef.current === 'menu' &&
        e.code === 'Enter' &&
        !e.repeat &&
        !target?.closest('button,a')
      ) {
        e.preventDefault();
        startFromKeyboard.current();
        return;
      }
      const currentSettings = settingsRef.current;
      const action = relevantActions(currentSettings.controlScheme).find(
        (item) => currentSettings.bindings.keyboard[item] === e.code,
      );
      if (
        !action &&
        e.code !== 'Escape' &&
        !e.repeat &&
        screenRef.current === 'play' &&
        director.current.signatureAvailable
      ) {
        victoryCombo.current.reset();
        setVictoryProgress(0);
      }
      // Escape remains an emergency pause when the user maps pause elsewhere.
      if (
        !action &&
        e.code !== 'Escape' &&
        !['ShiftLeft', 'ShiftRight'].includes(e.code)
      )
        return;
      if (
        screenRef.current !== 'play' &&
        action !== 'pause' &&
        e.code !== 'Escape'
      )
        return;
      e.preventDefault();
      e.stopPropagation();
      keys.current.add(e.code);
      if (e.repeat) return;
      setActiveDevice('keyboard');
      if (action) pressAction(action, performance.now(), 'keyboard', e.code);
      else if (e.code === 'Escape')
        pressAction('pause', performance.now(), 'keyboard', e.code);
    };
    const keyup = (e: KeyboardEvent) => {
      keys.current.delete(e.code);
      const currentSettings = settingsRef.current;
      const action = relevantActions(currentSettings.controlScheme).find(
        (item) => currentSettings.bindings.keyboard[item] === e.code,
      );
      if (action) releaseAction(action, e.code);
    };
    const blur = () => {
      keys.current.clear();
      combos.current.reset();
      victoryCombo.current.reset();
      cancelCharge();
      input.current.hit = false;
      if (screenRef.current === 'play') changeScreen('pause');
    };
    window.addEventListener('keydown', keydown, true);
    window.addEventListener('keyup', keyup);
    window.addEventListener('blur', blur);
    (window as unknown as { __padel: unknown }).__padel = {
      snapshot: () => JSON.parse(JSON.stringify(match.current?.getState())),
      renderer: () => renderer.current,
    };
    return () => {
      dead = true;
      cancelAnimationFrame(raf);
      window.removeEventListener('resize', resize);
      window.removeEventListener('keydown', keydown, true);
      window.removeEventListener('keyup', keyup);
      window.removeEventListener('blur', blur);
      renderer.current?.dispose();
      audio.current?.dispose();
    };
  }, []);
  useEffect(() => {
    if (screen !== 'result' || resultRecorded.current) return;
    resultRecorded.current = true;
    if (mode === 'circuito' && state?.winner === 0) {
      const score = state.score.history.map((p) => p.join('–')).join(' / ');
      setRoundResults((p) => [...p, score]);
      if (round === roundNames.length - 1) {
        setWins((w) => {
          try {
            localStorage.setItem('premier-padel-trophies', String(w + 1));
          } catch {}
          return w + 1;
        });
      }
    }
  }, [screen, state, mode, round, roundNames.length]);
  const start = (
    nextRound = 0,
    chosenMode: Mode = mode,
    chosenDrill: typeof drill = drill,
  ) => {
    if (!ready || error) return;
    director.current.reset();
    scene.current = null;
    setPresentation(null);
    renderer.current?.setPresentation(null);
    training.current = chosenMode === 'entrenamiento';
    setMode(chosenMode);
    setDrill(chosenDrill);
    void audio.current?.start();
    const opp =
      chosenMode === 'circuito'
        ? nextRound === 0
          ? (() => {
              const list = circuitOpponents(settings.circuit, settings.team);
              setTournamentOpponents(list);
              return list[0];
            })()
          : tournamentOpponents[nextRound]
        : settings.opponent;
    setMatchOpponent(opp);
    setRound(nextRound);
    if (nextRound === 0) setRoundResults([]);
    resultRecorded.current = false;
    const profiles = matchAppearances(settings.team, opp, settings.circuit);
    roster.current = profiles.map((profile) => profile.id);
    renderer.current?.setPlayers(profiles);
    match.current = new PadelMatch({
      difficulty: settings.difficulty,
      gamesToWin: settings.format === 'rapido' ? 3 : 6,
      setsToWin: settings.format === 'partido' ? 2 : 1,
      training: chosenMode === 'entrenamiento',
      drill: chosenDrill,
      playerProfiles: profiles,
    });
    const exercise: TrainingDrill | undefined = TRAINING_DRILLS.find(
      (d) => d.id === chosenDrill,
    );
    trainingExercise.current =
      chosenMode === 'entrenamiento' ? exercise : undefined;
    const openingShot: Shot =
      chosenMode === 'entrenamiento' &&
      exercise?.targetShot &&
      exercise.targetShot !== 'saque'
        ? exercise.targetShot
        : 'plano';
    const openingSmash =
      chosenMode === 'entrenamiento'
        ? (exercise?.smash ?? 'retorno')
        : 'retorno';
    input.current = {
      ...BASE_INPUT,
      shot: openingShot,
      smash: openingSmash,
      waitWall: chosenMode === 'entrenamiento' && !!exercise?.waitWall,
      exteriorReturn: 'auto',
    };
    setExteriorReturn('auto');
    setShot(openingShot);
    setSmash(openingSmash);
    setWaitWall(chosenMode === 'entrenamiento' && !!exercise?.waitWall);
    setState(JSON.parse(JSON.stringify(match.current.getState())));
    setShowSettings(false);
    setShowBracket(false);
    changeScreen('play');
  };
  startFromKeyboard.current = () => start(0, 'partido');
  const menu = () => {
    const profiles = matchAppearances(
      settings.team,
      settings.opponent,
      settings.circuit,
    );
    renderer.current?.setPlayers(profiles);
    director.current.reset();
    scene.current = null;
    setPresentation(null);
    training.current = false;
    roster.current = profiles.map((profile) => profile.id);
    match.current = createDemoMatch(profiles);
    changeScreen('menu');
  };
  const selectShot = (id: Shot) => {
    if (director.current.active) return;
    cancelCharge();
    input.current.shot = id;
    input.current.power = 0.68;
    input.current.hit = id !== 'remate';
    setShot(id);
    void audio.current?.start();
  };
  const toggleWall = () => {
    setWaitWall((v) => {
      input.current.waitWall = !v;
      return !v;
    });
  };
  const chooseSmash = (value: typeof smash) => {
    setSmash(value);
    input.current.smash = value;
  };
  const quickHit = () => {
    if (director.current.active) {
      skipPresentation();
      return;
    }
    cancelCharge();
    if (match.current?.getState().phase === 'point') match.current.nextPoint();
    else {
      input.current.power = 0.68;
      input.current.hit = true;
    }
    void audio.current?.start();
  };
  const toggleSound = () => {
    const v = !muted;
    setMuted(v);
    audio.current?.setEnabled(!v);
    if (!v) void audio.current?.start();
  };
  const help = () => {
    returnTo.current = screenRef.current;
    changeScreen('help');
  };
  const fullScreen = () => {
    if (document.fullscreenElement) void document.exitFullscreen();
    else void document.documentElement.requestFullscreen?.().catch(() => {});
  };
  const inMatch = screen !== 'menu';
  const controlLabel = (action: ControlAction) =>
    activeDevice === 'gamepad' && padInfo.connected
      ? padLabel(settings.bindings.gamepad[action])
      : keyLabel(settings.bindings.keyboard[action]);
  const signatureLabels = VICTORY_SEQUENCE.map((action) =>
    action === 'control' &&
    !(activeDevice === 'gamepad' && padInfo.connected) &&
    settings.controlScheme === 'clasico'
      ? keyLabel(settings.bindings.keyboard.lob)
      : controlLabel(action),
  );
  const simpleControls =
    settings.controlScheme === 'simple' ||
    (activeDevice === 'gamepad' && padInfo.connected);
  const shotKeyLabel = (id: Shot) => {
    const action: Record<Shot, ControlAction> = {
      plano: 'base',
      globo: 'lob',
      remate: 'smash',
      bandeja: 'bandeja',
      vibora: 'vibora',
      dejada: 'touch',
      volea: 'volley',
      chiquita: 'chiquita',
      bajada: 'bajada',
      contrapared: 'wallshot',
    };
    return keyLabel(settings.bindings.keyboard[action[id]]);
  };
  const venue = VENUES[settings.venue];
  const playerTeam = teams[settings.team] ?? teams[0];
  const opponent = teams[matchOpponent] ?? teams[1];
  const onTouchMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!e.currentTarget.hasPointerCapture(e.pointerId)) return;
    const r = e.currentTarget.getBoundingClientRect();
    touch.current = {
      x: Math.max(
        -1,
        Math.min(1, (e.clientX - r.left - r.width / 2) / (r.width / 3)),
      ),
      z: Math.max(
        -1,
        Math.min(1, (e.clientY - r.top - r.height / 2) / (r.height / 3)),
      ),
    };
  };
  return (
    <main className={`padel-app screen-${screen}`}>
      <div ref={host} className="arena" aria-label="Cancha de pádel 3D" />
      <div className="screen-shade" />
      {error && (
        <div className="error-panel">
          <h2>No pudimos abrir la pista</h2>
          <p>{error}</p>
          <p>Activá la aceleración gráfica del navegador y recargá.</p>
          <button onClick={() => location.reload()}>Reintentar</button>
        </div>
      )}
      {screen === 'menu' && (
        <>
          <header className="menu-header">
            <a className="brand" href="#" onClick={(e) => e.preventDefault()}>
              <span className="brand-mark">
                P<span>P</span>
              </span>
              <span>
                PREMIER
                <br />
                <b>PADEL</b>
              </span>
            </a>
            <div className="edition">
              <span className="status-dot" />
              EDICIÓN JUGABLE<span className="edition-sep">/</span>10
            </div>
            <button
              className="icon-button"
              aria-label="Sonido"
              onClick={toggleSound}
            >
              {muted ? <VolumeX /> : <Volume2 />}
            </button>
          </header>
          <section className="menu-panel">
            <div className="eyebrow">
              <span />
              EL CIRCUITO. TU PARTIDO.
            </div>
            <h1>
              Entrá a<br /> la <em>pista.</em>
            </h1>
            <p className="menu-intro">
              {controlLabel('up')} {controlLabel('left')} {controlLabel('down')}{' '}
              {controlLabel('right')} para moverte.{' '}
              {simpleControls
                ? `${controlLabel('base')} y ${controlLabel('control')} se combinan.`
                : 'Elegí el golpe con su tecla.'}{' '}
              Mantené {controlLabel('smash')} para rematar.
            </p>
            <div className="mode-list" role="group" aria-label="Modo de juego">
              {(
                [
                  {
                    id: 'partido',
                    title: 'Partido rápido',
                    sub: 'Un clic y entrás a la pista.',
                    icon: Play,
                  },
                  {
                    id: 'circuito',
                    title: 'Torneo',
                    sub: `Comenzar torneo de ${roundNames.length === 2 ? 'dos' : 'tres'} rondas.`,
                    icon: Trophy,
                  },
                  {
                    id: 'entrenamiento',
                    title: 'Entrenamiento',
                    sub: 'Practicá pared, globo y remate.',
                    icon: Target,
                  },
                ] as const
              ).map((m, i) => (
                <button
                  key={m.id}
                  className={`mode ${mode === m.id ? 'selected' : ''}`}
                  disabled={!ready || !!error}
                  onClick={() => start(0, m.id)}
                >
                  <span className="mode-number">0{i + 1}</span>
                  <span>
                    <strong>{m.title}</strong>
                    <small>{m.sub}</small>
                  </span>
                  <m.icon size={20} />
                </button>
              ))}
            </div>
            <div className="menu-setup">
              <div
                className="circuit-selector"
                role="group"
                aria-label="Circuito"
              >
                {(['masculino', 'femenino'] as const).map((circuit) => (
                  <button
                    key={circuit}
                    aria-pressed={settings.circuit === circuit}
                    disabled={!ready || !!error}
                    onClick={() => config({ circuit, team: 0, opponent: 1 })}
                  >
                    {circuit === 'masculino' ? 'Masculino' : 'Femenino'}
                  </button>
                ))}
              </div>
              <Choice
                label="Tu pareja"
                value={String(settings.team)}
                onChange={(v) => {
                  const team = Number(v);
                  config({
                    team,
                    opponent:
                      team === settings.opponent
                        ? (team + 1) % teams.length
                        : settings.opponent,
                  });
                }}
                items={teams.map((t, i) => ({
                  value: String(i),
                  label: t.name,
                }))}
              />
              <div className="team-meta">
                <span>{playerTeam.countries}</span>
                <span>{playerTeam.style}</span>
              </div>
              <div
                className="player-traits"
                aria-label="Jugadores de tu pareja"
              >
                {teamAppearances(settings.team, settings.circuit).map((p) => (
                  <span key={p.id}>
                    <i
                      style={{
                        background: p.kit.shirt,
                        borderColor: p.kit.accent,
                      }}
                    />
                    <span>
                      <b>{p.surname}</b>
                      <small>
                        {p.height.toFixed(2).replace('.', ',')} m ·{' '}
                        {p.handedness === 'left'
                          ? p.gender === 'female'
                            ? 'Zurda'
                            : 'Zurdo'
                          : p.gender === 'female'
                            ? 'Diestra'
                            : 'Diestro'}
                      </small>
                    </span>
                  </span>
                ))}
              </div>
            </div>
            <button
              className="start-button"
              disabled={!ready || !!error}
              onClick={() => start()}
            >
              <span>
                {!ready
                  ? 'Preparando la pista…'
                  : mode === 'entrenamiento'
                    ? 'ENTRAR A ENTRENAR'
                    : mode === 'circuito'
                      ? 'JUGAR TORNEO'
                      : 'JUGAR PARTIDO'}
              </span>
              <ArrowUpRight size={24} />
            </button>
            <div className="menu-secondary">
              <button onClick={() => setShowSettings(true)}>
                <Settings2 size={16} />
                Configurar partido
              </button>
              <button onClick={help}>
                <CircleHelp size={16} />
                Cómo jugar
              </button>
            </div>
          </section>
          <div className="venue-caption">
            <span className="live-tag">
              <span />
              PISTA CENTRAL
            </span>
            <h2>{venue.name}</h2>
            <p>
              {venue.city}
              <span> / </span>
              {venue.category}
            </p>
            <div className="venue-choices">
              {VENUES.map((v, i) => (
                <button
                  key={v.id}
                  aria-label={`Seleccionar ${v.name}`}
                  aria-pressed={settings.venue === i}
                  className={settings.venue === i ? 'active' : ''}
                  onClick={() => config({ venue: i })}
                >
                  {v.name}
                </button>
              ))}
            </div>
          </div>
          {presentation &&
            ['walk', 'bench', 'return'].includes(presentation.phase) && (
              <aside className="demo-break" aria-live="polite">
                <small>DEMOSTRACIÓN · PARTIDO EN CURSO</small>
                <strong>
                  {presentation.phase === 'bench'
                    ? 'Descanso con el entrenador'
                    : presentation.phase === 'walk'
                      ? 'Camino al cambio de lado'
                      : 'Vuelta a la pista'}
                </strong>
                {presentation.phase === 'bench' && (
                  <span>Jugadores sentados · hidratación · conversación</span>
                )}
              </aside>
            )}
          <footer className="menu-footer">
            <span>SIMULACIÓN 3D · DOBLES · ESPAÑOL</span>
            <span>
              {wins > 0
                ? `${wins} títulos conseguidos`
                : 'Juego independiente inspirado en Premier Padel'}
            </span>
            <button onClick={fullScreen}>
              <Maximize size={14} />
              Pantalla completa
            </button>
          </footer>
        </>
      )}
      {inMatch && state && (
        <>
          <header className="match-top">
            <div className="scoreboard">
              <div className="score-title">
                <span>
                  PREMIER PADEL ·{' '}
                  {settings.circuit === 'femenino' ? 'FEM' : 'MASC'}
                </span>
                <span>
                  {mode === 'entrenamiento'
                    ? 'ENTRENAMIENTO'
                    : mode === 'circuito'
                      ? roundNames[round].toUpperCase()
                      : 'EXHIBICIÓN'}
                </span>
              </div>
              {[playerTeam, opponent].map((t, i) => (
                <div
                  className={`score-row ${i === 0 ? 'your-team' : ''}`}
                  key={i}
                >
                  <span className="server-dot">
                    {state.players[state.server]?.team === i ? '●' : ''}
                  </span>
                  <strong>{t.name}</strong>
                  {state.score.history.map((h, j) => (
                    <span className="old-score" key={j}>
                      {h[i]}
                    </span>
                  ))}
                  <span className="game-score">{state.score.games[i]}</span>
                  <b className="point-score">{state.score.pointLabels[i]}</b>
                </div>
              ))}
              <div className="score-foot">
                <span>
                  {mode === 'entrenamiento'
                    ? `PRÁCTICA · ${(TRAINING_DRILLS.find((d) => d.id === drill)?.label ?? 'Peloteo').toUpperCase()}`
                    : state.score.tieBreak
                      ? 'TIE-BREAK'
                      : state.score.starPoint
                        ? 'STAR POINT · PUNTO DECISIVO'
                        : settings.format === 'rapido'
                          ? 'SET CORTO · 3 JUEGOS'
                          : settings.format === 'partido'
                            ? 'AL MEJOR DE 3 SETS'
                            : '1 SET · 6 JUEGOS'}
                </span>
                <span>
                  {Math.floor(state.time / 60)}:
                  {String(Math.floor(state.time % 60)).padStart(2, '0')}
                </span>
              </div>
            </div>
            <div className="match-location">
              <span className="eyebrow">{venue.category} / PISTA CENTRAL</span>
              <strong>{venue.name}</strong>
              <div className="match-actions">
                <button
                  className="icon-button"
                  aria-label="Cambiar cámara"
                  title="Cambiar cámara"
                  onClick={() =>
                    config({
                      camera:
                        settings.camera === 'tv'
                          ? 'cerca'
                          : settings.camera === 'cerca'
                            ? 'cenital'
                            : 'tv',
                    })
                  }
                >
                  <Camera size={18} />
                </button>
                <button
                  className="icon-button"
                  aria-label={muted ? 'Activar sonido' : 'Silenciar'}
                  onClick={toggleSound}
                >
                  {muted ? <VolumeX size={18} /> : <Volume2 size={18} />}
                </button>
                <button
                  className="icon-button"
                  aria-label="Pausar"
                  onClick={() => changeScreen('pause')}
                >
                  <Pause size={18} />
                </button>
              </div>
            </div>
          </header>
          {screen === 'play' && presentation && (
            <section
              className={`match-scene ${presentation.phase === 'signature' ? 'signature-scene' : ''}`}
              aria-live="polite"
            >
              <small>
                {presentation.phase === 'signature'
                  ? 'EL LOBO · FESTEJO ESPECIAL'
                  : presentation.signatureAvailable
                    ? 'VICTORIA DE LEBRÓN · INGRESÁ EL CÓDIGO'
                    : presentation.phase === 'bench'
                      ? 'EN EL BANQUILLO · ESCENA FICTICIA'
                      : presentation.phase === 'celebration'
                        ? 'EL PUNTO ES SUYO'
                        : 'CAMBIO DE LADO'}
              </small>
              <p>{presentation.dialogue}</p>
              {presentation.signatureAvailable && (
                <div className="victory-code">
                  <div aria-label="Código del festejo secreto">
                    {signatureLabels.map((label, index) => (
                      <kbd
                        key={index}
                        className={index < victoryProgress ? 'accepted' : ''}
                      >
                        {label}
                      </kbd>
                    ))}
                  </div>
                  <span>
                    {Math.ceil(presentation.signatureSecondsLeft ?? 0)} s · Tocá
                    y soltá cada tecla
                  </span>
                </div>
              )}
              <button onClick={skipPresentation}>
                Continuar <kbd>{controlLabel('quick')}</kbd>
                <ArrowRight size={17} />
              </button>
            </section>
          )}
          {screen === 'play' && !presentation && (
            <>
              <div className="rally-info">
                <Activity size={15} />
                <b>
                  {Math.round(state.speed)} <small>km/h</small>
                </b>
                <span>{state.rally} golpes</span>
              </div>
              {(state.phase === 'serve' || state.phase === 'point') && (
                <div
                  className={`point-banner ${state.phase === 'point' ? 'point-won' : ''}`}
                  role="status"
                >
                  <small>
                    {state.phase === 'serve'
                      ? mode === 'entrenamiento' && drill !== 'libre'
                        ? 'LANZAMIENTO'
                        : 'AL SERVICIO'
                      : 'PUNTO'}
                  </small>
                  <strong>{state.message}</strong>
                  <span>
                    {state.phase === 'serve'
                      ? state.players[state.server]?.team === 0
                        ? `Tocá ${controlLabel('quick')} para sacar. ${controlLabel('base')} / ${controlLabel('control')} / ${controlLabel('smash')} para jugar.`
                        : 'Prepará la devolución'
                      : 'Próximo punto en unos segundos · ESPACIO para continuar'}
                  </span>
                  {state.phase === 'serve' &&
                    state.players[state.server]?.team === 0 && (
                      <button className="serve-button" onClick={quickHit}>
                        SACAR <Play size={15} />
                      </button>
                    )}
                </div>
              )}
              {state.needsReceivingSide && (
                <div
                  className="receiving-choice"
                  role="group"
                  aria-label="Lado de recepción en Star Point"
                >
                  <strong>Star Point · Elegí dónde recibir</strong>
                  <button
                    onClick={() => match.current?.chooseReceivingSide(-1)}
                  >
                    Izquierda
                  </button>
                  <button onClick={() => match.current?.chooseReceivingSide(1)}>
                    Derecha
                  </button>
                </div>
              )}
              <div className="player-label">
                <span className="status-dot" />
                {playerTeam.players[state.controlled % 2]}
                <small>VOS</small>
              </div>
              {mode === 'entrenamiento' && (
                <div
                  className="training-drills"
                  role="group"
                  aria-label="Ejercicio de pádel"
                >
                  <label htmlFor="training-exercise">PRACTICÁ UN GOLPE</label>
                  <Select
                    value={drill}
                    onValueChange={(value) => {
                      if (value)
                        start(0, 'entrenamiento', value as TrainingDrillId);
                    }}
                  >
                    <SelectTrigger
                      id="training-exercise"
                      aria-label="Ejercicio de pádel"
                    >
                      <SelectValue>
                        {TRAINING_DRILLS.find((d) => d.id === drill)?.label}
                      </SelectValue>
                    </SelectTrigger>
                    <SelectContent>
                      {TRAINING_DRILLS.map((d) => (
                        <SelectItem key={d.id} value={d.id}>
                          {d.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <p>
                    {TRAINING_DRILLS.find((d) => d.id === drill)?.description}
                    <span className="training-key-hint">
                      {TRAINING_DRILLS.find((d) => d.id === drill)
                        ?.targetShot === 'remate'
                        ? `${controlLabel('smash')}: mantené, apuntá y soltá.`
                        : `${controlLabel('quick')}: ejecutá el golpe del ejercicio.`}
                    </span>
                  </p>
                  <button
                    onClick={() => start(0, 'entrenamiento', drill)}
                    title="Reiniciar el ejercicio"
                  >
                    <RotateCcw size={16} /> Reiniciar
                  </button>
                </div>
              )}
              <div className="tactical-hint" role="status">
                {state.tacticalHint}
              </div>
              {state.contactPoint?.quality === 'perfect' &&
                state.time - state.contactPoint.time < 1.05 && (
                  <div
                    className="perfect-impact"
                    key={`${state.contactPoint.playerId}-${state.contactPoint.time}`}
                  >
                    <span>CONTACTO LIMPIO</span>
                    <strong>¡PERFECTO!</strong>
                  </div>
                )}
              {state.ballOutside && state.phase === 'rally' && (
                <div className="exterior-alert">
                  <ArrowUpRight size={16} /> ¡SIGUE VIVA! · SALÍ POR LA PUERTA
                </div>
              )}
              <div className="shot-bar">
                <div className="shot-title">
                  <span>
                    {state.canHit
                      ? '● PEGÁ AHORA'
                      : state.eventType === 'miss'
                        ? 'NO LLEGASTE · ANTICIPÁ EL GOLPE'
                        : 'TU GOLPE'}
                  </span>
                  <span>
                    {state.phase === 'rally'
                      ? SHOTS.find((s) => s.id === state.lastShot)?.name
                      : 'TRES FAMILIAS DE GOLPES'}
                  </span>
                </div>
                {simpleControls && (
                  <div
                    className="simple-shot-families"
                    aria-label="Tres familias de golpes"
                  >
                    <button
                      className={
                        ['plano', 'volea', 'bajada'].includes(shot)
                          ? 'active'
                          : ''
                      }
                      onClick={() => selectShot(familyShot('base', state))}
                    >
                      <kbd>{controlLabel('base')}</kbd>
                      <span>
                        <b>Golpe base</b>
                        <small>Plano · volea · bajada</small>
                      </span>
                    </button>
                    <button
                      className={
                        ['bandeja', 'chiquita', 'vibora'].includes(shot)
                          ? 'active'
                          : ''
                      }
                      onClick={() => selectShot(familyShot('control', state))}
                    >
                      <kbd>{controlLabel('control')}</kbd>
                      <span>
                        <b>Control</b>
                        <small>Cortado · bandeja</small>
                      </span>
                    </button>
                    <button
                      className={shot === 'remate' ? 'active' : ''}
                      onPointerDown={(e) => {
                        e.currentTarget.setPointerCapture(e.pointerId);
                        selectShot('remate');
                        beginCharge();
                      }}
                      onPointerUp={releaseCharge}
                      onPointerCancel={cancelCharge}
                      onClick={(e) => {
                        if (e.detail === 0) {
                          if (charge.current === null) {
                            selectShot('remate');
                            beginCharge();
                          } else releaseCharge();
                        }
                      }}
                    >
                      <kbd>{controlLabel('smash')}</kbd>
                      <span>
                        <b>Remate</b>
                        <small>Mantené · apuntá · soltá</small>
                      </span>
                    </button>
                  </div>
                )}
                {simpleControls && (
                  <div
                    className="combo-shortcuts"
                    aria-label="Combinaciones de golpes"
                  >
                    <button onClick={() => selectShot('globo')}>
                      <kbd>
                        {controlLabel('base')} → {controlLabel('control')}
                      </kbd>{' '}
                      Globo
                    </button>
                    <button
                      onClick={() => selectShot(familyShot('touch', state))}
                    >
                      <kbd>
                        {controlLabel('control')} → {controlLabel('base')}
                      </kbd>{' '}
                      Toque corto
                    </button>
                    <button
                      onClick={() => selectShot(familyShot('together', state))}
                    >
                      <kbd>
                        {controlLabel('base')} + {controlLabel('control')}
                      </kbd>{' '}
                      Víbora / volea
                    </button>
                    <button
                      className="advanced-shots-toggle"
                      aria-expanded={advancedShots}
                      onClick={() => setAdvancedShots((v) => !v)}
                    >
                      {advancedShots ? 'Cerrar' : 'Más golpes'}
                    </button>
                  </div>
                )}
                {(!simpleControls || advancedShots) && (
                  <div
                    className={`shots ${simpleControls ? 'advanced-shot-grid' : ''}`}
                  >
                    {[
                      SHOTS[0],
                      SHOTS[1],
                      SHOTS[4],
                      SHOTS[2],
                      SHOTS[3],
                      SHOTS[5],
                      ...SHOTS.slice(6),
                    ].map((s) => (
                      <button
                        key={s.id}
                        className={shot === s.id ? 'active' : ''}
                        onClick={(e) => {
                          if (s.id !== 'remate' || e.detail === 0)
                            selectShot(s.id);
                        }}
                        onPointerDown={
                          s.id === 'remate'
                            ? (e) => {
                                e.currentTarget.setPointerCapture(e.pointerId);
                                selectShot('remate');
                                beginCharge();
                              }
                            : undefined
                        }
                        onPointerUp={
                          s.id === 'remate' ? releaseCharge : undefined
                        }
                        onPointerCancel={
                          s.id === 'remate' ? cancelCharge : undefined
                        }
                        title={s.tip}
                      >
                        <kbd>{simpleControls ? '↗' : shotKeyLabel(s.id)}</kbd>
                        <span>{s.name}</span>
                      </button>
                    ))}
                  </div>
                )}
                <div className="padel-actions">
                  <button
                    aria-pressed={waitWall}
                    className={waitWall ? 'active' : ''}
                    onClick={toggleWall}
                  >
                    <kbd>{controlLabel('wall')}</kbd> Esperar vidrio
                  </button>
                  {state.players[state.controlled]?.outside ? (
                    <fieldset
                      className="smash-options exterior-options"
                      aria-label="Devolución desde afuera"
                    >
                      <kbd>{controlLabel('exteriorMode')}</kbd>
                      {(
                        [
                          { id: 'auto', name: 'Auto' },
                          { id: 'puerta', name: 'Puerta' },
                          { id: 'alta', name: 'Por arriba' },
                          { id: 'red', name: 'A la red' },
                        ] as const
                      ).map((choice) => (
                        <button
                          key={choice.id}
                          aria-pressed={exteriorReturn === choice.id}
                          className={
                            exteriorReturn === choice.id ? 'active' : ''
                          }
                          onClick={() => {
                            setExteriorReturn(choice.id);
                            input.current.exteriorReturn = choice.id;
                          }}
                        >
                          {choice.name}
                        </button>
                      ))}
                    </fieldset>
                  ) : shot === 'remate' ? (
                    <div
                      className="smash-options"
                      role="group"
                      aria-label="Tipo de remate"
                    >
                      <kbd title="Cambiar tipo de remate">
                        {controlLabel('smashMode')}
                      </kbd>
                      {(
                        [
                          { id: 'retorno', name: 'Traérmela' },
                          { id: 'por3', name: 'Por 3' },
                          { id: 'alto', name: 'Paralelo alto' },
                          { id: 'por4', name: 'Por 4' },
                        ] as const
                      ).map((s) => (
                        <button
                          key={s.id}
                          aria-pressed={smash === s.id}
                          className={smash === s.id ? 'active' : ''}
                          onClick={() => chooseSmash(s.id)}
                        >
                          {s.name}
                        </button>
                      ))}
                    </div>
                  ) : (
                    <span className="selected-shot-tip">
                      {SHOTS.find((s) => s.id === shot)?.tip}
                    </span>
                  )}
                  <button
                    className="quick-hit"
                    disabled={
                      state.phase === 'serve' &&
                      state.players[state.server]?.team !== 0
                    }
                    onClick={(e) => {
                      if (shot !== 'remate' || state.phase !== 'rally')
                        quickHit();
                      else if (e.detail === 0) {
                        if (charge.current === null) beginCharge();
                        else releaseCharge();
                      }
                    }}
                    onPointerDown={
                      shot === 'remate' && state.phase === 'rally'
                        ? (e) => {
                            e.currentTarget.setPointerCapture(e.pointerId);
                            beginCharge();
                          }
                        : undefined
                    }
                    onPointerUp={shot === 'remate' ? releaseCharge : undefined}
                    onPointerCancel={
                      shot === 'remate' ? cancelCharge : undefined
                    }
                  >
                    {state.phase === 'point'
                      ? 'CONTINUAR'
                      : state.phase === 'serve'
                        ? state.players[state.server]?.team === 0
                          ? 'SACAR'
                          : 'PREPARATE'
                        : shot === 'remate'
                          ? 'MANTENÉ PARA CARGAR'
                          : 'GOLPEAR'}{' '}
                    <Play size={12} />
                  </button>
                </div>
                {shot === 'remate' ? (
                  <div
                    className={`smash-charge ${charging ? 'is-charging' : ''} ${chargeLate ? 'is-late' : ''}`}
                  >
                    <div className="charge-caption">
                      <strong>
                        {charging
                          ? chargeLate
                            ? 'TE PASASTE'
                            : 'SOLTÁ EN VERDE'
                          : 'CARGÁ EL REMATE'}
                      </strong>
                      <span>
                        <kbd>{controlLabel('smash')}</kbd> mantener ·{' '}
                        <kbd>
                          {activeDevice === 'gamepad'
                            ? 'STICK'
                            : `${controlLabel('left')} / ${controlLabel('right')}`}
                        </kbd>{' '}
                        apuntar · soltar
                      </span>
                    </div>
                    <div
                      className="charge-track"
                      data-timing={
                        !charging
                          ? 'idle'
                          : chargeLate
                            ? 'late'
                            : Math.abs(power - PERFECT_CENTER) <=
                                PERFECT_WIDTH[settings.perfectDifficulty] / 2
                              ? 'perfect'
                              : 'charging'
                      }
                      ref={chargeMeter}
                      role="meter"
                      aria-label="Carga del remate"
                      aria-valuemin={0}
                      aria-valuemax={100}
                      aria-valuenow={Math.round(power * 100)}
                      style={
                        { '--charge': `${power * 100}%` } as React.CSSProperties
                      }
                    >
                      <div className="charge-fill" />
                      <div
                        className="charge-perfect-zone"
                        style={{
                          left: `${(PERFECT_CENTER - PERFECT_WIDTH[settings.perfectDifficulty] / 2) * 100}%`,
                          width: `${PERFECT_WIDTH[settings.perfectDifficulty] * 100}%`,
                        }}
                      />
                      <div className="charge-needle" />
                    </div>
                    <div className="charge-details">
                      <span>
                        {Math.round(power * 100)}% ·{' '}
                        {charging
                          ? chargeAim < -0.12
                            ? 'APUNTANDO A IZQUIERDA'
                            : chargeAim > 0.12
                              ? 'APUNTANDO A DERECHA'
                              : 'APUNTANDO AL CENTRO'
                          : 'Anticipá el globo y armá antes del contacto'}
                      </span>
                      <span>
                        PERFECTO ·{' '}
                        {
                          {
                            facil: 'FÁCIL',
                            normal: 'NORMAL',
                            dificil: 'EXIGENTE',
                          }[settings.perfectDifficulty]
                        }
                      </span>
                    </div>
                  </div>
                ) : (
                  <div className="power-row">
                    <span>
                      {controlLabel('quick')} <b>sacar / golpe directo</b>
                    </span>
                    <div className="power-track">
                      <i style={{ width: `${power * 100}%` }} />
                    </div>
                    <span>
                      {power > 0
                        ? `${Math.round(power * 100)}%`
                        : `MANTENÉ ${controlLabel('smash')} PARA CARGAR EL REMATE`}
                    </span>
                  </div>
                )}
              </div>
              <div className="control-hints">
                <span>
                  <kbd>
                    {activeDevice === 'gamepad'
                      ? 'STICK IZQ.'
                      : `${controlLabel('up')} ${controlLabel('left')} ${controlLabel('down')} ${controlLabel('right')}`}
                  </kbd>{' '}
                  mover
                </span>
                <span>
                  <kbd>
                    {activeDevice === 'gamepad'
                      ? 'STICK DER.'
                      : `${controlLabel('aimLeft')} / ${controlLabel('aimRight')}`}
                  </kbd>{' '}
                  dirigir
                </span>
                <span>
                  <kbd>{controlLabel('switch')}</kbd> cambiar jugador
                </span>
                <button onClick={help}>
                  Controles <CircleHelp size={14} />
                </button>
              </div>
              <div className="touch-controls">
                <div
                  className="joystick"
                  role="group"
                  aria-label="Mover jugador"
                  onPointerDown={(e) => {
                    e.currentTarget.setPointerCapture(e.pointerId);
                    onTouchMove(e);
                  }}
                  onPointerMove={onTouchMove}
                  onPointerUp={() => (touch.current = { x: 0, z: 0 })}
                  onPointerCancel={() => (touch.current = { x: 0, z: 0 })}
                >
                  <span>✥</span>
                </div>
                <button
                  className="touch-hit"
                  onPointerDown={(e) => {
                    e.currentTarget.setPointerCapture(e.pointerId);
                    if (shot === 'remate') beginCharge();
                    else quickHit();
                  }}
                  onPointerUp={releaseCharge}
                  onPointerCancel={cancelCharge}
                >
                  {shot === 'remate' ? 'CARGAR' : 'GOLPEAR'}
                </button>
              </div>
            </>
          )}
        </>
      )}
      {showSettings && (
        <GameDialog
          title={
            screen === 'menu'
              ? 'Configurar partido'
              : 'Ajustar controles y remate'
          }
          onClose={() => {
            cancelMapping();
            setShowSettings(false);
          }}
        >
          <section className="dialog settings-panel">
            <button
              className="close-button"
              aria-label="Cerrar configuración"
              onClick={() => {
                cancelMapping();
                setShowSettings(false);
              }}
            >
              <X />
            </button>
            <span className="eyebrow">
              {screen === 'menu'
                ? 'ANTES DEL PRIMER PUNTO'
                : 'AJUSTES EN JUEGO'}
            </span>
            <h2>{screen === 'menu' ? 'Tu partido.' : 'Tu manera de jugar.'}</h2>
            {screen === 'menu' && (
              <>
                <Choice
                  label="Pareja rival"
                  value={String(settings.opponent)}
                  onChange={(v) => config({ opponent: Number(v) })}
                  items={teams
                    .map((t, i) => ({
                      value: String(i),
                      label: t.name,
                    }))
                    .filter((t) => Number(t.value) !== settings.team)}
                />
                <div className="settings-grid">
                  <Choice
                    label="Dificultad"
                    value={settings.difficulty}
                    onChange={(v) =>
                      config({ difficulty: v as Settings['difficulty'] })
                    }
                    items={[
                      { value: 'facil', label: 'Club · fácil' },
                      { value: 'normal', label: 'Competición · normal' },
                      { value: 'dificil', label: 'Profesional · difícil' },
                    ]}
                  />
                  <Choice
                    label="Duración"
                    value={settings.format}
                    onChange={(v) =>
                      config({ format: v as Settings['format'] })
                    }
                    items={[
                      { value: 'rapido', label: 'Set corto · 3 juegos' },
                      { value: 'set', label: 'Un set · 6 juegos' },
                      { value: 'partido', label: 'Partido · 3 sets' },
                    ]}
                  />
                </div>
              </>
            )}
            <section
              className="controls-settings"
              aria-label="Configuración de controles"
            >
              <Choice
                label="Controles"
                value={settings.controlScheme}
                onChange={(v) => config({ controlScheme: v as ControlScheme })}
                items={[
                  { value: 'simple', label: 'Simple · tres botones y combos' },
                  { value: 'clasico', label: 'Clásico · una tecla por golpe' },
                ]}
              />
              <p className="control-scheme-summary">
                {simpleControls
                  ? `${keyLabel(settings.bindings.keyboard.base)} base · ${keyLabel(settings.bindings.keyboard.control)} control · ${keyLabel(settings.bindings.keyboard.smash)} remate. El armado se adapta a la pelota.`
                  : 'Acceso directo a cada golpe. El joystick conserva las tres familias y sus combos.'}
              </p>
              <output
                className={`gamepad-status ${padInfo.connected ? 'connected' : ''}`}
              >
                <Gamepad2 size={20} />
                <span>
                  <b>
                    {padInfo.connected
                      ? 'Joystick conectado'
                      : 'Joystick listo para conectar'}
                  </b>
                  <small>
                    {padInfo.connected
                      ? padInfo.name
                      : 'Conectá por USB o Bluetooth y presioná un botón.'}
                  </small>
                </span>
              </output>
              {padInfo.connected && !padInfo.standard && (
                <p className="binding-note">
                  El navegador no reconoce un esquema estándar. Revisá y
                  reasigná sus botones.
                </p>
              )}
              <details className="mapping-details">
                <summary>Personalizar teclas y botones</summary>
                <fieldset
                  className="mapping-tabs"
                  aria-label="Dispositivo a configurar"
                >
                  <button
                    aria-pressed={mappingDevice === 'keyboard'}
                    onClick={() => {
                      cancelMapping();
                      setMappingDevice('keyboard');
                    }}
                  >
                    <Keyboard size={15} /> Teclado
                  </button>
                  <button
                    aria-pressed={mappingDevice === 'gamepad'}
                    onClick={() => {
                      cancelMapping();
                      setMappingDevice('gamepad');
                    }}
                  >
                    <Gamepad2 size={15} /> Joystick
                  </button>
                </fieldset>
                <p className="binding-note">
                  Elegí una acción y presioná la nueva tecla o botón. Si ya se
                  usa, intercambiamos las dos asignaciones.
                </p>
                {mappingDevice === 'gamepad' && (
                  <p className="gamepad-live">
                    Botones detectados: <b>{padInfo.buttons || 'ninguno'}</b> ·
                    stick izquierdo mueve · derecho apunta.
                  </p>
                )}
                <div className="mapping-grid">
                  {relevantActions(
                    mappingDevice === 'gamepad'
                      ? 'simple'
                      : settings.controlScheme,
                  ).map((action) => (
                    <button
                      key={action}
                      className={
                        bindingCapture?.action === action ? 'listening' : ''
                      }
                      aria-label={`Reasignar ${ACTION_LABELS[action]}`}
                      onClick={() => beginMapping(action)}
                    >
                      <span>{ACTION_LABELS[action]}</span>
                      <kbd>
                        {bindingCapture?.action === action
                          ? 'Presioná…'
                          : mappingDevice === 'keyboard'
                            ? keyLabel(settings.bindings.keyboard[action])
                            : padLabel(settings.bindings.gamepad[action])}
                      </kbd>
                    </button>
                  ))}
                </div>
                {bindingCapture && (
                  <output className="binding-capture">
                    Esperando{' '}
                    {bindingCapture.device === 'keyboard'
                      ? 'una tecla'
                      : 'un botón del joystick'}{' '}
                    para {ACTION_LABELS[bindingCapture.action]}.{' '}
                    <button onClick={cancelMapping}>Cancelar</button>
                  </output>
                )}
                {bindingMessage && (
                  <output className="binding-note binding-message">
                    {bindingMessage}
                  </output>
                )}
                <button
                  className="reset-bindings"
                  onClick={() => {
                    cancelMapping();
                    config({ bindings: normalizeBindings(DEFAULT_BINDINGS) });
                    setBindingMessage('Teclas y botones restaurados.');
                  }}
                >
                  <RotateCcw size={14} /> Restaurar controles
                </button>
                <label className="volume-label">
                  Zona muerta del joystick{' '}
                  <span>{Math.round(settings.gamepadDeadzone * 100)}%</span>
                </label>
                <Slider
                  aria-label="Zona muerta del joystick"
                  min={5}
                  max={40}
                  value={[Math.round(settings.gamepadDeadzone * 100)]}
                  onValueChange={(v) =>
                    config({
                      gamepadDeadzone: (Array.isArray(v) ? v[0] : v) / 100,
                    })
                  }
                />
                <label className="vibration-toggle">
                  <input
                    type="checkbox"
                    checked={settings.vibration}
                    onChange={(e) => config({ vibration: e.target.checked })}
                  />{' '}
                  Vibración al rematar perfecto, si el dispositivo la admite
                </label>
              </details>
            </section>
            <Choice
              label="Ventana del remate perfecto"
              value={settings.perfectDifficulty}
              onChange={(v) =>
                config({ perfectDifficulty: v as PerfectDifficulty })
              }
              items={[
                { value: 'facil', label: 'Fácil · zona verde amplia' },
                { value: 'normal', label: 'Normal · buen timing' },
                { value: 'dificil', label: 'Exigente · precisión máxima' },
              ]}
            />
            <p className="charge-setting-tip">
              Sólo cambia el margen de la barra. La altura y la posición también
              cuentan.
            </p>
            {screen === 'menu' && (
              <Choice
                label="Torneo y escenario"
                value={String(settings.venue)}
                onChange={(v) => config({ venue: Number(v) })}
                items={VENUES.map((v, i) => ({
                  value: String(i),
                  label: `${v.name} · ${v.arena}`,
                }))}
              />
            )}
            <Choice
              label="Cámara"
              value={settings.camera}
              onChange={(v) => config({ camera: v as Settings['camera'] })}
              items={[
                { value: 'tv', label: 'Transmisión' },
                { value: 'cerca', label: 'A pie de pista' },
                { value: 'cenital', label: 'Táctica' },
              ]}
            />
            <label className="volume-label">
              Volumen <span>{Math.round(settings.volume * 100)}%</span>
            </label>
            <Slider
              aria-label="Volumen"
              min={0}
              max={100}
              value={[Math.round(settings.volume * 100)]}
              onValueChange={(v) =>
                config({ volume: (Array.isArray(v) ? v[0] : v) / 100 })
              }
            />
            <p className="fine-print">
              Parejas basadas en Madrid P1 2026. Arenas y atributos recreados
              para el juego.
            </p>
            <button
              className="start-button"
              onClick={() => {
                cancelMapping();
                setShowSettings(false);
              }}
            >
              LISTO <Check size={20} />
            </button>
          </section>
        </GameDialog>
      )}
      {screen === 'pause' && !showSettings && (
        <GameDialog
          title="Partido en pausa"
          onClose={() => changeScreen('play')}
        >
          <section className="dialog pause-panel">
            <span className="eyebrow">TIEMPO FUERA</span>
            <h2>
              Respirá.
              <br />
              El punto espera.
            </h2>
            <button
              className="start-button"
              onClick={() => {
                void audio.current?.start();
                changeScreen('play');
              }}
            >
              CONTINUAR <Play size={20} />
            </button>
            <button className="menu-action" onClick={help}>
              Controles y golpes <CircleHelp size={18} />
            </button>
            <button
              className="menu-action"
              onClick={() => setShowSettings(true)}
            >
              Controles y remate <Settings2 size={18} />
            </button>
            {mode === 'circuito' && (
              <button
                className="menu-action"
                onClick={() => setShowBracket((v) => !v)}
              >
                Ver cuadro <Trophy size={18} />
              </button>
            )}
            <button
              className="menu-action"
              onClick={() => {
                config({ camera: settings.camera === 'tv' ? 'cenital' : 'tv' });
              }}
            >
              Cámara:{' '}
              {settings.camera === 'tv'
                ? 'Transmisión'
                : settings.camera === 'cerca'
                  ? 'A pie de pista'
                  : 'Táctica'}{' '}
              <Camera size={18} />
            </button>
            <button className="menu-action" onClick={menu}>
              Volver al inicio <ChevronLeft size={18} />
            </button>
            <small className="performance">{fps} FPS · Three.js</small>
          </section>
        </GameDialog>
      )}
      {screen === 'help' && (
        <GameDialog
          title="Controles y reglas"
          onClose={() => changeScreen(returnTo.current)}
        >
          <section className="dialog help-panel">
            <button
              className="close-button"
              aria-label="Cerrar controles"
              onClick={() => changeScreen(returnTo.current)}
            >
              <X />
            </button>
            <span className="eyebrow">EL PÁDEL SE JUEGA CON LAS PAREDES</span>
            <h2>
              El próximo punto
              <br />
              es tuyo.
            </h2>
            <div className="help-columns">
              <div>
                <h3>Tres botones. Todos los recursos.</h3>
                <details className="signature-help">
                  <summary>Festejo secreto de Lebrón</summary>
                  <p>
                    Cuando su pareja gana el partido, tenés ocho segundos para
                    ingresar:
                  </p>
                  <p className="signature-help-code">
                    {signatureLabels.map((label, index) => (
                      <kbd key={index}>{label}</kbd>
                    ))}
                  </p>
                  <p>
                    Son seis pulsaciones seguidas: abajo, abajo, arriba,
                    derecha, base y control. Con teclado clásico, la última es
                    globo. Soltá cada tecla; completalo en 3,2 segundos. En
                    joystick, usá la cruceta y los botones correspondientes.
                  </p>
                  <p>
                    Lebrón se saca la camiseta y la muestra a los rivales. Sólo
                    se activa tras ganar el partido, una vez por victoria.
                  </p>
                </details>
                <p>
                  <kbd>
                    {controlLabel('up')} {controlLabel('left')}{' '}
                    {controlLabel('down')} {controlLabel('right')}
                  </kbd>{' '}
                  mové al jugador. El stick izquierdo hace lo mismo.
                </p>
                <p>
                  <kbd>{controlLabel('base')}</kbd> base: plano, volea o bajada
                  según la pelota.
                </p>
                <p>
                  <kbd>{controlLabel('control')}</kbd> control: bandeja si viene
                  alta; toque cortado si viene baja.
                </p>
                <p>
                  <kbd>
                    {controlLabel('base')} → {controlLabel('control')}
                  </kbd>{' '}
                  globo.{' '}
                  <kbd>
                    {controlLabel('control')} → {controlLabel('base')}
                  </kbd>{' '}
                  dejada o chiquita.
                </p>
                <p>
                  <kbd>
                    {controlLabel('base')} + {controlLabel('control')}
                  </kbd>{' '}
                  juntos: víbora alta o volea baja.
                </p>
                <p>
                  Para una secuencia, soltá el primero y tocá el segundo
                  enseguida. Un golpe simple espera 0,22 segundos para reconocer
                  el combo.
                </p>
                <p>
                  <kbd>{controlLabel('smash')}</kbd> mantené para cargar; apuntá
                  y soltá en verde. <kbd>{controlLabel('smashMode')}</kbd>{' '}
                  cambia el remate.
                </p>
                <p>
                  <kbd>{controlLabel('quick')}</kbd> saque o golpe directo, sin
                  esperar combinaciones.
                </p>
                <p>
                  <kbd>
                    {controlLabel('aimLeft')} / {controlLabel('aimRight')}
                  </kbd>{' '}
                  apuntá. <kbd>{controlLabel('wall')}</kbd> esperá vidrio.{' '}
                  <kbd>{controlLabel('switch')}</kbd> cambiá jugador.
                </p>
                <p>
                  Desde afuera, <kbd>{controlLabel('exteriorMode')}</kbd>{' '}
                  alterna puerta, pelota alta o red. La dirección y el contacto
                  deciden si entra.
                </p>
                <p>
                  En configuración podés reasignar teclas y botones, ajustar la
                  zona muerta o elegir el esquema clásico.
                </p>
              </div>
              <div>
                <h3>Diez golpes de pádel</h3>
                {SHOTS.map((s) => (
                  <div className="help-shot" key={s.id}>
                    <kbd>
                      {simpleControls
                        ? s.id === 'remate'
                          ? controlLabel('smash')
                          : s.id === 'globo'
                            ? `${controlLabel('base')}→${controlLabel('control')}`
                            : ['dejada', 'chiquita'].includes(s.id)
                              ? `${controlLabel('control')}→${controlLabel('base')}`
                              : s.id === 'vibora'
                                ? `${controlLabel('base')}+${controlLabel('control')}`
                                : s.id === 'bandeja'
                                  ? controlLabel('control')
                                  : s.id === 'contrapared'
                                    ? 'MÁS'
                                    : controlLabel('base')
                        : shotKeyLabel(s.id)}
                    </kbd>
                    <p>
                      <strong>{s.name}</strong>
                      <span>{s.tip}</span>
                    </p>
                  </div>
                ))}
              </div>
            </div>
            <button
              className="start-button"
              onClick={() => changeScreen(returnTo.current)}
            >
              ENTENDIDO <ArrowRight size={20} />
            </button>
          </section>
        </GameDialog>
      )}
      {screen === 'result' && state && (
        <GameDialog title="Resultado del partido" onClose={menu}>
          <section className="dialog result-panel">
            <div className="result-icon">
              {state.winner === 0 ? <Trophy size={38} /> : <Target size={38} />}
            </div>
            <span className="eyebrow">
              {mode === 'circuito' ? roundNames[round] : 'PARTIDO TERMINADO'}
            </span>
            <h2>
              {state.winner === 0
                ? mode === 'circuito' && round === roundNames.length - 1
                  ? settings.circuit === 'femenino'
                    ? 'Campeonas.'
                    : 'Campeones.'
                  : 'El partido es tuyo.'
                : 'Una más.'}
            </h2>
            <p>{state.winner === 0 ? playerTeam.name : opponent.name}</p>
            <div className="result-score">
              {state.score.history.length ? (
                state.score.history.map((s, i) => (
                  <span key={i}>
                    {s[0]} <em>—</em> {s[1]}
                  </span>
                ))
              ) : (
                <span>
                  {state.score.games[0]} — {state.score.games[1]}
                </span>
              )}
            </div>
            {mode === 'circuito' &&
            state.winner === 0 &&
            round < roundNames.length - 1 ? (
              <button className="start-button" onClick={() => start(round + 1)}>
                JUGAR {roundNames[round + 1].toUpperCase()}{' '}
                <ArrowRight size={20} />
              </button>
            ) : (
              <button className="start-button" onClick={() => start()}>
                VOLVER A JUGAR <RotateCcw size={20} />
              </button>
            )}
            <button className="menu-action" onClick={menu}>
              Volver al inicio <ChevronLeft size={18} />
            </button>
            {mode === 'circuito' && (
              <div className="round-results">
                {roundResults.map((r, i) => (
                  <span key={i}>
                    {roundNames[i]} <b>{r}</b>
                  </span>
                ))}
              </div>
            )}
          </section>
        </GameDialog>
      )}
      {showBracket && (
        <GameDialog
          title="Cuadro del torneo"
          onClose={() => setShowBracket(false)}
        >
          <section className="dialog">
            <button
              className="close-button"
              aria-label="Cerrar cuadro"
              onClick={() => setShowBracket(false)}
            >
              <X />
            </button>
            <span className="eyebrow">{venue.name}</span>
            <h2>Camino al título.</h2>
            <div className="bracket">
              {tournamentOpponents.map((o, i) => (
                <div className={round === i ? 'current' : ''} key={i}>
                  <span>{roundNames[i]}</span>
                  <strong>{playerTeam.name}</strong>
                  <strong>{teams[o].name}</strong>
                  <small>
                    {roundResults[i] ??
                      (i === round ? 'EN JUEGO' : 'PRÓXIMO RIVAL')}
                  </small>
                </div>
              ))}
            </div>
            <p className="fine-print">
              Cuadro reducido de tres rondas. Rivales predefinidos para esta
              edición.
            </p>
          </section>
        </GameDialog>
      )}
    </main>
  );
}
