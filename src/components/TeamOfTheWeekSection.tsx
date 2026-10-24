import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { MouseEvent } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { ArrowUpRight, Flame, Trophy } from 'lucide-react';
import type { PlayerRecord, SiteConfig } from '../lib/types';
import { DEFAULT_SITE_CONFIG, getSkillRankInfo } from '../lib/hierarchy';
import { AvatarImage } from './AvatarImage';

interface TeamOfTheWeekSectionProps {
  players: PlayerRecord[];
  siteConfig?: SiteConfig;
  onSelectPlayer: (player: PlayerRecord) => void;
  sectionIndex?: string;
}

interface GoalBurst {
  id: number;
  xPercent: number;
  yPercent: number;
  count: number;
}

interface BurstParticle {
  id: number;
  dx: number;
  dy: number;
  rotate: number;
  scale: number;
  colorClass: string;
  shape: 'spark' | 'ribbon' | 'ball';
}

const PARTICLES_TEMPLATE: BurstParticle[] = [
  { id: 1, dx: -165, dy: -125, rotate: -140, scale: 1.15, colorClass: 'bg-gold', shape: 'spark' },
  { id: 2, dx: -110, dy: -168, rotate: 95, scale: 0.95, colorClass: 'bg-crimson', shape: 'ribbon' },
  { id: 3, dx: -38, dy: -185, rotate: 210, scale: 1.25, colorClass: 'bg-white', shape: 'ball' },
  { id: 4, dx: 46, dy: -178, rotate: -185, scale: 1.05, colorClass: 'bg-gold', shape: 'ribbon' },
  { id: 5, dx: 128, dy: -152, rotate: 155, scale: 1.1, colorClass: 'bg-ember', shape: 'spark' },
  { id: 6, dx: 178, dy: -98, rotate: -95, scale: 0.9, colorClass: 'bg-blue-400', shape: 'ribbon' },
  { id: 7, dx: 192, dy: -12, rotate: 130, scale: 1.15, colorClass: 'bg-gold', shape: 'spark' },
  { id: 8, dx: 156, dy: 86, rotate: 240, scale: 1.0, colorClass: 'bg-crimson', shape: 'ribbon' },
  { id: 9, dx: 82, dy: 144, rotate: -160, scale: 1.2, colorClass: 'bg-white', shape: 'spark' },
  { id: 10, dx: -12, dy: 158, rotate: 180, scale: 0.95, colorClass: 'bg-gold', shape: 'ribbon' },
  { id: 11, dx: -104, dy: 134, rotate: -210, scale: 1.1, colorClass: 'bg-ember', shape: 'spark' },
  { id: 12, dx: -176, dy: 64, rotate: 115, scale: 1.0, colorClass: 'bg-blue-400', shape: 'ribbon' },
  { id: 13, dx: -195, dy: -28, rotate: -125, scale: 1.15, colorClass: 'bg-gold', shape: 'spark' },
  { id: 14, dx: 115, dy: -58, rotate: 320, scale: 1.2, colorClass: 'bg-white', shape: 'ball' },
];

function playGoalCelebrationSound() {
  try {
    const AudioCtx =
      window.AudioContext ||
      (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!AudioCtx) return;
    const ctx = new AudioCtx();
    const now = ctx.currentTime;

    // Warm stadium chord + net impact thump
    const freqs = [220, 277.18, 329.63, 440];
    for (const freq of freqs) {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(freq, now);
      osc.frequency.exponentialRampToValueAtTime(freq * 1.015, now + 0.55);
      gain.gain.setValueAtTime(0.001, now);
      gain.gain.exponentialRampToValueAtTime(0.045, now + 0.04);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.65);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(now);
      osc.stop(now + 0.68);
    }

    setTimeout(() => {
      void ctx.close().catch(() => {});
    }, 800);
  } catch {
    // Ignore audio context restrictions cleanly
  }
}

export function TeamOfTheWeekSection({
  players,
  siteConfig = DEFAULT_SITE_CONFIG,
  onSelectPlayer,
  sectionIndex = '02.',
}: TeamOfTheWeekSectionProps) {
  const [goalCount, setGoalCount] = useState(0);
  const [activeBurst, setActiveBurst] = useState<GoalBurst | null>(null);
  const [heroImgFailed, setHeroImgFailed] = useState(false);
  const [crestImgFailed, setCrestImgFailed] = useState(false);
  const burstTimeoutRef = useRef<number | null>(null);
  const countRef = useRef(0);

  const clubName = siteConfig.totwClubName || DEFAULT_SITE_CONFIG.totwClubName;
  const playerUsername = (
    siteConfig.totwPlayerUsername || DEFAULT_SITE_CONFIG.totwPlayerUsername
  ).replace(/^@/, '');
  const heroImageUrl = siteConfig.totwHeroImageUrl || DEFAULT_SITE_CONFIG.totwHeroImageUrl;
  const crestImageUrl = siteConfig.totwCrestImageUrl || DEFAULT_SITE_CONFIG.totwCrestImageUrl;

  useEffect(() => {
    setHeroImgFailed(false);
  }, [heroImageUrl]);

  useEffect(() => {
    setCrestImgFailed(false);
  }, [crestImageUrl]);

  const spotlightPlayer = useMemo(
    () =>
      players.find((p) => p.username.toLowerCase() === playerUsername.toLowerCase()) ?? null,
    [players, playerUsername]
  );

  useEffect(() => {
    return () => {
      if (burstTimeoutRef.current !== null) {
        window.clearTimeout(burstTimeoutRef.current);
      }
    };
  }, []);

  const triggerGoalEffect = useCallback((e?: MouseEvent<HTMLButtonElement>) => {
    let xPercent = 50;
    let yPercent = 48;

    if (e && e.currentTarget && (e.clientX !== 0 || e.clientY !== 0)) {
      const rect = e.currentTarget.getBoundingClientRect();
      if (rect.width > 0 && rect.height > 0) {
        xPercent = Math.min(88, Math.max(12, ((e.clientX - rect.left) / rect.width) * 100));
        yPercent = Math.min(85, Math.max(15, ((e.clientY - rect.top) / rect.height) * 100));
      }
    }

    const nextCount = countRef.current + 1;
    countRef.current = nextCount;
    setGoalCount(nextCount);
    setActiveBurst({
      id: Date.now() + nextCount,
      xPercent,
      yPercent,
      count: nextCount,
    });

    playGoalCelebrationSound();

    if (burstTimeoutRef.current !== null) {
      window.clearTimeout(burstTimeoutRef.current);
    }
    burstTimeoutRef.current = window.setTimeout(() => {
      setActiveBurst(null);
    }, 2800);
  }, []);

  const skillInfo = spotlightPlayer
    ? getSkillRankInfo(spotlightPlayer.isFounder ? 'S' : spotlightPlayer.tier)
    : null;

  return (
    <section
      id="team-of-the-week"
      aria-labelledby="totw-heading"
      className="space-y-6"
    >
      {/* Editorial Section Header */}
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-xs font-mono text-gold tracking-wide">
            {sectionIndex} Pre-Season Club Spotlight · Team of the Week
          </p>
          <h2
            id="totw-heading"
            className="font-display text-2xl sm:text-3xl font-semibold text-white mt-1 text-balance"
          >
            Team of the Week — {clubName}
          </h2>
        </div>

        <p className="text-xs font-mono text-fog tabular-nums">
          Click the {clubName} graphic to trigger a Goal Celebration
          {goalCount > 0 ? ` · ${goalCount} ${goalCount === 1 ? 'Goal' : 'Goals'} Celebrated` : ''}
        </p>
      </div>

      {/* Main 12-Column Showcase Surface */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch p-6 sm:p-8 rounded-2xl surface-panel border border-gold/25">
        {/* Left Column (7 cols): Interactive Team of the Week Poster with Goal Celebration */}
        <div className="lg:col-span-7 flex flex-col justify-between gap-3">
          <button
            type="button"
            onClick={triggerGoalEffect}
            aria-label={`Trigger ${clubName} Goal Celebration`}
            data-testid="totw-goal-trigger"
            className="group relative w-full h-full min-h-[280px] sm:min-h-[380px] rounded-xl overflow-hidden border border-gold/35 bg-ink text-left cursor-pointer focus-visible:outline-2 focus-visible:outline-gold"
          >
            {!heroImgFailed ? (
              <motion.img
                src={heroImageUrl}
                alt={`${clubName} Team of the Week featuring ${playerUsername}`}
                data-testid="totw-hero-image"
                referrerPolicy="no-referrer"
                onError={() => setHeroImgFailed(true)}
                animate={
                  activeBurst
                    ? { scale: [1, 1.045, 1.015] }
                    : { scale: 1 }
                }
                transition={{ duration: 0.45, ease: [0.16, 1, 0.3, 1] }}
                className="w-full h-full object-cover object-center group-hover:scale-[1.02] transition-transform duration-300"
              />
            ) : (
              <div className="w-full h-full min-h-[320px] bg-gradient-to-br from-crimson/30 via-ink to-gold/20 flex flex-col items-center justify-center p-6 text-center">
                <Trophy className="w-12 h-12 text-gold mb-3" aria-hidden="true" />
                <span className="font-display text-2xl font-semibold text-white">
                  {clubName} · Team of the Week
                </span>
              </div>
            )}

            {/* Measured Bottom Contrast Scrim */}
            <div
              aria-hidden="true"
              className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/85 via-black/20 to-transparent"
            />

            {/* Bottom Interactive Caption Bar */}
            <div className="pointer-events-none absolute inset-x-0 bottom-0 p-4 sm:p-5 flex flex-wrap items-end justify-between gap-3">
              <div>
                <p className="text-xs font-mono text-gold">
                  Featured Pre-Season Contender · {clubName}
                </p>
                <p className="font-display text-lg sm:text-xl font-semibold text-white mt-0.5">
                  Offensive Spark: @{playerUsername}
                </p>
              </div>

              <span className="px-3 py-1.5 rounded-lg bg-black/75 border border-gold/40 text-xs font-mono text-gold group-hover:bg-gold group-hover:text-ink transition-colors tabular-nums">
                {goalCount > 0 ? `GOAL! ×${goalCount} · Click Again` : 'Click Image to Score!'}
              </span>
            </div>

            {/* Interactive GOAL! Stadium Celebration Overlay */}
            <AnimatePresence>
              {activeBurst && (
                <motion.div
                  key={activeBurst.id}
                  data-testid="totw-goal-overlay"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.2 }}
                  className="pointer-events-none absolute inset-0 z-20 overflow-hidden"
                >
                  {/* Stadium Spotlight Flash */}
                  <motion.div
                    initial={{ opacity: 0.75 }}
                    animate={{ opacity: 0 }}
                    transition={{ duration: 0.65, ease: 'easeOut' }}
                    className="absolute inset-0 bg-gradient-to-tr from-crimson/45 via-gold/45 to-white/30"
                  />

                  {/* Net Grid Shimmer */}
                  <motion.div
                    initial={{ opacity: 0.55, scale: 0.96 }}
                    animate={{ opacity: 0, scale: 1.06 }}
                    transition={{ duration: 0.9, ease: 'easeOut' }}
                    className="absolute inset-0 totw-net-pattern"
                  />

                  {/* Click-Origin Shockwave Rings & Particles */}
                  <div
                    style={{
                      left: `${activeBurst.xPercent}%`,
                      top: `${activeBurst.yPercent}%`,
                    }}
                    className="absolute -translate-x-1/2 -translate-y-1/2"
                  >
                    <motion.div
                      initial={{ scale: 0.15, opacity: 0.95 }}
                      animate={{ scale: 3.4, opacity: 0 }}
                      transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
                      className="w-28 h-28 rounded-full border-2 border-gold"
                    />
                    <motion.div
                      initial={{ scale: 0.1, opacity: 0.85 }}
                      animate={{ scale: 2.4, opacity: 0 }}
                      transition={{ duration: 0.65, delay: 0.06, ease: [0.16, 1, 0.3, 1] }}
                      className="absolute inset-0 w-28 h-28 rounded-full border-2 border-crimson"
                    />

                    {PARTICLES_TEMPLATE.map((pt) => (
                      <motion.span
                        key={pt.id}
                        initial={{ x: 0, y: 0, scale: 0.3, rotate: 0, opacity: 1 }}
                        animate={{
                          x: pt.dx,
                          y: pt.dy,
                          scale: pt.scale,
                          rotate: pt.rotate,
                          opacity: 0,
                        }}
                        transition={{ duration: 0.95, ease: [0.16, 1, 0.3, 1] }}
                        className={`absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 ${
                          pt.shape === 'ball'
                            ? 'w-4 h-4 rounded-full border-2 border-ink bg-white shadow-lg'
                            : pt.shape === 'ribbon'
                              ? `w-3.5 h-1.5 rounded-xs ${pt.colorClass}`
                              : `w-2.5 h-2.5 rounded-full ${pt.colorClass}`
                        }`}
                      />
                    ))}
                  </div>

                  {/* Center Broadcast GOAL! Banner */}
                  <div className="absolute inset-0 flex items-center justify-center p-4">
                    <motion.div
                      initial={{ scale: 0.65, y: 18, opacity: 0 }}
                      animate={{ scale: 1, y: 0, opacity: 1 }}
                      exit={{ scale: 0.92, y: -10, opacity: 0 }}
                      transition={{ type: 'spring', stiffness: 420, damping: 24 }}
                      className="px-7 py-4 rounded-2xl bg-ink/92 border-2 border-gold shadow-2xl text-center"
                    >
                      <p className="text-xs font-mono text-gold tracking-wide">
                        {clubName} · Clinical Finish
                      </p>
                      <p className="font-display text-4xl sm:text-5xl font-bold text-white tracking-tight mt-0.5">
                        GOAL!
                      </p>
                      <p className="text-xs font-mono text-fog mt-1 tabular-nums">
                        @{playerUsername} strikes again · Pre-Season Hype #{activeBurst.count}
                      </p>
                    </motion.div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </button>
        </div>

        {/* Right Column (5 cols): Official Club Crest + Editorial Story + Athlete Dossier Card */}
        <div className="lg:col-span-5 flex flex-col justify-between gap-5">
          {/* Top Club Identity Row */}
          <div className="flex items-center gap-4 pb-5 border-b border-white/10">
            <div className="w-18 h-18 sm:w-20 sm:h-20 rounded-xl bg-white/5 border border-white/10 p-2 flex items-center justify-center shrink-0">
              {!crestImgFailed ? (
                <img
                  src={crestImageUrl}
                  alt={`${clubName} Official Club Crest`}
                  data-testid="totw-crest-image"
                  referrerPolicy="no-referrer"
                  onError={() => setCrestImgFailed(true)}
                  className="w-full h-full object-contain drop-shadow-md"
                />
              ) : (
                <Flame className="w-8 h-8 text-crimson" aria-hidden="true" />
              )}
            </div>

            <div className="min-w-0">
              <p className="text-xs font-mono text-ember">
                Official RFF² Selection
              </p>
              <h3 className="font-display text-2xl font-semibold text-white truncate">
                {clubName}
              </h3>
              <p className="text-xs font-mono text-mist mt-0.5">
                Pre-Season Threat · Locked In Roster
              </p>
            </div>
          </div>

          {/* Editorial Copy */}
          <div className="space-y-3.5 text-sm sm:text-[15px] text-fog leading-relaxed">
            <p className="text-white/95 font-medium">
              {siteConfig.totwHeadlineParagraph}
            </p>
            <p>
              {siteConfig.totwBodyParagraph}
            </p>
            <p className="text-white font-medium">
              {siteConfig.totwClosingParagraph}
            </p>
          </div>

          {/* Interactive Registered Athlete Link */}
          {spotlightPlayer && (
            <div className="pt-4 border-t border-white/10 flex flex-wrap sm:flex-nowrap items-center justify-between gap-3">
              <div className="flex items-center gap-3 flex-1 min-w-0">
                <AvatarImage
                  src={spotlightPlayer.avatarUrl}
                  username={spotlightPlayer.username}
                  isFounder={spotlightPlayer.isFounder}
                  sizeClass="h-11 w-11 rounded-xl"
                  textClass="text-sm"
                />
                <div className="min-w-0">
                  <p className="font-display text-sm font-semibold text-white truncate">
                    @{spotlightPlayer.username}
                  </p>
                  <p className="text-xs font-mono text-mist tabular-nums truncate">
                    ID {spotlightPlayer.robloxId ?? '11741499280'} ·{' '}
                    {skillInfo ? skillInfo.label : 'D Rank'} · OVR {spotlightPlayer.rating}
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => onSelectPlayer(spotlightPlayer)}
                className="px-3.5 py-2 rounded-lg bg-crimson hover:bg-ember text-white text-xs font-medium transition-colors flex items-center gap-1.5 whitespace-nowrap shrink-0 cursor-pointer"
              >
                <span>Inspect @{spotlightPlayer.username}</span>
                <ArrowUpRight className="w-3.5 h-3.5" aria-hidden="true" />
              </button>
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
