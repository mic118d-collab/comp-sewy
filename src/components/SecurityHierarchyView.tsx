import { useMemo, useState } from 'react';
import { motion } from 'motion/react';
import { Lock, Plus, Trash2, UserX } from 'lucide-react';
import type {
  HierarchyAccount,
  PlayerRecord,
  SecurityRank,
  StaffAccessPolicy,
  StaffSession,
} from '../lib/types';
import {
  DEFAULT_STAFF_ACCESS_POLICY,
  SECURITY_HIERARCHY_LEVELS,
  canManageHierarchy,
  getSkillRankInfo,
} from '../lib/hierarchy';
import { AvatarImage } from './AvatarImage';

interface SecurityHierarchyViewProps {
  players: PlayerRecord[];
  founders: PlayerRecord[];
  dClassCount: number;
  hierarchy: HierarchyAccount[];
  session: StaffSession;
  staffPolicy?: StaffAccessPolicy;
  onSelectPlayer: (player: PlayerRecord) => void;
  onUpdateHierarchy: (
    accountId: number,
    patch: Partial<Pick<HierarchyAccount, 'securityRank' | 'banned' | 'suspended' | 'kicked'>>
  ) => Promise<void>;
  onAddHierarchyAccount: (username: string, rank: SecurityRank) => Promise<void>;
  onDeleteHierarchyAccount?: (accountId: number) => Promise<void>;
  onOpenAdminLogin: () => void;
}

export function SecurityHierarchyView({
  players,
  founders,
  dClassCount,
  hierarchy,
  session,
  staffPolicy = DEFAULT_STAFF_ACCESS_POLICY,
  onSelectPlayer,
  onUpdateHierarchy,
  onAddHierarchyAccount,
  onDeleteHierarchyAccount,
  onOpenAdminLogin,
}: SecurityHierarchyViewProps) {
  const isAdmin = session.authenticated && canManageHierarchy(session.role, staffPolicy);
  const isFounder = session.authenticated && session.role === 'founder';
  const [newUsername, setNewUsername] = useState('');
  const [newRank, setNewRank] = useState<SecurityRank>('D');
  const [submitting, setSubmitting] = useState(false);

  const tierCounts = useMemo(
    () => ({
      S: players.filter((p) => p.isFounder || p.tier === 'S').length,
      A: players.filter((p) => !p.isFounder && p.tier === 'A').length,
      B: players.filter((p) => !p.isFounder && p.tier === 'B').length,
      D: players.filter((p) => !p.isFounder && p.tier === 'D').length,
    }),
    [players]
  );

  const handleAssign = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isAdmin || !newUsername.trim()) return;
    setSubmitting(true);
    try {
      await onAddHierarchyAccount(newUsername.trim(), newRank);
      setNewUsername('');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-10">
      {/* Header */}
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-xs font-mono text-founder tracking-wide">
            RFF² Skill Classification System · How Good You Are
          </p>
          <h1 className="font-display text-3xl sm:text-4xl font-semibold text-white mt-1 tracking-[0.01em]">
            Player Skill Rank System
          </h1>
          <p className="text-sm text-fog mt-2 max-w-2xl">
            Ranks measure pure on-pitch football quality rather than staff permissions: <strong className="text-founder font-medium">S Rank</strong> = Very Good players, <strong className="text-ember font-medium">A Rank</strong> = Good players, <strong className="text-emerald-400 font-medium">B Rank</strong> = Decent players, and <strong className="text-white font-medium">D Rank</strong> = Okay players ({dClassCount} athletes starting Pre-Season).
          </p>
        </div>

        {!isAdmin && (
          <button
            type="button"
            onClick={onOpenAdminLogin}
            className="px-4 py-2.5 rounded-lg border border-white/15 bg-white/5 hover:bg-crimson hover:border-crimson text-white text-xs font-medium flex items-center gap-2 transition-colors cursor-pointer"
          >
            <Lock className="w-3.5 h-3.5" aria-hidden="true" />
            <span>Staff Login to Edit Ranks</span>
          </button>
        )}
      </div>

      {/* 4-Tier Skill Rank Matrix */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {SECURITY_HIERARCHY_LEVELS.map((tier, idx) => {
          const accent =
            tier.rank === 'S'
              ? { border: 'border-founder/45', text: 'text-founder' }
              : tier.rank === 'A'
                ? { border: 'border-crimson/45', text: 'text-ember' }
                : tier.rank === 'B'
                  ? { border: 'border-emerald-500/40', text: 'text-emerald-400' }
                  : { border: 'border-white/15', text: 'text-fog' };

          const count = tierCounts[tier.rank];

          return (
            <motion.div
              key={tier.rank}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3, delay: idx * 0.05 }}
              className={`p-5 rounded-xl surface-panel border flex flex-col justify-between gap-4 ${accent.border}`}
            >
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className={`font-display text-2xl font-semibold ${accent.text}`}>
                    {tier.rank} Rank
                  </span>
                  <span className="text-xs font-mono text-white font-semibold tabular-nums">
                    {tier.qualityLabel}
                  </span>
                </div>
                <div className="flex items-center justify-between text-xs font-mono text-mist tabular-nums">
                  <span>{tier.ratingLabel}</span>
                  <span>{count} {count === 1 ? 'Athlete' : 'Athletes'}</span>
                </div>
                <h2 className="font-display text-base font-semibold text-white tracking-[0.015em]">
                  {tier.title}
                </h2>
                <p className="text-xs text-fog leading-relaxed">{tier.summary}</p>
              </div>

              <ul className="pt-3 border-t border-white/10 space-y-1.5 text-xs text-mist">
                {tier.capabilities.map((cap) => (
                  <li key={cap}>· {cap}</li>
                ))}
              </ul>
            </motion.div>
          );
        })}
      </div>

      {/* Apex S-Rank Showcase */}
      <section aria-labelledby="s-rank-council-heading" className="space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2
            id="s-rank-council-heading"
            className="font-display text-xl font-semibold text-white"
          >
            S Rank · Very Good Players (Founders · OVR 99)
          </h2>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
          {founders.map((f) => (
            <button
              key={f.id}
              type="button"
              onClick={() => onSelectPlayer(f)}
              className="p-4 rounded-xl surface-panel border border-founder/35 hover:border-founder hover:-translate-y-1 transition-[transform,border-color] duration-200 text-left cursor-pointer"
            >
              <div className="flex items-center gap-3">
                <AvatarImage
                  src={f.avatarUrl}
                  username={f.username}
                  isFounder
                  sizeClass="h-11 w-11 rounded-xl"
                />
                <div className="min-w-0">
                  <div className="font-display text-sm font-semibold text-white truncate">
                    {f.username}
                  </div>
                  <div className="text-[11px] font-mono text-founder">
                    S · Very Good (99)
                  </div>
                  <div className="text-[10px] font-mono text-mist tabular-nums truncate">
                    ID {f.robloxId}
                  </div>
                </div>
              </div>
            </button>
          ))}
        </div>
      </section>

      {/* Rank Registry & Admin Controls */}
      <section aria-labelledby="hierarchy-guard-heading" className="space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2
              id="hierarchy-guard-heading"
              className="font-display text-xl font-semibold text-white"
            >
              Rank Registry &amp; Account Status
            </h2>
            <p className="text-xs font-mono text-mist mt-0.5">
              {isAdmin
                ? 'Admin authority active: Update S/A/B/D skill ranks, suspend, or ban accounts.'
                : 'Read-only view: Moderators can edit player skill ranks in the Roster tab; Admins can also manage account discipline here.'}
            </p>
          </div>
        </div>

        {isAdmin && (
          <form
            onSubmit={handleAssign}
            className="p-4 rounded-xl surface-panel border border-white/10 flex flex-wrap items-end gap-3"
          >
            <div className="flex-1 min-w-[220px]">
              <label htmlFor="assign-hierarchy-username" className="block text-xs font-mono text-fog mb-1">
                Roblox Username
              </label>
              <input
                id="assign-hierarchy-username"
                type="text"
                value={newUsername}
                onChange={(e) => setNewUsername(e.target.value)}
                placeholder="Enter Roblox username..."
                className="w-full bg-ink border border-white/15 focus:border-crimson rounded-lg px-3.5 py-2 text-sm text-white outline-none"
              />
            </div>
            <div>
              <label htmlFor="assign-hierarchy-rank" className="block text-xs font-mono text-fog mb-1">
                Skill Rank
              </label>
              <select
                id="assign-hierarchy-rank"
                value={newRank}
                onChange={(e) => setNewRank(e.target.value as SecurityRank)}
                className="bg-ink border border-white/15 focus:border-crimson rounded-lg px-3.5 py-2 text-sm font-mono text-white outline-none"
              >
                <option value="S">S Rank · Very Good</option>
                <option value="A">A Rank · Good</option>
                <option value="B">B Rank · Decent</option>
                <option value="D">D Rank · Okay</option>
              </select>
            </div>
            <button
              type="submit"
              disabled={submitting || !newUsername.trim()}
              className="px-4 py-2 rounded-lg bg-crimson hover:bg-ember text-white text-xs font-medium flex items-center gap-1.5 disabled:opacity-50 cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Assign Rank</span>
            </button>
          </form>
        )}

        <div className="space-y-3">
          {hierarchy.map((acc) => {
            const info = getSkillRankInfo(acc.securityRank);
            const rowEditable = isAdmin && (!acc.isFounder || isFounder);
            return (
              <div
                key={acc.id}
                className="p-4 rounded-xl surface-panel border border-white/10 flex flex-wrap items-center justify-between gap-4"
              >
                <div className="flex items-center gap-3.5 min-w-0">
                  <AvatarImage
                    src={acc.avatarUrl}
                    username={acc.username}
                    isFounder={acc.securityRank === 'S'}
                    sizeClass="h-11 w-11 rounded-xl"
                  />
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-display text-base font-semibold text-white">
                        @{acc.username}
                      </span>
                      <span className="text-xs font-mono text-mist">·</span>
                      <span className={`text-xs font-mono font-semibold ${info.textClass}`}>
                        {info.fullLabel}
                      </span>
                      {acc.banned && (
                        <span className="text-xs font-mono text-red-400 font-semibold">
                          · BANNED
                        </span>
                      )}
                      {!acc.banned && acc.suspended && (
                        <span className="text-xs font-mono text-amber-400 font-semibold">
                          · SUSPENDED
                        </span>
                      )}
                    </div>
                    <p className="text-xs font-mono text-mist tabular-nums mt-0.5">
                      {acc.roleTitle} · Roblox ID: {acc.robloxId ?? 'Staff'} · {acc.lastActive}
                    </p>
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  <label htmlFor={`rank-select-${acc.id}`} className="sr-only">
                    Skill rank for {acc.username}
                  </label>
                  <select
                    id={`rank-select-${acc.id}`}
                    value={acc.securityRank}
                    disabled={!rowEditable}
                    onChange={(e) =>
                      onUpdateHierarchy(acc.id, {
                        securityRank: e.target.value as SecurityRank,
                      })
                    }
                    className="bg-ink border border-white/15 rounded-lg px-2.5 py-1.5 text-xs font-mono text-white outline-none disabled:opacity-40"
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
                    className="px-3 py-1.5 rounded-lg border border-amber-500/40 text-amber-300 hover:bg-amber-500/15 text-xs font-mono disabled:opacity-35 cursor-pointer disabled:cursor-not-allowed"
                  >
                    {acc.suspended ? 'Unsuspend' : 'Suspend'}
                  </button>

                  <button
                    type="button"
                    disabled={!rowEditable}
                    onClick={() => onUpdateHierarchy(acc.id, { banned: !acc.banned })}
                    className="px-3 py-1.5 rounded-lg border border-red-500/40 text-red-400 hover:bg-red-500/15 text-xs font-mono disabled:opacity-35 cursor-pointer disabled:cursor-not-allowed flex items-center gap-1"
                  >
                    <UserX className="w-3 h-3" aria-hidden="true" />
                    <span>{acc.banned ? 'Unban' : 'Ban'}</span>
                  </button>

                  {onDeleteHierarchyAccount && rowEditable && (
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
      </section>
    </div>
  );
}
