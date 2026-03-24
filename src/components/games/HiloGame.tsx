import React, { useMemo, useState } from 'react';
import { motion } from 'motion/react';
import { useBalance } from '../../context/BalanceContext';
import { cn } from '../../lib/utils';
import { ArrowDown, ArrowUp, Play, RotateCcw, Wallet } from 'lucide-react';
import confetti from 'canvas-confetti';
import { logBetActivity } from '../../lib/activity';
import { QuickBetButtons, GameStatsBar, useLocalGameStats } from './GameHooks';

const SUITS = ['\u2660', '\u2663', '\u2665', '\u2666'] as const;
const VALUES = ['A', '2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K'] as const;
const TARGET_OPTIONS = [1.5, 2, 3, 5] as const;
const HOUSE_EDGE = 0.94;

type Card = {
  value: typeof VALUES[number];
  suit: typeof SUITS[number];
  rank: number;
};

const randomCard = (): Card => {
  const rank = Math.floor(Math.random() * 13) + 1;
  return {
    value: VALUES[rank - 1],
    suit: SUITS[Math.floor(Math.random() * SUITS.length)],
    rank,
  };
};

const suitColor = (suit: Card['suit']) => (suit === '\u2665' || suit === '\u2666' ? 'text-red-500' : 'text-black');

const CardFace = ({ card, isFocused = false }: { card: Card; isFocused?: boolean }) => (
  <motion.div
    key={`${card.value}-${card.suit}-${isFocused ? 'focus' : 'side'}`}
    initial={{ rotateY: 90, opacity: 0 }}
    animate={{ rotateY: 0, opacity: 1, scale: isFocused ? 1 : 0.92 }}
    transition={{ duration: 0.28 }}
    className={cn(
      'rounded-[28px] flex flex-col justify-between shadow-xl border-2 bg-white text-black',
      isFocused ? 'w-28 h-40 md:w-36 md:h-52 p-4 md:p-5' : 'w-24 h-34 md:w-28 md:h-40 p-3 md:p-4 border-white/10 opacity-70'
    )}
  >
    <div className={cn('text-xl md:text-2xl font-black leading-none', suitColor(card.suit))}>
      {card.value}
      <div>{card.suit}</div>
    </div>
    <div className={cn('self-center text-4xl md:text-6xl leading-none', suitColor(card.suit))}>{card.suit}</div>
    <div className={cn('self-end rotate-180 text-xl md:text-2xl font-black leading-none', suitColor(card.suit))}>
      {card.value}
      <div>{card.suit}</div>
    </div>
  </motion.div>
);

const getGuessChance = (card: Card, guess: 'higher' | 'lower') => {
  const winningRanks = guess === 'higher' ? 13 - card.rank : card.rank - 1;
  return winningRanks / 13;
};

const getStepMultiplier = (card: Card, guess: 'higher' | 'lower') => {
  const chance = getGuessChance(card, guess);
  if (chance <= 0) {
    return 0;
  }
  return Number((HOUSE_EDGE / chance).toFixed(2));
};

export const HiloGame: React.FC = () => {
  const { balance, addBalance, subtractBalance } = useBalance();
  const [bet, setBet] = useState(10);
  const [currentCard, setCurrentCard] = useState<Card>(() => randomCard());
  const [previousCard, setPreviousCard] = useState<Card | null>(null);
  const [runMultiplier, setRunMultiplier] = useState(1);
  const [targetMultiplier, setTargetMultiplier] = useState<(typeof TARGET_OPTIONS)[number]>(2);
  const [isResolving, setIsResolving] = useState(false);
  const [isActiveRun, setIsActiveRun] = useState(false);
  const [streak, setStreak] = useState(0);
  const [status, setStatus] = useState('Start a run, pick higher or lower, then cash out when you want.');
  const { getStats, recordBet } = useLocalGameStats('hilo');
  const stats = getStats();

  const higherMultiplier = useMemo(() => getStepMultiplier(currentCard, 'higher'), [currentCard]);
  const lowerMultiplier = useMemo(() => getStepMultiplier(currentCard, 'lower'), [currentCard]);
  const potentialCashout = Number((bet * runMultiplier).toFixed(2));

  const adjustBet = (mode: 'double' | 'max') => {
    setBet((prev) => {
      if (mode === 'double') { return Math.max(1, Math.min(Math.floor(balance), prev * 2)); }
      return Math.max(1, Math.floor(balance));
    });
  };

  const resetBoard = () => {
    setCurrentCard(randomCard());
    setPreviousCard(null);
    setRunMultiplier(1);
    setStreak(0);
    setIsActiveRun(false);
    setIsResolving(false);
    setStatus('Deck reset. Start a new run when ready.');
  };

  const startRun = () => {
    if (isActiveRun || isResolving || !subtractBalance(bet)) {
      return;
    }
    setCurrentCard(randomCard());
    setPreviousCard(null);
    setRunMultiplier(1);
    setStreak(0);
    setIsActiveRun(true);
    setStatus(`Run started at ${targetMultiplier.toFixed(2)}x target. Make your first call.`);
  };

  const cashOut = () => {
    if (!isActiveRun || isResolving) return;
    const payout = Number((bet * runMultiplier).toFixed(2));
    addBalance(payout);
    logBetActivity({ gameKey: 'hilo', wager: bet, payout, multiplier: Number(runMultiplier.toFixed(2)), outcome: runMultiplier > 1 ? 'win' : 'push', detail: `Cashed out after ${streak} call${streak === 1 ? '' : 's'}` });
    if (runMultiplier >= targetMultiplier) confetti({ particleCount: 90, spread: 55, origin: { y: 0.6 } });
    recordBet(bet, payout, runMultiplier > 1);
    setIsActiveRun(false);
    setStatus(`Cashed out for ${runMultiplier.toFixed(2)}x.`);
  };

  const playRound = (guess: 'higher' | 'lower') => {
    if (!isActiveRun || isResolving) {
      return;
    }

    const stepMultiplier = getStepMultiplier(currentCard, guess);
    if (stepMultiplier <= 0) {
      setStatus(`You cannot pick ${guess} on ${currentCard.value}.`);
      return;
    }

    setIsResolving(true);
    const startingCard = currentCard;
    const nextCard = randomCard();
    const didWin = guess === 'higher' ? nextCard.rank > startingCard.rank : nextCard.rank < startingCard.rank;

    window.setTimeout(() => {
      setPreviousCard(startingCard);
      setCurrentCard(nextCard);

      if (didWin) {
        const nextRunMultiplier = Number((runMultiplier * stepMultiplier).toFixed(2));
        setRunMultiplier(nextRunMultiplier);
        setStreak((prev) => prev + 1);
        setStatus(
          `${guess === 'higher' ? 'Higher' : 'Lower'} hit: ${startingCard.value}${startingCard.suit} to ${nextCard.value}${nextCard.suit} (${nextRunMultiplier.toFixed(2)}x)`
        );
      } else {
        setRunMultiplier(1);
        setStreak(0);
        setIsActiveRun(false);
        setStatus(
          nextCard.rank === startingCard.rank
            ? `Same card on ${nextCard.value}${nextCard.suit}. Run lost.`
            : `${guess === 'higher' ? 'Higher' : 'Lower'} missed. Run lost.`
        );
        logBetActivity({ gameKey: 'hilo', wager: bet, payout: 0, multiplier: 0, outcome: 'loss', detail: `${startingCard.value}${startingCard.suit} to ${nextCard.value}${nextCard.suit}` });
        recordBet(bet, 0, false);
      }

      setIsResolving(false);
    }, 420);
  };

  return (
    <div className="flex flex-col lg:grid lg:grid-cols-4 gap-6 p-4 max-w-6xl mx-auto">
      <div className="lg:col-span-1 bg-[#11161d] border border-white/10 rounded-2xl p-6 flex flex-col gap-4">
        <div>
          <label className="text-xs uppercase tracking-widest text-white/40 mb-2 block">Bet Amount</label>
          <input type="number" value={bet} onChange={(e) => setBet(Math.max(1, Number(e.target.value)))} min="0.01" step="0.01" disabled={isResolving || isActiveRun} className="w-full bg-black border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-[#00FF88]/50" />
          <QuickBetButtons balance={balance} bet={bet} onSetBet={setBet} disabled={isResolving || isActiveRun} />
        </div>

        <div>
          <label className="text-xs uppercase tracking-widest text-white/40 mb-2 block">Target Payout</label>
          <div className="grid grid-cols-2 gap-2">
            {TARGET_OPTIONS.map((option) => (
              <button
                key={option}
                onClick={() => setTargetMultiplier(option)}
                disabled={isResolving}
                className={cn(
                  'rounded-xl py-3 text-[11px] font-black uppercase tracking-widest transition-all',
                  targetMultiplier === option ? 'bg-[#00FF88] text-black' : 'bg-white/5 text-white/50 hover:text-white'
                )}
              >
                {option.toFixed(2)}x
              </button>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-2 gap-2">
          <button
            onClick={() => playRound('higher')}
            disabled={!isActiveRun || isResolving || higherMultiplier <= 0}
            className="rounded-xl bg-[#00FF88] text-black py-4 font-black flex items-center justify-center gap-2 disabled:opacity-40"
          >
            <ArrowUp size={18} /> Higher
          </button>
          <button
            onClick={() => playRound('lower')}
            disabled={!isActiveRun || isResolving || lowerMultiplier <= 0}
            className="rounded-xl bg-white text-black py-4 font-black flex items-center justify-center gap-2 disabled:opacity-40"
          >
            <ArrowDown size={18} /> Lower
          </button>
        </div>

        <div className="grid grid-cols-2 gap-2">
          <button
            onClick={isActiveRun ? cashOut : startRun}
            disabled={isResolving || (!isActiveRun && balance < bet)}
            className="rounded-xl bg-[#00FF88] text-black py-3 font-black flex items-center justify-center gap-2 disabled:opacity-40"
          >
            {isActiveRun ? <Wallet size={16} /> : <Play size={16} fill="currentColor" />}
            {isActiveRun ? 'Cash Out' : 'Start Run'}
          </button>
          <button
            onClick={resetBoard}
            disabled={isResolving}
            className="rounded-xl bg-white/5 py-3 text-white font-bold flex items-center justify-center gap-2"
          >
            <RotateCcw size={16} /> Reset
          </button>
        </div>

        <div className="mt-auto rounded-2xl border border-white/10 bg-black/30 p-4 space-y-2 text-xs">
          <div className="flex justify-between"><span className="text-white/35">Run Multiplier</span><span className="font-mono text-[#00FF88]">{runMultiplier.toFixed(2)}x</span></div>
          <div className="flex justify-between"><span className="text-white/35">Cash Out</span><span className="font-mono">${potentialCashout.toFixed(2)}</span></div>
          <div className="flex justify-between"><span className="text-white/35">Next Higher</span><span className="font-mono">{higherMultiplier > 0 ? `${higherMultiplier.toFixed(2)}x` : 'Blocked'}</span></div>
          <div className="flex justify-between"><span className="text-white/35">Next Lower</span><span className="font-mono">{lowerMultiplier > 0 ? `${lowerMultiplier.toFixed(2)}x` : 'Blocked'}</span></div>
          <div className="flex justify-between"><span className="text-white/35">Target</span><span className={cn('font-mono', runMultiplier >= targetMultiplier ? 'text-[#00FF88]' : 'text-white')}>{targetMultiplier.toFixed(2)}x</span></div>
          <div className="text-white/60">{status}</div>
        </div>
      </div>

      <div className="lg:col-span-3 bg-black border border-white/10 rounded-2xl p-10 flex flex-col items-center justify-center gap-8 min-h-[520px]">
        <div className="text-[10px] uppercase tracking-[0.28em] text-white/20">HiLo Table</div>
        <div className="flex items-center gap-6 md:gap-10">
          {previousCard ? (
            <CardFace card={previousCard} />
          ) : (
            <div className="w-24 h-34 md:w-28 md:h-40 rounded-[28px] border border-dashed border-white/10 bg-white/[0.03]" />
          )}
          <CardFace card={currentCard} isFocused />
        </div>
        <div className="w-full max-w-2xl rounded-[32px] border border-white/10 bg-white/[0.03] px-6 py-5">
          <div className="grid grid-cols-2 gap-4 text-center">
            <div className="rounded-2xl border border-white/5 bg-black/30 px-4 py-4">
              <div className="text-[10px] uppercase tracking-[0.2em] text-white/30">Higher From Here</div>
              <div className="mt-2 text-2xl font-black text-[#00FF88]">{higherMultiplier > 0 ? `${higherMultiplier.toFixed(2)}x` : 'Blocked'}</div>
            </div>
            <div className="rounded-2xl border border-white/5 bg-black/30 px-4 py-4">
              <div className="text-[10px] uppercase tracking-[0.2em] text-white/30">Lower From Here</div>
              <div className="mt-2 text-2xl font-black text-white">{lowerMultiplier > 0 ? `${lowerMultiplier.toFixed(2)}x` : 'Blocked'}</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
