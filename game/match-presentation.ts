import type { GameState, Team, PointOutcome } from './physics';

export interface PresentationState {
  id: number;
  phase: 'celebration' | 'walk' | 'bench' | 'return';
  progress: number;
  winnerTeam: Team | null;
  focusTeam: Team | null;
  frustration: [number, number];
  lebronIntensity: number;
  dialogue: string;
  changeEnds: boolean;
}

const clamp = (value: number) => Math.max(0, Math.min(1, value));
export function teamFrustration(s: GameState, team: Team): number {
  const other = 1 - team;
  const games = s.score.history.at(-1) ?? s.score.games;
  const liveGames = s.lastPoint?.set ? games : s.score.games;
  return clamp(
    0.12 +
      (s.score.sets[other] - s.score.sets[team]) * 0.3 +
      (liveGames[other] - liveGames[team]) * 0.115 +
      (s.pointWinner === other ? 0.16 : -0.08),
  );
}

/** Original fictional dialogue, never a quotation or voice imitation. */
function benchDialogue(p: PresentationState, point: PointOutcome): string {
  if (p.lebronIntensity > 0.64)
    return 'Lebrón: «¡Dale, carajo! ¡Esa era tuya!» · Entrenador: «Respirá. Jueguen juntos.»';
  if (p.lebronIntensity > 0.3)
    return 'Lebrón: «¡Hablame! No podemos regalar otra.» · Compañero: «La próxima, juntos.»';
  const stress = p.frustration[p.focusTeam ?? 0];
  if (stress > 0.55)
    return 'Entrenador: «Bajá una marcha. Globo profundo y recuperamos la red.»';
  if (point.set)
    return 'Entrenador: «Arrancamos de cero. Primer saque y paciencia con el vidrio.»';
  if (stress > 0.25)
    return 'Entrenador: «Hablense. Cerrá el medio y dejá salir la pelota.»';
  return 'Entrenador: «Vamos bien. Juntos en la red y elegí la pelota para atacar.»';
}

/** Presentation clock is separate from simulation. It never advances a point. */
export class MatchPresentation {
  private seen = 0;
  private elapsed = 0;
  private point: PointOutcome | null = null;
  private template: PresentationState | null = null;
  private phases: Array<{
    phase: PresentationState['phase'];
    duration: number;
  }> = [];

  reset(): void {
    this.seen = 0;
    this.elapsed = 0;
    this.point = null;
    this.template = null;
    this.phases = [];
  }
  skip(): void {
    this.point = null;
    this.template = null;
    this.phases = [];
  }
  get active(): boolean {
    return this.point !== null;
  }

  update(
    state: GameState,
    dt: number,
    playerIds: readonly string[],
    enabled = true,
  ): PresentationState | null {
    const point = state.lastPoint;
    if (!enabled) {
      this.skip();
      if (point) this.seen = point.id;
      return null;
    }
    if (point && point.id !== this.seen) {
      this.seen = point.id;
      this.point = point;
      this.elapsed = 0;
      const frustration: [number, number] = [
        teamFrustration(state, 0),
        teamFrustration(state, 1),
      ];
      const lebronIndex = playerIds.findIndex((id) =>
        id.toLowerCase().includes('lebron'),
      );
      const lebronTeam: Team | null =
        lebronIndex < 0 ? null : lebronIndex < 2 ? 0 : 1;
      const focusTeam: Team =
        lebronTeam !== null && frustration[lebronTeam] > 0.3
          ? lebronTeam
          : frustration[0] > frustration[1]
            ? 0
            : 1;
      this.template = {
        id: point.id,
        phase: 'celebration',
        progress: 0,
        winnerTeam: point.winner,
        focusTeam,
        frustration,
        lebronIntensity: lebronTeam === null ? 0 : frustration[lebronTeam],
        dialogue: '',
        changeEnds: point.changeEnds,
      };
      this.phases = [
        {
          phase: 'celebration',
          duration: point.match ? 3.8 : point.game ? 2 : 1.35,
        },
      ];
      if (!point.match && point.rest !== 'none') {
        this.phases.push(
          { phase: 'walk', duration: 6 },
          { phase: 'bench', duration: point.set ? 7 : 5.8 },
          { phase: 'return', duration: 6 },
        );
      } else if (!point.match && point.changeEnds) {
        // FIP: after the first game / during a tie-break, change without sitting.
        this.phases.push(
          { phase: 'walk', duration: 5 },
          { phase: 'return', duration: 5 },
        );
      }
    }
    if (!this.point || !this.template) return null;
    this.elapsed += Math.max(0, Math.min(0.1, dt));
    let time = this.elapsed;
    for (const item of this.phases) {
      if (time < item.duration) {
        const result = {
          ...this.template,
          phase: item.phase,
          progress: time / item.duration,
        };
        result.dialogue =
          item.phase === 'bench'
            ? benchDialogue(result, this.point)
            : item.phase === 'walk'
              ? this.point.set
                ? 'Fin del set · Conversación con el equipo'
                : 'Cambio de lado'
              : item.phase === 'return'
                ? 'Volvemos a la pista'
                : this.point.match
                  ? 'Partido. Saludo a los rivales.'
                  : this.point.game
                    ? 'Juego. ¡Vamos!'
                    : '¡Buen punto!';
        return result;
      }
      time -= item.duration;
    }
    this.skip();
    return null;
  }
}
