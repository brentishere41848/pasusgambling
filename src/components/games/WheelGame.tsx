import React, { useEffect, useMemo, useRef, useState } from 'react';
import { motion } from 'motion/react';
import { Flame, Gauge, Play, RotateCcw, Target, Timer, Trophy, Zap } from 'lucide-react';
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
  const [currentPayout, setCurrentPayout] = useState(0);
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

    setCurrentPayout(payout);
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
    setCurrentPayout(0);
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
    <div className="mx-auto flex max-w-7xl flex-col gap-6 p-4 lg:grid lg:grid-cols-[360px_1fr]">
      <div className="rounded-[28px] border border-white/10 bg-[#12161d] p-6">
        <div>
          <div className="text-[10px] font-black uppercase tracking-[0.24em] text-[#00FF88]">Wheel</div>
          <div className="mt-2 text-2xl font-black italic tracking-tight">{activeConfig.title}</div>
          <div className="mt-2 text-sm leading-relaxed text-white/45">{activeConfig.description}</div>
        </div>

        <div className="mt-5 space-y-2">
          <label className="block text-xs uppercase tracking-widest text-white/35">Bet Amount</label>
          <input
            type="number"
            value={bet}
            min={1}
            onChange={(e) => setBet(Math.max(1, Number(e.target.value) || 1))}
            disabled={isSpinning || isAuto}
            className="w-full rounded-2xl border border-white/10 bg-black/35 px-4 py-3 text-white focus:border-[#00FF88]/50 focus:outline-none"
          />
          <div className="grid grid-cols-2 gap-2">
            <button
              onClick={() => setBet((current) => Math.max(1, Math.min(Math.floor(balance), current * 2)))}
              disabled={isSpinning || isAuto || balance < 1}
              className="rounded-xl bg-white/5 px-3 py-2 text-[10px] font-black uppercase tracking-[0.18em] text-white/60 disabled:opacity-40"
            >
              x2
            </button>
            <button
              onClick={() => setBet(Math.max(1, Math.floor(balance)))}
              disabled={isSpinning || isAuto || balance < 1}
              className="rounded-xl bg-white/5 px-3 py-2 text-[10px] font-black uppercase tracking-[0.18em] text-white/60 disabled:opacity-40"
            >
              Max
            </button>
          </div>
        </div>

        <div className="mt-5">
          <div className="mb-2 text-xs uppercase tracking-widest text-white/35">Risk</div>
          <div className="grid grid-cols-2 gap-2">
            {RISK_ORDER.map((tier) => (
              <button
                key={tier}
                onClick={() => setRisk(tier)}
                disabled={isSpinning || isAuto}
                className={cn(
                  'rounded-xl px-3 py-3 text-[10px] font-black uppercase tracking-[0.18em] transition-all',
                  risk === tier ? 'bg-[#00FF88] text-black' : 'bg-white/5 text-white/50 hover:text-white'
                )}
              >
                {tier}
              </button>
            ))}
          </div>
          <div className="mt-2 text-[11px] text-white/30">{activeConfig.subtitle}</div>
        </div>

        <div className="mt-5 grid grid-cols-2 gap-2">
          <button
            onClick={() => setIsFast((current) => !current)}
            className={cn(
              'flex items-center justify-center gap-2 rounded-xl border px-3 py-3 text-[10px] font-black uppercase tracking-[0.18em]',
              isFast ? 'border-yellow-500/50 bg-yellow-500/15 text-yellow-300' : 'border-transparent bg-white/5 text-white/35'
            )}
          >
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
            className={cn(
              'flex items-center justify-center gap-2 rounded-xl border px-3 py-3 text-[10px] font-black uppercase tracking-[0.18em]',
              autoArmed || isAuto ? 'border-[#00FF88]/45 bg-[#00FF88]/15 text-[#00FF88]' : 'border-transparent bg-white/5 text-white/35'
            )}
          >
            <RotateCcw size={14} className={isAuto ? 'animate-spin' : ''} />
            Auto
          </button>
        </div>

        {(autoArmed || isAuto) && (
          <div className="mt-4 rounded-2xl border border-white/5 bg-black/25 p-4">
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
              className="mt-3 w-full rounded-xl border border-white/10 bg-black/35 px-4 py-3 text-white focus:border-[#00FF88]/50 focus:outline-none"
            />
            <div className="mt-2 text-[11px] text-white/30">Up to {MAX_AUTO_SPINS} queued spins.</div>
          </div>
        )}

        <button
          onClick={isAuto ? stopAuto : autoArmed ? startAuto : spinOnce}
          disabled={(balance < bet && !isAuto) || isSpinning}
          className={cn(
            'mt-5 flex w-full items-center justify-center gap-3 rounded-2xl py-4 text-sm font-black uppercase tracking-[0.18em] disabled:opacity-50',
            isAuto ? 'bg-red-500 text-white' : autoArmed ? 'bg-white text-black' : 'bg-[#00FF88] text-black'
          )}
        >
          {isAuto ? (
            <>
              <Timer size={18} />
              Stop Auto
            </>
          ) : (
            <>
              <Play size={18} fill="currentColor" />
              {autoArmed ? 'Start Auto' : 'Spin Wheel'}
            </>
          )}
        </button>

        <div className="mt-5 rounded-2xl border border-white/5 bg-black/25 p-4">
          <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.18em] text-white/35">
            <Gauge size={12} />
            <span>Math</span>
          </div>
          <div className="mt-3 grid grid-cols-2 gap-3 text-[11px]">
            <div className="rounded-xl bg-white/[0.03] px-3 py-2">
              <div className="text-[10px] uppercase tracking-[0.16em] text-white/30">Hit Rate</div>
              <div className="mt-1 font-black text-white">{(hitRate * 100).toFixed(1)}%</div>
            </div>
            <div className="rounded-xl bg-white/[0.03] px-3 py-2">
              <div className="text-[10px] uppercase tracking-[0.16em] text-white/30">Expected</div>
              <div className="mt-1 font-black text-white">{expectedReturn.toFixed(2)}x</div>
            </div>
          </div>
          <div className="mt-3 grid grid-cols-2 gap-2">
            {odds.map((entry) => (
              <div
                key={entry.label}
                className="flex items-center justify-between rounded-xl px-3 py-2 text-[11px] font-black"
                style={{ backgroundColor: entry.fill, color: entry.textColor }}
              >
                <span>{entry.label}</span>
                <span>{(entry.probability * 100).toFixed(1)}%</span>
              </div>
            ))}
          </div>
        </div>

        <div className="mt-5 rounded-2xl border border-white/5 bg-black/25 p-4">
          <div className="flex items-center justify-between text-[10px] font-black uppercase tracking-[0.18em] text-white/35">
            <span>Recent Results</span>
            <span>{history.length}</span>
          </div>
          <div className="mt-3 flex flex-wrap gap-2">
            {history.length ? (
              history.map((entry, index) => (
                <div
                  key={`${entry.risk}-${entry.label}-${index}`}
                  className="rounded-xl px-3 py-2 text-[11px] font-black"
                  style={{ backgroundColor: entry.fill, color: entry.textColor }}
                >
                  {entry.label}
                </div>
              ))
            ) : (
              <div className="text-xs text-white/35">No spins yet.</div>
            )}
          </div>
        </div>
      </div>

      <div className="relative overflow-hidden rounded-[28px] border border-white/10 bg-[#0f1319] p-6 md:p-8">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(0,255,136,0.08),transparent_24%),radial-gradient(circle_at_bottom,rgba(79,124,255,0.08),transparent_26%),linear-gradient(180deg,rgba(255,255,255,0.03),transparent)]" />
        <div
          className="absolute inset-0 transition-opacity duration-150"
          style={{
            opacity: glowLevel,
            background: `radial-gradient(circle at center, ${activeConfig.accent}33 0%, transparent 55%)`,
          }}
        />

        <div className="relative z-10 grid gap-8 xl:grid-cols-[1fr_300px]">
          <div className="flex flex-col items-center justify-center">
            <div className="relative h-[390px] w-[390px] md:h-[460px] md:w-[460px]">
              <motion.div
                animate={{ y: pointerKick, rotate: pointerKick === 0 ? 0 : -8 }}
                transition={{ duration: 0.08, ease: 'easeOut' }}
                className="absolute left-1/2 top-0 z-30 -translate-x-1/2"
              >
                <div className="flex h-[72px] w-[48px] items-start justify-center rounded-b-[24px] bg-white shadow-[0_12px_42px_rgba(255,255,255,0.18)]">
                  <div className="mt-2 h-[34px] w-[4px] rounded-full bg-black/20" />
                </div>
              </motion.div>

              <div className="absolute left-1/2 top-[36px] z-20 -translate-x-1/2">
                <div className="relative h-[150px] w-[92px]">
                  <div
                    className="absolute inset-x-0 top-0 h-full opacity-70"
                    style={{
                      background: 'linear-gradient(180deg, rgba(255,255,255,0.22) 0%, rgba(255,255,255,0.06) 40%, rgba(255,255,255,0) 100%)',
                      clipPath: 'polygon(50% 0%, 100% 100%, 0% 100%)',
                    }}
                  />
                  <div className="absolute left-1/2 top-0 h-full w-[3px] -translate-x-1/2 rounded-full bg-white/70 shadow-[0_0_18px_rgba(255,255,255,0.3)]" />
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
                      <stop offset="0%" stopColor="#121822" />
                      <stop offset="100%" stopColor="#04070a" />
                    </radialGradient>
                  </defs>

                  <circle cx="200" cy="200" r="194" fill="#080b10" stroke="#212934" strokeWidth="10" />
                  {segments.map((segment, index) => {
                    const start = index * segmentAngle;
                    const end = start + segmentAngle;
                    const centerAngle = getSegmentCenter(index, segmentAngle);
                    const labelPoint = polarToCartesian(200, 200, LABEL_RADIUS, centerAngle);
                    const isActive = resultIndex === index;

                    return (
                      <g key={`${segment.label}-${index}`}>
                        <path
                          d={describeSegmentPath(200, 200, WHEEL_RADIUS, INNER_RADIUS, start, end)}
                          fill={segment.fill}
                          stroke={isActive ? '#ffffff' : segment.accent}
                          strokeWidth={isActive ? '4' : '2'}
                        />
                        <path
                          d={describeSegmentPath(200, 200, WHEEL_RADIUS - 10, WHEEL_RADIUS - 24, start + 0.9, end - 0.9)}
                          fill={segment.accent}
                          opacity={isActive ? 0.24 : 0.12}
                        />
                        <text
                          x={labelPoint.x}
                          y={labelPoint.y}
                          fill={segment.textColor}
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

                  <circle cx="200" cy="200" r="56" fill="url(#wheelCore)" stroke="#232a34" strokeWidth="8" />
                  <circle cx="200" cy="200" r="31" fill="#05070a" stroke={activeConfig.accent} strokeWidth="3" />
                  <circle cx="200" cy="200" r="8" fill={activeConfig.accent} />
                </svg>
              </div>
            </div>

            <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
              <div className="rounded-full border border-white/10 bg-black/35 px-5 py-3 text-xs font-black uppercase tracking-[0.18em] text-white/80">
                {resultIndex === null ? statusText : `Result: ${segments[resultIndex].label}`}
              </div>
              <div className="rounded-full border border-white/10 bg-black/35 px-5 py-3 text-xs font-black uppercase tracking-[0.18em] text-white/60">
                Speed {Math.round(spinTempo).toLocaleString()} deg/s
              </div>
            </div>
          </div>

          <div className="flex flex-col gap-4">
            <div className="rounded-3xl border border-white/10 bg-black/30 p-5">
              <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.18em] text-white/30">
                <Target size={12} />
                <span>Spin Status</span>
              </div>
              <div className="mt-3 text-xl font-black">{statusText}</div>
              <div className="mt-2 text-sm text-white/45">{activeConfig.subtitle}</div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="rounded-3xl border border-white/10 bg-black/30 p-5">
                <div className="text-[10px] font-black uppercase tracking-[0.18em] text-white/25">Last Payout</div>
                <div className="mt-3 text-2xl font-black text-white">{currentPayout.toLocaleString()}</div>
              </div>
              <div className="rounded-3xl border border-white/10 bg-black/30 p-5">
                <div className="text-[10px] font-black uppercase tracking-[0.18em] text-white/25">Top Hit</div>
                <div className="mt-3 text-2xl font-black">{topHit ? formatMultiplier(topHit) : 'Waiting'}</div>
              </div>
              <div className="rounded-3xl border border-white/10 bg-black/30 p-5">
                <div className="text-[10px] font-black uppercase tracking-[0.18em] text-white/25">Session Profit</div>
                <div className={cn('mt-3 text-2xl font-black', sessionProfit >= 0 ? 'text-[#00FF88]' : 'text-red-400')}>
                  {sessionProfit >= 0 ? '+' : ''}
                  {sessionProfit.toLocaleString()}
                </div>
              </div>
              <div className="rounded-3xl border border-white/10 bg-black/30 p-5">
                <div className="text-[10px] font-black uppercase tracking-[0.18em] text-white/25">Win Rate</div>
                <div className="mt-3 text-2xl font-black">{(sessionHitRate * 100).toFixed(0)}%</div>
              </div>
            </div>

            <div className="rounded-3xl border border-white/10 bg-black/30 p-5">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.18em] text-white/30">
                  <Flame size={12} />
                  <span>Result Strip</span>
                </div>
                <div className="text-[11px] text-white/35">{segments.length} wedges</div>
              </div>
              <div className="mt-4 grid grid-cols-4 gap-2">
                {segments.map((segment, index) => (
                  <div
                    key={`${segment.label}-${index}-map`}
                    className="rounded-2xl border px-2 py-3 text-center"
                    style={{
                      borderColor: resultIndex === index ? '#ffffff' : 'rgba(255,255,255,0.06)',
                      backgroundColor: segment.fill,
                      color: segment.textColor,
                    }}
                  >
                    <div className="text-xs font-black">{segment.label}</div>
                    <div className="mt-1 text-[10px] uppercase tracking-[0.14em] opacity-70">W{segment.weight}</div>
                  </div>
                ))}
              </div>
            </div>

            <div className="rounded-3xl border border-white/10 bg-black/30 p-5">
              <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.18em] text-white/30">
                <Trophy size={12} />
                <span>Last Spin</span>
              </div>
              {lastEntry ? (
                <div className="mt-4 rounded-2xl border border-white/10 bg-white/[0.03] p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="text-[10px] uppercase tracking-[0.16em] text-white/30">Landing</div>
                      <div className="mt-1 text-2xl font-black">{lastEntry.label}</div>
                    </div>
                    <div
                      className="rounded-2xl px-3 py-2 text-sm font-black"
                      style={{ backgroundColor: lastEntry.fill, color: lastEntry.textColor }}
                    >
                      {lastEntry.risk}
                    </div>
                  </div>
                  <div className="mt-4 grid grid-cols-2 gap-3 text-sm">
                    <div>
                      <div className="text-[10px] uppercase tracking-[0.16em] text-white/30">Payout</div>
                      <div className="mt-1 font-black text-white">{lastEntry.payout.toLocaleString()}</div>
                    </div>
                    <div>
                      <div className="text-[10px] uppercase tracking-[0.16em] text-white/30">Profit</div>
                      <div className={cn('mt-1 font-black', lastEntry.profit >= 0 ? 'text-[#00FF88]' : 'text-red-400')}>
                        {lastEntry.profit >= 0 ? '+' : ''}
                        {lastEntry.profit.toLocaleString()}
                      </div>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="mt-4 text-sm text-white/35">No spin logged yet.</div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
