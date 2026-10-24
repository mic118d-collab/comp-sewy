import 'dotenv/config';
import express from 'express';
import type { Request, Response, NextFunction } from 'express';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';
import type {
  AuditLogEntry,
  HierarchyAccount,
  LeagueDivision,
  LeagueId,
  PlayerClass,
  PlayerRecord,
  PositionCode,
  PreferredFoot,
  RobloxProfileDetails,
  SecurityRank,
  SiteConfig,
  StaffAccessPolicy,
  StaffRole,
} from './src/lib/types.ts';
import {
  VALID_POSITIONS,
  VALID_PREFERRED_FEET,
  applyRoleSafePlayerUpdate,
  authenticateStaffPassword,
  buildDefaultSiteConfig,
  buildDefaultStaffAccessPolicy,
  canAddPlayer,
  canBanEntity,
  canChangePlayerTeam,
  canDeletePlayer,
  canEditPlayerStats,
  canManageFounderControls,
  canManageHierarchy,
  canManageLeagueStandings,
  canSuspendPlayer,
  clampNonNegative,
  clampStat,
  isRoleKeyPaused,
  sanitizeSiteConfig,
  sanitizeStaffAccessPolicy,
} from './src/lib/hierarchy.ts';
import {
  UNKNOWN_TEAM_ROLE,
  applyMatchResultToLeague,
  applyTeamRollToPlayer,
  buildInitialLeagues,
  computeClubStanding,
  resetLeagueStandings,
  sortLeagueClubs,
} from './src/lib/leagues.ts';
import {
  AVATAR_REFRESH_INTERVAL_MS,
  VERIFIED_ROBLOX_IDS,
  buildInitialHierarchyAccounts,
  buildInitialPlayers,
  hashString,
} from './src/lib/rosterSeed.ts';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

function resolveWritableDataDir(): string {
  const candidates = [
    path.join(__dirname, 'data'),
    path.join(os.tmpdir(), 'rff-registry-data'),
  ];
  for (const dir of candidates) {
    try {
      fs.mkdirSync(dir, { recursive: true });
      fs.accessSync(dir, fs.constants.R_OK | fs.constants.W_OK);
      return dir;
    } catch {
      // Try next writable directory candidate
    }
  }
  return os.tmpdir();
}

const DATA_DIR = resolveWritableDataDir();
const STATE_FILE = path.join(DATA_DIR, 'registry-state.json');
const ROBLOX_CACHE_FILE = path.join(DATA_DIR, 'roblox-cache.json');

interface CachedRobloxUser {
  robloxId: number | null;
  resolvedOnRoblox: boolean;
  batchConfirmedNotFound?: boolean;
  searchAttempted?: boolean;
  headshotFetchedAt?: number;
  name: string;
  displayName: string;
  hasVerifiedBadge: boolean;
  headshotUrl: string;
  fullBodyUrl?: string;
  description?: string;
  created?: string | null;
  isBannedOnRoblox?: boolean;
  friendsCount?: number;
  followersCount?: number;
  followingCount?: number;
  updatedAt: number;
}

interface PersistedState {
  version: number;
  players: PlayerRecord[];
  hierarchy: HierarchyAccount[];
  leagues: LeagueDivision[];
  auditLogs: AuditLogEntry[];
  staffPolicy: StaffAccessPolicy;
  siteConfig: SiteConfig;
}

const CURRENT_STATE_VERSION = 10;

let robloxCache: Record<string, CachedRobloxUser> = {};
if (fs.existsSync(ROBLOX_CACHE_FILE)) {
  try {
    robloxCache = JSON.parse(fs.readFileSync(ROBLOX_CACHE_FILE, 'utf-8'));
  } catch {
    robloxCache = {};
  }
}

function saveRobloxCache() {
  try {
    fs.writeFileSync(ROBLOX_CACHE_FILE, JSON.stringify(robloxCache, null, 2));
  } catch (err) {
    console.error('Failed saving Roblox cache:', err);
  }
}

function deterministicFallbackId(username: string): number {
  return 9000000000 + (hashString(username.toLowerCase()) % 899999999);
}

function loadOrInitializeState(): PersistedState {
  if (fs.existsSync(STATE_FILE)) {
    try {
      const parsed = JSON.parse(fs.readFileSync(STATE_FILE, 'utf-8')) as Partial<PersistedState>;
      if (
        parsed &&
        parsed.version === CURRENT_STATE_VERSION &&
        Array.isArray(parsed.players) &&
        Array.isArray(parsed.leagues)
      ) {
        return {
          version: CURRENT_STATE_VERSION,
          players: parsed.players,
          hierarchy: Array.isArray(parsed.hierarchy)
            ? parsed.hierarchy
            : buildInitialHierarchyAccounts(parsed.players),
          leagues: parsed.leagues,
          auditLogs: Array.isArray(parsed.auditLogs) ? parsed.auditLogs : [],
          staffPolicy: sanitizeStaffAccessPolicy(parsed.staffPolicy),
          siteConfig: sanitizeSiteConfig(parsed.siteConfig),
        };
      }
    } catch {
      // Rebuild fresh state below
    }
  }

  const players = buildInitialPlayers();
  const hierarchy = buildInitialHierarchyAccounts(players);
  const leagues = buildInitialLeagues();
  const staffPolicy = buildDefaultStaffAccessPolicy();
  const siteConfig = buildDefaultSiteConfig();
  const auditLogs: AuditLogEntry[] = [
    {
      id: Date.now(),
      actor: 'FederationSystem',
      actorRole: 'system',
      action: 'REGISTRY_INITIALIZED',
      target: `${players.length} Athletes · 4 Leagues`,
      detail: `Initialized Pre-Season Registry (0G / 0A): 4 separate RFF leagues (32 clubs at 0 PTS, 0 W, 0 D, 0 L, 0 G/A — Admin controlled), Position, Preferred Foot & Team set to Unknown (Staff controlled), 5 Founders at Rank 99 (S Rank), and ${players.length - 5} Athletes at Rank 60 (D Rank).`,
      timestamp: new Date().toISOString(),
    },
  ];

  const fresh: PersistedState = {
    version: CURRENT_STATE_VERSION,
    players,
    hierarchy,
    leagues,
    auditLogs,
    staffPolicy,
    siteConfig,
  };
  saveState(fresh);
  return fresh;
}

function saveState(s: PersistedState) {
  try {
    fs.writeFileSync(STATE_FILE, JSON.stringify(s, null, 2));
  } catch (err) {
    console.error('Failed saving registry state:', err);
  }
}

const state = loadOrInitializeState();
let syncInProgress = false;

async function fetchJsonWithTimeout<T>(
  url: string,
  init?: RequestInit,
  timeoutMs = 7000
): Promise<T | null> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(url, {
      ...init,
      signal: controller.signal,
      headers: {
        Accept: 'application/json',
        ...(init?.headers ?? {}),
      },
    });
    if (!res.ok) return null;
    return (await res.json()) as T;
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
  }
}

function chunkArray<T>(items: T[], size: number): T[][] {
  const chunks: T[][] = [];
  for (let i = 0; i < items.length; i += size) {
    chunks.push(items.slice(i, i + size));
  }
  return chunks;
}

function buildLookupCandidates(username: string): string[] {
  const trimmed = username.trim();
  const candidates = [trimmed];
  const underscored = trimmed.replace(/\s+/g, '_').replace(/[^a-zA-Z0-9_]/g, '');
  const collapsed = trimmed.replace(/[^a-zA-Z0-9_]/g, '');
  if (underscored && !candidates.includes(underscored)) candidates.push(underscored);
  if (collapsed && !candidates.includes(collapsed)) candidates.push(collapsed);
  return candidates.filter((c) => c.length >= 2 && c.length <= 20);
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

const HEADSHOT_MAX_AGE_MS = 10 * 60 * 1000;

async function resolveBatchUsernames(usernames: string[]): Promise<void> {
  const now = Date.now();
  const unresolved = usernames.filter((u) => {
    const lower = u.toLowerCase();
    const verifiedId = VERIFIED_ROBLOX_IDS[lower];
    const entry = robloxCache[lower];
    if (verifiedId && (!entry || entry.robloxId !== verifiedId || !entry.resolvedOnRoblox)) {
      return true;
    }
    if (!entry) return true;
    if (!entry.resolvedOnRoblox && !entry.batchConfirmedNotFound) return true;
    if (entry.resolvedOnRoblox && entry.robloxId) {
      if (!entry.headshotUrl) return true;
      if (!entry.headshotFetchedAt || now - entry.headshotFetchedAt > HEADSHOT_MAX_AGE_MS) {
        return true;
      }
    }
    return false;
  });

  const matchedOriginalLower = new Set<string>();
  const resolvedIdsToFetchThumbs = new Set<number>();
  const idToCacheKeys = new Map<number, string[]>();

  // 1. Resolve authoritative Bloxlink-verified IDs directly via /v1/users
  const verifiedPairs: Array<{ origKey: string; uid: number }> = [];
  const remainingUnresolved: string[] = [];

  for (const orig of unresolved) {
    const origKey = orig.toLowerCase();
    const entry = robloxCache[origKey];
    const verifiedId = VERIFIED_ROBLOX_IDS[origKey];
    if (verifiedId && (!entry || entry.robloxId !== verifiedId || !entry.resolvedOnRoblox)) {
      verifiedPairs.push({ origKey, uid: verifiedId });
    } else if (!entry || !entry.resolvedOnRoblox) {
      remainingUnresolved.push(orig);
    }
  }

  if (verifiedPairs.length > 0) {
    const uniqueVerifiedIds = Array.from(new Set(verifiedPairs.map((vp) => vp.uid)));
    const uidBatches = chunkArray(uniqueVerifiedIds, 90);
    const uidToUser = new Map<
      number,
      { id: number; name: string; displayName: string; hasVerifiedBadge: boolean }
    >();

    for (let i = 0; i < uidBatches.length; i++) {
      if (i > 0) await sleep(180);
      const uidBatch = uidBatches[i];
      const resp = await fetchJsonWithTimeout<{
        data?: Array<{
          id: number;
          name: string;
          displayName: string;
          hasVerifiedBadge: boolean;
        }>;
      }>('https://users.roblox.com/v1/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userIds: uidBatch,
          excludeBannedUsers: false,
        }),
      });
      if (resp?.data) {
        for (const u of resp.data) {
          uidToUser.set(u.id, u);
        }
      }
    }

    for (const { origKey, uid } of verifiedPairs) {
      const hit = uidToUser.get(uid);
      const prev = robloxCache[origKey];
      matchedOriginalLower.add(origKey);
      robloxCache[origKey] = {
        ...prev,
        robloxId: uid,
        resolvedOnRoblox: true,
        batchConfirmedNotFound: false,
        name: hit?.name || prev?.name || origKey,
        displayName: hit?.displayName || hit?.name || prev?.displayName || origKey,
        hasVerifiedBadge: Boolean(hit?.hasVerifiedBadge),
        headshotUrl: prev?.robloxId === uid ? prev?.headshotUrl ?? '' : '',
        headshotFetchedAt: prev?.robloxId === uid ? prev?.headshotFetchedAt : undefined,
        fullBodyUrl: prev?.robloxId === uid ? prev?.fullBodyUrl : undefined,
        description: prev?.robloxId === uid ? prev?.description : undefined,
        updatedAt: Date.now(),
      };
      resolvedIdsToFetchThumbs.add(uid);
      const keys = idToCacheKeys.get(uid) ?? [];
      if (!keys.includes(origKey)) keys.push(origKey);
      idToCacheKeys.set(uid, keys);
    }
  }

  // 2. Map remaining candidate strings -> original player usernames
  const candidateToOriginals = new Map<string, string[]>();
  const origToCandidates = new Map<string, string[]>();
  for (const orig of remainingUnresolved) {
    const origKey = orig.toLowerCase();
    const cands = buildLookupCandidates(orig);
    origToCandidates.set(
      origKey,
      cands.map((c) => c.toLowerCase())
    );
    for (const cand of cands) {
      const lowerCand = cand.toLowerCase();
      const list = candidateToOriginals.get(lowerCand) ?? [];
      if (!list.includes(orig)) list.push(orig);
      candidateToOriginals.set(lowerCand, list);
    }
  }

  const allCandidates = Array.from(candidateToOriginals.keys());
  const batches = chunkArray(allCandidates, 75);
  const succeededCandidateChecked = new Set<string>();

  for (let bIdx = 0; bIdx < batches.length; bIdx++) {
    if (bIdx > 0) await sleep(220);
    const batch = batches[bIdx];
    const resp = await fetchJsonWithTimeout<{
      data?: Array<{
        requestedUsername: string;
        id: number;
        name: string;
        displayName: string;
        hasVerifiedBadge: boolean;
      }>;
    }>('https://users.roblox.com/v1/usernames/users', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        usernames: batch,
        excludeBannedUsers: false,
      }),
    });

    if (resp && Array.isArray(resp.data)) {
      for (const c of batch) {
        succeededCandidateChecked.add(c.toLowerCase());
      }
      for (const hit of resp.data) {
        const reqLower = hit.requestedUsername.toLowerCase();
        const originals = candidateToOriginals.get(reqLower) ?? [hit.requestedUsername];
        for (const orig of originals) {
          const origKey = orig.toLowerCase();
          if (matchedOriginalLower.has(origKey)) continue;
          matchedOriginalLower.add(origKey);

          const prev = robloxCache[origKey];
          robloxCache[origKey] = {
            ...prev,
            robloxId: hit.id,
            resolvedOnRoblox: true,
            batchConfirmedNotFound: false,
            name: hit.name,
            displayName: hit.displayName || hit.name,
            hasVerifiedBadge: Boolean(hit.hasVerifiedBadge),
            headshotUrl: prev?.robloxId === hit.id ? prev?.headshotUrl ?? '' : '',
            headshotFetchedAt: prev?.robloxId === hit.id ? prev?.headshotFetchedAt : undefined,
            updatedAt: Date.now(),
          };
          resolvedIdsToFetchThumbs.add(hit.id);
          const keys = idToCacheKeys.get(hit.id) ?? [];
          if (!keys.includes(origKey)) keys.push(origKey);
          idToCacheKeys.set(hit.id, keys);
        }
      }
    }
  }

  // Record deterministic fallback IDs, but ONLY set batchConfirmedNotFound when every candidate
  // for this username was checked in a non-rate-limited HTTP 200 batch response.
  for (const orig of remainingUnresolved) {
    const origKey = orig.toLowerCase();
    if (matchedOriginalLower.has(origKey)) continue;
    const cands = origToCandidates.get(origKey) ?? [];
    const allChecked =
      cands.length === 0 || cands.every((c) => succeededCandidateChecked.has(c));
    const prev = robloxCache[origKey];
    robloxCache[origKey] = {
      ...prev,
      robloxId: prev?.robloxId ?? deterministicFallbackId(orig),
      resolvedOnRoblox: false,
      batchConfirmedNotFound: allChecked,
      searchAttempted: prev?.searchAttempted ?? false,
      name: prev?.name || orig,
      displayName: prev?.displayName || orig,
      hasVerifiedBadge: false,
      headshotUrl: prev?.headshotUrl ?? '',
      updatedAt: Date.now(),
    };
  }

  // 3. Progressively resolve up to 8 display-name handles per 10s cycle via keyword search
  // so athletes with display-name handles get real Roblox avatars automatically without clicking
  const searchCandidates = usernames.filter((u) => {
    const entry = robloxCache[u.toLowerCase()];
    return Boolean(
      entry &&
        !entry.resolvedOnRoblox &&
        entry.batchConfirmedNotFound &&
        !entry.searchAttempted
    );
  });

  for (const orig of searchCandidates.slice(0, 8)) {
    const origKey = orig.toLowerCase();
    const prev = robloxCache[origKey];
    if (!prev) continue;
    await sleep(120);
    const searchResp = await fetchJsonWithTimeout<{
      data?: Array<{
        id: number;
        name: string;
        displayName: string;
        hasVerifiedBadge: boolean;
      }>;
    }>(
      `https://users.roblox.com/v1/users/search?keyword=${encodeURIComponent(orig)}&limit=10`,
      undefined,
      3500
    );

    if (searchResp && Array.isArray(searchResp.data)) {
      if (searchResp.data.length > 0) {
        const hit = searchResp.data[0];
        robloxCache[origKey] = {
          ...prev,
          robloxId: hit.id,
          resolvedOnRoblox: true,
          batchConfirmedNotFound: false,
          searchAttempted: true,
          name: hit.name,
          displayName: hit.displayName || hit.name,
          hasVerifiedBadge: Boolean(hit.hasVerifiedBadge),
          headshotUrl: '',
          headshotFetchedAt: undefined,
          updatedAt: Date.now(),
        };
        resolvedIdsToFetchThumbs.add(hit.id);
        const keys = idToCacheKeys.get(hit.id) ?? [];
        if (!keys.includes(origKey)) keys.push(origKey);
        idToCacheKeys.set(hit.id, keys);
      } else {
        robloxCache[origKey] = {
          ...prev,
          searchAttempted: true,
          updatedAt: Date.now(),
        };
      }
    }
  }

  // 4. Queue any resolved IDs missing headshotUrl or whose headshot URL is older than HEADSHOT_MAX_AGE_MS
  const refreshNow = Date.now();
  for (const [key, entry] of Object.entries(robloxCache)) {
    if (
      entry.resolvedOnRoblox &&
      entry.robloxId &&
      (!entry.headshotUrl ||
        !entry.headshotFetchedAt ||
        refreshNow - entry.headshotFetchedAt > HEADSHOT_MAX_AGE_MS)
    ) {
      resolvedIdsToFetchThumbs.add(entry.robloxId);
      const keys = idToCacheKeys.get(entry.robloxId) ?? [];
      if (!keys.includes(key)) keys.push(key);
      idToCacheKeys.set(entry.robloxId, keys);
    }
  }

  // 5. Batch fetch 150x150 avatar headshots (up to 90 userIds per request)
  const idList = Array.from(resolvedIdsToFetchThumbs);
  const idBatches = chunkArray(idList, 90);
  for (let tIdx = 0; tIdx < idBatches.length; tIdx++) {
    if (tIdx > 0) await sleep(150);
    const idBatch = idBatches[tIdx];
    const thumbResp = await fetchJsonWithTimeout<{
      data?: Array<{
        targetId: number;
        state: string;
        imageUrl: string | null;
      }>;
    }>(
      `https://thumbnails.roblox.com/v1/users/avatar-headshot?userIds=${idBatch.join(',')}&size=150x150&format=Png&isCircular=false`
    );

    if (thumbResp?.data) {
      const fetchedStamp = Date.now();
      for (const item of thumbResp.data) {
        if (item.imageUrl) {
          const keys = idToCacheKeys.get(item.targetId) ?? [];
          for (const key of keys) {
            if (robloxCache[key]) {
              robloxCache[key].headshotUrl = item.imageUrl;
              robloxCache[key].headshotFetchedAt = fetchedStamp;
            }
          }
        }
      }
    }
  }

  saveRobloxCache();
}

function applyCachedRobloxToState() {
  let changed = false;
  for (const p of state.players) {
    const cached = robloxCache[p.username.toLowerCase()];
    if (cached) {
      if (cached.robloxId && p.robloxId !== cached.robloxId) {
        p.robloxId = cached.robloxId;
        changed = true;
      }
      if (cached.headshotUrl && p.avatarUrl !== cached.headshotUrl) {
        p.avatarUrl = cached.headshotUrl;
        changed = true;
      }
      if (cached.displayName && p.displayName === p.username && cached.displayName !== p.displayName) {
        p.displayName = cached.displayName;
        changed = true;
      }
    } else if (!p.robloxId) {
      p.robloxId = deterministicFallbackId(p.username);
      changed = true;
    }
  }

  for (const acc of state.hierarchy) {
    const cached = robloxCache[acc.username.toLowerCase()];
    if (cached) {
      if (cached.robloxId && acc.robloxId !== cached.robloxId) {
        acc.robloxId = cached.robloxId;
        changed = true;
      }
      if (cached.headshotUrl && acc.avatarUrl !== cached.headshotUrl) {
        acc.avatarUrl = cached.headshotUrl;
        changed = true;
      }
    }
  }

  if (changed) {
    saveState(state);
  }
}

async function syncAllRobloxUsers() {
  if (syncInProgress) return;
  syncInProgress = true;
  try {
    applyCachedRobloxToState();
    const allUsernames = Array.from(
      new Set([
        ...state.players.map((p) => p.username),
        ...state.hierarchy.map((h) => h.username),
      ])
    );
    await resolveBatchUsernames(allUsernames);
    applyCachedRobloxToState();
  } catch (err) {
    console.error('Roblox batch sync error:', err);
  } finally {
    syncInProgress = false;
  }
}

// Active staff sessions stored server-side
interface ActiveTokenSession {
  token: string;
  role: StaffRole;
  actorName: string;
  securityRank: SecurityRank;
  createdAt: number;
}

const activeSessions = new Map<string, ActiveTokenSession>();

function getActiveStaffSessionCounts(): {
  founder: number;
  admin: number;
  moderator: number;
} {
  let founder = 0;
  let admin = 0;
  let moderator = 0;
  for (const s of activeSessions.values()) {
    if (isRoleKeyPaused(s.role, state.staffPolicy)) continue;
    if (s.role === 'founder') founder++;
    else if (s.role === 'admin') admin++;
    else if (s.role === 'moderator') moderator++;
  }
  return { founder, admin, moderator };
}

function revokeSessionsByRole(target: 'admin' | 'moderator' | 'all'): number {
  let removed = 0;
  for (const [token, sess] of activeSessions.entries()) {
    if (sess.role === 'founder') continue;
    if (target === 'all' || sess.role === target) {
      activeSessions.delete(token);
      removed++;
    }
  }
  return removed;
}

function getSessionFromReq(req: Request): ActiveTokenSession | null {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) return null;
  const token = authHeader.slice('Bearer '.length).trim();
  const session = activeSessions.get(token);
  if (!session) return null;
  if (isRoleKeyPaused(session.role, state.staffPolicy)) {
    activeSessions.delete(token);
    return null;
  }
  return session;
}

function recordAudit(
  actor: string,
  actorRole: StaffRole | 'system',
  action: string,
  target: string,
  detail: string
) {
  state.auditLogs.unshift({
    id: Date.now() + Math.floor(Math.random() * 1000),
    actor,
    actorRole,
    action,
    target,
    detail,
    timestamp: new Date().toISOString(),
  });
  if (state.auditLogs.length > 250) {
    state.auditLogs.length = 250;
  }
}

async function startServer() {
  const app = express();
  app.use(express.json({ limit: '1mb' }));

  // Trigger background Roblox batch resolution immediately on startup and refresh every 10 seconds
  void syncAllRobloxUsers();
  const avatarSyncTimer = setInterval(() => {
    void syncAllRobloxUsers();
  }, AVATAR_REFRESH_INTERVAL_MS);
  avatarSyncTimer.unref();

  // 0. Health check for Cloud Run readiness probes
  app.get('/api/health', (_req: Request, res: Response) => {
    res.json({ ok: true, leagues: state.leagues.length });
  });

  // 1. Registry State
  app.get('/api/state', (_req: Request, res: Response) => {
    applyCachedRobloxToState();
    res.setHeader('Cache-Control', 'no-store');
    res.json({
      players: state.players,
      hierarchy: state.hierarchy,
      leagues: state.leagues,
      auditLogs: state.auditLogs,
      staffPolicy: state.staffPolicy,
      siteConfig: state.siteConfig,
      activeStaffCounts: getActiveStaffSessionCounts(),
      syncInProgress,
    });
  });

  // 1b. Lightweight 10-Second Live Roblox Avatar Sync Feed
  app.get('/api/avatars', (_req: Request, res: Response) => {
    applyCachedRobloxToState();
    if (!syncInProgress) {
      void syncAllRobloxUsers();
    }
    res.setHeader('Cache-Control', 'no-store');
    res.json({
      players: state.players.map((p) => ({
        id: p.id,
        robloxId: p.robloxId,
        avatarUrl: p.avatarUrl,
        displayName: p.displayName,
      })),
      hierarchy: state.hierarchy.map((h) => ({
        id: h.id,
        robloxId: h.robloxId,
        avatarUrl: h.avatarUrl,
      })),
      syncInProgress,
      resolvedCount: state.players.filter((p) => Boolean(p.avatarUrl)).length,
      refreshedAt: Date.now(),
    });
  });

  // 2. Live Full Roblox Profile Lookup on Click
  app.get('/api/roblox/profile/:playerId', async (req: Request, res: Response) => {
    const playerId = Number(req.params.playerId);
    const player = state.players.find((p) => p.id === playerId);
    if (!player) {
      res.status(404).json({ error: 'Athlete not found in registry.' });
      return;
    }

    const key = player.username.toLowerCase();
    let cached = robloxCache[key];

    if (!cached) {
      await resolveBatchUsernames([player.username]);
      cached = robloxCache[key];
      applyCachedRobloxToState();
    }

    // If not resolved by exact username, try keyword search once for nicknames
    if (cached && !cached.resolvedOnRoblox) {
      const searchResp = await fetchJsonWithTimeout<{
        data?: Array<{
          id: number;
          name: string;
          displayName: string;
          hasVerifiedBadge: boolean;
        }>;
      }>(
        `https://users.roblox.com/v1/users/search?keyword=${encodeURIComponent(player.username)}&limit=10`,
        undefined,
        3500
      );

      if (searchResp?.data && searchResp.data.length > 0) {
        const hit = searchResp.data[0];
        cached = {
          ...cached,
          robloxId: hit.id,
          resolvedOnRoblox: true,
          name: hit.name,
          displayName: hit.displayName || hit.name,
          hasVerifiedBadge: Boolean(hit.hasVerifiedBadge),
          updatedAt: Date.now(),
        };
        robloxCache[key] = cached;
      }
    }

    if (cached?.resolvedOnRoblox && cached.robloxId) {
      const uid = cached.robloxId;
      const needsEnrichment =
        cached.description === undefined || !cached.fullBodyUrl || !cached.headshotUrl;

      if (needsEnrichment) {
        const [userDetail, headshotResp, fullBodyResp, friendsResp, followersResp, followingResp] =
          await Promise.all([
            fetchJsonWithTimeout<{
              description: string;
              created: string;
              isBanned: boolean;
              hasVerifiedBadge: boolean;
              id: number;
              name: string;
              displayName: string;
            }>(`https://users.roblox.com/v1/users/${uid}`, undefined, 4500),
            cached.headshotUrl
              ? Promise.resolve(null)
              : fetchJsonWithTimeout<{ data?: Array<{ imageUrl: string | null }> }>(
                  `https://thumbnails.roblox.com/v1/users/avatar-headshot?userIds=${uid}&size=150x150&format=Png&isCircular=false`,
                  undefined,
                  4500
                ),
            fetchJsonWithTimeout<{ data?: Array<{ imageUrl: string | null }> }>(
              `https://thumbnails.roblox.com/v1/users/avatar?userIds=${uid}&size=420x420&format=Png&isCircular=false`,
              undefined,
              4500
            ),
            fetchJsonWithTimeout<{ count?: number }>(
              `https://friends.roblox.com/v1/users/${uid}/friends/count`,
              undefined,
              3500
            ),
            fetchJsonWithTimeout<{ count?: number }>(
              `https://friends.roblox.com/v1/users/${uid}/followers/count`,
              undefined,
              3500
            ),
            fetchJsonWithTimeout<{ count?: number }>(
              `https://friends.roblox.com/v1/users/${uid}/followings/count`,
              undefined,
              3500
            ),
          ]);

        if (userDetail) {
          cached.name = userDetail.name || cached.name;
          cached.displayName = userDetail.displayName || cached.displayName;
          cached.description = userDetail.description ?? '';
          cached.created = userDetail.created ?? null;
          cached.isBannedOnRoblox = Boolean(userDetail.isBanned);
          cached.hasVerifiedBadge = Boolean(userDetail.hasVerifiedBadge);
        } else {
          cached.description = cached.description ?? '';
          cached.created = cached.created ?? null;
        }

        const hs = headshotResp?.data?.[0]?.imageUrl;
        if (hs) {
          cached.headshotUrl = hs;
          cached.headshotFetchedAt = Date.now();
        }

        const fb = fullBodyResp?.data?.[0]?.imageUrl;
        if (fb) cached.fullBodyUrl = fb;

        cached.friendsCount = friendsResp?.count ?? cached.friendsCount ?? 0;
        cached.followersCount = followersResp?.count ?? cached.followersCount ?? 0;
        cached.followingCount = followingResp?.count ?? cached.followingCount ?? 0;
        cached.updatedAt = Date.now();

        robloxCache[key] = cached;
        saveRobloxCache();
        applyCachedRobloxToState();
      }

      const details: RobloxProfileDetails = {
        playerId: player.id,
        username: cached.name || player.username,
        displayName: cached.displayName || player.displayName,
        robloxId: uid,
        resolvedOnRoblox: true,
        description:
          cached.description && cached.description.trim().length > 0
            ? cached.description
            : 'No public Roblox bio set by this athlete.',
        created: cached.created ?? null,
        isBannedOnRoblox: Boolean(cached.isBannedOnRoblox),
        hasVerifiedBadge: Boolean(cached.hasVerifiedBadge),
        headshotUrl: cached.headshotUrl || player.avatarUrl,
        fullBodyUrl: cached.fullBodyUrl || cached.headshotUrl || player.avatarUrl,
        friendsCount: cached.friendsCount ?? 0,
        followersCount: cached.followersCount ?? 0,
        followingCount: cached.followingCount ?? 0,
        profileUrl: `https://www.roblox.com/users/${uid}/profile`,
      };

      res.json(details);
      return;
    }

    const fallbackId = player.robloxId ?? deterministicFallbackId(player.username);
    const fallbackDetails: RobloxProfileDetails = {
      playerId: player.id,
      username: player.username,
      displayName: player.displayName,
      robloxId: fallbackId,
      resolvedOnRoblox: false,
      description: 'Registered RFF² Federation Athlete Dossier.',
      created: null,
      isBannedOnRoblox: false,
      hasVerifiedBadge: false,
      headshotUrl: player.avatarUrl,
      fullBodyUrl: player.avatarUrl,
      friendsCount: 0,
      followersCount: 0,
      followingCount: 0,
      profileUrl: null,
    };
    res.json(fallbackDetails);
  });

  // 3. Staff Password Authentication (Founder / Admin / Moderator)
  app.post('/api/auth/login', (req: Request, res: Response) => {
    const password = typeof req.body?.password === 'string' ? req.body.password : '';
    const authResult = authenticateStaffPassword(password, state.staffPolicy);

    if (authResult.paused) {
      const roleTitle = authResult.pausedRole === 'admin' ? 'Administrator' : 'Moderator';
      res.status(403).json({
        error: `Access paused: The ${roleTitle} key is currently paused by a Founder.`,
      });
      return;
    }

    if (!authResult.valid) {
      res.status(401).json({
        error: 'Access denied: Invalid staff authorization password.',
      });
      return;
    }

    const token = crypto.randomBytes(24).toString('hex');
    const session: ActiveTokenSession = {
      token,
      role: authResult.role,
      actorName: authResult.actorName,
      securityRank: authResult.securityRank,
      createdAt: Date.now(),
    };
    activeSessions.set(token, session);

    recordAudit(
      session.actorName,
      session.role,
      'STAFF_UNLOCK',
      'Staff Control Room',
      session.role === 'founder'
        ? 'Unlocked Founder Sovereign session (Unrestricted Key Control, Website Studio & Full Registry Command).'
        : session.role === 'admin'
          ? 'Unlocked Administrator session.'
          : 'Unlocked Moderator session.'
    );
    saveState(state);

    res.json({
      authenticated: true,
      role: session.role,
      actorName: session.actorName,
      securityRank: session.securityRank,
      token: session.token,
      staffPolicy: state.staffPolicy,
    });
  });

  app.get('/api/auth/session', (req: Request, res: Response) => {
    const session = getSessionFromReq(req);
    if (!session) {
      res.json({
        authenticated: false,
        role: 'guest',
        actorName: 'Guest',
        securityRank: 'D',
        staffPolicy: state.staffPolicy,
      });
      return;
    }
    res.json({
      authenticated: true,
      role: session.role,
      actorName: session.actorName,
      securityRank: session.securityRank,
      token: session.token,
      staffPolicy: state.staffPolicy,
    });
  });

  app.post('/api/auth/logout', (req: Request, res: Response) => {
    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith('Bearer ')) {
      const token = authHeader.slice('Bearer '.length).trim();
      const session = activeSessions.get(token);
      if (session) {
        recordAudit(
          session.actorName,
          session.role,
          'STAFF_LOCK',
          'Staff Control Room',
          'Locked staff session.'
        );
        activeSessions.delete(token);
        saveState(state);
      }
    }
    res.json({ ok: true });
  });

  // 4. Add Player
  app.post('/api/players', async (req: Request, res: Response) => {
    const session = getSessionFromReq(req);
    if (!session || !canAddPlayer(session.role, state.staffPolicy)) {
      res.status(403).json({
        error: 'Permission denied: Your staff role is not permitted to add players.',
      });
      return;
    }

    const rawUsername = typeof req.body?.username === 'string' ? req.body.username.trim() : '';
    if (!rawUsername) {
      res.status(400).json({ error: 'Roblox username is required.' });
      return;
    }

    const exists = state.players.some(
      (p) => p.username.toLowerCase() === rawUsername.toLowerCase()
    );
    if (exists) {
      res.status(409).json({ error: `Athlete @${rawUsername} is already registered.` });
      return;
    }

    // Resolve live Roblox ID & avatar immediately
    await resolveBatchUsernames([rawUsername]);
    const cached = robloxCache[rawUsername.toLowerCase()];

    const maxId = state.players.reduce((m, p) => Math.max(m, p.id), 0);
    const pos: PositionCode =
      req.body?.position && VALID_POSITIONS.includes(req.body.position)
        ? req.body.position
        : 'Unknown';
    const foot: PreferredFoot =
      req.body?.foot && VALID_PREFERRED_FEET.includes(req.body.foot)
        ? req.body.foot
        : 'Unknown';
    const tier: PlayerClass = req.body?.tier || 'D';
    const rating = clampStat(req.body?.rating, 60, 1, 99);
    const allowTeam = canChangePlayerTeam(session.role, state.staffPolicy);

    const newPlayer: PlayerRecord = {
      id: maxId + 1,
      username: rawUsername,
      displayName: cached?.displayName || rawUsername,
      robloxId: cached?.robloxId ?? deterministicFallbackId(rawUsername),
      avatarUrl:
        session.role === 'founder' && typeof req.body?.avatarUrl === 'string' && req.body.avatarUrl.trim()
          ? req.body.avatarUrl.trim()
          : cached?.headshotUrl ?? '',
      isFounder: session.role === 'founder' ? Boolean(req.body?.isFounder) : false,
      tier,
      securityRank:
        canManageHierarchy(session.role, state.staffPolicy) && req.body?.securityRank
          ? req.body.securityRank
          : 'D',
      position: pos,
      club:
        allowTeam && typeof req.body?.club === 'string' && req.body.club.trim()
          ? req.body.club.trim()
          : UNKNOWN_TEAM_ROLE,
      rating,
      pace: clampStat(req.body?.pace, 60, 1, 99),
      shooting: clampStat(req.body?.shooting, 58, 1, 99),
      passing: clampStat(req.body?.passing, 60, 1, 99),
      dribbling: clampStat(req.body?.dribbling, 60, 1, 99),
      defending: clampStat(req.body?.defending, 56, 1, 99),
      physical: clampStat(req.body?.physical, 60, 1, 99),
      appearances: clampNonNegative(req.body?.appearances, 0),
      goals: clampNonNegative(req.body?.goals, 0),
      assists: clampNonNegative(req.body?.assists, 0),
      foot,
      wage: clampNonNegative(req.body?.wage, 25000),
      releaseClause: clampNonNegative(req.body?.releaseClause, 2500000),
      suspended: canSuspendPlayer(session.role, state.staffPolicy)
        ? Boolean(req.body?.suspended)
        : false,
      banned: canBanEntity(session.role, state.staffPolicy)
        ? Boolean(req.body?.banned)
        : false,
      scoutingReport:
        typeof req.body?.scoutingReport === 'string' && req.body.scoutingReport.trim()
          ? req.body.scoutingReport.trim()
          : `Registered RFF² Athlete — ${tier} Class · Rank ${rating} (Pos: ${pos}, Foot: ${foot}).`,
    };

    state.players.push(newPlayer);
    recordAudit(
      session.actorName,
      session.role,
      'ADD_PLAYER',
      `@${newPlayer.username}`,
      `Added ${newPlayer.tier} Class · Rank ${newPlayer.rating} (Pos: ${newPlayer.position}, Foot: ${newPlayer.foot}) — Roblox ID ${newPlayer.robloxId}`
    );
    saveState(state);

    res.status(201).json({ player: newPlayer, auditLogs: state.auditLogs });
  });

  // 5. Edit Player Stats (Founder, Admin, or Moderator — governed by StaffAccessPolicy)
  app.patch('/api/players/:id', async (req: Request, res: Response) => {
    const session = getSessionFromReq(req);
    if (!session || !canEditPlayerStats(session.role, state.staffPolicy)) {
      res.status(403).json({
        error: 'Permission denied: Your staff role is not permitted to edit player stats.',
      });
      return;
    }

    const playerId = Number(req.params.id);
    const idx = state.players.findIndex((p) => p.id === playerId);
    if (idx === -1) {
      res.status(404).json({ error: 'Player not found.' });
      return;
    }

    const existing = state.players[idx];

    if (
      !canBanEntity(session.role, state.staffPolicy) &&
      typeof req.body?.banned === 'boolean' &&
      req.body.banned !== existing.banned
    ) {
      res.status(403).json({
        error: 'Permission denied: Your staff role cannot ban or unban players.',
      });
      return;
    }

    if (
      !canSuspendPlayer(session.role, state.staffPolicy) &&
      typeof req.body?.suspended === 'boolean' &&
      req.body.suspended !== existing.suspended
    ) {
      res.status(403).json({
        error: 'Permission denied: Your staff role cannot suspend or reinstate players.',
      });
      return;
    }

    const updated = applyRoleSafePlayerUpdate(
      existing,
      req.body ?? {},
      session.role,
      state.staffPolicy
    );

    if (updated.username.toLowerCase() !== existing.username.toLowerCase()) {
      await resolveBatchUsernames([updated.username]);
      const cached = robloxCache[updated.username.toLowerCase()];
      if (cached) {
        updated.robloxId = cached.robloxId ?? updated.robloxId;
        if (!req.body?.avatarUrl) {
          updated.avatarUrl = cached.headshotUrl || updated.avatarUrl;
        }
        updated.displayName = cached.displayName || updated.username;
      }
    }

    state.players[idx] = updated;
    const suspensionNote =
      updated.suspended !== existing.suspended
        ? `, Status: ${updated.suspended ? 'Suspended' : 'Active'}`
        : '';
    recordAudit(
      session.actorName,
      session.role,
      'EDIT_STATS',
      `@${updated.username}`,
      `Updated dossier -> Rank ${updated.rating} (${updated.tier} Class, Pos: ${updated.position}, Foot: ${updated.foot}), ${updated.goals}G / ${updated.assists}A, Club: ${updated.club}${suspensionNote}`
    );
    saveState(state);

    res.json({ player: updated, auditLogs: state.auditLogs });
  });

  // 6. Discipline Controls: Suspend / Ban (governed by StaffAccessPolicy; Founder unrestricted)
  app.post('/api/players/:id/discipline', (req: Request, res: Response) => {
    const session = getSessionFromReq(req);
    if (
      !session ||
      (!canSuspendPlayer(session.role, state.staffPolicy) &&
        !canBanEntity(session.role, state.staffPolicy))
    ) {
      res.status(403).json({
        error: 'Permission denied: Your staff role does not have discipline permissions.',
      });
      return;
    }

    const playerId = Number(req.params.id);
    const player = state.players.find((p) => p.id === playerId);
    if (!player) {
      res.status(404).json({ error: 'Player not found.' });
      return;
    }

    // Protect Founder records from non-Founder discipline
    if (player.isFounder && session.role !== 'founder') {
      res.status(403).json({
        error: 'Permission denied: Only a Founder can suspend or ban a Founder account.',
      });
      return;
    }

    const actionType = req.body?.action as 'suspend' | 'unsuspend' | 'ban' | 'unban';
    const reason = typeof req.body?.reason === 'string' ? req.body.reason.trim() : '';
    const roleLabel =
      session.role === 'founder'
        ? 'Founder'
        : session.role === 'admin'
          ? 'Admin'
          : 'Moderator';

    if (actionType === 'suspend' || actionType === 'unsuspend') {
      if (!canSuspendPlayer(session.role, state.staffPolicy)) {
        res.status(403).json({
          error: 'Permission denied: Suspension permission has been disabled for your role.',
        });
        return;
      }

      if (actionType === 'suspend') {
        player.suspended = true;
        recordAudit(
          session.actorName,
          session.role,
          'PLAYER_SUSPENDED',
          `@${player.username}`,
          reason || `Suspended from competitive RFF² fixtures by ${roleLabel}.`
        );
      } else {
        player.suspended = false;
        recordAudit(
          session.actorName,
          session.role,
          'PLAYER_REINSTATED',
          `@${player.username}`,
          `Suspension lifted by ${roleLabel}.`
        );
      }
    } else if (actionType === 'ban' || actionType === 'unban') {
      if (!canBanEntity(session.role, state.staffPolicy)) {
        res.status(403).json({
          error: 'Permission denied: Ban permission is not enabled for your role.',
        });
        return;
      }

      if (actionType === 'ban') {
        const banReasonText = reason || `Banned by Federation ${roleLabel}`;
        player.banned = true;
        player.banReason = banReasonText;
        recordAudit(
          session.actorName,
          session.role,
          'PLAYER_BANNED',
          `@${player.username}`,
          banReasonText
        );
      } else {
        player.banned = false;
        player.banReason = undefined;
        recordAudit(
          session.actorName,
          session.role,
          'PLAYER_UNBANNED',
          `@${player.username}`,
          `Ban revoked by Federation ${roleLabel}.`
        );
      }
    } else {
      res.status(400).json({ error: 'Invalid discipline action.' });
      return;
    }

    saveState(state);
    res.json({ player, auditLogs: state.auditLogs });
  });

  // 7. Delete Player
  app.delete('/api/players/:id', (req: Request, res: Response) => {
    const session = getSessionFromReq(req);
    if (!session || !canDeletePlayer(session.role, state.staffPolicy)) {
      res.status(403).json({
        error: 'Permission denied: Your staff role is not permitted to remove player records.',
      });
      return;
    }

    const playerId = Number(req.params.id);
    const idx = state.players.findIndex((p) => p.id === playerId);
    if (idx === -1) {
      res.status(404).json({ error: 'Player not found.' });
      return;
    }

    if (state.players[idx].isFounder && session.role !== 'founder') {
      res.status(403).json({
        error: 'Permission denied: Only a Founder can remove a Founder record.',
      });
      return;
    }

    const [removed] = state.players.splice(idx, 1);
    recordAudit(
      session.actorName,
      session.role,
      'DELETE_PLAYER',
      `@${removed.username}`,
      `Removed record (Roblox ID ${removed.robloxId ?? 'N/A'}) from federation database.`
    );
    saveState(state);

    res.json({ removedId: playerId, auditLogs: state.auditLogs });
  });

  // 8. Security Hierarchy Management
  app.patch('/api/hierarchy/:id', (req: Request, res: Response) => {
    const session = getSessionFromReq(req);
    if (!session || !canManageHierarchy(session.role, state.staffPolicy)) {
      res.status(403).json({
        error: 'Permission denied: Your staff role cannot modify the Security Hierarchy.',
      });
      return;
    }

    const accId = Number(req.params.id);
    const acc = state.hierarchy.find((a) => a.id === accId);
    if (!acc) {
      res.status(404).json({ error: 'Hierarchy account not found.' });
      return;
    }

    if (acc.isFounder && session.role !== 'founder') {
      res.status(403).json({
        error: 'Permission denied: Only a Founder can modify a Founder hierarchy account.',
      });
      return;
    }

    const changes: string[] = [];
    if (req.body?.securityRank && ['S', 'A', 'B', 'D'].includes(req.body.securityRank)) {
      const nextRank = req.body.securityRank as SecurityRank;
      acc.securityRank = nextRank;
      const titles: Record<SecurityRank, string> = {
        S: 'S Rank · Very Good Player',
        A: 'A Rank · Good Player',
        B: 'B Rank · Decent Player',
        D: 'D Rank · Okay Player',
      };
      acc.roleTitle = titles[nextRank];
      changes.push(`Clearance -> ${nextRank} Rank`);
    }
    if (typeof req.body?.banned === 'boolean') {
      acc.banned = req.body.banned;
      changes.push(acc.banned ? 'Account Banned' : 'Account Unbanned');
    }
    if (typeof req.body?.suspended === 'boolean') {
      acc.suspended = req.body.suspended;
      changes.push(acc.suspended ? 'Account Suspended' : 'Suspension Cleared');
    }
    if (typeof req.body?.kicked === 'boolean') {
      acc.kicked = req.body.kicked;
      if (acc.kicked) {
        acc.lastActive = 'Session Terminated';
        changes.push('Active Session Kicked');
      }
    }

    recordAudit(
      session.actorName,
      session.role,
      'HIERARCHY_UPDATE',
      `@${acc.username}`,
      changes.join(', ') || 'Updated security clearance.'
    );
    saveState(state);

    res.json({ account: acc, hierarchy: state.hierarchy, auditLogs: state.auditLogs });
  });

  // 9. Add Hierarchy Account
  app.post('/api/hierarchy', async (req: Request, res: Response) => {
    const session = getSessionFromReq(req);
    if (!session || !canManageHierarchy(session.role, state.staffPolicy)) {
      res.status(403).json({
        error: 'Permission denied: Your staff role cannot add hierarchy accounts.',
      });
      return;
    }

    const username = typeof req.body?.username === 'string' ? req.body.username.trim() : '';
    if (!username) {
      res.status(400).json({ error: 'Username is required.' });
      return;
    }

    const securityRank: SecurityRank = ['S', 'A', 'B', 'D'].includes(req.body?.securityRank)
      ? req.body.securityRank
      : 'D';

    await resolveBatchUsernames([username]);
    const cached = robloxCache[username.toLowerCase()];

    const titles: Record<SecurityRank, string> = {
      S: 'S Rank · Very Good Player',
      A: 'A Rank · Good Player',
      B: 'B Rank · Decent Player',
      D: 'D Rank · Okay Player',
    };

    const maxId = state.hierarchy.reduce((m, a) => Math.max(m, a.id), 400);
    const created: HierarchyAccount = {
      id: maxId + 1,
      username,
      robloxId: cached?.robloxId ?? deterministicFallbackId(username),
      avatarUrl: cached?.headshotUrl ?? '',
      securityRank,
      roleTitle: titles[securityRank],
      isFounder: securityRank === 'S' && session.role === 'founder',
      suspended: false,
      banned: false,
      kicked: false,
      lastActive: 'Newly Assigned',
    };

    state.hierarchy.push(created);
    recordAudit(
      session.actorName,
      session.role,
      'HIERARCHY_ASSIGN',
      `@${username}`,
      `Assigned ${securityRank} Rank in Security Hierarchy`
    );
    saveState(state);

    res.status(201).json({ account: created, hierarchy: state.hierarchy, auditLogs: state.auditLogs });
  });

  // 9b. Remove Hierarchy Account
  app.delete('/api/hierarchy/:id', (req: Request, res: Response) => {
    const session = getSessionFromReq(req);
    if (!session || !canManageHierarchy(session.role, state.staffPolicy)) {
      res.status(403).json({
        error: 'Permission denied: Your staff role cannot remove hierarchy accounts.',
      });
      return;
    }

    const accId = Number(req.params.id);
    const idx = state.hierarchy.findIndex((a) => a.id === accId);
    if (idx === -1) {
      res.status(404).json({ error: 'Hierarchy account not found.' });
      return;
    }

    if (state.hierarchy[idx].isFounder && session.role !== 'founder') {
      res.status(403).json({
        error: 'Permission denied: Only a Founder can remove a Founder hierarchy account.',
      });
      return;
    }

    const [removed] = state.hierarchy.splice(idx, 1);
    recordAudit(
      session.actorName,
      session.role,
      'HIERARCHY_REMOVE',
      `@${removed.username}`,
      `Removed @${removed.username} from Security Hierarchy.`
    );
    saveState(state);

    res.json({ hierarchy: state.hierarchy, auditLogs: state.auditLogs });
  });

  // 10. Official Team Assignment
  app.post('/api/players/:id/team-roll', (req: Request, res: Response) => {
    const session = getSessionFromReq(req);
    if (!session || !canChangePlayerTeam(session.role, state.staffPolicy)) {
      res.status(403).json({
        error: 'Permission denied: Your staff role is not permitted to change player teams.',
      });
      return;
    }

    const playerId = Number(req.params.id);
    const idx = state.players.findIndex((p) => p.id === playerId);
    if (idx === -1) {
      res.status(404).json({ error: 'Player not found in registry.' });
      return;
    }

    const rawClubName = typeof req.body?.clubName === 'string' ? req.body.clubName : '';
    try {
      const updated = applyTeamRollToPlayer(state.players[idx], rawClubName, state.leagues);
      state.players[idx] = updated;

      recordAudit(
        session.actorName,
        session.role,
        'TEAM_ASSIGN',
        `@${updated.username}`,
        updated.club === UNKNOWN_TEAM_ROLE
          ? 'Reset Team back to Unknown'
          : `Assigned official Team -> ${updated.club}`
      );
      saveState(state);

      res.json({ player: updated, auditLogs: state.auditLogs });
    } catch (err) {
      res.status(400).json({
        error: err instanceof Error ? err.message : 'Invalid official team selection.',
      });
    }
  });

  // 11. RFF League Standings — Log Intra-League Match Result
  app.post('/api/leagues/:leagueId/matches', (req: Request, res: Response) => {
    const session = getSessionFromReq(req);
    if (!session || !canManageLeagueStandings(session.role, state.staffPolicy)) {
      res.status(403).json({
        error: 'Permission denied: Your staff role is not permitted to modify league standings.',
      });
      return;
    }

    const leagueId = req.params.leagueId as LeagueId;
    const idx = state.leagues.findIndex((l) => l.id === leagueId);
    if (idx === -1) {
      res.status(404).json({ error: 'League division not found.' });
      return;
    }

    const homeClubId = typeof req.body?.homeClubId === 'string' ? req.body.homeClubId : '';
    const awayClubId = typeof req.body?.awayClubId === 'string' ? req.body.awayClubId : '';
    try {
      const updatedLeague = applyMatchResultToLeague(
        state.leagues[idx],
        homeClubId,
        awayClubId,
        req.body?.homeGoals,
        req.body?.awayGoals
      );
      state.leagues[idx] = updatedLeague;

      const homeClub = updatedLeague.clubs.find((c) => c.id === homeClubId);
      const awayClub = updatedLeague.clubs.find((c) => c.id === awayClubId);
      recordAudit(
        session.actorName,
        session.role,
        'LEAGUE_MATCH',
        updatedLeague.name,
        `Logged ${homeClub?.name ?? homeClubId} ${clampNonNegative(req.body?.homeGoals, 0)} - ${clampNonNegative(req.body?.awayGoals, 0)} ${awayClub?.name ?? awayClubId}`
      );
      saveState(state);

      res.json({ leagues: state.leagues, auditLogs: state.auditLogs });
    } catch (err) {
      res.status(400).json({
        error: err instanceof Error ? err.message : 'Invalid match payload.',
      });
    }
  });

  // 12. RFF League Standings — Edit Club Standing Directly
  app.patch('/api/leagues/:leagueId/clubs/:clubId', (req: Request, res: Response) => {
    const session = getSessionFromReq(req);
    if (!session || !canManageLeagueStandings(session.role, state.staffPolicy)) {
      res.status(403).json({
        error: 'Permission denied: Your staff role is not permitted to modify league standings.',
      });
      return;
    }

    const leagueId = req.params.leagueId as LeagueId;
    const clubId = req.params.clubId;
    const lIdx = state.leagues.findIndex((l) => l.id === leagueId);
    if (lIdx === -1) {
      res.status(404).json({ error: 'League division not found.' });
      return;
    }

    const league = state.leagues[lIdx];
    const cIdx = league.clubs.findIndex((c) => c.id === clubId);
    if (cIdx === -1) {
      res.status(404).json({ error: 'Club not found in this league.' });
      return;
    }

    const updatedClub = computeClubStanding(league.clubs[cIdx], req.body ?? {});
    const nextClubs = league.clubs.map((c, i) => (i === cIdx ? updatedClub : c));
    state.leagues[lIdx] = {
      ...league,
      clubs: sortLeagueClubs(nextClubs),
    };

    recordAudit(
      session.actorName,
      session.role,
      'LEAGUE_CLUB_EDIT',
      `${updatedClub.name} (${league.name})`,
      `Updated standing -> ${updatedClub.wins}W-${updatedClub.draws}D-${updatedClub.losses}L, G/A ${updatedClub.goalsAgainst}, ${updatedClub.points} PTS`
    );
    saveState(state);

    res.json({ leagues: state.leagues, auditLogs: state.auditLogs });
  });

  // 13. RFF League Standings — Reset Division Standings to Pre-Season Zero
  app.post('/api/leagues/:leagueId/reset', (req: Request, res: Response) => {
    const session = getSessionFromReq(req);
    if (!session || !canManageLeagueStandings(session.role, state.staffPolicy)) {
      res.status(403).json({
        error: 'Permission denied: Your staff role is not permitted to reset league standings.',
      });
      return;
    }

    const leagueId = req.params.leagueId as LeagueId;
    const lIdx = state.leagues.findIndex((l) => l.id === leagueId);
    if (lIdx === -1) {
      res.status(404).json({ error: 'League division not found.' });
      return;
    }

    state.leagues[lIdx] = resetLeagueStandings(state.leagues[lIdx]);
    recordAudit(
      session.actorName,
      session.role,
      'LEAGUE_RESET',
      state.leagues[lIdx].name,
      'Reset division table to Pre-Season 0 W / 0 D / 0 L / 0 G/A / 0 PTS.'
    );
    saveState(state);

    res.json({ leagues: state.leagues, auditLogs: state.auditLogs });
  });

  // 14. FOUNDER SOVEREIGN COMMAND — Pause Admin/Mod Keys & Toggle Role Permissions
  app.patch('/api/founder/staff-policy', (req: Request, res: Response) => {
    const session = getSessionFromReq(req);
    if (!session || !canManageFounderControls(session.role)) {
      res.status(403).json({
        error: 'Permission denied: Founder authorization key required.',
      });
      return;
    }

    if (req.body?.reset === true) {
      state.staffPolicy = buildDefaultStaffAccessPolicy();
      recordAudit(
        session.actorName,
        session.role,
        'FOUNDER_POLICY_RESET',
        'Admin & Moderator Roles',
        'Restored default Administrator and Moderator keys & permission matrix.'
      );
      saveState(state);
      res.json({
        staffPolicy: state.staffPolicy,
        activeStaffCounts: getActiveStaffSessionCounts(),
        auditLogs: state.auditLogs,
      });
      return;
    }

    const nextPolicy = sanitizeStaffAccessPolicy(req.body, state.staffPolicy);
    const notes: string[] = [];

    if (nextPolicy.admin.keyPaused !== state.staffPolicy.admin.keyPaused) {
      notes.push(nextPolicy.admin.keyPaused ? 'Admin Key PAUSED' : 'Admin Key RESUMED');
    }
    if (nextPolicy.moderator.keyPaused !== state.staffPolicy.moderator.keyPaused) {
      notes.push(nextPolicy.moderator.keyPaused ? 'Moderator Key PAUSED' : 'Moderator Key RESUMED');
    }

    state.staffPolicy = nextPolicy;

    if (state.staffPolicy.admin.keyPaused) {
      revokeSessionsByRole('admin');
    }
    if (state.staffPolicy.moderator.keyPaused) {
      revokeSessionsByRole('moderator');
    }

    recordAudit(
      session.actorName,
      session.role,
      'FOUNDER_POLICY_UPDATE',
      'Admin & Moderator Roles',
      notes.length > 0
        ? notes.join(', ')
        : 'Updated Admin / Moderator role permissions.'
    );
    saveState(state);

    res.json({
      staffPolicy: state.staffPolicy,
      activeStaffCounts: getActiveStaffSessionCounts(),
      auditLogs: state.auditLogs,
    });
  });

  // 15. FOUNDER SOVEREIGN COMMAND — Force Sign-Out Active Admin / Moderator Sessions
  app.post('/api/founder/revoke-sessions', (req: Request, res: Response) => {
    const session = getSessionFromReq(req);
    if (!session || !canManageFounderControls(session.role)) {
      res.status(403).json({
        error: 'Permission denied: Founder authorization key required.',
      });
      return;
    }

    const targetRole = req.body?.targetRole;
    if (targetRole !== 'admin' && targetRole !== 'moderator' && targetRole !== 'all') {
      res.status(400).json({ error: 'Invalid targetRole.' });
      return;
    }

    const revoked = revokeSessionsByRole(targetRole);
    recordAudit(
      session.actorName,
      session.role,
      'FOUNDER_REVOKE_SESSIONS',
      targetRole === 'all' ? 'All Admin & Mod Sessions' : `${targetRole} Sessions`,
      `Terminated ${revoked} active ${targetRole} session(s).`
    );
    saveState(state);

    res.json({
      revoked,
      activeStaffCounts: getActiveStaffSessionCounts(),
      auditLogs: state.auditLogs,
    });
  });

  // 16. FOUNDER WEBSITE STUDIO — Update Global Website Copy, Banner, Background & Layout
  app.patch('/api/founder/site-config', (req: Request, res: Response) => {
    const session = getSessionFromReq(req);
    if (!session || !canManageFounderControls(session.role)) {
      res.status(403).json({
        error: 'Permission denied: Founder authorization key required to edit website settings.',
      });
      return;
    }

    state.siteConfig = sanitizeSiteConfig(
      { ...state.siteConfig, ...(req.body ?? {}) },
      state.siteConfig
    );
    recordAudit(
      session.actorName,
      session.role,
      'FOUNDER_SITE_UPDATE',
      state.siteConfig.brandName,
      `Updated live website configuration & copy (Banner: ${state.siteConfig.announcementActive ? 'Active' : 'Off'}).`
    );
    saveState(state);

    res.json({
      siteConfig: state.siteConfig,
      auditLogs: state.auditLogs,
    });
  });

  app.post('/api/founder/site-config/reset', (req: Request, res: Response) => {
    const session = getSessionFromReq(req);
    if (!session || !canManageFounderControls(session.role)) {
      res.status(403).json({
        error: 'Permission denied: Founder authorization key required.',
      });
      return;
    }

    state.siteConfig = buildDefaultSiteConfig();
    recordAudit(
      session.actorName,
      session.role,
      'FOUNDER_SITE_RESET',
      'Website Studio',
      'Reset all website headlines, branding, spotlight, and visibility settings to default.'
    );
    saveState(state);

    res.json({
      siteConfig: state.siteConfig,
      auditLogs: state.auditLogs,
    });
  });

  // 17. FOUNDER LEAGUE & CLUB IDENTITY EDITOR — Rename Leagues, Regions, Logos & Clubs
  app.patch('/api/founder/leagues/:leagueId', (req: Request, res: Response) => {
    const session = getSessionFromReq(req);
    if (!session || !canManageFounderControls(session.role)) {
      res.status(403).json({
        error: 'Permission denied: Founder authorization key required to customize leagues and clubs.',
      });
      return;
    }

    const leagueId = req.params.leagueId as LeagueId;
    const lIdx = state.leagues.findIndex((l) => l.id === leagueId);
    if (lIdx === -1) {
      res.status(404).json({ error: 'League division not found.' });
      return;
    }

    const league = state.leagues[lIdx];
    const nextName =
      typeof req.body?.name === 'string' && req.body.name.trim()
        ? req.body.name.trim()
        : league.name;
    const nextRegion =
      typeof req.body?.regionLabel === 'string' && req.body.regionLabel.trim()
        ? req.body.regionLabel.trim()
        : league.regionLabel;
    const nextLogo =
      typeof req.body?.logoUrl === 'string' && req.body.logoUrl.trim()
        ? req.body.logoUrl.trim()
        : league.logoUrl;

    let nextClubs = [...league.clubs];
    if (Array.isArray(req.body?.clubs)) {
      const incoming = req.body.clubs as Array<{
        id: string;
        name?: string;
        shortCode?: string;
        logoUrl?: string;
      }>;
      nextClubs = league.clubs.map((existingClub) => {
        const patch = incoming.find((c) => c.id === existingClub.id);
        if (!patch) return existingClub;
        const updatedClubName =
          typeof patch.name === 'string' && patch.name.trim()
            ? patch.name.trim()
            : existingClub.name;

        // Keep assigned players synced if Founder renames a club
        if (updatedClubName !== existingClub.name) {
          const prevLower = existingClub.name.toLowerCase();
          for (const p of state.players) {
            if (p.club.trim().toLowerCase() === prevLower) {
              p.club = updatedClubName;
            }
          }
        }

        return {
          ...existingClub,
          name: updatedClubName,
          shortCode:
            typeof patch.shortCode === 'string' && patch.shortCode.trim()
              ? patch.shortCode.trim().toUpperCase().slice(0, 5)
              : existingClub.shortCode,
          logoUrl:
            typeof patch.logoUrl === 'string' && patch.logoUrl.trim()
              ? patch.logoUrl.trim()
              : existingClub.logoUrl,
        };
      });
    }

    state.leagues[lIdx] = {
      ...league,
      name: nextName,
      regionLabel: nextRegion,
      logoUrl: nextLogo,
      clubs: sortLeagueClubs(nextClubs),
    };

    recordAudit(
      session.actorName,
      session.role,
      'FOUNDER_LEAGUE_EDIT',
      nextName,
      `Customized division identity & club roster metadata for ${nextName}.`
    );
    saveState(state);

    res.json({
      leagues: state.leagues,
      players: state.players,
      auditLogs: state.auditLogs,
    });
  });

  // 18. FOUNDER BULK REGISTRY COMMANDS
  app.post('/api/founder/bulk-action', (req: Request, res: Response) => {
    const session = getSessionFromReq(req);
    if (!session || !canManageFounderControls(session.role)) {
      res.status(403).json({
        error: 'Permission denied: Founder authorization key required.',
      });
      return;
    }

    const action = req.body?.action as
      | 'reset-all-standings'
      | 'reset-all-player-stats'
      | 'clear-all-suspensions'
      | 'clear-all-bans'
      | 'restore-default-leagues';

    if (action === 'reset-all-standings') {
      state.leagues = state.leagues.map((l) => resetLeagueStandings(l));
      recordAudit(
        session.actorName,
        session.role,
        'FOUNDER_BULK_RESET',
        'All 4 RFF Leagues',
        'Reset all 32 club standings across all 4 divisions to 0 W / 0 D / 0 L / 0 PTS.'
      );
    } else if (action === 'restore-default-leagues') {
      state.leagues = buildInitialLeagues();
      recordAudit(
        session.actorName,
        session.role,
        'FOUNDER_LEAGUE_RESTORE',
        'All 4 RFF Leagues',
        'Restored default division names, club identities, crests, and 0-point tables.'
      );
    } else if (action === 'reset-all-player-stats') {
      for (const p of state.players) {
        p.goals = 0;
        p.assists = 0;
        p.appearances = 0;
      }
      recordAudit(
        session.actorName,
        session.role,
        'FOUNDER_BULK_RESET',
        `${state.players.length} Athletes`,
        'Reset all athlete goals, assists, and appearances to Pre-Season 0.'
      );
    } else if (action === 'clear-all-suspensions') {
      for (const p of state.players) {
        p.suspended = false;
      }
      for (const h of state.hierarchy) {
        h.suspended = false;
      }
      recordAudit(
        session.actorName,
        session.role,
        'FOUNDER_BULK_CLEAR',
        'All Suspended Accounts',
        'Lifted all active player and hierarchy suspensions across the registry.'
      );
    } else if (action === 'clear-all-bans') {
      for (const p of state.players) {
        p.banned = false;
        p.banReason = undefined;
      }
      for (const h of state.hierarchy) {
        h.banned = false;
      }
      recordAudit(
        session.actorName,
        session.role,
        'FOUNDER_BULK_CLEAR',
        'All Banned Accounts',
        'Revoked all active player and hierarchy bans across the registry.'
      );
    } else {
      res.status(400).json({ error: 'Invalid bulk Founder action.' });
      return;
    }

    saveState(state);
    res.json({
      players: state.players,
      hierarchy: state.hierarchy,
      leagues: state.leagues,
      auditLogs: state.auditLogs,
    });
  });

  // Serve high-resolution local crest & background assets directly with caching
  const publicAssetsPath = path.join(__dirname, 'public', 'assets');
  if (fs.existsSync(publicAssetsPath)) {
    app.use('/assets', express.static(publicAssetsPath, { maxAge: '1h' }));
  }

  // Mount Vite dev server in development or static dist in production
  const distPath = path.join(__dirname, 'dist');
  const hasBuiltDist = fs.existsSync(path.join(distPath, 'index.html'));
  const isProdRuntime =
    (process.env.NODE_ENV === 'production' || Boolean(process.env.K_SERVICE)) &&
    hasBuiltDist;

  const mountStaticDist = () => {
    app.use(express.static(distPath, { maxAge: '1h' }));
    app.get('*', (_req: Request, res: Response, next: NextFunction) => {
      if (_req.path.startsWith('/api/')) return next();
      res.sendFile(path.join(distPath, 'index.html'));
    });
  };

  if (!isProdRuntime) {
    try {
      const { createServer: createViteServer } = await import('vite');
      const vite = await createViteServer({
        server: { middlewareMode: true },
        appType: 'spa',
      });
      app.use(vite.middlewares);
    } catch (viteErr) {
      if (hasBuiltDist) {
        mountStaticDist();
      } else {
        throw viteErr;
      }
    }
  } else {
    mountStaticDist();
  }

  const PORT = Number(process.env.PORT) || 3000;
  app.listen(PORT, '0.0.0.0', () => {
    console.log(`RFF² Registry Server listening on http://0.0.0.0:${PORT}`);
  });
}

startServer().catch((err) => {
  console.error('Fatal server startup error:', err);
  process.exit(1);
});
