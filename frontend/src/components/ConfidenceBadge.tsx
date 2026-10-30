import React from 'react';
import { ShieldCheck, AlertTriangle, ShieldAlert } from 'lucide-react';

interface ConfidenceBadgeProps {
  score: number; // Either 0.0 - 1.0 or 0 - 100
  showLabel?: boolean;
  size?: 'sm' | 'md';
}

export const ConfidenceBadge: React.FC<ConfidenceBadgeProps> = ({
  score,
  showLabel = true,
  size = 'md',
}) => {
  const pct = score <= 1.0 ? Math.round(score * 100) : Math.round(score);

  let colorClasses = '';
  let Icon = ShieldCheck;
  let statusText = 'High Confidence';

  if (pct >= 90) {
    colorClasses = 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30';
    Icon = ShieldCheck;
    statusText = 'Verified High';
  } else if (pct >= 75) {
    colorClasses = 'bg-amber-500/15 text-amber-300 border-amber-500/40';
    Icon = AlertTriangle;
    statusText = 'Review Suggested';
  } else {
    colorClasses = 'bg-rose-500/15 text-rose-300 border-rose-500/40';
    Icon = ShieldAlert;
    statusText = 'HITL Required';
  }

  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full border font-mono font-medium ${colorClasses} ${
        size === 'sm' ? 'px-2 py-0.5 text-xs' : 'px-2.5 py-1 text-xs'
      }`}
      title={`${statusText}: ${pct}% confidence`}
    >
      <Icon className={size === 'sm' ? 'w-3 h-3' : 'w-3.5 h-3.5'} />
      <span>{pct}%</span>
      {showLabel && <span className="hidden sm:inline font-sans opacity-80">· {statusText}</span>}
    </span>
  );
};

