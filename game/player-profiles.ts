import { TEAMS } from './catalog';

/** Public FIP heights/positions; visual interpretations of official portraits and kits.
 * Sources and the distinction between replicas and approximations: PLAYERS-V4.md.
 * Playing side means court position, never the hand holding the racket.
 */
export interface PlayerAppearance {
  id: string;
  name: string;
  surname: string;
  height: number;
  handedness: 'right' | 'left';
  playingSide: 'left' | 'right';
  build: 'compact' | 'athletic' | 'tall';
  gender?: 'female' | 'male';
  skin: string;
  hair: string;
  hairStyle:
    | 'short'
    | 'crop'
    | 'curly'
    | 'swept'
    | 'ponytail'
    | 'bun'
    | 'braid';
  beard: 'none' | 'stubble' | 'full';
  headband?: string;
  /** Sculpting ratios interpreted from the official portraits, not biometric measurements. */
  face?: { jaw: number; nose: number; eyes: number; brow: number; lip: number };
  kit: {
    shirt: string;
    shorts: string;
    accent: string;
    ink: string;
    brand: string;
    sponsor: string;
    backSponsor?: string;
    backName?: string;
    sleeveSponsors?: [string, string];
    cut?: 'sleeves' | 'sleeveless';
    bottom?: 'shorts' | 'skirt';
    pattern: 'plain' | 'diagonal' | 'shoulder' | 'blocks' | 'corner';
  };
  racket: {
    color: string;
    accent: string;
    brand: string;
    shape: 'round' | 'teardrop' | 'diamond';
  };
}

function profile(
  id: string,
  name: string,
  surname: string,
  height: number,
  playingSide: PlayerAppearance['playingSide'],
  hairStyle: PlayerAppearance['hairStyle'],
  beard: PlayerAppearance['beard'],
  brand: string,
  shirt: string,
  accent: string,
  overrides: Partial<PlayerAppearance> = {},
): PlayerAppearance {
  return {
    id,
    name,
    surname,
    height,
    playingSide,
    handedness: 'right',
    build: height >= 1.87 ? 'tall' : height <= 1.76 ? 'compact' : 'athletic',
    skin: '#c99777',
    hair: '#28221e',
    hairStyle,
    beard,
    face:
      id === 'galan'
        ? { jaw: 1.09, nose: 1.1, eyes: 1.02, brow: 1.22, lip: 0.9 }
        : id === 'coello'
          ? { jaw: 0.94, nose: 1.12, eyes: 0.94, brow: 1.02, lip: 0.95 }
          : id === 'chingotto'
            ? { jaw: 0.96, nose: 0.91, eyes: 0.94, brow: 1.05, lip: 1.05 }
            : { jaw: 1.02, nose: 1, eyes: 1, brow: 1, lip: 1 },
    kit: {
      shirt,
      shorts: '#18202a',
      accent,
      ink: '#f6f5ef',
      brand,
      sponsor: '',
      pattern: 'plain',
    },
    racket: {
      color: '#20242a',
      accent,
      brand,
      shape: playingSide === 'left' ? 'diamond' : 'teardrop',
    },
    ...overrides,
  };
}

export const PLAYER_PROFILES: Record<string, PlayerAppearance> = {
  tapia: profile(
    'tapia',
    'Agustín Tapia',
    'TAPIA',
    1.79,
    'left',
    'swept',
    'stubble',
    'NOX',
    '#ec4931',
    '#eae8df',
    {
      skin: '#d2aa8c',
      hair: '#24201d',
      kit: {
        shirt: '#ec4931',
        shorts: '#151a22',
        accent: '#eeeae0',
        ink: '#ffffff',
        brand: 'NOX',
        sponsor: 'QATAR AIRWAYS',
        backSponsor: 'QATAR AIRWAYS',
        backName: 'AGUSTÍN TAPIA',
        sleeveSponsors: ['NFA', 'Commvault'],
        pattern: 'plain',
      },
      racket: {
        color: '#282e31',
        accent: '#bda971',
        brand: 'NOX',
        shape: 'teardrop',
      },
    },
  ),
  coello: profile(
    'coello',
    'Arturo Coello',
    'COELLO',
    1.9,
    'right',
    'curly',
    'none',
    'HEAD',
    '#192124',
    '#b5babc',
    {
      handedness: 'left',
      skin: '#c8966f',
      hair: '#33251b',
      kit: {
        shirt: '#eceee9',
        shorts: '#18202a',
        accent: '#c9d1cc',
        ink: '#172128',
        brand: 'On',
        sponsor: '',
        pattern: 'plain',
      },
      racket: {
        color: '#22232b',
        accent: '#ca343c',
        brand: 'HEAD',
        shape: 'diamond',
      },
    },
  ),
  galan: profile(
    'galan',
    'Alejandro Galán',
    'GALÁN',
    1.86,
    'left',
    'crop',
    'full',
    'adidas',
    '#efeee7',
    '#23292c',
    {
      skin: '#c69578',
      hair: '#342b24',
      kit: {
        shirt: '#efeee7',
        shorts: '#252b2f',
        accent: '#263138',
        ink: '#232a30',
        brand: 'adidas',
        sponsor: '',
        backSponsor: 'Reserve',
        backName: 'ale galán',
        sleeveSponsors: ['', 'CUPRA'],
        pattern: 'shoulder',
      },
      racket: {
        color: '#28292d',
        accent: '#e5313f',
        brand: 'adidas',
        shape: 'diamond',
      },
    },
  ),
  chingotto: profile(
    'chingotto',
    'Federico Chingotto',
    'CHINGOTTO',
    1.7,
    'right',
    'short',
    'stubble',
    'BULLPADEL',
    '#284b6c',
    '#4d84a3',
    {
      skin: '#bc8d6b',
      hair: '#20201d',
      kit: {
        shirt: '#284b6c',
        shorts: '#285775',
        accent: '#4d84a3',
        ink: '#ffffff',
        brand: 'BULLPADEL',
        sponsor: '',
        sleeveSponsors: ['FCH · FEDE CHINGOTTO', ''],
        pattern: 'blocks',
      },
      racket: {
        color: '#252b2d',
        accent: '#edb244',
        brand: 'BULLPADEL',
        shape: 'teardrop',
      },
    },
  ),
  lebron: profile(
    'lebron',
    'Juan Lebrón',
    'LEBRÓN',
    1.84,
    'right',
    'crop',
    'stubble',
    'BABOLAT',
    '#19595d',
    '#deebcc',
    {
      skin: '#c19474',
      kit: {
        shirt: '#17191d',
        shorts: '#17191d',
        accent: '#ed7132',
        ink: '#ed7132',
        brand: 'BABOLAT',
        sponsor: '',
        backName: 'J. LEBRÓN',
        pattern: 'plain',
      },
      racket: {
        color: '#142f29',
        accent: '#bfea64',
        brand: 'BABOLAT',
        shape: 'diamond',
      },
    },
  ),
  augsburger: profile(
    'augsburger',
    'Leo Augsburger',
    'AUGSBURGER',
    1.9,
    'left',
    'curly',
    'none',
    'SIUX',
    '#f1eee8',
    '#c83432',
    {
      skin: '#d2a387',
      hair: '#28201b',
      kit: {
        shirt: '#493864',
        shorts: '#282a2e',
        accent: '#d8e250',
        ink: '#ffffff',
        brand: 'SIUX',
        sponsor: 'PADELPOINT',
        backSponsor: 'Estithmar Holding',
        backName: 'LEO AUGSBURGER',
        sleeveSponsors: ['KIA Renting', ''],
        pattern: 'corner',
      },
    },
  ),
  nieto: profile(
    'nieto',
    'Coki Nieto',
    'NIETO',
    1.75,
    'left',
    'short',
    'none',
    'KUIKMA',
    '#29768b',
    '#a2d6d9',
    { skin: '#d5b198' },
  ),
  yanguas: profile(
    'yanguas',
    'Mike Yanguas',
    'YANGUAS',
    1.89,
    'right',
    'curly',
    'full',
    'LÕK',
    '#b9e3a0',
    '#235447',
    {
      skin: '#d2ad8d',
      kit: {
        shirt: '#b9e3a0',
        shorts: '#1c3231',
        accent: '#276448',
        ink: '#223e30',
        brand: 'LÕK',
        sponsor: '',
        pattern: 'blocks',
      },
    },
  ),
  sanz: profile(
    'sanz',
    'Jon Sanz',
    'SANZ',
    1.75,
    'right',
    'swept',
    'stubble',
    'DROPSHOT',
    '#272d32',
    '#b5da56',
    { handedness: 'left', skin: '#d2ae93', hair: '#25221f' },
  ),
  stupaczuk: profile(
    'stupaczuk',
    'Franco Stupaczuk',
    'STUPACZUK',
    1.8,
    'left',
    'swept',
    'stubble',
    'SIUX',
    '#be3938',
    '#e8dece',
    {
      skin: '#c6a083',
      hair: '#3c2f21',
      racket: {
        color: '#282729',
        accent: '#da3f43',
        brand: 'SIUX',
        shape: 'teardrop',
      },
    },
  ),
  'di-nenno': profile(
    'di-nenno',
    'Martín Di Nenno',
    'DI NENNO',
    1.75,
    'right',
    'short',
    'none',
    'BULLPADEL',
    '#ecece6',
    '#234069',
    {
      skin: '#d1ac91',
      kit: {
        shirt: '#ecece6',
        shorts: '#223654',
        accent: '#385880',
        ink: '#1f3452',
        brand: 'BULLPADEL',
        sponsor: 'XPLO',
        pattern: 'shoulder',
      },
    },
  ),
  navarro: profile(
    'navarro',
    'Paquito Navarro',
    'NAVARRO',
    1.81,
    'left',
    'swept',
    'none',
    'BULLPADEL',
    '#2d343b',
    '#e2924d',
    { skin: '#d0a183', hair: '#625044' },
  ),
  leal: profile(
    'leal',
    'Javi Leal',
    'LEAL',
    1.75,
    'left',
    'short',
    'stubble',
    'Wilson',
    '#323941',
    '#eeeeea',
    { skin: '#c69b7e', hair: '#25241f' },
  ),
  guerrero: profile(
    'guerrero',
    'Fran Guerrero',
    'GUERRERO',
    1.76,
    'right',
    'curly',
    'none',
    'HEAD',
    '#e8edef',
    '#428eb0',
    {
      skin: '#d5ac93',
      hair: '#292328',
      kit: {
        shirt: '#e8edef',
        shorts: '#253849',
        accent: '#3b86a7',
        ink: '#203a4c',
        brand: 'HEAD',
        sponsor: '',
        pattern: 'shoulder',
      },
    },
  ),
  tello: profile(
    'tello',
    'Juan Tello',
    'TELLO',
    1.85,
    'left',
    'short',
    'none',
    'BULLPADEL',
    '#dfdfe6',
    '#26394f',
    {
      skin: '#be947d',
      hair: '#29231e',
      kit: {
        shirt: '#dfdfe6',
        shorts: '#253247',
        accent: '#2d4866',
        ink: '#25364a',
        brand: 'BULLPADEL',
        sponsor: 'VERTEX',
        pattern: 'diagonal',
      },
    },
  ),
  arce: profile(
    'arce',
    'Maxi Arce',
    'ARCE',
    1.75,
    'right',
    'short',
    'none',
    'adidas',
    '#223846',
    '#8bc4d1',
    { skin: '#c59b7e', handedness: 'left' },
  ),
};

/** Name lookup keeps model, HUD and physics aligned, including tournament opponents. */
export function teamAppearances(teamIndex: number): PlayerAppearance[] {
  const team = TEAMS[teamIndex] ?? TEAMS[0];
  return team.players.map(
    (name) =>
      Object.values(PLAYER_PROFILES).find((p) => p.name === name) ??
      PLAYER_PROFILES.tapia,
  );
}

export function matchAppearances(
  teamIndex = 0,
  opponentIndex = 1,
): PlayerAppearance[] {
  return [...teamAppearances(teamIndex), ...teamAppearances(opponentIndex)];
}
