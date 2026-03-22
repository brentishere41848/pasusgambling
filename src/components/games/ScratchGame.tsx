import React, { useCallback, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { useBalance } from '../../context/BalanceContext';
import { cn } from '../../lib/utils';
import { Play, RotateCcw, CreditCard } from 'lucide-react';
import confetti from 'canvas-confetti';
import { logBetActivity } from '../../lib/activity';

type CardTier = {
  cost: number;
  label: string;
  color: string;
};

const TIERS: CardTier[] = [
  { cost: 100, label: '$1 Card', color: 'text-gray-300' },
  { cost: 500, label: '$5 Card', color: 'text-blue-400' },
  { cost: 1000, label: '$10 Card', color: 'text-amber-400' },
];

const MULTIPLIERS = [2, 3, 4, 5, 6, 8, 10];

type Spot = {
  value: number;
  multiplier: number;
  revealed: boolean;
  isWinning: boolean;
};

type GamePhase = 'idle' | 'scratching' | 'ended';

export const ScratchGame: React.FC = () => {
  const { balance, addBalance, subtractBalance } = useBalance();
  const [selectedTier, setSelectedTier] = useState(0);
  const [spots, setSpots] = useState<Spot[]>([]);
  const [phase, setPhase] = useState<GamePhase>('idle');
  const [resultText, setResultText] = useState('');
  const [isWinner, setIsWinner] = useState(false);
  const [payout, setPayout] = useState(0);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const scratchedRef = useRef<Set<number>>(new Set());
  const totalSpots = 9;

  const generateCard = useCallback((cost: number) => {
    const grid: Spot[] = [];
    const centerIdx = 4;
    const selectedMultiplier = MULTIPLIERS[Math.floor(Math.random() * MULTIPLIERS.length)];
    const nonWinningCount = totalSpots - 1;

    const lowMults = [1, 1.5, 2].filter(m => m < selectedMultiplier);
    const shuffledLow = [...Array.from({ length: nonWinningCount }, (_, i) => i)]
      .map(() => lowMults[Math.floor(Math.random() * lowMults.length)] || 1)
      .sort(() => Math.random() - 0.5);

    for (let i = 0; i < totalSpots; i++) {
      grid.push({
        value: Math.floor(Math.random() * 100),
        multiplier: i === centerIdx ? selectedMultiplier : shuffledLow[i < centerIdx ? i : i - 1] || 1,
        revealed: i === centerIdx,
        isWinning: i === centerIdx,
      });
    }
    return grid;
  }, []);

  const startGame = useCallback(() => {
    const cost = TIERS[selectedTier].cost;
    if (!subtractBalance(cost)) return;

    const newSpots = generateCard(cost);
    setSpots(newSpots);
    setPhase('scratching');
    scratchedRef.current = new Set([4]);
    setResultText('');
    setIsWinner(false);
    setPayout(0);

    setTimeout(() => drawScratch(), 50);
  }, [selectedTier, subtractBalance, generateCard]);

  const scratchAt = useCallback((index: number) => {
    if (phase !== 'scratching' || spots[index]?.revealed) return;
    scratchedRef.current.add(index);
    setSpots(prev => prev.map((s, i) => i === index ? { ...s, revealed: true } : s));
    drawScratch();
  }, [phase, spots]);

  const drawScratch = useCallback(() => {
    const canvas = canvasRef.current;
    const container = containerRef.current;
    if (!canvas || !container) return;

    const rect = container.getBoundingClientRect();
    canvas.width = rect.width;
    canvas.height = rect.height;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    ctx.fillStyle = '#1a1a2e';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    ctx.globalCompositeOperation = 'destination-out';
    ctx.fillStyle = 'rgba(0,0,0,1)';

    const cellW = canvas.width / 3;
    const cellH = canvas.height / 3;

    for (let i = 0; i < totalSpots; i++) {
      if (scratchedRef.current.has(i)) {
        const col = i % 3;
        const row = Math.floor(i / 3);
        ctx.beginPath();
        ctx.arc(
          col * cellW + cellW / 2,
          row * cellH + cellH / 2,
          Math.min(cellW, cellH) * 0.4,
          0,
          Math.PI * 2
        );
        ctx.fill();
      }
    }
  }, []);

  const revealAll = useCallback(() => {
    const cost = TIERS[selectedTier].cost;
    const centerSpot = spots[4];
    const won = centerSpot?.isWinning || false;
    const mult = centerSpot?.multiplier || 1;
    const prize = cost * mult;

    setSpots(prev => prev.map(s => ({ ...s, revealed: true })));
    setPhase('ended');
    setIsWinner(won);
    setPayout(won ? prize : 0);
    setResultText(won ? `YOU WIN! ${mult}x = ${(prize / 100).toFixed(2)} coins!` : 'No win this time. Try again!');

    if (won) {
      addBalance(prize);
      confetti({ particleCount: 80, spread: 60, origin: { y: 0.6 } });
      logBetActivity({
        gameKey: 'scratch',
        wager: cost,
        payout: prize,
        multiplier: mult,
        outcome: 'win',
        detail: `Scratch card ${TIERS[selectedTier].label}, ${mult}x multiplier`,
      });
    } else {
      logBetActivity({
        gameKey: 'scratch',
        wager: cost,
        payout: 0,
        multiplier: 0,
        outcome: 'loss',
        detail: `Scratch card ${TIERS[selectedTier].label}, no win`,
      });
    }
  }, [spots, selectedTier, addBalance]);

  const handleCanvasClick = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
    if (phase !== 'scratching') return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    const cellW = canvas.width / 3;
    const cellH = canvas.height / 3;
    const col = Math.floor(x / cellW);
    const row = Math.floor(y / cellH);
    const idx = row * 3 + col;
    if (idx >= 0 && idx < totalSpots) {
      scratchAt(idx);
    }
  }, [phase, scratchAt]);

  const handleCanvasTouch = useCallback((e: React.TouchEvent<HTMLCanvasElement>) => {
    if (phase !== 'scratching') return;
    e.preventDefault();
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const touch = e.touches[0];
    const x = touch.clientX - rect.left;
    const y = touch.clientY - rect.top;
    const cellW = canvas.width / 3;
    const cellH = canvas.height / 3;
    const col = Math.floor(x / cellW);
    const row = Math.floor(y / cellH);
    const idx = row * 3 + col;
    if (idx >= 0 && idx < totalSpots) {
      scratchAt(idx);
    }
  }, [phase, scratchAt]);

  const scratchAll = useCallback(() => {
    if (phase !== 'scratching') return;
    for (let i = 0; i < totalSpots; i++) {
      if (!scratchedRef.current.has(i)) {
        scratchedRef.current.add(i);
      }
    }
    setSpots(prev => prev.map(s => ({ ...s, revealed: true })));
    drawScratch();
    setTimeout(revealAll, 300);
  }, [phase, drawScratch, revealAll]);

  useCallback(() => {
    if (phase === 'idle') {
      scratchedRef.current = new Set();
    }
  }, [phase]);

  const handleNewCard = () => {
    setPhase('idle');
    setSpots([]);
    scratchedRef.current = new Set();
  };

  const scratchCount = spots.filter(s => s.revealed).length;
  const allRevealed = scratchCount === totalSpots;

  return (
    <div className="flex flex-col lg:grid lg:grid-cols-[320px_1fr] gap-6 p-4 max-w-6xl mx-auto">
      <div className="bg-[#111] border border-white/10 rounded-2xl p-6 flex flex-col gap-4">
        <div className="text-sm font-black text-white/40 uppercase tracking-widest">Scratch Cards</div>

        <div>
          <label className="text-xs uppercase tracking-widest text-white/40 mb-2 block">Card Tier</label>
          <div className="space-y-2">
            {TIERS.map((tier, idx) => (
              <button
                key={tier.label}
                onClick={() => { if (phase === 'idle') setSelectedTier(idx); }}
                disabled={phase !== 'idle'}
                className={cn(
                  'w-full py-3 rounded-xl border text-sm font-black uppercase tracking-wider transition-all flex items-center justify-between px-4',
                  selectedTier === idx && phase === 'idle' ? `border-[#00FF88]/50 bg-[#00FF88]/10 ${tier.color}` : 'border-white/10 bg-white/5 text-white/50',
                  phase === 'idle' && 'hover:border-white/20'
                )}
              >
                <span>{tier.label}</span>
                <span>{(tier.cost / 100).toFixed(2)} coins</span>
              </button>
            ))}
          </div>
        </div>

        {phase === 'idle' && (
          <button
            onClick={startGame}
            disabled={balance < TIERS[selectedTier].cost}
            className="w-full bg-[#00FF88] hover:bg-[#00FF88]/90 text-black font-bold py-4 rounded-xl transition-all flex items-center justify-center gap-2 disabled:opacity-50"
          >
            <CreditCard size={18} />
            BUY CARD ({(TIERS[selectedTier].cost / 100).toFixed(2)})
          </button>
        )}

        {phase === 'scratching' && !allRevealed && (
          <button
            onClick={scratchAll}
            className="w-full bg-white/10 hover:bg-white/20 text-white font-bold py-3 rounded-xl transition-all text-xs"
          >
            Reveal All ({totalSpots - scratchCount} left)
          </button>
        )}

        {phase === 'ended' && (
          <div className="space-y-3">
            <motion.div
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              className={cn(
                'rounded-2xl border p-4 text-center',
                isWinner ? 'border-[#00FF88]/50 bg-[#00FF88]/10' : 'border-red-500/30 bg-red-500/10'
              )}
            >
              <div className={cn('text-xl font-black', isWinner ? 'text-[#00FF88]' : 'text-red-400')}>
                {isWinner ? 'WINNER!' : 'No Win'}
              </div>
              {isWinner && (
                <div className="text-2xl font-black mt-1 text-white">
                  +{(payout / 100).toFixed(2)} coins
                </div>
              )}
              <div className="text-xs text-white/50 mt-1">{resultText}</div>
            </motion.div>
            <button
              onClick={handleNewCard}
              className="w-full bg-white/10 hover:bg-white/20 text-white font-bold py-3 rounded-xl transition-all flex items-center justify-center gap-2"
            >
              <RotateCcw size={16} />
              New Card
            </button>
          </div>
        )}

        <div className="mt-auto p-4 border border-white/5 rounded-xl bg-black/30">
          <div className="text-[10px] text-white/40 uppercase tracking-widest mb-2">How to Play</div>
          <ul className="text-[10px] text-white/60 space-y-1">
            <li>• Pick a card tier and buy it</li>
            <li>• Scratch spots by clicking or swiping</li>
            <li>• The center is your winning spot</li>
            <li>• Win 2x to 10x your card cost</li>
            <li>• Click "Reveal All" to speed up</li>
          </ul>
        </div>
      </div>

      <div className="bg-[#0f1115] border border-white/10 rounded-2xl p-6 flex items-center justify-center min-h-[400px]">
        {phase === 'idle' ? (
          <div className="text-center">
            <CreditCard size={64} className="text-white/10 mx-auto mb-4" />
            <p className="text-white/30 text-sm uppercase tracking-widest">Select a tier and buy a card</p>
          </div>
        ) : (
          <div className="w-full max-w-sm">
            <div className="relative" ref={containerRef}>
              <div className="grid grid-cols-3 gap-2">
                {spots.map((spot, idx) => (
                  <div
                    key={idx}
                    className={cn(
                      'aspect-square rounded-2xl flex items-center justify-center text-xl font-black transition-all border',
                      spot.revealed
                        ? spot.isWinning
                          ? 'bg-[#00FF88]/20 border-[#00FF88]/50 text-[#00FF88]'
                          : 'bg-white/5 border-white/10 text-white/40'
                        : 'bg-gradient-to-br from-gray-600 to-gray-800 border-gray-500 text-gray-300',
                      idx === 4 && 'ring-2 ring-[#00FF88]/60'
                    )}
                    onClick={() => !spot.revealed && scratchAt(idx)}
                  >
                    {spot.revealed ? (
                      <div className="text-center">
                        <div className="text-[10px] uppercase tracking-wider text-white/30">x</div>
                        <div className={cn('text-2xl', idx === 4 ? 'text-[#00FF88]' : 'text-white/50')}>
                          {spot.multiplier}x
                        </div>
                        {idx === 4 && (
                          <div className="text-[8px] uppercase tracking-wider text-[#00FF88]/60">WIN</div>
                        )}
                      </div>
                    ) : (
                      <div className="text-gray-400/40 text-lg">?</div>
                    )}
                  </div>
                ))}
              </div>

              {!allRevealed && (
                <canvas
                  ref={canvasRef}
                  className="absolute inset-0 w-full h-full cursor-pointer rounded-2xl opacity-0"
                  style={{ zIndex: 10 }}
                  onClick={handleCanvasClick}
                  onTouchStart={handleCanvasTouch}
                  onTouchMove={handleCanvasTouch}
                />
              )}
            </div>

            {phase === 'scratching' && !allRevealed && (
              <div className="text-center mt-4 text-xs text-white/30">
                {scratchCount} / {totalSpots} spots scratched
                <div className="mt-1 text-[10px] text-white/20">Center spot (marked) is your winning number</div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
