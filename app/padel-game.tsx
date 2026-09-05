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
  type GameState,
  type Input,
  type Shot,
} from '@/game/physics';
import { PadelRenderer } from '@/game/renderer';
import { PadelAudio } from '@/game/audio';
import { TEAMS, VENUES, SHOTS } from '@/game/catalog';
import { keyboardShot, SHOT_KEYS } from '@/game/controls';

type Screen = 'menu' | 'play' | 'pause' | 'help' | 'result';
type Mode = 'partido' | 'circuito' | 'entrenamiento';
type Settings = {
  team: number;
  opponent: number;
  venue: number;
  difficulty: 'facil' | 'normal' | 'dificil';
  format: 'rapido' | 'set' | 'partido';
  camera: 'tv' | 'cerca' | 'cenital';
  volume: number;
};
const DEFAULTS: Settings = {
  team: 0,
  opponent: 1,
  venue: 0,
  difficulty: 'normal',
  format: 'rapido',
  camera: 'tv',
  volume: 0.45,
};
const BASE_INPUT: Input = {
  moveX: 0,
  moveZ: 0,
  hit: false,
  shot: 'plano',
  power: 0.6,
  aim: 0,
};
const ROUND_NAMES = ['Cuartos de final', 'Semifinal', 'Final'];
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
  const input = useRef<Input>({ ...BASE_INPUT });
  const screenRef = useRef<Screen>('menu');
  const charge = useRef<number | null>(null);
  const startFromKeyboard = useRef<() => void>(() => {});
  const touch = useRef({ x: 0, z: 0 });
  const hydrated = useRef(false);
  const [screen, setScreen] = useState<Screen>('menu');
  const [ready, setReady] = useState(false);
  const [error, setError] = useState('');
  const [state, setState] = useState<GameState | null>(null);
  const [settings, setSettings] = useState<Settings>(DEFAULTS);
  const settingsRef = useRef(DEFAULTS);
  const [mode, setMode] = useState<Mode>('partido');
  const [shot, setShot] = useState<Shot>('plano');
  const [power, setPower] = useState(0);
  const [waitWall, setWaitWall] = useState(false);
  const [smash, setSmash] = useState<'retorno' | 'por3' | 'por4'>('retorno');
  const [drill, setDrill] = useState<
    'libre' | 'pared' | 'doble-pared' | 'remate'
  >('libre');
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
  const changeScreen = (s: Screen) => {
    screenRef.current = s;
    setScreen(s);
    keys.current.clear();
    charge.current = null;
    input.current.hit = false;
    setPower(0);
  };
  const config = (patch: Partial<Settings>) =>
    setSettings((p) => ({ ...p, ...patch }));
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
      if (saved) setSettings({ ...DEFAULTS, ...saved });
      setWins(Number(localStorage.getItem('premier-padel-trophies') || 0));
    } catch {}
    hydrated.current = true;
  }, []);
  useEffect(() => {
    if (!host.current) return;
    let raf = 0;
    let previous = performance.now();
    let accumulator = 0;
    let publish = 0;
    let lastEvent = -1;
    let pointTimer = 0;
    let measured = 0;
    let frames = 0;
    let dead = false;
    try {
      renderer.current = new PadelRenderer(host.current, {
        quality: 'alta',
        venue: VENUES[settingsRef.current.venue].id,
      });
      renderer.current.setCamera(settingsRef.current.camera);
      match.current = new PadelMatch({
        autoPlay: true,
        difficulty: 'normal',
        gamesToWin: 3,
        setsToWin: 1,
      });
      audio.current = new PadelAudio();
      setReady(true);
    } catch (e) {
      setError(
        e instanceof Error ? e.message : 'No pudimos iniciar el motor 3D.',
      );
      return;
    }
    const tick = (now: number) => {
      if (dead) return;
      const dt = Math.min((now - previous) / 1000, 0.05);
      previous = now;
      accumulator += dt;
      publish += dt;
      measured += dt;
      frames++;
      const m = match.current!;
      const active =
        screenRef.current === 'play' || screenRef.current === 'menu';
      if (active) {
        while (accumulator >= 1 / 120) {
          const k = keys.current;
          const sx =
            (k.has('ArrowRight') || k.has('KeyD') ? 1 : 0) -
            (k.has('ArrowLeft') || k.has('KeyA') ? 1 : 0);
          const sz =
            (k.has('ArrowDown') || k.has('KeyS') ? 1 : 0) -
            (k.has('ArrowUp') || k.has('KeyW') ? 1 : 0);
          const command = {
            ...input.current,
            moveX: sx || touch.current.x,
            moveZ: sz || touch.current.z,
            waitWall: input.current.waitWall || k.has('KeyB'),
            aim: k.has('KeyQ')
              ? -0.85
              : k.has('KeyE')
                ? 0.85
                : input.current.aim,
          };
          m.update(
            1 / 120,
            screenRef.current === 'menu' ? BASE_INPUT : command,
          );
          input.current.hit = false;
          input.current.switchPlayer = false;
          accumulator -= 1 / 120;
        }
      } else accumulator = 0;
      const s = m.getState();
      renderer.current!.render(s, dt);
      if (active && s.eventId !== lastEvent) {
        if (screenRef.current === 'play')
          audio.current?.play(s.eventType, s.ball.x, input.current.power);
        lastEvent = s.eventId;
      }
      if (active && s.phase === 'point') {
        pointTimer += dt;
        if (pointTimer > 3.1) {
          m.nextPoint();
          pointTimer = 0;
        }
      } else pointTimer = 0;
      if (screenRef.current === 'menu' && s.phase === 'finished')
        match.current = new PadelMatch({
          autoPlay: true,
          gamesToWin: 3,
          setsToWin: 1,
        });
      if (screenRef.current === 'play' && s.phase === 'finished') {
        screenRef.current = 'result';
        setScreen('result');
      }
      if (publish > 0.09) {
        setState(JSON.parse(JSON.stringify(s)));
        if (charge.current !== null)
          setPower(Math.min(1, 0.35 + (now - charge.current) / 950));
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
      const target = e.target as HTMLElement;
      if (
        target?.closest(
          'input,textarea,[contenteditable="true"],[role="combobox"],[role="listbox"],select',
        )
      )
        return;
      // Dialog buttons keep their native keyboard behavior, including Enter/Space.
      if (target?.closest('[role="dialog"]')) return;
      if (e.code === 'Escape' && !e.repeat) {
        if (screenRef.current === 'play') changeScreen('pause');
        else if (screenRef.current === 'pause') changeScreen('play');
        else if (screenRef.current === 'help') changeScreen(returnTo.current);
        return;
      }
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
      if (screenRef.current !== 'play') return;
      if (
        [
          'Space',
          'ArrowUp',
          'ArrowDown',
          'ArrowLeft',
          'ArrowRight',
          'Tab',
        ].includes(e.code)
      )
        e.preventDefault();
      keys.current.add(e.code);
      if (e.repeat) return;
      if (e.code === 'Tab') input.current.switchPlayer = true;
      if (e.code === 'KeyR') {
        const modes = ['retorno', 'por3', 'por4'] as const;
        const next =
          modes[
            (modes.indexOf(input.current.smash ?? 'retorno') + 1) % modes.length
          ];
        input.current.smash = next;
        setSmash(next);
      }
      const current = match.current?.getState();
      if (!current) return;
      const chosen =
        keyboardShot(e.code, current) ??
        SHOTS.find((s) => e.code === `Digit${s.key}`)?.id;
      if (!chosen) return;
      e.preventDefault();
      void audio.current?.start();
      if (current.phase === 'point') {
        match.current?.nextPoint();
        return;
      }
      // One key press selects AND swings; there is no second confirm or charge.
      input.current.shot = chosen;
      input.current.power = e.shiftKey ? 0.95 : 0.68;
      input.current.hit = true;
      setShot(chosen);
    };
    const keyup = (e: KeyboardEvent) => {
      keys.current.delete(e.code);
    };
    const blur = () => {
      keys.current.clear();
      charge.current = null;
      input.current.hit = false;
      if (screenRef.current === 'play') changeScreen('pause');
    };
    window.addEventListener('keydown', keydown);
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
      window.removeEventListener('keydown', keydown);
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
      if (round === 2) {
        setWins((w) => {
          try {
            localStorage.setItem('premier-padel-trophies', String(w + 1));
          } catch {}
          return w + 1;
        });
      }
    }
  }, [screen, state, mode, round]);
  const start = (
    nextRound = 0,
    chosenMode: Mode = mode,
    chosenDrill: typeof drill = drill,
  ) => {
    if (!ready || error) return;
    setMode(chosenMode);
    setDrill(chosenDrill);
    void audio.current?.start();
    const opp =
      chosenMode === 'circuito'
        ? nextRound === 0
          ? (() => {
              const pool = TEAMS.map((_, i) => i).filter(
                (i) => i !== settings.team,
              );
              const list = [
                pool[pool.length - 1],
                pool[Math.min(3, pool.length - 1)],
                pool[0],
              ];
              setTournamentOpponents(list);
              return list[0];
            })()
          : tournamentOpponents[nextRound]
        : settings.opponent;
    setMatchOpponent(opp);
    setRound(nextRound);
    if (nextRound === 0) setRoundResults([]);
    resultRecorded.current = false;
    match.current = new PadelMatch({
      difficulty: settings.difficulty,
      gamesToWin: settings.format === 'rapido' ? 3 : 6,
      setsToWin: settings.format === 'partido' ? 2 : 1,
      training: chosenMode === 'entrenamiento',
      drill: chosenDrill,
    });
    const openingShot: Shot =
      chosenMode === 'entrenamiento' && chosenDrill === 'remate'
        ? 'remate'
        : 'plano';
    input.current = { ...BASE_INPUT, shot: openingShot, smash: 'retorno' };
    setShot(openingShot);
    setSmash('retorno');
    setWaitWall(false);
    setState(JSON.parse(JSON.stringify(match.current.getState())));
    setShowSettings(false);
    setShowBracket(false);
    changeScreen('play');
  };
  startFromKeyboard.current = () => start(0, 'partido');
  const menu = () => {
    match.current = new PadelMatch({
      autoPlay: true,
      gamesToWin: 3,
      setsToWin: 1,
    });
    changeScreen('menu');
  };
  const selectShot = (id: Shot) => {
    input.current.shot = id;
    input.current.power = 0.68;
    input.current.hit = true;
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
  const venue = VENUES[settings.venue];
  const playerTeam = TEAMS[settings.team] ?? TEAMS[0];
  const opponent = TEAMS[matchOpponent] ?? TEAMS[1];
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
              EDICIÓN JUGABLE<span className="edition-sep">/</span>03
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
              WASD para moverte. JKL · UIO para golpear.
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
                    sub: 'Comenzar torneo de tres rondas.',
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
              <Choice
                label="Tu pareja"
                value={String(settings.team)}
                onChange={(v) => {
                  const team = Number(v);
                  config({
                    team,
                    opponent:
                      team === settings.opponent
                        ? (team + 1) % TEAMS.length
                        : settings.opponent,
                  });
                }}
                items={TEAMS.map((t, i) => ({
                  value: String(i),
                  label: t.name,
                }))}
              />
              <div className="team-meta">
                <span>{playerTeam.countries}</span>
                <span>{playerTeam.style}</span>
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
                <span>PREMIER PADEL</span>
                <span>
                  {mode === 'entrenamiento'
                    ? 'ENTRENAMIENTO'
                    : mode === 'circuito'
                      ? ROUND_NAMES[round].toUpperCase()
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
                    ? `PRÁCTICA · ${{ libre: 'PELOTEO', pared: 'VIDRIO', 'doble-pared': 'DOBLE PARED', remate: 'REMATE' }[drill]}`
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
          {screen === 'play' && (
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
                        ? 'Tocá ESPACIO para sacar. JKL · UIO ejecutan los golpes.'
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
                  <span>EJERCICIO</span>
                  {(
                    [
                      { id: 'libre', name: 'Peloteo' },
                      { id: 'pared', name: 'Vidrio' },
                      { id: 'doble-pared', name: 'Doble pared' },
                      { id: 'remate', name: 'Remate' },
                    ] as const
                  ).map((d) => (
                    <button
                      key={d.id}
                      className={drill === d.id ? 'active' : ''}
                      onClick={() => start(0, 'entrenamiento', d.id)}
                    >
                      {d.name}
                    </button>
                  ))}
                </div>
              )}
              <div className="tactical-hint" role="status">
                {state.tacticalHint}
              </div>
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
                      : 'JKL · UIO'}
                  </span>
                </div>
                <div className="shots">
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
                      onClick={() => selectShot(s.id)}
                      title={s.tip}
                    >
                      <kbd>{SHOT_KEYS[s.id]}</kbd>
                      <span>{s.name}</span>
                    </button>
                  ))}
                </div>
                <div className="padel-actions">
                  <button
                    aria-pressed={waitWall}
                    className={waitWall ? 'active' : ''}
                    onClick={toggleWall}
                  >
                    <kbd>B</kbd> Esperar vidrio
                  </button>
                  {shot === 'remate' ? (
                    <div
                      className="smash-options"
                      role="group"
                      aria-label="Tipo de remate"
                    >
                      <kbd title="R cambia el tipo de remate">R</kbd>
                      {(
                        [
                          { id: 'retorno', name: 'Traérmela' },
                          { id: 'por3', name: 'Por 3' },
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
                    onClick={quickHit}
                  >
                    {state.phase === 'point'
                      ? 'CONTINUAR'
                      : state.phase === 'serve'
                        ? state.players[state.server]?.team === 0
                          ? 'SACAR'
                          : 'PREPARATE'
                        : 'GOLPEAR'}{' '}
                    <Play size={12} />
                  </button>
                </div>
                <div className="power-row">
                  <span>
                    ESPACIO <b>sacar / golpe normal</b>
                  </span>
                  <div className="power-track">
                    <i style={{ width: `${power * 100}%` }} />
                  </div>
                  <span>
                    {power > 0
                      ? `${Math.round(power * 100)}%`
                      : 'SHIFT + GOLPE = MÁS POTENCIA'}
                  </span>
                </div>
              </div>
              <div className="control-hints">
                <span>
                  <kbd>W A S D</kbd> mover
                </span>
                <span>
                  <kbd>Q / E</kbd> dirigir
                </span>
                <span>
                  <kbd>TAB</kbd> cambiar jugador
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
                    charge.current = performance.now();
                  }}
                  onPointerUp={() => {
                    if (state.phase === 'point') match.current?.nextPoint();
                    else {
                      input.current.power = Math.min(
                        1,
                        0.35 +
                          (performance.now() -
                            (charge.current ?? performance.now())) /
                            950,
                      );
                      input.current.hit = true;
                    }
                    charge.current = null;
                  }}
                  onPointerCancel={() => (charge.current = null)}
                >
                  GOLPEAR
                </button>
              </div>
            </>
          )}
        </>
      )}
      {showSettings && (
        <GameDialog
          title="Configurar partido"
          onClose={() => setShowSettings(false)}
        >
          <section className="dialog settings-panel">
            <button
              className="close-button"
              aria-label="Cerrar configuración"
              onClick={() => setShowSettings(false)}
            >
              <X />
            </button>
            <span className="eyebrow">ANTES DEL PRIMER PUNTO</span>
            <h2>Tu partido.</h2>
            <Choice
              label="Pareja rival"
              value={String(settings.opponent)}
              onChange={(v) => config({ opponent: Number(v) })}
              items={TEAMS.map((t, i) => ({
                value: String(i),
                label: t.name,
              })).filter((t) => Number(t.value) !== settings.team)}
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
                onChange={(v) => config({ format: v as Settings['format'] })}
                items={[
                  { value: 'rapido', label: 'Set corto · 3 juegos' },
                  { value: 'set', label: 'Un set · 6 juegos' },
                  { value: 'partido', label: 'Partido · 3 sets' },
                ]}
              />
            </div>
            <Choice
              label="Torneo y escenario"
              value={String(settings.venue)}
              onChange={(v) => config({ venue: Number(v) })}
              items={VENUES.map((v, i) => ({
                value: String(i),
                label: `${v.name} · ${v.arena}`,
              }))}
            />
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
              onClick={() => setShowSettings(false)}
            >
              LISTO <Check size={20} />
            </button>
          </section>
        </GameDialog>
      )}
      {screen === 'pause' && (
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
                <h3>Movete y pegá</h3>
                <p>
                  <kbd>W A S D</kbd> o flechas: mové al jugador.
                </p>
                <p>
                  <kbd>J</kbd> golpe normal · <kbd>K</kbd> globo · <kbd>L</kbd>{' '}
                  remate.
                </p>
                <p>
                  <kbd>U</kbd> bandeja · <kbd>I</kbd> víbora · <kbd>O</kbd>{' '}
                  toque corto.
                </p>
                <p>
                  <kbd>ESPACIO</kbd> sacá o pegá normal. Una pulsación ejecuta
                  el golpe.
                </p>
                <p>
                  J elige plano, volea o bajada según la pelota. O juega
                  chiquita desde el fondo.
                </p>
                <p>
                  <kbd>SHIFT</kbd> junto al golpe: más potencia. <kbd>R</kbd>{' '}
                  cambia el tipo de remate.
                </p>
                <p>
                  <kbd>H</kbd> contrapared. Los números 1–9 y 0 ejecutan los
                  diez golpes originales.
                </p>
                <p>
                  <kbd>Q / E</kbd> dirigí a izquierda o derecha.
                </p>
                <p>
                  <kbd>B</kbd> dejá pasar la bola al vidrio. Soltá para devolver
                  tras el rebote.
                </p>
                <p>
                  Pegá cuando aparece «PEGÁ AHORA». No hace falta cargar ni
                  confirmar con otra tecla.
                </p>
                <p>
                  <kbd>TAB</kbd> cambiá de jugador. Tu compañero usa IA.
                </p>
                <p>
                  <kbd>ESC</kbd> pausá. Sin moverte, la asistencia te acerca a
                  la pelota.
                </p>
                <h3>Las reglas de la pista</h3>
                <p>
                  Sacá de abajo después del pique, al cuadro diagonal. Tenés dos
                  intentos.
                </p>
                <p>
                  La pelota puede tocar el vidrio después de picar. Devolvela
                  antes del segundo pique.
                </p>
                <p>
                  Star Point: después de dos ventajas, un punto decide el juego.
                </p>
                <p>
                  La malla después del saque es falta. El vidrio después del
                  pique es válido.
                </p>
                <h3>Jugá como en pádel</h3>
                <p>
                  Defendé con la pared. Un globo profundo permite que tu pareja
                  suba a la red.
                </p>
                <p>
                  La bandeja conserva la red; la víbora busca un rebote bajo y
                  lateral.
                </p>
                <p>
                  Elegí Remate y Traérmela: el pique y el vidrio pueden
                  devolverla a tu campo.
                </p>
                <p>
                  Ese regreso sigue en juego: el rival puede alcanzarlo sobre la
                  red sin tocarla.
                </p>
                <p>
                  Por tres y por cuatro exigen altura, posición y potencia. La
                  recuperación exterior queda pendiente.
                </p>
              </div>
              <div>
                <h3>Diez golpes de pádel</h3>
                {SHOTS.map((s) => (
                  <div className="help-shot" key={s.id}>
                    <kbd>{SHOT_KEYS[s.id]}</kbd>
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
              {mode === 'circuito' ? ROUND_NAMES[round] : 'PARTIDO TERMINADO'}
            </span>
            <h2>
              {state.winner === 0
                ? mode === 'circuito' && round === 2
                  ? 'Campeones.'
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
            {mode === 'circuito' && state.winner === 0 && round < 2 ? (
              <button className="start-button" onClick={() => start(round + 1)}>
                JUGAR {ROUND_NAMES[round + 1].toUpperCase()}{' '}
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
                    {ROUND_NAMES[i]} <b>{r}</b>
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
                  <span>{ROUND_NAMES[i]}</span>
                  <strong>{playerTeam.name}</strong>
                  <strong>{TEAMS[o].name}</strong>
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
