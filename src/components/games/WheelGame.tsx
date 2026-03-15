import React, { useState } from 'react';
import { motion, useAnimation } from 'motion/react';
import { useBalance } from '../../context/BalanceContext';
import { cn } from '../../lib/utils';
import { Play, RotateCcw } from 'lucide-react';
import confetti from 'canvas-confetti';
import { logBetActivity } from '../../lib/activity';

const SEGMENTS = [
  { mult: 0, color: 'bg-white/5', text: '0x' },
  { mult: 1.2, color: 'bg-[#00FF88]', text: '1.2x' },
  { mult: 0, color: 'bg-white/5', text: '0x' },
  { mult: 0, color: 'bg-white/5', text: '0x' },
  { mult: 0, color: 'bg-white/5', text: '0x' },
  { mult: 2, color: 'bg-blue-500', text: '2x' },
  { mult: 0, color: 'bg-white/5', text: '0x' },
  { mult: 0, color: 'bg-white/5', text: '0x' },
  { mult: 0, color: 'bg-white/5', text: '0x' },
  { mult: 1.2, color: 'bg-[#00FF88]', text: '1.2x' },
  { mult: 0, color: 'bg-white/5', text: '0x' },
  { mult: 5, color: 'bg-orange-500', text: '5x' },
  { mult: 0, color: 'bg-white/5', text: '0x' },
  { mult: 2, color: 'bg-blue-500', text: '2x' },
  { mult: 0, color: 'bg-white/5', text: '0x' },
  { mult: 1.2, color: 'bg-[#00FF88]', text: '1.2x' },
];

export const WheelGame: React.FC = () => {
  const { balance, addBalance, subtractBalance } = useBalance();
  const [bet, setBet] = useState(10);
  const [isSpinning, setIsSpinning] = useState(false);
  const [resultIndex, setResultIndex] = useState<number | null>(null);
  const controls = useAnimation();

  const spin = async () => {
    if (subtractBalance(bet)) {
      setIsSpinning(true);
      setResultIndex(null);
      const landedIndex = Math.floor(Math.random() * SEGMENTS.length);
      const rotations = 10;
      const anglePerSegment = 360 / SEGMENTS.length;
      const targetAngle = rotations * 360 + (landedIndex * anglePerSegment) + anglePerSegment / 2;

      await controls.start({
        rotate: targetAngle,
        scale: [1, 1.015, 1],
        transition: { duration: 6.2, ease: [0.08, 0.78, 0.16, 1] }
      });

      const resolvedIndex = (SEGMENTS.length - landedIndex) % SEGMENTS.length;
      const winMult = SEGMENTS[resolvedIndex].mult;
      setResultIndex(resolvedIndex);
      if (winMult > 0) {
        const payout = bet * winMult;
        addBalance(payout);
        logBetActivity({ gameKey: 'wheel', wager: bet, payout, multiplier: winMult, outcome: 'win', detail: `Segment ${SEGMENTS[resolvedIndex].text}` });
        confetti({ particleCount: 100, spread: 70, origin: { y: 0.6 } });
      } else {
        logBetActivity({ gameKey: 'wheel', wager: bet, payout: 0, multiplier: 0, outcome: 'loss', detail: `Segment ${SEGMENTS[resolvedIndex].text}` });
      }

      setIsSpinning(false);
      // Reset rotation for next spin
      controls.set({ rotate: targetAngle % 360 });
    }
  };

  return (
    <div className="flex flex-col lg:grid lg:grid-cols-4 gap-6 p-4 max-w-6xl mx-auto">
      <div className="lg:col-span-1 bg-[#1a1d23] border border-white/5 rounded-2xl p-6 flex flex-col gap-4">
        <div>
          <label className="text-xs uppercase tracking-widest text-white/40 mb-2 block">Bet Amount</label>
          <input
            type="number"
            value={bet}
            onChange={(e) => setBet(Math.max(1, Number(e.target.value)))}
            disabled={isSpinning}
            className="w-full bg-[#0f1115] border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-[#00FF88]/50"
          />
        </div>

        <button
          onClick={spin}
          disabled={isSpinning || balance < bet}
          className="w-full bg-[#00FF88] hover:bg-[#00FF88]/90 text-black font-bold py-4 rounded-xl transition-all flex items-center justify-center gap-2 disabled:opacity-50"
        >
          {isSpinning ? <RotateCcw className="animate-spin" size={18} /> : <Play size={18} fill="currentColor" />}
          SPIN WHEEL
        </button>

        <div className="mt-auto p-4 bg-black/20 rounded-xl border border-white/5">
          <div className="text-[10px] text-white/40 uppercase tracking-widest mb-3">Multipliers</div>
          <div className="grid grid-cols-2 gap-2">
            <div className="flex items-center gap-2 text-[10px] text-white/60">
              <div className="w-2 h-2 rounded-full bg-[#00FF88]" /> 1.2x (3/16)
            </div>
            <div className="flex items-center gap-2 text-[10px] text-white/60">
              <div className="w-2 h-2 rounded-full bg-blue-500" /> 2x (2/16)
            </div>
            <div className="flex items-center gap-2 text-[10px] text-white/60">
              <div className="w-2 h-2 rounded-full bg-orange-500" /> 5x (1/16)
            </div>
            <div className="flex items-center gap-2 text-[10px] text-white/60">
              <div className="w-2 h-2 rounded-full bg-white/40" /> 0x (10/16)
            </div>
          </div>
        </div>
      </div>

      <div className="lg:col-span-3 bg-[#0f1115] border border-white/5 rounded-2xl p-8 flex items-center justify-center relative overflow-hidden min-h-[500px]">
        <div className="relative w-[400px] h-[400px]">
          {/* Pointer */}
          <motion.div
            animate={isSpinning ? { y: [0, -8, 0, -4, 0] } : { y: 0 }}
            transition={{ duration: 0.9, repeat: isSpinning ? Infinity : 0, ease: 'easeInOut' }}
            className="absolute -top-4 left-1/2 -translate-x-1/2 z-20"
          >
            <div className="w-8 h-12 bg-white rounded-b-full shadow-2xl flex items-center justify-center">
              <div className="w-1 h-6 bg-black/20 rounded-full" />
            </div>
          </motion.div>

          {/* Wheel */}
          <motion.div
            animate={controls}
            className="w-full h-full rounded-full border-8 border-[#1a1d23] relative overflow-hidden shadow-[0_0_50px_rgba(0,0,0,0.5)]"
          >
            {SEGMENTS.map((seg, i) => {
              const angle = (360 / SEGMENTS.length) * i;
              return (
                <div
                  key={i}
                  className={cn(
                    "absolute top-0 left-1/2 -translate-x-1/2 h-1/2 origin-bottom flex flex-col items-center pt-4 transition-all duration-300",
                    seg.color,
                    resultIndex === i && "brightness-125 ring-2 ring-white/70"
                  )}
                  style={{ 
                    transform: `rotate(${angle}deg)`,
                    width: '80px',
                    clipPath: 'polygon(50% 100%, 0 0, 100% 0)'
                  }}
                >
                  <span className="text-xs font-black text-black rotate-180 mt-4">{seg.text}</span>
                </div>
              );
            })}
            {/* Center Hub */}
            <div className="absolute inset-0 m-auto w-20 h-20 bg-[#1a1d23] rounded-full border-4 border-white/10 flex items-center justify-center z-10">
              <div className="w-12 h-12 bg-black rounded-full flex items-center justify-center">
                <div className="w-2 h-2 bg-[#00FF88] rounded-full animate-ping" />
              </div>
            </div>
          </motion.div>
        </div>
        {resultIndex !== null && (
          <div className="absolute bottom-6 left-1/2 -translate-x-1/2 rounded-full border border-white/10 bg-white/5 px-4 py-2 text-xs font-black uppercase tracking-widest text-white/70">
            Result: {SEGMENTS[resultIndex].text}
          </div>
        )}
      </div>
    </div>
  );
};
