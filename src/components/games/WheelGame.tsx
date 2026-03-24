import React, { useEffect, useMemo, useRef, useState } from 'react';
import { motion } from 'motion/react';
import { Gauge, Play, RotateCcw, Target, Timer, Zap } from 'lucide-react';
import confetti from 'canvas-confetti';
import { useBalance } from '../../context/BalanceContext';
import { logBetActivity } from '../../lib/activity';
import { cn } from '../../lib/utils';

type RiskTier = 'low' | 'medium' | 'high' | 'daredevil';

type WheelSegment = {
  multiplier: number;
  label: string;
  fill: string;
  accent: string;
  textColor: string;
  weight: number;
};

type WheelConfig = {
  title: string;
  subtitle: string;
  description: string;
  accent: string;
  segments: WheelSegment[];
};

type SpinEntry = {
  multiplier: number;
  payout: number;
  profit: number;
  won: boolean;
  risk: RiskTier;
  label: string;
  fill: string;
  textColor: string;
};

const SUPER_WHEEL_PALETTE = ['#25d8ff', '#53f28c', '#f5cc4d', '#ff9f43', '#f76363', '#9d69ff', '#4f7cff', '#34d399'];

const WHEEL_RADIUS = 182;
const INNER_RADIUS = 54;
const LABEL_RADIUS = 132;
const HISTORY_LIMIT = 14;
const MAX_AUTO_SPINS = 100;
const POINTER_TOP_ANGLE = 0;
const TICK_RESET_MS = 70;

const deadSegment = (): WheelSegment => ({
  multiplier: 0,
  label: '0x',
  fill: '#11151b',
  accent: '#28313d',
  textColor: '#dce6f2',
  weight: 1,
});

const RISK_ORDER: RiskTier[] = ['low', 'medium', 'high', 'daredevil'];

const WHEEL_CONFIG: Record<RiskTier, WheelConfig> = {
  low: {
    title: 'Low Risk',
    subtitle: 'Frequent safety wedges and softer peaks',
    description: 'Built for smoother sessions. Plenty of recovery wedges, lighter dead zones, and a lower ceiling.',
    accent: '#00FF88',
    segments: [
      { multiplier: 1.2, label: '1.2x', fill: '#00FF88', accent: '#8effc7', textColor: '#04120b', weight: 5 },
      deadSegment(),
      { multiplier: 1.5, label: '1.5x', fill: '#51d5ff', accent: '#b5efff', textColor: '#06131a', weight: 4 },
      deadSegment(),
      { multiplier: 1.2, label: '1.2x', fill: '#00FF88', accent: '#8effc7', textColor: '#04120b', weight: 5 },
      { multiplier: 2, label: '2x', fill: '#4f7cff', accent: '#c4d2ff', textColor: '#091122', weight: 2 },
      { multiplier: 1.2, label: '1.2x', fill: '#00FF88', accent: '#8effc7', textColor: '#04120b', weight: 5 },
      deadSegment(),
      { multiplier: 1.5, label: '1.5x', fill: '#51d5ff', accent: '#b5efff', textColor: '#06131a', weight: 4 },
      deadSegment(),
      { multiplier: 1.2, label: '1.2x', fill: '#00FF88', accent: '#8effc7', textColor: '#04120b', weight: 5 },
      { multiplier: 3, label: '3x', fill: '#f5c84c', accent: '#ffeb99', textColor: '#191202', weight: 1 },
      { multiplier: 1.2, label: '1.2x', fill: '#00FF88', accent: '#8effc7', textColor: '#04120b', weight: 5 },
      deadSegment(),
      { multiplier: 1.5, label: '1.5x', fill: '#51d5ff', accent: '#b5efff', textColor: '#06131a', weight: 4 },
      deadSegment(),
    ],
  },
  medium: {
    title: 'Medium Risk',
    subtitle: 'Classic balance between blanks and spikes',
    description: 'A more volatile wheel. More 0x wedges, stronger jumps, and enough top-end to chase.',
    accent: '#53b6ff',
    segments: [
      deadSegment(),
      { multiplier: 1.5, label: '1.5x', fill: '#00FF88', accent: '#8effc7', textColor: '#04120b', weight: 3 },
      deadSegment(),
      { multiplier: 2, label: '2x', fill: '#57c7ff', accent: '#b8ecff', textColor: '#07121a', weight: 2 },
      deadSegment(),
      { multiplier: 1.5, label: '1.5x', fill: '#00FF88', accent: '#8effc7', textColor: '#04120b', weight: 3 },
      deadSegment(),
      { multiplier: 3, label: '3x', fill: '#7c5cff', accent: '#d6cbff', textColor: '#100922', weight: 1 },
      deadSegment(),
      { multiplier: 2, label: '2x', fill: '#57c7ff', accent: '#b8ecff', textColor: '#07121a', weight: 2 },
      deadSegment(),
      { multiplier: 5, label: '5x', fill: '#f97316', accent: '#fdba74', textColor: '#180d04', weight: 1 },
      deadSegment(),
      { multiplier: 1.5, label: '1.5x', fill: '#00FF88', accent: '#8effc7', textColor: '#04120b', weight: 3 },
      deadSegment(),
      { multiplier: 2, label: '2x', fill: '#57c7ff', accent: '#b8ecff', textColor: '#07121a', weight: 2 },
    ],
  },
  high: {
    title: 'High Risk',
    subtitle: 'Dead space with real spike wedges',
    description: 'A sharper wheel with only 0x, 2x, 5x, and 10x. Misses stack up, but the hits matter.',
    accent: '#ff9b43',
    segments: [
      deadSegment(),
      { multiplier: 2, label: '2x', fill: '#00FF88', accent: '#8effc7', textColor: '#04120b', weight: 2 },
      deadSegment(),
      deadSegment(),
      { multiplier: 5, label: '5x', fill: '#4f7cff', accent: '#c4d2ff', textColor: '#091122', weight: 1 },
      deadSegment(),
      deadSegment(),
      { multiplier: 10, label: '10x', fill: '#f97316', accent: '#fdba74', textColor: '#180d04', weight: 1 },
      deadSegment(),
      deadSegment(),
      { multiplier: 2, label: '2x', fill: '#00FF88', accent: '#8effc7', textColor: '#04120b', weight: 2 },
      deadSegment(),
      deadSegment(),
      { multiplier: 5, label: '5x', fill: '#57c7ff', accent: '#b8ecff', textColor: '#07121a', weight: 1 },
      deadSegment(),
      deadSegment(),
    ],
  },
  daredevil: {
    title: 'Daredevil',
    subtitle: 'Almost all blanks, two brutal top hits',
    description: 'Mostly dead wedges. Two premium multipliers. Long droughts and very large swing potential.',
    accent: '#ff4d94',
    segments: [
      deadSegment(),
      deadSegment(),
      deadSegment(),
      { multiplier: 15, label: '15x', fill: '#f97316', accent: '#ffbf87', textColor: '#190d03', weight: 1 },
      deadSegment(),
      deadSegment(),
      deadSegment(),
      deadSegment(),
      deadSegment(),
      deadSegment(),
      deadSegment(),
      { multiplier: 50, label: '50x', fill: '#ff4d94', accent: '#ffc1da', textColor: '#220612', weight: 1 },
      deadSegment(),
      deadSegment(),
      deadSegment(),
      deadSegment(),
    ],
  },
};

function polarToCartesian(cx: number, cy: number, radius: number, angleDeg: number) {
  const angleRad = (angleDeg - 90) * (Math.PI / 180);
  return {
    x: cx + radius * Math.cos(angleRad),
    y: cy + radius * Math.sin(angleRad),
  };
}

function describeSegmentPath(cx: number, cy: number, outerRadius: number, innerRadius: number, startAngle: number, endAngle: number) {
  const outerStart = polarToCartesian(cx, cy, outerRadius, endAngle);
  const outerEnd = polarToCartesian(cx, cy, outerRadius, startAngle);
  const innerStart = polarToCartesian(cx, cy, innerRadius, startAngle);
  const innerEnd = polarToCartesian(cx, cy, innerRadius, endAngle);
  const largeArcFlag = endAngle - startAngle <= 180 ? '0' : '1';

  return [
    `M ${outerStart.x} ${outerStart.y}`,
    `A ${outerRadius} ${outerRadius} 0 ${largeArcFlag} 0 ${outerEnd.x} ${outerEnd.y}`,
    `L ${innerStart.x} ${innerStart.y}`,
    `A ${innerRadius} ${innerRadius} 0 ${largeArcFlag} 1 ${innerEnd.x} ${innerEnd.y}`,
    'Z',
  ].join(' ');
}

function normalizeAngle(angle: number) {
  return ((angle % 360) + 360) % 360;
}

function easeOutCubic(t: number) {
  return 1 - Math.pow(1 - t, 3);
}

function easeOutQuint(t: number) {
  return 1 - Math.pow(1 - t, 5);
}

function getSpinProgress(t: number) {
  const launch = 0.14;
  const cruise = 0.18;
  const launchDistance = 0.24;
  const cruiseDistance = 0.24;
  const decelDistance = 1 - launchDistance - cruiseDistance;

  if (t <= launch) {
    return launchDistance * easeOutCubic(t / launch);
  }

  if (t <= launch + cruise) {
    const local = (t - launch) / cruise;
    return launchDistance + cruiseDistance * local;
  }

  const local = (t - launch - cruise) / (1 - launch - cruise);
  return launchDistance + cruiseDistance + decelDistance * easeOutQuint(local);
}

function getWeightedIndex(segments: WheelSegment[]) {
  const totalWeight = segments.reduce((sum, segment) => sum + segment.weight, 0);
  let roll = Math.random() * totalWeight;

  for (let index = 0; index < segments.length; index += 1) {
    roll -= segments[index].weight;
    if (roll <= 0) {
      return index;
    }
  }

  return segments.length - 1;
}

function getSegmentCenter(index: number, segmentAngle: number) {
  return index * segmentAngle + segmentAngle / 2;
}

function getTargetRotation(currentRotation: number, segmentIndex: number, segmentCount: number, risk: RiskTier, isFast: boolean) {
  const segmentAngle = 360 / segmentCount;
  const safeOffset = (Math.random() * 2 - 1) * segmentAngle * 0.16;
  const targetAngle = normalizeAngle(-(getSegmentCenter(segmentIndex, segmentAngle) + safeOffset - POINTER_TOP_ANGLE));
  const currentNormalized = normalizeAngle(currentRotation);
  const forwardDelta = ((targetAngle - currentNormalized) + 360) % 360;
  const baseTurns = isFast ? 5 : 8;
  const riskBoost = risk === 'daredevil' ? 2 : risk === 'high' ? 1 : 0;
  const extraTurns = (baseTurns + riskBoost + Math.floor(Math.random() * 3)) * 360;
  return currentRotation + extraTurns + forwardDelta;
}

function formatMultiplier(value: number) {
  if (value === 0) {
    return '0x';
  }
  if (value >= 10 || Number.isInteger(value)) {
    return `${value.toFixed(0)}x`;
  }
  return `${value.toFixed(1)}x`;
}

function getDuration(risk: RiskTier, isFast: boolean) {
  if (isFast) {
    return risk === 'daredevil' ? 2600 : 2400;
  }
  if (risk === 'daredevil') {
    return 5800;
  }
  if (risk === 'high') {
    return 5400;
  }
  return 5000;
}

function getDisplayFill(segment: WheelSegment, index: number) {
  if (segment.multiplier === 0) {
    return '#122034';
  }
  return SUPER_WHEEL_PALETTE[index % SUPER_WHEEL_PALETTE.length];
}

function getDisplayAccent(segment: WheelSegment, index: number) {
  if (segment.multiplier === 0) {
    return '#39506e';
  }
  return SUPER_WHEEL_PALETTE[(index + 2) % SUPER_WHEEL_PALETTE.length];
}

export const WheelGame: React.FC = () => {
  const { balance, addBalance, subtractBalance } = useBalance();
  const [bet, setBet] = useState(10);
  const [risk, setRisk] = useState<RiskTier>('medium');
  const [wheelRotation, setWheelRotation] = useState(0);
  const [pointerKick, setPointerKick] = useState(0);
  const [isSpinning, setIsSpinning] = useState(false);
  const [isFast, setIsFast] = useState(false);
  const [autoArmed, setAutoArmed] = useState(false);
  const [isAuto, setIsAuto] = useState(false);
  const [autoRounds, setAutoRounds] = useState(10);
  const [remainingRounds, setRemainingRounds] = useState(0);
  const [resultIndex, setResultIndex] = useState<number | null>(null);
  const [statusText, setStatusText] = useState('Pick a risk tier and spin the wheel.');
  const [history, setHistory] = useState<SpinEntry[]>([]);
  const [sessionProfit, setSessionProfit] = useState(0);
  const [totalSpins, setTotalSpins] = useState(0);
  const [winningSpins, setWinningSpins] = useState(0);
  const [topHit, setTopHit] = useState(0);
  const [spinTempo, setSpinTempo] = useState(0);
  const [glowLevel, setGlowLevel] = useState(0.15);

  const activeConfig = WHEEL_CONFIG[risk];
  const segments = activeConfig.segments;
  const segmentAngle = 360 / segments.length;

  const rotationRef = useRef(0);
  const rafRef = useRef<number | null>(null);
  const autoTimerRef = useRef<number | null>(null);
  const pointerResetRef = useRef<number | null>(null);
  const tickAccumulatorRef = useRef(0);
  const isAutoRef = useRef(false);
  const remainingRoundsRef = useRef(0);

  const odds = useMemo(() => {
    const totalWeight = segments.reduce((sum, segment) => sum + segment.weight, 0);
    const grouped = new Map<number, { weight: number; count: number; fill: string; textColor: string }>();

    segments.forEach((segment) => {
      const current = grouped.get(segment.multiplier) || { weight: 0, count: 0, fill: segment.fill, textColor: segment.textColor };
      grouped.set(segment.multiplier, {
        weight: current.weight + segment.weight,
        count: current.count + 1,
        fill: current.fill,
        textColor: current.textColor,
      });
    });

    return Array.from(grouped.entries())
      .map(([multiplier, data]) => ({
        multiplier,
        label: formatMultiplier(multiplier),
        probability: data.weight / totalWeight,
        count: data.count,
        fill: data.fill,
        textColor: data.textColor,
      }))
      .sort((a, b) => a.multiplier - b.multiplier);
  }, [segments]);

  const expectedReturn = useMemo(() => odds.reduce((sum, entry) => sum + entry.multiplier * entry.probability, 0), [odds]);
  const hitRate = useMemo(() => odds.filter((entry) => entry.multiplier > 0).reduce((sum, entry) => sum + entry.probability, 0), [odds]);
  const sessionHitRate = totalSpins ? winningSpins / totalSpins : 0;
  const lastEntry = history[0] || null;

  const clearPointerReset = () => {
    if (pointerResetRef.current !== null) {
      window.clearTimeout(pointerResetRef.current);
      pointerResetRef.current = null;
    }
  };

  const clearAnimation = () => {
    if (rafRef.current !== null) {
      window.cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
    }
  };

  const clearAutoTimer = () => {
    if (autoTimerRef.current !== null) {
      window.clearTimeout(autoTimerRef.current);
      autoTimerRef.current = null;
    }
  };

  const triggerPointerTick = (strength: number) => {
    clearPointerReset();
    const kick = -Math.min(22, 7 + strength * 0.012);
    setPointerKick(kick);
    pointerResetRef.current = window.setTimeout(() => {
      setPointerKick(0);
      pointerResetRef.current = null;
    }, TICK_RESET_MS);
  };

  const stopAuto = () => {
    clearAutoTimer();
    setAutoArmed(false);
    setIsAuto(false);
    setRemainingRounds(0);
    isAutoRef.current = false;
    remainingRoundsRef.current = 0;
  };

  useEffect(() => {
    isAutoRef.current = isAuto;
  }, [isAuto]);

  useEffect(() => {
    remainingRoundsRef.current = remainingRounds;
  }, [remainingRounds]);

  useEffect(() => {
    return () => {
      clearAnimation();
      clearAutoTimer();
      clearPointerReset();
    };
  }, []);

  const completeRound = (landedIndex: number) => {
    const landedSegment = segments[landedIndex];
    const payout = Math.round(bet * landedSegment.multiplier);
    const profit = payout - bet;
    const won = payout > 0;

    setResultIndex(landedIndex);
    setTotalSpins((current) => current + 1);
    setSessionProfit((current) => current + profit);
    setTopHit((current) => Math.max(current, landedSegment.multiplier));

    if (won) {
      setWinningSpins((current) => current + 1);
      addBalance(payout);
      setStatusText(`${landedSegment.label} landed for ${payout.toLocaleString()}`);
      if (landedSegment.multiplier >= 5) {
        confetti({ particleCount: 110, spread: 82, origin: { y: 0.58 } });
      }
      logBetActivity({
        gameKey: 'wheel',
        wager: bet,
        payout,
        multiplier: landedSegment.multiplier,
        outcome: payout === bet ? 'push' : 'win',
        detail: `${risk} risk on ${landedSegment.label}`,
      });
    } else {
      setStatusText(`Dead wedge on ${activeConfig.title}`);
      logBetActivity({
        gameKey: 'wheel',
        wager: bet,
        payout: 0,
        multiplier: 0,
        outcome: 'loss',
        detail: `${risk} risk on ${landedSegment.label}`,
      });
    }

    setHistory((current) => [
      {
        multiplier: landedSegment.multiplier,
        payout,
        profit,
        won,
        risk,
        label: landedSegment.label,
        fill: landedSegment.fill,
        textColor: landedSegment.textColor,
      },
      ...current,
    ].slice(0, HISTORY_LIMIT));

    setIsSpinning(false);
    setSpinTempo(0);
    setGlowLevel(0.22);

    if (isAutoRef.current && remainingRoundsRef.current > 1) {
      const nextRemaining = remainingRoundsRef.current - 1;
      remainingRoundsRef.current = nextRemaining;
      setRemainingRounds(nextRemaining);
    } else if (isAutoRef.current) {
      stopAuto();
      setStatusText(`Auto finished on ${landedSegment.label}`);
    }
  };

  const spinOnce = () => {
    if (isSpinning) {
      return;
    }

    if (!subtractBalance(bet)) {
      stopAuto();
      setStatusText('Insufficient balance');
      return;
    }

    const currentRotation = rotationRef.current;
    const targetIndex = getWeightedIndex(segments);
    const targetRotation = getTargetRotation(currentRotation, targetIndex, segments.length, risk, isFast);
    const totalDistance = targetRotation - currentRotation;
    const duration = getDuration(risk, isFast);
    const startTime = performance.now();
    let previousTime = startTime;
    let previousRotation = currentRotation;
    let lastUiUpdate = startTime;

    clearAnimation();
    setIsSpinning(true);
    setResultIndex(null);
    setStatusText(`Spinning ${activeConfig.title}`);
    setGlowLevel(0.4);
    tickAccumulatorRef.current = 0;

    const step = (now: number) => {
      const elapsed = now - startTime;
      const deltaTime = Math.max(16, now - previousTime);
      const progress = Math.min(1, elapsed / duration);
      const nextRotation = currentRotation + totalDistance * getSpinProgress(progress);
      const deltaRotation = nextRotation - previousRotation;
      const speed = deltaRotation / (deltaTime / 1000);

      tickAccumulatorRef.current += Math.abs(deltaRotation);
      if (tickAccumulatorRef.current >= segmentAngle) {
        const ticks = Math.floor(tickAccumulatorRef.current / segmentAngle);
        tickAccumulatorRef.current -= ticks * segmentAngle;
        triggerPointerTick(speed);
      }

      rotationRef.current = nextRotation;
      setWheelRotation(nextRotation);

      if (now - lastUiUpdate > 70) {
        setSpinTempo(speed);
        setGlowLevel(Math.min(0.9, 0.2 + Math.min(1, speed / 1700) * 0.58));
        lastUiUpdate = now;
      }

      previousRotation = nextRotation;
      previousTime = now;

      if (progress < 1) {
        rafRef.current = window.requestAnimationFrame(step);
        return;
      }

      rotationRef.current = targetRotation;
      setWheelRotation(targetRotation);
      triggerPointerTick(420);
      clearAnimation();
      completeRound(targetIndex);
    };

    rafRef.current = window.requestAnimationFrame(step);
  };

  useEffect(() => {
    if (!isAuto || remainingRounds <= 0 || isSpinning) {
      return;
    }

    clearAutoTimer();
    autoTimerRef.current = window.setTimeout(spinOnce, isFast ? 120 : 420);
    return clearAutoTimer;
  }, [isAuto, remainingRounds, isSpinning, isFast, bet, risk]);

  const startAuto = () => {
    const rounds = Math.min(MAX_AUTO_SPINS, Math.max(1, autoRounds));
    setAutoArmed(true);
    setAutoRounds(rounds);
    setRemainingRounds(rounds);
    remainingRoundsRef.current = rounds;
    setIsAuto(true);
    isAutoRef.current = true;
    setStatusText(`Auto armed for ${rounds} spins`);
  };

  return (
    <div className="mx-auto flex max-w-7xl flex-col gap-6 p-4">
      <div className="relative overflow-hidden rounded-[34px] border border-[#7e5a21]/55 bg-[radial-gradient(circle_at_top,rgba(36,58,102,0.92),rgba(11,14,22,0.98)_44%,rgba(4,6,10,1)_100%)] p-6 shadow-[0_0_80px_rgba(0,0,0,0.45)] md:p-8">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_28%,rgba(255,231,150,0.1),transparent_22%),radial-gradient(circle_at_50%_62%,rgba(75,150,255,0.12),transparent_30%),linear-gradient(180deg,rgba(255,255,255,0.04),transparent)]" />
        <div className="absolute inset-0 opacity-70" style={{ backgroundImage: 'radial-gradient(circle at 50% 50%, rgba(76,138,255,0.18) 0 12%, transparent 12.5%), radial-gradient(circle at 50% 50%, rgba(255,213,90,0.09) 0 29%, transparent 29.5%), radial-gradient(circle at 50% 50%, rgba(255,255,255,0.03) 0 43%, transparent 43.5%)' }} />
        <div
          className="absolute inset-0 transition-opacity duration-150"
          style={{
            opacity: glowLevel,
            background: `radial-gradient(circle at center, ${activeConfig.accent}33 0%, transparent 55%)`,
          }}
        />

        <div className="relative z-10">
          <div className="flex flex-col items-center justify-center">
            <div className="mb-5 text-center">
              <div className="bg-[linear-gradient(180deg,#fff7c5_0%,#d8a844_52%,#8d6025_100%)] bg-clip-text text-5xl font-black tracking-[0.08em] text-transparent">
                SUPER WHEEL
              </div>
              <div className="mt-2 text-xs font-black uppercase tracking-[0.35em] text-[#9fc7ff]">{activeConfig.subtitle}</div>
            </div>
            <div className="relative h-[390px] w-[390px] md:h-[460px] md:w-[460px]">
              <motion.div
                animate={{ y: pointerKick, rotate: pointerKick === 0 ? 0 : -8 }}
                transition={{ duration: 0.08, ease: 'easeOut' }}
                className="absolute left-1/2 top-0 z-30 -translate-x-1/2"
              >
                <div className="flex h-[78px] w-[52px] items-start justify-center rounded-b-[26px] border border-[#f4d984]/70 bg-[linear-gradient(180deg,#fff8cf_0%,#d7ab49_55%,#8f6427_100%)] shadow-[0_12px_42px_rgba(255,219,122,0.22)]">
                  <div className="mt-2 h-[38px] w-[4px] rounded-full bg-black/20" />
                </div>
              </motion.div>

              <div className="absolute left-1/2 top-[36px] z-20 -translate-x-1/2">
                <div className="relative h-[150px] w-[92px]">
                  <div
                    className="absolute inset-x-0 top-0 h-full opacity-80"
                    style={{
                      background: 'linear-gradient(180deg, rgba(255,231,167,0.34) 0%, rgba(255,255,255,0.1) 40%, rgba(255,255,255,0) 100%)',
                      clipPath: 'polygon(50% 0%, 100% 100%, 0% 100%)',
                    }}
                  />
                  <div className="absolute left-1/2 top-0 h-full w-[3px] -translate-x-1/2 rounded-full bg-[#ffe39b]/85 shadow-[0_0_18px_rgba(255,227,155,0.3)]" />
                </div>
              </div>

              <div
                className="absolute inset-0"
                style={{
                  transform: `rotate(${wheelRotation}deg)`,
                  filter: 'drop-shadow(0 24px 78px rgba(0,0,0,0.62))',
                }}
              >
                <svg viewBox="0 0 400 400" className="h-full w-full">
                  <defs>
                    <radialGradient id="wheelCore" cx="50%" cy="50%" r="60%">
                      <stop offset="0%" stopColor="#1c2940" />
                      <stop offset="58%" stopColor="#0e1626" />
                      <stop offset="100%" stopColor="#030507" />
                    </radialGradient>
                  </defs>

                  <circle cx="200" cy="200" r="194" fill="#060a12" stroke="#f0d58d" strokeWidth="10" />
                  <circle cx="200" cy="200" r="186" fill="none" stroke="#38588f" strokeWidth="6" opacity="0.8" />
                  {segments.map((segment, index) => {
                    const start = index * segmentAngle;
                    const end = start + segmentAngle;
                    const centerAngle = getSegmentCenter(index, segmentAngle);
                    const labelPoint = polarToCartesian(200, 200, LABEL_RADIUS, centerAngle);
                    const isActive = resultIndex === index;
                    const displayFill = getDisplayFill(segment, index);
                    const displayAccent = getDisplayAccent(segment, index);

                    return (
                      <g key={`${segment.label}-${index}`}>
                        <path
                          d={describeSegmentPath(200, 200, WHEEL_RADIUS, INNER_RADIUS, start, end)}
                          fill={displayFill}
                          stroke={isActive ? '#fff5ca' : displayAccent}
                          strokeWidth={isActive ? '4' : '2'}
                        />
                        <path
                          d={describeSegmentPath(200, 200, WHEEL_RADIUS - 10, WHEEL_RADIUS - 24, start + 0.9, end - 0.9)}
                          fill="#ffffff"
                          opacity={segment.multiplier === 0 ? 0.04 : isActive ? 0.18 : 0.08}
                        />
                        <text
                          x={labelPoint.x}
                          y={labelPoint.y}
                          fill={segment.multiplier === 0 ? '#d7e3ff' : '#08111e'}
                          fontSize={segment.multiplier >= 10 ? '14' : '15'}
                          fontWeight="900"
                          textAnchor="middle"
                          dominantBaseline="middle"
                          transform={`rotate(${centerAngle} ${labelPoint.x} ${labelPoint.y})`}
                        >
                          {segment.label}
                        </text>
                      </g>
                    );
                  })}

                  <circle cx="200" cy="200" r="56" fill="url(#wheelCore)" stroke="#f0d58d" strokeWidth="8" />
                  <circle cx="200" cy="200" r="31" fill="#05070a" stroke="#4aa9ff" strokeWidth="3" />
                  <circle cx="200" cy="200" r="8" fill="#f0d58d" />
                </svg>
              </div>
            </div>

            <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
              <div className="rounded-full border border-[#d9bb63]/45 bg-[linear-gradient(180deg,rgba(26,20,11,0.95),rgba(10,9,8,0.95))] px-5 py-3 text-xs font-black uppercase tracking-[0.18em] text-[#fff2c2]">
                {resultIndex === null ? statusText : `Result: ${segments[resultIndex].label}`}
              </div>
              <div className="rounded-full border border-[#39506e] bg-[#0a111d] px-5 py-3 text-xs font-black uppercase tracking-[0.18em] text-[#b8c9e9]">
                Speed {Math.round(spinTempo).toLocaleString()} deg/s
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-[1.5fr_1fr]">
        <div className="rounded-[30px] border border-[#7e5a21]/55 bg-[linear-gradient(180deg,rgba(17,19,27,0.98),rgba(11,13,19,0.96))] p-5 shadow-[0_0_40px_rgba(0,0,0,0.35)]">
          <div className="flex flex-col gap-4 md:flex-row md:items-end">
            <div className="space-y-3">
              <div>
                <div className="text-[10px] font-black uppercase tracking-[0.24em] text-[#d9bb63]">Control Deck</div>
                <div className="mt-2 text-sm leading-relaxed text-white/45">{activeConfig.description}</div>
              </div>
              <div>
                <label className="block text-xs uppercase tracking-widest text-white/35">Bet Amount</label>
                <input
                  type="number"
                  value={bet}
                  min="0.01"
                  step="0.01"
                  onChange={(e) => setBet(Math.max(1, Number(e.target.value) || 1))}
                  disabled={isSpinning || isAuto}
                  className="mt-2 w-full rounded-2xl border border-[#3a4760] bg-[#05070c] px-4 py-3 text-white focus:border-[#d9bb63]/60 focus:outline-none"
                />
                <div className="mt-2 text-[9px] text-white/25">Min: $0.01</div>
                <div className="mt-2 grid grid-cols-2 gap-2">
                  <button onClick={() => setBet((current) => Math.max(1, Math.min(Math.floor(balance), current * 2)))} disabled={isSpinning || isAuto || balance < 1} className="rounded-xl bg-[#111826] px-3 py-2 text-[10px] font-black uppercase tracking-[0.18em] text-[#c7d6f7] disabled:opacity-40">x2</button>
                  <button onClick={() => setBet(Math.max(1, Math.floor(balance)))} disabled={isSpinning || isAuto || balance < 1} className="rounded-xl bg-[#111826] px-3 py-2 text-[10px] font-black uppercase tracking-[0.18em] text-[#c7d6f7] disabled:opacity-40">Max</button>
                </div>
              </div>
            </div>

            <div className="space-y-3">
              <div>
                <div className="mb-2 text-xs uppercase tracking-widest text-white/35">Risk</div>
                <div className="grid grid-cols-2 gap-2">
                  {RISK_ORDER.map((tier) => (
                    <button
                      key={tier}
                      onClick={() => setRisk(tier)}
                      disabled={isSpinning || isAuto}
                      className={cn(
                        'rounded-xl px-3 py-3 text-[10px] font-black uppercase tracking-[0.18em] transition-all',
                        risk === tier ? 'bg-[linear-gradient(180deg,#ffe899,#d7a53f)] text-[#1c1304]' : 'bg-[#111826] text-white/55 hover:text-white'
                      )}
                    >
                      {tier}
                    </button>
                  ))}
                </div>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <button onClick={() => setIsFast((current) => !current)} className={cn('flex items-center justify-center gap-2 rounded-xl border px-3 py-3 text-[10px] font-black uppercase tracking-[0.18em]', isFast ? 'border-[#d9bb63] bg-[#d9bb63]/15 text-[#ffe9a6]' : 'border-transparent bg-[#111826] text-white/35')}>
                  <Zap size={14} fill={isFast ? 'currentColor' : 'none'} />
                  Fast
                </button>
                <button
                  onClick={() => {
                    if (isAuto) {
                      stopAuto();
                      setStatusText('Auto stopped');
                      return;
                    }
                    setAutoArmed((current) => !current);
                  }}
                  className={cn('flex items-center justify-center gap-2 rounded-xl border px-3 py-3 text-[10px] font-black uppercase tracking-[0.18em]', autoArmed || isAuto ? 'border-[#59d8ff]/45 bg-[#59d8ff]/15 text-[#9fe9ff]' : 'border-transparent bg-[#111826] text-white/35')}
                >
                  <RotateCcw size={14} className={isAuto ? 'animate-spin' : ''} />
                  Auto
                </button>
              </div>
            </div>

            <div className="space-y-3">
              <button
                onClick={isAuto ? stopAuto : autoArmed ? startAuto : spinOnce}
                disabled={(balance < bet && !isAuto) || isSpinning}
                className={cn('flex w-full min-w-[180px] items-center justify-center gap-3 rounded-[24px] py-5 text-sm font-black uppercase tracking-[0.18em] disabled:opacity-50', isAuto ? 'bg-red-500 text-white' : 'bg-[linear-gradient(180deg,#fff6c1,#ddb04c)] text-[#1a1304]')}
              >
                {isAuto ? <><Timer size={18} />Stop Auto</> : <><Play size={18} fill="currentColor" />{autoArmed ? 'Start Auto' : 'Spin Wheel'}</>}
              </button>
              {(autoArmed || isAuto) && (
                <div className="rounded-2xl border border-[#2d3d57] bg-[#0a0f18] p-4">
                  <div className="flex items-center justify-between text-[10px] font-black uppercase tracking-[0.18em] text-white/35">
                    <span>Auto Queue</span>
                    <span>{isAuto ? `${remainingRounds} left` : `${autoRounds} queued`}</span>
                  </div>
                  <input
                    type="number"
                    min={1}
                    max={MAX_AUTO_SPINS}
                    value={autoRounds}
                    disabled={isAuto}
                    onChange={(e) => setAutoRounds(Math.min(MAX_AUTO_SPINS, Math.max(1, Number(e.target.value) || 1)))}
                    className="mt-3 w-full rounded-xl border border-[#364764] bg-[#05070c] px-4 py-3 text-white focus:border-[#d9bb63]/60 focus:outline-none"
                  />
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="space-y-3">
          <div className="rounded-3xl border border-[#7e5a21]/45 bg-[linear-gradient(180deg,rgba(21,17,12,0.88),rgba(11,10,10,0.9))] p-5">
            <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.18em] text-[#d9bb63]/75">
              <Target size={12} />
              <span>Dealer Feed</span>
            </div>
            <div className="mt-3 text-xl font-black text-[#fff1bf]">{statusText}</div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="rounded-3xl border border-[#38506f] bg-[#09111c] p-4">
              <div className="text-[10px] font-black uppercase tracking-[0.18em] text-[#9cc1ff]/55">Profit</div>
              <div className={cn('mt-2 text-xl font-black', sessionProfit >= 0 ? 'text-[#00FF88]' : 'text-red-400')}>
                {sessionProfit >= 0 ? '+' : ''}{sessionProfit.toLocaleString()}
              </div>
            </div>
            <div className="rounded-3xl border border-[#7e5a21]/45 bg-[linear-gradient(180deg,rgba(21,17,12,0.88),rgba(11,10,10,0.9))] p-4">
              <div className="text-[10px] font-black uppercase tracking-[0.18em] text-[#d9bb63]/65">Top Hit</div>
              <div className="mt-2 text-xl font-black text-[#fff1bf]">{topHit ? formatMultiplier(topHit) : '--'}</div>
            </div>
            <div className="rounded-3xl border border-[#38506f] bg-[#09111c] p-4">
              <div className="text-[10px] font-black uppercase tracking-[0.18em] text-[#9cc1ff]/55">Win Rate</div>
              <div className="mt-2 text-xl font-black text-white">{(sessionHitRate * 100).toFixed(0)}%</div>
            </div>
            <div className="rounded-3xl border border-[#7e5a21]/45 bg-[linear-gradient(180deg,rgba(21,17,12,0.88),rgba(11,10,10,0.9))] p-4">
              <div className="text-[10px] font-black uppercase tracking-[0.18em] text-[#d9bb63]/65">Expected</div>
              <div className="mt-2 text-xl font-black text-[#fff1bf]">{expectedReturn.toFixed(2)}x</div>
            </div>
          </div>

          <div className="rounded-3xl border border-[#2d3d57] bg-[#0a0f18] p-4">
            <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.18em] text-white/35">
              <Gauge size={12} />
              <span>Odds</span>
            </div>
            <div className="mt-2 flex flex-wrap gap-2">
              {odds.map((entry) => (
                <div key={entry.label} className="flex items-center gap-1 rounded-xl px-3 py-1.5 text-[11px] font-black" style={{ backgroundColor: entry.fill, color: entry.textColor }}>
                  <span>{entry.label}</span>
                  <span className="opacity-70">{(entry.probability * 100).toFixed(0)}%</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
