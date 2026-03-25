import React, { useCallback, useRef, useState } from 'react';
import { motion } from 'motion/react';
import { useBalance } from '../../context/BalanceContext';
import { cn } from '../../lib/utils';
import { CreditCard, Star } from 'lucide-react';
import confetti from 'canvas-confetti';
import { logBetActivity } from '../../lib/activity';

const SYMBOLS = ['🍒', '🍋', '🍊', '🍇', '⭐', '💎', '7️⃣', '🔔'];

type Tier = { cost: number; label: string; color: string };

const TIERS: Tier[] = [
  { cost: 100, label: '$1 Card', color: 'text-gray-300' },
  { cost: 500, label: '$5 Card', color: 'text-blue-400' },
  { cost: 1000, label: '$10 Card', color: 'text-amber-400' },
];

type SpotData = {
  symbol: string;
  revealed: boolean;
};

const PRIZES = [
  { matched: 3, amount: 100, label: '3 Matches' },
  { matched: 4, amount: 200, label: '4 Matches' },
  { matched: 5, amount: 350, label: '5 Matches' },
  { matched: 9, amount: 1000, label: 'Full Card' },
];

export const ScratchGame: React.FC = () => {
  const { balance, addBalance, subtractBalance } = useBalance();
  const [tierIdx, setTierIdx] = useState(0);
  const [spots, setSpots] = useState<SpotData[]>([]);
  const [winningSymbol, setWinningSymbol] = useState('');
  const [phase, setPhase] = useState<'idle' | 'scratching' | 'ended'>('idle');
  const [winnings, setWinnings] = useState(0);
  const [prizeLabel, setPrizeLabel] = useState('');
  const [scratchCount, setScratchCount] = useState(0);
  const scratchedRef = useRef<Set<number>>(new Set());

  const generateCard = useCallback(() => {
    const grid: SpotData[] = [];
    const symbol = SYMBOLS[Math.floor(Math.random() * SYMBOLS.length)];
    for (let i = 0; i < 9; i++) {
      grid.push({ symbol, revealed: i === 4 });
    }
    return { grid, symbol };
  }, []);

  const startGame = useCallback(() => {
    const cost = TIERS[tierIdx].cost;
    if (!subtractBalance(cost)) return;
    const { grid, symbol } = generateCard();
    setSpots(grid);
    setWinningSymbol(symbol);
    setPhase('scratching');
    scratchedRef.current = new Set([4]);
    setScratchCount(1);
    setWinnings(0);
    setPrizeLabel('');
  }, [tierIdx, subtractBalance, generateCard]);

  const scratch = useCallback((index: number) => {
    if (phase !== 'scratching' || spots[index]?.revealed) return;
    scratchedRef.current.add(index);
    const newCount = scratchCount + 1;
    setScratchCount(newCount);
    setSpots(prev => prev.map((s, i) => i === index ? { ...s, revealed: true } : s));

    if (newCount === 9) {
      const symbol = spots[4].symbol;
      const matched = spots.filter(s => s.symbol === symbol).length;
      const prize = PRIZES.find(p => p.matched === matched);
      const winAmount = prize ? prize.amount : 0;
      setWinnings(winAmount);
      setPrizeLabel(prize ? prize.label : 'No Match');
      setPhase('ended');
      if (winAmount > 0) {
        addBalance(winAmount);
        confetti({ particleCount: 80, spread: 60, origin: { y: 0.6 } });
        logBetActivity({ gameKey: 'scratch', wager: TIERS[tierIdx].cost, payout: winAmount, multiplier: winAmount / TIERS[tierIdx].cost, outcome: 'win', detail: `${prize?.label || 'No win'}` });
      } else {
        logBetActivity({ gameKey: 'scratch', wager: TIERS[tierIdx].cost, payout: 0, multiplier: 0, outcome: 'loss', detail: 'No match' });
      }
    }
  }, [phase, spots, scratchCount, addBalance, tierIdx]);

  const scratchAll = useCallback(() => {
    if (phase !== 'scratching') return;
    setSpots(prev => prev.map(s => ({ ...s, revealed: true })));
    const matched = spots.filter(s => s.symbol === winningSymbol).length;
    const prize = PRIZES.find(p => p.matched === matched);
    const winAmount = prize ? prize.amount : 0;
    setWinnings(winAmount);
    setPrizeLabel(prize ? prize.label : 'No Match');
    setPhase('ended');
    if (winAmount > 0) {
      addBalance(winAmount);
      confetti({ particleCount: 80, spread: 60, origin: { y: 0.6 } });
      logBetActivity({ gameKey: 'scratch', wager: TIERS[tierIdx].cost, payout: winAmount, multiplier: winAmount / TIERS[tierIdx].cost, outcome: 'win', detail: `${prize?.label || 'No win'}` });
    } else {
      logBetActivity({ gameKey: 'scratch', wager: TIERS[tierIdx].cost, payout: 0, multiplier: 0, outcome: 'loss', detail: 'No match' });
    }
  }, [phase, spots, winningSymbol, addBalance, tierIdx]);

  return (
    <div className="flex flex-col lg:grid lg:grid-cols-[280px_1fr] gap-6 p-4 max-w-5xl mx-auto">
      <div className="bg-[#141821] border border-white/5 rounded-2xl p-5 space-y-4">
        <div className="text-xs font-black uppercase tracking-widest text-white/40">Prize Table</div>
        <div className="space-y-2">
          {PRIZES.map(p => (
            <div key={p.matched} className="flex items-center justify-between rounded-xl bg-black/40 px-4 py-3 border border-white/5">
              <div className="flex items-center gap-2">
                <Star size={14} className="text-[#d9bb63]" />
                <span className="text-xs font-black text-white/70">{p.label}</span>
              </div>
              <span className="text-sm font-black text-[#00FF88]">${(p.amount / 100).toFixed(2)}</span>
            </div>
          ))}
        </div>

        <div className="text-[10px] text-white/25 leading-relaxed">
          Match symbols to win. The winning symbol is shown in the center. Get 3+ matching symbols to win.
        </div>

        <div className="border-t border-white/5 pt-4">
          <div className="text-xs font-black uppercase tracking-widest text-white/40 mb-3">Select Card</div>
          <div className="space-y-2">
            {TIERS.map((tier, idx) => (
              <button
                key={tier.label}
                onClick={() => phase === 'idle' && setTierIdx(idx)}
                disabled={phase !== 'idle'}
                className={cn(
                  'w-full py-3 rounded-xl border text-xs font-black uppercase tracking-wider transition-all',
                  tierIdx === idx && phase === 'idle' ? `border-[#00FF88]/50 bg-[#00FF88]/10 ${tier.color}` : 'border-white/10 bg-white/5 text-white/40'
                )}
              >
                {tier.label} - ${(tier.cost / 100).toFixed(2)}
              </button>
            ))}
          </div>
        </div>

        {phase === 'idle' && (
          <button
            onClick={startGame}
            disabled={balance < TIERS[tierIdx].cost}
            className="w-full bg-[#00FF88] hover:bg-[#00FF88]/90 disabled:opacity-40 text-black font-black py-4 rounded-xl text-xs uppercase tracking-widest transition-all"
          >
            Buy Card
          </button>
        )}

        {phase === 'scratching' && scratchCount < 9 && (
          <button
            onClick={scratchAll}
            className="w-full bg-white/10 hover:bg-white/20 text-white font-black py-3 rounded-xl text-xs uppercase tracking-wider transition-all"
          >
            Scratch All ({9 - scratchCount} left)
          </button>
        )}

        {phase === 'ended' && (
          <div className="space-y-3">
            <div className={cn('rounded-2xl border p-4 text-center', winnings > 0 ? 'border-[#00FF88]/50 bg-[#00FF88]/10' : 'border-red-500/30 bg-red-500/10')}>
              <div className={cn('text-lg font-black', winnings > 0 ? 'text-[#00FF88]' : 'text-red-400')}>
                {winnings > 0 ? `You Won!` : 'No Win'}
              </div>
              {winnings > 0 && (
                <>
                  <div className="text-2xl font-black text-white mt-1">+${(winnings / 100).toFixed(2)}</div>
                  <div className="text-[10px] text-white/50 mt-1">{prizeLabel}</div>
                </>
              )}
            </div>
            <button
              onClick={() => { setPhase('idle'); setSpots([]); }}
              className="w-full bg-white/10 hover:bg-white/20 text-white font-black py-3 rounded-xl text-xs uppercase tracking-wider transition-all"
            >
              New Card
            </button>
          </div>
        )}
      </div>

      <div className="bg-[#0f1115] border border-white/5 rounded-2xl p-6 flex flex-col items-center justify-center min-h-[420px]">
        {phase === 'idle' ? (
          <div className="text-center">
            <CreditCard size={64} className="text-white/8 mx-auto mb-4" />
            <p className="text-white/30 text-xs uppercase tracking-widest">Select a card tier and buy</p>
          </div>
        ) : (
          <div className="w-full max-w-sm space-y-4">
            <div className="text-center text-xs text-white/40 uppercase tracking-widest">
              Winning Symbol: <span className="text-xl">{winningSymbol}</span>
            </div>
            <div className="grid grid-cols-3 gap-2">
              {spots.map((spot, idx) => (
                <button
                  key={idx}
                  onClick={() => !spot.revealed && scratch(idx)}
                  className={cn(
                    'aspect-square rounded-2xl flex items-center justify-center text-3xl font-black border transition-all',
                    spot.revealed
                      ? spot.symbol === winningSymbol
                        ? 'bg-[#00FF88]/15 border-[#00FF88]/50'
                        : 'bg-white/5 border-white/10 text-white/30'
                      : 'bg-gradient-to-br from-gray-600 to-gray-800 border-gray-500 hover:border-gray-400',
                    idx === 4 && 'ring-2 ring-[#00FF88]/60'
                  )}
                >
                  {spot.revealed ? spot.symbol : <span className="text-gray-400/40">?</span>}
                </button>
              ))}
            </div>
            <div className="text-center text-[10px] text-white/20">
              Center spot shows the winning symbol
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
