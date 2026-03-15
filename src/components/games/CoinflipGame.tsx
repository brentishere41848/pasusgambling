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
  const [coinRotation, setCoinRotation] = useState(0);

  const runFlip = useCallback(() => {
    if (!subtractBalance(bet)) {
      setIsAuto(false);
      setRemainingRounds(0);
      return;
    }

    setIsFlipping(true);
    const landed: CoinSide = Math.random() < 0.5 ? 'heads' : 'tails';
    const extraSpins = isFast ? 6 : 9;
    const finalFaceOffset = landed === 'heads' ? 0 : 180;
    setCoinRotation((current) => current + extraSpins * 360 + finalFaceOffset);
    setResult(null);
    const duration = isFast ? 450 : 1100;

    window.setTimeout(() => {
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
            y: isFlipping ? [0, -34, 0] : 0,
            scale: isFlipping ? [1, 1.03, 1] : 1,
          }}
          transition={{
            duration: isFast ? 0.45 : 1.1,
            ease: 'easeInOut',
          }}
          className="relative [perspective:1400px]"
        >
          <motion.div
            animate={{
              rotateX: coinRotation,
              rotateZ: isFlipping ? [0, -10, 8, 0] : 0,
            }}
            transition={{
              rotateX: {
                duration: isFast ? 0.45 : 1.1,
                ease: [0.18, 0.9, 0.2, 1],
              },
              rotateZ: {
                duration: isFast ? 0.45 : 1.1,
                ease: 'easeInOut',
              },
            }}
            className="relative h-56 w-56"
            style={{ transformStyle: 'preserve-3d' }}
          >
            <div className="absolute inset-[10px] rounded-full bg-[#7fffd4]/25 blur-2xl" />
            <div className="absolute inset-[22px] rounded-full bg-black/60 blur-md" />

            <div
              className="absolute inset-0 rounded-full border border-[#8fffe4]/25 bg-[radial-gradient(circle_at_30%_28%,rgba(255,255,255,0.9),rgba(169,255,235,0.7)_18%,rgba(18,122,107,0.98)_58%,rgba(5,12,16,1)_100%)] shadow-[0_30px_90px_rgba(0,0,0,0.5)]"
              style={{ backfaceVisibility: 'hidden', WebkitBackfaceVisibility: 'hidden' }}
            >
              <div className="absolute inset-[12px] rounded-full border border-white/20" />
              <div className="absolute inset-[26px] rounded-full border border-[#b0fff0]/25" />
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="text-7xl font-black italic tracking-tighter text-[#dffff7] drop-shadow-[0_0_28px_rgba(160,255,230,0.45)]">
                  H
                </div>
              </div>
            </div>

            <div
              className="absolute inset-0 rounded-full border border-[#8fffe4]/25 bg-[radial-gradient(circle_at_30%_28%,rgba(255,255,255,0.9),rgba(169,255,235,0.7)_18%,rgba(18,122,107,0.98)_58%,rgba(5,12,16,1)_100%)] shadow-[0_30px_90px_rgba(0,0,0,0.5)]"
              style={{
                transform: 'rotateX(180deg)',
                backfaceVisibility: 'hidden',
                WebkitBackfaceVisibility: 'hidden',
              }}
            >
              <div className="absolute inset-[12px] rounded-full border border-white/20" />
              <div className="absolute inset-[26px] rounded-full border border-[#b0fff0]/25" />
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="text-7xl font-black italic tracking-tighter text-[#dffff7] drop-shadow-[0_0_28px_rgba(160,255,230,0.45)]">
                  T
                </div>
              </div>
            </div>

            <div
              className="absolute left-[18px] right-[18px] top-1/2 h-5 -translate-y-1/2 rounded-full bg-[linear-gradient(180deg,#d9fff6_0%,#7cebd1_18%,#127a6b_46%,#0a3f38_100%)] opacity-80 blur-[0.3px]"
              style={{
                transform: 'translateY(-50%) rotateX(90deg) translateZ(104px)',
                transformStyle: 'preserve-3d',
              }}
            />
          </motion.div>
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
