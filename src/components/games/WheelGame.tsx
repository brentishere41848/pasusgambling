import React, { useEffect, useMemo, useRef, useState } from 'react';
import { motion, useAnimation } from 'motion/react';
import { useBalance } from '../../context/BalanceContext';
import { cn } from '../../lib/utils';
import { Gauge, Play, RotateCcw, Timer, Zap } from 'lucide-react';
import confetti from 'canvas-confetti';
import { logBetActivity } from '../../lib/activity';

type RiskTier = 'low' | 'medium' | 'high' | 'daredevil';

type WheelSegment = {
  multiplier: number;
  label: string;
  fill: string;
  accent: string;
  textColor: string;
  weight: number;
};

type SpinEntry = {
  multiplier: number;
  profit: number;
  won: boolean;
  risk: RiskTier;
  label: string;
  fill: string;
  textColor: string;
};

const WHEEL_RADIUS = 178;
const INNER_RADIUS = 48;
const LABEL_RADIUS = 128;
const MAX_AUTO_SPINS = 100;
const HISTORY_LIMIT = 12;

const WHEEL_CONFIG: Record<
  RiskTier,
  {
    title: string;
    subtitle: string;
    description: string;
    segments: WheelSegment[];
  }
> = {
  low: {
    title: 'Low Risk',
    subtitle: 'Frequent returns with softer peaks',
    description: 'Designed for steady spins. More recovery wedges, fewer dead spots, lower ceiling.',
    segments: [
      { multiplier: 1.2, label: '1.2x', fill: '#00FF88', accent: '#7effc4', textColor: '#05120c', weight: 4 },
      { multiplier: 0, label: '0x', fill: '#171b22', accent: '#323946', textColor: '#dce6f2', weight: 2 },
      { multiplier: 1.5, label: '1.5x', fill: '#44d4ff', accent: '#9be8ff', textColor: '#06131a', weight: 3 },
      { multiplier: 0, label: '0x', fill: '#171b22', accent: '#323946', textColor: '#dce6f2', weight: 2 },
      { multiplier: 1.2, label: '1.2x', fill: '#00FF88', accent: '#7effc4', textColor: '#05120c', weight: 4 },
      { multiplier: 2, label: '2x', fill: '#4f7cff', accent: '#b1c3ff', textColor: '#071120', weight: 2 },
      { multiplier: 1.2, label: '1.2x', fill: '#00FF88', accent: '#7effc4', textColor: '#05120c', weight: 4 },
      { multiplier: 0, label: '0x', fill: '#171b22', accent: '#323946', textColor: '#dce6f2', weight: 2 },
      { multiplier: 1.5, label: '1.5x', fill: '#44d4ff', accent: '#9be8ff', textColor: '#06131a', weight: 3 },
      { multiplier: 0, label: '0x', fill: '#171b22', accent: '#323946', textColor: '#dce6f2', weight: 2 },
      { multiplier: 1.2, label: '1.2x', fill: '#00FF88', accent: '#7effc4', textColor: '#05120c', weight: 4 },
      { multiplier: 3, label: '3x', fill: '#fbbf24', accent: '#fde68a', textColor: '#1a1203', weight: 1 },
    ],
  },
  medium: {
    title: 'Medium Risk',
    subtitle: 'Balanced dead zones and spike wedges',
    description: 'A classic wheel profile. More blanks, stronger jumps, and a noticeable top-end prize.',
    segments: [
      { multiplier: 0, label: '0x', fill: '#171b22', accent: '#323946', textColor: '#dce6f2', weight: 5 },
      { multiplier: 1.5, label: '1.5x', fill: '#00FF88', accent: '#7effc4', textColor: '#05120c', weight: 3 },
      { multiplier: 0, label: '0x', fill: '#171b22', accent: '#323946', textColor: '#dce6f2', weight: 5 },
      { multiplier: 2, label: '2x', fill: '#57c7ff', accent: '#b8ecff', textColor: '#07121a', weight: 2 },
      { multiplier: 0, label: '0x', fill: '#171b22', accent: '#323946', textColor: '#dce6f2', weight: 5 },
      { multiplier: 1.5, label: '1.5x', fill: '#00FF88', accent: '#7effc4', textColor: '#05120c', weight: 3 },
      { multiplier: 0, label: '0x', fill: '#171b22', accent: '#323946', textColor: '#dce6f2', weight: 5 },
      { multiplier: 3, label: '3x', fill: '#7c5cff', accent: '#d6cbff', textColor: '#100922', weight: 1 },
      { multiplier: 0, label: '0x', fill: '#171b22', accent: '#323946', textColor: '#dce6f2', weight: 5 },
      { multiplier: 2, label: '2x', fill: '#57c7ff', accent: '#b8ecff', textColor: '#07121a', weight: 2 },
      { multiplier: 0, label: '0x', fill: '#171b22', accent: '#323946', textColor: '#dce6f2', weight: 5 },
      { multiplier: 5, label: '5x', fill: '#f97316', accent: '#fdba74', textColor: '#180d04', weight: 1 },
    ],
  },
  high: {
    title: 'High Risk',
    subtitle: 'Four-tier wheel with sharper upside',
    description: 'A stripped-down high-risk table with only four payout bands: dead wedges, 2x, 5x, and 10x.',
    segments: [
      { multiplier: 0, label: '0x', fill: '#171b22', accent: '#323946', textColor: '#dce6f2', weight: 8 },
      { multiplier: 2, label: '2x', fill: '#00FF88', accent: '#7effc4', textColor: '#05120c', weight: 2 },
      { multiplier: 0, label: '0x', fill: '#171b22', accent: '#323946', textColor: '#dce6f2', weight: 8 },
      { multiplier: 5, label: '5x', fill: '#4f7cff', accent: '#b1c3ff', textColor: '#071120', weight: 1 },
      { multiplier: 0, label: '0x', fill: '#171b22', accent: '#323946', textColor: '#dce6f2', weight: 8 },
      { multiplier: 5, label: '5x', fill: '#57c7ff', accent: '#b8ecff', textColor: '#07121a', weight: 1 },
      { multiplier: 0, label: '0x', fill: '#171b22', accent: '#323946', textColor: '#dce6f2', weight: 8 },
      { multiplier: 10, label: '10x', fill: '#f97316', accent: '#fdba74', textColor: '#180d04', weight: 1 },
      { multiplier: 0, label: '0x', fill: '#171b22', accent: '#323946', textColor: '#dce6f2', weight: 8 },
      { multiplier: 2, label: '2x', fill: '#00FF88', accent: '#7effc4', textColor: '#05120c', weight: 2 },
      { multiplier: 0, label: '0x', fill: '#171b22', accent: '#323946', textColor: '#dce6f2', weight: 8 },
      { multiplier: 0, label: '0x', fill: '#171b22', accent: '#323946', textColor: '#dce6f2', weight: 8 },
    ],
  },
  daredevil: {
    title: 'Daredevil',
    subtitle: 'Mostly dead space, two brutal top hits',
    description: 'This tier only carries two premium multipliers. You miss often, but the rare hits are much larger.',
    segments: [
      { multiplier: 0, label: '0x', fill: '#171b22', accent: '#323946', textColor: '#dce6f2', weight: 12 },
      { multiplier: 0, label: '0x', fill: '#171b22', accent: '#323946', textColor: '#dce6f2', weight: 12 },
      { multiplier: 0, label: '0x', fill: '#171b22', accent: '#323946', textColor: '#dce6f2', weight: 12 },
      { multiplier: 15, label: '15x', fill: '#f97316', accent: '#fdba74', textColor: '#180d04', weight: 1 },
      { multiplier: 0, label: '0x', fill: '#171b22', accent: '#323946', textColor: '#dce6f2', weight: 12 },
      { multiplier: 0, label: '0x', fill: '#171b22', accent: '#323946', textColor: '#dce6f2', weight: 12 },
      { multiplier: 0, label: '0x', fill: '#171b22', accent: '#323946', textColor: '#dce6f2', weight: 12 },
      { multiplier: 50, label: '50x', fill: '#ff4d94', accent: '#ffb4d2', textColor: '#210611', weight: 1 },
      { multiplier: 0, label: '0x', fill: '#171b22', accent: '#323946', textColor: '#dce6f2', weight: 12 },
      { multiplier: 0, label: '0x', fill: '#171b22', accent: '#323946', textColor: '#dce6f2', weight: 12 },
      { multiplier: 0, label: '0x', fill: '#171b22', accent: '#323946', textColor: '#dce6f2', weight: 12 },
      { multiplier: 0, label: '0x', fill: '#171b22', accent: '#323946', textColor: '#dce6f2', weight: 12 },
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

function getTargetRotation(currentRotation: number, segmentIndex: number, segmentCount: number) {
  const segmentAngle = 360 / segmentCount;
  const currentNormalized = normalizeAngle(currentRotation);
  const segmentCenter = segmentIndex * segmentAngle + segmentAngle / 2;
  const desiredNormalized = normalizeAngle(-segmentCenter);
  const forwardDelta = ((desiredNormalized - currentNormalized) + 360) % 360;
  const extraTurns = (8 + Math.floor(Math.random() * 5)) * 360;
  return currentRotation + extraTurns + forwardDelta;
}

function getLandedIndexFromRotation(rotation: number, segmentCount: number) {
  const segmentAngle = 360 / segmentCount;
  const pointerAngle = normalizeAngle(-rotation);
  return Math.floor(pointerAngle / segmentAngle) % segmentCount;
}

function wait(ms: number) {
  return new Promise((resolve) => window.setTimeout(resolve, ms));
}

function formatMultiplier(value: number) {
  return value === 0 ? '0x' : `${Number(value.toFixed(value >= 10 ? 0 : value % 1 === 0 ? 0 : 1))}x`;
}

export const WheelGame: React.FC = () => {
  const { balance, addBalance, subtractBalance } = useBalance();
  const [bet, setBet] = useState(10);
  const [risk, setRisk] = useState<RiskTier>('medium');
  const [isSpinning, setIsSpinning] = useState(false);
  const [isAuto, setIsAuto] = useState(false);
  const [autoArmed, setAutoArmed] = useState(false);
  const [isFast, setIsFast] = useState(false);
  const [autoRounds, setAutoRounds] = useState(10);
  const [remainingRounds, setRemainingRounds] = useState(0);
  const [resultIndex, setResultIndex] = useState<number | null>(null);
  const [statusText, setStatusText] = useState('Choose a risk profile and spin');
  const [pointerKick, setPointerKick] = useState(0);
  const [glowLevel, setGlowLevel] = useState(0);
  const [history, setHistory] = useState<SpinEntry[]>([]);
  const [sessionProfit, setSessionProfit] = useState(0);
  const [totalSpins, setTotalSpins] = useState(0);
  const [winningSpins, setWinningSpins] = useState(0);
  const [topHit, setTopHit] = useState(0);
  const controls = useAnimation();
  const rotationRef = useRef(0);
  const pointerIntervalRef = useRef<number | null>(null);
  const autoTimerRef = useRef<number | null>(null);
  const isAutoRef = useRef(false);
  const remainingRoundsRef = useRef(0);

  const activeConfig = WHEEL_CONFIG[risk];
  const segments = activeConfig.segments;
  const segmentAngle = 360 / segments.length;

  const odds = useMemo(() => {
    const totalWeight = segments.reduce((sum, segment) => sum + segment.weight, 0);
    const groups = new Map<number, { weight: number; count: number }>();

    segments.forEach((segment) => {
      const existing = groups.get(segment.multiplier) || { weight: 0, count: 0 };
      groups.set(segment.multiplier, {
        weight: existing.weight + segment.weight,
        count: existing.count + 1,
      });
    });

    return Array.from(groups.entries())
      .map(([multiplier, data]) => ({
        multiplier,
        label: formatMultiplier(multiplier),
        probability: data.weight / totalWeight,
        count: data.count,
      }))
      .sort((a, b) => a.multiplier - b.multiplier);
  }, [segments]);

  const expectedReturn = useMemo(
    () => odds.reduce((sum, entry) => sum + entry.multiplier * entry.probability, 0),
    [odds]
  );

  const hitRate = useMemo(
    () => odds.filter((entry) => entry.multiplier > 0).reduce((sum, entry) => sum + entry.probability, 0),
    [odds]
  );

  const clearPointerInterval = () => {
    if (pointerIntervalRef.current !== null) {
      window.clearInterval(pointerIntervalRef.current);
      pointerIntervalRef.current = null;
    }
  };

  const clearAutoTimer = () => {
    if (autoTimerRef.current !== null) {
      window.clearTimeout(autoTimerRef.current);
      autoTimerRef.current = null;
    }
  };

  useEffect(() => {
    isAutoRef.current = isAuto;
  }, [isAuto]);

  useEffect(() => {
    remainingRoundsRef.current = remainingRounds;
  }, [remainingRounds]);

  useEffect(() => {
    if (!isSpinning) {
      clearPointerInterval();
      setPointerKick(0);
      setGlowLevel(0);
      return;
    }

    setGlowLevel(1);
    pointerIntervalRef.current = window.setInterval(() => {
      setPointerKick((current) => (current === 0 ? -18 : 0));
    }, isFast ? 54 : 78);

    return clearPointerInterval;
  }, [isSpinning, isFast]);

  useEffect(() => {
    return () => {
      clearPointerInterval();
      clearAutoTimer();
    };
  }, []);

  const stopAuto = () => {
    clearAutoTimer();
    setAutoArmed(false);
    setIsAuto(false);
    isAutoRef.current = false;
    remainingRoundsRef.current = 0;
    setRemainingRounds(0);
  };

  const resolveRound = async () => {
    if (isSpinning) {
      return;
    }

    if (!subtractBalance(bet)) {
      stopAuto();
      setStatusText('Insufficient balance');
      return;
    }

    setIsSpinning(true);
    setResultIndex(null);
    setStatusText(`Spinning ${activeConfig.title}`);

    const resolvedIndex = getWeightedIndex(segments);
    const targetRotation = getTargetRotation(rotationRef.current, resolvedIndex, segments.length);
    const totalRotationDelta = targetRotation - rotationRef.current;
    const burstRotation = rotationRef.current + totalRotationDelta * 0.82;
    const settleOvershoot = targetRotation + segmentAngle * 0.035;

    await controls.start({
      rotate: burstRotation,
      scale: [1, 1.018, 1.01],
      transition: {
        duration: isFast ? 0.5 : 1.15,
        ease: [0.06, 0.92, 0.18, 1],
      },
    });

    await controls.start({
      rotate: [burstRotation, settleOvershoot, targetRotation],
      scale: [1.01, 1.004, 1],
      transition: {
        duration: isFast ? 0.9 : 3.2,
        times: [0, 0.88, 1],
        ease: [[0.08, 0.7, 0.2, 1], [0.2, 1, 0.32, 1]],
      },
    });

    clearPointerInterval();
    setPointerKick(-10);
    setGlowLevel(0.5);
    await wait(70);
    setPointerKick(6);
    await wait(70);
    setPointerKick(0);
    setGlowLevel(0);

    rotationRef.current = targetRotation;
    const landedIndex = resolvedIndex;
    const landedSegment = segments[landedIndex];
    const payout = Math.round(bet * landedSegment.multiplier);
    const won = payout > 0;
    const profit = payout - bet;

    setResultIndex(landedIndex);
    setTotalSpins((current) => current + 1);
    setSessionProfit((current) => current + profit);
    setTopHit((current) => Math.max(current, landedSegment.multiplier));
    if (won) {
      setWinningSpins((current) => current + 1);
      addBalance(payout);
      setStatusText(`${landedSegment.label} hit for +${payout.toLocaleString()}`);
      if (landedSegment.multiplier >= 5) {
        confetti({ particleCount: 100, spread: 72, origin: { y: 0.58 } });
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
    controls.set({ rotate: normalizeAngle(rotationRef.current) });

    if (isAutoRef.current && remainingRoundsRef.current > 1) {
      const nextRemaining = remainingRoundsRef.current - 1;
      remainingRoundsRef.current = nextRemaining;
      setRemainingRounds(nextRemaining);
    } else if (isAutoRef.current) {
      stopAuto();
      setStatusText(`Auto finished on ${landedSegment.label}`);
    }
  };

  useEffect(() => {
    if (isAuto && remainingRounds > 0 && !isSpinning) {
      clearAutoTimer();
      autoTimerRef.current = window.setTimeout(resolveRound, isFast ? 120 : 500);
      return clearAutoTimer;
    }
    return undefined;
  }, [isAuto, remainingRounds, isSpinning, isFast, bet, risk]);

  const startAuto = () => {
    const rounds = Math.min(MAX_AUTO_SPINS, Math.max(1, autoRounds));
    setAutoArmed(true);
    setAutoRounds(rounds);
    setRemainingRounds(rounds);
    remainingRoundsRef.current = rounds;
    setIsAuto(true);
    isAutoRef.current = true;
    setStatusText(`Auto armed for ${rounds} ${rounds === 1 ? 'spin' : 'spins'}`);
  };

  const sessionHitRate = totalSpins ? winningSpins / totalSpins : 0;
  const lastEntry = history[0] || null;

  return (
    <div className="flex flex-col lg:grid lg:grid-cols-[340px_1fr] gap-6 p-4 max-w-7xl mx-auto">
      <div className="rounded-[28px] border border-white/10 bg-[#12161d] p-6 space-y-5">
        <div>
          <div className="text-[10px] uppercase tracking-[0.22em] text-[#00FF88] font-black">Wheel</div>
          <div className="mt-2 text-2xl font-black italic tracking-tight">{activeConfig.title} Wheel</div>
          <div className="mt-2 text-sm text-white/45 leading-relaxed">{activeConfig.description}</div>
        </div>

        <div className="space-y-2">
          <label className="text-xs uppercase tracking-widest text-white/40 block">Bet Amount</label>
          <input
            type="number"
            value={bet}
            onChange={(e) => setBet(Math.max(1, Number(e.target.value)))}
            disabled={isSpinning || isAuto}
            className="w-full bg-black/30 border border-white/10 rounded-2xl px-4 py-3 text-white focus:outline-none focus:border-[#00FF88]/50"
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

        <div>
          <label className="text-xs uppercase tracking-widest text-white/40 mb-2 block">Risk</label>
          <div className="grid grid-cols-2 gap-2">
            {(['low', 'medium', 'high', 'daredevil'] as RiskTier[]).map((tier) => (
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

        <div className="grid grid-cols-2 gap-2">
          <button
            onClick={() => setIsFast((current) => !current)}
            className={cn(
              'rounded-xl px-3 py-3 text-[10px] font-black uppercase tracking-[0.18em] flex items-center justify-center gap-2 transition-all',
              isFast ? 'bg-yellow-500/20 text-yellow-400 border border-yellow-500/50' : 'bg-white/5 text-white/30 border border-transparent'
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
              'rounded-xl px-3 py-3 text-[10px] font-black uppercase tracking-[0.18em] flex items-center justify-center gap-2 transition-all',
              autoArmed || isAuto ? 'bg-[#00FF88]/20 text-[#00FF88] border border-[#00FF88]/50' : 'bg-white/5 text-white/30 border border-transparent'
            )}
          >
            <RotateCcw size={14} className={isAuto ? 'animate-spin' : ''} />
            Auto
          </button>
        </div>

        {(autoArmed || isAuto) && (
          <div className="rounded-2xl border border-white/5 bg-black/25 p-4 space-y-2">
            <div className="flex justify-between text-[10px] uppercase tracking-[0.18em] text-white/30 font-black">
              <span>Auto Queue</span>
              <span>{isAuto ? `${remainingRounds} left` : `${autoRounds} queued`}</span>
            </div>
            <input
              type="number"
              min={1}
              max={MAX_AUTO_SPINS}
              value={autoRounds}
              onChange={(e) => setAutoRounds(Math.min(MAX_AUTO_SPINS, Math.max(1, Number(e.target.value))))}
              disabled={isAuto}
              className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-[#00FF88]/50"
            />
            <div className="text-[11px] text-white/30">Up to {MAX_AUTO_SPINS} queued spins.</div>
          </div>
        )}

        <button
          onClick={isAuto ? stopAuto : autoArmed ? startAuto : resolveRound}
          disabled={(balance < bet && !isAuto) || isSpinning}
          className={cn(
            'w-full rounded-2xl py-4 text-sm font-black uppercase tracking-[0.18em] flex items-center justify-center gap-3 disabled:opacity-50',
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

        <div className="rounded-2xl border border-white/5 bg-black/25 p-4 space-y-3">
          <div className="flex items-center gap-2 text-[10px] uppercase tracking-[0.18em] text-white/30 font-black">
            <Gauge size={12} />
            <span>Math</span>
          </div>
          <div className="grid grid-cols-2 gap-3 text-[11px] text-white/55">
            {odds.map((entry) => (
              <div key={entry.label} className="flex items-center justify-between rounded-xl bg-white/[0.03] px-3 py-2">
                <span>{entry.label}</span>
                <span>{(entry.probability * 100).toFixed(1)}%</span>
              </div>
            ))}
          </div>
          <div className="grid grid-cols-2 gap-3 text-[11px]">
            <div className="rounded-xl bg-white/[0.03] px-3 py-2">
              <div className="text-white/30 uppercase tracking-[0.16em] text-[10px]">Hit Rate</div>
              <div className="mt-1 text-white">{(hitRate * 100).toFixed(1)}%</div>
            </div>
            <div className="rounded-xl bg-white/[0.03] px-3 py-2">
              <div className="text-white/30 uppercase tracking-[0.16em] text-[10px]">Expected Return</div>
              <div className="mt-1 text-white">{expectedReturn.toFixed(2)}x</div>
            </div>
          </div>
        </div>

        <div className="rounded-2xl border border-white/5 bg-black/25 p-4 space-y-3">
          <div className="flex items-center justify-between text-[10px] uppercase tracking-[0.18em] text-white/30 font-black">
            <span>Recent Results</span>
            <span>{history.length}</span>
          </div>
          <div className="flex flex-wrap gap-2">
            {history.length ? history.map((entry, entryIndex) => (
              <div
                key={`${entry.multiplier}-${entry.risk}-${entryIndex}`}
                className="rounded-xl px-3 py-2 text-[11px] font-black"
                style={{
                  backgroundColor: entry.fill,
                  color: entry.textColor,
                }}
              >
                {entry.label}
              </div>
            )) : (
              <div className="text-xs text-white/35">No spins yet.</div>
            )}
          </div>
        </div>
      </div>

      <div className="rounded-[28px] border border-white/10 bg-[#0e1218] p-6 md:p-8 relative overflow-hidden min-h-[620px]">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(0,255,136,0.07),transparent_28%),radial-gradient(circle_at_bottom,rgba(79,124,255,0.08),transparent_26%),linear-gradient(180deg,rgba(255,255,255,0.02),transparent)]" />
        <div
          className="absolute inset-0 transition-opacity duration-300"
          style={{
            opacity: glowLevel,
            background:
              'radial-gradient(circle at center, rgba(255,255,255,0.09), transparent 38%), radial-gradient(circle at center, rgba(0,255,136,0.12), transparent 58%)',
          }}
        />
        <div className="relative z-10 flex flex-col xl:grid xl:grid-cols-[1fr_280px] gap-8 h-full">
          <div className="flex flex-col items-center justify-center">
            <div className="relative w-[380px] h-[380px] md:w-[440px] md:h-[440px]">
              <motion.div
                animate={{
                  y: pointerKick,
                  rotate: pointerKick === 0 ? 0 : -8,
                }}
                transition={{ duration: 0.08, ease: 'easeOut' }}
                className="absolute -top-4 left-1/2 -translate-x-1/2 z-30"
              >
                <div className="w-11 h-16 rounded-b-[22px] bg-white shadow-[0_12px_40px_rgba(255,255,255,0.18)] flex items-center justify-center">
                  <div className="w-1.5 h-8 rounded-full bg-black/20" />
                </div>
              </motion.div>

              <div className="absolute left-1/2 top-[38px] -translate-x-1/2 z-20 pointer-events-none">
                <div className="relative h-[146px] w-[92px]">
                  <div
                    className="absolute inset-x-0 top-0 h-full rounded-b-[999px] opacity-60"
                    style={{
                      background:
                        'linear-gradient(180deg, rgba(255,255,255,0.22) 0%, rgba(255,255,255,0.08) 34%, rgba(255,255,255,0) 100%)',
                      clipPath: 'polygon(50% 0%, 100% 100%, 0% 100%)',
                    }}
                  />
                  <div className="absolute left-1/2 top-0 h-full w-[3px] -translate-x-1/2 rounded-full bg-white/65 shadow-[0_0_18px_rgba(255,255,255,0.25)]" />
                </div>
              </div>

              <motion.div
                animate={controls}
                className="absolute inset-0"
                style={{
                  filter: isSpinning ? 'drop-shadow(0 26px 84px rgba(0,0,0,0.62)) blur(0.15px)' : 'drop-shadow(0 24px 70px rgba(0,0,0,0.55))',
                }}
              >
                <svg viewBox="0 0 400 400" className="w-full h-full">
                  <defs>
                    <radialGradient id="wheelCore" cx="50%" cy="50%" r="60%">
                      <stop offset="0%" stopColor="#10151d" />
                      <stop offset="100%" stopColor="#05070a" />
                    </radialGradient>
                  </defs>
                  <circle cx="200" cy="200" r="194" fill="#090d12" stroke="#1b212a" strokeWidth="10" />
                  {segments.map((segment, index) => {
                    const start = index * segmentAngle;
                    const end = start + segmentAngle;
                    const centerAngle = start + segmentAngle / 2;
                    const labelPoint = polarToCartesian(200, 200, LABEL_RADIUS, centerAngle);
                    return (
                      <g key={`${segment.label}-${index}`}>
                        <path
                          d={describeSegmentPath(200, 200, WHEEL_RADIUS, INNER_RADIUS, start, end)}
                          fill={segment.fill}
                          stroke={resultIndex === index ? '#ffffff' : segment.accent}
                          strokeWidth={resultIndex === index ? '3.5' : '2'}
                        />
                        <path
                          d={describeSegmentPath(200, 200, WHEEL_RADIUS - 12, WHEEL_RADIUS - 24, start + 1.5, end - 1.5)}
                          fill={segment.accent}
                          opacity={0.14}
                        />
                        <text
                          x={labelPoint.x}
                          y={labelPoint.y}
                          fill={segment.textColor}
                          fontSize={segment.multiplier >= 10 ? '15' : '16'}
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
                  <circle cx="200" cy="200" r="52" fill="url(#wheelCore)" stroke="#232a34" strokeWidth="8" />
                  <circle cx="200" cy="200" r="28" fill="#05070a" stroke="#1b212a" strokeWidth="3" />
                </svg>
              </motion.div>

              <div className="absolute left-1/2 top-[34px] -translate-x-1/2 z-20">
                <div className="w-4 h-4 rounded-full bg-white shadow-[0_0_22px_rgba(255,255,255,0.65)]" />
              </div>
            </div>

            <div className="mt-6 rounded-full border border-white/10 bg-black/35 px-5 py-3 text-xs font-black uppercase tracking-[0.18em] text-white/75">
              {resultIndex === null ? statusText : `Result: ${segments[resultIndex].label}`}
            </div>
          </div>

          <div className="flex flex-col gap-4 justify-center">
            <div className="rounded-3xl border border-white/10 bg-black/30 p-5">
              <div className="text-[10px] uppercase tracking-[0.18em] text-white/25 font-black">Session Status</div>
              <div className="mt-3 text-xl font-black">{statusText}</div>
              <div className="mt-2 text-sm text-white/45">{activeConfig.subtitle}</div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="rounded-3xl border border-white/10 bg-black/30 p-5">
                <div className="text-[10px] uppercase tracking-[0.18em] text-white/25 font-black">Session Profit</div>
                <div className={cn('mt-3 text-2xl font-black', sessionProfit >= 0 ? 'text-[#00FF88]' : 'text-red-400')}>
                  {sessionProfit >= 0 ? '+' : ''}
                  {sessionProfit.toLocaleString()}
                </div>
              </div>
              <div className="rounded-3xl border border-white/10 bg-black/30 p-5">
                <div className="text-[10px] uppercase tracking-[0.18em] text-white/25 font-black">Top Hit</div>
                <div className="mt-3 text-2xl font-black">{topHit ? formatMultiplier(topHit) : 'Waiting'}</div>
              </div>
              <div className="rounded-3xl border border-white/10 bg-black/30 p-5">
                <div className="text-[10px] uppercase tracking-[0.18em] text-white/25 font-black">Win Rate</div>
                <div className="mt-3 text-2xl font-black">{(sessionHitRate * 100).toFixed(0)}%</div>
              </div>
              <div className="rounded-3xl border border-white/10 bg-black/30 p-5">
                <div className="text-[10px] uppercase tracking-[0.18em] text-white/25 font-black">Last Spin</div>
                <div className="mt-3 text-2xl font-black">{lastEntry ? formatMultiplier(lastEntry.multiplier) : 'None'}</div>
              </div>
            </div>

            <div className="rounded-3xl border border-white/10 bg-black/30 p-5">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-[10px] uppercase tracking-[0.18em] text-white/25 font-black">Wheel Layout</div>
                  <div className="mt-2 text-lg font-black">{activeConfig.title}</div>
                </div>
                <div className="text-right text-[11px] text-white/35">
                  <div>{segments.length} wedges</div>
                  <div>{(hitRate * 100).toFixed(1)}% hit chance</div>
                </div>
              </div>
              <div className="mt-4 grid grid-cols-3 gap-2">
                {segments.map((segment, index) => (
                  <div
                    key={`${segment.label}-${index}-map`}
                    className="rounded-2xl border px-3 py-3 text-center"
                    style={{
                      borderColor: resultIndex === index ? '#ffffff' : 'rgba(255,255,255,0.06)',
                      backgroundColor: segment.fill,
                      color: segment.textColor,
                    }}
                  >
                    <div className="text-sm font-black">{segment.label}</div>
                    <div className="mt-1 text-[10px] uppercase tracking-[0.14em] opacity-70">W{segment.weight}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
