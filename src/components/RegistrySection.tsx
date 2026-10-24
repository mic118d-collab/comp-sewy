import { useEffect, useMemo, useState } from 'react';
import { AlertTriangle, Ban, Download, LayoutGrid, List, Search } from 'lucide-react';
import type { LeagueDivision, PlayerClass, PlayerRecord } from '../lib/types';
import { getSkillRankInfo } from '../lib/hierarchy';
import { filterAndSortPlayers } from '../lib/rosterSeed';
import { AvatarImage } from './AvatarImage';
import { TeamRoleBadge } from './TeamRoleBadge';

interface RegistrySectionProps {
  players: PlayerRecord[];
  leagues?: LeagueDivision[];
  onSelectPlayer: (player: PlayerRecord) => void;
  onExportCsv: (rows: PlayerRecord[]) => void;
  externalTierFilter?: PlayerClass | '';
  onExternalTierChange?: (tier: PlayerClass | '') => void;
  externalSearch?: string;
  sectionIndex?: string;
}

export function RegistrySection({
  players,
  leagues,
  onSelectPlayer,
  onExportCsv,
  externalTierFilter,
  onExternalTierChange,
  externalSearch,
  sectionIndex = '03.',
}: RegistrySectionProps) {
  const [search, setSearch] = useState('');
  const [position, setPosition] = useState('');
  const [footFilter, setFootFilter] = useState('');
  const [tierFilter, setTierFilter] = useState<PlayerClass | 'Founder' | ''>('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'suspended' | 'banned'>('all');
  const [sort, setSort] = useState<
    'rank-desc' | 'rank-asc' | 'goals-desc' | 'assists-desc' | 'wage-desc' | 'name-asc'
  >('rank-desc');
  const [viewMode, setViewMode] = useState<'grid' | 'table'>('grid');
  const [displayLimit, setDisplayLimit] = useState(48);

  useEffect(() => {
    if (externalTierFilter !== undefined) {
      setTierFilter(externalTierFilter);
      setDisplayLimit(48);
    }
  }, [externalTierFilter]);

  useEffect(() => {
    if (externalSearch !== undefined && externalSearch !== '') {
      setSearch(externalSearch);
      setDisplayLimit(48);
    }
  }, [externalSearch]);

  const updateTier = (next: PlayerClass | 'Founder' | '') => {
    setTierFilter(next);
    setDisplayLimit(48);
    if (onExternalTierChange && next !== 'Founder') {
      onExternalTierChange(next);
    }
  };

  const filtered = useMemo(
    () =>
      filterAndSortPlayers(players, {
        search,
        position,
        foot: footFilter,
        tier: tierFilter,
        status: statusFilter,
        sort,
      }),
    [players, search, position, footFilter, tierFilter, statusFilter, sort]
  );

  const visible = filtered.slice(0, displayLimit);

  const sRankCount = useMemo(() => players.filter((p) => p.tier === 'S').length, [players]);
  const aRankCount = useMemo(() => players.filter((p) => p.tier === 'A').length, [players]);
  const bRankCount = useMemo(() => players.filter((p) => p.tier === 'B').length, [players]);
  const dRankCount = useMemo(() => players.filter((p) => p.tier === 'D').length, [players]);

  return (
    <section id="roster-database" aria-labelledby="roster-db-heading" className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-xs font-mono text-ember tracking-wide">
            {sectionIndex} Official Athlete Directory &amp; Skill Ranks
          </p>
          <h2
            id="roster-db-heading"
            className="font-display text-2xl sm:text-3xl font-semibold text-white mt-1"
          >
            Complete Roster Database
          </h2>
        </div>
        <p className="text-xs font-mono text-fog tabular-nums">
          Showing {visible.length} of {filtered.length} matching ({players.length} total)
        </p>
      </div>

      {/* Filter Toolbar */}
      <div className="p-4 sm:p-5 rounded-xl surface-panel border border-white/10 space-y-4">
        <div className="flex flex-wrap items-center gap-3">
          <div className="relative flex-1 min-w-[230px]">
            <label htmlFor="roster-search" className="sr-only">
              Search athlete username, club, or Roblox ID
            </label>
            <Search
              className="w-4 h-4 text-mist absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none"
              aria-hidden="true"
            />
            <input
              id="roster-search"
              type="search"
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setDisplayLimit(48);
              }}
              placeholder="Search by Roblox username, club, or Roblox ID..."
              className="w-full bg-ink border border-white/15 focus:border-crimson rounded-lg py-2.5 pl-10 pr-4 text-sm text-white placeholder:text-mist outline-none"
            />
          </div>

          <div>
            <label htmlFor="filter-position" className="sr-only">
              Filter by Position
            </label>
            <select
              id="filter-position"
              value={position}
              onChange={(e) => {
                setPosition(e.target.value);
                setDisplayLimit(48);
              }}
              className="bg-ink border border-white/15 focus:border-crimson rounded-lg py-2.5 px-3 text-xs font-mono text-white outline-none"
            >
              <option value="">All Positions</option>
              <option value="Unknown">Position: Unknown</option>
              <option value="GK">GK · Goalkeeper</option>
              <option value="CB">CB · Center Back</option>
              <option value="LB">LB · Left Back</option>
              <option value="RB">RB · Right Back</option>
              <option value="CDM">CDM · Defensive Mid</option>
              <option value="CM">CM · Center Mid</option>
              <option value="CAM">CAM · Attacking Mid</option>
              <option value="LW">LW · Left Wing</option>
              <option value="RW">RW · Right Wing</option>
              <option value="ST">ST · Striker</option>
            </select>
          </div>

          <div>
            <label htmlFor="filter-foot" className="sr-only">
              Filter by Preferred Foot
            </label>
            <select
              id="filter-foot"
              value={footFilter}
              onChange={(e) => {
                setFootFilter(e.target.value);
                setDisplayLimit(48);
              }}
              className="bg-ink border border-white/15 focus:border-crimson rounded-lg py-2.5 px-3 text-xs font-mono text-white outline-none"
            >
              <option value="">All Preferred Feet</option>
              <option value="Unknown">Preferred Foot: Unknown</option>
              <option value="Right">Preferred Foot: Right</option>
              <option value="Left">Preferred Foot: Left</option>
              <option value="Both">Preferred Foot: Both</option>
            </select>
          </div>

          <div>
            <label htmlFor="filter-class" className="sr-only">
              Filter by Skill Rank
            </label>
            <select
              id="filter-class"
              value={tierFilter}
              onChange={(e) => updateTier(e.target.value as PlayerClass | 'Founder' | '')}
              className="bg-ink border border-white/15 focus:border-crimson rounded-lg py-2.5 px-3 text-xs font-mono text-white outline-none"
            >
              <option value="">All Skill Ranks</option>
              <option value="S">S Rank · Very Good</option>
              <option value="A">A Rank · Good</option>
              <option value="B">B Rank · Decent</option>
              <option value="D">D Rank · Okay</option>
            </select>
          </div>

          <div>
            <label htmlFor="filter-status" className="sr-only">
              Filter by Status
            </label>
            <select
              id="filter-status"
              value={statusFilter}
              onChange={(e) => {
                setStatusFilter(e.target.value as 'all' | 'active' | 'suspended' | 'banned');
                setDisplayLimit(48);
              }}
              className="bg-ink border border-white/15 focus:border-crimson rounded-lg py-2.5 px-3 text-xs font-mono text-white outline-none"
            >
              <option value="all">All Statuses</option>
              <option value="active">Active Only</option>
              <option value="suspended">Suspended</option>
              <option value="banned">Banned</option>
            </select>
          </div>

          <div>
            <label htmlFor="filter-sort" className="sr-only">
              Sort Athletes
            </label>
            <select
              id="filter-sort"
              value={sort}
              onChange={(e) =>
                setSort(
                  e.target.value as
                    | 'rank-desc'
                    | 'rank-asc'
                    | 'goals-desc'
                    | 'assists-desc'
                    | 'wage-desc'
                    | 'name-asc'
                )
              }
              className="bg-ink border border-white/15 focus:border-crimson rounded-lg py-2.5 px-3 text-xs font-mono text-white outline-none"
            >
              <option value="rank-desc">OVR: High → Low</option>
              <option value="rank-asc">OVR: Low → High</option>
              <option value="goals-desc">Goals: Most → Least</option>
              <option value="assists-desc">Assists: Most → Least</option>
              <option value="wage-desc">Wage: High → Low</option>
              <option value="name-asc">Username: A → Z</option>
            </select>
          </div>

          <div className="flex items-center border border-white/15 rounded-lg overflow-hidden">
            <button
              type="button"
              aria-label="Grid view"
              onClick={() => setViewMode('grid')}
              className={`p-2.5 transition-colors cursor-pointer ${
                viewMode === 'grid' ? 'bg-crimson text-white' : 'bg-ink text-fog hover:text-white'
              }`}
            >
              <LayoutGrid className="w-4 h-4" />
            </button>
            <button
              type="button"
              aria-label="Table view"
              onClick={() => setViewMode('table')}
              className={`p-2.5 transition-colors cursor-pointer ${
                viewMode === 'table' ? 'bg-crimson text-white' : 'bg-ink text-fog hover:text-white'
              }`}
            >
              <List className="w-4 h-4" />
            </button>
          </div>

          <button
            type="button"
            onClick={() => onExportCsv(filtered)}
            className="px-4 py-2.5 rounded-lg border border-white/15 bg-white/5 hover:bg-crimson hover:border-crimson text-white text-xs font-medium transition-colors flex items-center gap-1.5 whitespace-nowrap shrink-0 cursor-pointer"
          >
            <Download className="w-3.5 h-3.5" aria-hidden="true" />
            <span>Download CSV</span>
          </button>
        </div>

        {/* Segmented Skill Rank Filter Tabs */}
        <div className="flex flex-wrap items-center justify-between gap-3 pt-3 border-t border-white/10">
          <div className="flex flex-wrap items-center gap-1.5 p-1 bg-ink rounded-lg border border-white/10">
            <button
              type="button"
              onClick={() => updateTier('')}
              className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors whitespace-nowrap cursor-pointer tabular-nums ${
                tierFilter === '' ? 'bg-crimson text-white' : 'text-fog hover:text-white'
              }`}
            >
              All ({players.length})
            </button>
            <button
              type="button"
              onClick={() => updateTier('S')}
              className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors whitespace-nowrap cursor-pointer tabular-nums ${
                tierFilter === 'S'
                  ? 'bg-founder text-ink font-semibold'
                  : 'text-fog hover:text-white'
              }`}
            >
              S · Very Good ({sRankCount})
            </button>
            <button
              type="button"
              onClick={() => updateTier('A')}
              className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors whitespace-nowrap cursor-pointer tabular-nums ${
                tierFilter === 'A' ? 'bg-crimson text-white' : 'text-fog hover:text-white'
              }`}
            >
              A · Good ({aRankCount})
            </button>
            <button
              type="button"
              onClick={() => updateTier('B')}
              className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors whitespace-nowrap cursor-pointer tabular-nums ${
                tierFilter === 'B'
                  ? 'bg-emerald-500 text-ink font-semibold'
                  : 'text-fog hover:text-white'
              }`}
            >
              B · Decent ({bRankCount})
            </button>
            <button
              type="button"
              onClick={() => updateTier('D')}
              className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors whitespace-nowrap cursor-pointer tabular-nums ${
                tierFilter === 'D' ? 'bg-crimson text-white' : 'text-fog hover:text-white'
              }`}
            >
              D · Okay ({dRankCount})
            </button>
          </div>

          {(search || position || footFilter || tierFilter || statusFilter !== 'all') && (
            <button
              type="button"
              onClick={() => {
                setSearch('');
                setPosition('');
                setFootFilter('');
                updateTier('');
                setStatusFilter('all');
              }}
              className="text-xs font-mono text-ember hover:text-white transition-colors cursor-pointer"
            >
              Reset Filters
            </button>
          )}
        </div>
      </div>

      {/* Results View */}
      {filtered.length === 0 ? (
        <div className="p-14 text-center rounded-xl surface-panel border border-white/10 space-y-3">
          <p className="font-display text-lg font-semibold text-white">
            No athletes currently in this skill filter
          </p>
          <p className="text-sm text-fog max-w-md mx-auto">
            {tierFilter === 'A' || tierFilter === 'B'
              ? `Pre-Season starts with the 5 S-Rank Founders (Very Good) and ${dRankCount} D-Rank athletes (Okay). Staff can promote players to ${tierFilter} Rank (${tierFilter === 'A' ? 'Good' : 'Decent'}) as they prove their skill!`
              : `Try clearing your search query or resetting the position, preferred foot, and rank filters to view all ${players.length} registered athletes.`}
          </p>
          <button
            type="button"
            onClick={() => {
              setSearch('');
              setPosition('');
              setFootFilter('');
              updateTier('');
              setStatusFilter('all');
            }}
            className="px-4 py-2 rounded-lg bg-crimson hover:bg-ember text-white text-xs font-medium transition-colors cursor-pointer"
          >
            Show All Athletes
          </button>
        </div>
      ) : viewMode === 'grid' ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {visible.map((player) => {
            const skillInfo = getSkillRankInfo(player.isFounder ? 'S' : player.tier);
            return (
              <button
                key={player.id}
                type="button"
                onClick={() => onSelectPlayer(player)}
                className={`text-left p-5 rounded-xl surface-panel border hover:-translate-y-1 transition-[transform,border-color] duration-200 flex flex-col justify-between group cursor-pointer focus-visible:outline-2 focus-visible:outline-crimson ${
                  player.banned
                    ? 'border-red-500/40 opacity-65'
                    : player.suspended
                      ? 'border-amber-500/40'
                      : skillInfo.borderClass
                }`}
              >
                <div>
                  <div className="flex items-start justify-between gap-3">
                    <div className="transition-transform duration-200 group-hover:scale-105">
                      <AvatarImage
                        src={player.avatarUrl}
                        username={player.username}
                        isFounder={player.isFounder}
                        sizeClass="h-12 w-12 rounded-xl"
                      />
                    </div>
                    <div className="text-right">
                      <div
                        className={`font-display text-3xl font-semibold leading-none tabular-nums ${
                          player.isFounder || player.tier === 'S'
                            ? 'text-founder'
                            : player.tier === 'A'
                              ? 'text-ember'
                              : player.tier === 'B'
                                ? 'text-emerald-400'
                                : 'text-white'
                        }`}
                      >
                        {player.rating}
                      </div>
                      <div className={`text-[11px] font-mono mt-1 ${skillInfo.textClass}`}>
                        {skillInfo.rank} · {skillInfo.quality}
                      </div>
                    </div>
                  </div>

                  <div className="mt-4">
                    <h3 className="font-display text-base font-semibold text-white group-hover:text-ember transition-colors truncate">
                      {player.username}
                    </h3>
                    <p className="text-xs text-fog mt-1 truncate">
                      Position: <span className="text-white font-medium">{player.position}</span>
                    </p>
                    <p className="text-xs text-fog mt-0.5 truncate">
                      Preferred Foot: <span className="text-white font-medium">{player.foot}</span>
                    </p>
                    <div className="mt-1">
                      <TeamRoleBadge clubName={player.club} leagues={leagues} />
                    </div>
                    <p className="text-[11px] font-mono text-mist mt-1 tabular-nums truncate">
                      Roblox ID: {player.robloxId ?? 'Syncing'}
                    </p>

                    {player.banned && (
                      <div className="mt-2 flex items-center gap-1.5 text-xs font-mono text-red-400">
                        <Ban className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
                        <span>Banned</span>
                      </div>
                    )}
                    {!player.banned && player.suspended && (
                      <div className="mt-2 flex items-center gap-1.5 text-xs font-mono text-amber-400">
                        <AlertTriangle className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
                        <span>Suspended</span>
                      </div>
                    )}
                  </div>
                </div>

                <div className="mt-4 pt-3 border-t border-white/10 flex items-center justify-between text-xs font-mono text-fog tabular-nums">
                  <span>
                    {player.goals}G · {player.assists}A
                  </span>
                  <span className="text-gold group-hover:text-white transition-colors">
                    ${Math.round(player.wage / 1000)}k/wk →
                  </span>
                </div>
              </button>
            );
          })}
        </div>
      ) : (
        <div className="overflow-x-auto rounded-xl surface-panel border border-white/10">
          <table className="w-full text-left text-xs font-mono">
            <thead className="border-b border-white/10 text-[11px] text-mist bg-ink/70">
              <tr>
                <th className="py-3 px-4">Athlete</th>
                <th className="py-3 px-4">Roblox ID</th>
                <th className="py-3 px-4">Skill Rank</th>
                <th className="py-3 px-4">Position</th>
                <th className="py-3 px-4">Preferred Foot</th>
                <th className="py-3 px-4">Team</th>
                <th className="py-3 px-4 text-right">OVR</th>
                <th className="py-3 px-4 text-right">G / A</th>
                <th className="py-3 px-4 text-right">Wage</th>
                <th className="py-3 px-4">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5 tabular-nums">
              {visible.map((player) => {
                const skillInfo = getSkillRankInfo(player.isFounder ? 'S' : player.tier);
                return (
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
                        <span className="truncate max-w-[180px]">{player.username}</span>
                      </button>
                    </td>
                    <td className="py-2.5 px-4 text-fog">{player.robloxId ?? '—'}</td>
                    <td className="py-2.5 px-4">
                      <span className={skillInfo.textClass}>{skillInfo.fullLabel}</span>
                    </td>
                    <td className="py-2.5 px-4 text-white">{player.position}</td>
                    <td className="py-2.5 px-4 text-white">{player.foot}</td>
                    <td className="py-2.5 px-4 max-w-[190px]">
                      <TeamRoleBadge clubName={player.club} leagues={leagues} showPrefix={false} />
                    </td>
                    <td className="py-2.5 px-4 text-right font-display text-base font-semibold text-white">
                      {player.rating}
                    </td>
                    <td className="py-2.5 px-4 text-right text-fog">
                      {player.goals} / {player.assists}
                    </td>
                    <td className="py-2.5 px-4 text-right text-gold">
                      ${Math.round(player.wage / 1000)}k
                    </td>
                    <td className="py-2.5 px-4">
                      {player.banned ? (
                        <span className="text-red-400 flex items-center gap-1">
                          <Ban className="w-3 h-3" aria-hidden="true" /> Banned
                        </span>
                      ) : player.suspended ? (
                        <span className="text-amber-400 flex items-center gap-1">
                          <AlertTriangle className="w-3 h-3" aria-hidden="true" /> Suspended
                        </span>
                      ) : (
                        <span className="text-emerald-400">Active</span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {visible.length < filtered.length && (
        <div className="text-center pt-2">
          <button
            type="button"
            onClick={() => setDisplayLimit((prev) => prev + 60)}
            className="px-6 py-2.5 rounded-lg border border-white/15 surface-panel hover:border-crimson hover:bg-crimson/15 text-xs font-mono text-white transition-colors cursor-pointer tabular-nums"
          >
            Load More Athletes ({filtered.length - visible.length} remaining)
          </button>
        </div>
      )}
    </section>
  );
}
