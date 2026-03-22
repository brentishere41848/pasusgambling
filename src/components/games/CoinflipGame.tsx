import React, { useCallback, useEffect, useState, useRef } from 'react';
import { motion } from 'motion/react';
import { useBalance } from '../../context/BalanceContext';
import { cn } from '../../lib/utils';
import { Play, RotateCcw, Timer, Zap } from 'lucide-react';
import { logBetActivity } from '../../lib/activity';
import { useGameHotkeys, QuickBetButtons, GameStatsBar, useLocalGameStats } from './GameHooks';

type CoinSide = 'heads' | 'tails';

const HOUSE_EDGE_MULTIPLIER = 1.96;
const PLAYER_WIN_CHANCE = 0.46;

export const CoinflipGame: React.FC = () => {
  const { balance, addBalance, subtractBalance } = useBalance();
  const [bet, setBet] = useState(10);
  const [selectedSide, setSelectedSide] = useState<CoinSide>('heads');
  const [result, setResult] = useState<CoinSide | null>(null);
  const [isFlipping, setIsFlipping] = useState(false);
  const [isAuto, setIsAuto] = useState(false);
  const [isFast, setIsFast] = useState(false);
  const [autoRounds, setAutoRounds] = useState(10);
  const [remainingRounds, setRemainingRounds] = useState(0);
  const [coinRotation, setCoinRotation] = useState(0);
  const isAutoRef = useRef(false);
  const remainingRoundsRef = useRef(0);
  const { getStats, recordBet } = useLocalGameStats('coinflip');
  const stats = getStats();

  const stopAuto = () => { setIsAuto(false); setRemainingRounds(0); isAutoRef.current = false; remainingRoundsRef.current = 0; };
  useEffect(() => { isAutoRef.current = isAuto; }, [isAuto]);
  useEffect(() => { remainingRoundsRef.current = remainingRounds; }, [remainingRounds]);

  const runFlip = useCallback(() => {
    if (!subtractBalance(bet)) { stopAuto(); return; }
    setIsFlipping(true);
    const didWinRoll = Math.random() < PLAYER_WIN_CHANCE;
    const landed: CoinSide = didWinRoll ? selectedSide : selectedSide === 'heads' ? 'tails' : 'heads';
    const extraSpins = isFast ? 6 : 9;
    const targetFaceRotation = landed === 'heads' ? 0 : 180;
    setCoinRotation((current) => {
      const normalizedCurrent = ((current % 360) + 360) % 360;
      const deltaToTarget = ((targetFaceRotation - normalizedCurrent) + 360) % 360;
      return current + extraSpins * 360 + deltaToTarget;
    });
    setResult(null);
    const duration = isFast ? 450 : 1100;

    window.setTimeout(() => {
      const didWin = landed === selectedSide;
      setResult(landed);
      if (didWin) {
        const payout = Math.round(bet * HOUSE_EDGE_MULTIPLIER);
        addBalance(payout);
        logBetActivity({ gameKey: 'coinflip', wager: bet, payout, multiplier: HOUSE_EDGE_MULTIPLIER, outcome: 'win', detail: `Called ${selectedSide}, landed ${landed}` });
        recordBet(bet, payout, true);
      } else {
        logBetActivity({ gameKey: 'coinflip', wager: bet, payout: 0, multiplier: 0, outcome: 'loss', detail: `Called ${selectedSide}, landed ${landed}` });
        recordBet(bet, 0, false);
      }
      setIsFlipping(false);
      if (isAutoRef.current && remainingRoundsRef.current > 1) setRemainingRounds(prev => prev - 1);
      else if (isAutoRef.current) stopAuto();
    }, duration);
  }, [addBalance, bet, isFast, selectedSide, subtractBalance, recordBet]);

  useEffect(() => {
    if (isAuto && remainingRounds > 0 && !isFlipping) {
      const timer = window.setTimeout(runFlip, isFast ? 60 : 280);
      return () => window.clearTimeout(timer);
    }
  }, [isAuto, remainingRounds, isFlipping, runFlip, isFast]);

  const toggleAuto = () => {
    if (isAuto) { stopAuto(); return; }
    setIsAuto(true);
    setRemainingRounds(autoRounds);
    isAutoRef.current = true;
    remainingRoundsRef.current = autoRounds;
  };

  useGameHotkeys({ onBet: runFlip, onStop: stopAuto, onAuto: toggleAuto, isDisabled: (balance < bet && !isAuto) || (isFlipping && !isAuto) });

  return (
    <div className="flex flex-col lg:grid lg:grid-cols-4 gap-6 p-4 max-w-6xl mx-auto">
      <div className="lg:col-span-1 bg-[#111] border border-white/10 rounded-2xl p-6 flex flex-col gap-4">
        <div className="space-y-4">
          <div>
            <label className="text-xs uppercase tracking-widest text-white/40 mb-2 block">Bet Amount</label>
            <input type="number" value={bet} onChange={(e) => setBet(Math.max(1, Number(e.target.value)))} disabled={isFlipping || isAuto} className="w-full bg-black border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-[#00FF88]/50" />
            <QuickBetButtons balance={balance} bet={bet} onSetBet={setBet} disabled={isFlipping || isAuto} />
          </div>

          <div>
            <label className="text-xs uppercase tracking-widest text-white/40 mb-2 block">Choose Side</label>
            <div className="grid grid-cols-2 gap-2">
              {(['heads', 'tails'] as CoinSide[]).map((side) => (
                <button key={side} onClick={() => setSelectedSide(side)} disabled={isFlipping || isAuto} className={cn('py-3 rounded-xl text-xs font-black uppercase tracking-[0.2em] transition-all', selectedSide === side ? 'bg-white text-black' : 'bg-white/5 text-white/40 hover:text-white')}>{side}</button>
              ))}
            </div>
          </div>

          <div className="flex gap-2">
            <button onClick={() => setIsFast((current) => !current)} className={cn('flex-1 py-2 rounded-lg text-[10px] font-black uppercase tracking-widest flex items-center justify-center gap-2 transition-all', isFast ? 'bg-yellow-500/20 text-yellow-500 border border-yellow-500/50' : 'bg-white/5 text-white/20 border border-transparent')}>
              <Zap size={12} fill={isFast ? 'currentColor' : 'none'} />FAST
            </button>
            <button onClick={toggleAuto} className={cn('flex-1 py-2 rounded-lg text-[10px] font-black uppercase tracking-widest flex items-center justify-center gap-2 transition-all', isAuto ? 'bg-[#00FF88]/20 text-[#00FF88] border border-[#00FF88]/50' : 'bg-white/5 text-white/20 border border-transparent')}>
              <RotateCcw size={12} className={isAuto ? 'animate-spin' : ''} />AUTO
            </button>
          </div>

          {isAuto && (
            <div className="space-y-2">
              <div className="flex justify-between text-[10px] uppercase tracking-widest text-white/20"><span>Rounds</span><span>{remainingRounds} left</span></div>
              <input type="number" value={autoRounds} onChange={(e) => setAutoRounds(Math.max(1, Number(e.target.value)))} disabled={isFlipping || isAuto} className="w-full bg-black border border-white/10 rounded-xl px-4 py-2 text-xs text-white focus:outline-none focus:border-[#00FF88]/50" />
            </div>
          )}

          <button onClick={isAuto ? toggleAuto : runFlip} disabled={(balance < bet && !isAuto) || (isFlipping && !isAuto)} className={cn('w-full py-4 rounded-xl font-bold transition-all flex items-center justify-center gap-2 disabled:opacity-50', isAuto ? 'bg-red-500 text-white' : 'bg-[#00FF88] text-black')}>
            {isAuto ? <><Timer size={18} />STOP AUTO</> : <><Play size={18} fill="currentColor" />FLIP COIN</>}
          </button>
          <div className="text-[9px] text-center text-white/20 uppercase tracking-widest">Space: Flip &nbsp;|&nbsp; Esc: Stop &nbsp;|&nbsp; A: Auto</div>
        </div>

        <div className="space-y-3">
          <div className="flex justify-between text-xs"><span className="text-white/40">Payout</span><span className="text-white font-mono">{HOUSE_EDGE_MULTIPLIER.toFixed(2)}x</span></div>
          <div className="flex justify-between text-xs"><span className="text-white/40">Win Chance</span><span className="text-white font-mono">{(PLAYER_WIN_CHANCE * 100).toFixed(2)}%</span></div>
        </div>

        <GameStatsBar stats={[
          { label: 'Bets', value: String(stats.totalBets) },
          { label: 'Wins', value: String(stats.totalWins) },
          { label: 'Biggest', value: `$${(stats.biggestWin / 100).toFixed(2)}` },
          { label: 'Wagered', value: `$${(stats.totalWagered / 100).toFixed(2)}` },
        ]} />
      </div>

      <div className="lg:col-span-3 bg-black border border-white/10 rounded-2xl p-10 flex flex-col items-center justify-center gap-8 min-h-[620px]">
        <div className="text-[10px] uppercase tracking-[0.28em] text-white/25 font-black">
          Call {selectedSide.toUpperCase()} and beat the flip
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
              <div className="absolute inset-0 flex items-center justify-center">
                <img
                  src="/assets/heads.png"
                  alt="Heads"
                  className="h-full w-full object-contain drop-shadow-[0_0_28px_rgba(160,255,230,0.22)]"
                />
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
              <div className="absolute inset-0 flex items-center justify-center">
                <img
                  src="/assets/tails.png"
                  alt="Tails"
                  className="h-full w-full object-contain drop-shadow-[0_0_28px_rgba(160,255,230,0.22)]"
                />
              </div>
            </div>

          </motion.div>
        </motion.div>

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
              {result === null ? (isFlipping ? 'Flipping' : 'Ready') : result === selectedSide ? 'Win' : 'Loss'}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
