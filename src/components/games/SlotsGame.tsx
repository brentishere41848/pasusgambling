import React, { useEffect, useMemo, useRef, useState } from 'react';
import { motion } from 'motion/react';
import { Play, RotateCcw, X, Minus, Plus, Flame } from 'lucide-react';
import confetti from 'canvas-confetti';
import { useBalance } from '../../context/BalanceContext';
import { logBetActivity } from '../../lib/activity';
import { cn } from '../../lib/utils';
import { QuickBetButtons, GameStatsBar, useLocalGameStats } from './GameHooks';
type VariantId = 'lucky-pasus' | 'starburst-net' | 'book-of-darkness-bs' | 'fruit-shop-net' | 'vegas777-ka' | 'golden-dragon-ka';
type SlotMode = 'bonusRows' | 'cluster' | 'expanding' | 'stickyWild' | 'classic' | 'reelMultiplier';
type SymbolId =
  | 'seven'
  | 'plum'
  | 'lemon'
  | 'orange'
  | 'cherry'
  | 'melon'
  | 'wild'
  | 'pasus'
  | 'star'
  | 'pink'
  | 'blue'
  | 'green'
  | 'book'
  | 'moon'
  | 'wolf'
  | 'skull'
  | 'grape'
  | 'bell'
  | 'dragon'
  | 'coin'
  | 'ruby';

type ReelCell = { id: number; symbol: SymbolId; sticky?: boolean };
type ReelGrid = ReelCell[][];
type LineHit = { key: string; label: string; payout: number; multiplier?: number };
type BonusAward = { spins: number; multiplier: number; source: 'buy' | 'trigger'; note?: string };
type BonusState = {
  spinsLeft: number;
  totalSpins: number;
  multiplier: number;
  totalWin: number;
  stickyWilds?: Array<{ reel: number; row: number }>;
  expandingSymbol?: SymbolId;
};
type EvalResult = { payout: number; hits: LineHit[]; bonusCount: number; note?: string };
type SymbolMeta = { label: string; accent: string; bg: string; weight: number; textClass?: string; isIcon?: boolean };
type SlotVariant = {
  id: VariantId;
  name: string;
  provider: string;
  accent: string;
  rows: number;
  buyBonusMultiplier?: number;
  buyBonusMin?: number;
  buyBonusMax?: number;
  bonusMultiplierRange?: { min: number; max: number };
  mode: SlotMode;
  flavor: string;
  bonusLabel: string;
  background: string;
  frame: string;
  symbolMeta: Record<SymbolId, SymbolMeta>;
  symbols: SymbolId[];
  weightedSymbol: (bonusMode: boolean) => SymbolId;
  createGrid: (bonusMode: boolean, stickyWilds?: Array<{ reel: number; row: number }>) => ReelGrid;
  evaluate: (grid: ReelGrid, wager: number, bonusState: BonusState | null) => EvalResult;
  createBonusAward?: (source: 'buy' | 'trigger', bonusMultiplier: number) => BonusAward;
  randomBonusTrigger?: (grid: ReelGrid, bonusMode: boolean) => number;
};

const REEL_COUNT = 5;
const BONUS_MULTIPLIER_MIN = 0.01;
const BONUS_MULTIPLIER_MAX = 999;
const coinIcon = '/assets/icon.png';
let cellId = 0;

const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value));
const round2 = (value: number) => Math.round(value * 100) / 100;
const nextCell = (symbol: SymbolId, sticky = false): ReelCell => ({ id: cellId++, symbol, sticky });

function weightedPick(symbolMeta: Record<SymbolId, SymbolMeta>, symbols: SymbolId[], bonusMode: boolean) {
  const total = symbols.reduce((sum, symbol) => sum + symbolMeta[symbol].weight * (bonusMode && symbol === 'wild' ? 1.5 : 1), 0);
  let roll = Math.random() * total;
  for (const symbol of symbols) {
    roll -= symbolMeta[symbol].weight * (bonusMode && symbol === 'wild' ? 1.5 : 1);
    if (roll <= 0) {
      return symbol;
    }
  }
  return symbols[0];
}

function createWeightedGrid(
  rows: number,
  symbolMeta: Record<SymbolId, SymbolMeta>,
  symbols: SymbolId[],
  bonusMode: boolean,
  stickyWilds?: Array<{ reel: number; row: number }>
) {
  return Array.from({ length: REEL_COUNT }, (_, reel) =>
    Array.from({ length: rows }, (_, row) => {
      const sticky = stickyWilds?.some((entry) => entry.reel === reel && entry.row === row);
      return sticky ? nextCell('wild', true) : nextCell(weightedPick(symbolMeta, symbols, bonusMode));
    })
  );
}

function countSymbol(grid: ReelGrid, symbol: SymbolId) {
  return grid.flat().filter((cell) => cell.symbol === symbol).length;
}

function formatCoins(value: number) {
  return Math.round(value).toLocaleString();
}

function CoinAmount({ value, className = '', iconSize = 18 }: { value: number | string; className?: string; iconSize?: number }) {
  return (
    <span className={cn('inline-flex items-center gap-2', className)}>
      <img src={coinIcon} alt="" className="rounded-full object-cover" style={{ width: iconSize, height: iconSize }} />
      <span>{value}</span>
    </span>
  );
}

function symbolTextClass(symbol: SymbolId, meta: SymbolMeta) {
  if (meta.textClass) {
    return meta.textClass;
  }
  return 'text-4xl leading-none';
}

function evaluateRowMatches(
  grid: ReelGrid,
  rows: number,
  wager: number,
  payoutTable: Partial<Record<SymbolId, Partial<Record<3 | 4 | 5, number>>>>,
  threshold = 3
) {
  const hits: LineHit[] = [];
  let payout = 0;

  for (let row = 0; row < rows; row++) {
    let anchor: SymbolId | null = null;
    let count = 0;

    for (let reel = 0; reel < REEL_COUNT; reel += 1) {
      const symbol = grid[reel][row].symbol;

      if (symbol === 'pasus' || symbol === 'book') {
        break;
      }

      if (symbol === 'wild') {
        count += 1;
        continue;
      }

      if (!anchor) {
        anchor = symbol;
        count += 1;
        continue;
      }

      if (symbol !== anchor) {
        break;
      }

      count += 1;
    }

    if (!anchor || count < threshold) {
      continue;
    }

    const lineMultiplier = payoutTable[anchor]?.[count as 3 | 4 | 5] ?? 0;
    if (!lineMultiplier) {
      continue;
    }
    const linePayout = round2(wager * lineMultiplier);
    payout += linePayout;
    hits.push({ key: `${row}-${anchor}`, label: `${count} ${anchor} on row ${row + 1}`, payout: linePayout });
  }

  return { payout: round2(payout), hits };
}

const baseMeta: Record<SymbolId, SymbolMeta> = {
  seven: { label: '7️⃣', accent: '#ff7236', bg: 'from-[#51150b] to-[#170908]', weight: 8, textClass: 'text-5xl' },
  plum: { label: '🍑', accent: '#b36dff', bg: 'from-[#2d1047] to-[#110816]', weight: 14, textClass: 'text-5xl' },
  lemon: { label: '🍋', accent: '#ffe25a', bg: 'from-[#4f430a] to-[#171307]', weight: 14, textClass: 'text-5xl' },
  orange: { label: '🍊', accent: '#ffb347', bg: 'from-[#4d240a] to-[#171007]', weight: 14, textClass: 'text-5xl' },
  cherry: { label: '🍒', accent: '#ff5a8b', bg: 'from-[#4a0f24] to-[#180811]', weight: 14, textClass: 'text-5xl' },
  melon: { label: '🍉', accent: '#73ff84', bg: 'from-[#173f18] to-[#081109]', weight: 12, textClass: 'text-5xl' },
  wild: { label: '⭐', accent: '#ffd13d', bg: 'from-[#5c3606] to-[#190f04]', weight: 6, textClass: 'text-5xl' },
  pasus: { label: 'PASUS', accent: '#ffffff', bg: 'from-[#123f2e] to-[#081712]', weight: 2, isIcon: true },
  star: { label: '💎', accent: '#7ef2ff', bg: 'from-[#082847] to-[#050d18]', weight: 12, textClass: 'text-5xl' },
  pink: { label: '🩷', accent: '#ff7cf8', bg: 'from-[#410b42] to-[#160514]', weight: 14, textClass: 'text-5xl' },
  blue: { label: '🔷', accent: '#72a3ff', bg: 'from-[#0f1c4d] to-[#070c17]', weight: 14, textClass: 'text-5xl' },
  green: { label: '🟢', accent: '#6dffb0', bg: 'from-[#0b3824] to-[#07130d]', weight: 14, textClass: 'text-5xl' },
  book: { label: '📖', accent: '#f7d58b', bg: 'from-[#4d2d0d] to-[#171008]', weight: 4, textClass: 'text-5xl' },
  moon: { label: '🌙', accent: '#a7c3ff', bg: 'from-[#132440] to-[#090d18]', weight: 12, textClass: 'text-5xl' },
  wolf: { label: '🐺', accent: '#d9e2ff', bg: 'from-[#1b1d32] to-[#080911]', weight: 10, textClass: 'text-5xl' },
  skull: { label: '💀', accent: '#f4b5ff', bg: 'from-[#2f1531] to-[#120611]', weight: 10, textClass: 'text-5xl' },
  grape: { label: '🍇', accent: '#c88cff', bg: 'from-[#2a0e43] to-[#0f0816]', weight: 13, textClass: 'text-5xl' },
  bell: { label: '🔔', accent: '#ffd561', bg: 'from-[#483109] to-[#140e05]', weight: 12, textClass: 'text-5xl' },
  dragon: { label: '🐉', accent: '#ff7b4b', bg: 'from-[#4b160c] to-[#140907]', weight: 8, textClass: 'text-5xl' },
  coin: { label: '🪙', accent: '#ffe36f', bg: 'from-[#544105] to-[#171105]', weight: 11, textClass: 'text-5xl' },
  ruby: { label: '♦️', accent: '#ff5577', bg: 'from-[#4a0d1d] to-[#17070c]', weight: 11, textClass: 'text-5xl' },
};

const slotVariants: Record<VariantId, SlotVariant> = {
  'lucky-pasus': {
    id: 'lucky-pasus',
    name: 'Lucky Pasus',
    provider: 'Pasus',
    accent: '#ff9a54',
    rows: 8,
    mode: 'bonusRows',
    buyBonusMultiplier: 80,
    buyBonusMin: 800,
    buyBonusMax: 200_000,
    bonusMultiplierRange: { min: 0.01, max: 999 },
    flavor: 'Neon fruit slot with Pasus scatters and stacked free-spin rows.',
    bonusLabel: 'Pasus Bonus',
    background: 'bg-[linear-gradient(180deg,#0d0c10_0%,#130d11_55%,#08090c_100%)]',
    frame: 'border-[#2048ff]/30',
    symbolMeta: baseMeta,
    symbols: ['seven', 'plum', 'lemon', 'orange', 'cherry', 'melon', 'wild', 'pasus'],
    weightedSymbol: (bonusMode) => weightedPick(baseMeta, ['seven', 'plum', 'lemon', 'orange', 'cherry', 'melon', 'wild', 'pasus'], bonusMode),
    createGrid: (bonusMode) => createWeightedGrid(8, baseMeta, ['seven', 'plum', 'lemon', 'orange', 'cherry', 'melon', 'wild', 'pasus'], bonusMode),
    evaluate: (grid, wager, bonusState) => {
      const base = evaluateRowMatches(
        grid,
        8,
        wager * (bonusState?.multiplier ?? 1),
        {
          seven: { 3: 8, 4: 18, 5: 40 },
          plum: { 3: 1.4, 4: 2.8, 5: 5 },
          lemon: { 3: 1.4, 4: 2.8, 5: 5 },
          orange: { 3: 1.6, 4: 3.3, 5: 5.6 },
          cherry: { 3: 1.8, 4: 3.8, 5: 6.3 },
          melon: { 3: 2, 4: 4.2, 5: 7 },
          wild: { 3: 3, 4: 8, 5: 16 },
        },
        bonusState ? 4 : 3
      );
      const hits = bonusState
        ? base.hits.sort((a, b) => b.payout - a.payout).map((hit, index) => ({ ...hit, payout: round2(hit.payout * 2 ** index), multiplier: 2 ** index }))
        : base.hits;
      return { payout: round2(hits.reduce((sum, hit) => sum + hit.payout, 0)), hits, bonusCount: countSymbol(grid, 'pasus') };
    },
    createBonusAward: (source, bonusMultiplier) => ({
      spins: 4 + Math.floor(Math.random() * 4),
      multiplier: clamp(round2(bonusMultiplier), BONUS_MULTIPLIER_MIN, BONUS_MULTIPLIER_MAX),
      source,
      note: 'Rows that hit later in the bonus climb to x2, x4, x8 and higher.',
    }),
    randomBonusTrigger: (grid) => countSymbol(grid, 'pasus'),
  },
  'starburst-net': {
    id: 'starburst-net',
    name: 'StarBurstNET',
    provider: 'NET',
    accent: '#7ef2ff',
    rows: 6,
    mode: 'cluster',
    flavor: 'Cosmic cluster pays with bursts of matching gems anywhere on the screen.',
    bonusLabel: 'Burst Meter',
    background: 'bg-[linear-gradient(180deg,#050913_0%,#0c1228_48%,#04070d_100%)]',
    frame: 'border-cyan-400/30',
    symbolMeta: baseMeta,
    symbols: ['star', 'pink', 'blue', 'green', 'wild'],
    weightedSymbol: (bonusMode) => weightedPick(baseMeta, ['star', 'pink', 'blue', 'green', 'wild'], bonusMode),
    createGrid: (bonusMode) => createWeightedGrid(6, baseMeta, ['star', 'pink', 'blue', 'green', 'wild'], bonusMode),
    evaluate: (grid, wager) => {
      const counts = new Map<SymbolId, number>();
      grid.flat().forEach((cell) => counts.set(cell.symbol, (counts.get(cell.symbol) ?? 0) + 1));
      const hits: LineHit[] = [];
      let payout = 0;
      counts.forEach((count, symbol) => {
        if (count < 5) {
          return;
        }
        const multiplier = round2((symbol === 'wild' ? 2.4 : symbol === 'star' ? 1.8 : 1.1) * Math.max(1, count - 4));
        const linePayout = round2(wager * multiplier);
        payout += linePayout;
        hits.push({ key: `${symbol}-${count}`, label: `${count} ${symbol} cluster`, payout: linePayout });
      });
      return { payout: round2(payout), hits, bonusCount: 0, note: 'Any 5+ matching gems anywhere pay.' };
    },
  },
  'book-of-darkness-bs': {
    id: 'book-of-darkness-bs',
    name: 'BookOfDarknessBS',
    provider: 'BS',
    accent: '#b58bff',
    rows: 5,
    mode: 'expanding',
    buyBonusMultiplier: 100,
    buyBonusMin: 1_000,
    buyBonusMax: 200_000,
    bonusMultiplierRange: { min: 1, max: 50 },
    flavor: 'Dark 5x5 slot with book scatters and a mystery expanding symbol in bonus.',
    bonusLabel: 'Darkness Bonus',
    background: 'bg-[linear-gradient(180deg,#100916_0%,#180d20_55%,#07060b_100%)]',
    frame: 'border-violet-400/35',
    symbolMeta: baseMeta,
    symbols: ['book', 'moon', 'wolf', 'skull', 'wild', 'ruby'],
    weightedSymbol: (bonusMode) => weightedPick(baseMeta, ['book', 'moon', 'wolf', 'skull', 'wild', 'ruby'], bonusMode),
    createGrid: (bonusMode) => createWeightedGrid(5, baseMeta, ['book', 'moon', 'wolf', 'skull', 'wild', 'ruby'], bonusMode),
    evaluate: (grid, wager, bonusState) => {
      let working = grid;
      const expandingSymbol = bonusState?.expandingSymbol;
      if (bonusState && expandingSymbol) {
        const reelsToExpand = new Set<number>();
        for (let reel = 0; reel < REEL_COUNT; reel++) {
          for (let row = 0; row < 5; row++) {
            if (grid[reel][row].symbol === expandingSymbol) {
              reelsToExpand.add(reel);
            }
          }
        }
        if (reelsToExpand.size > 0) {
          working = grid.map((reel, reelIndex) => (reelsToExpand.has(reelIndex) ? reel.map(() => nextCell(expandingSymbol)) : reel));
        }
      }
      const base = evaluateRowMatches(
        working,
        5,
        wager * (bonusState?.multiplier ?? 1),
        {
          moon: { 3: 2, 4: 4.5, 5: 8 },
          wolf: { 3: 2.4, 4: 5.5, 5: 10 },
          skull: { 3: 2.8, 4: 6, 5: 12 },
          wild: { 3: 4, 4: 10, 5: 22 },
          ruby: { 3: 3, 4: 7, 5: 14 },
        }
      );
      return {
        payout: base.payout,
        hits: base.hits,
        bonusCount: countSymbol(grid, 'book'),
        note: expandingSymbol ? `${baseMeta[expandingSymbol].label} expands on any reel it lands.` : undefined,
      };
    },
    createBonusAward: (source, bonusMultiplier) => ({
      spins: 8 + Math.floor(Math.random() * 5),
      multiplier: clamp(round2(bonusMultiplier), 1, 50),
      source,
      note: 'A random premium symbol expands during the feature.',
    }),
    randomBonusTrigger: (grid) => countSymbol(grid, 'book'),
  },
  'fruit-shop-net': {
    id: 'fruit-shop-net',
    name: 'FruitShopNET',
    provider: 'NET',
    accent: '#ff78b5',
    rows: 6,
    mode: 'stickyWild',
    buyBonusMultiplier: 90,
    buyBonusMin: 900,
    buyBonusMax: 200_000,
    bonusMultiplierRange: { min: 1, max: 25 },
    flavor: 'Fresh fruit slot with sticky wild free spins and bright shop-floor energy.',
    bonusLabel: 'Sticky Shop Bonus',
    background: 'bg-[linear-gradient(180deg,#170a11_0%,#21101b_45%,#0a070a_100%)]',
    frame: 'border-pink-400/30',
    symbolMeta: baseMeta,
    symbols: ['grape', 'lemon', 'orange', 'cherry', 'melon', 'wild', 'pasus'],
    weightedSymbol: (bonusMode) => weightedPick(baseMeta, ['grape', 'lemon', 'orange', 'cherry', 'melon', 'wild', 'pasus'], bonusMode),
    createGrid: (bonusMode, stickyWilds) => createWeightedGrid(6, baseMeta, ['grape', 'lemon', 'orange', 'cherry', 'melon', 'wild', 'pasus'], bonusMode, stickyWilds),
    evaluate: (grid, wager, bonusState) => {
      const base = evaluateRowMatches(
        grid,
        6,
        wager * (bonusState?.multiplier ?? 1),
        {
          grape: { 3: 1.8, 4: 3.7, 5: 6.8 },
          lemon: { 3: 1.4, 4: 2.9, 5: 5.2 },
          orange: { 3: 1.6, 4: 3.3, 5: 5.8 },
          cherry: { 3: 1.7, 4: 3.5, 5: 6.1 },
          melon: { 3: 2.1, 4: 4.4, 5: 7.5 },
          wild: { 3: 3.5, 4: 8.5, 5: 18 },
        }
      );
      const stickyCount = bonusState?.stickyWilds?.length ?? 0;
      const factor = 1 + stickyCount * 0.08;
      return {
        payout: round2(base.payout * factor),
        hits: base.hits.map((hit) => ({ ...hit, payout: round2(hit.payout * factor) })),
        bonusCount: countSymbol(grid, 'pasus'),
        note: stickyCount ? `${stickyCount} sticky wilds are locked for the rest of the bonus.` : undefined,
      };
    },
    createBonusAward: (source, bonusMultiplier) => ({
      spins: 6 + Math.floor(Math.random() * 5),
      multiplier: clamp(round2(bonusMultiplier), 1, 25),
      source,
      note: 'Wilds can stick in place across free spins.',
    }),
    randomBonusTrigger: (grid) => countSymbol(grid, 'pasus'),
  },
  'vegas777-ka': {
    id: 'vegas777-ka',
    name: 'Vegas777KA',
    provider: 'KA',
    accent: '#ffb347',
    rows: 3,
    mode: 'classic',
    flavor: 'Classic fast 5x3 machine built around clean horizontal line hits.',
    bonusLabel: 'Classic Lines',
    background: 'bg-[linear-gradient(180deg,#150a06_0%,#1b1007_48%,#090607_100%)]',
    frame: 'border-amber-400/30',
    symbolMeta: baseMeta,
    symbols: ['seven', 'bell', 'orange', 'cherry', 'coin', 'wild'],
    weightedSymbol: (bonusMode) => weightedPick(baseMeta, ['seven', 'bell', 'orange', 'cherry', 'coin', 'wild'], bonusMode),
    createGrid: (bonusMode) => createWeightedGrid(3, baseMeta, ['seven', 'bell', 'orange', 'cherry', 'coin', 'wild'], bonusMode),
    evaluate: (grid, wager) => {
      const hits: LineHit[] = [];
      let payout = 0;
      for (let row = 0; row < 3; row++) {
        const symbols = grid.map((reel) => reel[row].symbol);
        const first = symbols[0];
        if (!symbols.every((symbol) => symbol === first)) {
          continue;
        }
        const multiplier = first === 'seven' ? 40 : first === 'wild' ? 25 : first === 'bell' ? 14 : 8;
        const linePayout = round2(wager * multiplier);
        payout += linePayout;
        hits.push({ key: `classic-${row}`, label: `${baseMeta[first].label} full line on row ${row + 1}`, payout: linePayout });
      }
      return { payout: round2(payout), hits, bonusCount: 0, note: 'Only full horizontal lines pay in this machine.' };
    },
  },
  'golden-dragon-ka': {
    id: 'golden-dragon-ka',
    name: 'GoldenDragonKA',
    provider: 'KA',
    accent: '#ffe36f',
    rows: 4,
    mode: 'reelMultiplier',
    flavor: 'Dragon slot with random reel multipliers that amplify the whole result.',
    bonusLabel: 'Dragon Reels',
    background: 'bg-[linear-gradient(180deg,#120d07_0%,#1d1409_52%,#090705_100%)]',
    frame: 'border-yellow-300/30',
    symbolMeta: baseMeta,
    symbols: ['dragon', 'coin', 'ruby', 'bell', 'seven', 'wild'],
    weightedSymbol: (bonusMode) => weightedPick(baseMeta, ['dragon', 'coin', 'ruby', 'bell', 'seven', 'wild'], bonusMode),
    createGrid: (bonusMode) => createWeightedGrid(4, baseMeta, ['dragon', 'coin', 'ruby', 'bell', 'seven', 'wild'], bonusMode),
    evaluate: (grid, wager) => {
      const base = evaluateRowMatches(
        grid,
        4,
        wager,
        {
          dragon: { 3: 3.5, 4: 8, 5: 18 },
          coin: { 3: 2.3, 4: 5, 5: 11 },
          ruby: { 3: 2.8, 4: 6, 5: 13 },
          bell: { 3: 2, 4: 4.5, 5: 10 },
          seven: { 3: 4.5, 4: 10, 5: 24 },
          wild: { 3: 5, 4: 12, 5: 28 },
        }
      );
      const reelMultipliers = Array.from({ length: REEL_COUNT }, () => 1 + Math.floor(Math.random() * 3));
      const totalMultiplier = reelMultipliers.reduce((sum, value) => sum + value, 0) / REEL_COUNT;
      const hits = base.hits.map((hit) => ({ ...hit, payout: round2(hit.payout * totalMultiplier), multiplier: round2(totalMultiplier) }));
      return {
        payout: round2(hits.reduce((sum, hit) => sum + hit.payout, 0)),
        hits,
        bonusCount: 0,
        note: `Reel aura x${reelMultipliers.join(' x')} produced x${round2(totalMultiplier)} total power.`,
      };
    },
  },
};

function renderSymbol(cell: ReelCell, meta: SymbolMeta) {
  if (meta.isIcon) {
    return <img src={coinIcon} alt="Pasus" className="relative z-10 h-10 w-10 rounded-full object-cover ring-2 ring-white/40" />;
  }
  return (
    <div className={cn('relative z-10 text-center font-black uppercase', symbolTextClass(cell.symbol, meta))} style={{ color: meta.accent }}>
      {meta.label}
    </div>
  );
}

const SlotMachine: React.FC<{ variant: SlotVariant }> = ({ variant }) => {
  const { balance, addBalance, subtractBalance } = useBalance();
  const [bet, setBet] = useState(50);
  const [bonusMultiplier, setBonusMultiplier] = useState(5);
  const [grid, setGrid] = useState<ReelGrid>(() => variant.createGrid(false));
  const [isSpinning, setIsSpinning] = useState(false);
  const [lastPayout, setLastPayout] = useState(0);
  const [lastHits, setLastHits] = useState<LineHit[]>([]);
  const [lastNote, setLastNote] = useState<string>(variant.flavor);
  const [showBuyBonus, setShowBuyBonus] = useState(false);
  const [buyBonusBet, setBuyBonusBet] = useState(10);
  const [bonusState, setBonusState] = useState<BonusState | null>(null);
  const [pendingBonus, setPendingBonus] = useState<BonusAward | null>(null);
  const timersRef = useRef<number[]>([]);
  const statusTimerRef = useRef<number | null>(null);
  const { getStats, recordBet } = useLocalGameStats('slots');
  const stats = getStats();

  const buyBonusMin = variant.buyBonusMin ? Math.ceil(variant.buyBonusMin / (variant.buyBonusMultiplier ?? 1)) : 1;
  const buyBonusMax = variant.buyBonusMax ? Math.max(buyBonusMin, Math.floor(variant.buyBonusMax / (variant.buyBonusMultiplier ?? 1))) : Math.max(1, Math.floor(balance));

  useEffect(() => {
    setGrid(variant.createGrid(false));
    setLastHits([]);
    setLastPayout(0);
    setLastNote(variant.flavor);
    setBonusState(null);
    setPendingBonus(null);
    setBuyBonusBet(clamp(10, buyBonusMin, buyBonusMax));
  }, [variant, buyBonusMin, buyBonusMax]);

  useEffect(() => {
    return () => {
      timersRef.current.forEach((timer) => window.clearTimeout(timer));
      if (statusTimerRef.current !== null) {
        window.clearTimeout(statusTimerRef.current);
      }
    };
  }, []);

  const clearTimers = () => {
    timersRef.current.forEach((timer) => window.clearTimeout(timer));
    timersRef.current = [];
  };

  const activeBet = bonusState ? buyBonusBet : bet;
  const canSpin = !isSpinning && (bonusState || balance >= activeBet);
  const buyBonusCost = useMemo(() => {
    if (!variant.buyBonusMultiplier || !variant.buyBonusMin || !variant.buyBonusMax) {
      return 0;
    }
    return clamp(buyBonusBet * variant.buyBonusMultiplier, variant.buyBonusMin, variant.buyBonusMax);
  }, [buyBonusBet, variant]);

  const spin = (options?: { buyBonus?: boolean; bonusAward?: BonusAward }) => {
    if (isSpinning) {
      return;
    }

    const inBonus = Boolean(bonusState);
    const wager = inBonus ? buyBonusBet : bet;
    if (!inBonus) {
      const spend = options?.buyBonus ? buyBonusCost : wager;
      if (spend > 0 && !subtractBalance(spend)) {
        return;
      }
    }

    setIsSpinning(true);
    setLastPayout(0);
    setLastHits([]);
    clearTimers();

    const finalGrid = variant.createGrid(inBonus, bonusState?.stickyWilds);
    const reelDelay = variant.mode === 'classic' ? 120 : 190;
    const leadIn = variant.mode === 'classic' ? 220 : 420;

    for (let reelIndex = 0; reelIndex < REEL_COUNT; reelIndex++) {
      const timer = window.setTimeout(() => {
        setGrid((current) =>
          current.map((reel, index) => (index === reelIndex ? Array.from({ length: variant.rows }, (_, row) => finalGrid[reelIndex][row]) : reel))
        );
      }, leadIn + reelIndex * reelDelay);
      timersRef.current.push(timer);
    }

    const interval = window.setInterval(() => {
      setGrid((current) =>
        current.map((reel, index) =>
          index === REEL_COUNT - 1 && variant.mode !== 'classic'
            ? reel
            : reel.map((cell) => (cell.sticky ? cell : nextCell(variant.weightedSymbol(inBonus))))
        )
      );
    }, variant.mode === 'classic' ? 60 : 85);

    const finalize = window.setTimeout(() => {
      window.clearInterval(interval);
      setGrid(finalGrid);
      setIsSpinning(false);

      let nextBonusState = bonusState;
      if (variant.mode === 'stickyWild' && bonusState) {
        const newSticky = [...(bonusState.stickyWilds ?? [])];
        finalGrid.forEach((reel, reelIndex) => {
          reel.forEach((cell, rowIndex) => {
            if (cell.symbol === 'wild' && !newSticky.some((entry) => entry.reel === reelIndex && entry.row === rowIndex)) {
              newSticky.push({ reel: reelIndex, row: rowIndex });
            }
          });
        });
        nextBonusState = { ...bonusState, stickyWilds: newSticky };
      }

      const evalResult = variant.evaluate(finalGrid, options?.buyBonus ? buyBonusCost : wager, nextBonusState ?? null);
      setLastPayout(evalResult.payout);
      setLastHits(evalResult.hits);
      setLastNote(evalResult.note ?? variant.flavor);

      if (statusTimerRef.current !== null) {
        window.clearTimeout(statusTimerRef.current);
        statusTimerRef.current = null;
      }

      if (evalResult.payout > 0) {
        addBalance(evalResult.payout);
        setLastNote(`Win ${formatCoins(evalResult.payout)}. ${evalResult.note ?? variant.flavor}`);
        statusTimerRef.current = window.setTimeout(() => {
          setLastNote(bonusState ? `${bonusState.spinsLeft} bonus spins left` : variant.flavor);
          statusTimerRef.current = null;
        }, 3000);
        if (evalResult.payout >= Math.max(1, wager) * 5) {
          confetti({ particleCount: 130, spread: 80, origin: { y: 0.58 } });
        }
        logBetActivity({
          gameKey: 'slots',
          wager: options?.buyBonus ? buyBonusCost : wager,
          payout: evalResult.payout,
          multiplier: round2(evalResult.payout / Math.max(1, options?.buyBonus ? buyBonusCost : wager)),
          outcome: 'win',
          detail: `${variant.name}: ${evalResult.hits.map((hit) => hit.label).join(', ') || 'feature payout'}`,
        });
        recordBet(options?.buyBonus ? buyBonusCost : wager, evalResult.payout, true);
      } else {
        logBetActivity({
          gameKey: 'slots',
          wager: options?.buyBonus ? buyBonusCost : wager,
          payout: 0,
          multiplier: 0,
          outcome: 'loss',
          detail: `${variant.name}: ${evalResult.note ?? 'No win'}`,
        });
        recordBet(options?.buyBonus ? buyBonusCost : wager, 0, false);
      }

      if (bonusState) {
        const totalWin = round2((nextBonusState?.totalWin ?? bonusState.totalWin) + evalResult.payout);
        if (bonusState.spinsLeft <= 1) {
          setBonusState(null);
          setLastNote(totalWin > 0 ? `Bonus over ${formatCoins(totalWin)}` : 'Bonus over');
          statusTimerRef.current = window.setTimeout(() => {
            setLastNote(variant.flavor);
            statusTimerRef.current = null;
          }, 3000);
        } else {
          setBonusState({
            ...(nextBonusState ?? bonusState),
            spinsLeft: bonusState.spinsLeft - 1,
            totalWin,
          });
        }
      } else if (options?.bonusAward) {
        setPendingBonus(options.bonusAward);
      } else if (variant.createBonusAward && (variant.randomBonusTrigger?.(finalGrid, false) ?? 0) >= 3) {
        setPendingBonus(variant.createBonusAward('trigger', bonusMultiplier));
      }
    }, leadIn + REEL_COUNT * reelDelay + 100);

    timersRef.current.push(finalize);
  };

  useEffect(() => {
    if (!pendingBonus || isSpinning) {
      return;
    }
    const nextState: BonusState = {
      spinsLeft: pendingBonus.spins,
      totalSpins: pendingBonus.spins,
      multiplier: pendingBonus.multiplier,
      totalWin: 0,
    };
    if (variant.mode === 'stickyWild') {
      nextState.stickyWilds = [];
    }
    if (variant.mode === 'expanding') {
      const candidates = variant.symbols.filter((symbol) => !['book', 'wild'].includes(symbol));
      nextState.expandingSymbol = candidates[Math.floor(Math.random() * candidates.length)] ?? candidates[0];
    }
    setBonusState(nextState);
    setLastNote(pendingBonus.note ?? `${variant.bonusLabel} started`);
    setPendingBonus(null);
  }, [isSpinning, pendingBonus, variant]);

  useEffect(() => {
    if (bonusState && !isSpinning) {
      const timer = window.setTimeout(() => spin(), 900);
      return () => window.clearTimeout(timer);
    }
    return undefined;
  }, [bonusState, isSpinning]);

  const hint = lastHits.length
    ? lastHits.map((hit) => `${hit.label}${hit.multiplier ? ` x${hit.multiplier}` : ''}`).join(' | ')
    : bonusState
      ? `${bonusState.spinsLeft}/${bonusState.totalSpins} bonus spins left`
      : variant.flavor;

  const bonusMultiplierValue = clamp(round2(bonusMultiplier), variant.bonusMultiplierRange?.min ?? BONUS_MULTIPLIER_MIN, variant.bonusMultiplierRange?.max ?? BONUS_MULTIPLIER_MAX);

  return (
    <div className="flex flex-col gap-6 lg:grid lg:grid-cols-[330px_1fr]">
      <div className="rounded-2xl border border-white/10 bg-[#111] p-6">
        <div className="space-y-4">
          <div>
            <div className="text-xs font-black uppercase tracking-[0.24em] text-white/35">Bet Amount</div>
            <input type="number" min={1} value={bet} disabled={isSpinning || Boolean(bonusState)} onChange={(e) => setBet(Math.max(1, Number(e.target.value) || 1))} className="mt-2 w-full rounded-xl border border-white/10 bg-black px-4 py-3 text-white focus:outline-none" />
            <QuickBetButtons balance={balance} bet={bet} onSetBet={setBet} disabled={isSpinning || Boolean(bonusState)} />
          </div>

          {variant.createBonusAward && variant.bonusMultiplierRange && (
            <div>
              <div className="text-xs font-black uppercase tracking-[0.24em] text-white/35">Bonus Multiplier</div>
              <input type="number" step="0.01" value={bonusMultiplier} disabled={isSpinning} onChange={(e) => setBonusMultiplier(clamp(round2(Number(e.target.value) || variant.bonusMultiplierRange!.min), variant.bonusMultiplierRange!.min, variant.bonusMultiplierRange!.max))} className="mt-2 w-full rounded-xl border border-white/10 bg-black px-4 py-3 text-white focus:outline-none" />
              <div className="mt-2 text-[11px] text-white/35">Custom bonus multiplier from x{variant.bonusMultiplierRange.min.toFixed(2)} up to x{variant.bonusMultiplierRange.max.toFixed(2)}.</div>
            </div>
          )}

          <button onClick={() => spin()} disabled={!canSpin} className="flex w-full items-center justify-center gap-2 rounded-xl bg-[#00FF88] py-4 font-bold text-black disabled:opacity-50">
            {isSpinning ? <RotateCcw size={18} className="animate-spin" /> : <Play size={18} fill="currentColor" />}
            {bonusState ? `BONUS SPIN (${bonusState.spinsLeft})` : 'SPIN'}
          </button>

          {variant.createBonusAward && variant.buyBonusMultiplier && (
            <button onClick={() => { setBuyBonusBet(clamp(bet, buyBonusMin, buyBonusMax)); setShowBuyBonus(true); }} disabled={isSpinning || Boolean(bonusState)} className="w-full rounded-xl border border-[#ff6b3d]/50 bg-[linear-gradient(180deg,rgba(140,23,18,0.85),rgba(64,10,10,0.85))] px-4 py-4 text-left text-white shadow-[0_0_24px_rgba(255,89,53,0.3)] disabled:opacity-40">
              <div className="text-[10px] font-black uppercase tracking-[0.24em] text-white/60">Buy Bonus</div>
              <div className="mt-2 text-3xl font-black text-[#ffd34f]"><CoinAmount value={formatCoins(buyBonusCost)} className="gap-3" iconSize={24} /></div>
              <div className="mt-1 text-xs text-white/45">Minimum {formatCoins(variant.buyBonusMin ?? 0)}, maximum {formatCoins(variant.buyBonusMax ?? 0)}</div>
            </button>
          )}
        </div>

      <div className="mt-4">
        <GameStatsBar stats={[
          { label: 'Bets', value: stats.totalBets.toString() },
          { label: 'Wins', value: stats.totalWins.toString() },
          { label: 'Biggest', value: formatCoins(stats.biggestWin) },
          { label: 'Wagered', value: formatCoins(stats.totalWagered) },
        ]} />
      </div>

      <div className="mt-4 rounded-2xl border border-white/10 bg-black/40 p-4">
          <div className="flex items-center justify-between text-[10px] font-black uppercase tracking-[0.18em] text-white/35">
            <span>{variant.bonusLabel}</span>
            <span>{bonusState ? 'Live' : 'Idle'}</span>
          </div>
          <div className="mt-3 grid grid-cols-2 gap-3 text-xs">
            <div className="rounded-xl bg-white/[0.04] px-3 py-3">
              <div className="text-[10px] uppercase tracking-[0.18em] text-white/35">Rows</div>
              <div className="mt-2 text-lg font-black" style={{ color: variant.accent }}>{variant.rows}</div>
            </div>
            <div className="rounded-xl bg-white/[0.04] px-3 py-3">
              <div className="text-[10px] uppercase tracking-[0.18em] text-white/35">Last Win</div>
              <div className="mt-2 text-lg font-black text-white"><CoinAmount value={formatCoins(lastPayout)} iconSize={16} /></div>
            </div>
            <div className="rounded-xl bg-white/[0.04] px-3 py-3">
              <div className="text-[10px] uppercase tracking-[0.18em] text-white/35">Mode</div>
              <div className="mt-2 text-sm font-black" style={{ color: variant.accent }}>{variant.mode}</div>
            </div>
            <div className="rounded-xl bg-white/[0.04] px-3 py-3">
              <div className="text-[10px] uppercase tracking-[0.18em] text-white/35">Bonus Spins</div>
              <div className="mt-2 text-lg font-black text-[#ffd34f]">{bonusState ? bonusState.spinsLeft : 0}</div>
            </div>
          </div>
          <div className="mt-3 text-[11px] leading-relaxed text-white/35">{hint}</div>
        </div>
      </div>

      <div className={cn('relative overflow-hidden rounded-[30px] border p-6 shadow-[0_0_80px_rgba(255,94,58,0.1)] md:p-8', variant.background, variant.frame)}>
        <div className="absolute inset-0 opacity-20" style={{ backgroundImage: 'linear-gradient(rgba(255,255,255,0.05) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.04) 1px, transparent 1px)', backgroundSize: '42px 42px' }} />
        <div className="relative z-10 flex items-center justify-between gap-4">
          <div>
            <div className="text-[11px] font-black uppercase tracking-[0.28em] text-white/35">{variant.provider}</div>
            <div className="mt-2 text-5xl font-black italic tracking-tight" style={{ color: variant.accent }}>{variant.name}</div>
            <div className="mt-3 max-w-2xl text-sm text-white/50">{variant.flavor}</div>
          </div>
          {bonusState && (
            <div className="rounded-2xl border border-white/10 bg-black/40 px-4 py-3 text-right">
              <div className="text-[10px] font-black uppercase tracking-[0.2em] text-white/35">Bonus Running</div>
              <div className="mt-2 text-lg font-black text-[#ffd34f]">{bonusState.spinsLeft} Spins Left</div>
              <div className="text-xs text-white/50">Total bonus win <CoinAmount value={formatCoins(bonusState.totalWin)} iconSize={12} className="inline-flex" /></div>
            </div>
          )}
        </div>

        <div className="relative z-10 mt-8 flex gap-4">
          <div className="hidden w-32 shrink-0 rounded-2xl border border-white/10 bg-black/30 p-4 md:flex">
            <div className="m-auto text-center">
              <div className="text-[10px] font-black uppercase tracking-[0.2em] text-white/35">Machine</div>
              <div className="mt-3 text-2xl font-black leading-tight" style={{ color: variant.accent }}>{variant.mode}</div>
              <div className="mt-4 text-sm text-white/50">{variant.rows} rows</div>
            </div>
          </div>

          <div className="flex-1 rounded-[28px] border border-white/10 bg-black/70 p-3">
            <div className="grid grid-cols-5 gap-3">
              {grid.map((reel, reelIndex) => (
                <div key={reelIndex} className="rounded-[22px] border border-white/10 bg-[linear-gradient(180deg,rgba(6,8,13,0.98),rgba(13,7,11,0.92))] p-2">
                  <div className="grid gap-2" style={{ gridTemplateRows: `repeat(${variant.rows}, minmax(0, 1fr))` }}>
                    {reel.map((cell) => {
                      const meta = variant.symbolMeta[cell.symbol];
                      return (
                        <motion.div
                          key={cell.id}
                          initial={{ y: -12, opacity: 0.55 }}
                          animate={{ y: 0, opacity: 1, scale: isSpinning ? [1, 1.03, 1] : 1 }}
                          transition={{ duration: 0.16 }}
                          className="relative flex h-[76px] items-center justify-center overflow-hidden rounded-[18px] border shadow-[0_0_18px_rgba(255,255,255,0.08)]"
                          style={{ borderColor: `${meta.accent}66`, background: `linear-gradient(180deg, rgba(5,5,8,0.96), rgba(0,0,0,0.96)), linear-gradient(180deg, ${meta.bg})` }}
                        >
                          <div className="absolute inset-0 opacity-20" style={{ background: `radial-gradient(circle at 50% 25%, ${meta.accent}, transparent 60%)` }} />
                          {renderSymbol(cell, meta)}
                          {cell.sticky && <div className="absolute right-2 top-2 text-[9px] font-black uppercase tracking-[0.14em] text-[#ffd34f]">LOCK</div>}
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
              <div className="text-[10px] font-black uppercase tracking-[0.18em] text-white/30">Balance</div>
              <div className="mt-1 text-2xl font-black text-white"><CoinAmount value={formatCoins(balance)} iconSize={20} /></div>
            </div>
            <div>
              <div className="text-[10px] font-black uppercase tracking-[0.18em] text-white/30">Total Bet</div>
              <div className="mt-1 text-2xl font-black" style={{ color: variant.accent }}><CoinAmount value={formatCoins(activeBet)} iconSize={20} /></div>
            </div>
            <div>
              <div className="text-[10px] font-black uppercase tracking-[0.18em] text-white/30">Behavior</div>
              <div className="mt-1 text-lg font-black text-white">{variant.mode}</div>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {variant.createBonusAward && (
              <button onClick={() => setShowBuyBonus(true)} disabled={isSpinning || Boolean(bonusState)} className="rounded-full border border-white/20 p-3 text-white/90 hover:bg-white/10 disabled:opacity-40">
                <Flame size={24} />
              </button>
            )}
            <button onClick={() => spin()} disabled={!canSpin} className="rounded-full border border-white/15 p-3 text-white/90 hover:bg-white/10 disabled:opacity-40">
              <Play size={24} fill="currentColor" />
            </button>
            <button onClick={() => { setGrid(variant.createGrid(false)); setLastHits([]); setLastPayout(0); setLastNote(variant.flavor); }} disabled={isSpinning} className="rounded-full border border-white/15 p-3 text-white/90 hover:bg-white/10 disabled:opacity-40">
              <RotateCcw size={24} />
            </button>
          </div>
        </div>

        {showBuyBonus && variant.createBonusAward && (
          <>
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="absolute inset-0 z-20 bg-black/70 backdrop-blur-sm" onClick={() => setShowBuyBonus(false)} />
            <motion.div initial={{ opacity: 0, y: 14, scale: 0.96 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: 14, scale: 0.96 }} className="absolute inset-x-6 top-8 z-30 mx-auto max-w-4xl rounded-[34px] border border-[#ff4e34]/45 bg-[linear-gradient(180deg,rgba(28,8,11,0.98),rgba(13,6,10,0.98))] px-6 py-8 text-center shadow-[0_0_60px_rgba(255,80,48,0.32)] md:px-10">
              <button onClick={() => setShowBuyBonus(false)} className="absolute right-6 top-6 text-white/80"><X size={28} /></button>
              <div className="text-5xl font-black uppercase italic tracking-tight text-[#ffd34f]">Buy Bonus Game</div>
              <div className="mt-3 text-sm text-white/50">{variant.bonusLabel}</div>
              <div className="mt-6 text-6xl font-black italic text-[#fff0a4]"><CoinAmount value={formatCoins(buyBonusCost)} className="justify-center gap-4" iconSize={40} /></div>
              <div className="text-2xl font-black uppercase tracking-[0.12em] text-white/70">Total Cost</div>

              <div className="mt-8 flex items-center justify-center gap-6">
                <button onClick={() => setBuyBonusBet((current) => clamp(current - 10, buyBonusMin, buyBonusMax))} className="flex h-24 w-24 items-center justify-center rounded-[26px] border border-[#ff3229] bg-[#3a0c12] text-[#fff2c3]"><Minus size={40} /></button>
                <div className="min-w-[280px] rounded-[26px] bg-[linear-gradient(180deg,rgba(108,8,18,0.92),rgba(81,8,24,0.82))] px-8 py-7">
                  <div className="text-6xl font-black italic text-[#ffd34f]"><CoinAmount value={buyBonusBet.toFixed(2)} className="justify-center gap-4" iconSize={34} /></div>
                  <div className="text-2xl font-black uppercase tracking-[0.12em] text-white/80">Bet Per Spin</div>
                </div>
                <button onClick={() => setBuyBonusBet((current) => clamp(current + 10, buyBonusMin, buyBonusMax))} className="flex h-24 w-24 items-center justify-center rounded-[26px] border border-[#ff3229] bg-[#3a0c12] text-[#fff2c3]"><Plus size={40} /></button>
              </div>

              <button
                onClick={() => {
                  if (isSpinning || balance < buyBonusCost || !subtractBalance(buyBonusCost)) {
                    return;
                  }
                  setShowBuyBonus(false);
                  const boughtBonus = variant.createBonusAward!('buy', bonusMultiplierValue);
                  setPendingBonus(boughtBonus);
                }}
                disabled={isSpinning || balance < buyBonusCost}
                className="mt-8 rounded-[22px] border border-[#ff5a3b]/70 bg-[linear-gradient(180deg,rgba(148,18,14,0.98),rgba(77,11,11,0.98))] px-14 py-5 text-5xl font-black italic text-[#ffd34f] disabled:opacity-40"
              >
                BUY
              </button>
            </motion.div>
          </>
        )}
      </div>
    </div>
  );
};

export const SlotsGame: React.FC = () => {
  return <SlotMachine variant={slotVariants['lucky-pasus']} />;
};
