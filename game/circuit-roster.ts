import { TEAMS } from './catalog';
import { PLAYER_PROFILES, type PlayerAppearance } from './player-profiles';
import { WOMEN_PROFILES, WOMEN_TEAMS } from './women-roster';

export type Circuit = 'masculino' | 'femenino';
export const circuitTeams = (circuit: Circuit = 'masculino') =>
  circuit === 'femenino' ? WOMEN_TEAMS : TEAMS;
export const circuitRounds = (circuit: Circuit = 'masculino') =>
  circuit === 'femenino'
    ? ['Semifinal', 'Final']
    : ['Cuartos de final', 'Semifinal', 'Final'];

export function circuitOpponents(
  circuit: Circuit,
  selectedTeam: number,
): number[] {
  const pool = circuitTeams(circuit)
    .map((_, i) => i)
    .filter((i) => i !== selectedTeam);
  return circuit === 'femenino'
    ? [pool[pool.length - 1], pool[0]]
    : [pool[pool.length - 1], pool[Math.min(3, pool.length - 1)], pool[0]];
}

export function teamAppearances(
  teamIndex: number,
  circuit: Circuit = 'masculino',
): PlayerAppearance[] {
  const teams = circuitTeams(circuit),
    team = teams[teamIndex] ?? teams[0];
  const profiles = circuit === 'femenino' ? WOMEN_PROFILES : PLAYER_PROFILES;
  return team.players.map((name) => {
    const player = Object.values(profiles).find((p) => p.name === name);
    if (!player) throw new Error(`Falta el perfil de ${name}`);
    return player;
  });
}

export function matchAppearances(
  teamIndex = 0,
  opponentIndex = 1,
  circuit: Circuit = 'masculino',
): PlayerAppearance[] {
  return [
    ...teamAppearances(teamIndex, circuit),
    ...teamAppearances(opponentIndex, circuit),
  ];
}
