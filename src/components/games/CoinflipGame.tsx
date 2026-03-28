import React, { useCallback, useEffect, useState } from 'react';
import { motion } from 'motion/react';
import { useBalance } from '../../context/BalanceContext';
import { cn } from '../../lib/utils';
import { Play, RotateCcw, X, Zap, Award } from 'lucide-react';
import { logBetActivity } from '../../lib/activity';
import { useGameHotkeys, QuickBetButtons, MobileBetControls, GameStatsBar, useLocalGameStats, centsToDollars, dollarsToCents, formatCents, MIN_BET } from './GameHooks';
import confetti from 'canvas-confetti';

type CoinSide = 'heads' | 'tails';

const MULTIPLIERS = [2, 2.2, 2.5, 3, 5, 10, 20, 50, 100];
const MAX_STREAK = MULTIPLIERS.length;

export const CoinflipGame: React.FC = () => {
  const { balance, addBalance, subtractBalance } = useBalance();
  const [bet, setBet] = useState(1);
  const [selectedSide, setSelectedSide] = useState<CoinSide>('heads');
  const [result, setResult] = useState<CoinSide | null>(null);
  const [isFlipping, setIsFlipping] = useState(false);
  const [currentMultiplier, setCurrentMultiplier] = useState(2);
  const [streak, setStreak] = useState(0);
  const [pendingWin, setPendingWin] = useState(0);
  const [showGamble, setShowGamble] = useState(false);
  const [lastWonAmount, setLastWonAmount] = useState(0);
  const [coinRotation, setCoinRotation] = useState(0);
  const [isFast, setIsFast] = useState(false);
  
  const { getStats, recordBet } = useLocalGameStats('coinflip');
  const stats = getStats();
  const betCents = dollarsToCents(bet);

  const runFlip = useCallback(() => {
    if (!subtractBalance(betCents)) return;
    
    setIsFlipping(true);
    setResult(null);
    setShowGamble(false);
    setPendingWin(0);
    setStreak(0);
    setCurrentMultiplier(2);

    const didWin = Math.random() < 0.5;
    const landed: CoinSide = didWin ? selectedSide : selectedSide === 'heads' ? 'tails' : 'heads';
    
    const extraSpins = isFast ? 6 : 9;
    const targetFaceRotation = landed === 'heads' ? 0 : 180;
    setCoinRotation((current) => {
      const normalizedCurrent = ((current % 360) + 360) % 360;
      const deltaToTarget = ((targetFaceRotation - normalizedCurrent) + 360) % 360;
      return current + extraSpins * 360 + deltaToTarget;
    });

    const duration = isFast ? 450 : 1100;

    window.setTimeout(() => {
      setResult(landed);
      setIsFlipping(false);

      if (didWin) {
        const winAmount = Math.round(betCents * 2);
        addBalance(winAmount);
        setPendingWin(winAmount);
        setLastWonAmount(winAmount);
        setShowGamble(true);
        
        logBetActivity({ gameKey: 'coinflip', wager: betCents, payout: winAmount, multiplier: 2, outcome: 'win', detail: `Called ${selectedSide}, landed ${landed}` });
        recordBet(betCents, winAmount, true);
        confetti({ particleCount: 80, spread: 60, origin: { y: 0.6 } });
      } else {
        logBetActivity({ gameKey: 'coinflip', wager: betCents, payout: 0, multiplier: 0, outcome: 'loss', detail: `Called ${selectedSide}, landed ${landed}` });
        recordBet(betCents, 0, false);
      }
    }, duration);
  }, [addBalance, betCents, isFast, selectedSide, subtractBalance, recordBet]);

  const gambleWin = useCallback(() => {
    if (pendingWin <= 0 || streak >= MAX_STREAK - 1) return;

    const newStreak = streak + 1;
    const newMultiplier = MULTIPLIERS[newStreak];
    const gambleAmount = Math.round(pendingWin * (newMultiplier / MULTIPLIERS[streak]));

    const didWin = Math.random() < 0.5;
    const landed: CoinSide = didWin ? selectedSide : selectedSide === 'heads' ? 'tails' : 'heads';
    
    setIsFlipping(true);
    const extraSpins = isFast ? 6 : 9;
    const targetFaceRotation = landed === 'heads' ? 0 : 180;
    setCoinRotation((current) => {
      const normalizedCurrent = ((current % 360) + 360) % 360;
      const deltaToTarget = ((targetFaceRotation - normalizedCurrent) + 360) % 360;
      return current + extraSpins * 360 + deltaToTarget;
    });

    const duration = isFast ? 450 : 1100;

    window.setTimeout(() => {
      setResult(landed);
      setIsFlipping(false);

      if (didWin) {
        const winAmount = gambleAmount;
        setPendingWin(winAmount);
        setStreak(newStreak);
        setCurrentMultiplier(newMultiplier);
        
        confetti({ particleCount: 60, spread: 50, origin: { y: 0.6 } });
        
        if (newStreak === MAX_STREAK - 1) {
          addBalance(winAmount);
          setPendingWin(0);
          setShowGamble(false);
          setLastWonAmount(0);
        }
        
        logBetActivity({ gameKey: 'coinflip', wager: pendingWin, payout: winAmount, multiplier: newMultiplier, outcome: 'win', detail: `Gambled ${streak + 1}x, won ${newStreak + 1}x` });
        recordBet(pendingWin, winAmount, true);
      } else {
        setPendingWin(0);
        setShowGamble(false);
        setStreak(0);
        setCurrentMultiplier(2);
        
        logBetActivity({ gameKey: 'coinflip', wager: pendingWin, payout: 0, multiplier: 0, outcome: 'loss', detail: `Gamble lost at ${newStreak + 1}x` });
        recordBet(pendingWin, 0, false);
      }
    }, duration);
  }, [isFast, pendingWin, selectedSide, streak, addBalance, recordBet]);

  const collectWinnings = useCallback(() => {
    if (pendingWin > 0) {
      addBalance(pendingWin);
      logBetActivity({ gameKey: 'coinflip', wager: betCents, payout: pendingWin, multiplier: currentMultiplier, outcome: 'win', detail: `Collected at ${currentMultiplier}x` });
      recordBet(betCents, pendingWin, true);
    }
    setPendingWin(0);
    setShowGamble(false);
    setStreak(0);
    setCurrentMultiplier(2);
    setResult(null);
  }, [addBalance, betCents, currentMultiplier, pendingWin, recordBet]);

  useGameHotkeys({
    onBet: () => {
      if (showGamble && pendingWin > 0) {
        gambleWin();
      } else if (!isFlipping) {
        runFlip();
      }
    },
    onStop: collectWinnings,
    isDisabled: isFlipping,
  });

  return (
    <div className="flex flex-col lg:grid lg:grid-cols-4 gap-6 p-4 max-w-6xl mx-auto">
      <div className="lg:col-span-1 bg-[linear-gradient(180deg,#201817_0%,#14100f_100%)] border border-amber-300/20 rounded-3xl p-6 flex flex-col gap-4 shadow-[0_20px_70px_rgba(0,0,0,0.35)]">
        <div className="space-y-4">
          <div>
            <label className="text-xs uppercase tracking-widest text-white/40 mb-2 block">Bet Amount</label>
            <input 
              type="number" 
              value={bet} 
              onChange={(e) => setBet(Math.max(MIN_BET, Number(e.target.value)))} 
              min="0.01"
              step="0.01"
              disabled={isFlipping || showGamble} 
                className="w-full bg-black/45 border border-white/12 rounded-xl px-4 py-3 text-white font-mono text-xl focus:outline-none focus:border-amber-300/60" 
            />
            <QuickBetButtons balance={centsToDollars(balance)} bet={bet} onSetBet={setBet} disabled={isFlipping || showGamble} />
            <MobileBetControls balance={balance} bet={bet} onSetBet={setBet} disabled={isFlipping || showGamble} />
          </div>

          <div>
            <label className="text-xs uppercase tracking-widest text-white/40 mb-2 block">Choose Side</label>
            <div className="grid grid-cols-2 gap-2">
              {(['heads', 'tails'] as CoinSide[]).map((side) => (
                <button 
                  key={side} 
                  onClick={() => setSelectedSide(side)} 
                  disabled={isFlipping || showGamble} 
                  className={cn(
                    'py-3 rounded-xl text-xs font-black uppercase tracking-[0.2em] transition-all',
                    selectedSide === side ? 'bg-white text-black' : 'bg-white/5 text-white/40 hover:text-white'
                  )}
                >
                  {side}
                </button>
              ))}
            </div>
          </div>

          <div className="flex gap-2">
            <button 
              onClick={() => setIsFast((current) => !current)} 
              disabled={isFlipping}
              className={cn(
                'flex-1 py-2 rounded-lg text-[10px] font-black uppercase tracking-widest flex items-center justify-center gap-2 transition-all',
                isFast ? 'bg-yellow-500/20 text-yellow-500 border border-yellow-500/50' : 'bg-white/5 text-white/20 border border-transparent'
              )}
            >
              <Zap size={12} fill={isFast ? 'currentColor' : 'none'} />FAST
            </button>
          </div>

          {!showGamble ? (
            <button 
              onClick={runFlip} 
                disabled={(balance < betCents) || isFlipping} 
              className={cn(
                'w-full py-4 rounded-xl font-bold transition-all flex items-center justify-center gap-2 disabled:opacity-50',
                'bg-gradient-to-r from-amber-300 to-yellow-200 hover:opacity-95 text-slate-900'
              )}
            >
              <Play size={18} fill="currentColor" />
              FLIP COIN
            </button>
          ) : (
            <div className="space-y-2">
              <button 
                onClick={collectWinnings} 
                disabled={isFlipping}
                className="w-full py-3 rounded-xl font-bold transition-all flex items-center justify-center gap-2 bg-green-500 hover:bg-green-600 text-black"
              >
                <Award size={18} />
                COLLECT {formatCents(pendingWin)}
              </button>
              <button 
                onClick={gambleWin} 
                disabled={isFlipping || streak >= MAX_STREAK - 1}
                className={cn(
                  'w-full py-3 rounded-xl font-bold transition-all flex items-center justify-center gap-2',
                  streak >= MAX_STREAK - 1 
                    ? 'bg-yellow-500/50 text-white/50 cursor-not-allowed' 
                    : 'bg-yellow-500 hover:bg-yellow-600 text-black'
                )}
              >
                <Zap size={18} />
                GAMBLE ({(MULTIPLIERS[streak + 1] || 100)}x)
              </button>
            </div>
          )}
          
          <div className="text-[9px] text-center text-white/20 uppercase tracking-widest">
            Space: Flip/Gamble &nbsp;|&nbsp; Esc: Collect
          </div>
        </div>

        <div className="space-y-3">
          <div className="flex justify-between text-xs">
            <span className="text-white/40">Base Payout</span>
            <span className="text-white font-mono">2.00x</span>
          </div>
          <div className="flex justify-between text-xs">
            <span className="text-white/40">Win Chance</span>
            <span className="text-white font-mono">50%</span>
          </div>
        </div>

        <GameStatsBar stats={[
          { label: 'Bets', value: String(stats.totalBets) },
          { label: 'Wins', value: String(stats.totalWins) },
          { label: 'Biggest', value: formatCents(stats.biggestWin) },
          { label: 'Wagered', value: formatCents(stats.totalWagered) },
        ]} />
      </div>

      <div className="lg:col-span-3 bg-[linear-gradient(180deg,#19120f_0%,#110d0a_100%)] border border-amber-300/20 rounded-3xl p-10 flex flex-col items-center justify-center gap-8 min-h-[620px] shadow-[0_20px_75px_rgba(0,0,0,0.4)]">
        {showGamble && pendingWin > 0 && (
          <motion.div 
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="absolute z-20 top-20"
          >
            <div className="bg-yellow-500/20 border border-yellow-500/50 backdrop-blur-md px-8 py-4 rounded-2xl text-center">
              <div className="text-yellow-400 text-sm font-black uppercase tracking-wider mb-1">Current Win</div>
               <div className="text-3xl font-black text-white">{formatCents(pendingWin)}</div>
              <div className="text-yellow-400 text-xs mt-1">Streak: {streak + 1}x {'->'} {currentMultiplier}x</div>
            </div>
          </motion.div>
        )}

        <div className="text-[10px] uppercase tracking-[0.28em] text-white/25 font-black">
          {showGamble ? `Gamble your winnings!` : `Call ${selectedSide.toUpperCase()} and beat the flip`}
        </div>

        <motion.div
          animate={{
            y: isFlipping ? [0, -34, 0] : 0,
            scale: isFlipping ? [1, 1.03, 1] : 1,
          }}
          transition={{
            duration: isFast ? 0.45 : 1.1,
            ease: 'easeInOut',
          }}
          className="relative [perspective:1400px]"
        >
          <motion.div
            animate={{
              rotateX: coinRotation,
              rotateZ: isFlipping ? [0, -10, 8, 0] : 0,
            }}
            transition={{
              rotateX: {
                duration: isFast ? 0.45 : 1.1,
                ease: [0.18, 0.9, 0.2, 1],
              },
              rotateZ: {
                duration: isFast ? 0.45 : 1.1,
                ease: 'easeInOut',
              },
            }}
            className="relative h-72 w-72"
            style={{ transformStyle: 'preserve-3d' }}
          >
            <div
              className="absolute inset-0 rounded-full shadow-[0_30px_90px_rgba(0,0,0,0.5)]"
              style={{ backfaceVisibility: 'hidden', WebkitBackfaceVisibility: 'hidden' }}
            >
              <div className="absolute inset-0 flex items-center justify-center rounded-full bg-[radial-gradient(circle_at_30%_30%,#fff6bf_0%,#f4d35e_30%,#b88718_65%,#6e4a0a_100%)] ring-1 ring-white/20">
                <div className="flex h-52 w-52 items-center justify-center rounded-full border border-black/10 bg-black/10 text-4xl font-black uppercase tracking-[0.28em] text-[#241400] shadow-[inset_0_0_32px_rgba(255,255,255,0.18)]">
                  Heads
                </div>
              </div>
            </div>

            <div
              className="absolute inset-0 rounded-full shadow-[0_30px_90px_rgba(0,0,0,0.5)]"
              style={{
                transform: 'rotateX(180deg)',
                backfaceVisibility: 'hidden',
                WebkitBackfaceVisibility: 'hidden',
              }}
            >
              <div className="absolute inset-0 flex items-center justify-center rounded-full bg-[radial-gradient(circle_at_30%_30%,#e7f2ff_0%,#9fc2ff_30%,#456bc7_65%,#1a275e_100%)] ring-1 ring-white/20">
                <div className="flex h-52 w-52 items-center justify-center rounded-full border border-white/10 bg-black/10 text-4xl font-black uppercase tracking-[0.28em] text-white shadow-[inset_0_0_32px_rgba(255,255,255,0.12)]">
                  Tails
                </div>
              </div>
            </div>
          </motion.div>
        </motion.div>

        {showGamble && (
          <div className="flex gap-2 flex-wrap justify-center">
            {MULTIPLIERS.map((mult, idx) => (
              <div
                key={mult}
                className={cn(
                  'px-3 py-1.5 rounded-lg text-[10px] font-black uppercase',
                  idx < streak ? 'bg-green-500/30 text-green-400' :
                  idx === streak ? 'bg-yellow-500/30 text-yellow-400 border border-yellow-500' :
                  idx === streak + 1 ? 'bg-white/10 text-white animate-pulse' :
                  'bg-white/5 text-white/30'
                )}
              >
                {mult}x
              </div>
            ))}
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 w-full max-w-3xl">
          <div className="rounded-3xl border border-white/10 bg-[#11161d] p-5">
            <div className="text-[10px] uppercase tracking-[0.18em] text-white/20 font-black">Your Call</div>
            <div className="mt-3 text-2xl font-black italic uppercase">{selectedSide}</div>
          </div>
          <div className="rounded-3xl border border-white/10 bg-[#11161d] p-5">
            <div className="text-[10px] uppercase tracking-[0.18em] text-white/20 font-black">Last Result</div>
            <div className="mt-3 text-2xl font-black italic uppercase">{result || 'Waiting'}</div>
          </div>
          <div className="rounded-3xl border border-white/10 bg-[#11161d] p-5">
            <div className="text-[10px] uppercase tracking-[0.18em] text-white/20 font-black">Outcome</div>
            <div className={cn(
              'mt-3 text-2xl font-black italic uppercase',
              result === null ? 'text-white/40' : result === selectedSide ? 'text-[#00FF88]' : 'text-red-400'
            )}>
              {result === null ? (isFlipping ? 'Flipping' : 'Ready') : result === selectedSide ? 'Win!' : 'Loss'}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
