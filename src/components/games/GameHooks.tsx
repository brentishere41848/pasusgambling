import { useEffect, useRef } from 'react';

type QuickBetPcts = number[];
export type AutoStrategyPreset = 'flat' | 'martingale' | 'paroli' | 'reset';

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
    <div className="mt-2 rounded-xl border border-white/10 bg-black/20 p-1.5">
      <div className="grid gap-1.5" style={{ gridTemplateColumns: `repeat(${pcts.length}, minmax(0, 1fr))` }}>
      {pcts.map((p) => {
        const amount = Number(Math.max(MIN_BET, (dollars * p) / 100).toFixed(2));
        return (
          <button
            key={p}
            onClick={() => onSetBet(Math.max(MIN_BET, amount))}
            disabled={disabled || dollars < MIN_BET}
            className="rounded-lg border border-white/10 bg-white/5 px-2 py-1.5 text-[10px] font-black uppercase tracking-[0.16em] text-white/60 hover:text-white hover:bg-white/12 disabled:opacity-30 disabled:cursor-not-allowed transition-all"
          >
            {p}%
          </button>
        );
      })}
      </div>
    </div>
  );
}

export function MobileBetControls({
  balance,
  bet,
  onSetBet,
  disabled,
}: {
  balance: number;
  bet: number;
  onSetBet: (v: number) => void;
  disabled?: boolean;
}) {
  const maxBet = Math.max(MIN_BET, centsToDollars(balance));

  const apply = (mode: 'min' | 'half' | 'double' | 'max') => {
    if (mode === 'min') {
      onSetBet(MIN_BET);
      return;
    }
    if (mode === 'half') {
      onSetBet(Math.max(MIN_BET, Number((bet / 2).toFixed(2))));
      return;
    }
    if (mode === 'double') {
      onSetBet(Math.max(MIN_BET, Math.min(maxBet, Number((bet * 2).toFixed(2)))));
      return;
    }
    onSetBet(maxBet);
  };

  return (
    <div className="mt-3 grid grid-cols-4 gap-2 sm:hidden rounded-2xl border border-white/10 bg-black/20 p-2">
      {[
        ['min', 'Min'],
        ['half', '1/2'],
        ['double', '2x'],
        ['max', 'Max'],
      ].map(([mode, label]) => (
        <button
          key={mode}
          onClick={() => apply(mode as 'min' | 'half' | 'double' | 'max')}
          disabled={disabled || balance < 1}
          className="rounded-xl border border-white/10 bg-white/5 px-2 py-2 text-[10px] font-black uppercase tracking-[0.16em] text-white/65 hover:bg-white/10 hover:text-white disabled:opacity-30"
        >
          {label}
        </button>
      ))}
    </div>
  );
}

export function AutoStrategyPanel({
  preset,
  onPresetChange,
  onWinPercent,
  onLossPercent,
  onWinPercentChange,
  onLossPercentChange,
  disabled,
}: {
  preset: AutoStrategyPreset;
  onPresetChange: (value: AutoStrategyPreset) => void;
  onWinPercent: number;
  onLossPercent: number;
  onWinPercentChange: (value: number) => void;
  onLossPercentChange: (value: number) => void;
  disabled?: boolean;
}) {
  return (
    <div className="space-y-3 rounded-2xl border border-white/10 bg-[linear-gradient(180deg,rgba(255,255,255,0.06),rgba(255,255,255,0.01))] p-3">
      <div className="text-[10px] font-black uppercase tracking-[0.18em] text-white/30">Auto Strategy</div>
      <div className="grid grid-cols-2 gap-2">
        {([
          ['flat', 'Flat'],
          ['martingale', 'Martingale'],
          ['paroli', 'Paroli'],
          ['reset', 'Reset'],
        ] as Array<[AutoStrategyPreset, string]>).map(([value, label]) => (
          <button
            key={value}
            onClick={() => onPresetChange(value)}
            disabled={disabled}
            className={
              `rounded-xl px-3 py-2 text-[10px] font-black uppercase tracking-[0.16em] transition-all ${
                preset === value ? 'bg-[#00FF88]/15 text-[#00FF88] border border-[#00FF88]/35' : 'bg-white/5 text-white/55 border border-white/8'
              }`
            }
          >
            {label}
          </button>
        ))}
      </div>
      <div className="grid grid-cols-2 gap-2">
        <div>
          <div className="mb-1 text-[10px] uppercase tracking-[0.16em] text-white/25">On Win %</div>
          <input type="number" value={onWinPercent} min="0" step="5" disabled={disabled} onChange={(e) => onWinPercentChange(Math.max(0, Number(e.target.value) || 0))} className="w-full rounded-xl border border-white/12 bg-black/50 px-3 py-2 text-xs text-white focus:outline-none" />
        </div>
        <div>
          <div className="mb-1 text-[10px] uppercase tracking-[0.16em] text-white/25">On Loss %</div>
          <input type="number" value={onLossPercent} min="0" step="5" disabled={disabled} onChange={(e) => onLossPercentChange(Math.max(0, Number(e.target.value) || 0))} className="w-full rounded-xl border border-white/12 bg-black/50 px-3 py-2 text-xs text-white focus:outline-none" />
        </div>
      </div>
    </div>
  );
}

export function GameStatsBar({ stats }: { stats: { label: string; value: string }[] }) {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
      {stats.map((s) => (
        <div key={s.label} className="rounded-xl border border-white/10 bg-[linear-gradient(180deg,rgba(255,255,255,0.05),rgba(255,255,255,0.015))] px-3 py-2 shadow-[0_8px_22px_rgba(0,0,0,0.2)]">
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
