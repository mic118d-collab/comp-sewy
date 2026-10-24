import { useEffect, useState } from 'react';
import { HelpCircle } from 'lucide-react';
import type { LeagueDivision } from '../lib/types';
import {
  findOfficialClubByName,
  getTeamRoleLabel,
  isPlayerTeamRolled,
  needsCircularBadgeMask,
} from '../lib/leagues';

interface TeamRoleBadgeProps {
  clubName: string | undefined | null;
  leagues?: LeagueDivision[];
  showPrefix?: boolean;
  showLeague?: boolean;
  size?: 'sm' | 'md';
}

export function TeamRoleBadge({
  clubName,
  leagues,
  showPrefix = true,
  showLeague = false,
  size = 'sm',
}: TeamRoleBadgeProps) {
  const [imgFailed, setImgFailed] = useState(false);
  const rolled = isPlayerTeamRolled(clubName);
  const official = findOfficialClubByName(clubName, leagues);
  const label = getTeamRoleLabel(clubName);

  useEffect(() => {
    setImgFailed(false);
  }, [official?.clubLogoUrl]);

  const iconSizeClass = size === 'md' ? 'w-6 h-6' : 'w-5 h-5';
  const textSizeClass = size === 'md' ? 'text-xs sm:text-sm' : 'text-xs';

  if (!rolled) {
    return (
      <span className={`inline-flex items-center gap-1.5 text-mist font-mono ${textSizeClass}`}>
        <HelpCircle className="w-3.5 h-3.5 text-mist/80 shrink-0" aria-hidden="true" />
        <span>{showPrefix ? 'Team: Unknown' : 'Unknown'}</span>
      </span>
    );
  }

  const circularMask = needsCircularBadgeMask(official?.clubLogoUrl);

  return (
    <span className={`inline-flex items-center gap-1.5 text-white ${textSizeClass} min-w-0`}>
      {official && !imgFailed && (
        <img
          src={official.clubLogoUrl}
          alt={`${official.clubName} crest`}
          decoding="async"
          referrerPolicy="no-referrer"
          onError={() => setImgFailed(true)}
          className={`${iconSizeClass} ${
            circularMask ? 'rounded-full object-cover scale-[1.03]' : 'object-contain'
          } shrink-0`}
        />
      )}
      <span className="truncate font-medium">
        {showPrefix ? `Team: ${label}` : label}
      </span>
      {showLeague && official && (
        <span className="text-mist font-mono text-[11px] truncate hidden sm:inline">
          · {official.leagueName}
        </span>
      )}
    </span>
  );
}
