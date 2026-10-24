import { useEffect, useState } from 'react';
import {
  Crown,
  Globe,
  LogOut,
  PauseCircle,
  PlayCircle,
  RotateCcw,
  Save,
  ShieldAlert,
  Sparkles,
  Trophy,
} from 'lucide-react';
import type {
  LeagueDivision,
  LeagueId,
  RolePermissionKey,
  SiteConfig,
  StaffAccessPolicy,
} from '../lib/types';
import { ROLE_PERMISSION_DESCRIPTORS } from '../lib/hierarchy';

export interface ActiveStaffCounts {
  founder: number;
  admin: number;
  moderator: number;
}

interface FounderCommandPanelProps {
  mode: 'permissions' | 'studio';
  staffPolicy: StaffAccessPolicy;
  siteConfig: SiteConfig;
  leagues: LeagueDivision[];
  activeStaffCounts: ActiveStaffCounts;
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

export function FounderCommandPanel({
  mode,
  staffPolicy,
  siteConfig,
  leagues,
  activeStaffCounts,
  onUpdateStaffPolicy,
  onRevokeSessions,
  onUpdateSiteConfig,
  onResetSiteConfig,
  onUpdateLeagueIdentity,
  onBulkFounderAction,
}: FounderCommandPanelProps) {
  const [busyKey, setBusyKey] = useState<string | null>(null);
  const [draftPolicy, setDraftPolicy] = useState<StaffAccessPolicy>(staffPolicy);
  const [draftSite, setDraftSite] = useState<SiteConfig>(siteConfig);
  const [selectedLeagueId, setSelectedLeagueId] = useState<LeagueId>(
    leagues[0]?.id ?? 'deutscher-fussball-liga'
  );
  const [leagueNameDraft, setLeagueNameDraft] = useState('');
  const [leagueRegionDraft, setLeagueRegionDraft] = useState('');
  const [leagueLogoDraft, setLeagueLogoDraft] = useState('');
  const [clubDrafts, setClubDrafts] = useState<
    Array<{ id: string; name: string; shortCode: string; logoUrl: string }>
  >([]);
  const [confirmingAction, setConfirmingAction] = useState<string | null>(null);

  useEffect(() => {
    setDraftPolicy(staffPolicy);
  }, [staffPolicy]);

  useEffect(() => {
    setDraftSite(siteConfig);
  }, [siteConfig]);

  useEffect(() => {
    const activeLeague = leagues.find((l) => l.id === selectedLeagueId) ?? leagues[0];
    if (!activeLeague) return;
    setLeagueNameDraft(activeLeague.name);
    setLeagueRegionDraft(activeLeague.regionLabel);
    setLeagueLogoDraft(activeLeague.logoUrl);
    setClubDrafts(
      activeLeague.clubs.map((c) => ({
        id: c.id,
        name: c.name,
        shortCode: c.shortCode,
        logoUrl: c.logoUrl,
      }))
    );
  }, [leagues, selectedLeagueId]);

  const handleToggleKeyPause = async (targetRole: 'admin' | 'moderator') => {
    const next: StaffAccessPolicy = {
      ...draftPolicy,
      [targetRole]: {
        ...draftPolicy[targetRole],
        keyPaused: !draftPolicy[targetRole].keyPaused,
      },
    };
    setDraftPolicy(next);
    setBusyKey(`pause-${targetRole}`);
    try {
      await onUpdateStaffPolicy(next);
    } catch {
      setDraftPolicy(staffPolicy);
    } finally {
      setBusyKey(null);
    }
  };

  const handleTogglePermission = async (
    targetRole: 'admin' | 'moderator',
    permKey: RolePermissionKey
  ) => {
    const next: StaffAccessPolicy = {
      ...draftPolicy,
      [targetRole]: {
        ...draftPolicy[targetRole],
        permissions: {
          ...draftPolicy[targetRole].permissions,
          [permKey]: !draftPolicy[targetRole].permissions[permKey],
        },
      },
    };
    setDraftPolicy(next);
    setBusyKey(`perm-${targetRole}-${permKey}`);
    try {
      await onUpdateStaffPolicy(next);
    } catch {
      setDraftPolicy(staffPolicy);
    } finally {
      setBusyKey(null);
    }
  };

  const handleSetAllRolePermissions = async (
    targetRole: 'admin' | 'moderator',
    enabled: boolean
  ) => {
    const updatedPerms = { ...draftPolicy[targetRole].permissions };
    for (const desc of ROLE_PERMISSION_DESCRIPTORS) {
      updatedPerms[desc.key] = enabled;
    }
    const next: StaffAccessPolicy = {
      ...draftPolicy,
      [targetRole]: {
        ...draftPolicy[targetRole],
        permissions: updatedPerms,
      },
    };
    setDraftPolicy(next);
    setBusyKey(`all-${targetRole}`);
    try {
      await onUpdateStaffPolicy(next);
    } catch {
      setDraftPolicy(staffPolicy);
    } finally {
      setBusyKey(null);
    }
  };

  const handleSaveSiteForm = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusyKey('save-site');
    try {
      await onUpdateSiteConfig(draftSite);
    } finally {
      setBusyKey(null);
    }
  };

  const handleSaveLeagueForm = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusyKey('save-league');
    try {
      await onUpdateLeagueIdentity(selectedLeagueId, {
        name: leagueNameDraft,
        regionLabel: leagueRegionDraft,
        logoUrl: leagueLogoDraft,
        clubs: clubDrafts,
      });
    } finally {
      setBusyKey(null);
    }
  };

  if (mode === 'permissions') {
    const roleCards: Array<{
      roleKey: 'admin' | 'moderator';
      title: string;
      subtitle: string;
      accentClass: string;
      borderClass: string;
      activeSessions: number;
    }> = [
      {
        roleKey: 'admin',
        title: 'Administrator Key & Role',
        subtitle: 'Controls all staff logged in with the Administrator key',
        accentClass: 'text-ember',
        borderClass: 'border-crimson/35',
        activeSessions: activeStaffCounts.admin,
      },
      {
        roleKey: 'moderator',
        title: 'Moderator Key & Role',
        subtitle: 'Controls all staff logged in with the Moderator key',
        accentClass: 'text-emerald-400',
        borderClass: 'border-emerald-500/35',
        activeSessions: activeStaffCounts.moderator,
      },
    ];

    return (
      <div className="space-y-6">
        {/* Top Founder Policy Header */}
        <div className="p-5 rounded-xl surface-panel border border-founder/40 flex flex-wrap items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <Crown className="w-4 h-4 text-founder" aria-hidden="true" />
              <h2 className="font-display text-lg font-semibold text-white">
                Founder Key &amp; Role Access Governance
              </h2>
            </div>
            <p className="text-xs font-mono text-fog">
              Pause the Admin or Moderator keys at any time (instantly blocking logins and active sessions) or add/remove individual permissions on each role.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            <button
              type="button"
              disabled={busyKey !== null}
              onClick={async () => {
                setBusyKey('revoke-all');
                try {
                  await onRevokeSessions('all');
                } finally {
                  setBusyKey(null);
                }
              }}
              className="px-3.5 py-2 rounded-lg border border-amber-500/40 text-amber-300 hover:bg-amber-500/15 text-xs font-mono flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
            >
              <LogOut className="w-3.5 h-3.5" aria-hidden="true" />
              <span>Sign Out All Admins &amp; Mods</span>
            </button>

            <button
              type="button"
              disabled={busyKey !== null}
              onClick={async () => {
                setBusyKey('reset-policy');
                try {
                  await onUpdateStaffPolicy({ reset: true });
                } finally {
                  setBusyKey(null);
                }
              }}
              className="px-3.5 py-2 rounded-lg border border-white/15 bg-white/5 hover:bg-white/10 text-white text-xs font-mono flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
            >
              <RotateCcw className="w-3.5 h-3.5" aria-hidden="true" />
              <span>Restore Default Permissions</span>
            </button>
          </div>
        </div>

        {/* Admin & Moderator Governance Cards */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
          {roleCards.map((card) => {
            const policy = draftPolicy[card.roleKey];
            const enabledCount = ROLE_PERMISSION_DESCRIPTORS.filter(
              (d) => policy.permissions[d.key]
            ).length;
            const roleLabel = card.roleKey === 'admin' ? 'Administrator' : 'Moderator';

            return (
              <div
                key={card.roleKey}
                className={`p-5 sm:p-6 rounded-xl surface-panel border space-y-5 ${
                  policy.keyPaused ? 'border-red-500/50' : card.borderClass
                }`}
              >
                <div className="flex flex-wrap items-start justify-between gap-3 border-b border-white/10 pb-4">
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className={`font-display text-lg font-semibold ${card.accentClass}`}>
                        {card.title}
                      </h3>
                      <span className="text-xs font-mono text-mist">·</span>
                      <span
                        data-testid={`${card.roleKey}-key-status`}
                        className={`text-xs font-mono font-semibold ${
                          policy.keyPaused ? 'text-red-400' : 'text-emerald-400'
                        }`}
                      >
                        {policy.keyPaused ? 'KEY PAUSED' : 'KEY ACTIVE'}
                      </span>
                    </div>
                    <p className="text-xs font-mono text-mist mt-1 tabular-nums">
                      {card.subtitle} · {enabledCount}/{ROLE_PERMISSION_DESCRIPTORS.length} permissions enabled · {card.activeSessions} active session{card.activeSessions === 1 ? '' : 's'}
                    </p>
                  </div>

                  <div className="flex flex-wrap items-center gap-2">
                    <button
                      type="button"
                      disabled={busyKey !== null}
                      aria-label={
                        policy.keyPaused
                          ? `Resume ${roleLabel} Key`
                          : `Pause ${roleLabel} Key`
                      }
                      onClick={() => handleToggleKeyPause(card.roleKey)}
                      className={`px-3.5 py-2 rounded-lg text-xs font-mono font-semibold flex items-center gap-1.5 transition-colors cursor-pointer disabled:opacity-50 ${
                        policy.keyPaused
                          ? 'bg-emerald-500/20 border border-emerald-500/50 text-emerald-300 hover:bg-emerald-500/30'
                          : 'bg-red-500/20 border border-red-500/50 text-red-300 hover:bg-red-500/30'
                      }`}
                    >
                      {policy.keyPaused ? (
                        <>
                          <PlayCircle className="w-3.5 h-3.5" aria-hidden="true" />
                          <span>Resume Key</span>
                        </>
                      ) : (
                        <>
                          <PauseCircle className="w-3.5 h-3.5" aria-hidden="true" />
                          <span>Pause Key</span>
                        </>
                      )}
                    </button>

                    <button
                      type="button"
                      disabled={busyKey !== null || card.activeSessions === 0}
                      onClick={() => onRevokeSessions(card.roleKey)}
                      className="px-2.5 py-2 rounded-lg border border-white/15 text-xs font-mono text-fog hover:text-white hover:border-white/30 cursor-pointer disabled:opacity-35 disabled:cursor-not-allowed"
                    >
                      Kick Sessions ({card.activeSessions})
                    </button>
                  </div>
                </div>

                {policy.keyPaused && (
                  <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/35 text-xs font-mono text-red-300 flex items-center gap-2">
                    <ShieldAlert className="w-4 h-4 shrink-0" aria-hidden="true" />
                    <span>
                      The {roleLabel} key is currently paused. Nobody can sign in or execute actions with this key until resumed.
                    </span>
                  </div>
                )}

                <div className="flex items-center justify-between text-xs font-mono">
                  <span className="text-fog font-semibold">Role Permission Matrix</span>
                  <div className="flex items-center gap-3">
                    <button
                      type="button"
                      disabled={busyKey !== null}
                      onClick={() => handleSetAllRolePermissions(card.roleKey, true)}
                      className="text-emerald-400 hover:text-white cursor-pointer disabled:opacity-40"
                    >
                      Enable All
                    </button>
                    <span className="text-white/20">·</span>
                    <button
                      type="button"
                      disabled={busyKey !== null}
                      onClick={() => handleSetAllRolePermissions(card.roleKey, false)}
                      className="text-red-400 hover:text-white cursor-pointer disabled:opacity-40"
                    >
                      Remove All
                    </button>
                  </div>
                </div>

                <div className="space-y-2.5">
                  {ROLE_PERMISSION_DESCRIPTORS.map((desc) => {
                    const checked = policy.permissions[desc.key];
                    const inputId = `perm-${card.roleKey}-${desc.key}`;
                    return (
                      <label
                        key={desc.key}
                        htmlFor={inputId}
                        className={`p-3 rounded-xl border flex items-start gap-3 transition-colors cursor-pointer ${
                          checked
                            ? 'bg-ink/85 border-white/15 hover:border-white/30'
                            : 'bg-ink/40 border-white/8 opacity-70 hover:opacity-100'
                        }`}
                      >
                        <input
                          id={inputId}
                          type="checkbox"
                          aria-label={`${roleLabel} permission: ${desc.label}`}
                          checked={checked}
                          disabled={busyKey !== null}
                          onChange={() => handleTogglePermission(card.roleKey, desc.key)}
                          className="mt-0.5 h-4 w-4 accent-crimson shrink-0 cursor-pointer"
                        />
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center justify-between gap-2 text-xs font-mono">
                            <span className="text-white font-semibold">{desc.label}</span>
                            <span className={checked ? 'text-emerald-400' : 'text-red-400'}>
                              {checked ? 'Allowed' : 'Removed'}
                            </span>
                          </div>
                          <p className="text-[11px] text-mist mt-0.5 leading-relaxed">
                            {desc.description}
                          </p>
                        </div>
                      </label>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    );
  }

  // Mode === 'studio' — Full Website, League & Bulk Command Studio
  return (
    <div className="space-y-8">
      {/* 1. Website Copy, Branding, Background & Section Toggles */}
      <form
        onSubmit={handleSaveSiteForm}
        className="p-6 rounded-xl surface-panel border border-founder/35 space-y-6"
      >
        <div className="flex flex-wrap items-center justify-between gap-4 border-b border-white/10 pb-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <Globe className="w-4 h-4 text-founder" aria-hidden="true" />
              <h2 className="font-display text-lg font-semibold text-white">
                Website Branding, Headlines &amp; Layout Studio
              </h2>
            </div>
            <p className="text-xs font-mono text-fog">
              Edit any title, announcement banner, stadium background, section visibility, or Team of the Week spotlight live across the entire website.
            </p>
          </div>

          <div className="flex items-center gap-2.5">
            <button
              type="button"
              disabled={busyKey !== null}
              onClick={async () => {
                setBusyKey('reset-site');
                try {
                  await onResetSiteConfig();
                } finally {
                  setBusyKey(null);
                }
              }}
              className="px-3.5 py-2 rounded-lg border border-white/15 bg-white/5 hover:bg-white/10 text-xs font-mono text-white flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
            >
              <RotateCcw className="w-3.5 h-3.5" aria-hidden="true" />
              <span>Reset Website Defaults</span>
            </button>
            <button
              type="submit"
              disabled={busyKey !== null}
              className="px-4 py-2 rounded-lg bg-crimson hover:bg-ember text-white text-xs font-medium flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
            >
              <Save className="w-3.5 h-3.5" aria-hidden="true" />
              <span>{busyKey === 'save-site' ? 'Saving...' : 'Save Website Changes'}</span>
            </button>
          </div>
        </div>

        {/* Site-Wide Announcement Banner */}
        <div className="p-4 rounded-xl bg-ink/85 border border-white/10 space-y-3 text-xs font-mono">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <label htmlFor="site-announcement-toggle" className="flex items-center gap-2 text-white font-semibold cursor-pointer">
              <input
                id="site-announcement-toggle"
                type="checkbox"
                checked={draftSite.announcementActive}
                onChange={(e) =>
                  setDraftSite((prev) => ({
                    ...prev,
                    announcementActive: e.target.checked,
                  }))
                }
                className="h-4 w-4 accent-crimson"
              />
              <span>Display Site-Wide Announcement Banner</span>
            </label>
            <span className="text-mist">Appears at the top of every page when active</span>
          </div>
          <div>
            <label htmlFor="site-announcement-text" className="sr-only">
              Announcement Banner Text
            </label>
            <input
              id="site-announcement-text"
              type="text"
              value={draftSite.announcementBanner}
              onChange={(e) =>
                setDraftSite((prev) => ({
                  ...prev,
                  announcementBanner: e.target.value,
                }))
              }
              placeholder="e.g. Official Season 1 Transfer Window Opens Friday at 8 PM EST!"
              className="w-full bg-panel border border-white/15 focus:border-founder rounded-lg p-2.5 text-white outline-none"
            />
          </div>
        </div>

        {/* Core Branding & Hero Inputs */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs font-mono">
          <div>
            <label htmlFor="site-brand-name" className="block text-fog mb-1">
              Navbar Brand Title
            </label>
            <input
              id="site-brand-name"
              type="text"
              value={draftSite.brandName}
              onChange={(e) =>
                setDraftSite((prev) => ({ ...prev, brandName: e.target.value }))
              }
              className="w-full bg-ink border border-white/15 focus:border-founder rounded-lg p-2.5 text-white outline-none"
            />
          </div>

          <div>
            <label htmlFor="site-hero-eyebrow" className="block text-fog mb-1">
              Hero Eyebrow Label
            </label>
            <input
              id="site-hero-eyebrow"
              type="text"
              value={draftSite.heroEyebrow}
              onChange={(e) =>
                setDraftSite((prev) => ({ ...prev, heroEyebrow: e.target.value }))
              }
              className="w-full bg-ink border border-white/15 focus:border-founder rounded-lg p-2.5 text-white outline-none"
            />
          </div>

          <div className="md:col-span-2">
            <label htmlFor="site-hero-headline" className="block text-fog mb-1">
              Hero Main Headline
            </label>
            <input
              id="site-hero-headline"
              type="text"
              value={draftSite.heroHeadline}
              onChange={(e) =>
                setDraftSite((prev) => ({ ...prev, heroHeadline: e.target.value }))
              }
              className="w-full bg-ink border border-white/15 focus:border-founder rounded-lg p-2.5 text-white outline-none"
            />
          </div>

          <div>
            <label htmlFor="site-bg-url" className="block text-fog mb-1">
              Website Background Image URL
            </label>
            <input
              id="site-bg-url"
              type="text"
              value={draftSite.backgroundImageUrl}
              onChange={(e) =>
                setDraftSite((prev) => ({ ...prev, backgroundImageUrl: e.target.value }))
              }
              className="w-full bg-ink border border-white/15 focus:border-founder rounded-lg p-2.5 text-white outline-none"
            />
          </div>

          <div>
            <label htmlFor="site-bg-blur" className="block text-fog mb-1">
              Background Blur Intensity
            </label>
            <select
              id="site-bg-blur"
              value={draftSite.backgroundBlurPx}
              onChange={(e) =>
                setDraftSite((prev) => ({
                  ...prev,
                  backgroundBlurPx: Number(e.target.value) as 0 | 2 | 5 | 8 | 12,
                }))
              }
              className="w-full bg-ink border border-white/15 focus:border-founder rounded-lg p-2.5 text-white outline-none"
            >
              <option value={0}>Crystal Sharp (0px Blur)</option>
              <option value={2}>Subtle Softness (2px Blur)</option>
              <option value={5}>Balanced Stadium Depth (5px Blur · Default)</option>
              <option value={8}>Soft Atmospheric (8px Blur)</option>
              <option value={12}>Deep Cinematic (12px Blur)</option>
            </select>
          </div>

          <div>
            <label htmlFor="site-founders-title" className="block text-fog mb-1">
              Founders Section Heading
            </label>
            <input
              id="site-founders-title"
              type="text"
              value={draftSite.foundersSectionTitle}
              onChange={(e) =>
                setDraftSite((prev) => ({
                  ...prev,
                  foundersSectionTitle: e.target.value,
                }))
              }
              className="w-full bg-ink border border-white/15 focus:border-founder rounded-lg p-2.5 text-white outline-none"
            />
          </div>

          <div>
            <label htmlFor="site-footer-title" className="block text-fog mb-1">
              Footer Organization Title
            </label>
            <input
              id="site-footer-title"
              type="text"
              value={draftSite.footerTitle}
              onChange={(e) =>
                setDraftSite((prev) => ({ ...prev, footerTitle: e.target.value }))
              }
              className="w-full bg-ink border border-white/15 focus:border-founder rounded-lg p-2.5 text-white outline-none"
            />
          </div>

          <div className="md:col-span-2">
            <label htmlFor="site-footer-copy" className="block text-fog mb-1">
              Footer Copyright Line
            </label>
            <input
              id="site-footer-copy"
              type="text"
              value={draftSite.footerCopyright}
              onChange={(e) =>
                setDraftSite((prev) => ({ ...prev, footerCopyright: e.target.value }))
              }
              className="w-full bg-ink border border-white/15 focus:border-founder rounded-lg p-2.5 text-white outline-none"
            />
          </div>
        </div>

        {/* Homepage Section Visibility Toggles */}
        <div className="pt-3 border-t border-white/10 space-y-2.5 text-xs font-mono">
          <p className="text-fog font-semibold">Homepage Section Visibility</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            <label className="p-3 rounded-lg bg-ink/80 border border-white/10 flex items-center gap-2.5 cursor-pointer">
              <input
                type="checkbox"
                checked={draftSite.showMarquee}
                onChange={(e) =>
                  setDraftSite((prev) => ({ ...prev, showMarquee: e.target.checked }))
                }
                className="h-4 w-4 accent-crimson"
              />
              <span className="text-white">Show Athlete Marquee</span>
            </label>
            <label className="p-3 rounded-lg bg-ink/80 border border-white/10 flex items-center gap-2.5 cursor-pointer">
              <input
                type="checkbox"
                checked={draftSite.showStandingsOnHome}
                onChange={(e) =>
                  setDraftSite((prev) => ({
                    ...prev,
                    showStandingsOnHome: e.target.checked,
                  }))
                }
                className="h-4 w-4 accent-crimson"
              />
              <span className="text-white">Show Standings on Home</span>
            </label>
            <label className="p-3 rounded-lg bg-ink/80 border border-white/10 flex items-center gap-2.5 cursor-pointer">
              <input
                type="checkbox"
                checked={draftSite.showFoundersOnHome}
                onChange={(e) =>
                  setDraftSite((prev) => ({
                    ...prev,
                    showFoundersOnHome: e.target.checked,
                  }))
                }
                className="h-4 w-4 accent-crimson"
              />
              <span className="text-white">Show Founders on Home</span>
            </label>
            <label className="p-3 rounded-lg bg-ink/80 border border-white/10 flex items-center gap-2.5 cursor-pointer">
              <input
                type="checkbox"
                checked={draftSite.showTotwOnHome}
                onChange={(e) =>
                  setDraftSite((prev) => ({
                    ...prev,
                    showTotwOnHome: e.target.checked,
                  }))
                }
                className="h-4 w-4 accent-crimson"
              />
              <span className="text-white">Show Team of the Week</span>
            </label>
          </div>
        </div>

        {/* Team of the Week Spotlight Customizer */}
        <div className="pt-4 border-t border-white/10 space-y-4 text-xs font-mono">
          <div className="flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-gold" aria-hidden="true" />
            <h3 className="font-display text-base font-semibold text-white">
              Team of the Week Spotlight Content
            </h3>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
            <div>
              <label htmlFor="totw-club-name" className="block text-fog mb-1">
                Spotlight Club Name
              </label>
              <input
                id="totw-club-name"
                type="text"
                value={draftSite.totwClubName}
                onChange={(e) =>
                  setDraftSite((prev) => ({ ...prev, totwClubName: e.target.value }))
                }
                className="w-full bg-ink border border-white/15 focus:border-gold rounded-lg p-2.5 text-white outline-none"
              />
            </div>

            <div>
              <label htmlFor="totw-player-user" className="block text-fog mb-1">
                Spotlight Athlete Username (without @)
              </label>
              <input
                id="totw-player-user"
                type="text"
                value={draftSite.totwPlayerUsername}
                onChange={(e) =>
                  setDraftSite((prev) => ({
                    ...prev,
                    totwPlayerUsername: e.target.value,
                  }))
                }
                className="w-full bg-ink border border-white/15 focus:border-gold rounded-lg p-2.5 text-white outline-none"
              />
            </div>

            <div>
              <label htmlFor="totw-hero-url" className="block text-fog mb-1">
                Spotlight Poster Image URL
              </label>
              <input
                id="totw-hero-url"
                type="text"
                value={draftSite.totwHeroImageUrl}
                onChange={(e) =>
                  setDraftSite((prev) => ({ ...prev, totwHeroImageUrl: e.target.value }))
                }
                className="w-full bg-ink border border-white/15 focus:border-gold rounded-lg p-2.5 text-white outline-none"
              />
            </div>

            <div>
              <label htmlFor="totw-crest-url" className="block text-fog mb-1">
                Spotlight Club Crest URL
              </label>
              <input
                id="totw-crest-url"
                type="text"
                value={draftSite.totwCrestImageUrl}
                onChange={(e) =>
                  setDraftSite((prev) => ({ ...prev, totwCrestImageUrl: e.target.value }))
                }
                className="w-full bg-ink border border-white/15 focus:border-gold rounded-lg p-2.5 text-white outline-none"
              />
            </div>

            <div className="md:col-span-2">
              <label htmlFor="totw-p1" className="block text-fog mb-1">
                Spotlight Lead Paragraph
              </label>
              <textarea
                id="totw-p1"
                rows={2}
                value={draftSite.totwHeadlineParagraph}
                onChange={(e) =>
                  setDraftSite((prev) => ({
                    ...prev,
                    totwHeadlineParagraph: e.target.value,
                  }))
                }
                className="w-full bg-ink border border-white/15 focus:border-gold rounded-lg p-2.5 text-white outline-none resize-none"
              />
            </div>

            <div className="md:col-span-2">
              <label htmlFor="totw-p2" className="block text-fog mb-1">
                Spotlight Body Paragraph
              </label>
              <textarea
                id="totw-p2"
                rows={2}
                value={draftSite.totwBodyParagraph}
                onChange={(e) =>
                  setDraftSite((prev) => ({
                    ...prev,
                    totwBodyParagraph: e.target.value,
                  }))
                }
                className="w-full bg-ink border border-white/15 focus:border-gold rounded-lg p-2.5 text-white outline-none resize-none"
              />
            </div>

            <div className="md:col-span-2">
              <label htmlFor="totw-p3" className="block text-fog mb-1">
                Spotlight Closing Line
              </label>
              <input
                id="totw-p3"
                type="text"
                value={draftSite.totwClosingParagraph}
                onChange={(e) =>
                  setDraftSite((prev) => ({
                    ...prev,
                    totwClosingParagraph: e.target.value,
                  }))
                }
                className="w-full bg-ink border border-white/15 focus:border-gold rounded-lg p-2.5 text-white outline-none"
              />
            </div>
          </div>
        </div>
      </form>

      {/* 2. League & Club Identity Editor */}
      <form
        onSubmit={handleSaveLeagueForm}
        className="p-6 rounded-xl surface-panel border border-white/15 space-y-5"
      >
        <div className="flex flex-wrap items-center justify-between gap-4 border-b border-white/10 pb-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <Trophy className="w-4 h-4 text-gold" aria-hidden="true" />
              <h2 className="font-display text-lg font-semibold text-white">
                League Division &amp; Club Identity Editor
              </h2>
            </div>
            <p className="text-xs font-mono text-fog">
              Rename any RFF² division or club, change short codes, or swap league/club crest image URLs. Assigned players automatically sync to renamed clubs.
            </p>
          </div>

          <div className="flex items-center gap-2.5">
            <label htmlFor="founder-league-select" className="sr-only">
              Select League Division to Customize
            </label>
            <select
              id="founder-league-select"
              value={selectedLeagueId}
              onChange={(e) => setSelectedLeagueId(e.target.value as LeagueId)}
              className="bg-ink border border-white/15 rounded-lg px-3 py-2 text-xs font-mono text-white outline-none"
            >
              {leagues.map((l) => (
                <option key={l.id} value={l.id}>
                  {l.name}
                </option>
              ))}
            </select>

            <button
              type="submit"
              disabled={busyKey !== null}
              className="px-4 py-2 rounded-lg bg-crimson hover:bg-ember text-white text-xs font-medium flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
            >
              <Save className="w-3.5 h-3.5" aria-hidden="true" />
              <span>{busyKey === 'save-league' ? 'Saving...' : 'Save Division & Clubs'}</span>
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-3.5 text-xs font-mono">
          <div>
            <label htmlFor="founder-league-name" className="block text-fog mb-1">
              Division Name
            </label>
            <input
              id="founder-league-name"
              type="text"
              value={leagueNameDraft}
              onChange={(e) => setLeagueNameDraft(e.target.value)}
              className="w-full bg-ink border border-white/15 rounded-lg p-2.5 text-white outline-none"
            />
          </div>
          <div>
            <label htmlFor="founder-league-region" className="block text-fog mb-1">
              Region Subtitle
            </label>
            <input
              id="founder-league-region"
              type="text"
              value={leagueRegionDraft}
              onChange={(e) => setLeagueRegionDraft(e.target.value)}
              className="w-full bg-ink border border-white/15 rounded-lg p-2.5 text-white outline-none"
            />
          </div>
          <div>
            <label htmlFor="founder-league-logo" className="block text-fog mb-1">
              Division Emblem URL
            </label>
            <input
              id="founder-league-logo"
              type="text"
              value={leagueLogoDraft}
              onChange={(e) => setLeagueLogoDraft(e.target.value)}
              className="w-full bg-ink border border-white/15 rounded-lg p-2.5 text-white outline-none"
            />
          </div>
        </div>

        <div className="space-y-2.5 pt-2 border-t border-white/10">
          <p className="text-xs font-mono text-mist">
            Clubs in {leagueNameDraft} ({clubDrafts.length})
          </p>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-3 text-xs font-mono">
            {clubDrafts.map((club, idx) => (
              <div
                key={club.id}
                className="p-3 rounded-xl bg-ink/80 border border-white/10 grid grid-cols-12 gap-2 items-center"
              >
                <div className="col-span-5">
                  <label htmlFor={`club-name-${club.id}`} className="sr-only">
                    Club Name
                  </label>
                  <input
                    id={`club-name-${club.id}`}
                    type="text"
                    value={club.name}
                    onChange={(e) =>
                      setClubDrafts((prev) =>
                        prev.map((c, i) =>
                          i === idx ? { ...c, name: e.target.value } : c
                        )
                      )
                    }
                    className="w-full bg-panel border border-white/15 rounded-lg px-2.5 py-1.5 text-white outline-none"
                  />
                </div>
                <div className="col-span-2">
                  <label htmlFor={`club-code-${club.id}`} className="sr-only">
                    Short Code
                  </label>
                  <input
                    id={`club-code-${club.id}`}
                    type="text"
                    maxLength={5}
                    value={club.shortCode}
                    onChange={(e) =>
                      setClubDrafts((prev) =>
                        prev.map((c, i) =>
                          i === idx
                            ? { ...c, shortCode: e.target.value.toUpperCase() }
                            : c
                        )
                      )
                    }
                    className="w-full bg-panel border border-white/15 rounded-lg px-2 py-1.5 text-gold text-center uppercase outline-none"
                  />
                </div>
                <div className="col-span-5">
                  <label htmlFor={`club-logo-${club.id}`} className="sr-only">
                    Club Crest URL
                  </label>
                  <input
                    id={`club-logo-${club.id}`}
                    type="text"
                    value={club.logoUrl}
                    onChange={(e) =>
                      setClubDrafts((prev) =>
                        prev.map((c, i) =>
                          i === idx ? { ...c, logoUrl: e.target.value } : c
                        )
                      )
                    }
                    className="w-full bg-panel border border-white/15 rounded-lg px-2.5 py-1.5 text-fog outline-none"
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
      </form>

      {/* 3. Founder Emergency & Bulk Registry Utilities */}
      <div className="p-6 rounded-xl surface-panel border border-white/15 space-y-4">
        <div>
          <h2 className="font-display text-lg font-semibold text-white">
            Founder Federation-Wide Bulk Commands
          </h2>
          <p className="text-xs font-mono text-mist mt-0.5">
            Execute instant registry-wide resets or clear discipline flags across all 357+ records. Click once to arm, then confirm.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3 text-xs font-mono">
          {(
            [
              {
                id: 'reset-all-standings',
                label: 'Reset All 4 Leagues to 0 PTS',
                style: 'border-amber-500/40 text-amber-300 hover:bg-amber-500/15',
              },
              {
                id: 'reset-all-player-stats',
                label: 'Reset All Athlete Stats (0G / 0A)',
                style: 'border-amber-500/40 text-amber-300 hover:bg-amber-500/15',
              },
              {
                id: 'clear-all-suspensions',
                label: 'Clear All Suspensions',
                style: 'border-emerald-500/40 text-emerald-300 hover:bg-emerald-500/15',
              },
              {
                id: 'clear-all-bans',
                label: 'Clear All Bans',
                style: 'border-emerald-500/40 text-emerald-300 hover:bg-emerald-500/15',
              },
              {
                id: 'restore-default-leagues',
                label: 'Restore Default League & Club Names',
                style: 'border-white/20 text-fog hover:text-white hover:bg-white/10',
              },
            ] as const
          ).map((btn) => {
            const armed = confirmingAction === btn.id;
            return (
              <div key={btn.id} className="inline-flex items-center gap-1.5">
                <button
                  type="button"
                  disabled={busyKey !== null}
                  onClick={async () => {
                    if (!armed) {
                      setConfirmingAction(btn.id);
                      return;
                    }
                    setBusyKey(btn.id);
                    setConfirmingAction(null);
                    try {
                      await onBulkFounderAction(btn.id);
                    } finally {
                      setBusyKey(null);
                    }
                  }}
                  className={`px-3.5 py-2 rounded-lg border transition-colors cursor-pointer disabled:opacity-50 ${
                    armed
                      ? 'bg-crimson border-crimson text-white font-semibold'
                      : btn.style
                  }`}
                >
                  {armed ? `Confirm: ${btn.label}` : btn.label}
                </button>
                {armed && (
                  <button
                    type="button"
                    onClick={() => setConfirmingAction(null)}
                    className="px-2 py-2 text-mist hover:text-white cursor-pointer"
                  >
                    Cancel
                  </button>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
