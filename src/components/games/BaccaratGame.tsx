import React, { useMemo, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { useBalance } from '../../context/BalanceContext';
import { cn } from '../../lib/utils';
import { Play } from 'lucide-react';
import confetti from 'canvas-confetti';
import { logBetActivity } from '../../lib/activity';
import { QuickBetButtons, MobileBetControls, GameStatsBar, useLocalGameStats, centsToDollars, dollarsToCents, formatCents, MIN_BET } from './GameHooks';

type BaccaratBet = 'player' | 'banker' | 'tie';

const SUITS = ['\u2660', '\u2663', '\u2665', '\u2666'] as const;
const VALUES = ['A', '2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K'] as const;

type Card = {
  value: typeof VALUES[number];
  suit: typeof SUITS[number];
  baccaratValue: number;
};

const drawCard = (): Card => {
  const rank = Math.floor(Math.random() * 13);
  return {
    value: VALUES[rank],
    suit: SUITS[Math.floor(Math.random() * SUITS.length)],
    baccaratValue: rank === 0 ? 1 : rank >= 9 ? 0 : rank + 1,
  };
};

const handTotal = (cards: Card[]) => cards.reduce((sum, card) => sum + card.baccaratValue, 0) % 10;
const suitColor = (suit: Card['suit']) => (suit === '\u2665' || suit === '\u2666' ? 'text-red-500' : 'text-black');

const TableCard: React.FC<{ card: Card }> = ({ card }) => (
  <motion.div
    initial={{ rotateY: 90, opacity: 0 }}
    animate={{ rotateY: 0, opacity: 1 }}
    transition={{ duration: 0.28 }}
    className="w-24 h-34 md:w-28 md:h-40 rounded-[24px] border-2 bg-white text-black flex flex-col justify-between p-3 md:p-4 shadow-xl"
  >
    <div className={cn('text-lg md:text-xl font-black leading-none', suitColor(card.suit))}>
      {card.value}
      <div>{card.suit}</div>
    </div>
    <div className={cn('self-center text-4xl md:text-5xl leading-none', suitColor(card.suit))}>{card.suit}</div>
    <div className={cn('self-end rotate-180 text-lg md:text-xl font-black leading-none', suitColor(card.suit))}>
      {card.value}
      <div>{card.suit}</div>
    </div>
  </motion.div>
);

export const BaccaratGame: React.FC = () => {
  const { balance, addBalance, subtractBalance } = useBalance();
  const [bet, setBet] = useState(1);
  const [selectedBet, setSelectedBet] = useState<BaccaratBet>('player');
  const [playerCards, setPlayerCards] = useState<Card[]>([]);
  const [bankerCards, setBankerCards] = useState<Card[]>([]);
  const [result, setResult] = useState<BaccaratBet | null>(null);
  const [isDealing, setIsDealing] = useState(false);
  const [status, setStatus] = useState('Bet on Player, Banker, or Tie');
  const { getStats, recordBet } = useLocalGameStats('baccarat');
  const stats = getStats();
  const betCents = dollarsToCents(bet);

  const payout = useMemo(() => (selectedBet === 'tie' ? 8 : selectedBet === 'banker' ? 1.95 : 2), [selectedBet]);

  const adjustBet = (mode: 'double' | 'max') => {
    setBet((prev) => {
      if (mode === 'double') {
        return Math.max(MIN_BET, Math.min(centsToDollars(balance), Number((prev * 2).toFixed(2))));
      }
      return Math.max(MIN_BET, centsToDollars(balance));
    });
  };

  const deal = () => {
    if (isDealing || !subtractBalance(betCents)) {
      return;
    }

    setIsDealing(true);
    setResult(null);

    const pCards = [drawCard(), drawCard()];
    const bCards = [drawCard(), drawCard()];
    setPlayerCards(pCards);
    setBankerCards(bCards);

    window.setTimeout(() => {
      const playerTotal = handTotal(pCards);
      const bankerTotal = handTotal(bCards);
      const outcome: BaccaratBet = playerTotal === bankerTotal ? 'tie' : playerTotal > bankerTotal ? 'player' : 'banker';
      setResult(outcome);

      if (outcome === selectedBet) {
        const winAmount = Math.round(betCents * payout);
        addBalance(winAmount);
        setStatus(`${outcome.toUpperCase()} wins ${playerTotal} to ${bankerTotal}`);
        logBetActivity({ gameKey: 'baccarat', wager: betCents, payout: winAmount, multiplier: payout, outcome: 'win', detail: `Player ${playerTotal} Banker ${bankerTotal}` });
        confetti({ particleCount: 80, spread: 60, origin: { y: 0.6 } });
        recordBet(betCents, winAmount, true);
      } else {
        setStatus(`${outcome.toUpperCase()} wins ${playerTotal} to ${bankerTotal}`);
        logBetActivity({ gameKey: 'baccarat', wager: betCents, payout: 0, multiplier: 0, outcome: 'loss', detail: `Player ${playerTotal} Banker ${bankerTotal}` });
        recordBet(betCents, 0, false);
      }

      setIsDealing(false);
    }, 750);
  };

  const BetButton = ({ type, label, accent }: { type: BaccaratBet; label: string; accent: string }) => (
    <button
      onClick={() => setSelectedBet(type)}
      disabled={isDealing}
      className={cn(
        'rounded-2xl border px-4 py-4 text-sm font-black uppercase tracking-[0.16em] transition-all',
        selectedBet === type ? `${accent} border-white text-white` : 'border-white/10 bg-white/5 text-white/50'
      )}
    >
      {label}
    </button>
  );

  return (
    <div className="flex flex-col lg:grid lg:grid-cols-4 gap-6 p-4 max-w-6xl mx-auto">
      <div className="lg:col-span-1 bg-[linear-gradient(180deg,#1a1d2f_0%,#131827_100%)] border border-blue-300/20 rounded-3xl p-6 flex flex-col gap-4 shadow-[0_20px_65px_rgba(0,0,0,0.35)]">
        <div>
          <label className="text-xs uppercase tracking-widest text-white/40 mb-2 block">Bet Amount</label>
          <input type="number" value={bet} onChange={(e) => setBet(Math.max(MIN_BET, Number(e.target.value)))} min="0.01" step="0.01" disabled={isDealing} className="w-full bg-black/45 border border-white/12 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-blue-300/60" />
          <QuickBetButtons balance={centsToDollars(balance)} bet={bet} onSetBet={setBet} disabled={isDealing} />
          <MobileBetControls balance={balance} bet={bet} onSetBet={setBet} disabled={isDealing} />
        </div>

        <div className="grid grid-cols-1 gap-2">
          <BetButton type="player" label="Player" accent="bg-blue-600/80" />
          <BetButton type="banker" label="Banker" accent="bg-red-600/80" />
          <BetButton type="tie" label="Tie" accent="bg-[#00FF88]/30" />
        </div>

        <button onClick={deal} disabled={isDealing || balance < betCents} className="rounded-xl bg-gradient-to-r from-blue-300 to-cyan-300 text-slate-900 py-4 font-black flex items-center justify-center gap-2 disabled:opacity-40">
          <Play size={18} fill="currentColor" /> DEAL
        </button>

        <div className="mt-auto rounded-2xl border border-white/10 bg-black/30 p-4 space-y-2 text-xs">
          <div className="flex justify-between"><span className="text-white/35">Selected</span><span>{selectedBet.toUpperCase()}</span></div>
          <div className="flex justify-between"><span className="text-white/35">Payout</span><span className="font-mono text-[#00FF88]">{payout.toFixed(2)}x</span></div>
          <div className="text-white/60">{status}</div>
          <GameStatsBar stats={[
            { label: 'Bets', value: String(stats.totalBets) },
            { label: 'Wins', value: String(stats.totalWins) },
            { label: 'Biggest', value: formatCents(stats.biggestWin) },
            { label: 'Wagered', value: formatCents(stats.totalWagered) },
          ]} />
        </div>
      </div>

      <div className="lg:col-span-3 bg-[linear-gradient(180deg,#101628_0%,#0a101e_100%)] border border-blue-300/20 rounded-3xl p-10 flex flex-col items-center justify-center gap-8 min-h-[520px] shadow-[0_20px_70px_rgba(0,0,0,0.38)]">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 w-full max-w-4xl">
          <div className="rounded-[28px] border border-blue-500/30 bg-blue-500/10 p-6">
            <div className="text-[10px] uppercase tracking-[0.2em] text-blue-200 font-black">Player</div>
            <div className="mt-4 flex gap-3 min-h-[160px] items-center">
              <AnimatePresence>
                {playerCards.map((card, index) => (
                  <TableCard key={`p-${index}-${card.value}-${card.suit}`} card={card} />
                ))}
              </AnimatePresence>
            </div>
            <div className="mt-4 text-2xl font-black">{handTotal(playerCards)}</div>
          </div>

          <div className="rounded-[28px] border border-red-500/30 bg-red-500/10 p-6">
            <div className="text-[10px] uppercase tracking-[0.2em] text-red-200 font-black">Banker</div>
            <div className="mt-4 flex gap-3 min-h-[160px] items-center">
              <AnimatePresence>
                {bankerCards.map((card, index) => (
                  <TableCard key={`b-${index}-${card.value}-${card.suit}`} card={card} />
                ))}
              </AnimatePresence>
            </div>
            <div className="mt-4 text-2xl font-black">{handTotal(bankerCards)}</div>
          </div>
        </div>

        <div className={cn('text-4xl font-black italic uppercase tracking-tighter', result === null ? 'text-white/25' : result === selectedBet ? 'text-[#00FF88]' : 'text-red-400')}>
          {result === null ? 'Waiting For Deal' : `${result.toUpperCase()} Wins`}
        </div>
      </div>
    </div>
  );
};
