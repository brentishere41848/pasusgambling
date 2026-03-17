import React, { useEffect, useMemo, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import confetti from 'canvas-confetti';
import { ArrowUp, Coins, RotateCcw, Volume2 } from 'lucide-react';
import { useBalance } from '../../context/BalanceContext';
import { logBetActivity } from '../../lib/activity';
import { cn } from '../../lib/utils';

const LANE_COUNT = 30;
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
const DIFFICULTIES = {
  easy: { label: 'Easy', payoutBoost: 0.94, speedFactor: 1.24 },
  medium: { label: 'Medium', payoutBoost: 1.08, speedFactor: 1 },
  hard: { label: 'Hard', payoutBoost: 1.45, speedFactor: 0.68 },
  extreme: { label: 'Extreme', payoutBoost: 2.4, speedFactor: 0.42 },
} as const;

type TrafficCar = {
  id: string;
  laneIndex: number;
  width: number;
  speed: number;
  styleIndex: number;
};

type Lane = {
  index: number;
  direction: 'left' | 'right';
  speedLabel: string;
  phaseOffset: number;
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
  if (index < 3) {
    return 'slow';
  }
  if (index < 8) {
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

function laneTrafficCount() {
  return 1;
}

function baseMultiplierForLane(index: number) {
  const laneNumber = index + 1;
  const ramp = 1 + laneNumber / 9.5;
  return Number(Math.pow(ramp, 1.78).toFixed(2));
}

function laneSpeedForIndex(index: number, difficulty: DifficultyKey) {
  const baseSpeed = durationForLabel(speedLabelForLane(index)) * DIFFICULTIES[difficulty].speedFactor;
  const laneRamp = Math.max(0.32, 1 - index * 0.055);
  const speedFloor = difficulty === 'extreme' ? 0.9 : difficulty === 'hard' ? 1.15 : 1.45;
  return Math.max(speedFloor, baseSpeed * laneRamp);
}

const CAR_STYLES = [
  {
    body: 'from-[#7dd7ff] via-[#3a8fff] to-[#1d4bce]',
    roof: 'bg-[#d9f5ff]',
    glass: 'from-[#e9fbff] to-[#7bd6ff]',
    accent: 'bg-[#77f3ff]',
    underglow: 'shadow-[0_14px_28px_rgba(64,143,255,0.32)]',
  },
  {
    body: 'from-[#ffe36a] via-[#ffb649] to-[#ff7b2f]',
    roof: 'bg-[#fff5cb]',
    glass: 'from-[#fff8dc] to-[#ffd27d]',
    accent: 'bg-[#ffd054]',
    underglow: 'shadow-[0_14px_28px_rgba(255,166,74,0.32)]',
  },
  {
    body: 'from-[#ff9dc3] via-[#ff6e8c] to-[#e63562]',
    roof: 'bg-[#ffe1ec]',
    glass: 'from-[#fff0f6] to-[#ffa7bf]',
    accent: 'bg-[#ffcade]',
    underglow: 'shadow-[0_14px_28px_rgba(255,99,143,0.28)]',
  },
  {
    body: 'from-[#8ef5d6] via-[#27d3b1] to-[#0b9c85]',
    roof: 'bg-[#d8fff3]',
    glass: 'from-[#edfff9] to-[#87f5d8]',
    accent: 'bg-[#72f0cd]',
    underglow: 'shadow-[0_14px_28px_rgba(39,211,177,0.28)]',
  },
  {
    body: 'from-[#c8a5ff] via-[#9463ff] to-[#5a2bd8]',
    roof: 'bg-[#efe5ff]',
    glass: 'from-[#f6f1ff] to-[#cbaeff]',
    accent: 'bg-[#d5c0ff]',
    underglow: 'shadow-[0_14px_28px_rgba(125,88,255,0.28)]',
  },
];

function createRunLanes(difficulty: DifficultyKey) {
  return Array.from({ length: LANE_COUNT }, (_, laneIndex) => {
    const direction = laneIndex % 2 === 0 ? 'left' : 'right';
    const speedLabel = speedLabelForLane(laneIndex);
    const carCount = laneTrafficCount();
    const laneSpeed = laneSpeedForIndex(laneIndex, difficulty);
    const phaseOffset = laneIndex * 0.47 + randomBetween(0.18, 1.05);
    const cars = Array.from({ length: carCount }, (_, carIndex) => {
      const width = randomBetween(18, 22);
      return {
        id: `${laneIndex}-${carIndex}-${Math.round(Math.random() * 100000)}`,
        laneIndex,
        width,
        speed: laneSpeed,
        styleIndex: (laneIndex + carIndex) % CAR_STYLES.length,
      };
    });

    return {
      index: laneIndex,
      direction,
      speedLabel,
      phaseOffset,
      cars,
    };
  });
}

function currentCarLeft(lane: Lane, car: TrafficCar, elapsedSeconds: number) {
  const from = lane.direction === 'left' ? TRAFFIC_LEFT_START : TRAFFIC_RIGHT_START;
  const to = lane.direction === 'left' ? TRAFFIC_LEFT_END : TRAFFIC_RIGHT_END;
  const progress = ((elapsedSeconds + lane.phaseOffset) % car.speed) / car.speed;
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

function TrafficVehicle({ car, direction }: { car: TrafficCar; direction: Lane['direction'] }) {
  const style = CAR_STYLES[car.styleIndex];

  return (
    <div className={cn('relative h-full w-full', direction === 'right' ? 'scale-x-[-1]' : '')}>
      <div className="absolute inset-x-[10%] bottom-[-5px] h-3 rounded-full bg-black/55 blur-[2px]" />
      <div className={cn('absolute inset-x-0 top-[3px] bottom-[4px] rounded-[16px] border border-white/20 bg-gradient-to-br', style.body, style.underglow)}>
        <div className="absolute inset-x-[14%] top-[5px] h-[11px] rounded-full bg-white/16 blur-[1px]" />
        <div className="absolute left-[18%] right-[18%] top-[6px] h-[15px] rounded-[12px] border border-white/35 bg-gradient-to-b shadow-[inset_0_1px_0_rgba(255,255,255,0.6)]" style={{ backgroundImage: `linear-gradient(180deg, var(--tw-gradient-stops))` }} />
        <div className={cn('absolute left-[23%] right-[23%] top-[6px] h-[14px] rounded-[11px] border border-white/25 bg-gradient-to-b', style.glass)} />
        <div className={cn('absolute left-[31%] right-[31%] top-[2px] h-[8px] rounded-full', style.roof)} />
        <div className={cn('absolute inset-y-[12px] left-[14%] w-[7%] rounded-full shadow-[0_0_12px_rgba(255,245,196,0.85)]', style.accent)} />
        <div className="absolute inset-y-[12px] right-[12%] w-[6%] rounded-full bg-[#ff8b74] shadow-[0_0_10px_rgba(255,122,107,0.55)]" />
        <div className="absolute left-[12%] right-[12%] bottom-[8px] h-[4px] rounded-full bg-black/20" />
        <div className="absolute left-[10%] top-[19px] h-[3px] w-[14%] rounded-full bg-black/18" />
        <div className="absolute right-[10%] top-[19px] h-[3px] w-[12%] rounded-full bg-black/18" />
      </div>
      <div className="absolute bottom-0 left-[15%] h-[8px] w-[16%] rounded-full bg-[#0b0c10]" />
      <div className="absolute bottom-0 right-[15%] h-[8px] w-[16%] rounded-full bg-[#0b0c10]" />
    </div>
  );
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
  const animationEpochRef = useRef(typeof performance !== 'undefined' ? performance.now() : Date.now());
  const [screenShake, setScreenShake] = useState(false);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);

  const progress = Math.max(0, resolvedLane + 1);
  const nextLaneIndex = resolvedLane + 1;
  const laneMultipliers = useMemo(
    () =>
      Array.from({ length: LANE_COUNT }, (_, index) =>
        Number((baseMultiplierForLane(index) * DIFFICULTIES[difficulty].payoutBoost).toFixed(2))
      ),
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

  useEffect(() => {
    let frameId = 0;

    const tick = () => {
      const now = typeof performance !== 'undefined' ? performance.now() : Date.now();
      setElapsedSeconds((now - animationEpochRef.current) / 1000);
      frameId = window.requestAnimationFrame(tick);
    };

    frameId = window.requestAnimationFrame(tick);
    return () => window.cancelAnimationFrame(frameId);
  }, []);

  const startRun = () => {
    if (!subtractBalance(bet)) {
      return;
    }

    setLanes(createRunLanes(difficulty));
    setRunState('playing');
    setResolvedLane(-1);
    setFlashTone(null);
    setShowImpact(false);
    setStatus(`${DIFFICULTIES[difficulty].label} traffic is live. Jump into lane 1 when you are ready.`);
  };

  const resetRun = () => {
    setLanes(createRunLanes(difficulty));
    setRunState('idle');
    setResolvedLane(-1);
    setFlashTone(null);
    setShowImpact(false);
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
      const now = typeof performance !== 'undefined' ? performance.now() : Date.now();
      const currentElapsedSeconds = (now - animationEpochRef.current) / 1000;
      const survived = !chickenIsHitByTraffic(lane, currentElapsedSeconds);

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
    <div className="mx-auto flex max-w-6xl flex-col gap-6 p-4 lg:grid lg:grid-cols-4">
      <div className="flex flex-col gap-4 rounded-[28px] border border-white/10 bg-[linear-gradient(180deg,#141922_0%,#0d1117_100%)] p-6 shadow-[0_24px_60px_rgba(0,0,0,0.28)] lg:col-span-1">
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
           <div className="mt-1 text-[11px] text-white/35">Hit all 30 jumps and the final lane pays {laneMultipliers[laneMultipliers.length - 1].toFixed(2)}x.</div>
         </div>
      </div>

      <div className="rounded-[30px] border border-white/10 bg-[linear-gradient(180deg,#10151c_0%,#0b0f15_100%)] p-5 shadow-[0_28px_70px_rgba(0,0,0,0.3)] md:p-7 lg:col-span-3">
        <div className="mb-5 flex items-center justify-between gap-4">
          <div>
            <div className="text-[10px] font-black uppercase tracking-[0.22em] text-[#9BE7FF]">Chicken Road</div>
            <div className="mt-1 text-sm text-white/45">Arcade-style sprint with heavier traffic, neon-laced roads, and cleaner visual reads on every jump.</div>
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
          className="relative min-h-[1100px] overflow-hidden rounded-[32px] border border-white/10 bg-[linear-gradient(180deg,#112538_0%,#0b1219_34%,#0b0f14_100%)]"
        >
          <div className="absolute inset-x-0 top-0 h-[34%] bg-[radial-gradient(circle_at_50%_0%,rgba(130,200,255,0.26),transparent_58%)]" />
          <div className="absolute inset-0 opacity-30" style={{ backgroundImage: 'linear-gradient(rgba(255,255,255,0.02) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.02) 1px, transparent 1px)', backgroundSize: '48px 48px' }} />
          <div className="absolute inset-x-0 top-0 h-[34%] opacity-70" style={{ backgroundImage: 'radial-gradient(circle at 12% 18%, rgba(255,255,255,0.92) 0 1px, transparent 1.4px), radial-gradient(circle at 72% 28%, rgba(255,255,255,0.8) 0 1px, transparent 1.5px), radial-gradient(circle at 48% 48%, rgba(155,231,255,0.9) 0 1px, transparent 1.5px)', backgroundSize: '260px 160px' }} />
          <div className="absolute left-6 top-8 h-20 w-20 rounded-full bg-[#7de7ff]/10 blur-3xl" />
          <div className="absolute right-6 top-20 h-24 w-24 rounded-full bg-[#00FF88]/8 blur-3xl" />
          <div className="absolute inset-x-[8%] top-[32px] flex items-start justify-between text-[10px] font-black uppercase tracking-[0.28em] text-white/35">
            <div className="rounded-full border border-white/10 bg-black/20 px-4 py-2">Night Run</div>
            <div className="rounded-full border border-[#00FF88]/20 bg-[#00FF88]/8 px-4 py-2 text-[#9effcb]">Traffic Hot</div>
          </div>

          <motion.div
            className="absolute inset-x-0 top-0"
            animate={{ y: CHICKEN_Y - roadTranslateY }}
            transition={{ duration: runState === 'jumping' ? 0.52 : 0.48, ease: [0.2, 0.8, 0.2, 1] }}
          >
              <div className="absolute inset-x-0 top-0 h-[250px] bg-[linear-gradient(180deg,#244f38_0%,#13271a_100%)]" />
              <div className="absolute inset-x-0 top-0 h-[146px] bg-[linear-gradient(180deg,#2f6e49_0%,#1a3624_100%)]" />
              <div className="absolute inset-x-0 top-[146px] h-[20px] bg-[linear-gradient(180deg,#bcc6cf_0%,#8794a0_100%)] shadow-[0_8px_16px_rgba(0,0,0,0.25)]" />
              <div className="absolute left-1/2 top-[30px] h-[84px] w-[210px] -translate-x-1/2 rounded-[38px] border border-white/10 bg-[linear-gradient(180deg,#334e3a_0%,#1b2e22_100%)] shadow-[0_18px_30px_rgba(0,0,0,0.22)]" />
              <div className="absolute left-1/2 top-[54px] h-[18px] w-[112px] -translate-x-1/2 rounded-full bg-[#0a0f13]/30 blur-sm" />
              <div className="absolute left-1/2 top-[112px] h-9 w-[3px] -translate-x-1/2 bg-white/20" />
              <div className="absolute left-[10%] top-[42px] h-16 w-16 rounded-[18px] border border-white/10 bg-[linear-gradient(180deg,#355745_0%,#1a2a21_100%)] shadow-[0_14px_30px_rgba(0,0,0,0.24)]" />
              <div className="absolute left-[11.6%] top-[50px] h-6 w-6 rounded-full bg-[#f7d66a] shadow-[0_0_20px_rgba(255,215,106,0.38)]" />
              <div className="absolute left-[18%] top-[48px] h-4 w-10 rounded-full bg-[#0a1117]/40" />
              <div className="absolute right-[10%] top-[34px] rounded-[20px] border border-[#9BE7FF]/20 bg-[#0b1015]/40 px-5 py-4 text-right shadow-[0_16px_32px_rgba(0,0,0,0.24)] backdrop-blur-sm">
                <div className="text-[9px] font-black uppercase tracking-[0.24em] text-[#9BE7FF]">Jackpot Lane</div>
                <div className="mt-1 text-lg font-black text-white">{laneMultipliers[laneMultipliers.length - 1].toFixed(2)}x</div>
                <div className="text-[10px] text-white/35">30 jumps clean</div>
              </div>
              {Array.from({ length: 7 }).map((_, index) => (
                <div
                  key={`tree-${index}`}
                  className="absolute rounded-full bg-[linear-gradient(180deg,#5ad28f_0%,#218857_100%)] shadow-[0_10px_24px_rgba(0,0,0,0.22)]"
                  style={{
                    left: `${8 + index * 13}%`,
                    top: `${22 + (index % 2) * 18}px`,
                    width: `${20 + (index % 3) * 8}px`,
                    height: `${20 + (index % 3) * 8}px`,
                  }}
                />
              ))}

             {lanes.map((lane, index) => {
               const laneTop = START_ZONE_HEIGHT + index * LANE_HEIGHT;
               const laneState = index < progress ? 'cleared' : index === nextLaneIndex && (runState === 'playing' || runState === 'jumping') ? 'active' : 'idle';
               const laneMultiplier = laneMultipliers[index];

               return (
                  <div key={lane.index} className="absolute left-0 right-0 h-[52px]" style={{ top: laneTop }}>
                  <div className="absolute inset-x-0 top-0 h-[4px] bg-[linear-gradient(90deg,transparent,rgba(255,255,255,0.18),transparent)]" />
                  <div className="absolute inset-0 bg-[linear-gradient(180deg,#2b3139_0%,#20262d_100%)] border-y border-white/5" />
                  <div className="absolute inset-y-[7px] left-[3%] w-[3px] rounded-full bg-[#ffd766]/55 shadow-[0_0_14px_rgba(255,215,102,0.28)]" />
                  <div className="absolute inset-y-[7px] right-[3%] w-[3px] rounded-full bg-[#ffd766]/55 shadow-[0_0_14px_rgba(255,215,102,0.28)]" />
                  <div className="absolute inset-y-[24px] left-0 right-0 border-t border-dashed border-white/10" />
                  <div className="absolute left-[10%] top-1/2 h-[4px] w-[14%] -translate-y-1/2 rounded-full bg-white/10" />
                  <div className="absolute right-[10%] top-1/2 h-[4px] w-[14%] -translate-y-1/2 rounded-full bg-white/10" />
                  <div
                    className={cn(
                      'absolute inset-0 rounded-2xl transition-all duration-300',
                      laneState === 'cleared' ? 'bg-[#00FF88]/12 shadow-[0_0_20px_rgba(0,255,136,0.08)]' : laneState === 'active' ? 'bg-[#9BE7FF]/10' : 'bg-transparent',
                      runState === 'lost' && nextLaneIndex === index ? 'bg-red-500/12' : ''
                    )}
                  />
                  <div className="absolute left-4 top-1/2 -translate-y-1/2 rounded-full border border-white/10 bg-black/20 px-2.5 py-1 text-[9px] font-black uppercase tracking-[0.18em] text-white/35">
                    Lane {index + 1}
                  </div>
                  <div className="absolute right-4 top-1/2 -translate-y-1/2 rounded-full border border-white/10 bg-black/20 px-2.5 py-1 text-[9px] font-black uppercase tracking-[0.18em] text-[#9BE7FF]">
                    {laneMultiplier.toFixed(2)}x
                  </div>

                  {index < progress ? (
                    <div className="absolute inset-0">
                      <div className="absolute inset-y-0 left-[18%] w-[12px] rounded-full bg-[linear-gradient(180deg,#ffec9d_0%,#ffb02e_100%)] shadow-[0_0_16px_rgba(255,208,86,0.35)]" />
                      <div className="absolute inset-y-0 right-[18%] w-[12px] rounded-full bg-[linear-gradient(180deg,#ffec9d_0%,#ffb02e_100%)] shadow-[0_0_16px_rgba(255,208,86,0.35)]" />
                      <div className="absolute left-[22%] right-[22%] top-1/2 h-[14px] -translate-y-1/2 rounded-full border border-[#ffd76a]/50 bg-[repeating-linear-gradient(-45deg,#ffcb45_0_12px,#10151c_12px_24px)] shadow-[0_10px_24px_rgba(255,207,77,0.2)]" />
                    </div>
                  ) : lane.cars.map((car) => {
                    return (
                      <div
                        key={car.id}
                        className="absolute top-[6px] h-[40px]"
                        style={{ width: `${car.width}%`, left: `${currentCarLeft(lane, car, elapsedSeconds)}%` }}
                      >
                        <TrafficVehicle car={car} direction={lane.direction} />
                      </div>
                    );
                  })}
                </div>
              );
            })}
          </motion.div>

          <div className="absolute inset-x-0 top-[160px] h-[4px] bg-white/5" />
          <div className="absolute inset-x-[6%] bottom-5 flex items-center justify-between rounded-[22px] border border-white/10 bg-black/18 px-5 py-3 text-[10px] font-black uppercase tracking-[0.2em] text-white/35 backdrop-blur-sm">
            <span>Use jump to lock the next lane</span>
            <span className="text-[#00FF88]">Higher lanes run faster</span>
          </div>

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
                  'relative h-[76px] w-[78px] rounded-[28px] border shadow-[0_18px_35px_rgba(0,0,0,0.32)]',
                  runState === 'lost'
                    ? 'border-red-300/40 bg-[linear-gradient(180deg,#ffb0b0_0%,#ff5555_100%)]'
                    : 'border-yellow-100/50 bg-[linear-gradient(180deg,#fff7b7_0%,#ffd95c_100%)]'
                )}
              >
                <div className="absolute left-[16px] top-[18px] h-2.5 w-2.5 rounded-full bg-[#20180b]" />
                <div className="absolute right-[16px] top-[18px] h-2.5 w-2.5 rounded-full bg-[#20180b]" />
                <div className="absolute left-1/2 top-[33px] h-3.5 w-4 -translate-x-1/2 rounded-full bg-[#f7921e]/90" />
                <div className="absolute left-[8px] top-[24px] h-6 w-4 rounded-full bg-[#fffbe0]/72" />
                <div className="absolute right-[8px] top-[24px] h-6 w-4 rounded-full bg-[#fffbe0]/72" />
                <div className="absolute left-[11px] top-[-6px] h-4 w-4 rounded-[8px] bg-[#ffea91]" />
                <div className="absolute right-[11px] top-[-6px] h-4 w-4 rounded-[8px] bg-[#ffea91]" />
                <div className="absolute left-[18px] top-[52px] h-[10px] w-[8px] rounded-b-full bg-[#d88934]" />
                <div className="absolute right-[18px] top-[52px] h-[10px] w-[8px] rounded-b-full bg-[#d88934]" />
                <div className="absolute left-1/2 top-[8px] h-2 w-5 -translate-x-1/2 rounded-full bg-white/25 blur-[1px]" />
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
