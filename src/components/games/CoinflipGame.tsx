import React, { useCallback, useEffect, useState } from 'react';
import { motion } from 'motion/react';
import { useBalance } from '../../context/BalanceContext';
import { cn } from '../../lib/utils';
import { Play, RotateCcw, Timer, Zap } from 'lucide-react';
import { logBetActivity } from '../../lib/activity';

type CoinSide = 'heads' | 'tails';

const HOUSE_EDGE_MULTIPLIER = 1.96;

export const CoinflipGame: React.FC = () => {
  const { balance, addBalance, subtractBalance } = useBalance();
  const [bet, setBet] = useState(10);
  const [selectedSide, setSelectedSide] = useState<CoinSide>('heads');
  const [result, setResult] = useState<CoinSide | null>(null);
  const [isFlipping, setIsFlipping] = useState(false);
  const [isAuto, setIsAuto] = useState(false);
  const [isFast, setIsFast] = useState(false);
  const [autoRounds, setAutoRounds] = useState(10);
  const [remainingRounds, setRemainingRounds] = useState(0);

  const runFlip = useCallback(() => {
    if (!subtractBalance(bet)) {
      setIsAuto(false);
      setRemainingRounds(0);
      return;
    }

    setIsFlipping(true);
    setResult(null);
    const duration = isFast ? 450 : 1100;

    window.setTimeout(() => {
      const landed: CoinSide = Math.random() < 0.5 ? 'heads' : 'tails';
      const didWin = landed === selectedSide;
      setResult(landed);

      if (didWin) {
        const payout = Math.round(bet * HOUSE_EDGE_MULTIPLIER);
        addBalance(payout);
        logBetActivity({
          gameKey: 'coinflip',
          wager: bet,
          payout,
          multiplier: HOUSE_EDGE_MULTIPLIER,
          outcome: 'win',
          detail: `Called ${selectedSide}, landed ${landed}`,
        });
      } else {
        logBetActivity({
          gameKey: 'coinflip',
          wager: bet,
          payout: 0,
          multiplier: 0,
          outcome: 'loss',
          detail: `Called ${selectedSide}, landed ${landed}`,
        });
      }

      setIsFlipping(false);

      if (isAuto && remainingRounds > 1) {
        setRemainingRounds((current) => current - 1);
      } else if (isAuto) {
        setIsAuto(false);
        setRemainingRounds(0);
      }
    }, duration);
  }, [addBalance, bet, isAuto, isFast, remainingRounds, selectedSide, subtractBalance]);

  useEffect(() => {
    if (isAuto && remainingRounds > 0 && !isFlipping) {
      const timer = window.setTimeout(runFlip, isFast ? 60 : 280);
      return () => window.clearTimeout(timer);
    }
    return undefined;
  }, [isAuto, remainingRounds, isFlipping, runFlip, isFast]);

  const toggleAuto = () => {
    if (isAuto) {
      setIsAuto(false);
      setRemainingRounds(0);
      return;
    }

    setIsAuto(true);
    setRemainingRounds(autoRounds);
  };

  return (
    <div className="flex flex-col lg:grid lg:grid-cols-4 gap-6 p-4 max-w-6xl mx-auto">
      <div className="lg:col-span-1 bg-[#111] border border-white/10 rounded-2xl p-6 flex flex-col gap-4">
        <div className="space-y-4">
          <div>
            <label className="text-xs uppercase tracking-widest text-white/40 mb-2 block">Bet Amount</label>
            <input
              type="number"
              value={bet}
              onChange={(e) => setBet(Math.max(1, Number(e.target.value)))}
              disabled={isFlipping || isAuto}
              className="w-full bg-black border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-[#00FF88]/50"
            />
          </div>

          <div>
            <label className="text-xs uppercase tracking-widest text-white/40 mb-2 block">Choose Side</label>
            <div className="grid grid-cols-2 gap-2">
              {(['heads', 'tails'] as CoinSide[]).map((side) => (
                <button
                  key={side}
                  onClick={() => setSelectedSide(side)}
                  disabled={isFlipping || isAuto}
                  className={cn(
                    'py-3 rounded-xl text-xs font-black uppercase tracking-[0.2em] transition-all',
                    selectedSide === side ? 'bg-white text-black' : 'bg-white/5 text-white/40 hover:text-white'
                  )}
                >
                  {side}
                </button>
              ))}
            </div>
          </div>

          <div className="flex gap-2">
            <button
              onClick={() => setIsFast((current) => !current)}
              className={cn(
                'flex-1 py-2 rounded-lg text-[10px] font-black uppercase tracking-widest flex items-center justify-center gap-2 transition-all',
                isFast ? 'bg-yellow-500/20 text-yellow-500 border border-yellow-500/50' : 'bg-white/5 text-white/20 border border-transparent'
              )}
            >
              <Zap size={12} fill={isFast ? 'currentColor' : 'none'} />
              FAST
            </button>
            <button
              onClick={toggleAuto}
              className={cn(
                'flex-1 py-2 rounded-lg text-[10px] font-black uppercase tracking-widest flex items-center justify-center gap-2 transition-all',
                isAuto ? 'bg-[#00FF88]/20 text-[#00FF88] border border-[#00FF88]/50' : 'bg-white/5 text-white/20 border border-transparent'
              )}
            >
              <RotateCcw size={12} className={isAuto ? 'animate-spin' : ''} />
              AUTO
            </button>
          </div>

          {isAuto && (
            <div className="space-y-2">
              <div className="flex justify-between text-[10px] uppercase tracking-widest text-white/20">
                <span>Rounds</span>
                <span>{remainingRounds} left</span>
              </div>
              <input
                type="number"
                value={autoRounds}
                onChange={(e) => setAutoRounds(Math.max(1, Number(e.target.value)))}
                disabled={isFlipping || isAuto}
                className="w-full bg-black border border-white/10 rounded-xl px-4 py-2 text-xs text-white focus:outline-none focus:border-[#00FF88]/50"
              />
            </div>
          )}

          <button
            onClick={isAuto ? toggleAuto : runFlip}
            disabled={(balance < bet && !isAuto) || (isFlipping && !isAuto)}
            className={cn(
              'w-full py-4 rounded-xl font-bold transition-all flex items-center justify-center gap-2 disabled:opacity-50',
              isAuto ? 'bg-red-500 text-white' : 'bg-[#00FF88] text-black'
            )}
          >
            {isAuto ? (
              <>
                <Timer size={18} />
                STOP AUTO
              </>
            ) : (
              <>
                <Play size={18} fill="currentColor" />
                FLIP COIN
              </>
            )}
          </button>
        </div>

        <div className="mt-auto space-y-3">
          <div className="flex justify-between text-xs">
            <span className="text-white/40">Payout</span>
            <span className="text-white font-mono">{HOUSE_EDGE_MULTIPLIER.toFixed(2)}x</span>
          </div>
          <div className="flex justify-between text-xs">
            <span className="text-white/40">Win Chance</span>
            <span className="text-white font-mono">50.00%</span>
          </div>
        </div>
      </div>

      <div className="lg:col-span-3 bg-black border border-white/10 rounded-2xl p-10 flex flex-col items-center justify-center gap-8 min-h-[520px]">
        <div className="text-[10px] uppercase tracking-[0.28em] text-white/25 font-black">
          Call {selectedSide.toUpperCase()} and beat the flip
        </div>

        <motion.div
          animate={{
            rotateY: isFlipping ? [0, 540, 1080] : 0,
            y: isFlipping ? [0, -24, 0] : 0,
            scale: isFlipping ? [1, 1.04, 1] : 1,
          }}
          transition={{
            duration: isFast ? 0.45 : 1.1,
            ease: 'easeInOut',
          }}
          className="relative w-56 h-56 rounded-full border border-white/10 bg-[radial-gradient(circle_at_30%_30%,rgba(255,255,255,0.35),rgba(0,255,136,0.14)_35%,rgba(0,0,0,0.92)_100%)] shadow-[0_25px_80px_rgba(0,0,0,0.45)] flex items-center justify-center"
          style={{ transformStyle: 'preserve-3d' }}
        >
          <div className="absolute inset-3 rounded-full border border-[#00FF88]/30" />
          <div className="text-7xl font-black italic tracking-tighter text-[#00FF88] drop-shadow-[0_0_22px_rgba(0,255,136,0.4)]">
            {result === 'tails' ? 'T' : 'H'}
          </div>
        </motion.div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 w-full max-w-3xl">
          <div className="rounded-3xl border border-white/10 bg-[#11161d] p-5">
            <div className="text-[10px] uppercase tracking-[0.18em] text-white/20 font-black">Your Call</div>
            <div className="mt-3 text-2xl font-black italic uppercase">{selectedSide}</div>
          </div>
          <div className="rounded-3xl border border-white/10 bg-[#11161d] p-5">
            <div className="text-[10px] uppercase tracking-[0.18em] text-white/20 font-black">Last Result</div>
            <div className="mt-3 text-2xl font-black italic uppercase">{result || 'Waiting'}</div>
          </div>
          <div className="rounded-3xl border border-white/10 bg-[#11161d] p-5">
            <div className="text-[10px] uppercase tracking-[0.18em] text-white/20 font-black">Outcome</div>
            <div className={cn(
              'mt-3 text-2xl font-black italic uppercase',
              result === null ? 'text-white/40' : result === selectedSide ? 'text-[#00FF88]' : 'text-red-400'
            )}>
              {result === null ? (isFlipping ? 'Flipping' : 'Ready') : result === selectedSide ? 'Win' : 'Loss'}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
