import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { useBalance } from '../../context/BalanceContext';
import { cn } from '../../lib/utils';
import { Play, RotateCcw } from 'lucide-react';
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

const PEG_COLOR = '#ffffff';
const BALL_RADIUS = 8;
const PEG_RADIUS = 4;
const GRAVITY = 0.3;
const BOUNCE = 0.5;
const FRICTION = 0.99;

export const PlinkoGame: React.FC = () => {
  const { balance, addBalance, subtractBalance } = useBalance();
  const [bet, setBet] = useState(1);
  const [rows, setRows] = useState<number>(12);
  const [risk, setRisk] = useState<RiskLevel>('medium');
  const [isAuto, setIsAuto] = useState(false);
  const [autoCount, setAutoCount] = useState(10);
  const [lastResult, setLastResult] = useState<{ multiplier: number; payout: number } | null>(null);
  const [isDropping, setIsDropping] = useState(false);
  const [droppedBalls, setDroppedBalls] = useState(0);
  const [currentBallPos, setCurrentBallPos] = useState<{ x: number; y: number } | null>(null);
  const [finalPosition, setFinalPosition] = useState<number | null>(null);
  
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const pegsRef = useRef<Array<{ x: number; y: number }>>([]);
  const bucketsRef = useRef<Array<{ x: number; y: number; width: number }>>([]);
  const ballRef = useRef<{ x: number; y: number; vx: number; vy: number } | null>(null);
  const animationRef = useRef<number>();
  const bucketHitRef = useRef(false);

  const { getStats, recordBet } = useLocalGameStats('plinko');
  const stats = getStats();

  const multipliers = useMemo(() => MULTIPLIERS[rows][risk], [rows, risk]);
  const canDrop = !isDropping && balance >= bet;

  const canvasWidth = 400;
  const canvasHeight = 450;
  const topPadding = 40;
  const bucketHeight = 30;

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const pegs: Array<{ x: number; y: number }> = [];
    const pegSpacingY = (canvasHeight - topPadding - bucketHeight) / (rows + 1);
    
    for (let row = 0; row < rows; row++) {
      const pegsInRow = row + 4;
      const rowWidth = (pegsInRow - 1) * 40;
      const startX = (canvasWidth - rowWidth) / 2;
      
      for (let col = 0; col < pegsInRow; col++) {
        pegs.push({
          x: startX + col * 40,
          y: topPadding + (row + 1) * pegSpacingY,
        });
      }
    }
    
    pegsRef.current = pegs;

    const buckets: Array<{ x: number; y: number; width: number }> = [];
    const numBuckets = multipliers.length;
    const bucketWidth = canvasWidth / numBuckets;
    
    for (let i = 0; i < numBuckets; i++) {
      buckets.push({
        x: i * bucketWidth,
        y: canvasHeight - bucketHeight,
        width: bucketWidth,
      });
    }
    
    bucketsRef.current = buckets;

    ctx.clearRect(0, 0, canvasWidth, canvasHeight);

    ctx.fillStyle = '#0f1923';
    ctx.fillRect(0, 0, canvasWidth, canvasHeight);

    ctx.strokeStyle = 'rgba(255,255,255,0.03)';
    ctx.lineWidth = 1;
    for (let x = 0; x < canvasWidth; x += 25) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, canvasHeight);
      ctx.stroke();
    }
    for (let y = 0; y < canvasHeight; y += 25) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(canvasWidth, y);
      ctx.stroke();
    }

    pegs.forEach(peg => {
      const gradient = ctx.createRadialGradient(peg.x - 1, peg.y - 1, 0, peg.x, peg.y, PEG_RADIUS);
      gradient.addColorStop(0, '#ffffff');
      gradient.addColorStop(1, '#888888');
      
      ctx.beginPath();
      ctx.arc(peg.x, peg.y, PEG_RADIUS, 0, Math.PI * 2);
      ctx.fillStyle = gradient;
      ctx.fill();
      
      ctx.shadowColor = 'rgba(255,255,255,0.3)';
      ctx.shadowBlur = 4;
      ctx.beginPath();
      ctx.arc(peg.x, peg.y, PEG_RADIUS, 0, Math.PI * 2);
      ctx.fill();
      ctx.shadowBlur = 0;
    });

    multipliers.forEach((m, i) => {
      const bucketX = i * bucketWidth;
      const isHigh = m >= 10;
      const isMid = m >= 1 && m < 10;
      
      let bgColor = 'rgba(255,255,255,0.1)';
      let textColor = 'rgba(255,255,255,0.5)';
      
      if (isHigh) {
        bgColor = 'rgba(239,68,68,0.3)';
        textColor = '#ef4444';
      } else if (isMid) {
        bgColor = 'rgba(34,197,94,0.2)';
        textColor = '#22c55e';
      }

      ctx.fillStyle = bgColor;
      ctx.fillRect(bucketX + 1, canvasHeight - bucketHeight, bucketWidth - 2, bucketHeight - 1);
      
      ctx.fillStyle = textColor;
      ctx.font = 'bold 10px sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(`${m.toFixed(1)}x`, bucketX + bucketWidth / 2, canvasHeight - bucketHeight / 2);
    });

    ctx.strokeStyle = 'rgba(255,255,255,0.2)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(0, canvasHeight - bucketHeight);
    ctx.lineTo(canvasWidth, canvasHeight - bucketHeight);
    ctx.stroke();

  }, [rows, multipliers, canvasHeight]);

  const dropBall = useCallback(() => {
    if (!canDrop) return;

    const cost = bet;
    if (!subtractBalance(cost)) return;

    setIsDropping(true);
    setLastResult(null);
    setFinalPosition(null);
    bucketHitRef.current = false;

    const startX = canvasWidth / 2 + (Math.random() - 0.5) * 30;
    ballRef.current = {
      x: startX,
      y: 20,
      vx: (Math.random() - 0.5) * 2,
      vy: 0,
    };

    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (!ctx || !canvas) return;

    const animate = () => {
      const ball = ballRef.current;
      if (!ball || bucketHitRef.current) return;

      ball.vy += GRAVITY;
      ball.vx *= FRICTION;
      ball.x += ball.vx;
      ball.y += ball.vy;

      if (ball.x < BALL_RADIUS) {
        ball.x = BALL_RADIUS;
        ball.vx = -ball.vx * BOUNCE;
      }
      if (ball.x > canvasWidth - BALL_RADIUS) {
        ball.x = canvasWidth - BALL_RADIUS;
        ball.vx = -ball.vx * BOUNCE;
      }

      for (const peg of pegsRef.current) {
        const dx = ball.x - peg.x;
        const dy = ball.y - peg.y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        
        if (dist < BALL_RADIUS + PEG_RADIUS) {
          const angle = Math.atan2(dy, dx);
          const speed = Math.sqrt(ball.vx * ball.vx + ball.vy * ball.vy);
          
          ball.vx = Math.cos(angle) * speed * BOUNCE + (Math.random() - 0.5) * 2;
          ball.vy = Math.sin(angle) * speed * BOUNCE;
          
          const overlap = BALL_RADIUS + PEG_RADIUS - dist;
          ball.x += Math.cos(angle) * overlap;
          ball.y += Math.sin(angle) * overlap;
        }
      }

      if (ball.y > canvasHeight - bucketHeight - BALL_RADIUS && !bucketHitRef.current) {
        bucketHitRef.current = true;
        
        const numBuckets = multipliers.length;
        const bucketWidth = canvasWidth / numBuckets;
        const bucketIndex = Math.min(Math.max(Math.floor(ball.x / bucketWidth), 0), numBuckets - 1);
        
        setFinalPosition(bucketIndex);
        
        const multiplier = multipliers[bucketIndex];
        const payout = Math.round(bet * multiplier);
        
        setTimeout(() => {
          addBalance(payout);
          setLastResult({ multiplier, payout });
          
          if (payout > bet) {
            confetti({ particleCount: 50, spread: 60, origin: { y: 0.7 } });
          }
          
          if (payout > bet * 2) {
            logBetActivity({ gameKey: 'plinko', wager: bet, payout, multiplier, outcome: 'win', detail: `Hit ${multiplier}x` });
            recordBet(bet, payout, true);
          } else if (payout > 0) {
            logBetActivity({ gameKey: 'plinko', wager: bet, payout, multiplier, outcome: 'win', detail: `Hit ${multiplier}x` });
            recordBet(bet, payout, payout > bet);
          } else {
            logBetActivity({ gameKey: 'plinko', wager: bet, payout: 0, multiplier: 0, outcome: 'loss', detail: `Hit ${multiplier}x` });
            recordBet(bet, 0, false);
          }
          
          setDroppedBalls(prev => prev + 1);
          setIsDropping(false);
          
          if (isAuto && autoCount > 1) {
            setAutoCount(prev => prev - 1);
          } else if (isAuto) {
            setIsAuto(false);
          }
        }, 300);
        
        return;
      }

      ctx.clearRect(0, 0, canvasWidth, canvasHeight);
      
      ctx.fillStyle = '#0f1923';
      ctx.fillRect(0, 0, canvasWidth, canvasHeight);
      
      ctx.strokeStyle = 'rgba(255,255,255,0.03)';
      ctx.lineWidth = 1;
      for (let x = 0; x < canvasWidth; x += 25) {
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, canvasHeight);
        ctx.stroke();
      }
      for (let y = 0; y < canvasHeight; y += 25) {
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(canvasWidth, y);
        ctx.stroke();
      }

      pegsRef.current.forEach(peg => {
        ctx.beginPath();
        ctx.arc(peg.x, peg.y, PEG_RADIUS, 0, Math.PI * 2);
        ctx.fillStyle = '#666666';
        ctx.fill();
        ctx.beginPath();
        ctx.arc(peg.x - 1, peg.y - 1, PEG_RADIUS - 1, 0, Math.PI * 2);
        ctx.fillStyle = '#999999';
        ctx.fill();
      });

      multipliers.forEach((m, i) => {
        const bucketX = i * (canvasWidth / multipliers.length);
        const bucketWidth = canvasWidth / multipliers.length;
        const isHigh = m >= 10;
        const isMid = m >= 1 && m < 10;
        
        let bgColor = 'rgba(255,255,255,0.1)';
        let textColor = 'rgba(255,255,255,0.5)';
        
        if (isHigh) {
          bgColor = 'rgba(239,68,68,0.3)';
          textColor = '#ef4444';
        } else if (isMid) {
          bgColor = 'rgba(34,197,94,0.2)';
          textColor = '#22c55e';
        }

        ctx.fillStyle = bgColor;
        ctx.fillRect(bucketX + 1, canvasHeight - bucketHeight, bucketWidth - 2, bucketHeight - 1);
        
        ctx.fillStyle = textColor;
        ctx.font = 'bold 10px sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(`${m.toFixed(1)}x`, bucketX + bucketWidth / 2, canvasHeight - bucketHeight / 2);
      });

      ctx.beginPath();
      ctx.arc(ball.x, ball.y, BALL_RADIUS, 0, Math.PI * 2);
      const ballGradient = ctx.createRadialGradient(ball.x - 2, ball.y - 2, 0, ball.x, ball.y, BALL_RADIUS);
      ballGradient.addColorStop(0, '#ffffff');
      ballGradient.addColorStop(1, '#cccccc');
      ctx.fillStyle = ballGradient;
      ctx.fill();
      
      ctx.shadowColor = 'rgba(255,255,255,0.5)';
      ctx.shadowBlur = 10;
      ctx.beginPath();
      ctx.arc(ball.x, ball.y, BALL_RADIUS, 0, Math.PI * 2);
      ctx.fillStyle = 'rgba(255,255,255,0.3)';
      ctx.fill();
      ctx.shadowBlur = 0;

      setCurrentBallPos({ x: ball.x, y: ball.y });
      
      animationRef.current = requestAnimationFrame(animate);
    };

    animate();
  }, [canDrop, bet, subtractBalance, addBalance, multipliers, isAuto, autoCount, recordBet, canvasWidth, canvasHeight]);

  useEffect(() => {
    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, []);

  useEffect(() => {
    if (isAuto && autoCount > 0 && !isDropping) {
      const timer = setTimeout(dropBall, 500);
      return () => clearTimeout(timer);
    }
  }, [isAuto, autoCount, isDropping, dropBall]);

  useGameHotkeys({
    onBet: dropBall,
    isDisabled: !canDrop,
  });

  const toggleAuto = () => {
    if (isAuto) {
      setIsAuto(false);
    } else {
      setIsAuto(true);
      setAutoCount(10);
    }
  };

  const getMultiplierColor = (m: number) => {
    if (m >= 100) return 'text-red-400';
    if (m >= 10) return 'text-yellow-400';
    if (m >= 1) return 'text-green-400';
    return 'text-white/40';
  };

  const getRiskColor = (r: RiskLevel) => {
    switch (r) {
      case 'low': return 'text-green-400';
      case 'medium': return 'text-yellow-400';
      case 'high': return 'text-red-400';
    }
  };

  return (
    <div className="flex flex-col lg:grid lg:grid-cols-5 gap-6 p-4 max-w-6xl mx-auto">
      <div className="lg:col-span-1 space-y-4">
        <div className="bg-[#1a1d23] border border-white/5 rounded-2xl p-5">
          <div className="space-y-4">
            <div>
              <label className="text-[10px] uppercase tracking-widest text-white/40 mb-2 block">Bet Amount</label>
              <div className="text-xl font-black text-[#00FF88] mb-2">${bet.toFixed(2)}</div>
              <input
                type="number"
                value={bet}
                onChange={(e) => setBet(Math.max(0.01, Number(e.target.value)))}
                min="0.01"
                step="0.01"
                disabled={isAuto}
                className="w-full bg-black/50 border border-white/10 rounded-xl px-3 py-2.5 text-white text-sm focus:outline-none focus:border-[#00FF88]/50 disabled:opacity-50"
              />
              <QuickBetButtons balance={balance} bet={bet} onSetBet={setBet} disabled={isAuto} pcts={[25, 50, 75, 100]} />
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
                        ? getRiskColor(r) + ' bg-white/10 border' 
                        : 'bg-white/5 text-white/40 hover:text-white border border-transparent'
                    )}
                    style={{ borderColor: risk === r ? (r === 'low' ? '#4ade80' : r === 'medium' ? '#facc15' : '#f87171') : 'transparent' }}
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
                isDropping
                  ? 'bg-yellow-500/20 text-yellow-400 border border-yellow-500/50'
                  : 'bg-[#00FF88] hover:bg-[#00FF88]/90 text-black shadow-lg shadow-[#00FF88]/30',
                !canDrop && 'opacity-50'
              )}
            >
              <Play size={20} fill="currentColor" />
              {isDropping ? 'Dropping...' : 'Drop Ball'}
            </button>
          </div>
        </div>

        <GameStatsBar stats={[
          { label: 'Drops', value: String(stats.totalBets) },
          { label: 'Wins', value: String(stats.totalWins) },
          { label: 'Profit', value: `$${((stats.totalWagered > 0 ? stats.totalWagered - stats.totalWagered : 0) / 100).toFixed(2)}` },
        ]} />

        <div className="bg-[#1a1d23] border border-white/5 rounded-2xl p-4">
          <div className="text-[10px] uppercase tracking-widest text-white/40 mb-3">Payouts</div>
          <div className="grid gap-1 max-h-32 overflow-y-auto">
            {multipliers.map((m, i) => (
              <div 
                key={i} 
                className={cn(
                  'text-center py-1 px-2 rounded text-[10px] font-black',
                  m >= 10 ? 'bg-red-500/20 text-red-400' :
                  m >= 1 ? 'bg-green-500/10 text-green-400' :
                  'bg-white/5 text-white/40'
                )}
              >
                {m.toFixed(1)}x
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="lg:col-span-4">
        <div className="relative bg-gradient-to-b from-[#1a1d23] to-[#0a0a0a] border border-white/10 rounded-3xl p-6 overflow-hidden">
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
                      {Math.abs(lastResult.payout).toFixed(2)}
                    </div>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          <div className="relative z-10 text-center mb-4">
            <div className="text-[10px] uppercase tracking-[0.3em] text-white/30 font-black">PLINKO</div>
            <div className="text-3xl font-black italic text-white mt-1">
              <span className="text-blue-400">DROP</span>
              <span className="text-white/60"> </span>
              <span className="text-green-400">MULTIPLIERS</span>
            </div>
          </div>

          <div className="flex justify-center gap-4 mb-4">
            {(['low', 'medium', 'high'] as RiskLevel[]).map((r) => (
              <button
                key={r}
                onClick={() => setRisk(r)}
                disabled={isAuto}
                className={cn(
                  'px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-wider transition-all',
                  risk === r 
                    ? getRiskColor(r) + ' bg-white/10 border' 
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

          <div className="flex justify-center">
            <canvas
              ref={canvasRef}
              width={canvasWidth}
              height={canvasHeight}
              className="rounded-2xl border border-white/10"
            />
          </div>

          <div className="flex justify-center items-center gap-6 mt-4">
            <div className="text-center">
              <div className="text-[10px] uppercase tracking-widest text-white/30">Max Win</div>
              <div className="text-2xl font-black text-red-400">{Math.max(...multipliers).toFixed(1)}x</div>
            </div>
            <div className="w-px h-10 bg-white/10" />
            <div className="text-center">
              <div className="text-[10px] uppercase tracking-widest text-white/30">Min Win</div>
              <div className="text-2xl font-black text-white/40">{Math.min(...multipliers).toFixed(1)}x</div>
            </div>
            <div className="w-px h-10 bg-white/10" />
            <div className="text-center">
              <div className="text-[10px] uppercase tracking-widest text-white/30">Balls</div>
              <div className="text-2xl font-black text-blue-400">{droppedBalls}</div>
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
