import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { motion, useAnimation } from 'motion/react';
import { useBalance } from '../../context/BalanceContext';
import { cn } from '../../lib/utils';
import { Play, RotateCcw, Zap, Timer } from 'lucide-react';
import confetti from 'canvas-confetti';
import { logBetActivity } from '../../lib/activity';
import { QuickBetButtons, MobileBetControls, GameStatsBar, useLocalGameStats, centsToDollars, dollarsToCents, formatCents, MIN_BET } from './GameHooks';

const NUMBERS = [
  0, 32, 15, 19, 4, 21, 2, 25, 17, 34, 6, 27, 13, 36, 11, 30, 8, 23, 10, 5, 24, 16, 33, 1, 20, 14, 31, 9, 22, 18, 29, 7, 28, 12, 35, 3, 26,
];

const TABLE_LAYOUT = Array.from({ length: 12 }, (_, row) => [3 + row * 3, 2 + row * 3, 1 + row * 3]);
const SLOT_ANGLE = 360 / NUMBERS.length;
const ZERO_WEIGHT = 0.2;

type BetType =
  | { kind: 'straight'; value: number; label: string; payout: number }
  | { kind: 'color'; value: 'red' | 'black'; label: string; payout: number }
  | { kind: 'parity'; value: 'even' | 'odd'; label: string; payout: number }
  | { kind: 'range'; value: 'low' | 'high'; label: string; payout: number }
  | { kind: 'dozen'; value: 1 | 2 | 3; label: string; payout: number }
  | { kind: 'column'; value: 1 | 2 | 3; label: string; payout: number }
  | { kind: 'green'; label: string; payout: number };

const getColor = (num: number) => {
  if (num === 0) return 'green';
  const red = [1, 3, 5, 7, 9, 12, 14, 16, 18, 19, 21, 23, 25, 27, 30, 32, 34, 36];
  return red.includes(num) ? 'red' : 'black';
};

const isBetWinner = (bet: BetType, result: number) => {
  switch (bet.kind) {
    case 'straight':
      return result === bet.value;
    case 'color':
      return getColor(result) === bet.value;
    case 'parity':
      return result !== 0 && (bet.value === 'even' ? result % 2 === 0 : result % 2 !== 0);
    case 'range':
      return bet.value === 'low' ? result >= 1 && result <= 18 : result >= 19 && result <= 36;
    case 'dozen':
      return result >= (bet.value - 1) * 12 + 1 && result <= bet.value * 12;
    case 'column':
      return result !== 0 && ((result - bet.value) % 3 === 0);
    case 'green':
      return result === 0;
    default:
      return false;
  }
};

function normalizeAngle(angle: number) {
  return ((angle % 360) + 360) % 360;
}

function chooseWeightedPocketIndex() {
  const weights = NUMBERS.map((value) => (value === 0 ? ZERO_WEIGHT : 1));
  const total = weights.reduce((sum, value) => sum + value, 0);
  let roll = Math.random() * total;

  for (let index = 0; index < weights.length; index += 1) {
    roll -= weights[index];
    if (roll <= 0) {
      return index;
    }
  }

  return weights.length - 1;
}

function getPocketIndexFromAngles(wheelRotation: number, ballRotation: number) {
  const relativeAngle = normalizeAngle(ballRotation - wheelRotation);
  return Math.round(relativeAngle / SLOT_ANGLE) % NUMBERS.length;
}

export const RouletteGame: React.FC = () => {
  const { balance, addBalance, subtractBalance } = useBalance();
  const [bet, setBet] = useState(1);
  const [selectedBet, setSelectedBet] = useState<BetType>({ kind: 'color', value: 'red', label: 'Red', payout: 1.8 });
  const [isSpinning, setIsSpinning] = useState(false);
  const [isAuto, setIsAuto] = useState(false);
  const [isFast, setIsFast] = useState(false);
  const [autoRounds, setAutoRounds] = useState(10);
  const [remainingRounds, setRemainingRounds] = useState(0);
  const [lastResult, setLastResult] = useState<number | null>(null);
  const [history, setHistory] = useState<number[]>([]);
  const [statusText, setStatusText] = useState('Select a bet and spin');
  const wheelControls = useAnimation();
  const ballControls = useAnimation();
  const wheelRotationRef = useRef(0);
  const ballRotationRef = useRef(0);
  const { getStats, recordBet } = useLocalGameStats('roulette');
  const stats = getStats();
  const betCents = dollarsToCents(bet);

  const straightOptions = useMemo(
    () => Array.from({ length: 37 }, (_, index) => index),
    []
  );

  const spin = useCallback(async () => {
    if (isSpinning) {
      return;
    }

    if (!subtractBalance(betCents)) {
      setIsAuto(false);
      setRemainingRounds(0);
      setStatusText('Insufficient balance');
      return;
    }

    setIsSpinning(true);
    setStatusText(`Spinning for ${selectedBet.label}`);

    const chosenPocketIndex = chooseWeightedPocketIndex();
    const wheelTurns = isFast ? 4 : 7;
    const ballTurns = isFast ? 6 : 10;
    const wheelDrift = Math.random() * 360;
    const pocketJitter = (Math.random() - 0.5) * SLOT_ANGLE * 0.24;
    const targetWheel = wheelRotationRef.current - wheelTurns * 360 - wheelDrift;
    const targetBall =
      ballRotationRef.current +
      ballTurns * 360 +
      wheelDrift +
      chosenPocketIndex * SLOT_ANGLE +
      pocketJitter;

    await Promise.all([
      wheelControls.start({
        rotate: targetWheel,
        transition: {
          duration: isFast ? 1.2 : 4.2,
          ease: [0.16, 0.74, 0.18, 1],
        },
      }),
      ballControls.start({
        rotate: targetBall,
        transition: {
          duration: isFast ? 1.1 : 3.6,
          ease: [0.12, 0.82, 0.2, 1],
        },
      }),
    ]);

    wheelRotationRef.current = targetWheel;
    ballRotationRef.current = targetBall;
    const landedPocketIndex = getPocketIndexFromAngles(targetWheel, targetBall);
    const result = NUMBERS[landedPocketIndex];

    const won = isBetWinner(selectedBet, result);
    const payout = won ? Math.round(betCents * selectedBet.payout) : 0;

    setLastResult(result);
    setHistory((prev) => [result, ...prev].slice(0, 8));

    if (won) {
      addBalance(payout);
      setStatusText(`${selectedBet.label} wins on ${result}`);
      logBetActivity({ gameKey: 'roulette', wager: betCents, payout, multiplier: selectedBet.payout, outcome: 'win', detail: `Landed on ${result}` });
      recordBet(betCents, payout, true);
      if (!isFast) {
        confetti({ particleCount: 90, spread: 65, origin: { y: 0.6 } });
      }
    } else {
      setStatusText(`Ball landed on ${result}`);
      logBetActivity({ gameKey: 'roulette', wager: betCents, payout: 0, multiplier: 0, outcome: 'loss', detail: `Landed on ${result}` });
      recordBet(betCents, 0, false);
    }

    setIsSpinning(false);

    if (isAuto && remainingRounds > 1) {
      setRemainingRounds((prev) => prev - 1);
    } else if (isAuto) {
      setIsAuto(false);
      setRemainingRounds(0);
    }
  }, [addBalance, ballControls, betCents, isAuto, isFast, isSpinning, remainingRounds, selectedBet, subtractBalance, wheelControls]);

  useEffect(() => {
    if (isAuto && remainingRounds > 0 && !isSpinning) {
      const timer = setTimeout(spin, isFast ? 180 : 850);
      return () => clearTimeout(timer);
    }
  }, [isAuto, remainingRounds, isSpinning, spin, isFast]);

  const toggleAuto = () => {
    if (isAuto) {
      setIsAuto(false);
      setRemainingRounds(0);
      setStatusText('Auto stopped');
    } else {
      setIsAuto(true);
      setRemainingRounds(autoRounds);
      setStatusText(`Auto armed for ${autoRounds} spins`);
    }
  };

  const outsideBets: BetType[] = [
    { kind: 'range', value: 'low', label: '1 - 18', payout: 1.8 },
    { kind: 'color', value: 'red', label: 'Red', payout: 1.8 },
    { kind: 'color', value: 'black', label: 'Black', payout: 1.8 },
    { kind: 'range', value: 'high', label: '19 - 36', payout: 1.8 },
    { kind: 'parity', value: 'even', label: 'Even', payout: 1.8 },
    { kind: 'parity', value: 'odd', label: 'Odd', payout: 1.8 },
  ];

  const dozenBets: BetType[] = [
    { kind: 'dozen', value: 1, label: '1st 12', payout: 2.8 },
    { kind: 'dozen', value: 2, label: '2nd 12', payout: 2.8 },
    { kind: 'dozen', value: 3, label: '3rd 12', payout: 2.8 },
  ];

  const columnBets: BetType[] = [
    { kind: 'column', value: 1, label: 'Column 1', payout: 2.8 },
    { kind: 'column', value: 2, label: 'Column 2', payout: 2.8 },
    { kind: 'column', value: 3, label: 'Column 3', payout: 2.8 },
  ];

  const isBetSelected = (betOption: BetType) => JSON.stringify(betOption) === JSON.stringify(selectedBet);

  return (
    <div className="flex flex-col lg:grid lg:grid-cols-[1.1fr_0.9fr] gap-6 p-4 md:p-5 max-w-7xl mx-auto">
      <div className="bg-[linear-gradient(180deg,#1c1010_0%,#120c0c_100%)] border border-rose-300/20 rounded-3xl p-5 space-y-5 shadow-[0_20px_70px_rgba(0,0,0,0.38)]">
        <div className="flex items-center justify-between gap-4">
          <div>
            <div className="text-[10px] uppercase tracking-[0.22em] text-[#00FF88] font-black">Roulette Table</div>
            <div className="text-2xl font-black italic tracking-tight">Single-bet European board</div>
          </div>
          <div className="rounded-2xl border border-white/10 bg-black/30 px-4 py-3 text-right">
            <div className="text-[10px] uppercase tracking-[0.2em] text-white/30">Selected</div>
            <div className="text-sm font-black">{selectedBet.label}</div>
            <div className="text-[11px] text-[#00FF88]">{selectedBet.payout.toFixed(1)}x payout</div>
          </div>
        </div>

        <div className="grid grid-cols-[72px_1fr] gap-3">
          <button
            onClick={() => setSelectedBet({ kind: 'green', label: 'Zero', payout: 30 })}
            disabled={isSpinning || isAuto}
            className={cn(
              'rounded-2xl border py-6 text-sm font-black transition-all',
              isBetSelected({ kind: 'green', label: 'Zero', payout: 30 })
                ? 'border-white bg-[#00FF88] text-black'
                : 'border-[#00FF88]/30 bg-[#00FF88]/15 text-[#00FF88]'
            )}
          >
            0
          </button>
          <div className="grid grid-cols-3 gap-2">
            {TABLE_LAYOUT.flat().map((number) => (
              <button
                key={number}
                onClick={() => setSelectedBet({ kind: 'straight', value: number, label: `Straight ${number}`, payout: 30 })}
                disabled={isSpinning || isAuto}
                className={cn(
                  'rounded-xl border py-3 text-sm font-black transition-all',
                  getColor(number) === 'red' ? 'bg-red-600/85 text-white' : 'bg-black text-white',
                  isBetSelected({ kind: 'straight', value: number, label: `Straight ${number}`, payout: 30 })
                    ? 'border-white shadow-[0_0_20px_rgba(255,255,255,0.18)]'
                    : 'border-white/10'
                )}
              >
                {number}
              </button>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-3 gap-2">
          {dozenBets.map((betOption) => (
            <button
              key={betOption.label}
              onClick={() => setSelectedBet(betOption)}
              disabled={isSpinning || isAuto}
              className={cn(
                'rounded-2xl border px-4 py-3 text-xs font-black uppercase tracking-[0.16em] transition-all',
                isBetSelected(betOption) ? 'border-[#00FF88] bg-[#00FF88]/15 text-[#00FF88]' : 'border-white/10 bg-white/5 text-white/50'
              )}
            >
              {betOption.label}
            </button>
          ))}
        </div>

        <div className="grid grid-cols-3 gap-2">
          {columnBets.map((betOption) => (
            <button
              key={betOption.label}
              onClick={() => setSelectedBet(betOption)}
              disabled={isSpinning || isAuto}
              className={cn(
                'rounded-2xl border px-4 py-3 text-xs font-black uppercase tracking-[0.16em] transition-all',
                isBetSelected(betOption) ? 'border-[#00FF88] bg-[#00FF88]/15 text-[#00FF88]' : 'border-white/10 bg-white/5 text-white/50'
              )}
            >
              {betOption.label}
            </button>
          ))}
        </div>

        <div className="grid grid-cols-3 md:grid-cols-6 gap-2">
          {outsideBets.map((betOption) => (
            <button
              key={betOption.label}
              onClick={() => setSelectedBet(betOption)}
              disabled={isSpinning || isAuto}
              className={cn(
                'rounded-2xl border px-4 py-3 text-xs font-black uppercase tracking-[0.16em] transition-all',
                isBetSelected(betOption) ? 'border-[#00FF88] bg-[#00FF88]/15 text-[#00FF88]' : 'border-white/10 bg-white/5 text-white/50'
              )}
            >
              {betOption.label}
            </button>
          ))}
        </div>

        <div className="rounded-3xl border border-white/10 bg-black/30 p-4">
          <div className="mb-2 text-[10px] uppercase tracking-[0.22em] text-white/30">Straight-Up Picks</div>
          <div className="grid grid-cols-6 md:grid-cols-10 gap-2">
            {straightOptions.map((number) => (
              <button
                key={number}
                onClick={() => setSelectedBet(number === 0 ? { kind: 'green', label: 'Zero', payout: 30 } : { kind: 'straight', value: number, label: `Straight ${number}`, payout: 30 })}
                disabled={isSpinning || isAuto}
                className={cn(
                  'rounded-xl border py-2 text-[11px] font-black transition-all',
                  number === 0
                    ? 'bg-[#00FF88]/15 text-[#00FF88]'
                    : getColor(number) === 'red'
                      ? 'bg-red-600/25 text-red-200'
                      : 'bg-white/5 text-white/70',
                  selectedBet.kind === 'straight' && selectedBet.value === number ? 'border-white' : 'border-white/10'
                )}
              >
                {number}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="bg-[linear-gradient(180deg,#1a1110_0%,#0f0b0b_100%)] border border-rose-300/20 rounded-3xl p-6 flex flex-col gap-5 shadow-[0_20px_70px_rgba(0,0,0,0.38)]">
        <div className="relative min-h-[380px] rounded-[32px] border border-white/10 bg-[radial-gradient(circle_at_center,_rgba(90,62,36,0.35)_0%,_rgba(9,8,6,0.95)_70%)] overflow-hidden flex items-center justify-center">
          <div className="absolute top-4 left-1/2 -translate-x-1/2 z-30">
            <div className="w-6 h-10 rounded-b-full bg-white shadow-xl" />
          </div>

          <motion.div
            animate={wheelControls}
            className="relative h-[340px] w-[340px] rounded-full border-[14px] border-[#2b1d13] shadow-[0_0_50px_rgba(0,0,0,0.45)]"
            style={{ transformOrigin: 'center', background: 'radial-gradient(circle at center, #231a13 0 22%, #3d2b1d 22% 31%, #110d09 31% 63%, #63442a 63% 100%)' }}
          >
            {NUMBERS.map((num, index) => (
              <div
                key={num}
                className="absolute inset-0 flex items-start justify-center"
                style={{ transform: `rotate(${index * SLOT_ANGLE}deg)` }}
              >
                <div
                  className={cn(
                    'mt-4 flex h-[98px] w-[34px] items-start justify-center rounded-t-full border border-black/30 pt-3 text-[10px] font-black',
                    getColor(num) === 'red' ? 'bg-red-600 text-white' : getColor(num) === 'green' ? 'bg-[#00FF88] text-black' : 'bg-black text-white'
                  )}
                  style={{ clipPath: 'polygon(50% 100%, 0 0, 100% 0)' }}
                >
                  <span className="rotate-180">{num}</span>
                </div>
              </div>
            ))}

            <div className="absolute inset-[78px] rounded-full border-8 border-[#2d2016] bg-[radial-gradient(circle_at_center,_#17120d_0%,_#0a0907_100%)]" />
          </motion.div>

          <motion.div animate={ballControls} className="absolute inset-0 pointer-events-none" style={{ transformOrigin: 'center' }}>
            <div className="absolute left-1/2 top-1/2 h-[262px] w-[262px] -translate-x-1/2 -translate-y-1/2">
              <div className="absolute left-1/2 top-0 h-4 w-4 -translate-x-1/2 rounded-full border border-white/30 bg-white shadow-[0_0_18px_rgba(255,255,255,0.7)]" />
            </div>
          </motion.div>

          <div className="absolute bottom-5 left-1/2 -translate-x-1/2 rounded-full border border-white/10 bg-black/35 px-4 py-2 text-xs font-black uppercase tracking-[0.18em] text-white/75">
            {lastResult === null ? 'Awaiting result' : `Result ${lastResult}`}
          </div>
        </div>

        <div className="space-y-4">
          <div>
            <label className="text-[10px] font-black uppercase tracking-[0.18em] text-white/45 mb-2 block">Bet Amount</label>
            <input type="number" value={bet} onChange={(e) => setBet(Math.max(MIN_BET, Number(e.target.value)))} min="0.01" step="0.01" disabled={isSpinning || isAuto} className="w-full bg-black/45 border border-white/12 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-rose-300/60" />
            <QuickBetButtons balance={centsToDollars(balance)} bet={bet} onSetBet={setBet} disabled={isSpinning || isAuto} />
            <MobileBetControls balance={balance} bet={bet} onSetBet={setBet} disabled={isSpinning || isAuto} />
          </div>

          <div className="grid grid-cols-2 gap-2">
            <button
              onClick={() => setIsFast((current) => !current)}
              className={cn(
                'rounded-xl py-3 text-[10px] font-black uppercase tracking-[0.18em] flex items-center justify-center gap-2 transition-all',
                isFast ? 'bg-yellow-500/20 text-yellow-400 border border-yellow-500/50' : 'bg-white/5 text-white/30 border border-transparent'
              )}
            >
              <Zap size={14} fill={isFast ? 'currentColor' : 'none'} />
              Fast
            </button>
            <button
              onClick={toggleAuto}
              className={cn(
                'rounded-xl py-3 text-[10px] font-black uppercase tracking-[0.18em] flex items-center justify-center gap-2 transition-all',
                isAuto ? 'bg-[#00FF88]/20 text-[#00FF88] border border-[#00FF88]/50' : 'bg-white/5 text-white/30 border border-transparent'
              )}
            >
              <RotateCcw size={14} className={isAuto ? 'animate-spin' : ''} />
              Auto
            </button>
          </div>

          {isAuto && (
            <input
              type="number"
              value={autoRounds}
              onChange={(e) => setAutoRounds(Math.max(1, Number(e.target.value)))}
              disabled={isSpinning || isAuto}
              className="w-full bg-black border border-white/10 rounded-xl px-4 py-2 text-xs text-white focus:outline-none focus:border-[#00FF88]/50"
            />
          )}

          <button
            onClick={isAuto ? toggleAuto : spin}
            disabled={(balance < betCents && !isAuto) || isSpinning}
            className={cn(
              'w-full py-4 rounded-xl font-bold transition-all flex items-center justify-center gap-2 disabled:opacity-50',
              isAuto ? 'bg-red-500 text-white' : 'bg-[#00FF88] text-black'
            )}
          >
            {isAuto ? (
              <>
                <Timer size={18} />
                STOP AUTO
              </>
            ) : (
              <>
                <Play size={18} fill="currentColor" />
                SPIN ROULETTE
              </>
            )}
          </button>
        </div>

        <div className="rounded-2xl border border-white/10 bg-black/30 p-4 text-xs space-y-3">
          <div className="flex justify-between text-white/35 uppercase tracking-[0.18em] text-[10px]">
            <span>Current Bet</span>
            <span>{selectedBet.payout.toFixed(1)}x</span>
          </div>
          <div className="text-sm font-black">{selectedBet.label}</div>
          <div className="text-white/60">{statusText}</div>
          <div className="flex flex-wrap gap-1 pt-2">
            {history.map((value, index) => (
              <div
                key={`${value}-${index}`}
                className={cn(
                  'w-12 h-12 rounded flex flex-col items-center justify-center text-[10px] font-bold leading-none',
                  getColor(value) === 'red' ? 'bg-red-500' : getColor(value) === 'green' ? 'bg-[#00FF88] text-black' : 'bg-white text-black'
                )}
              >
                <span>{value}</span>
                <span className="mt-1 uppercase opacity-80">{getColor(value)}</span>
              </div>
            ))}
          </div>
          <GameStatsBar stats={[
            { label: 'Bets', value: String(stats.totalBets) },
            { label: 'Wins', value: String(stats.totalWins) },
            { label: 'Biggest', value: formatCents(stats.biggestWin) },
            { label: 'Wagered', value: formatCents(stats.totalWagered) },
          ]} />
        </div>
      </div>
    </div>
  );
};
