import React, { useRef, useState } from 'react';
import { motion, useAnimation } from 'motion/react';
import { useBalance } from '../../context/BalanceContext';
import { cn } from '../../lib/utils';
import { Play, RotateCcw } from 'lucide-react';
import confetti from 'canvas-confetti';
import { logBetActivity } from '../../lib/activity';

type WheelSegment = {
  mult: number;
  fill: string;
  accent: string;
  text: string;
};

const SEGMENTS: WheelSegment[] = [
  { mult: 0, fill: '#1a1d23', accent: '#3a404a', text: '0x' },
  { mult: 1.2, fill: '#00ff88', accent: '#7effc4', text: '1.2x' },
  { mult: 0, fill: '#1a1d23', accent: '#3a404a', text: '0x' },
  { mult: 0, fill: '#1a1d23', accent: '#3a404a', text: '0x' },
  { mult: 0, fill: '#1a1d23', accent: '#3a404a', text: '0x' },
  { mult: 2, fill: '#3b82f6', accent: '#93c5fd', text: '2x' },
  { mult: 0, fill: '#1a1d23', accent: '#3a404a', text: '0x' },
  { mult: 0, fill: '#1a1d23', accent: '#3a404a', text: '0x' },
  { mult: 0, fill: '#1a1d23', accent: '#3a404a', text: '0x' },
  { mult: 1.2, fill: '#00ff88', accent: '#7effc4', text: '1.2x' },
  { mult: 0, fill: '#1a1d23', accent: '#3a404a', text: '0x' },
  { mult: 5, fill: '#f97316', accent: '#fdba74', text: '5x' },
  { mult: 0, fill: '#1a1d23', accent: '#3a404a', text: '0x' },
  { mult: 2, fill: '#3b82f6', accent: '#93c5fd', text: '2x' },
  { mult: 0, fill: '#1a1d23', accent: '#3a404a', text: '0x' },
  { mult: 1.2, fill: '#00ff88', accent: '#7effc4', text: '1.2x' },
];

const WHEEL_RADIUS = 176;
const INNER_RADIUS = 40;
const LABEL_RADIUS = 123;
const SEGMENT_ANGLE = 360 / SEGMENTS.length;

const WEIGHTED_WHEEL_INDICES = SEGMENTS.flatMap((segment, index) => {
  if (segment.mult === 0) {
    return Array(5).fill(index);
  }
  if (segment.mult === 1.2) {
    return Array(2).fill(index);
  }
  return [index];
});

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

function getLandedIndexFromRotation(rotation: number) {
  const pointerAngle = normalizeAngle(-rotation);
  return Math.floor(pointerAngle / SEGMENT_ANGLE) % SEGMENTS.length;
}

function getTargetRotation(currentRotation: number, segmentIndex: number) {
  const currentNormalized = normalizeAngle(currentRotation);
  const segmentCenter = segmentIndex * SEGMENT_ANGLE + SEGMENT_ANGLE / 2;
  const inSegmentOffset = (Math.random() - 0.5) * SEGMENT_ANGLE * 0.16;
  const desiredNormalized = normalizeAngle(-segmentCenter + inSegmentOffset);
  const forwardDelta = ((desiredNormalized - currentNormalized) + 360) % 360;
  const extraTurns = (8 + Math.floor(Math.random() * 4)) * 360;
  return currentRotation + extraTurns + forwardDelta;
}

export const WheelGame: React.FC = () => {
  const { balance, addBalance, subtractBalance } = useBalance();
  const [bet, setBet] = useState(10);
  const [isSpinning, setIsSpinning] = useState(false);
  const [resultIndex, setResultIndex] = useState<number | null>(null);
  const [history, setHistory] = useState<number[]>([]);
  const controls = useAnimation();
  const rotationRef = useRef(0);

  const spin = async () => {
    if (isSpinning) {
      return;
    }

    if (!subtractBalance(bet)) {
      return;
    }

    setIsSpinning(true);
    setResultIndex(null);

    const resolvedIndex = WEIGHTED_WHEEL_INDICES[Math.floor(Math.random() * WEIGHTED_WHEEL_INDICES.length)];
    const targetRotation = getTargetRotation(rotationRef.current, resolvedIndex);

    await controls.start({
      rotate: targetRotation,
      transition: {
        duration: 5.8,
        ease: [0.08, 0.82, 0.16, 1],
      },
    });

    rotationRef.current = targetRotation;
    const landedIndex = getLandedIndexFromRotation(rotationRef.current);
    const landedSegment = SEGMENTS[landedIndex];
    setResultIndex(landedIndex);
    setHistory((current) => [landedIndex, ...current].slice(0, 10));

    if (landedSegment.mult > 0) {
      const payout = bet * landedSegment.mult;
      addBalance(payout);
      logBetActivity({
        gameKey: 'wheel',
        wager: bet,
        payout,
        multiplier: landedSegment.mult,
        outcome: 'win',
        detail: `Segment ${landedSegment.text}`,
      });
      confetti({ particleCount: 90, spread: 65, origin: { y: 0.6 } });
    } else {
      logBetActivity({
        gameKey: 'wheel',
        wager: bet,
        payout: 0,
        multiplier: 0,
        outcome: 'loss',
        detail: `Segment ${landedSegment.text}`,
      });
    }

    setIsSpinning(false);
    controls.set({ rotate: normalizeAngle(rotationRef.current) });
  };

  return (
    <div className="flex flex-col lg:grid lg:grid-cols-[340px_1fr] gap-6 p-4 max-w-6xl mx-auto">
      <div className="rounded-[28px] border border-white/10 bg-[#12161d] p-6 space-y-5">
        <div>
          <div className="text-[10px] uppercase tracking-[0.22em] text-[#00FF88] font-black">Wheel</div>
          <div className="mt-2 text-2xl font-black italic tracking-tight">Weighted Prize Wheel</div>
          <div className="mt-2 text-sm text-white/45 leading-relaxed">
            A rebuilt wheel with exact wedge landing. The result is picked first, then the spin settles inside that wedge under the top pointer.
          </div>
        </div>

        <div className="space-y-2">
          <label className="text-xs uppercase tracking-widest text-white/40 block">Bet Amount</label>
          <input
            type="number"
            value={bet}
            onChange={(e) => setBet(Math.max(1, Number(e.target.value)))}
            disabled={isSpinning}
            className="w-full bg-black/30 border border-white/10 rounded-2xl px-4 py-3 text-white focus:outline-none focus:border-[#00FF88]/50"
          />
          <div className="grid grid-cols-2 gap-2">
            <button
              onClick={() => setBet((current) => Math.max(1, Math.min(Math.floor(balance), current * 2)))}
              disabled={isSpinning || balance < 1}
              className="rounded-xl bg-white/5 px-3 py-2 text-[10px] font-black uppercase tracking-[0.18em] text-white/60 disabled:opacity-40"
            >
              x2
            </button>
            <button
              onClick={() => setBet(Math.max(1, Math.floor(balance)))}
              disabled={isSpinning || balance < 1}
              className="rounded-xl bg-white/5 px-3 py-2 text-[10px] font-black uppercase tracking-[0.18em] text-white/60 disabled:opacity-40"
            >
              Max
            </button>
          </div>
        </div>

        <button
          onClick={spin}
          disabled={isSpinning || balance < bet}
          className="w-full rounded-2xl bg-[#00FF88] text-black py-4 text-sm font-black uppercase tracking-[0.18em] flex items-center justify-center gap-3 disabled:opacity-50"
        >
          {isSpinning ? <RotateCcw size={18} className="animate-spin" /> : <Play size={18} fill="currentColor" />}
          {isSpinning ? 'Spinning' : 'Spin Wheel'}
        </button>

        <div className="rounded-2xl border border-white/5 bg-black/25 p-4 space-y-3">
          <div className="text-[10px] uppercase tracking-[0.18em] text-white/30 font-black">Odds</div>
          <div className="grid grid-cols-2 gap-3 text-[11px] text-white/55">
            <div className="flex items-center gap-2"><span className="w-2 h-2 rounded-full bg-[#00ff88]" />1.2x: 3/16</div>
            <div className="flex items-center gap-2"><span className="w-2 h-2 rounded-full bg-[#3b82f6]" />2x: 2/16</div>
            <div className="flex items-center gap-2"><span className="w-2 h-2 rounded-full bg-[#f97316]" />5x: 1/16</div>
            <div className="flex items-center gap-2"><span className="w-2 h-2 rounded-full bg-[#3a404a]" />0x: 10/16</div>
          </div>
        </div>

        <div className="rounded-2xl border border-white/5 bg-black/25 p-4 space-y-3">
          <div className="flex items-center justify-between text-[10px] uppercase tracking-[0.18em] text-white/30 font-black">
            <span>Recent Results</span>
            <span>{history.length}</span>
          </div>
          <div className="flex flex-wrap gap-2">
            {history.length ? history.map((index, entryIndex) => (
              <div
                key={`${index}-${entryIndex}`}
                className="rounded-xl px-3 py-2 text-[11px] font-black"
                style={{ backgroundColor: SEGMENTS[index].fill, color: SEGMENTS[index].mult === 0 ? '#ffffff' : '#091014' }}
              >
                {SEGMENTS[index].text}
              </div>
            )) : (
              <div className="text-xs text-white/35">No spins yet.</div>
            )}
          </div>
        </div>
      </div>

      <div className="rounded-[28px] border border-white/10 bg-[#0e1218] p-6 md:p-8 flex items-center justify-center relative overflow-hidden min-h-[560px]">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(0,255,136,0.07),transparent_30%),radial-gradient(circle_at_bottom,rgba(59,130,246,0.08),transparent_28%)]" />

        <div className="relative w-[380px] h-[380px] md:w-[420px] md:h-[420px]">
          <motion.div
            animate={isSpinning ? { y: [0, -10, 0, -6, 0] } : { y: 0 }}
            transition={{ duration: 0.85, repeat: isSpinning ? Infinity : 0, ease: 'easeInOut' }}
            className="absolute -top-4 left-1/2 -translate-x-1/2 z-30"
          >
            <div className="w-10 h-14 rounded-b-[20px] bg-white shadow-[0_10px_32px_rgba(255,255,255,0.18)] flex items-center justify-center">
              <div className="w-1.5 h-7 rounded-full bg-black/20" />
            </div>
          </motion.div>

          <motion.div animate={controls} className="absolute inset-0">
            <svg viewBox="0 0 400 400" className="w-full h-full drop-shadow-[0_24px_70px_rgba(0,0,0,0.55)]">
              <circle cx="200" cy="200" r="194" fill="#0a0d12" stroke="#1b212a" strokeWidth="10" />
              {SEGMENTS.map((segment, index) => {
                const start = index * SEGMENT_ANGLE;
                const end = start + SEGMENT_ANGLE;
                const centerAngle = start + SEGMENT_ANGLE / 2;
                const labelPoint = polarToCartesian(200, 200, LABEL_RADIUS, centerAngle);
                const textRotation = centerAngle;
                return (
                  <g key={`${segment.text}-${index}`}>
                    <path
                      d={describeSegmentPath(200, 200, WHEEL_RADIUS, INNER_RADIUS, start, end)}
                      fill={segment.fill}
                      stroke="#242a34"
                      strokeWidth="2"
                    />
                    <text
                      x={labelPoint.x}
                      y={labelPoint.y}
                      fill={segment.mult === 0 ? '#d6dde7' : '#091014'}
                      fontSize="16"
                      fontWeight="900"
                      textAnchor="middle"
                      dominantBaseline="middle"
                      transform={`rotate(${textRotation} ${labelPoint.x} ${labelPoint.y})`}
                    >
                      {segment.text}
                    </text>
                  </g>
                );
              })}
              <circle cx="200" cy="200" r="48" fill="#10151d" stroke="#232a34" strokeWidth="8" />
              <circle cx="200" cy="200" r="24" fill="#05070a" />
            </svg>
          </motion.div>

          <div className="absolute left-1/2 top-[34px] -translate-x-1/2 z-20">
            <div className="w-4 h-4 rounded-full bg-white shadow-[0_0_22px_rgba(255,255,255,0.65)]" />
          </div>
        </div>

        <div className="absolute bottom-6 left-1/2 -translate-x-1/2 rounded-full border border-white/10 bg-black/35 px-5 py-3 text-xs font-black uppercase tracking-[0.18em] text-white/75">
          {resultIndex === null ? 'Awaiting spin' : `Result: ${SEGMENTS[resultIndex].text}`}
        </div>
      </div>
    </div>
  );
};
