import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { useBalance } from '../../context/BalanceContext';
import { cn } from '../../lib/utils';
import { Play, RotateCcw, Trophy } from 'lucide-react';
import confetti from 'canvas-confetti';
import { logBetActivity } from '../../lib/activity';

const SYMBOLS = ['💎', '🍋', '🍒', '🔔', '7️⃣', '⭐'];
const REEL_COUNT = 3;

export const SlotsGame: React.FC = () => {
  const { balance, addBalance, subtractBalance } = useBalance();
  const [bet, setBet] = useState(10);
  const [reels, setReels] = useState<string[]>(Array(REEL_COUNT).fill('💎'));
  const [isSpinning, setIsSpinning] = useState(false);
  const [winMessage, setWinMessage] = useState<string | null>(null);

  const spin = () => {
    if (subtractBalance(bet)) {
      setIsSpinning(true);
      setWinMessage(null);

      const spinDuration = 2000;
      const interval = 100;
      
      const timer = setInterval(() => {
        setReels(prev => prev.map(() => SYMBOLS[Math.floor(Math.random() * SYMBOLS.length)]));
      }, interval);

      setTimeout(() => {
        clearInterval(timer);
        const finalReels = Array(REEL_COUNT).fill(0).map(() => SYMBOLS[Math.floor(Math.random() * SYMBOLS.length)]);
        setReels(finalReels);
        setIsSpinning(false);

        // Check for win
        const uniqueSymbols = new Set(finalReels);
        if (uniqueSymbols.size === 1) {
          // Jackpot!
          const winAmount = bet * 7;
          addBalance(winAmount);
          logBetActivity({ gameKey: 'slots', wager: bet, payout: winAmount, multiplier: 7, outcome: 'win', detail: 'Jackpot' });
          setWinMessage(`JACKPOT! +$${winAmount}`);
          confetti({
            particleCount: 150,
            spread: 70,
            origin: { y: 0.6 }
          });
        } else if (finalReels[0] === finalReels[1] || finalReels[1] === finalReels[2]) {
          // Small win only for an adjacent pair
          const winAmount = bet * 1.25;
          addBalance(winAmount);
          logBetActivity({ gameKey: 'slots', wager: bet, payout: winAmount, multiplier: 1.25, outcome: 'win', detail: 'Adjacent pair' });
          setWinMessage(`WIN! +$${winAmount}`);
        } else {
          logBetActivity({ gameKey: 'slots', wager: bet, payout: 0, multiplier: 0, outcome: 'loss', detail: 'No match' });
        }
      }, spinDuration);
    }
  };

  return (
    <div className="flex flex-col lg:grid lg:grid-cols-4 gap-6 p-4 max-w-6xl mx-auto">
      <div className="lg:col-span-1 bg-[#111] border border-white/10 rounded-2xl p-6 flex flex-col gap-4">
        <div>
          <label className="text-xs uppercase tracking-widest text-white/40 mb-2 block">Bet Amount</label>
          <input
            type="number"
            value={bet}
            onChange={(e) => setBet(Math.max(1, Number(e.target.value)))}
            disabled={isSpinning}
            className="w-full bg-black border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-[#00FF88]/50"
          />
        </div>

        <button
          onClick={spin}
          disabled={isSpinning || balance < bet}
          className="w-full bg-[#00FF88] hover:bg-[#00FF88]/90 text-black font-bold py-4 rounded-xl transition-all flex items-center justify-center gap-2 disabled:opacity-50"
        >
          {isSpinning ? <RotateCcw className="animate-spin" size={18} /> : <Play size={18} fill="currentColor" />}
          SPIN
        </button>

        <div className="mt-auto p-4 bg-black/50 rounded-xl border border-white/5">
          <h4 className="text-[10px] font-bold text-white/40 uppercase tracking-widest mb-3">Paytable</h4>
          <div className="space-y-2 text-[10px]">
            <div className="flex justify-between">
              <span className="text-white/60">3 Symbols</span>
              <span className="text-[#00FF88]">7x</span>
            </div>
            <div className="flex justify-between">
              <span className="text-white/60">Adjacent Pair</span>
              <span className="text-[#00FF88]">1.25x</span>
            </div>
          </div>
        </div>
      </div>

      <div className="lg:col-span-3 bg-black border border-white/10 rounded-2xl p-12 flex flex-col items-center justify-center gap-12 relative overflow-hidden">
        <div className="flex gap-4">
          {reels.map((symbol, i) => (
            <motion.div
              key={i}
              animate={isSpinning ? { y: [0, -20, 20, 0] } : {}}
              transition={{ repeat: isSpinning ? Infinity : 0, duration: 0.1 }}
              className="w-32 h-40 bg-[#111] border-2 border-white/5 rounded-2xl flex items-center justify-center text-6xl shadow-inner"
            >
              {symbol}
            </motion.div>
          ))}
        </div>

        <AnimatePresence>
          {winMessage && (
            <motion.div
              initial={{ scale: 0.5, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.5, opacity: 0 }}
              className="absolute inset-0 flex items-center justify-center bg-black/60 backdrop-blur-sm z-10"
            >
              <div className="text-center">
                <Trophy className="text-[#00FF88] mx-auto mb-4" size={64} />
                <h2 className="text-4xl font-black text-white uppercase italic tracking-tighter">
                  {winMessage}
                </h2>
                <button 
                  onClick={() => setWinMessage(null)}
                  className="mt-6 px-8 py-2 bg-white text-black rounded-full font-bold text-sm"
                >
                  CONTINUE
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        <div className="absolute top-0 left-0 w-full h-1/4 bg-gradient-to-b from-black to-transparent pointer-events-none" />
        <div className="absolute bottom-0 left-0 w-full h-1/4 bg-gradient-to-t from-black to-transparent pointer-events-none" />
      </div>
    </div>
  );
};
