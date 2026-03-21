import React, { useEffect, useMemo, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { useBalance } from '../../context/BalanceContext';
import { cn } from '../../lib/utils';
import { Play, RotateCcw, Trophy, X, Minus, Plus, Flame } from 'lucide-react';
import confetti from 'canvas-confetti';
import { logBetActivity } from '../../lib/activity';

type SymbolId = 'seven' | 'plum' | 'lemon' | 'orange' | 'cherry' | 'melon' | 'wild' | 'pasus';
type ReelCell = { id: number; symbol: SymbolId };
type ReelGrid = ReelCell[][];
type PaylineHit = { row: number; symbol: SymbolId; count: number; payout: number; rowMultiplier: number };
type BonusAward = { spins: number; multiplier: number; screens: number; source: 'buy' | 'trigger' };
type BonusState = {
  spinsLeft: number;
  totalSpins: number;
  multiplier: number;
  screensLeft: number;
  totalWin: number;
};

const REEL_COUNT = 5;
const ROW_COUNT = 8;
const BONUS_BUY_MULTIPLIER = 80;
const BONUS_BUY_MIN = 800;
const BONUS_BUY_MAX = 200_000;
const BONUS_MULTIPLIER_MIN = 0.01;
const BONUS_MULTIPLIER_MAX = 999;
const BONUS_BET_MIN = Math.ceil(BONUS_BUY_MIN / BONUS_BUY_MULTIPLIER);
const BONUS_BET_MAX = Math.floor(BONUS_BUY_MAX / BONUS_BUY_MULTIPLIER);

const SYMBOL_META: Record<SymbolId, { label: string; accent: string; glow: string; bg: string; weight: number }> = {
  seven: { label: '7', accent: '#ff7236', glow: 'shadow-[0_0_28px_rgba(255,114,54,0.6)]', bg: 'from-[#51150b] to-[#170908]', weight: 7 },
  plum: { label: 'PLUM', accent: '#b36dff', glow: 'shadow-[0_0_28px_rgba(179,109,255,0.55)]', bg: 'from-[#2d1047] to-[#110816]', weight: 14 },
  lemon: { label: 'LEMON', accent: '#ffe25a', glow: 'shadow-[0_0_28px_rgba(255,226,90,0.55)]', bg: 'from-[#4f430a] to-[#171307]', weight: 14 },
  orange: { label: 'ORANGE', accent: '#ffb347', glow: 'shadow-[0_0_28px_rgba(255,179,71,0.55)]', bg: 'from-[#4d240a] to-[#171007]', weight: 14 },
  cherry: { label: 'CHERRY', accent: '#ff5a8b', glow: 'shadow-[0_0_28px_rgba(255,90,139,0.55)]', bg: 'from-[#4a0f24] to-[#180811]', weight: 14 },
  melon: { label: 'MELON', accent: '#73ff84', glow: 'shadow-[0_0_28px_rgba(115,255,132,0.55)]', bg: 'from-[#173f18] to-[#081109]', weight: 12 },
  wild: { label: 'WILD', accent: '#ffd13d', glow: 'shadow-[0_0_30px_rgba(255,209,61,0.65)]', bg: 'from-[#5c3606] to-[#190f04]', weight: 6 },
  pasus: { label: 'PASUS', accent: '#ffffff', glow: 'shadow-[0_0_34px_rgba(255,255,255,0.6)]', bg: 'from-[#123f2e] to-[#081712]', weight: 2 },
};

const PAYTABLE: Record<Exclude<SymbolId, 'pasus'>, Partial<Record<3 | 4 | 5, number>>> = {
  seven: { 3: 8, 4: 18, 5: 40 },
  plum: { 3: 1.4, 4: 2.8, 5: 5 },
  lemon: { 3: 1.4, 4: 2.8, 5: 5 },
  orange: { 3: 1.5, 4: 3.1, 5: 5.4 },
  cherry: { 3: 1.6, 4: 3.4, 5: 5.8 },
  melon: { 3: 1.8, 4: 3.8, 5: 6.4 },
  wild: { 3: 3, 4: 8, 5: 16 },
};

let cellId = 0;

const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value));
const round2 = (value: number) => Math.round(value * 100) / 100;
const nextCell = (symbol: SymbolId): ReelCell => ({ id: cellId++, symbol });

function weightedSymbol(allowBonus: boolean, bonusMode: boolean): SymbolId {
  const pool = Object.entries(SYMBOL_META).filter(([id]) => allowBonus || id !== 'pasus');
  const totalWeight = pool.reduce((sum, [, meta]) => sum + (bonusMode && meta.label === 'WILD' ? meta.weight * 2.5 : bonusMode ? meta.weight * 1.2 : meta.weight), 0);
  let roll = Math.random() * totalWeight;

  for (const [symbol, meta] of pool) {
    const weight = bonusMode && meta.label === 'WILD' ? meta.weight * 2.5 : bonusMode ? meta.weight * 1.2 : meta.weight;
    roll -= weight;
    if (roll <= 0) {
      return symbol as SymbolId;
    }
  }

  return 'cherry';
}

function createRandomGrid(options?: { allowBonus?: boolean; bonusMode?: boolean }): ReelGrid {
  return Array.from({ length: REEL_COUNT }, () =>
    Array.from({ length: ROW_COUNT }, () => nextCell(weightedSymbol(Boolean(options?.allowBonus), Boolean(options?.bonusMode))))
  );
}

function forceBonusGrid(bonusMode: boolean): ReelGrid {
  const grid = createRandomGrid({ allowBonus: true, bonusMode });
  const positions = [
    [0, 0],
    [2, 1],
    [4, 2],
    [1, 2],
    [3, 0],
  ] as const;

  positions.slice(0, 3 + Math.floor(Math.random() * 2)).forEach(([reel, row]) => {
    grid[reel][row] = nextCell('pasus');
  });

  return grid;
}

function applyScreenBoost(grid: ReelGrid) {
  const boosted = grid.map((reel) => reel.slice());
  const reelIndex = Math.floor(Math.random() * REEL_COUNT);
  boosted[reelIndex] = boosted[reelIndex].map(() => nextCell('wild'));
  return boosted;
}

function evaluateGrid(grid: ReelGrid, wager: number, multiplier: number, bonusMode: boolean) {
  const hits: Array<Omit<PaylineHit, 'rowMultiplier'>> = [];
  let payout = 0;

  for (let row = 0; row < ROW_COUNT; row++) {
    const symbols = grid.map((reel) => reel[row].symbol);
    const counts = new Map<Exclude<SymbolId, 'pasus'>, number>();

    for (const symbol of symbols) {
      if (symbol === 'pasus') {
        continue;
      }
      counts.set(symbol as Exclude<SymbolId, 'pasus'>, (counts.get(symbol as Exclude<SymbolId, 'pasus'>) ?? 0) + 1);
    }

    const ranked = [...counts.entries()].sort((a, b) => b[1] - a[1]);
    const best = ranked[0];
    if (!best) {
      continue;
    }

    const [bestSymbol, bestCount] = best;
    const threshold = bonusMode ? 4 : 3;
    if (bestCount < threshold) {
      continue;
    }

    const lineMultiplier = PAYTABLE[bestSymbol][bestCount as 3 | 4 | 5] ?? 0;
    const linePayout = round2(wager * lineMultiplier * multiplier);
    payout += linePayout;
    hits.push({ row, symbol: bestSymbol, count: bestCount, payout: linePayout });
  }

  const lines = bonusMode
    ? hits
        .sort((a, b) => b.count - a.count || a.row - b.row)
        .map((hit, index) => {
          const rowMultiplier = 2 ** index;
          const payoutWithProgression = round2(hit.payout * rowMultiplier);
          return { ...hit, payout: payoutWithProgression, rowMultiplier };
        })
    : hits.map((hit) => ({ ...hit, rowMultiplier: 1 }));

  payout = round2(lines.reduce((sum, hit) => sum + hit.payout, 0));
  const bonusCount = grid.flat().filter((cell) => cell.symbol === 'pasus').length;
  return { payout, lines, bonusCount };
}

function formatCoins(value: number) {
  return Math.round(value).toLocaleString();
}

function symbolTextClass(symbol: SymbolId) {
  switch (symbol) {
    case 'seven':
      return 'text-6xl italic';
    case 'wild':
      return 'text-2xl tracking-[0.3em]';
    case 'pasus':
      return '';
    default:
      return 'text-sm tracking-[0.24em]';
  }
}

function CoinAmount({ value, className = '', iconSize = 18 }: { value: number | string; className?: string; iconSize?: number }) {
  return (
    <span className={cn('inline-flex items-center gap-2', className)}>
      <img src="/assets/icon.png" alt="" className="rounded-full object-cover" style={{ width: iconSize, height: iconSize }} />
      <span>{value}</span>
    </span>
  );
}

export const SlotsGame: React.FC = () => {
  const { balance, addBalance, subtractBalance } = useBalance();
  const [bet, setBet] = useState(50);
  const [bonusMultiplier, setBonusMultiplier] = useState(5);
  const [grid, setGrid] = useState<ReelGrid>(() => createRandomGrid({ allowBonus: true }));
  const [isSpinning, setIsSpinning] = useState(false);
  const [winMessage, setWinMessage] = useState<string | null>(null);
  const [lastPayout, setLastPayout] = useState(0);
  const [showBuyBonus, setShowBuyBonus] = useState(false);
  const [buyBonusBet, setBuyBonusBet] = useState(BONUS_BET_MIN);
  const [bonusIntro, setBonusIntro] = useState<BonusAward | null>(null);
  const [bonusState, setBonusState] = useState<BonusState | null>(null);
  const [pendingBonus, setPendingBonus] = useState<BonusAward | null>(null);
  const [lastLineHits, setLastLineHits] = useState<PaylineHit[]>([]);
  const timersRef = useRef<number[]>([]);

  useEffect(() => {
    return () => {
      timersRef.current.forEach((timer) => window.clearTimeout(timer));
      timersRef.current = [];
    };
  }, []);

  const activeBet = bonusState ? buyBonusBet : bet;
  const bonusBuyCost = useMemo(() => clamp(buyBonusBet * BONUS_BUY_MULTIPLIER, BONUS_BUY_MIN, BONUS_BUY_MAX), [buyBonusBet]);
  const canSpin = !isSpinning && (bonusState || balance >= activeBet);

  const clearTimers = () => {
    timersRef.current.forEach((timer) => window.clearTimeout(timer));
    timersRef.current = [];
  };

  const finalizeSpin = (finalGrid: ReelGrid, wager: number, source: 'base' | 'bonus', usedScreen: boolean, bonusAward?: BonusAward | null) => {
    setGrid(finalGrid);
    setIsSpinning(false);

    const appliedMultiplier = source === 'bonus' && bonusState ? bonusState.multiplier : 1;
    const evaluation = evaluateGrid(finalGrid, wager, appliedMultiplier, source === 'bonus');
    setLastPayout(evaluation.payout);
    setLastLineHits(evaluation.lines);

    if (evaluation.payout > 0) {
      addBalance(evaluation.payout);
      logBetActivity({
        gameKey: 'slots',
        wager,
        payout: evaluation.payout,
        multiplier: round2(evaluation.payout / Math.max(1, wager)),
        outcome: 'win',
        detail: source === 'bonus'
          ? evaluation.lines.map((line) => `row ${line.row + 1}: ${line.count} ${line.symbol} x${line.rowMultiplier}`).join(', ')
          : evaluation.lines.map((line) => `${line.count}x ${line.symbol} on row ${line.row + 1}`).join(', '),
      });
      setWinMessage(`WIN ${formatCoins(evaluation.payout)}`);
      if (evaluation.payout >= wager * 4) {
        confetti({ particleCount: 120, spread: 80, origin: { y: 0.58 } });
      }
    } else {
      logBetActivity({
        gameKey: 'slots',
        wager,
        payout: 0,
        multiplier: 0,
        outcome: 'loss',
        detail: source === 'bonus' ? 'Bonus spin miss' : 'No line hit',
      });
      setWinMessage(null);
    }

    if (source === 'bonus' && bonusState) {
      const nextSpinsLeft = bonusState.spinsLeft - 1;
      const nextScreens = usedScreen ? bonusState.screensLeft - 1 : bonusState.screensLeft;
      const nextTotal = round2(bonusState.totalWin + evaluation.payout);

      if (nextSpinsLeft <= 0) {
        setBonusState(null);
        setWinMessage(nextTotal > 0 ? `BONUS OVER ${formatCoins(nextTotal)}` : 'BONUS OVER');
      } else {
        setBonusState({
          ...bonusState,
          spinsLeft: nextSpinsLeft,
          screensLeft: Math.max(0, nextScreens),
          totalWin: nextTotal,
        });
      }
    }

    if (bonusAward) {
      setPendingBonus(bonusAward);
    } else if (source === 'base' && evaluation.bonusCount >= 3) {
      setPendingBonus({
        spins: 4 + Math.floor(Math.random() * 4),
        multiplier: clamp(round2(bonusMultiplier), BONUS_MULTIPLIER_MIN, BONUS_MULTIPLIER_MAX),
        screens: 1 + Math.floor(Math.random() * 3),
        source: 'trigger',
      });
    }
  };

  const spin = (options?: { buyBonus?: boolean; bonusAward?: BonusAward }) => {
    if (isSpinning) {
      return;
    }

    const inBonus = Boolean(bonusState);
    const wager = inBonus ? buyBonusBet : bet;

    if (!inBonus) {
      if (options?.buyBonus) {
        if (!subtractBalance(bonusBuyCost)) {
          return;
        }
      } else if (!subtractBalance(wager)) {
        return;
      }
    }

    setIsSpinning(true);
    setWinMessage(null);
    setLastPayout(0);
    setLastLineHits([]);
    clearTimers();

    const useScreen = Boolean(inBonus && bonusState && bonusState.screensLeft > 0 && Math.random() < 0.35);
    let finalGrid = options?.buyBonus
      ? forceBonusGrid(Boolean(inBonus))
      : createRandomGrid({ allowBonus: true, bonusMode: inBonus });

    if (useScreen) {
      finalGrid = applyScreenBoost(finalGrid);
    }

    for (let reelIndex = 0; reelIndex < REEL_COUNT; reelIndex++) {
      const timer = window.setTimeout(() => {
        setGrid((current) =>
          current.map((reel, index) =>
            index === reelIndex
              ? Array.from({ length: ROW_COUNT }, (_, row) => finalGrid[reelIndex][row] ?? nextCell(weightedSymbol(true, inBonus)))
              : reel
          )
        );
      }, 620 + reelIndex * 220);
      timersRef.current.push(timer);
    }

    const animationTicker = window.setInterval(() => {
      setGrid((current) =>
        current.map((reel, index) =>
          index >= REEL_COUNT - 1
            ? reel
            : reel.map(() => nextCell(weightedSymbol(true, inBonus)))
        )
      );
    }, 95);

    const doneTimer = window.setTimeout(() => {
      window.clearInterval(animationTicker);
      finalizeSpin(finalGrid, options?.buyBonus ? bonusBuyCost : wager, inBonus ? 'bonus' : 'base', useScreen, options?.bonusAward ?? null);
    }, 620 + REEL_COUNT * 220 + 120);

    timersRef.current.push(doneTimer);
  };

  useEffect(() => {
    if (!pendingBonus || isSpinning) {
      return;
    }

    setBonusIntro(pendingBonus);
    setPendingBonus(null);
  }, [isSpinning, pendingBonus]);

  const startBonusFromIntro = () => {
    if (!bonusIntro) {
      return;
    }

    setBonusState({
      spinsLeft: bonusIntro.spins,
      totalSpins: bonusIntro.spins,
      multiplier: bonusIntro.multiplier,
      screensLeft: bonusIntro.screens,
      totalWin: 0,
    });
    setBonusIntro(null);
  };

  const lineHint = lastLineHits.length
    ? lastLineHits.map((line) => `${line.count} ${SYMBOL_META[line.symbol].label} on row ${line.row + 1}${line.rowMultiplier > 1 ? ` x${line.rowMultiplier}` : ''}`).join(' · ')
    : bonusState
      ? `${bonusState.spinsLeft}/${bonusState.totalSpins} free spins left`
      : 'Land 3 Pasus symbols anywhere to trigger the bonus.';

  return (
    <div className="flex flex-col lg:grid lg:grid-cols-[330px_1fr] gap-6 p-4 max-w-7xl mx-auto">
      <div className="bg-[#111] border border-white/10 rounded-2xl p-6 flex flex-col gap-4">
        <div className="space-y-4">
          <div>
            <label className="text-xs uppercase tracking-widest text-white/40 mb-2 block">Bet Amount</label>
            <input
              type="number"
              value={bet}
              min={1}
              onChange={(e) => setBet(Math.max(1, Number(e.target.value)))}
              disabled={isSpinning || Boolean(bonusState)}
              className="w-full bg-black border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-[#00FF88]/50"
            />
            <div className="mt-2 flex gap-2">
              <button onClick={() => setBet((prev) => Math.max(1, Math.min(Math.floor(balance), prev * 2)))} disabled={isSpinning || balance < 1 || Boolean(bonusState)} className="flex-1 rounded-lg bg-white/5 px-3 py-2 text-[10px] font-black uppercase tracking-widest text-white/60 disabled:opacity-40">x2</button>
              <button onClick={() => setBet(Math.max(1, Math.floor(balance)))} disabled={isSpinning || balance < 1 || Boolean(bonusState)} className="flex-1 rounded-lg bg-white/5 px-3 py-2 text-[10px] font-black uppercase tracking-widest text-white/60 disabled:opacity-40">Max</button>
            </div>
          </div>

          <div>
            <label className="text-xs uppercase tracking-widest text-white/40 mb-2 block">Bonus Multiplier</label>
            <input
              type="number"
              step="0.01"
              min={BONUS_MULTIPLIER_MIN}
              max={BONUS_MULTIPLIER_MAX}
              value={bonusMultiplier}
              onChange={(e) => setBonusMultiplier(clamp(round2(Number(e.target.value) || BONUS_MULTIPLIER_MIN), BONUS_MULTIPLIER_MIN, BONUS_MULTIPLIER_MAX))}
              disabled={isSpinning}
              className="w-full bg-black border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-[#00FF88]/50"
            />
            <div className="mt-2 text-[11px] text-white/30">Custom bonus multiplier from x0.01 up to x999.00.</div>
          </div>

          <button
            onClick={() => spin()}
            disabled={!canSpin}
            className="w-full bg-[#00FF88] hover:bg-[#00FF88]/90 text-black font-bold py-4 rounded-xl transition-all flex items-center justify-center gap-2 disabled:opacity-50"
          >
            {isSpinning ? <RotateCcw className="animate-spin" size={18} /> : <Play size={18} fill="currentColor" />}
            {bonusState ? `FREE SPIN (${bonusState.spinsLeft})` : 'SPIN'}
          </button>

          <button
            onClick={() => {
              setBuyBonusBet(clamp(bet, BONUS_BET_MIN, BONUS_BET_MAX));
              setShowBuyBonus(true);
            }}
            disabled={isSpinning || Boolean(bonusState)}
            className="w-full rounded-xl border border-[#ff6b3d]/50 bg-[linear-gradient(180deg,rgba(140,23,18,0.85),rgba(64,10,10,0.85))] px-4 py-4 text-left text-white shadow-[0_0_24px_rgba(255,89,53,0.3)] disabled:opacity-40"
          >
            <div className="text-[10px] uppercase tracking-[0.24em] text-white/60 font-black">Buy Bonus</div>
            <div className="mt-2 text-3xl font-black text-[#ffd34f]"><CoinAmount value={formatCoins(clamp(bet * BONUS_BUY_MULTIPLIER, BONUS_BUY_MIN, BONUS_BUY_MAX))} className="gap-3" iconSize={24} /></div>
            <div className="mt-1 text-xs text-white/45">Minimum 800, maximum 200,000</div>
          </button>
        </div>

        <div className="mt-auto rounded-2xl border border-white/10 bg-black/40 p-4 space-y-3">
          <div className="flex items-center justify-between text-[10px] uppercase tracking-[0.2em] text-white/35 font-black">
            <span>Bonus State</span>
            <span>{bonusState ? 'Live' : 'Idle'}</span>
          </div>
          <div className="grid grid-cols-2 gap-3 text-xs">
            <div className="rounded-xl bg-white/[0.04] px-3 py-3">
              <div className="text-white/35 uppercase tracking-[0.18em] text-[10px]">Free Spins</div>
              <div className="mt-2 text-lg font-black text-[#ffd34f]">{bonusState ? bonusState.spinsLeft : 0}</div>
            </div>
            <div className="rounded-xl bg-white/[0.04] px-3 py-3">
              <div className="text-white/35 uppercase tracking-[0.18em] text-[10px]">Screens</div>
              <div className="mt-2 text-lg font-black text-[#ff7e46]">{bonusState ? bonusState.screensLeft : 0}</div>
            </div>
            <div className="rounded-xl bg-white/[0.04] px-3 py-3">
              <div className="text-white/35 uppercase tracking-[0.18em] text-[10px]">Multiplier</div>
              <div className="mt-2 text-lg font-black text-[#00FF88]">x{(bonusState ? bonusState.multiplier : bonusMultiplier).toFixed(2)}</div>
            </div>
            <div className="rounded-xl bg-white/[0.04] px-3 py-3">
              <div className="text-white/35 uppercase tracking-[0.18em] text-[10px]">Last Win</div>
              <div className="mt-2 text-lg font-black text-white"><CoinAmount value={formatCoins(lastPayout)} iconSize={16} /></div>
            </div>
          </div>
          <div className="text-[11px] leading-relaxed text-white/35">{lineHint}</div>
        </div>
      </div>

      <div className="relative overflow-hidden rounded-[30px] border border-[#2048ff]/30 bg-[linear-gradient(180deg,#0d0c10_0%,#130d11_55%,#08090c_100%)] p-6 md:p-8 shadow-[0_0_80px_rgba(255,94,58,0.1)]">
        <div className="absolute inset-0 opacity-30 pointer-events-none" style={{ backgroundImage: 'linear-gradient(rgba(255,255,255,0.05) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.05) 1px, transparent 1px)', backgroundSize: '48px 48px' }} />
        <div className="absolute inset-0 pointer-events-none bg-[radial-gradient(circle_at_top,rgba(255,78,36,0.16),transparent_26%),radial-gradient(circle_at_bottom,rgba(33,104,255,0.14),transparent_38%)]" />

        <div className="relative z-10 flex items-center justify-between gap-4">
          <div>
            <div className="text-[11px] uppercase tracking-[0.3em] text-white/35 font-black">Neon Bonus Slots</div>
            <div className="mt-2 text-5xl font-black italic tracking-tight text-[#ff9a54] [text-shadow:0_0_24px_rgba(255,102,48,0.55)]">Lucky Pasus</div>
          </div>
          {bonusState && (
            <div className="rounded-2xl border border-[#ff5d2f]/40 bg-[#34110d]/75 px-4 py-3 text-right shadow-[0_0_30px_rgba(255,72,32,0.22)]">
              <div className="text-[10px] uppercase tracking-[0.22em] text-white/45 font-black">Bonus Running</div>
              <div className="mt-2 text-lg font-black text-[#ffd34f]">{bonusState.spinsLeft} Spins Left</div>
              <div className="text-xs text-white/50">Total bonus win <CoinAmount value={formatCoins(bonusState.totalWin)} iconSize={12} className="inline-flex" /></div>
            </div>
          )}
        </div>

        <div className="relative z-10 mt-8 flex items-stretch gap-4">
          <div className="hidden md:flex w-28 shrink-0 rounded-2xl border border-[#ff5b32]/50 bg-[linear-gradient(180deg,rgba(132,20,19,0.88),rgba(61,11,11,0.88))] p-4 text-center shadow-[0_0_30px_rgba(255,73,43,0.25)]">
            <div className="m-auto">
              <div className="text-2xl font-black leading-tight text-[#ffd34f]">BUY</div>
              <div className="text-2xl font-black leading-tight text-[#ffd34f]">BONUS</div>
              <div className="mt-4 text-sm font-black text-[#ffb144]"><CoinAmount value={formatCoins(clamp(activeBet * BONUS_BUY_MULTIPLIER, BONUS_BUY_MIN, BONUS_BUY_MAX))} iconSize={14} /></div>
            </div>
          </div>

          <div className="flex-1 rounded-[28px] border border-[#2c5cff]/55 bg-black/75 p-3 shadow-[0_0_40px_rgba(38,90,255,0.28)]">
            <div className="grid grid-cols-5 gap-3">
              {grid.map((reel, reelIndex) => (
                <div key={reelIndex} className="rounded-[22px] border border-[#2c5cff]/70 bg-[linear-gradient(180deg,rgba(6,8,13,0.98),rgba(13,7,11,0.92))] p-2 shadow-[inset_0_0_28px_rgba(255,255,255,0.04),0_0_25px_rgba(44,92,255,0.18)]">
                  <div className="grid gap-2" style={{ gridTemplateRows: `repeat(${ROW_COUNT}, minmax(0, 1fr))` }}>
                    {reel.map((cell) => {
                      const meta = SYMBOL_META[cell.symbol];
                      return (
                        <motion.div
                          key={cell.id}
                          initial={{ y: -16, opacity: 0.5 }}
                          animate={{ y: 0, opacity: 1, scale: isSpinning ? [1, 1.03, 1] : 1 }}
                          transition={{ duration: 0.18 }}
                          className={cn(
                            'relative flex h-[76px] items-center justify-center overflow-hidden rounded-[18px] border',
                            meta.glow
                          )}
                          style={{
                            borderColor: `${meta.accent}`,
                            background: `linear-gradient(180deg, rgba(5,5,8,0.96), rgba(0,0,0,0.96)), linear-gradient(180deg, ${meta.bg})`,
                          }}
                        >
                          <div className="absolute inset-0 opacity-20" style={{ background: `radial-gradient(circle at 50% 25%, ${meta.accent}, transparent 60%)` }} />
                          {cell.symbol === 'pasus' ? (
                            <img src="/assets/icon.png" alt="Pasus" className="relative z-10 h-10 w-10 rounded-full object-cover ring-2 ring-white/40" />
                          ) : (
                            <div className={cn('relative z-10 text-center font-black uppercase', symbolTextClass(cell.symbol))} style={{ color: meta.accent }}>
                              {meta.label}
                            </div>
                          )}
                        </motion.div>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="relative z-10 mt-6 flex flex-col gap-4 rounded-[28px] border border-white/10 bg-black/35 p-4 md:flex-row md:items-center md:justify-between">
          <div className="flex flex-wrap items-center gap-4 text-sm">
            <div>
              <div className="text-[10px] uppercase tracking-[0.18em] text-white/30 font-black">Balance</div>
              <div className="mt-1 text-2xl font-black text-white"><CoinAmount value={formatCoins(balance)} iconSize={20} /></div>
            </div>
            <div>
              <div className="text-[10px] uppercase tracking-[0.18em] text-white/30 font-black">Total Bet</div>
              <div className="mt-1 text-2xl font-black text-[#ffd34f]"><CoinAmount value={formatCoins(activeBet)} iconSize={20} /></div>
            </div>
            <div>
              <div className="text-[10px] uppercase tracking-[0.18em] text-white/30 font-black">Mode</div>
              <div className="mt-1 text-lg font-black text-[#ff6f4a]">{bonusState ? 'FREE SPINS' : 'BASE GAME'}</div>
            </div>
          </div>

          <div className="flex items-center gap-3 self-end md:self-auto">
            <button
              onClick={() => setShowBuyBonus(true)}
              disabled={isSpinning || Boolean(bonusState)}
              className="rounded-full border border-white/20 p-3 text-white/90 transition-colors hover:bg-white/10 disabled:opacity-40"
            >
              <Flame size={24} />
            </button>
            <button
              onClick={() => spin()}
              disabled={!canSpin}
              className="rounded-full border border-white/15 p-3 text-white/90 transition-colors hover:bg-white/10 disabled:opacity-40"
            >
              <Play size={24} fill="currentColor" />
            </button>
            <button
              onClick={() => {
                setGrid(createRandomGrid({ allowBonus: true }));
                setWinMessage(null);
                setLastLineHits([]);
                setLastPayout(0);
              }}
              disabled={isSpinning}
              className="rounded-full border border-white/15 p-3 text-white/90 transition-colors hover:bg-white/10 disabled:opacity-40"
            >
              <RotateCcw size={24} />
            </button>
          </div>
        </div>

        <AnimatePresence>
          {winMessage && (
            <motion.div
              initial={{ opacity: 0, scale: 0.96 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.96 }}
              className="absolute inset-0 z-20 flex items-center justify-center bg-black/65 backdrop-blur-sm"
            >
              <div className="rounded-[30px] border border-[#ff6b3d]/45 bg-[linear-gradient(180deg,rgba(45,8,8,0.96),rgba(17,6,8,0.96))] px-10 py-8 text-center shadow-[0_0_45px_rgba(255,88,48,0.34)]">
                <Trophy className="mx-auto mb-4 text-[#ffd34f]" size={52} />
                <div className="text-4xl font-black uppercase italic tracking-tight text-[#ffd34f]">{winMessage}</div>
                <button onClick={() => setWinMessage(null)} className="mt-6 rounded-full bg-white px-8 py-2 text-sm font-black text-black">
                  CONTINUE
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        <AnimatePresence>
          {showBuyBonus && (
            <>
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="absolute inset-0 z-20 bg-black/70 backdrop-blur-sm" onClick={() => setShowBuyBonus(false)} />
              <motion.div
                initial={{ opacity: 0, y: 14, scale: 0.96 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: 14, scale: 0.96 }}
                className="absolute inset-x-6 top-8 z-30 mx-auto max-w-5xl rounded-[34px] border border-[#ff4e34]/45 bg-[linear-gradient(180deg,rgba(28,8,11,0.98),rgba(13,6,10,0.98))] px-6 py-8 text-center shadow-[0_0_60px_rgba(255,80,48,0.32)] md:px-10"
              >
                <button onClick={() => setShowBuyBonus(false)} className="absolute right-6 top-6 text-white/80">
                  <X size={28} />
                </button>
                <div className="text-5xl font-black uppercase italic tracking-tight text-[#ffd34f] [text-shadow:0_0_24px_rgba(255,70,32,0.5)]">Buy Bonus Game</div>
                <div className="mt-6 text-6xl font-black italic text-[#fff0a4]"><CoinAmount value={formatCoins(bonusBuyCost)} className="justify-center gap-4" iconSize={40} /></div>
                <div className="text-2xl font-black uppercase tracking-[0.12em] text-white/70">Total Cost</div>

                <div className="mt-8 flex items-center justify-center gap-6">
                  <button
                    onClick={() => setBuyBonusBet((current) => clamp(current - 10, BONUS_BET_MIN, BONUS_BET_MAX))}
                    className="flex h-24 w-24 items-center justify-center rounded-[26px] border border-[#ff3229] bg-[#3a0c12] text-[#fff2c3] shadow-[0_0_26px_rgba(255,40,40,0.3)]"
                  >
                    <Minus size={40} />
                  </button>
                  <div className="min-w-[280px] rounded-[26px] bg-[linear-gradient(180deg,rgba(108,8,18,0.92),rgba(81,8,24,0.82))] px-8 py-7 shadow-[inset_0_0_24px_rgba(255,255,255,0.05),0_0_30px_rgba(255,45,45,0.18)]">
                    <div className="text-6xl font-black italic text-[#ffd34f]"><CoinAmount value={buyBonusBet.toFixed(2)} className="justify-center gap-4" iconSize={34} /></div>
                    <div className="text-2xl font-black uppercase tracking-[0.12em] text-white/80">Bet Per Spin</div>
                  </div>
                  <button
                    onClick={() => setBuyBonusBet((current) => clamp(current + 10, BONUS_BET_MIN, BONUS_BET_MAX))}
                    className="flex h-24 w-24 items-center justify-center rounded-[26px] border border-[#ff3229] bg-[#3a0c12] text-[#fff2c3] shadow-[0_0_26px_rgba(255,40,40,0.3)]"
                  >
                    <Plus size={40} />
                  </button>
                </div>

                <button
                  onClick={() => {
                    setShowBuyBonus(false);
                    const award: BonusAward = {
                      spins: 4 + Math.floor(Math.random() * 4),
                      multiplier: clamp(round2(bonusMultiplier), BONUS_MULTIPLIER_MIN, BONUS_MULTIPLIER_MAX),
                      screens: 1 + Math.floor(Math.random() * 3),
                      source: 'buy',
                    };
                    spin({ buyBonus: true, bonusAward: award });
                  }}
                  disabled={isSpinning || balance < bonusBuyCost}
                  className="mt-8 rounded-[22px] border border-[#ff5a3b]/70 bg-[linear-gradient(180deg,rgba(148,18,14,0.98),rgba(77,11,11,0.98))] px-14 py-5 text-5xl font-black italic text-[#ffd34f] shadow-[0_0_36px_rgba(255,79,45,0.32)] disabled:opacity-40"
                >
                  BUY
                </button>
              </motion.div>
            </>
          )}
        </AnimatePresence>

        <AnimatePresence>
          {bonusIntro && (
            <>
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="absolute inset-0 z-20 bg-black/70 backdrop-blur-[2px]" />
              <motion.div
                initial={{ opacity: 0, scale: 0.96, y: 12 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.96, y: 12 }}
                className="absolute inset-x-6 top-14 z-30 mx-auto max-w-6xl rounded-[36px] border border-[#ff6d42]/45 bg-[linear-gradient(180deg,rgba(26,8,8,0.98),rgba(10,8,10,0.98))] px-8 py-8 shadow-[0_0_60px_rgba(255,90,55,0.28)]"
              >
                <div className="text-center">
                  <div className="text-5xl font-black italic tracking-tight text-[#ff9f3b] [text-shadow:0_0_26px_rgba(255,70,32,0.46)]">Lucky Pasus</div>
                </div>
                <div className="mt-8 grid gap-6 md:grid-cols-3">
                  {[
                    { label: 'Spins', value: bonusIntro.spins, accent: '#ffd34f' },
                    { label: 'Multiplier', value: `x${bonusIntro.multiplier.toFixed(2)}`, accent: '#ffb144' },
                    { label: 'Screens', value: bonusIntro.screens, accent: '#ff8a3c' },
                  ].map((card) => (
                    <div key={card.label} className="rounded-[28px] border border-[#ffd34f]/45 bg-black/75 p-6 text-center shadow-[0_0_24px_rgba(255,191,58,0.16)]">
                      <div className="text-7xl font-black italic" style={{ color: card.accent }}>{card.value}</div>
                      <div className="mt-3 text-3xl font-black uppercase tracking-[0.08em]" style={{ color: card.accent }}>{card.label}</div>
                    </div>
                  ))}
                </div>
                <button
                  onClick={startBonusFromIntro}
                  className="mt-8 block w-full rounded-[24px] border border-[#ff4c37]/65 bg-[linear-gradient(180deg,rgba(148,16,11,0.98),rgba(72,10,10,0.98))] px-8 py-5 text-4xl font-black uppercase text-[#fff4c2] shadow-[0_0_36px_rgba(255,76,55,0.28)]"
                >
                  Click To Continue
                </button>
              </motion.div>
            </>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
};
