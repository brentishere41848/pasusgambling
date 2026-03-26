import React, { useMemo, useState } from 'react';
import { motion } from 'motion/react';
import { Play, RotateCcw } from 'lucide-react';
import confetti from 'canvas-confetti';
import { useBalance } from '../../context/BalanceContext';
import { logBetActivity } from '../../lib/activity';
import { cn } from '../../lib/utils';
import { QuickBetButtons, MobileBetControls, GameStatsBar, useLocalGameStats, centsToDollars, dollarsToCents, formatCents, MIN_BET } from './GameHooks';

const GRID = Array.from({ length: 40 }, (_, index) => index + 1);

const PAYOUTS: Record<number, Record<number, number>> = {
  4: { 2: 1.2, 3: 2.1, 4: 6 },
  6: { 3: 1.4, 4: 2.2, 5: 5, 6: 12 },
  8: { 4: 1.8, 5: 3.1, 6: 6.8, 7: 14, 8: 28 },
};

export const KenoGame: React.FC = () => {
  const { balance, addBalance, subtractBalance } = useBalance();
  const [bet, setBet] = useState(1);
  const [pickCount, setPickCount] = useState<4 | 6 | 8>(6);
  const [selected, setSelected] = useState<number[]>([]);
  const [drawn, setDrawn] = useState<number[]>([]);
  const [matches, setMatches] = useState<number[]>([]);
  const [isDrawing, setIsDrawing] = useState(false);
  const { getStats, recordBet } = useLocalGameStats('keno');
  const stats = getStats();
  const betCents = dollarsToCents(bet);

  const payoutTable = useMemo(() => PAYOUTS[pickCount], [pickCount]);
  const potentialTop = Math.max(...(Object.values(payoutTable) as number[]));

  const toggleNumber = (value: number) => {
    if (isDrawing) {
      return;
    }

    setSelected((current) => {
      if (current.includes(value)) {
        return current.filter((entry) => entry !== value);
      }

      if (current.length >= pickCount) {
        return current;
      }

      return [...current, value];
    });
  };

  const quickPick = () => {
    if (isDrawing) {
      return;
    }
    const pool = [...GRID].sort(() => Math.random() - 0.5).slice(0, pickCount).sort((a, b) => a - b);
    setSelected(pool);
  };

  const draw = () => {
    if (selected.length !== pickCount || !subtractBalance(betCents)) {
      return;
    }

    setIsDrawing(true);
    setDrawn([]);
    setMatches([]);
    const shuffled = [...GRID].sort(() => Math.random() - 0.5).slice(0, 10);

    shuffled.forEach((value, index) => {
      window.setTimeout(() => {
        setDrawn((current) => [...current, value]);
      }, (index + 1) * 160);
    });

    window.setTimeout(() => {
      const hitNumbers = shuffled.filter((value) => selected.includes(value));
      setMatches(hitNumbers);
      const multiplier = payoutTable[hitNumbers.length] || 0;
      const payout = multiplier ? Math.round(betCents * multiplier) : 0;

      if (payout > 0) {
        addBalance(payout);
        logBetActivity({ gameKey: 'keno', wager: betCents, payout, multiplier, outcome: 'win', detail: `${hitNumbers.length}/${pickCount} hits` });
        confetti({ particleCount: 80, spread: 70, origin: { y: 0.6 } });
        recordBet(betCents, payout, true);
      } else {
        logBetActivity({ gameKey: 'keno', wager: betCents, payout: 0, multiplier: 0, outcome: 'loss', detail: `${hitNumbers.length}/${pickCount} hits` });
        recordBet(betCents, 0, false);
      }

      setIsDrawing(false);
    }, shuffled.length * 160 + 250);
  };

  return (
    <div className="flex flex-col lg:grid lg:grid-cols-4 gap-6 p-4 max-w-6xl mx-auto">
      <div className="lg:col-span-1 bg-[#111] border border-white/10 rounded-2xl p-6 flex flex-col gap-4">
        <div className="space-y-4">
          <div>
            <label className="text-xs uppercase tracking-widest text-white/40 mb-2 block">Bet Amount</label>
            <input type="number" value={bet} onChange={(e) => setBet(Math.max(MIN_BET, Number(e.target.value)))} min="0.01" step="0.01" disabled={isDrawing} className="w-full bg-black border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-[#00FF88]/50" />
            <QuickBetButtons balance={centsToDollars(balance)} bet={bet} onSetBet={setBet} disabled={isDrawing} />
            <MobileBetControls balance={balance} bet={bet} onSetBet={setBet} disabled={isDrawing} />
            <QuickBetButtons balance={centsToDollars(balance)} bet={bet} onSetBet={setBet} disabled={isDrawing} />
          </div>

          <div>
            <label className="text-xs uppercase tracking-widest text-white/40 mb-2 block">Pick Count</label>
            <div className="grid grid-cols-3 gap-2">
              {([4, 6, 8] as const).map((count) => (
                <button
                  key={count}
                  onClick={() => {
                    setPickCount(count);
                    setSelected((current) => current.slice(0, count));
                  }}
                  disabled={isDrawing}
                  className={cn(
                    'py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all',
                    pickCount === count ? 'bg-[#00FF88] text-black' : 'bg-white/5 text-white/40 hover:text-white'
                  )}
                >
                  {count}
                </button>
              ))}
            </div>
          </div>

          <button
            onClick={quickPick}
            disabled={isDrawing}
            className="rounded-xl bg-white/5 px-4 py-3 text-xs font-black uppercase tracking-[0.16em] text-white/70"
          >
            Quick Pick
          </button>

          <button
            onClick={draw}
            disabled={isDrawing || selected.length !== pickCount || balance < betCents}
            className="w-full rounded-xl bg-[#00FF88] px-4 py-4 text-sm font-black uppercase tracking-[0.16em] text-black disabled:opacity-40"
          >
            {isDrawing ? (
              <span className="inline-flex items-center gap-2"><RotateCcw size={16} className="animate-spin" /> Drawing</span>
            ) : (
              <span className="inline-flex items-center gap-2"><Play size={16} fill="currentColor" /> Draw Keno</span>
            )}
          </button>
        </div>

        <GameStatsBar stats={[
          { label: 'Bets', value: String(stats.totalBets) },
          { label: 'Wins', value: String(stats.totalWins) },
          { label: 'Biggest', value: formatCents(stats.biggestWin) },
          { label: 'Wagered', value: formatCents(stats.totalWagered) },
        ]} />
      </div>

      <div className="lg:col-span-3 bg-black border border-white/10 rounded-2xl p-8 space-y-6">
        <div className="grid grid-cols-5 md:grid-cols-8 gap-3">
          {GRID.map((value) => {
            const isSelected = selected.includes(value);
            const isDrawn = drawn.includes(value);
            const isMatch = matches.includes(value);
            return (
              <motion.button
                whileTap={{ scale: 0.96 }}
                key={value}
                onClick={() => toggleNumber(value)}
                className={cn(
                  'rounded-2xl border h-14 text-sm font-black transition-all',
                  isMatch
                    ? 'border-[#00FF88] bg-[#00FF88] text-black'
                    : isDrawn
                      ? 'border-amber-300/40 bg-amber-300/20 text-amber-100'
                      : isSelected
                        ? 'border-white bg-white text-black'
                        : 'border-white/10 bg-[#11161d] text-white/60 hover:text-white'
                )}
              >
                {value}
              </motion.button>
            );
          })}
        </div>

        <div className="grid md:grid-cols-3 gap-4">
          <div className="rounded-3xl border border-white/10 bg-[#11161d] p-5">
            <div className="text-[10px] uppercase tracking-[0.18em] text-white/20 font-black">Drawn</div>
            <div className="mt-3 text-sm text-white/75">{drawn.length ? drawn.join(', ') : 'Waiting'}</div>
          </div>
          <div className="rounded-3xl border border-white/10 bg-[#11161d] p-5">
            <div className="text-[10px] uppercase tracking-[0.18em] text-white/20 font-black">Matches</div>
            <div className="mt-3 text-2xl font-black">{matches.length}</div>
          </div>
          <div className="rounded-3xl border border-white/10 bg-[#11161d] p-5">
            <div className="text-[10px] uppercase tracking-[0.18em] text-white/20 font-black">Payout Table</div>
            <div className="mt-3 space-y-1 text-xs text-white/70">
              {(Object.entries(payoutTable) as Array<[string, number]>).map(([hits, multiplier]) => (
                <div key={hits} className="flex justify-between">
                  <span>{hits} hits</span>
                  <span className="text-[#00FF88]">{multiplier.toFixed(1)}x</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
