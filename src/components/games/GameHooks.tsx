import { useEffect, useRef } from 'react';

type QuickBetPcts = number[];

export const MIN_BET = 0.01;

export function centsToDollars(value: number) {
  return Number((Number(value || 0) / 100).toFixed(2));
}

export function dollarsToCents(value: number) {
  return Math.max(1, Math.round(Number(value || 0) * 100));
}

export function formatCents(value: number) {
  return `$${centsToDollars(value).toFixed(2)}`;
}

export function useGameHotkeys({
  onBet,
  onAuto,
  onStop,
  isDisabled,
  hotkey = ' ',
}: {
  onBet: () => void;
  onAuto?: () => void;
  onStop?: () => void;
  isDisabled?: boolean;
  hotkey?: string;
}) {
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (isDisabled) return;
      const tag = (e.target as HTMLElement)?.tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA') return;

      if (e.key === hotkey || e.key === 'Enter') {
        e.preventDefault();
        onBet();
      } else if (e.key === 'Escape' && onStop) {
        e.preventDefault();
        onStop();
      } else if (e.key === 'a' && onAuto) {
        e.preventDefault();
        onAuto();
      }
    };

    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [onBet, onAuto, onStop, isDisabled, hotkey]);
}

export function QuickBetButtons({
  balance,
  bet,
  onSetBet,
  pcts = [10, 25, 50, 100],
  disabled,
}: {
  balance: number;
  bet: number;
  onSetBet: (v: number) => void;
  pcts?: QuickBetPcts;
  disabled?: boolean;
}) {
  const dollars = balance;
  return (
    <div className="flex gap-1.5 mt-2">
      {pcts.map((p) => {
        const amount = Number(Math.max(MIN_BET, (dollars * p) / 100).toFixed(2));
        return (
          <button
            key={p}
            onClick={() => onSetBet(Math.max(MIN_BET, amount))}
            disabled={disabled || dollars < MIN_BET}
            className="flex-1 rounded-lg bg-white/5 px-2 py-1.5 text-[10px] font-black uppercase tracking-wider text-white/50 hover:text-white hover:bg-white/10 disabled:opacity-30 disabled:cursor-not-allowed transition-all"
          >
            {p}%
          </button>
        );
      })}
    </div>
  );
}

export function GameStatsBar({ stats }: { stats: { label: string; value: string }[] }) {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
      {stats.map((s) => (
        <div key={s.label} className="rounded-xl border border-white/5 bg-white/[0.02] px-3 py-2">
          <div className="text-[9px] uppercase tracking-[0.2em] text-white/30 font-bold">{s.label}</div>
          <div className="text-sm font-black text-white mt-0.5 truncate">{s.value}</div>
        </div>
      ))}
    </div>
  );
}

export function useLocalGameStats(gameKey: string) {
  const statsRef = useRef<Record<string, {
    totalBets: number; totalWins: number; totalLosses: number;
    totalWagered: number; totalPayout: number; biggestWin: number;
  }>>({});

  const getStats = () => statsRef.current[gameKey] || {
    totalBets: 0, totalWins: 0, totalLosses: 0,
    totalWagered: 0, totalPayout: 0, biggestWin: 0,
  };

  const recordBet = (wager: number, payout: number, won: boolean) => {
    const s = statsRef.current[gameKey] || {
      totalBets: 0, totalWins: 0, totalLosses: 0,
      totalWagered: 0, totalPayout: 0, biggestWin: 0,
    };
    s.totalBets++;
    s.totalWagered += wager;
    if (won) {
      s.totalWins++;
      s.totalPayout += payout;
      if (payout > s.biggestWin) s.biggestWin = payout;
    } else {
      s.totalLosses++;
    }
    statsRef.current[gameKey] = s;
  };

  return { getStats, recordBet };
}
