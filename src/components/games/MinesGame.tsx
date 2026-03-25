import React, { useState } from 'react';
import { motion } from 'motion/react';
import { useBalance } from '../../context/BalanceContext';
import { cn } from '../../lib/utils';
import { Bomb, Gem, Play, RotateCcw } from 'lucide-react';
import confetti from 'canvas-confetti';
import { logBetActivity } from '../../lib/activity';
import { QuickBetButtons, GameStatsBar, useLocalGameStats, useGameHotkeys, centsToDollars, dollarsToCents, formatCents, MIN_BET } from './GameHooks';

export const MinesGame: React.FC = () => {
  const { balance, addBalance, subtractBalance } = useBalance();
  const [bet, setBet] = useState(1);
  const [minesCount, setMinesCount] = useState(5);
  const [grid, setGrid] = useState<(null | 'gem' | 'bomb')[]>(Array(25).fill(null));
  const [gameState, setGameState] = useState<'idle' | 'playing' | 'ended'>('idle');
  const [revealedCount, setRevealedCount] = useState(0);
  const [minesPositions, setMinesPositions] = useState<number[]>([]);
  const [betPlaced, setBetPlaced] = useState(0);
  const { getStats, recordBet } = useLocalGameStats('mines');
  const stats = getStats();
  const betCents = dollarsToCents(bet);

  const startGame = () => {
    if (subtractBalance(betCents)) {
      setBetPlaced(betCents);
      const positions: number[] = [];
      while (positions.length < minesCount) {
        const r = Math.floor(Math.random() * 25);
        if (!positions.includes(r)) positions.push(r);
      }
      setMinesPositions(positions);
      setGrid(Array(25).fill(null));
      setGameState('playing');
      setRevealedCount(0);
    }
  };

  const calculateMultiplier = (revealed: number) => {
    const n = 25;
    const m = minesCount;
    let prob = 1;
    for (let i = 0; i < revealed; i++) prob *= (n - m - i) / (n - i);
    const houseEdge = 0.28;
    return (1 / prob) * (1 - houseEdge);
  };

  const handleCellClick = (index: number) => {
    if (gameState !== 'playing' || grid[index] !== null) return;
    if (minesPositions.includes(index)) {
      const newGrid = [...grid];
      minesPositions.forEach(pos => { newGrid[pos] = 'bomb'; });
      setGrid(newGrid);
      setGameState('ended');
      logBetActivity({ gameKey: 'mines', wager: betPlaced, payout: 0, multiplier: 0, outcome: 'loss', detail: `Hit bomb after ${revealedCount} gems` });
      recordBet(betPlaced, 0, false);
    } else {
      const newGrid = [...grid];
      newGrid[index] = 'gem';
      setGrid(newGrid);
      setRevealedCount(prev => prev + 1);
    }
  };

  const cashOut = () => {
    if (gameState === 'playing' && revealedCount > 0) {
      const multiplier = calculateMultiplier(revealedCount);
      const winAmount = Math.round(betPlaced * multiplier);
      addBalance(winAmount);
      logBetActivity({ gameKey: 'mines', wager: betPlaced, payout: winAmount, multiplier, outcome: 'win', detail: `${revealedCount} gems revealed` });
      recordBet(betPlaced, winAmount, true);
      setGameState('ended');
      confetti({ particleCount: 100, spread: 70, origin: { y: 0.6 }, colors: ['#00FF88', '#ffffff'] });
    }
  };

  const currentMultiplier = revealedCount > 0 ? calculateMultiplier(revealedCount) : 1.0;
  const nextMultiplier = calculateMultiplier(revealedCount + 1);

  const handleMainAction = () => {
    if (gameState === 'idle') startGame();
    else if (gameState === 'playing' && revealedCount > 0) cashOut();
    else if (gameState === 'ended') setGameState('idle');
  };

  useGameHotkeys({ onBet: handleMainAction, isDisabled: (gameState === 'idle' && balance < betCents) || (gameState === 'playing' && revealedCount === 0) });

  return (
    <div className="flex flex-col lg:grid lg:grid-cols-4 gap-6 p-4 max-w-6xl mx-auto">
      <div className="lg:col-span-1 bg-[#111] border border-white/10 rounded-2xl p-6 flex flex-col gap-4">
        <div>
          <label className="text-xs uppercase tracking-widest text-white/40 mb-2 block">Bet Amount</label>
          <input type="number" value={bet} onChange={(e) => setBet(Math.max(MIN_BET, Number(e.target.value)))} min="0.01" step="0.01" disabled={gameState === 'playing'} className="w-full bg-black border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-[#00FF88]/50" />
          <QuickBetButtons balance={centsToDollars(balance)} bet={bet} onSetBet={setBet} disabled={gameState === 'playing'} />
        </div>

        <div>
          <label className="text-xs uppercase tracking-widest text-white/40 mb-2 block">Mines</label>
          <select value={minesCount} onChange={(e) => setMinesCount(Number(e.target.value))} disabled={gameState === 'playing'} className="w-full bg-black border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-[#00FF88]/50">
            {[3, 5, 7, 10, 15, 20, 24].map(n => <option key={n} value={n}>{n}</option>)}
          </select>
        </div>

        {gameState === 'playing' ? (
          <button onClick={cashOut} disabled={revealedCount === 0} className="w-full bg-[#00FF88] hover:bg-[#00FF88]/90 text-black font-bold py-4 rounded-xl transition-all disabled:opacity-50">
            CASH OUT ({formatCents(Math.round(betPlaced * currentMultiplier))})
          </button>
        ) : (
          <button onClick={startGame} disabled={balance < betCents} className="w-full bg-white hover:bg-white/90 text-black font-bold py-4 rounded-xl transition-all disabled:opacity-50 flex items-center justify-center gap-2">
            <Play size={18} fill="currentColor" />PLAY
          </button>
        )}

        {gameState === 'ended' && (
          <button onClick={() => setGameState('idle')} className="w-full bg-white/5 hover:bg-white/10 text-white font-bold py-4 rounded-xl transition-all flex items-center justify-center gap-2">
            <RotateCcw size={18} />RESET
          </button>
        )}

        <div className="text-[9px] text-center text-white/20 uppercase tracking-widest">Space: Bet/Cashout</div>

        <div className="mt-auto p-4 bg-black/50 rounded-xl border border-white/5">
          <div className="flex justify-between text-xs mb-1"><span className="text-white/40">Multiplier</span><span className="text-[#00FF88] font-mono">{currentMultiplier.toFixed(2)}x</span></div>
          <div className="flex justify-between text-xs"><span className="text-white/40">Next Gem</span><span className="text-white font-mono">{nextMultiplier.toFixed(2)}x</span></div>
        </div>

        <GameStatsBar stats={[
          { label: 'Bets', value: String(stats.totalBets) },
          { label: 'Wins', value: String(stats.totalWins) },
          { label: 'Biggest', value: formatCents(stats.biggestWin) },
          { label: 'Wagered', value: formatCents(stats.totalWagered) },
        ]} />
      </div>

      <div className="lg:col-span-3 bg-black border border-white/10 rounded-2xl p-8 flex items-center justify-center">
        <div className="grid grid-cols-5 gap-3 w-full max-w-[500px] aspect-square">
          {grid.map((cell, i) => (
            <motion.button
              key={i}
              whileHover={gameState === 'playing' && cell === null ? { scale: 1.05, backgroundColor: 'rgba(255,255,255,0.1)' } : {}}
              whileTap={gameState === 'playing' && cell === null ? { scale: 0.95 } : {}}
              onClick={() => handleCellClick(i)}
              className={cn("rounded-xl transition-all flex items-center justify-center relative overflow-hidden",
                cell === null ? "bg-[#1a1a1a] border-b-4 border-black/40" :
                cell === 'gem' ? "bg-[#00FF88]/20 border-[#00FF88]/50 border-2" :
                "bg-red-500/20 border-red-500/50 border-2"
              )}
            >
              {cell === 'gem' && <Gem className="text-[#00FF88]" size={32} />}
              {cell === 'bomb' && <Bomb className="text-red-500" size={32} />}
              {cell === null && gameState === 'ended' && minesPositions.includes(i) && <Bomb className="text-white/10" size={24} />}
            </motion.button>
          ))}
        </div>
      </div>
    </div>
  );
};
