import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { motion } from 'motion/react';
import { useBalance } from '../../context/BalanceContext';
import { cn } from '../../lib/utils';
import { Play, Settings2, Zap, RotateCcw, Timer } from 'lucide-react';
import confetti from 'canvas-confetti';
import { logBetActivity } from '../../lib/activity';

type RiskTier = 'easy' | 'medium' | 'hard';

type Ball = {
  x: number;
  y: number;
  vx: number;
  vy: number;
  row: number;
  trail: { x: number; y: number }[];
};

const ROW_OPTIONS = [8, 10, 12, 14, 16] as const;
const MAX_ACTIVE_BALLS = 3;

const PAYOUTS: Record<number, Record<RiskTier, number[]>> = {
  8: {
    easy: [3.6, 1.9, 1.2, 1.02, 0.82, 1.02, 1.2, 1.9, 3.6],
    medium: [4.8, 1.8, 0.95, 0.72, 0.32, 0.72, 0.95, 1.8, 4.8],
    hard: [10, 2.9, 1.2, 0.52, 0.12, 0.52, 1.2, 2.9, 10],
  },
  10: {
    easy: [5, 2.5, 1.45, 1.05, 0.88, 0.72, 0.88, 1.05, 1.45, 2.5, 5],
    medium: [6.4, 2.5, 1.45, 0.92, 0.52, 0.26, 0.52, 0.92, 1.45, 2.5, 6.4],
    hard: [14, 4.1, 1.9, 0.82, 0.38, 0.12, 0.38, 0.82, 1.9, 4.1, 14],
  },
  12: {
    easy: [6.4, 2.9, 1.7, 1.22, 1, 0.82, 0.62, 0.82, 1, 1.22, 1.7, 2.9, 6.4],
    medium: [8.2, 3.3, 1.6, 1.08, 0.72, 0.46, 0.22, 0.46, 0.72, 1.08, 1.6, 3.3, 8.2],
    hard: [18, 6.2, 2.5, 1.2, 0.62, 0.28, 0.1, 0.28, 0.62, 1.2, 2.5, 6.2, 18],
  },
  14: {
    easy: [8.8, 3.9, 2.2, 1.48, 1.16, 0.92, 0.76, 0.54, 0.76, 0.92, 1.16, 1.48, 2.2, 3.9, 8.8],
    medium: [12, 4.2, 2.1, 1.24, 0.92, 0.64, 0.42, 0.2, 0.42, 0.64, 0.92, 1.24, 2.1, 4.2, 12],
    hard: [30, 7.4, 3.1, 1.56, 0.82, 0.42, 0.2, 0.08, 0.2, 0.42, 0.82, 1.56, 3.1, 7.4, 30],
  },
  16: {
    easy: [11, 4.9, 2.7, 1.75, 1.32, 1.04, 0.88, 0.74, 0.5, 0.74, 0.88, 1.04, 1.32, 1.75, 2.7, 4.9, 11],
    medium: [18, 6.1, 3, 1.55, 1.08, 0.82, 0.58, 0.38, 0.18, 0.38, 0.58, 0.82, 1.08, 1.55, 3, 6.1, 18],
    hard: [100, 16, 6.4, 2.8, 1.28, 0.62, 0.32, 0.18, 0.08, 0.18, 0.32, 0.62, 1.28, 2.8, 6.4, 16, 100],
  },
};

export const PlinkoGame: React.FC = () => {
  const { balance, addBalance, subtractBalance } = useBalance();
  const [bet, setBet] = useState(10);
  const [risk, setRisk] = useState<RiskTier>('medium');
  const [rows, setRows] = useState<(typeof ROW_OPTIONS)[number]>(8);
  const [autoArmed, setAutoArmed] = useState(false);
  const [isAuto, setIsAuto] = useState(false);
  const [isFast, setIsFast] = useState(false);
  const [autoRounds, setAutoRounds] = useState(10);
  const [remainingRounds, setRemainingRounds] = useState(0);
  const [lastBucket, setLastBucket] = useState<number | null>(null);
  const [activeBallCount, setActiveBallCount] = useState(0);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const ballsRef = useRef<Ball[]>([]);
  const autoTimeoutRef = useRef<number | null>(null);
  const isAutoRef = useRef(false);
  const remainingRoundsRef = useRef(0);
  const activeBallCountRef = useRef(0);
  const lastManualDropAtRef = useRef(0);

  const multipliers = useMemo(() => PAYOUTS[rows][risk], [rows, risk]);

  const spawnBall = useCallback(() => {
    if (ballsRef.current.length >= MAX_ACTIVE_BALLS) {
      return false;
    }
    const startX = canvasRef.current ? canvasRef.current.width / 2 : 320;
    ballsRef.current.push({
      x: startX + (Math.random() - 0.5) * 4,
      y: 24,
      vx: 0,
      vy: 0,
      row: 0,
      trail: [],
    });
    setActiveBallCount(ballsRef.current.length);
    return true;
  }, []);

  const dropBall = useCallback(() => {
    autoTimeoutRef.current = null;
    if (remainingRoundsRef.current <= 0) {
      return;
    }

    if (subtractBalance(bet)) {
      const spawned = spawnBall();
      if (!spawned) {
        addBalance(bet);
        return;
      }

      if (remainingRoundsRef.current > 1) {
        remainingRoundsRef.current -= 1;
        setRemainingRounds(remainingRoundsRef.current);
      } else {
        isAutoRef.current = false;
        remainingRoundsRef.current = 0;
        setIsAuto(false);
        setRemainingRounds(0);
      }
    } else {
      isAutoRef.current = false;
      remainingRoundsRef.current = 0;
      setIsAuto(false);
      setRemainingRounds(0);
    }
  }, [addBalance, bet, spawnBall, subtractBalance]);

  const dropManualBall = useCallback(() => {
    const now = Date.now();
    if (now - lastManualDropAtRef.current < 180) {
      return;
    }

    if (autoTimeoutRef.current !== null) {
      window.clearTimeout(autoTimeoutRef.current);
      autoTimeoutRef.current = null;
    }

    isAutoRef.current = false;
    remainingRoundsRef.current = 0;
    setIsAuto(false);
    setAutoArmed(false);
    setRemainingRounds(0);

    if (subtractBalance(bet)) {
      const spawned = spawnBall();
      if (!spawned) {
        addBalance(bet);
        return;
      }
      lastManualDropAtRef.current = now;
    }
  }, [addBalance, bet, spawnBall, subtractBalance]);

  const stopAuto = useCallback(() => {
    if (autoTimeoutRef.current !== null) {
      window.clearTimeout(autoTimeoutRef.current);
      autoTimeoutRef.current = null;
    }
    setAutoArmed(false);
    isAutoRef.current = false;
    remainingRoundsRef.current = 0;
    setIsAuto(false);
    setRemainingRounds(0);
  }, []);

  useEffect(() => {
    isAutoRef.current = isAuto;
  }, [isAuto]);

  useEffect(() => {
    remainingRoundsRef.current = remainingRounds;
  }, [remainingRounds]);

  useEffect(() => {
    if (isAuto && remainingRounds > 0) {
      const interval = isFast ? 100 : 500;
      if (autoTimeoutRef.current !== null) {
        window.clearTimeout(autoTimeoutRef.current);
      }
      autoTimeoutRef.current = window.setTimeout(dropBall, interval);
      return () => {
        if (autoTimeoutRef.current !== null) {
          window.clearTimeout(autoTimeoutRef.current);
          autoTimeoutRef.current = null;
        }
      };
    }
    return undefined;
  }, [isAuto, remainingRounds, dropBall, isFast]);

  const startAuto = () => {
    setAutoArmed(true);
    isAutoRef.current = true;
    remainingRoundsRef.current = autoRounds;
    setIsAuto(true);
    setRemainingRounds(autoRounds);
  };

  useEffect(() => {
    return () => {
      if (autoTimeoutRef.current !== null) {
        window.clearTimeout(autoTimeoutRef.current);
      }
    };
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animationFrameId: number;

    const topOffset = 70;
    const verticalGap = rows <= 10 ? 34 : rows <= 14 ? 28 : 24;
    const pegGap = rows <= 10 ? 38 : rows <= 14 ? 32 : 28;
    const pegRadius = rows <= 10 ? 4 : 4.25;
    const bucketHeight = 34;
    const lastRowY = topOffset + rows * verticalGap;
    const bucketWidth = pegGap;
    const totalBuckets = rows + 1;
    const boardWidth = totalBuckets * bucketWidth;
    const bucketStartX = (canvas.width - boardWidth) / 2;

    const render = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      ctx.fillStyle = 'rgba(255, 255, 255, 0.2)';
      for (let row = 0; row < rows; row++) {
        const rowY = topOffset + row * verticalGap;
        const pegsInRow = row + 3;
        const rowWidth = (pegsInRow - 1) * pegGap;
        const rowStartX = (canvas.width - rowWidth) / 2;

        for (let i = 0; i < pegsInRow; i++) {
          ctx.beginPath();
          ctx.arc(rowStartX + i * pegGap, rowY, pegRadius, 0, Math.PI * 2);
          ctx.fill();
        }
      }

      multipliers.forEach((multiplierValue, index) => {
        const x = bucketStartX + index * bucketWidth;
        const activeBucket = index === lastBucket;
        ctx.fillStyle = activeBucket
          ? 'rgba(0, 255, 136, 0.22)'
          : multiplierValue >= 1 ? 'rgba(0, 255, 136, 0.1)' : 'rgba(255, 255, 255, 0.05)';
        ctx.fillRect(x + 1, lastRowY, bucketWidth - 2, bucketHeight);
        ctx.fillStyle = activeBucket ? '#ffffff' : multiplierValue >= 1 ? '#00FF88' : 'rgba(255, 255, 255, 0.4)';
        const label = multiplierValue >= 10 ? `${multiplierValue}x` : `${Number(multiplierValue.toFixed(2))}x`;
        ctx.font = `${rows >= 14 ? 8 : 9}px monospace`;
        ctx.textAlign = 'center';
        ctx.fillText(label, x + bucketWidth / 2, lastRowY + 21);
      });

      const steps = isFast ? (rows >= 14 ? 6 : 4) : rows >= 14 ? 4 : 3;
      for (let step = 0; step < steps; step++) {
        ballsRef.current = ballsRef.current.filter((ball) => {
          ball.vy += 0.16 / steps;
          ball.vx *= 0.992;
          ball.vy *= 0.998;
          ball.x += ball.vx / steps;
          ball.y += ball.vy / steps;

          if (ball.row < rows) {
            const rowY = topOffset + ball.row * verticalGap;
            if (ball.y >= rowY - (pegRadius + 4)) {
              const pegsInRow = ball.row + 3;
              const rowWidth = (pegsInRow - 1) * pegGap;
              const rowStartX = (canvas.width - rowWidth) / 2;
              const pegIndex = Math.max(0, Math.min(pegsInRow - 1, Math.round((ball.x - rowStartX) / pegGap)));
              const pegX = rowStartX + pegIndex * pegGap;
              const direction = ball.x >= pegX ? 1 : -1;
              const horizontalKick = (rows >= 14 ? 1.05 : 1.2) + Math.random() * 0.45;

              ball.x = pegX + direction * (pegRadius + 6);
              ball.vx = direction * horizontalKick;
              ball.vy = -0.42 - Math.random() * 0.16;
              ball.y = rowY - (pegRadius + 7);
              ball.row++;
            }
          }

          if (ball.x < 18 || ball.x > canvas.width - 18) {
            ball.vx *= -0.82;
            ball.x = Math.max(18, Math.min(canvas.width - 18, ball.x));
          }

          if (ball.y >= lastRowY) {
            const bucketIndex = Math.floor((ball.x - bucketStartX) / bucketWidth);
            const safeIndex = Math.max(0, Math.min(multipliers.length - 1, bucketIndex));
            const hitMultiplier = multipliers[safeIndex];
            setLastBucket(safeIndex);

            const payout = bet * hitMultiplier;
            addBalance(payout);
            logBetActivity({
              gameKey: 'plinko',
              wager: bet,
              payout,
              multiplier: hitMultiplier,
              outcome: payout > bet ? 'win' : payout === bet ? 'push' : 'loss',
              detail: `${risk} risk, ${rows} rows, bucket ${safeIndex + 1}`,
            });

            if (hitMultiplier >= 2) {
              confetti({
                particleCount: 30,
                spread: 50,
                origin: { x: ball.x / canvas.width, y: ball.y / canvas.height },
                colors: ['#00FF88'],
              });
            }
            return false;
          }

          if (step === steps - 1) {
            ball.trail.push({ x: ball.x, y: ball.y });
            if (ball.trail.length > 10) {
              ball.trail.shift();
            }
          }

          return true;
        });
      }

      if (activeBallCountRef.current !== ballsRef.current.length) {
        activeBallCountRef.current = ballsRef.current.length;
        setActiveBallCount(ballsRef.current.length);
      }

      ballsRef.current.forEach((ball) => {
        ball.trail.forEach((pos, index) => {
          const opacity = (index / ball.trail.length) * 0.5;
          ctx.fillStyle = `rgba(0, 255, 136, ${opacity})`;
          ctx.beginPath();
          ctx.arc(pos.x, pos.y, 4, 0, Math.PI * 2);
          ctx.fill();
        });

        const glow = ctx.createRadialGradient(ball.x, ball.y, 2, ball.x, ball.y, 12);
        glow.addColorStop(0, '#d6ffea');
        glow.addColorStop(1, 'rgba(0, 255, 136, 0)');
        ctx.fillStyle = glow;
        ctx.beginPath();
        ctx.arc(ball.x, ball.y, 12, 0, Math.PI * 2);
        ctx.fill();

        ctx.fillStyle = '#00FF88';
        ctx.shadowBlur = 18;
        ctx.shadowColor = '#00FF88';
        ctx.beginPath();
        ctx.arc(ball.x, ball.y, 6, 0, Math.PI * 2);
        ctx.fill();
        ctx.shadowBlur = 0;
      });

      animationFrameId = requestAnimationFrame(render);
    };

    render();
    return () => cancelAnimationFrame(animationFrameId);
  }, [addBalance, bet, isFast, lastBucket, multipliers, risk, rows]);

  return (
    <div className="flex flex-col lg:grid lg:grid-cols-4 gap-6 p-4 max-w-6xl mx-auto">
      <div className="lg:col-span-1 bg-[#111] border border-white/10 rounded-2xl p-6 flex flex-col gap-4">
        <div className="space-y-4">
          <div>
            <label className="text-xs uppercase tracking-widest text-white/40 mb-2 block">Bet Amount</label>
            <div className="space-y-2">
              <input
                type="number"
                value={bet}
                onChange={(e) => setBet(Math.max(1, Number(e.target.value)))}
                disabled={isAuto}
                className="w-full bg-black border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-[#00FF88]/50"
              />
              <div className="grid grid-cols-2 gap-2">
                <button
                  onClick={() => setBet((current) => Math.max(1, current * 2))}
                  disabled={isAuto}
                  className="py-2 rounded-xl text-[10px] font-black uppercase tracking-widest bg-white/5 text-white/60 hover:text-white transition-all disabled:opacity-40"
                >
                  x2
                </button>
                <button
                  onClick={() => setBet(Math.max(1, Math.floor(balance)))}
                  disabled={isAuto || balance < 1}
                  className="py-2 rounded-xl text-[10px] font-black uppercase tracking-widest bg-white/5 text-white/60 hover:text-white transition-all disabled:opacity-40"
                >
                  Max
                </button>
              </div>
            </div>
          </div>

          <div>
            <label className="text-xs uppercase tracking-widest text-white/40 mb-2 block">Risk</label>
            <div className="grid grid-cols-3 gap-2">
              {(['easy', 'medium', 'hard'] as RiskTier[]).map((tier) => (
                <button
                  key={tier}
                  onClick={() => setRisk(tier)}
                  disabled={isAuto}
                  className={cn(
                    'py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all',
                    risk === tier ? 'bg-[#00FF88] text-black' : 'bg-white/5 text-white/40 hover:text-white'
                  )}
                >
                  {tier}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="text-xs uppercase tracking-widest text-white/40 mb-2 block">Rows</label>
            <div className="grid grid-cols-3 gap-2">
              {ROW_OPTIONS.map((rowCount) => (
                <button
                  key={rowCount}
                  onClick={() => setRows(rowCount)}
                  disabled={isAuto}
                  className={cn(
                    'py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all',
                    rows === rowCount ? 'bg-[#00FF88] text-black' : 'bg-white/5 text-white/40 hover:text-white'
                  )}
                >
                  {rowCount}
                </button>
              ))}
            </div>
          </div>

          <div className="flex gap-2">
            <button
              onClick={() => setIsFast(!isFast)}
              className={cn(
                'flex-1 py-2 rounded-lg text-[10px] font-black uppercase tracking-widest flex items-center justify-center gap-2 transition-all',
                isFast ? 'bg-yellow-500/20 text-yellow-500 border border-yellow-500/50' : 'bg-white/5 text-white/20 border border-transparent'
              )}
            >
              <Zap size={12} fill={isFast ? 'currentColor' : 'none'} />
              FAST
            </button>
            <button
              onClick={() => {
                if (isAuto) {
                  stopAuto();
                  return;
                }
                setAutoArmed((current) => !current);
              }}
              className={cn(
                'flex-1 py-2 rounded-lg text-[10px] font-black uppercase tracking-widest flex items-center justify-center gap-2 transition-all',
                autoArmed || isAuto ? 'bg-[#00FF88]/20 text-[#00FF88] border border-[#00FF88]/50' : 'bg-white/5 text-white/20 border border-transparent'
              )}
            >
              <RotateCcw size={12} className={isAuto ? 'animate-spin' : ''} />
              AUTO
            </button>
          </div>

          {(autoArmed || isAuto) && (
            <div className="space-y-2">
              <div className="flex justify-between text-[10px] uppercase tracking-widest text-white/20">
                <span>Rounds</span>
                <span>{isAuto ? `${remainingRounds} left` : `${autoRounds} queued`}</span>
              </div>
              <input
                type="number"
                value={autoRounds}
                onChange={(e) => setAutoRounds(Math.max(1, Number(e.target.value)))}
                disabled={isAuto}
                className="w-full bg-black border border-white/10 rounded-xl px-4 py-2 text-xs text-white focus:outline-none focus:border-[#00FF88]/50"
              />
            </div>
          )}

          <button
            onClick={isAuto ? stopAuto : autoArmed ? startAuto : dropManualBall}
            disabled={balance < bet && !isAuto}
            className={cn(
              'w-full py-4 rounded-xl font-bold transition-all flex items-center justify-center gap-2 disabled:opacity-50',
              isAuto ? 'bg-red-500 text-white' : autoArmed ? 'bg-white text-black' : 'bg-[#00FF88] text-black'
            )}
          >
            {isAuto ? (
              <>
                <Timer size={18} />
                STOP AUTO
              </>
            ) : autoArmed ? (
              <>
                <Play size={18} fill="currentColor" />
                START AUTO
              </>
            ) : (
              <>
                <Play size={18} fill="currentColor" />
                DROP BALL
              </>
            )}
          </button>
        </div>

        <div className="mt-auto p-4 border border-white/5 rounded-xl bg-black/30">
          <div className="flex items-center gap-2 text-white/40 text-xs mb-3">
            <Settings2 size={14} />
            <span>GAME SETTINGS</span>
          </div>
          <div className="space-y-2">
            <div className="flex justify-between text-[10px]">
              <span className="text-white/20 uppercase">Risk</span>
              <span className="text-white/60">{risk.toUpperCase()}</span>
            </div>
            <div className="flex justify-between text-[10px]">
              <span className="text-white/20 uppercase">Rows</span>
              <span className="text-white/60">{rows}</span>
            </div>
            <div className="flex justify-between text-[10px]">
              <span className="text-white/20 uppercase">Max Win</span>
              <span className="text-[#00FF88]">{Math.max(...multipliers)}x</span>
            </div>
            <div className="flex justify-between text-[10px]">
              <span className="text-white/20 uppercase">Active Balls</span>
              <span className="text-white/60">{activeBallCount}/{MAX_ACTIVE_BALLS}</span>
            </div>
          </div>
        </div>
      </div>

      <div className="lg:col-span-3 bg-black border border-white/10 rounded-2xl p-4 flex items-center justify-center overflow-hidden">
        <canvas ref={canvasRef} width={640} height={540} className="max-w-full h-auto" />
      </div>
    </div>
  );
};
