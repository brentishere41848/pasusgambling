import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { useBalance } from '../../context/BalanceContext';
import { cn } from '../../lib/utils';
import { TrendingUp, Play, Square } from 'lucide-react';

export const CrashGame: React.FC = () => {
  const { balance, addBalance, subtractBalance } = useBalance();
  const [bet, setBet] = useState(10);
  const [multiplier, setMultiplier] = useState(1.0);
  const [gameState, setGameState] = useState<'idle' | 'running' | 'crashed' | 'cashed_out'>('idle');
  const [crashPoint, setCrashPoint] = useState(0);
  const [history, setHistory] = useState<number[]>([]);
  
  const timerRef = useRef<number | null>(null);
  const startTimeRef = useRef<number>(0);

  const startGame = () => {
    if (subtractBalance(bet)) {
      setGameState('running');
      setMultiplier(1.0);
      startTimeRef.current = Date.now();
      
      // Determine crash point using a common crash algorithm
      // 1 / (1 - X) where X is a random number between 0 and 0.99
      const houseEdge = 0.03;
      const r = Math.random();
      const point = Math.max(1, Math.floor(100 / (1 - r)) / 100) * (1 - houseEdge);
      setCrashPoint(point);

      timerRef.current = window.setInterval(() => {
        const elapsed = (Date.now() - startTimeRef.current) / 1000;
        const currentMult = Math.pow(Math.E, 0.06 * elapsed);
        
        if (currentMult >= point) {
          setGameState('crashed');
          setHistory(prev => [point, ...prev].slice(0, 10));
          if (timerRef.current) clearInterval(timerRef.current);
        } else {
          setMultiplier(currentMult);
        }
      }, 50);
    }
  };

  const cashOut = () => {
    if (gameState === 'running') {
      const winAmount = bet * multiplier;
      addBalance(winAmount);
      setGameState('cashed_out');
      if (timerRef.current) clearInterval(timerRef.current);
    }
  };

  useEffect(() => {
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, []);

  return (
    <div className="flex flex-col lg:grid lg:grid-cols-4 gap-6 p-4 max-w-6xl mx-auto">
      {/* Control Panel */}
      <div className="lg:col-span-1 bg-[#111] border border-white/10 rounded-2xl p-6 flex flex-col gap-4">
        <div>
          <label className="text-xs uppercase tracking-widest text-white/40 mb-2 block">Bet Amount</label>
          <div className="relative">
            <input
              type="number"
              value={bet}
              onChange={(e) => setBet(Math.max(1, Number(e.target.value)))}
              disabled={gameState === 'running'}
              className="w-full bg-black border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-[#00FF88]/50 transition-colors"
            />
            <div className="absolute right-2 top-1/2 -translate-y-1/2 flex gap-1">
              <button onClick={() => setBet(prev => prev / 2)} className="px-2 py-1 bg-white/5 hover:bg-white/10 rounded text-[10px] text-white/60">1/2</button>
              <button onClick={() => setBet(prev => prev * 2)} className="px-2 py-1 bg-white/5 hover:bg-white/10 rounded text-[10px] text-white/60">x2</button>
            </div>
          </div>
        </div>

        {gameState === 'running' ? (
          <button
            onClick={cashOut}
            className="w-full bg-[#00FF88] hover:bg-[#00FF88]/90 text-black font-bold py-4 rounded-xl transition-all flex items-center justify-center gap-2 shadow-[0_0_20px_rgba(0,255,136,0.3)]"
          >
            <Square size={18} fill="currentColor" />
            CASH OUT ({(bet * multiplier).toFixed(2)})
          </button>
        ) : (
          <button
            onClick={startGame}
            disabled={balance < bet}
            className="w-full bg-white hover:bg-white/90 text-black font-bold py-4 rounded-xl transition-all flex items-center justify-center gap-2 disabled:opacity-50"
          >
            <Play size={18} fill="currentColor" />
            PLACE BET
          </button>
        )}

        <div className="mt-auto">
          <label className="text-xs uppercase tracking-widest text-white/40 mb-2 block">History</label>
          <div className="flex flex-wrap gap-2">
            {history.map((h, i) => (
              <span key={i} className={cn(
                "px-2 py-1 rounded text-[10px] font-mono",
                h >= 2 ? "bg-[#00FF88]/20 text-[#00FF88]" : "bg-red-500/20 text-red-400"
              )}>
                {h.toFixed(2)}x
              </span>
            ))}
          </div>
        </div>
      </div>

      {/* Game Display */}
      <div className="lg:col-span-3 bg-black border border-white/10 rounded-2xl relative overflow-hidden min-h-[400px] flex items-center justify-center">
        <div className="absolute inset-0 opacity-20 pointer-events-none">
          <div className="absolute inset-0" style={{ backgroundImage: 'radial-gradient(#333 1px, transparent 1px)', backgroundSize: '40px 40px' }} />
        </div>

        <AnimatePresence mode="wait">
          {gameState === 'idle' && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="text-center"
            >
              <TrendingUp size={64} className="text-white/10 mx-auto mb-4" />
              <p className="text-white/40 uppercase tracking-[0.2em] text-sm">Waiting for bet...</p>
            </motion.div>
          )}

          {(gameState === 'running' || gameState === 'cashed_out') && (
            <motion.div
              key="active"
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              className="text-center z-10"
            >
              <h2 className={cn(
                "text-8xl font-black tracking-tighter mb-2 transition-colors duration-300",
                gameState === 'cashed_out' ? "text-[#00FF88]" : "text-white"
              )}>
                {multiplier.toFixed(2)}x
              </h2>
              {gameState === 'cashed_out' && (
                <motion.p
                  initial={{ y: 20, opacity: 0 }}
                  animate={{ y: 0, opacity: 1 }}
                  className="text-[#00FF88] font-mono text-xl"
                >
                  CASHED OUT @ {multiplier.toFixed(2)}x
                </motion.p>
              )}
            </motion.div>
          )}

          {gameState === 'crashed' && (
            <motion.div
              key="crashed"
              initial={{ scale: 1.2, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              className="text-center z-10"
            >
              <h2 className="text-8xl font-black tracking-tighter text-red-500 mb-2">
                {multiplier.toFixed(2)}x
              </h2>
              <p className="text-red-500/60 uppercase tracking-[0.2em] text-sm">Crashed!</p>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Visual Graph Line (Simplified) */}
        {gameState === 'running' && (
          <svg className="absolute inset-0 w-full h-full pointer-events-none">
            <motion.path
              d={`M 0 400 Q ${multiplier * 50} ${400 - multiplier * 20} ${multiplier * 100} ${400 - multiplier * 50}`}
              fill="none"
              stroke="#00FF88"
              strokeWidth="4"
              initial={{ pathLength: 0 }}
              animate={{ pathLength: 1 }}
            />
          </svg>
        )}
      </div>
    </div>
  );
};
