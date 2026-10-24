import { motion } from 'motion/react';
import type { LeagueDivision, PlayerRecord } from '../lib/types';
import { AvatarImage } from './AvatarImage';
import { TeamRoleBadge } from './TeamRoleBadge';

interface FoundersSectionProps {
  founders: PlayerRecord[];
  leagues?: LeagueDivision[];
  title?: string;
  sectionIndex?: string;
  onSelectPlayer: (player: PlayerRecord) => void;
}

export function FoundersSection({
  founders,
  leagues,
  title = 'The Founders (OVR 99 · S Rank)',
  sectionIndex = '01.',
  onSelectPlayer,
}: FoundersSectionProps) {
  return (
    <section aria-labelledby="founders-heading" className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-xs font-mono text-founder tracking-wide">
            {sectionIndex} S Rank Apex · Very Good Players
          </p>
          <h2
            id="founders-heading"
            className="font-display text-2xl sm:text-3xl font-semibold text-white mt-1"
          >
            {title}
          </h2>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        {founders.map((founder, idx) => (
          <motion.button
            key={founder.id}
            type="button"
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{
              duration: 0.32,
              delay: idx * 0.05,
              ease: [0.16, 1, 0.3, 1],
            }}
            onClick={() => onSelectPlayer(founder)}
            className="text-left p-5 rounded-xl surface-panel border border-founder/35 hover:border-founder hover:-translate-y-1 transition-[transform,border-color] duration-200 flex flex-col justify-between group cursor-pointer focus-visible:outline-2 focus-visible:outline-founder"
          >
            <div>
              <div className="flex items-start justify-between gap-3">
                <div className="transition-transform duration-200 group-hover:scale-105">
                  <AvatarImage
                    src={founder.avatarUrl}
                    username={founder.username}
                    isFounder
                    sizeClass="h-14 w-14 rounded-xl"
                    textClass="text-xl"
                  />
                </div>
                <div className="text-right">
                  <div className="font-display text-3xl font-semibold text-founder leading-none tabular-nums">
                    {founder.rating}
                  </div>
                  <div className="text-[11px] font-mono text-founder/95 mt-1">
                    S · Very Good
                  </div>
                </div>
              </div>

              <div className="mt-4">
                <h3 className="font-display text-lg font-semibold text-white group-hover:text-founder transition-colors truncate">
                  {founder.username}
                </h3>
                <p className="text-xs text-fog mt-1 truncate">
                  Position: <span className="text-white font-medium">{founder.position}</span>
                </p>
                <p className="text-xs text-fog mt-0.5 truncate">
                  Preferred Foot: <span className="text-white font-medium">{founder.foot}</span>
                </p>
                <div className="mt-1">
                  <TeamRoleBadge clubName={founder.club} leagues={leagues} />
                </div>
                <p className="text-[11px] font-mono text-mist mt-1 tabular-nums truncate">
                  Roblox ID: {founder.robloxId ?? 'Syncing'}
                </p>
              </div>
            </div>

            <div className="mt-5 pt-3 border-t border-white/10 flex items-center justify-between text-xs font-mono text-fog tabular-nums">
              <span>{founder.goals}G · {founder.assists}A</span>
              <span className="text-gold">${Math.round(founder.wage / 1000)}k/wk</span>
            </div>
          </motion.button>
        ))}
      </div>
    </section>
  );
}
