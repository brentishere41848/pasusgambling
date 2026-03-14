import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { useBalance } from '../../context/BalanceContext';
import { cn } from '../../lib/utils';
import { Play, Dice5, Zap, RotateCcw, Timer } from 'lucide-react';

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

  const winChance = isOver ? 100 - target : target;
  const multiplier = (98 / winChance).toFixed(4); // 2% house edge

  const roll = useCallback(() => {
    if (subtractBalance(bet)) {
      setIsRolling(true);
      
      const rollDuration = isFast ? 100 : 500;
      
      setTimeout(() => {
        const result = Math.floor(Math.random() * 100) + 1;
        setLastRoll(result);
        
        const won = isOver ? result > target : result < target;
        if (won) {
          addBalance(bet * Number(multiplier));
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
        <div className="w-full max-w-md">
          <div className="flex justify-between text-[10px] text-white/20 mb-4 uppercase tracking-widest">
            <span>0</span>
            <span>25</span>
            <span>50</span>
            <span>75</span>
            <span>100</span>
          </div>
          <div className="h-4 bg-[#1a1a1a] rounded-full relative">
            <div 
              className={cn(
                "absolute h-full rounded-full transition-all duration-300",
                isOver ? "right-0 bg-[#00FF88]/20" : "left-0 bg-[#00FF88]/20"
              )}
              style={{ width: `${isOver ? 100 - target : target}%` }}
            />
            <input
              type="range"
              min="2"
              max="98"
              value={target}
              onChange={(e) => setTarget(Number(e.target.value))}
              disabled={isRolling || isAuto}
              className="absolute inset-0 w-full h-full appearance-none bg-transparent cursor-pointer [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-8 [&::-webkit-slider-thumb]:h-8 [&::-webkit-slider-thumb]:bg-white [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:shadow-xl disabled:cursor-not-allowed"
            />
          </div>
        </div>

        <div className="relative h-48 flex items-center justify-center">
          <AnimatePresence mode="wait">
            {isRolling ? (
              <motion.div
                key="rolling"
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ 
                  opacity: 1, 
                  scale: 1,
                  rotateX: [0, 360, 720, 1080],
                  rotateY: [0, 360, 720, 1080],
                  rotateZ: [0, 360, 720, 1080]
                }}
                exit={{ opacity: 0, scale: 1.2 }}
                transition={{ 
                  duration: 0.5, 
                  ease: "easeInOut",
                  repeat: Infinity
                }}
                className="perspective-1000"
              >
                <div className="w-24 h-24 bg-[#1a1d23] border-2 border-white/20 rounded-2xl flex items-center justify-center shadow-[0_0_30px_rgba(255,255,255,0.1)]">
                  <Dice5 size={48} className="text-[#00FF88] animate-pulse" />
                </div>
              </motion.div>
            ) : lastRoll !== null ? (
              <motion.div
                key={lastRoll}
                initial={{ scale: 0.5, opacity: 0, y: 40, rotateX: -90 }}
                animate={{ scale: 1, opacity: 1, y: 0, rotateX: 0 }}
                transition={{ type: "spring", damping: 12, stiffness: 200 }}
                className="flex flex-col items-center gap-4"
              >
                <div className={cn(
                  "text-9xl font-black tracking-tighter drop-shadow-[0_0_30px_rgba(0,0,0,0.5)]",
                  (isOver ? lastRoll > target : lastRoll < target) ? "text-[#00FF88]" : "text-red-500"
                )}>
                  {lastRoll}
                </div>
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className={cn(
                    "px-4 py-1 rounded-full text-[10px] font-black uppercase tracking-widest",
                    (isOver ? lastRoll > target : lastRoll < target) ? "bg-[#00FF88]/10 text-[#00FF88]" : "bg-red-500/10 text-red-500"
                  )}
                >
                  {(isOver ? lastRoll > target : lastRoll < target) ? 'Winner' : 'Lost'}
                </motion.div>
              </motion.div>
            ) : (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 0.2 }}
                className="text-8xl font-black text-white italic"
              >
                ??
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
};
