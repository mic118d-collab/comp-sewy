import { useEffect, useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import {
  AlertTriangle,
  Ban,
  Check,
  Copy,
  Edit3,
  ExternalLink,
  X,
} from 'lucide-react';
import type {
  LeagueDivision,
  PlayerRecord,
  RobloxProfileDetails,
  StaffAccessPolicy,
  StaffSession,
} from '../lib/types';
import {
  DEFAULT_STAFF_ACCESS_POLICY,
  canBanEntity,
  canEditPlayerStats,
  canSuspendPlayer,
  getSkillRankInfo,
} from '../lib/hierarchy';
import { AvatarImage } from './AvatarImage';
import { TeamRoleBadge } from './TeamRoleBadge';

interface RobloxProfileModalProps {
  player: PlayerRecord | null;
  session: StaffSession;
  staffPolicy?: StaffAccessPolicy;
  leagues?: LeagueDivision[];
  onClose: () => void;
  onEditPlayer: (player: PlayerRecord) => void;
  onDisciplineAction: (
    player: PlayerRecord,
    action: 'suspend' | 'unsuspend' | 'ban' | 'unban'
  ) => Promise<void>;
  onProfileResolved?: (details: RobloxProfileDetails) => void;
}

export function RobloxProfileModal({
  player,
  session,
  staffPolicy = DEFAULT_STAFF_ACCESS_POLICY,
  leagues,
  onClose,
  onEditPlayer,
  onDisciplineAction,
  onProfileResolved,
}: RobloxProfileModalProps) {
  const [profile, setProfile] = useState<RobloxProfileDetails | null>(null);
  const [loadingProfile, setLoadingProfile] = useState(false);
  const [copiedId, setCopiedId] = useState(false);
  const [fullBodyFailed, setFullBodyFailed] = useState(false);

  useEffect(() => {
    if (!player) {
      setProfile(null);
      setFullBodyFailed(false);
      return;
    }

    let cancelled = false;
    setLoadingProfile(true);
    setFullBodyFailed(false);

    fetch(`/api/roblox/profile/${player.id}`)
      .then((res) => (res.ok ? res.json() : null))
      .then((data: RobloxProfileDetails | null) => {
        if (!cancelled && data) {
          setProfile(data);
          onProfileResolved?.(data);
        }
      })
      .catch(() => {
        // Keep graceful local fallback
      })
      .finally(() => {
        if (!cancelled) setLoadingProfile(false);
      });

    return () => {
      cancelled = true;
    };
  }, [player, onProfileResolved]);

  useEffect(() => {
    if (!player) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [player, onClose]);

  const displayRobloxId = profile?.robloxId ?? player?.robloxId ?? null;
  const headshotSrc = profile?.headshotUrl || player?.avatarUrl || '';
  const fullBodySrc = profile?.fullBodyUrl || headshotSrc;

  const handleCopyId = async () => {
    if (!displayRobloxId) return;
    try {
      await navigator.clipboard.writeText(String(displayRobloxId));
      setCopiedId(true);
      setTimeout(() => setCopiedId(false), 1800);
    } catch {
      // Clipboard fallback ignored
    }
  };

  const formattedJoinDate = profile?.created
    ? new Date(profile.created).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
      })
    : 'Registry On-Record';

  return (
    <AnimatePresence>
      {player && (
        <motion.div
          key="roblox-popup-backdrop"
          role="dialog"
          aria-modal="true"
          aria-labelledby="roblox-profile-modal-title"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.18 }}
          className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4 sm:p-6"
          onClick={(e) => {
            if (e.target === e.currentTarget) onClose();
          }}
        >
          <motion.div
            key={`player-popup-${player.id}`}
            initial={{ opacity: 0, scale: 0.9, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.94, y: 12 }}
            transition={{ type: 'spring', stiffness: 380, damping: 28 }}
            className={`relative w-full max-w-3xl max-h-[88vh] overflow-y-auto rounded-2xl surface-modal border shadow-2xl p-6 sm:p-7 space-y-6 ${
              player.isFounder || player.tier === 'S'
                ? 'border-founder/45'
                : player.tier === 'A'
                  ? 'border-crimson/45'
                  : player.tier === 'B'
                    ? 'border-emerald-500/40'
                    : 'border-white/20'
            }`}
          >
            {/* Subtle Ambient Rank Aura */}
            <div
              aria-hidden="true"
              className={`pointer-events-none absolute inset-x-0 top-0 h-32 rounded-t-2xl opacity-30 ${
                player.isFounder || player.tier === 'S'
                  ? 'bg-gradient-to-b from-founder/40 to-transparent'
                  : player.tier === 'A'
                    ? 'bg-gradient-to-b from-crimson/40 to-transparent'
                    : player.tier === 'B'
                      ? 'bg-gradient-to-b from-emerald-500/35 to-transparent'
                      : 'bg-gradient-to-b from-blue-500/25 to-transparent'
              }`}
            />

            {/* Top Header */}
            <div className="relative z-10 flex items-center justify-between border-b border-white/10 pb-3.5">
              <span className="text-xs font-mono text-fog">
                Full Roblox Profile &amp; RFF² Skill Dossier
              </span>
              <button
                type="button"
                aria-label="Close profile modal"
                onClick={onClose}
                className="h-8 w-8 rounded-lg border border-white/15 text-fog hover:text-white hover:border-white/35 flex items-center justify-center transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Identity Row */}
            {(() => {
              const skillInfo = getSkillRankInfo(player.isFounder ? 'S' : player.tier);
              const statRows = [
                { label: 'Pace (PAC)', value: player.pace },
                { label: 'Shooting (SHO)', value: player.shooting },
                { label: 'Passing (PAS)', value: player.passing },
                { label: 'Dribbling (DRI)', value: player.dribbling },
                { label: 'Defending (DEF)', value: player.defending },
                { label: 'Physical (PHY)', value: player.physical },
              ];

              return (
                <div className="relative z-10 space-y-6">
                  <div className="flex flex-wrap items-start justify-between gap-4">
                    <div className="flex items-start gap-4 min-w-0">
                      <AvatarImage
                        src={headshotSrc}
                        username={player.username}
                        isFounder={player.isFounder}
                        sizeClass="h-18 w-18 sm:h-20 sm:w-20 rounded-2xl"
                        textClass="text-2xl"
                      />
                      <div className="min-w-0">
                        <h2
                          id="roblox-profile-modal-title"
                          className="font-display text-2xl sm:text-3xl font-semibold text-white truncate"
                        >
                          {profile?.displayName || player.displayName || player.username}
                        </h2>
                        <p className="text-sm font-mono text-fog truncate" data-testid="profile-position-line">
                          @{profile?.username || player.username} · Position: {player.position}
                        </p>
                        <div className="mt-1.5" data-testid="profile-team-role">
                          <TeamRoleBadge clubName={player.club} leagues={leagues} showLeague size="md" />
                        </div>

                        {/* Clean Unboxed Skill Rank & Preferred Foot Metadata */}
                        <div className="mt-2 flex flex-wrap items-center gap-2 text-xs font-mono">
                          <span className={`${skillInfo.textClass} font-semibold`}>
                            {player.isFounder
                              ? 'Founder · S Rank (Very Good)'
                              : `${skillInfo.label} (${skillInfo.quality})`}
                          </span>
                          <span className="text-mist" aria-hidden="true">
                            ·
                          </span>
                          <span className="text-gold font-semibold tabular-nums">
                            OVR {player.rating}
                          </span>
                          <span className="text-mist" aria-hidden="true">
                            ·
                          </span>
                          <span className="text-fog" data-testid="profile-preferred-foot">
                            Preferred Foot: <strong className="text-white font-semibold">{player.foot}</strong>
                          </span>
                        </div>

                        {player.banned && (
                          <div className="mt-2 flex items-center gap-1.5 text-xs font-mono text-red-400">
                            <Ban className="w-3.5 h-3.5" aria-hidden="true" />
                            <span>BANNED{player.banReason ? ` — ${player.banReason}` : ''}</span>
                          </div>
                        )}
                        {!player.banned && player.suspended && (
                          <div className="mt-2 flex items-center gap-1.5 text-xs font-mono text-amber-400">
                            <AlertTriangle className="w-3.5 h-3.5" aria-hidden="true" />
                            <span>SUSPENDED FROM FIXTURES</span>
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="text-right hidden sm:block">
                      <div
                        className={`font-display text-4xl font-semibold leading-none tabular-nums ${skillInfo.textClass}`}
                      >
                        {player.rating}
                      </div>
                      <div className="text-xs font-mono text-fog mt-1">
                        {skillInfo.fullLabel}
                      </div>
                    </div>
                  </div>

                  {/* Two-Column Body: Left = Live 3D Roblox Avatar & Account, Right = Stats & Contract */}
                  <div className="grid grid-cols-1 md:grid-cols-12 gap-5 items-stretch">
                    {/* Left Column: Roblox 3D Character & Account Info */}
                    <div className="md:col-span-5 p-4 rounded-xl bg-ink/85 border border-white/10 flex flex-col justify-between gap-4">
                      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-white/10 pb-3">
                        <div>
                          <p className="text-[11px] font-mono text-mist">Roblox User ID</p>
                          <div className="flex items-center gap-2 mt-0.5">
                            <span
                              data-testid="profile-roblox-id"
                              className="font-mono text-sm font-semibold text-white tabular-nums"
                            >
                              {displayRobloxId ?? 'Loading...'}
                            </span>
                            {displayRobloxId && (
                              <button
                                type="button"
                                onClick={handleCopyId}
                                aria-label="Copy Roblox ID"
                                className="px-2 py-0.5 rounded border border-white/15 hover:border-white/35 text-[11px] font-mono text-fog hover:text-white flex items-center gap-1 cursor-pointer"
                              >
                                {copiedId ? (
                                  <>
                                    <Check className="w-3 h-3 text-emerald-400" />
                                    <span className="text-emerald-400">Copied</span>
                                  </>
                                ) : (
                                  <>
                                    <Copy className="w-3 h-3" />
                                    <span>Copy</span>
                                  </>
                                )}
                              </button>
                            )}
                          </div>
                        </div>

                        {profile?.profileUrl && (
                          <a
                            href={profile.profileUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="px-2.5 py-1.5 rounded-lg bg-white/10 hover:bg-crimson text-white text-xs font-medium transition-colors flex items-center gap-1.5 whitespace-nowrap"
                          >
                            <span>Roblox</span>
                            <ExternalLink className="w-3.5 h-3.5" aria-hidden="true" />
                          </a>
                        )}
                      </div>

                      {loadingProfile ? (
                        <div className="space-y-3 animate-pulse">
                          <div className="h-48 rounded-xl bg-white/5" />
                          <div className="h-12 rounded-lg bg-white/5" />
                        </div>
                      ) : (
                        <>
                          <div className="h-52 rounded-xl bg-gradient-to-b from-white/5 to-ink border border-white/10 flex items-center justify-center overflow-hidden p-3">
                            {fullBodySrc && !fullBodyFailed ? (
                              <motion.img
                                initial={{ opacity: 0, scale: 0.92 }}
                                animate={{ opacity: 1, scale: 1 }}
                                transition={{ duration: 0.3 }}
                                src={fullBodySrc}
                                alt={`${player.username} full Roblox character avatar`}
                                referrerPolicy="no-referrer"
                                onError={() => setFullBodyFailed(true)}
                                className="h-full w-full object-contain drop-shadow-xl"
                              />
                            ) : (
                              <AvatarImage
                                src={headshotSrc}
                                username={player.username}
                                isFounder={player.isFounder}
                                sizeClass="h-24 w-24 rounded-2xl"
                                textClass="text-3xl"
                              />
                            )}
                          </div>

                          <div className="space-y-2.5 text-xs">
                            <div className="grid grid-cols-3 gap-2 pb-2.5 border-b border-white/10 font-mono tabular-nums text-center">
                              <div>
                                <p className="text-mist text-[10px]">Friends</p>
                                <p className="text-white font-semibold">
                                  {(profile?.friendsCount ?? 0).toLocaleString()}
                                </p>
                              </div>
                              <div>
                                <p className="text-mist text-[10px]">Followers</p>
                                <p className="text-white font-semibold">
                                  {(profile?.followersCount ?? 0).toLocaleString()}
                                </p>
                              </div>
                              <div>
                                <p className="text-mist text-[10px]">Following</p>
                                <p className="text-white font-semibold">
                                  {(profile?.followingCount ?? 0).toLocaleString()}
                                </p>
                              </div>
                            </div>

                            <div className="flex items-center justify-between font-mono text-[11px]">
                              <span className="text-mist">Joined Roblox</span>
                              <span className="text-white tabular-nums">{formattedJoinDate}</span>
                            </div>

                            <div>
                              <p className="font-mono text-[10px] text-mist mb-0.5">Roblox Bio</p>
                              <p className="text-fog leading-relaxed line-clamp-2 break-words">
                                {profile?.description || 'Registered RFF² Federation Athlete.'}
                              </p>
                            </div>
                          </div>
                        </>
                      )}
                    </div>

                    {/* Right Column: Pre-Season Stats & Animated Technical Attributes */}
                    <div className="md:col-span-7 flex flex-col justify-between gap-4">
                      {/* Pre-Season Match, Position, Preferred Foot & Contract Grid */}
                      <div className="grid grid-cols-2 gap-3.5 p-4 rounded-xl bg-ink/85 border border-white/10 tabular-nums">
                        <div>
                          <p className="font-mono text-[10px] text-mist">Position</p>
                          <p className="font-display text-lg font-semibold text-white">
                            {player.position}
                          </p>
                        </div>
                        <div>
                          <p className="font-mono text-[10px] text-mist">Preferred Foot</p>
                          <p className="font-display text-lg font-semibold text-white">
                            {player.foot}
                          </p>
                        </div>
                        <div className="pt-2 border-t border-white/5">
                          <p className="font-mono text-[10px] text-mist">Appearances</p>
                          <p className="font-display text-lg font-semibold text-white">
                            {player.appearances}
                          </p>
                        </div>
                        <div className="pt-2 border-t border-white/5">
                          <p className="font-mono text-[10px] text-mist">Goals / Assists</p>
                          <p className="font-display text-lg font-semibold text-white">
                            {player.goals}G · {player.assists}A
                          </p>
                        </div>
                        <div className="pt-2 border-t border-white/5">
                          <p className="font-mono text-[10px] text-mist">Weekly Wage</p>
                          <p className="font-display text-lg font-semibold text-gold truncate">
                            ${player.wage.toLocaleString()}/wk
                          </p>
                        </div>
                        <div className="pt-2 border-t border-white/5">
                          <p className="font-mono text-[10px] text-mist">Release Clause</p>
                          <p className="font-display text-lg font-semibold text-ember truncate">
                            ${player.releaseClause.toLocaleString()}
                          </p>
                        </div>
                      </div>

                      {/* Animated Compositor-Only Attribute Bars */}
                      <div className="p-4 rounded-xl bg-ink/85 border border-white/10 space-y-2.5">
                        <div className="flex items-center justify-between">
                          <p className="font-mono text-xs text-mist">Technical Attributes</p>
                          <span className={`font-mono text-xs ${skillInfo.textClass}`}>
                            {skillInfo.fullLabel}
                          </span>
                        </div>
                        {statRows.map((row, idx) => (
                          <div key={row.label}>
                            <div className="flex justify-between font-mono text-xs mb-1 tabular-nums">
                              <span className="text-fog">{row.label}</span>
                              <span className="text-white font-semibold">{row.value}</span>
                            </div>
                            <div className="h-1.5 w-full bg-white/10 rounded-full overflow-hidden">
                              <motion.div
                                initial={{ scaleX: 0 }}
                                animate={{ scaleX: Math.min(1, row.value / 100) }}
                                transition={{
                                  duration: 0.45,
                                  delay: 0.04 * idx,
                                  ease: [0.16, 1, 0.3, 1],
                                }}
                                className={`h-full w-full origin-left ${
                                  player.isFounder || player.tier === 'S'
                                    ? 'bg-founder'
                                    : player.tier === 'A'
                                      ? 'bg-ember'
                                      : player.tier === 'B'
                                        ? 'bg-emerald-400'
                                        : 'bg-crimson'
                                }`}
                              />
                            </div>
                          </div>
                        ))}
                      </div>

                      {/* Scouting Report */}
                      <div className="p-4 rounded-xl bg-ink/85 border border-white/10 space-y-2">
                        <p className="font-mono text-xs text-mist">Federation Scouting Report</p>
                        <p className="text-xs text-fog leading-relaxed">{player.scoutingReport}</p>
                      </div>
                    </div>
                  </div>

                  {/* Footer Actions */}
                  <div className="pt-3 border-t border-white/10 flex flex-wrap items-center justify-between gap-2">
                    <div className="flex flex-wrap items-center gap-2">
                      {canEditPlayerStats(session.role, staffPolicy) && (
                        <button
                          type="button"
                          onClick={() => onEditPlayer(player)}
                          className="px-3.5 py-2 rounded-lg bg-white/10 hover:bg-white/20 text-white text-xs font-medium flex items-center gap-1.5 cursor-pointer"
                        >
                          <Edit3 className="w-3.5 h-3.5" aria-hidden="true" />
                          <span>Edit Stats &amp; Rank</span>
                        </button>
                      )}
                      {canSuspendPlayer(session.role, staffPolicy) &&
                        (!player.isFounder || session.role === 'founder') && (
                          <button
                            type="button"
                            onClick={() =>
                              onDisciplineAction(player, player.suspended ? 'unsuspend' : 'suspend')
                            }
                            className="px-3.5 py-2 rounded-lg border border-amber-500/40 text-amber-300 hover:bg-amber-500/15 text-xs font-medium cursor-pointer"
                          >
                            {player.suspended ? 'Lift Suspension' : 'Suspend'}
                          </button>
                        )}
                      {canBanEntity(session.role, staffPolicy) &&
                        (!player.isFounder || session.role === 'founder') && (
                          <button
                            type="button"
                            onClick={() =>
                              onDisciplineAction(player, player.banned ? 'unban' : 'ban')
                            }
                            className="px-3.5 py-2 rounded-lg border border-red-500/40 text-red-400 hover:bg-red-500/15 text-xs font-medium cursor-pointer"
                          >
                            {player.banned ? 'Unban' : 'Ban'}
                          </button>
                        )}
                    </div>

                    <button
                      type="button"
                      onClick={onClose}
                      className="px-5 py-2 rounded-lg bg-crimson hover:bg-ember text-white text-xs font-medium transition-colors cursor-pointer ml-auto"
                    >
                      Close
                    </button>
                  </div>
                </div>
              );
            })()}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
