import { useMemo, useState } from 'react';
import {
  AlertTriangle,
  Ban,
  Crown,
  Edit3,
  Eye,
  EyeOff,
  Globe,
  KeyRound,
  LogOut,
  PauseCircle,
  Plus,
  Search,
  ShieldAlert,
  ShieldCheck,
  Trash2,
} from 'lucide-react';
import type {
  AuditLogEntry,
  HierarchyAccount,
  LeagueDivision,
  LeagueId,
  PlayerRecord,
  SecurityRank,
  SiteConfig,
  StaffAccessPolicy,
  StaffSession,
} from '../lib/types';
import {
  canAddPlayer,
  canBanEntity,
  canDeletePlayer,
  canEditPlayerStats,
  canManageFounderControls,
  canManageHierarchy,
  canSuspendPlayer,
  getSkillRankInfo,
} from '../lib/hierarchy';
import { filterAndSortPlayers } from '../lib/rosterSeed';
import { AvatarImage } from './AvatarImage';
import { TeamRoleBadge } from './TeamRoleBadge';
import { FounderCommandPanel, type ActiveStaffCounts } from './FounderCommandPanel';

interface AdminPanelProps {
  players: PlayerRecord[];
  hierarchy: HierarchyAccount[];
  leagues: LeagueDivision[];
  auditLogs: AuditLogEntry[];
  session: StaffSession;
  staffPolicy: StaffAccessPolicy;
  siteConfig: SiteConfig;
  activeStaffCounts: ActiveStaffCounts;
  onLogin: (password: string) => Promise<void>;
  onLogout: () => Promise<void>;
  onSelectPlayer: (player: PlayerRecord) => void;
  onOpenCreatePlayer: () => void;
  onOpenEditPlayer: (player: PlayerRecord) => void;
  onDisciplinePlayer: (
    player: PlayerRecord,
    action: 'suspend' | 'unsuspend' | 'ban' | 'unban'
  ) => Promise<void>;
  onDeletePlayer: (player: PlayerRecord) => Promise<void>;
  onUpdateHierarchy: (
    accountId: number,
    patch: Partial<Pick<HierarchyAccount, 'securityRank' | 'banned' | 'suspended' | 'kicked'>>
  ) => Promise<void>;
  onAddHierarchyAccount: (username: string, rank: SecurityRank) => Promise<void>;
  onDeleteHierarchyAccount: (accountId: number) => Promise<void>;
  onUpdateStaffPolicy: (nextPolicy: StaffAccessPolicy | { reset: true }) => Promise<void>;
  onRevokeSessions: (targetRole: 'admin' | 'moderator' | 'all') => Promise<void>;
  onUpdateSiteConfig: (patch: Partial<SiteConfig>) => Promise<void>;
  onResetSiteConfig: () => Promise<void>;
  onUpdateLeagueIdentity: (
    leagueId: LeagueId,
    payload: {
      name: string;
      regionLabel: string;
      logoUrl: string;
      clubs: Array<{ id: string; name: string; shortCode: string; logoUrl: string }>;
    }
  ) => Promise<void>;
  onBulkFounderAction: (
    action:
      | 'reset-all-standings'
      | 'reset-all-player-stats'
      | 'clear-all-suspensions'
      | 'clear-all-bans'
      | 'restore-default-leagues'
  ) => Promise<void>;
}

export function AdminPanel({
  players,
  hierarchy,
  leagues,
  auditLogs,
  session,
  staffPolicy,
  siteConfig,
  activeStaffCounts,
  onLogin,
  onLogout,
  onSelectPlayer,
  onOpenCreatePlayer,
  onOpenEditPlayer,
  onDisciplinePlayer,
  onDeletePlayer,
  onUpdateHierarchy,
  onAddHierarchyAccount,
  onDeleteHierarchyAccount,
  onUpdateStaffPolicy,
  onRevokeSessions,
  onUpdateSiteConfig,
  onResetSiteConfig,
  onUpdateLeagueIdentity,
  onBulkFounderAction,
}: AdminPanelProps) {
  const [passwordInput, setPasswordInput] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [authError, setAuthError] = useState('');
  const [authenticating, setAuthenticating] = useState(false);
  const [showSwitchKeyForm, setShowSwitchKeyForm] = useState(false);

  const [activeTab, setActiveTab] = useState<
    'roster' | 'hierarchy' | 'permissions' | 'studio' | 'audit'
  >('roster');
  const [adminSearch, setAdminSearch] = useState('');
  const [newHierarchyUser, setNewHierarchyUser] = useState('');
  const [newHierarchyRank, setNewHierarchyRank] = useState<SecurityRank>('D');

  const isFounder = canManageFounderControls(session.role);
  const canBan = canBanEntity(session.role, staffPolicy);
  const canSuspend = canSuspendPlayer(session.role, staffPolicy);
  const canEdit = canEditPlayerStats(session.role, staffPolicy);
  const canAdd = canAddPlayer(session.role, staffPolicy);
  const canDelete = canDeletePlayer(session.role, staffPolicy);
  const canHierarchy = canManageHierarchy(session.role, staffPolicy);

  const resolvedTab =
    !isFounder && (activeTab === 'permissions' || activeTab === 'studio')
      ? 'roster'
      : activeTab;

  const filteredRoster = useMemo(
    () =>
      filterAndSortPlayers(players, {
        search: adminSearch,
        sort: 'rank-desc',
      }),
    [players, adminSearch]
  );

  const handlePasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!passwordInput.trim()) {
      setAuthError('Please enter your staff authorization password.');
      return;
    }
    setAuthenticating(true);
    setAuthError('');
    try {
      await onLogin(passwordInput);
      setPasswordInput('');
      setShowSwitchKeyForm(false);
    } catch (err) {
      setAuthError(err instanceof Error ? err.message : 'Invalid staff password.');
    } finally {
      setAuthenticating(false);
    }
  };

  // Password Gate Screen when Locked (or Switching Staff Key)
  if (!session.authenticated || showSwitchKeyForm) {
    return (
      <div className="max-w-2xl mx-auto py-8 space-y-6">
        <div className="p-6 sm:p-8 rounded-2xl surface-panel border border-white/15 space-y-6">
          <div className="flex items-start justify-between gap-4 border-b border-white/10 pb-4">
            <div className="flex items-center gap-3">
              <div className="h-11 w-11 rounded-xl bg-crimson/20 border border-crimson/40 text-ember flex items-center justify-center shrink-0">
                <KeyRound className="w-5 h-5" aria-hidden="true" />
              </div>
              <div>
                <h1 className="font-display text-2xl font-semibold text-white">
                  Staff Login
                </h1>
                <p className="text-xs font-mono text-fog mt-0.5">
                  Enter your Moderator, Administrator, or Founder key to sign in
                </p>
              </div>
            </div>

            {session.authenticated && (
              <button
                type="button"
                onClick={() => {
                  setShowSwitchKeyForm(false);
                  setAuthError('');
                }}
                className="text-xs font-mono text-fog hover:text-white cursor-pointer"
              >
                Cancel
              </button>
            )}
          </div>

          {authError && (
            <div
              role="alert"
              className="p-3.5 rounded-xl bg-red-500/15 border border-red-500/40 text-xs font-mono text-red-300"
            >
              {authError}
            </div>
          )}

          <form onSubmit={handlePasswordSubmit} className="space-y-4">
            <div>
              <label
                htmlFor="admin-password-input"
                className="block text-xs font-mono text-fog mb-1.5"
              >
                Staff Authorization Key
              </label>
              <div className="relative">
                <input
                  id="admin-password-input"
                  type={showPassword ? 'text' : 'password'}
                  value={passwordInput}
                  onChange={(e) => setPasswordInput(e.target.value)}
                  placeholder="Enter Moderator, Administrator, or Founder key..."
                  autoComplete="off"
                  className="w-full bg-ink border border-white/15 focus:border-crimson rounded-xl py-3 pl-4 pr-11 text-sm font-mono text-white outline-none"
                />
                <button
                  type="button"
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                  onClick={() => setShowPassword((prev) => !prev)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-mist hover:text-white cursor-pointer"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={authenticating}
              className="w-full py-3 rounded-xl bg-crimson hover:bg-ember text-white font-medium text-sm transition-colors disabled:opacity-50 cursor-pointer"
            >
              {authenticating ? 'Signing In...' : 'Sign In'}
            </button>
          </form>

          {/* Role Permission Matrix (no passwords exposed on screen) */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2 border-t border-white/10 text-xs">
            <div className="p-3.5 rounded-xl bg-ink/80 border border-white/10 space-y-1.5">
              <div className="flex items-center justify-between gap-1">
                <p className="font-mono font-semibold text-emerald-400">
                  Moderator Key
                </p>
                {staffPolicy.moderator.keyPaused && (
                  <span className="text-[10px] font-mono text-red-400 flex items-center gap-1">
                    <PauseCircle className="w-3 h-3" aria-hidden="true" />
                    Paused
                  </span>
                )}
              </div>
              <p className="text-fog leading-relaxed">
                {staffPolicy.moderator.keyPaused
                  ? 'Currently paused by a Founder. Sign-in with this key is temporarily disabled.'
                  : 'Suspend or reinstate players, change player teams, edit stats & skill ranks, and register new players.'}
              </p>
            </div>

            <div className="p-3.5 rounded-xl bg-ink/80 border border-white/10 space-y-1.5">
              <div className="flex items-center justify-between gap-1">
                <p className="font-mono font-semibold text-ember">
                  Administrator Key
                </p>
                {staffPolicy.admin.keyPaused && (
                  <span className="text-[10px] font-mono text-red-400 flex items-center gap-1">
                    <PauseCircle className="w-3 h-3" aria-hidden="true" />
                    Paused
                  </span>
                )}
              </div>
              <p className="text-fog leading-relaxed">
                {staffPolicy.admin.keyPaused
                  ? 'Currently paused by a Founder. Sign-in with this key is temporarily disabled.'
                  : 'Edit league standings, change player teams, ban, suspend, edit stats, add/delete players, and manage hierarchy.'}
              </p>
            </div>

            <div className="p-3.5 rounded-xl bg-ink/80 border border-founder/35 space-y-1.5">
              <p className="font-mono font-semibold text-founder flex items-center gap-1.5">
                <Crown className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
                <span>Founder Key</span>
              </p>
              <p className="text-fog leading-relaxed">
                Supreme command: Pause Admin/Mod keys, add or remove role permissions, ban/edit anything, and customize the entire website.
              </p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Authenticated Session Banner */}
      <div
        className={`p-5 sm:p-6 rounded-xl surface-panel border flex flex-wrap items-center justify-between gap-4 ${
          isFounder ? 'border-founder/45' : 'border-white/15'
        }`}
      >
        <div className="flex items-center gap-3.5">
          <div
            className={`h-11 w-11 rounded-xl flex items-center justify-center shrink-0 border ${
              isFounder
                ? 'bg-founder/20 border-founder/45 text-founder'
                : session.role === 'admin'
                  ? 'bg-crimson/20 border-crimson/40 text-ember'
                  : 'bg-emerald-500/15 border-emerald-500/40 text-emerald-400'
            }`}
          >
            {isFounder ? (
              <Crown className="w-5 h-5" aria-hidden="true" />
            ) : (
              <ShieldCheck className="w-5 h-5" aria-hidden="true" />
            )}
          </div>
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="font-display text-xl font-semibold text-white">
                @{session.actorName}
              </h1>
              <span className="text-xs font-mono text-mist">·</span>
              <span
                className={`text-xs font-mono font-semibold ${
                  isFounder
                    ? 'text-founder'
                    : session.role === 'admin'
                      ? 'text-ember'
                      : 'text-emerald-400'
                }`}
              >
                {isFounder
                  ? 'Founder · Supreme Sovereign Authority'
                  : session.role === 'admin'
                    ? 'Administrator · Command Authority'
                    : 'Moderator · Roster & Discipline'}
              </span>
            </div>
            <p className="text-xs font-mono text-mist mt-0.5">
              {isFounder
                ? 'Unrestricted Founder clearance: Pause Admin/Mod keys, configure role permissions, ban/edit/delete any record, and customize the entire website.'
                : session.role === 'admin'
                  ? 'Administrator clearance active — permissions governed live by Founder policy.'
                  : 'Moderator clearance active — permissions governed live by Founder policy.'}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            type="button"
            onClick={() => {
              setShowSwitchKeyForm(true);
              setAuthError('');
            }}
            className="px-3.5 py-2 rounded-lg border border-white/15 bg-white/5 hover:bg-white/10 text-xs font-mono text-white flex items-center gap-1.5 cursor-pointer"
          >
            <KeyRound className="w-3.5 h-3.5" aria-hidden="true" />
            <span>Switch Key</span>
          </button>
          <button
            type="button"
            onClick={onLogout}
            className="px-3.5 py-2 rounded-lg border border-red-500/40 text-red-300 hover:bg-red-500/15 text-xs font-mono flex items-center gap-1.5 cursor-pointer"
          >
            <LogOut className="w-3.5 h-3.5" aria-hidden="true" />
            <span>Sign Out</span>
          </button>
        </div>
      </div>

      {/* Sub-navigation Tabs */}
      <div className="flex items-center gap-6 overflow-x-auto border-b border-white/10 text-xs font-mono">
        <button
          type="button"
          onClick={() => setActiveTab('roster')}
          className={`pb-3 border-b-2 whitespace-nowrap shrink-0 transition-colors cursor-pointer ${
            resolvedTab === 'roster'
              ? 'border-crimson text-white font-semibold'
              : 'border-transparent text-mist hover:text-white'
          }`}
        >
          Roster &amp; Stats Management ({players.length})
        </button>

        {isFounder && (
          <>
            <button
              type="button"
              onClick={() => setActiveTab('permissions')}
              className={`pb-3 border-b-2 whitespace-nowrap shrink-0 transition-colors flex items-center gap-1.5 cursor-pointer ${
                resolvedTab === 'permissions'
                  ? 'border-founder text-founder font-semibold'
                  : 'border-transparent text-founder/80 hover:text-founder'
              }`}
            >
              <Crown className="w-3.5 h-3.5" aria-hidden="true" />
              <span>Key &amp; Role Control</span>
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('studio')}
              className={`pb-3 border-b-2 whitespace-nowrap shrink-0 transition-colors flex items-center gap-1.5 cursor-pointer ${
                resolvedTab === 'studio'
                  ? 'border-founder text-founder font-semibold'
                  : 'border-transparent text-founder/80 hover:text-founder'
              }`}
            >
              <Globe className="w-3.5 h-3.5" aria-hidden="true" />
              <span>Website &amp; League Studio</span>
            </button>
          </>
        )}

        <button
          type="button"
          onClick={() => setActiveTab('hierarchy')}
          className={`pb-3 border-b-2 whitespace-nowrap shrink-0 transition-colors cursor-pointer ${
            resolvedTab === 'hierarchy'
              ? 'border-crimson text-white font-semibold'
              : 'border-transparent text-mist hover:text-white'
          }`}
        >
          Security Hierarchy Guard {!canHierarchy ? '(Locked)' : ''}
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('audit')}
          className={`pb-3 border-b-2 whitespace-nowrap shrink-0 transition-colors cursor-pointer ${
            resolvedTab === 'audit'
              ? 'border-crimson text-white font-semibold'
              : 'border-transparent text-mist hover:text-white'
          }`}
        >
          Security Audit Log ({auditLogs.length})
        </button>
      </div>

      {/* Founder Exclusive Tabs */}
      {isFounder && (resolvedTab === 'permissions' || resolvedTab === 'studio') && (
        <FounderCommandPanel
          mode={resolvedTab}
          staffPolicy={staffPolicy}
          siteConfig={siteConfig}
          leagues={leagues}
          activeStaffCounts={activeStaffCounts}
          onUpdateStaffPolicy={onUpdateStaffPolicy}
          onRevokeSessions={onRevokeSessions}
          onUpdateSiteConfig={onUpdateSiteConfig}
          onResetSiteConfig={onResetSiteConfig}
          onUpdateLeagueIdentity={onUpdateLeagueIdentity}
          onBulkFounderAction={onBulkFounderAction}
        />
      )}

      {/* Tab 1: Roster & Stats Management */}
      {resolvedTab === 'roster' && (
        <div className="space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="relative flex-1 min-w-[240px] max-w-md">
              <label htmlFor="admin-roster-search" className="sr-only">
                Search players in Staff table
              </label>
              <Search
                className="w-4 h-4 text-mist absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none"
                aria-hidden="true"
              />
              <input
                id="admin-roster-search"
                type="search"
                value={adminSearch}
                onChange={(e) => setAdminSearch(e.target.value)}
                placeholder="Filter by username, club, or Roblox ID..."
                className="w-full bg-ink border border-white/15 focus:border-crimson rounded-lg py-2 pl-10 pr-4 text-xs font-mono text-white outline-none"
              />
            </div>

            {canAdd && (
              <button
                type="button"
                onClick={onOpenCreatePlayer}
                className="px-4 py-2.5 rounded-lg bg-crimson hover:bg-ember text-white text-xs font-medium flex items-center gap-1.5 cursor-pointer"
              >
                <Plus className="w-4 h-4" aria-hidden="true" />
                <span>Add Player</span>
              </button>
            )}
          </div>

          <div className="overflow-x-auto rounded-xl surface-panel border border-white/10 max-h-[640px] overflow-y-auto">
            <table className="w-full text-left text-xs font-mono">
              <thead className="sticky top-0 z-10 border-b border-white/10 text-[11px] text-mist bg-panel">
                <tr>
                  <th className="py-3 px-4">Athlete</th>
                  <th className="py-3 px-4">Roblox ID</th>
                  <th className="py-3 px-4">Skill Rank</th>
                  <th className="py-3 px-4">Pos</th>
                  <th className="py-3 px-4">Pref. Foot</th>
                  <th className="py-3 px-4">Team</th>
                  <th className="py-3 px-4 text-right">OVR</th>
                  <th className="py-3 px-4 text-right">G / A</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5 tabular-nums">
                {filteredRoster.map((player) => (
                  <tr key={player.id} className="hover:bg-white/5 transition-colors">
                    <td className="py-2.5 px-4">
                      <button
                        type="button"
                        onClick={() => onSelectPlayer(player)}
                        className="flex items-center gap-2.5 text-left font-sans text-sm font-medium text-white hover:text-ember transition-colors cursor-pointer"
                      >
                        <AvatarImage
                          src={player.avatarUrl}
                          username={player.username}
                          isFounder={player.isFounder}
                          sizeClass="h-8 w-8 rounded-lg"
                          textClass="text-xs"
                        />
                        <span className="truncate max-w-[160px]">{player.username}</span>
                      </button>
                    </td>
                    <td className="py-2.5 px-4 text-fog">{player.robloxId ?? '—'}</td>
                    <td className="py-2.5 px-4">
                      {(() => {
                        const info = getSkillRankInfo(player.isFounder ? 'S' : player.tier);
                        return <span className={info.textClass}>{info.fullLabel}</span>;
                      })()}
                    </td>
                    <td className="py-2.5 px-4 text-white">{player.position}</td>
                    <td className="py-2.5 px-4 text-white">{player.foot}</td>
                    <td className="py-2.5 px-4 max-w-[180px]">
                      <TeamRoleBadge
                        clubName={player.club}
                        leagues={leagues}
                        showPrefix={false}
                      />
                    </td>
                    <td className="py-2.5 px-4 text-right font-display text-sm font-semibold text-white">
                      {player.rating}
                    </td>
                    <td className="py-2.5 px-4 text-right text-fog">
                      {player.goals} / {player.assists}
                    </td>
                    <td className="py-2.5 px-4">
                      {player.banned ? (
                        <span className="text-red-400 flex items-center gap-1">
                          <Ban className="w-3 h-3" /> Banned
                        </span>
                      ) : player.suspended ? (
                        <span className="text-amber-400 flex items-center gap-1">
                          <AlertTriangle className="w-3 h-3" /> Suspended
                        </span>
                      ) : (
                        <span className="text-emerald-400">Active</span>
                      )}
                    </td>
                    <td className="py-2.5 px-4 text-right">
                      {(() => {
                        const targetProtected = player.isFounder && !isFounder;
                        return (
                          <div className="inline-flex items-center gap-1.5">
                            {canEdit && (
                              <button
                                type="button"
                                aria-label={`Edit stats for ${player.username}`}
                                onClick={() => onOpenEditPlayer(player)}
                                className="px-2.5 py-1 rounded bg-white/10 hover:bg-crimson text-white transition-colors flex items-center gap-1 cursor-pointer"
                              >
                                <Edit3 className="w-3 h-3" aria-hidden="true" />
                                <span>Edit Stats</span>
                              </button>
                            )}

                            <button
                              type="button"
                              disabled={!canSuspend || targetProtected}
                              aria-label={`${player.suspended ? 'Unsuspend' : 'Suspend'} ${player.username}`}
                              onClick={() =>
                                onDisciplinePlayer(
                                  player,
                                  player.suspended ? 'unsuspend' : 'suspend'
                                )
                              }
                              title={
                                targetProtected
                                  ? 'Only a Founder can suspend a Founder record'
                                  : !canSuspend
                                    ? 'Suspend permission required'
                                    : undefined
                              }
                              className="px-2.5 py-1 rounded border border-amber-500/35 text-amber-300 hover:bg-amber-500/15 disabled:opacity-30 cursor-pointer disabled:cursor-not-allowed"
                            >
                              {player.suspended ? 'Reinstate' : 'Suspend'}
                            </button>

                            <button
                              type="button"
                              disabled={!canBan || targetProtected}
                              aria-label={`${player.banned ? 'Unban' : 'Ban'} ${player.username}`}
                              onClick={() =>
                                onDisciplinePlayer(player, player.banned ? 'unban' : 'ban')
                              }
                              title={
                                targetProtected
                                  ? 'Only a Founder can ban a Founder record'
                                  : !canBan
                                    ? 'Ban permission required'
                                    : undefined
                              }
                              className="px-2.5 py-1 rounded border border-red-500/35 text-red-400 hover:bg-red-500/15 disabled:opacity-30 cursor-pointer disabled:cursor-not-allowed"
                            >
                              {player.banned ? 'Unban' : 'Ban'}
                            </button>

                            {canDelete && (!player.isFounder || isFounder) && (
                              <button
                                type="button"
                                aria-label={`Delete ${player.username}`}
                                onClick={() => onDeletePlayer(player)}
                                className="p-1.5 rounded border border-white/10 text-mist hover:text-red-400 hover:border-red-500/40 cursor-pointer"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            )}
                          </div>
                        );
                      })()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Tab 2: Security Hierarchy Management */}
      {resolvedTab === 'hierarchy' && (
        <div className="space-y-4">
          {!canHierarchy && (
            <div className="p-4 rounded-xl bg-amber-500/10 border border-amber-500/35 flex items-center justify-between gap-4 text-xs font-mono text-amber-200">
              <div className="flex items-center gap-2">
                <ShieldAlert className="w-4 h-4 shrink-0 text-amber-400" />
                <span>
                  Your current staff role has read-only visibility here. Switch to a role with Security Hierarchy clearance to modify accounts.
                </span>
              </div>
              <button
                type="button"
                onClick={() => setShowSwitchKeyForm(true)}
                className="px-3 py-1.5 rounded-lg bg-amber-500/20 hover:bg-amber-500/30 text-white whitespace-nowrap cursor-pointer"
              >
                Switch Key
              </button>
            </div>
          )}

          {canHierarchy && (
            <form
              onSubmit={async (e) => {
                e.preventDefault();
                if (!newHierarchyUser.trim()) return;
                await onAddHierarchyAccount(newHierarchyUser.trim(), newHierarchyRank);
                setNewHierarchyUser('');
              }}
              className="p-4 rounded-xl surface-panel border border-white/10 flex flex-wrap items-end gap-3"
            >
              <div className="flex-1 min-w-[220px]">
                <label htmlFor="admin-hierarchy-user" className="block text-xs font-mono text-fog mb-1">
                  Assign Roblox Username to Security Hierarchy
                </label>
                <input
                  id="admin-hierarchy-user"
                  type="text"
                  value={newHierarchyUser}
                  onChange={(e) => setNewHierarchyUser(e.target.value)}
                  placeholder="Enter Roblox username..."
                  className="w-full bg-ink border border-white/15 rounded-lg px-3.5 py-2 text-sm text-white outline-none"
                />
              </div>
              <div>
                <label htmlFor="admin-hierarchy-rank" className="block text-xs font-mono text-fog mb-1">
                  Skill Rank
                </label>
                <select
                  id="admin-hierarchy-rank"
                  value={newHierarchyRank}
                  onChange={(e) => setNewHierarchyRank(e.target.value as SecurityRank)}
                  className="bg-ink border border-white/15 rounded-lg px-3.5 py-2 text-sm font-mono text-white outline-none"
                >
                  <option value="S">S Rank · Very Good</option>
                  <option value="A">A Rank · Good</option>
                  <option value="B">B Rank · Decent</option>
                  <option value="D">D Rank · Okay</option>
                </select>
              </div>
              <button
                type="submit"
                className="px-4 py-2 rounded-lg bg-crimson hover:bg-ember text-white text-xs font-medium cursor-pointer"
              >
                Assign Rank
              </button>
            </form>
          )}

          <div className="space-y-3">
            {hierarchy.map((acc) => {
              const rowEditable = canHierarchy && (!acc.isFounder || isFounder);
              return (
                <div
                  key={acc.id}
                  className="p-4 rounded-xl surface-panel border border-white/10 flex flex-wrap items-center justify-between gap-4"
                >
                  <div className="flex items-center gap-3">
                    <AvatarImage
                      src={acc.avatarUrl}
                      username={acc.username}
                      isFounder={acc.securityRank === 'S'}
                      sizeClass="h-10 w-10 rounded-xl"
                    />
                    <div>
                      <div className="font-display text-base font-semibold text-white">
                        @{acc.username}{' '}
                        <span className="text-xs font-mono text-founder ml-1">
                          · {acc.securityRank === 'D' ? 'D Class' : `${acc.securityRank} Rank`}
                        </span>
                      </div>
                      <p className="text-xs font-mono text-mist tabular-nums">
                        {acc.roleTitle} · Roblox ID: {acc.robloxId ?? 'Staff'} · {acc.lastActive}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <select
                      aria-label={`Change skill rank for ${acc.username}`}
                      disabled={!rowEditable}
                      value={acc.securityRank}
                      onChange={(e) =>
                        onUpdateHierarchy(acc.id, {
                          securityRank: e.target.value as SecurityRank,
                        })
                      }
                      className="bg-ink border border-white/15 rounded-lg px-2.5 py-1.5 text-xs font-mono text-white disabled:opacity-40"
                    >
                      <option value="S">S Rank (Very Good)</option>
                      <option value="A">A Rank (Good)</option>
                      <option value="B">B Rank (Decent)</option>
                      <option value="D">D Rank (Okay)</option>
                    </select>

                    <button
                      type="button"
                      disabled={!rowEditable}
                      onClick={() =>
                        onUpdateHierarchy(acc.id, { suspended: !acc.suspended })
                      }
                      className="px-3 py-1.5 rounded-lg border border-amber-500/40 text-amber-300 text-xs font-mono disabled:opacity-35 cursor-pointer disabled:cursor-not-allowed"
                    >
                      {acc.suspended ? 'Unsuspend' : 'Suspend'}
                    </button>

                    <button
                      type="button"
                      disabled={!rowEditable}
                      onClick={() => onUpdateHierarchy(acc.id, { banned: !acc.banned })}
                      className="px-3 py-1.5 rounded-lg border border-red-500/40 text-red-400 text-xs font-mono disabled:opacity-35 cursor-pointer disabled:cursor-not-allowed"
                    >
                      {acc.banned ? 'Unban' : 'Ban'}
                    </button>

                    {rowEditable && (
                      <button
                        type="button"
                        aria-label={`Remove ${acc.username} from hierarchy`}
                        onClick={() => onDeleteHierarchyAccount(acc.id)}
                        className="p-1.5 rounded-lg border border-white/10 text-mist hover:text-red-400 hover:border-red-500/40 cursor-pointer"
                      >
                        <Trash2 className="w-3.5 h-3.5" aria-hidden="true" />
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Tab 3: Security Audit Log */}
      {resolvedTab === 'audit' && (
        <div className="space-y-2.5">
          {auditLogs.map((entry) => (
            <div
              key={entry.id}
              className="p-3.5 rounded-xl surface-panel border border-white/10 font-mono text-xs flex flex-wrap items-start justify-between gap-4"
            >
              <div className="space-y-1">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-ember font-semibold">{entry.action}</span>
                  <span className="text-mist">by</span>
                  <span className="text-white">@{entry.actor}</span>
                  <span className="text-mist">({entry.actorRole})</span>
                  <span className="text-mist">→</span>
                  <span className="text-gold">{entry.target}</span>
                </div>
                <p className="text-fog text-[11px]">{entry.detail}</p>
              </div>
              <span className="text-mist text-[11px] tabular-nums">
                {new Date(entry.timestamp).toLocaleTimeString()}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
