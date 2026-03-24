import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { useBalance } from '../../context/BalanceContext';
import { cn } from '../../lib/utils';
import { Play, Zap, RotateCcw, Target, Sparkles, DollarSign } from 'lucide-react';
import { QuickBetButtons, GameStatsBar, useLocalGameStats, useGameHotkeys } from './GameHooks';
import confetti from 'canvas-confetti';
import { logBetActivity } from '../../lib/activity';

type RiskLevel = 'low' | 'medium' | 'high';

const ROW_COUNTS = [8, 10, 12, 14, 16] as const;

const MULTIPLIERS: Record<number, Record<RiskLevel, number[]>> = {
  8: {
    low: [5, 2.5, 1.5, 1.2, 0.8, 1.2, 1.5, 2.5, 5],
    medium: [10, 4, 2, 1.1, 0.5, 1.1, 2, 4, 10],
    high: [25, 7, 3, 1.3, 0.3, 1.3, 3, 7, 25],
  },
  10: {
    low: [8, 3, 2, 1.3, 0.9, 0.6, 0.9, 1.3, 2, 3, 8],
    medium: [15, 5, 2.5, 1.5, 0.7, 0.4, 0.7, 1.5, 2.5, 5, 15],
    high: [50, 10, 4, 1.8, 0.5, 0.2, 0.5, 1.8, 4, 10, 50],
  },
  12: {
    low: [12, 4.5, 2.5, 1.5, 1.1, 0.8, 0.5, 0.8, 1.1, 1.5, 2.5, 4.5, 12],
    medium: [25, 7, 3.2, 1.8, 0.9, 0.5, 0.3, 0.5, 0.9, 1.8, 3.2, 7, 25],
    high: [100, 15, 5, 2, 0.8, 0.4, 0.15, 0.4, 0.8, 2, 5, 15, 100],
  },
  14: {
    low: [18, 6, 3.2, 2, 1.3, 1, 0.7, 0.5, 0.7, 1, 1.3, 2, 3.2, 6, 18],
    medium: [40, 10, 4.5, 2.2, 1.2, 0.7, 0.4, 0.25, 0.4, 0.7, 1.2, 2.2, 4.5, 10, 40],
    high: [200, 25, 8, 3, 1.2, 0.6, 0.3, 0.12, 0.3, 0.6, 1.2, 3, 8, 25, 200],
  },
  16: {
    low: [25, 8, 4.5, 2.5, 1.6, 1.2, 0.9, 0.6, 0.4, 0.6, 0.9, 1.2, 1.6, 2.5, 4.5, 8, 25],
    medium: [65, 14, 6, 3, 1.6, 1, 0.6, 0.35, 0.2, 0.35, 0.6, 1, 1.6, 3, 6, 14, 65],
    high: [500, 45, 12, 4.5, 1.8, 0.8, 0.35, 0.15, 0.08, 0.15, 0.35, 0.8, 1.8, 4.5, 12, 45, 500],
  },
};

const BALL_COLORS = ['#ff6b6b', '#ffd93d', '#6bcb77', '#4d96ff', '#9b59b6', '#ff85a1'];

export const PlinkoGame: React.FC = () => {
  const { balance, addBalance, subtractBalance } = useBalance();
  const [bet, setBet] = useState(10);
  const [rows, setRows] = useState<number>(10);
  const [risk, setRisk] = useState<RiskLevel>('medium');
  const [isAuto, setIsAuto] = useState(false);
  const [autoCount, setAutoCount] = useState(10);
  const [lastResult, setLastResult] = useState<{ multiplier: number; payout: number } | null>(null);
  const [ballCount, setBallCount] = useState(0);
  const [isDropping, setIsDropping] = useState(false);
  const [balls, setBalls] = useState<Array<{ id: number; x: number; y: number; color: string }>>([]);
  const [pegHits, setPegHits] = useState<number>(0);
  
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const ballsRef = useRef<Array<{ x: number; y: number; vx: number; vy: number; color: string; trail: Array<{ x: number; y: number }> }>>([]);
  const animationRef = useRef<number>();
  const autoTimerRef = useRef<NodeJS.Timeout | null>(null);
  const ballIdRef = useRef(0);

  const { getStats, recordBet } = useLocalGameStats('plinko');
  const stats = getStats();

  const multipliers = useMemo(() => MULTIPLIERS[rows][risk], [rows, risk]);

  const canDrop = !isDropping && balance >= bet;

  const dropBall = useCallback(() => {
    if (!canDrop) return;

    const cost = bet;
    if (!subtractBalance(cost)) return;

    setIsDropping(true);
    setLastResult(null);
    setPegHits(0);

    const newBall = {
      id: ballIdRef.current++,
      x: 280 + (Math.random() - 0.5) * 20,
      y: 30,
      color: BALL_COLORS[Math.floor(Math.random() * BALL_COLORS.length)],
    };
    
    ballsRef.current = [{ x: newBall.x, y: newBall.y, vx: 0, vy: 0, color: newBall.color, trail: [] }];
    setBalls([newBall]);
    setBallCount(prev => prev + 1);

    const evaluateAfterDelay = () => {
      const multiplier = multipliers[Math.floor(Math.random() * multipliers.length)];
      const payout = Math.round(bet * multiplier);
      
      addBalance(payout);
      setLastResult({ multiplier, payout });
      
      if (payout > bet * 2) {
        confetti({ particleCount: 80, spread: 60, origin: { y: 0.7 } });

        logBetActivity({
          gameKey: 'plinko',
          wager: bet,
          payout,
          multiplier,
          outcome: 'win',
          detail: `Hit ${multiplier}x`,
        });
        recordBet(bet, payout, true);
      } else {
        logBetActivity({
          gameKey: 'plinko',
          wager: bet,
          payout: 0,
          multiplier: 0,
          outcome: 'loss',
          detail: `Hit ${multiplier}x`,
        });
        recordBet(bet, 0, false);
      }

      setIsDropping(false);

      if (isAuto && autoCount > 0) {
        setAutoCount(prev => prev - 1);
        if (autoCount - 1 <= 0) {
          setIsAuto(false);
        }
      }
    };

    setTimeout(evaluateAfterDelay, 2000);
  }, [canDrop, bet, subtractBalance, addBalance, multipliers, isAuto, autoCount, recordBet]);

  useGameHotkeys({
    onBet: dropBall,
    isDisabled: !canDrop,
  });

  useEffect(() => {
    if (isAuto && autoCount > 0 && !isDropping) {
      autoTimerRef.current = setTimeout(dropBall, 300);
    }
    return () => {
      if (autoTimerRef.current) clearTimeout(autoTimerRef.current);
    };
  }, [isAuto, autoCount, isDropping, dropBall]);

  const toggleAuto = () => {
    if (isAuto) {
      setIsAuto(false);
      setAutoCount(10);
    } else {
      setIsAuto(true);
      setAutoCount(10);
    }
  };

  const getRiskColor = (r: RiskLevel) => {
    switch (r) {
      case 'low': return 'text-green-400';
      case 'medium': return 'text-yellow-400';
      case 'high': return 'text-red-400';
    }
  };

  const getMultiplierColor = (m: number) => {
    if (m >= 100) return 'text-red-400';
    if (m >= 10) return 'text-yellow-400';
    if (m >= 1) return 'text-green-400';
    return 'text-white/40';
  };

  return (
    <div className="flex flex-col lg:grid lg:grid-cols-5 gap-6 p-4 max-w-6xl mx-auto">
      <div className="lg:col-span-1 space-y-4">
        <div className="bg-[#1a1d23] border border-white/5 rounded-2xl p-5">
          <div className="space-y-4">
            <div>
              <label className="text-[10px] uppercase tracking-widest text-white/40 mb-2 block">Bet Amount</label>
              <input
                type="number"
                value={bet}
                onChange={(e) => setBet(Math.max(1, Number(e.target.value)))}
                min="0.01"
                step="0.01"
                disabled={isAuto}
                className="w-full bg-[#0f1115] border border-white/10 rounded-xl px-4 py-3 text-white font-mono text-xl focus:outline-none focus:border-[#00FF88]/50"
              />
              <div className="text-[9px] text-white/25 mt-1">Min: $0.01</div>
              <QuickBetButtons balance={balance} bet={bet} onSetBet={setBet} disabled={isAuto} />
            </div>

            <div>
              <label className="text-[10px] uppercase tracking-widest text-white/40 mb-2 block">Rows</label>
              <div className="grid grid-cols-5 gap-1">
                {ROW_COUNTS.map((r) => (
                  <button
                    key={r}
                    onClick={() => setRows(r)}
                    disabled={isAuto}
                    className={cn(
                      'py-2 rounded-lg text-xs font-black transition-all',
                      rows === r 
                        ? 'bg-[#00FF88] text-black' 
                        : 'bg-white/5 text-white/40 hover:text-white'
                    )}
                  >
                    {r}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="text-[10px] uppercase tracking-widest text-white/40 mb-2 block">Risk</label>
              <div className="grid grid-cols-3 gap-1">
                {(['low', 'medium', 'high'] as RiskLevel[]).map((r) => (
                  <button
                    key={r}
                    onClick={() => setRisk(r)}
                    disabled={isAuto}
                    className={cn(
                      'py-2 rounded-lg text-[10px] font-black uppercase transition-all',
                      risk === r 
                        ? getRiskColor(r) + ' bg-white/10 border border-' + r 
                        : 'bg-white/5 text-white/40 hover:text-white'
                    )}
                    style={{
                      borderColor: risk === r ? (r === 'low' ? '#4ade80' : r === 'medium' ? '#facc15' : '#f87171') : 'transparent'
                    }}
                  >
                    {r}
                  </button>
                ))}
              </div>
            </div>

            <button
              onClick={toggleAuto}
              disabled={isDropping}
              className={cn(
                'w-full py-3 rounded-xl font-black text-sm uppercase tracking-wider transition-all flex items-center justify-center gap-2',
                isAuto 
                  ? 'bg-red-500/20 text-red-400 border border-red-500/50' 
                  : 'bg-white/10 text-white/60 border border-white/10 hover:bg-white/20'
              )}
            >
              <RotateCcw size={16} className={isAuto ? 'animate-spin' : ''} />
              {isAuto ? `Auto (${autoCount})` : 'Auto Play'}
            </button>

            <button
              onClick={dropBall}
              disabled={!canDrop}
              className={cn(
                'w-full py-4 rounded-xl font-black text-lg uppercase tracking-wider transition-all flex items-center justify-center gap-2',
                isAuto || isDropping
                  ? 'bg-yellow-500/20 text-yellow-400 border border-yellow-500/50'
                  : 'bg-[#00FF88] hover:bg-[#00FF88]/90 text-black shadow-lg shadow-[#00FF88]/30',
                !canDrop && 'opacity-50'
              )}
            >
              {isDropping ? (
                <motion.div
                  animate={{ rotate: 360 }}
                  transition={{ repeat: Infinity, duration: 1 }}
                >
                  <Zap size={20} />
                </motion.div>
              ) : (
                <Play size={20} fill="currentColor" />
              )}
              {isDropping ? 'Dropping...' : 'Drop Ball'}
            </button>
          </div>
        </div>

        <GameStatsBar stats={[
          { label: 'Drops', value: String(stats.totalBets) },
          { label: 'Wins', value: String(stats.totalWins) },
          { label: 'Biggest', value: `${stats.biggestWin.toFixed(1)}x` },
          { label: 'Wagered', value: `$${(stats.totalWagered / 100).toFixed(2)}` },
        ]} />

        <div className="bg-[#1a1d23] border border-white/5 rounded-2xl p-4">
          <div className="text-[10px] uppercase tracking-widest text-white/40 mb-3">Payouts</div>
          <div className="grid grid-cols-3 gap-1 max-h-32 overflow-y-auto">
            {multipliers.map((m, i) => (
              <div 
                key={i} 
                className={cn(
                  'text-center py-1 rounded text-[10px] font-black',
                  getMultiplierColor(m)
                )}
              >
                {m.toFixed(1)}x
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="lg:col-span-4">
        <div className="relative bg-gradient-to-b from-[#1a1d23] to-[#0a0a0a] border border-white/10 rounded-3xl p-6 overflow-hidden min-h-[500px]">
          <div className="absolute inset-0 opacity-5" style={{
            backgroundImage: `
              linear-gradient(rgba(255,255,255,0.03) 1px, transparent 1px),
              linear-gradient(90deg, rgba(255,255,255,0.03) 1px, transparent 1px)
            `,
            backgroundSize: '25px 25px'
          }} />

          <AnimatePresence>
            {lastResult && (
              <motion.div
                initial={{ scale: 0.5, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.5, opacity: 0 }}
                className="absolute top-4 left-1/2 -translate-x-1/2 z-30"
              >
                <div className={cn(
                  'px-8 py-4 rounded-2xl border backdrop-blur-md',
                  lastResult.payout > bet 
                    ? 'bg-green-500/20 border-green-500/50 shadow-lg shadow-green-500/30' 
                    : 'bg-red-500/20 border-red-500/50'
                )}>
                  <div className="text-center">
                    <div className={cn('text-3xl font-black', getMultiplierColor(lastResult.multiplier))}>
                      {lastResult.multiplier.toFixed(1)}x
                    </div>
                    <div className="text-lg font-black text-white mt-1">
                      {lastResult.payout > bet ? '+' : '-'}$
                      {Math.abs(lastResult.payout / 100).toFixed(2)}
                    </div>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          <div className="relative z-10">
            <div className="text-center mb-4">
              <div className="text-[10px] uppercase tracking-[0.3em] text-white/30 font-black">PLINKO</div>
              <div className="text-3xl font-black italic text-white mt-1">
                <span className="text-blue-400">DROP</span>
                <span className="text-white/60"> </span>
                <span className="text-green-400">MULTIPLIERS</span>
              </div>
            </div>

            <div className="flex justify-center gap-4 mb-4">
              {['low', 'medium', 'high'].map((r) => (
                <button
                  key={r}
                  onClick={() => setRisk(r as RiskLevel)}
                  disabled={isAuto}
                  className={cn(
                    'px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-wider transition-all',
                    risk === r 
                      ? getRiskColor(r as RiskLevel) + ' bg-white/10 border'
                      : 'text-white/30 border border-transparent'
                  )}
                  style={{ borderColor: risk === r ? (r === 'low' ? '#4ade80' : r === 'medium' ? '#facc15' : '#f87171') : 'transparent' }}
                >
                  {r}
                </button>
              ))}
              <span className="px-3 py-1.5 rounded-full text-[10px] font-black uppercase tracking-wider text-white/40">
                {rows} rows
              </span>
            </div>

            <div className="relative aspect-[4/3] max-w-lg mx-auto bg-gradient-to-b from-[#0f1923] to-[#080b12] rounded-2xl border border-white/10 overflow-hidden">
              <div className="absolute inset-0 bg-gradient-to-b from-white/[0.02] to-transparent" />

              <div className="absolute top-0 left-0 right-0 h-8 bg-gradient-to-b from-white/5 to-transparent" />

              <div className="absolute bottom-0 left-0 right-0 h-10 bg-gradient-to-t from-black/80 to-transparent" />

              {multipliers.map((m, i) => {
                const width = 100 / multipliers.length;
                return (
                  <div
                    key={i}
                    className="absolute bottom-1 h-10 flex items-center justify-center"
                    style={{
                      left: `${i * width}%`,
                      width: `${width}%`,
                    }}
                  >
                    <div className={cn(
                      'text-xs font-black px-1 py-0.5 rounded',
                      m >= 10 ? 'bg-red-500/30 text-red-400' :
                      m >= 1 ? 'bg-green-500/20 text-green-400' :
                      'bg-white/5 text-white/40'
                    )}>
                      {m.toFixed(1)}x
                    </div>
                  </div>
                );
              })}

              {isDropping && ballsRef.current[0] && (
                <motion.div
                  initial={{ y: 30, x: 0 }}
                  animate={{ y: 320, x: Math.random() * 40 - 20 }}
                  transition={{ duration: 1.5, ease: 'easeIn' }}
                  className="absolute left-1/2 -translate-x-1/2 w-5 h-5 rounded-full shadow-lg"
                  style={{ 
                    backgroundColor: ballsRef.current[0]?.color || '#fff',
                    boxShadow: `0 0 20px ${ballsRef.current[0]?.color || '#fff'}`
                  }}
                />
              )}

              {!isDropping && (
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-white/20 text-5xl font-black uppercase tracking-widest">
                  DROP
                </div>
              )}

              {Array.from({ length: Math.min(rows, 12) }).map((_, rowIndex) => {
                const pegsInRow = rowIndex + 4;
                const rowY = 40 + rowIndex * 26;
                const pegSpacing = 300 / (pegsInRow + 1);
                const startX = (300 - (pegsInRow - 1) * pegSpacing) / 2;
                
                return Array.from({ length: pegsInRow }).map((_, pegIndex) => (
                  <div
                    key={`${rowIndex}-${pegIndex}`}
                    className="absolute w-2.5 h-2.5 rounded-full bg-gradient-to-br from-white/40 to-white/10 shadow-[0_0_6px_rgba(255,255,255,0.2)]"
                    style={{
                      left: `calc(50% - 150px + ${startX + pegIndex * pegSpacing}px)`,
                      top: rowY,
                    }}
                  />
                ));
              })}
            </div>

            <div className="flex justify-center items-center gap-4 mt-4">
              <div className="text-center">
                <div className="text-[10px] uppercase tracking-widest text-white/30">Max Win</div>
                <div className="text-2xl font-black text-green-400">{Math.max(...multipliers).toFixed(1)}x</div>
              </div>
              <div className="w-px h-10 bg-white/10" />
              <div className="text-center">
                <div className="text-[10px] uppercase tracking-widest text-white/30">Min Win</div>
                <div className="text-2xl font-black text-white/40">{Math.min(...multipliers).toFixed(1)}x</div>
              </div>
              <div className="w-px h-10 bg-white/10" />
              <div className="text-center">
                <div className="text-[10px] uppercase tracking-widest text-white/30">Balls</div>
                <div className="text-2xl font-black text-blue-400">{ballCount}</div>
              </div>
            </div>
          </div>

          <div className="absolute bottom-4 right-4 text-[10px] text-white/20">
            Press SPACE to drop
          </div>
        </div>
      </div>
    </div>
  );
};
