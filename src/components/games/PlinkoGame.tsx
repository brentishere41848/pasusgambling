import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import confetti from 'canvas-confetti';
import { Play, RotateCcw } from 'lucide-react';
import { useBalance } from '../../context/BalanceContext';
import { cn } from '../../lib/utils';
import {
  QuickBetButtons,
  GameStatsBar,
  useLocalGameStats,
  useGameHotkeys,
  centsToDollars,
  dollarsToCents,
  formatCents,
  MIN_BET,
} from './GameHooks';
import { logBetActivity } from '../../lib/activity';

type RiskLevel = 'low' | 'medium' | 'high';
type OutcomeBand = 'loss' | 'win' | 'bigwin';

type BallState = {
  x: number;
  y: number;
  vx: number;
  vy: number;
};

type Peg = {
  id: number;
  x: number;
  y: number;
};

type Bucket = {
  x: number;
  y: number;
  width: number;
};

const ROW_COUNTS = [8, 10, 12, 14, 16] as const;

const MULTIPLIERS: Record<number, Record<RiskLevel, number[]>> = {
  8: {
    low: [2.4, 1.4, 1.1, 0.8, 0.55, 0.8, 1.1, 1.4, 2.4],
    medium: [4.8, 2.1, 1.2, 0.65, 0.35, 0.65, 1.2, 2.1, 4.8],
    high: [9, 3.2, 1.4, 0.55, 0.2, 0.55, 1.4, 3.2, 9],
  },
  10: {
    low: [3.6, 2, 1.3, 1, 0.78, 0.58, 0.78, 1, 1.3, 2, 3.6],
    medium: [7.5, 3.2, 1.65, 0.95, 0.55, 0.3, 0.55, 0.95, 1.65, 3.2, 7.5],
    high: [14, 5.2, 2, 0.95, 0.45, 0.18, 0.45, 0.95, 2, 5.2, 14],
  },
  12: {
    low: [5.8, 2.8, 1.6, 1.2, 0.9, 0.7, 0.55, 0.7, 0.9, 1.2, 1.6, 2.8, 5.8],
    medium: [12, 4.9, 2.2, 1.25, 0.78, 0.48, 0.28, 0.48, 0.78, 1.25, 2.2, 4.9, 12],
    high: [22, 7.8, 2.9, 1.35, 0.68, 0.35, 0.16, 0.35, 0.68, 1.35, 2.9, 7.8, 22],
  },
  14: {
    low: [8.8, 3.6, 2, 1.35, 1.05, 0.85, 0.68, 0.54, 0.68, 0.85, 1.05, 1.35, 2, 3.6, 8.8],
    medium: [19, 6.8, 2.9, 1.6, 1, 0.68, 0.44, 0.24, 0.44, 0.68, 1, 1.6, 2.9, 6.8, 19],
    high: [40, 11.8, 4.1, 1.9, 1, 0.55, 0.28, 0.12, 0.28, 0.55, 1, 1.9, 4.1, 11.8, 40],
  },
  16: {
    low: [13, 4.7, 2.4, 1.5, 1.2, 0.95, 0.78, 0.64, 0.52, 0.64, 0.78, 0.95, 1.2, 1.5, 2.4, 4.7, 13],
    medium: [28, 8.9, 3.5, 1.9, 1.18, 0.8, 0.52, 0.34, 0.2, 0.34, 0.52, 0.8, 1.18, 1.9, 3.5, 8.9, 28],
    high: [65, 18, 5.8, 2.5, 1.35, 0.72, 0.4, 0.22, 0.1, 0.22, 0.4, 0.72, 1.35, 2.5, 5.8, 18, 65],
  },
};

const BOARD_WIDTH = 420;
const BOARD_HEIGHT = 460;
const TOP_PADDING = 34;
const BUCKET_HEIGHT = 34;

const BALL_RADIUS = 8;
const PEG_RADIUS = 4;

const GRAVITY = 0.24;
const FRICTION_X = 0.985;
const MAX_VX = 2.2;
const MAX_VY = 5;
const WALL_BOUNCE = 0.72;
const PEG_SEPARATION_EPSILON = 0.5;

const LOSS_CHANCE = 0.7;
const WIN_CHANCE = 0.29;

function clamp(value: number, min: number, max: number) {
  return Math.max(min, Math.min(max, value));
}

function pickRandomIndex(indices: number[]) {
  if (!indices.length) return 0;
  return indices[Math.floor(Math.random() * indices.length)];
}

function pickCenterWeightedIndex(indices: number[], totalBuckets: number) {
  if (!indices.length) return 0;
  const center = (totalBuckets - 1) / 2;
  const weighted = indices.map((index) => ({
    index,
    weight: 1 / (1 + Math.abs(index - center)),
  }));
  const totalWeight = weighted.reduce((sum, item) => sum + item.weight, 0);
  let roll = Math.random() * totalWeight;
  for (const item of weighted) {
    roll -= item.weight;
    if (roll <= 0) return item.index;
  }
  return weighted[weighted.length - 1].index;
}

function pickOutcomeBand(): OutcomeBand {
  const roll = Math.random();
  if (roll < LOSS_CHANCE) return 'loss';
  if (roll < LOSS_CHANCE + WIN_CHANCE) return 'win';
  return 'bigwin';
}

function samplePlinkoBucket(multipliers: number[]) {
  const maxMultiplier = Math.max(...multipliers);
  const outcomeBand = pickOutcomeBand();

  const lossBuckets = multipliers
    .map((multiplier, index) => ({ multiplier, index }))
    .filter((entry) => entry.multiplier < 1)
    .map((entry) => entry.index);

  const winBuckets = multipliers
    .map((multiplier, index) => ({ multiplier, index }))
    .filter((entry) => entry.multiplier >= 1 && entry.multiplier < maxMultiplier)
    .map((entry) => entry.index);

  const bigWinBuckets = multipliers
    .map((multiplier, index) => ({ multiplier, index }))
    .filter((entry) => entry.multiplier === maxMultiplier)
    .map((entry) => entry.index);

  if (outcomeBand === 'loss' && lossBuckets.length) {
    return pickCenterWeightedIndex(lossBuckets, multipliers.length);
  }
  if (outcomeBand === 'win' && winBuckets.length) {
    return pickCenterWeightedIndex(winBuckets, multipliers.length);
  }
  if (outcomeBand === 'bigwin' && bigWinBuckets.length) {
    return pickRandomIndex(bigWinBuckets);
  }

  const fallback = lossBuckets.length ? lossBuckets : winBuckets.length ? winBuckets : bigWinBuckets;
  return fallback.length ? pickRandomIndex(fallback) : 0;
}

function getRiskColor(risk: RiskLevel) {
  if (risk === 'low') return 'text-emerald-300';
  if (risk === 'medium') return 'text-amber-300';
  return 'text-rose-300';
}

function getMultiplierTone(multiplier: number) {
  if (multiplier >= 10) return 'bg-rose-500/20 text-rose-300 border-rose-400/30';
  if (multiplier >= 1) return 'bg-emerald-500/15 text-emerald-300 border-emerald-400/25';
  return 'bg-slate-500/20 text-slate-300 border-slate-400/20';
}

export const PlinkoGame: React.FC = () => {
  const { balance, addBalance, subtractBalance } = useBalance();
  const { getStats, recordBet } = useLocalGameStats('plinko');

  const [bet, setBet] = useState(1);
  const [rows, setRows] = useState<number>(12);
  const [risk, setRisk] = useState<RiskLevel>('medium');
  const [isDropping, setIsDropping] = useState(false);
  const [isAuto, setIsAuto] = useState(false);
  const [autoCount, setAutoCount] = useState(10);
  const [drops, setDrops] = useState(0);
  const [lastResult, setLastResult] = useState<{ multiplier: number; payout: number; bucket: number } | null>(null);
  const [activeBucket, setActiveBucket] = useState<number | null>(null);

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const pegsRef = useRef<Peg[]>([]);
  const bucketsRef = useRef<Bucket[]>([]);
  const ballRef = useRef<BallState | null>(null);
  const rafRef = useRef<number>();
  const settleTimeoutRef = useRef<number>();
  const dropLockRef = useRef(false);
  const targetBucketRef = useRef<number | null>(null);
  const targetXRef = useRef<number | null>(null);
  const lastPegHitRef = useRef<{ id: number; at: number } | null>(null);

  const stats = getStats();
  const multipliers = useMemo(() => MULTIPLIERS[rows][risk], [rows, risk]);
  const betCoins = useMemo(() => dollarsToCents(bet), [bet]);
  const canDrop = !isDropping && balance >= betCoins;

  const physicsProfile = useMemo(() => {
    if (rows <= 8) {
      return { startDrift: 0.95, randomKick: 0.1, steerBase: 0.00028, steerScale: 0.0019, restitution: 0.34 };
    }
    if (rows <= 12) {
      return { startDrift: 0.8, randomKick: 0.08, steerBase: 0.00034, steerScale: 0.0022, restitution: 0.31 };
    }
    return { startDrift: 0.66, randomKick: 0.07, steerBase: 0.0004, steerScale: 0.0025, restitution: 0.28 };
  }, [rows]);

  const drawBoard = useCallback((ctx: CanvasRenderingContext2D, ball?: BallState) => {
    ctx.clearRect(0, 0, BOARD_WIDTH, BOARD_HEIGHT);
    ctx.fillStyle = '#0b1220';
    ctx.fillRect(0, 0, BOARD_WIDTH, BOARD_HEIGHT);

    const bg = ctx.createLinearGradient(0, 0, 0, BOARD_HEIGHT);
    bg.addColorStop(0, 'rgba(16,24,39,0.65)');
    bg.addColorStop(1, 'rgba(2,6,23,0.88)');
    ctx.fillStyle = bg;
    ctx.fillRect(0, 0, BOARD_WIDTH, BOARD_HEIGHT);

    for (let y = 0; y < BOARD_HEIGHT; y += 24) {
      ctx.strokeStyle = 'rgba(255,255,255,0.03)';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(BOARD_WIDTH, y);
      ctx.stroke();
    }

    const bucketWidth = BOARD_WIDTH / multipliers.length;
    multipliers.forEach((multiplier, index) => {
      const bucketX = index * bucketWidth;
      const isActive = index === activeBucket;
      const isHigh = multiplier >= 10;
      const isPositive = multiplier >= 1 && multiplier < 10;

      ctx.fillStyle = isHigh
        ? 'rgba(251,113,133,0.28)'
        : isPositive
          ? 'rgba(16,185,129,0.22)'
          : 'rgba(148,163,184,0.18)';
      ctx.fillRect(bucketX + 1, BOARD_HEIGHT - BUCKET_HEIGHT, bucketWidth - 2, BUCKET_HEIGHT - 1);

      if (isActive) {
        ctx.strokeStyle = 'rgba(255,255,255,0.65)';
        ctx.lineWidth = 2;
        ctx.strokeRect(bucketX + 2, BOARD_HEIGHT - BUCKET_HEIGHT + 2, bucketWidth - 4, BUCKET_HEIGHT - 4);
      }

      ctx.font = '700 10px sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillStyle = isHigh ? '#fecdd3' : isPositive ? '#bbf7d0' : '#e2e8f0';
      ctx.fillText(`${multiplier.toFixed(2)}x`, bucketX + bucketWidth / 2, BOARD_HEIGHT - BUCKET_HEIGHT / 2);
    });

    pegsRef.current.forEach((peg) => {
      ctx.beginPath();
      ctx.arc(peg.x, peg.y, PEG_RADIUS, 0, Math.PI * 2);
      ctx.fillStyle = '#dbeafe';
      ctx.globalAlpha = 0.86;
      ctx.fill();
      ctx.globalAlpha = 1;
    });

    if (ball) {
      const ballGradient = ctx.createRadialGradient(ball.x - 2, ball.y - 2, 0, ball.x, ball.y, BALL_RADIUS);
      ballGradient.addColorStop(0, '#ffffff');
      ballGradient.addColorStop(1, '#94a3b8');
      ctx.beginPath();
      ctx.arc(ball.x, ball.y, BALL_RADIUS, 0, Math.PI * 2);
      ctx.fillStyle = ballGradient;
      ctx.fill();

      ctx.shadowColor = 'rgba(255,255,255,0.42)';
      ctx.shadowBlur = 9;
      ctx.beginPath();
      ctx.arc(ball.x, ball.y, BALL_RADIUS, 0, Math.PI * 2);
      ctx.fillStyle = 'rgba(255,255,255,0.24)';
      ctx.fill();
      ctx.shadowBlur = 0;
    }
  }, [activeBucket, multipliers]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const pegSpacingY = (BOARD_HEIGHT - TOP_PADDING - BUCKET_HEIGHT) / (rows + 1);
    const pegs: Peg[] = [];
    for (let row = 0; row < rows; row += 1) {
      const pegsInRow = row + 4;
      const rowWidth = (pegsInRow - 1) * 38;
      const startX = (BOARD_WIDTH - rowWidth) / 2;
      for (let col = 0; col < pegsInRow; col += 1) {
        pegs.push({
          id: pegs.length,
          x: startX + col * 38,
          y: TOP_PADDING + (row + 1) * pegSpacingY,
        });
      }
    }
    pegsRef.current = pegs;

    const bucketWidth = BOARD_WIDTH / multipliers.length;
    bucketsRef.current = multipliers.map((_, index) => ({
      x: index * bucketWidth,
      y: BOARD_HEIGHT - BUCKET_HEIGHT,
      width: bucketWidth,
    }));

    drawBoard(ctx);
  }, [rows, multipliers, drawBoard]);

  const stopCurrentAnimation = useCallback(() => {
    if (rafRef.current) {
      cancelAnimationFrame(rafRef.current);
      rafRef.current = undefined;
    }
    if (settleTimeoutRef.current) {
      clearTimeout(settleTimeoutRef.current);
      settleTimeoutRef.current = undefined;
    }
  }, []);

  const settleResult = useCallback((cost: number, bucketIndex: number) => {
    const multiplier = multipliers[bucketIndex];
    const payout = Math.round(cost * multiplier);

    addBalance(payout);
    setLastResult({ multiplier, payout, bucket: bucketIndex });

    if (payout > cost) {
      confetti({ particleCount: 55, spread: 62, origin: { y: 0.72 } });
    }

    if (payout > cost * 2) {
      logBetActivity({ gameKey: 'plinko', wager: cost, payout, multiplier, outcome: 'win', detail: `Hit ${multiplier.toFixed(2)}x` });
      recordBet(cost, payout, true);
    } else if (payout > 0) {
      logBetActivity({ gameKey: 'plinko', wager: cost, payout, multiplier, outcome: 'win', detail: `Hit ${multiplier.toFixed(2)}x` });
      recordBet(cost, payout, payout > cost);
    } else {
      logBetActivity({ gameKey: 'plinko', wager: cost, payout: 0, multiplier: 0, outcome: 'loss', detail: `Hit ${multiplier.toFixed(2)}x` });
      recordBet(cost, 0, false);
    }

    setDrops((prev) => prev + 1);
    setIsDropping(false);
    dropLockRef.current = false;
    targetBucketRef.current = null;
    targetXRef.current = null;
    lastPegHitRef.current = null;

    if (isAuto && autoCount > 1) {
      setAutoCount((prev) => prev - 1);
    } else if (isAuto) {
      setIsAuto(false);
    }
  }, [addBalance, autoCount, isAuto, multipliers, recordBet]);

  const dropBall = useCallback(() => {
    if (!canDrop || dropLockRef.current) return;
    dropLockRef.current = true;

    const cost = betCoins;
    if (!subtractBalance(cost)) {
      dropLockRef.current = false;
      return;
    }

    const selectedBucket = samplePlinkoBucket(multipliers);
    const bucketWidth = BOARD_WIDTH / multipliers.length;
    const targetX = selectedBucket * bucketWidth + bucketWidth / 2;
    targetBucketRef.current = selectedBucket;
    targetXRef.current = targetX;

    setIsDropping(true);
    setActiveBucket(selectedBucket);
    setLastResult(null);

    const startX = BOARD_WIDTH / 2 + (Math.random() - 0.5) * 96;
    ballRef.current = {
      x: clamp(startX, BALL_RADIUS + 1, BOARD_WIDTH - BALL_RADIUS - 1),
      y: 18,
      vx: (Math.random() - 0.5) * physicsProfile.startDrift,
      vy: 0,
    };

    stopCurrentAnimation();

    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (!ctx || !canvas || !ballRef.current) {
      addBalance(cost);
      setIsDropping(false);
      setActiveBucket(null);
      dropLockRef.current = false;
      return;
    }

    const animate = (timestamp: number) => {
      const ball = ballRef.current;
      if (!ball) return;

      ball.vy = Math.min(MAX_VY, ball.vy + GRAVITY);

      const progressY = clamp(ball.y / (BOARD_HEIGHT - BUCKET_HEIGHT), 0, 1);
      const steer = physicsProfile.steerBase + progressY * physicsProfile.steerScale;
      const steerForce = clamp((targetX - ball.x) * steer, -0.1, 0.1);

      ball.vx += steerForce + (Math.random() - 0.5) * physicsProfile.randomKick;
      ball.vx *= FRICTION_X;
      ball.vx = clamp(ball.vx, -MAX_VX, MAX_VX);

      ball.x += ball.vx;
      ball.y += ball.vy;

      if (ball.x <= BALL_RADIUS) {
        ball.x = BALL_RADIUS;
        ball.vx = Math.abs(ball.vx) * WALL_BOUNCE;
      } else if (ball.x >= BOARD_WIDTH - BALL_RADIUS) {
        ball.x = BOARD_WIDTH - BALL_RADIUS;
        ball.vx = -Math.abs(ball.vx) * WALL_BOUNCE;
      }

      let nearest: (Peg & { dist: number }) | null = null;
      for (const peg of pegsRef.current) {
        const dx = ball.x - peg.x;
        const dy = ball.y - peg.y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        if (dist < BALL_RADIUS + PEG_RADIUS && (!nearest || dist < nearest.dist)) {
          nearest = { ...peg, dist };
        }
      }

      if (nearest) {
        const recentlyHit =
          lastPegHitRef.current &&
          lastPegHitRef.current.id === nearest.id &&
          timestamp - lastPegHitRef.current.at < 52;

        if (!recentlyHit) {
          lastPegHitRef.current = { id: nearest.id, at: timestamp };

          const dx = ball.x - nearest.x;
          const dy = ball.y - nearest.y;
          const dist = Math.max(0.001, Math.sqrt(dx * dx + dy * dy));
          const nx = dx / dist;
          const ny = dy / dist;
          const tx = -ny;
          const ty = nx;

          const overlap = BALL_RADIUS + PEG_RADIUS - dist + PEG_SEPARATION_EPSILON;
          ball.x += nx * overlap;
          ball.y += ny * overlap;

          const normalSpeed = ball.vx * nx + ball.vy * ny;
          if (normalSpeed < 0) {
            const restitution = physicsProfile.restitution;
            ball.vx -= (1 + restitution) * normalSpeed * nx;
            ball.vy -= (1 + restitution) * normalSpeed * ny;
          }

          const tangentSpeed = ball.vx * tx + ball.vy * ty;
          const sideKick = (Math.random() - 0.5) * 0.16;
          ball.vx += tx * (sideKick + tangentSpeed * 0.06);
          ball.vy = Math.max(0.36, ball.vy * 0.96 + Math.abs(tangentSpeed) * 0.014);
          ball.vx = clamp(ball.vx, -MAX_VX, MAX_VX);
          ball.vy = Math.min(ball.vy, MAX_VY);
        }
      }

      drawBoard(ctx, ball);

      const settleLineY = BOARD_HEIGHT - BUCKET_HEIGHT - BALL_RADIUS;
      if (ball.y >= settleLineY) {
        ball.x = clamp(ball.x, BALL_RADIUS + 1, BOARD_WIDTH - BALL_RADIUS - 1);
        ball.y = settleLineY;
        drawBoard(ctx, ball);

        const landedBucket = clamp(
          Math.floor(ball.x / (BOARD_WIDTH / multipliers.length)),
          0,
          multipliers.length - 1
        );

        settleTimeoutRef.current = window.setTimeout(() => {
          setActiveBucket(landedBucket);
          settleResult(cost, landedBucket);
        }, 210);
        return;
      }

      rafRef.current = requestAnimationFrame(animate);
    };

    rafRef.current = requestAnimationFrame(animate);
  }, [
    addBalance,
    betCoins,
    canDrop,
    drawBoard,
    multipliers,
    physicsProfile,
    settleResult,
    stopCurrentAnimation,
    subtractBalance,
  ]);

  useEffect(() => {
    return () => {
      stopCurrentAnimation();
    };
  }, [stopCurrentAnimation]);

  useEffect(() => {
    if (isAuto && autoCount > 0 && !isDropping) {
      const timer = window.setTimeout(dropBall, 420);
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
      return;
    }
    setAutoCount(10);
    setIsAuto(true);
  };

  return (
    <div className="mx-auto grid max-w-6xl gap-6 p-4 lg:grid-cols-5">
      <div className="space-y-4 lg:col-span-2 xl:col-span-1">
        <div className="rounded-2xl border border-white/10 bg-[#111827] p-4">
          <div className="mb-4 text-[10px] font-black uppercase tracking-[0.22em] text-cyan-200/70">Plinko Control</div>

          <div className="space-y-3">
            <div>
              <div className="mb-1 text-[10px] uppercase tracking-[0.15em] text-white/45">Bet Amount</div>
              <div className="mb-2 text-2xl font-black text-white">${bet.toFixed(2)}</div>
              <input
                type="number"
                min="0.01"
                step="0.01"
                value={bet}
                onChange={(e) => setBet(Math.max(MIN_BET, Number(e.target.value))) }
                disabled={isAuto}
                className="w-full rounded-xl border border-white/15 bg-black/40 px-3 py-2 text-sm text-white focus:outline-none focus:border-cyan-300/60 disabled:opacity-60"
              />
              <QuickBetButtons
                balance={centsToDollars(balance)}
                bet={bet}
                onSetBet={setBet}
                disabled={isAuto}
                pcts={[25, 50, 75, 100]}
              />
            </div>

            <div>
              <div className="mb-1 text-[10px] uppercase tracking-[0.15em] text-white/45">Rows</div>
              <div className="grid grid-cols-5 gap-1.5">
                {ROW_COUNTS.map((value) => (
                  <button
                    key={value}
                    disabled={isAuto}
                    onClick={() => setRows(value)}
                    className={cn(
                      'rounded-lg py-2 text-xs font-black transition-all',
                      rows === value ? 'bg-cyan-300 text-slate-950' : 'bg-white/5 text-white/55 hover:bg-white/10 hover:text-white'
                    )}
                  >
                    {value}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <div className="mb-1 text-[10px] uppercase tracking-[0.15em] text-white/45">Risk</div>
              <div className="grid grid-cols-3 gap-1.5">
                {(['low', 'medium', 'high'] as RiskLevel[]).map((value) => (
                  <button
                    key={value}
                    disabled={isAuto}
                    onClick={() => setRisk(value)}
                    className={cn(
                      'rounded-lg border px-2 py-2 text-[10px] font-black uppercase tracking-[0.14em] transition-all',
                      risk === value
                        ? 'border-white/40 bg-white/12 ' + getRiskColor(value)
                        : 'border-transparent bg-white/5 text-white/50 hover:text-white'
                    )}
                  >
                    {value}
                  </button>
                ))}
              </div>
            </div>

            <button
              onClick={toggleAuto}
              disabled={isDropping}
              className={cn(
                'flex w-full items-center justify-center gap-2 rounded-xl border py-2.5 text-xs font-black uppercase tracking-[0.16em] transition-all',
                isAuto
                  ? 'border-rose-400/45 bg-rose-500/20 text-rose-200'
                  : 'border-white/10 bg-white/8 text-white/70 hover:bg-white/12'
              )}
            >
              <RotateCcw size={14} className={isAuto ? 'animate-spin' : ''} />
              {isAuto ? `Auto (${autoCount})` : 'Auto Play'}
            </button>

            <button
              onClick={dropBall}
              disabled={!canDrop}
              className={cn(
                'flex w-full items-center justify-center gap-2 rounded-xl py-3 text-sm font-black uppercase tracking-[0.15em] transition-all',
                isDropping
                  ? 'bg-amber-400/20 text-amber-200'
                  : 'bg-cyan-300 text-slate-900 hover:bg-cyan-200',
                !canDrop && 'cursor-not-allowed opacity-50'
              )}
            >
              <Play size={18} fill="currentColor" />
              {isDropping ? 'Dropping' : 'Drop Ball'}
            </button>
          </div>
        </div>

        <GameStatsBar
          stats={[
            { label: 'Drops', value: String(drops || stats.totalBets) },
            { label: 'Wins', value: String(stats.totalWins) },
            { label: 'Profit', value: formatCents(stats.totalPayout - stats.totalWagered) },
          ]}
        />

        <div className="rounded-2xl border border-white/10 bg-[#111827] p-3">
          <div className="mb-2 text-[10px] font-black uppercase tracking-[0.2em] text-white/45">Payout Grid</div>
          <div className="grid max-h-36 grid-cols-3 gap-1 overflow-y-auto pr-1">
            {multipliers.map((multiplier, index) => (
              <div
                key={`${multiplier}-${index}`}
                className={cn(
                  'rounded-md border px-1.5 py-1 text-center text-[10px] font-black',
                  getMultiplierTone(multiplier),
                  activeBucket === index && 'ring-1 ring-white/60'
                )}
              >
                {multiplier.toFixed(2)}x
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="lg:col-span-3 xl:col-span-4">
        <div className="relative overflow-hidden rounded-3xl border border-white/10 bg-[#020617] p-5">
          <div
            className="absolute inset-0 opacity-[0.08]"
            style={{
              backgroundImage:
                'radial-gradient(circle at 20% 10%, #38bdf8 0%, transparent 28%), radial-gradient(circle at 80% 20%, #818cf8 0%, transparent 30%)',
            }}
          />

          <div className="relative z-10 mb-4 flex flex-wrap items-center justify-between gap-3">
            <div>
              <div className="text-[10px] font-black uppercase tracking-[0.24em] text-cyan-200/70">Renewed Plinko</div>
              <div className="mt-1 text-3xl font-black uppercase tracking-tight text-white">Free Fall Engine</div>
            </div>
            <div className="rounded-2xl border border-white/10 bg-black/25 px-4 py-2 text-right">
              <div className="text-[10px] uppercase tracking-[0.16em] text-white/45">Mode</div>
              <div className={cn('text-sm font-black uppercase', getRiskColor(risk))}>{risk} / {rows} rows</div>
            </div>
          </div>

          <AnimatePresence>
            {lastResult && (
              <motion.div
                initial={{ opacity: 0, y: -10, scale: 0.96 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: -10, scale: 0.96 }}
                className="absolute left-1/2 top-4 z-20 -translate-x-1/2"
              >
                <div className={cn(
                  'rounded-2xl border px-6 py-3 text-center backdrop-blur-md',
                  lastResult.payout > betCoins
                    ? 'border-emerald-300/55 bg-emerald-500/18'
                    : 'border-rose-300/55 bg-rose-500/18'
                )}>
                  <div className="text-2xl font-black text-white">{lastResult.multiplier.toFixed(2)}x</div>
                  <div className="text-sm font-black text-white/85">
                    {lastResult.payout > betCoins ? '+' : '-'}{formatCents(Math.abs(lastResult.payout))}
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          <div className="relative z-10 flex justify-center">
            <canvas
              ref={canvasRef}
              width={BOARD_WIDTH}
              height={BOARD_HEIGHT}
              className="rounded-2xl border border-white/15"
            />
          </div>

          <div className="relative z-10 mt-4 grid grid-cols-3 gap-2">
            <div className="rounded-xl border border-white/10 bg-black/20 px-3 py-2 text-center">
              <div className="text-[10px] uppercase tracking-[0.16em] text-white/40">Max</div>
              <div className="text-xl font-black text-rose-200">{Math.max(...multipliers).toFixed(2)}x</div>
            </div>
            <div className="rounded-xl border border-white/10 bg-black/20 px-3 py-2 text-center">
              <div className="text-[10px] uppercase tracking-[0.16em] text-white/40">Min</div>
              <div className="text-xl font-black text-slate-200">{Math.min(...multipliers).toFixed(2)}x</div>
            </div>
            <div className="rounded-xl border border-white/10 bg-black/20 px-3 py-2 text-center">
              <div className="text-[10px] uppercase tracking-[0.16em] text-white/40">Balance</div>
              <div className="text-xl font-black text-cyan-200">{formatCents(balance)}</div>
            </div>
          </div>

          <div className="relative z-10 mt-3 text-right text-[10px] uppercase tracking-[0.15em] text-white/35">
            Space to drop
          </div>
        </div>
      </div>
    </div>
  );
};
