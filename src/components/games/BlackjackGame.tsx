import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { useBalance } from '../../context/BalanceContext';
import { cn } from '../../lib/utils';
import { Play, RotateCcw, Hand, Square, User } from 'lucide-react';
import confetti from 'canvas-confetti';
import { logBetActivity } from '../../lib/activity';

type Card = {
  suit: string;
  value: string;
  rank: number;
};

const SUITS = ['♠', '♣', '♥', '♦'];
const VALUES = ['2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K', 'A'];

const createDeck = () => {
  const deck: Card[] = [];
  for (const suit of SUITS) {
    for (let i = 0; i < VALUES.length; i++) {
      deck.push({
        suit,
        value: VALUES[i],
        rank: i + 2 > 11 ? 10 : i + 2 === 11 ? 11 : i + 2
      });
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

export const BlackjackGame: React.FC = () => {
  const { balance, addBalance, subtractBalance } = useBalance();
  const [bet, setBet] = useState(10);
  const [deck, setDeck] = useState<Card[]>([]);
  const [playerHand, setPlayerHand] = useState<Card[]>([]);
  const [dealerHand, setDealerHand] = useState<Card[]>([]);
  const [gameState, setGameState] = useState<'idle' | 'playing' | 'dealer_turn' | 'ended'>('idle');
  const [message, setMessage] = useState('');

  const startNewGame = () => {
    if (subtractBalance(bet)) {
      const newDeck = createDeck();
      const pHand = [newDeck.pop()!, newDeck.pop()!];
      const dHand = [newDeck.pop()!, newDeck.pop()!];
      
      setDeck(newDeck);
      setPlayerHand(pHand);
      setDealerHand(dHand);
      setGameState('playing');
      setMessage('');

      if (calculateScore(pHand) === 21) {
        handleEndGame(pHand, dHand, 'Blackjack!');
      }
    }
  };

  const hit = () => {
    if (gameState !== 'playing') return;
    const newDeck = [...deck];
    const newCard = newDeck.pop()!;
    const newHand = [...playerHand, newCard];
    
    setDeck(newDeck);
    setPlayerHand(newHand);

    if (calculateScore(newHand) > 21) {
      handleEndGame(newHand, dealerHand, 'Bust!');
    }
  };

  const stand = () => {
    if (gameState !== 'playing') return;
    setGameState('dealer_turn');
    
    let currentDealerHand = [...dealerHand];
    let currentDeck = [...deck];

    const dealerPlay = () => {
      if (calculateScore(currentDealerHand) < 19) {
        currentDealerHand.push(currentDeck.pop()!);
        setDealerHand([...currentDealerHand]);
        setTimeout(dealerPlay, 600);
      } else {
        const pScore = calculateScore(playerHand);
        const dScore = calculateScore(currentDealerHand);
        
        if (dScore > 21) handleEndGame(playerHand, currentDealerHand, 'Dealer Busts!');
        else if (dScore > pScore) handleEndGame(playerHand, currentDealerHand, 'Dealer Wins');
        else if (dScore < pScore) handleEndGame(playerHand, currentDealerHand, 'You Win!');
        else handleEndGame(playerHand, currentDealerHand, 'Push');
      }
    };

    setTimeout(dealerPlay, 600);
  };

  const handleEndGame = (pHand: Card[], dHand: Card[], msg: string) => {
    setGameState('ended');
    setMessage(msg);
    
    const pScore = calculateScore(pHand);
    const dScore = calculateScore(dHand);

    if (msg === 'Blackjack!') {
      const payout = bet * 2;
      addBalance(payout);
      logBetActivity({ gameKey: 'blackjack', wager: bet, payout, multiplier: 2, outcome: 'win', detail: msg });
      confetti({ particleCount: 150, spread: 70, origin: { y: 0.6 } });
    } else if (msg === 'You Win!' || msg === 'Dealer Busts!') {
      const payout = bet * 1.6;
      addBalance(payout);
      logBetActivity({ gameKey: 'blackjack', wager: bet, payout, multiplier: 1.6, outcome: 'win', detail: msg });
      confetti({ particleCount: 100, spread: 50, origin: { y: 0.6 } });
    } else if (msg === 'Push') {
      addBalance(bet);
      logBetActivity({ gameKey: 'blackjack', wager: bet, payout: bet, multiplier: 1, outcome: 'push', detail: msg });
    } else {
      logBetActivity({ gameKey: 'blackjack', wager: bet, payout: 0, multiplier: 0, outcome: 'loss', detail: msg });
    }
  };

  const CardUI = ({ card, hidden }: { card: any; hidden?: boolean; key?: any }) => (
    <motion.div
      initial={{ rotateY: 90, opacity: 0 }}
      animate={{ rotateY: 0, opacity: 1 }}
      className={cn(
        "w-20 h-28 rounded-lg flex flex-col justify-between p-2 text-xl font-bold shadow-xl border-2",
        hidden ? "bg-gradient-to-br from-blue-900 to-blue-700 border-white/20" : "bg-white text-black border-transparent"
      )}
    >
      {!hidden ? (
        <>
          <div className={cn(card.suit === '♥' || card.suit === '♦' ? "text-red-500" : "text-black")}>
            {card.value}{card.suit}
          </div>
          <div className={cn("self-center text-4xl", card.suit === '♥' || card.suit === '♦' ? "text-red-500" : "text-black")}>
            {card.suit}
          </div>
          <div className={cn("self-end rotate-180", card.suit === '♥' || card.suit === '♦' ? "text-red-500" : "text-black")}>
            {card.value}{card.suit}
          </div>
        </>
      ) : (
        <div className="w-full h-full flex items-center justify-center">
          <div className="w-12 h-16 border-2 border-white/20 rounded opacity-20" />
        </div>
      )}
    </motion.div>
  );

  return (
    <div className="flex flex-col lg:grid lg:grid-cols-4 gap-6 p-4 max-w-6xl mx-auto">
      <div className="lg:col-span-1 bg-[#1a1d23] border border-white/5 rounded-2xl p-6 flex flex-col gap-4">
        <div className="space-y-4">
          <div>
            <div className="flex justify-between items-center mb-2">
              <label className="text-xs uppercase tracking-widest text-white/40 block">Bet Amount</label>
              <span className="text-[#00FF88] font-mono font-bold">{bet}</span>
            </div>
            <input
              type="number"
              value={bet}
              onChange={(e) => setBet(Math.max(1, Number(e.target.value)))}
              disabled={gameState !== 'idle' && gameState !== 'ended'}
              className="w-full bg-[#0f1115] border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-[#00FF88]/50 mb-3"
            />
            <input
              type="range"
              min="1"
              max={Math.min(balance, 1000)}
              value={bet}
              onChange={(e) => setBet(Number(e.target.value))}
              disabled={gameState !== 'idle' && gameState !== 'ended'}
              className="w-full h-1.5 bg-white/10 rounded-lg appearance-none cursor-pointer accent-[#00FF88]"
            />
          </div>

          <div className="bg-black/40 rounded-xl p-3 border border-white/5">
            <div className="text-[10px] text-white/20 uppercase tracking-widest mb-1">Potential Win</div>
            <div className="flex items-baseline gap-2">
              <span className="text-xl font-black text-[#00FF88]">${(bet * 1.6).toFixed(2)}</span>
              <span className="text-[10px] text-white/40 font-bold">USD (1.6x)</span>
            </div>
            <div className="text-[10px] text-white/20 mt-1">
              Blackjack pays ${(bet * 2).toFixed(2)} (2x)
            </div>
          </div>
        </div>

        {gameState === 'playing' ? (
          <div className="grid grid-cols-2 gap-2">
            <button
              onClick={hit}
              className="bg-white text-black font-bold py-4 rounded-xl hover:bg-white/90 transition-all flex items-center justify-center gap-2"
            >
              <Hand size={18} /> HIT
            </button>
            <button
              onClick={stand}
              className="bg-white/10 text-white font-bold py-4 rounded-xl hover:bg-white/20 transition-all flex items-center justify-center gap-2"
            >
              <Square size={18} /> STAND
            </button>
          </div>
        ) : (
          <button
            onClick={startNewGame}
            disabled={balance < bet}
            className="w-full bg-[#00FF88] hover:bg-[#00FF88]/90 text-black font-bold py-4 rounded-xl transition-all flex items-center justify-center gap-2 disabled:opacity-50"
          >
            <Play size={18} fill="currentColor" /> DEAL
          </button>
        )}

        <div className="mt-auto p-4 bg-black/20 rounded-xl border border-white/5">
          <div className="text-[10px] text-white/40 uppercase tracking-widest mb-2">Rules</div>
          <ul className="text-[10px] text-white/60 space-y-1">
            <li>• Dealer hits until 19</li>
            <li>• Blackjack pays 2x</li>
            <li>• Win pays 1.6x</li>
          </ul>
        </div>
      </div>

      <div className="lg:col-span-3 bg-[#0f1115] border border-white/5 rounded-2xl p-8 flex flex-col items-center justify-between min-h-[500px] relative overflow-hidden">
        {/* Dealer Side */}
        <div className="flex flex-col items-center gap-4">
          <div className="flex items-center gap-2 text-white/40 text-xs uppercase tracking-widest">
            <User size={14} /> Dealer {gameState !== 'playing' && `(${calculateScore(dealerHand)})`}
          </div>
          <div className="flex gap-2">
            {dealerHand.map((card, i) => (
              <CardUI key={i} card={card} hidden={i === 1 && gameState === 'playing'} />
            ))}
          </div>
        </div>

        {/* Message Overlay */}
        <AnimatePresence>
          {message && (
            <motion.div
              initial={{ scale: 0.5, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.5, opacity: 0 }}
              className="absolute inset-0 flex items-center justify-center z-10 pointer-events-none"
            >
              <div className="bg-black/80 backdrop-blur-md px-12 py-6 rounded-3xl border border-white/10 shadow-2xl">
                <h2 className={cn(
                  "text-4xl font-black uppercase italic tracking-tighter",
                  message.includes('Win') || message.includes('Blackjack') || message.includes('Busts') ? "text-[#00FF88]" : "text-red-500"
                )}>
                  {message}
                </h2>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Player Side */}
        <div className="flex flex-col items-center gap-4">
          <div className="flex gap-2">
            {playerHand.map((card, i) => (
              <CardUI key={i} card={card} />
            ))}
          </div>
          <div className="flex items-center gap-2 text-white/40 text-xs uppercase tracking-widest">
            <User size={14} /> You ({calculateScore(playerHand)})
          </div>
        </div>

        {/* Table Felt Effect */}
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,_rgba(0,255,136,0.05)_0%,_transparent_70%)] pointer-events-none" />
      </div>
    </div>
  );
};
