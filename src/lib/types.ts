export type StaffRole = 'guest' | 'moderator' | 'admin' | 'founder';

export type SecurityRank = 'S' | 'A' | 'B' | 'D';

export type PlayerClass = 'S' | 'A' | 'B' | 'C' | 'D';

export type PreferredFoot = 'Unknown' | 'Right' | 'Left' | 'Both';

export type PositionCode =
  | 'Unknown'
  | 'GK'
  | 'RB'
  | 'CB'
  | 'LB'
  | 'CDM'
  | 'CM'
  | 'CAM'
  | 'RW'
  | 'LW'
  | 'ST';

export type RolePermissionKey =
  | 'editPlayerStats'
  | 'changePlayerTeam'
  | 'addPlayer'
  | 'suspendPlayer'
  | 'banEntity'
  | 'deletePlayer'
  | 'manageLeagueStandings'
  | 'manageHierarchy';

export type RolePermissionFlags = Record<RolePermissionKey, boolean>;

export interface StaffRolePolicy {
  keyPaused: boolean;
  permissions: RolePermissionFlags;
}

export interface StaffAccessPolicy {
  admin: StaffRolePolicy;
  moderator: StaffRolePolicy;
}

export interface SiteConfig {
  brandName: string;
  heroEyebrow: string;
  heroHeadline: string;
  announcementBanner: string;
  announcementActive: boolean;
  backgroundImageUrl: string;
  backgroundBlurPx: 0 | 2 | 5 | 8 | 12;
  footerTitle: string;
  footerCopyright: string;
  foundersSectionTitle: string;
  totwClubName: string;
  totwPlayerUsername: string;
  totwHeroImageUrl: string;
  totwCrestImageUrl: string;
  totwHeadlineParagraph: string;
  totwBodyParagraph: string;
  totwClosingParagraph: string;
  showMarquee: boolean;
  showStandingsOnHome: boolean;
  showFoundersOnHome: boolean;
  showTotwOnHome: boolean;
}

export interface PlayerRecord {
  id: number;
  username: string;
  displayName: string;
  robloxId: number | null;
  avatarUrl: string;
  isFounder: boolean;
  tier: PlayerClass;
  securityRank: SecurityRank;
  position: PositionCode;
  club: string;
  rating: number;
  pace: number;
  shooting: number;
  passing: number;
  dribbling: number;
  defending: number;
  physical: number;
  appearances: number;
  goals: number;
  assists: number;
  foot: PreferredFoot;
  wage: number;
  releaseClause: number;
  suspended: boolean;
  banned: boolean;
  banReason?: string;
  scoutingReport: string;
}

export interface RobloxProfileDetails {
  playerId: number;
  username: string;
  displayName: string;
  robloxId: number | null;
  resolvedOnRoblox: boolean;
  description: string;
  created: string | null;
  isBannedOnRoblox: boolean;
  hasVerifiedBadge: boolean;
  headshotUrl: string;
  fullBodyUrl: string;
  friendsCount: number;
  followersCount: number;
  followingCount: number;
  profileUrl: string | null;
}

export interface HierarchyAccount {
  id: number;
  username: string;
  robloxId: number | null;
  avatarUrl: string;
  securityRank: SecurityRank;
  roleTitle: string;
  isFounder: boolean;
  suspended: boolean;
  banned: boolean;
  kicked: boolean;
  lastActive: string;
}

export interface AuditLogEntry {
  id: number;
  actor: string;
  actorRole: StaffRole | 'system';
  action: string;
  target: string;
  detail: string;
  timestamp: string;
}

export interface StaffSession {
  authenticated: boolean;
  role: StaffRole;
  actorName: string;
  securityRank: SecurityRank;
  token?: string;
}

export type LeagueId =
  | 'deutscher-fussball-liga'
  | 'italia-professionale-divisione'
  | 'ligue-la-premiere'
  | 'english-elite-conference';

export interface ClubStandingRecord {
  id: string;
  leagueId: LeagueId;
  name: string;
  shortCode: string;
  logoUrl: string;
  played: number;
  wins: number;
  draws: number;
  losses: number;
  goalsFor: number;
  goalsAgainst: number;
  goalDifference: number;
  points: number;
}

export interface LeagueDivision {
  id: LeagueId;
  name: string;
  regionLabel: string;
  logoUrl: string;
  accentHex: string;
  clubs: ClubStandingRecord[];
}
