import React, { useEffect, useMemo, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Play, RotateCcw, X, Minus, Plus, Star, Sparkles, Crown } from 'lucide-react';
import confetti from 'canvas-confetti';
import { useBalance } from '../../context/BalanceContext';
import { logBetActivity } from '../../lib/activity';
import { cn } from '../../lib/utils';
import { QuickBetButtons, GameStatsBar, useLocalGameStats, useGameHotkeys } from './GameHooks';

type Symbol = '7' | '🍒' | '🍋' | '🍊' | '🍇' | '💎' | '⭐' | 'BAR';

type ReelState = {
  symbols: Symbol[];
  spinning: boolean;
  targetIndex: number;
};

type Payline = {
  pattern: number[];
  name: string;
  multiplier: number;
};

const SYMBOLS: Symbol[] = ['7', '🍒', '🍋', '🍊', '🍇', '💎', '⭐', 'BAR'];
const REEL_COUNT = 3;
const ROW_COUNT = 3;

const SYMBOL_SIZE = 80;
const SYMBOL_GAP = 8;

const PAYLINES: Payline[] = [
  { pattern: [0, 0, 0], name: 'Top Line', multiplier: 10 },
  { pattern: [1, 1, 1], name: 'Center Line', multiplier: 10 },
  { pattern: [2, 2, 2], name: 'Bottom Line', multiplier: 10 },
  { pattern: [0, 1, 2], name: 'Diagonal Down', multiplier: 25 },
  { pattern: [2, 1, 0], name: 'Diagonal Up', multiplier: 25 },
  { pattern: [0, 1, 0], name: 'V Shape', multiplier: 20 },
  { pattern: [2, 1, 2], name: 'Inverted V', multiplier: 20 },
];

const JACKPOT_SYMBOL: Symbol = '7';
const WILD_SYMBOL: Symbol = '⭐';
const SCATTER_SYMBOL: Symbol = '💎';

const JACKPOT_CHANCE = 0.001;
const SCATTER_CHANCE = 0.03;
const WILD_CHANCE = 0.05;
const BAR_CHANCE = 0.10;

const SYMBOL_PAYOUTS: Record<Symbol, number> = {
  '7': 100,
  '🍒': 20,
  '🍋': 15,
  '🍊': 10,
  '🍇': 5,
  '💎': 0,
  '⭐': 0,
  'BAR': 3,
};

const BONUS_COST_MULTIPLIER = 50;

const SYMBOL_COLORS: Record<Symbol, string> = {
  '7': '#ff4444',
  '🍒': '#ff4444',
  '🍋': '#ffdd00',
  '🍊': '#ff9900',
  '🍇': '#aa44ff',
  '💎': '#00ddff',
  '⭐': '#ffdd00',
  'BAR': '#888888',
};

function formatCoins(value: number) {
  return Math.round(value).toLocaleString();
}

function CoinAmount({ value, className = '', iconSize = 18 }: { value: number | string; className?: string; iconSize?: number }) {
  return (
    <span className={cn('inline-flex items-center gap-1.5', className)}>
      <img src="/assets/icon.png" alt="" className="rounded-full object-cover" style={{ width: iconSize, height: iconSize }} />
      <span>{value}</span>
    </span>
  );
}

const SlotReel: React.FC<{
  symbols: Symbol[];
  spinning: boolean;
  onStop: () => void;
  targetSymbol: Symbol;
}> = ({ symbols, spinning, onStop, targetSymbol }) => {
  const reelRef = useRef<HTMLDivElement>(null);
  const animationRef = useRef<number>();
  const [offset, setOffset] = useState(0);

  useEffect(() => {
    if (!spinning) return;

    let speed = 15 + Math.random() * 10;
    const targetOffset = ROW_COUNT * 5 + Math.floor(Math.random() * 3);
    let currentOffset = 0;

    const animate = () => {
      currentOffset += speed;
      if (speed > 3) speed *= 0.97;

      if (currentOffset >= targetOffset * (SYMBOL_SIZE + SYMBOL_GAP)) {
        if (animationRef.current) {
          cancelAnimationFrame(animationRef.current);
        }
        onStop();
        return;
      }

      setOffset(currentOffset);
      animationRef.current = requestAnimationFrame(animate);
    };

    animationRef.current = requestAnimationFrame(animate);

    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [spinning, onStop]);

  const displaySymbols = useMemo(() => {
    const result: Symbol[] = [];
    for (let i = 0; i < 10; i++) {
      result.push(symbols[i % symbols.length]);
    }
    return result;
  }, [symbols]);

  return (
    <div
      ref={reelRef}
      className={cn(
        'relative overflow-hidden rounded-2xl border-2 border-white/20 bg-black/80 shadow-[inset_0_0_30px_rgba(0,0,0,0.8)]',
        spinning ? '' : ''
      )}
      style={{
        width: SYMBOL_SIZE + 16,
        height: ROW_COUNT * (SYMBOL_SIZE + SYMBOL_GAP) + 16,
      }}
    >
      <div
        className="absolute inset-0 bg-gradient-to-b from-black via-black/90 to-black"
        style={{
          backgroundImage: `
            linear-gradient(to bottom, rgba(0,0,0,0.9) 0%, transparent 15%),
            linear-gradient(to bottom, transparent 85%, rgba(0,0,0,0.9) 100%)
          `,
        }}
      />
      
      <motion.div
        className="absolute left-0 right-0"
        style={{
          top: 8 + (spinning ? -offset : 0),
        }}
      >
        {displaySymbols.map((symbol, i) => (
          <div
            key={i}
            className="flex items-center justify-center"
            style={{
              height: SYMBOL_SIZE + SYMBOL_GAP,
              width: SYMBOL_SIZE + 16,
            }}
          >
            <div
              className={cn(
                'rounded-xl flex items-center justify-center text-4xl shadow-lg',
                symbol === JACKPOT_SYMBOL && 'bg-gradient-to-br from-red-600 to-red-900 ring-2 ring-red-400'
              )}
              style={{
                width: SYMBOL_SIZE,
                height: SYMBOL_SIZE,
                backgroundColor: symbol === WILD_SYMBOL ? '#332200' : symbol === SCATTER_SYMBOL ? '#002233' : '#111',
                boxShadow: symbol === '7' 
                  ? '0 0 20px rgba(255,68,68,0.5), inset 0 0 10px rgba(255,255,255,0.2)' 
                  : 'inset 0 0 10px rgba(255,255,255,0.1)',
                color: SYMBOL_COLORS[symbol],
                textShadow: symbol === '7' ? '0 0 10px rgba(255,68,68,0.8)' : 'none',
              }}
            >
              {symbol}
            </div>
          </div>
        ))}
      </motion.div>

      {spinning && (
        <div className="absolute inset-0 bg-gradient-to-b from-transparent via-white/5 to-transparent animate-pulse" />
      )}
    </div>
  );
};

export const SlotsGame: React.FC = () => {
  const { balance, addBalance, subtractBalance } = useBalance();
  const [bet, setBet] = useState(100);
  const [reels, setReels] = useState<Symbol[][]>([
    SYMBOLS, SYMBOLS, SYMBOLS
  ]);
  const [spinning, setSpinning] = useState<boolean[]>([false, false, false]);
  const [lastWin, setLastWin] = useState(0);
  const [lastWinLines, setLastWinLines] = useState<string[]>([]);
  const [message, setMessage] = useState('Spin to win!');
  const [showWinAnimation, setShowWinAnimation] = useState(false);
  const [freeSpins, setFreeSpins] = useState(0);
  const [jackpot, setJackpot] = useState(false);
  
  const timersRef = useRef<number[]>([]);
  const { getStats, recordBet } = useLocalGameStats('slots');
  const stats = getStats();

  useEffect(() => {
    return () => {
      timersRef.current.forEach(t => window.clearTimeout(t));
    };
  }, []);

  const canSpin = !spinning.some(Boolean) && balance >= bet;

  useGameHotkeys({
    onBet: () => {
      if (canSpin) spin();
    },
    isDisabled: !canSpin,
  });

  const getRandomSymbol = (forceJackpot = false): Symbol => {
    if (forceJackpot) return JACKPOT_SYMBOL;
    
    const rand = Math.random();
    if (rand < JACKPOT_CHANCE) return JACKPOT_SYMBOL;
    if (rand < JACKPOT_CHANCE + SCATTER_CHANCE) return SCATTER_SYMBOL;
    if (rand < JACKPOT_CHANCE + SCATTER_CHANCE + WILD_CHANCE) return WILD_SYMBOL;
    if (rand < JACKPOT_CHANCE + SCATTER_CHANCE + WILD_CHANCE + BAR_CHANCE) return 'BAR';
    const idx = Math.floor(Math.random() * (SYMBOLS.length - 2)) + 2;
    return SYMBOLS[idx];
  };

  const spin = () => {
    if (!canSpin && freeSpins === 0) return;

    const wager = freeSpins > 0 ? 0 : bet;
    if (wager > 0 && !subtractBalance(wager)) return;

    setJackpot(false);
    setLastWin(0);
    setLastWinLines([]);
    setShowWinAnimation(false);

    const newSpinning = [true, true, true];
    setSpinning(newSpinning);

    const targets: Symbol[] = [
      freeSpins > 0 ? getRandomSymbol() : getRandomSymbol(),
      freeSpins > 0 ? getRandomSymbol() : getRandomSymbol(),
      freeSpins > 0 ? getRandomSymbol() : getRandomSymbol(),
    ];

    const reelsToSpin = [false, false, false];
    setSpinning(reelsToSpin);

    for (let i = 0; i < REEL_COUNT; i++) {
      const timer = window.setTimeout(() => {
        setSpinning(prev => {
          const next = [...prev];
          next[i] = true;
          return next;
        });

        const stopTimer = window.setTimeout(() => {
          setReels(prev => {
            const next = [...prev];
            next[i] = Array.from({ length: 10 }, () => getRandomSymbol());
            return next;
          });

          setSpinning(prev => {
            const next = [...prev];
            next[i] = false;
            return next;
          });
        }, 800 + i * 400);

        timersRef.current.push(stopTimer);
      }, i * 200);

      timersRef.current.push(timer);
    }

    const finalTimer = window.setTimeout(() => {
      evaluateWin(wager);
    }, 800 + REEL_COUNT * 400 + 100);

    timersRef.current.push(finalTimer);
  };

  const evaluateWin = (wager: number) => {
    const finalReels = reels;
    let totalWin = 0;
    const winLines: string[] = [];

    PAYLINES.forEach((payline) => {
      const [r1, r2, r3] = payline.pattern;
      const s1 = finalReels[0][r1];
      const s2 = finalReels[1][r2];
      const s3 = finalReels[2][r3];

      if (s1 === s2 && s2 === s3) {
        const payout = Math.round(wager * payline.multiplier * (SYMBOL_PAYOUTS[s1] / 10));
        if (payout > 0) {
          totalWin += payout;
          winLines.push(`${payline.name}: ${s1}${s1}${s1} +${formatCoins(payout)}`);
        }
        if (s1 === JACKPOT_SYMBOL) {
          setJackpot(true);
        }
      }

      if (s1 === WILD_SYMBOL || s2 === WILD_SYMBOL || s3 === WILD_SYMBOL) {
        const nonWilds = [s1, s2, s3].filter(s => s !== WILD_SYMBOL);
        if (nonWilds.length === 1 && nonWilds[0] === s1) {
          const payout = Math.round(wager * payline.multiplier * (SYMBOL_PAYOUTS[s1] / 10));
          if (payout > 0) {
            totalWin += payout;
            winLines.push(`${payline.name}: Wild + ${s1}${s1} +${formatCoins(payout)}`);
          }
        }
      }
    });

    let scatterWin = 0;
    let scatterCount = 0;
    finalReels.forEach(reel => {
      reel.forEach(sym => {
        if (sym === SCATTER_SYMBOL) {
          scatterCount++;
        }
      });
    });

    if (scatterCount >= 3) {
      const freeSpinAward = scatterCount >= 3 ? 5 + (scatterCount - 3) * 2 : 0;
      setFreeSpins(prev => prev + freeSpinAward);
      winLines.push(`Scatter ${scatterCount}x: +${freeSpinAward} Free Spins!`);
      scatterWin = wager * scatterCount;
    }

    const finalWin = totalWin + scatterWin;

    if (finalWin > 0) {
      addBalance(finalWin);
      setLastWin(finalWin);
      setLastWinLines(winLines);
      setShowWinAnimation(true);
      setMessage(winLines[0] || 'Big Win!');
      
      if (jackpot || finalWin >= wager * 10) {
        confetti({ particleCount: 150, spread: 80, origin: { y: 0.5 } });
      }

      logBetActivity({
        gameKey: 'slots',
        wager,
        payout: finalWin,
        multiplier: wager > 0 ? finalWin / wager : 1,
        outcome: 'win',
        detail: winLines.join(' | ') || 'win',
      });
      recordBet(wager, finalWin, true);
    } else {
      setMessage('Spin to win!');
      logBetActivity({
        gameKey: 'slots',
        wager,
        payout: 0,
        multiplier: 0,
        outcome: 'loss',
        detail: 'No win',
      });
      recordBet(wager, 0, false);
    }

    if (freeSpins > 0) {
      setFreeSpins(prev => {
        const remaining = prev - 1;
        if (remaining <= 0 && finalWin === 0) {
          setMessage('Free spins ended!');
        }
        return remaining;
      });
    }
  };

  const resetGame = () => {
    setReels([SYMBOLS, SYMBOLS, SYMBOLS]);
    setLastWin(0);
    setLastWinLines([]);
    setMessage('Spin to win!');
    setJackpot(false);
  };

  const buyBonus = () => {
    const cost = bet * BONUS_COST_MULTIPLIER;
    if (balance < cost || spinning.some(Boolean)) return;
    if (!subtractBalance(cost)) return;

    const freeSpinAward = 10 + Math.floor(Math.random() * 11);
    setFreeSpins(freeSpinAward);
    setMessage(`Bonus bought! ${freeSpinAward} free spins!`);
    
    logBetActivity({
      gameKey: 'slots',
      wager: cost,
      payout: 0,
      multiplier: 0,
      outcome: 'loss',
      detail: `Buy bonus: ${freeSpinAward} free spins`,
    });
    recordBet(cost, 0, false);
  };

  return (
    <div className="flex flex-col lg:grid lg:grid-cols-5 gap-6 p-4 max-w-6xl mx-auto">
      <div className="lg:col-span-1 space-y-4">
        <div className="bg-[#1a1d23] border border-white/5 rounded-2xl p-5">
          <div className="space-y-4">
            <div>
              <div className="text-[10px] uppercase tracking-widest text-white/40 mb-2">Bet Amount</div>
              <input
                type="number"
                min={100}
                step={100}
                value={bet}
                onChange={(e) => setBet(Math.max(100, Math.round(Number(e.target.value) / 100) * 100))}
                disabled={spinning.some(Boolean)}
                className="w-full bg-[#0f1115] border border-white/10 rounded-xl px-4 py-3 text-white font-mono text-xl focus:outline-none focus:border-[#00FF88]/50"
              />
              <QuickBetButtons balance={balance} bet={bet} onSetBet={setBet} disabled={spinning.some(Boolean)} />
            </div>

            <div className="bg-black/40 rounded-xl p-3 border border-white/5">
              <div className="flex justify-between items-center">
                <span className="text-[10px] text-white/40 uppercase tracking-wider">Balance</span>
                <span className="text-xl font-black text-white font-mono">
                  <CoinAmount value={formatCoins(balance)} iconSize={16} />
                </span>
              </div>
            </div>

            <button
              onClick={spin}
              disabled={!canSpin && freeSpins === 0}
              className={cn(
                'w-full py-4 rounded-xl font-black text-lg uppercase tracking-wider transition-all flex items-center justify-center gap-2',
                freeSpins > 0 
                  ? 'bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-400 hover:to-pink-400 text-white shadow-lg shadow-purple-500/30' 
                  : 'bg-[#00FF88] hover:bg-[#00FF88]/90 text-black shadow-lg shadow-[#00FF88]/30',
                (!canSpin && freeSpins === 0) && 'opacity-50 cursor-not-allowed'
              )}
            >
              {spinning.some(Boolean) ? (
                <RotateCcw size={20} className="animate-spin" />
              ) : (
                <Play size={20} fill="currentColor" />
              )}
              {freeSpins > 0 ? `FREE SPIN (${freeSpins})` : 'SPIN'}
            </button>

            <button
              onClick={buyBonus}
              disabled={spinning.some(Boolean) || balance < bet * BONUS_COST_MULTIPLIER}
              className="w-full py-3 rounded-xl bg-gradient-to-r from-orange-500 to-red-500 hover:from-orange-400 hover:to-red-400 text-white font-black text-sm uppercase tracking-wider transition-all shadow-lg shadow-orange-500/30 flex items-center justify-center gap-2 disabled:opacity-40 disabled:cursor-not-allowed"
            >
              <Sparkles size={16} />
              Buy Bonus ({formatCoins(bet * BONUS_COST_MULTIPLIER)})
            </button>

            <button
              onClick={resetGame}
              disabled={spinning.some(Boolean)}
              className="w-full py-2 rounded-xl bg-white/10 text-white/60 text-xs font-black uppercase tracking-wider hover:bg-white/20 transition-all disabled:opacity-30"
            >
              Reset
            </button>
          </div>
        </div>

        <GameStatsBar stats={[
          { label: 'Spins', value: String(stats.totalBets) },
          { label: 'Wins', value: String(stats.totalWins) },
          { label: 'Biggest', value: formatCoins(stats.biggestWin) },
          { label: 'Wagered', value: formatCoins(stats.totalWagered) },
        ]} />

        <div className="bg-[#1a1d23] border border-white/5 rounded-2xl p-4">
          <div className="text-[10px] uppercase tracking-widest text-white/40 mb-3">Payouts</div>
          <div className="space-y-1 text-xs">
            <div className="flex justify-between text-white/60">
              <span>7️⃣ 7️⃣ 7️⃣</span>
              <span className="text-red-400">100x</span>
            </div>
            <div className="flex justify-between text-white/60">
              <span>🍒🍒🍒</span>
              <span className="text-red-400">20x</span>
            </div>
            <div className="flex justify-between text-white/60">
              <span>🍋🍋🍋</span>
              <span className="text-yellow-400">15x</span>
            </div>
            <div className="flex justify-between text-white/60">
              <span>💎💎💎</span>
              <span className="text-cyan-400">Free Spins</span>
            </div>
            <div className="flex justify-between text-white/60">
              <span>⭐ = Wild</span>
              <span className="text-yellow-400">Substitutes</span>
            </div>
          </div>
        </div>
      </div>

      <div className="lg:col-span-4">
        <div className="relative bg-gradient-to-b from-[#1a1d23] to-[#0a0a0a] border border-white/10 rounded-3xl p-8 overflow-hidden">
          <div className="absolute inset-0 opacity-10" style={{
            backgroundImage: `
              linear-gradient(rgba(255,255,255,0.03) 1px, transparent 1px),
              linear-gradient(90deg, rgba(255,255,255,0.03) 1px, transparent 1px)
            `,
            backgroundSize: '30px 30px'
          }} />

          <AnimatePresence>
            {jackpot && (
              <motion.div
                initial={{ scale: 0, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0, opacity: 0 }}
                className="absolute inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm"
              >
                <motion.div
                  initial={{ scale: 0.5 }}
                  animate={{ scale: [1, 1.1, 1] }}
                  transition={{ repeat: Infinity, duration: 0.5 }}
                  className="text-center"
                >
                  <Crown size={80} className="mx-auto text-yellow-400 mb-4 drop-shadow-lg" />
                  <div className="text-6xl font-black text-transparent bg-clip-text bg-gradient-to-r from-yellow-400 via-red-500 to-yellow-400 animate-pulse">
                    JACKPOT!
                  </div>
                  <div className="text-4xl font-black text-yellow-400 mt-2">
                    <CoinAmount value={formatCoins(lastWin)} iconSize={32} />
                  </div>
                </motion.div>
              </motion.div>
            )}
          </AnimatePresence>

          {showWinAnimation && !jackpot && lastWin > 0 && (
            <motion.div
              initial={{ y: 50, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: -50, opacity: 0 }}
              className="absolute top-4 left-1/2 -translate-x-1/2 z-40"
            >
              <div className="bg-gradient-to-r from-green-500/90 to-emerald-500/90 backdrop-blur-sm px-8 py-3 rounded-full border border-green-400/50 shadow-lg shadow-green-500/30">
                <div className="text-2xl font-black text-white">
                  +<CoinAmount value={formatCoins(lastWin)} iconSize={24} />
                </div>
              </div>
            </motion.div>
          )}

          <div className="relative z-10">
            <div className="flex flex-col items-center mb-6">
              <div className="text-[10px] uppercase tracking-[0.3em] text-white/30 font-black">SLOTS</div>
              <div className="text-4xl font-black italic text-white tracking-tighter mt-1">
                <span className="text-red-500">LUCKY</span>
                <span className="text-yellow-400">7</span>
                <span className="text-red-500">SLOTS</span>
              </div>
              <div className="text-xs text-white/40 mt-1">Classic 3-Reel Slot Machine</div>
            </div>

            <div className="flex justify-center gap-3 mb-6">
              {reels.map((reel, i) => (
                <SlotReel
                  key={i}
                  symbols={reel}
                  spinning={spinning[i]}
                  onStop={() => {}}
                  targetSymbol={reel[0]}
                />
              ))}
            </div>

            <div className="flex justify-center gap-8 mb-6">
              {PAYLINES.slice(0, 3).map((payline, i) => (
                <div
                  key={i}
                  className="text-[10px] text-white/30 font-black uppercase tracking-wider"
                >
                  {payline.name}
                </div>
              ))}
            </div>

            <div className="text-center">
              <div className="inline-block bg-black/60 border border-white/10 rounded-xl px-6 py-3">
                <div className="text-xs text-white/40 mb-1">Message</div>
                <div className={cn(
                  'text-lg font-black',
                  lastWin > 0 ? 'text-green-400' : 'text-white/70'
                )}>
                  {message}
                </div>
              </div>
            </div>

            {lastWinLines.length > 0 && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="mt-4 text-center space-y-1"
              >
                {lastWinLines.slice(0, 3).map((line, i) => (
                  <div key={i} className="text-xs text-white/50">{line}</div>
                ))}
              </motion.div>
            )}
          </div>

          <div className="absolute bottom-4 left-4 text-[10px] text-white/20">
            Press SPACE or click SPIN to play
          </div>
          <div className="absolute bottom-4 right-4 text-[10px] text-white/20">
            Bet: <CoinAmount value={formatCoins(bet)} iconSize={12} />
          </div>
        </div>
      </div>
    </div>
  );
};
