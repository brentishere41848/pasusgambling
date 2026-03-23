import React, { useState, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { useBalance } from '../../context/BalanceContext';
import { cn } from '../../lib/utils';
import { Play, Hand, Square, User, Copy, ArrowDownToLine } from 'lucide-react';
import confetti from 'canvas-confetti';
import { logBetActivity } from '../../lib/activity';
import { QuickBetButtons, GameStatsBar, useLocalGameStats } from './GameHooks';

type Card = {
  suit: string;
  value: string;
  rank: number;
};

type HandStatus = 'active' | 'stand' | 'bust' | 'blackjack' | 'done';

type PlayerHand = {
  cards: Card[];
  bet: number;
  status: HandStatus;
  doubled?: boolean;
  splitFrom?: number;
};

type GamePhase = 'idle' | 'playing' | 'dealer_turn' | 'ended';

const SUITS = ['♠', '♣', '♥', '♦'];
const VALUES = ['2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K', 'A'];
const MAX_SPLITS = 3;
const NUM_DECKS = 8;

const createDeck = () => {
  const deck: Card[] = [];
  for (let d = 0; d < NUM_DECKS; d++) {
    for (const suit of SUITS) {
      for (let i = 0; i < VALUES.length; i++) {
        deck.push({
          suit,
          value: VALUES[i],
          rank: i + 2 > 11 ? 10 : i + 2 === 11 ? 11 : i + 2,
        });
      }
    }
  }
  return deck.sort(() => Math.random() - 0.5);
};

const calculateScore = (cards: Card[]) => {
  let score = 0;
  let aces = 0;
  for (const card of cards) {
    if (card.value === 'A') {
      aces++;
      score += 11;
    } else if (['J', 'Q', 'K'].includes(card.value)) {
      score += 10;
    } else {
      score += parseInt(card.value);
    }
  }
  while (score > 21 && aces > 0) {
    score -= 10;
    aces--;
  }
  return score;
};

const getCardValue = (card: Card) => {
  if (card.value === 'A') return 11;
  if (['J', 'Q', 'K'].includes(card.value)) return 10;
  return parseInt(card.value);
};

const canSplit = (hand: PlayerHand, allHands: PlayerHand[]) => {
  if (hand.cards.length !== 2) return false;
  if (hand.bet > balanceRef.current) return false;
  if (allHands.filter((h) => h.status === 'active' || h.status === 'stand').length >= MAX_SPLITS + 1) return false;
  return getCardValue(hand.cards[0]) === getCardValue(hand.cards[1]);
};

const canDouble = (hand: PlayerHand) => {
  if (hand.cards.length !== 2) return false;
  if (hand.bet > balanceRef.current) return false;
  return true;
};

let balanceRef: { current: number } = { current: 0 };

export const BlackjackGame: React.FC = () => {
  const { balance, addBalance, subtractBalance } = useBalance();
  balanceRef.current = balance;

  const [baseBet, setBaseBet] = useState(10);
  const [hands, setHands] = useState<PlayerHand[]>([]);
  const [dealerHand, setDealerHand] = useState<Card[]>([]);
  const [deck, setDeck] = useState<Card[]>([]);
  const [phase, setPhase] = useState<GamePhase>('idle');
  const [dealerReveal, setDealerReveal] = useState(false);
  const [messages, setMessages] = useState<{ hand: number; text: string; won: boolean }[]>([]);
  const [cardsRemaining, setCardsRemaining] = useState(0);
  const { getStats, recordBet } = useLocalGameStats('blackjack');
  const stats = getStats();

  const deckRef = useRef<Card[]>([]);

  const getActiveHandIndex = () => hands.findIndex((h) => h.status === 'active');

  const startNewGame = () => {
    const totalBets = baseBet;
    if (!subtractBalance(totalBets)) return;

    if (deckRef.current.length < 52) {
      deckRef.current = createDeck();
    }
    setCardsRemaining(deckRef.current.length);
    const newDeck = [...deckRef.current];
    deckRef.current = newDeck;

    const pCard1 = newDeck.pop()!;
    const pCard2 = newDeck.pop()!;
    const dCard1 = newDeck.pop()!;
    const dCard2 = newDeck.pop()!;

    const initialHand: PlayerHand = {
      cards: [pCard1, pCard2],
      bet: baseBet,
      status: 'active',
    };

    if (calculateScore([pCard1, pCard2]) === 21) {
      initialHand.status = 'blackjack';
    }

    setHands([initialHand]);
    setDealerHand([dCard1, dCard2]);
    setDeck(newDeck);
    setMessages([]);

    if (calculateScore([pCard1, pCard2]) === 21) {
      setDealerReveal(true);
      setPhase('dealer_turn');
      setTimeout(() => resolveAllHands([initialHand], [dCard1, dCard2], newDeck, newDeck), 800);
    } else {
      setPhase('playing');
    }
  };

  const hit = () => {
    const idx = getActiveHandIndex();
    if (idx === -1) return;

    const currentDeck = [...deckRef.current];
    const newCard = currentDeck.pop()!;
    deckRef.current = currentDeck;

    setHands((prev) => {
      const updated = [...prev];
      updated[idx] = { ...updated[idx], cards: [...updated[idx].cards, newCard] };
      return updated;
    });

    setDeck([...currentDeck]);

    const newScore = calculateScore([...hands[idx].cards, newCard]);
    if (newScore > 21) {
      setHands((prev) => {
        const updated = [...prev];
        updated[idx] = { ...updated[idx], status: 'bust' };
        return updated;
      });
      advanceToNextHandOrDealer([...hands], [...hands[idx].cards, newCard], dealerHand, currentDeck);
    } else if (newScore === 21) {
      setHands((prev) => {
        const updated = [...prev];
        updated[idx] = { 
          ...updated[idx], 
          cards: [...updated[idx].cards, newCard],
          status: updated[idx].cards.length === 1 ? 'blackjack' : 'stand' 
        };
        return updated;
      });
      advanceToNextHandOrDealer([...hands], [...hands[idx].cards, newCard], dealerHand, currentDeck);
    }
  };

  const stand = () => {
    const idx = getActiveHandIndex();
    if (idx === -1) return;

    setHands((prev) => {
      const updated = [...prev];
      updated[idx] = { ...updated[idx], status: 'stand' };
      return updated;
    });

    advanceToNextHandOrDealer(hands, hands[idx].cards, dealerHand, deckRef.current);
  };

  const double = () => {
    const idx = getActiveHandIndex();
    if (idx === -1) return;

    const newBet = hands[idx].bet;
    if (!subtractBalance(newBet)) return;

    const currentDeck = [...deckRef.current];
    const newCard = currentDeck.pop()!;
    deckRef.current = currentDeck;

    setHands((prev) => {
      const updated = [...prev];
      updated[idx] = {
        ...updated[idx],
        cards: [...updated[idx].cards, newCard],
        bet: updated[idx].bet * 2,
        doubled: true,
        status: 'stand',
      };
      return updated;
    });

    setDeck([...currentDeck]);
    advanceToNextHandOrDealer(hands, [...hands[idx].cards, newCard], dealerHand, currentDeck);
  };

  const split = () => {
    const idx = getActiveHandIndex();
    if (idx === -1 || !canSplit(hands[idx], hands)) return;
    if (hands[idx].bet > balanceRef.current) return;

    if (!subtractBalance(hands[idx].bet)) return;

    const cardToSplit = hands[idx].cards[1];
    const currentDeck = [...deckRef.current];
    const newCard1 = currentDeck.pop()!;
    const newCard2 = currentDeck.pop()!;
    deckRef.current = currentDeck;

    setHands((prev) => {
      const updated = [...prev];
      updated[idx] = {
        ...updated[idx],
        cards: [updated[idx].cards[0], newCard1],
        status: calculateScore([updated[idx].cards[0], newCard1]) === 21 ? 'blackjack' : 'active',
      };
      const newHand: PlayerHand = {
        cards: [cardToSplit, newCard2],
        bet: prev[idx].bet,
        status: calculateScore([cardToSplit, newCard2]) === 21 ? 'blackjack' : 'active',
        splitFrom: idx,
      };
      updated.push(newHand);
      return [...updated];
    });

    setDeck([...currentDeck]);

    const updatedHands = [...hands];
    updatedHands[idx] = {
      ...updatedHands[idx],
      cards: [updatedHands[idx].cards[0], newCard1],
      status: calculateScore([updatedHands[idx].cards[0], newCard1]) === 21 ? 'blackjack' : 'active',
    };

    const splitHandIdx = hands.length;
    if (calculateScore([newCard2, cardToSplit]) === 21) {
      setHands((prev) => {
        const p = [...prev];
        p[splitHandIdx] = { ...p[splitHandIdx], status: 'blackjack' };
        return p;
      });
      advanceToNextHandOrDealer(updatedHands, updatedHands[idx].cards, dealerHand, currentDeck);
    }
  };

  const advanceToNextHandOrDealer = (currentHands: PlayerHand[], currentCards: Card[], currentDealerHand: Card[], currentDeck: Card[]) => {
    const nextIdx = currentHands.findIndex((h, i) => i > getActiveHandIndex() && (h.status === 'active' || h.status === 'stand'));
    if (nextIdx !== -1) return;

    setDealerReveal(true);
    setPhase('dealer_turn');

    const dealerPlays = () => {
      const hasSoft17 = () => {
        const score = calculateScore(currentDealerHand);
        if (score !== 17) return false;
        return currentDealerHand.some(c => c.value === 'A');
      };
      
      const dealerScore = calculateScore(currentDealerHand);
      if (dealerScore < 17 || hasSoft17()) {
        const newCard = currentDeck.pop()!;
        if (!newCard) return;
        currentDeck.pop();
        currentDeck.unshift(newCard);
        deckRef.current = currentDeck;
        setDeck([...currentDeck]);
        setCardsRemaining(currentDeck.length);
        
        if (currentDeck.length < 52) {
          setTimeout(() => {
            deckRef.current = createDeck();
            setCardsRemaining(deckRef.current.length);
          }, 1000);
        }
        currentDealerHand.push(newCard);
        setDealerHand([...currentDealerHand]);
        setTimeout(dealerPlays, 600);
      } else {
        resolveAllHands(currentHands, currentCards, currentDealerHand, currentDeck);
      }
    };

    setTimeout(dealerPlays, 600);
  };

  const resolveAllHands = (resolvedHands: PlayerHand[], resolvedCards: Card[], resolvedDealerHand: Card[], resolvedDeck: Card[]) => {
    const dealerScore = calculateScore(resolvedDealerHand);
    const dealerBusted = dealerScore > 21;
    const dealerBlackjack = dealerScore === 21 && resolvedDealerHand.length === 2;

    const newMessages: { hand: number; text: string; won: boolean }[] = [];
    let totalProfit = 0;

    resolvedHands.forEach((hand, idx) => {
      const pScore = calculateScore(hand.cards);

      if (hand.status === 'bust') {
        newMessages.push({ hand: idx, text: 'Bust!', won: false });
        logBetActivity({ gameKey: 'blackjack', wager: hand.bet, payout: 0, multiplier: 0, outcome: 'loss', detail: 'Bust' });
        recordBet(hand.bet, 0, false);
      } else if (hand.status === 'blackjack' && !dealerBlackjack) {
        const payout = hand.bet * 3;
        addBalance(payout);
        totalProfit += payout - hand.bet;
        newMessages.push({ hand: idx, text: 'Blackjack!', won: true });
        logBetActivity({ gameKey: 'blackjack', wager: hand.bet, payout, multiplier: 3, outcome: 'win', detail: 'Blackjack' });
        recordBet(hand.bet, payout, true);
        confetti({ particleCount: 120, spread: 70, origin: { y: 0.55 }, scalar: 0.8 + idx * 0.1 });
      } else if (dealerBusted) {
        const payout = hand.bet * 2;
        addBalance(payout);
        totalProfit += payout - hand.bet;
        newMessages.push({ hand: idx, text: 'Dealer Busts!', won: true });
        logBetActivity({ gameKey: 'blackjack', wager: hand.bet, payout, multiplier: 2, outcome: 'win', detail: 'Dealer bust' });
        recordBet(hand.bet, payout, true);
      } else if (pScore > dealerScore) {
        const payout = hand.bet * 2;
        addBalance(payout);
        totalProfit += payout - hand.bet;
        newMessages.push({ hand: idx, text: 'You Win!', won: true });
        logBetActivity({ gameKey: 'blackjack', wager: hand.bet, payout, multiplier: 2, outcome: 'win', detail: 'Higher score' });
        recordBet(hand.bet, payout, true);
        confetti({ particleCount: 80, spread: 50, origin: { y: 0.55 }, scalar: 0.8 + idx * 0.1 });
      } else if (pScore < dealerScore) {
        newMessages.push({ hand: idx, text: 'Dealer Wins', won: false });
        logBetActivity({ gameKey: 'blackjack', wager: hand.bet, payout: 0, multiplier: 0, outcome: 'loss', detail: 'Dealer higher' });
        recordBet(hand.bet, 0, false);
      } else {
        addBalance(hand.bet);
        newMessages.push({ hand: idx, text: 'Push', won: false });
        logBetActivity({ gameKey: 'blackjack', wager: hand.bet, payout: hand.bet, multiplier: 1, outcome: 'push', detail: 'Push' });
      }
    });

    setMessages(newMessages);
    setPhase('ended');
    setHands((prev) => prev.map((h) => ({ ...h, status: 'done' as HandStatus })));
  };

  const resetGame = () => {
    setHands([]);
    setDealerHand([]);
    setDeck([]);
    setPhase('idle');
    setDealerReveal(false);
    setMessages([]);
  };

  const getActiveHand = () => hands[getActiveHandIndex()] || null;

  const CardUI = ({ card, hidden }: { card: Card; hidden?: boolean }) => (
    <motion.div
      initial={{ rotateY: 90, opacity: 0 }}
      animate={{ rotateY: 0, opacity: 1 }}
      transition={{ duration: 0.3 }}
      className={cn(
        'w-16 h-24 rounded-lg flex flex-col justify-between p-1.5 text-lg font-bold shadow-xl border-2',
        hidden ? 'bg-gradient-to-br from-blue-900 to-blue-700 border-white/20' : 'bg-white text-black border-transparent'
      )}
    >
      {!hidden ? (
        <>
          <div className={cn(card.suit === '♥' || card.suit === '♦' ? 'text-red-500' : 'text-black')}>
            {card.value}{card.suit}
          </div>
          <div className={cn('self-center text-3xl', card.suit === '♥' || card.suit === '♦' ? 'text-red-500' : 'text-black')}>
            {card.suit}
          </div>
          <div className={cn('self-end rotate-180', card.suit === '♥' || card.suit === '♦' ? 'text-red-500' : 'text-black')}>
            {card.value}{card.suit}
          </div>
        </>
      ) : (
        <div className="w-full h-full flex items-center justify-center">
          <div className="w-10 h-12 border-2 border-white/20 rounded opacity-20" />
        </div>
      )}
    </motion.div>
  );

  const HandControls = ({ hand, idx }: { hand: PlayerHand; idx: number }) => {
    const isActive = getActiveHandIndex() === idx;
    const isSplit = hand.splitFrom !== undefined;

    return (
      <div className="flex flex-col items-center gap-2">
        <div className="flex items-center gap-2 text-white/40 text-[10px] uppercase tracking-widest">
          <span>{isSplit ? `Split ${hand.splitFrom! + 1}` : 'Hand'} {idx + 1}</span>
          <span className="text-[#d9bb63]">${(hand.bet / 100).toFixed(2)}</span>
          {hand.doubled && <span className="text-yellow-400 text-[8px]">Doubled</span>}
        </div>
        <div className="flex gap-2">
          {hand.cards.map((card, i) => (
            <CardUI card={card} />
          ))}
        </div>
        <div className={cn(
          'text-sm font-black',
          hand.status === 'bust' ? 'text-red-400' :
          hand.status === 'blackjack' ? 'text-[#d9bb63]' :
          hand.status === 'stand' || hand.status === 'done' ? 'text-blue-400' :
          'text-white'
        )}>
          {hand.status === 'active' || hand.status === 'stand' ? calculateScore(hand.cards) : hand.status.toUpperCase()}
        </div>
        {isActive && phase === 'playing' && (
          <div className="flex gap-2 mt-1">
            <button
              onClick={hit}
              disabled={hand.status !== 'active'}
              className="px-3 py-1.5 rounded-lg bg-white text-black text-[10px] font-black uppercase tracking-wider disabled:opacity-30 hover:bg-white/90 transition-all"
            >
              Hit
            </button>
            <button
              onClick={stand}
              disabled={hand.status !== 'active'}
              className="px-3 py-1.5 rounded-lg bg-white/15 text-white text-[10px] font-black uppercase tracking-wider disabled:opacity-30 hover:bg-white/25 transition-all"
            >
              Stand
            </button>
            <button
              onClick={double}
              disabled={!canDouble(hand)}
              className="px-3 py-1.5 rounded-lg bg-yellow-500/20 text-yellow-400 text-[10px] font-black uppercase tracking-wider disabled:opacity-30 hover:bg-yellow-500/30 transition-all flex items-center gap-1"
            >
              <ArrowDownToLine size={10} /> Double
            </button>
            <button
              onClick={split}
              disabled={!canSplit(hand, hands)}
              className="px-3 py-1.5 rounded-lg bg-purple-500/20 text-purple-300 text-[10px] font-black uppercase tracking-wider disabled:opacity-30 hover:bg-purple-500/30 transition-all flex items-center gap-1"
            >
              <Copy size={10} /> Split
            </button>
          </div>
        )}
        {hand.status === 'done' && (
          <div className={cn(
            'text-xs font-black uppercase tracking-wider',
            messages[idx]?.won ? 'text-[#00FF88]' : 'text-red-400'
          )}>
            {messages[idx]?.text}
          </div>
        )}
      </div>
    );
  };

  const totalBets = hands.reduce((sum, h) => sum + h.bet, 0);

  return (
    <div className="flex flex-col lg:grid lg:grid-cols-4 gap-6 p-4 max-w-6xl mx-auto">
      <div className="lg:col-span-1 bg-[#1a1d23] border border-white/5 rounded-2xl p-5 flex flex-col gap-4">
        <div className="space-y-3">
          <div>
            <div className="flex justify-between items-center mb-2">
              <label className="text-[10px] uppercase tracking-widest text-white/40 block">Bet per Hand</label>
              <span className="text-[#00FF88] font-mono font-black text-sm">${(baseBet / 100).toFixed(2)}</span>
            </div>
            <input type="number" value={baseBet} onChange={(e) => setBaseBet(Math.max(100, Math.round(Number(e.target.value) / 100) * 100))} disabled={phase !== 'idle' && phase !== 'ended'} className="w-full bg-[#0f1115] border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-[#d9bb63]/50 mb-2" />
            <QuickBetButtons balance={balance} bet={baseBet} onSetBet={setBaseBet} disabled={phase !== 'idle' && phase !== 'ended'} pcts={[25, 50, 75, 100]} />
          </div>

          <div className="bg-black/40 rounded-xl p-3 border border-white/5">
            <div className="text-[10px] text-white/20 uppercase tracking-widest mb-1">Total at Risk</div>
            <div className="text-xl font-black text-white">${(totalBets / 100).toFixed(2)}</div>
            <div className="text-[10px] text-white/20 mt-1">
              Max win: ${((totalBets * 3) / 100).toFixed(2)} (3x blackjacks)
            </div>
          </div>

          {hands.length > 0 && (
            <div className="bg-black/40 rounded-xl p-3 border border-white/5">
              <div className="text-[10px] text-white/20 uppercase tracking-widest mb-1">Active Hands</div>
              <div className="text-xl font-black text-white">{hands.filter((h) => h.status === 'active' || h.status === 'stand').length}</div>
            </div>
          )}
        </div>

        {phase === 'idle' || phase === 'ended' ? (
          <button
            onClick={startNewGame}
            disabled={balance < baseBet}
            className="w-full bg-[#00FF88] hover:bg-[#00FF88]/90 text-black font-black py-4 rounded-xl transition-all flex items-center justify-center gap-2 disabled:opacity-50"
          >
            <Play size={18} fill="currentColor" /> DEAL
          </button>
        ) : null}

        {phase === 'ended' && (
          <button
            onClick={resetGame}
            className="w-full bg-white/10 hover:bg-white/20 text-white font-black py-3 rounded-xl transition-all"
          >
            New Hand
          </button>
        )}

        <div className="mt-auto space-y-3">
          <div className="p-4 bg-black/20 rounded-xl border border-white/5">
            <div className="text-[10px] text-white/40 uppercase tracking-widest mb-2">Rules</div>
            <ul className="text-[10px] text-white/60 space-y-1">
              <li>• Dealer hits on 16, stands on 17</li>
              <li>• Blackjack pays 3x</li>
              <li>• Win pays 2x</li>
              <li>• Double: double bet, get 1 card</li>
              <li>• Split: up to 3 splits (4 hands)</li>
            </ul>
          </div>
          <GameStatsBar stats={[
            { label: 'Bets', value: String(stats.totalBets) },
            { label: 'Wins', value: String(stats.totalWins) },
            { label: 'Biggest', value: `$${(stats.biggestWin / 100).toFixed(2)}` },
            { label: 'Wagered', value: `$${(stats.totalWagered / 100).toFixed(2)}` },
          ]} />
        </div>
      </div>

      <div className="lg:col-span-3 bg-[#0f1115] border border-white/5 rounded-2xl p-6 flex flex-col items-center justify-between min-h-[520px] relative overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,_rgba(0,255,136,0.04)_0%,_transparent_70%)] pointer-events-none" />

        {/* Dealer */}
        <div className="flex flex-col items-center gap-2 z-10">
          <div className="flex items-center gap-2 text-white/40 text-xs uppercase tracking-widest">
            <User size={14} /> Dealer {!dealerReveal && phase === 'playing' ? '--' : calculateScore(dealerHand)}
          </div>
          <div className="flex gap-2">
            {dealerHand.map((card, i) => (
              <div key={i}>
                <CardUI card={card} hidden={i === 1 && !dealerReveal && phase === 'playing'} />
              </div>
            ))}
          </div>
        </div>

        {/* Message Overlay */}
        <AnimatePresence>
          {phase === 'ended' && messages.length > 0 && (
            <motion.div
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              className="absolute inset-0 flex items-center justify-center z-20 pointer-events-none"
            >
              <div className="bg-black/80 backdrop-blur-md px-10 py-5 rounded-3xl border border-white/10 shadow-2xl text-center">
                <div className="text-3xl font-black uppercase italic tracking-tighter text-white">
                  {messages.every((m) => m.won) ? 'You Win!' : messages.some((m) => m.won) ? 'Mixed Results' : 'You Lose'}
                </div>
                <div className="text-xs text-white/40 mt-1">
                  {messages.filter((m) => m.won).length}/{messages.length} hands won
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Player Hands */}
        <div className="flex flex-wrap gap-6 justify-center items-start z-10">
          {hands.map((hand, idx) => (
            <div key={idx}>
              <HandControls hand={hand} idx={idx} />
            </div>
          ))}
          {hands.length === 0 && phase !== 'ended' && (
            <div className="text-white/20 text-sm">Place a bet and deal to start</div>
          )}
        </div>

        {/* Phase indicator */}
        <div className="absolute bottom-3 right-4 text-[10px] text-white/20 uppercase tracking-widest">
          {phase === 'playing' ? 'Your turn' : phase === 'dealer_turn' ? 'Dealer playing' : phase === 'ended' ? 'Round ended' : 'Waiting'}
        </div>
      </div>
    </div>
  );
};
