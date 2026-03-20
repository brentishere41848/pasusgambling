import React, { useEffect, useRef, useState } from 'react';
import { motion } from 'motion/react';
import { Play, RotateCcw, Timer, Zap } from 'lucide-react';
import confetti from 'canvas-confetti';
import { useBalance } from '../../context/BalanceContext';
import { logBetActivity } from '../../lib/activity';
import { cn } from '../../lib/utils';

function rollLimboMultiplier() {
  const edge = 0.99;
  const roll = Math.max(Math.random(), 1e-6);
  const raw = edge / roll;
  return Math.max(1, Math.floor(raw * 100) / 100);
}

export const LimboGame: React.FC = () => {
  const { balance, addBalance, subtractBalance } = useBalance();
  const [bet, setBet] = useState(10);
  const [target, setTarget] = useState(2);
  const [result, setResult] = useState<number | null>(null);
  const [isRolling, setIsRolling] = useState(false);
  const [isAuto, setIsAuto] = useState(false);
  const [isFast, setIsFast] = useState(false);
  const [autoRounds, setAutoRounds] = useState(10);
  const [remainingRounds, setRemainingRounds] = useState(0);
  const [displayValue, setDisplayValue] = useState(1);
  const intervalRef = useRef<number | null>(null);

  const clearTicker = () => {
    if (intervalRef.current !== null) {
      window.clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
  };

  useEffect(() => clearTicker, []);

  const runRound = () => {
    if (!subtractBalance(bet)) {
      setIsAuto(false);
      setRemainingRounds(0);
      return;
    }

    setIsRolling(true);
    setResult(null);
    const landed = rollLimboMultiplier();
    const duration = isFast ? 420 : 1200;
    const startedAt = Date.now();

    clearTicker();
    intervalRef.current = window.setInterval(() => {
      const progress = Math.min(1, (Date.now() - startedAt) / duration);
      const eased = 1 + (landed - 1) * (1 - Math.pow(1 - progress, 3));
      setDisplayValue(Number(eased.toFixed(2)));
    }, 40);

    window.setTimeout(() => {
      clearTicker();
      setDisplayValue(landed);
      setResult(landed);
      const won = landed >= target;
      const payout = won ? Math.round(bet * target) : 0;

      if (won) {
        addBalance(payout);
        logBetActivity({
          gameKey: 'limbo',
          wager: bet,
          payout,
          multiplier: target,
          outcome: 'win',
          detail: `Target ${target.toFixed(2)}x, landed ${landed.toFixed(2)}x`,
        });
        if (landed >= target * 2) {
          confetti({ particleCount: 60, spread: 60, origin: { y: 0.58 } });
        }
      } else {
        logBetActivity({
          gameKey: 'limbo',
          wager: bet,
          payout: 0,
          multiplier: 0,
          outcome: 'loss',
          detail: `Target ${target.toFixed(2)}x, landed ${landed.toFixed(2)}x`,
        });
      }

      setIsRolling(false);
      if (isAuto && remainingRounds > 1) {
        setRemainingRounds((current) => current - 1);
      } else if (isAuto) {
        setIsAuto(false);
        setRemainingRounds(0);
      }
    }, duration);
  };

  useEffect(() => {
    if (isAuto && remainingRounds > 0 && !isRolling) {
      const timer = window.setTimeout(runRound, isFast ? 80 : 350);
      return () => window.clearTimeout(timer);
    }
    return undefined;
  }, [isAuto, remainingRounds, isRolling, isFast]);

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
              disabled={isRolling || isAuto}
              className="w-full bg-black border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-[#00FF88]/50"
            />
          </div>

          <div>
            <label className="text-xs uppercase tracking-widest text-white/40 mb-2 block">Target Multiplier</label>
            <input
              type="number"
              step="0.01"
              min="1.01"
              value={target}
              onChange={(e) => setTarget(Math.max(1.01, Number(e.target.value)))}
              disabled={isRolling || isAuto}
              className="w-full bg-black border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-[#00FF88]/50"
            />
          </div>

          <div className="grid grid-cols-3 gap-2">
            {[1.5, 2, 5].map((value) => (
              <button
                key={value}
                onClick={() => setTarget(value)}
                disabled={isRolling || isAuto}
                className="rounded-xl bg-white/5 px-3 py-2 text-[10px] font-black uppercase tracking-widest text-white/60 disabled:opacity-40"
              >
                {value}x
              </button>
            ))}
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
            <input
              type="number"
              value={autoRounds}
              onChange={(e) => setAutoRounds(Math.max(1, Number(e.target.value)))}
              disabled={isRolling || isAuto}
              className="w-full bg-black border border-white/10 rounded-xl px-4 py-2 text-xs text-white focus:outline-none focus:border-[#00FF88]/50"
            />
          )}

          <button
            onClick={isAuto ? toggleAuto : runRound}
            disabled={(balance < bet && !isAuto) || isRolling}
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
                START LIMBO
              </>
            )}
          </button>
        </div>

        <div className="mt-auto space-y-3">
          <div className="flex justify-between text-xs">
            <span className="text-white/40">Target</span>
            <span className="text-white font-mono">{target.toFixed(2)}x</span>
          </div>
          <div className="flex justify-between text-xs">
            <span className="text-white/40">Potential Payout</span>
            <span className="text-[#00FF88] font-mono">{Math.round(bet * target).toLocaleString()}</span>
          </div>
        </div>
      </div>

      <div className="lg:col-span-3 bg-black border border-white/10 rounded-2xl p-10 flex flex-col items-center justify-center gap-8 min-h-[560px]">
        <div className="text-[10px] uppercase tracking-[0.28em] text-white/25 font-black">Beat the target</div>
        <motion.div
          animate={{
            scale: isRolling ? [1, 1.04, 1] : 1,
            opacity: isRolling ? [0.8, 1, 0.9, 1] : 1,
          }}
          transition={{ duration: isFast ? 0.42 : 1.2 }}
          className="rounded-full border border-[#00FF88]/25 bg-[radial-gradient(circle_at_center,rgba(0,255,136,0.14),rgba(255,255,255,0.02))] shadow-[0_0_90px_rgba(0,255,136,0.08)] px-16 py-14"
        >
          <div className={cn('text-7xl md:text-8xl font-black tracking-tight', result !== null && result >= target ? 'text-[#00FF88]' : 'text-white')}>
            {displayValue.toFixed(2)}x
          </div>
        </motion.div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 w-full max-w-3xl">
          <div className="rounded-3xl border border-white/10 bg-[#11161d] p-5">
            <div className="text-[10px] uppercase tracking-[0.18em] text-white/20 font-black">Target</div>
            <div className="mt-3 text-2xl font-black">{target.toFixed(2)}x</div>
          </div>
          <div className="rounded-3xl border border-white/10 bg-[#11161d] p-5">
            <div className="text-[10px] uppercase tracking-[0.18em] text-white/20 font-black">Last Result</div>
            <div className="mt-3 text-2xl font-black">{result === null ? 'Waiting' : `${result.toFixed(2)}x`}</div>
          </div>
          <div className="rounded-3xl border border-white/10 bg-[#11161d] p-5">
            <div className="text-[10px] uppercase tracking-[0.18em] text-white/20 font-black">Outcome</div>
            <div className={cn('mt-3 text-2xl font-black uppercase', result === null ? 'text-white/40' : result >= target ? 'text-[#00FF88]' : 'text-red-400')}>
              {result === null ? (isRolling ? 'Rolling' : 'Ready') : result >= target ? 'Win' : 'Loss'}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
