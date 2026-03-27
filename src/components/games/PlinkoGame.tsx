import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { useBalance } from '../../context/BalanceContext';
import { cn } from '../../lib/utils';
import { Play, RotateCcw } from 'lucide-react';
import { QuickBetButtons, GameStatsBar, useLocalGameStats, useGameHotkeys, centsToDollars, dollarsToCents, formatCents, MIN_BET } from './GameHooks';
import confetti from 'canvas-confetti';
import { logBetActivity } from '../../lib/activity';

type RiskLevel = 'low' | 'medium' | 'high';

const ROW_COUNTS = [8, 10, 12, 14, 16] as const;

const MULTIPLIERS: Record<number, Record<RiskLevel, number[]>> = {
  8: {
    low: [3.8161, 2.595, 1.6791, 0.7632, 0.2442, 0.7632, 1.6791, 2.595, 3.8161],
    medium: [6.7516, 3.7509, 1.6879, 0.6001, 0.15, 0.6001, 1.6879, 3.7509, 6.7516],
    high: [9.3037, 4.1151, 1.7892, 0.501, 0.0716, 0.501, 1.7892, 4.1151, 9.3037],
  },
  10: {
    low: [6.0276, 3.6836, 2.3441, 1.4064, 0.6697, 0.2679, 0.6697, 1.4064, 2.3441, 3.6836, 6.0276],
    medium: [13.7322, 6.6372, 3.2042, 1.2817, 0.4577, 0.1373, 0.4577, 1.2817, 3.2042, 6.6372, 13.7322],
    high: [20.4382, 7.4321, 3.5302, 1.1891, 0.4088, 0.0743, 0.4088, 1.1891, 3.5302, 7.4321, 20.4382],
  },
  12: {
    low: [11.2311, 5.8402, 3.594, 2.2462, 1.2579, 0.5391, 0.2246, 0.5391, 1.2579, 2.2462, 3.594, 5.8402, 11.2311],
    medium: [30.6498, 12.941, 5.7894, 2.452, 0.9535, 0.4087, 0.1362, 0.4087, 0.9535, 2.452, 5.7894, 12.941, 30.6498],
    high: [46.2267, 16.1794, 6.3562, 2.4269, 0.9245, 0.3467, 0.0867, 0.3467, 0.9245, 2.4269, 6.3562, 16.1794, 46.2267],
  },
  14: {
    low: [17.2018, 6.8807, 3.7844, 2.2362, 1.5482, 1.1181, 0.6881, 0.43, 0.6881, 1.1181, 1.5482, 2.2362, 3.7844, 6.8807, 17.2018],
    medium: [60.2804, 17.8101, 7.6721, 3.562, 1.781, 0.959, 0.4932, 0.2192, 0.4932, 0.959, 1.781, 3.562, 7.6721, 17.8101, 60.2804],
    high: [170.7457, 34.1491, 11.9522, 4.2686, 1.7075, 0.7968, 0.3415, 0.1423, 0.3415, 0.7968, 1.7075, 4.2686, 11.9522, 34.1491, 170.7457],
  },
  16: {
    low: [31.384, 11.2086, 5.8285, 3.1384, 2.2417, 1.5692, 1.0088, 0.6277, 0.4035, 0.6277, 1.0088, 1.5692, 2.2417, 3.1384, 5.8285, 11.2086, 31.384],
    medium: [132.3203, 35.1476, 14.4725, 6.2025, 3.1013, 1.654, 0.827, 0.4135, 0.2068, 0.4135, 0.827, 1.654, 3.1013, 6.2025, 14.4725, 35.1476, 132.3203],
    high: [328.1308, 65.6262, 19.6879, 7.8751, 3.2813, 1.6407, 0.7219, 0.3281, 0.0984, 0.3281, 0.7219, 1.6407, 3.2813, 7.8751, 19.6879, 65.6262, 328.1308],
  },
};

const PEG_COLOR = '#ffffff';
const BALL_RADIUS = 8;
const PEG_RADIUS = 4;
const GRAVITY = 0.46;
const BOUNCE = 0.34;
const FRICTION = 0.94;
const START_DRIFT = 0.5;
const PEG_RANDOM_KICK = 0.22;
const SIDEWAYS_DAMPING = 0.56;
const CENTER_PULL = 0.03;
const MAX_SIDEWAYS_SPEED = 1.45;
const TARGET_PULL = 0.014;
const CLIENT_SEED_STORAGE_KEY = 'pasus_client_seed';
const CLIENT_NONCE_STORAGE_KEY = 'pasus_client_nonce';

function samplePlinkoBucket(rowCount: number) {
  let rightSteps = 0;
  for (let i = 0; i < rowCount; i += 1) {
    if (Math.random() >= 0.5) rightSteps += 1;
  }
  return rightSteps;
}

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
  const [pfClientSeed, setPfClientSeed] = useState('');
  const [pfNonce, setPfNonce] = useState(1);
  
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const pegsRef = useRef<Array<{ x: number; y: number }>>([]);
  const bucketsRef = useRef<Array<{ x: number; y: number; width: number }>>([]);
  const ballRef = useRef<{ x: number; y: number; vx: number; vy: number } | null>(null);
  const animationRef = useRef<number>();
  const bucketHitRef = useRef(false);
  const dropLockRef = useRef(false);
  const targetBucketRef = useRef<number | null>(null);
  const targetBucketXRef = useRef<number | null>(null);

  const { getStats, recordBet } = useLocalGameStats('plinko');
  const stats = getStats();

  const multipliers = useMemo(() => MULTIPLIERS[rows][risk], [rows, risk]);
  const physicsProfile = useMemo(() => {
    if (rows === 8) {
      return {
        bounce: 0.24,
        startDrift: 0.16,
        pegRandomKick: 0.06,
        sidewaysDamping: 0.24,
        centerPull: 0.052,
        maxSidewaysSpeed: 0.58,
      };
    }

    if (rows === 10) {
      return {
        bounce: 0.28,
        startDrift: 0.22,
        pegRandomKick: 0.08,
        sidewaysDamping: 0.3,
        centerPull: 0.044,
        maxSidewaysSpeed: 0.8,
      };
    }

    if (rows === 12) {
      return {
        bounce: 0.31,
        startDrift: 0.28,
        pegRandomKick: 0.12,
        sidewaysDamping: 0.4,
        centerPull: 0.038,
        maxSidewaysSpeed: 1,
      };
    }

    return {
      bounce: BOUNCE,
      startDrift: START_DRIFT,
      pegRandomKick: PEG_RANDOM_KICK,
      sidewaysDamping: SIDEWAYS_DAMPING,
      centerPull: CENTER_PULL,
      maxSidewaysSpeed: MAX_SIDEWAYS_SPEED,
    };
  }, [rows]);
  const betCoins = useMemo(() => dollarsToCents(bet), [bet]);
  const canDrop = !isDropping && balance >= betCoins;

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
    if (!canDrop || dropLockRef.current) return;
    dropLockRef.current = true;

    const cost = betCoins;
    if (!subtractBalance(cost)) {
      dropLockRef.current = false;
      return;
    }

    setIsDropping(true);
    setLastResult(null);
    setFinalPosition(null);
    bucketHitRef.current = false;

    const selectedBucket = Math.min(samplePlinkoBucket(rows), multipliers.length - 1);
    const bucketWidth = canvasWidth / multipliers.length;
    targetBucketRef.current = selectedBucket;
    targetBucketXRef.current = (selectedBucket + 0.5) * bucketWidth;

    const startX = canvasWidth / 2 + (Math.random() - 0.5) * 30;
    ballRef.current = {
      x: startX,
      y: 20,
      vx: (Math.random() - 0.5) * physicsProfile.startDrift,
      vy: 0,
    };

    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (!ctx || !canvas) {
      addBalance(cost);
      setIsDropping(false);
      dropLockRef.current = false;
      targetBucketRef.current = null;
      targetBucketXRef.current = null;
      return;
    }

    const animate = () => {
      const ball = ballRef.current;
      if (!ball || bucketHitRef.current) return;

      ball.vy += GRAVITY;
      ball.vx += (canvasWidth / 2 - ball.x) * physicsProfile.centerPull;
      if (targetBucketXRef.current !== null) {
        ball.vx += (targetBucketXRef.current - ball.x) * TARGET_PULL;
      }
      ball.vx *= FRICTION;
      ball.vx = Math.max(-physicsProfile.maxSidewaysSpeed, Math.min(physicsProfile.maxSidewaysSpeed, ball.vx));
      ball.x += ball.vx;
      ball.y += ball.vy;

      if (targetBucketXRef.current !== null && ball.y > canvasHeight - bucketHeight - BALL_RADIUS * 2.5) {
        ball.x += (targetBucketXRef.current - ball.x) * 0.22;
      }

      if (ball.x < BALL_RADIUS) {
        ball.x = BALL_RADIUS;
        ball.vx = -ball.vx * physicsProfile.bounce;
      }
      if (ball.x > canvasWidth - BALL_RADIUS) {
        ball.x = canvasWidth - BALL_RADIUS;
        ball.vx = -ball.vx * physicsProfile.bounce;
      }

      for (const peg of pegsRef.current) {
        const dx = ball.x - peg.x;
        const dy = ball.y - peg.y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        
        if (dist < BALL_RADIUS + PEG_RADIUS) {
          const angle = Math.atan2(dy, dx);
          const speed = Math.sqrt(ball.vx * ball.vx + ball.vy * ball.vy);
          const outwardX = Math.cos(angle) * speed * physicsProfile.bounce;
          const outwardY = Math.sin(angle) * speed * physicsProfile.bounce;
          
          ball.vx = outwardX * physicsProfile.sidewaysDamping + (Math.random() - 0.5) * physicsProfile.pegRandomKick;
          ball.vy = Math.max(0.8, outwardY + GRAVITY * 0.35);
          ball.vx = Math.max(-physicsProfile.maxSidewaysSpeed, Math.min(physicsProfile.maxSidewaysSpeed, ball.vx));
          
          const overlap = BALL_RADIUS + PEG_RADIUS - dist;
          ball.x += Math.cos(angle) * overlap;
          ball.y += Math.sin(angle) * overlap;
        }
      }

      if (ball.y > canvasHeight - bucketHeight - BALL_RADIUS && !bucketHitRef.current) {
        bucketHitRef.current = true;
        
        const numBuckets = multipliers.length;
        const resolvedBucket = targetBucketRef.current;
        const resolvedIndex = resolvedBucket !== null
          ? Math.min(Math.max(resolvedBucket, 0), numBuckets - 1)
          : Math.min(Math.max(Math.floor(ball.x / (canvasWidth / numBuckets)), 0), numBuckets - 1);
        const bucketIndex = resolvedIndex;
        
        setFinalPosition(bucketIndex);
        
        const multiplier = multipliers[bucketIndex];
        const payout = Math.round(cost * multiplier);

        setTimeout(() => {
          addBalance(payout);
          setLastResult({ multiplier, payout });

          if (payout > cost) {
            confetti({ particleCount: 50, spread: 60, origin: { y: 0.7 } });
          }

          if (payout > cost * 2) {
            logBetActivity({ gameKey: 'plinko', wager: cost, payout, multiplier, outcome: 'win', detail: `Hit ${multiplier}x` });
            recordBet(cost, payout, true);
          } else if (payout > 0) {
            logBetActivity({ gameKey: 'plinko', wager: cost, payout, multiplier, outcome: 'win', detail: `Hit ${multiplier}x` });
            recordBet(cost, payout, payout > cost);
          } else {
            logBetActivity({ gameKey: 'plinko', wager: cost, payout: 0, multiplier: 0, outcome: 'loss', detail: `Hit ${multiplier}x` });
            recordBet(cost, 0, false);
          }
          
          setDroppedBalls(prev => prev + 1);
          setIsDropping(false);
          dropLockRef.current = false;
          targetBucketRef.current = null;
          targetBucketXRef.current = null;
          
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
  }, [canDrop, betCoins, subtractBalance, addBalance, multipliers, isAuto, autoCount, recordBet, canvasWidth, canvasHeight, physicsProfile]);

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

  useEffect(() => {
    if (typeof window === 'undefined') return;

    const syncProvablyFairData = () => {
      setPfClientSeed(localStorage.getItem(CLIENT_SEED_STORAGE_KEY) || 'N/A');
      setPfNonce(Number(localStorage.getItem(CLIENT_NONCE_STORAGE_KEY) || 1));
    };

    syncProvablyFairData();
    window.addEventListener('pasus:bet-recorded', syncProvablyFairData as EventListener);
    window.addEventListener('storage', syncProvablyFairData as EventListener);
    return () => {
      window.removeEventListener('pasus:bet-recorded', syncProvablyFairData as EventListener);
      window.removeEventListener('storage', syncProvablyFairData as EventListener);
    };
  }, []);

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
                onChange={(e) => setBet(Math.max(MIN_BET, Number(e.target.value)))}
                min="0.01"
                step="0.01"
                disabled={isAuto}
                className="w-full bg-black/50 border border-white/10 rounded-xl px-3 py-2.5 text-white text-sm focus:outline-none focus:border-[#00FF88]/50 disabled:opacity-50"
              />
              <QuickBetButtons balance={centsToDollars(balance)} bet={bet} onSetBet={setBet} disabled={isAuto} pcts={[25, 50, 75, 100]} />
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
          { label: 'Profit', value: formatCents(stats.totalPayout - stats.totalWagered) },
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

        <div className="bg-[#1a1d23] border border-white/5 rounded-2xl p-4 space-y-3">
          <div className="text-[10px] uppercase tracking-widest text-white/40">Provably Fair</div>
          <div className="space-y-2 text-[11px]">
            <div className="rounded-lg bg-black/30 border border-white/10 px-3 py-2">
              <div className="text-white/35 uppercase tracking-[0.16em] text-[9px]">Client Seed</div>
              <div className="text-white/80 font-mono truncate">{pfClientSeed || 'N/A'}</div>
            </div>
            <div className="rounded-lg bg-black/30 border border-white/10 px-3 py-2">
              <div className="text-white/35 uppercase tracking-[0.16em] text-[9px]">Nonce</div>
              <div className="text-white font-black">{pfNonce}</div>
            </div>
          </div>
          <a
            href="/provably-fair"
            className="block w-full text-center rounded-xl bg-white/10 hover:bg-white/15 text-white/80 py-2 text-[10px] font-black uppercase tracking-[0.16em] transition-all"
          >
            Open Verifier
          </a>
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
                  lastResult.payout > betCoins 
                    ? 'bg-green-500/20 border-green-500/50 shadow-lg shadow-green-500/30' 
                    : 'bg-red-500/20 border-red-500/50'
                )}>
                  <div className="text-center">
                    <div className={cn('text-3xl font-black', getMultiplierColor(lastResult.multiplier))}>
                      {lastResult.multiplier.toFixed(1)}x
                    </div>
                    <div className="text-lg font-black text-white mt-1">
                      {lastResult.payout > betCoins ? '+' : '-'}{formatCents(Math.abs(lastResult.payout))}
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
