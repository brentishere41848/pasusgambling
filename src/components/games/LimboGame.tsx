import React, { useEffect, useRef, useState } from 'react';
import { motion } from 'motion/react';
import { Play, RotateCcw, Timer, Zap } from 'lucide-react';
import confetti from 'canvas-confetti';
import { useBalance } from '../../context/BalanceContext';
import { logBetActivity } from '../../lib/activity';
import { cn } from '../../lib/utils';
import { useGameHotkeys, QuickBetButtons, MobileBetControls, AutoStrategyPanel, GameStatsBar, useLocalGameStats, centsToDollars, dollarsToCents, formatCents, MIN_BET, type AutoStrategyPreset } from './GameHooks';

const MIN_TARGET = 1.01;
const MAX_TARGET = 1000;

function clampTarget(value: number) {
  if (!Number.isFinite(value)) {
    return 2;
  }
  return Math.min(MAX_TARGET, Math.max(MIN_TARGET, Math.round(value * 100) / 100));
}

function rollLimboMultiplier() {
  const edge = 0.99;
  const roll = Math.max(Math.random(), 1e-6);
  const raw = edge / roll;
  return Math.max(1, Math.floor(raw * 100) / 100);
}

export const LimboGame: React.FC = () => {
  const { balance, addBalance, subtractBalance } = useBalance();
  const [bet, setBet] = useState(1);
  const [target, setTarget] = useState(2);
  const [result, setResult] = useState<number | null>(null);
  const [isRolling, setIsRolling] = useState(false);
  const [isAuto, setIsAuto] = useState(false);
  const [isFast, setIsFast] = useState(false);
  const [autoRounds, setAutoRounds] = useState(10);
  const [remainingRounds, setRemainingRounds] = useState(0);
  const [displayValue, setDisplayValue] = useState(1);
  const [baseBet, setBaseBet] = useState(1);
  const [autoPreset, setAutoPreset] = useState<AutoStrategyPreset>('flat');
  const [onWinPercent, setOnWinPercent] = useState(0);
  const [onLossPercent, setOnLossPercent] = useState(0);
  const intervalRef = useRef<number | null>(null);
  const isAutoRef = useRef(false);
  const remainingRoundsRef = useRef(0);
  const { getStats, recordBet } = useLocalGameStats('limbo');
  const stats = getStats();
  const betCents = dollarsToCents(bet);

  const clearTicker = () => { if (intervalRef.current !== null) { window.clearInterval(intervalRef.current); intervalRef.current = null; } };

  useEffect(() => clearTicker, []);

  const stopAuto = () => { setIsAuto(false); setRemainingRounds(0); isAutoRef.current = false; remainingRoundsRef.current = 0; };
  useEffect(() => { isAutoRef.current = isAuto; }, [isAuto]);
  useEffect(() => { remainingRoundsRef.current = remainingRounds; }, [remainingRounds]);

  useEffect(() => {
    setBaseBet((current) => (isAuto ? current : bet));
  }, [bet, isAuto]);

  useEffect(() => {
    if (autoPreset === 'flat') {
      setOnWinPercent(0);
      setOnLossPercent(0);
    } else if (autoPreset === 'martingale') {
      setOnWinPercent(0);
      setOnLossPercent(100);
    } else if (autoPreset === 'paroli') {
      setOnWinPercent(100);
      setOnLossPercent(0);
    } else if (autoPreset === 'reset') {
      setOnWinPercent(0);
      setOnLossPercent(0);
    }
  }, [autoPreset]);

  const runRound = () => {
    const resolvedTarget = clampTarget(target);
    if (!subtractBalance(betCents)) { stopAuto(); return; }
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
      const won = landed >= resolvedTarget;
      const payout = won ? Math.round(betCents * resolvedTarget) : 0;
      if (won) {
        addBalance(payout);
        logBetActivity({ gameKey: 'limbo', wager: betCents, payout, multiplier: resolvedTarget, outcome: 'win', detail: `Target ${resolvedTarget.toFixed(2)}x, landed ${landed.toFixed(2)}x` });
        if (landed >= resolvedTarget * 2) confetti({ particleCount: 60, spread: 60, origin: { y: 0.58 } });
        recordBet(betCents, payout, true);
      } else {
        logBetActivity({ gameKey: 'limbo', wager: betCents, payout: 0, multiplier: 0, outcome: 'loss', detail: `Target ${resolvedTarget.toFixed(2)}x, landed ${landed.toFixed(2)}x` });
        recordBet(betCents, 0, false);
      }
      if (isAutoRef.current) {
        if ((autoPreset === 'reset' && !won) || (won && onWinPercent === 0 && autoPreset !== 'paroli' && autoPreset !== 'flat')) {
          setBet(baseBet);
        } else if (won && onWinPercent > 0) {
          setBet((current) => Math.max(MIN_BET, Math.min(centsToDollars(balance + payout), Number((current * (1 + onWinPercent / 100)).toFixed(2)))));
        } else if (!won && onLossPercent > 0) {
          setBet((current) => Math.max(MIN_BET, Math.min(centsToDollars(balance), Number((current * (1 + onLossPercent / 100)).toFixed(2)))));
        } else if (autoPreset === 'reset') {
          setBet(baseBet);
        }
      }
      setIsRolling(false);
      if (isAutoRef.current && remainingRoundsRef.current > 1) setRemainingRounds(prev => prev - 1);
      else if (isAutoRef.current) stopAuto();
    }, duration);
  };

  useEffect(() => {
    if (isAuto && remainingRounds > 0 && !isRolling) {
      const timer = window.setTimeout(runRound, isFast ? 80 : 350);
      return () => window.clearTimeout(timer);
    }
  }, [isAuto, remainingRounds, isRolling, isFast]);

  const toggleAuto = () => {
    if (isAuto) { stopAuto(); return; }
    setIsAuto(true);
    setRemainingRounds(autoRounds);
    setBaseBet(bet);
    isAutoRef.current = true;
    remainingRoundsRef.current = autoRounds;
  };

  useGameHotkeys({ onBet: runRound, onStop: stopAuto, onAuto: toggleAuto, isDisabled: (balance < betCents && !isAuto) || isRolling });

  return (
    <div className="flex flex-col lg:grid lg:grid-cols-4 gap-6 p-4 md:p-5 max-w-6xl mx-auto">
      <div className="lg:col-span-1 bg-[linear-gradient(180deg,#15112c_0%,#0f0c1d_100%)] border border-violet-300/20 rounded-3xl p-6 flex flex-col gap-4 shadow-[0_20px_65px_rgba(0,0,0,0.35)]">
        <div className="space-y-4">
          <div>
            <label className="text-[10px] font-black uppercase tracking-[0.18em] text-white/45 mb-2 block">Bet Amount</label>
            <input type="number" value={bet} onChange={(e) => setBet(Math.max(MIN_BET, Number(e.target.value)))} min="0.01" step="0.01" disabled={isRolling || isAuto} className="w-full bg-black/45 border border-white/12 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-violet-300/60" />
            <QuickBetButtons balance={centsToDollars(balance)} bet={bet} onSetBet={setBet} disabled={isRolling || isAuto} />
            <MobileBetControls balance={balance} bet={bet} onSetBet={setBet} disabled={isRolling || isAuto} />
          </div>

          <div>
            <label className="text-[10px] font-black uppercase tracking-[0.18em] text-white/45 mb-2 block">Target Multiplier</label>
            <input type="number" step="0.01" min={MIN_TARGET} max={MAX_TARGET} value={target} onChange={(e) => setTarget(clampTarget(Number(e.target.value)))} disabled={isRolling || isAuto} className="w-full bg-black/45 border border-white/12 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-violet-300/60" />
            <div className="mt-2 text-[11px] text-white/30">Custom target supported up to {MAX_TARGET.toFixed(0)}x.</div>
          </div>

          <div className="flex flex-wrap gap-2">
            {[1.5, 2, 5, 100, 1000].map((value) => (
              <button key={value} onClick={() => setTarget(clampTarget(value))} disabled={isRolling || isAuto} className="min-w-[54px] flex-1 rounded-xl bg-white/5 px-3 py-2 text-[10px] font-black uppercase tracking-widest text-white/60 disabled:opacity-40 sm:flex-none">{value}x</button>
            ))}
          </div>

          <div className="flex gap-2">
            <button onClick={() => setIsFast((current) => !current)} className={cn('flex-1 py-2 rounded-lg text-[10px] font-black uppercase tracking-widest flex items-center justify-center gap-2 transition-all', isFast ? 'bg-yellow-500/20 text-yellow-500 border border-yellow-500/50' : 'bg-white/5 text-white/20 border border-transparent')}>
              <Zap size={12} fill={isFast ? 'currentColor' : 'none'} />FAST
            </button>
            <button onClick={toggleAuto} className={cn('flex-1 py-2 rounded-lg text-[10px] font-black uppercase tracking-widest flex items-center justify-center gap-2 transition-all', isAuto ? 'bg-[#00FF88]/20 text-[#00FF88] border border-[#00FF88]/50' : 'bg-white/5 text-white/20 border border-transparent')}>
              <RotateCcw size={12} className={isAuto ? 'animate-spin' : ''} />AUTO
            </button>
          </div>

          {isAuto && (
            <input type="number" value={autoRounds} onChange={(e) => setAutoRounds(Math.max(1, Number(e.target.value)))} disabled={isRolling || isAuto} className="w-full bg-black border border-white/10 rounded-xl px-4 py-2 text-xs text-white focus:outline-none focus:border-[#00FF88]/50" />
          )}

          {isAuto ? (
            <AutoStrategyPanel
              preset={autoPreset}
              onPresetChange={setAutoPreset}
              onWinPercent={onWinPercent}
              onLossPercent={onLossPercent}
              onWinPercentChange={setOnWinPercent}
              onLossPercentChange={setOnLossPercent}
              disabled={isRolling}
            />
          ) : null}

          <button onClick={isAuto ? toggleAuto : runRound} disabled={(balance < betCents && !isAuto) || isRolling} className={cn('w-full py-4 rounded-xl font-bold transition-all flex items-center justify-center gap-2 disabled:opacity-50', isAuto ? 'bg-red-500 text-white' : 'bg-gradient-to-r from-violet-300 to-fuchsia-300 text-slate-900')}>
            {isAuto ? <><Timer size={18} />STOP AUTO</> : <><Play size={18} fill="currentColor" />START LIMBO</>}
          </button>
          <div className="text-[9px] text-center text-white/20 uppercase tracking-widest">Space: Bet &nbsp;|&nbsp; Esc: Stop &nbsp;|&nbsp; A: Auto</div>
        </div>

        <div className="space-y-3">
          <div className="flex justify-between text-xs"><span className="text-white/40">Target</span><span className="text-white font-mono">{clampTarget(target).toFixed(2)}x</span></div>
          <div className="flex justify-between text-xs"><span className="text-white/40">Potential Payout</span><span className="text-[#00FF88] font-mono">{formatCents(Math.round(betCents * clampTarget(target)))}</span></div>
        </div>

        <GameStatsBar stats={[
          { label: 'Bets', value: String(stats.totalBets) },
          { label: 'Wins', value: String(stats.totalWins) },
          { label: 'Biggest', value: formatCents(stats.biggestWin) },
          { label: 'Wagered', value: formatCents(stats.totalWagered) },
        ]} />
      </div>

      <div className="lg:col-span-3 bg-[linear-gradient(180deg,#120f23_0%,#0b0a14_100%)] border border-violet-300/20 rounded-3xl p-10 flex flex-col items-center justify-center gap-8 min-h-[560px] shadow-[0_20px_70px_rgba(0,0,0,0.38)]">
        <div className="text-[10px] uppercase tracking-[0.28em] text-white/25 font-black">Beat the target</div>
        <motion.div
          animate={{ scale: isRolling ? [1, 1.04, 1] : 1, opacity: isRolling ? [0.8, 1, 0.9, 1] : 1 }}
          transition={{ duration: isFast ? 0.42 : 1.2 }}
          className="rounded-full border border-[#00FF88]/25 bg-[radial-gradient(circle_at_center,rgba(0,255,136,0.14),rgba(255,255,255,0.02))] shadow-[0_0_90px_rgba(0,255,136,0.08)] px-16 py-14"
        >
          <div className={cn('text-7xl md:text-8xl font-black tracking-tight', result !== null && result >= clampTarget(target) ? 'text-[#00FF88]' : 'text-white')}>
            {displayValue.toFixed(2)}x
          </div>
        </motion.div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 w-full max-w-3xl">
          <div className="rounded-3xl border border-white/10 bg-[#11161d] p-5"><div className="text-[10px] uppercase tracking-[0.18em] text-white/20 font-black">Target</div><div className="mt-3 text-2xl font-black">{clampTarget(target).toFixed(2)}x</div></div>
          <div className="rounded-3xl border border-white/10 bg-[#11161d] p-5"><div className="text-[10px] uppercase tracking-[0.18em] text-white/20 font-black">Last Result</div><div className="mt-3 text-2xl font-black">{result === null ? 'Waiting' : `${result.toFixed(2)}x`}</div></div>
          <div className="rounded-3xl border border-white/10 bg-[#11161d] p-5"><div className="text-[10px] uppercase tracking-[0.18em] text-white/20 font-black">Outcome</div><div className={cn('mt-3 text-2xl font-black uppercase', result === null ? 'text-white/40' : result >= clampTarget(target) ? 'text-[#00FF88]' : 'text-red-400')}>{result === null ? (isRolling ? 'Rolling' : 'Ready') : result >= clampTarget(target) ? 'Win' : 'Loss'}</div></div>
        </div>
      </div>
    </div>
  );
};
