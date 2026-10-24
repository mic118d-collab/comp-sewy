import { useEffect, useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { Crown, Lock, X } from 'lucide-react';
import type {
  LeagueDivision,
  PlayerClass,
  PlayerRecord,
  PositionCode,
  PreferredFoot,
  SecurityRank,
  StaffAccessPolicy,
  StaffRole,
} from '../lib/types';
import {
  DEFAULT_STAFF_ACCESS_POLICY,
  canBanEntity,
  canChangePlayerTeam,
  canManageHierarchy,
  canSuspendPlayer,
  getSkillRankInfo,
} from '../lib/hierarchy';
import {
  RFF_LEAGUE_DEFINITIONS,
  UNKNOWN_TEAM_ROLE,
  findOfficialClubByName,
  needsCircularBadgeMask,
} from '../lib/leagues';

interface PlayerFormModalProps {
  open: boolean;
  mode: 'create' | 'edit';
  initialPlayer: PlayerRecord | null;
  role: StaffRole;
  staffPolicy?: StaffAccessPolicy;
  leagues?: LeagueDivision[];
  onClose: () => void;
  onSave: (payload: Partial<PlayerRecord>, mode: 'create' | 'edit') => Promise<void>;
}

const POSITIONS: PositionCode[] = [
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

const PREFERRED_FEET: PreferredFoot[] = ['Unknown', 'Right', 'Left', 'Both'];

const CLASSES: Array<'D' | 'B' | 'A' | 'S'> = ['D', 'B', 'A', 'S'];

export function PlayerFormModal({
  open,
  mode,
  initialPlayer,
  role,
  staffPolicy = DEFAULT_STAFF_ACCESS_POLICY,
  leagues,
  onClose,
  onSave,
}: PlayerFormModalProps) {
  const isFounder = role === 'founder';
  const isProtectedFounderTarget = Boolean(
    mode === 'edit' && initialPlayer?.isFounder && !isFounder
  );
  const canBan = canBanEntity(role, staffPolicy) && !isProtectedFounderTarget;
  const canSuspend = canSuspendPlayer(role, staffPolicy) && !isProtectedFounderTarget;
  const canChangeTeam = canChangePlayerTeam(role, staffPolicy);
  const canHierarchy = canManageHierarchy(role, staffPolicy) && !isProtectedFounderTarget;

  const [username, setUsername] = useState('');
  const [club, setClub] = useState(UNKNOWN_TEAM_ROLE);
  const [position, setPosition] = useState<PositionCode>('Unknown');
  const [tier, setTier] = useState<PlayerClass>('D');
  const [securityRank, setSecurityRank] = useState<SecurityRank>('D');
  const [rating, setRating] = useState(60);
  const [goals, setGoals] = useState(0);
  const [assists, setAssists] = useState(0);
  const [appearances, setAppearances] = useState(0);
  const [foot, setFoot] = useState<PreferredFoot>('Unknown');
  const [pace, setPace] = useState(60);
  const [shooting, setShooting] = useState(58);
  const [passing, setPassing] = useState(60);
  const [dribbling, setDribbling] = useState(60);
  const [defending, setDefending] = useState(56);
  const [physical, setPhysical] = useState(60);
  const [wage, setWage] = useState(25000);
  const [releaseClause, setReleaseClause] = useState(2500000);
  const [scoutingReport, setScoutingReport] = useState('');
  const [suspended, setSuspended] = useState(false);
  const [banned, setBanned] = useState(false);
  const [banReason, setBanReason] = useState('');
  const [founderFlag, setFounderFlag] = useState(false);
  const [customAvatarUrl, setCustomAvatarUrl] = useState('');
  const [customRobloxId, setCustomRobloxId] = useState('');

  const [saving, setSaving] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  useEffect(() => {
    if (!open) return;
    setErrorMsg('');
    if (mode === 'edit' && initialPlayer) {
      setUsername(initialPlayer.username);
      setClub(initialPlayer.club);
      setPosition(initialPlayer.position);
      setTier(initialPlayer.tier);
      setSecurityRank(initialPlayer.securityRank);
      setRating(initialPlayer.rating);
      setGoals(initialPlayer.goals);
      setAssists(initialPlayer.assists);
      setAppearances(initialPlayer.appearances);
      setFoot(initialPlayer.foot);
      setPace(initialPlayer.pace);
      setShooting(initialPlayer.shooting);
      setPassing(initialPlayer.passing);
      setDribbling(initialPlayer.dribbling);
      setDefending(initialPlayer.defending);
      setPhysical(initialPlayer.physical);
      setWage(initialPlayer.wage);
      setReleaseClause(initialPlayer.releaseClause);
      setScoutingReport(initialPlayer.scoutingReport);
      setSuspended(initialPlayer.suspended);
      setBanned(initialPlayer.banned);
      setBanReason(initialPlayer.banReason ?? '');
      setFounderFlag(initialPlayer.isFounder);
      setCustomAvatarUrl(initialPlayer.avatarUrl ?? '');
      setCustomRobloxId(initialPlayer.robloxId ? String(initialPlayer.robloxId) : '');
    } else {
      setUsername('');
      setClub(UNKNOWN_TEAM_ROLE);
      setPosition('Unknown');
      setTier('D');
      setSecurityRank('D');
      setRating(60);
      setGoals(0);
      setAssists(0);
      setAppearances(0);
      setFoot('Unknown');
      setPace(60);
      setShooting(58);
      setPassing(60);
      setDribbling(60);
      setDefending(56);
      setPhysical(60);
      setWage(25000);
      setReleaseClause(2500000);
      setScoutingReport(
        'Official RFF² D-Class Registry Evaluation — Rank 60 prospect registered for competitive trials.'
      );
      setSuspended(false);
      setBanned(false);
      setBanReason('');
      setFounderFlag(false);
      setCustomAvatarUrl('');
      setCustomRobloxId('');
    }
  }, [open, mode, initialPlayer]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!username.trim()) {
      setErrorMsg('Roblox username is required.');
      return;
    }
    setSaving(true);
    setErrorMsg('');
    try {
      const payload: Partial<PlayerRecord> = {
        username: username.trim(),
        position,
        tier,
        rating,
        goals,
        assists,
        appearances,
        foot,
        pace,
        shooting,
        passing,
        dribbling,
        defending,
        physical,
        wage,
        releaseClause,
        scoutingReport: scoutingReport.trim(),
      };
      if (canChangeTeam) {
        payload.club = club.trim() || UNKNOWN_TEAM_ROLE;
      }
      if (canSuspend) {
        payload.suspended = suspended;
      }
      if (canBan) {
        payload.banned = banned;
        payload.banReason = banReason.trim();
      }
      if (canHierarchy) {
        payload.securityRank = securityRank;
      }
      if (isFounder) {
        payload.isFounder = founderFlag;
        payload.avatarUrl = customAvatarUrl.trim();
        const parsedId = Number(customRobloxId.trim());
        if (Number.isFinite(parsedId) && parsedId > 0) {
          payload.robloxId = Math.round(parsedId);
        }
      }
      await onSave(payload, mode);
      onClose();
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'Failed saving player record.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          role="dialog"
          aria-modal="true"
          aria-labelledby="player-form-modal-title"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.16 }}
          className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4"
          onClick={(e) => {
            if (e.target === e.currentTarget) onClose();
          }}
        >
          <motion.form
            initial={{ opacity: 0, scale: 0.92, y: 16 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 10 }}
            transition={{ type: 'spring', stiffness: 380, damping: 28 }}
            onSubmit={handleSubmit}
            className="surface-modal border border-white/15 rounded-2xl w-full max-w-2xl p-6 sm:p-7 space-y-5 max-h-[90vh] overflow-y-auto"
          >
        <div className="flex items-center justify-between border-b border-white/10 pb-3">
          <div>
            <h3
              id="player-form-modal-title"
              className="font-display text-xl font-semibold text-white"
            >
              {mode === 'create'
                ? 'Add New Player to Registry'
                : `Edit Player Stats — @${initialPlayer?.username}`}
            </h3>
            <p className="text-xs font-mono text-mist mt-0.5">
              {mode === 'create'
                ? 'Automatically resolves live Roblox Profile Picture & Roblox User ID on save.'
                : 'Modify technical attributes, match totals, club assignment, and rating.'}
            </p>
          </div>
          <button
            type="button"
            aria-label="Close form modal"
            onClick={onClose}
            className="h-8 w-8 rounded-lg border border-white/15 text-fog hover:text-white flex items-center justify-center cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {errorMsg && (
          <div role="alert" className="p-3 rounded-lg bg-red-500/15 border border-red-500/40 text-xs font-mono text-red-300">
            {errorMsg}
          </div>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs font-mono">
          <div>
            <label htmlFor="field-username" className="block text-fog mb-1">
              Roblox Username *
            </label>
            <input
              id="field-username"
              type="text"
              required
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="e.g. Builderman"
              className="w-full bg-ink border border-white/15 focus:border-crimson rounded-lg p-2.5 text-white outline-none"
            />
          </div>

          <div>
            <label htmlFor="field-club" className="flex items-center justify-between text-fog mb-1">
              <span>Team {canChangeTeam ? '' : '(Locked)'}</span>
              {findOfficialClubByName(club, leagues) && (
                <img
                  src={findOfficialClubByName(club, leagues)!.clubLogoUrl}
                  alt=""
                  decoding="async"
                  referrerPolicy="no-referrer"
                  className={`w-5 h-5 ${
                    needsCircularBadgeMask(findOfficialClubByName(club, leagues)!.clubLogoUrl)
                      ? 'rounded-full object-cover scale-[1.03]'
                      : 'object-contain'
                  }`}
                />
              )}
            </label>
            <select
              id="field-club"
              disabled={!canChangeTeam}
              value={club}
              onChange={(e) => setClub(e.target.value)}
              className="w-full bg-ink border border-white/15 focus:border-crimson rounded-lg p-2.5 text-white outline-none disabled:opacity-45"
            >
              <option value={UNKNOWN_TEAM_ROLE}>Unknown (Unassigned)</option>
              {(leagues && leagues.length > 0 ? leagues : RFF_LEAGUE_DEFINITIONS).map((league) => (
                <optgroup key={league.id} label={league.name}>
                  {league.clubs.map((c) => (
                    <option key={c.id} value={c.name}>
                      {c.name}
                    </option>
                  ))}
                </optgroup>
              ))}
            </select>
          </div>

          <div>
            <label htmlFor="field-position" className="block text-fog mb-1">
              Position
            </label>
            <select
              id="field-position"
              value={position}
              onChange={(e) => setPosition(e.target.value as PositionCode)}
              className="w-full bg-ink border border-white/15 focus:border-crimson rounded-lg p-2.5 text-white outline-none"
            >
              {POSITIONS.map((p) => (
                <option key={p} value={p}>
                  {p}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label htmlFor="field-rating" className="block text-fog mb-1">
              Overall Rank (1-99)
            </label>
            <input
              id="field-rating"
              type="number"
              min={1}
              max={99}
              value={rating}
              onChange={(e) => setRating(Number(e.target.value))}
              className="w-full bg-ink border border-white/15 focus:border-crimson rounded-lg p-2.5 text-gold font-semibold outline-none tabular-nums"
            />
          </div>

          <div>
            <label htmlFor="field-class" className="block text-fog mb-1">
              Skill Rank (How Good)
            </label>
            <select
              id="field-class"
              value={tier === 'C' ? 'D' : tier}
              onChange={(e) => setTier(e.target.value as PlayerClass)}
              className="w-full bg-ink border border-white/15 focus:border-crimson rounded-lg p-2.5 text-white outline-none"
            >
              {CLASSES.map((c) => {
                const info = getSkillRankInfo(c);
                return (
                  <option key={c} value={c}>
                    {info.label} — {info.quality}
                  </option>
                );
              })}
            </select>
          </div>

          <div>
            <label htmlFor="field-foot" className="block text-fog mb-1">
              Preferred Foot
            </label>
            <select
              id="field-foot"
              value={foot}
              onChange={(e) => setFoot(e.target.value as PreferredFoot)}
              className="w-full bg-ink border border-white/15 focus:border-crimson rounded-lg p-2.5 text-white outline-none"
            >
              {PREFERRED_FEET.map((f) => (
                <option key={f} value={f}>
                  {f}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label htmlFor="field-goals" className="block text-fog mb-1">
              Goals
            </label>
            <input
              id="field-goals"
              type="number"
              min={0}
              value={goals}
              onChange={(e) => setGoals(Number(e.target.value))}
              className="w-full bg-ink border border-white/15 focus:border-crimson rounded-lg p-2.5 text-white outline-none tabular-nums"
            />
          </div>

          <div>
            <label htmlFor="field-assists" className="block text-fog mb-1">
              Assists
            </label>
            <input
              id="field-assists"
              type="number"
              min={0}
              value={assists}
              onChange={(e) => setAssists(Number(e.target.value))}
              className="w-full bg-ink border border-white/15 focus:border-crimson rounded-lg p-2.5 text-white outline-none tabular-nums"
            />
          </div>

          <div>
            <label htmlFor="field-apps" className="block text-fog mb-1">
              Appearances
            </label>
            <input
              id="field-apps"
              type="number"
              min={0}
              value={appearances}
              onChange={(e) => setAppearances(Number(e.target.value))}
              className="w-full bg-ink border border-white/15 focus:border-crimson rounded-lg p-2.5 text-white outline-none tabular-nums"
            />
          </div>
        </div>

        {/* Technical Attributes */}
        <div className="pt-2 border-t border-white/10">
          <p className="text-xs font-mono text-mist mb-2.5">Technical Attributes (1-99)</p>
          <div className="grid grid-cols-2 sm:grid-cols-6 gap-2.5 text-xs font-mono">
            <div>
              <label htmlFor="field-pac" className="block text-fog mb-1">PAC</label>
              <input id="field-pac" type="number" min={1} max={99} value={pace} onChange={(e) => setPace(Number(e.target.value))} className="w-full bg-ink border border-white/15 rounded-lg p-2 text-white tabular-nums outline-none" />
            </div>
            <div>
              <label htmlFor="field-sho" className="block text-fog mb-1">SHO</label>
              <input id="field-sho" type="number" min={1} max={99} value={shooting} onChange={(e) => setShooting(Number(e.target.value))} className="w-full bg-ink border border-white/15 rounded-lg p-2 text-white tabular-nums outline-none" />
            </div>
            <div>
              <label htmlFor="field-pas" className="block text-fog mb-1">PAS</label>
              <input id="field-pas" type="number" min={1} max={99} value={passing} onChange={(e) => setPassing(Number(e.target.value))} className="w-full bg-ink border border-white/15 rounded-lg p-2 text-white tabular-nums outline-none" />
            </div>
            <div>
              <label htmlFor="field-dri" className="block text-fog mb-1">DRI</label>
              <input id="field-dri" type="number" min={1} max={99} value={dribbling} onChange={(e) => setDribbling(Number(e.target.value))} className="w-full bg-ink border border-white/15 rounded-lg p-2 text-white tabular-nums outline-none" />
            </div>
            <div>
              <label htmlFor="field-def" className="block text-fog mb-1">DEF</label>
              <input id="field-def" type="number" min={1} max={99} value={defending} onChange={(e) => setDefending(Number(e.target.value))} className="w-full bg-ink border border-white/15 rounded-lg p-2 text-white tabular-nums outline-none" />
            </div>
            <div>
              <label htmlFor="field-phy" className="block text-fog mb-1">PHY</label>
              <input id="field-phy" type="number" min={1} max={99} value={physical} onChange={(e) => setPhysical(Number(e.target.value))} className="w-full bg-ink border border-white/15 rounded-lg p-2 text-white tabular-nums outline-none" />
            </div>
          </div>
        </div>

        {/* Financials & Scouting Report */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs font-mono pt-2 border-t border-white/10">
          <div>
            <label htmlFor="field-wage" className="block text-fog mb-1">Weekly Wage ($)</label>
            <input id="field-wage" type="number" min={0} value={wage} onChange={(e) => setWage(Number(e.target.value))} className="w-full bg-ink border border-white/15 rounded-lg p-2.5 text-white tabular-nums outline-none" />
          </div>
          <div>
            <label htmlFor="field-clause" className="block text-fog mb-1">Release Clause ($)</label>
            <input id="field-clause" type="number" min={0} value={releaseClause} onChange={(e) => setReleaseClause(Number(e.target.value))} className="w-full bg-ink border border-white/15 rounded-lg p-2.5 text-white tabular-nums outline-none" />
          </div>
          <div className="sm:col-span-2">
            <label htmlFor="field-report" className="block text-fog mb-1">Scouting Report</label>
            <textarea
              id="field-report"
              rows={2}
              value={scoutingReport}
              onChange={(e) => setScoutingReport(e.target.value)}
              className="w-full bg-ink border border-white/15 rounded-lg p-2.5 text-white outline-none resize-none"
            />
          </div>
        </div>

        {/* Discipline & Security Hierarchy Controls */}
        <div className="p-4 rounded-xl bg-ink/80 border border-white/10 space-y-3">
          <div className="flex items-center justify-between gap-2">
            <span className="text-xs font-mono text-white font-semibold">
              Discipline &amp; Security Clearance
            </span>
            {!canBan && (
              <span className="text-[11px] font-mono text-amber-400 flex items-center gap-1">
                <Lock className="w-3 h-3" aria-hidden="true" />
                {isProtectedFounderTarget
                  ? 'Founder Record Protected'
                  : 'Restricted by Role Permissions'}
              </span>
            )}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs font-mono">
            <label className={`flex items-center gap-2 ${!canSuspend ? 'opacity-45 cursor-not-allowed' : 'cursor-pointer'}`}>
              <input
                type="checkbox"
                disabled={!canSuspend}
                checked={suspended}
                onChange={(e) => setSuspended(e.target.checked)}
                className="h-4 w-4 accent-crimson"
              />
              <span className="text-amber-300">Suspend Athlete</span>
            </label>

            <label className={`flex items-center gap-2 ${!canBan ? 'opacity-45 cursor-not-allowed' : 'cursor-pointer'}`}>
              <input
                type="checkbox"
                disabled={!canBan}
                checked={banned}
                onChange={(e) => setBanned(e.target.checked)}
                className="h-4 w-4 accent-crimson"
              />
              <span className="text-red-400">Ban Athlete</span>
            </label>

            <div>
              <label htmlFor="field-sec-rank" className="sr-only">
                Security Hierarchy Clearance
              </label>
              <select
                id="field-sec-rank"
                disabled={!canHierarchy}
                value={securityRank}
                onChange={(e) => setSecurityRank(e.target.value as SecurityRank)}
                className="w-full bg-panel border border-white/15 rounded-lg px-2.5 py-1.5 text-white outline-none disabled:opacity-45"
              >
                <option value="D">Tier: D Rank (Okay)</option>
                <option value="B">Tier: B Rank (Decent)</option>
                <option value="A">Tier: A Rank (Good)</option>
                <option value="S">Tier: S Rank (Very Good)</option>
              </select>
            </div>
          </div>

          {canBan && banned && (
            <div>
              <label htmlFor="field-ban-reason" className="block text-[11px] font-mono text-fog mb-1">
                Ban Reason
              </label>
              <input
                id="field-ban-reason"
                type="text"
                value={banReason}
                onChange={(e) => setBanReason(e.target.value)}
                placeholder="Reason logged in Security Audit..."
                className="w-full bg-panel border border-white/15 rounded-lg p-2 text-xs font-mono text-white outline-none"
              />
            </div>
          )}
        </div>

        {/* Founder Exclusive Overrides */}
        {isFounder && (
          <div className="p-4 rounded-xl bg-founder/10 border border-founder/40 space-y-3 text-xs font-mono">
            <div className="flex items-center gap-2 text-founder font-semibold">
              <Crown className="w-3.5 h-3.5" aria-hidden="true" />
              <span>Founder Sovereign Overrides</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 items-end">
              <label className="flex items-center gap-2 cursor-pointer py-2">
                <input
                  type="checkbox"
                  checked={founderFlag}
                  onChange={(e) => setFounderFlag(e.target.checked)}
                  className="h-4 w-4 accent-crimson"
                />
                <span className="text-white">Founder Council Member</span>
              </label>

              <div>
                <label htmlFor="field-roblox-id" className="block text-fog mb-1">
                  Roblox User ID Override
                </label>
                <input
                  id="field-roblox-id"
                  type="number"
                  min={1}
                  value={customRobloxId}
                  onChange={(e) => setCustomRobloxId(e.target.value)}
                  placeholder="Auto-synced"
                  className="w-full bg-ink border border-white/15 rounded-lg p-2 text-white tabular-nums outline-none"
                />
              </div>

              <div>
                <label htmlFor="field-avatar-url" className="block text-fog mb-1">
                  Custom Avatar Image URL
                </label>
                <input
                  id="field-avatar-url"
                  type="text"
                  value={customAvatarUrl}
                  onChange={(e) => setCustomAvatarUrl(e.target.value)}
                  placeholder="https://... or /assets/..."
                  className="w-full bg-ink border border-white/15 rounded-lg p-2 text-white outline-none"
                />
              </div>
            </div>
          </div>
        )}

        <div className="flex items-center justify-end gap-3 pt-2 border-t border-white/10">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-lg text-xs font-medium text-fog hover:text-white cursor-pointer"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={saving}
            className="px-5 py-2.5 rounded-lg bg-crimson hover:bg-ember text-white text-xs font-medium disabled:opacity-50 cursor-pointer"
          >
            {saving ? 'Saving...' : mode === 'create' ? 'Register Player' : 'Save Changes'}
          </button>
        </div>
          </motion.form>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
