import { useEffect, useState } from 'react';
import { AVATAR_REFRESH_INTERVAL_MS } from '../lib/rosterSeed';

interface AvatarImageProps {
  src?: string;
  username: string;
  isFounder?: boolean;
  sizeClass?: string;
  textClass?: string;
}

export function AvatarImage({
  src,
  username,
  isFounder = false,
  sizeClass = 'h-12 w-12 rounded-xl',
}: AvatarImageProps) {
  const [failed, setFailed] = useState(false);
  const [retryTick, setRetryTick] = useState(0);

  useEffect(() => {
    setFailed(false);
  }, [src]);

  useEffect(() => {
    if (!failed || !src || src.trim().length === 0) return;
    const timer = window.setInterval(() => {
      setFailed(false);
      setRetryTick((prev) => prev + 1);
    }, AVATAR_REFRESH_INTERVAL_MS);
    return () => window.clearInterval(timer);
  }, [failed, src]);

  const initial = (username.trim().charAt(0) || 'R').toUpperCase();
  const trimmedSrc = src ? src.trim() : '';
  const showImage = Boolean(trimmedSrc.length > 0 && !failed);
  const resolvedSrc =
    retryTick > 0 && trimmedSrc
      ? `${trimmedSrc}${trimmedSrc.includes('?') ? '&' : '?'}r=${retryTick}`
      : trimmedSrc;

  return (
    <div
      className={`relative overflow-hidden shrink-0 flex items-center justify-center border ${
        isFounder
          ? 'border-founder/40 bg-panel-2'
          : 'border-white/10 bg-panel-2'
      } ${sizeClass}`}
    >
      {showImage ? (
        <img
          key={`${trimmedSrc}-${retryTick}`}
          src={resolvedSrc}
          alt={`${username} Roblox avatar`}
          referrerPolicy="no-referrer"
          decoding="async"
          onError={() => setFailed(true)}
          className="h-full w-full object-cover"
        />
      ) : (
        <div
          className={`h-full w-full relative flex items-center justify-center select-none ${
            isFounder
              ? 'bg-gradient-to-b from-founder/25 to-ink text-founder'
              : 'bg-gradient-to-b from-crimson/20 to-ink text-white/90'
          }`}
          aria-hidden="true"
        >
          <svg
            viewBox="0 0 64 64"
            className="w-full h-full p-1.5 opacity-90"
            fill="none"
          >
            {/* Blocky R6 Head */}
            <rect
              x="20"
              y="10"
              width="24"
              height="24"
              rx="5"
              fill={isFounder ? '#d8b4fe' : '#e4e4e7'}
            />
            {/* Eyes & Smile */}
            <circle cx="28" cy="20" r="2" fill="#09090b" />
            <circle cx="36" cy="20" r="2" fill="#09090b" />
            <path
              d="M27 26.5C29 28.5 35 28.5 37 26.5"
              stroke="#09090b"
              strokeWidth="2"
              strokeLinecap="round"
            />
            {/* Football Kit Shoulders */}
            <path
              d="M12 56C12 43 20 38 32 38C44 38 52 43 52 56H12Z"
              fill={isFounder ? '#a855f7' : '#e11d48'}
            />
            <text
              x="32"
              y="52"
              textAnchor="middle"
              fill="#ffffff"
              fontSize="11"
              fontWeight="700"
              fontFamily="JetBrains Mono, monospace"
            >
              {initial}
            </text>
          </svg>
        </div>
      )}
    </div>
  );
}
