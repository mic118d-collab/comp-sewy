/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useCallback, useEffect, useMemo, useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { Megaphone } from 'lucide-react';
import type {
  AuditLogEntry,
  HierarchyAccount,
  LeagueDivision,
  LeagueId,
  PlayerClass,
  PlayerRecord,
  RobloxProfileDetails,
  SecurityRank,
  SiteConfig,
  StaffAccessPolicy,
  StaffSession,
} from './lib/types';
import {
  DEFAULT_SITE_CONFIG,
  DEFAULT_STAFF_ACCESS_POLICY,
  SKILL_RANK_MAP,
  getBackgroundBlurClasses,
  getSkillRankInfo,
  isRoleKeyPaused,
  sanitizeSiteConfig,
  sanitizeStaffAccessPolicy,
} from './lib/hierarchy';
import { buildInitialLeagues, getTeamRoleLabel } from './lib/leagues';
import {
  AVATAR_REFRESH_INTERVAL_MS,
  type HierarchyAvatarSnapshot,
  type PlayerAvatarSnapshot,
  buildInitialHierarchyAccounts,
  buildInitialPlayers,
  mergeHierarchyAvatarUpdates,
  mergePlayerAvatarUpdates,
} from './lib/rosterSeed';
import { Navbar, type AppView } from './components/Navbar';
import { FoundersSection } from './components/FoundersSection';
import { LeagueStandingsSection } from './components/LeagueStandingsSection';
import { RegistrySection } from './components/RegistrySection';
import { RobloxProfileModal } from './components/RobloxProfileModal';
import { SecurityHierarchyView } from './components/SecurityHierarchyView';
import { AdminPanel } from './components/AdminPanel';
import { PlayerFormModal } from './components/PlayerFormModal';
import { TeamOfTheWeekSection } from './components/TeamOfTheWeekSection';
import { LoadingScreen } from './components/LoadingScreen';
import { CustomCursor } from './components/CustomCursor';
import type { ActiveStaffCounts } from './components/FounderCommandPanel';

const SESSION_STORAGE_KEY = 'rff_staff_token';

export default function App() {
  const [showLoading, setShowLoading] = useState<boolean>(() => {
    if (typeof window === 'undefined') return false;
    const params = new URLSearchParams(window.location.search);
    return params.get('autostart') !== '1';
  });

  const [activeView, setActiveView] = useState<AppView>('registry');
  const [selectedRosterTier, setSelectedRosterTier] = useState<PlayerClass | ''>('');
  const [externalRosterSearch, setExternalRosterSearch] = useState<string>('');

  const [players, setPlayers] = useState<PlayerRecord[]>(() => buildInitialPlayers());
  const [hierarchy, setHierarchy] = useState<HierarchyAccount[]>(() =>
    buildInitialHierarchyAccounts(buildInitialPlayers())
  );
  const [leagues, setLeagues] = useState<LeagueDivision[]>(() => buildInitialLeagues());
  const [auditLogs, setAuditLogs] = useState<AuditLogEntry[]>([]);
  const [staffPolicy, setStaffPolicy] = useState<StaffAccessPolicy>(
    () => DEFAULT_STAFF_ACCESS_POLICY
  );
  const [siteConfig, setSiteConfig] = useState<SiteConfig>(() => DEFAULT_SITE_CONFIG);
  const [activeStaffCounts, setActiveStaffCounts] = useState<ActiveStaffCounts>({
    founder: 0,
    admin: 0,
    moderator: 0,
  });
  const [bgFailed, setBgFailed] = useState(false);

  const [session, setSession] = useState<StaffSession>({
    authenticated: false,
    role: 'guest',
    actorName: 'Guest',
    securityRank: 'D',
  });

  const [selectedPlayerId, setSelectedPlayerId] = useState<number | null>(null);
  const [formState, setFormState] = useState<{
    open: boolean;
    mode: 'create' | 'edit';
    player: PlayerRecord | null;
  }>({
    open: false,
    mode: 'create',
    player: null,
  });

  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const notify = useCallback((msg: string) => {
    setToastMessage(msg);
  }, []);

  useEffect(() => {
    if (!toastMessage) return;
    const t = setTimeout(() => setToastMessage(null), 3200);
    return () => clearTimeout(t);
  }, [toastMessage]);

  useEffect(() => {
    setBgFailed(false);
  }, [siteConfig.backgroundImageUrl]);

  const fetchState = useCallback(async () => {
    try {
      const res = await fetch('/api/state', { cache: 'no-store' });
      if (!res.ok) return;
      const data = await res.json();
      if (Array.isArray(data.players)) setPlayers(data.players);
      if (Array.isArray(data.hierarchy)) setHierarchy(data.hierarchy);
      if (Array.isArray(data.leagues)) setLeagues(data.leagues);
      if (Array.isArray(data.auditLogs)) setAuditLogs(data.auditLogs);
      if (data.staffPolicy) {
        setStaffPolicy(sanitizeStaffAccessPolicy(data.staffPolicy));
      }
      if (data.siteConfig) {
        setSiteConfig(sanitizeSiteConfig(data.siteConfig));
      }
      if (data.activeStaffCounts) {
        setActiveStaffCounts(data.activeStaffCounts);
      }
    } catch {
      // Seed state already loaded cleanly
    }
  }, []);

  // Automatically end client session if Founder pauses the active Admin/Mod key
  useEffect(() => {
    if (session.authenticated && isRoleKeyPaused(session.role, staffPolicy)) {
      sessionStorage.removeItem(SESSION_STORAGE_KEY);
      setSession({
        authenticated: false,
        role: 'guest',
        actorName: 'Guest',
        securityRank: 'D',
      });
      notify('Your staff key was paused by a Founder.');
    }
  }, [session.authenticated, session.role, staffPolicy, notify]);

  const refreshAvatars = useCallback(async () => {
    try {
      const res = await fetch('/api/avatars', { cache: 'no-store' });
      if (!res.ok) return;
      const data = (await res.json()) as {
        players?: PlayerAvatarSnapshot[];
        hierarchy?: HierarchyAvatarSnapshot[];
      };
      if (Array.isArray(data.players)) {
        setPlayers((prev) => mergePlayerAvatarUpdates(prev, data.players!).players);
      }
      if (Array.isArray(data.hierarchy)) {
        setHierarchy(
          (prev) => mergeHierarchyAvatarUpdates(prev, data.hierarchy!).hierarchy
        );
      }
    } catch {
      // Keep existing avatars cleanly on transient network error
    }
  }, []);

  const handleProfileResolved = useCallback((details: RobloxProfileDetails) => {
    if (!details.headshotUrl && !details.robloxId) return;
    setPlayers((prev) =>
      mergePlayerAvatarUpdates(prev, [
        {
          id: details.playerId,
          robloxId: details.robloxId,
          avatarUrl: details.headshotUrl,
          displayName: details.displayName,
        },
      ]).players
    );
  }, []);

  useEffect(() => {
    void fetchState();

    // Quick follow-up check after initial cold-start Roblox sync wave, then refresh every 10 seconds
    const quickWarmupTimer = window.setTimeout(() => {
      void refreshAvatars();
    }, 2500);

    const avatarInterval = window.setInterval(() => {
      if (document.visibilityState === 'hidden') return;
      void refreshAvatars();
    }, AVATAR_REFRESH_INTERVAL_MS);

    const onVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        void refreshAvatars();
      }
    };
    document.addEventListener('visibilitychange', onVisibilityChange);

    const savedToken = sessionStorage.getItem(SESSION_STORAGE_KEY);
    if (savedToken) {
      fetch('/api/auth/session', {
        headers: { Authorization: `Bearer ${savedToken}` },
      })
        .then((res) => (res.ok ? res.json() : null))
        .then((data) => {
          if (data?.authenticated) {
            setSession({ ...data, token: savedToken });
          } else {
            sessionStorage.removeItem(SESSION_STORAGE_KEY);
          }
        })
        .catch(() => {});
    }

    return () => {
      window.clearTimeout(quickWarmupTimer);
      window.clearInterval(avatarInterval);
      document.removeEventListener('visibilitychange', onVisibilityChange);
    };
  }, [fetchState, refreshAvatars]);

  const selectedPlayer = useMemo(
    () =>
      selectedPlayerId !== null ? players.find((p) => p.id === selectedPlayerId) ?? null : null,
    [players, selectedPlayerId]
  );

  const founders = useMemo(() => players.filter((p) => p.isFounder), [players]);

  const totalGoals = useMemo(
    () => players.reduce((sum, p) => sum + p.goals, 0),
    [players]
  );
  const dClassTotal = useMemo(
    () => players.filter((p) => !p.isFounder && p.tier === 'D').length,
    [players]
  );
  const weeklyPayroll = useMemo(
    () => players.reduce((sum, p) => sum + p.wage, 0),
    [players]
  );

  const rankCounts = useMemo(
    () => ({
      S: players.filter((p) => p.isFounder || p.tier === 'S').length,
      A: players.filter((p) => !p.isFounder && p.tier === 'A').length,
      B: players.filter((p) => !p.isFounder && p.tier === 'B').length,
      D: players.filter((p) => !p.isFounder && p.tier === 'D').length,
    }),
    [players]
  );

  const authHeaders = useCallback((): Record<string, string> => {
    const headers: Record<string, string> = { 'Content-Type': 'application/json' };
    if (session.token) {
      headers.Authorization = `Bearer ${session.token}`;
    }
    return headers;
  }, [session.token]);

  const handleLogin = async (password: string) => {
    const res = await fetch('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ password }),
    });
    const data = await res.json();
    if (!res.ok) {
      throw new Error(data?.error || 'Invalid staff password.');
    }
    sessionStorage.setItem(SESSION_STORAGE_KEY, data.token);
    setSession(data);
    void fetchState();
    notify(
      data.role === 'founder'
        ? 'Founder key verified — Supreme website & role governance unlocked.'
        : data.role === 'admin'
          ? 'Administrator session unlocked — Command authority active.'
          : 'Moderator session unlocked — Roster & suspension controls active.'
    );
  };

  const handleLogout = async () => {
    try {
      await fetch('/api/auth/logout', {
        method: 'POST',
        headers: authHeaders(),
      });
    } catch {
      // Ignore network error on logout
    }
    sessionStorage.removeItem(SESSION_STORAGE_KEY);
    setSession({
      authenticated: false,
      role: 'guest',
      actorName: 'Guest',
      securityRank: 'D',
    });
    void fetchState();
    notify('Signed out of Staff Portal.');
  };

  const handleSavePlayer = async (
    payload: Partial<PlayerRecord>,
    mode: 'create' | 'edit'
  ) => {
    if (mode === 'create') {
      const res = await fetch('/api/players', {
        method: 'POST',
        headers: authHeaders(),
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data?.error || 'Failed adding player.');
      }
      setPlayers((prev) => [...prev, data.player]);
      if (data.auditLogs) setAuditLogs(data.auditLogs);
      notify(`Registered @${data.player.username} (Roblox ID ${data.player.robloxId}).`);
    } else if (formState.player) {
      const res = await fetch(`/api/players/${formState.player.id}`, {
        method: 'PATCH',
        headers: authHeaders(),
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data?.error || 'Failed updating player.');
      }
      setPlayers((prev) =>
        prev.map((p) => (p.id === data.player.id ? data.player : p))
      );
      if (data.auditLogs) setAuditLogs(data.auditLogs);
      notify(`Updated stats & skill rank for @${data.player.username}.`);
    }
  };

  const handleDisciplinePlayer = async (
    player: PlayerRecord,
    action: 'suspend' | 'unsuspend' | 'ban' | 'unban'
  ) => {
    const res = await fetch(`/api/players/${player.id}/discipline`, {
      method: 'POST',
      headers: authHeaders(),
      body: JSON.stringify({ action }),
    });
    const data = await res.json();
    if (!res.ok) {
      notify(data?.error || 'Action denied.');
      return;
    }
    setPlayers((prev) =>
      prev.map((p) => (p.id === data.player.id ? data.player : p))
    );
    if (data.auditLogs) setAuditLogs(data.auditLogs);
    notify(`Updated status for @${player.username} (${action}).`);
  };

  const handleDeletePlayer = async (player: PlayerRecord) => {
    const res = await fetch(`/api/players/${player.id}`, {
      method: 'DELETE',
      headers: authHeaders(),
    });
    const data = await res.json();
    if (!res.ok) {
      notify(data?.error || 'Delete denied.');
      return;
    }
    setPlayers((prev) => prev.filter((p) => p.id !== player.id));
    if (selectedPlayerId === player.id) setSelectedPlayerId(null);
    if (data.auditLogs) setAuditLogs(data.auditLogs);
    notify(`Removed @${player.username} from registry.`);
  };

  const handleUpdateHierarchy = async (
    accountId: number,
    patch: Partial<Pick<HierarchyAccount, 'securityRank' | 'banned' | 'suspended' | 'kicked'>>
  ) => {
    const res = await fetch(`/api/hierarchy/${accountId}`, {
      method: 'PATCH',
      headers: authHeaders(),
      body: JSON.stringify(patch),
    });
    const data = await res.json();
    if (!res.ok) {
      notify(data?.error || 'Rank update denied.');
      return;
    }
    if (data.hierarchy) setHierarchy(data.hierarchy);
    if (data.auditLogs) setAuditLogs(data.auditLogs);
    notify(`Updated skill rank for @${data.account.username}.`);
  };

  const handleAddHierarchyAccount = async (username: string, securityRank: SecurityRank) => {
    const res = await fetch('/api/hierarchy', {
      method: 'POST',
      headers: authHeaders(),
      body: JSON.stringify({ username, securityRank }),
    });
    const data = await res.json();
    if (!res.ok) {
      notify(data?.error || 'Failed assigning rank.');
      return;
    }
    if (data.hierarchy) setHierarchy(data.hierarchy);
    if (data.auditLogs) setAuditLogs(data.auditLogs);
    notify(`Assigned ${securityRank} Rank to @${username}.`);
  };

  const handleDeleteHierarchyAccount = async (accountId: number) => {
    const res = await fetch(`/api/hierarchy/${accountId}`, {
      method: 'DELETE',
      headers: authHeaders(),
    });
    const data = await res.json();
    if (!res.ok) {
      notify(data?.error || 'Removal denied.');
      return;
    }
    if (data.hierarchy) setHierarchy(data.hierarchy);
    if (data.auditLogs) setAuditLogs(data.auditLogs);
    notify('Removed account from Security Hierarchy.');
  };

  const handleUpdateStaffPolicy = async (
    nextPolicy: StaffAccessPolicy | { reset: true }
  ) => {
    const res = await fetch('/api/founder/staff-policy', {
      method: 'PATCH',
      headers: authHeaders(),
      body: JSON.stringify(nextPolicy),
    });
    const data = await res.json();
    if (!res.ok) {
      notify(data?.error || 'Failed updating staff access policy.');
      return;
    }
    if (data.staffPolicy) setStaffPolicy(sanitizeStaffAccessPolicy(data.staffPolicy));
    if (data.activeStaffCounts) setActiveStaffCounts(data.activeStaffCounts);
    if (data.auditLogs) setAuditLogs(data.auditLogs);
    notify(
      'reset' in nextPolicy
        ? 'Restored default Admin & Moderator keys and permissions.'
        : 'Updated staff key & role permissions.'
    );
  };

  const handleRevokeSessions = async (targetRole: 'admin' | 'moderator' | 'all') => {
    const res = await fetch('/api/founder/revoke-sessions', {
      method: 'POST',
      headers: authHeaders(),
      body: JSON.stringify({ targetRole }),
    });
    const data = await res.json();
    if (!res.ok) {
      notify(data?.error || 'Failed revoking sessions.');
      return;
    }
    if (data.activeStaffCounts) setActiveStaffCounts(data.activeStaffCounts);
    if (data.auditLogs) setAuditLogs(data.auditLogs);
    notify(`Terminated ${data.revoked ?? 0} active ${targetRole} session(s).`);
  };

  const handleUpdateSiteConfig = async (patch: Partial<SiteConfig>) => {
    const res = await fetch('/api/founder/site-config', {
      method: 'PATCH',
      headers: authHeaders(),
      body: JSON.stringify(patch),
    });
    const data = await res.json();
    if (!res.ok) {
      notify(data?.error || 'Failed updating website configuration.');
      return;
    }
    if (data.siteConfig) setSiteConfig(sanitizeSiteConfig(data.siteConfig));
    if (data.auditLogs) setAuditLogs(data.auditLogs);
    notify('Saved live website changes across RFF² Registry.');
  };

  const handleResetSiteConfig = async () => {
    const res = await fetch('/api/founder/site-config/reset', {
      method: 'POST',
      headers: authHeaders(),
    });
    const data = await res.json();
    if (!res.ok) {
      notify(data?.error || 'Failed resetting website defaults.');
      return;
    }
    if (data.siteConfig) setSiteConfig(sanitizeSiteConfig(data.siteConfig));
    if (data.auditLogs) setAuditLogs(data.auditLogs);
    notify('Reset website headlines, layout, and spotlight to defaults.');
  };

  const handleUpdateLeagueIdentity = async (
    leagueId: LeagueId,
    payload: {
      name: string;
      regionLabel: string;
      logoUrl: string;
      clubs: Array<{ id: string; name: string; shortCode: string; logoUrl: string }>;
    }
  ) => {
    const res = await fetch(`/api/founder/leagues/${leagueId}`, {
      method: 'PATCH',
      headers: authHeaders(),
      body: JSON.stringify(payload),
    });
    const data = await res.json();
    if (!res.ok) {
      notify(data?.error || 'Failed customizing division.');
      return;
    }
    if (data.leagues) setLeagues(data.leagues);
    if (data.players) setPlayers(data.players);
    if (data.auditLogs) setAuditLogs(data.auditLogs);
    notify(`Saved division & club identities for ${payload.name}.`);
  };

  const handleBulkFounderAction = async (
    action:
      | 'reset-all-standings'
      | 'reset-all-player-stats'
      | 'clear-all-suspensions'
      | 'clear-all-bans'
      | 'restore-default-leagues'
  ) => {
    const res = await fetch('/api/founder/bulk-action', {
      method: 'POST',
      headers: authHeaders(),
      body: JSON.stringify({ action }),
    });
    const data = await res.json();
    if (!res.ok) {
      notify(data?.error || 'Bulk action failed.');
      return;
    }
    if (data.players) setPlayers(data.players);
    if (data.hierarchy) setHierarchy(data.hierarchy);
    if (data.leagues) setLeagues(data.leagues);
    if (data.auditLogs) setAuditLogs(data.auditLogs);
    notify(`Executed Founder command: ${action}.`);
  };

  const handleExportCsv = (rows: PlayerRecord[]) => {
    const headers = [
      'username',
      'robloxId',
      'skillRank',
      'skillQuality',
      'rating',
      'position',
      'preferredFoot',
      'team',
      'goals',
      'assists',
      'appearances',
      'wage',
      'releaseClause',
      'suspended',
      'banned',
    ];
    const lines = rows.map((p) => {
      const skill = getSkillRankInfo(p.isFounder ? 'S' : p.tier);
      const roleLabel = getTeamRoleLabel(p.club);
      return [
        `"${p.username.replace(/"/g, '""')}"`,
        p.robloxId ?? '',
        `"${skill.label}"`,
        `"${skill.quality}"`,
        p.rating,
        `"${p.position}"`,
        `"${p.foot}"`,
        `"${roleLabel.replace(/"/g, '""')}"`,
        p.goals,
        p.assists,
        p.appearances,
        p.wage,
        p.releaseClause,
        p.suspended,
        p.banned,
      ].join(',');
    });
    const csv = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...lines].join('\n');
    const link = document.createElement('a');
    link.setAttribute('href', encodeURI(csv));
    link.setAttribute('download', 'rff-registry-export.csv');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    notify(`Exported ${rows.length} athlete records to CSV.`);
  };

  const handleLogLeagueMatch = async (
    leagueId: LeagueId,
    homeClubId: string,
    awayClubId: string,
    homeGoals: number,
    awayGoals: number
  ) => {
    const res = await fetch(`/api/leagues/${leagueId}/matches`, {
      method: 'POST',
      headers: authHeaders(),
      body: JSON.stringify({ homeClubId, awayClubId, homeGoals, awayGoals }),
    });
    const data = await res.json();
    if (!res.ok) {
      throw new Error(data?.error || 'Failed logging match.');
    }
    if (data.leagues) setLeagues(data.leagues);
    if (data.auditLogs) setAuditLogs(data.auditLogs);
    notify('Recorded official league fixture and updated division standings.');
  };

  const handleUpdateClubStanding = async (
    leagueId: LeagueId,
    clubId: string,
    patch: {
      wins: number;
      draws: number;
      losses: number;
      goalsFor: number;
      goalsAgainst: number;
      points?: number;
    }
  ) => {
    const res = await fetch(`/api/leagues/${leagueId}/clubs/${clubId}`, {
      method: 'PATCH',
      headers: authHeaders(),
      body: JSON.stringify(patch),
    });
    const data = await res.json();
    if (!res.ok) {
      throw new Error(data?.error || 'Failed updating club standing.');
    }
    if (data.leagues) setLeagues(data.leagues);
    if (data.auditLogs) setAuditLogs(data.auditLogs);
    notify('Updated club standing in division table.');
  };

  const handleResetLeague = async (leagueId: LeagueId) => {
    const res = await fetch(`/api/leagues/${leagueId}/reset`, {
      method: 'POST',
      headers: authHeaders(),
    });
    const data = await res.json();
    if (!res.ok) {
      notify(data?.error || 'Reset denied.');
      return;
    }
    if (data.leagues) setLeagues(data.leagues);
    if (data.auditLogs) setAuditLogs(data.auditLogs);
    notify('Reset division standings to Pre-Season zero.');
  };

  const handleFilterRosterByClub = (clubName: string) => {
    setSelectedRosterTier('');
    setExternalRosterSearch(clubName);
    if (activeView !== 'registry') {
      setActiveView('registry');
      setTimeout(() => {
        const el = document.getElementById('roster-database');
        if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }, 120);
    } else {
      const el = document.getElementById('roster-database');
      if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };

  const handleFilterBySkillTier = (tier: 'S' | 'A' | 'B' | 'D') => {
    setSelectedRosterTier((prev) => (prev === tier ? '' : tier));
    const el = document.getElementById('roster-database');
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };

  return (
    <div className="min-h-screen flex flex-col relative">
      {/* Custom Desktop Pointer Cursor */}
      <CustomCursor />

      {/* Initial Loading UI showcasing attached RFF Emblem */}
      <AnimatePresence>
        {showLoading && (
          <LoadingScreen
            key="rff-initial-loader"
            athleteCount={players.length}
            onFinish={() => setShowLoading(false)}
          />
        )}
      </AnimatePresence>

      {/* Full-Viewport Official RFF Stadium Background Image + Contrast Scrim */}
      <div
        aria-hidden="true"
        className="fixed inset-0 z-0 pointer-events-none overflow-hidden"
      >
        <img
          src={
            bgFailed
              ? DEFAULT_SITE_CONFIG.backgroundImageUrl
              : siteConfig.backgroundImageUrl || DEFAULT_SITE_CONFIG.backgroundImageUrl
          }
          alt=""
          onError={() => setBgFailed(true)}
          data-testid="site-background-image"
          className={`w-full h-full object-cover object-center ${getBackgroundBlurClasses(
            siteConfig.backgroundBlurPx
          )}`}
        />
        <div className="absolute inset-0 site-bg-scrim" />
      </div>

      {/* Notification Banner */}
      <AnimatePresence>
        {toastMessage && (
          <motion.div
            key="toast-banner"
            role="status"
            aria-live="polite"
            initial={{ opacity: 0, y: 12, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 8, scale: 0.96 }}
            transition={{ duration: 0.18 }}
            className="fixed bottom-6 right-6 z-50 px-5 py-3 rounded-xl bg-panel border border-emerald-400/40 text-emerald-300 font-mono text-xs shadow-2xl"
          >
            {toastMessage}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Optional Founder Site-Wide Announcement Banner */}
      {siteConfig.announcementActive && siteConfig.announcementBanner.trim().length > 0 && (
        <div
          data-testid="site-announcement-banner"
          className="relative z-30 border-b border-founder/35 bg-founder/15 backdrop-blur-md px-4 py-2 text-center text-xs font-mono text-white flex items-center justify-center gap-2"
        >
          <Megaphone className="w-3.5 h-3.5 text-founder shrink-0" aria-hidden="true" />
          <span>{siteConfig.announcementBanner}</span>
        </div>
      )}

      {/* Clean 3-Zone Navigation Bar (OAuth & Support Desk Removed) */}
      <Navbar
        activeView={activeView}
        onSelectView={setActiveView}
        session={session}
        brandName={siteConfig.brandName}
      />

      <main className="relative z-10 flex-1 max-w-[1400px] w-full mx-auto px-4 sm:px-6 py-8 sm:py-10">
        <AnimatePresence mode="wait">
          {activeView === 'registry' && (
            <motion.div
              key="view-registry"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -6 }}
              transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
              className="space-y-12"
            >
              {/* Hero Section */}
              <section className="space-y-7">
                <div className="flex flex-wrap items-end justify-between gap-6">
                  <div className="max-w-3xl space-y-3">
                    <p className="text-xs font-mono text-ember tracking-wide">
                      {siteConfig.heroEyebrow}
                    </p>
                    <h1 className="font-display text-4xl sm:text-6xl font-semibold tracking-tight text-white leading-[1.04] text-balance">
                      {siteConfig.heroHeadline}
                    </h1>
                  </div>

                  <div className="flex items-center gap-4 shrink-0">
                    <button
                      type="button"
                      onClick={() => {
                        const el = document.getElementById('roster-database');
                        if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
                      }}
                      className="px-5 py-2.5 rounded-lg bg-crimson hover:bg-ember text-white text-xs font-medium transition-colors whitespace-nowrap cursor-pointer"
                    >
                      Browse Roster
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        const el = document.getElementById('rff-league-standings');
                        if (el) {
                          el.scrollIntoView({ behavior: 'smooth', block: 'start' });
                        } else {
                          setActiveView('standings');
                        }
                      }}
                      className="text-xs font-medium text-fog hover:text-white transition-colors whitespace-nowrap cursor-pointer"
                    >
                      RFF League Standing →
                    </button>
                  </div>
                </div>

                {/* Clean Full-Width 4-Column Metric Strip with Hairline Dividers */}
                <div className="grid grid-cols-2 sm:grid-cols-4 divide-y sm:divide-y-0 sm:divide-x divide-white/10 rounded-xl surface-panel border border-white/10 tabular-nums">
                  <div className="p-5">
                    <div className="font-display text-3xl font-semibold text-white">
                      {players.length}
                    </div>
                    <div className="text-xs font-mono text-mist mt-1">
                      Registered Athletes
                    </div>
                  </div>
                  <div className="p-5">
                    <div className="font-display text-3xl font-semibold text-founder">
                      {founders.length}
                    </div>
                    <div className="text-xs font-mono text-mist mt-1">
                      S Rank · Very Good (OVR 99)
                    </div>
                  </div>
                  <div className="p-5">
                    <div className="font-display text-3xl font-semibold text-white">
                      {dClassTotal}
                    </div>
                    <div className="text-xs font-mono text-mist mt-1">
                      D Rank · Okay (OVR 60)
                    </div>
                  </div>
                  <div className="p-5">
                    <div className="font-display text-3xl font-semibold text-gold">
                      ${(weeklyPayroll / 1000000).toFixed(2)}M
                    </div>
                    <div className="text-xs font-mono text-mist mt-1">
                      {totalGoals === 0
                        ? 'Weekly Payroll · Pre-Season (0G / 0A)'
                        : `Weekly Payroll · ${totalGoals.toLocaleString()} Goals`}
                    </div>
                  </div>
                </div>

                {/* Interactive 4-Card Skill Rank Guide (S=Very Good, A=Good, B=Decent, D=Okay) */}
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-3.5">
                  {(['S', 'A', 'B', 'D'] as const).map((tierKey) => {
                    const info = SKILL_RANK_MAP[tierKey];
                    const isSelected = selectedRosterTier === tierKey;
                    return (
                      <button
                        key={tierKey}
                        type="button"
                        onClick={() => handleFilterBySkillTier(tierKey)}
                        className={`text-left p-4 rounded-xl surface-panel border hover:-translate-y-0.5 transition-[transform,border-color] duration-150 cursor-pointer ${
                          isSelected ? 'border-crimson bg-crimson/10' : info.borderClass
                        }`}
                      >
                        <div className="flex items-center justify-between gap-2">
                          <span className={`font-display text-xl font-semibold ${info.textClass}`}>
                            {info.label}
                          </span>
                          <span className="text-xs font-mono text-white font-semibold">
                            {info.quality}
                          </span>
                        </div>
                        <p className="text-xs text-fog mt-1.5 line-clamp-2 leading-relaxed">
                          {info.summary}
                        </p>
                        <p className="text-[11px] font-mono text-mist mt-2.5 tabular-nums">
                          {rankCounts[tierKey]} {rankCounts[tierKey] === 1 ? 'Player' : 'Players'} ·{' '}
                          {isSelected ? 'Filter active (click to clear)' : 'Click to filter'}
                        </p>
                      </button>
                    );
                  })}
                </div>
              </section>

              {/* Interactive Roster Marquee */}
              {siteConfig.showMarquee && (
                <div className="border-y border-white/10 py-3 marquee-mask overflow-hidden">
                  <div className="marquee-track flex gap-6 items-center text-sm font-display font-medium text-white/65">
                    {[...players.slice(0, 28), ...players.slice(0, 28)].map((p, idx) => {
                      const info = getSkillRankInfo(p.isFounder ? 'S' : p.tier);
                      return (
                        <button
                          key={`${p.id}-${idx}`}
                          type="button"
                          onClick={() => setSelectedPlayerId(p.id)}
                          className="whitespace-nowrap hover:text-white transition-colors cursor-pointer flex items-center gap-2"
                        >
                          <span>{p.username}</span>
                          <span className="text-xs font-mono text-mist">
                            ({info.rank} · {info.quality})
                          </span>
                          <span className="text-white/20 pl-4" aria-hidden="true">
                            ·
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              {(() => {
                let secIdx = 1;
                const nextIdx = () => `0${secIdx++}.`;
                return (
                  <>
                    {/* RFF League Standing */}
                    {siteConfig.showStandingsOnHome && (
                      <LeagueStandingsSection
                        leagues={leagues}
                        players={players}
                        session={session}
                        staffPolicy={staffPolicy}
                        sectionIndex={nextIdx()}
                        onSelectPlayer={(p) => setSelectedPlayerId(p.id)}
                        onFilterRosterByClub={handleFilterRosterByClub}
                        onLogMatch={handleLogLeagueMatch}
                        onUpdateClubStanding={handleUpdateClubStanding}
                        onResetLeague={handleResetLeague}
                      />
                    )}

                    {/* Founders Council */}
                    {siteConfig.showFoundersOnHome && (
                      <FoundersSection
                        founders={founders}
                        leagues={leagues}
                        title={siteConfig.foundersSectionTitle}
                        sectionIndex={nextIdx()}
                        onSelectPlayer={(p) => setSelectedPlayerId(p.id)}
                      />
                    )}

                    {/* Team of the Week */}
                    {siteConfig.showTotwOnHome && (
                      <TeamOfTheWeekSection
                        players={players}
                        siteConfig={siteConfig}
                        onSelectPlayer={(p) => setSelectedPlayerId(p.id)}
                        sectionIndex={nextIdx()}
                      />
                    )}

                    {/* Complete Roster Database */}
                    <RegistrySection
                      players={players}
                      leagues={leagues}
                      onSelectPlayer={(p) => setSelectedPlayerId(p.id)}
                      onExportCsv={handleExportCsv}
                      externalTierFilter={selectedRosterTier}
                      onExternalTierChange={(next) => setSelectedRosterTier(next)}
                      externalSearch={externalRosterSearch}
                      sectionIndex={nextIdx()}
                    />
                  </>
                );
              })()}
            </motion.div>
          )}

          {activeView === 'standings' && (
            <motion.div
              key="view-standings"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -6 }}
              transition={{ duration: 0.2 }}
              className="space-y-8"
            >
              <LeagueStandingsSection
                leagues={leagues}
                players={players}
                session={session}
                staffPolicy={staffPolicy}
                sectionIndex="01."
                onSelectPlayer={(p) => setSelectedPlayerId(p.id)}
                onFilterRosterByClub={handleFilterRosterByClub}
                onLogMatch={handleLogLeagueMatch}
                onUpdateClubStanding={handleUpdateClubStanding}
                onResetLeague={handleResetLeague}
              />
            </motion.div>
          )}

          {activeView === 'founders' && (
            <motion.div
              key="view-founders"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -6 }}
              transition={{ duration: 0.2 }}
              className="space-y-8"
            >
              <FoundersSection
                founders={founders}
                leagues={leagues}
                title={siteConfig.foundersSectionTitle}
                onSelectPlayer={(p) => setSelectedPlayerId(p.id)}
              />
            </motion.div>
          )}

          {activeView === 'hierarchy' && (
            <motion.div
              key="view-hierarchy"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -6 }}
              transition={{ duration: 0.2 }}
            >
              <SecurityHierarchyView
                players={players}
                founders={founders}
                dClassCount={dClassTotal}
                hierarchy={hierarchy}
                session={session}
                staffPolicy={staffPolicy}
                onSelectPlayer={(p) => setSelectedPlayerId(p.id)}
                onUpdateHierarchy={handleUpdateHierarchy}
                onAddHierarchyAccount={handleAddHierarchyAccount}
                onDeleteHierarchyAccount={handleDeleteHierarchyAccount}
                onOpenAdminLogin={() => setActiveView('admin')}
              />
            </motion.div>
          )}

          {activeView === 'totw' && (
            <motion.div
              key="view-totw"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -6 }}
              transition={{ duration: 0.2 }}
              className="space-y-8"
            >
              <TeamOfTheWeekSection
                players={players}
                siteConfig={siteConfig}
                onSelectPlayer={(p) => setSelectedPlayerId(p.id)}
                sectionIndex="01."
              />
            </motion.div>
          )}

          {activeView === 'admin' && (
            <motion.div
              key="view-admin"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -6 }}
              transition={{ duration: 0.2 }}
            >
              <AdminPanel
                players={players}
                hierarchy={hierarchy}
                leagues={leagues}
                auditLogs={auditLogs}
                session={session}
                staffPolicy={staffPolicy}
                siteConfig={siteConfig}
                activeStaffCounts={activeStaffCounts}
                onLogin={handleLogin}
                onLogout={handleLogout}
                onSelectPlayer={(p) => setSelectedPlayerId(p.id)}
                onOpenCreatePlayer={() =>
                  setFormState({ open: true, mode: 'create', player: null })
                }
                onOpenEditPlayer={(player) =>
                  setFormState({ open: true, mode: 'edit', player })
                }
                onDisciplinePlayer={handleDisciplinePlayer}
                onDeletePlayer={handleDeletePlayer}
                onUpdateHierarchy={handleUpdateHierarchy}
                onAddHierarchyAccount={handleAddHierarchyAccount}
                onDeleteHierarchyAccount={handleDeleteHierarchyAccount}
                onUpdateStaffPolicy={handleUpdateStaffPolicy}
                onRevokeSessions={handleRevokeSessions}
                onUpdateSiteConfig={handleUpdateSiteConfig}
                onResetSiteConfig={handleResetSiteConfig}
                onUpdateLeagueIdentity={handleUpdateLeagueIdentity}
                onBulkFounderAction={handleBulkFounderAction}
              />
            </motion.div>
          )}
        </AnimatePresence>
      </main>

      {/* Quiet Editorial Footer with Configurable Title & Copyright Notice */}
      <footer className="relative z-10 border-t border-white/10 bg-ink/80 backdrop-blur-md py-7 mt-14">
        <div className="max-w-[1400px] mx-auto px-4 sm:px-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4 text-xs font-mono text-mist">
          <div className="space-y-1">
            <p className="text-fog font-sans font-medium">
              {siteConfig.footerTitle}
            </p>
            <p className="text-mist">
              {siteConfig.footerCopyright}
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-4 text-xs font-sans text-fog">
            <button
              type="button"
              onClick={() => setActiveView('registry')}
              className="hover:text-white transition-colors cursor-pointer"
            >
              Registry
            </button>
            <span className="text-white/20" aria-hidden="true">·</span>
            <button
              type="button"
              onClick={() => setActiveView('standings')}
              className="hover:text-white transition-colors cursor-pointer"
            >
              Standings
            </button>
            <span className="text-white/20" aria-hidden="true">·</span>
            <button
              type="button"
              onClick={() => setActiveView('founders')}
              className="hover:text-white transition-colors cursor-pointer"
            >
              Founders
            </button>
            <span className="text-white/20" aria-hidden="true">·</span>
            <button
              type="button"
              onClick={() => setActiveView('hierarchy')}
              className="hover:text-white transition-colors cursor-pointer"
            >
              Rank System
            </button>
            <span className="text-white/20" aria-hidden="true">·</span>
            <button
              type="button"
              onClick={() => setActiveView('totw')}
              className="hover:text-white transition-colors cursor-pointer"
            >
              Team of the Week
            </button>
            <span className="text-white/20" aria-hidden="true">·</span>
            <button
              type="button"
              onClick={() => setActiveView('admin')}
              className="hover:text-white transition-colors cursor-pointer"
            >
              Staff Login
            </button>
          </div>
        </div>
      </footer>

      {/* Centered Pop-Up Roblox Profile & Dossier Modal */}
      <RobloxProfileModal
        player={selectedPlayer}
        session={session}
        staffPolicy={staffPolicy}
        leagues={leagues}
        onClose={() => setSelectedPlayerId(null)}
        onEditPlayer={(player) => {
          setSelectedPlayerId(null);
          setFormState({ open: true, mode: 'edit', player });
        }}
        onDisciplineAction={handleDisciplinePlayer}
        onProfileResolved={handleProfileResolved}
      />

      {/* Create / Edit Player Pop-Up Modal */}
      <PlayerFormModal
        open={formState.open}
        mode={formState.mode}
        initialPlayer={formState.player}
        role={session.role}
        staffPolicy={staffPolicy}
        leagues={leagues}
        onClose={() => setFormState((prev) => ({ ...prev, open: false }))}
        onSave={handleSavePlayer}
      />
    </div>
  );
}
