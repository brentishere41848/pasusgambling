import React, { useState, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { useBalance } from '../../context/BalanceContext';
import { cn } from '../../lib/utils';
import { Play, User, Copy, ArrowDownToLine, RotateCcw } from 'lucide-react';
import confetti from 'canvas-confetti';
import { logBetActivity } from '../../lib/activity';
import { QuickBetButtons, GameStatsBar, useLocalGameStats } from './GameHooks';

type Card = {
  suit: string;
  value: string;
};

type HandStatus = 'active' | 'stand' | 'bust' | 'blackjack' | 'done';

type PlayerHand = {
  cards: Card[];
  bet: number;
  status: HandStatus;
  doubled?: boolean;
  splitFrom?: number;
};

type GamePhase = 'betting' | 'playing' | 'dealer_turn' | 'ended';

const SUITS = ['♠', '♣', '♥', '♦'];
const VALUES = ['A', '2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K'];

const createDeck = () => {
  const deck: Card[] = [];
  for (const suit of SUITS) {
    for (const value of VALUES) {
      deck.push({ suit, value });
    }
  }
  return deck.sort(() => Math.random() - 0.5);
};

const getCardValue = (card: Card, isSoft = false): number => {
  if (card.value === 'A') return isSoft ? 1 : 11;
  if (['K', 'Q', 'J'].includes(card.value)) return 10;
  return parseInt(card.value);
};

const calculateScore = (cards: Card[]): { score: number; soft: boolean } => {
  let score = 0;
  let aces = 0;
  
  for (const card of cards) {
    if (card.value === 'A') {
      aces++;
      score += 11;
    } else if (['K', 'Q', 'J'].includes(card.value)) {
      score += 10;
    } else {
      score += parseInt(card.value);
    }
  }
  
  let soft = aces > 0 && score <= 21;
  
  while (score > 21 && aces > 0) {
    score -= 10;
    aces--;
  }
  
  if (aces === 0) soft = false;
  
  return { score, soft };
};

const canSplit = (hand: PlayerHand, balance: number): boolean => {
  if (hand.cards.length !== 2) return false;
  if (hand.bet > balance) return false;
  return hand.cards[0].value === hand.cards[1].value;
};

const canDouble = (hand: PlayerHand, balance: number): boolean => {
  if (hand.cards.length !== 2) return false;
  return hand.bet <= balance;
};

let balanceRef: { current: number } = { current: 0 };

export const BlackjackGame: React.FC = () => {
  const { balance, addBalance, subtractBalance } = useBalance();
  balanceRef.current = balance;

  const [betAmount, setBetAmount] = useState(1);
  const [hands, setHands] = useState<PlayerHand[]>([]);
  const [dealerHand, setDealerHand] = useState<Card[]>([]);
  const [deck, setDeck] = useState<Card[]>([]);
  const [phase, setPhase] = useState<GamePhase>('betting');
  const [dealerReveal, setDealerReveal] = useState(false);
  const [results, setResults] = useState<{ hand: number; text: string; won: boolean; payout: number }[]>([]);
  const { getStats, recordBet } = useLocalGameStats('blackjack');
  const stats = getStats();

  const deckRef = useRef<Card[]>([]);

  const shuffleDeck = useCallback(() => {
    deckRef.current = createDeck();
    setDeck([...deckRef.current]);
  }, []);

  const drawCard = useCallback(() => {
    if (deckRef.current.length < 20) {
      shuffleDeck();
    }
    const card = deckRef.current.pop()!;
    setDeck([...deckRef.current]);
    return card;
  }, [shuffleDeck]);

  const startGame = () => {
    if (!subtractBalance(betAmount)) return;
    shuffleDeck();

    const pCard1 = drawCard();
    const dCard1 = drawCard();
    const pCard2 = drawCard();
    const dCard2 = drawCard();

    const playerScore = calculateScore([pCard1, pCard2]);
    const dealerScore = calculateScore([dCard1, dCard2]);
    const playerBlackjack = playerScore.score === 21 && [pCard1, pCard2].length === 2;
    const dealerBlackjack = dealerScore.score === 21 && [dCard1, dCard2].length === 2;

    const initialHand: PlayerHand = {
      cards: [pCard1, pCard2],
      bet: betAmount,
      status: playerBlackjack ? 'blackjack' : 'active',
    };

    setHands([initialHand]);
    setDealerHand([dCard1, dCard2]);
    setResults([]);
    setDealerReveal(false);

    if (playerBlackjack || dealerBlackjack) {
      setDealerReveal(true);
      setPhase('dealer_turn');
      setTimeout(() => resolveGame([initialHand], [dCard1, dCard2]), 800);
    } else {
      setPhase('playing');
    }
  };

  const hit = () => {
    const idx = hands.findIndex((h) => h.status === 'active');
    if (idx === -1) return;

    const newCard = drawCard();
    setHands((prev) => {
      const updated = [...prev];
      const newCards = [...updated[idx].cards, newCard];
      const { score } = calculateScore(newCards);
      
      if (score > 21) {
        updated[idx] = { ...updated[idx], cards: newCards, status: 'bust' };
      } else if (score === 21) {
        updated[idx] = { ...updated[idx], cards: newCards, status: 'stand' };
      } else {
        updated[idx] = { ...updated[idx], cards: newCards };
      }
      return updated;
    });

    const { score } = calculateScore([...hands[idx].cards, newCard]);
    if (score > 21 || score === 21) {
      setTimeout(() => advanceGame(), 400);
    }
  };

  const stand = () => {
    const idx = hands.findIndex((h) => h.status === 'active');
    if (idx === -1) return;

    setHands((prev) => {
      const updated = [...prev];
      updated[idx] = { ...updated[idx], status: 'stand' };
      return updated;
    });

    setTimeout(() => advanceGame(), 400);
  };

  const double = () => {
    const idx = hands.findIndex((h) => h.status === 'active');
    if (idx === -1 || !subtractBalance(hands[idx].bet)) return;

    const newCard = drawCard();
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

    setTimeout(() => advanceGame(), 400);
  };

  const split = () => {
    const idx = hands.findIndex((h) => h.status === 'active');
    if (idx === -1 || !canSplit(hands[idx], balanceRef.current)) return;
    if (!subtractBalance(hands[idx].bet)) return;

    const card = hands[idx].cards[1];
    const newCard1 = drawCard();
    const newCard2 = drawCard();

    setHands((prev) => {
      const updated = [...prev];
      updated[idx] = {
        ...updated[idx],
        cards: [updated[idx].cards[0], newCard1],
        status: calculateScore([updated[idx].cards[0], newCard1]).score === 21 ? 'blackjack' : 'active',
      };
      
      const newHand: PlayerHand = {
        cards: [card, newCard2],
        bet: prev[idx].bet,
        status: calculateScore([card, newCard2]).score === 21 ? 'blackjack' : 'active',
        splitFrom: idx,
      };
      
      updated.push(newHand);
      return [...updated];
    });

    const newHands = [...hands];
    newHands[idx] = {
      ...newHands[idx],
      cards: [newHands[idx].cards[0], newCard1],
      status: calculateScore([newHands[idx].cards[0], newCard1]).score === 21 ? 'blackjack' : 'active',
    };
    
    if (calculateScore([card, newCard2]).score === 21) {
      setTimeout(() => advanceGame(), 400);
    }
  };

  const advanceGame = () => {
    const nextIdx = hands.findIndex((h, i) => i > hands.findIndex((x) => x.status === 'active') && h.status === 'active');
    
    if (nextIdx !== -1) return;

    setDealerReveal(true);
    setPhase('dealer_turn');

    let currentDealerHand = [...dealerHand];

    const dealerPlay = () => {
      const { score: dealerScore, soft } = calculateScore(currentDealerHand);
      
      if (dealerScore > 21) {
        currentDealerHand = [...currentDealerHand];
        setDealerHand(currentDealerHand);
        setTimeout(() => resolveGame(hands, currentDealerHand), 400);
      } else if (dealerScore < 17 || (dealerScore === 17 && soft)) {
        const newCard = drawCard();
        currentDealerHand = [...currentDealerHand, newCard];
        setDealerHand(currentDealerHand);
        setTimeout(dealerPlay, 600);
      } else {
        setTimeout(() => resolveGame(hands, currentDealerHand), 400);
      }
    };

    setTimeout(dealerPlay, 600);
  };

  const resolveGame = (finalHands: PlayerHand[], finalDealer: Card[]) => {
    const { score: dealerScore } = calculateScore(finalDealer);
    const dealerBusted = dealerScore > 21;
    const dealerBlackjack = dealerScore === 21 && finalDealer.length === 2;

    const newResults: { hand: number; text: string; won: boolean; payout: number }[] = [];
    let totalWagered = 0;
    let totalPayout = 0;

    finalHands.forEach((hand, idx) => {
      const { score: playerScore } = calculateScore(hand.cards);
      const playerBusted = playerScore > 21;
      const playerBlackjack = playerScore === 21 && hand.cards.length === 2;

      totalWagered += hand.bet;

      if (playerBusted) {
        newResults.push({ hand: idx, text: 'BUST', won: false, payout: 0 });
        logBetActivity({ gameKey: 'blackjack', wager: hand.bet, payout: 0, multiplier: 0, outcome: 'loss', detail: 'Player busted' });
        recordBet(hand.bet, 0, false);
      } else if (playerBlackjack && !dealerBlackjack) {
        const payout = hand.bet * 2.5;
        addBalance(payout);
        totalPayout += payout;
        newResults.push({ hand: idx, text: 'BLACKJACK!', won: true, payout });
        logBetActivity({ gameKey: 'blackjack', wager: hand.bet, payout, multiplier: 2.5, outcome: 'win', detail: 'Blackjack' });
        recordBet(hand.bet, payout, true);
        confetti({ particleCount: 150, spread: 80, origin: { y: 0.5 }, colors: ['#00FF88', '#FFD700'] });
      } else if (dealerBusted) {
        const payout = hand.bet * 2;
        addBalance(payout);
        totalPayout += payout;
        newResults.push({ hand: idx, text: 'DEALER BUSTS', won: true, payout });
        logBetActivity({ gameKey: 'blackjack', wager: hand.bet, payout, multiplier: 2, outcome: 'win', detail: 'Dealer busted' });
        recordBet(hand.bet, payout, true);
        confetti({ particleCount: 100, spread: 60, origin: { y: 0.5 }, colors: ['#00FF88'] });
      } else if (playerScore > dealerScore) {
        const payout = hand.bet * 2;
        addBalance(payout);
        totalPayout += payout;
        newResults.push({ hand: idx, text: 'YOU WIN', won: true, payout });
        logBetActivity({ gameKey: 'blackjack', wager: hand.bet, payout, multiplier: 2, outcome: 'win', detail: `Won with ${playerScore}` });
        recordBet(hand.bet, payout, true);
      } else if (playerScore < dealerScore) {
        newResults.push({ hand: idx, text: 'DEALER WINS', won: false, payout: 0 });
        logBetActivity({ gameKey: 'blackjack', wager: hand.bet, payout: 0, multiplier: 0, outcome: 'loss', detail: `Dealer had ${dealerScore}` });
        recordBet(hand.bet, 0, false);
      } else {
        addBalance(hand.bet);
        totalPayout += hand.bet;
        newResults.push({ hand: idx, text: 'PUSH', won: false, payout: hand.bet });
        logBetActivity({ gameKey: 'blackjack', wager: hand.bet, payout: hand.bet, multiplier: 1, outcome: 'push', detail: 'Tie' });
        recordBet(hand.bet, hand.bet, true);
      }
    });

    setResults(newResults);
    setPhase('ended');
    setHands((prev) => prev.map((h) => ({ ...h, status: 'done' as HandStatus })));
  };

  const newGame = () => {
    setHands([]);
    setDealerHand([]);
    setDeck([]);
    setPhase('betting');
    setDealerReveal(false);
    setResults([]);
  };

  const CardUI = ({ card, hidden }: { card: Card; hidden?: boolean }) => {
    const isRed = card.suit === '♥' || card.suit === '♦';
    
    if (hidden) {
      return (
        <motion.div
          initial={{ rotateY: 90 }}
          animate={{ rotateY: 0 }}
          className="w-14 h-20 sm:w-16 sm:h-24 rounded-xl bg-gradient-to-br from-blue-900 to-blue-700 border-2 border-blue-500/30 flex items-center justify-center shadow-lg"
        >
          <div className="w-8 h-10 border-2 border-white/20 rounded" />
        </motion.div>
      );
    }

    return (
      <motion.div
        initial={{ scale: 0, rotate: -10 }}
        animate={{ scale: 1, rotate: 0 }}
        transition={{ type: 'spring', stiffness: 300, damping: 20 }}
        className={cn(
          'w-14 h-20 sm:w-16 sm:h-24 rounded-xl flex flex-col justify-between p-1.5 sm:p-2 shadow-lg border-2',
          'bg-white text-black border-slate-200'
        )}
      >
        <div className={cn('text-xs sm:text-sm font-black', isRed ? 'text-red-600' : 'text-slate-800')}>
          {card.value}
        </div>
        <div className={cn('text-2xl sm:text-3xl text-center', isRed ? 'text-red-600' : 'text-slate-800')}>
          {card.suit}
        </div>
        <div className={cn('text-xs sm:text-sm font-black rotate-180 self-end', isRed ? 'text-red-600' : 'text-slate-800')}>
          {card.value}
        </div>
      </motion.div>
    );
  };

  const activeHandIdx = hands.findIndex((h) => h.status === 'active');
  const totalBet = hands.reduce((sum, h) => sum + h.bet, 0);

  return (
    <div className="flex flex-col lg:grid lg:grid-cols-5 gap-4 sm:gap-6 p-3 sm:p-4 max-w-7xl mx-auto">
      {/* Sidebar */}
      <div className="lg:col-span-1 bg-[#1a1d23] border border-white/5 rounded-2xl p-4 sm:p-5 flex flex-col gap-4">
        <div>
          <label className="text-[10px] uppercase tracking-widest text-white/40 block mb-2">Bet Amount</label>
          <div className="text-lg font-black text-[#00FF88] mb-2">${betAmount.toFixed(2)}</div>
          <input
            type="number"
            value={betAmount}
            onChange={(e) => setBetAmount(Math.max(0.01, Number(e.target.value)))}
            min="0.01"
            step="0.01"
            disabled={phase !== 'betting' && phase !== 'ended'}
            className="w-full bg-black/50 border border-white/10 rounded-xl px-3 py-2.5 text-white text-sm focus:outline-none focus:border-[#00FF88]/50 disabled:opacity-50"
          />
          <QuickBetButtons
            balance={balance}
            bet={betAmount}
            onSetBet={setBetAmount}
            disabled={phase !== 'betting' && phase !== 'ended'}
            pcts={[25, 50, 75, 100]}
          />
        </div>

        {hands.length > 0 && (
          <div className="bg-black/40 rounded-xl p-3 border border-white/5">
            <div className="text-[10px] text-white/30 uppercase tracking-widest">Total Bet</div>
            <div className="text-xl font-black text-white">${totalBet.toFixed(2)}</div>
            <div className="text-[10px] text-white/30 mt-1">Hands: {hands.length}</div>
          </div>
        )}

        {phase === 'betting' || phase === 'ended' ? (
          <button
            onClick={phase === 'ended' ? newGame : startGame}
            disabled={phase === 'betting' && balance < betAmount}
            className="w-full bg-[#00FF88] hover:bg-[#00FF88]/90 disabled:opacity-40 text-black font-black py-3 sm:py-4 rounded-xl transition-all flex items-center justify-center gap-2"
          >
            <Play size={18} fill="currentColor" />
            {phase === 'ended' ? 'NEW HAND' : 'DEAL'}
          </button>
        ) : null}

        <div className="mt-auto space-y-3">
          <div className="bg-black/30 rounded-xl p-3 border border-white/5">
            <div className="text-[10px] text-white/40 uppercase tracking-widest mb-2">Rules</div>
            <ul className="text-[10px] text-white/60 space-y-1">
              <li>• Dealer hits on soft 17</li>
              <li>• Blackjack pays 2.5x</li>
              <li>• Win pays 2x</li>
              <li>• Double on any 2 cards</li>
              <li>• Split same value pairs</li>
            </ul>
          </div>
          <GameStatsBar
            stats={[
              { label: 'Hands', value: String(stats.totalBets) },
              { label: 'Wins', value: String(stats.totalWins) },
              { label: 'Profit', value: `$${((stats.totalWagered > 0 ? (stats.totalWagered - stats.totalWagered) : 0)).toFixed(2)}` },
            ]}
          />
        </div>
      </div>

      {/* Game Area */}
      <div className="lg:col-span-4 bg-[#0f1115] border border-white/5 rounded-2xl p-4 sm:p-6 flex flex-col min-h-[450px] sm:min-h-[520px] relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-b from-[#00FF88]/5 via-transparent to-transparent pointer-events-none" />

        {/* Dealer */}
        <div className="flex flex-col items-center gap-3 z-10 mb-4">
          <div className="flex items-center gap-2 text-white/50 text-xs uppercase tracking-widest">
            <User size={14} />
            Dealer
            {!dealerReveal && phase === 'playing' && <span className="text-white/30">(?)</span>}
            {dealerReveal && <span className="text-white font-black">{calculateScore(dealerHand).score}</span>}
          </div>
          <div className="flex gap-2">
            {dealerHand.map((card, i) => (
              <div key={i}>
                <CardUI card={card} hidden={i === 1 && !dealerReveal && phase === 'playing'} />
              </div>
            ))}
          </div>
        </div>

        {/* Results Overlay */}
        <AnimatePresence>
          {phase === 'ended' && results.length > 0 && (
            <motion.div
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              className="absolute inset-0 flex items-center justify-center z-20 pointer-events-none"
            >
              <div className="bg-black/90 backdrop-blur-xl px-8 sm:px-12 py-4 sm:py-6 rounded-3xl border border-white/10 shadow-2xl text-center">
                <div className={cn(
                  'text-2xl sm:text-3xl font-black uppercase italic tracking-tighter',
                  results.every(r => r.won) ? 'text-[#00FF88]' : 
                  results.some(r => r.won) ? 'text-amber-400' : 'text-red-400'
                )}>
                  {results.every(r => r.won) ? 'You Win!' : 
                   results.some(r => r.won) ? 'Mixed Results' : 'House Wins'}
                </div>
                <div className="text-xs text-white/40 mt-1">
                  {results.filter(r => r.won).length}/{results.length} hands
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Player Hands */}
        <div className="flex-1 flex flex-wrap gap-4 sm:gap-6 justify-center items-center z-10">
          {hands.map((hand, idx) => {
            const { score, soft } = calculateScore(hand.cards);
            const isActive = activeHandIdx === idx;
            const result = results[idx];

            return (
              <motion.div
                key={idx}
                initial={{ y: 20, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ delay: idx * 0.1 }}
                className={cn(
                  'flex flex-col items-center gap-2 p-3 sm:p-4 rounded-2xl border-2',
                  isActive ? 'border-[#00FF88]/50 bg-[#00FF88]/5' : 'border-white/5 bg-white/5',
                  result?.won === false && hand.status === 'done' && 'border-red-500/30 bg-red-500/5',
                  result?.won && 'border-[#00FF88]/30 bg-[#00FF88]/5'
                )}
              >
                <div className="flex items-center gap-2 text-[10px] text-white/40 uppercase tracking-widest">
                  {hand.splitFrom !== undefined && <span>Split {hand.splitFrom + 1}</span>}
                  <span>${hand.bet.toFixed(2)}</span>
                  {hand.doubled && <span className="text-amber-400">2x</span>}
                </div>

                <div className="flex gap-1.5 sm:gap-2">
                  {hand.cards.map((card, i) => (
                    <div key={i}>
                      <CardUI card={card} />
                    </div>
                  ))}
                </div>

                <div className={cn(
                  'text-lg sm:text-xl font-black',
                  hand.status === 'bust' ? 'text-red-400' :
                  hand.status === 'blackjack' ? 'text-amber-400' :
                  hand.status === 'done' && result?.won ? 'text-[#00FF88]' :
                  hand.status === 'done' ? 'text-red-400' : 'text-white'
                )}>
                  {hand.status === 'active' || hand.status === 'stand' 
                    ? `${score}${soft ? ' (soft)' : ''}` 
                    : hand.status.toUpperCase()}
                </div>

                {hand.status === 'done' && result && (
                  <div className={cn(
                    'text-xs font-black uppercase tracking-wider',
                    result.won ? 'text-[#00FF88]' : 'text-white/50'
                  )}>
                    {result.text} {result.payout > 0 && `+$${result.payout.toFixed(2)}`}
                  </div>
                )}

                {isActive && phase === 'playing' && (
                  <div className="flex gap-2 mt-2">
                    <button
                      onClick={hit}
                      className="px-4 py-2 rounded-lg bg-white text-black text-xs font-black uppercase tracking-wider hover:bg-white/90 transition-all"
                    >
                      Hit
                    </button>
                    <button
                      onClick={stand}
                      className="px-4 py-2 rounded-lg bg-white/15 text-white text-xs font-black uppercase tracking-wider hover:bg-white/25 transition-all"
                    >
                      Stand
                    </button>
                    {canDouble(hand, balanceRef.current) && (
                      <button
                        onClick={double}
                        className="px-4 py-2 rounded-lg bg-amber-500/20 text-amber-400 text-xs font-black uppercase tracking-wider hover:bg-amber-500/30 transition-all flex items-center gap-1"
                      >
                        <ArrowDownToLine size={12} /> 2x
                      </button>
                    )}
                    {canSplit(hand, balanceRef.current) && (
                      <button
                        onClick={split}
                        className="px-4 py-2 rounded-lg bg-purple-500/20 text-purple-300 text-xs font-black uppercase tracking-wider hover:bg-purple-500/30 transition-all flex items-center gap-1"
                      >
                        <Copy size={12} /> Split
                      </button>
                    )}
                  </div>
                )}
              </motion.div>
            );
          })}

          {hands.length === 0 && (
            <div className="text-white/20 text-sm text-center">
              Place your bet and deal to start
            </div>
          )}
        </div>

        {/* Phase Indicator */}
        <div className="absolute bottom-3 right-4 text-[10px] text-white/20 uppercase tracking-widest flex items-center gap-2">
          {phase === 'playing' && (
            <>
              <span className="w-2 h-2 rounded-full bg-[#00FF88] animate-pulse" />
              Your Turn
            </>
          )}
          {phase === 'dealer_turn' && (
            <>
              <RotateCcw size={12} className="animate-spin" />
              Dealer Playing
            </>
          )}
        </div>
      </div>
    </div>
  );
};
