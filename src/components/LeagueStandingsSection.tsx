import { useEffect, useMemo, useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import {
  ArrowUpRight,
  Edit3,
  Lock,
  Maximize2,
  Plus,
  RotateCcw,
  Search,
  Shield,
  Trophy,
  Users,
  X,
} from 'lucide-react';
import type {
  ClubStandingRecord,
  LeagueDivision,
  LeagueId,
  PlayerRecord,
  StaffAccessPolicy,
  StaffSession,
} from '../lib/types';
import {
  DEFAULT_STAFF_ACCESS_POLICY,
  canManageLeagueStandings,
} from '../lib/hierarchy';
import {
  RFF_FEDERATION_LOGO_URL,
  type StandingZone,
  filterLeaguesAndClubs,
  getStandingZoneInfo,
  needsCircularBadgeMask,
} from '../lib/leagues';
import { AvatarImage } from './AvatarImage';

interface LeagueStandingsSectionProps {
  leagues: LeagueDivision[];
  players: PlayerRecord[];
  session: StaffSession;
  staffPolicy?: StaffAccessPolicy;
  sectionIndex?: string;
  onSelectPlayer: (player: PlayerRecord) => void;
  onFilterRosterByClub?: (clubName: string) => void;
  onLogMatch: (
    leagueId: LeagueId,
    homeClubId: string,
    awayClubId: string,
    homeGoals: number,
    awayGoals: number
  ) => Promise<void>;
  onUpdateClubStanding: (
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
  ) => Promise<void>;
  onResetLeague: (leagueId: LeagueId) => Promise<void>;
}

function BadgeImage({
  src,
  alt,
  fallbackCode,
  imgClassName,
  fallbackClassName,
  testId,
}: {
  src: string;
  alt: string;
  fallbackCode: string;
  imgClassName: string;
  fallbackClassName: string;
  testId?: string;
}) {
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    setFailed(false);
  }, [src]);

  if (failed || !src) {
    return (
      <div
        data-testid={testId}
        className={`flex items-center justify-center rounded-md bg-white/8 border border-white/15 font-display font-bold text-white select-none ${fallbackClassName}`}
      >
        {fallbackCode}
      </div>
    );
  }

  const circularMask = needsCircularBadgeMask(src);
  const fitClasses = circularMask
    ? `${imgClassName.replace(/\bobject-contain\b/g, '').trim()} rounded-full object-cover scale-[1.03]`
    : imgClassName;

  return (
    <img
      src={src}
      alt={alt}
      data-testid={testId}
      loading="eager"
      referrerPolicy="no-referrer"
      onError={() => setFailed(true)}
      className={fitClasses}
    />
  );
}

const ZONE_ROW_BG: Record<StandingZone, string> = {
  champions:
    'bg-gradient-to-r from-cyan-500/[0.11] via-cyan-500/[0.03] to-transparent hover:from-cyan-500/[0.18]',
  europa:
    'bg-gradient-to-r from-amber-500/[0.10] via-amber-500/[0.025] to-transparent hover:from-amber-500/[0.17]',
  midtable: 'hover:bg-white/[0.045]',
  relegation:
    'bg-gradient-to-r from-rose-500/[0.11] via-rose-500/[0.03] to-transparent hover:from-rose-500/[0.18]',
};

const ZONE_RANK_TEXT: Record<StandingZone, string> = {
  champions: 'text-cyan-400 font-bold',
  europa: 'text-amber-300 font-semibold',
  midtable: 'text-mist',
  relegation: 'text-rose-400 font-semibold',
};

const ZONE_PTS_TEXT: Record<StandingZone, string> = {
  champions: 'text-cyan-400 font-bold',
  europa: 'text-amber-300 font-bold',
  midtable: 'text-white font-bold',
  relegation: 'text-rose-400 font-bold',
};

export function LeagueStandingsSection({
  leagues,
  players,
  session,
  staffPolicy = DEFAULT_STAFF_ACCESS_POLICY,
  sectionIndex = '01.',
  onSelectPlayer,
  onFilterRosterByClub,
  onLogMatch,
  onUpdateClubStanding,
  onResetLeague,
}: LeagueStandingsSectionProps) {
  const canManageStandings =
    session.authenticated && canManageLeagueStandings(session.role, staffPolicy);

  const [selectedLeagueFilter, setSelectedLeagueFilter] = useState<LeagueId | 'all'>('all');
  const [clubSearch, setClubSearch] = useState('');
  const [selectedClubKey, setSelectedClubKey] = useState<string | null>(null);
  const [lightboxAsset, setLightboxAsset] = useState<{
    title: string;
    subtitle: string;
    src: string;
    fallbackCode: string;
  } | null>(null);

  useEffect(() => {
    if (!lightboxAsset) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setLightboxAsset(null);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [lightboxAsset]);

  // Admin Match Logger Modal State
  const [matchModalLeagueId, setMatchModalLeagueId] = useState<LeagueId | null>(null);
  const [homeClubId, setHomeClubId] = useState('');
  const [awayClubId, setAwayClubId] = useState('');
  const [homeGoals, setHomeGoals] = useState(0);
  const [awayGoals, setAwayGoals] = useState(0);
  const [matchError, setMatchError] = useState('');
  const [submittingMatch, setSubmittingMatch] = useState(false);

  // Admin Club Standings Editor Modal State
  const [editingClub, setEditingClub] = useState<{
    league: LeagueDivision;
    club: ClubStandingRecord;
  } | null>(null);
  const [editWins, setEditWins] = useState(0);
  const [editDraws, setEditDraws] = useState(0);
  const [editLosses, setEditLosses] = useState(0);
  const [editGA, setEditGA] = useState(0);
  const [editPoints, setEditPoints] = useState(0);
  const [editError, setEditError] = useState('');
  const [savingClub, setSavingClub] = useState(false);

  const visibleLeagues = useMemo(
    () => filterLeaguesAndClubs(leagues, selectedLeagueFilter, clubSearch),
    [leagues, selectedLeagueFilter, clubSearch]
  );

  // Map registered players per club name (case-insensitive)
  const playersByClubLower = useMemo(() => {
    const map = new Map<string, PlayerRecord[]>();
    for (const p of players) {
      const key = p.club.trim().toLowerCase();
      const arr = map.get(key) ?? [];
      arr.push(p);
      map.set(key, arr);
    }
    return map;
  }, [players]);

  // Resolve currently selected club across all 4 divisions
  const selectedClubDetails = useMemo(() => {
    if (!selectedClubKey) return null;
    const [leagueId, clubId] = selectedClubKey.split(':');
    const league = leagues.find((l) => l.id === leagueId);
    if (!league) return null;
    const idx = league.clubs.findIndex((c) => c.id === clubId);
    if (idx === -1) return null;
    const club = league.clubs[idx];
    const rank = idx + 1;
    const zoneInfo = getStandingZoneInfo(rank, league.clubs.length);
    const squad = playersByClubLower.get(club.name.toLowerCase()) ?? [];
    return { league, club, rank, zoneInfo, squad };
  }, [leagues, playersByClubLower, selectedClubKey]);

  const openMatchModal = (league: LeagueDivision) => {
    if (!canManageStandings) return;
    setMatchModalLeagueId(league.id);
    setHomeClubId(league.clubs[0]?.id ?? '');
    setAwayClubId(league.clubs[1]?.id ?? '');
    setHomeGoals(0);
    setAwayGoals(0);
    setMatchError('');
  };

  const openEditClubModal = (league: LeagueDivision, club: ClubStandingRecord) => {
    if (!canManageStandings) return;
    setEditingClub({ league, club });
    setEditWins(club.wins);
    setEditDraws(club.draws);
    setEditLosses(club.losses);
    setEditGA(club.goalsAgainst);
    setEditPoints(club.points);
    setEditError('');
  };

  const handleMatchSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!matchModalLeagueId) return;
    if (!homeClubId || !awayClubId) {
      setMatchError('Select both a home and away club.');
      return;
    }
    if (homeClubId === awayClubId) {
      setMatchError('Home and away clubs must be different teams.');
      return;
    }
    setSubmittingMatch(true);
    setMatchError('');
    try {
      await onLogMatch(matchModalLeagueId, homeClubId, awayClubId, homeGoals, awayGoals);
      setMatchModalLeagueId(null);
    } catch (err) {
      setMatchError(err instanceof Error ? err.message : 'Failed recording match result.');
    } finally {
      setSubmittingMatch(false);
    }
  };

  const handleClubEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingClub) return;
    setSavingClub(true);
    setEditError('');
    try {
      await onUpdateClubStanding(editingClub.league.id, editingClub.club.id, {
        wins: editWins,
        draws: editDraws,
        losses: editLosses,
        goalsFor: editingClub.club.goalsFor,
        goalsAgainst: editGA,
        points: editPoints,
      });
      setEditingClub(null);
    } catch (err) {
      setEditError(err instanceof Error ? err.message : 'Failed updating club standing.');
    } finally {
      setSavingClub(false);
    }
  };

  const activeMatchLeague = useMemo(
    () => (matchModalLeagueId ? leagues.find((l) => l.id === matchModalLeagueId) ?? null : null),
    [leagues, matchModalLeagueId]
  );

  const isSingleDivisionFocus = visibleLeagues.length === 1 && selectedLeagueFilter !== 'all';

  return (
    <section
      id="rff-league-standings"
      aria-labelledby="rff-standings-heading"
      className="space-y-4"
    >
      {/* Broadcast Section Header + Search + Division Filter + Admin-Only Controls */}
      <div className="p-4 sm:p-5 rounded-xl bg-[#0b0f18]/95 border border-white/10 space-y-4">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div className="flex items-center gap-4 min-w-0">
            <button
              type="button"
              onClick={() =>
                setLightboxAsset({
                  title: 'Roblox Football Federation',
                  subtitle: 'Official Federation Seal · High-Resolution Emblem',
                  src: RFF_FEDERATION_LOGO_URL,
                  fallbackCode: 'RFF',
                })
              }
              aria-label="Inspect RFF Federation Official 4K Seal"
              title="Click to inspect full-resolution RFF Seal"
              className="w-14 h-14 sm:w-16 sm:h-16 rounded-xl bg-[#070a11] border border-white/15 hover:border-crimson p-1.5 flex items-center justify-center shrink-0 transition-colors cursor-pointer"
            >
              <BadgeImage
                src={RFF_FEDERATION_LOGO_URL}
                alt="Roblox Football Federation Official Seal"
                fallbackCode="RFF"
                testId="rff-league-header-image"
                imgClassName="w-full h-full object-contain drop-shadow"
                fallbackClassName="w-full h-full text-sm"
              />
            </button>

            <div className="min-w-0">
              <p className="text-[11px] font-mono text-ember tracking-wide">
                {sectionIndex} Roblox Football Federation · 4 Separate Leagues · 32 Clubs
              </p>
              <h2
                id="rff-standings-heading"
                className="font-display text-xl sm:text-2xl font-bold text-white tracking-wide text-balance"
              >
                RFF LEAGUE STANDING
              </h2>
              {session.authenticated && !canManageStandings && (
                <p className="text-[11px] font-mono text-mist mt-0.5 flex items-center gap-1">
                  <Lock className="w-3 h-3 text-amber-400 shrink-0" aria-hidden="true" />
                  <span>
                    Read-only for your current staff role — League Standings permission required to edit.
                  </span>
                </p>
              )}
            </div>
          </div>

          <div className="flex flex-wrap sm:flex-nowrap items-center gap-2.5 w-full lg:w-auto">
            <div className="relative flex-1 sm:w-56">
              <label htmlFor="rff-club-search" className="sr-only">
                Search RFF clubs or divisions
              </label>
              <Search
                className="w-3.5 h-3.5 text-mist absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none"
                aria-hidden="true"
              />
              <input
                id="rff-club-search"
                type="search"
                value={clubSearch}
                onChange={(e) => setClubSearch(e.target.value)}
                placeholder="Search 32 clubs..."
                className="w-full pl-9 pr-3 py-2 rounded-lg bg-[#070a11] border border-white/12 text-xs text-white placeholder:text-mist focus:outline-none focus:border-crimson transition-colors"
              />
            </div>

            {canManageStandings && leagues[0] && (
              <>
                <button
                  type="button"
                  onClick={() => {
                    const targetLeague =
                      selectedClubDetails?.league ??
                      leagues.find((l) => l.id === selectedLeagueFilter) ??
                      leagues[0];
                    const targetClub =
                      selectedClubDetails?.club ?? targetLeague.clubs[0];
                    if (targetClub) openEditClubModal(targetLeague, targetClub);
                  }}
                  className="px-3.5 py-2 rounded-lg bg-white/10 hover:bg-white/18 border border-white/15 text-white text-xs font-medium transition-colors flex items-center gap-1.5 whitespace-nowrap shrink-0 cursor-pointer"
                >
                  <Edit3 className="w-3.5 h-3.5" aria-hidden="true" />
                  <span>Edit Standings</span>
                </button>
                <button
                  type="button"
                  onClick={() =>
                    openMatchModal(
                      leagues.find((l) => l.id === selectedLeagueFilter) ?? leagues[0]
                    )
                  }
                  className="px-3.5 py-2 rounded-lg bg-crimson hover:bg-ember text-white text-xs font-medium transition-colors flex items-center gap-1.5 whitespace-nowrap shrink-0 cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5" aria-hidden="true" />
                  <span>Log Match</span>
                </button>
              </>
            )}
          </div>
        </div>

        {/* Division Filter Bar */}
        <div
          role="tablist"
          aria-label="Filter RFF League Divisions"
          className="flex items-center gap-2 overflow-x-auto pt-3 border-t border-white/8"
        >
          <button
            type="button"
            role="tab"
            aria-selected={selectedLeagueFilter === 'all'}
            onClick={() => setSelectedLeagueFilter('all')}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-medium transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
              selectedLeagueFilter === 'all'
                ? 'bg-crimson text-white font-semibold'
                : 'bg-white/5 text-fog hover:text-white hover:bg-white/10'
            }`}
          >
            All 4 Divisions
          </button>

          {leagues.map((league) => {
            const active = selectedLeagueFilter === league.id;
            return (
              <button
                key={league.id}
                type="button"
                role="tab"
                aria-selected={active}
                onClick={() => setSelectedLeagueFilter(league.id)}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors whitespace-nowrap shrink-0 flex items-center gap-2 cursor-pointer ${
                  active
                    ? 'bg-white/15 border border-white/30 text-white font-semibold'
                    : 'bg-white/[0.04] border border-transparent text-fog hover:text-white hover:bg-white/10'
                }`}
              >
                <BadgeImage
                  src={league.logoUrl}
                  alt=""
                  fallbackCode={league.name.slice(0, 2).toUpperCase()}
                  imgClassName="w-5 h-5 object-contain shrink-0"
                  fallbackClassName="w-5 h-5 text-[9px]"
                />
                <span>{league.name}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Interactive Selected Club Spotlight Drawer */}
      <AnimatePresence initial={false}>
        {selectedClubDetails && (
          <motion.div
            key={`${selectedClubDetails.league.id}:${selectedClubDetails.club.id}`}
            initial={{ opacity: 0, y: -4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -4 }}
            transition={{ duration: 0.16 }}
            className="p-4 sm:p-5 rounded-xl bg-[#0d1320]/95 border border-white/15 flex flex-col lg:flex-row lg:items-center justify-between gap-4"
          >
            <div className="flex items-center gap-4 min-w-0">
              <button
                type="button"
                onClick={() =>
                  setLightboxAsset({
                    title: selectedClubDetails.club.name,
                    subtitle: `${selectedClubDetails.league.name} · Official 4K Club Emblem`,
                    src: selectedClubDetails.club.logoUrl,
                    fallbackCode: selectedClubDetails.club.shortCode,
                  })
                }
                aria-label={`View 4K crest for ${selectedClubDetails.club.name}`}
                title="Click to inspect full 4K club crest"
                className="w-16 h-16 rounded-xl bg-[#070a11] border border-white/15 hover:border-crimson p-2 flex items-center justify-center shrink-0 transition-colors cursor-pointer"
              >
                <BadgeImage
                  src={selectedClubDetails.club.logoUrl}
                  alt={`${selectedClubDetails.club.name} emblem`}
                  fallbackCode={selectedClubDetails.club.shortCode}
                  imgClassName="w-full h-full object-contain drop-shadow"
                  fallbackClassName="w-full h-full text-xs"
                />
              </button>

              <div className="min-w-0 space-y-0.5">
                <div className="flex flex-wrap items-center gap-2 text-xs font-mono tabular-nums">
                  <span className={ZONE_RANK_TEXT[selectedClubDetails.zoneInfo.zone]}>
                    #{selectedClubDetails.rank} {selectedClubDetails.zoneInfo.label}
                  </span>
                  <span className="text-white/25" aria-hidden="true">·</span>
                  <span className="text-fog">{selectedClubDetails.league.name}</span>
                  <span className="text-white/25" aria-hidden="true">·</span>
                  <span className="text-white">
                    {selectedClubDetails.club.points} PTS · {selectedClubDetails.club.wins}W · {selectedClubDetails.club.draws}D · {selectedClubDetails.club.losses}L · {selectedClubDetails.club.goalsAgainst} G/A
                  </span>
                </div>

                <h3 className="font-display text-lg sm:text-xl font-bold text-white truncate">
                  {selectedClubDetails.club.name}
                </h3>

                <p className="text-xs text-fog">
                  {selectedClubDetails.squad.length > 0
                    ? `${selectedClubDetails.squad.length} contracted RFF² ${
                        selectedClubDetails.squad.length === 1 ? 'athlete' : 'athletes'
                      } on registry`
                    : 'Pre-Season squad open — Admins & Moderators can assign players via Staff Login'}
                </p>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2 shrink-0">
              {selectedClubDetails.squad.slice(0, 3).map((athlete) => (
                <button
                  key={athlete.id}
                  type="button"
                  onClick={() => onSelectPlayer(athlete)}
                  className="px-3 py-1.5 rounded-lg bg-[#070a11] border border-white/15 hover:border-gold text-xs text-white flex items-center gap-2 transition-colors whitespace-nowrap shrink-0 cursor-pointer"
                >
                  <AvatarImage
                    src={athlete.avatarUrl}
                    username={athlete.username}
                    isFounder={athlete.isFounder}
                    sizeClass="w-5 h-5 rounded-md"
                    textClass="text-[9px]"
                  />
                  <span className="font-medium">@{athlete.username}</span>
                </button>
              ))}

              <button
                type="button"
                onClick={() =>
                  setLightboxAsset({
                    title: selectedClubDetails.club.name,
                    subtitle: `${selectedClubDetails.league.name} · Official 4K Club Emblem`,
                    src: selectedClubDetails.club.logoUrl,
                    fallbackCode: selectedClubDetails.club.shortCode,
                  })
                }
                className="px-3 py-1.5 rounded-lg bg-white/10 hover:bg-white/18 border border-white/15 text-white text-xs font-medium flex items-center gap-1.5 whitespace-nowrap shrink-0 transition-colors cursor-pointer"
              >
                <Maximize2 className="w-3.5 h-3.5" aria-hidden="true" />
                <span>View 4K Crest</span>
              </button>

              {canManageStandings && (
                <button
                  type="button"
                  onClick={() =>
                    openEditClubModal(selectedClubDetails.league, selectedClubDetails.club)
                  }
                  className="px-3 py-1.5 rounded-lg bg-crimson/90 hover:bg-crimson text-white text-xs font-medium flex items-center gap-1.5 whitespace-nowrap shrink-0 transition-colors cursor-pointer"
                >
                  <Edit3 className="w-3.5 h-3.5" aria-hidden="true" />
                  <span>Edit W / D / L / G/A / PTS</span>
                </button>
              )}

              {onFilterRosterByClub && (
                <button
                  type="button"
                  onClick={() => onFilterRosterByClub(selectedClubDetails.club.name)}
                  className="px-3 py-1.5 rounded-lg bg-white/10 hover:bg-white/18 text-white text-xs font-medium flex items-center gap-1.5 whitespace-nowrap shrink-0 transition-colors cursor-pointer"
                >
                  <Users className="w-3.5 h-3.5" aria-hidden="true" />
                  <span>Club Roster</span>
                  <ArrowUpRight className="w-3.5 h-3.5" aria-hidden="true" />
                </button>
              )}

              <button
                type="button"
                onClick={() => setSelectedClubKey(null)}
                aria-label="Close club spotlight"
                className="p-2 rounded-lg bg-white/5 hover:bg-white/15 text-mist hover:text-white transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" aria-hidden="true" />
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Empty Search State */}
      {visibleLeagues.length === 0 ? (
        <div className="p-10 rounded-xl bg-[#0b0f18]/95 border border-white/10 text-center space-y-3">
          <Shield className="w-8 h-8 text-mist mx-auto" aria-hidden="true" />
          <p className="font-display text-lg font-semibold text-white">
            No clubs match &ldquo;{clubSearch}&rdquo;
          </p>
          <p className="text-xs text-fog max-w-md mx-auto">
            Try searching for another club name across the 4 official RFF divisions, or clear your search filter.
          </p>
          <button
            type="button"
            onClick={() => {
              setClubSearch('');
              setSelectedLeagueFilter('all');
            }}
            className="px-4 py-2 rounded-lg bg-crimson hover:bg-ember text-white text-xs font-medium transition-colors cursor-pointer"
          >
            Reset Filter
          </button>
        </div>
      ) : (
        /* 4-Column Side-by-Side Broadcast League Standings Board */
        <div
          className={
            isSingleDivisionFocus
              ? 'max-w-3xl mx-auto'
              : 'grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4 items-stretch'
          }
        >
          {visibleLeagues.map((league) => {
            const fullLeague = leagues.find((l) => l.id === league.id) ?? league;
            const totalClubsInLeague = fullLeague.clubs.length;

            return (
              <article
                key={league.id}
                data-testid={`league-card-${league.id}`}
                aria-labelledby={`heading-${league.id}`}
                className="rounded-xl bg-[#0b0f18]/95 border border-white/10 flex flex-col justify-between overflow-hidden shadow-lg"
              >
                <div>
                  {/* Card Top Header: Official 4K League Emblem + Bold Tracked League Name */}
                  <div className="px-3.5 py-3 border-b border-white/10 bg-[#0e1320] min-h-[76px] flex items-center justify-between gap-2.5">
                    <button
                      type="button"
                      onClick={() =>
                        setLightboxAsset({
                          title: league.name,
                          subtitle: `${league.regionLabel} · Official 4K Division Emblem`,
                          src: league.logoUrl,
                          fallbackCode: league.name.slice(0, 3).toUpperCase(),
                        })
                      }
                      aria-label={`Inspect ${league.name} 4K league emblem`}
                      title={`Click to view ${league.name} 4K emblem`}
                      className="w-11 h-11 rounded-lg bg-white/[0.03] hover:bg-white/[0.08] border border-white/10 p-1 flex items-center justify-center shrink-0 transition-colors cursor-pointer"
                    >
                      <BadgeImage
                        src={league.logoUrl}
                        alt={`${league.name} Official League Emblem`}
                        fallbackCode={league.name.slice(0, 3).toUpperCase()}
                        testId={`league-logo-${league.id}`}
                        imgClassName="w-full h-full object-contain drop-shadow"
                        fallbackClassName="w-9 h-9 text-[10px]"
                      />
                    </button>

                    <h3
                      id={`heading-${league.id}`}
                      className="font-display text-xs sm:text-[13px] leading-[1.2] font-bold uppercase tracking-[0.05em] text-white text-center flex-1"
                    >
                      {league.name}
                    </h3>

                    {canManageStandings ? (
                      <div className="flex items-center gap-1 shrink-0">
                        <button
                          type="button"
                          onClick={() => openMatchModal(fullLeague)}
                          aria-label={`Log match in ${league.name}`}
                          title={`Log match in ${league.name}`}
                          className="p-1.5 rounded-md bg-white/8 hover:bg-crimson text-white transition-colors cursor-pointer"
                        >
                          <Plus className="w-3.5 h-3.5" aria-hidden="true" />
                        </button>
                        <button
                          type="button"
                          onClick={() => void onResetLeague(league.id)}
                          aria-label={`Reset ${league.name} standings`}
                          title={`Reset ${league.name} standings`}
                          className="p-1.5 rounded-md bg-white/5 hover:bg-white/15 text-mist hover:text-white transition-colors cursor-pointer"
                        >
                          <RotateCcw className="w-3 h-3" aria-hidden="true" />
                        </button>
                      </div>
                    ) : (
                      <div className="w-4 shrink-0" aria-hidden="true" />
                    )}
                  </div>

                  {/* Standings Table: # | TEAM | W | D | L | G/A | PTS */}
                  <table className="w-full table-fixed text-left border-collapse tabular-nums">
                    <thead>
                      <tr className="border-b border-white/10 bg-[#080c14] text-[10px] font-mono uppercase tracking-wider text-mist">
                        <th scope="col" className="w-[24px] py-2 pl-2 pr-0.5 text-center font-medium">
                          #
                        </th>
                        <th scope="col" className="py-2 px-1.5 text-left font-medium">
                          TEAM
                        </th>
                        <th scope="col" className="w-[22px] py-2 px-0.5 text-center font-medium">
                          W
                        </th>
                        <th scope="col" className="w-[22px] py-2 px-0.5 text-center font-medium">
                          D
                        </th>
                        <th scope="col" className="w-[22px] py-2 px-0.5 text-center font-medium">
                          L
                        </th>
                        <th scope="col" className="w-[30px] py-2 px-0.5 text-center font-medium">
                          G/A
                        </th>
                        <th scope="col" className="w-[32px] py-2 pl-0.5 pr-2.5 text-right font-medium">
                          PTS
                        </th>
                      </tr>
                    </thead>

                    <tbody className="divide-y divide-white/[0.06]">
                      {league.clubs.map((club) => {
                        const pos = fullLeague.clubs.findIndex((c) => c.id === club.id) + 1;
                        const zoneInfo = getStandingZoneInfo(pos, totalClubsInLeague);
                        const compositeKey = `${league.id}:${club.id}`;
                        const isSelected = selectedClubKey === compositeKey;

                        return (
                          <tr
                            key={club.id}
                            onClick={() =>
                              setSelectedClubKey((prev) =>
                                prev === compositeKey ? null : compositeKey
                              )
                            }
                            className={`h-[44px] transition-colors cursor-pointer ${
                              isSelected
                                ? 'bg-white/[0.12] ring-1 ring-inset ring-white/30'
                                : ZONE_ROW_BG[zoneInfo.zone]
                            }`}
                          >
                            <td
                              className={`py-1.5 pl-2 pr-0.5 text-center font-mono text-[11px] ${ZONE_RANK_TEXT[zoneInfo.zone]}`}
                            >
                              {pos}
                            </td>

                            <td className="py-1.5 px-1.5 min-w-0">
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setSelectedClubKey((prev) =>
                                    prev === compositeKey ? null : compositeKey
                                  );
                                }}
                                aria-pressed={isSelected}
                                title={`${club.name} (${zoneInfo.label})`}
                                className="w-full flex items-center gap-2 min-w-0 text-left focus-visible:outline-1 focus-visible:outline-crimson rounded cursor-pointer"
                              >
                                <BadgeImage
                                  src={club.logoUrl}
                                  alt={`${club.name} crest`}
                                  fallbackCode={club.shortCode}
                                  testId={`table-crest-${club.id}`}
                                  imgClassName={`${
                                    isSingleDivisionFocus ? 'w-8 h-8' : 'w-7 h-7'
                                  } object-contain shrink-0 drop-shadow-xs`}
                                  fallbackClassName="w-7 h-7 text-[8px] shrink-0"
                                />
                                <span
                                  className={`${
                                    isSingleDivisionFocus ? 'text-sm' : 'text-xs'
                                  } font-medium text-white truncate`}
                                >
                                  {club.name}
                                </span>
                              </button>
                            </td>

                            <td className="py-1.5 px-0.5 text-center font-mono text-[11px] text-fog">
                              {club.wins}
                            </td>
                            <td className="py-1.5 px-0.5 text-center font-mono text-[11px] text-fog">
                              {club.draws}
                            </td>
                            <td className="py-1.5 px-0.5 text-center font-mono text-[11px] text-fog">
                              {club.losses}
                            </td>
                            <td className="py-1.5 px-0.5 text-center font-mono text-[11px] text-fog">
                              {club.goalsAgainst}
                            </td>
                            <td
                              className={`py-1.5 pl-0.5 pr-2.5 text-right font-mono text-[11.5px] ${ZONE_PTS_TEXT[zoneInfo.zone]}`}
                            >
                              {club.points}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>

                {/* Card Bottom Zone Legend */}
                <div className="px-3 py-2.5 border-t border-white/10 bg-[#080b12] space-y-1 text-[8.5px] font-mono uppercase tracking-[0.03em] text-mist">
                  <div className="flex items-center justify-between gap-1.5 whitespace-nowrap">
                    <span>
                      <strong className="text-cyan-400 font-semibold">1-2</strong> COUPE DES CHAMPIONS
                    </span>
                    <span>
                      <strong className="text-amber-300 font-semibold">3-4</strong> COUPE D&apos;EUROPA
                    </span>
                  </div>
                  <div className="text-center text-mist/85 whitespace-nowrap">
                    <strong className="text-rose-400 font-semibold">
                      {Math.max(1, totalClubsInLeague - 1)}-{totalClubsInLeague}
                    </strong>{' '}
                    RELEGATION
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      )}

      {/* Admin-Only Modal 1: Log Intra-League Match Result */}
      <AnimatePresence>
        {canManageStandings && activeMatchLeague && (
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="log-match-modal-title"
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm"
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.96, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.96, y: 8 }}
              transition={{ duration: 0.16 }}
              className="w-full max-w-lg rounded-2xl surface-modal border border-white/15 p-6 space-y-5 shadow-2xl"
            >
              <div className="flex items-start justify-between gap-4">
                <div className="flex items-center gap-3">
                  <Trophy className="w-5 h-5 text-gold shrink-0" aria-hidden="true" />
                  <div>
                    <h3
                      id="log-match-modal-title"
                      className="font-display text-xl font-bold text-white"
                    >
                      Log Official League Result (Admin Only)
                    </h3>
                    <p className="text-xs text-fog">
                      Fixtures are strictly intra-division — clubs from separate leagues never mix.
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setMatchModalLeagueId(null)}
                  aria-label="Close match logger"
                  className="p-1.5 rounded-lg text-mist hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
                >
                  <X className="w-4 h-4" aria-hidden="true" />
                </button>
              </div>

              <form onSubmit={handleMatchSubmit} className="space-y-4">
                <div>
                  <label
                    htmlFor="match-league-select"
                    className="block text-xs font-mono text-fog mb-1.5"
                  >
                    Select RFF Division
                  </label>
                  <select
                    id="match-league-select"
                    value={activeMatchLeague.id}
                    onChange={(e) => {
                      const nextLeague = leagues.find((l) => l.id === e.target.value);
                      if (nextLeague) openMatchModal(nextLeague);
                    }}
                    className="w-full px-3.5 py-2.5 rounded-lg bg-ink border border-white/15 text-sm text-white focus:outline-none focus:border-crimson"
                  >
                    {leagues.map((l) => (
                      <option key={l.id} value={l.id}>
                        {l.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label htmlFor="match-home-club" className="block text-xs font-mono text-fog">
                      Home Club
                    </label>
                    <select
                      id="match-home-club"
                      value={homeClubId}
                      onChange={(e) => setHomeClubId(e.target.value)}
                      className="w-full px-3 py-2 rounded-lg bg-ink border border-white/15 text-sm text-white focus:outline-none focus:border-crimson"
                    >
                      {activeMatchLeague.clubs.map((c) => (
                        <option key={c.id} value={c.id}>
                          {c.name}
                        </option>
                      ))}
                    </select>
                    <label htmlFor="match-home-goals" className="block text-xs font-mono text-mist">
                      Home Goals
                    </label>
                    <input
                      id="match-home-goals"
                      type="number"
                      min={0}
                      max={99}
                      value={homeGoals}
                      onChange={(e) => setHomeGoals(Math.max(0, Number(e.target.value) || 0))}
                      className="w-full px-3 py-2 rounded-lg bg-ink border border-white/15 text-sm font-mono text-white tabular-nums focus:outline-none focus:border-crimson"
                    />
                  </div>

                  <div className="space-y-2">
                    <label htmlFor="match-away-club" className="block text-xs font-mono text-fog">
                      Away Club
                    </label>
                    <select
                      id="match-away-club"
                      value={awayClubId}
                      onChange={(e) => setAwayClubId(e.target.value)}
                      className="w-full px-3 py-2 rounded-lg bg-ink border border-white/15 text-sm text-white focus:outline-none focus:border-crimson"
                    >
                      {activeMatchLeague.clubs.map((c) => (
                        <option key={c.id} value={c.id}>
                          {c.name}
                        </option>
                      ))}
                    </select>
                    <label htmlFor="match-away-goals" className="block text-xs font-mono text-mist">
                      Away Goals
                    </label>
                    <input
                      id="match-away-goals"
                      type="number"
                      min={0}
                      max={99}
                      value={awayGoals}
                      onChange={(e) => setAwayGoals(Math.max(0, Number(e.target.value) || 0))}
                      className="w-full px-3 py-2 rounded-lg bg-ink border border-white/15 text-sm font-mono text-white tabular-nums focus:outline-none focus:border-crimson"
                    />
                  </div>
                </div>

                {matchError && (
                  <p role="alert" className="text-xs font-mono text-ember">
                    {matchError}
                  </p>
                )}

                <div className="flex items-center justify-end gap-3 pt-2">
                  <button
                    type="button"
                    onClick={() => setMatchModalLeagueId(null)}
                    className="px-4 py-2 rounded-lg bg-white/8 hover:bg-white/15 text-xs font-medium text-fog hover:text-white transition-colors cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={submittingMatch}
                    className="px-5 py-2 rounded-lg bg-crimson hover:bg-ember disabled:opacity-50 text-xs font-medium text-white transition-colors cursor-pointer"
                  >
                    {submittingMatch ? 'Saving...' : 'Save Match Result'}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Admin-Only Modal 2: Edit Individual Club Standings (W, D, L, G/A, PTS) */}
      <AnimatePresence>
        {canManageStandings && editingClub && (
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="edit-club-modal-title"
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm"
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.96, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.96, y: 8 }}
              transition={{ duration: 0.16 }}
              className="w-full max-w-md rounded-2xl surface-modal border border-white/15 p-6 space-y-5 shadow-2xl"
            >
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-3 min-w-0">
                  <BadgeImage
                    src={editingClub.club.logoUrl}
                    alt={editingClub.club.name}
                    fallbackCode={editingClub.club.shortCode}
                    imgClassName="w-11 h-11 object-contain shrink-0"
                    fallbackClassName="w-11 h-11 text-xs"
                  />
                  <div className="min-w-0">
                    <h3
                      id="edit-club-modal-title"
                      className="font-display text-lg font-bold text-white truncate"
                    >
                      Edit Standings (Admin Only)
                    </h3>
                    <p className="text-xs font-mono text-mist truncate">
                      {editingClub.club.name} · {editingClub.league.name}
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setEditingClub(null)}
                  aria-label="Close club editor"
                  className="p-1.5 rounded-lg text-mist hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
                >
                  <X className="w-4 h-4" aria-hidden="true" />
                </button>
              </div>

              <form onSubmit={handleClubEditSubmit} className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label
                      htmlFor="club-edit-league"
                      className="block text-xs font-mono text-fog mb-1"
                    >
                      Division
                    </label>
                    <select
                      id="club-edit-league"
                      value={editingClub.league.id}
                      onChange={(e) => {
                        const nextLeague = leagues.find((l) => l.id === e.target.value);
                        if (nextLeague && nextLeague.clubs[0]) {
                          openEditClubModal(nextLeague, nextLeague.clubs[0]);
                        }
                      }}
                      className="w-full px-3 py-2 rounded-lg bg-ink border border-white/15 text-xs text-white"
                    >
                      {leagues.map((l) => (
                        <option key={l.id} value={l.id}>
                          {l.name}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label
                      htmlFor="club-edit-select"
                      className="block text-xs font-mono text-fog mb-1"
                    >
                      Club
                    </label>
                    <select
                      id="club-edit-select"
                      value={editingClub.club.id}
                      onChange={(e) => {
                        const currentLeague =
                          leagues.find((l) => l.id === editingClub.league.id) ??
                          editingClub.league;
                        const nextClub = currentLeague.clubs.find(
                          (c) => c.id === e.target.value
                        );
                        if (nextClub) openEditClubModal(currentLeague, nextClub);
                      }}
                      className="w-full px-3 py-2 rounded-lg bg-ink border border-white/15 text-xs text-white"
                    >
                      {(
                        leagues.find((l) => l.id === editingClub.league.id) ??
                        editingClub.league
                      ).clubs.map((c) => (
                        <option key={c.id} value={c.id}>
                          {c.name}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-3">
                  <div>
                    <label htmlFor="club-edit-w" className="block text-xs font-mono text-fog mb-1">
                      Wins (W)
                    </label>
                    <input
                      id="club-edit-w"
                      type="number"
                      min={0}
                      value={editWins}
                      onChange={(e) => {
                        const nextW = Math.max(0, Number(e.target.value) || 0);
                        setEditWins(nextW);
                        setEditPoints(nextW * 3 + editDraws);
                      }}
                      className="w-full px-3 py-2 rounded-lg bg-ink border border-white/15 text-sm font-mono text-white tabular-nums"
                    />
                  </div>
                  <div>
                    <label htmlFor="club-edit-d" className="block text-xs font-mono text-fog mb-1">
                      Draws (D)
                    </label>
                    <input
                      id="club-edit-d"
                      type="number"
                      min={0}
                      value={editDraws}
                      onChange={(e) => {
                        const nextD = Math.max(0, Number(e.target.value) || 0);
                        setEditDraws(nextD);
                        setEditPoints(editWins * 3 + nextD);
                      }}
                      className="w-full px-3 py-2 rounded-lg bg-ink border border-white/15 text-sm font-mono text-white tabular-nums"
                    />
                  </div>
                  <div>
                    <label htmlFor="club-edit-l" className="block text-xs font-mono text-fog mb-1">
                      Losses (L)
                    </label>
                    <input
                      id="club-edit-l"
                      type="number"
                      min={0}
                      value={editLosses}
                      onChange={(e) => setEditLosses(Math.max(0, Number(e.target.value) || 0))}
                      className="w-full px-3 py-2 rounded-lg bg-ink border border-white/15 text-sm font-mono text-white tabular-nums"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label htmlFor="club-edit-ga" className="block text-xs font-mono text-fog mb-1">
                      G/A
                    </label>
                    <input
                      id="club-edit-ga"
                      type="number"
                      min={0}
                      value={editGA}
                      onChange={(e) => setEditGA(Math.max(0, Number(e.target.value) || 0))}
                      className="w-full px-3 py-2 rounded-lg bg-ink border border-white/15 text-sm font-mono text-white tabular-nums"
                    />
                  </div>
                  <div>
                    <label htmlFor="club-edit-pts" className="block text-xs font-mono text-fog mb-1">
                      Points (PTS)
                    </label>
                    <input
                      id="club-edit-pts"
                      type="number"
                      min={0}
                      value={editPoints}
                      onChange={(e) => setEditPoints(Math.max(0, Number(e.target.value) || 0))}
                      className="w-full px-3 py-2 rounded-lg bg-ink border border-white/15 text-sm font-mono text-gold font-bold tabular-nums"
                    />
                  </div>
                </div>

                <p className="text-xs font-mono text-mist tabular-nums">
                  Preview: {editWins}W · {editDraws}D · {editLosses}L · {editGA} G/A · {editPoints} PTS
                </p>

                {editError && (
                  <p role="alert" className="text-xs font-mono text-ember">
                    {editError}
                  </p>
                )}

                <div className="flex items-center justify-end gap-3 pt-2">
                  <button
                    type="button"
                    onClick={() => setEditingClub(null)}
                    className="px-4 py-2 rounded-lg bg-white/8 hover:bg-white/15 text-xs font-medium text-fog hover:text-white transition-colors cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={savingClub}
                    className="px-5 py-2 rounded-lg bg-crimson hover:bg-ember disabled:opacity-50 text-xs font-medium text-white transition-colors cursor-pointer"
                  >
                    {savingClub ? 'Updating...' : 'Save Standings'}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* High-Resolution 4K Emblem Showcase Lightbox */}
      <AnimatePresence>
        {lightboxAsset && (
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="crest-lightbox-title"
            onClick={(e) => {
              if (e.target === e.currentTarget) setLightboxAsset(null);
            }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/82 backdrop-blur-md"
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.94, y: 12 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.96, y: 8 }}
              transition={{ duration: 0.16 }}
              className="w-full max-w-lg rounded-2xl surface-modal border border-white/15 p-6 space-y-5 shadow-2xl"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-[11px] font-mono text-ember tracking-wide">
                    {lightboxAsset.subtitle}
                  </p>
                  <h3
                    id="crest-lightbox-title"
                    className="font-display text-xl font-bold text-white truncate mt-0.5"
                  >
                    {lightboxAsset.title}
                  </h3>
                </div>
                <button
                  type="button"
                  onClick={() => setLightboxAsset(null)}
                  aria-label="Close 4K crest preview"
                  className="p-1.5 rounded-lg text-mist hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
                >
                  <X className="w-4 h-4" aria-hidden="true" />
                </button>
              </div>

              <div className="rounded-xl bg-radial from-white/[0.08] via-[#0b0f18] to-[#06080e] border border-white/10 p-6 flex items-center justify-center">
                <div className="w-60 h-60 sm:w-68 sm:h-68 flex items-center justify-center">
                  <BadgeImage
                    src={lightboxAsset.src}
                    alt={`${lightboxAsset.title} full-resolution emblem`}
                    fallbackCode={lightboxAsset.fallbackCode}
                    testId="crest-lightbox-image"
                    imgClassName="w-full h-full object-contain drop-shadow-2xl"
                    fallbackClassName="w-40 h-40 text-3xl"
                  />
                </div>
              </div>

              <div className="flex items-center justify-end">
                <button
                  type="button"
                  onClick={() => setLightboxAsset(null)}
                  className="px-4 py-2 rounded-lg bg-crimson hover:bg-ember text-xs font-medium text-white transition-colors cursor-pointer"
                >
                  Close Preview
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </section>
  );
}
