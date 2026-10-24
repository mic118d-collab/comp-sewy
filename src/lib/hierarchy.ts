import type {
  PlayerClass,
  PlayerRecord,
  PositionCode,
  PreferredFoot,
  RolePermissionFlags,
  RolePermissionKey,
  SecurityRank,
  SiteConfig,
  StaffAccessPolicy,
  StaffRole,
  StaffRolePolicy,
} from './types.ts';

export const VALID_PREFERRED_FEET: PreferredFoot[] = ['Unknown', 'Right', 'Left', 'Both'];

export const VALID_POSITIONS: PositionCode[] = [
  'Unknown',
  'GK',
  'RB',
  'CB',
  'LB',
  'CDM',
  'CM',
  'CAM',
  'RW',
  'LW',
  'ST',
];

export const MOD_PASSWORD = 'Mod192pnk$mod';
export const ADMIN_PASSWORD = 'Pnk918$AdminMapw';
export const FOUNDER_PASSWORD = 'Fflacko198Pnk$';

export const ROLE_PERMISSION_DESCRIPTORS: Array<{
  key: RolePermissionKey;
  label: string;
  description: string;
}> = [
  {
    key: 'editPlayerStats',
    label: 'Edit Player Stats & Skill Ranks',
    description: 'Modify OVR, S/A/B/D skill tier, position, foot, goals, assists, wages, and scouting reports.',
  },
  {
    key: 'changePlayerTeam',
    label: 'Assign & Change Player Teams',
    description: 'Assign athletes to any of the 32 official RFF² clubs or reset to Unknown.',
  },
  {
    key: 'addPlayer',
    label: 'Register New Players',
    description: 'Add new Roblox usernames into the official RFF² Registry.',
  },
  {
    key: 'suspendPlayer',
    label: 'Suspend & Reinstate Players',
    description: 'Temporarily suspend athletes from fixtures or reinstate suspended players.',
  },
  {
    key: 'banEntity',
    label: 'Ban & Unban Players',
    description: 'Issue or revoke federation bans with recorded audit reasons.',
  },
  {
    key: 'deletePlayer',
    label: 'Delete Player Records',
    description: 'Permanently remove non-Founder player records from the registry.',
  },
  {
    key: 'manageLeagueStandings',
    label: 'Edit League Standings',
    description: 'Log match results, edit W/D/L/G-A/PTS tables, and reset division standings.',
  },
  {
    key: 'manageHierarchy',
    label: 'Manage Security Hierarchy',
    description: 'Assign, promote, demote, suspend, or ban accounts in the Security Hierarchy Guard.',
  },
];

export function buildDefaultStaffAccessPolicy(): StaffAccessPolicy {
  return {
    admin: {
      keyPaused: false,
      permissions: {
        editPlayerStats: true,
        changePlayerTeam: true,
        addPlayer: true,
        suspendPlayer: true,
        banEntity: true,
        deletePlayer: true,
        manageLeagueStandings: true,
        manageHierarchy: true,
      },
    },
    moderator: {
      keyPaused: false,
      permissions: {
        editPlayerStats: true,
        changePlayerTeam: true,
        addPlayer: true,
        suspendPlayer: true,
        banEntity: false,
        deletePlayer: false,
        manageLeagueStandings: false,
        manageHierarchy: false,
      },
    },
  };
}

export const DEFAULT_STAFF_ACCESS_POLICY: StaffAccessPolicy = buildDefaultStaffAccessPolicy();

function sanitizeRolePolicy(
  raw: unknown,
  fallback: StaffRolePolicy
): StaffRolePolicy {
  const obj = raw && typeof raw === 'object' ? (raw as Record<string, unknown>) : {};
  const rawPerms =
    obj.permissions && typeof obj.permissions === 'object'
      ? (obj.permissions as Record<string, unknown>)
      : {};

  const permissions: RolePermissionFlags = { ...fallback.permissions };
  for (const desc of ROLE_PERMISSION_DESCRIPTORS) {
    if (typeof rawPerms[desc.key] === 'boolean') {
      permissions[desc.key] = rawPerms[desc.key] as boolean;
    }
  }

  return {
    keyPaused: typeof obj.keyPaused === 'boolean' ? obj.keyPaused : fallback.keyPaused,
    permissions,
  };
}

export function sanitizeStaffAccessPolicy(
  raw: unknown,
  fallback: StaffAccessPolicy = DEFAULT_STAFF_ACCESS_POLICY
): StaffAccessPolicy {
  const obj = raw && typeof raw === 'object' ? (raw as Record<string, unknown>) : {};
  return {
    admin: sanitizeRolePolicy(obj.admin, fallback.admin),
    moderator: sanitizeRolePolicy(obj.moderator, fallback.moderator),
  };
}

const VALID_BLUR_LEVELS: Array<0 | 2 | 5 | 8 | 12> = [0, 2, 5, 8, 12];

export function buildDefaultSiteConfig(): SiteConfig {
  return {
    brandName: 'RFF² Registry',
    heroEyebrow: 'Roblox Football Federation · Official Pre-Season Registry',
    heroHeadline: 'Every athlete ranked by skill, contracted, and verified on record.',
    announcementBanner: '',
    announcementActive: false,
    backgroundImageUrl: '/assets/aistudio/image_49eac3da.png',
    backgroundBlurPx: 5,
    footerTitle: 'RFF² — Roblox Football Federation Official Pre-Season Registry',
    footerCopyright: '© 2026 Mapw · Copyright Reserved',
    foundersSectionTitle: 'The Founders (OVR 99 · S Rank)',
    totwClubName: 'R.C. Palmont',
    totwPlayerUsername: 'x5_sy',
    totwHeroImageUrl: '/assets/aistudio/image_bf3f5cb0.png',
    totwCrestImageUrl: '/assets/aistudio/image_e34c12dc.png',
    totwHeadlineParagraph:
      'R.C. Palmont is already showing incredible potential and looks completely locked in, establishing themselves as a serious threat before the preseason kick off.',
    totwBodyParagraph:
      "With the roster clicking perfectly behind the scenes, x5_sy is already poised to be the team's main offensive spark, bringing the clinical finishing needed to dismantle any defense in the league.",
    totwClosingParagraph:
      'Will Palmont maintain this terrifying momentum once the season officially kicks off.',
    showMarquee: true,
    showStandingsOnHome: true,
    showFoundersOnHome: true,
    showTotwOnHome: true,
  };
}

export const DEFAULT_SITE_CONFIG: SiteConfig = buildDefaultSiteConfig();

export function sanitizeSiteConfig(
  raw: unknown,
  fallback: SiteConfig = DEFAULT_SITE_CONFIG
): SiteConfig {
  const obj = raw && typeof raw === 'object' ? (raw as Record<string, unknown>) : {};
  const str = (key: keyof SiteConfig, allowEmpty = false): string => {
    const v = obj[key];
    if (typeof v !== 'string') return fallback[key] as string;
    const trimmed = v.trim();
    if (!allowEmpty && trimmed.length === 0) return fallback[key] as string;
    return trimmed;
  };
  const bool = (key: keyof SiteConfig): boolean =>
    typeof obj[key] === 'boolean' ? (obj[key] as boolean) : (fallback[key] as boolean);

  const rawBlur = Number(obj.backgroundBlurPx);
  const backgroundBlurPx = VALID_BLUR_LEVELS.includes(rawBlur as 0 | 2 | 5 | 8 | 12)
    ? (rawBlur as 0 | 2 | 5 | 8 | 12)
    : fallback.backgroundBlurPx;

  return {
    brandName: str('brandName'),
    heroEyebrow: str('heroEyebrow'),
    heroHeadline: str('heroHeadline'),
    announcementBanner: str('announcementBanner', true),
    announcementActive: bool('announcementActive'),
    backgroundImageUrl: str('backgroundImageUrl'),
    backgroundBlurPx,
    footerTitle: str('footerTitle'),
    footerCopyright: str('footerCopyright'),
    foundersSectionTitle: str('foundersSectionTitle'),
    totwClubName: str('totwClubName'),
    totwPlayerUsername: str('totwPlayerUsername').replace(/^@/, ''),
    totwHeroImageUrl: str('totwHeroImageUrl'),
    totwCrestImageUrl: str('totwCrestImageUrl'),
    totwHeadlineParagraph: str('totwHeadlineParagraph'),
    totwBodyParagraph: str('totwBodyParagraph'),
    totwClosingParagraph: str('totwClosingParagraph'),
    showMarquee: bool('showMarquee'),
    showStandingsOnHome: bool('showStandingsOnHome'),
    showFoundersOnHome: bool('showFoundersOnHome'),
    showTotwOnHome: bool('showTotwOnHome'),
  };
}

export function getBackgroundBlurClasses(blurPx: 0 | 2 | 5 | 8 | 12): string {
  switch (blurPx) {
    case 0:
      return 'blur-none scale-100';
    case 2:
      return 'blur-[2px] scale-[1.01]';
    case 8:
      return 'blur-[8px] scale-[1.05]';
    case 12:
      return 'blur-[12px] scale-[1.07]';
    case 5:
    default:
      return 'blur-[5px] scale-[1.03]';
  }
}

export interface AuthResult {
  valid: boolean;
  paused?: boolean;
  pausedRole?: 'admin' | 'moderator';
  role: StaffRole;
  actorName: string;
  securityRank: SecurityRank;
}

export function authenticateStaffPassword(
  input: string,
  policy: StaffAccessPolicy = DEFAULT_STAFF_ACCESS_POLICY
): AuthResult {
  const trimmed = input.trim();
  if (trimmed === FOUNDER_PASSWORD) {
    return {
      valid: true,
      paused: false,
      role: 'founder',
      actorName: 'FederationFounder',
      securityRank: 'S',
    };
  }
  if (trimmed === ADMIN_PASSWORD) {
    if (policy.admin.keyPaused) {
      return {
        valid: false,
        paused: true,
        pausedRole: 'admin',
        role: 'guest',
        actorName: 'Guest',
        securityRank: 'D',
      };
    }
    return {
      valid: true,
      paused: false,
      role: 'admin',
      actorName: 'FederationAdmin',
      securityRank: 'A',
    };
  }
  if (trimmed === MOD_PASSWORD) {
    if (policy.moderator.keyPaused) {
      return {
        valid: false,
        paused: true,
        pausedRole: 'moderator',
        role: 'guest',
        actorName: 'Guest',
        securityRank: 'D',
      };
    }
    return {
      valid: true,
      paused: false,
      role: 'moderator',
      actorName: 'FederationMod',
      securityRank: 'B',
    };
  }
  return {
    valid: false,
    paused: false,
    role: 'guest',
    actorName: 'Guest',
    securityRank: 'D',
  };
}

export function isFounderRole(role: StaffRole): boolean {
  return role === 'founder';
}

export function canManageFounderControls(role: StaffRole): boolean {
  return role === 'founder';
}

export function isRoleKeyPaused(
  role: StaffRole,
  policy: StaffAccessPolicy = DEFAULT_STAFF_ACCESS_POLICY
): boolean {
  if (role === 'founder' || role === 'guest') return false;
  return role === 'admin' ? Boolean(policy.admin.keyPaused) : Boolean(policy.moderator.keyPaused);
}

export function hasPermission(
  role: StaffRole,
  permission: RolePermissionKey,
  policy: StaffAccessPolicy = DEFAULT_STAFF_ACCESS_POLICY
): boolean {
  if (role === 'founder') return true;
  if (role === 'guest') return false;
  const rolePolicy = role === 'admin' ? policy.admin : policy.moderator;
  if (rolePolicy.keyPaused) return false;
  return Boolean(rolePolicy.permissions[permission]);
}

export function canEditPlayerStats(
  role: StaffRole,
  policy: StaffAccessPolicy = DEFAULT_STAFF_ACCESS_POLICY
): boolean {
  return hasPermission(role, 'editPlayerStats', policy);
}

export function canChangePlayerTeam(
  role: StaffRole,
  policy: StaffAccessPolicy = DEFAULT_STAFF_ACCESS_POLICY
): boolean {
  return hasPermission(role, 'changePlayerTeam', policy);
}

export function canAddPlayer(
  role: StaffRole,
  policy: StaffAccessPolicy = DEFAULT_STAFF_ACCESS_POLICY
): boolean {
  return hasPermission(role, 'addPlayer', policy);
}

export function canManageLeagueStandings(
  role: StaffRole,
  policy: StaffAccessPolicy = DEFAULT_STAFF_ACCESS_POLICY
): boolean {
  return hasPermission(role, 'manageLeagueStandings', policy);
}

export function canSuspendPlayer(
  role: StaffRole,
  policy: StaffAccessPolicy = DEFAULT_STAFF_ACCESS_POLICY
): boolean {
  return hasPermission(role, 'suspendPlayer', policy);
}

export function canBanEntity(
  role: StaffRole,
  policy: StaffAccessPolicy = DEFAULT_STAFF_ACCESS_POLICY
): boolean {
  return hasPermission(role, 'banEntity', policy);
}

export function canDeletePlayer(
  role: StaffRole,
  policy: StaffAccessPolicy = DEFAULT_STAFF_ACCESS_POLICY
): boolean {
  return hasPermission(role, 'deletePlayer', policy);
}

export function canManageHierarchy(
  role: StaffRole,
  policy: StaffAccessPolicy = DEFAULT_STAFF_ACCESS_POLICY
): boolean {
  return hasPermission(role, 'manageHierarchy', policy);
}

export function clampStat(val: unknown, fallback: number, min = 1, max = 99): number {
  const parsed = typeof val === 'number' ? val : Number(val);
  if (!Number.isFinite(parsed)) return fallback;
  return Math.max(min, Math.min(max, Math.round(parsed)));
}

export function clampNonNegative(val: unknown, fallback: number): number {
  const parsed = typeof val === 'number' ? val : Number(val);
  if (!Number.isFinite(parsed)) return fallback;
  return Math.max(0, Math.round(parsed));
}

/**
 * Enforces dynamic role-based and Founder-governed permissions on player updates:
 * - Founders have supreme command to edit every field including `isFounder`, `avatarUrl`, `robloxId`, `banned`, `suspended`, and `securityRank`.
 * - Admins and Moderators only mutate fields permitted by their active `StaffAccessPolicy` flags.
 */
export function applyRoleSafePlayerUpdate(
  existing: PlayerRecord,
  patch: Partial<PlayerRecord>,
  role: StaffRole,
  policy: StaffAccessPolicy = DEFAULT_STAFF_ACCESS_POLICY
): PlayerRecord {
  if (!canEditPlayerStats(role, policy)) {
    throw new Error('Unauthorized: Staff permission required to edit player stats.');
  }

  const cleanUsername =
    typeof patch.username === 'string' && patch.username.trim().length > 0
      ? patch.username.trim()
      : existing.username;

  const canChangeTeam = canChangePlayerTeam(role, policy);
  const nextClub =
    canChangeTeam && typeof patch.club === 'string' && patch.club.trim().length > 0
      ? patch.club.trim()
      : existing.club;

  const updated: PlayerRecord = {
    ...existing,
    username: cleanUsername,
    displayName:
      typeof patch.displayName === 'string' && patch.displayName.trim().length > 0
        ? patch.displayName.trim()
        : existing.displayName,
    club: nextClub,
    position:
      patch.position && VALID_POSITIONS.includes(patch.position)
        ? patch.position
        : existing.position,
    tier: patch.tier ?? existing.tier,
    rating: clampStat(patch.rating, existing.rating, 1, 99),
    pace: clampStat(patch.pace, existing.pace, 1, 99),
    shooting: clampStat(patch.shooting, existing.shooting, 1, 99),
    passing: clampStat(patch.passing, existing.passing, 1, 99),
    dribbling: clampStat(patch.dribbling, existing.dribbling, 1, 99),
    defending: clampStat(patch.defending, existing.defending, 1, 99),
    physical: clampStat(patch.physical, existing.physical, 1, 99),
    appearances: clampNonNegative(patch.appearances, existing.appearances),
    goals: clampNonNegative(patch.goals, existing.goals),
    assists: clampNonNegative(patch.assists, existing.assists),
    foot:
      patch.foot && VALID_PREFERRED_FEET.includes(patch.foot)
        ? patch.foot
        : existing.foot,
    wage: clampNonNegative(patch.wage, existing.wage),
    releaseClause: clampNonNegative(patch.releaseClause, existing.releaseClause),
    scoutingReport:
      typeof patch.scoutingReport === 'string' && patch.scoutingReport.trim().length > 0
        ? patch.scoutingReport.trim()
        : existing.scoutingReport,
    suspended: existing.suspended,
    banned: existing.banned,
    banReason: existing.banReason,
    securityRank: existing.securityRank,
    isFounder: existing.isFounder,
  };

  if (canSuspendPlayer(role, policy) && typeof patch.suspended === 'boolean') {
    updated.suspended = patch.suspended;
  }

  if (canBanEntity(role, policy)) {
    if (typeof patch.banned === 'boolean') {
      updated.banned = patch.banned;
    }
    if (typeof patch.banReason === 'string') {
      updated.banReason = patch.banReason.trim();
    }
  }

  if (canManageHierarchy(role, policy) && patch.securityRank) {
    updated.securityRank = patch.securityRank;
  }

  if (role === 'founder') {
    if (typeof patch.isFounder === 'boolean') {
      updated.isFounder = patch.isFounder;
    }
    if (typeof patch.avatarUrl === 'string') {
      updated.avatarUrl = patch.avatarUrl.trim();
    }
    if (
      typeof patch.robloxId === 'number' &&
      Number.isFinite(patch.robloxId) &&
      patch.robloxId > 0
    ) {
      updated.robloxId = Math.round(patch.robloxId);
    }
  }

  return updated;
}

export interface SkillRankInfo {
  rank: 'S' | 'A' | 'B' | 'D';
  label: string;
  quality: string;
  fullLabel: string;
  summary: string;
  textClass: string;
  borderClass: string;
}

export const SKILL_RANK_MAP: Record<'S' | 'A' | 'B' | 'D', SkillRankInfo> = {
  S: {
    rank: 'S',
    label: 'S Rank',
    quality: 'Very Good',
    fullLabel: 'S Rank · Very Good',
    summary: 'Very good players — elite technical mastery, clinical finishing, and match-winning command.',
    textClass: 'text-founder',
    borderClass: 'border-founder/40 hover:border-founder',
  },
  A: {
    rank: 'A',
    label: 'A Rank',
    quality: 'Good',
    fullLabel: 'A Rank · Good',
    summary: 'Good players — strong, proven starters with sharp technical attributes across every phase.',
    textClass: 'text-ember',
    borderClass: 'border-crimson/40 hover:border-ember',
  },
  B: {
    rank: 'B',
    label: 'B Rank',
    quality: 'Decent',
    fullLabel: 'B Rank · Decent',
    summary: 'Decent players — dependable competitive contributors with balanced fundamentals.',
    textClass: 'text-emerald-400',
    borderClass: 'border-emerald-500/35 hover:border-emerald-400',
  },
  D: {
    rank: 'D',
    label: 'D Rank',
    quality: 'Okay',
    fullLabel: 'D Rank · Okay',
    summary: 'Okay players — foundational RFF² roster tier building match sharpness in Pre-Season.',
    textClass: 'text-fog',
    borderClass: 'border-white/12 hover:border-white/35',
  },
};

export function getSkillRankInfo(tier: PlayerClass | SecurityRank): SkillRankInfo {
  if (tier === 'S') return SKILL_RANK_MAP.S;
  if (tier === 'A') return SKILL_RANK_MAP.A;
  if (tier === 'B') return SKILL_RANK_MAP.B;
  return SKILL_RANK_MAP.D;
}

export const SECURITY_HIERARCHY_LEVELS: Array<{
  rank: SecurityRank;
  title: string;
  ratingLabel: string;
  qualityLabel: string;
  summary: string;
  capabilities: string[];
}> = [
  {
    rank: 'S',
    title: 'S Rank — Very Good Players',
    ratingLabel: 'OVR 90–99',
    qualityLabel: 'Very Good',
    summary: 'Top skill tier for very good players, headlined by the 5 Rank 99 Founders.',
    capabilities: [
      'Elite technical attributes & match-winning composure',
      'Apex Pre-Season valuation & marquee squad status',
      'Held by the 5 RFF² Founders (Rank 99) & top stars',
    ],
  },
  {
    rank: 'A',
    title: 'A Rank — Good Players',
    ratingLabel: 'OVR 78–89',
    qualityLabel: 'Good',
    summary: 'High-performing good players capable of anchoring competitive starting lineups.',
    capabilities: [
      'Strong technical execution & positional intelligence',
      'High-priority club targets during Pre-Season trials',
      'Earned purely through on-pitch skill & performance',
    ],
  },
  {
    rank: 'B',
    title: 'B Rank — Decent Players',
    ratingLabel: 'OVR 68–77',
    qualityLabel: 'Decent',
    summary: 'Decent players delivering consistent, reliable minutes across league fixtures.',
    capabilities: [
      'Balanced technical profile & dependable work rate',
      'Solid squad depth & tactical versatility',
      'Stepping-stone rank toward A-Rank starter status',
    ],
  },
  {
    rank: 'D',
    title: 'D Rank — Okay Players',
    ratingLabel: 'OVR 60',
    qualityLabel: 'Okay',
    summary: 'Okay players entering Pre-Season at Rank 60 with room to prove their skill on the pitch.',
    capabilities: [
      'Entry RFF² skill classification (Rank 60 baseline)',
      'Live synced Roblox Profile Picture & Roblox User ID',
      'Rank reflects current skill — earn promotions in matches',
    ],
  },
];
