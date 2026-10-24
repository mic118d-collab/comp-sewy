import type {
  ClubStandingRecord,
  LeagueDivision,
  LeagueId,
  PlayerRecord,
} from './types.ts';
import { clampNonNegative } from './hierarchy.ts';

export const RFF_FEDERATION_LOGO_URL = '/assets/aistudio/image_4f742f5b.png';
export const UNKNOWN_TEAM_ROLE = 'Unknown';

export function needsCircularBadgeMask(logoUrl: string | undefined | null): boolean {
  if (!logoUrl) return false;
  return logoUrl.includes('image_1500e3fe.png');
}

export interface SeedClubDefinition {
  id: string;
  name: string;
  shortCode: string;
  logoUrl: string;
}

export interface SeedLeagueDefinition {
  id: LeagueId;
  name: string;
  regionLabel: string;
  logoUrl: string;
  accentHex: string;
  clubs: SeedClubDefinition[];
}

export interface OfficialClubMeta {
  clubId: string;
  clubName: string;
  shortCode: string;
  clubLogoUrl: string;
  leagueId: LeagueId;
  leagueName: string;
  leagueLogoUrl: string;
}

export const RFF_LEAGUE_DEFINITIONS: SeedLeagueDefinition[] = [
  {
    id: 'deutscher-fussball-liga',
    name: 'Deutscher Fußball-Liga',
    regionLabel: 'German Division · 8 Clubs',
    logoUrl: '/assets/aistudio/image_585dad7b.png',
    accentHex: '#eab308',
    clubs: [
      { id: 'elbestadt-fc', name: 'Elbestadt F.C.', shortCode: 'ELB', logoUrl: '/assets/aistudio/image_d269fd62.png' },
      { id: 'hafenstadt-dynamo', name: 'Hafenstadt Dynamo', shortCode: 'HAF', logoUrl: '/assets/aistudio/image_d4a6b308.png' },
      { id: 'bayernstadt-fc', name: 'Bayernstadt F.C.', shortCode: 'BAY', logoUrl: '/assets/aistudio/image_fe958698.png' },
      { id: 'mainhugel-united', name: 'Mainhügel United', shortCode: 'MHU', logoUrl: '/assets/aistudio/image_e0356227.png' },
      { id: 'nordmeer-united', name: 'Nordmeer United', shortCode: 'NMU', logoUrl: '/assets/aistudio/image_2a5ba8cd.png' },
      { id: 'rheinblick-fc', name: 'Rheinblick F.C.', shortCode: 'RBF', logoUrl: '/assets/aistudio/image_bfb70a86.png' },
      { id: 'gruntal-sc', name: 'Grüntal S.C.', shortCode: 'GRN', logoUrl: '/assets/aistudio/image_95b0aa7b.png' },
      { id: 'grossstadt-united', name: 'Großstadt United', shortCode: 'GSU', logoUrl: '/assets/aistudio/image_a47c7739.png' },
    ],
  },
  {
    id: 'italia-professionale-divisione',
    name: 'Italia Professionale Divisione',
    regionLabel: 'Italian Division · 8 Clubs',
    logoUrl: '/assets/aistudio/image_e12ad2a7.png',
    accentHex: '#3b82f6',
    clubs: [
      { id: 'as-rome', name: 'A.S. Rome', shortCode: 'ASR', logoUrl: '/assets/aistudio/image_b40bdbd3.png' },
      { id: 'capitale-fc', name: 'Capitale F.C.', shortCode: 'CAP', logoUrl: '/assets/aistudio/image_8c57c7af.png' },
      { id: 'ssc-milano', name: 'S.S.C Milano', shortCode: 'MIL', logoUrl: '/assets/aistudio/image_77db71e7.png' },
      { id: 'ssc-palermo', name: 'S.S.C. Palermo', shortCode: 'PAL', logoUrl: '/assets/aistudio/image_f59ec5d5.png' },
      { id: 'as-taranto', name: 'A.S. Taranto', shortCode: 'TAR', logoUrl: '/assets/aistudio/image_25818853.png' },
      { id: 'spezia', name: 'Spezia', shortCode: 'SPZ', logoUrl: '/assets/aistudio/image_2148620c.png' },
      { id: 'ac-pisa', name: 'A.C. Pisa', shortCode: 'PIS', logoUrl: '/assets/aistudio/image_f4e77393.png' },
      { id: 'cd-bari', name: 'C.D. Bari', shortCode: 'BAR', logoUrl: '/assets/aistudio/image_3d332d2e.png' },
    ],
  },
  {
    id: 'ligue-la-premiere',
    name: 'Ligue La Premiere',
    regionLabel: 'French Division · 8 Clubs',
    logoUrl: '/assets/rff/leagues/ligue-la-premiere.svg',
    accentHex: '#e11d48',
    clubs: [
      { id: 'as-montsaveur', name: 'A.S Montsaveur', shortCode: 'ASM', logoUrl: '/assets/rff/clubs/as-montsaveur.svg' },
      { id: 'saint-roche', name: 'Saint Roche', shortCode: 'SRO', logoUrl: '/assets/rff/clubs/saint-roche.svg' },
      { id: 'us-verdelac', name: 'U.S. Verdelac', shortCode: 'USV', logoUrl: '/assets/rff/clubs/us-verdelac.svg' },
      { id: 'rc-palmont', name: 'R.C. Palmont', shortCode: 'RCP', logoUrl: '/assets/aistudio/image_e34c12dc.png' },
      { id: 'fc-porteclaire', name: 'F.C. Porteclaire', shortCode: 'FCP', logoUrl: '/assets/rff/clubs/fc-porteclaire.svg' },
      { id: 'athletique-beaumont', name: 'Athletique Beaumont', shortCode: 'ABM', logoUrl: '/assets/rff/clubs/athletique-beaumont.svg' },
      { id: 'rc-lorient', name: 'R.C. Lorient', shortCode: 'RCL', logoUrl: '/assets/rff/clubs/rc-lorient.svg' },
      { id: 'sc-clairmont', name: 'S.C. Clairmont', shortCode: 'SCC', logoUrl: '/assets/rff/clubs/sc-clairmont.svg' },
    ],
  },
  {
    id: 'english-elite-conference',
    name: 'English Elite Conference',
    regionLabel: 'English Division · 8 Clubs',
    logoUrl: '/assets/aistudio/image_b603c42b.png',
    accentHex: '#ef4444',
    clubs: [
      { id: 'hastings-united', name: 'Hastings United', shortCode: 'HAS', logoUrl: '/assets/aistudio/image_1500e3fe.png' },
      { id: 'newbury-thistle', name: 'Newbury Thistle', shortCode: 'NBT', logoUrl: '/assets/aistudio/image_ae72949f.png' },
      { id: 'stafford-west-end', name: 'Stafford West End', shortCode: 'SWE', logoUrl: '/assets/aistudio/image_c906d267.png' },
      { id: 'romford-parkvale', name: 'Romford Parkvale', shortCode: 'ROM', logoUrl: '/assets/aistudio/image_e04ac9d5.png' },
      { id: 'ingrave-fc', name: 'Ingrave F.C.', shortCode: 'ING', logoUrl: '/assets/aistudio/image_e0b90f7a.png' },
      { id: 'bedford-hearts', name: 'Bedford Hearts', shortCode: 'BED', logoUrl: '/assets/aistudio/image_f27cf45f.png' },
      { id: 'chorley-alc', name: 'Chorley A.L.C.', shortCode: 'CHO', logoUrl: '/assets/aistudio/image_eca8545e.png' },
      { id: 'streatham-united', name: 'Streatham United', shortCode: 'STR', logoUrl: '/assets/aistudio/image_84505237.png' },
    ],
  },
];

const OFFICIAL_CLUB_LIST: OfficialClubMeta[] = [];
const OFFICIAL_CLUB_LOOKUP_MAP = new Map<string, OfficialClubMeta>();

function normalizeAsciiClubKey(str: string): string {
  return str
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');
}

for (const league of RFF_LEAGUE_DEFINITIONS) {
  for (const club of league.clubs) {
    const meta: OfficialClubMeta = {
      clubId: club.id,
      clubName: club.name,
      shortCode: club.shortCode,
      clubLogoUrl: club.logoUrl,
      leagueId: league.id,
      leagueName: league.name,
      leagueLogoUrl: league.logoUrl,
    };
    OFFICIAL_CLUB_LIST.push(meta);
    OFFICIAL_CLUB_LOOKUP_MAP.set(club.name.toLowerCase(), meta);
    OFFICIAL_CLUB_LOOKUP_MAP.set(normalizeAsciiClubKey(club.name), meta);
  }
}

export function getAllOfficialClubs(): OfficialClubMeta[] {
  return [...OFFICIAL_CLUB_LIST];
}

export function findOfficialClubByName(
  clubName: string | undefined | null,
  liveLeagues?: LeagueDivision[]
): OfficialClubMeta | null {
  if (!clubName) return null;
  const lower = clubName.trim().toLowerCase();
  const ascii = normalizeAsciiClubKey(lower);

  if (liveLeagues && liveLeagues.length > 0) {
    for (const league of liveLeagues) {
      for (const club of league.clubs) {
        if (
          club.name.trim().toLowerCase() === lower ||
          normalizeAsciiClubKey(club.name) === ascii
        ) {
          return {
            clubId: club.id,
            clubName: club.name,
            shortCode: club.shortCode,
            clubLogoUrl: club.logoUrl,
            leagueId: league.id,
            leagueName: league.name,
            leagueLogoUrl: league.logoUrl,
          };
        }
      }
    }
  }

  return (
    OFFICIAL_CLUB_LOOKUP_MAP.get(lower) ??
    OFFICIAL_CLUB_LOOKUP_MAP.get(ascii) ??
    null
  );
}

export function isPlayerTeamRolled(clubName: string | undefined | null): boolean {
  if (!clubName) return false;
  const normalized = clubName.trim().toLowerCase();
  if (
    !normalized ||
    normalized === 'unknown' ||
    normalized === 'unassigned d-class' ||
    normalized === 'federation supreme'
  ) {
    return false;
  }
  return true;
}

export function getTeamRoleLabel(clubName: string | undefined | null): string {
  if (!isPlayerTeamRolled(clubName)) return UNKNOWN_TEAM_ROLE;
  return clubName!.trim();
}

export function getCandidateClubsForRoll(
  leagues: LeagueDivision[],
  leagueFilter: LeagueId | 'all'
): Array<{ club: ClubStandingRecord; league: LeagueDivision }> {
  const pool: Array<{ club: ClubStandingRecord; league: LeagueDivision }> = [];
  for (const league of leagues) {
    if (leagueFilter !== 'all' && league.id !== leagueFilter) continue;
    for (const club of league.clubs) {
      pool.push({ club, league });
    }
  }
  return pool;
}

export function pickRolledClub(
  leagues: LeagueDivision[],
  leagueFilter: LeagueId | 'all',
  randomFloat = Math.random()
): { club: ClubStandingRecord; league: LeagueDivision } {
  const pool = getCandidateClubsForRoll(leagues, leagueFilter);
  if (pool.length === 0) {
    throw new Error('No clubs available in the selected division pool.');
  }
  const clamped = Math.min(0.999999, Math.max(0, randomFloat));
  const idx = Math.floor(clamped * pool.length);
  return pool[idx];
}

export function applyTeamRollToPlayer(
  player: PlayerRecord,
  targetTeamRole: string,
  liveLeagues?: LeagueDivision[]
): PlayerRecord {
  const trimmed = targetTeamRole.trim();
  if (!trimmed || trimmed.toLowerCase() === 'unknown') {
    return {
      ...player,
      club: UNKNOWN_TEAM_ROLE,
    };
  }
  const official = findOfficialClubByName(trimmed, liveLeagues);
  if (!official) {
    throw new Error(`"${trimmed}" is not one of the official RFF clubs.`);
  }
  return {
    ...player,
    club: official.clubName,
  };
}

export type StandingZone = 'champions' | 'europa' | 'midtable' | 'relegation';

export interface StandingZoneInfo {
  zone: StandingZone;
  label: string;
  rangeLabel: string;
}

export function getStandingZoneInfo(rank: number, totalClubs = 8): StandingZoneInfo {
  if (rank <= 2) {
    return {
      zone: 'champions',
      label: 'Coupe des Champions',
      rangeLabel: '1-2',
    };
  }
  if (rank <= 4) {
    return {
      zone: 'europa',
      label: "Coupe d'Europa",
      rangeLabel: '3-4',
    };
  }
  if (totalClubs >= 6 && rank >= totalClubs - 1) {
    return {
      zone: 'relegation',
      label: 'Relegation',
      rangeLabel: `${totalClubs - 1}-${totalClubs}`,
    };
  }
  return {
    zone: 'midtable',
    label: 'Division Standard',
    rangeLabel: `5-${Math.max(5, totalClubs - 2)}`,
  };
}

export function sortLeagueClubs(clubs: ClubStandingRecord[]): ClubStandingRecord[] {
  return [...clubs].sort((a, b) => {
    if (b.points !== a.points) return b.points - a.points;
    if (b.goalDifference !== a.goalDifference) return b.goalDifference - a.goalDifference;
    if (b.goalsFor !== a.goalsFor) return b.goalsFor - a.goalsFor;
    if (a.played !== b.played && (a.points > 0 || b.points > 0)) return a.played - b.played;
    return a.name.localeCompare(b.name);
  });
}

export interface ClubStatsPatch {
  wins?: unknown;
  draws?: unknown;
  losses?: unknown;
  goalsFor?: unknown;
  goalsAgainst?: unknown;
  points?: unknown;
}

export function computeClubStanding(
  existing: ClubStandingRecord,
  patch: ClubStatsPatch
): ClubStandingRecord {
  const wins = clampNonNegative(patch.wins, existing.wins);
  const draws = clampNonNegative(patch.draws, existing.draws);
  const losses = clampNonNegative(patch.losses, existing.losses);
  const goalsFor = clampNonNegative(patch.goalsFor, existing.goalsFor);
  const goalsAgainst = clampNonNegative(patch.goalsAgainst, existing.goalsAgainst);
  const played = wins + draws + losses;
  const goalDifference = goalsFor - goalsAgainst;
  const autoPoints = wins * 3 + draws;
  const points =
    patch.points !== undefined && patch.points !== null && patch.points !== ''
      ? clampNonNegative(patch.points, autoPoints)
      : autoPoints;

  return {
    ...existing,
    played,
    wins,
    draws,
    losses,
    goalsFor,
    goalsAgainst,
    goalDifference,
    points,
  };
}

export function buildInitialLeagues(): LeagueDivision[] {
  return RFF_LEAGUE_DEFINITIONS.map((def) => {
    const seededClubs: ClubStandingRecord[] = def.clubs.map((club) => ({
      id: club.id,
      leagueId: def.id,
      name: club.name,
      shortCode: club.shortCode,
      logoUrl: club.logoUrl,
      played: 0,
      wins: 0,
      draws: 0,
      losses: 0,
      goalsFor: 0,
      goalsAgainst: 0,
      goalDifference: 0,
      points: 0,
    }));

    return {
      id: def.id,
      name: def.name,
      regionLabel: def.regionLabel,
      logoUrl: def.logoUrl,
      accentHex: def.accentHex,
      clubs: sortLeagueClubs(seededClubs),
    };
  });
}

export function applyMatchResultToLeague(
  league: LeagueDivision,
  homeClubId: string,
  awayClubId: string,
  rawHomeGoals: unknown,
  rawAwayGoals: unknown
): LeagueDivision {
  if (homeClubId === awayClubId) {
    throw new Error('Home and away clubs must be two different teams in the same league.');
  }

  const homeIdx = league.clubs.findIndex((c) => c.id === homeClubId);
  const awayIdx = league.clubs.findIndex((c) => c.id === awayClubId);

  if (homeIdx === -1 || awayIdx === -1) {
    throw new Error(`Both clubs must belong to ${league.name}. Cross-league fixtures are not allowed.`);
  }

  const homeGoals = clampNonNegative(rawHomeGoals, 0);
  const awayGoals = clampNonNegative(rawAwayGoals, 0);

  const homeWin = homeGoals > awayGoals ? 1 : 0;
  const awayWin = awayGoals > homeGoals ? 1 : 0;
  const isDraw = homeGoals === awayGoals ? 1 : 0;

  const updatedClubs = league.clubs.map((club) => {
    if (club.id === homeClubId) {
      return computeClubStanding(club, {
        wins: club.wins + homeWin,
        draws: club.draws + isDraw,
        losses: club.losses + awayWin,
        goalsFor: club.goalsFor + homeGoals,
        goalsAgainst: club.goalsAgainst + awayGoals,
      });
    }
    if (club.id === awayClubId) {
      return computeClubStanding(club, {
        wins: club.wins + awayWin,
        draws: club.draws + isDraw,
        losses: club.losses + homeWin,
        goalsFor: club.goalsFor + awayGoals,
        goalsAgainst: club.goalsAgainst + homeGoals,
      });
    }
    return club;
  });

  return {
    ...league,
    clubs: sortLeagueClubs(updatedClubs),
  };
}

export function resetLeagueStandings(league: LeagueDivision): LeagueDivision {
  const cleared = league.clubs.map((club) =>
    computeClubStanding(club, {
      wins: 0,
      draws: 0,
      losses: 0,
      goalsFor: 0,
      goalsAgainst: 0,
    })
  );
  return {
    ...league,
    clubs: sortLeagueClubs(cleared),
  };
}

export function filterLeaguesAndClubs(
  leagues: LeagueDivision[],
  selectedLeagueId: LeagueId | 'all',
  clubQuery: string
): LeagueDivision[] {
  const q = clubQuery.trim().toLowerCase();
  return leagues
    .filter((league) => selectedLeagueId === 'all' || league.id === selectedLeagueId)
    .map((league) => {
      if (!q) return league;
      const matchesLeagueName = league.name.toLowerCase().includes(q);
      if (matchesLeagueName) return league;
      return {
        ...league,
        clubs: league.clubs.filter(
          (c) =>
            c.name.toLowerCase().includes(q) ||
            c.shortCode.toLowerCase().includes(q)
        ),
      };
    })
    .filter((league) => league.clubs.length > 0);
}
