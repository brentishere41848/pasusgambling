import React, { useEffect, useMemo, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import confetti from 'canvas-confetti';
import { ArrowUp, Coins, RotateCcw, Volume2 } from 'lucide-react';
import { useBalance } from '../../context/BalanceContext';
import { logBetActivity } from '../../lib/activity';
import { cn } from '../../lib/utils';

const LANE_COUNT = 8;
const SCENE_WIDTH = 100;
const LANE_HEIGHT = 58;
const START_ZONE_HEIGHT = 190;
const CHICKEN_X = 50;
const CHICKEN_Y = 6;
const CHICKEN_COLLISION_WIDTH = 10;
const TRAFFIC_LEFT_START = 115;
const TRAFFIC_LEFT_END = -26;
const TRAFFIC_RIGHT_START = -26;
const TRAFFIC_RIGHT_END = 115;
const BASE_LANE_MULTIPLIERS = [1.16, 1.38, 1.68, 2.05, 2.55, 3.3, 4.55, 6.8];

const DIFFICULTIES = {
  easy: { label: 'Easy', payoutBoost: 0.92, speedFactor: 0.9, extraCars: 0 },
  medium: { label: 'Medium', payoutBoost: 1, speedFactor: 1, extraCars: 0 },
  hard: { label: 'Hard', payoutBoost: 1.16, speedFactor: 0.84, extraCars: 1 },
  extreme: { label: 'Extreme', payoutBoost: 1.32, speedFactor: 0.72, extraCars: 2 },
} as const;

type TrafficCar = {
  id: string;
  laneIndex: number;
  width: number;
  speed: number;
  startX: number;
  color: string;
};

type Lane = {
  index: number;
  direction: 'left' | 'right';
  speedLabel: string;
  cars: TrafficCar[];
};

type RunState = 'idle' | 'playing' | 'jumping' | 'won' | 'lost';
type DifficultyKey = keyof typeof DIFFICULTIES;

function randomBetween(min: number, max: number) {
  return Math.random() * (max - min) + min;
}

function randomInt(min: number, max: number) {
  return Math.floor(randomBetween(min, max + 1));
}

function speedLabelForLane(index: number) {
  if (index < 2) {
    return 'slow';
  }
  if (index < 5) {
    return 'medium';
  }
  return 'fast';
}

function durationForLabel(label: string) {
  if (label === 'slow') {
    return 6.2;
  }
  if (label === 'medium') {
    return 4.4;
  }
  return 3.1;
}

function laneTrafficCount(index: number, difficulty: DifficultyKey) {
  if (index < 2) {
    return 1 + DIFFICULTIES[difficulty].extraCars;
  }
  if (index < 5) {
    return 2 + DIFFICULTIES[difficulty].extraCars;
  }
  return 3 + DIFFICULTIES[difficulty].extraCars;
}

function carColor(index: number) {
  const palette = [
    'from-[#8ec5ff] to-[#346bff]',
    'from-[#ffd36a] to-[#ff8a3d]',
    'from-[#ff88ae] to-[#ff4f6f]',
    'from-[#9be7ff] to-[#14b8a6]',
  ];
  return palette[index % palette.length];
}

function createRunLanes(difficulty: DifficultyKey) {
  return Array.from({ length: LANE_COUNT }, (_, laneIndex) => {
    const direction = laneIndex % 2 === 0 ? 'left' : 'right';
    const speedLabel = speedLabelForLane(laneIndex);
    const carCount = laneTrafficCount(laneIndex, difficulty);
    const spacing = SCENE_WIDTH / carCount;
    const laneOffset = randomBetween(-8, 8);
    const cars = Array.from({ length: carCount }, (_, carIndex) => {
      const width = randomBetween(16, 19);
      const baseStart = (carIndex * spacing + laneOffset + SCENE_WIDTH) % SCENE_WIDTH;
      return {
        id: `${laneIndex}-${carIndex}-${Math.round(Math.random() * 100000)}`,
        laneIndex,
        width,
        speed: durationForLabel(speedLabel) * DIFFICULTIES[difficulty].speedFactor,
        startX: baseStart,
        color: carColor(laneIndex + carIndex),
      };
    });

    return {
      index: laneIndex,
      direction,
      speedLabel,
      cars,
    };
  });
}

function currentCarLeft(lane: Lane, car: TrafficCar, elapsedSeconds: number) {
  const delay = (car.laneIndex + Number(car.id.split('-')[1])) * 0.18;
  if (elapsedSeconds <= delay) {
    return car.startX;
  }

  const from = lane.direction === 'left' ? TRAFFIC_LEFT_START : TRAFFIC_RIGHT_START;
  const to = lane.direction === 'left' ? TRAFFIC_LEFT_END : TRAFFIC_RIGHT_END;
  const progress = ((elapsedSeconds - delay) % car.speed) / car.speed;
  return from + (to - from) * progress;
}

function chickenIsHitByTraffic(lane: Lane, elapsedSeconds: number) {
  const chickenLeft = CHICKEN_X - CHICKEN_COLLISION_WIDTH / 2;
  const chickenRight = CHICKEN_X + CHICKEN_COLLISION_WIDTH / 2;

  return lane.cars.some((car) => {
    const carLeft = currentCarLeft(lane, car, elapsedSeconds);
    const carRight = carLeft + car.width;
    return carLeft < chickenRight && carRight > chickenLeft;
  });
}

function roadOffsetForProgress(progress: number) {
  return progress * LANE_HEIGHT;
}

export const CrossyRoadGame: React.FC = () => {
  const { balance, addBalance, subtractBalance } = useBalance();
  const [bet, setBet] = useState(10);
  const [difficulty, setDifficulty] = useState<DifficultyKey>('medium');
  const [lanes, setLanes] = useState<Lane[]>(() => createRunLanes('medium'));
  const [runState, setRunState] = useState<RunState>('idle');
  const [resolvedLane, setResolvedLane] = useState(-1);
  const [status, setStatus] = useState('Start a run, jump lane by lane, and cash out before traffic hits the chicken.');
  const [flashTone, setFlashTone] = useState<'safe' | 'hit' | 'win' | null>(null);
  const [showImpact, setShowImpact] = useState(false);
  const sceneRef = useRef<HTMLDivElement | null>(null);
  const [screenShake, setScreenShake] = useState(false);
  const [runStartedAt, setRunStartedAt] = useState<number | null>(null);

  const progress = Math.max(0, resolvedLane + 1);
  const nextLaneIndex = resolvedLane + 1;
  const laneMultipliers = useMemo(
    () => BASE_LANE_MULTIPLIERS.map((value) => Number((value * DIFFICULTIES[difficulty].payoutBoost).toFixed(2))),
    [difficulty]
  );
  const currentMultiplier = useMemo(() => {
    if (resolvedLane < 0) {
      return 1;
    }
    return laneMultipliers[resolvedLane];
  }, [laneMultipliers, resolvedLane]);
  const topPayout = Math.round(bet * laneMultipliers[laneMultipliers.length - 1]);
  const cashoutValue = Math.round(bet * currentMultiplier);

  useEffect(() => {
    if (!screenShake) {
      return;
    }

    const timer = window.setTimeout(() => setScreenShake(false), 420);
    return () => window.clearTimeout(timer);
  }, [screenShake]);

  useEffect(() => {
    if (!showImpact) {
      return;
    }

    const timer = window.setTimeout(() => setShowImpact(false), 460);
    return () => window.clearTimeout(timer);
  }, [showImpact]);

  const startRun = () => {
    if (!subtractBalance(bet)) {
      return;
    }

    setLanes(createRunLanes(difficulty));
    setRunState('playing');
    setResolvedLane(-1);
    setFlashTone(null);
    setShowImpact(false);
    setRunStartedAt(Date.now());
    setStatus(`${DIFFICULTIES[difficulty].label} traffic is live. Jump into lane 1 when you are ready.`);
  };

  const resetRun = () => {
    setLanes(createRunLanes(difficulty));
    setRunState('idle');
    setResolvedLane(-1);
    setFlashTone(null);
    setShowImpact(false);
    setRunStartedAt(null);
    setStatus('Start a run, jump lane by lane, and cash out before traffic hits the chicken.');
  };

  const jump = () => {
    if (runState !== 'playing' || nextLaneIndex >= LANE_COUNT) {
      return;
    }

    setRunState('jumping');
    setFlashTone(null);
    setStatus(`Chicken in the air for lane ${nextLaneIndex + 1}...`);

    window.setTimeout(() => {
      const lane = lanes[nextLaneIndex];
      const elapsedSeconds = runStartedAt ? (Date.now() - runStartedAt) / 1000 : 0;
      const survived = !chickenIsHitByTraffic(lane, elapsedSeconds);

      if (!survived) {
        setRunState('lost');
        setFlashTone('hit');
        setShowImpact(true);
        setScreenShake(true);
        setStatus(`Lane ${nextLaneIndex + 1} was blocked. The chicken got flattened.`);
        logBetActivity({
          gameKey: 'crossy-road',
          wager: bet,
          payout: 0,
          multiplier: 0,
          outcome: 'loss',
          detail: `Traffic collision on lane ${nextLaneIndex + 1}`,
        });
        return;
      }

      setResolvedLane(nextLaneIndex);

      if (nextLaneIndex === LANE_COUNT - 1) {
        const payout = Math.round(bet * laneMultipliers[nextLaneIndex]);
        addBalance(payout);
        setRunState('won');
        setFlashTone('win');
        setStatus(`The chicken crossed the highway. Paid ${payout}.`);
        logBetActivity({
          gameKey: 'crossy-road',
          wager: bet,
          payout,
          multiplier: laneMultipliers[nextLaneIndex],
          outcome: 'win',
          detail: 'Finished the crossing',
        });
        confetti({
          particleCount: 150,
          spread: 80,
          origin: { y: 0.6 },
          colors: ['#fff7b0', '#9be7ff', '#00FF88', '#ffffff'],
        });
      } else {
        setRunState('playing');
        setFlashTone('safe');
        setStatus(`Safe landing. Lane ${nextLaneIndex + 1} cleared at ${laneMultipliers[nextLaneIndex].toFixed(2)}x.`);
      }
    }, 520);
  };

  const cashOut = () => {
    if (runState !== 'playing' || resolvedLane < 0) {
      return;
    }

    const payout = Math.round(bet * currentMultiplier);
    addBalance(payout);
    setRunState('won');
    setFlashTone('win');
    setStatus(`You cashed out after lane ${resolvedLane + 1} for ${payout}.`);
    logBetActivity({
      gameKey: 'crossy-road',
      wager: bet,
      payout,
      multiplier: currentMultiplier,
      outcome: 'win',
      detail: `Cashed out after lane ${resolvedLane + 1}`,
    });
  };

  const activeLandingLane = runState === 'jumping' ? nextLaneIndex : resolvedLane;
  const roadTranslateY = roadOffsetForProgress(Math.max(activeLandingLane, -1));

  return (
    <div className="flex flex-col lg:grid lg:grid-cols-4 gap-6 p-4 max-w-6xl mx-auto">
      <div className="lg:col-span-1 bg-[#111] border border-white/10 rounded-2xl p-6 flex flex-col gap-4">
        <div>
          <label className="text-xs uppercase tracking-widest text-white/40 mb-2 block">Bet Amount</label>
          <input
            type="number"
            value={bet}
            onChange={(e) => setBet(Math.max(1, Number(e.target.value)))}
            disabled={runState === 'playing' || runState === 'jumping'}
            className="w-full bg-black border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-[#00FF88]/50"
          />
          <div className="mt-2 flex gap-2">
             <button onClick={() => setBet((prev) => Math.max(1, Math.min(Math.floor(balance), prev * 2)))} disabled={runState === 'playing' || runState === 'jumping' || balance < 1} className="flex-1 rounded-lg bg-white/5 px-3 py-2 text-[10px] font-black uppercase tracking-widest text-white/60 disabled:opacity-40">x2</button>
             <button onClick={() => setBet(Math.max(1, Math.floor(balance)))} disabled={runState === 'playing' || runState === 'jumping' || balance < 1} className="flex-1 rounded-lg bg-white/5 px-3 py-2 text-[10px] font-black uppercase tracking-widest text-white/60 disabled:opacity-40">Max</button>
           </div>
         </div>

         <div>
           <label className="text-xs uppercase tracking-widest text-white/40 mb-2 block">Difficulty</label>
           <div className="grid grid-cols-2 gap-2">
             {(Object.entries(DIFFICULTIES) as Array<[DifficultyKey, (typeof DIFFICULTIES)[DifficultyKey]]>).map(([key, config]) => (
               <button
                 key={key}
                 onClick={() => {
                   setDifficulty(key);
                   if (runState === 'idle') {
                     setLanes(createRunLanes(key));
                   }
                 }}
                 disabled={runState === 'playing' || runState === 'jumping'}
                 className={cn(
                   'rounded-xl border px-3 py-3 text-xs font-black uppercase tracking-[0.16em] transition-all disabled:opacity-40',
                   difficulty === key
                     ? 'border-[#9BE7FF]/40 bg-[#9BE7FF]/12 text-[#d8f5ff]'
                     : 'border-white/10 bg-white/5 text-white/55 hover:bg-white/10'
                 )}
               >
                 {config.label}
               </button>
             ))}
           </div>
         </div>

         <div className="rounded-2xl border border-white/10 bg-black/30 px-4 py-4 space-y-3">
          <div className="flex justify-between text-xs">
            <span className="text-white/40">Lanes Cleared</span>
            <span className="font-mono text-white">{progress}</span>
          </div>
          <div className="flex justify-between text-xs">
            <span className="text-white/40">Current Multiplier</span>
            <span className="font-mono text-[#9BE7FF]">{currentMultiplier.toFixed(2)}x</span>
          </div>
           <div className="flex justify-between text-xs">
             <span className="text-white/40">Cash Out</span>
             <span className="font-mono text-[#00FF88]">{cashoutValue}</span>
           </div>
           <div className="flex justify-between text-xs">
             <span className="text-white/40">Mode</span>
             <span className="font-mono text-white">{DIFFICULTIES[difficulty].label}</span>
           </div>
         </div>

        {(runState === 'playing' || runState === 'jumping') ? (
          <>
            <button
              onClick={jump}
              disabled={runState !== 'playing'}
              className="w-full bg-white hover:bg-white/90 text-black font-bold py-4 rounded-xl transition-all disabled:opacity-50 flex items-center justify-center gap-2"
            >
              <ArrowUp size={18} />
              {runState === 'jumping' ? 'JUMPING...' : 'JUMP'}
            </button>
            <button
              onClick={cashOut}
              disabled={runState !== 'playing' || resolvedLane < 0}
              className="w-full bg-[#00FF88] hover:bg-[#00FF88]/90 text-black font-bold py-4 rounded-xl transition-all disabled:opacity-50"
            >
              CASH OUT
            </button>
          </>
        ) : (
          <button
            onClick={startRun}
            disabled={balance < bet}
            className="w-full bg-white hover:bg-white/90 text-black font-bold py-4 rounded-xl transition-all disabled:opacity-50 flex items-center justify-center gap-2"
          >
            <Coins size={18} />
            START ROAD
          </button>
        )}

        <button
          onClick={resetRun}
          className="w-full bg-white/5 hover:bg-white/10 text-white font-bold py-4 rounded-xl transition-all flex items-center justify-center gap-2"
        >
          <RotateCcw size={18} />
          RESET
        </button>

        <div className="rounded-2xl border border-white/10 bg-black/25 px-4 py-4">
          <div className="flex items-center gap-2 text-[10px] uppercase tracking-[0.18em] text-white/30 font-black">
            <Volume2 size={12} className="text-[#9BE7FF]" />
            Live Call
          </div>
          <div className="mt-2 text-xs text-white/65 leading-relaxed">{status}</div>
        </div>

        <div className="mt-auto rounded-2xl border border-white/10 bg-[linear-gradient(180deg,#121922_0%,#0f141b_100%)] px-4 py-4">
          <div className="text-[10px] uppercase tracking-[0.18em] text-white/25 font-black">Top Lane Pays</div>
          <div className="mt-2 text-2xl font-black text-[#00FF88]">{topPayout}</div>
           <div className="mt-1 text-[11px] text-white/35">Hit all 8 jumps and the final lane pays {laneMultipliers[laneMultipliers.length - 1].toFixed(2)}x.</div>
         </div>
      </div>

      <div className="lg:col-span-3 rounded-2xl border border-white/10 bg-[linear-gradient(180deg,#10151c_0%,#0b0f15_100%)] p-5 md:p-7">
        <div className="mb-5 flex items-center justify-between gap-4">
          <div>
            <div className="text-[10px] uppercase tracking-[0.22em] text-[#9BE7FF] font-black">Chicken Road</div>
            <div className="mt-1 text-sm text-white/45">The chicken stays in frame. Traffic streams past. Every jump locks the next lane result.</div>
          </div>
          <div className="rounded-2xl border border-white/10 bg-black/25 px-4 py-3 text-right">
            <div className="text-[10px] uppercase tracking-[0.16em] text-white/25 font-black">Next Lane</div>
            <div className="mt-1 text-lg font-black text-[#9BE7FF]">
               {nextLaneIndex < LANE_COUNT ? `${laneMultipliers[nextLaneIndex].toFixed(2)}x` : 'Finished'}
             </div>
           </div>
        </div>

        <motion.div
          ref={sceneRef}
          animate={screenShake ? { x: [0, -10, 8, -6, 0], y: [0, 4, -3, 2, 0] } : { x: 0, y: 0 }}
          transition={{ duration: 0.38, ease: 'easeOut' }}
          className="relative overflow-hidden rounded-[32px] border border-white/10 bg-[linear-gradient(180deg,#1c3042_0%,#0d1218_36%,#11161d_100%)] min-h-[640px]"
        >
          <div className="absolute inset-x-0 top-0 h-[34%] bg-[radial-gradient(circle_at_50%_0%,rgba(130,200,255,0.26),transparent_58%)]" />
          <div className="absolute inset-x-0 top-0 h-[34%] opacity-70" style={{ backgroundImage: 'radial-gradient(circle at 12% 18%, rgba(255,255,255,0.92) 0 1px, transparent 1.4px), radial-gradient(circle at 72% 28%, rgba(255,255,255,0.8) 0 1px, transparent 1.5px), radial-gradient(circle at 48% 48%, rgba(155,231,255,0.9) 0 1px, transparent 1.5px)', backgroundSize: '260px 160px' }} />

          <motion.div
            className="absolute inset-x-0 top-0"
            animate={{ y: CHICKEN_Y - roadTranslateY }}
            transition={{ duration: runState === 'jumping' ? 0.52 : 0.48, ease: [0.2, 0.8, 0.2, 1] }}
          >
              <div className="absolute inset-x-0 top-0 h-[250px] bg-[linear-gradient(180deg,#254f36_0%,#162d1f_100%)]" />
              <div className="absolute inset-x-0 top-[146px] h-[20px] bg-[linear-gradient(180deg,#b8c2cc_0%,#8d9aa6_100%)] shadow-[0_8px_16px_rgba(0,0,0,0.25)]" />
              <div className="absolute inset-x-0 top-0 h-[146px] bg-[linear-gradient(180deg,#2b5a3d_0%,#183122_100%)]" />
              <div className="absolute left-1/2 top-[34px] h-[72px] w-[182px] -translate-x-1/2 rounded-[34px] border border-white/10 bg-[linear-gradient(180deg,#375842_0%,#223627_100%)] shadow-[0_18px_30px_rgba(0,0,0,0.22)]" />
              <div className="absolute left-1/2 top-[112px] h-8 w-[3px] -translate-x-1/2 bg-white/20" />

             {lanes.map((lane, index) => {
               const laneTop = START_ZONE_HEIGHT + index * LANE_HEIGHT;
               const laneState = index < progress ? 'cleared' : index === nextLaneIndex && (runState === 'playing' || runState === 'jumping') ? 'active' : 'idle';

               return (
                  <div key={lane.index} className="absolute left-0 right-0 h-[52px]" style={{ top: laneTop }}>
                  <div className="absolute inset-0 bg-[linear-gradient(180deg,#292e35_0%,#1f242b_100%)] border-y border-white/5" />
                  <div className="absolute inset-y-[22px] left-0 right-0 border-t border-dashed border-white/10" />
                  <div
                    className={cn(
                      'absolute inset-0 rounded-2xl transition-all duration-300',
                      laneState === 'cleared' ? 'bg-[#00FF88]/12 shadow-[0_0_20px_rgba(0,255,136,0.08)]' : laneState === 'active' ? 'bg-[#9BE7FF]/10' : 'bg-transparent',
                      runState === 'lost' && nextLaneIndex === index ? 'bg-red-500/12' : ''
                    )}
                  />

                  {index < progress ? (
                    <div className="absolute inset-0">
                      <div className="absolute inset-y-0 left-[18%] w-[12px] rounded-full bg-[linear-gradient(180deg,#ffec9d_0%,#ffb02e_100%)] shadow-[0_0_16px_rgba(255,208,86,0.35)]" />
                      <div className="absolute inset-y-0 right-[18%] w-[12px] rounded-full bg-[linear-gradient(180deg,#ffec9d_0%,#ffb02e_100%)] shadow-[0_0_16px_rgba(255,208,86,0.35)]" />
                      <div className="absolute left-[22%] right-[22%] top-1/2 h-[14px] -translate-y-1/2 rounded-full border border-[#ffd76a]/50 bg-[repeating-linear-gradient(-45deg,#ffcb45_0_12px,#10151c_12px_24px)] shadow-[0_10px_24px_rgba(255,207,77,0.2)]" />
                    </div>
                  ) : lane.cars.map((car) => {
                    const travelStart = lane.direction === 'left' ? `${TRAFFIC_LEFT_START}%` : `${TRAFFIC_RIGHT_START}%`;
                    const travelEnd = lane.direction === 'left' ? `${TRAFFIC_LEFT_END}%` : `${TRAFFIC_RIGHT_END}%`;

                    return (
                      <motion.div
                        key={car.id}
                        className="absolute top-[8px] h-[36px]"
                        style={{ width: `${car.width}%` }}
                        initial={{ left: `${car.startX}%` }}
                        animate={{ left: [travelStart, travelEnd] }}
                        transition={{ duration: car.speed, repeat: Infinity, ease: 'linear', delay: (car.laneIndex + Number(car.id.split('-')[1])) * 0.18 }}
                      >
                        <div className={cn('relative h-full w-full rounded-[14px] bg-gradient-to-r shadow-[0_12px_24px_rgba(0,0,0,0.28)]', car.color)}>
                          <div className="absolute inset-y-[10px] left-[10%] w-2 rounded-full bg-white/95 shadow-[0_0_12px_rgba(255,255,255,0.8)]" />
                          <div className="absolute inset-y-[10px] right-[10%] w-2 rounded-full bg-red-200/80 shadow-[0_0_10px_rgba(255,120,120,0.35)]" />
                          <div className="absolute bottom-[-3px] left-[16%] h-2 w-3 rounded-full bg-black/80" />
                          <div className="absolute bottom-[-3px] right-[16%] h-2 w-3 rounded-full bg-black/80" />
                        </div>
                      </motion.div>
                    );
                  })}
                </div>
              );
            })}
          </motion.div>

          <div className="absolute inset-x-0 top-[160px] h-[4px] bg-white/5" />

          <div className="absolute left-1/2 top-[52px] -translate-x-1/2">
            <motion.div
              animate={
                runState === 'jumping'
                  ? { y: [0, 112, 0], scaleX: [1, 0.92, 1], scaleY: [1, 1.08, 1] }
                  : runState === 'lost'
                    ? { rotate: [0, -12, 10, -8, 0], y: [0, -8, 0], scale: [1, 1.06, 0.94, 1] }
                    : { y: [0, -4, 0], scaleY: [1, 1.02, 1] }
              }
              transition={{
                duration: runState === 'jumping' ? 0.52 : runState === 'lost' ? 0.44 : 1.9,
                repeat: runState === 'playing' ? Infinity : 0,
                ease: 'easeInOut',
              }}
              className="relative"
            >
              <div className="absolute left-1/2 top-[68px] h-4 w-10 -translate-x-1/2 rounded-full bg-black/35 blur-md" />
              <div
                className={cn(
                  'relative h-[70px] w-[72px] rounded-[24px] border shadow-[0_18px_35px_rgba(0,0,0,0.32)]',
                  runState === 'lost'
                    ? 'border-red-300/40 bg-[linear-gradient(180deg,#ffb0b0_0%,#ff5555_100%)]'
                    : 'border-yellow-100/50 bg-[linear-gradient(180deg,#fff7b7_0%,#ffd95c_100%)]'
                )}
              >
                <div className="absolute left-[14px] top-[16px] h-2.5 w-2.5 rounded-full bg-[#20180b]" />
                <div className="absolute right-[14px] top-[16px] h-2.5 w-2.5 rounded-full bg-[#20180b]" />
                <div className="absolute left-1/2 top-[30px] h-3 w-4 -translate-x-1/2 rounded-full bg-[#f7921e]/85" />
                <div className="absolute left-[6px] top-[22px] h-5 w-4 rounded-full bg-[#fffbe0]/70" />
                <div className="absolute right-[6px] top-[22px] h-5 w-4 rounded-full bg-[#fffbe0]/70" />
                <div className="absolute left-[8px] top-[-5px] h-4 w-4 rounded-[8px] bg-[#ffea91]" />
                <div className="absolute right-[8px] top-[-5px] h-4 w-4 rounded-[8px] bg-[#ffea91]" />
              </div>
            </motion.div>
          </div>

          <AnimatePresence>
            {flashTone ? (
              <motion.div
                key={flashTone}
                initial={{ opacity: 0, scale: 0.9, y: 12 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95, y: -10 }}
                className={cn(
                  'absolute left-1/2 top-8 -translate-x-1/2 rounded-full border px-5 py-2 text-sm font-black uppercase tracking-[0.18em] backdrop-blur-md',
                  flashTone === 'safe' && 'border-[#00FF88]/30 bg-[#00FF88]/12 text-[#a6ffd1]',
                  flashTone === 'hit' && 'border-red-400/30 bg-red-500/14 text-red-100',
                  flashTone === 'win' && 'border-yellow-300/30 bg-yellow-400/14 text-yellow-100'
                )}
              >
                {flashTone === 'safe' ? 'Safe Jump' : flashTone === 'hit' ? 'Roadkill' : 'Big Cashout'}
              </motion.div>
            ) : null}
          </AnimatePresence>

          <AnimatePresence>
            {showImpact ? (
              <motion.div
                initial={{ opacity: 0, scale: 0.2 }}
                animate={{ opacity: 1, scale: 1.15 }}
                exit={{ opacity: 0, scale: 1.4 }}
                className="pointer-events-none absolute left-1/2 bottom-[130px] h-40 w-40 -translate-x-1/2 rounded-full bg-red-500/18 blur-2xl"
              />
            ) : null}
          </AnimatePresence>
        </motion.div>
      </div>
    </div>
  );
};
