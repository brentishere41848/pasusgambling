import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { useBalance } from '../../context/BalanceContext';
import { cn } from '../../lib/utils';
import { Play, Zap, RotateCcw, Timer } from 'lucide-react';
import { logBetActivity } from '../../lib/activity';

export const DiceGame: React.FC = () => {
  const { balance, addBalance, subtractBalance } = useBalance();
  const [bet, setBet] = useState(10);
  const [target, setTarget] = useState(50);
  const [isOver, setIsOver] = useState(true);
  const [lastRoll, setLastRoll] = useState<number | null>(null);
  const [isRolling, setIsRolling] = useState(false);
  const [isAuto, setIsAuto] = useState(false);
  const [isFast, setIsFast] = useState(false);
  const [autoRounds, setAutoRounds] = useState(10);
  const [remainingRounds, setRemainingRounds] = useState(0);
  const [displayRoll, setDisplayRoll] = useState(50);
  const [didWin, setDidWin] = useState<boolean | null>(null);

  const winChance = isOver ? 100 - target : target;
  const multiplier = (90 / winChance).toFixed(4); // 10% house edge

  const roll = useCallback(() => {
    if (subtractBalance(bet)) {
      setIsRolling(true);
      setDidWin(null);
      
      const rollDuration = isFast ? 350 : 850;
      
      setTimeout(() => {
        const result = Math.floor(Math.random() * 100) + 1;
        setLastRoll(result);
        setDisplayRoll(result);
        
        const won = isOver ? result > target : result < target;
        setDidWin(won);
        if (won) {
          const payout = bet * Number(multiplier);
          addBalance(payout);
          logBetActivity({ gameKey: 'dice', wager: bet, payout, multiplier: Number(multiplier), outcome: 'win', detail: `Rolled ${result}` });
        } else {
          logBetActivity({ gameKey: 'dice', wager: bet, payout: 0, multiplier: 0, outcome: 'loss', detail: `Rolled ${result}` });
        }
        
        setIsRolling(false);
        
        if (isAuto && remainingRounds > 1) {
          setRemainingRounds(prev => prev - 1);
        } else if (isAuto) {
          setIsAuto(false);
          setRemainingRounds(0);
        }
      }, rollDuration);
    } else {
      setIsAuto(false);
      setRemainingRounds(0);
    }
  }, [bet, target, isOver, multiplier, isFast, isAuto, remainingRounds, subtractBalance, addBalance]);

  useEffect(() => {
    if (isAuto && remainingRounds > 0 && !isRolling) {
      const timer = setTimeout(roll, isFast ? 50 : 300);
      return () => clearTimeout(timer);
    }
  }, [isAuto, remainingRounds, isRolling, roll, isFast]);

  const startAuto = () => {
    if (isAuto) {
      setIsAuto(false);
      setRemainingRounds(0);
    } else {
      setIsAuto(true);
      setRemainingRounds(autoRounds);
    }
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
              disabled={isRolling || isAuto}
              className="w-full bg-black border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-[#00FF88]/50"
            />
          </div>

          <div className="grid grid-cols-2 gap-2">
            <button
              onClick={() => setIsOver(false)}
              disabled={isRolling || isAuto}
              className={cn(
                "py-2 rounded-lg text-xs font-bold transition-all",
                !isOver ? "bg-white text-black" : "bg-white/5 text-white/40"
              )}
            >
              ROLL UNDER
            </button>
            <button
              onClick={() => setIsOver(true)}
              disabled={isRolling || isAuto}
              className={cn(
                "py-2 rounded-lg text-xs font-bold transition-all",
                isOver ? "bg-white text-black" : "bg-white/5 text-white/40"
              )}
            >
              ROLL OVER
            </button>
          </div>

          <div className="flex gap-2">
            <button
              onClick={() => setIsFast(!isFast)}
              className={cn(
                "flex-1 py-2 rounded-lg text-[10px] font-black uppercase tracking-widest flex items-center justify-center gap-2 transition-all",
                isFast ? "bg-yellow-500/20 text-yellow-500 border border-yellow-500/50" : "bg-white/5 text-white/20 border border-transparent"
              )}
            >
              <Zap size={12} fill={isFast ? "currentColor" : "none"} />
              FAST
            </button>
            <button
              onClick={startAuto}
              className={cn(
                "flex-1 py-2 rounded-lg text-[10px] font-black uppercase tracking-widest flex items-center justify-center gap-2 transition-all",
                isAuto ? "bg-[#00FF88]/20 text-[#00FF88] border border-[#00FF88]/50" : "bg-white/5 text-white/20 border border-transparent"
              )}
            >
              <RotateCcw size={12} className={isAuto ? "animate-spin" : ""} />
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
                disabled={isRolling || isAuto}
                className="w-full bg-black border border-white/10 rounded-xl px-4 py-2 text-xs text-white focus:outline-none focus:border-[#00FF88]/50"
              />
            </div>
          )}

          <button
            onClick={isAuto ? startAuto : roll}
            disabled={(balance < bet && !isAuto) || (isRolling && !isAuto)}
            className={cn(
              "w-full py-4 rounded-xl font-bold transition-all flex items-center justify-center gap-2 disabled:opacity-50",
              isAuto ? "bg-red-500 text-white" : "bg-[#00FF88] text-black"
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
                ROLL DICE
              </>
            )}
          </button>
        </div>

        <div className="mt-auto space-y-3">
          <div className="flex justify-between text-xs">
            <span className="text-white/40">Multiplier</span>
            <span className="text-white font-mono">{multiplier}x</span>
          </div>
          <div className="flex justify-between text-xs">
            <span className="text-white/40">Win Chance</span>
            <span className="text-white font-mono">{winChance.toFixed(2)}%</span>
          </div>
        </div>
      </div>

      <div className="lg:col-span-3 bg-black border border-white/10 rounded-2xl p-12 flex flex-col items-center justify-center gap-12">
        <div className="w-full max-w-3xl rounded-[28px] border border-white/10 bg-[#0f1218] px-8 py-10">
          <div className="mb-10 flex items-center justify-between text-[10px] uppercase tracking-[0.28em] text-white/20">
            <span>0</span>
            <span>25</span>
            <span>50</span>
            <span>75</span>
            <span>100</span>
          </div>

          <div className="relative pt-16">
            <div className="absolute left-0 right-0 top-0 flex justify-center">
              <motion.div
                initial={false}
                animate={{
                  x: `calc(${displayRoll}% - 50%)`,
                  y: isRolling ? [-6, 0, -6] : 0,
                  scale: isRolling ? [1, 1.06, 1] : 1,
                  backgroundColor: didWin === null ? "#ffffff" : didWin ? "#00FF88" : "#6b7280",
                  color: didWin === null ? "#000000" : didWin ? "#000000" : "#ffffff"
                }}
                transition={
                  isRolling
                    ? { duration: 0.35, repeat: Infinity, ease: "easeInOut" }
                    : { type: "spring", stiffness: 180, damping: 20, mass: 0.7 }
                }
                className="flex h-16 w-16 items-center justify-center rounded-full text-xl font-black shadow-[0_0_30px_rgba(0,0,0,0.35)]"
              >
                {isRolling ? displayRoll : lastRoll ?? displayRoll}
              </motion.div>
            </div>

            <div className="relative h-24">
              <div className="absolute inset-x-0 top-1/2 h-[6px] -translate-y-1/2 rounded-full bg-white/10" />
              <div
                className={cn(
                  "absolute top-1/2 h-[6px] -translate-y-1/2 rounded-full",
                  isOver ? "right-0 bg-[#00FF88]/35" : "left-0 bg-[#00FF88]/35"
                )}
                style={{ width: `${isOver ? 100 - target : target}%` }}
              />
              <div
                className="absolute top-1/2 h-10 w-[2px] -translate-y-1/2 bg-white/35"
                style={{ left: `${target}%` }}
              />
              <motion.div
                initial={false}
                animate={{ left: `${displayRoll}%` }}
                transition={{ type: "spring", stiffness: 190, damping: 22, mass: 0.7 }}
                className="absolute top-1/2 h-16 w-[3px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-white shadow-[0_0_18px_rgba(255,255,255,0.35)]"
              />

              <div className="absolute inset-x-0 bottom-0 flex justify-between text-[10px] uppercase tracking-[0.28em] text-white/30">
                <span>00</span>
                <span>20</span>
                <span>40</span>
                <span>60</span>
                <span>80</span>
                <span>100</span>
              </div>
            </div>

            <input
              type="range"
              min="2"
              max="98"
              value={target}
              onChange={(e) => setTarget(Number(e.target.value))}
              disabled={isRolling || isAuto}
              className="mt-4 h-2 w-full appearance-none rounded-full bg-white/5 cursor-pointer [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:h-6 [&::-webkit-slider-thumb]:w-6 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-white [&::-webkit-slider-thumb]:shadow-xl disabled:cursor-not-allowed"
            />
          </div>

          <div className="mt-8 flex flex-wrap items-center justify-between gap-4">
            <div className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3">
              <div className="text-[10px] uppercase tracking-[0.24em] text-white/30">Target</div>
              <div className="mt-1 text-2xl font-black text-white">{target}</div>
            </div>
            <AnimatePresence mode="wait">
              <motion.div
                key={didWin === null ? "idle" : didWin ? "win" : "lose"}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                className={cn(
                  "rounded-full px-5 py-2 text-[11px] font-black uppercase tracking-[0.24em]",
                  didWin === null ? "bg-white/5 text-white/40" : didWin ? "bg-[#00FF88]/10 text-[#00FF88]" : "bg-white/10 text-white/50"
                )}
              >
                {didWin === null ? "Ready to roll" : didWin ? "Winner" : "Lost"}
              </motion.div>
            </AnimatePresence>
          </div>
        </div>
      </div>
    </div>
  );
};
