import React, { useState, useEffect, useCallback } from 'react';
import { motion, useAnimation } from 'motion/react';
import { useBalance } from '../../context/BalanceContext';
import { cn } from '../../lib/utils';
import { Play, RotateCcw, Zap, Timer } from 'lucide-react';
import confetti from 'canvas-confetti';
import { logBetActivity } from '../../lib/activity';

const NUMBERS = [
  0, 32, 15, 19, 4, 21, 2, 25, 17, 34, 6, 27, 13, 36, 11, 30, 8, 23, 10, 5, 24, 16, 33, 1, 20, 14, 31, 9, 22, 18, 29, 7, 28, 12, 35, 3, 26,
];

const getColor = (num: number) => {
  if (num === 0) return 'green';
  const red = [1, 3, 5, 7, 9, 12, 14, 16, 18, 19, 21, 23, 25, 27, 30, 32, 34, 36];
  return red.includes(num) ? 'red' : 'black';
};

export const RouletteGame: React.FC = () => {
  const { balance, addBalance, subtractBalance } = useBalance();
  const [bet, setBet] = useState(10);
  const [selectedType, setSelectedType] = useState<'red' | 'black' | 'green' | 'even' | 'odd' | number>('red');
  const [isSpinning, setIsSpinning] = useState(false);
  const [isAuto, setIsAuto] = useState(false);
  const [isFast, setIsFast] = useState(false);
  const [autoRounds, setAutoRounds] = useState(10);
  const [remainingRounds, setRemainingRounds] = useState(0);
  const [lastResult, setLastResult] = useState<number | null>(null);
  const [history, setHistory] = useState<number[]>([]);
  const controls = useAnimation();

  const spin = useCallback(async () => {
    if (subtractBalance(bet)) {
      setIsSpinning(true);
      const resultIndex = Math.floor(Math.random() * NUMBERS.length);
      const result = NUMBERS[resultIndex];

      const rotations = isFast ? 2 : 5;
      const anglePerItem = 360 / NUMBERS.length;
      const targetAngle = rotations * 360 + resultIndex * anglePerItem;

      await controls.start({
        rotate: -targetAngle,
        transition: {
          duration: isFast ? 1 : 4,
          ease: isFast ? 'linear' : [0.2, 0, 0.1, 1],
        },
      });

      setLastResult(result);
      setHistory((prev) => [result, ...prev].slice(0, 5));
      setIsSpinning(false);

      let won = false;
      let multiplier = 0;

      if (typeof selectedType === 'number') {
        won = result === selectedType;
        multiplier = 36;
      } else if (selectedType === 'red') {
        won = getColor(result) === 'red';
        multiplier = 2;
      } else if (selectedType === 'black') {
        won = getColor(result) === 'black';
        multiplier = 2;
      } else if (selectedType === 'green') {
        won = result === 0;
        multiplier = 36;
      } else if (selectedType === 'even') {
        won = result !== 0 && result % 2 === 0;
        multiplier = 2;
      } else if (selectedType === 'odd') {
        won = result !== 0 && result % 2 !== 0;
        multiplier = 2;
      }

      if (won) {
        const payout = bet * multiplier;
        addBalance(payout);
        logBetActivity({ gameKey: 'roulette', wager: bet, payout, multiplier, outcome: 'win', detail: `Landed on ${result}` });
        if (!isFast) {
          confetti({ particleCount: 100, spread: 70, origin: { y: 0.6 } });
        }
      } else {
        logBetActivity({ gameKey: 'roulette', wager: bet, payout: 0, multiplier: 0, outcome: 'loss', detail: `Landed on ${result}` });
      }

      controls.set({ rotate: -(resultIndex * anglePerItem) });

      if (isAuto && remainingRounds > 1) {
        setRemainingRounds((prev) => prev - 1);
      } else if (isAuto) {
        setIsAuto(false);
        setRemainingRounds(0);
      }
    } else {
      setIsAuto(false);
      setRemainingRounds(0);
    }
  }, [bet, selectedType, isFast, isAuto, remainingRounds, subtractBalance, addBalance, controls]);

  useEffect(() => {
    if (isAuto && remainingRounds > 0 && !isSpinning) {
      const timer = setTimeout(spin, isFast ? 100 : 1000);
      return () => clearTimeout(timer);
    }
  }, [isAuto, remainingRounds, isSpinning, spin, isFast]);

  const startAuto = () => {
    if (isAuto) {
      setIsAuto(false);
      setRemainingRounds(0);
    } else {
      setIsAuto(true);
      setRemainingRounds(autoRounds);
    }
  };

  return (
    <div className="flex flex-col lg:grid lg:grid-cols-4 gap-6 p-4 max-w-6xl mx-auto">
      <div className="lg:col-span-1 bg-[#1a1d23] border border-white/5 rounded-2xl p-6 flex flex-col gap-4">
        <div className="space-y-4">
          <div>
            <label className="text-xs uppercase tracking-widest text-white/40 mb-2 block">Bet Amount</label>
            <input
              type="number"
              value={bet}
              onChange={(e) => setBet(Math.max(1, Number(e.target.value)))}
              disabled={isSpinning || isAuto}
              className="w-full bg-[#0f1115] border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-[#00FF88]/50"
            />
          </div>

          <div className="grid grid-cols-2 gap-2">
            <button
              onClick={() => setSelectedType('red')}
              disabled={isSpinning || isAuto}
              className={cn('py-3 rounded-xl text-xs font-bold border-2 transition-all', selectedType === 'red' ? 'bg-red-500 border-white' : 'bg-red-500/20 border-transparent text-red-500')}
            >
              RED (2x)
            </button>
            <button
              onClick={() => setSelectedType('black')}
              disabled={isSpinning || isAuto}
              className={cn('py-3 rounded-xl text-xs font-bold border-2 transition-all', selectedType === 'black' ? 'bg-white text-black border-white' : 'bg-white/5 border-transparent text-white/40')}
            >
              BLACK (2x)
            </button>
            <button
              onClick={() => setSelectedType('even')}
              disabled={isSpinning || isAuto}
              className={cn('py-3 rounded-xl text-xs font-bold border-2 transition-all', selectedType === 'even' ? 'bg-blue-500 border-white' : 'bg-blue-500/20 border-transparent text-blue-500')}
            >
              EVEN (2x)
            </button>
            <button
              onClick={() => setSelectedType('odd')}
              disabled={isSpinning || isAuto}
              className={cn('py-3 rounded-xl text-xs font-bold border-2 transition-all', selectedType === 'odd' ? 'bg-orange-500 border-white' : 'bg-orange-500/20 border-transparent text-orange-500')}
            >
              ODD (2x)
            </button>
          </div>

          <div className="flex gap-2">
            <button
              onClick={() => setIsFast(!isFast)}
              className={cn(
                'flex-1 py-2 rounded-lg text-[10px] font-black uppercase tracking-widest flex items-center justify-center gap-2 transition-all',
                isFast ? 'bg-yellow-500/20 text-yellow-500 border border-yellow-500/50' : 'bg-white/5 text-white/20 border border-transparent'
              )}
            >
              <Zap size={12} fill={isFast ? 'currentColor' : 'none'} />
              FAST
            </button>
            <button
              onClick={startAuto}
              className={cn(
                'flex-1 py-2 rounded-lg text-[10px] font-black uppercase tracking-widest flex items-center justify-center gap-2 transition-all',
                isAuto ? 'bg-[#00FF88]/20 text-[#00FF88] border border-[#00FF88]/50' : 'bg-white/5 text-white/20 border border-transparent'
              )}
            >
              <RotateCcw size={12} className={isAuto ? 'animate-spin' : ''} />
              AUTO
            </button>
          </div>

          {isAuto && (
            <div className="space-y-2">
              <div className="flex justify-between text-[10px] uppercase tracking-widest text-white/20">
                <span>Rounds</span>
                <span>{remainingRounds} left</span>
              </div>
              <input
                type="number"
                value={autoRounds}
                onChange={(e) => setAutoRounds(Math.max(1, Number(e.target.value)))}
                disabled={isSpinning || isAuto}
                className="w-full bg-black border border-white/10 rounded-xl px-4 py-2 text-xs text-white focus:outline-none focus:border-[#00FF88]/50"
              />
            </div>
          )}

          <button
            onClick={isAuto ? startAuto : spin}
            disabled={(balance < bet && !isAuto) || (isSpinning && !isAuto)}
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
                SPIN
              </>
            )}
          </button>
        </div>

        <div className="mt-auto">
          <div className="text-[10px] text-white/40 uppercase tracking-widest mb-2">History</div>
          <div className="flex flex-wrap gap-1">
            {history.map((value, index) => (
              <div
                key={`${value}-${index}`}
                className={cn(
                  'w-8 h-8 rounded flex items-center justify-center text-xs font-bold',
                  getColor(value) === 'red' ? 'bg-red-500' : getColor(value) === 'green' ? 'bg-[#00FF88] text-black' : 'bg-white text-black'
                )}
              >
                {value}
              </div>
            ))}
            {!history.length && lastResult !== null && (
              <div
                className={cn(
                  'w-8 h-8 rounded flex items-center justify-center text-xs font-bold',
                  getColor(lastResult) === 'red' ? 'bg-red-500' : getColor(lastResult) === 'green' ? 'bg-[#00FF88] text-black' : 'bg-white text-black'
                )}
              >
                {lastResult}
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="lg:col-span-3 bg-[#0f1115] border border-white/5 rounded-2xl p-8 flex items-center justify-center relative overflow-hidden min-h-[500px]">
        <div className="relative w-[400px] h-[400px]">
          <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-2 z-20">
            <div className="w-4 h-8 bg-white rounded-b-full shadow-xl" />
          </div>

          <motion.div
            animate={controls}
            className={cn(
              'w-full h-full rounded-full border-8 border-[#1a1d23] relative shadow-[0_0_50px_rgba(0,0,0,0.5)] transition-all duration-300',
              isSpinning ? 'blur-[1px]' : 'blur-0'
            )}
            style={{ transformOrigin: 'center' }}
          >
            {NUMBERS.map((num, i) => {
              const angle = (360 / NUMBERS.length) * i;
              return (
                <div
                  key={num}
                  className="absolute top-0 left-1/2 -translate-x-1/2 h-1/2 origin-bottom flex flex-col items-center"
                  style={{ transform: `rotate(${angle}deg)` }}
                >
                  <div
                    className={cn(
                      'w-6 h-12 rounded-t-sm flex items-center justify-center text-[10px] font-bold text-white shadow-inner',
                      getColor(num) === 'red' ? 'bg-red-600' : getColor(num) === 'green' ? 'bg-[#00FF88] text-black' : 'bg-black'
                    )}
                  >
                    {num}
                  </div>
                </div>
              );
            })}
            <div className="absolute inset-0 m-auto w-24 h-24 bg-[#1a1d23] rounded-full border-4 border-white/10 flex items-center justify-center shadow-inner z-10">
              <div className="w-16 h-16 bg-black rounded-full flex items-center justify-center">
                <div
                  className={cn(
                    'w-4 h-4 rounded-full transition-all duration-500',
                    isSpinning ? 'bg-[#00FF88] animate-ping' : 'bg-white/20'
                  )}
                />
              </div>
            </div>
          </motion.div>

          <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,_rgba(0,255,136,0.05)_0%,_transparent_70%)] pointer-events-none" />
          <div className="absolute inset-0 border-[20px] border-white/[0.02] rounded-full pointer-events-none" />
        </div>
      </div>
    </div>
  );
};
