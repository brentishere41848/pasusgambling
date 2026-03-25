import React, { useEffect, useMemo, useRef, useState } from 'react';
import { motion } from 'motion/react';
import { ArrowLeft, ArrowRight, ArrowUp, Flag, Play, RotateCcw } from 'lucide-react';
import confetti from 'canvas-confetti';
import { useBalance } from '../../context/BalanceContext';
import { logBetActivity } from '../../lib/activity';
import { cn } from '../../lib/utils';
import { GameStatsBar, QuickBetButtons, useLocalGameStats } from './GameHooks';

type LaneType = 'road' | 'safe';

type CarSprite = '/assets/car.png' | '/assets/car_01.png' | '/assets/car_02.png' | '/assets/car_03.png' | '/assets/car_04.png';

type Car = {
  id: string;
  x: number;
  width: number;
  sprite: CarSprite;
};

type Lane = {
  id: string;
  type: LaneType;
  direction: 1 | -1;
  speed: number;
  cars: Car[];
};

const BOARD_WIDTH = 420;
const BOARD_HEIGHT = 576;
const LANE_HEIGHT = 64;
const VISIBLE_LANES = 9;
const PLAYER_ROW = 7;
const COLS = 5;
const COL_WIDTH = BOARD_WIDTH / COLS;
const PLAYER_SIZE = 44;
const PLAYER_Y = PLAYER_ROW * LANE_HEIGHT + 10;
const MIN_BET = 0.01;
const CAR_SPRITES: CarSprite[] = ['/assets/car.png', '/assets/car_01.png', '/assets/car_02.png', '/assets/car_03.png', '/assets/car_04.png'];

const createSafeLane = (index: number): Lane => ({
  id: `safe-${index}-${Math.random().toString(36).slice(2, 8)}`,
  type: 'safe',
  direction: 1,
  speed: 0,
  cars: [],
});

const randomSprite = () => CAR_SPRITES[Math.floor(Math.random() * CAR_SPRITES.length)];

const createRoadLane = (index: number): Lane => {
  const direction = Math.random() > 0.5 ? 1 : -1;
  const speed = 1.8 + Math.random() * 1.9 + Math.min(index * 0.05, 2.2);
  const carCount = 2 + (index > 8 ? 1 : 0);
  const segment = BOARD_WIDTH / carCount;
  const cars = Array.from({ length: carCount }, (_, i) => {
    const width = 48 + Math.random() * 24;
    return {
      id: `car-${index}-${i}-${Math.random().toString(36).slice(2, 8)}`,
      x: i * segment + Math.random() * 30,
      width,
      sprite: randomSprite(),
    };
  });

  return {
    id: `road-${index}-${Math.random().toString(36).slice(2, 8)}`,
    type: 'road',
    direction,
    speed,
    cars,
  };
};

const createLane = (index: number): Lane => {
  if (index <= 1 || index % 4 === 0) {
    return createSafeLane(index);
  }
  return createRoadLane(index);
};

const createInitialLanes = () => Array.from({ length: VISIBLE_LANES }, (_, i) => createLane(i));

const getMultiplierForProgress = (progress: number) => Number(Math.max(1, Math.pow(1.18, progress)).toFixed(2));

export const ChickenRoadGame: React.FC = () => {
  const { balance, addBalance, subtractBalance } = useBalance();
  const [bet, setBet] = useState(1);
  const [lanes, setLanes] = useState<Lane[]>(() => createInitialLanes());
  const [playerCol, setPlayerCol] = useState(2);
  const [isRunning, setIsRunning] = useState(false);
  const [isCrashed, setIsCrashed] = useState(false);
  const [progress, setProgress] = useState(0);
  const [status, setStatus] = useState('Hop forward, avoid traffic, and cash out before the road wins.');
  const [lastPayout, setLastPayout] = useState<number | null>(null);
  const [bestRun, setBestRun] = useState(0);
  const { getStats, recordBet } = useLocalGameStats('chicken-road');
  const stats = getStats();

  const animationRef = useRef<number | null>(null);
  const runningRef = useRef(false);
  const crashedRef = useRef(false);
  const playerColRef = useRef(playerCol);
  const progressRef = useRef(progress);
  const betRef = useRef(bet);

  useEffect(() => { playerColRef.current = playerCol; }, [playerCol]);
  useEffect(() => { progressRef.current = progress; }, [progress]);
  useEffect(() => { betRef.current = bet; }, [bet]);
  useEffect(() => { runningRef.current = isRunning; }, [isRunning]);
  useEffect(() => { crashedRef.current = isCrashed; }, [isCrashed]);

  const currentMultiplier = useMemo(() => getMultiplierForProgress(progress), [progress]);
  const potentialPayout = useMemo(() => Number((bet * currentMultiplier).toFixed(2)), [bet, currentMultiplier]);

  const resetBoard = () => {
    setLanes(createInitialLanes());
    setPlayerCol(2);
    setProgress(0);
    setIsRunning(false);
    setIsCrashed(false);
    setLastPayout(null);
    setStatus('Board reset. Start a new run when ready.');
  };

  const endRunAsLoss = (detail: string) => {
    if (!runningRef.current || crashedRef.current) return;
    crashedRef.current = true;
    runningRef.current = false;
    setIsCrashed(true);
    setIsRunning(false);
    setStatus(detail);
    setBestRun((prev) => Math.max(prev, progressRef.current));
    logBetActivity({
      gameKey: 'chicken-road',
      wager: betRef.current,
      payout: 0,
      multiplier: 0,
      outcome: 'loss',
      detail: `Crashed after ${progressRef.current} hop${progressRef.current === 1 ? '' : 's'}`,
    });
    recordBet(betRef.current, 0, false);
  };

  useEffect(() => {
    const tick = () => {
      setLanes((prev) => {
        const next = prev.map((lane) => {
          if (lane.type !== 'road') return lane;
          return {
            ...lane,
            cars: lane.cars.map((car) => {
              let x = car.x + lane.speed * lane.direction;
              if (lane.direction === 1 && x > BOARD_WIDTH + car.width) x = -car.width;
              if (lane.direction === -1 && x < -car.width) x = BOARD_WIDTH + car.width;
              return { ...car, x };
            }),
          };
        });

        if (runningRef.current && !crashedRef.current) {
          const playerLeft = playerColRef.current * COL_WIDTH + (COL_WIDTH - PLAYER_SIZE) / 2 + 6;
          const playerRight = playerLeft + PLAYER_SIZE - 12;
          const lane = next[PLAYER_ROW];
          if (lane?.type === 'road') {
            const hit = lane.cars.some((car) => {
              const carLeft = car.x + 4;
              const carRight = car.x + car.width - 4;
              return playerRight > carLeft && playerLeft < carRight;
            });
            if (hit) {
              window.setTimeout(() => endRunAsLoss('Traffic got you. The run is over.'), 0);
            }
          }
        }

        return next;
      });

      animationRef.current = window.requestAnimationFrame(tick);
    };

    animationRef.current = window.requestAnimationFrame(tick);
    return () => {
      if (animationRef.current) window.cancelAnimationFrame(animationRef.current);
    };
  }, []);

  const startRun = () => {
    const safeBet = Number(Math.max(MIN_BET, bet).toFixed(2));
    if (isRunning || !subtractBalance(safeBet)) return;
    setBet(safeBet);
    betRef.current = safeBet;
    setLanes(createInitialLanes());
    setPlayerCol(2);
    setProgress(0);
    setLastPayout(null);
    setIsCrashed(false);
    setIsRunning(true);
    setStatus('Run started. Use W/Up to hop and A/D to sidestep traffic.');
  };

  const cashOut = () => {
    if (!isRunning || isCrashed) return;
    const payout = Number((betRef.current * getMultiplierForProgress(progressRef.current)).toFixed(2));
    addBalance(payout);
    setLastPayout(payout);
    setIsRunning(false);
    setBestRun((prev) => Math.max(prev, progressRef.current));
    setStatus(`Cashed out at ${getMultiplierForProgress(progressRef.current).toFixed(2)}x.`);
    if (progressRef.current >= 4) {
      confetti({ particleCount: 100, spread: 60, origin: { y: 0.6 } });
    }
    logBetActivity({
      gameKey: 'chicken-road',
      wager: betRef.current,
      payout,
      multiplier: getMultiplierForProgress(progressRef.current),
      outcome: payout > betRef.current ? 'win' : 'push',
      detail: `Cashed out after ${progressRef.current} hop${progressRef.current === 1 ? '' : 's'}`,
    });
    recordBet(betRef.current, payout, payout > betRef.current);
  };

  const moveHorizontal = (dir: -1 | 1) => {
    setPlayerCol((prev) => Math.max(0, Math.min(COLS - 1, prev + dir)));
  };

  const hopForward = () => {
    if (!isRunning || isCrashed) return;
    setLanes((prev) => {
      const nextIndex = progressRef.current + VISIBLE_LANES;
      return [createLane(nextIndex), ...prev.slice(0, prev.length - 1)];
    });
    setProgress((prev) => prev + 1);
    setStatus(`Clean hop. Multiplier now ${getMultiplierForProgress(progressRef.current + 1).toFixed(2)}x.`);
  };

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement | null)?.tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA') return;
      if (e.key === 'ArrowUp' || e.key.toLowerCase() === 'w') {
        e.preventDefault();
        if (isRunning) hopForward(); else startRun();
      }
      if (e.key === 'ArrowLeft' || e.key.toLowerCase() === 'a') {
        e.preventDefault();
        if (isRunning) moveHorizontal(-1);
      }
      if (e.key === 'ArrowRight' || e.key.toLowerCase() === 'd') {
        e.preventDefault();
        if (isRunning) moveHorizontal(1);
      }
      if (e.key === ' ' || e.key === 'Enter') {
        e.preventDefault();
        if (isRunning) cashOut();
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [isRunning, isCrashed]);

  return (
    <div className="flex flex-col lg:grid lg:grid-cols-4 gap-6 p-4 max-w-7xl mx-auto">
      <div className="lg:col-span-1 bg-[#11161d] border border-white/10 rounded-2xl p-6 flex flex-col gap-4">
        <div>
          <label className="text-xs uppercase tracking-widest text-white/40 mb-2 block">Bet Amount</label>
          <input
            type="number"
            value={bet}
            onChange={(e) => setBet(Math.max(MIN_BET, Number(e.target.value || MIN_BET)))}
            min="0.01"
            step="0.01"
            disabled={isRunning}
            className="w-full bg-black border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-[#00FF88]/50"
          />
          <QuickBetButtons balance={balance} bet={bet} onSetBet={(v) => setBet(Math.max(MIN_BET, Number(v.toFixed(2))))} disabled={isRunning} />
        </div>

        <div className="grid grid-cols-2 gap-2">
          <button
            onClick={isRunning ? cashOut : startRun}
            disabled={!isRunning && balance < bet}
            className="rounded-xl bg-[#00FF88] text-black py-3 font-black flex items-center justify-center gap-2 disabled:opacity-40"
          >
            {isRunning ? <Flag size={18} /> : <Play size={18} />}
            {isRunning ? 'Cash Out' : 'Start Run'}
          </button>
          <button
            onClick={resetBoard}
            className="rounded-xl bg-white/5 text-white py-3 font-black flex items-center justify-center gap-2 hover:bg-white/10"
          >
            <RotateCcw size={18} /> Reset
          </button>
        </div>

        <div className="grid grid-cols-3 gap-2">
          <button onClick={() => moveHorizontal(-1)} disabled={!isRunning} className="rounded-xl bg-white/5 text-white py-3 font-black flex items-center justify-center disabled:opacity-40"><ArrowLeft size={18} /></button>
          <button onClick={hopForward} disabled={!isRunning} className="rounded-xl bg-white text-black py-3 font-black flex items-center justify-center disabled:opacity-40"><ArrowUp size={18} /></button>
          <button onClick={() => moveHorizontal(1)} disabled={!isRunning} className="rounded-xl bg-white/5 text-white py-3 font-black flex items-center justify-center disabled:opacity-40"><ArrowRight size={18} /></button>
        </div>

        <div className="rounded-2xl border border-white/5 bg-black/30 p-4 space-y-2">
          <div className="flex items-center justify-between text-sm"><span className="text-white/50">Current Multiplier</span><span className="text-[#00FF88] font-black">{currentMultiplier.toFixed(2)}x</span></div>
          <div className="flex items-center justify-between text-sm"><span className="text-white/50">Potential Payout</span><span className="text-white font-black">${potentialPayout.toFixed(2)}</span></div>
          <div className="flex items-center justify-between text-sm"><span className="text-white/50">Hops Cleared</span><span className="text-white font-black">{progress}</span></div>
          <div className="flex items-center justify-between text-sm"><span className="text-white/50">Best Run</span><span className="text-white font-black">{bestRun}</span></div>
        </div>

        <div className="rounded-2xl border border-white/5 bg-white/[0.03] p-4">
          <div className="text-[11px] uppercase tracking-[0.2em] text-white/35 font-bold mb-2">How It Works</div>
          <p className="text-sm text-white/65 leading-6">
            Start a run, dodge the traffic, and hop deeper into the road. Every clean hop raises your payout. Cash out whenever you want - one hit and the bet is gone.
          </p>
        </div>
      </div>

      <div className="lg:col-span-3 space-y-4">
        <div className="rounded-3xl border border-white/10 bg-[#0b1016] p-3 md:p-5 overflow-hidden">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3 mb-4">
            <div>
              <div className="text-[11px] uppercase tracking-[0.3em] text-[#00FF88]/70 font-black">Chicken Road</div>
              <h2 className="text-2xl md:text-3xl font-black text-white mt-1">Cross the traffic. Keep the multiplier.</h2>
            </div>
            <div className="text-sm text-white/60">W/Arrow Up = hop, A/D = sidestep, Space = cash out</div>
          </div>

          <div className="mx-auto rounded-[28px] overflow-hidden border border-white/10 bg-black/40 shadow-2xl" style={{ width: BOARD_WIDTH, maxWidth: '100%' }}>
            <div className="relative" style={{ width: BOARD_WIDTH, height: BOARD_HEIGHT, maxWidth: '100%' }}>
              {lanes.map((lane, laneIndex) => (
                <div
                  key={lane.id}
                  className="absolute left-0 right-0 overflow-hidden"
                  style={{ top: laneIndex * LANE_HEIGHT, height: LANE_HEIGHT }}
                >
                  <div
                    className="absolute inset-0 bg-cover bg-center"
                    style={{ backgroundImage: `url(${lane.type === 'road' ? '/assets/road_texture.png' : '/assets/pavement.png'})`, opacity: lane.type === 'road' ? 0.95 : 0.85 }}
                  />
                  {lane.type === 'road' && <div className="absolute inset-0 bg-black/35" />}
                  <div className="absolute inset-x-0 top-0 h-px bg-white/10" />
                  <div className="absolute inset-x-0 bottom-0 h-px bg-black/30" />

                  {lane.type === 'road' && lane.cars.map((car) => (
                    <motion.img
                      key={car.id}
                      src={car.sprite}
                      alt="Traffic car"
                      className={cn('absolute top-1/2 -translate-y-1/2 object-contain drop-shadow-[0_10px_18px_rgba(0,0,0,0.5)]', lane.direction === -1 && 'scale-x-[-1]')}
                      style={{ left: car.x, width: car.width, height: 34 }}
                    />
                  ))}
                </div>
              ))}

              {Array.from({ length: COLS - 1 }).map((_, i) => (
                <div key={i} className="absolute top-0 bottom-0 w-px bg-white/5" style={{ left: (i + 1) * COL_WIDTH }} />
              ))}

              <motion.img
                key={`${playerCol}-${progress}-${isCrashed ? 'down' : 'up'}`}
                initial={{ y: 8, opacity: 0.9, scale: 0.95 }}
                animate={{ y: 0, opacity: isCrashed ? 0.55 : 1, scale: isCrashed ? 0.92 : 1 }}
                transition={{ duration: 0.18 }}
                src="/assets/chicken_sprite.png"
                alt="Chicken"
                className={cn('absolute object-contain drop-shadow-[0_16px_26px_rgba(0,0,0,0.55)]', isCrashed && 'grayscale')}
                style={{
                  left: playerCol * COL_WIDTH + (COL_WIDTH - PLAYER_SIZE) / 2,
                  top: PLAYER_Y,
                  width: PLAYER_SIZE,
                  height: PLAYER_SIZE,
                }}
              />

              {!isRunning && !isCrashed && progress === 0 && (
                <div className="absolute inset-0 bg-black/35 flex items-center justify-center">
                  <div className="rounded-2xl border border-white/10 bg-black/60 px-6 py-5 text-center backdrop-blur-sm">
                    <div className="text-[#00FF88] text-xs uppercase tracking-[0.3em] font-black mb-2">Ready</div>
                    <div className="text-white text-2xl font-black mb-1">Chicken Road</div>
                    <div className="text-white/60 text-sm">Start your run and build the multiplier one lane at a time.</div>
                  </div>
                </div>
              )}

              {isCrashed && (
                <div className="absolute inset-0 bg-black/45 flex items-center justify-center">
                  <div className="rounded-2xl border border-red-500/20 bg-black/70 px-6 py-5 text-center backdrop-blur-sm">
                    <div className="text-red-400 text-xs uppercase tracking-[0.3em] font-black mb-2">Busted</div>
                    <div className="text-white text-2xl font-black mb-1">Traffic Wins</div>
                    <div className="text-white/60 text-sm">You cleared {progress} hop{progress === 1 ? '' : 's'}. Reset or start another run.</div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        <GameStatsBar
          stats={[
            { label: 'Status', value: status },
            { label: 'Total Bets', value: String(stats.totalBets) },
            { label: 'Biggest Win', value: `$${stats.biggestWin.toFixed(2)}` },
            { label: 'Last Cashout', value: lastPayout === null ? '$0.00' : `$${lastPayout.toFixed(2)}` },
          ]}
        />
      </div>
    </div>
  );
};
