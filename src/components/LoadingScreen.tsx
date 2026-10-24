import { useEffect, useRef, useState } from 'react';
import { motion } from 'motion/react';
import { ArrowRight } from 'lucide-react';

interface LoadingScreenProps {
  athleteCount: number;
  onFinish: () => void;
}

export function LoadingScreen({ athleteCount, onFinish }: LoadingScreenProps) {
  const [progress, setProgress] = useState(0);
  const [imgFailed, setImgFailed] = useState(false);
  const barRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const start = performance.now();
    const durationMs = 1750;
    let rafId = 0;
    let doneTimer = 0;

    const tick = (now: number) => {
      const elapsed = now - start;
      const ratio = Math.min(1, elapsed / durationMs);
      const eased = 1 - Math.pow(1 - ratio, 3);
      if (barRef.current) {
        barRef.current.style.transform = `scaleX(${eased})`;
      }
      setProgress(Math.round(eased * 100));

      if (ratio < 1) {
        rafId = requestAnimationFrame(tick);
      } else {
        doneTimer = window.setTimeout(() => {
          onFinish();
        }, 200);
      }
    };

    rafId = requestAnimationFrame(tick);
    return () => {
      cancelAnimationFrame(rafId);
      if (doneTimer) window.clearTimeout(doneTimer);
    };
  }, [onFinish]);

  const stageLabel =
    progress < 38
      ? 'Initializing RFF² Pre-Season Registry...'
      : progress < 78
        ? `Syncing ${athleteCount} Roblox Profiles & Skill Ranks...`
        : 'Ready for Kick-Off';

  return (
    <motion.div
      role="status"
      aria-live="polite"
      aria-label="Loading RFF² Registry"
      data-testid="rff-loading-screen"
      initial={{ opacity: 1 }}
      exit={{ opacity: 0, scale: 1.02 }}
      transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
      className="fixed inset-0 z-[80] bg-ink flex flex-col justify-end items-center overflow-hidden select-none"
    >
      {/* Full-Viewport Crisp Loading Screen Background Image */}
      {!imgFailed ? (
        <motion.img
          src="/assets/aistudio/image_bab754d7.png"
          alt="RFF² Official Loading Screen Background"
          data-testid="loading-screen-image"
          referrerPolicy="no-referrer"
          onError={() => setImgFailed(true)}
          initial={{ scale: 1.04 }}
          animate={{ scale: 1 }}
          transition={{ duration: 1.9, ease: [0.16, 1, 0.3, 1] }}
          className="absolute inset-0 w-full h-full object-cover object-center pointer-events-none"
        />
      ) : (
        <div
          aria-hidden="true"
          className="absolute inset-0 bg-gradient-to-br from-blue-950 via-ink to-crimson/35 flex items-center justify-center pointer-events-none"
        >
          <span className="font-display text-6xl font-bold text-white tracking-tight">
            RFF²
          </span>
        </div>
      )}

      {/* Bottom-Only Contrast Scrim so the Center RFF Artwork Remains 100% Clear */}
      <div
        aria-hidden="true"
        className="absolute inset-x-0 bottom-0 h-56 bg-gradient-to-t from-black/90 via-black/45 to-transparent pointer-events-none"
      />

      {/* Sleek Bottom-Anchored Loading Bar & Enter Control */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
        className="relative z-10 w-full max-w-3xl px-6 pb-6 sm:pb-8 space-y-2.5"
      >
        <div className="flex flex-wrap sm:flex-nowrap items-end justify-between gap-4">
          <div className="min-w-0">
            <p className="text-xs font-mono text-blue-300 tracking-wide">
              Roblox Football Federation · Official Pre-Season Registry
            </p>
            <h1 className="font-display text-lg sm:text-xl font-semibold text-white tracking-tight mt-0.5 truncate">
              {stageLabel}
            </h1>
          </div>

          <div className="flex items-center gap-3 shrink-0">
            <span className="text-sm font-mono font-semibold text-white tabular-nums">
              {progress}%
            </span>
            <button
              type="button"
              onClick={onFinish}
              className="px-3.5 py-1.5 rounded-lg border border-white/20 bg-black/55 hover:bg-crimson hover:border-crimson text-xs font-mono text-white transition-colors flex items-center gap-1.5 whitespace-nowrap cursor-pointer backdrop-blur-sm"
            >
              <span>Enter Registry</span>
              <ArrowRight className="w-3.5 h-3.5" aria-hidden="true" />
            </button>
          </div>
        </div>

        {/* Compositor-Only Progress Track */}
        <div className="h-1.5 w-full rounded-full bg-white/20 overflow-hidden">
          <div
            ref={barRef}
            style={{ transform: 'scaleX(0)' }}
            className="h-full w-full bg-gradient-to-r from-blue-400 via-white to-amber-400 origin-left"
          />
        </div>
      </motion.div>
    </motion.div>
  );
}
