/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { Suspense, lazy, useCallback, useEffect, useState, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  TrendingUp, 
  Grid3X3, 
  Dice5, 
  Wallet, 
  Gamepad2,
  ChevronRight,
  Menu,
  X,
  Home,
  LayoutGrid,
  Zap,
  Star,
  Users,
  ShieldCheck,
  MessageSquare,
  Settings,
  Shield,
  Flame,
  Dices,
  Disc,
  CreditCard,
  RotateCcw,
  Plus,
  Minus,
  ArrowUpRight,
  ArrowDownLeft,
  ChevronDown,
  Bitcoin,
  Coins,
  Copy,
  Crown,
  Droplets,
  Check,
  User,
  Trophy,
  LogIn,
  UserPlus,
  LogOut,
  Mail,
  Lock,
  SendHorizontal,
  LoaderCircle,
  Sparkles,
  Gift,
  Eye,
  UsersRound,
  DollarSign,
  ChevronUp,
  ChevronLeft,
  MapPin,
  BarChart3,
  Gamepad,
   CircleDollarSign,
   Smartphone,
   Monitor,
   Tablet,
   Trash2,
   Download,
   History,
   KeyRound,
   QrCode,
   MessageCircle,
   Target,
   Bell,
   Paperclip
 } from 'lucide-react';
import { AuthProvider, useAuth } from './context/AuthContext';
import { BalanceProvider, useBalance } from './context/BalanceContext';
const CrashGame = lazy(() => import('./components/games/CrashGame').then((m) => ({ default: m.CrashGame })));
const MinesGame = lazy(() => import('./components/games/MinesGame').then((m) => ({ default: m.MinesGame })));
const CoinflipGame = lazy(() => import('./components/games/CoinflipGame').then((m) => ({ default: m.CoinflipGame })));
const DiceGame = lazy(() => import('./components/games/DiceGame').then((m) => ({ default: m.DiceGame })));
const BlackjackGame = lazy(() => import('./components/games/BlackjackGame').then((m) => ({ default: m.BlackjackGame })));
const HiloGame = lazy(() => import('./components/games/HiloGame').then((m) => ({ default: m.HiloGame })));
const BaccaratGame = lazy(() => import('./components/games/BaccaratGame').then((m) => ({ default: m.BaccaratGame })));
const WheelGame = lazy(() => import('./components/games/WheelGame').then((m) => ({ default: m.WheelGame })));
const PlinkoGame = lazy(() => import('./components/games/PlinkoGame').then((m) => ({ default: m.PlinkoGame })));
const RouletteGame = lazy(() => import('./components/games/RouletteGame').then((m) => ({ default: m.RouletteGame })));
const LimboGame = lazy(() => import('./components/games/LimboGame').then((m) => ({ default: m.LimboGame })));
const KenoGame = lazy(() => import('./components/games/KenoGame').then((m) => ({ default: m.KenoGame })));
const ChatRain = lazy(() => import('./components/ChatRain').then((m) => ({ default: m.ChatRain })));
const SettingsPanel = lazy(() => import('./components/SettingsPanel').then((m) => ({ default: m.SettingsPanel })));
const ProvablyFairPanel = lazy(() => import('./components/ProvablyFairPanel').then((m) => ({ default: m.ProvablyFairPanel })));
const ProfilePage = lazy(() => import('./components/ProfilePage').then((m) => ({ default: m.ProfilePage })));
import { apiFetch } from './lib/api';
import { cn } from './lib/utils';

function CurrencyIcon({ className = '', size = 18 }: { className?: string; size?: number }) {
  return (
    <img
      src="/assets/currency.png"
      alt="Balance"
      className={className}
      style={{ width: size, height: size }}
    />
  );
}

const HOME_GAMES = [
  {
    id: 'blackjack',
    name: 'Blackjack',
    description: 'Classic card game. Get closer to 21 than the dealer.',
    image: '/assets/blackjack.png',
  },
  {
    id: 'mines',
    name: 'Mines',
    description: 'Find the gems and avoid the hidden bombs.',
    image: '/assets/mines2.png',
  },
  {
    id: 'dice',
    name: 'Dices',
    description: 'Classic high or low dice game with custom odds.',
    image: '/assets/dice2.png',
  },
  {
    id: 'crash',
    name: 'Crash',
    description: 'Predict the multiplier and cash out before it crashes.',
    image: '/assets/crash2.png',
  },
];

const NEWS_BANNER = {
  id: 'news',
  name: 'PASUS RELEASED',
  description: 'Click to see what\'s new!',
  image: '/assets/hero.png',
};

const CLIENT_SIDE_UNAVAILABLE_GAMES = new Set<string>();

const GAMES = [
  {
    id: 'crash',
    name: 'Crash',
    description: 'Predict the multiplier and cash out before it crashes.',
    icon: TrendingUp,
    color: 'text-emerald-400',
    bg: 'bg-emerald-400/10',
    component: CrashGame,
    featured: true,
    image: '/assets/crash2.png'
  },
  {
    id: 'blackjack',
    name: 'Blackjack',
    description: 'Classic card game. Get closer to 21 than the dealer.',
    icon: CreditCard,
    color: 'text-blue-400',
    bg: 'bg-blue-400/10',
    component: BlackjackGame,
    featured: true,
    image: '/assets/blackjack.png'
  },
  {
    id: 'mines',
    name: 'Mines',
    description: 'Find the gems and avoid the hidden bombs.',
    icon: Grid3X3,
    color: 'text-blue-400',
    bg: 'bg-blue-400/10',
    component: MinesGame,
    featured: true,
    image: '/assets/mines2.png'
  },
  {
    id: 'coinflip',
    name: 'Coinflip',
    description: 'Call heads or tails and double up on the flip.',
    icon: CurrencyIcon,
    color: 'text-amber-300',
    bg: 'bg-amber-300/10',
    component: CoinflipGame,
    featured: false,
    image: '/assets/dice2.png'
  },
  {
    id: 'dice',
    name: 'Dice',
    description: 'Classic high/low dice game with custom odds.',
    icon: Dice5,
    color: 'text-orange-400',
    bg: 'bg-orange-400/10',
    component: DiceGame,
    featured: false,
    image: '/assets/dice2.png'
  },
  {
    id: 'limbo',
    name: 'Limbo',
    description: 'Set a target multiplier and hope the roll lands higher.',
    icon: Flame,
    color: 'text-orange-300',
    bg: 'bg-orange-300/10',
    component: LimboGame,
    featured: true,
    image: '/assets/hero.png'
  },
  {
    id: 'keno',
    name: 'Keno',
    description: 'Pick your numbers and catch the draw.',
    icon: Dices,
    color: 'text-emerald-300',
    bg: 'bg-emerald-300/10',
    component: KenoGame,
    featured: true,
    image: '/assets/mines_hero.png'
  },
  {
    id: 'hilo',
    name: 'HiLo',
    description: 'Call higher or lower and build the streak.',
    icon: ArrowUpRight,
    color: 'text-red-400',
    bg: 'bg-red-400/10',
    component: HiloGame,
    featured: false,
    image: '/assets/hilo_hero.png'
  },
  {
    id: 'baccarat',
    name: 'Baccarat',
    description: 'Bet on player, banker, or tie in a fast table game.',
    icon: Disc,
    color: 'text-cyan-300',
    bg: 'bg-cyan-300/10',
    component: BaccaratGame,
    featured: false,
    image: '/assets/blackjack_hero.png'
  },
  {
    id: 'plinko',
    name: 'Plinko',
    description: 'Drop balls through pegs and chase the high multiplier buckets.',
    icon: Plus,
    color: 'text-sky-300',
    bg: 'bg-sky-300/10',
    component: PlinkoGame,
    featured: true,
    image: '/assets/hero.png'
  },
  {
    id: 'roulette',
    name: 'Roulette',
    description: 'Cover the board and spin a full European wheel.',
    icon: Disc,
    color: 'text-rose-300',
    bg: 'bg-rose-300/10',
    component: RouletteGame,
    featured: true,
    image: '/assets/hero.png'
  },
  {
    id: 'wheel',
    name: 'Wheel',
    description: 'Simple wheel game with high multipliers.',
    icon: RotateCcw,
    color: 'text-purple-400',
    bg: 'bg-purple-400/10',
    component: WheelGame,
    featured: false,
    image: '/assets/hero.png'
  },
];

const getPreferredAvatar = (user?: {
  avatarSource?: 'custom' | 'roblox' | 'discord';
  customAvatarUrl?: string;
  discordAvatarUrl?: string;
  robloxAvatarUrl?: string;
  avatar?: string;
} | null) => {
  if (!user) {
    return '';
  }
  if (user.avatarSource === 'discord' && user.discordAvatarUrl) {
    return user.discordAvatarUrl;
  }
  if (user.avatarSource === 'roblox' && user.robloxAvatarUrl) {
    return user.robloxAvatarUrl;
  }
  return user.customAvatarUrl || user.avatar || user.discordAvatarUrl || user.robloxAvatarUrl || '';
};

type MainView = 'welcome' | 'dashboard' | 'profile' | 'connections' | 'settings' | 'admin' | 'vip' | 'affiliate' | 'leaderboard' | 'tournaments' | 'friends' | 'provably-fair' | 'support' | 'terms' | 'privacy' | 'responsible-gaming';

const VIEW_PATHS: Partial<Record<MainView, string>> = {
  dashboard: '/',
  profile: '/profile',
  connections: '/connections',
  settings: '/settings',
  admin: '/admin',
  vip: '/vip-club',
  affiliate: '/affiliate',
  leaderboard: '/leaderboard',
  'provably-fair': '/provably-fair',
  support: '/live-support',
  terms: '/terms-of-service',
  privacy: '/privacy-policy',
  'responsible-gaming': '/responsible-gaming',
};

function formatMoney(value: number) {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(Number(value || 0));
}

const COINS_PER_DOLLAR = 1;
const DISPLAY_CURRENCY_RATES: Record<string, number> = {
  USD: 1,
  EUR: 0.87,
  GBP: 0.79,
  JPY: 149,
  CAD: 1.35,
};

function formatDollars(value: number) {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(Number(value || 0) / 100);
}

function coinsToUsd(value: number) {
  return Number(value || 0) / COINS_PER_DOLLAR;
}

function formatMoneyFromCoins(value: number) {
  return formatDollars(Number(value || 0));
}

function formatNumberCompact(value: number) {
  const num = Number(value || 0);
  if (num >= 1000) {
    return (num / 1000).toFixed(1).replace(/\.0$/, '') + 'k';
  }
  return num.toLocaleString();
}

type NotificationItem = {
  id: number;
  type: string;
  title: string;
  message: string;
  isRead: boolean;
  createdAt: string;
  metadata?: Record<string, any>;
};

type TrendPoint = {
  day: string;
  users: number;
  wagered: number;
  revenue: number;
};

const chartToneClasses: Record<string, string> = {
  emerald: 'bg-emerald-400/85',
  blue: 'bg-sky-400/85',
  amber: 'bg-amber-400/85',
};

function MiniTrendChart({
  title,
  data,
  dataKey,
  tone,
  formatter = (value: number) => value.toLocaleString(),
}: {
  title: string;
  data: TrendPoint[];
  dataKey: keyof TrendPoint;
  tone: 'emerald' | 'blue' | 'amber';
  formatter?: (value: number) => string;
}) {
  const numericValues = data.map((item) => Number(item[dataKey] || 0));
  const maxValue = Math.max(...numericValues, 1);

  return (
    <div className="rounded-[28px] border border-white/10 bg-[#141821] p-5">
      <div className="flex items-center justify-between gap-4">
        <div className="text-sm font-black uppercase tracking-tight">{title}</div>
        <div className="text-xs text-white/35">7 days</div>
      </div>
      <div className="mt-5 flex items-end gap-2 h-32">
        {data.map((item) => {
          const value = Number(item[dataKey] || 0);
          const height = `${Math.max(10, Math.round((value / maxValue) * 100))}%`;
          return (
            <div key={`${title}-${item.day}`} className="flex-1 flex flex-col items-center gap-2">
              <div className="text-[10px] text-white/45">{formatter(value)}</div>
              <div className="w-full h-full rounded-2xl bg-white/[0.03] flex items-end overflow-hidden">
                <div className={cn('w-full rounded-2xl transition-all', chartToneClasses[tone])} style={{ height }} />
              </div>
              <div className="text-[10px] text-white/30">{item.day}</div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function formatDisplayCurrency(value: number, currency: string) {
  const safeCurrency = DISPLAY_CURRENCY_RATES[currency] ? currency : 'USD';
  const dollars = Number(value || 0) / 100;
  const converted = dollars * DISPLAY_CURRENCY_RATES[safeCurrency];
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: safeCurrency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(converted);
}

function usdToCoins(value: number) {
  return Math.round(Number(value || 0) * COINS_PER_DOLLAR);
}

type BalanceChange = {
  id: number;
  amount: number;
  isPositive: boolean;
};

const AnimatedBalanceDisplay = ({ balance, className = '', style = {} as React.CSSProperties }: { balance: number; className?: string; style?: React.CSSProperties }) => {
  const [changes, setChanges] = useState<BalanceChange[]>([]);
  const prevBalanceRef = useRef(balance);
  const idCounterRef = useRef(0);

  useEffect(() => {
    const diff = balance - prevBalanceRef.current;
    if (diff !== 0) {
      const newChange: BalanceChange = {
        id: idCounterRef.current++,
        amount: Math.abs(diff),
        isPositive: diff > 0,
      };
      setChanges(prev => [...prev, newChange]);
      setTimeout(() => {
        setChanges(prev => prev.filter(c => c.id !== newChange.id));
      }, 1800);
    }
    prevBalanceRef.current = balance;
  }, [balance]);

  return (
    <div className={`relative inline-flex items-center gap-1 ${className}`} style={style}>
      <CurrencyIcon className="rounded-full object-cover" size={16} />
      <span className="font-mono font-bold text-[#00FF88]">
        {formatMoneyFromCoins(balance)}
      </span>
      <AnimatePresence>
        {changes.map(change => (
          <motion.span
            key={change.id}
            initial={{ opacity: 1, y: 0, scale: 1 }}
            animate={{ opacity: 0, y: -40, scale: 0.8 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 1.2, ease: 'easeOut' }}
            className={`absolute left-1/2 -translate-x-1/2 -top-6 font-mono font-black text-sm whitespace-nowrap ${
              change.isPositive ? 'text-[#00FF88]' : 'text-red-400'
            }`}
          >
            {change.isPositive ? '+' : '-'}{formatMoneyFromCoins(change.amount)}
          </motion.span>
        ))}
      </AnimatePresence>
    </div>
  );
};

function resolveRoute(pathname: string): { gameId: string | null; view: MainView } {
  const normalized = pathname.replace(/\/+$/, '') || '/';
  const game = GAMES.find((entry) => `/${entry.id}` === normalized);
  if (game) {
    return { gameId: game.id, view: 'dashboard' };
  }

  const matchedView = (Object.entries(VIEW_PATHS) as Array<[MainView, string]>).find(([, path]) => path === normalized)?.[0];
  return { gameId: null, view: matchedView || 'dashboard' };
}

const CLIENT_SEED_STORAGE_KEY = 'pasus_client_seed';
const CLIENT_SEED_AUTO_STORAGE_KEY = 'pasus_client_seed_auto';
const CLIENT_NONCE_STORAGE_KEY = 'pasus_client_nonce';

function generateClientSeed() {
  return `PASUS-${Math.random().toString(36).slice(2, 10).toUpperCase()}`;
}

function consumeRedirectedPath() {
  const current = new URL(window.location.href);
  const redirectedPath = current.searchParams.get('redirect');
  if (!redirectedPath || !redirectedPath.startsWith('/')) {
    return;
  }

  const next = new URL(window.location.origin + redirectedPath);
  current.searchParams.delete('redirect');
  const remainingQuery = current.searchParams.toString();
  const finalPath = `${next.pathname}${next.search || (remainingQuery ? `?${remainingQuery}` : '')}${next.hash}`;
  window.history.replaceState({}, '', finalPath);
}

const SiteAccessGate = ({ children }: { children: React.ReactNode }) => {
  const siteAccessStorageKey = 'pasus_site_access_granted';
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [isChecking, setIsChecking] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [hasAccess, setHasAccess] = useState(() => {
    try {
      return window.localStorage.getItem(siteAccessStorageKey) === 'true';
    } catch {
      return false;
    }
  });
  const [error, setError] = useState('');

  useEffect(() => {
    const checkStatus = async () => {
      try {
        const response = await apiFetch('/api/site-access/status', {
          credentials: 'include',
        });
        const data = await response.json().catch(() => ({}));
        const authenticated = Boolean(data.authenticated);
        setHasAccess(authenticated);
        if (authenticated) {
          window.localStorage.setItem(siteAccessStorageKey, 'true');
        } else {
          window.localStorage.removeItem(siteAccessStorageKey);
        }
      } catch {
        if (!hasAccess) {
          setError('Unable to verify early access right now.');
        }
      } finally {
        setIsChecking(false);
      }
    };

    checkStatus();
  }, [hasAccess, siteAccessStorageKey]);

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (isSubmitting) {
      return;
    }

    setError('');
    setIsSubmitting(true);

    try {
      const response = await apiFetch('/api/site-access/login', {
        method: 'POST',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ username, password }),
      });
      const data = await response.json().catch(() => ({}));

      if (!response.ok) {
        throw new Error(data.error || 'Access denied.');
      }

      window.localStorage.setItem(siteAccessStorageKey, 'true');
      setHasAccess(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Access denied.');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (hasAccess) {
    return <>{children}</>;
  }

  return (
    <div className="min-h-screen bg-[#090b10] text-white overflow-hidden relative">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,_rgba(0,255,136,0.14),_transparent_35%),radial-gradient(circle_at_bottom_right,_rgba(17,112,255,0.18),_transparent_34%),linear-gradient(135deg,_rgba(255,255,255,0.02),_transparent)]" />
      <div className="absolute inset-0 opacity-[0.08]" style={{ backgroundImage: 'linear-gradient(rgba(255,255,255,0.05) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.05) 1px, transparent 1px)', backgroundSize: '32px 32px' }} />

      <div className="relative min-h-screen flex items-center justify-center px-4 py-10">
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          className="w-full max-w-5xl grid lg:grid-cols-[1.2fr_0.9fr] rounded-[36px] overflow-hidden border border-white/10 bg-[#0f131a]/95 shadow-[0_32px_120px_rgba(0,0,0,0.45)] backdrop-blur-xl"
        >
          <div className="p-8 md:p-12 border-b lg:border-b-0 lg:border-r border-white/10 bg-[linear-gradient(160deg,rgba(255,255,255,0.04),rgba(255,255,255,0.01))]">
            <div className="inline-flex items-center gap-2 rounded-full border border-[#00FF88]/20 bg-[#00FF88]/10 px-4 py-2 text-[11px] font-black uppercase tracking-[0.24em] text-[#7cffc2]">
              <Lock size={14} />
              Early Access
            </div>
            <h1 className="mt-6 text-4xl md:text-6xl font-black uppercase tracking-tight leading-none">
              Pasus
              <span className="block text-white/35">Private Entry</span>
            </h1>
            <p className="mt-6 max-w-xl text-sm md:text-base text-white/60 leading-relaxed">
              This build is locked behind a private launch screen. Enter the early access credentials to load the casino, wallet systems, and game dashboard.
            </p>

            <div className="mt-10 grid gap-4 md:grid-cols-3">
              <div className="rounded-3xl border border-white/10 bg-black/25 p-5">
                <div className="text-[10px] uppercase tracking-[0.22em] text-white/25 font-black">Games</div>
                <div className="mt-3 text-3xl font-black text-[#00FF88]">4</div>
                <div className="mt-2 text-xs text-white/45">Blackjack, Mines, Dices, and Crash are currently live.</div>
              </div>
              <div className="rounded-3xl border border-white/10 bg-black/25 p-5">
                <div className="text-[10px] uppercase tracking-[0.22em] text-white/25 font-black">Mode</div>
                <div className="mt-3 text-3xl font-black text-white">Private</div>
                <div className="mt-2 text-xs text-white/45">Only approved early users can enter this build.</div>
              </div>
              <div className="rounded-3xl border border-white/10 bg-black/25 p-5">
                <div className="text-[10px] uppercase tracking-[0.22em] text-white/25 font-black">Stack</div>
                <div className="mt-3 text-3xl font-black text-white">Live</div>
                <div className="mt-2 text-xs text-white/45">Server-verified gate with a custom frontend access screen.</div>
              </div>
            </div>
          </div>

          <div className="p-8 md:p-12 flex items-center">
            <div className="w-full">
              <div className="text-[10px] uppercase tracking-[0.24em] text-white/25 font-black">Access Panel</div>
              <h2 className="mt-4 text-3xl font-black uppercase tracking-tight">Sign In To Enter</h2>
              <p className="mt-3 text-sm text-white/50">
                Nothing inside the app loads until this access gate is cleared.
              </p>

              <form onSubmit={submit} className="mt-8 space-y-4">
                <label className="block">
                  <div className="mb-2 text-[10px] uppercase tracking-[0.2em] text-white/25 font-black">Username</div>
                  <div className="flex items-center gap-3 rounded-2xl border border-white/10 bg-black/30 px-4 py-4">
                    <User size={18} className="text-white/30" />
                    <input
                      type="text"
                      value={username}
                      onChange={(e) => setUsername(e.target.value)}
                      placeholder="Enter username"
                      className="w-full bg-transparent text-sm text-white placeholder:text-white/20 focus:outline-none"
                      autoComplete="username"
                    />
                  </div>
                </label>

                <label className="block">
                  <div className="mb-2 text-[10px] uppercase tracking-[0.2em] text-white/25 font-black">Password</div>
                  <div className="flex items-center gap-3 rounded-2xl border border-white/10 bg-black/30 px-4 py-4">
                    <Lock size={18} className="text-white/30" />
                    <input
                      type="password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="Enter password"
                      className="w-full bg-transparent text-sm text-white placeholder:text-white/20 focus:outline-none"
                      autoComplete="current-password"
                    />
                  </div>
                </label>

                {error ? (
                  <div className="rounded-2xl border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm text-red-300">
                    {error}
                  </div>
                ) : null}

                <button
                  type="submit"
                  disabled={isSubmitting || isChecking}
                  className="w-full rounded-2xl bg-[#00FF88] px-5 py-4 text-sm font-black uppercase tracking-[0.22em] text-black transition-all hover:bg-[#5fffb0] disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                  {isChecking || isSubmitting ? <LoaderCircle size={18} className="animate-spin" /> : <LogIn size={18} />}
                  {isChecking ? 'Checking Access' : isSubmitting ? 'Unlocking' : 'Enter Pasus'}
                </button>
              </form>
            </div>
          </div>
        </motion.div>
      </div>
    </div>
  );
};

const Sidebar = ({
  activeGame,
  currentView,
  onSelectGame,
  onHome,
  onOpenView,
  onOpenPF,
  onToggleChat,
  chatOpen,
  isOpen,
  onClose,
}: {
  activeGame: string | null,
  currentView: MainView,
  onSelectGame: (id: string) => void,
  onHome: () => void,
  onOpenView: (view: MainView) => void,
  onOpenPF: () => void,
  onToggleChat?: () => void,
  chatOpen?: boolean,
  isOpen?: boolean,
  onClose?: () => void,
}) => {
  const { user } = useAuth();
  const [isOriginalsExpanded, setIsOriginalsExpanded] = useState(true);
  const [isTableExpanded, setIsTableExpanded] = useState(true);

  const handleNav = (action: () => void) => {
    action();
    if (onClose) onClose();
  };

  const navItems = [
    { view: 'dashboard' as MainView, icon: Home, label: 'Home', active: !activeGame && currentView === 'dashboard' },
    { view: 'leaderboard' as MainView, icon: Trophy, label: 'Leaderboard', active: currentView === 'leaderboard' },
    { view: 'tournaments' as MainView, icon: Target, label: 'Tournaments', active: currentView === 'tournaments' },
    { view: 'vip' as MainView, icon: Star, label: 'VIP Club', active: currentView === 'vip' },
    { view: 'affiliate' as MainView, icon: Users, label: 'Affiliate', active: currentView === 'affiliate' },
  ];

  const sidebar = (
    <div className="w-[260px] shrink-0 flex flex-col h-full bg-gradient-to-b from-[#0a0f1a] via-[#0d1220] to-[#080c14] backdrop-blur-xl border-r border-white/5 relative overflow-hidden">
      {/* Animated background gradient */}
      <div className="absolute inset-0 opacity-30">
        <div className="absolute top-0 left-0 w-32 h-32 bg-[#00FF88]/10 rounded-full blur-[60px]" />
        <div className="absolute bottom-0 right-0 w-40 h-40 bg-blue-500/10 rounded-full blur-[80px]" />
      </div>
      
      {/* Logo */}
      <div className="relative px-5 pt-6 pb-5 border-b border-white/5">
        <motion.button 
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          onClick={onHome} 
          className="flex items-center gap-3 group w-full"
        >
          <motion.div 
            whileHover={{ rotate: 5, scale: 1.05 }}
            className="w-10 h-10 rounded-2xl overflow-hidden shadow-lg shadow-[#00FF88]/30 ring-2 ring-white/10 group-hover:ring-[#00FF88]/50 transition-all"
          >
            <img src="/assets/icon.png" alt="Pasus" className="w-full h-full object-cover" />
          </motion.div>
          <div className="flex flex-col">
            <span className="text-xl font-black uppercase italic tracking-tight text-white group-hover:text-[#00FF88] transition-colors">Pasus</span>
            <span className="text-[8px] uppercase tracking-[0.3em] text-white/20 font-medium">Casino</span>
          </div>
        </motion.button>
      </div>

      <nav className="relative flex-1 overflow-y-auto custom-scrollbar px-3 py-4 space-y-1">
        {/* Main Navigation */}
        <div className="space-y-1 mb-6">
          {navItems.map((item, i) => (
            <motion.button
              key={item.label}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.3, delay: i * 0.05 }}
              whileHover={{ x: 4 }}
              onClick={() => handleNav(() => onOpenView(item.view))}
              className={cn(
                'w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all relative group overflow-hidden',
                item.active 
                  ? 'bg-gradient-to-r from-[#00FF88]/15 to-transparent text-[#00FF88]' 
                  : 'text-white/50 hover:text-white hover:bg-white/5'
              )}
            >
              {item.active && (
                <motion.div
                  layoutId="activeNav"
                  className="absolute left-0 top-0 bottom-0 w-1 bg-[#00FF88] rounded-r-full"
                />
              )}
              <motion.div 
                whileHover={{ scale: 1.1, rotate: 5 }}
                className={cn(
                  'p-1.5 rounded-lg',
                  item.active ? 'bg-[#00FF88]/20' : 'bg-white/5 group-hover:bg-white/10'
                )}
              >
                <item.icon size={18} className={item.active ? 'text-[#00FF88]' : 'text-white/40 group-hover:text-white'} />
              </motion.div>
              <span className={cn('font-medium', item.active && 'font-semibold')}>{item.label}</span>
              {item.active && (
                <motion.div 
                  layoutId="navGlow"
                  className="absolute right-2 w-1.5 h-1.5 rounded-full bg-[#00FF88] shadow-[0_0_8px_#00FF88]"
                />
              )}
            </motion.button>
          ))}
        </div>

        {/* Quick Actions */}
        <div className="space-y-1 mb-6">
          <motion.button
            whileHover={{ x: 4 }}
            onClick={onOpenPF}
            className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium text-white/50 hover:text-white hover:bg-white/5 transition-all group"
          >
            <div className="p-1.5 rounded-lg bg-white/5 group-hover:bg-white/10">
              <ShieldCheck size={18} className="text-white/40 group-hover:text-white" />
            </div>
            <span>Provably Fair</span>
            <ChevronRight size={14} className="ml-auto text-white/20 group-hover:text-white/40" />
          </motion.button>

          {(user?.role === 'owner' || user?.role === 'moderator') && (
            <motion.button
              whileHover={{ x: 4 }}
              onClick={() => handleNav(() => onOpenView('admin'))}
              className={cn(
                'w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all group',
                currentView === 'admin' 
                  ? 'bg-gradient-to-r from-purple-500/15 to-transparent text-purple-400' 
                  : 'text-white/50 hover:text-white hover:bg-white/5'
              )}
            >
              <div className={cn(
                'p-1.5 rounded-lg',
                currentView === 'admin' ? 'bg-purple-500/20' : 'bg-white/5 group-hover:bg-white/10'
              )}>
                <Shield size={18} className={currentView === 'admin' ? 'text-purple-400' : 'text-white/40 group-hover:text-white'} />
              </div>
              <span className={currentView === 'admin' ? 'font-semibold' : ''}>{user?.role === 'moderator' ? 'Staff Panel' : 'Admin Panel'}</span>
            </motion.button>
          )}
        </div>

        {/* Divider */}
        <div className="flex items-center gap-3 px-4 py-2">
          <div className="h-px flex-1 bg-white/5" />
          <span className="text-[9px] uppercase tracking-widest text-white/15 font-bold">Games</span>
          <div className="h-px flex-1 bg-white/5" />
        </div>

        {/* Originals Section */}
        <div className="pt-2 pb-1">
          <motion.button 
            whileHover={{ backgroundColor: 'rgba(255,255,255,0.03)' }}
            onClick={() => setIsOriginalsExpanded(!isOriginalsExpanded)}
            className="w-full flex items-center justify-between px-4 py-2.5 text-[11px] font-black uppercase tracking-[0.15em] text-white/30 hover:text-white/50 transition-colors"
          >
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 rounded-lg bg-gradient-to-br from-[#00FF88]/20 to-[#00FF88]/5 flex items-center justify-center">
                <LayoutGrid size={12} className="text-[#00FF88]" />
              </div>
              <span>Originals</span>
            </div>
            <motion.div
              animate={{ rotate: isOriginalsExpanded ? 180 : 0 }}
              transition={{ duration: 0.2 }}
            >
              <ChevronDown size={12} />
            </motion.div>
          </motion.button>
          <AnimatePresence>
            {isOriginalsExpanded && (
              <motion.div 
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={{ duration: 0.2 }}
                className="overflow-hidden"
              >
                <div className="space-y-0.5 pl-3 pr-2 mt-1">
                  {GAMES.map((game, i) => {
                    const GameIcon = typeof game.icon === 'string' ? null : game.icon;
                    const disabled = CLIENT_SIDE_UNAVAILABLE_GAMES.has(game.id);
                    return (
                      <motion.button
                        key={game.id}
                        initial={{ opacity: 0, x: -10 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: i * 0.03 }}
                        whileHover={disabled ? undefined : { x: 6, backgroundColor: 'rgba(255,255,255,0.05)' }}
                        onClick={() => !disabled && handleNav(() => onSelectGame(game.id))}
                        disabled={disabled}
                        className={cn(
                          'w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-xs font-medium transition-all group relative disabled:opacity-45 disabled:cursor-not-allowed',
                          activeGame === game.id 
                            ? 'bg-white/10 text-white' 
                            : 'text-white/40 hover:text-white'
                        )}
                      >
                        {activeGame === game.id && (
                          <motion.div 
                            layoutId="activeGame"
                            className="absolute left-0 top-0 bottom-0 w-0.5 bg-[#00FF88] rounded-full"
                          />
                        )}
                        {GameIcon && (
                          <div className={cn('p-1 rounded-md bg-white/5', game.color.split(' ')[0])}>
                            <GameIcon size={12} className={game.color} />
                          </div>
                        )}
                        <span className="truncate">{game.name}</span>
                        {disabled ? (
                          <span className="ml-auto px-1.5 py-0.5 text-[7px] font-black uppercase bg-red-500/20 text-red-300 rounded">
                            OFFLINE
                          </span>
                        ) : game.featured ? (
                          <motion.span 
                            initial={{ scale: 0 }}
                            animate={{ scale: 1 }}
                            className="ml-auto px-1.5 py-0.5 text-[7px] font-black uppercase bg-[#00FF88]/20 text-[#00FF88] rounded"
                          >
                            HOT
                          </motion.span>
                        ) : null}
                      </motion.button>
                    );
                  })}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Table Games Section */}
        <div className="pt-1 pb-1">
          <motion.button 
            whileHover={{ backgroundColor: 'rgba(255,255,255,0.03)' }}
            onClick={() => setIsTableExpanded(!isTableExpanded)}
            className="w-full flex items-center justify-between px-4 py-2.5 text-[11px] font-black uppercase tracking-[0.15em] text-white/30 hover:text-white/50 transition-colors"
          >
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 rounded-lg bg-gradient-to-br from-blue-500/20 to-blue-500/5 flex items-center justify-center">
                <Disc size={12} className="text-blue-400" />
              </div>
              <span>Table Games</span>
            </div>
            <motion.div
              animate={{ rotate: isTableExpanded ? 180 : 0 }}
              transition={{ duration: 0.2 }}
            >
              <ChevronDown size={12} />
            </motion.div>
          </motion.button>
          <AnimatePresence>
            {isTableExpanded && (
              <motion.div 
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={{ duration: 0.2 }}
                className="overflow-hidden"
              >
                <div className="space-y-0.5 pl-3 pr-2 mt-1">
                  {GAMES.filter(g => g.image?.startsWith('http')).map((game, i) => {
                    const GameIcon = typeof game.icon === 'string' ? null : game.icon;
                    return (
                      <motion.button
                        key={game.id}
                        initial={{ opacity: 0, x: -10 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: i * 0.03 }}
                        whileHover={{ x: 6, backgroundColor: 'rgba(255,255,255,0.05)' }}
                        onClick={() => handleNav(() => onSelectGame(game.id))}
                        className={cn(
                          'w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-xs font-medium transition-all',
                          activeGame === game.id 
                            ? 'bg-white/10 text-white' 
                            : 'text-white/40 hover:text-white'
                        )}
                      >
                        {GameIcon && (
                          <div className={cn('p-1 rounded-md bg-white/5', game.color.split(' ')[0])}>
                            <GameIcon size={12} className={game.color} />
                          </div>
                        )}
                        <span className="truncate">{game.name}</span>
                      </motion.button>
                    );
                  })}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Social Section */}
        <div className="pt-4 pb-1">
          <div className="px-4 py-2 text-[10px] font-black uppercase tracking-[0.15em] text-white/20 flex items-center gap-2">
            <UsersRound size={10} />
            <span>Social</span>
          </div>
          <div className="space-y-0.5 pl-3 pr-2 mt-1">
            <motion.button
              whileHover={{ x: 6, backgroundColor: 'rgba(255,255,255,0.05)' }}
              onClick={() => handleNav(() => onOpenView('friends'))}
              className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-xs font-medium text-white/40 hover:text-white transition-all"
            >
              <div className="p-1.5 rounded-lg bg-white/5">
                <UserPlus size={12} className="text-white/40" />
              </div>
              <span>Friends</span>
              <motion.span 
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                className="ml-auto px-2 py-0.5 text-[8px] font-black uppercase bg-amber-500/20 text-amber-400 rounded"
              >
                SOON
              </motion.span>
            </motion.button>
          </div>
        </div>
      </nav>

      {/* Footer */}
      <div className="relative p-4 border-t border-white/5">
        <div className="flex items-center justify-center gap-2 text-[9px] text-white/20 uppercase tracking-widest">
          <span>© 2025 Pasus</span>
          <span className="w-1 h-1 rounded-full bg-white/10" />
          <span>v1.0</span>
        </div>
      </div>
    </div>
  );

  return (
    <>
      <div className="hidden lg:block shrink-0">
        {sidebar}
      </div>
      {isOpen && (
        <div className="lg:hidden fixed inset-0 z-50 flex">
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="flex-1 bg-black/60 backdrop-blur-sm" onClick={onClose} />
          <motion.div initial={{ x: '100%' }} animate={{ x: 0 }} exit={{ x: '100%' }} transition={{ type: 'spring', damping: 25, stiffness: 300 }} className="h-full">
            <div className="flex items-center justify-between p-4 border-b border-white/5">
              <span className="text-sm font-black uppercase tracking-widest text-white/60">Menu</span>
              <button onClick={onClose} className="p-2 rounded-xl hover:bg-white/5 text-white/40">
                <X size={18} />
              </button>
            </div>
            <div className="h-[calc(100%-57px)] overflow-y-auto">
              {sidebar}
            </div>
          </motion.div>
        </div>
      )}
    </>
  );
};

const SUPPORTED_CRYPTO = [
  { id: 'btc', name: 'Bitcoin', symbol: 'BTC', color: 'text-[#F7931A]', bg: 'bg-[#F7931A]/10', nowCurrency: 'btc' },
  { id: 'eth', name: 'Ethereum', symbol: 'ETH', color: 'text-[#627EEA]', bg: 'bg-[#627EEA]/10', nowCurrency: 'eth' },
  { id: 'ltc', name: 'Litecoin', symbol: 'LTC', color: 'text-[#345D9D]', bg: 'bg-[#345D9D]/10', nowCurrency: 'ltc' },
  { id: 'doge', name: 'Dogecoin', symbol: 'DOGE', color: 'text-[#C2A633]', bg: 'bg-[#C2A633]/10', nowCurrency: 'doge' },
  { id: 'sol', name: 'Solana', symbol: 'SOL', color: 'text-[#14F195]', bg: 'bg-[#14F195]/10', nowCurrency: 'sol' },
];

type DepositTransaction = {
  id: number;
  paymentId: string | null;
  orderId: string;
  paymentStatus: string;
  payAddress: string | null;
  payAmount: string | null;
  payCurrency: string | null;
  priceAmount: number;
  priceCurrency: string;
  outcomeAmount: number;
  outcomeCurrency: string | null;
  invoiceUrl: string | null;
};

type WalletLedgerItem = {
  id: string;
  kind: 'deposit' | 'withdrawal' | 'promo' | 'affiliate' | 'tip_in' | 'tip_out';
  amount: number;
  status: string;
  subtitle: string;
  createdAt: string;
  feeAmount?: number;
  netAmount?: number;
};

type WalletBonusCampaign = {
  id: number;
  name: string;
  bonusPercent: number;
  maxBonusAmount: number;
  minDepositAmount: number;
  wageringMultiplier: number;
  onlyFirstDeposit: boolean;
};

type WalletBonusStatus = {
  id: number;
  name: string;
  depositAmount: number;
  bonusAmount: number;
  wageringRequired: number;
  wageringRemaining: number;
  status: string;
  createdAt: string;
};

type WalletSnapshot = {
  balance: number;
  totalDeposited: number;
  totalWithdrawn: number;
  bonusBalance?: number;
  vaultBalance?: number;
  tipBalance?: number;
  lockedBalance?: number;
};

const WalletModal = ({ isOpen, onClose }: { isOpen: boolean, onClose: () => void }) => {
  const { user } = useAuth();
  const { balance, totalDeposited, refreshWallet } = useBalance();
  const [amount, setAmount] = useState('25');
  const [activeTab, setActiveTab] = useState<'deposit' | 'withdraw' | 'redeem' | 'ledger'>('deposit');
  const [selectedCrypto, setSelectedCrypto] = useState(SUPPORTED_CRYPTO[0]);
  const [withdrawAddress, setWithdrawAddress] = useState('');
  const [copied, setCopied] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [depositTransaction, setDepositTransaction] = useState<DepositTransaction | null>(null);
  const [promoCode, setPromoCode] = useState('');
  const [ledger, setLedger] = useState<WalletLedgerItem[]>([]);
  const [bonusCampaigns, setBonusCampaigns] = useState<WalletBonusCampaign[]>([]);
  const [bonusStatuses, setBonusStatuses] = useState<WalletBonusStatus[]>([]);
  const [walletSnapshot, setWalletSnapshot] = useState<WalletSnapshot | null>(null);
  const [walletTransferAmount, setWalletTransferAmount] = useState('25');
  const [isTransferring, setIsTransferring] = useState(false);

  useEffect(() => {
    if (!depositTransaction || ['finished', 'confirmed', 'sending', 'failed', 'expired'].includes(depositTransaction.paymentStatus)) {
      return;
    }

    const token = localStorage.getItem('pasus_auth_token');
    if (!token) {
      return;
    }

    const poller = window.setInterval(async () => {
      try {
        const response = await apiFetch(`/api/payments/transactions/${depositTransaction.id}`, {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });
        const data = await response.json().catch(() => ({}));

        if (!response.ok) {
          return;
        }

        setDepositTransaction(data.transaction as DepositTransaction);
        if (['finished', 'confirmed', 'sending'].includes(data.transaction.paymentStatus)) {
          await refreshWallet();
          setSuccess('Deposit confirmed and wallet credited.');
          window.clearInterval(poller);
        }
      } catch {
        return;
      }
    }, 10000);

    return () => window.clearInterval(poller);
  }, [depositTransaction, refreshWallet]);

  useEffect(() => {
    if (!isOpen) return;
    const token = localStorage.getItem('pasus_auth_token');
    if (!token) return;
    Promise.all([
      apiFetch('/api/wallet/me', {
        headers: { Authorization: `Bearer ${token}` },
      }).then((r) => r.json()).catch(() => ({})),
      apiFetch('/api/wallet/ledger', {
        headers: { Authorization: `Bearer ${token}` },
      }).then((r) => r.json()).catch(() => ({})),
      apiFetch('/api/wallet/bonuses', {
        headers: { Authorization: `Bearer ${token}` },
      }).then((r) => r.json()).catch(() => ({})),
    ]).then(([walletData, ledgerData, bonusData]) => {
      setWalletSnapshot(walletData.wallet || null);
      setLedger(Array.isArray(ledgerData.ledger) ? ledgerData.ledger : []);
      setBonusCampaigns(Array.isArray(bonusData.campaigns) ? bonusData.campaigns : []);
      setBonusStatuses(Array.isArray(bonusData.bonuses) ? bonusData.bonuses : []);
    }).catch(() => undefined);
  }, [isOpen, depositTransaction]);

  if (!isOpen) return null;

  const handleCopy = () => {
    const value = depositTransaction?.payAddress || withdrawAddress;
    if (!value) {
      return;
    }
    navigator.clipboard.writeText(value);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleAction = async () => {
    const token = localStorage.getItem('pasus_auth_token');
    const val = parseFloat(amount);
    setError('');
    setSuccess('');

    if (!token) {
      setError('You need to be signed in.');
      return;
    }

    if (Number.isNaN(val) || val <= 0) {
      setError('Enter a valid amount.');
      return;
    }

    if (activeTab === 'deposit' && val < 1) {
      setError('Minimum deposit is $1.00.');
      return;
    }

    if (activeTab === 'withdraw') {
      if (!withdrawAddress.trim()) {
        setError('Please enter a withdrawal address.');
        return;
      }

      if (totalDeposited < usdToCoins(10)) {
        setError('You must deposit at least $10.00 before withdrawing.');
        return;
      }

      if (val < 10) {
        setError('Minimum withdrawal is $10.00.');
        return;
      }
    }

    setIsProcessing(true);

    try {
      if (activeTab === 'deposit') {
        const response = await apiFetch('/api/payments/nowpayments/create', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            priceAmount: val,
            priceCurrency: 'usd',
            payCurrency: selectedCrypto.nowCurrency,
          }),
        });

        const data = await response.json().catch(() => ({}));
        if (!response.ok) {
          throw new Error(data.error || 'Failed to create deposit.');
        }

        setDepositTransaction(data.transaction as DepositTransaction);
        setSuccess('Deposit invoice created. Send the exact amount to the address below.');
      } else {
        const response = await apiFetch('/api/payments/withdrawals/request', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            amount: usdToCoins(val),
            currency: selectedCrypto.nowCurrency,
            address: withdrawAddress.trim(),
          }),
        });

        const data = await response.json().catch(() => ({}));
        if (!response.ok) {
          throw new Error(data.error || 'Failed to submit withdrawal request.');
        }

        await refreshWallet();
        setSuccess('Withdrawal request submitted. It is now pending manual processing.');
        setWithdrawAddress('');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Request failed.');
    } finally {
      setIsProcessing(false);
    }
  };

  const depositQrValue = depositTransaction?.payAddress
    ? `${selectedCrypto.symbol}:${depositTransaction.payAddress}${depositTransaction.payAmount ? `?amount=${depositTransaction.payAmount}` : ''}`
    : '';

  const runWalletTransfer = async (direction: 'main_to_vault' | 'vault_to_main' | 'main_to_tip' | 'tip_to_main') => {
    const token = localStorage.getItem('pasus_auth_token');
    const val = parseFloat(walletTransferAmount);
    if (!token || Number.isNaN(val) || val <= 0) {
      setError('Enter a valid transfer amount.');
      return;
    }
    setIsTransferring(true);
    setError('');
    setSuccess('');
    try {
      const response = await apiFetch('/api/wallet/transfer', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ direction, amount: usdToCoins(val) }),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data.error || 'Transfer failed.');
      setWalletSnapshot(data.wallet || null);
      await refreshWallet();
      setSuccess('Wallet balances updated.');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Transfer failed.');
    } finally {
      setIsTransferring(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-0 sm:p-4">
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
        className="absolute inset-0 bg-black/80 backdrop-blur-sm"
      />
      <motion.div
        initial={{ scale: 0.9, opacity: 0, y: 20 }}
        animate={{ scale: 1, opacity: 1, y: 0 }}
        className="relative w-full sm:max-w-md bg-[#1a1d23] border border-white/10 rounded-none sm:rounded-3xl overflow-hidden shadow-2xl sm:max-h-[90vh] h-full sm:h-auto"
      >
        <div className="p-6 border-b border-white/5 flex items-center justify-between">
          <h2 className="text-xl font-black italic uppercase tracking-tighter flex items-center gap-3">
            <Wallet className="text-[#00FF88]" size={20} />
            Wallet
          </h2>
          <button onClick={onClose} className="p-2 hover:bg-white/5 rounded-full transition-colors">
            <X size={20} className="text-white/40" />
          </button>
        </div>

        <div className="p-6 space-y-6 max-h-[80vh] overflow-y-auto custom-scrollbar">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <div className="rounded-2xl border border-white/5 bg-black/30 p-4"><div className="text-[10px] uppercase tracking-[0.16em] text-white/25 font-black">Main</div><div className="mt-2 text-lg font-black">{formatMoneyFromCoins(walletSnapshot?.balance ?? balance)}</div></div>
            <div className="rounded-2xl border border-white/5 bg-black/30 p-4"><div className="text-[10px] uppercase tracking-[0.16em] text-white/25 font-black">Vault</div><div className="mt-2 text-lg font-black">{formatMoneyFromCoins(walletSnapshot?.vaultBalance || 0)}</div></div>
            <div className="rounded-2xl border border-white/5 bg-black/30 p-4"><div className="text-[10px] uppercase tracking-[0.16em] text-white/25 font-black">Tip Wallet</div><div className="mt-2 text-lg font-black">{formatMoneyFromCoins(walletSnapshot?.tipBalance || 0)}</div></div>
            <div className="rounded-2xl border border-amber-400/10 bg-amber-400/5 p-4"><div className="text-[10px] uppercase tracking-[0.16em] text-amber-200/60 font-black">Locked</div><div className="mt-2 text-lg font-black text-amber-200">{formatMoneyFromCoins(walletSnapshot?.lockedBalance || 0)}</div></div>
          </div>

          <div className="rounded-2xl border border-white/5 bg-black/30 p-4 space-y-4">
            <div>
              <div className="text-sm font-black uppercase tracking-wide">Wallet Buckets</div>
              <div className="text-[11px] text-white/35 mt-1">Move funds into a vault for storage or into a dedicated tip wallet for friend/chat tipping.</div>
            </div>
            <input
              type="number"
              value={walletTransferAmount}
              onChange={(e) => setWalletTransferAmount(e.target.value)}
              min="0.01"
              step="0.01"
              className="w-full rounded-2xl border border-white/10 bg-black/40 px-4 py-3 text-sm focus:outline-none"
              placeholder="25.00"
            />
            <div className="grid grid-cols-2 gap-2">
              <button onClick={() => runWalletTransfer('main_to_vault')} disabled={isTransferring} className="rounded-2xl bg-white/5 px-4 py-3 text-[10px] font-black uppercase tracking-[0.16em] text-white/70 disabled:opacity-40">Main to Vault</button>
              <button onClick={() => runWalletTransfer('vault_to_main')} disabled={isTransferring} className="rounded-2xl bg-white/5 px-4 py-3 text-[10px] font-black uppercase tracking-[0.16em] text-white/70 disabled:opacity-40">Vault to Main</button>
              <button onClick={() => runWalletTransfer('main_to_tip')} disabled={isTransferring} className="rounded-2xl bg-white/5 px-4 py-3 text-[10px] font-black uppercase tracking-[0.16em] text-white/70 disabled:opacity-40">Main to Tip</button>
              <button onClick={() => runWalletTransfer('tip_to_main')} disabled={isTransferring} className="rounded-2xl bg-white/5 px-4 py-3 text-[10px] font-black uppercase tracking-[0.16em] text-white/70 disabled:opacity-40">Tip to Main</button>
            </div>
          </div>

          <div className="flex p-1 bg-black/40 rounded-2xl">
            <button
              onClick={() => {
                setActiveTab('deposit');
                setError('');
                setSuccess('');
              }}
              className={cn(
                'flex-1 py-3 rounded-xl text-xs font-black uppercase tracking-widest transition-all flex items-center justify-center gap-2',
                activeTab === 'deposit' ? 'bg-[#00FF88] text-black' : 'text-white/40 hover:text-white'
              )}
            >
              <ArrowDownLeft size={14} /> Deposit
            </button>
            <button
              onClick={() => {
                setActiveTab('withdraw');
                setError('');
                setSuccess('');
              }}
              className={cn(
                'flex-1 py-3 rounded-xl text-xs font-black uppercase tracking-widest transition-all flex items-center justify-center gap-2',
                activeTab === 'withdraw' ? 'bg-red-500 text-white' : 'text-white/40 hover:text-white'
              )}
            >
              <ArrowUpRight size={14} /> Withdraw
            </button>
            <button
              onClick={() => {
                setActiveTab('redeem');
                setError('');
                setSuccess('');
              }}
              className={cn(
                'flex-1 py-3 rounded-xl text-xs font-black uppercase tracking-widest transition-all flex items-center justify-center gap-2',
                activeTab === 'redeem' ? 'bg-purple-500 text-white' : 'text-white/40 hover:text-white'
              )}
            >
              <Gift size={14} /> Redeem
            </button>
            <button
              onClick={() => {
                setActiveTab('ledger');
                setError('');
                setSuccess('');
              }}
              className={cn(
                'flex-1 py-3 rounded-xl text-xs font-black uppercase tracking-widest transition-all flex items-center justify-center gap-2',
                activeTab === 'ledger' ? 'bg-white text-black' : 'text-white/40 hover:text-white'
              )}
            >
              <History size={14} /> Ledger
            </button>
          </div>

          {(error || success) && (
            <div className={cn(
              'rounded-2xl px-4 py-3 text-xs font-bold border',
              error ? 'border-red-500/20 bg-red-500/10 text-red-300' : 'border-[#00FF88]/20 bg-[#00FF88]/10 text-[#9dffca]'
            )}>
              {error || success}
            </div>
          )}

          {activeTab === 'redeem' && (
            <div className="bg-black/40 border border-purple-500/20 rounded-2xl p-6 space-y-4">
              <div className="flex items-center gap-3 mb-2">
                <Gift size={20} className="text-purple-400" />
                <span className="text-sm font-black uppercase tracking-wide">Redeem Promo Code</span>
              </div>
              <div className="space-y-2">
                <input
                  type="text"
                  value={promoCode}
                  onChange={(e) => setPromoCode(e.target.value.toUpperCase())}
                  placeholder="Enter promo code"
                  className="w-full bg-black/40 border border-white/10 rounded-2xl px-4 py-3 text-sm font-bold tracking-widest focus:outline-none focus:border-purple-500/50 transition-all text-center"
                  maxLength={32}
                />
              </div>
              <button
                onClick={async () => {
                  if (!promoCode.trim()) {
                    setError('Please enter a promo code.');
                    return;
                  }
                  const token = localStorage.getItem('pasus_auth_token');
                  if (!token) {
                    setError('You must be signed in to redeem codes.');
                    return;
                  }
                  setIsProcessing(true);
                  setError('');
                  setSuccess('');
                  try {
                    const response = await apiFetch('/api/promo/claim', {
                      method: 'POST',
                      headers: {
                        'Content-Type': 'application/json',
                        Authorization: `Bearer ${token}`,
                      },
                      body: JSON.stringify({ code: promoCode.trim() }),
                    });
                    const data = await response.json().catch(() => ({}));
                    if (!response.ok) {
                      throw new Error(data.error || 'Failed to redeem code.');
                    }
                    setSuccess(data.message || 'Promo code redeemed successfully!');
                    setPromoCode('');
                    await refreshWallet();
                  } catch (err) {
                    setError(err instanceof Error ? err.message : 'Failed to redeem code.');
                  } finally {
                    setIsProcessing(false);
                  }
                }}
                disabled={isProcessing || !promoCode.trim()}
                className="w-full py-4 rounded-2xl text-sm font-black uppercase tracking-widest bg-purple-500 text-white hover:bg-purple-600 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {isProcessing ? <LoaderCircle size={16} className="animate-spin" /> : <Gift size={16} />}
                {isProcessing ? 'Redeeming...' : 'Redeem Code'}
              </button>
              <p className="text-[11px] text-white/40 text-center">Enter a promo code to receive bonus funds.</p>
            </div>
          )}

          {activeTab === 'ledger' && (
            <div className="bg-black/40 border border-white/5 rounded-2xl p-4 space-y-3">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <div className="text-sm font-black uppercase tracking-wide">Transaction Ledger</div>
                  <div className="text-[11px] text-white/35 mt-1">Deposits, withdrawals, promos, affiliate claims, and tips in one stream.</div>
                </div>
              </div>
              <div className="space-y-2 max-h-[420px] overflow-y-auto custom-scrollbar pr-1">
                {ledger.length ? ledger.map((item) => (
                  <div key={item.id} className="rounded-2xl border border-white/5 bg-white/[0.03] px-4 py-3">
                    <div className="flex items-center justify-between gap-4">
                      <div>
                        <div className="text-xs font-black uppercase tracking-[0.16em] text-white/70">{item.kind.replace('_', ' ')}</div>
                        <div className="mt-1 text-sm text-white/45">{item.subtitle}</div>
                      </div>
                      <div className="text-right">
                        <div className={cn('text-sm font-black', item.amount >= 0 ? 'text-[#00FF88]' : 'text-red-300')}>
                          {item.amount >= 0 ? '+' : '-'}{formatMoneyFromCoins(Math.abs(item.amount))}
                        </div>
                        <div className="mt-1 text-[10px] uppercase tracking-[0.16em] text-white/25">{item.status}</div>
                      </div>
                    </div>
                    <div className="mt-2 flex items-center justify-between gap-3 text-[10px] text-white/25">
                      <span>{new Date(item.createdAt).toLocaleString()}</span>
                      {item.kind === 'withdrawal' && item.netAmount !== undefined ? <span>Net {formatMoneyFromCoins(item.netAmount || 0)}</span> : null}
                    </div>
                  </div>
                )) : (
                  <div className="rounded-2xl border border-white/5 bg-white/[0.03] px-4 py-8 text-center text-sm text-white/35">No ledger entries yet.</div>
                )}
              </div>
            </div>
          )}

          {activeTab !== 'redeem' && activeTab !== 'ledger' && (
            <div className="space-y-4">
              {activeTab === 'deposit' && bonusCampaigns.length ? (
                <div className="rounded-2xl border border-amber-400/15 bg-amber-400/5 p-4 space-y-3">
                  <div className="text-[10px] font-black uppercase tracking-[0.18em] text-amber-300/80">Deposit Bonus</div>
                  {bonusCampaigns.slice(0, 1).map((campaign) => (
                    <div key={campaign.id} className="space-y-1">
                      <div className="text-sm font-black text-white">{campaign.name}</div>
                      <div className="text-xs text-white/55">Get {campaign.bonusPercent}% extra up to {formatMoneyFromCoins(campaign.maxBonusAmount)} on deposits of {formatMoneyFromCoins(campaign.minDepositAmount)}+.</div>
                      <div className="text-[11px] text-amber-200/75">Wagering requirement: {campaign.wageringMultiplier}x bonus amount{campaign.onlyFirstDeposit ? ' • first deposit only' : ''}</div>
                    </div>
                  ))}
                </div>
              ) : null}

              {bonusStatuses.filter((bonus) => bonus.status === 'active').length ? (
                <div className="rounded-2xl border border-[#00FF88]/15 bg-[#00FF88]/5 p-4 space-y-3">
                  <div className="text-[10px] font-black uppercase tracking-[0.18em] text-[#00FF88]/80">Active Bonus Progress</div>
                  {bonusStatuses.filter((bonus) => bonus.status === 'active').map((bonus) => {
                    const progress = bonus.wageringRequired > 0 ? Math.max(0, Math.min(100, ((bonus.wageringRequired - bonus.wageringRemaining) / bonus.wageringRequired) * 100)) : 100;
                    return (
                      <div key={bonus.id} className="rounded-2xl border border-white/5 bg-black/20 p-3">
                        <div className="flex items-center justify-between gap-3">
                          <div>
                            <div className="text-sm font-black text-white">{bonus.name}</div>
                            <div className="text-[11px] text-white/45">Bonus {formatMoneyFromCoins(bonus.bonusAmount)} from deposit {formatMoneyFromCoins(bonus.depositAmount)}</div>
                          </div>
                          <div className="text-right text-[11px] text-white/55">
                            <div>{formatMoneyFromCoins(bonus.wageringRemaining)} left</div>
                          </div>
                        </div>
                        <div className="mt-3 h-2 rounded-full bg-white/5 overflow-hidden">
                          <div className="h-full rounded-full bg-[#00FF88]" style={{ width: `${progress}%` }} />
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : null}

              <label className="text-[10px] font-black uppercase tracking-[0.2em] text-white/20 ml-2">Select Currency</label>
              <div className="grid grid-cols-5 gap-2">
                {SUPPORTED_CRYPTO.map((crypto) => (
                  <button
                    key={crypto.id}
                    onClick={() => setSelectedCrypto(crypto)}
                    className={cn(
                      'flex flex-col items-center gap-2 p-3 rounded-2xl border transition-all',
                      selectedCrypto.id === crypto.id ? 'bg-white/10 border-[#00FF88]/50' : 'bg-black/20 border-white/5 hover:border-white/10'
                    )}
                  >
                    <div className={cn('w-8 h-8 rounded-full flex items-center justify-center', crypto.bg)}>
                      {crypto.id === 'btc' ? <Bitcoin size={16} className={crypto.color} /> : <Coins size={16} className={crypto.color} />}
                    </div>
                    <span className="text-[10px] font-bold">{crypto.symbol}</span>
                  </button>
                ))}
              </div>

              {activeTab === 'deposit' ? (
              <div className="bg-black/40 border border-white/5 rounded-2xl p-6 space-y-4">
                {depositTransaction?.payAddress ? (
                  <>
                    <div className="flex items-center justify-center">
                      <div className="w-32 h-32 bg-white p-2 rounded-xl">
                        <img
                          src={`https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=${encodeURIComponent(depositQrValue)}`}
                          alt="QR Code"
                          className="w-full h-full"
                        />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <div className="text-[10px] font-black uppercase tracking-widest text-white/20 text-center">Send {depositTransaction.payAmount} {depositTransaction.payCurrency?.toUpperCase()}</div>
                      <div className="flex items-center gap-2 bg-black/60 rounded-xl p-3 border border-white/5">
                        <code className="text-[10px] font-mono text-white/60 break-all flex-1">{depositTransaction.payAddress}</code>
                        <button onClick={handleCopy} className="p-2 hover:bg-white/5 rounded-lg transition-colors text-[#00FF88]">
                          {copied ? <Check size={14} /> : <Copy size={14} />}
                        </button>
                      </div>
                      <div className="text-[10px] text-white/30 text-center">
                        Status: <span className="text-white/60">{depositTransaction.paymentStatus}</span>
                      </div>
                    </div>
                    {depositTransaction.invoiceUrl && (
                      <a
                        href={depositTransaction.invoiceUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="block w-full text-center py-3 rounded-xl bg-white/5 hover:bg-white/10 transition-colors text-xs font-black uppercase tracking-widest"
                      >
                        Open Hosted Invoice
                      </a>
                    )}
                  </>
                ) : (
                  <div className="text-sm text-white/50 leading-relaxed">
                    Create a NOWPayments invoice in {selectedCrypto.symbol}. After blockchain confirmation, Pasus will credit your wallet automatically.
                  </div>
                )}
              </div>
            ) : (
              <div className="space-y-4">
                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase tracking-[0.2em] text-white/20 ml-2">Withdrawal Address</label>
                  <input
                    type="text"
                    value={withdrawAddress}
                    onChange={(e) => setWithdrawAddress(e.target.value)}
                    className="w-full bg-black/40 border border-white/5 rounded-2xl px-4 py-3 text-xs font-bold focus:outline-none focus:border-red-500/50 transition-all"
                    placeholder={`Enter your ${selectedCrypto.name} address`}
                  />
                </div>
                <div className="p-4 bg-red-500/5 border border-red-500/10 rounded-2xl">
                  <div className="text-[10px] text-red-400 font-bold flex items-center gap-2">
                    <Shield size={12} />
                    Manual Review
                  </div>
                  <p className="text-[10px] text-white/40 mt-1">
                    Withdrawal requests are stored in the database as pending and must be processed from your payout wallet manually.
                  </p>
                </div>
              </div>
              )}
          </div>
          )}

          <div className="space-y-2">
            <label className="text-[10px] font-black uppercase tracking-[0.2em] text-white/20 ml-2">
              {activeTab === 'deposit' ? 'Deposit Amount (USD)' : 'Withdraw Amount (USD)'}
            </label>
            {activeTab === 'deposit' ? (
              <div className="text-[11px] text-white/35 ml-2">Minimum deposit: $1.00</div>
            ) : null}
            <div className="relative">
              <input
                type="number"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                className="w-full bg-black/40 border border-white/5 rounded-2xl px-6 py-4 text-xl font-mono font-bold focus:outline-none focus:border-[#00FF88]/50 transition-all"
                placeholder="0"
              />
              <div className="absolute right-4 top-1/2 -translate-y-1/2 flex items-center gap-2">
                <div className="text-[10px] font-bold text-white/20 mr-2">
                  {formatMoney(parseFloat(amount) || 0)}
                </div>
                <button
                  onClick={() => setAmount((Math.max(1, Math.floor((parseFloat(amount) || 0) / 2))).toString())}
                  className="px-3 py-1 bg-white/5 hover:bg-white/10 rounded-lg text-[10px] font-bold text-white/40 transition-colors"
                >
                  1/2
                </button>
                <button
                  onClick={() => setAmount(((parseFloat(amount) || 0) * 2 || 10).toString())}
                  className="px-3 py-1 bg-white/5 hover:bg-white/10 rounded-lg text-[10px] font-bold text-white/40 transition-colors"
                >
                  2x
                </button>
              </div>
            </div>
          </div>

          <div className="bg-black/40 rounded-2xl p-4 flex items-center justify-between border border-white/5">
            <span className="text-xs font-bold text-white/40">Current Balance</span>
            <div className="text-right">
              <AnimatedBalanceDisplay balance={balance} className="relative" />
            </div>
          </div>

          {activeTab !== 'redeem' && activeTab !== 'ledger' && (
            <button
              onClick={handleAction}
              disabled={isProcessing}
              className={cn(
                'w-full py-4 rounded-2xl text-sm font-black uppercase tracking-widest transition-all shadow-lg flex items-center justify-center gap-3',
                isProcessing ? 'opacity-50 cursor-not-allowed' : '',
                activeTab === 'deposit' ? 'bg-[#00FF88] text-black hover:bg-[#00FF88]/90' : 'bg-red-500 text-white hover:bg-red-600'
              )}
            >
              {isProcessing && <RotateCcw className="animate-spin" size={16} />}
              {isProcessing ? 'Processing...' : activeTab === 'deposit' ? 'Create Deposit Invoice' : 'Submit Withdrawal Request'}
            </button>
          )}
        </div>
      </motion.div>
    </div>
  );
};

const LoginModal = ({ isOpen, onClose }: { isOpen: boolean, onClose: () => void }) => {
  const { login, register, verifyEmail, resendVerification } = useAuth();
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [totpCode, setTotpCode] = useState('');
  const [verificationCode, setVerificationCode] = useState('');
  const [verificationEmail, setVerificationEmail] = useState('');
  const [requiresTotp, setRequiresTotp] = useState(false);
  const [requiresEmailVerification, setRequiresEmailVerification] = useState(false);
  const [affiliateCode, setAffiliateCode] = useState('');
  const [emailOptIn, setEmailOptIn] = useState(true);
  const [isRegister, setIsRegister] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const withTimeout = useCallback(async <T,>(promise: Promise<T>, timeoutMs = 15000) => {
    let timer: number | undefined;
    try {
      return await Promise.race([
        promise,
        new Promise<T>((_, reject) => {
          timer = window.setTimeout(() => {
            reject(new Error('Request timed out. Please try again.'));
          }, timeoutMs);
        }),
      ]);
    } finally {
      if (timer) {
        clearTimeout(timer);
      }
    }
  }, []);

  useEffect(() => {
    if (!isOpen) {
      setIsSubmitting(false);
      setRequiresTotp(false);
      setTotpCode('');
      setError('');
      setNotice('');
      return;
    }

    setIsSubmitting(false);
    setError('');
    setNotice('');

    const params = new URLSearchParams(window.location.search);
    const ref = params.get('ref');
    if (ref) {
      setIsRegister(true);
      setAffiliateCode(ref);
    }
  }, [isOpen]);

  useEffect(() => {
    if (!isSubmitting) {
      return;
    }

    const watchdog = window.setTimeout(() => {
      setIsSubmitting(false);
      setError((prev) => prev || 'Request timed out. Please try again.');
    }, 20000);

    return () => window.clearTimeout(watchdog);
  }, [isSubmitting]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setNotice('');

    if (requiresEmailVerification) {
      if (!verificationEmail.trim() || !verificationCode.trim()) {
        setError('Enter your email and verification code.');
        return;
      }

      try {
        setIsSubmitting(true);
        await withTimeout(verifyEmail(verificationEmail.trim(), verificationCode.trim()));
        setVerificationCode('');
        setRequiresEmailVerification(false);
        setRequiresTotp(false);
        setTotpCode('');
        onClose();
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Email verification failed.');
      } finally {
        setIsSubmitting(false);
      }
      return;
    }

    if (!username.trim() || !password.trim() || (isRegister && !email.trim())) {
      setError('Please fill in all required fields.');
      return;
    }

    if (requiresTotp && !totpCode.trim()) {
      setError('Please enter your 2FA code.');
      return;
    }

    try {
      setIsSubmitting(true);
      if (isRegister) {
        await withTimeout(register(username.trim(), email.trim(), password, affiliateCode.trim(), emailOptIn));
        setVerificationEmail(email.trim());
        setVerificationCode('');
        setRequiresEmailVerification(true);
        setNotice('Verification code sent. Check your email to continue.');
      } else {
        await withTimeout(login(username.trim(), password, requiresTotp ? totpCode.trim() : undefined));
        setTotpCode('');
        setRequiresTotp(false);
        onClose();
      }
    } catch (err: any) {
      if (err.message?.includes('2FA')) {
        setRequiresTotp(true);
        setError(err.message);
      } else if (err.requiresEmailVerification) {
        setRequiresEmailVerification(true);
        setVerificationEmail(String(err.email || email.trim()));
        setVerificationCode('');
        setError(err.message || 'Email verification required.');
      } else {
        setError(err instanceof Error ? err.message : 'Authentication failed.');
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-0 sm:p-4">
      <motion.div 
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
        className="absolute inset-0 bg-black/80 backdrop-blur-sm"
      />
      <motion.div 
        initial={{ scale: 0.9, opacity: 0, y: 20 }}
        animate={{ scale: 1, opacity: 1, y: 0 }}
        className="relative w-full sm:max-w-md bg-[#1a1d23] border border-white/10 rounded-none sm:rounded-3xl overflow-hidden shadow-2xl sm:max-h-[90vh] h-full sm:h-auto"
      >
        <div className="relative">
          <div className="absolute inset-0 opacity-40" style={{ background: 'radial-gradient(90% 65% at 20% 0%, rgba(34,211,238,0.18), transparent 60%), radial-gradient(90% 70% at 90% 12%, rgba(16,185,129,0.16), transparent 64%)' }} />
          <div className="relative z-10 p-6 sm:p-8 space-y-6 sm:space-y-8 overflow-y-auto max-h-full sm:max-h-none custom-scrollbar">
            <div className="space-y-4">
              <div className="inline-flex rounded-full border border-cyan-200/25 bg-cyan-400/10 px-3 py-1 text-[10px] font-black uppercase tracking-[0.2em] text-cyan-200">
                {requiresEmailVerification ? 'Email Verification' : isRegister ? 'Create Account' : 'Sign In'}
              </div>
              <div>
                <h2 className="text-3xl font-black uppercase tracking-tight text-white">
                  {requiresEmailVerification ? 'Verify Your Email' : isRegister ? 'Create Your Pasus Account' : 'Welcome Back'}
                </h2>
                <p className="mt-2 text-sm text-white/55">
                  {requiresEmailVerification
                    ? 'Enter the 6-digit code sent to your inbox.'
                    : isRegister
                      ? 'Set up your profile and start playing.'
                      : 'Sign in to continue where you left off.'}
                </p>
              </div>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              {error && (
                <div className="rounded-2xl border border-rose-400/30 bg-rose-500/15 px-4 py-3 text-xs font-bold text-rose-200">
                  {error}
                </div>
              )}

              {!error && notice && (
                <div className="rounded-2xl border border-emerald-400/30 bg-emerald-500/15 px-4 py-3 text-xs font-bold text-emerald-200">
                  {notice}
                </div>
              )}

              {!requiresEmailVerification && (
                <div className="space-y-2">
                  <label className="ml-2 text-[10px] font-black uppercase tracking-[0.18em] text-white/35">Username</label>
                  <div className="relative">
                    <User className="absolute left-4 top-1/2 -translate-y-1/2 text-white/25" size={18} />
                    <input
                      type="text"
                      value={username}
                      onChange={(e) => setUsername(e.target.value)}
                      className="w-full rounded-2xl border border-white/10 bg-black/35 pl-12 pr-6 py-3.5 text-sm font-bold text-white placeholder:text-white/25 focus:outline-none focus:border-cyan-300/45"
                      placeholder="Username"
                      required
                      disabled={isSubmitting}
                    />
                  </div>
                </div>
              )}

              {isRegister && !requiresEmailVerification && (
                <div className="space-y-2">
                  <label className="ml-2 text-[10px] font-black uppercase tracking-[0.18em] text-white/35">Email</label>
                  <div className="relative">
                    <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-white/25" size={18} />
                    <input
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="w-full rounded-2xl border border-white/10 bg-black/35 pl-12 pr-6 py-3.5 text-sm font-bold text-white placeholder:text-white/25 focus:outline-none focus:border-cyan-300/45"
                      placeholder="you@example.com"
                      required
                      disabled={isSubmitting}
                    />
                  </div>
                </div>
              )}

              {requiresEmailVerification && (
                <>
                  <div className="space-y-2">
                    <label className="ml-2 text-[10px] font-black uppercase tracking-[0.18em] text-white/35">Email</label>
                    <div className="relative">
                      <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-white/25" size={18} />
                      <input
                        type="email"
                        value={verificationEmail}
                        onChange={(e) => setVerificationEmail(e.target.value)}
                        className="w-full rounded-2xl border border-white/10 bg-black/35 pl-12 pr-6 py-3.5 text-sm font-bold text-white placeholder:text-white/25 focus:outline-none focus:border-cyan-300/45"
                        placeholder="you@example.com"
                        required
                        disabled={isSubmitting}
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <label className="ml-2 text-[10px] font-black uppercase tracking-[0.18em] text-white/35">Verification Code</label>
                    <div className="relative">
                      <QrCode className="absolute left-4 top-1/2 -translate-y-1/2 text-white/25" size={18} />
                      <input
                        type="text"
                        value={verificationCode}
                        onChange={(e) => setVerificationCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                        className="w-full rounded-2xl border border-white/10 bg-black/35 pl-12 pr-6 py-3.5 text-center text-sm font-black tracking-[0.3em] text-white placeholder:text-white/25 focus:outline-none focus:border-cyan-300/45"
                        placeholder="000000"
                        maxLength={6}
                        required
                        disabled={isSubmitting}
                      />
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={async () => {
                      if (!verificationEmail.trim()) {
                        setError('Enter your email first.');
                        return;
                      }
                      try {
                        setError('');
                        setNotice('');
                        setIsSubmitting(true);
                        await withTimeout(resendVerification(verificationEmail.trim()));
                        setNotice('A new code has been sent to your email.');
                      } catch (err) {
                        setError(err instanceof Error ? err.message : 'Failed to resend verification code.');
                      } finally {
                        setIsSubmitting(false);
                      }
                    }}
                    className="w-full rounded-2xl border border-white/15 bg-white/5 px-5 py-3 text-xs font-black uppercase tracking-[0.16em] text-white/75 transition-all hover:bg-white/10 disabled:opacity-50"
                    disabled={isSubmitting}
                  >
                    Resend Code
                  </button>
                </>
              )}

              {!requiresEmailVerification && isRegister && (
                <div className="space-y-2">
                  <label className="ml-2 text-[10px] font-black uppercase tracking-[0.18em] text-white/35">Affiliate Code (Optional)</label>
                  <div className="relative">
                    <Users className="absolute left-4 top-1/2 -translate-y-1/2 text-white/25" size={18} />
                    <input
                      type="text"
                      value={affiliateCode}
                      onChange={(e) => setAffiliateCode(e.target.value.toUpperCase())}
                      className="w-full rounded-2xl border border-white/10 bg-black/35 pl-12 pr-6 py-3.5 text-sm font-bold text-white placeholder:text-white/25 focus:outline-none focus:border-cyan-300/45"
                      placeholder="Enter code"
                      disabled={isSubmitting}
                    />
                  </div>
                </div>
              )}

              {!requiresEmailVerification && (
                <label className="flex cursor-pointer items-center gap-3 rounded-2xl border border-white/10 bg-white/5 px-3 py-3">
                  <input
                    type="checkbox"
                    checked={emailOptIn}
                    onChange={(e) => setEmailOptIn(e.target.checked)}
                    className="h-4 w-4 rounded border-white/25 bg-black/40 text-cyan-300 focus:ring-cyan-300"
                    disabled={isSubmitting}
                  />
                  <div>
                    <div className="text-xs font-semibold text-white">Promotional emails</div>
                    <div className="text-[10px] text-white/45">Get event updates and bonus drops.</div>
                  </div>
                </label>
              )}

              {!requiresEmailVerification && (
                <div className="space-y-2">
                  <label className="ml-2 text-[10px] font-black uppercase tracking-[0.18em] text-white/35">Password</label>
                  <div className="relative">
                    <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-white/25" size={18} />
                    <input
                      type="password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="w-full rounded-2xl border border-white/10 bg-black/35 pl-12 pr-6 py-3.5 text-sm font-bold text-white placeholder:text-white/25 focus:outline-none focus:border-cyan-300/45"
                      placeholder="Password"
                      required
                      disabled={isSubmitting}
                    />
                  </div>
                </div>
              )}

              {requiresTotp && !requiresEmailVerification && (
                <div className="space-y-2">
                  <label className="ml-2 text-[10px] font-black uppercase tracking-[0.18em] text-white/35">2FA Code</label>
                  <div className="relative">
                    <QrCode className="absolute left-4 top-1/2 -translate-y-1/2 text-white/25" size={18} />
                    <input
                      type="text"
                      value={totpCode}
                      onChange={(e) => setTotpCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                      className="w-full rounded-2xl border border-white/10 bg-black/35 pl-12 pr-6 py-3.5 text-center text-sm font-black tracking-[0.3em] text-white placeholder:text-white/25 focus:outline-none focus:border-cyan-300/45"
                      placeholder="000000"
                      maxLength={6}
                      required
                      disabled={isSubmitting}
                    />
                  </div>
                </div>
              )}

              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full rounded-2xl bg-gradient-to-r from-cyan-300 to-emerald-300 py-3.5 text-sm font-black uppercase tracking-[0.16em] text-slate-900 transition-all hover:opacity-95 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {isSubmitting ? 'Please wait...' : requiresEmailVerification ? 'Verify Email' : isRegister ? 'Create Account' : 'Sign In'}
              </button>
            </form>

            <div className="text-center">
              <button
                onClick={() => {
                  if (requiresEmailVerification) {
                    setRequiresEmailVerification(false);
                    setVerificationCode('');
                    setNotice('');
                    setError('');
                    return;
                  }
                  setIsRegister(!isRegister);
                  setRequiresTotp(false);
                  setTotpCode('');
                  setError('');
                  setNotice('');
                }}
                className="text-xs font-bold text-white/45 transition-colors hover:text-white"
                disabled={isSubmitting}
              >
                {requiresEmailVerification ? 'Back to Sign In' : isRegister ? 'Already have an account? Sign In' : "Don't have an account? Create one"}
              </button>
            </div>
          </div>
        </div>
      </motion.div>
    </div>
  );
};

const DailyBonusModal = ({ isOpen, onClose }: { isOpen: boolean, onClose: () => void }) => {
  const { refreshWallet } = useBalance();
  const [status, setStatus] = useState<{
    streak: number;
    amount: number;
    xp: number;
    level: number;
    xpToNextLevel: number;
    nextClaimAt: string | null;
  } | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isClaiming, setIsClaiming] = useState(false);
  const [claimed, setClaimed] = useState(false);
  const [leveledUp, setLeveledUp] = useState(false);
  const [previousLevel, setPreviousLevel] = useState(1);

  const loadStatus = useCallback(async () => {
    const token = localStorage.getItem('pasus_auth_token');
    if (!token) {
      setIsLoading(false);
      return;
    }

    try {
      const response = await apiFetch('/api/daily-claim/status', {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(data.error || 'Failed to load status.');
      }
      setStatus({
        streak: data.streak || 1,
        amount: 0,
        xp: data.xp || 0,
        level: data.level || 1,
        xpToNextLevel: data.xpToNextLevel || 0,
        nextClaimAt: data.nextClaimAt || null,
      });
      setPreviousLevel(data.level || 1);
    } catch {
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    if (isOpen) {
      loadStatus();
    }
  }, [isOpen, loadStatus]);

  const claimReward = async () => {
    try {
      setIsClaiming(true);
      const token = localStorage.getItem('pasus_auth_token');
      const response = await apiFetch('/api/daily-claim', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(data.error || 'Failed to claim reward.');
      }

      const leveledUpNew = data.level > previousLevel;
      setLeveledUp(leveledUpNew);
      setClaimed(true);
      setStatus({
        streak: data.streak || 1,
        amount: data.amount || 0,
        xp: (status?.xp || 0) + (data.xp || 0),
        level: data.level || 1,
        xpToNextLevel: data.level >= 5 ? 0 : Math.max(0, (data.xpToNextLevel || 0) - (data.xp || 0)),
        nextClaimAt: data.nextClaimAt || null,
      });
      await refreshWallet();
    } catch (error) {
    } finally {
      setIsClaiming(false);
    }
  };

  if (!isOpen) return null;

  const xpProgress = status ? (
    status.level >= 5 ? 100 :
    Math.round(((status.xp - [0, 1000, 3000, 6000, 10000][status.level - 1]) /
    ([0, 1000, 3000, 6000, 10000][status.level] - [0, 1000, 3000, 6000, 10000][status.level - 1])) * 100)
  ) : 0;

  return (
    <div className="fixed inset-0 z-[110] flex items-center justify-center p-0 sm:p-4">
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
        className="absolute inset-0 bg-black/80 backdrop-blur-sm"
      />
      <motion.div
        initial={{ scale: 0.8, opacity: 0, y: 20 }}
        animate={{ scale: 1, opacity: 1, y: 0 }}
        className="relative w-full sm:max-w-md bg-[#1a1d23] border border-[#00FF88]/20 rounded-none sm:rounded-3xl overflow-hidden shadow-2xl shadow-[#00FF88]/10 sm:max-h-[90vh] h-full sm:h-auto"
      >
        <div className="absolute top-0 left-0 right-0 h-32 bg-gradient-to-b from-[#00FF88]/20 to-transparent" />
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-64 h-64 bg-[#00FF88]/10 blur-[100px] rounded-full" />

        <div className="relative p-8 text-center">
          <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-[#00FF88]/20 mb-4">
            <Gift size={40} className="text-[#00FF88]" />
          </div>

          <h2 className="text-3xl font-black italic uppercase tracking-tighter mb-2">
            Daily Bonus
          </h2>

          {isLoading ? (
            <div className="py-8 text-white/40">Loading...</div>
          ) : claimed ? (
            <div className="space-y-6 py-4">
              <motion.div
                initial={{ scale: 0.8 }}
                animate={{ scale: 1 }}
                className="space-y-2"
              >
                <div className="text-[#00FF88] text-sm font-black uppercase tracking-widest">Claimed!</div>
                <div className="text-4xl font-black italic">
                  +{formatMoneyFromCoins(status?.amount || 0)}
                </div>
              </motion.div>

              <div className="flex justify-center gap-8">
                <div className="text-center">
                  <div className="flex items-center justify-center gap-1 text-2xl font-black text-[#00FF88]">
                    <Flame size={20} />
                    {status?.streak}
                  </div>
                  <div className="text-[10px] uppercase tracking-widest text-white/30">Day Streak</div>
                </div>
                <div className="text-center">
                  <div className="flex items-center justify-center gap-1 text-2xl font-black text-purple-400">
                    <Sparkles size={20} />
                    +{status?.xp || 0} XP
                  </div>
                  <div className="text-[10px] uppercase tracking-widest text-white/30">Experience</div>
                </div>
              </div>

              {leveledUp && (
                <motion.div
                  initial={{ scale: 0.8, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  className="rounded-2xl border border-purple-400/30 bg-purple-400/10 px-6 py-4"
                >
                  <div className="text-sm font-black uppercase tracking-widest text-purple-400">
                    Level Up!
                  </div>
                  <div className="text-2xl font-black italic">
                    Level {status?.level}
                  </div>
                </motion.div>
              )}

              <button
                onClick={onClose}
                className="w-full py-4 bg-[#00FF88] text-black rounded-2xl text-sm font-black uppercase tracking-widest hover:bg-[#00FF88]/90 transition-all"
              >
                Awesome!
              </button>
            </div>
          ) : (
            <div className="space-y-6 py-4">
              <div className="space-y-1">
                <div className="text-white/40 text-sm">Your streak</div>
                <div className="flex items-center justify-center gap-2 text-4xl font-black">
                  <Flame className="text-[#00FF88]" size={32} />
                  <span className="text-[#00FF88]">{status?.streak || 1}</span>
                  <span className="text-xl text-white/30">days</span>
                </div>
              </div>

              <div className="rounded-2xl border border-white/10 bg-black/30 p-4">
                <div className="flex items-center justify-between text-sm mb-2">
                  <span className="text-white/40">Reward</span>
                  <span className="font-black text-[#00FF88]">
                    {formatMoneyFromCoins((status?.streak || 1) * 100)}
                  </span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-white/40">XP Earned</span>
                  <span className="font-black text-purple-400">
                    +{Math.min((status?.streak || 1) * 10, 300)} XP
                  </span>
                </div>
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between text-xs">
                  <div className="flex items-center gap-2">
                    <Star size={14} className="text-amber-400" />
                    <span className="text-white/60">Level {status?.level || 1}</span>
                  </div>
                  <span className="text-white/40">
                    {status?.xpToNextLevel || 0} XP to next level
                  </span>
                </div>
                <div className="h-2 bg-black/40 rounded-full overflow-hidden">
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: `${xpProgress}%` }}
                    className="h-full bg-gradient-to-r from-purple-500 to-purple-400 rounded-full"
                  />
                </div>
              </div>

              <button
                onClick={claimReward}
                disabled={isClaiming}
                className="w-full py-4 bg-[#00FF88] text-black rounded-2xl text-sm font-black uppercase tracking-widest hover:bg-[#00FF88]/90 transition-all disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {isClaiming ? (
                  <>
                    <LoaderCircle size={18} className="animate-spin" />
                    Claiming...
                  </>
                ) : (
                  <>
                    <Gift size={18} />
                    Claim Reward
                  </>
                )}
              </button>
            </div>
          )}
        </div>
      </motion.div>
    </div>
  );
};

const Header = ({
  onOpenWallet,
  onOpenLogin,
  onOpenProfile,
  onOpenConnections,
  onOpenSettings,
  onOpenAdmin,
  onOpenLeaderboard,
  onOpenSidebar,
  onToggleChat,
  chatOpen,
  userLevel,
  userStreak,
  userXp,
  userXpToNextLevel,
}: {
  onOpenWallet: () => void,
  onOpenLogin: () => void,
  onOpenProfile: () => void,
  onOpenConnections: () => void,
  onOpenSettings: () => void,
  onOpenAdmin: () => void,
  onOpenLeaderboard: () => void,
  onOpenSidebar: () => void,
  onToggleChat?: () => void,
  chatOpen?: boolean,
  userLevel?: number;
  userStreak?: number;
  userXp?: number;
  userXpToNextLevel?: number;
}) => {
  const { balance } = useBalance();
  const { user, logout, isAuthenticated } = useAuth();
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);
  const [showMobileBalance, setShowMobileBalance] = useState(false);
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [isNotificationsLoading, setIsNotificationsLoading] = useState(false);

  const loadNotifications = useCallback(async (silent = false) => {
    const token = localStorage.getItem('pasus_auth_token');
    if (!token || !isAuthenticated) {
      setNotifications([]);
      setUnreadCount(0);
      return;
    }

    if (!silent) {
      setIsNotificationsLoading(true);
    }

    try {
      const response = await apiFetch('/api/notifications', {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await response.json().catch(() => ({}));
      if (response.ok) {
        setNotifications(Array.isArray(data.notifications) ? data.notifications : []);
        setUnreadCount(Number(data.unreadCount || 0));
      }
    } catch {
    } finally {
      if (!silent) {
        setIsNotificationsLoading(false);
      }
    }
  }, [isAuthenticated]);

  useEffect(() => {
    loadNotifications(true);
    if (!isAuthenticated) {
      return;
    }
    const timer = window.setInterval(() => loadNotifications(true), 15000);
    return () => window.clearInterval(timer);
  }, [isAuthenticated, loadNotifications]);

  const markNotificationRead = async (id: number) => {
    const token = localStorage.getItem('pasus_auth_token');
    if (!token) return;
    setNotifications((prev) => prev.map((item) => item.id === id ? { ...item, isRead: true } : item));
    setUnreadCount((prev) => Math.max(0, prev - 1));
    try {
      await apiFetch(`/api/notifications/${id}/read`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
      });
    } catch {
      loadNotifications(true).catch(() => undefined);
    }
  };

  const markAllNotificationsRead = async () => {
    const token = localStorage.getItem('pasus_auth_token');
    if (!token) return;
    setNotifications((prev) => prev.map((item) => ({ ...item, isRead: true })));
    setUnreadCount(0);
    try {
      await apiFetch('/api/notifications/read-all', {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
      });
    } catch {
      loadNotifications(true).catch(() => undefined);
    }
  };
  
  return (
    <header className="h-14 md:h-16 border-b border-white/5 bg-[linear-gradient(90deg,rgba(20,49,54,0.9),rgba(23,31,47,0.9))] backdrop-blur-xl sticky top-0 z-50">
      <div className="max-w-full h-full px-3 md:px-6 flex items-center justify-between">
        <div className="flex items-center gap-2 md:gap-3">
          <button onClick={onOpenSidebar} className="lg:hidden p-2 hover:bg-white/5 rounded-xl transition-colors">
            <Menu size={22} className="text-white/60" />
          </button>
          <div className="flex items-center gap-3">
            <div className="w-7 h-7 md:w-8 md:h-8 rounded-lg overflow-hidden">
              <img src="/assets/icon.png" alt="Pasus" className="w-full h-full object-cover" />
            </div>
            <span className="text-lg md:text-xl font-black italic tracking-tighter uppercase">PASUS</span>
          </div>
          <button
            onClick={onOpenLeaderboard}
            className="hidden md:flex rounded-full border border-white/10 bg-[#1a1d23] px-4 py-2 text-xs font-black uppercase tracking-[0.16em] text-white/70 transition-all hover:border-[#00FF88]/40 hover:text-white"
          >
            <span className="flex items-center gap-2">
              <Trophy size={14} className="text-[#00FF88]" />
              <span>Leaderboard</span>
            </span>
          </button>
        </div>

        <div className="hidden md:flex flex-1 items-center justify-center gap-4">
          {isAuthenticated && (userLevel || userStreak) ? (
            <>
              <div className="flex items-center gap-2 rounded-full border border-white/10 bg-[#1a1d23] px-3 py-1.5">
                <Flame size={14} className="text-[#00FF88]" />
                <span className="text-xs font-black text-[#00FF88]">{userStreak || 0}</span>
              </div>
              <div className="flex items-center gap-2 rounded-full border border-white/10 bg-[#1a1d23] px-3 py-1.5">
                <Star size={14} className="text-amber-400" />
                <span className="text-xs font-black text-amber-400">Lv.{userLevel || 1}</span>
              </div>
            </>
          ) : null}
          <div className="group relative rounded-full border border-white/10 bg-[#1a1d23] px-5 py-2">
            <AnimatedBalanceDisplay balance={balance} />
            <div className="absolute right-4 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 transition-opacity">
              <ChevronUp size={10} className="text-[#00FF88]" />
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2 md:gap-4">
          <button
            onClick={() => setShowMobileBalance(!showMobileBalance)}
            className="md:hidden relative rounded-full border border-white/10 bg-[#1a1d23] px-3 py-1.5"
          >
            <AnimatedBalanceDisplay balance={balance} className="text-xs" />
          </button>

          {isAuthenticated ? (
            <>
              <div className="relative">
                <button
                  onClick={() => {
                    const next = !showNotifications;
                    setShowNotifications(next);
                    setShowUserMenu(false);
                    if (next) {
                      loadNotifications().catch(() => undefined);
                    }
                  }}
                  className="relative w-9 h-9 md:w-10 md:h-10 rounded-full border border-white/10 bg-[#1a1d23] flex items-center justify-center hover:border-[#00FF88]/35 transition-all"
                >
                  <Bell size={16} className="text-white/70" />
                  {unreadCount > 0 ? (
                    <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] rounded-full bg-[#00FF88] px-1 text-[10px] font-black text-black flex items-center justify-center">
                      {unreadCount > 9 ? '9+' : unreadCount}
                    </span>
                  ) : null}
                </button>

                <AnimatePresence>
                  {showNotifications ? (
                    <>
                      <div className="fixed inset-0 z-40" onClick={() => setShowNotifications(false)} />
                      <motion.div
                        initial={{ opacity: 0, y: 10, scale: 0.95 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: 10, scale: 0.95 }}
                        className="absolute right-0 mt-2 w-[360px] max-w-[calc(100vw-24px)] bg-[#1a1d23] border border-white/10 rounded-3xl overflow-hidden shadow-2xl z-50"
                      >
                        <div className="flex items-center justify-between gap-3 px-4 py-4 border-b border-white/5">
                          <div>
                            <div className="text-sm font-black uppercase tracking-[0.16em]">Notifications</div>
                            <div className="text-[10px] text-white/35 mt-1">Wins, rain, promos, and support replies</div>
                          </div>
                          <button onClick={markAllNotificationsRead} className="text-[10px] font-black uppercase tracking-[0.16em] text-[#00FF88] hover:text-white transition-colors">
                            Read all
                          </button>
                        </div>
                        <div className="max-h-[420px] overflow-y-auto custom-scrollbar p-3 space-y-2">
                          {isNotificationsLoading ? (
                            <div className="px-3 py-8 text-center text-sm text-white/35">Loading notifications...</div>
                          ) : notifications.length ? notifications.map((item) => (
                            <button
                              key={item.id}
                              onClick={() => !item.isRead && markNotificationRead(item.id)}
                              className={cn(
                                'w-full rounded-2xl border px-4 py-3 text-left transition-all',
                                item.isRead ? 'border-white/5 bg-white/[0.03]' : 'border-[#00FF88]/20 bg-[#00FF88]/8'
                              )}
                            >
                              <div className="flex items-start justify-between gap-4">
                                <div>
                                  <div className="text-xs font-black uppercase tracking-[0.14em] text-[#00FF88]">{item.type}</div>
                                  <div className="mt-1 text-sm font-black text-white">{item.title}</div>
                                  <div className="mt-1 text-xs text-white/55 leading-relaxed">{item.message}</div>
                                </div>
                                {!item.isRead ? <span className="w-2.5 h-2.5 rounded-full bg-[#00FF88] mt-1 shrink-0" /> : null}
                              </div>
                              <div className="mt-3 text-[10px] text-white/30">{new Date(item.createdAt).toLocaleString()}</div>
                            </button>
                          )) : (
                            <div className="px-3 py-8 text-center text-sm text-white/35">No notifications yet.</div>
                          )}
                        </div>
                      </motion.div>
                    </>
                  ) : null}
                </AnimatePresence>
              </div>

              <button 
                onClick={onOpenWallet}
                className="bg-[#00FF88] text-black text-sm font-black px-3 md:px-4 py-1.5 md:py-2 rounded-full hover:bg-[#00FF88]/90 transition-colors text-xs md:text-sm"
              >
                + Add
              </button>

              <div className="relative">
                <button 
                  onClick={() => setShowUserMenu(!showUserMenu)}
                  className="w-9 h-9 md:w-10 md:h-10 rounded-full border border-white/10 overflow-hidden hover:border-[#00FF88]/50 transition-all"
                >
                  <img src={getPreferredAvatar(user)} alt="Avatar" className="w-full h-full object-cover" />
                </button>

                <AnimatePresence>
                  {showUserMenu && (
                    <>
                      <div className="fixed inset-0 z-40" onClick={() => setShowUserMenu(false)} />
                      <motion.div 
                        initial={{ opacity: 0, y: 10, scale: 0.95 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: 10, scale: 0.95 }}
                        className="absolute right-0 mt-2 w-56 bg-[#1a1d23] border border-white/10 rounded-2xl overflow-hidden shadow-2xl z-50"
                      >
                        <div className="p-4 border-b border-white/5">
                          <div className="text-sm font-bold truncate">{user?.username}</div>
                          <div className="text-[10px] text-white/40 truncate">{user?.email}</div>
                        </div>
                        <div className="p-2">
                          <button 
                            onClick={() => { onOpenProfile(); setShowUserMenu(false); }}
                            className="w-full flex items-center gap-3 px-3 py-2 rounded-xl text-xs font-bold text-white/60 hover:text-white hover:bg-white/5 transition-all"
                          >
                            <User size={14} /> Profile
                          </button>
                          <button
                            onClick={() => { onOpenConnections(); setShowUserMenu(false); }}
                            className="w-full flex items-center gap-3 px-3 py-2 rounded-xl text-xs font-bold text-white/60 hover:text-white hover:bg-white/5 transition-all"
                          >
                            <Users size={14} /> Connections
                          </button>
                          <button 
                            onClick={() => { onOpenSettings(); setShowUserMenu(false); }}
                            className="w-full flex items-center gap-3 px-3 py-2 rounded-xl text-xs font-bold text-white/60 hover:text-white hover:bg-white/5 transition-all"
                          >
                            <Settings size={14} /> Settings
                          </button>
                          {(user?.role === 'owner' || user?.role === 'moderator') ? (
                            <button
                              onClick={() => { onOpenAdmin(); setShowUserMenu(false); }}
                              className="w-full flex items-center gap-3 px-3 py-2 rounded-xl text-xs font-bold text-white/60 hover:text-white hover:bg-white/5 transition-all"
                            >
                              <Shield size={14} /> {user?.role === 'moderator' ? 'Staff' : 'Admin'}
                            </button>
                          ) : null}
                          <button 
                            onClick={() => { logout(); setShowUserMenu(false); }}
                            className="w-full flex items-center gap-3 px-3 py-2 rounded-xl text-xs font-bold text-red-400 hover:bg-red-400/10 transition-all"
                          >
                            <LogOut size={14} /> Logout
                          </button>
                        </div>
                      </motion.div>
                    </>
                  )}
                </AnimatePresence>
              </div>
            </>
          ) : (
            <div className="flex items-center gap-2">
              <button 
                onClick={onOpenLogin}
                className="px-4 py-2 rounded-full text-xs font-black uppercase tracking-widest text-white/60 hover:text-white transition-all"
              >
                Sign In
              </button>
              <button 
                onClick={onOpenLogin}
                className="bg-[#00FF88] text-black px-4 py-2 rounded-full text-xs font-black uppercase tracking-widest hover:bg-[#00FF88]/90 transition-all shadow-lg shadow-[#00FF88]/10"
              >
                Register
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
};

const FeaturedGame = ({ game, onClick }: { game: any, onClick: () => void, key?: any }) => {
  return (
    <motion.button
      whileHover={{ y: -4 }}
      onClick={onClick}
      className="relative aspect-[4/3] rounded-3xl overflow-hidden group border border-white/5"
    >
      <img 
        src={game.image} 
        alt={game.name} 
        className="absolute inset-0 w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
        referrerPolicy="no-referrer"
      />
      <div className="absolute inset-0 bg-gradient-to-t from-black via-black/40 to-transparent" />
      <div className="absolute bottom-0 left-0 p-6 text-left">
        <div className="flex items-center gap-2 text-[#00FF88] text-[10px] font-black uppercase tracking-[0.2em] mb-2">
          <Flame size={12} fill="currentColor" />
          Featured
        </div>
        <h3 className="text-2xl font-black italic uppercase tracking-tighter mb-1">{game.name}</h3>
        <p className="text-white/60 text-xs max-w-[200px] line-clamp-1">{game.description}</p>
        <div className="mt-4 bg-white text-black text-[10px] font-black px-4 py-2 rounded-full opacity-0 group-hover:opacity-100 translate-y-2 group-hover:translate-y-0 transition-all">
          PLAY NOW
        </div>
      </div>
    </motion.button>
  );
};

type ActivityFeedItem = {
  id: number;
  gameKey: string;
  username: string;
  wager: number;
  payout: number;
  multiplier: number;
  outcome: string;
  detail?: string;
  createdAt: string;
};

function getBetShareUrl(betId: number) {
  return `${window.location.origin}/provably-fair?bet=${betId}`;
}

const lazyFallback = (
  <div className="rounded-[28px] border border-white/10 bg-[#141821] px-6 py-10 text-center text-sm text-white/35">
    Loading...
  </div>
);

const RecentActivity = ({ onOpenProfile }: { onOpenProfile?: (username: string) => void }) => {
  const [activeTab, setActiveTab] = useState<'all' | 'high' | 'lucky'>('all');
  const [activities, setActivities] = useState<ActivityFeedItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;

    const loadActivity = async (silent = false) => {
      if (!silent) {
        setIsLoading(true);
      }
      try {
        const response = await apiFetch(`/api/activity/bets?tab=${activeTab}&limit=5`);
        const data = await response.json().catch(() => ({}));
        if (!response.ok || !isMounted) {
          return;
        }
        setActivities(data.activities || []);
      } finally {
        if (isMounted && !silent) {
          setIsLoading(false);
        }
      }
    };

    loadActivity();
    const interval = window.setInterval(() => {
      loadActivity(true).catch(() => undefined);
    }, 3000);

    return () => {
      isMounted = false;
      window.clearInterval(interval);
    };
  }, [activeTab]);

  const formatTimeAgo = (value: string) => {
    const seconds = Math.max(0, Math.floor((Date.now() - new Date(value).getTime()) / 1000));
    if (seconds < 60) return `${seconds}s ago`;
    if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
    if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
    return `${Math.floor(seconds / 86400)}d ago`;
  };

  return (
    <motion.section
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ duration: 0.5 }}
    >
      <div className="flex items-center justify-between mb-6 gap-4">
        <h2 className="text-xl font-black italic uppercase tracking-tighter flex items-center gap-3 text-white/90">
          <motion.span
            animate={{ rotate: [0, 10, -10, 0] }}
            transition={{ duration: 2, repeat: Infinity, repeatDelay: 3 }}
          >
            <TrendingUp className="text-[#00FF88]" size={20} />
          </motion.span>
          Recent Activity
        </h2>
        <div className="flex p-1 bg-black/40 rounded-full border border-white/5">
          {[
            { id: 'all', label: 'All' },
            { id: 'high', label: 'Big Wins' },
            { id: 'lucky', label: 'Lucky' },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as 'all' | 'high' | 'lucky')}
              className={cn(
                'px-4 py-2 rounded-full text-[10px] font-black uppercase tracking-[0.2em] transition-all relative overflow-hidden',
                activeTab === tab.id ? 'text-black' : 'text-white/40 hover:text-white'
              )}
            >
              {activeTab === tab.id && (
                <motion.div
                  layoutId="activeTab"
                  className="absolute inset-0 bg-[#00FF88] rounded-full"
                  transition={{ type: 'spring', bounce: 0.2, duration: 0.5 }}
                />
              )}
              <span className="relative z-10">{tab.label}</span>
            </button>
          ))}
        </div>
      </div>
      <div className="bg-[#1a1d23] border border-white/5 rounded-3xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-white/5 text-[10px] font-black uppercase tracking-[0.2em] text-white/20">
                <th className="px-6 py-4">Game</th>
                <th className="px-6 py-4">User</th>
                <th className="px-6 py-4">Time</th>
                <th className="px-6 py-4">Wager</th>
                <th className="px-6 py-4">Multiplier</th>
                <th className="px-6 py-4 text-right">Payout</th>
                <th className="px-6 py-4 text-right">Link</th>
              </tr>
            </thead>
            <tbody className="text-xs font-bold">
              {isLoading ? (
                <tr>
                  <td colSpan={7} className="px-6 py-8 text-center text-white/30">Loading activity...</td>
                </tr>
              ) : activities.length ? (
                activities.map((activity) => (
                  <tr key={activity.id} className="border-b border-white/5 hover:bg-white/[0.02] transition-colors">
                    <td className="px-6 py-4 text-white/60 capitalize">{activity.gameKey}</td>
                    <td className="px-6 py-4">
                      <button onClick={() => onOpenProfile?.(activity.username)} className="hover:text-[#00FF88] transition-colors">
                        {activity.username}
                      </button>
                    </td>
                    <td className="px-6 py-4 text-white/20">{formatTimeAgo(activity.createdAt)}</td>
                    <td className="px-6 py-4 font-mono">{formatMoneyFromCoins(activity.wager)}</td>
                    <td className="px-6 py-4">
                      <span className={cn(
                        'px-2 py-1 rounded-lg',
                        activity.outcome === 'win' ? 'bg-[#00FF88]/10 text-[#00FF88]' : activity.outcome === 'push' ? 'bg-blue-500/10 text-blue-400' : 'bg-red-500/10 text-red-500'
                      )}>
                        {activity.multiplier ? `${activity.multiplier.toFixed(2)}x` : '0.00x'}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right font-mono">
                      <span className={activity.payout > 0 ? 'text-[#00FF88]' : 'text-white/20'}>
                        {formatMoneyFromCoins(activity.payout)}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <button onClick={() => navigator.clipboard.writeText(getBetShareUrl(activity.id))} className="rounded-full bg-white/5 px-3 py-1 text-[10px] font-black uppercase tracking-[0.14em] text-white/55 hover:text-white">
                        Share
                      </button>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={7} className="px-6 py-8 text-center text-white/30">No bet activity yet.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </motion.section>
  );
};

const LiveBetsStrip = () => {
  const [bets, setBets] = useState<ActivityFeedItem[]>([]);

  useEffect(() => {
    let isMounted = true;
    const load = async () => {
      const response = await apiFetch('/api/activity/bets?tab=all&limit=8');
      const data = await response.json().catch(() => ({}));
      if (!response.ok || !isMounted) {
        return;
      }
      setBets(data.activities || []);
    };

    load().catch(() => undefined);
    const timer = window.setInterval(() => load().catch(() => undefined), 2500);
    return () => {
      isMounted = false;
      window.clearInterval(timer);
    };
  }, []);

  return (
    <motion.section 
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ duration: 0.5 }}
      className="space-y-4"
    >
      <div className="flex items-center gap-3">
        <motion.div 
          animate={{ scale: [1, 1.1, 1] }}
          transition={{ duration: 2, repeat: Infinity }}
        >
          <TrendingUp className="text-[#00FF88]" size={18} />
        </motion.div>
        <h2 className="text-xl font-black italic uppercase tracking-tighter text-white/90">Live Bets</h2>
        <span className="ml-auto flex items-center gap-1.5">
          <span className="w-2 h-2 rounded-full bg-[#00FF88] animate-pulse" />
          <span className="text-xs text-white/40">Live</span>
        </span>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
        {bets.map((betItem, i) => (
          <motion.div
            key={betItem.id}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, delay: i * 0.05 }}
            whileHover={{ scale: 1.02, borderColor: 'rgba(0,255,136,0.3)' }}
            className="rounded-[28px] border border-white/10 bg-[#141821] p-5 space-y-3 hover:shadow-lg hover:shadow-[#00FF88]/5 transition-all cursor-default"
          >
            <div className="flex items-center justify-between">
              <div className="text-[10px] uppercase tracking-[0.2em] text-white/25 font-medium">{betItem.gameKey}</div>
              <motion.div 
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                className={cn('text-[10px] font-black uppercase tracking-[0.18em] px-2 py-0.5 rounded-full', 
                  betItem.outcome === 'win' ? 'bg-[#00FF88]/20 text-[#00FF88]' : 
                  betItem.outcome === 'push' ? 'bg-blue-500/20 text-blue-400' : 'bg-red-500/20 text-red-400'
                )}
              >
                {betItem.outcome}
              </motion.div>
            </div>
            <div className="text-lg font-black text-white truncate">{betItem.username}</div>
            <div className="flex items-center justify-between text-sm">
              <span className="text-white/35">Wager</span>
              <span className="font-mono text-white/80">{formatMoneyFromCoins(betItem.wager)}</span>
            </div>
            <div className="flex items-center justify-between text-sm">
              <span className="text-white/35">Payout</span>
              <span className={betItem.payout > 0 ? 'font-mono text-[#00FF88]' : 'font-mono text-white/25'}>
                {formatMoneyFromCoins(betItem.payout)}
              </span>
            </div>
          </motion.div>
        ))}
      </div>
    </motion.section>
  );
};

const Dashboard = ({ onSelectGame, onOpenProfile }: { onSelectGame: (id: string) => void; onOpenProfile?: (username: string) => void }) => {
  const [stats, setStats] = useState({ playersOnline: 0, totalWageredToday: 0, biggestWin: 0 });
  const [isLoadingStats, setIsLoadingStats] = useState(true);
  const [showNewsModal, setShowNewsModal] = useState(false);

  useEffect(() => {
    const loadStats = async () => {
      try {
        const response = await apiFetch('/api/stats/site');
        const data = await response.json().catch(() => ({}));
        if (response.ok && data.stats) {
          setStats({
            playersOnline: Number(data.stats.playersOnline || 0),
            totalWageredToday: Number(data.stats.totalWageredToday || 0),
            biggestWin: Number(data.stats.biggestWin || 0),
          });
        }
      } catch { /* silent */ }
      finally { setIsLoadingStats(false); }
    };
    loadStats();
    const interval = window.setInterval(loadStats, 30000);
    return () => clearInterval(interval);
  }, []);

  const filteredGames = HOME_GAMES;

  return (
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.4 }}
      className="min-h-screen"
    >
      {/* News Banner */}
      <div className="px-4 md:px-6 pt-4 pb-6">
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.1 }}
          onClick={() => setShowNewsModal(true)}
          className="relative rounded-3xl overflow-hidden border border-white/10 h-[280px] md:h-[320px] cursor-pointer group"
        >
          <div className="absolute inset-0 bg-gradient-to-r from-[#0a0a15] via-[#0f1520]/80 to-transparent z-10" />
          <div className="absolute inset-0 bg-gradient-to-t from-[#0a0a15] via-transparent to-transparent z-10" />
          <img 
            src={NEWS_BANNER.image} 
            alt={NEWS_BANNER.name}
            className="absolute inset-0 w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
          />
          
          <div className="absolute inset-0 z-20 bg-gradient-to-r from-black/60 via-transparent to-transparent" />
          <div className="absolute inset-0 z-20 bg-gradient-to-t from-black/80 via-transparent to-transparent" />

          <div className="relative h-full p-6 md:p-10 flex flex-col justify-end z-30">
            <motion.div 
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.5, delay: 0.3 }}
              className="flex items-center gap-2 mb-auto pt-4"
            >
              <span className="px-4 py-1.5 bg-[#00FF88] text-black text-[10px] font-black uppercase tracking-[0.3em] rounded-full shadow-lg shadow-[#00FF88]/30">
                New!
              </span>
              <span className="text-white/40 text-xs tracking-widest">Click to learn more</span>
            </motion.div>

            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.4 }}
              className="grid grid-cols-3 gap-3 mt-6"
            >
              {[
                { label: 'Total Users', value: isLoadingStats ? '...' : formatNumberCompact(stats.playersOnline), color: 'text-[#00FF88]', icon: Users },
                { label: 'Wagered Today', value: isLoadingStats ? '...' : formatMoneyFromCoins(stats.totalWageredToday), color: 'text-amber-400', icon: TrendingUp },
                { label: 'Biggest Win', value: isLoadingStats ? '...' : formatMoneyFromCoins(stats.biggestWin), color: 'text-purple-400', icon: Trophy },
              ].map((stat, i) => (
                <motion.div 
                  key={stat.label}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.4, delay: 0.5 + i * 0.1 }}
                  className="bg-black/40 border border-white/10 rounded-2xl px-3 py-3 text-center backdrop-blur-sm hover:border-white/20 transition-all"
                >
                  <div className="flex items-center justify-center gap-1.5 mb-1">
                    <stat.icon className={cn('w-3 h-3', stat.color)} />
                    <div className={cn('text-lg md:text-xl font-black font-mono', stat.color)}>{stat.value}</div>
                  </div>
                  <div className="text-[8px] uppercase tracking-[0.25em] text-white/35 font-black">{stat.label}</div>
                </motion.div>
              ))}
            </motion.div>
          </div>
        </motion.div>
      </div>

      {/* Games Grid */}
      <div className="px-4 md:px-6 pb-8">
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.6 }}
          className="flex items-center justify-between mb-4"
        >
          <h2 className="text-lg font-black uppercase tracking-tight text-white/90">Live Games</h2>
          <span className="text-xs text-white/30 tracking-widest">Swipe to explore</span>
        </motion.div>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {filteredGames.map((game, i) => {
            const disabled = CLIENT_SIDE_UNAVAILABLE_GAMES.has(game.id);
            return (
              <motion.button
                key={game.id}
                initial={{ opacity: 0, y: 30 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: 0.7 + i * 0.1 }}
                whileHover={disabled ? undefined : { y: -6, scale: 1.02 }}
                whileTap={disabled ? undefined : { scale: 0.98 }}
                onClick={() => !disabled && onSelectGame(game.id)}
                disabled={disabled}
                className="relative rounded-2xl overflow-hidden border border-white/10 hover:border-[#00FF88]/50 transition-all duration-300 cursor-pointer group aspect-[9/16] max-h-[400px] shadow-lg shadow-black/20 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <div className="absolute inset-0 bg-gradient-to-t from-[#0a0a15] via-black/20 to-transparent z-10" />
                <img
                  src={game.image}
                  alt={game.name}
                  className="absolute inset-0 w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
                  referrerPolicy="no-referrer"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent z-20" />
                <div className="absolute inset-0 z-30 flex flex-col justify-end p-4">
                  <motion.div 
                    className="absolute top-3 right-3 w-8 h-8 rounded-full bg-[#00FF88]/20 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                  >
                    <ChevronRight className="w-4 h-4 text-[#00FF88]" />
                  </motion.div>
                  <h3 className="text-xl font-black text-white uppercase tracking-tight drop-shadow-lg">{game.name}</h3>
                  <p className="text-xs text-white/60 mt-1 line-clamp-2">
                    {disabled ? 'Temporarily disabled until server-authoritative game logic is implemented.' : game.description}
                  </p>
                  <motion.div 
                    initial={{ width: 0 }}
                    whileHover={{ width: '60%' }}
                    className="h-0.5 bg-[#00FF88] mt-3 rounded-full"
                  />
                </div>
              </motion.button>
            );
          })}
        </div>
      </div>

      {/* Bottom Section */}
      <div className="px-4 md:px-6 pb-8 space-y-4">
        <LiveBetsStrip />
        <RecentActivity onOpenProfile={onOpenProfile} />
      </div>

      {/* News Modal */}
      {showNewsModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/80 backdrop-blur-sm" onClick={() => setShowNewsModal(false)} />
          <motion.div 
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="relative bg-gradient-to-b from-[#1a1a2e] to-[#0a0a15] rounded-3xl border border-white/10 w-full max-w-2xl max-h-[85vh] overflow-hidden shadow-2xl"
          >
            <div className="relative h-48 md:h-64 overflow-hidden">
              <img src="/assets/hero.png" alt="Pasus Released" className="w-full h-full object-cover" />
              <div className="absolute inset-0 bg-gradient-to-t from-[#0a0a15] via-transparent to-transparent" />
              <button 
                onClick={() => setShowNewsModal(false)}
                className="absolute top-4 right-4 w-10 h-10 bg-black/50 backdrop-blur-sm rounded-full flex items-center justify-center text-white/70 hover:text-white hover:bg-black/70 transition-all"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <div className="p-6 md:p-8 overflow-y-auto max-h-[calc(85vh-16rem)]">
              <div className="flex items-center gap-2 mb-4">
                <span className="px-3 py-1 bg-[#00FF88]/20 text-[#00FF88] text-xs font-black uppercase tracking-wider rounded-full">
                  Official Announcement
                </span>
              </div>
              
              <h2 className="text-3xl md:text-4xl font-black text-white mb-4">
                PASUS IS <span className="text-[#00FF88]">LIVE!</span>
              </h2>
              
              <p className="text-white/70 text-lg mb-8 leading-relaxed">
                Welcome to Pasus. Blackjack, Mines, Dices, and Crash are currently live.
              </p>

              {/* Stats */}
              <div className="grid grid-cols-3 gap-4 mb-8">
                <div className="bg-white/5 rounded-2xl p-4 text-center border border-white/5">
                  <div className="text-[#00FF88] text-2xl md:text-3xl font-black mb-1">
                    {isLoadingStats ? '...' : formatNumberCompact(stats.playersOnline)}
                  </div>
                  <div className="text-white/40 text-xs uppercase tracking-wider">Total Users</div>
                </div>
                <div className="bg-white/5 rounded-2xl p-4 text-center border border-white/5">
                  <div className="text-amber-400 text-2xl md:text-3xl font-black mb-1">
                    {isLoadingStats ? '...' : formatMoneyFromCoins(stats.totalWageredToday)}
                  </div>
                  <div className="text-white/40 text-xs uppercase tracking-wider">Wagered Today</div>
                </div>
                <div className="bg-white/5 rounded-2xl p-4 text-center border border-white/5">
                  <div className="text-purple-400 text-2xl md:text-3xl font-black mb-1">
                    {isLoadingStats ? '...' : formatMoneyFromCoins(stats.biggestWin)}
                  </div>
                  <div className="text-white/40 text-xs uppercase tracking-wider">Biggest Win</div>
                </div>
              </div>

              {/* Games */}
              <h3 className="text-xl font-black text-white mb-4 uppercase tracking-tight">
                Current Availability
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-8">
                {[
                  { name: 'Blackjack', desc: 'Classic 21 table game', live: true, gameId: 'blackjack' },
                  { name: 'Mines', desc: 'Pick gems and avoid the bombs', live: true, gameId: 'mines' },
                  { name: 'Dices', desc: 'High and low dice with custom odds', live: true, gameId: 'dice' },
                  { name: 'Crash', desc: 'Cash out before the multiplier crashes', live: true, gameId: 'crash' },
                ].map((game) => (
                  <button
                    key={game.name}
                    onClick={() => {
                      if (game.gameId) {
                        onSelectGame(game.gameId);
                        setShowNewsModal(false);
                      }
                    }}
                    disabled={!game.gameId}
                    className="bg-white/5 hover:bg-white/10 disabled:hover:bg-white/5 border border-white/10 rounded-xl p-4 text-left transition-all group disabled:opacity-60 disabled:cursor-not-allowed"
                  >
                    <div className="flex items-center justify-between mb-1">
                      <div className="text-white font-bold group-hover:text-[#00FF88] transition-colors">{game.name}</div>
                      <span className={cn('text-[10px] font-black uppercase px-2 py-0.5 rounded', game.live ? 'bg-[#00FF88]/20 text-[#00FF88]' : 'bg-red-500/20 text-red-300')}>
                        {game.live ? 'Live' : 'Offline'}
                      </span>
                    </div>
                    <div className="text-white/40 text-xs">{game.desc}</div>
                  </button>
                ))}
              </div>

              {/* Features */}
              <h3 className="text-xl font-black text-white mb-4 uppercase tracking-tight">
                Why Choose Pasus?
              </h3>
              <div className="space-y-3 mb-6">
                {[
                  { icon: Shield, title: 'Fairness Controls', desc: 'Fairness and integrity features are being rebuilt around server-side game settlement' },
                  { icon: Zap, title: 'Payout Processing', desc: 'Deposits, withdrawals, and wallet flows remain available subject to platform review' },
                  { icon: Users, title: 'VIP Club', desc: 'Climb the ranks and unlock exclusive rewards' },
                  { icon: MessageCircle, title: '24/7 Support', desc: 'Our team is always here to help via Featurebase' },
                ].map((feature) => (
                  <div key={feature.title} className="flex items-start gap-4 bg-white/5 rounded-xl p-4 border border-white/5">
                    <div className="w-10 h-10 bg-[#00FF88]/20 rounded-xl flex items-center justify-center flex-shrink-0">
                      <feature.icon className="w-5 h-5 text-[#00FF88]" />
                    </div>
                    <div>
                      <div className="text-white font-bold mb-0.5">{feature.title}</div>
                      <div className="text-white/50 text-sm">{feature.desc}</div>
                    </div>
                  </div>
                ))}
              </div>

              {/* CTA */}
              <div className="text-center pt-4">
                <button
                  onClick={() => setShowNewsModal(false)}
                  className="bg-[#00FF88] text-black px-8 py-4 rounded-full font-black uppercase tracking-wider hover:bg-[#00FF88]/90 transition-all shadow-lg shadow-[#00FF88]/30"
                >
                  Start Playing Now
                </button>
              </div>
            </div>
          </motion.div>
        </div>
      )}
    </motion.div>
  );
};


const ProfileView = () => {
  const { user, setUser, refreshUser } = useAuth();
  const { balance } = useBalance();
  const [robloxUsernameInput, setRobloxUsernameInput] = useState(user?.robloxUsername || '');
  const [robloxPhrase, setRobloxPhrase] = useState('');
  const [robloxProfileUrl, setRobloxProfileUrl] = useState('');
  const [robloxAvatarPreview, setRobloxAvatarPreview] = useState(user?.robloxAvatarUrl || '');
  const [robloxDisplayNamePreview, setRobloxDisplayNamePreview] = useState(user?.robloxDisplayName || '');
  const [robloxError, setRobloxError] = useState('');
  const [robloxSuccess, setRobloxSuccess] = useState('');
  const [isRobloxLoading, setIsRobloxLoading] = useState(false);
  const [copiedPhrase, setCopiedPhrase] = useState(false);

  const [sessions, setSessions] = useState<Array<{ id: number; ipAddress: string; deviceType: string; createdAt: string; lastActiveAt: string; isCurrent: boolean }>>([]);
  const [isLoadingSessions, setIsLoadingSessions] = useState(false);

  const [totpSetup, setTotpSetup] = useState<{ secret: string; qrCodeUrl: string } | null>(null);
  const [totpCode, setTotpCode] = useState('');
  const [totpError, setTotpError] = useState('');
  const [totpSuccess, setTotpSuccess] = useState('');
  const [backupCodes, setBackupCodes] = useState<string[]>([]);
  const [isTotpLoading, setIsTotpLoading] = useState(false);

  const [betExportFrom, setBetExportFrom] = useState('');
  const [betExportTo, setBetExportTo] = useState('');
  const [betExportGame, setBetExportGame] = useState('');
  const [isExporting, setIsExporting] = useState(false);

  const loadSessions = useCallback(async () => {
    const token = localStorage.getItem('pasus_auth_token');
    if (!token) return;
    setIsLoadingSessions(true);
    try {
      const response = await apiFetch('/api/sessions', { headers: { Authorization: `Bearer ${token}` } });
      const data = await response.json().catch(() => ({}));
      if (response.ok && Array.isArray(data.sessions)) {
        setSessions(data.sessions.map((s: any) => ({
          id: Number(s.id),
          ipAddress: s.ipAddress,
          deviceType: s.deviceType,
          createdAt: s.createdAt,
          lastActiveAt: s.lastActiveAt,
          isCurrent: s.isCurrent,
        })));
      }
    } catch {} finally {
      setIsLoadingSessions(false);
    }
  }, []);

  const revokeSession = async (sessionId: number) => {
    const token = localStorage.getItem('pasus_auth_token');
    if (!token) return;
    try {
      const response = await apiFetch(`/api/sessions/${sessionId}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });
      if (response.ok) {
        setSessions(prev => prev.filter(s => s.id !== sessionId));
      }
    } catch {}
  };

  const revokeAllOtherSessions = async () => {
    const token = localStorage.getItem('pasus_auth_token');
    if (!token) return;
    try {
      const response = await apiFetch('/api/sessions', {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });
      if (response.ok) {
        setSessions(prev => prev.filter(s => s.isCurrent));
      }
    } catch {}
  };

  const startTotpSetup = async () => {
    const token = localStorage.getItem('pasus_auth_token');
    if (!token) return;
    setIsTotpLoading(true);
    setTotpError('');
    setTotpSuccess('');
    try {
      const response = await apiFetch('/api/2fa/setup', { headers: { Authorization: `Bearer ${token}` } });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data.error || 'Failed to setup 2FA');
      setTotpSetup({ secret: data.secret, qrCodeUrl: data.qrCodeUrl });
    } catch (err) {
      setTotpError(err instanceof Error ? err.message : 'Failed to setup 2FA');
    } finally {
      setIsTotpLoading(false);
    }
  };

  const verifyTotpSetup = async () => {
    const token = localStorage.getItem('pasus_auth_token');
    if (!token || !totpCode.trim()) return;
    setIsTotpLoading(true);
    setTotpError('');
    setTotpSuccess('');
    try {
      const response = await apiFetch('/api/2fa/verify-setup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ code: totpCode.trim() }),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data.error || 'Failed to verify 2FA');
      setUser(data.user);
      setBackupCodes(data.backupCodes || []);
      setTotpSetup(null);
      setTotpCode('');
      setTotpSuccess('2FA enabled! Save your backup codes.');
    } catch (err) {
      setTotpError(err instanceof Error ? err.message : 'Failed to verify 2FA');
    } finally {
      setIsTotpLoading(false);
    }
  };

  const disableTotp = async () => {
    const token = localStorage.getItem('pasus_auth_token');
    if (!token || !totpCode.trim()) return;
    if (!confirm('Disable 2FA? This will remove the authenticator protection.')) return;
    setIsTotpLoading(true);
    setTotpError('');
    try {
      const response = await apiFetch('/api/2fa/disable', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ code: totpCode.trim() }),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data.error || 'Failed to disable 2FA');
      setUser(data.user);
      setTotpCode('');
      setTotpSuccess('2FA has been disabled.');
    } catch (err) {
      setTotpError(err instanceof Error ? err.message : 'Failed to disable 2FA');
    } finally {
      setIsTotpLoading(false);
    }
  };

  const exportBets = async (format: 'csv' | 'json') => {
    const token = localStorage.getItem('pasus_auth_token');
    if (!token) return;
    setIsExporting(true);
    try {
      const params = new URLSearchParams();
      if (betExportFrom) params.set('from', betExportFrom);
      if (betExportTo) params.set('to', betExportTo);
      if (betExportGame) params.set('gameKey', betExportGame);
      params.set('format', format);

      const response = await fetch(`/api/activity/bets/export?${params}`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (format === 'csv') {
        const blob = await response.blob();
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `bet-history-${new Date().toISOString().slice(0, 10)}.csv`;
        a.click();
        URL.revokeObjectURL(url);
      }
    } catch {} finally {
      setIsExporting(false);
    }
  };

  useEffect(() => {
    loadSessions();
  }, [loadSessions]);

  useEffect(() => {
    const token = localStorage.getItem('pasus_auth_token');
    if (!token) {
      return;
    }

    apiFetch('/api/roblox/link/status', {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    })
      .then((response) => response.json().then((data) => ({ ok: response.ok, data })).catch(() => ({ ok: response.ok, data: {} })))
      .then(({ ok, data }) => {
        if (!ok || !data.roblox) {
          return;
        }

        setRobloxPhrase(data.roblox.pendingPhrase || '');
        setRobloxUsernameInput(data.roblox.username || user?.robloxUsername || '');
        setRobloxAvatarPreview(data.roblox.avatarUrl || user?.robloxAvatarUrl || '');
        setRobloxDisplayNamePreview(data.roblox.displayName || user?.robloxDisplayName || '');
        setRobloxProfileUrl(data.roblox.userId ? `https://www.roblox.com/users/${data.roblox.userId}/profile` : '');
      })
      .catch(() => undefined);
  }, [user?.robloxUsername, user?.robloxAvatarUrl, user?.robloxDisplayName]);

  const getDeviceIcon = (deviceType: string) => {
    if (deviceType === 'Mobile') return <Smartphone size={14} />;
    if (deviceType === 'Tablet') return <Tablet size={14} />;
    return <Monitor size={14} />;
  };

  useEffect(() => {
    const token = localStorage.getItem('pasus_auth_token');
    if (!token) {
      return;
    }

    apiFetch('/api/roblox/link/status', {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    })
      .then((response) => response.json().then((data) => ({ ok: response.ok, data })).catch(() => ({ ok: response.ok, data: {} })))
      .then(({ ok, data }) => {
        if (!ok || !data.roblox) {
          return;
        }

        setRobloxPhrase(data.roblox.pendingPhrase || '');
        setRobloxUsernameInput(data.roblox.username || user?.robloxUsername || '');
        setRobloxAvatarPreview(data.roblox.avatarUrl || user?.robloxAvatarUrl || '');
        setRobloxDisplayNamePreview(data.roblox.displayName || user?.robloxDisplayName || '');
        setRobloxProfileUrl(data.roblox.userId ? `https://www.roblox.com/users/${data.roblox.userId}/profile` : '');
      })
      .catch(() => undefined);
  }, [user?.robloxUsername, user?.robloxAvatarUrl, user?.robloxDisplayName]);

  const startRobloxVerification = async () => {
    const token = localStorage.getItem('pasus_auth_token');
    if (!token) {
      return;
    }

    try {
      setIsRobloxLoading(true);
      setRobloxError('');
      setRobloxSuccess('');

      const response = await apiFetch('/api/roblox/link/start', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ username: robloxUsernameInput.trim() }),
      });
      const data = await response.json().catch(() => ({}));

      if (!response.ok) {
        throw new Error(data.error || 'Failed to start Roblox verification.');
      }

      setRobloxPhrase(data.roblox.pendingPhrase || '');
      setRobloxProfileUrl(data.roblox.profileUrl || '');
      setRobloxAvatarPreview(data.roblox.avatarUrl || '');
      setRobloxDisplayNamePreview(data.roblox.displayName || '');
      setRobloxSuccess('Verification phrase created. Put it in your Roblox profile description, then click verify.');
    } catch (error) {
      setRobloxError(error instanceof Error ? error.message : 'Failed to start Roblox verification.');
    } finally {
      setIsRobloxLoading(false);
    }
  };

  const verifyRobloxLink = async () => {
    const token = localStorage.getItem('pasus_auth_token');
    if (!token) {
      return;
    }

    try {
      setIsRobloxLoading(true);
      setRobloxError('');
      setRobloxSuccess('');

      const response = await apiFetch('/api/roblox/link/verify', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      const data = await response.json().catch(() => ({}));

      if (!response.ok) {
        throw new Error(data.error || 'Failed to verify Roblox account.');
      }

      setUser(data.user);
      setRobloxPhrase('');
      setRobloxAvatarPreview(data.user?.robloxAvatarUrl || '');
      setRobloxDisplayNamePreview(data.user?.robloxDisplayName || '');
      setRobloxUsernameInput(data.user?.robloxUsername || robloxUsernameInput);
      setRobloxSuccess('Roblox account verified and linked to your Pasus profile.');
      await refreshUser();
    } catch (error) {
      setRobloxError(error instanceof Error ? error.message : 'Failed to verify Roblox account.');
    } finally {
      setIsRobloxLoading(false);
    }
  };

  const copyRobloxPhrase = async () => {
    if (!robloxPhrase) {
      return;
    }

    try {
      await navigator.clipboard.writeText(robloxPhrase);
      setCopiedPhrase(true);
      window.setTimeout(() => setCopiedPhrase(false), 1800);
    } catch {
      setCopiedPhrase(false);
    }
  };
  
  return (
    <div className="p-6 lg:p-10 max-w-4xl mx-auto space-y-10">
      <div className="flex flex-col md:flex-row items-center gap-8 bg-[#1a1d23] border border-white/10 rounded-[40px] p-10 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-64 h-64 bg-[#00FF88] opacity-5 blur-[100px] -mr-32 -mt-32" />
        <div className="w-32 h-32 rounded-full border-4 border-[#00FF88]/20 p-1 relative z-10">
          <img src={getPreferredAvatar(user)} alt="Avatar" className="w-full h-full rounded-full object-cover" />
        </div>
        <div className="flex-1 text-center md:text-left relative z-10">
          <h2 className="text-4xl font-black italic uppercase tracking-tighter mb-2">{user?.username}</h2>
          <div className="text-white/40 font-bold text-sm mb-6">{user?.email}</div>
          <div className="flex flex-wrap justify-center md:justify-start gap-4">
            <div className="bg-black/40 border border-white/5 rounded-2xl px-6 py-3">
              <div className="text-[10px] font-black uppercase tracking-widest text-white/20 mb-1">Total Balance</div>
              <AnimatedBalanceDisplay balance={balance} className="text-xl" />
            </div>
            <div className="bg-black/40 border border-white/5 rounded-2xl px-6 py-3">
              <div className="text-[10px] font-black uppercase tracking-widest text-white/20 mb-1">Live Games</div>
              <div className="font-mono font-bold text-white text-xl">1</div>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-[#1a1d23] border border-white/10 rounded-3xl p-8 space-y-6">
          <h3 className="text-lg font-black italic uppercase tracking-tighter flex items-center gap-3">
            <TrendingUp className="text-[#00FF88]" size={20} />
            Statistics
          </h3>
          <div className="space-y-4">
            {[
              { label: 'Account Data', value: 'Live' },
              { label: 'Wallet Sync', value: 'Connected' },
              { label: 'Game Availability', value: 'Jackpot only', color: 'text-[#00FF88]' },
              { label: 'Integrity Status', value: 'Rebuild in progress' },
            ].map((stat, i) => (
              <div key={i} className="flex items-center justify-between py-3 border-b border-white/5 last:border-0">
                <span className="text-xs font-bold text-white/40">{stat.label}</span>
                <span className={cn("text-sm font-mono font-bold", stat.color || "text-white")}>{stat.value}</span>
              </div>
            ))}
          </div>
        </div>
        <div className="bg-[#1a1d23] border border-white/10 rounded-3xl p-8 space-y-6">
          <h3 className="text-lg font-black italic uppercase tracking-tighter flex items-center gap-3">
            <Shield className="text-[#00FF88]" size={20} />
            Security
          </h3>
          <div className="space-y-4">
            <div className="p-4 bg-black/40 rounded-2xl border border-white/5 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <KeyRound size={18} className="text-white/40" />
                <div>
                  <div className="text-xs font-bold mb-1">Two-Factor Auth</div>
                  <div className="text-[10px] text-white/20 font-bold">{user?.totpEnabled ? 'Enabled' : 'Protect your account with 2FA'}</div>
                </div>
              </div>
              <div className={cn("w-12 h-6 rounded-full relative", user?.totpEnabled ? 'bg-[#00FF88]' : 'bg-white/5')}>
                <div className={cn("absolute top-1 w-4 h-4 rounded-full", user?.totpEnabled ? 'left-[22px] bg-black' : 'left-1 bg-white/20')} />
              </div>
            </div>
            {user?.totpEnabled ? (
              <>
                <button onClick={startTotpSetup} disabled={isTotpLoading} className="w-full py-3 bg-white/5 hover:bg-white/10 rounded-2xl text-xs font-bold transition-all">
                  {isTotpLoading ? 'Loading...' : 'Manage 2FA'}
                </button>
                {totpSetup ? (
                  <div className="rounded-2xl border border-white/10 bg-black/40 p-4 space-y-4">
                    <div className="text-xs font-bold text-[#00FF88]">Scan this QR code with your authenticator app:</div>
                    <div className="flex justify-center">
                      <img src={`https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=${encodeURIComponent(totpSetup.qrCodeUrl)}`} alt="QR Code" className="w-32 h-32" />
                    </div>
                    <div className="text-[10px] text-white/40 font-mono break-all">Secret: {totpSetup.secret}</div>
                    <input type="text" value={totpCode} onChange={(e) => setTotpCode(e.target.value)} placeholder="Enter 6-digit code" maxLength={6} className="w-full rounded-xl border border-white/10 bg-black/30 px-4 py-3 text-sm text-center font-mono tracking-widest focus:outline-none" />
                    <button onClick={verifyTotpSetup} disabled={isTotpLoading || totpCode.length !== 6} className="w-full py-3 bg-[#00FF88] text-black rounded-2xl text-xs font-bold disabled:opacity-40">
                      {isTotpLoading ? 'Verifying...' : 'Verify & Enable'}
                    </button>
                  </div>
                ) : null}
              </>
            ) : (
              <>
                <button onClick={startTotpSetup} disabled={isTotpLoading} className="w-full py-3 bg-[#00FF88] hover:bg-[#00FF88]/90 text-black rounded-2xl text-xs font-bold transition-all">
                  {isTotpLoading ? 'Loading...' : 'Enable 2FA'}
                </button>
                {totpSetup ? (
                  <div className="rounded-2xl border border-white/10 bg-black/40 p-4 space-y-4">
                    <div className="text-xs font-bold text-[#00FF88]">Scan this QR code with your authenticator app:</div>
                    <div className="flex justify-center">
                      <img src={`https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=${encodeURIComponent(totpSetup.qrCodeUrl)}`} alt="QR Code" className="w-32 h-32" />
                    </div>
                    <div className="text-[10px] text-white/40 font-mono break-all">Manual code: {totpSetup.secret}</div>
                    <input type="text" value={totpCode} onChange={(e) => setTotpCode(e.target.value)} placeholder="Enter 6-digit code" maxLength={6} className="w-full rounded-xl border border-white/10 bg-black/30 px-4 py-3 text-sm text-center font-mono tracking-widest focus:outline-none" />
                    <button onClick={verifyTotpSetup} disabled={isTotpLoading || totpCode.length !== 6} className="w-full py-3 bg-[#00FF88] text-black rounded-2xl text-xs font-bold disabled:opacity-40">
                      {isTotpLoading ? 'Verifying...' : 'Verify & Enable'}
                    </button>
                  </div>
                ) : null}
              </>
            )}
            {totpError ? <div className="text-xs text-red-300">{totpError}</div> : null}
            {totpSuccess ? (
              <div className="rounded-2xl border border-[#00FF88]/20 bg-[#00FF88]/10 p-4 space-y-2">
                <div className="text-xs font-bold text-[#00FF88]">{totpSuccess}</div>
                {backupCodes.length > 0 && (
                  <div className="space-y-1">
                    <div className="text-[10px] text-white/50">Backup codes (save these!):</div>
                    {backupCodes.map((code, i) => <div key={i} className="text-xs font-mono text-white/70">{code}</div>)}
                    <button onClick={() => { navigator.clipboard.writeText(backupCodes.join('\n')); setTotpSuccess('Backup codes copied!'); }} className="mt-2 text-[10px] text-[#00FF88] underline">Copy codes</button>
                  </div>
                )}
              </div>
            ) : null}
            <button onClick={() => setUser((prev: any) => ({ ...prev, totpEnabled: false }))} className="w-full py-3 bg-white/5 hover:bg-white/10 rounded-2xl text-xs font-bold transition-all">
              Change Password
            </button>
          </div>
        </div>
      </div>

      <div className="bg-[#1a1d23] border border-white/10 rounded-3xl p-8 space-y-6">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-black italic uppercase tracking-tighter flex items-center gap-3">
            <History className="text-[#00FF88]" size={20} />
            Active Sessions
          </h3>
          <button onClick={revokeAllOtherSessions} className="text-[10px] font-bold text-red-400 hover:text-red-300 transition-colors">
            Revoke All Others
          </button>
        </div>
        <div className="space-y-3">
          {isLoadingSessions ? (
            <div className="text-sm text-white/40">Loading sessions...</div>
          ) : sessions.length > 0 ? sessions.map((session) => (
            <div key={session.id} className="flex items-center justify-between p-4 bg-black/40 rounded-2xl border border-white/5">
              <div className="flex items-center gap-4">
                <div className="w-10 h-10 rounded-xl bg-white/5 flex items-center justify-center text-white/40">
                  {getDeviceIcon(session.deviceType)}
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold">{session.deviceType}</span>
                    {session.isCurrent && <span className="text-[10px] px-2 py-0.5 bg-[#00FF88]/20 text-[#00FF88] rounded-full font-bold">Current</span>}
                  </div>
                  <div className="text-[10px] text-white/40 mt-1">
                    {session.ipAddress} • Last active: {new Date(session.lastActiveAt).toLocaleString()}
                  </div>
                </div>
              </div>
              {!session.isCurrent && (
                <button onClick={() => revokeSession(session.id)} className="p-2 hover:bg-red-500/10 rounded-xl text-red-400 transition-colors">
                  <Trash2 size={14} />
                </button>
              )}
            </div>
          )) : (
            <div className="text-sm text-white/40">No active sessions found.</div>
          )}
        </div>
      </div>

      <div className="bg-[#1a1d23] border border-white/10 rounded-3xl p-8 space-y-6">
        <h3 className="text-lg font-black italic uppercase tracking-tighter flex items-center gap-3">
          <Download className="text-[#00FF88]" size={20} />
          Export Bet History
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="space-y-2">
            <label className="text-[10px] font-black uppercase tracking-[0.2em] text-white/30">From Date</label>
            <input type="date" value={betExportFrom} onChange={(e) => setBetExportFrom(e.target.value)} className="w-full rounded-xl border border-white/10 bg-black/30 px-4 py-3 text-sm focus:outline-none" />
          </div>
          <div className="space-y-2">
            <label className="text-[10px] font-black uppercase tracking-[0.2em] text-white/30">To Date</label>
            <input type="date" value={betExportTo} onChange={(e) => setBetExportTo(e.target.value)} className="w-full rounded-xl border border-white/10 bg-black/30 px-4 py-3 text-sm focus:outline-none" />
          </div>
          <div className="space-y-2">
            <label className="text-[10px] font-black uppercase tracking-[0.2em] text-white/30">Game (optional)</label>
            <input type="text" value={betExportGame} onChange={(e) => setBetExportGame(e.target.value)} placeholder="e.g. crash" className="w-full rounded-xl border border-white/10 bg-black/30 px-4 py-3 text-sm focus:outline-none" />
          </div>
        </div>
        <div className="flex gap-3">
          <button onClick={() => exportBets('csv')} disabled={isExporting} className="flex-1 py-3 bg-[#00FF88] text-black rounded-2xl text-xs font-bold flex items-center justify-center gap-2 disabled:opacity-40">
            {isExporting ? <LoaderCircle size={14} className="animate-spin" /> : <Download size={14} />}
            Export CSV
          </button>
          <button onClick={() => exportBets('json')} disabled={isExporting} className="flex-1 py-3 bg-white/10 hover:bg-white/15 rounded-2xl text-xs font-bold flex items-center justify-center gap-2 disabled:opacity-40">
            {isExporting ? <LoaderCircle size={14} className="animate-spin" /> : <Download size={14} />}
            Export JSON
          </button>
        </div>
      </div>

      <div className="bg-[#1a1d23] border border-white/10 rounded-3xl p-8 space-y-6">
        <div className="flex items-center justify-between gap-4">
          <div>
            <h3 className="text-lg font-black italic uppercase tracking-tighter flex items-center gap-3">
              <User className="text-[#00FF88]" size={20} />
              Roblox Link
            </h3>
            <div className="text-xs text-white/35 mt-2">Link your Roblox profile safely by placing a Pasus verification phrase in your Roblox profile description.</div>
          </div>
          {user?.robloxVerifiedAt ? (
            <div className="rounded-2xl border border-[#00FF88]/20 bg-[#00FF88]/10 px-4 py-2 text-xs font-black uppercase tracking-[0.16em] text-[#00FF88]">
              Verified
            </div>
          ) : null}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-[1.2fr_0.8fr] gap-6">
          <div className="space-y-4">
            <div className="space-y-2">
              <label className="text-[10px] font-black uppercase tracking-[0.2em] text-white/20 ml-2">Roblox Username</label>
              <div className="flex gap-3">
                <input
                  type="text"
                  value={robloxUsernameInput}
                  onChange={(e) => setRobloxUsernameInput(e.target.value)}
                  placeholder="Enter Roblox username"
                  className="flex-1 rounded-2xl border border-white/10 bg-black/30 px-4 py-3 text-sm text-white placeholder:text-white/20 focus:outline-none focus:border-[#00FF88]/30"
                />
                <button
                  onClick={startRobloxVerification}
                  disabled={isRobloxLoading || !robloxUsernameInput.trim()}
                  className="rounded-2xl bg-[#00FF88] text-black px-5 py-3 text-xs font-black uppercase tracking-[0.18em] disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  {isRobloxLoading ? 'Loading...' : 'Start'}
                </button>
              </div>
            </div>

            {robloxPhrase ? (
              <div className="rounded-3xl border border-white/10 bg-black/30 p-5 space-y-4">
                <div className="text-[10px] uppercase tracking-[0.2em] text-[#00FF88] font-black">Verification Phrase</div>
                <div className="rounded-2xl border border-white/10 bg-black/40 px-4 py-4 font-mono text-sm text-white break-all">{robloxPhrase}</div>
                <div className="flex flex-wrap gap-3">
                  <button
                    onClick={copyRobloxPhrase}
                    className="rounded-2xl bg-white/5 hover:bg-white/10 px-4 py-3 text-xs font-black uppercase tracking-[0.16em] transition-colors"
                  >
                    {copiedPhrase ? 'Copied' : 'Copy Phrase'}
                  </button>
                  {robloxProfileUrl ? (
                    <a
                      href={robloxProfileUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="rounded-2xl bg-white/5 hover:bg-white/10 px-4 py-3 text-xs font-black uppercase tracking-[0.16em] transition-colors"
                    >
                      Open Roblox
                    </a>
                  ) : null}
                  <button
                    onClick={verifyRobloxLink}
                    disabled={isRobloxLoading}
                    className="rounded-2xl bg-[#00FF88] text-black px-4 py-3 text-xs font-black uppercase tracking-[0.16em] disabled:opacity-40 disabled:cursor-not-allowed"
                  >
                    Verify
                  </button>
                </div>
                <div className="text-xs text-white/45 leading-relaxed">
                  Put the phrase above into your Roblox profile description exactly, save it on Roblox, then come back and click verify.
                </div>
              </div>
            ) : null}

            {robloxError ? <div className="text-sm text-red-300">{robloxError}</div> : null}
            {robloxSuccess ? <div className="text-sm text-[#00FF88]">{robloxSuccess}</div> : null}
          </div>

          <div className="rounded-3xl border border-white/10 bg-black/30 p-5 space-y-4">
            <div className="text-[10px] uppercase tracking-[0.2em] text-white/20 font-black">Linked Profile</div>
            <div className="flex items-center gap-4">
              <div className="w-16 h-16 rounded-2xl overflow-hidden border border-white/10 bg-white/5">
                {(user?.robloxAvatarUrl || robloxAvatarPreview) ? (
                  <img
                    src={user?.robloxAvatarUrl || robloxAvatarPreview}
                    alt="Roblox Avatar"
                    className="w-full h-full object-cover"
                  />
                ) : null}
              </div>
              <div className="min-w-0">
                <div className="text-sm font-black truncate">{user?.robloxDisplayName || robloxDisplayNamePreview || 'Not linked yet'}</div>
                <div className="text-xs text-white/40 truncate">
                  {user?.robloxUsername || robloxUsernameInput || 'Connect a Roblox account to link it here.'}
                </div>
              </div>
            </div>
            <div className="space-y-2 text-xs text-white/45">
              <div>Verified at: {user?.robloxVerifiedAt ? new Date(user.robloxVerifiedAt).toLocaleString() : 'Not verified'}</div>
              <div>Profile linking uses your public Roblox profile description only. No cookies, passwords, or session tokens are collected.</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

const ConnectionsView = () => {
  const { user, setUser, refreshUser } = useAuth();
  const [robloxUsernameInput, setRobloxUsernameInput] = useState(user?.robloxUsername || '');
  const [robloxPhrase, setRobloxPhrase] = useState('');
  const [robloxProfileUrl, setRobloxProfileUrl] = useState('');
  const [robloxAvatarPreview, setRobloxAvatarPreview] = useState(user?.robloxAvatarUrl || '');
  const [robloxDisplayNamePreview, setRobloxDisplayNamePreview] = useState(user?.robloxDisplayName || '');
  const [discordStatus, setDiscordStatus] = useState({
    userId: user?.discordUserId || '',
    username: user?.discordUsername || '',
    displayName: user?.discordDisplayName || '',
    avatarUrl: user?.discordAvatarUrl || '',
    verifiedAt: user?.discordVerifiedAt || '',
  });
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [copiedPhrase, setCopiedPhrase] = useState(false);

  useEffect(() => {
    const token = localStorage.getItem('pasus_auth_token');
    if (!token) {
      return;
    }

    Promise.all([
      apiFetch('/api/roblox/link/status', { headers: { Authorization: `Bearer ${token}` } }).then((r) => r.json().catch(() => ({}))),
      apiFetch('/api/discord/link/status', { headers: { Authorization: `Bearer ${token}` } }).then((r) => r.json().catch(() => ({}))),
    ])
      .then(([robloxData, discordData]) => {
        if (robloxData.roblox) {
          setRobloxPhrase(robloxData.roblox.pendingPhrase || '');
          setRobloxUsernameInput(robloxData.roblox.username || user?.robloxUsername || '');
          setRobloxAvatarPreview(robloxData.roblox.avatarUrl || user?.robloxAvatarUrl || '');
          setRobloxDisplayNamePreview(robloxData.roblox.displayName || user?.robloxDisplayName || '');
          setRobloxProfileUrl(robloxData.roblox.userId ? `https://www.roblox.com/users/${robloxData.roblox.userId}/profile` : '');
        }
        if (discordData.discord) {
          setDiscordStatus({
            userId: discordData.discord.userId || '',
            username: discordData.discord.username || '',
            displayName: discordData.discord.displayName || '',
            avatarUrl: discordData.discord.avatarUrl || '',
            verifiedAt: discordData.discord.verifiedAt || '',
          });
        }
      })
      .catch(() => undefined);

    const params = new URLSearchParams(window.location.search);
    const connectionStatus = params.get('connections');
    if (connectionStatus === 'discord-linked') {
      setSuccess('Discord account connected.');
      refreshUser().catch(() => undefined);
      window.history.replaceState({}, '', window.location.pathname);
    } else if (connectionStatus === 'discord-taken') {
      setError('That Discord account is already linked to another Pasus user.');
      window.history.replaceState({}, '', window.location.pathname);
    } else if (connectionStatus === 'discord-error') {
      setError('Discord connection failed.');
      window.history.replaceState({}, '', window.location.pathname);
    }
  }, [refreshUser, user?.discordAvatarUrl, user?.discordDisplayName, user?.discordUsername, user?.robloxAvatarUrl, user?.robloxDisplayName, user?.robloxUsername]);

  const startRobloxVerification = async () => {
    const token = localStorage.getItem('pasus_auth_token');
    if (!token) return;
    try {
      setIsLoading(true);
      setError('');
      setSuccess('');
      const response = await apiFetch('/api/roblox/link/start', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ username: robloxUsernameInput.trim() }),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data.error || 'Failed to start Roblox verification.');
      setRobloxPhrase(data.roblox.pendingPhrase || '');
      setRobloxProfileUrl(data.roblox.profileUrl || '');
      setRobloxAvatarPreview(data.roblox.avatarUrl || '');
      setRobloxDisplayNamePreview(data.roblox.displayName || '');
      setSuccess('Roblox phrase generated. Add it to your Roblox description and click verify.');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to start Roblox verification.');
    } finally {
      setIsLoading(false);
    }
  };

  const verifyRobloxLink = async () => {
    const token = localStorage.getItem('pasus_auth_token');
    if (!token) return;
    try {
      setIsLoading(true);
      setError('');
      setSuccess('');
      const response = await apiFetch('/api/roblox/link/verify', {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data.error || 'Failed to verify Roblox account.');
      setUser(data.user);
      setRobloxPhrase('');
      setSuccess('Roblox account connected.');
      await refreshUser();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to verify Roblox account.');
    } finally {
      setIsLoading(false);
    }
  };

  const startDiscordConnect = async () => {
    const token = localStorage.getItem('pasus_auth_token');
    if (!token) return;
    try {
      setIsLoading(true);
      setError('');
      setSuccess('');
      const response = await apiFetch('/api/discord/link/start', {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data.error || 'Failed to start Discord connection.');
      if (data.url) {
        window.location.href = data.url;
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to start Discord connection.');
      setIsLoading(false);
    }
  };

  const copyPhrase = async () => {
    if (!robloxPhrase) return;
    try {
      await navigator.clipboard.writeText(robloxPhrase);
      setCopiedPhrase(true);
      window.setTimeout(() => setCopiedPhrase(false), 1500);
    } catch {}
  };

  return (
    <div className="p-6 lg:p-10 max-w-5xl mx-auto space-y-8">
      <div className="space-y-2">
        <h2 className="text-3xl font-black italic uppercase tracking-tighter">Connections</h2>
        <p className="text-white/40 text-sm font-medium">Link Roblox and Discord. Connected accounts can supply your Pasus profile picture.</p>
      </div>

      {error ? <div className="rounded-2xl border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm text-red-300">{error}</div> : null}
      {success ? <div className="rounded-2xl border border-[#00FF88]/20 bg-[#00FF88]/10 px-4 py-3 text-sm text-[#00FF88]">{success}</div> : null}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-[#1a1d23] border border-white/10 rounded-3xl p-8 space-y-5">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-lg font-black italic uppercase tracking-tighter">Roblox</div>
              <div className="text-xs text-white/35 mt-1">Verify by placing a Pasus phrase in your Roblox profile description.</div>
            </div>
            {user?.robloxVerifiedAt ? <div className="text-xs font-black uppercase tracking-[0.16em] text-[#00FF88]">Connected</div> : null}
          </div>
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 rounded-2xl overflow-hidden border border-white/10 bg-white/5">
              {(user?.robloxAvatarUrl || robloxAvatarPreview) ? <img src={user?.robloxAvatarUrl || robloxAvatarPreview} alt="Roblox Avatar" className="w-full h-full object-cover" /> : null}
            </div>
            <div className="min-w-0">
              <div className="text-sm font-black truncate">{user?.robloxDisplayName || robloxDisplayNamePreview || 'Not connected'}</div>
              <div className="text-xs text-white/40 truncate">{user?.robloxUsername || robloxUsernameInput || 'Roblox username'}</div>
            </div>
          </div>
          <div className="flex gap-3">
            <input
              type="text"
              value={robloxUsernameInput}
              onChange={(e) => setRobloxUsernameInput(e.target.value)}
              placeholder="Roblox username"
              className="flex-1 rounded-2xl border border-white/10 bg-black/30 px-4 py-3 text-sm text-white placeholder:text-white/20 focus:outline-none"
            />
            <button onClick={startRobloxVerification} disabled={isLoading || !robloxUsernameInput.trim()} className="rounded-2xl bg-[#00FF88] text-black px-5 py-3 text-xs font-black uppercase tracking-[0.16em] disabled:opacity-40">
              Start
            </button>
          </div>
          {robloxPhrase ? (
            <div className="rounded-2xl border border-white/10 bg-black/30 p-4 space-y-3">
              <div className="text-[10px] uppercase tracking-[0.2em] text-[#00FF88] font-black">Phrase</div>
              <div className="font-mono text-sm break-all">{robloxPhrase}</div>
              <div className="flex gap-3">
                <button onClick={copyPhrase} className="rounded-2xl bg-white/5 hover:bg-white/10 px-4 py-3 text-xs font-black uppercase tracking-[0.16em]">{copiedPhrase ? 'Copied' : 'Copy'}</button>
                {robloxProfileUrl ? <a href={robloxProfileUrl} target="_blank" rel="noreferrer" className="rounded-2xl bg-white/5 hover:bg-white/10 px-4 py-3 text-xs font-black uppercase tracking-[0.16em]">Open Roblox</a> : null}
                <button onClick={verifyRobloxLink} disabled={isLoading} className="rounded-2xl bg-[#00FF88] text-black px-4 py-3 text-xs font-black uppercase tracking-[0.16em] disabled:opacity-40">Verify</button>
              </div>
            </div>
          ) : null}
        </div>

        <div className="bg-[#1a1d23] border border-white/10 rounded-3xl p-8 space-y-5">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-lg font-black italic uppercase tracking-tighter">Discord</div>
              <div className="text-xs text-white/35 mt-1">Connect through Discord OAuth. Pasus stores your public Discord identity only.</div>
            </div>
            {user?.discordVerifiedAt ? <div className="text-xs font-black uppercase tracking-[0.16em] text-[#00FF88]">Connected</div> : null}
          </div>
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 rounded-2xl overflow-hidden border border-white/10 bg-white/5">
              {(user?.discordAvatarUrl || discordStatus.avatarUrl) ? <img src={user?.discordAvatarUrl || discordStatus.avatarUrl} alt="Discord Avatar" className="w-full h-full object-cover" /> : null}
            </div>
            <div className="min-w-0">
              <div className="text-sm font-black truncate">{user?.discordDisplayName || discordStatus.displayName || 'Not connected'}</div>
              <div className="text-xs text-white/40 truncate">{user?.discordUsername || discordStatus.username || 'Discord account'}</div>
            </div>
          </div>
          <div className="text-xs text-white/40">After connecting, Discord becomes the preferred Pasus profile image source unless you disconnect or replace it.</div>
          <button onClick={startDiscordConnect} disabled={isLoading} className="rounded-2xl bg-[#5865F2] text-white px-5 py-3 text-xs font-black uppercase tracking-[0.16em] disabled:opacity-40">
            Connect Discord
          </button>
        </div>
      </div>
    </div>
  );
};

const SettingsView = () => {
  const { user, updatePreferences } = useAuth();
  const currencies = ['USD', 'EUR', 'GBP', 'JPY', 'CAD'];
  const [currency, setCurrency] = useState(user?.currency || 'USD');
  const [avatarSource, setAvatarSource] = useState<'custom' | 'roblox' | 'discord'>(user?.avatarSource || 'custom');
  const [customAvatarUrl, setCustomAvatarUrl] = useState(user?.customAvatarUrl || '');
  const [isSaving, setIsSaving] = useState(false);
  const [status, setStatus] = useState('');

  useEffect(() => {
    setCurrency(user?.currency || 'USD');
    setAvatarSource(user?.avatarSource || 'custom');
    setCustomAvatarUrl(user?.customAvatarUrl || '');
  }, [user?.currency, user?.avatarSource, user?.customAvatarUrl]);

  const savePreferences = async () => {
    try {
      setIsSaving(true);
      setStatus('');
      await updatePreferences({
        currency,
        avatarSource,
        customAvatarUrl,
      });
      setStatus('Preferences saved.');
    } catch (error) {
      setStatus(error instanceof Error ? error.message : 'Failed to save preferences.');
    } finally {
      setIsSaving(false);
    }
  };

  const avatarOptions: Array<{ key: 'custom' | 'roblox' | 'discord'; title: string; image: string; subtitle: string; disabled?: boolean }> = [
    {
      key: 'custom',
      title: 'Custom',
      image: customAvatarUrl || user?.avatar || '',
      subtitle: customAvatarUrl ? 'Using custom URL' : 'Fallback site avatar',
    },
    {
      key: 'roblox',
      title: 'Roblox',
      image: user?.robloxAvatarUrl || '',
      subtitle: user?.robloxDisplayName || user?.robloxUsername || 'Not connected',
      disabled: !user?.robloxAvatarUrl,
    },
    {
      key: 'discord',
      title: 'Discord',
      image: user?.discordAvatarUrl || '',
      subtitle: user?.discordDisplayName || user?.discordUsername || 'Not connected',
      disabled: !user?.discordAvatarUrl,
    },
  ];

  return (
    <div className="p-6 lg:p-10 max-w-2xl mx-auto space-y-10">
      <div className="space-y-2">
        <h2 className="text-3xl font-black italic uppercase tracking-tighter">Settings</h2>
        <p className="text-white/40 text-sm font-medium">Manage your account preferences, currency, and profile image source</p>
      </div>

      <div className="bg-[#1a1d23] border border-white/10 rounded-3xl p-8 space-y-8">
        <div className="space-y-4">
          <label className="text-[10px] font-black uppercase tracking-[0.2em] text-white/20 ml-2">Display Currency</label>
          <div className="grid grid-cols-3 gap-3">
            {currencies.map(curr => (
              <button
                key={curr}
                onClick={() => setCurrency(curr)}
                className={cn(
                  "py-4 rounded-2xl border font-bold text-sm transition-all",
                  currency === curr 
                    ? "bg-[#00FF88] text-black border-[#00FF88]" 
                    : "bg-black/40 border-white/5 text-white/40 hover:border-white/10"
                )}
              >
                {curr}
              </button>
              ))}
          </div>
          <div className="rounded-3xl border border-white/10 bg-black/40 p-5">
            <div className="text-[10px] font-black uppercase tracking-[0.2em] text-white/20">Preview</div>
            <div className="mt-4 grid grid-cols-1 sm:grid-cols-3 gap-3">
              {[
                { label: 'Balance', amount: 100 },
                { label: 'Small Win', amount: 250 },
                { label: 'Big Cashout', amount: 1250 },
              ].map((entry) => (
                <div key={entry.label} className="rounded-2xl border border-white/5 bg-[#11161d] px-4 py-3">
                  <div className="text-[10px] uppercase tracking-[0.18em] text-white/30 font-black">{entry.label}</div>
                  <div className="mt-2 text-lg font-black text-[#00FF88]">{formatDisplayCurrency(entry.amount, currency)}</div>
                  <div className="text-[11px] text-white/35">USD base: {formatMoneyFromCoins(entry.amount)}</div>
                </div>
              ))}
            </div>
            <div className="mt-3 text-[11px] text-white/35">
              Example: {formatMoneyFromCoins(100)} becomes {formatDisplayCurrency(100, currency)} in {currency}.
            </div>
          </div>
        </div>

        <div className="space-y-4">
          <label className="text-[10px] font-black uppercase tracking-[0.2em] text-white/20 ml-2">Avatar Source</label>
          <div className="grid md:grid-cols-3 gap-3">
            {avatarOptions.map((option) => (
              <button
                key={option.key}
                onClick={() => !option.disabled && setAvatarSource(option.key)}
                disabled={option.disabled}
                className={cn(
                  'rounded-3xl border p-4 text-left transition-all disabled:opacity-40',
                  avatarSource === option.key ? 'border-[#00FF88] bg-[#00FF88]/10' : 'border-white/5 bg-black/40'
                )}
              >
                <div className="flex items-center gap-3">
                  <div className="w-14 h-14 rounded-2xl overflow-hidden bg-white/5 shrink-0">
                    {option.image ? <img src={option.image} alt={option.title} className="w-full h-full object-cover" /> : null}
                  </div>
                  <div>
                    <div className="text-sm font-black">{option.title}</div>
                    <div className="text-[11px] text-white/40">{option.subtitle}</div>
                  </div>
                </div>
              </button>
            ))}
          </div>
          <div className="space-y-2">
            <label className="text-[10px] font-black uppercase tracking-[0.2em] text-white/20 ml-2">Custom Avatar URL</label>
            <input
              type="url"
              value={customAvatarUrl}
              onChange={(e) => setCustomAvatarUrl(e.target.value)}
              placeholder="https://example.com/avatar.png"
              className="w-full rounded-2xl border border-white/10 bg-black/40 px-4 py-3 text-sm text-white focus:outline-none focus:border-[#00FF88]/50"
            />
            <div className="text-[11px] text-white/35">Paste a public image URL if you want to use your own profile picture.</div>
          </div>
        </div>

        <div className="space-y-4">
          <label className="text-[10px] font-black uppercase tracking-[0.2em] text-white/20 ml-2">Notifications</label>
          <div className="space-y-3">
            {[
              'Email notifications on login',
              'Marketing and promotional emails',
              'Browser push notifications',
            ].map((item, i) => (
              <div key={i} className="flex items-center justify-between p-4 bg-black/40 rounded-2xl border border-white/5">
                <span className="text-xs font-bold text-white/60">{item}</span>
                <div className="w-12 h-6 bg-[#00FF88] rounded-full relative cursor-pointer">
                  <div className="absolute right-1 top-1 w-4 h-4 bg-black rounded-full" />
                </div>
              </div>
            ))}
          </div>
        </div>

        {status ? (
          <div className={cn('rounded-2xl px-4 py-3 text-sm', status.includes('saved') ? 'bg-[#00FF88]/10 text-[#00FF88]' : 'bg-red-500/10 text-red-300')}>
            {status}
          </div>
        ) : null}

        <button
          onClick={savePreferences}
          disabled={isSaving}
          className="w-full rounded-2xl bg-[#00FF88] px-5 py-4 text-sm font-black uppercase tracking-[0.22em] text-black disabled:opacity-50"
        >
          {isSaving ? 'Saving...' : 'Save Preferences'}
        </button>
      </div>
    </div>
  );
};

const AdminView = () => {
  const { user } = useAuth();
  const { refreshWallet } = useBalance();
  const isOwner = user?.role === 'owner';
  const isStaff = isOwner || user?.role === 'moderator';
  const [adminSection, setAdminSection] = useState<'overview' | 'users' | 'history' | 'payments' | 'support' | 'promos' | 'broadcasts' | 'moderation' | 'analytics' | 'tournaments' | 'rain'>('overview');
  const [selectedWithdrawalId, setSelectedWithdrawalId] = useState<number | null>(null);
  const [withdrawalStatusDraft, setWithdrawalStatusDraft] = useState<'pending' | 'processing' | 'completed'>('pending');
  const [isUpdatingWithdrawal, setIsUpdatingWithdrawal] = useState(false);
  const [overview, setOverview] = useState<{
    stats: { totalUsers: number; totalBalance: number; totalWagered: number; pendingWithdrawals: number };
    users: Array<{ id: number; username: string; email: string; role: string; balance: number; createdAt: string }>;
    withdrawals: Array<{ id: number; userId: number; username: string; currency: string; address: string; amount: number; feeAmount: number; netAmount: number; status: string; createdAt: string }>;
  } | null>(null);
  const [selectedUserId, setSelectedUserId] = useState('');
  const [adjustAmount, setAdjustAmount] = useState('');
  const [status, setStatus] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [activityFeed, setActivityFeed] = useState<Array<{ id: number; gameKey: string; username: string; wager: number; payout: number; multiplier: number; outcome: string; createdAt: string }>>([]);
  const [activityTab, setActivityTab] = useState<'all' | 'high' | 'lucky'>('all');
  const [supportTickets, setSupportTickets] = useState<SupportThread[]>([]);
  const [selectedSupportTicketId, setSelectedSupportTicketId] = useState<number | null>(null);
  const [supportReply, setSupportReply] = useState('');
  const [supportReplyAttachmentUrl, setSupportReplyAttachmentUrl] = useState('');
  const [isReplyingToSupport, setIsReplyingToSupport] = useState(false);
  const [promos, setPromos] = useState<Array<{ id: number; code: string; coinAmount: number; maxUses: number; currentUses: number; expiresAt: string | null; minLevel: number; minTotalWagered: number; referredOnly: boolean; createdAt: string; createdBy: string }>>([]);
  const [newPromoCode, setNewPromoCode] = useState('');
  const [newPromoCoins, setNewPromoCoins] = useState('');
  const [newPromoMaxUses, setNewPromoMaxUses] = useState('1');
  const [newPromoExpires, setNewPromoExpires] = useState('');
  const [newPromoMinLevel, setNewPromoMinLevel] = useState('1');
  const [newPromoMinWagered, setNewPromoMinWagered] = useState('0');
  const [newPromoReferredOnly, setNewPromoReferredOnly] = useState(false);
  const [broadcasts, setBroadcasts] = useState<Array<{ id: number; message: string; createdAt: string; expiresAt: string | null; isActive: boolean; minLevel: number; minTotalWagered: number; referredOnly: boolean }>>([]);
  const [newBroadcastMessage, setNewBroadcastMessage] = useState('');
  const [newBroadcastExpires, setNewBroadcastExpires] = useState('');
  const [newBroadcastMinLevel, setNewBroadcastMinLevel] = useState('1');
  const [newBroadcastMinWagered, setNewBroadcastMinWagered] = useState('0');
  const [newBroadcastReferredOnly, setNewBroadcastReferredOnly] = useState(false);

  const [moderationHistory, setModerationHistory] = useState<Array<{ id: number; userId: number; username: string; moderatorUsername: string; action: string; reason: string; durationMinutes: number | null; expiresAt: string | null; createdAt: string }>>([]);
  const [modUserId, setModUserId] = useState('');
  const [modAction, setModAction] = useState<'ban' | 'mute'>('ban');
  const [modReason, setModReason] = useState('');
  const [modDuration, setModDuration] = useState('');
  const [moderationFilter, setModerationFilter] = useState<'all' | 'ban' | 'mute'>('all');
  const [isModLoading, setIsModLoading] = useState(false);

  const [analytics, setAnalytics] = useState<any | null>(null);
  const [adminUserQuery, setAdminUserQuery] = useState('');
  const [adminUsers, setAdminUsers] = useState<Array<any>>([]);
  const [selectedAdminUserId, setSelectedAdminUserId] = useState<number | null>(null);
  const [selectedAdminUser, setSelectedAdminUser] = useState<any | null>(null);
  const [isAdminUserLoading, setIsAdminUserLoading] = useState(false);
  const [adminPreviewUsername, setAdminPreviewUsername] = useState<string | null>(null);
  const [adminTournaments, setAdminTournaments] = useState<Array<Tournament & { description?: string; gameKey?: string | null; minWager?: number; maxParticipants?: number | null; participantCount?: number }>>([]);
  const [newTournamentName, setNewTournamentName] = useState('');
  const [newTournamentDescription, setNewTournamentDescription] = useState('');
  const [newTournamentGameKey, setNewTournamentGameKey] = useState('');
  const [newTournamentStartTime, setNewTournamentStartTime] = useState('');
  const [newTournamentEndTime, setNewTournamentEndTime] = useState('');
  const [newTournamentMinWager, setNewTournamentMinWager] = useState('0.01');
  const [newTournamentPrize, setNewTournamentPrize] = useState('100');
  const [newTournamentMaxParticipants, setNewTournamentMaxParticipants] = useState('');
  const [isTournamentSaving, setIsTournamentSaving] = useState(false);
  const [currentRain, setCurrentRain] = useState<{ id: number; poolAmount: number; startsAt: string; joinOpensAt: string; endsAt: string; participantCount?: number } | null>(null);
  const [currentRainAmount, setCurrentRainAmount] = useState('');
  const [currentRainTimerMinutes, setCurrentRainTimerMinutes] = useState('60');
  const [rainBotSchedules, setRainBotSchedules] = useState<Array<{
    id: number;
    intervalMinutes: number;
    minPoolAmount: number;
    rainAmount: number;
    isActive: boolean;
    createdAt: string;
    lastTriggeredAt: string | null;
  }>>([]);
  const [newRainInterval, setNewRainInterval] = useState('60');
  const [newRainMinPool, setNewRainMinPool] = useState('100');
  const [newRainAmount, setNewRainAmount] = useState('500');
  const [rainEditDrafts, setRainEditDrafts] = useState<Record<number, { intervalMinutes: string; minPoolAmount: string; rainAmount: string }>>({});

  const availableAdminSections = isOwner
    ? ([
        ['overview', 'Overview'],
        ['users', 'Users'],
        ['history', 'Game History'],
        ['payments', 'Payments'],
        ['support', 'Support'],
        ['promos', 'Promo Codes'],
        ['broadcasts', 'Broadcasts'],
        ['moderation', 'Moderation'],
        ['analytics', 'Analytics'],
        ['tournaments', 'Tournaments'],
        ['rain', 'Rain'],
      ] as const)
    : ([
        ['overview', 'Overview'],
        ['users', 'Users'],
        ['analytics', 'Analytics'],
        ['tournaments', 'Tournaments'],
      ] as const);

  const loadOverview = useCallback(async () => {
    const token = localStorage.getItem('pasus_auth_token');
    const response = await apiFetch('/api/admin/overview', {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) {
      throw new Error(data.error || 'Failed to load admin overview.');
    }
    setOverview(data);
  }, []);

  const loadSupportTickets = useCallback(async () => {
    const token = localStorage.getItem('pasus_auth_token');
    const response = await apiFetch('/api/admin/support/tickets', {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) {
      throw new Error(data.error || 'Failed to load support inbox.');
    }
    const tickets = Array.isArray(data.tickets) ? data.tickets : [];
    setSupportTickets(tickets);
    setSelectedSupportTicketId((current) => {
      if (current && tickets.some((ticket: SupportThread) => ticket.id === current)) {
        return current;
      }
      return tickets[0]?.id ?? null;
    });
  }, []);

  const loadActivity = useCallback(async (tab: 'all' | 'high' | 'lucky' = activityTab) => {
    const response = await apiFetch(`/api/activity/bets?tab=${tab}&limit=18`);
    const data = await response.json().catch(() => ({}));
    if (!response.ok) {
      throw new Error(data.error || 'Failed to load game history.');
    }
    const activities = Array.isArray(data.activities) ? data.activities : [];
    setActivityFeed(activities.map((entry: any) => ({
      id: Number(entry.id),
      gameKey: String(entry.gameKey || entry.game_key || ''),
      username: String(entry.username || ''),
      wager: Number(entry.wager || 0),
      payout: Number(entry.payout || 0),
      multiplier: Number(entry.multiplier || 0),
      outcome: String(entry.outcome || ''),
      detail: String(entry.detail || ''),
      createdAt: String(entry.createdAt || entry.created_at || ''),
    })));
  }, [activityTab]);

  const loadPromos = useCallback(async () => {
    const token = localStorage.getItem('pasus_auth_token');
    const response = await apiFetch('/api/admin/promo/list', {
      headers: { Authorization: `Bearer ${token}` },
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) {
      throw new Error(data.error || 'Failed to load promo codes.');
    }
    setPromos(Array.isArray(data.promos) ? data.promos : []);
  }, []);

  const loadBroadcasts = useCallback(async () => {
    const token = localStorage.getItem('pasus_auth_token');
    const response = await apiFetch('/api/broadcasts', {
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    });
    const data = await response.json().catch(() => ({}));
    if (response.ok && Array.isArray(data.broadcasts)) {
      setBroadcasts(data.broadcasts.map((b: any) => ({
        id: Number(b.id),
        message: String(b.message || ''),
        createdAt: b.createdAt || '',
        expiresAt: b.expiresAt || null,
        isActive: Boolean(b.isActive),
        minLevel: Number(b.minLevel || 1),
        minTotalWagered: Number(b.minTotalWagered || 0),
        referredOnly: Boolean(b.referredOnly),
      })));
    }
  }, []);

  const loadAnalytics = useCallback(async () => {
    const token = localStorage.getItem('pasus_auth_token');
    if (!token) return;
    try {
      const response = await apiFetch('/api/admin/analytics', {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await response.json().catch(() => ({}));
      if (response.ok && data.analytics) {
        setAnalytics(data.analytics);
      }
    } catch {}
  }, []);

  const loadAdminUsers = useCallback(async (query = '') => {
    const token = localStorage.getItem('pasus_auth_token');
    if (!token) return;
    setIsAdminUserLoading(true);
    try {
      const params = new URLSearchParams();
      if (query.trim()) {
        params.set('q', query.trim());
      }
      const response = await apiFetch(`/api/admin/users/search?${params.toString()}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await response.json().catch(() => ({}));
      if (response.ok && Array.isArray(data.users)) {
        setAdminUsers(data.users);
        if (!data.users.length) {
          setSelectedAdminUserId(null);
          setSelectedAdminUser(null);
        } else if (!selectedAdminUserId || !data.users.some((entry: any) => Number(entry.id) === selectedAdminUserId)) {
          setSelectedAdminUserId(Number(data.users[0].id));
        }
      }
    } catch {
    } finally {
      setIsAdminUserLoading(false);
    }
  }, [selectedAdminUserId]);

  const loadAdminUserDetail = useCallback(async (userId: number) => {
    const token = localStorage.getItem('pasus_auth_token');
    if (!token || !userId) return;
    setIsAdminUserLoading(true);
    try {
      const response = await apiFetch(`/api/admin/users/${userId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await response.json().catch(() => ({}));
      if (response.ok && data.user) {
        setSelectedAdminUser(data);
      }
    } catch {
    } finally {
      setIsAdminUserLoading(false);
    }
  }, []);

  const loadAdminTournaments = useCallback(async () => {
    const token = localStorage.getItem('pasus_auth_token');
    if (!token) return;
    try {
      const response = await apiFetch('/api/tournaments', {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await response.json().catch(() => ({}));
      if (response.ok && Array.isArray(data.tournaments)) {
        setAdminTournaments(data.tournaments.map((t: any) => ({
          id: Number(t.id),
          name: String(t.name || ''),
          type: 'wagered',
          startsAt: String(t.startsAt || t.startTime || ''),
          endsAt: String(t.endsAt || t.endTime || ''),
          prize: Number(t.prize || t.prizePool || 0),
          status: (t.status || 'upcoming') as 'upcoming' | 'active' | 'ended',
          prizes: Array.isArray(t.prizes) ? t.prizes : [],
          winners: Array.isArray(t.winners) ? t.winners : [],
          paidOutAt: t.paidOutAt || null,
          description: t.description || '',
          gameKey: t.gameKey || null,
          minWager: Number(t.minWager || 0),
          maxParticipants: t.maxParticipants ?? null,
          participantCount: Number(t.participantCount || 0),
        })));
      }
    } catch {}
  }, []);

  const loadRainBotSchedules = useCallback(async () => {
    const token = localStorage.getItem('pasus_auth_token');
    if (!token) return;
    try {
      const response = await apiFetch('/api/admin/rain-bot', {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await response.json().catch(() => ({}));
      if (response.ok && data.currentRain) {
        setCurrentRain({
          id: Number(data.currentRain.id),
          poolAmount: Number(data.currentRain.poolAmount || 0),
          startsAt: String(data.currentRain.startsAt || ''),
          joinOpensAt: String(data.currentRain.joinOpensAt || ''),
          endsAt: String(data.currentRain.endsAt || ''),
          participantCount: Number(data.currentRain.participantCount || 0),
        });
        setCurrentRainAmount((Number(data.currentRain.poolAmount || 0) / 100).toFixed(2));
        const remainingMinutes = Math.max(1, Math.ceil((new Date(data.currentRain.endsAt).getTime() - Date.now()) / 60000));
        setCurrentRainTimerMinutes(String(remainingMinutes));
      }
      if (response.ok && Array.isArray(data.schedules)) {
        setRainBotSchedules(data.schedules);
        setRainEditDrafts(Object.fromEntries(data.schedules.map((schedule: any) => [
          Number(schedule.id),
          {
            intervalMinutes: String(Number(schedule.intervalMinutes || 60)),
            minPoolAmount: String(Number(schedule.minPoolAmount || 0) / 100),
            rainAmount: String(Number(schedule.rainAmount || 0) / 100),
          },
        ])));
      }
    } catch {}
  }, []);

  const loadModerationHistory = useCallback(async () => {
    const token = localStorage.getItem('pasus_auth_token');
    if (!token) return;
    setIsModLoading(true);
    try {
      const params = new URLSearchParams();
      if (moderationFilter !== 'all') params.set('action', moderationFilter);
      const response = await apiFetch(`/api/admin/moderation/history?${params}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await response.json().catch(() => ({}));
      if (response.ok && Array.isArray(data.history)) {
        setModerationHistory(data.history.map((h: any) => ({
          id: Number(h.id),
          userId: Number(h.userId),
          username: h.username,
          moderatorUsername: h.moderatorUsername,
          action: h.action,
          reason: h.reason,
          durationMinutes: h.durationMinutes,
          expiresAt: h.expiresAt,
          createdAt: h.createdAt,
        })));
      }
    } catch {} finally {
      setIsModLoading(false);
    }
  }, [moderationFilter]);

  const submitModerationAction = async () => {
    const token = localStorage.getItem('pasus_auth_token');
    if (!token || !modUserId.trim() || !modAction) return;
    setIsModLoading(true);
    setStatus('');
    try {
      const response = await apiFetch(`/api/admin/moderation/${modAction}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          userId: Number(modUserId),
          reason: modReason.trim(),
          durationMinutes: modDuration ? Number(modDuration) : null,
        }),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data.error || `Failed to ${modAction} user`);
      setStatus(`${modAction === 'ban' ? 'User banned' : 'User muted'} successfully.`);
      setModUserId('');
      setModReason('');
      setModDuration('');
      await loadModerationHistory();
    } catch (err) {
      setStatus(err instanceof Error ? err.message : `Failed to ${modAction} user`);
    } finally {
      setIsModLoading(false);
    }
  };

  useEffect(() => {
    if (!isStaff) {
      return;
    }

    const initialLoads = [loadOverview(), loadBroadcasts()];
    if (isOwner) {
      initialLoads.push(loadSupportTickets(), loadActivity(activityTab), loadPromos());
    }

    Promise.all(initialLoads).catch((error) => {
      setStatus(error instanceof Error ? error.message : 'Failed to load panel data.');
    });
  }, [activityTab, isOwner, isStaff, loadActivity, loadOverview, loadPromos, loadBroadcasts, loadSupportTickets]);

  useEffect(() => {
    if (!availableAdminSections.some(([value]) => value === adminSection)) {
      setAdminSection('overview');
    }
  }, [adminSection, availableAdminSections]);

  useEffect(() => {
    if (adminSection === 'moderation') {
      loadModerationHistory().catch(() => undefined);
    }
    if (adminSection === 'analytics') {
      loadAnalytics().catch(() => undefined);
    }
    if (adminSection === 'users') {
      loadAdminUsers(adminUserQuery).catch(() => undefined);
    }
    if (adminSection === 'tournaments') {
      loadAdminTournaments().catch(() => undefined);
    }
    if (adminSection === 'rain') {
      loadRainBotSchedules().catch(() => undefined);
    }
  }, [adminSection, adminUserQuery, loadModerationHistory, loadAnalytics, loadAdminTournaments, loadAdminUsers, loadRainBotSchedules]);

  useEffect(() => {
    if (adminSection === 'users' && selectedAdminUserId) {
      loadAdminUserDetail(selectedAdminUserId).catch(() => undefined);
    }
  }, [adminSection, selectedAdminUserId, loadAdminUserDetail]);

  const submitTournament = async () => {
    const token = localStorage.getItem('pasus_auth_token');
    if (!token) return;
    if (!newTournamentName.trim() || !newTournamentStartTime || !newTournamentEndTime) {
      setStatus('Tournament name, start time, and end time are required.');
      return;
    }

    setIsTournamentSaving(true);
    setStatus('');
    try {
      const response = await apiFetch('/api/tournaments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          name: newTournamentName.trim(),
          description: newTournamentDescription.trim(),
          gameKey: newTournamentGameKey.trim() || null,
          startTime: new Date(newTournamentStartTime).toISOString(),
          endTime: new Date(newTournamentEndTime).toISOString(),
          minWager: usdToCoins(Number(newTournamentMinWager || 0)),
          prizePool: usdToCoins(Number(newTournamentPrize || 0)),
          maxParticipants: newTournamentMaxParticipants ? Number(newTournamentMaxParticipants) : null,
        }),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data.error || 'Failed to create tournament.');
      setStatus('Tournament created.');
      setNewTournamentName('');
      setNewTournamentDescription('');
      setNewTournamentGameKey('');
      setNewTournamentStartTime('');
      setNewTournamentEndTime('');
      setNewTournamentMinWager('0.01');
      setNewTournamentPrize('100');
      setNewTournamentMaxParticipants('');
      await loadAdminTournaments();
    } catch (error) {
      setStatus(error instanceof Error ? error.message : 'Failed to create tournament.');
    } finally {
      setIsTournamentSaving(false);
    }
  };

  const startTournament = async (tournamentId: number) => {
    const token = localStorage.getItem('pasus_auth_token');
    if (!token) return;
    setIsTournamentSaving(true);
    setStatus('');
    try {
      const response = await apiFetch(`/api/admin/tournaments/${tournamentId}/start`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data.error || 'Failed to start tournament.');
      setStatus('Tournament started.');
      await loadAdminTournaments();
    } catch (error) {
      setStatus(error instanceof Error ? error.message : 'Failed to start tournament.');
    } finally {
      setIsTournamentSaving(false);
    }
  };

  useEffect(() => {
    if (!isOwner) {
      return;
    }

    const timer = window.setInterval(() => {
      loadSupportTickets().catch(() => undefined);
    }, 4000);
    return () => window.clearInterval(timer);
  }, [isOwner, loadSupportTickets]);

  const submitAdjustment = async () => {
    try {
      setIsSubmitting(true);
      setStatus('');
      const token = localStorage.getItem('pasus_auth_token');
      const response = await apiFetch('/api/admin/wallet/adjust', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          userId: Number(selectedUserId),
          delta: usdToCoins(Number(adjustAmount)),
        }),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(data.error || 'Failed to adjust wallet.');
      }
      setStatus('Wallet adjusted.');
      setAdjustAmount('');
      await loadOverview();
      await refreshWallet();
    } catch (error) {
      setStatus(error instanceof Error ? error.message : 'Failed to adjust wallet.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const selectedSupportTicket = supportTickets.find((ticket) => ticket.id === selectedSupportTicketId) || null;
  const selectedWithdrawal = overview?.withdrawals.find((entry) => entry.id === selectedWithdrawalId) || null;

  const submitSupportReply = async () => {
    if (!selectedSupportTicket || !supportReply.trim()) {
      return;
    }

    try {
      setIsReplyingToSupport(true);
      setStatus('');
      const token = localStorage.getItem('pasus_auth_token');
      const response = await apiFetch(`/api/admin/support/tickets/${selectedSupportTicket.id}/reply`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ message: supportReply.trim(), attachmentUrl: supportReplyAttachmentUrl }),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(data.error || 'Failed to send support reply.');
      }
      setSupportReply('');
      setSupportReplyAttachmentUrl('');
      setStatus('Support reply sent.');
      await loadSupportTickets();
    } catch (error) {
      setStatus(error instanceof Error ? error.message : 'Failed to send support reply.');
    } finally {
      setIsReplyingToSupport(false);
    }
  };

  useEffect(() => {
    if (!selectedWithdrawal) {
      return;
    }

    if (selectedWithdrawal.status === 'processing') {
      setWithdrawalStatusDraft('processing');
      return;
    }

    if (selectedWithdrawal.status === 'completed') {
      setWithdrawalStatusDraft('completed');
      return;
    }

    setWithdrawalStatusDraft('pending');
  }, [selectedWithdrawal]);

  const updateWithdrawalStatus = async (nextStatus: 'pending' | 'processing' | 'completed' | 'declined') => {
    if (!selectedWithdrawal) {
      return;
    }

    try {
      setIsUpdatingWithdrawal(true);
      setStatus('');
      const token = localStorage.getItem('pasus_auth_token');
      const response = await apiFetch(`/api/admin/withdrawals/${selectedWithdrawal.id}/status`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ status: nextStatus }),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(data.error || 'Failed to update withdrawal.');
      }

      setStatus(nextStatus === 'declined' ? 'Withdrawal declined and refunded.' : `Withdrawal marked ${nextStatus}.`);
      await loadOverview();
      await refreshWallet();
    } catch (error) {
      setStatus(error instanceof Error ? error.message : 'Failed to update withdrawal.');
    } finally {
      setIsUpdatingWithdrawal(false);
    }
  };

  if (!isStaff) {
    return <InfoView eyebrow="Access" title="Staff" description="Staff access is required for this panel." cards={[{ title: 'Restricted', body: 'This panel is only available to owner and moderator accounts.', icon: Shield }]} />;
  }

  return (
    <div className="p-6 lg:p-10 max-w-6xl mx-auto space-y-8">
      <div className="space-y-2">
        <div className="text-[10px] uppercase tracking-[0.24em] text-[#00FF88] font-black">Operations</div>
        <h1 className="text-4xl md:text-5xl font-black italic uppercase tracking-tighter">{isOwner ? 'Admin Panel' : 'Staff Panel'}</h1>
        <p className="text-sm text-white/50 max-w-2xl leading-relaxed">
          {isOwner
            ? 'Manage balances, review recent users, and monitor withdrawal pressure from one owner-only surface.'
            : 'Review platform overview, inspect users, watch analytics, and monitor tournaments from one staff surface.'}
        </p>
      </div>

      {status ? <div className="rounded-2xl border border-white/10 bg-[#141821] px-4 py-3 text-sm text-white/70">{status}</div> : null}

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="rounded-[28px] border border-white/10 bg-[#141821] p-5"><div className="text-[10px] uppercase tracking-[0.18em] text-white/25 font-black">Users</div><div className="mt-3 text-3xl font-black italic">{overview?.stats.totalUsers ?? 0}</div></div>
        <div className="rounded-[28px] border border-white/10 bg-[#141821] p-5"><div className="text-[10px] uppercase tracking-[0.18em] text-white/25 font-black">Platform Balance</div><div className="mt-3 text-3xl font-black italic">{formatMoneyFromCoins(overview?.stats.totalBalance ?? 0)}</div></div>
        <div className="rounded-[28px] border border-white/10 bg-[#141821] p-5"><div className="text-[10px] uppercase tracking-[0.18em] text-white/25 font-black">Total Wagered</div><div className="mt-3 text-3xl font-black italic">{formatMoneyFromCoins(overview?.stats.totalWagered ?? 0)}</div></div>
        <div className="rounded-[28px] border border-white/10 bg-[#141821] p-5"><div className="text-[10px] uppercase tracking-[0.18em] text-white/25 font-black">Pending Withdrawals</div><div className="mt-3 text-3xl font-black italic">{overview?.stats.pendingWithdrawals ?? 0}</div></div>
      </div>

      <div className="flex flex-wrap gap-3">
        {availableAdminSections.map(([value, label]) => (
          <button
            key={value}
            onClick={() => setAdminSection(value as 'overview' | 'users' | 'history' | 'payments' | 'support' | 'promos' | 'broadcasts' | 'moderation' | 'analytics' | 'tournaments' | 'rain')}
            className={cn(
              'rounded-full px-4 py-2 text-[10px] font-black uppercase tracking-[0.18em] transition-all',
              adminSection === value ? 'bg-[#00FF88] text-black' : 'bg-white/5 text-white/55 hover:text-white'
            )}
          >
            {label}
          </button>
        ))}
      </div>

      {adminSection === 'overview' ? (
      <>
      <div className="grid grid-cols-1 lg:grid-cols-[0.85fr_1.15fr] gap-6">
        <div className="rounded-[32px] border border-white/10 bg-[#141821] p-6 space-y-4">
          {isOwner ? (
            <>
              <div className="text-lg font-black uppercase tracking-tight">Wallet Adjustment</div>
              <select value={selectedUserId} onChange={(e) => setSelectedUserId(e.target.value)} className="w-full rounded-2xl border border-white/10 bg-black/30 px-4 py-3 text-sm focus:outline-none">
                <option value="">Select user</option>
                {(overview?.users || []).map((entry) => (
                  <option key={entry.id} value={entry.id}>{entry.username} ({formatMoneyFromCoins(entry.balance)})</option>
                ))}
              </select>
              <input value={adjustAmount} onChange={(e) => setAdjustAmount(e.target.value)} placeholder="Use positive or negative dollars" className="w-full rounded-2xl border border-white/10 bg-black/30 px-4 py-3 text-sm focus:outline-none" />
              <button onClick={submitAdjustment} disabled={isSubmitting || !selectedUserId || !adjustAmount} className="rounded-2xl bg-[#00FF88] text-black px-5 py-3 text-xs font-black uppercase tracking-[0.16em] disabled:opacity-40">
                {isSubmitting ? 'Updating...' : 'Apply Adjustment'}
              </button>
            </>
          ) : (
            <>
              <div className="text-lg font-black uppercase tracking-tight">Staff Snapshot</div>
              <div className="rounded-2xl border border-white/5 bg-black/25 p-5 space-y-3">
                <div className="text-sm text-white/55">Moderators can monitor platform balances and withdrawal pressure here, but wallet and payment changes remain owner-only.</div>
                <div className="grid grid-cols-2 gap-3 text-[11px] text-white/45">
                  <div><span className="block text-white/25">Latest Users</span>{overview?.users.length ?? 0}</div>
                  <div><span className="block text-white/25">Withdrawals Listed</span>{overview?.withdrawals.length ?? 0}</div>
                </div>
              </div>
            </>
          )}
        </div>

        <div className="rounded-[32px] border border-white/10 bg-[#141821] p-6 space-y-4">
          <div className="text-lg font-black uppercase tracking-tight">Recent Users</div>
          <div className="space-y-3">
            {(overview?.users || []).map((entry) => (
              <div key={entry.id} className="rounded-2xl border border-white/5 bg-black/25 px-4 py-4 flex items-center justify-between gap-4">
                <div>
                  <div className="text-sm font-black">{entry.username}</div>
                  <div className="text-[11px] text-white/35">{entry.email}</div>
                </div>
                <div className="text-right">
                  <div className="text-[10px] uppercase tracking-[0.16em] text-white/25">{entry.role}</div>
                  <div className="text-sm font-mono text-[#00FF88]">{formatMoneyFromCoins(entry.balance)}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="rounded-[32px] border border-white/10 bg-[#141821] p-6 space-y-4">
        <div className="text-lg font-black uppercase tracking-tight">Recent Withdrawals</div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {(overview?.withdrawals || []).map((entry) => (
            <button
              key={entry.id}
              onClick={() => setSelectedWithdrawalId(entry.id)}
              className="rounded-2xl border border-white/5 bg-black/25 px-4 py-4 text-left transition-all hover:border-[#00FF88]/35 hover:bg-black/35"
            >
              <div className="flex items-center justify-between gap-4">
                <div className="text-sm font-black">{entry.username}</div>
                <div className="text-[10px] uppercase tracking-[0.16em] text-[#00FF88] font-black">{entry.status}</div>
              </div>
              <div className="mt-2 text-sm text-white/55">{formatMoneyFromCoins(entry.amount)} {entry.currency.toUpperCase()}</div>
              <div className="mt-1 text-[11px] text-white/30">{new Date(entry.createdAt).toLocaleString()}</div>
            </button>
          ))}
        </div>
      </div>
      </>
      ) : null}

      {adminSection === 'users' ? (
      <div className="grid grid-cols-1 lg:grid-cols-[0.82fr_1.18fr] gap-6">
        <div className="rounded-[32px] border border-white/10 bg-[#141821] p-6 space-y-4">
          <div>
            <div className="text-lg font-black uppercase tracking-tight">User Search</div>
            <div className="text-sm text-white/45">Search by username or email and jump into actions fast.</div>
          </div>
          <input
            value={adminUserQuery}
            onChange={(e) => setAdminUserQuery(e.target.value)}
            placeholder="Search users or email"
            className="w-full rounded-2xl border border-white/10 bg-black/30 px-4 py-3 text-sm focus:outline-none"
          />
          <div className="space-y-3 max-h-[560px] overflow-y-auto custom-scrollbar">
            {isAdminUserLoading && !adminUsers.length ? (
              <div className="rounded-2xl border border-white/5 bg-black/25 px-4 py-8 text-sm text-white/35">Loading users...</div>
            ) : adminUsers.length ? adminUsers.map((entry) => (
              <button
                key={entry.id}
                onClick={() => setSelectedAdminUserId(entry.id)}
                className={cn(
                  'w-full rounded-2xl border px-4 py-4 text-left transition-all',
                  selectedAdminUserId === entry.id ? 'border-[#00FF88]/35 bg-[#00FF88]/10' : 'border-white/5 bg-black/25 hover:border-white/15'
                )}
              >
                <div className="flex items-center justify-between gap-4">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-10 h-10 rounded-full overflow-hidden bg-white/5 shrink-0">
                      {entry.avatarUrl ? <img src={entry.avatarUrl} alt="" className="w-full h-full object-cover" /> : null}
                    </div>
                    <div className="min-w-0">
                      <div className="text-sm font-black truncate">{entry.username}</div>
                      <div className="text-[11px] text-white/35 truncate">{entry.email}</div>
                    </div>
                  </div>
                  <div className="text-right text-[10px] uppercase tracking-[0.16em] text-white/30">
                    <div>{entry.role}</div>
                    <div className="mt-1 text-white/50 normal-case tracking-normal">{entry.activeSessions} live</div>
                  </div>
                </div>
                <div className="mt-3 grid grid-cols-3 gap-3 text-[11px] text-white/40">
                  <div><span className="block text-white/25">Balance</span>{formatMoneyFromCoins(entry.balance)}</div>
                  <div><span className="block text-white/25">Wagered</span>{formatMoneyFromCoins(entry.totalWagered)}</div>
                  <div><span className="block text-white/25">Biggest Win</span>{formatMoneyFromCoins(entry.biggestWin)}</div>
                </div>
              </button>
            )) : (
              <div className="rounded-2xl border border-white/5 bg-black/25 px-4 py-8 text-sm text-white/35">No users found.</div>
            )}
          </div>
        </div>

        <div className="rounded-[32px] border border-white/10 bg-[#141821] p-6 space-y-5">
          {selectedAdminUser?.user ? (
            <>
              <div className="flex items-start justify-between gap-4">
                <div className="flex items-center gap-4">
                  <div className="w-16 h-16 rounded-2xl overflow-hidden bg-white/5">
                    {selectedAdminUser.user.avatarUrl ? <img src={selectedAdminUser.user.avatarUrl} alt="" className="w-full h-full object-cover" /> : null}
                  </div>
                  <div>
                    <div className="text-2xl font-black">{selectedAdminUser.user.username}</div>
                    <div className="text-sm text-white/35">{selectedAdminUser.user.email}</div>
                    <div className="mt-2 inline-flex rounded-full bg-white/5 px-3 py-1 text-[10px] font-black uppercase tracking-[0.16em] text-white/50">{selectedAdminUser.user.role}</div>
                  </div>
                </div>
                <button onClick={() => setAdminPreviewUsername(selectedAdminUser.user.username)} className="rounded-2xl border border-[#00FF88]/35 px-4 py-2 text-[10px] font-black uppercase tracking-[0.16em] text-[#00FF88]">
                  Preview Profile
                </button>
              </div>

              <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                <div className="rounded-2xl border border-white/5 bg-black/25 p-4"><div className="text-[10px] uppercase tracking-[0.16em] text-white/25 font-black">Balance</div><div className="mt-2 text-lg font-black">{formatMoneyFromCoins(selectedAdminUser.user.balance)}</div></div>
                <div className="rounded-2xl border border-white/5 bg-black/25 p-4"><div className="text-[10px] uppercase tracking-[0.16em] text-white/25 font-black">Total Wagered</div><div className="mt-2 text-lg font-black">{formatMoneyFromCoins(selectedAdminUser.user.totalWagered)}</div></div>
                <div className="rounded-2xl border border-white/5 bg-black/25 p-4"><div className="text-[10px] uppercase tracking-[0.16em] text-white/25 font-black">Bets</div><div className="mt-2 text-lg font-black">{selectedAdminUser.user.totalBets}</div></div>
                <div className="rounded-2xl border border-white/5 bg-black/25 p-4"><div className="text-[10px] uppercase tracking-[0.16em] text-white/25 font-black">Biggest Win</div><div className="mt-2 text-lg font-black text-[#00FF88]">{formatMoneyFromCoins(selectedAdminUser.user.biggestWin)}</div></div>
              </div>

              <div className="rounded-2xl border border-white/5 bg-black/25 p-4 space-y-3">
                <div className="flex items-center justify-between gap-3">
                  <div className="text-sm font-black uppercase tracking-tight">Risk Flags</div>
                  <div className={cn('rounded-full px-3 py-1 text-[10px] font-black uppercase tracking-[0.16em]', (selectedAdminUser.risk?.score || 0) >= 6 ? 'bg-red-500/15 text-red-300' : (selectedAdminUser.risk?.score || 0) >= 3 ? 'bg-yellow-500/15 text-yellow-300' : 'bg-[#00FF88]/10 text-[#00FF88]')}>
                    Score {selectedAdminUser.risk?.score || 0}
                  </div>
                </div>
                {selectedAdminUser.risk?.riskFlags?.length ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {selectedAdminUser.risk.riskFlags.map((flag: any) => (
                      <div key={flag.key} className={cn('rounded-2xl border px-4 py-3', flag.severity === 'high' ? 'border-red-500/20 bg-red-500/8' : flag.severity === 'medium' ? 'border-yellow-500/20 bg-yellow-500/8' : 'border-white/5 bg-white/[0.03]')}>
                        <div className="flex items-center justify-between gap-3">
                          <div className="text-xs font-black uppercase tracking-[0.16em]">{flag.label}</div>
                          <div className="text-[10px] uppercase tracking-[0.16em] text-white/35">{flag.severity}</div>
                        </div>
                        <div className="mt-2 text-xs text-white/55">{flag.detail}</div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-sm text-white/35">No elevated risk flags detected for this user.</div>
                )}
              </div>

              {isOwner ? (
                <div className="flex flex-wrap gap-3">
                  <button onClick={() => { setSelectedUserId(String(selectedAdminUser.user.id)); setAdminSection('overview'); }} className="rounded-2xl bg-[#00FF88] px-4 py-2 text-[10px] font-black uppercase tracking-[0.16em] text-black">Adjust Wallet</button>
                  <button onClick={() => { setModUserId(String(selectedAdminUser.user.id)); setModAction('mute'); setAdminSection('moderation'); }} className="rounded-2xl border border-white/10 px-4 py-2 text-[10px] font-black uppercase tracking-[0.16em] text-white/70">Mute User</button>
                  <button onClick={() => { setModUserId(String(selectedAdminUser.user.id)); setModAction('ban'); setAdminSection('moderation'); }} className="rounded-2xl border border-red-400/25 px-4 py-2 text-[10px] font-black uppercase tracking-[0.16em] text-red-300">Ban User</button>
                </div>
              ) : null}

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                <div className="rounded-2xl border border-white/5 bg-black/25 p-4 space-y-3">
                  <div className="text-sm font-black uppercase tracking-tight">Recent Sessions</div>
                  {selectedAdminUser.sessions?.length ? selectedAdminUser.sessions.map((session: any) => (
                    <div key={session.id} className="rounded-2xl border border-white/5 bg-white/[0.03] px-3 py-3 text-xs text-white/55">
                      <div className="flex justify-between gap-3"><span>{session.device}</span><span>{session.ipAddress || 'Unknown IP'}</span></div>
                      <div className="mt-1 text-white/30">Last active {session.lastActiveAt ? new Date(session.lastActiveAt).toLocaleString() : 'Unknown'}</div>
                    </div>
                  )) : <div className="text-sm text-white/35">No active sessions.</div>}
                </div>
                <div className="rounded-2xl border border-white/5 bg-black/25 p-4 space-y-3">
                  <div className="text-sm font-black uppercase tracking-tight">Recent Bets</div>
                  {selectedAdminUser.recentBets?.length ? selectedAdminUser.recentBets.map((bet: any) => (
                    <div key={bet.id} className="rounded-2xl border border-white/5 bg-white/[0.03] px-3 py-3 text-xs text-white/55">
                      <div className="flex justify-between gap-3"><span className="font-black capitalize text-white">{bet.gameKey}</span><span>{new Date(bet.createdAt).toLocaleString()}</span></div>
                      <div className="mt-2 flex justify-between gap-3"><span>Wager {formatMoneyFromCoins(bet.wager)}</span><span className={bet.outcome === 'win' ? 'text-[#00FF88]' : 'text-red-300'}>{formatMoneyFromCoins(bet.payout)}</span></div>
                    </div>
                  )) : <div className="text-sm text-white/35">No bet history yet.</div>}
                </div>
              </div>
            </>
          ) : (
            <div className="h-full min-h-[420px] flex items-center justify-center text-sm text-white/35">Select a user to inspect wallet, sessions, bets, and moderation actions.</div>
          )}
        </div>
      </div>
      ) : null}

      {adminSection === 'payments' ? (
      <div className="grid grid-cols-1 lg:grid-cols-[0.85fr_1.15fr] gap-6">
        <div className="rounded-[32px] border border-white/10 bg-[#141821] p-6 space-y-4">
          <div className="text-lg font-black uppercase tracking-tight">Recent Withdrawals</div>
          <div className="grid grid-cols-1 gap-3">
            {(overview?.withdrawals || []).map((entry) => (
              <button
                key={entry.id}
                onClick={() => setSelectedWithdrawalId(entry.id)}
                className="rounded-2xl border border-white/5 bg-black/25 px-4 py-4 text-left transition-all hover:border-[#00FF88]/35 hover:bg-black/35"
              >
                <div className="flex items-center justify-between gap-4">
                  <div className="text-sm font-black">{entry.username}</div>
                  <div className="text-[10px] uppercase tracking-[0.16em] text-[#00FF88] font-black">{entry.status}</div>
                </div>
                <div className="mt-2 text-sm text-white/55">{formatMoneyFromCoins(entry.amount)} {entry.currency.toUpperCase()}</div>
                <div className="mt-1 text-[11px] text-white/30">{new Date(entry.createdAt).toLocaleString()}</div>
              </button>
            ))}
          </div>
        </div>

        <div className="rounded-[32px] border border-white/10 bg-[#141821] p-6 space-y-4">
          <div className="text-lg font-black uppercase tracking-tight">Payment Operations</div>
          <div className="rounded-2xl border border-white/5 bg-black/25 p-5 space-y-4">
            <div>
              <div className="text-[10px] uppercase tracking-[0.18em] text-white/25 font-black">Review Flow</div>
              <div className="mt-2 text-sm text-white/55 leading-relaxed">
                Inspect withdrawal requests, mark them processing or completed, or decline and refund directly from the detail modal.
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="rounded-2xl border border-white/5 bg-white/[0.03] p-4">
                <div className="text-[10px] uppercase tracking-[0.16em] text-white/25 font-black">Pending</div>
                <div className="mt-2 text-2xl font-black">{overview?.withdrawals.filter((entry) => entry.status === 'pending').length ?? 0}</div>
              </div>
              <div className="rounded-2xl border border-white/5 bg-white/[0.03] p-4">
                <div className="text-[10px] uppercase tracking-[0.16em] text-white/25 font-black">Processing</div>
                <div className="mt-2 text-2xl font-black">{overview?.withdrawals.filter((entry) => entry.status === 'processing').length ?? 0}</div>
              </div>
            </div>
          </div>
        </div>
      </div>
      ) : null}

      {adminSection === 'history' ? (
      <div className="rounded-[32px] border border-white/10 bg-[#141821] p-6 space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <div className="text-lg font-black uppercase tracking-tight">Game History</div>
            <div className="text-sm text-white/45">Modeled after the reference repo’s history-heavy admin area, using live Pasus activity data.</div>
          </div>
          <div className="flex gap-2">
            {([
              ['all', 'Recent'],
              ['high', 'High Wins'],
              ['lucky', 'Lucky'],
            ] as const).map(([value, label]) => (
              <button
                key={value}
                onClick={() => setActivityTab(value)}
                className={cn(
                  'rounded-full px-4 py-2 text-[10px] font-black uppercase tracking-[0.16em]',
                  activityTab === value ? 'bg-[#00FF88] text-black' : 'bg-white/5 text-white/55'
                )}
              >
                {label}
              </button>
            ))}
          </div>
        </div>
        <div className="space-y-3">
          {activityFeed.map((entry) => (
            <div key={entry.id} className="rounded-2xl border border-white/5 bg-black/25 px-4 py-4">
              <div className="flex items-center justify-between gap-4">
                <div>
                  <div className="text-sm font-black">{entry.username}</div>
                  <div className="mt-1 text-[10px] uppercase tracking-[0.16em] text-white/30">{entry.gameKey}</div>
                </div>
                <div className="text-right">
                  <div className={cn('text-[10px] uppercase tracking-[0.16em] font-black', entry.outcome === 'win' ? 'text-[#00FF88]' : entry.outcome === 'push' ? 'text-blue-300' : 'text-red-300')}>
                    {entry.outcome}
                  </div>
                  <div className="mt-1 text-[11px] text-white/30">{new Date(entry.createdAt).toLocaleString()}</div>
                </div>
              </div>
              <div className="mt-3 grid grid-cols-3 gap-3 text-sm">
                <div><span className="text-white/35">Wager</span><div className="font-mono">{formatMoneyFromCoins(entry.wager)}</div></div>
                <div><span className="text-white/35">Payout</span><div className="font-mono">{formatMoneyFromCoins(entry.payout)}</div></div>
                <div><span className="text-white/35">Multiplier</span><div className="font-mono">{entry.multiplier.toFixed(2)}x</div></div>
              </div>
              <div className="mt-3 flex items-center justify-between gap-3">
                <div className="text-[11px] text-white/35 truncate">{entry.detail || 'No replay details saved.'}</div>
                <div className="flex gap-2 shrink-0">
                  <a href={getBetShareUrl(entry.id)} target="_blank" rel="noreferrer" className="rounded-full bg-white/5 px-3 py-1 text-[10px] font-black uppercase tracking-[0.14em] text-white/55 hover:text-white">
                    Open
                  </a>
                  <button onClick={() => navigator.clipboard.writeText(getBetShareUrl(entry.id))} className="rounded-full bg-[#00FF88]/10 px-3 py-1 text-[10px] font-black uppercase tracking-[0.14em] text-[#00FF88]">
                    Share
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
      ) : null}

      {adminSection === 'support' ? (
      <div className="grid grid-cols-1 lg:grid-cols-[0.85fr_1.15fr] gap-6">
        <div className="rounded-[32px] border border-white/10 bg-[#141821] p-6 space-y-4">
          <div className="text-lg font-black uppercase tracking-tight">Support Inbox</div>
          <div className="space-y-3 max-h-[520px] overflow-y-auto custom-scrollbar">
            {supportTickets.length ? supportTickets.map((ticket) => (
                <button
                  key={ticket.id}
                  onClick={() => setSelectedSupportTicketId(ticket.id)}
                className={cn(
                  'w-full rounded-2xl border px-4 py-4 text-left transition-all',
                  selectedSupportTicketId === ticket.id ? 'border-[#00FF88]/40 bg-[#00FF88]/10' : 'border-white/5 bg-black/25'
                )}
              >
                  <div className="flex items-center justify-between gap-3">
                    <div className="text-sm font-black">{ticket.subject}</div>
                    <div className="text-[10px] uppercase tracking-[0.16em] text-[#00FF88] font-black">{ticket.status}</div>
                  </div>
                  <div className="mt-2 text-[10px] uppercase tracking-[0.16em] text-white/25">{ticket.category || 'general'}</div>
                  <div className="mt-2 text-xs text-white/45">{ticket.username}</div>
                  <div className="mt-2 text-[11px] text-white/25">{new Date(ticket.updatedAt).toLocaleString()}</div>
                </button>
            )) : (
              <div className="rounded-2xl border border-white/5 bg-black/25 px-4 py-8 text-sm text-white/35">No support tickets yet.</div>
            )}
          </div>
        </div>

        <div className="rounded-[32px] border border-white/10 bg-[#141821] p-6 space-y-4">
          <div className="flex items-center justify-between gap-4">
            <div>
              <div className="text-lg font-black uppercase tracking-tight">{selectedSupportTicket?.subject || 'Select A Ticket'}</div>
              <div className="text-xs text-white/35">{selectedSupportTicket ? `${selectedSupportTicket.username} • ${selectedSupportTicket.status}` : 'Open a ticket from the list to view the thread.'}</div>
            </div>
          </div>
          <div className="rounded-3xl border border-white/5 bg-black/25 p-4 space-y-3 min-h-[320px] max-h-[420px] overflow-y-auto custom-scrollbar">
            {selectedSupportTicket ? selectedSupportTicket.messages.map((entry) => (
              <div key={`${selectedSupportTicket.id}-${entry.id}-${entry.createdAt}`} className={cn('rounded-2xl px-4 py-3 border', entry.senderType === 'admin' ? 'border-[#00FF88]/20 bg-[#00FF88]/10 ml-8' : 'border-white/5 bg-white/[0.03] mr-8')}>
                <div className="flex items-center justify-between gap-3">
                  <div className="text-xs font-black">{entry.username}</div>
                  <div className="text-[10px] text-white/25">{new Date(entry.createdAt).toLocaleString()}</div>
                </div>
                <div className="mt-2 text-sm text-white/65 whitespace-pre-wrap">{entry.message}</div>
                {entry.attachmentUrl ? (
                  <a href={entry.attachmentUrl} target="_blank" rel="noreferrer" className="mt-3 inline-flex items-center gap-2 rounded-full bg-white/5 px-3 py-1 text-[10px] font-black uppercase tracking-[0.14em] text-[#00FF88]">
                    <Paperclip size={10} />
                    {entry.attachmentName || 'Attachment'}
                  </a>
                ) : null}
              </div>
            )) : (
              <div className="h-full flex items-center justify-center text-sm text-white/35">Pick a ticket to view the support thread.</div>
            )}
          </div>
          <div className="space-y-3">
            <textarea
              value={supportReply}
              onChange={(e) => setSupportReply(e.target.value)}
              rows={4}
              placeholder={selectedSupportTicket ? 'Reply to this ticket' : 'Select a ticket first'}
              disabled={!selectedSupportTicket}
              className="w-full rounded-2xl border border-white/10 bg-black/30 px-4 py-3 text-sm focus:outline-none resize-none disabled:opacity-50"
            />
            <input
              value={supportReplyAttachmentUrl}
              onChange={(e) => setSupportReplyAttachmentUrl(e.target.value)}
              placeholder={selectedSupportTicket ? 'Attachment URL (optional)' : 'Select a ticket first'}
              disabled={!selectedSupportTicket}
              className="w-full rounded-2xl border border-white/10 bg-black/30 px-4 py-3 text-sm focus:outline-none disabled:opacity-50"
            />
            <button
              onClick={submitSupportReply}
              disabled={!selectedSupportTicket || !supportReply.trim() || isReplyingToSupport}
              className="rounded-2xl bg-[#00FF88] text-black px-5 py-3 text-xs font-black uppercase tracking-[0.16em] disabled:opacity-40"
            >
              {isReplyingToSupport ? 'Replying...' : 'Send Support Reply'}
            </button>
          </div>
        </div>
      </div>
      ) : null}

      {adminSection === 'promos' ? (
      <div className="grid grid-cols-1 lg:grid-cols-[0.85fr_1.15fr] gap-6">
        <div className="rounded-[32px] border border-white/10 bg-[#141821] p-6 space-y-4">
          <div className="text-lg font-black uppercase tracking-tight">Create Promo Code</div>
          <div className="space-y-3">
            <div className="space-y-2">
              <label className="text-[10px] font-black uppercase tracking-[0.18em] text-white/30">Code</label>
              <input
                type="text"
                value={newPromoCode}
                onChange={(e) => setNewPromoCode(e.target.value.toUpperCase())}
                placeholder="PROMO2024"
                className="w-full rounded-2xl border border-white/10 bg-black/30 px-4 py-3 text-sm font-bold tracking-widest focus:outline-none"
                maxLength={32}
              />
            </div>
            <div className="space-y-2">
              <label className="text-[10px] font-black uppercase tracking-[0.18em] text-white/30">Amount ($)</label>
              <input
                type="number"
                value={newPromoCoins}
                onChange={(e) => setNewPromoCoins(e.target.value)}
                placeholder="1000"
                className="w-full rounded-2xl border border-white/10 bg-black/30 px-4 py-3 text-sm font-mono focus:outline-none"
              />
            </div>
            <div className="space-y-2">
              <label className="text-[10px] font-black uppercase tracking-[0.18em] text-white/30">Max Uses</label>
              <input
                type="number"
                value={newPromoMaxUses}
                onChange={(e) => setNewPromoMaxUses(e.target.value)}
                placeholder="1"
                className="w-full rounded-2xl border border-white/10 bg-black/30 px-4 py-3 text-sm font-mono focus:outline-none"
              />
            </div>
            <div className="space-y-2">
              <label className="text-[10px] font-black uppercase tracking-[0.18em] text-white/30">Expires At (optional)</label>
              <input
                type="datetime-local"
                value={newPromoExpires}
                onChange={(e) => setNewPromoExpires(e.target.value)}
                className="w-full rounded-2xl border border-white/10 bg-black/30 px-4 py-3 text-sm focus:outline-none"
              />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div className="space-y-2">
                <label className="text-[10px] font-black uppercase tracking-[0.18em] text-white/30">Min Level</label>
                <input type="number" value={newPromoMinLevel} onChange={(e) => setNewPromoMinLevel(e.target.value)} className="w-full rounded-2xl border border-white/10 bg-black/30 px-4 py-3 text-sm font-mono focus:outline-none" />
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-black uppercase tracking-[0.18em] text-white/30">Min Wagered ($)</label>
                <input type="number" value={newPromoMinWagered} onChange={(e) => setNewPromoMinWagered(e.target.value)} className="w-full rounded-2xl border border-white/10 bg-black/30 px-4 py-3 text-sm font-mono focus:outline-none" />
              </div>
            </div>
            <label className="flex items-center gap-3 rounded-2xl border border-white/10 bg-black/20 px-4 py-3 text-sm text-white/70">
              <input type="checkbox" checked={newPromoReferredOnly} onChange={(e) => setNewPromoReferredOnly(e.target.checked)} />
              Referred users only
            </label>
            <button
              onClick={async () => {
                if (!newPromoCode.trim()) {
                  setStatus('Enter a promo code.');
                  return;
                }
                const token = localStorage.getItem('pasus_auth_token');
                try {
                  const response = await apiFetch('/api/admin/promo/create', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
                    body: JSON.stringify({
                      code: newPromoCode.trim(),
                      coinAmount: parseInt(newPromoCoins) || 0,
                      maxUses: parseInt(newPromoMaxUses) || 1,
                      expiresAt: newPromoExpires || null,
                      minLevel: parseInt(newPromoMinLevel) || 1,
                      minTotalWagered: usdToCoins(parseFloat(newPromoMinWagered) || 0),
                      referredOnly: newPromoReferredOnly,
                    }),
                  });
                  const data = await response.json().catch(() => ({}));
                  if (!response.ok) throw new Error(data.error || 'Failed to create promo code.');
                  setStatus(`Promo code ${data.code} created successfully!`);
                  setNewPromoCode('');
                  setNewPromoCoins('');
                  setNewPromoMaxUses('1');
                  setNewPromoExpires('');
                  setNewPromoMinLevel('1');
                  setNewPromoMinWagered('0');
                  setNewPromoReferredOnly(false);
                  loadPromos();
                } catch (err) {
                  setStatus(err instanceof Error ? err.message : 'Failed to create promo code.');
                }
              }}
              className="w-full rounded-2xl bg-[#00FF88] text-black px-5 py-3 text-xs font-black uppercase tracking-[0.16em]"
            >
              Create Promo Code
            </button>
          </div>
        </div>

        <div className="rounded-[32px] border border-white/10 bg-[#141821] p-6 space-y-4">
          <div className="text-lg font-black uppercase tracking-tight">Promo Codes ({promos.length})</div>
          <div className="space-y-3 max-h-[500px] overflow-y-auto custom-scrollbar">
            {promos.length ? promos.map((promo) => (
              <div key={promo.id} className="rounded-2xl border border-white/5 bg-black/25 px-4 py-4">
                <div className="flex items-center justify-between gap-3">
                  <div className="text-sm font-black tracking-widest">{promo.code}</div>
                  <div className="text-[10px] uppercase tracking-[0.16em] text-[#00FF88] font-bold">
                    {formatMoneyFromCoins(promo.coinAmount)}
                  </div>
                </div>
                <div className="mt-2 flex items-center justify-between text-xs text-white/35">
                  <span>{promo.currentUses} / {promo.maxUses} used</span>
                  <span>{promo.expiresAt ? `Exp: ${new Date(promo.expiresAt).toLocaleDateString()}` : 'Never expires'}</span>
                </div>
                <div className="mt-2 text-[11px] text-white/30">
                  Lvl {promo.minLevel}+ • {formatMoneyFromCoins(promo.minTotalWagered)} wagered{promo.referredOnly ? ' • referred only' : ''}
                </div>
                <div className="mt-1 text-[10px] text-white/20">By {promo.createdBy}</div>
              </div>
            )) : (
              <div className="text-sm text-white/35">No promo codes yet.</div>
            )}
          </div>
        </div>
      </div>
      ) : null}

      {adminSection === 'broadcasts' ? (
      <div className="grid grid-cols-1 lg:grid-cols-[0.85fr_1.15fr] gap-6">
        <div className="rounded-[32px] border border-white/10 bg-[#141821] p-6 space-y-4">
          <div className="text-lg font-black uppercase tracking-tight">Create Broadcast</div>
          <div className="space-y-3">
            <div className="space-y-2">
              <label className="text-[10px] font-black uppercase tracking-[0.18em] text-white/30">Message</label>
              <textarea
                value={newBroadcastMessage}
                onChange={(e) => setNewBroadcastMessage(e.target.value)}
                placeholder="Announcement message..."
                rows={4}
                className="w-full rounded-2xl border border-white/10 bg-black/30 px-4 py-3 text-sm focus:outline-none resize-none"
                maxLength={500}
              />
            </div>
            <div className="space-y-2">
              <label className="text-[10px] font-black uppercase tracking-[0.18em] text-white/30">Expires At (optional)</label>
              <input
                type="datetime-local"
                value={newBroadcastExpires}
                onChange={(e) => setNewBroadcastExpires(e.target.value)}
                className="w-full rounded-2xl border border-white/10 bg-black/30 px-4 py-3 text-sm focus:outline-none"
              />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div className="space-y-2">
                <label className="text-[10px] font-black uppercase tracking-[0.18em] text-white/30">Min Level</label>
                <input type="number" value={newBroadcastMinLevel} onChange={(e) => setNewBroadcastMinLevel(e.target.value)} className="w-full rounded-2xl border border-white/10 bg-black/30 px-4 py-3 text-sm font-mono focus:outline-none" />
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-black uppercase tracking-[0.18em] text-white/30">Min Wagered ($)</label>
                <input type="number" value={newBroadcastMinWagered} onChange={(e) => setNewBroadcastMinWagered(e.target.value)} className="w-full rounded-2xl border border-white/10 bg-black/30 px-4 py-3 text-sm font-mono focus:outline-none" />
              </div>
            </div>
            <label className="flex items-center gap-3 rounded-2xl border border-white/10 bg-black/20 px-4 py-3 text-sm text-white/70">
              <input type="checkbox" checked={newBroadcastReferredOnly} onChange={(e) => setNewBroadcastReferredOnly(e.target.checked)} />
              Referred users only
            </label>
            <button
              onClick={async () => {
                if (!newBroadcastMessage.trim()) {
                  setStatus('Enter a message.');
                  return;
                }
                const token = localStorage.getItem('pasus_auth_token');
                try {
                  const response = await apiFetch('/api/admin/broadcast/create', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
                    body: JSON.stringify({
                      message: newBroadcastMessage.trim(),
                      expiresAt: newBroadcastExpires || null,
                      minLevel: parseInt(newBroadcastMinLevel) || 1,
                      minTotalWagered: usdToCoins(parseFloat(newBroadcastMinWagered) || 0),
                      referredOnly: newBroadcastReferredOnly,
                    }),
                  });
                  const data = await response.json().catch(() => ({}));
                  if (!response.ok) throw new Error(data.error || 'Failed to create broadcast.');
                  setStatus('Broadcast created successfully!');
                  setNewBroadcastMessage('');
                  setNewBroadcastExpires('');
                  setNewBroadcastMinLevel('1');
                  setNewBroadcastMinWagered('0');
                  setNewBroadcastReferredOnly(false);
                  loadBroadcasts();
                } catch (err) {
                  setStatus(err instanceof Error ? err.message : 'Failed to create broadcast.');
                }
              }}
              className="w-full rounded-2xl bg-amber-500 text-black px-5 py-3 text-xs font-black uppercase tracking-[0.16em]"
            >
              Create Broadcast
            </button>
          </div>
        </div>

        <div className="rounded-[32px] border border-white/10 bg-[#141821] p-6 space-y-4">
          <div className="text-lg font-black uppercase tracking-tight">Broadcasts ({broadcasts.length})</div>
          <div className="space-y-3 max-h-[500px] overflow-y-auto custom-scrollbar">
            {broadcasts.length ? broadcasts.map((broadcast) => (
              <div key={broadcast.id} className={cn(
                'rounded-2xl border px-4 py-4',
                broadcast.isActive ? 'border-amber-500/30 bg-amber-500/10' : 'border-red-500/30 bg-red-500/10'
              )}>
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 text-sm text-white/90 whitespace-pre-wrap">{broadcast.message}</div>
                  <button
                    onClick={async () => {
                      const token = localStorage.getItem('pasus_auth_token');
                      try {
                        await apiFetch(`/api/admin/broadcast/${broadcast.id}/toggle`, {
                          method: 'POST',
                          headers: { Authorization: `Bearer ${token}` },
                        });
                        loadBroadcasts();
                      } catch {}
                    }}
                    className={cn(
                      'shrink-0 rounded-xl px-3 py-1 text-[10px] font-black uppercase tracking-widest',
                      broadcast.isActive ? 'bg-red-500/20 text-red-300' : 'bg-green-500/20 text-green-300'
                    )}
                  >
                    {broadcast.isActive ? 'Deactivate' : 'Activate'}
                  </button>
                </div>
                <div className="mt-2 text-[10px] text-white/35">
                  Created: {new Date(broadcast.createdAt).toLocaleString()}
                  {broadcast.expiresAt && ` • Expires: ${new Date(broadcast.expiresAt).toLocaleString()}`}
                </div>
                <div className="mt-1 text-[10px] text-white/25">
                  Lvl {broadcast.minLevel}+ • {formatMoneyFromCoins(broadcast.minTotalWagered)} wagered{broadcast.referredOnly ? ' • referred only' : ''}
                </div>
              </div>
            )) : (
              <div className="text-sm text-white/35">No broadcasts yet.</div>
            )}
          </div>
        </div>
      </div>
      ) : null}

      {adminSection === 'moderation' ? (
      <div className="grid grid-cols-1 lg:grid-cols-[0.85fr_1.15fr] gap-6">
        <div className="rounded-[32px] border border-white/10 bg-[#141821] p-6 space-y-4">
          <div className="text-lg font-black uppercase tracking-tight">Moderation Actions</div>
          <div className="space-y-3">
            <div className="space-y-2">
              <label className="text-[10px] font-black uppercase tracking-[0.18em] text-white/30">User ID</label>
              <input
                type="number"
                value={modUserId}
                onChange={(e) => setModUserId(e.target.value)}
                placeholder="Enter user ID"
                className="w-full rounded-2xl border border-white/10 bg-black/30 px-4 py-3 text-sm focus:outline-none"
              />
            </div>
            <div className="space-y-2">
              <label className="text-[10px] font-black uppercase tracking-[0.18em] text-white/30">Action</label>
              <div className="grid grid-cols-2 gap-3">
                <button
                  onClick={() => setModAction('ban')}
                  className={cn(
                    'py-3 rounded-2xl text-xs font-black uppercase tracking-[0.16em] transition-all',
                    modAction === 'ban' ? 'bg-red-500 text-white' : 'bg-white/5 text-white/55'
                  )}
                >
                  Ban User
                </button>
                <button
                  onClick={() => setModAction('mute')}
                  className={cn(
                    'py-3 rounded-2xl text-xs font-black uppercase tracking-[0.16em] transition-all',
                    modAction === 'mute' ? 'bg-amber-500 text-black' : 'bg-white/5 text-white/55'
                  )}
                >
                  Mute User
                </button>
              </div>
            </div>
            <div className="space-y-2">
              <label className="text-[10px] font-black uppercase tracking-[0.18em] text-white/30">Reason</label>
              <input
                type="text"
                value={modReason}
                onChange={(e) => setModReason(e.target.value)}
                placeholder="Reason for action"
                className="w-full rounded-2xl border border-white/10 bg-black/30 px-4 py-3 text-sm focus:outline-none"
              />
            </div>
            <div className="space-y-2">
              <label className="text-[10px] font-black uppercase tracking-[0.18em] text-white/30">Duration (minutes, optional)</label>
              <input
                type="number"
                value={modDuration}
                onChange={(e) => setModDuration(e.target.value)}
                placeholder="Permanent if empty"
                className="w-full rounded-2xl border border-white/10 bg-black/30 px-4 py-3 text-sm focus:outline-none"
              />
            </div>
            <button
              onClick={submitModerationAction}
              disabled={isModLoading || !modUserId.trim()}
              className={cn(
                'w-full py-3 rounded-2xl text-xs font-black uppercase tracking-[0.16em] transition-all',
                modAction === 'ban' ? 'bg-red-500 hover:bg-red-600 text-white' : 'bg-amber-500 hover:bg-amber-600 text-black',
                (isModLoading || !modUserId.trim()) && 'opacity-40'
              )}
            >
              {isModLoading ? 'Processing...' : modAction === 'ban' ? 'Ban User' : 'Mute User'}
            </button>
            {status && <div className="text-xs text-white/60">{status}</div>}
          </div>
        </div>

        <div className="rounded-[32px] border border-white/10 bg-[#141821] p-6 space-y-4">
          <div className="flex items-center justify-between">
            <div className="text-lg font-black uppercase tracking-tight">Moderation History</div>
            <div className="flex gap-2">
              {(['all', 'ban', 'mute'] as const).map((filter) => (
                <button
                  key={filter}
                  onClick={() => setModerationFilter(filter)}
                  className={cn(
                    'px-3 py-1 rounded-xl text-[10px] font-black uppercase tracking-[0.14em]',
                    moderationFilter === filter ? 'bg-white/10 text-white' : 'text-white/40'
                  )}
                >
                  {filter}
                </button>
              ))}
            </div>
          </div>
          <div className="space-y-3 max-h-[500px] overflow-y-auto custom-scrollbar">
            {isModLoading ? (
              <div className="text-sm text-white/40">Loading...</div>
            ) : moderationHistory.length > 0 ? moderationHistory.map((entry) => (
              <div key={entry.id} className={cn(
                'rounded-2xl border px-4 py-4',
                entry.action === 'ban' ? 'border-red-500/30 bg-red-500/10' : 'border-amber-500/30 bg-amber-500/10'
              )}>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className={cn(
                      'text-[10px] px-2 py-0.5 rounded-full font-black uppercase',
                      entry.action === 'ban' ? 'bg-red-500/20 text-red-300' : 'bg-amber-500/20 text-amber-300'
                    )}>
                      {entry.action}
                    </span>
                    <span className="text-sm font-bold">{entry.username}</span>
                  </div>
                  <span className="text-[10px] text-white/30">
                    by {entry.moderatorUsername}
                  </span>
                </div>
                {entry.reason && <div className="mt-2 text-xs text-white/60">{entry.reason}</div>}
                <div className="mt-2 flex items-center gap-4 text-[10px] text-white/35">
                  <span>{new Date(entry.createdAt).toLocaleString()}</span>
                  {entry.durationMinutes && <span>Duration: {entry.durationMinutes} min</span>}
                </div>
              </div>
            )) : (
              <div className="text-sm text-white/35">No moderation history.</div>
            )}
          </div>
        </div>
      </div>
      ) : null}

      {adminSection === 'analytics' ? (
      <div className="space-y-6">
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="rounded-[28px] border border-white/10 bg-[#141821] p-5">
            <div className="text-[10px] uppercase tracking-[0.18em] text-white/25 font-black">Total Users</div>
            <div className="mt-3 text-3xl font-black italic">{analytics?.users.total ?? 0}</div>
          </div>
          <div className="rounded-[28px] border border-white/10 bg-[#141821] p-5">
            <div className="text-[10px] uppercase tracking-[0.18em] text-white/25 font-black">Active Today</div>
            <div className="mt-3 text-3xl font-black italic text-[#00FF88]">{analytics?.users.activeToday ?? 0}</div>
          </div>
          <div className="rounded-[28px] border border-white/10 bg-[#141821] p-5">
            <div className="text-[10px] uppercase tracking-[0.18em] text-white/25 font-black">Wagered Today</div>
            <div className="mt-3 text-3xl font-black italic">{formatMoneyFromCoins(analytics?.wagering.today ?? 0)}</div>
          </div>
          <div className="rounded-[28px] border border-white/10 bg-[#141821] p-5">
            <div className="text-[10px] uppercase tracking-[0.18em] text-white/25 font-black">Revenue Today</div>
            <div className="mt-3 text-3xl font-black italic text-emerald-400">{formatMoneyFromCoins(analytics?.revenue.today ?? 0)}</div>
          </div>
        </div>

        <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
          <MiniTrendChart title="New Users" data={analytics?.trends || []} dataKey="users" tone="emerald" />
          <MiniTrendChart title="Daily Wagered" data={analytics?.trends || []} dataKey="wagered" tone="blue" formatter={formatMoneyFromCoins} />
          <MiniTrendChart title="Daily Revenue" data={analytics?.trends || []} dataKey="revenue" tone="amber" formatter={formatMoneyFromCoins} />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="rounded-[28px] border border-white/10 bg-[#141821] p-5">
            <div className="text-sm font-black uppercase tracking-tight mb-4">User Acquisition</div>
            <div className="space-y-3">
              <div className="flex justify-between"><span className="text-xs text-white/40">Today</span><span className="text-sm font-bold">{analytics?.users.today ?? 0}</span></div>
              <div className="flex justify-between"><span className="text-xs text-white/40">This Week</span><span className="text-sm font-bold">{analytics?.users.week ?? 0}</span></div>
              <div className="flex justify-between"><span className="text-xs text-white/40">This Month</span><span className="text-sm font-bold">{analytics?.users.month ?? 0}</span></div>
              <div className="border-t border-white/5 pt-2 mt-2 flex justify-between"><span className="text-xs text-white/40">Active Today</span><span className="text-sm font-bold text-[#00FF88]">{analytics?.users.activeToday ?? 0}</span></div>
              <div className="flex justify-between"><span className="text-xs text-white/40">Active Week</span><span className="text-sm font-bold text-[#00FF88]">{analytics?.users.activeWeek ?? 0}</span></div>
            </div>
          </div>

          <div className="rounded-[28px] border border-white/10 bg-[#141821] p-5">
            <div className="text-sm font-black uppercase tracking-tight mb-4">Wagering</div>
            <div className="space-y-3">
              <div className="flex justify-between"><span className="text-xs text-white/40">Today</span><span className="text-sm font-bold">{formatMoneyFromCoins(analytics?.wagering.today ?? 0)}</span></div>
              <div className="flex justify-between"><span className="text-xs text-white/40">This Week</span><span className="text-sm font-bold">{formatMoneyFromCoins(analytics?.wagering.week ?? 0)}</span></div>
              <div className="flex justify-between"><span className="text-xs text-white/40">This Month</span><span className="text-sm font-bold">{formatMoneyFromCoins(analytics?.wagering.month ?? 0)}</span></div>
              <div className="border-t border-white/5 pt-2 mt-2 flex justify-between"><span className="text-xs text-white/40">Total</span><span className="text-sm font-bold">{formatMoneyFromCoins(analytics?.wagering.total ?? 0)}</span></div>
            </div>
          </div>

          <div className="rounded-[28px] border border-white/10 bg-[#141821] p-5">
            <div className="text-sm font-black uppercase tracking-tight mb-4">Deposits & Withdrawals</div>
            <div className="space-y-3">
              <div className="flex justify-between"><span className="text-xs text-white/40">Total Deposited</span><span className="text-sm font-bold text-[#00FF88]">${analytics?.deposits.total ?? 0}</span></div>
              <div className="flex justify-between"><span className="text-xs text-white/40">Today</span><span className="text-sm font-bold">${analytics?.deposits.today ?? 0}</span></div>
              <div className="flex justify-between"><span className="text-xs text-white/40">This Week</span><span className="text-sm font-bold">${analytics?.deposits.week ?? 0}</span></div>
              <div className="flex justify-between"><span className="text-xs text-white/40">This Month</span><span className="text-sm font-bold">${analytics?.deposits.month ?? 0}</span></div>
              <div className="border-t border-white/5 pt-2 mt-2 flex justify-between"><span className="text-xs text-white/40">Total Withdrawn</span><span className="text-sm font-bold text-red-400">{formatMoneyFromCoins(analytics?.withdrawals.total ?? 0)}</span></div>
            </div>
          </div>
        </div>

        <div className="rounded-[28px] border border-white/10 bg-[#141821] p-5">
          <div className="text-sm font-black uppercase tracking-tight mb-4">Game Performance</div>
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="text-[10px] font-black uppercase tracking-[0.18em] text-white/25">
                  <th className="px-3 py-2">Game</th>
                  <th className="px-3 py-2 text-right">Bets</th>
                  <th className="px-3 py-2 text-right">Wagered</th>
                  <th className="px-3 py-2 text-right">Payout</th>
                  <th className="px-3 py-2 text-right">Win%</th>
                  <th className="px-3 py-2 text-right">Max Mult</th>
                  <th className="px-3 py-2 text-right">House Edge</th>
                </tr>
              </thead>
              <tbody className="text-xs">
                {(analytics?.games || []).map((game: any) => {
                  const totalBets = game.totalBets || 0;
                  const wins = game.wins || 0;
                  const winRate = totalBets > 0 ? ((wins / totalBets) * 100).toFixed(1) : '0.0';
                  return (
                    <tr key={game.gameKey} className="border-t border-white/5 hover:bg-white/[0.02]">
                      <td className="px-3 py-2 font-black uppercase">{game.gameKey}</td>
                      <td className="px-3 py-2 text-right font-mono">{game.totalBets.toLocaleString()}</td>
                      <td className="px-3 py-2 text-right font-mono">{formatMoneyFromCoins(game.totalWagered)}</td>
                      <td className="px-3 py-2 text-right font-mono text-[#00FF88]">{formatMoneyFromCoins(game.totalPayout)}</td>
                      <td className="px-3 py-2 text-right">
                        <span className={Number(winRate) > 45 ? 'text-red-400' : 'text-white/60'}>{winRate}%</span>
                      </td>
                      <td className="px-3 py-2 text-right font-mono text-amber-400">{game.maxMultiplier > 0 ? `${game.maxMultiplier.toFixed(2)}x` : '-'}</td>
                      <td className="px-3 py-2 text-right font-mono text-emerald-400">{game.houseEdge}%</td>
                    </tr>
                  );
                })}
                {(analytics?.games || []).length === 0 && (
                  <tr><td colSpan={7} className="px-3 py-4 text-center text-white/30">No game data yet.</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
      ) : null}

      {adminSection === 'tournaments' ? (
      <div className="grid grid-cols-1 lg:grid-cols-[0.9fr_1.1fr] gap-6">
        {isOwner ? (
          <div className="rounded-[28px] border border-white/10 bg-[#141821] p-6 space-y-4">
            <div className="text-lg font-black uppercase tracking-tight">Create Tournament</div>
            <input value={newTournamentName} onChange={(e) => setNewTournamentName(e.target.value)} placeholder="Weekend Wager Race" className="w-full rounded-2xl border border-white/10 bg-black/30 px-4 py-3 text-sm focus:outline-none" />
            <textarea value={newTournamentDescription} onChange={(e) => setNewTournamentDescription(e.target.value)} placeholder="Optional description" rows={3} className="w-full rounded-2xl border border-white/10 bg-black/30 px-4 py-3 text-sm focus:outline-none resize-none" />
            <input value={newTournamentGameKey} onChange={(e) => setNewTournamentGameKey(e.target.value)} placeholder="Game key (optional)" className="w-full rounded-2xl border border-white/10 bg-black/30 px-4 py-3 text-sm focus:outline-none" />
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <input type="datetime-local" value={newTournamentStartTime} onChange={(e) => setNewTournamentStartTime(e.target.value)} className="w-full rounded-2xl border border-white/10 bg-black/30 px-4 py-3 text-sm focus:outline-none" />
              <input type="datetime-local" value={newTournamentEndTime} onChange={(e) => setNewTournamentEndTime(e.target.value)} className="w-full rounded-2xl border border-white/10 bg-black/30 px-4 py-3 text-sm focus:outline-none" />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <input type="number" min="0.01" step="0.01" value={newTournamentMinWager} onChange={(e) => setNewTournamentMinWager(e.target.value)} placeholder="Min wager ($)" className="w-full rounded-2xl border border-white/10 bg-black/30 px-4 py-3 text-sm focus:outline-none" />
              <input type="number" min="0.01" step="0.01" value={newTournamentPrize} onChange={(e) => setNewTournamentPrize(e.target.value)} placeholder="Prize pool ($)" className="w-full rounded-2xl border border-white/10 bg-black/30 px-4 py-3 text-sm focus:outline-none" />
              <input type="number" min="1" step="1" value={newTournamentMaxParticipants} onChange={(e) => setNewTournamentMaxParticipants(e.target.value)} placeholder="Max players" className="w-full rounded-2xl border border-white/10 bg-black/30 px-4 py-3 text-sm focus:outline-none" />
            </div>
            <button onClick={submitTournament} disabled={isTournamentSaving} className="rounded-2xl bg-[#00FF88] text-black px-5 py-3 text-xs font-black uppercase tracking-[0.16em] disabled:opacity-40">
              {isTournamentSaving ? 'Saving...' : 'Create Tournament'}
            </button>
          </div>
        ) : (
          <div className="rounded-[28px] border border-white/10 bg-[#141821] p-6 space-y-4">
            <div className="text-lg font-black uppercase tracking-tight">Tournament Monitor</div>
            <div className="rounded-2xl border border-white/5 bg-black/25 p-5 text-sm leading-relaxed text-white/55">
              This view is read-only for moderators. You can monitor tournament status, timing, prize pools, and winners here.
            </div>
          </div>
        )}

        <div className="rounded-[28px] border border-white/10 bg-[#141821] p-6 space-y-4">
          <div className="text-lg font-black uppercase tracking-tight">Tournament Queue</div>
          <div className="space-y-3">
            {adminTournaments.length ? adminTournaments.map((tournament) => (
              <div key={tournament.id} className="rounded-2xl border border-white/5 bg-black/25 px-4 py-4">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <div className="text-sm font-black">{tournament.name}</div>
                    <div className="mt-1 text-[11px] text-white/35">{tournament.description || 'No description provided.'}</div>
                  </div>
                  <div className={cn('rounded-full px-3 py-1 text-[10px] font-black uppercase tracking-[0.16em]', tournament.status === 'active' ? 'bg-green-500/15 text-green-400' : tournament.status === 'upcoming' ? 'bg-yellow-500/15 text-yellow-300' : 'bg-white/10 text-white/45')}>
                    {tournament.status}
                  </div>
                </div>
                <div className="mt-4 grid grid-cols-2 gap-3 text-[11px] text-white/45">
                  <div>Starts: <span className="text-white/75">{tournament.startsAt ? new Date(tournament.startsAt).toLocaleString() : '-'}</span></div>
                  <div>Ends: <span className="text-white/75">{tournament.endsAt ? new Date(tournament.endsAt).toLocaleString() : '-'}</span></div>
                  <div>Prize: <span className="text-white/75">{formatMoneyFromCoins(tournament.prize)}</span></div>
                  <div>Min wager: <span className="text-white/75">{formatMoneyFromCoins(tournament.minWager || 0)}</span></div>
                  <div>Players: <span className="text-white/75">{tournament.participantCount || 0}</span></div>
                  <div>Game: <span className="text-white/75">{tournament.gameKey || 'All games'}</span></div>
                </div>
                {tournament.prizes?.length ? (
                  <div className="mt-3 flex flex-wrap gap-2 text-[10px] text-white/45">
                    {tournament.prizes.map((prize) => (
                      <div key={`${tournament.id}-admin-prize-${prize.position}`} className="rounded-full bg-white/5 px-3 py-1">
                        #{prize.position} {formatMoneyFromCoins(prize.amount)}
                      </div>
                    ))}
                  </div>
                ) : null}
                {tournament.winners?.length ? (
                  <div className="mt-3 rounded-2xl border border-white/5 bg-white/[0.03] p-3 space-y-2 text-[11px] text-white/55">
                    <div className="text-[10px] font-black uppercase tracking-[0.16em] text-white/30">Winners</div>
                    {tournament.winners.map((winner) => (
                      <div key={`${tournament.id}-admin-winner-${winner.position}`} className="flex items-center justify-between gap-3">
                        <span>#{winner.position} {winner.username}</span>
                        <span className="text-[#00FF88] font-black">{formatMoneyFromCoins(winner.prize)}</span>
                      </div>
                    ))}
                  </div>
                ) : null}
                {isOwner ? (
                  <div className="mt-4 flex justify-end">
                    <button onClick={() => startTournament(tournament.id)} disabled={isTournamentSaving || tournament.status !== 'upcoming'} className="rounded-2xl border border-[#00FF88]/35 px-4 py-2 text-[10px] font-black uppercase tracking-[0.16em] text-[#00FF88] disabled:opacity-35">
                      Start Now
                    </button>
                  </div>
                ) : null}
              </div>
            )) : (
              <div className="rounded-2xl border border-white/5 bg-black/25 px-4 py-8 text-sm text-white/35">No tournaments yet.</div>
            )}
          </div>
        </div>
      </div>
      ) : null}

      {adminSection === 'rain' ? (
      <div className="grid grid-cols-1 lg:grid-cols-[0.85fr_1.15fr] gap-6">
        <div className="rounded-[28px] border border-white/10 bg-[#141821] p-6 space-y-4">
          <div className="text-lg font-black uppercase tracking-tight">Current Rain</div>
          <div className="rounded-2xl border border-white/5 bg-black/25 p-4 space-y-2 text-sm text-white/65">
            <div className="flex justify-between gap-3"><span>Current Pool</span><span className="font-mono text-white">{currentRain ? formatMoneyFromCoins(currentRain.poolAmount) : '...'}</span></div>
            <div className="flex justify-between gap-3"><span>Participants</span><span className="font-mono text-white">{currentRain?.participantCount ?? 0}</span></div>
            <div className="flex justify-between gap-3"><span>Join Opens</span><span className="font-mono text-white">{currentRain?.joinOpensAt ? new Date(currentRain.joinOpensAt).toLocaleString() : '...'}</span></div>
            <div className="flex justify-between gap-3"><span>Ends</span><span className="font-mono text-white">{currentRain?.endsAt ? new Date(currentRain.endsAt).toLocaleString() : '...'}</span></div>
          </div>
          <div className="space-y-3">
            <div className="space-y-2">
              <label className="text-[10px] font-black uppercase tracking-[0.18em] text-white/30">Current Rain Amount ($)</label>
              <input type="number" step="0.01" value={currentRainAmount} onChange={(e) => setCurrentRainAmount(e.target.value)} className="w-full rounded-2xl border border-white/10 bg-black/30 px-4 py-3 text-sm focus:outline-none" placeholder="500.00" />
            </div>
            <div className="space-y-2">
              <label className="text-[10px] font-black uppercase tracking-[0.18em] text-white/30">Current Timer (minutes)</label>
              <input type="number" min="1" value={currentRainTimerMinutes} onChange={(e) => setCurrentRainTimerMinutes(e.target.value)} className="w-full rounded-2xl border border-white/10 bg-black/30 px-4 py-3 text-sm focus:outline-none" placeholder="60" />
            </div>
            <button
              onClick={async () => {
                const token = localStorage.getItem('pasus_auth_token');
                if (!token) return;
                try {
                  const nextAmount = Number(currentRainAmount || 0);
                  const nextTimerMinutes = parseInt(currentRainTimerMinutes, 10) || 60;
                  if (nextAmount <= 0) {
                    throw new Error('Current rain amount must be greater than $0.00.');
                  }
                  if (nextTimerMinutes < 1) {
                    throw new Error('Current rain timer must be at least 1 minute.');
                  }

                  const response = await apiFetch('/api/admin/rain/current', {
                    method: 'PUT',
                    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
                    body: JSON.stringify({
                      poolAmount: nextAmount,
                      timerMinutes: nextTimerMinutes,
                    }),
                  });
                  const data = await response.json().catch(() => ({}));
                  if (!response.ok) throw new Error(data.error || 'Failed to update current rain.');
                  if (data.currentRain) {
                    setCurrentRain({
                      id: Number(data.currentRain.id),
                      poolAmount: Number(data.currentRain.poolAmount || 0),
                      startsAt: String(data.currentRain.startsAt || ''),
                      joinOpensAt: String(data.currentRain.joinOpensAt || ''),
                      endsAt: String(data.currentRain.endsAt || ''),
                      participantCount: currentRain?.participantCount || 0,
                    });
                    setCurrentRainAmount((Number(data.currentRain.poolAmount || 0) / 100).toFixed(2));
                    const remainingMinutes = Math.max(1, Math.ceil((new Date(data.currentRain.endsAt).getTime() - Date.now()) / 60000));
                    setCurrentRainTimerMinutes(String(remainingMinutes));
                  }
                  setStatus('Current rain updated.');
                  await loadRainBotSchedules();
                } catch (err) {
                  setStatus(err instanceof Error ? err.message : 'Failed to update current rain.');
                }
              }}
              className="w-full rounded-2xl bg-[#00FF88] text-black px-5 py-3 text-xs font-black uppercase tracking-[0.16em]"
            >
              Update Current Rain
            </button>
            <div className="pt-4 border-t border-white/5" />
            <div className="text-lg font-black uppercase tracking-tight">Create Schedule</div>
            <div className="space-y-2">
              <label className="text-[10px] font-black uppercase tracking-[0.18em] text-white/30">Interval (minutes)</label>
              <input type="number" value={newRainInterval} onChange={(e) => setNewRainInterval(e.target.value)} className="w-full rounded-2xl border border-white/10 bg-black/30 px-4 py-3 text-sm focus:outline-none" placeholder="60" />
            </div>
            <div className="space-y-2">
              <label className="text-[10px] font-black uppercase tracking-[0.18em] text-white/30">Min Pool Amount ($)</label>
              <input type="number" value={newRainMinPool} onChange={(e) => setNewRainMinPool(e.target.value)} className="w-full rounded-2xl border border-white/10 bg-black/30 px-4 py-3 text-sm focus:outline-none" placeholder="100" />
            </div>
            <div className="space-y-2">
              <label className="text-[10px] font-black uppercase tracking-[0.18em] text-white/30">Rain Amount ($)</label>
              <input type="number" value={newRainAmount} onChange={(e) => setNewRainAmount(e.target.value)} className="w-full rounded-2xl border border-white/10 bg-black/30 px-4 py-3 text-sm focus:outline-none" placeholder="500" />
            </div>
            <button
              onClick={async () => {
                const token = localStorage.getItem('pasus_auth_token');
                if (!token) return;
                try {
                  const response = await apiFetch('/api/admin/rain-bot', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
                    body: JSON.stringify({
                      intervalMinutes: parseInt(newRainInterval) || 60,
                      minPoolAmount: Number(newRainMinPool) || 100,
                      rainAmount: Number(newRainAmount) || 500,
                    }),
                  });
                  const data = await response.json().catch(() => ({}));
                  if (!response.ok) throw new Error(data.error || 'Failed to create schedule.');
                  setStatus('Rain schedule created!');
                  setNewRainInterval('60');
                  setNewRainMinPool('100');
                  setNewRainAmount('500');
                  loadRainBotSchedules();
                } catch (err) {
                  setStatus(err instanceof Error ? err.message : 'Failed to create schedule.');
                }
              }}
              className="w-full rounded-2xl bg-[#00FF88] text-black px-5 py-3 text-xs font-black uppercase tracking-[0.16em]"
            >
              Create Schedule
            </button>
            {status && <div className="text-xs text-white/60">{status}</div>}
          </div>
        </div>

          <div className="rounded-[28px] border border-white/10 bg-[#141821] p-6 space-y-4">
            <div className="flex items-center justify-between">
              <div className="text-lg font-black uppercase tracking-tight">Schedules ({rainBotSchedules.length})</div>
              <button onClick={loadRainBotSchedules} className="px-3 py-1 bg-white/5 rounded-xl text-[10px] text-white/40 hover:text-white">Refresh</button>
          </div>
          <div className="space-y-3 max-h-[500px] overflow-y-auto custom-scrollbar">
            {rainBotSchedules.length > 0 ? rainBotSchedules.map((schedule) => (
              <div key={schedule.id} className={cn('rounded-2xl border px-4 py-4', schedule.isActive ? 'border-emerald-500/30 bg-emerald-500/5' : 'border-white/5 bg-white/5')}>
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 space-y-1">
                    <div className="flex items-center gap-2">
                      <span className={cn('w-2 h-2 rounded-full', schedule.isActive ? 'bg-emerald-400' : 'bg-white/20')} />
                      <span className="text-sm font-black">{schedule.intervalMinutes}min</span>
                    </div>
                   <div className="text-[10px] text-white/40">
                      Min pool: ${(schedule.minPoolAmount / 100).toFixed(2)} | Rain: ${(schedule.rainAmount / 100).toFixed(2)}
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-2 pt-2">
                      <input
                        type="number"
                        value={rainEditDrafts[schedule.id]?.intervalMinutes ?? String(schedule.intervalMinutes)}
                        onChange={(e) => setRainEditDrafts((prev) => ({
                          ...prev,
                          [schedule.id]: {
                            intervalMinutes: e.target.value,
                            minPoolAmount: prev[schedule.id]?.minPoolAmount ?? String(schedule.minPoolAmount / 100),
                            rainAmount: prev[schedule.id]?.rainAmount ?? String(schedule.rainAmount / 100),
                          },
                        }))}
                        className="w-full rounded-xl border border-white/10 bg-black/30 px-3 py-2 text-[11px] focus:outline-none"
                        placeholder="Minutes"
                      />
                      <input
                        type="number"
                        step="0.01"
                        value={rainEditDrafts[schedule.id]?.minPoolAmount ?? String(schedule.minPoolAmount / 100)}
                        onChange={(e) => setRainEditDrafts((prev) => ({
                          ...prev,
                          [schedule.id]: {
                            intervalMinutes: prev[schedule.id]?.intervalMinutes ?? String(schedule.intervalMinutes),
                            minPoolAmount: e.target.value,
                            rainAmount: prev[schedule.id]?.rainAmount ?? String(schedule.rainAmount / 100),
                          },
                        }))}
                        className="w-full rounded-xl border border-white/10 bg-black/30 px-3 py-2 text-[11px] focus:outline-none"
                        placeholder="Min pool $"
                      />
                      <input
                        type="number"
                        step="0.01"
                        value={rainEditDrafts[schedule.id]?.rainAmount ?? String(schedule.rainAmount / 100)}
                        onChange={(e) => setRainEditDrafts((prev) => ({
                          ...prev,
                          [schedule.id]: {
                            intervalMinutes: prev[schedule.id]?.intervalMinutes ?? String(schedule.intervalMinutes),
                            minPoolAmount: prev[schedule.id]?.minPoolAmount ?? String(schedule.minPoolAmount / 100),
                            rainAmount: e.target.value,
                          },
                        }))}
                        className="w-full rounded-xl border border-white/10 bg-black/30 px-3 py-2 text-[11px] focus:outline-none"
                        placeholder="Rain $"
                      />
                    </div>
                    {schedule.lastTriggeredAt && (
                      <div className="text-[10px] text-white/20">
                        Last: {new Date(schedule.lastTriggeredAt).toLocaleString()}
                      </div>
                    )}
                    <div className="text-[10px] text-white/20">
                      Created: {new Date(schedule.createdAt).toLocaleString()}
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={async () => {
                        const token = localStorage.getItem('pasus_auth_token');
                        if (!token) return;
                        const draft = rainEditDrafts[schedule.id];
                        await apiFetch(`/api/admin/rain-bot/${schedule.id}`, {
                          method: 'PUT',
                          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
                          body: JSON.stringify({
                            intervalMinutes: parseInt(draft?.intervalMinutes || String(schedule.intervalMinutes), 10) || schedule.intervalMinutes,
                            minPoolAmount: Number(draft?.minPoolAmount || String(schedule.minPoolAmount / 100)) || (schedule.minPoolAmount / 100),
                            rainAmount: Number(draft?.rainAmount || String(schedule.rainAmount / 100)) || (schedule.rainAmount / 100),
                          }),
                        });
                        setStatus('Rain schedule updated.');
                        loadRainBotSchedules();
                      }}
                      className="px-3 py-1 rounded-xl text-[10px] font-black uppercase bg-[#00FF88]/15 text-[#00FF88]"
                    >
                      Save
                    </button>
                    <button
                      onClick={async () => {
                        const token = localStorage.getItem('pasus_auth_token');
                        if (!token) return;
                        await apiFetch(`/api/admin/rain-bot/${schedule.id}/toggle`, { method: 'POST', headers: { Authorization: `Bearer ${token}` } });
                        loadRainBotSchedules();
                      }}
                      className={cn('px-3 py-1 rounded-xl text-[10px] font-black uppercase', schedule.isActive ? 'bg-red-500/20 text-red-300' : 'bg-emerald-500/20 text-emerald-300')}
                    >
                      {schedule.isActive ? 'Disable' : 'Enable'}
                    </button>
                    <button
                      onClick={async () => {
                        const token = localStorage.getItem('pasus_auth_token');
                        if (!token) return;
                        await apiFetch(`/api/admin/rain-bot/${schedule.id}`, { method: 'DELETE', headers: { Authorization: `Bearer ${token}` } });
                        loadRainBotSchedules();
                      }}
                      className="px-3 py-1 rounded-xl text-[10px] font-black uppercase bg-white/10 text-white/50 hover:text-red-400"
                    >
                      Delete
                    </button>
                  </div>
                </div>
              </div>
            )) : (
              <div className="text-sm text-white/35 text-center py-8">No rain schedules. Create one to auto-fund rain pools.</div>
            )}
          </div>
        </div>
      </div>
      ) : null}

      {adminPreviewUsername ? (
        <Suspense fallback={lazyFallback}>
          <ProfilePage username={adminPreviewUsername} onClose={() => setAdminPreviewUsername(null)} />
        </Suspense>
      ) : null}

      <AnimatePresence>
        {selectedWithdrawal ? (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setSelectedWithdrawalId(null)}
              className="absolute inset-0 bg-black/80 backdrop-blur-sm"
            />
            <motion.div
              initial={{ scale: 0.96, opacity: 0, y: 24 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.98, opacity: 0, y: 12 }}
              className="relative w-full max-w-xl rounded-[32px] border border-white/10 bg-[#141821] shadow-2xl"
            >
              <div className="flex items-center justify-between gap-4 border-b border-white/5 px-6 py-5">
                <div>
                  <div className="text-[10px] font-black uppercase tracking-[0.22em] text-[#00FF88]">Withdrawal Detail</div>
                  <div className="mt-1 text-xl font-black uppercase tracking-tight">{selectedWithdrawal.username}</div>
                </div>
                <button onClick={() => setSelectedWithdrawalId(null)} className="rounded-full p-2 transition-colors hover:bg-white/5">
                  <X size={18} className="text-white/45" />
                </button>
              </div>

              <div className="max-h-[80vh] space-y-6 overflow-y-auto p-6 custom-scrollbar">
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  <div className="rounded-2xl border border-white/5 bg-black/25 p-4">
                    <div className="text-[10px] font-black uppercase tracking-[0.16em] text-white/25">Status</div>
                    <div className="mt-2 text-lg font-black text-[#00FF88]">{selectedWithdrawal.status}</div>
                  </div>
                  <div className="rounded-2xl border border-white/5 bg-black/25 p-4">
                    <div className="text-[10px] font-black uppercase tracking-[0.16em] text-white/25">Requested At</div>
                    <div className="mt-2 text-sm font-medium text-white/80">{new Date(selectedWithdrawal.createdAt).toLocaleString()}</div>
                  </div>
                  <div className="rounded-2xl border border-white/5 bg-black/25 p-4">
                    <div className="text-[10px] font-black uppercase tracking-[0.16em] text-white/25">Requested Amount</div>
                    <div className="mt-2 text-lg font-black">{formatMoneyFromCoins(selectedWithdrawal.amount)}</div>
                    <div className="mt-1 text-[11px] text-white/35">Payout currency: {selectedWithdrawal.currency.toUpperCase()}</div>
                  </div>
                  <div className="rounded-2xl border border-white/5 bg-black/25 p-4">
                    <div className="text-[10px] font-black uppercase tracking-[0.16em] text-white/25">Net After Fee</div>
                    <div className="mt-2 text-lg font-black">{formatMoneyFromCoins(selectedWithdrawal.netAmount)}</div>
                    <div className="mt-1 text-[11px] text-white/35">Fee kept by platform: {formatMoneyFromCoins(selectedWithdrawal.feeAmount)}</div>
                  </div>
                </div>

                <div className="rounded-2xl border border-white/5 bg-black/25 p-4">
                  <div className="text-[10px] font-black uppercase tracking-[0.16em] text-white/25">Wallet Address</div>
                  <div className="mt-3 break-all font-mono text-sm text-white/85">{selectedWithdrawal.address}</div>
                </div>

                <div className="rounded-2xl border border-white/5 bg-black/25 p-4 space-y-4">
                  {isOwner ? (
                    <>
                      <div>
                        <div className="text-[10px] font-black uppercase tracking-[0.16em] text-white/25">Change Status</div>
                        <div className="mt-3 flex flex-col gap-3 sm:flex-row">
                          <select
                            value={withdrawalStatusDraft}
                            onChange={(e) => setWithdrawalStatusDraft(e.target.value as 'pending' | 'processing' | 'completed')}
                            disabled={isUpdatingWithdrawal || selectedWithdrawal.status === 'declined' || selectedWithdrawal.status === 'completed'}
                            className="w-full rounded-2xl border border-white/10 bg-black/30 px-4 py-3 text-sm focus:outline-none disabled:opacity-50"
                          >
                            <option value="pending">Pending</option>
                            <option value="processing">Processing</option>
                            <option value="completed">Completed</option>
                          </select>
                          <button
                            onClick={() => updateWithdrawalStatus(withdrawalStatusDraft)}
                            disabled={isUpdatingWithdrawal || selectedWithdrawal.status === 'declined' || selectedWithdrawal.status === 'completed'}
                            className="rounded-2xl bg-[#00FF88] px-5 py-3 text-xs font-black uppercase tracking-[0.16em] text-black disabled:opacity-40"
                          >
                            {isUpdatingWithdrawal ? 'Saving...' : 'Save Status'}
                          </button>
                        </div>
                      </div>

                      <div className="rounded-2xl border border-red-500/15 bg-red-500/8 p-4">
                        <div className="text-sm font-black uppercase tracking-tight text-red-200">Decline And Refund</div>
                        <div className="mt-2 text-xs leading-relaxed text-red-100/70">
                          This returns the full requested amount to the user wallet and reverses the platform fee from the owner wallet.
                        </div>
                        <button
                          onClick={() => updateWithdrawalStatus('declined')}
                          disabled={isUpdatingWithdrawal || selectedWithdrawal.status === 'declined' || selectedWithdrawal.status === 'completed'}
                          className="mt-4 rounded-2xl border border-red-400/20 bg-red-500 px-5 py-3 text-xs font-black uppercase tracking-[0.16em] text-white disabled:opacity-40"
                        >
                          {isUpdatingWithdrawal ? 'Updating...' : 'Decline Withdrawal'}
                        </button>
                      </div>
                    </>
                  ) : (
                    <div className="text-sm text-white/55">
                      Moderators can review withdrawal details here, but status changes and refunds remain owner-only.
                    </div>
                  )}
                </div>
              </div>
            </motion.div>
          </div>
        ) : null}
      </AnimatePresence>
    </div>
  );
};

const InfoView = ({
  eyebrow,
  title,
  description,
  cards,
}: {
  eyebrow: string;
  title: string;
  description: string;
  cards: Array<{ title: string; body: string; icon: React.ElementType }>;
}) => {
  return (
    <div className="p-6 lg:p-10 max-w-5xl mx-auto space-y-8">
      <div className="space-y-3">
        <div className="text-[10px] uppercase tracking-[0.24em] text-[#00FF88] font-black">{eyebrow}</div>
        <h1 className="text-4xl md:text-5xl font-black italic uppercase tracking-tighter">{title}</h1>
        <p className="text-sm text-white/50 max-w-2xl leading-relaxed">{description}</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {cards.map((card) => (
          <div key={card.title} className="rounded-[32px] border border-white/10 bg-[#141821] p-6 space-y-4">
            <div className="w-12 h-12 rounded-2xl bg-[#00FF88]/10 text-[#00FF88] flex items-center justify-center">
              <card.icon size={22} />
            </div>
            <div className="space-y-2">
              <h2 className="text-lg font-black uppercase tracking-tight">{card.title}</h2>
              <p className="text-sm text-white/55 leading-relaxed">{card.body}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

type SupportThreadMessage = {
  id: number;
  ticketId: number;
  senderType: 'user' | 'admin';
  userId: number | null;
  username: string;
  role: 'owner' | 'moderator' | 'user';
  message: string;
  attachmentUrl?: string | null;
  attachmentName?: string | null;
  createdAt: string;
};

type SupportThread = {
  id: number;
  userId: number;
  username: string;
  subject: string;
  category?: string;
  status: string;
  createdAt: string;
  updatedAt: string;
  messages: SupportThreadMessage[];
};

const AffiliateView = () => {
  const { isAuthenticated } = useAuth();
  const [overview, setOverview] = useState<any | null>(null);
  const [customCode, setCustomCode] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [copied, setCopied] = useState(false);
  const [activeTab, setActiveTab] = useState<'overview' | 'rewards' | 'referrals' | 'assets'>('overview');

  const loadOverview = async () => {
    const token = localStorage.getItem('pasus_auth_token');
    if (!token) {
      setIsLoading(false);
      return;
    }

    try {
      const response = await apiFetch('/api/affiliate/overview', {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(data.error || 'Failed to load affiliate overview.');
      }
      setOverview(data.overview);
      setCustomCode(data.overview?.code || '');
      setError('');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load affiliate overview.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadOverview().catch(() => undefined);
  }, []);

  const claimRewards = async () => {
    const token = localStorage.getItem('pasus_auth_token');
    if (!token) {
      return;
    }

    try {
      const response = await apiFetch('/api/affiliate/claim', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(data.error || 'Failed to claim affiliate rewards.');
      }
      setOverview(data.overview);
      setSuccess(`Claimed ${formatMoneyFromCoins(Number(data.claimed || 0))} in affiliate rewards.`);
      setError('');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to claim affiliate rewards.');
      setSuccess('');
    }
  };

  const saveCode = async () => {
    const token = localStorage.getItem('pasus_auth_token');
    if (!token) {
      return;
    }

    try {
      const response = await apiFetch('/api/affiliate/code', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ code: customCode }),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(data.error || 'Failed to save affiliate code.');
      }
      setOverview(data.overview);
      setSuccess('Affiliate code saved.');
      setError('');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save affiliate code.');
      setSuccess('');
    }
  };

  const copyLink = async () => {
    if (!overview?.referralLink) {
      return;
    }
    await navigator.clipboard.writeText(overview.referralLink);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1500);
  };

  if (!isAuthenticated) {
    return <InfoView eyebrow="Growth" title="Affiliate" description="Sign in to create your affiliate code and track referral earnings." cards={[{ title: 'Referral Rewards', body: 'Earn 1% of referred players winning payouts and claim rewards when you want.', icon: Users }, { title: 'Shareable Link', body: 'Every affiliate gets a direct referral link and a custom code.', icon: ArrowUpRight }]} />;
  }

  return (
    <div className="p-6 lg:p-10 max-w-6xl mx-auto space-y-8">
      <div className="space-y-2">
        <div className="text-[10px] uppercase tracking-[0.24em] text-[#00FF88] font-black">Growth</div>
        <h1 className="text-4xl md:text-5xl font-black italic uppercase tracking-tighter">Affiliate</h1>
        <p className="text-sm text-white/50 max-w-2xl leading-relaxed">Create your affiliate code, share your referral link, and earn 1% of the winning payouts generated by players who signed up through you. Rewards stay claimable until you withdraw them.</p>
      </div>

      {error ? <div className="rounded-2xl border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm text-red-300">{error}</div> : null}
      {success ? <div className="rounded-2xl border border-[#00FF88]/20 bg-[#00FF88]/10 px-4 py-3 text-sm text-[#00FF88]">{success}</div> : null}

      <div className="flex flex-wrap gap-3">
        {[
          ['overview', 'Overview'],
          ['rewards', 'Rewards'],
          ['referrals', 'Referrals'],
          ['assets', 'Links'],
        ].map(([value, label]) => (
          <button
            key={value}
            onClick={() => setActiveTab(value as 'overview' | 'rewards' | 'referrals' | 'assets')}
            className={cn(
              'rounded-2xl px-4 py-3 text-xs font-black uppercase tracking-[0.16em] transition-all',
              activeTab === value ? 'bg-[#00FF88] text-black' : 'bg-white/5 text-white/55 hover:text-white'
            )}
          >
            {label}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {[
          { label: 'Referred Users', value: overview?.referredUsers ?? 0 },
          { label: 'Tracked Volume', value: formatMoneyFromCoins(overview?.trackedVolume ?? 0) },
          { label: 'Total Commission', value: formatMoneyFromCoins(overview?.totalCommission ?? 0) },
          { label: 'Claimable Now', value: formatMoneyFromCoins(overview?.claimableCommission ?? 0) },
        ].map((card) => (
          <div key={card.label} className="rounded-3xl border border-white/10 bg-[#141821] p-5">
            <div className="text-[10px] uppercase tracking-[0.18em] text-white/25 font-black">{card.label}</div>
            <div className="mt-3 text-2xl font-black italic tracking-tight">{card.value}</div>
          </div>
        ))}
      </div>

      {(overview?.conversionTrend || []).length ? (
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
          <div className="rounded-[32px] border border-white/10 bg-[#141821] p-6 space-y-4">
            <div className="flex items-center justify-between gap-3">
              <div className="text-lg font-black uppercase tracking-tight">Signup Trend</div>
              <div className="text-[10px] uppercase tracking-[0.16em] text-white/25 font-black">Last 7 days</div>
            </div>
            <div className="flex items-end gap-2 h-36">
              {overview.conversionTrend.map((point: any) => {
                const max = Math.max(...overview.conversionTrend.map((p: any) => Number(p.signups || 0)), 1);
                const height = `${Math.max(10, (Number(point.signups || 0) / max) * 100)}%`;
                return (
                  <div key={`signups-${point.day}`} className="flex-1 flex flex-col items-center gap-2">
                    <div className="text-[10px] text-white/45">{point.signups}</div>
                    <div className="w-full h-full rounded-2xl bg-white/[0.03] flex items-end overflow-hidden">
                      <div className="w-full rounded-2xl bg-[#00FF88]/85" style={{ height }} />
                    </div>
                    <div className="text-[10px] text-white/30">{point.day}</div>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="rounded-[32px] border border-white/10 bg-[#141821] p-6 space-y-4">
            <div className="flex items-center justify-between gap-3">
              <div className="text-lg font-black uppercase tracking-tight">Commission Trend</div>
              <div className="text-[10px] uppercase tracking-[0.16em] text-white/25 font-black">Last 7 days</div>
            </div>
            <div className="flex items-end gap-2 h-36">
              {overview.conversionTrend.map((point: any) => {
                const max = Math.max(...overview.conversionTrend.map((p: any) => Number(p.commission || 0)), 1);
                const height = `${Math.max(10, (Number(point.commission || 0) / max) * 100)}%`;
                return (
                  <div key={`commission-${point.day}`} className="flex-1 flex flex-col items-center gap-2">
                    <div className="text-[10px] text-white/45">{formatMoneyFromCoins(point.commission)}</div>
                    <div className="w-full h-full rounded-2xl bg-white/[0.03] flex items-end overflow-hidden">
                      <div className="w-full rounded-2xl bg-sky-400/85" style={{ height }} />
                    </div>
                    <div className="text-[10px] text-white/30">{point.day}</div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      ) : null}

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        {(activeTab === 'overview' || activeTab === 'assets') ? (
        <div className="rounded-[32px] border border-white/10 bg-[#141821] p-6 space-y-4">
          <div className="text-lg font-black uppercase tracking-tight">Your Code</div>
          <div className="flex gap-3">
            <input
              type="text"
              value={customCode}
              onChange={(e) => setCustomCode(e.target.value.toUpperCase())}
              className="flex-1 rounded-2xl border border-white/10 bg-black/30 px-4 py-3 text-sm font-black tracking-[0.14em] focus:outline-none"
              placeholder="CREATECODE"
            />
            <button onClick={saveCode} disabled={isLoading || !customCode.trim()} className="rounded-2xl bg-[#00FF88] text-black px-5 py-3 text-xs font-black uppercase tracking-[0.16em] disabled:opacity-40">
              Save
            </button>
          </div>
          <div className="text-xs text-white/40">Codes must be unique. Referred users keep your link permanently once they register.</div>
          <div className="rounded-2xl border border-white/10 bg-black/30 p-4 space-y-3">
            <div className="text-[10px] uppercase tracking-[0.18em] text-white/25 font-black">Referral Link</div>
            <div className="text-xs text-white/60 break-all">{overview?.referralLink || `${window.location.origin}?ref=${customCode || 'YOURCODE'}`}</div>
            <button onClick={copyLink} className="rounded-2xl bg-white/5 hover:bg-white/10 px-4 py-3 text-xs font-black uppercase tracking-[0.16em]">
              {copied ? 'Copied' : 'Copy Link'}
            </button>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="rounded-2xl border border-white/5 bg-black/30 p-4">
              <div className="text-[10px] uppercase tracking-[0.16em] text-white/25 font-black">Win Commission</div>
              <div className="mt-2 text-xl font-black text-[#00FF88]">{formatMoneyFromCoins(overview?.winCommission ?? 0)}</div>
            </div>
            <div className="rounded-2xl border border-white/5 bg-black/30 p-4">
              <div className="text-[10px] uppercase tracking-[0.16em] text-white/25 font-black">Rate</div>
              <div className="mt-2 text-xl font-black text-[#00FF88]">1%</div>
            </div>
          </div>
        </div>
        ) : null}

        {(activeTab === 'overview' || activeTab === 'rewards') ? (
        <div className="rounded-[32px] border border-white/10 bg-[#141821] p-6 space-y-4">
          <div className="flex items-center justify-between gap-3">
            <div className="text-lg font-black uppercase tracking-tight">Rewards</div>
            <button
              onClick={claimRewards}
              disabled={isLoading || Number(overview?.claimableCommission || 0) <= 0}
              className="rounded-2xl bg-[#00FF88] text-black px-4 py-3 text-xs font-black uppercase tracking-[0.16em] disabled:opacity-40"
            >
              Claim Rewards
            </button>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="rounded-2xl border border-white/5 bg-black/30 p-4">
              <div className="text-[10px] uppercase tracking-[0.16em] text-white/25 font-black">Claimable</div>
              <div className="mt-2 text-2xl font-black text-[#00FF88]">{formatMoneyFromCoins(overview?.claimableCommission ?? 0)}</div>
            </div>
            <div className="rounded-2xl border border-white/5 bg-black/30 p-4">
              <div className="text-[10px] uppercase tracking-[0.16em] text-white/25 font-black">Already Claimed</div>
              <div className="mt-2 text-2xl font-black">{formatMoneyFromCoins(overview?.claimedCommission ?? 0)}</div>
            </div>
          </div>
          <div className="rounded-2xl border border-[#00FF88]/15 bg-black/30 p-5 text-sm text-white/60">
            Affiliate rewards are now queued instead of being paid instantly. Every referred player win adds 1% of that winning payout to your claimable balance.
          </div>
        </div>
        ) : null}

        {(activeTab === 'overview' || activeTab === 'rewards') ? (
        <div className="rounded-[32px] border border-white/10 bg-[#141821] p-6 space-y-4">
          <div className="flex items-center justify-between gap-3">
            <div className="text-lg font-black uppercase tracking-tight">Recent Commissions</div>
            <div className="text-[10px] uppercase tracking-[0.16em] text-white/25 font-black">Last 10</div>
          </div>
          <div className="space-y-3">
            {(overview?.recentCommissions || []).length ? overview.recentCommissions.map((item: any) => (
              <div key={item.id} className="rounded-2xl border border-white/5 bg-black/30 px-4 py-4 flex items-center justify-between gap-4">
                <div>
                  <div className="text-sm font-black">{item.username}</div>
                  <div className="mt-1 text-[11px] text-white/35 uppercase tracking-[0.16em]">{item.sourceType}</div>
                  <div className="mt-1 text-[11px] text-white/35">{item.claimedAt ? 'Claimed' : 'Pending'}</div>
                  <div className="mt-1 text-[11px] text-white/25">{new Date(item.createdAt).toLocaleString()}</div>
                </div>
                <div className="text-right">
                  <div className="text-sm font-black text-[#00FF88]">+{formatMoneyFromCoins(Number(item.commissionAmount || 0))}</div>
                  <div className="text-[11px] text-white/35">from {formatMoneyFromCoins(Number(item.baseAmount || 0))}</div>
                </div>
              </div>
            )) : (
              <div className="rounded-2xl border border-white/5 bg-black/30 px-4 py-8 text-sm text-white/35">No affiliate commission yet.</div>
            )}
          </div>
        </div>
        ) : null}

        {(activeTab === 'overview' || activeTab === 'referrals') ? (
        <div className="rounded-[32px] border border-white/10 bg-[#141821] p-6 space-y-4">
          <div className="flex items-center justify-between gap-3">
            <div className="text-lg font-black uppercase tracking-tight">People Using Your Code</div>
            <div className="text-[10px] uppercase tracking-[0.16em] text-white/25 font-black">{overview?.referredUsers ?? 0} total</div>
          </div>
          <div className="space-y-3">
            {(overview?.referredAccounts || []).length ? overview.referredAccounts.map((entry: any) => (
              <div key={entry.id} className="rounded-2xl border border-white/5 bg-black/30 px-4 py-4 flex items-center justify-between gap-4">
                <div className="text-sm font-black">{entry.username}</div>
                <div className="text-[11px] text-white/35">{new Date(entry.createdAt).toLocaleString()}</div>
              </div>
            )) : (
              <div className="rounded-2xl border border-white/5 bg-black/30 px-4 py-8 text-sm text-white/35">Nobody has registered with your code yet.</div>
            )}
          </div>
        </div>
        ) : null}
      </div>
    </div>
  );
};

const LEADERBOARD_PRIZES = [10000, 5000, 2500, 500];

type Friend = {
  id: number;
  username: string;
  avatar?: string;
  friendSince?: string;
  unreadCount?: number;
};

type FriendRequest = {
  id: number;
  username: string;
  avatar?: string;
  requestedAt?: string;
  sentAt?: string;
};

const FriendsView = () => {
  const { user } = useAuth();
  const { refreshWallet } = useBalance();
  const [friends, setFriends] = useState<Friend[]>([]);
  const [incoming, setIncoming] = useState<FriendRequest[]>([]);
  const [outgoing, setOutgoing] = useState<FriendRequest[]>([]);
  const [searchResults, setSearchResults] = useState<FriendRequest[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [activeTab, setActiveTab] = useState<'friends' | 'requests' | 'search'>('friends');
  const [searchQuery, setSearchQuery] = useState('');
  const [actionLoading, setActionLoading] = useState<number | null>(null);
  const [tipTarget, setTipTarget] = useState<Friend | null>(null);
  const [tipAmount, setTipAmount] = useState('');
  const [tipError, setTipError] = useState('');
  const [tipSuccess, setTipSuccess] = useState(false);
  const [chatTarget, setChatTarget] = useState<Friend | null>(null);
  const [chatMessages, setChatMessages] = useState<Array<{id: number; senderId: number; text: string; createdAt: string}>>([]);
  const [chatInput, setChatInput] = useState('');
  const [sendingMessage, setSendingMessage] = useState(false);
  const [unreadMessages, setUnreadMessages] = useState<Record<number, number>>({});
  const [chatNotification, setChatNotification] = useState<{username: string; text: string} | null>(null);
  const [inviteOverview, setInviteOverview] = useState<any | null>(null);
  const [inviteCopied, setInviteCopied] = useState(false);
  const chatPollRef = useRef<number | null>(null);
  const notificationTimeoutRef = useRef<number | null>(null);

  const loadFriends = async () => {
    try {
      setIsLoading(true);
      setError('');
      const token = localStorage.getItem('pasus_auth_token');
      const response = await apiFetch('/api/friends', {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data.error || 'Failed to load friends.');
      setFriends(Array.isArray(data.friends) ? data.friends : []);
      setIncoming(Array.isArray(data.incoming) ? data.incoming : []);
      setOutgoing(Array.isArray(data.outgoing) ? data.outgoing : []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load friends.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => { loadFriends(); }, []);

  useEffect(() => {
    const token = localStorage.getItem('pasus_auth_token');
    if (!token) return;
    apiFetch('/api/affiliate/overview', {
      headers: { Authorization: `Bearer ${token}` },
    }).then((r) => r.json()).then((data) => {
      if (data?.overview) {
        setInviteOverview(data.overview);
      }
    }).catch(() => undefined);
  }, []);

  useEffect(() => {
    if (!searchQuery || searchQuery.length < 2) {
      setSearchResults([]);
      return;
    }
    const token = localStorage.getItem('pasus_auth_token');
    apiFetch(`/api/users/search?q=${encodeURIComponent(searchQuery)}`, {
      headers: { Authorization: `Bearer ${token}` },
    }).then(r => r.json()).then(data => {
      setSearchResults(Array.isArray(data.users) ? data.users : []);
    });
  }, [searchQuery]);

  const fetchUnreadCounts = async () => {
    const token = localStorage.getItem('pasus_auth_token');
    if (!token) return;
    const unread: Record<number, number> = {};
    const lastSeenKey = 'pasus_chat_last_seen';
    const lastSeen: Record<number, string> = JSON.parse(localStorage.getItem(lastSeenKey) || '{}');
    
    for (const friend of friends) {
      try {
        const response = await apiFetch(`/api/friends/chat/${friend.id}`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        const data = await response.json().catch(() => ({}));
        if (response.ok && Array.isArray(data.messages)) {
          const friendLastSeen = lastSeen[String(friend.id)];
          const unreadCount = data.messages.filter(
            (m: { senderId: number; createdAt: string }) => {
              if (m.senderId === user?.id) return false;
              if (!friendLastSeen) return true;
              return new Date(m.createdAt) > new Date(friendLastSeen);
            }
          ).length;
          if (unreadCount > 0) {
            unread[friend.id] = unreadCount;
          }
        }
      } catch {}
    }
    setUnreadMessages(unread);
  };

  const pollChatMessages = async () => {
    if (!chatTarget) return;
    const token = localStorage.getItem('pasus_auth_token');
    try {
      const response = await apiFetch(`/api/friends/chat/${chatTarget.id}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await response.json().catch(() => ({}));
      if (response.ok && Array.isArray(data.messages)) {
        const lastMsg = chatMessages[chatMessages.length - 1];
        const newMessages = data.messages.filter(
          (m: { id: number }) => !lastMsg || m.id > lastMsg.id
        );
        if (newMessages.length > 0) {
          setChatMessages(data.messages);
          
          const lastSeenKey = 'pasus_chat_last_seen';
          const lastSeen: Record<string, string> = JSON.parse(localStorage.getItem(lastSeenKey) || '{}');
          const latestMsg = data.messages[data.messages.length - 1];
          if (latestMsg) {
            lastSeen[String(chatTarget.id)] = latestMsg.createdAt;
            localStorage.setItem(lastSeenKey, JSON.stringify(lastSeen));
          }
          
          if (chatTarget) {
            const msgFromOther = newMessages.find((m: { senderId: number }) => m.senderId !== user?.id);
            if (msgFromOther) {
              setChatNotification({
                username: chatTarget.username,
                text: msgFromOther.text.substring(0, 30) + (msgFromOther.text.length > 30 ? '...' : '')
              });
              if (notificationTimeoutRef.current) {
                window.clearTimeout(notificationTimeoutRef.current);
              }
              notificationTimeoutRef.current = window.setTimeout(() => {
                setChatNotification(null);
              }, 4000);
            }
          }
        }
      }
    } catch {}
  };

  useEffect(() => {
    if (chatTarget) {
      pollChatMessages();
      chatPollRef.current = window.setInterval(pollChatMessages, 3000);
    } else {
      if (chatPollRef.current) {
        window.clearInterval(chatPollRef.current);
        chatPollRef.current = null;
      }
      fetchUnreadCounts();
    }
    return () => {
      if (chatPollRef.current) {
        window.clearInterval(chatPollRef.current);
        chatPollRef.current = null;
      }
    };
  }, [chatTarget, friends]);

  useEffect(() => {
    return () => {
      if (notificationTimeoutRef.current) {
        window.clearTimeout(notificationTimeoutRef.current);
      }
    };
  }, []);

  const sendRequest = async (username: string) => {
    setActionLoading(-1);
    try {
      const token = localStorage.getItem('pasus_auth_token');
      const response = await apiFetch('/api/friends/request', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ username }),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data.error);
      await loadFriends();
      setSearchQuery('');
      setSearchResults([]);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to send request.');
    } finally {
      setActionLoading(null);
    }
  };

  const acceptRequest = async (friendId: number) => {
    setActionLoading(friendId);
    try {
      const token = localStorage.getItem('pasus_auth_token');
      await apiFetch('/api/friends/accept', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ friendId }),
      });
      await loadFriends();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to accept request.');
    } finally {
      setActionLoading(null);
    }
  };

  const rejectRequest = async (friendId: number) => {
    setActionLoading(friendId);
    try {
      const token = localStorage.getItem('pasus_auth_token');
      await apiFetch('/api/friends/reject', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ friendId }),
      });
      await loadFriends();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to reject request.');
    } finally {
      setActionLoading(null);
    }
  };

  const removeFriend = async (friendId: number) => {
    setActionLoading(friendId);
    try {
      const token = localStorage.getItem('pasus_auth_token');
      await apiFetch(`/api/friends/${friendId}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });
      await loadFriends();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to remove friend.');
    } finally {
      setActionLoading(null);
    }
  };

  const sendTip = async () => {
    if (!tipTarget || !tipAmount || Number(tipAmount) <= 0) return;
    setTipError('');
    setTipSuccess(false);
    try {
      const token = localStorage.getItem('pasus_auth_token');
      const response = await apiFetch('/api/friends/tip', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ friendId: tipTarget.id, amount: Number(tipAmount) }),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data.error || 'Failed to send tip');
      setTipSuccess(true);
      refreshWallet();
      setTimeout(() => { setTipTarget(null); setTipAmount(''); setTipSuccess(false); }, 1500);
    } catch (err) {
      setTipError(err instanceof Error ? err.message : 'Failed to send tip');
    }
  };

  const openChat = async (friend: Friend) => {
    setChatTarget(friend);
    setChatMessages([]);
    setChatInput('');
    setUnreadMessages(prev => {
      const next = { ...prev };
      delete next[friend.id];
      return next;
    });
    
    const lastSeenKey = 'pasus_chat_last_seen';
    const lastSeen: Record<string, string> = JSON.parse(localStorage.getItem(lastSeenKey) || '{}');
    lastSeen[String(friend.id)] = new Date().toISOString();
    localStorage.setItem(lastSeenKey, JSON.stringify(lastSeen));
    
    try {
      const token = localStorage.getItem('pasus_auth_token');
      const response = await apiFetch(`/api/friends/chat/${friend.id}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await response.json().catch(() => ({}));
      if (response.ok && Array.isArray(data.messages)) {
        setChatMessages(data.messages);
      }
    } catch {}
  };

  const sendChatMessage = async () => {
    if (!chatTarget || !chatInput.trim()) return;
    setSendingMessage(true);
    try {
      const token = localStorage.getItem('pasus_auth_token');
      const response = await apiFetch('/api/friends/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ friendId: chatTarget.id, text: chatInput.trim() }),
      });
      const data = await response.json().catch(() => ({}));
      if (response.ok && data.message) {
        setChatMessages(prev => [...prev, data.message]);
        setChatInput('');
      }
    } catch {}
    setSendingMessage(false);
  };

  const UserCard = ({ u, showActions, onAction }: { u: any; showActions?: boolean; onAction?: () => void }) => (
    <div key={u.id} className="rounded-2xl border border-white/10 bg-[#141821] p-4 flex items-center gap-4">
      <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-[#2a3a5a] to-[#1a2540] flex items-center justify-center text-lg font-black text-white/70 overflow-hidden">
        {u.avatar ? <img src={u.avatar} alt="" className="w-full h-full object-cover" /> : u.username?.charAt(0).toUpperCase()}
      </div>
      <div className="flex-1">
        <div className="font-black text-white">{u.username}</div>
        {u.friendStatus === 'friends' && <div className="text-xs text-[#00FF88]">Friend</div>}
        {u.friendStatus === 'sent' && <div className="text-xs text-yellow-400">Request Sent</div>}
        {u.friendStatus === 'received' && <div className="text-xs text-blue-400">Accept Request</div>}
      </div>
      {showActions && (
        <div className="flex gap-2">
          {u.friendStatus === 'none' && (
            <button onClick={onAction} disabled={actionLoading === -1} className="px-4 py-2 bg-[#00FF88] text-black font-black text-xs rounded-xl hover:bg-[#00FF88]/90 disabled:opacity-50">
              {actionLoading === -1 ? 'Add' : '...'}
            </button>
          )}
          {u.friendStatus === 'received' && (
            <button onClick={onAction} disabled={actionLoading === u.id} className="px-4 py-2 bg-[#00FF88] text-black font-black text-xs rounded-xl hover:bg-[#00FF88]/90 disabled:opacity-50">
              Accept
            </button>
          )}
          {(u.friendStatus === 'sent' || u.friendStatus === 'friends') && (
            <span className="text-xs text-white/40 py-2">Sent</span>
          )}
        </div>
      )}
    </div>
  );

  return (
    <div className="p-6 lg:p-10 max-w-4xl mr-auto ml-0 space-y-6">
      <div className="space-y-2">
        <div className="text-[10px] uppercase tracking-[0.24em] text-[#00FF88] font-black">Social</div>
        <h1 className="text-4xl md:text-5xl font-black italic uppercase tracking-tighter">Friends</h1>
      </div>

      {error && <div className="px-4 py-3 rounded-xl bg-red-500/20 border border-red-500/50 text-red-300 text-sm">{error}</div>}

      <div className="flex gap-2">
        {[['friends', 'Friends', friends.length], ['requests', 'Requests', incoming.length], ['search', 'Search', null]].map(([tab, label, count]) => (
          <button key={tab} onClick={() => setActiveTab(tab as any)}
            className={cn('px-4 py-2 rounded-xl text-sm font-black transition-all', activeTab === tab ? 'bg-[#00FF88] text-black' : 'bg-white/5 text-white/60 hover:bg-white/10')}>
            {label} {count !== null && count > 0 ? `(${count})` : ''}
          </button>
        ))}
      </div>

      {activeTab === 'search' && (
        <div className="space-y-4">
          <div className="rounded-[28px] border border-white/10 bg-[#141821] p-5 space-y-4">
            <div className="flex items-start justify-between gap-4">
              <div>
                <div className="text-sm font-black uppercase tracking-tight">Invite Friends</div>
                <div className="mt-1 text-xs text-white/45">Share your referral link and earn rewards when invited friends sign up and win.</div>
              </div>
              <div className="rounded-full bg-[#00FF88]/10 px-3 py-1 text-[10px] font-black uppercase tracking-[0.16em] text-[#00FF88]">
                {inviteOverview?.referredUsers || 0} joined
              </div>
            </div>
            <div className="rounded-2xl border border-white/5 bg-black/30 px-4 py-3 text-xs text-white/65 break-all">
              {inviteOverview?.referralLink || `${window.location.origin}?ref=YOURCODE`}
            </div>
            <div className="grid grid-cols-2 gap-3 text-xs">
              <div className="rounded-2xl border border-white/5 bg-black/25 p-4">
                <div className="text-white/30 uppercase tracking-[0.14em] text-[10px] font-black">Claimable</div>
                <div className="mt-2 text-lg font-black text-[#00FF88]">{formatMoneyFromCoins(inviteOverview?.claimableCommission || 0)}</div>
              </div>
              <div className="rounded-2xl border border-white/5 bg-black/25 p-4">
                <div className="text-white/30 uppercase tracking-[0.14em] text-[10px] font-black">Tracked Volume</div>
                <div className="mt-2 text-lg font-black">{formatMoneyFromCoins(inviteOverview?.trackedVolume || 0)}</div>
              </div>
            </div>
            <div className="flex flex-wrap gap-3">
              <button
                onClick={async () => {
                  const link = inviteOverview?.referralLink || `${window.location.origin}?ref=YOURCODE`;
                  await navigator.clipboard.writeText(link);
                  setInviteCopied(true);
                  window.setTimeout(() => setInviteCopied(false), 1500);
                }}
                className="rounded-2xl bg-[#00FF88] px-4 py-2 text-[10px] font-black uppercase tracking-[0.16em] text-black"
              >
                {inviteCopied ? 'Copied' : 'Copy Invite Link'}
              </button>
              <button
                onClick={async () => {
                  const link = inviteOverview?.referralLink || `${window.location.origin}?ref=YOURCODE`;
                  const text = `Join me on Pasus and use my invite link: ${link}`;
                  await navigator.clipboard.writeText(text);
                  setInviteCopied(true);
                  window.setTimeout(() => setInviteCopied(false), 1500);
                }}
                className="rounded-2xl border border-white/10 px-4 py-2 text-[10px] font-black uppercase tracking-[0.16em] text-white/70"
              >
                Copy Invite Message
              </button>
            </div>
          </div>

          <input type="text" placeholder="Search users by username..." value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            className="w-full bg-[#141821] border border-white/10 rounded-xl px-4 py-3 text-white placeholder-white/30 focus:outline-none focus:border-[#00FF88]/50" />
          {searchResults.length > 0 ? (
            <div className="space-y-2">
              {searchResults.map(u => (
                <div key={u.id}>
                  <UserCard u={u} showActions
                    onAction={() => u.friendStatus === 'received' ? acceptRequest(u.id) : sendRequest(u.username)} />
                </div>
              ))}
            </div>
          ) : searchQuery.length >= 2 ? (
            <div className="text-center text-white/40 py-8">No users found</div>
          ) : (
            <div className="text-center text-white/40 py-8">Enter at least 2 characters to search</div>
          )}
        </div>
      )}

      {activeTab === 'requests' && (
        <div className="space-y-6">
          {incoming.length > 0 && (
            <div>
              <div className="text-sm font-black text-white/60 mb-3">Incoming Requests</div>
              <div className="space-y-2">
                {incoming.map(u => (
                  <div key={u.id} className="rounded-2xl border border-white/10 bg-[#141821] p-4 flex items-center gap-4">
                    <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-[#2a3a5a] to-[#1a2540] flex items-center justify-center text-lg font-black text-white/70 overflow-hidden">
                      {u.avatar ? <img src={u.avatar} alt="" className="w-full h-full object-cover" /> : u.username?.charAt(0).toUpperCase()}
                    </div>
                    <div className="flex-1">
                      <div className="font-black text-white">{u.username}</div>
                      <div className="text-xs text-white/40">Wants to be your friend</div>
                    </div>
                    <div className="flex gap-2">
                      <button onClick={() => acceptRequest(u.id)} disabled={actionLoading === u.id}
                        className="px-4 py-2 bg-[#00FF88] text-black font-black text-xs rounded-xl hover:bg-[#00FF88]/90 disabled:opacity-50">
                        {actionLoading === u.id ? '...' : 'Accept'}
                      </button>
                      <button onClick={() => rejectRequest(u.id)} disabled={actionLoading === u.id}
                        className="px-4 py-2 bg-white/10 text-white/60 font-black text-xs rounded-xl hover:bg-white/20 disabled:opacity-50">
                        Decline
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
          {outgoing.length > 0 && (
            <div>
              <div className="text-sm font-black text-white/60 mb-3">Sent Requests</div>
              <div className="space-y-2">
                {outgoing.map(u => (
                  <div key={u.id} className="rounded-2xl border border-white/10 bg-[#141821] p-4 flex items-center gap-4">
                    <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-[#2a3a5a] to-[#1a2540] flex items-center justify-center text-lg font-black text-white/70 overflow-hidden">
                      {u.avatar ? <img src={u.avatar} alt="" className="w-full h-full object-cover" /> : u.username?.charAt(0).toUpperCase()}
                    </div>
                    <div className="flex-1">
                      <div className="font-black text-white">{u.username}</div>
                      <div className="text-xs text-yellow-400">Pending</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
          {incoming.length === 0 && outgoing.length === 0 && (
            <div className="text-center text-white/40 py-8">No friend requests</div>
          )}
        </div>
      )}

      {activeTab === 'friends' && (
        <div className="space-y-2">
          {isLoading ? (
            <div className="text-center text-white/40 py-8">Loading...</div>
          ) : friends.length > 0 ? (
            friends.map(friend => (
              <div key={friend.id} className="rounded-2xl border border-white/10 bg-[#141821] p-4 flex items-center gap-4">
                <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-[#2a3a5a] to-[#1a2540] flex items-center justify-center text-lg font-black text-white/70 overflow-hidden">
                  {friend.avatar ? <img src={friend.avatar} alt="" className="w-full h-full object-cover" /> : friend.username?.charAt(0).toUpperCase()}
                </div>
                <div className="flex-1">
                  <div className="font-black text-white">{friend.username}</div>
                  <div className="text-xs text-white/40">Friend since {friend.friendSince ? new Date(friend.friendSince).toLocaleDateString() : 'N/A'}</div>
                </div>
                <div className="flex gap-2">
                  <button onClick={() => setTipTarget(friend)} className="p-2 rounded-lg bg-white/5 text-white/60 hover:text-[#00FF88] hover:bg-white/10 transition-all" title="Tip">
                    <DollarSign size={16} />
                  </button>
                  <button onClick={() => openChat(friend)} className="relative p-2 rounded-lg bg-white/5 text-white/60 hover:text-[#00FF88] hover:bg-white/10 transition-all" title="Chat">
                    <MessageCircle size={16} />
                    {unreadMessages[friend.id] ? (
                      <span className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center">
                        {unreadMessages[friend.id] > 9 ? '9+' : unreadMessages[friend.id]}
                      </span>
                    ) : null}
                  </button>
                  <button onClick={() => removeFriend(friend.id)} disabled={actionLoading === friend.id}
                    className="p-2 rounded-lg bg-white/5 text-white/40 hover:text-red-400 hover:bg-white/10 transition-all disabled:opacity-50" title="Remove">
                    <X size={16} />
                  </button>
                </div>
              </div>
            ))
          ) : (
            <div className="text-center py-12">
              <div className="text-white/40 mb-4">No friends yet</div>
              <button onClick={() => setActiveTab('search')} className="px-6 py-3 bg-[#00FF88] text-black font-black rounded-xl hover:bg-[#00FF88]/90">
                Find Friends
              </button>
            </div>
          )}
        </div>
      )}

      {/* Tip Modal */}
      {tipTarget && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50">
          <div className="bg-[#141821] border border-white/10 rounded-2xl p-6 w-full max-w-sm mx-4">
            <h2 className="text-xl font-black text-white mb-4">Tip {tipTarget.username}</h2>
            {tipError && <div className="mb-4 px-4 py-3 rounded-xl bg-red-500/20 border border-red-500/50 text-red-300 text-sm">{tipError}</div>}
            {tipSuccess && <div className="mb-4 px-4 py-3 rounded-xl bg-green-500/20 border border-green-500/50 text-green-300 text-sm">Tip sent!</div>}
            <div className="relative mb-4">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-white/40 text-lg font-bold">$</span>
              <input type="number" value={tipAmount} onChange={e => setTipAmount(e.target.value)} placeholder="0.00"
                className="w-full bg-black border border-white/10 rounded-xl pl-8 pr-4 py-3 text-white text-xl font-mono focus:outline-none focus:border-[#00FF88]/50" />
            </div>
            <div className="flex gap-3">
              <button onClick={() => { setTipTarget(null); setTipAmount(''); setTipError(''); setTipSuccess(false); }}
                className="flex-1 py-3 bg-white/10 text-white font-black rounded-xl hover:bg-white/20 transition-all">Cancel</button>
              <button onClick={sendTip} className="flex-1 py-3 bg-[#00FF88] text-black font-black rounded-xl hover:bg-[#00FF88]/90 transition-all">
                Send Tip
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Chat Modal */}
      {chatTarget && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50">
          <div className="bg-[#141821] border border-white/10 rounded-2xl p-6 w-full max-w-lg mx-4 flex flex-col" style={{maxHeight: '80vh'}}>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-black text-white">Chat with {chatTarget.username}</h2>
              <button onClick={() => setChatTarget(null)} className="p-2 hover:bg-white/10 rounded-lg"><X size={20} className="text-white/60" /></button>
            </div>
            <div className="flex-1 overflow-y-auto space-y-3 mb-4 min-h-[200px] max-h-[300px]">
              {chatMessages.length === 0 ? (
                <div className="text-center text-white/40 py-8">No messages yet. Say hi!</div>
              ) : chatMessages.map(msg => {
                const isMine = msg.senderId === user?.id;
                const senderName = isMine ? 'You' : chatTarget.username;
                const time = new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
                return (
                  <div key={msg.id} className={cn('px-4 py-3 rounded-2xl max-w-[85%]',
                    isMine ? 'bg-[#00FF88]/20 ml-auto' : 'bg-white/10 mr-auto'
                  )}>
                    <div className="flex items-center gap-2 mb-1">
                      <span className={cn('text-[10px] font-black uppercase tracking-wider',
                        isMine ? 'text-[#00FF88]' : 'text-white/50'
                      )}>
                        {senderName}
                      </span>
                      <span className="text-[10px] text-white/30">{time}</span>
                    </div>
                    <div className="text-sm text-white leading-relaxed">{msg.text}</div>
                  </div>
                );
              })}
            </div>
            <div className="flex gap-2">
              <input type="text" value={chatInput} onChange={e => setChatInput(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && sendChatMessage()}
                placeholder="Type a message..."
                className="flex-1 bg-black border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-[#00FF88]/50" />
              <button onClick={sendChatMessage} disabled={sendingMessage || !chatInput.trim()}
                className="px-6 py-3 bg-[#00FF88] text-black font-black rounded-xl hover:bg-[#00FF88]/90 disabled:opacity-50">
                Send
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Chat Notification Toast */}
      <AnimatePresence>
        {chatNotification && (
          <motion.div
            initial={{ opacity: 0, y: 50, x: '-50%' }}
            animate={{ opacity: 1, y: 0, x: '-50%' }}
            exit={{ opacity: 0, y: 20, x: '-50%' }}
            className="fixed bottom-6 left-1/2 z-50 bg-[#141821] border border-white/20 rounded-2xl px-5 py-3 shadow-2xl flex items-center gap-3"
          >
            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-[#2a3a5a] to-[#1a2540] flex items-center justify-center text-lg font-black text-white/70 overflow-hidden">
              {chatNotification.username.charAt(0).toUpperCase()}
            </div>
            <div>
              <div className="text-sm font-black text-white">{chatNotification.username}</div>
              <div className="text-xs text-white/60">{chatNotification.text}</div>
            </div>
            <button onClick={() => setChatNotification(null)} className="ml-2 p-1 hover:bg-white/10 rounded-lg">
              <X size={14} className="text-white/40" />
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

type Tournament = {
  id: number;
  name: string;
  type: 'wagered' | 'deposited';
  startsAt: string;
  endsAt: string;
  prize: number;
  status: 'upcoming' | 'active' | 'ended';
  userRank?: number;
  userWagered?: number;
  prizes?: Array<{ position: number; amount: number }>;
  winners?: Array<{ position: number; userId: number; username: string; wagered: number; prize: number }>;
  paidOutAt?: string | null;
};

type LeaderboardCategory = 'wagered' | 'deposited' | 'wins';

const TournamentsView = () => {
  const [tournaments, setTournaments] = useState<Tournament[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [activeTab, setActiveTab] = useState<'active' | 'upcoming' | 'ended'>('active');

  useEffect(() => {
    const loadTournaments = async () => {
      try {
        setIsLoading(true);
        setError('');
        const response = await apiFetch('/api/tournaments');
        const data = await response.json().catch(() => ({}));
        if (!response.ok) {
          throw new Error(data.error || 'Failed to load tournaments.');
        }
        setTournaments(Array.isArray(data.tournaments) ? data.tournaments.map((t: any) => ({
          ...t,
          prizes: Array.isArray(t.prizes) ? t.prizes : [],
          winners: Array.isArray(t.winners) ? t.winners : [],
          paidOutAt: t.paidOutAt || null,
        })) : []);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load tournaments.');
      } finally {
        setIsLoading(false);
      }
    };

    loadTournaments();
  }, []);

  const filteredTournaments = tournaments.filter(t => t.status === activeTab);

  const formatTimeLeft = (dateStr: string) => {
    const date = new Date(dateStr);
    const now = new Date();
    const diff = date.getTime() - now.getTime();
    if (diff <= 0) return 'Ended';
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const days = Math.floor(hours / 24);
    if (days > 0) return `${days}d ${hours % 24}h`;
    return `${hours}h`;
  };

  return (
    <div className="p-6 lg:p-10 max-w-5xl mr-auto ml-0 space-y-8">
      <div className="space-y-2">
        <div className="text-[10px] uppercase tracking-[0.24em] text-[#00FF88] font-black">Competition</div>
        <h1 className="text-4xl md:text-5xl font-black italic uppercase tracking-tighter">Tournaments</h1>
        <p className="text-sm text-white/50 max-w-2xl leading-relaxed">Compete in weekly tournaments for exclusive prizes. Top players by wagered volume win!</p>
      </div>

      {error ? <div className="rounded-2xl border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm text-red-300">{error}</div> : null}

      <div className="flex gap-2">
        {(['active', 'upcoming', 'ended'] as const).map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={cn(
              'px-4 py-2 rounded-xl text-xs font-black uppercase tracking-wider transition-all',
              activeTab === tab 
                ? 'bg-[#00FF88] text-black' 
                : 'bg-white/5 text-white/40 hover:text-white hover:bg-white/10'
            )}
          >
            {tab}
          </button>
        ))}
      </div>

      <div className="grid gap-4">
        {isLoading ? (
          <div className="rounded-2xl border border-white/5 bg-black/30 px-4 py-8 text-sm text-white/35">Loading tournaments...</div>
        ) : filteredTournaments.length ? (
          filteredTournaments.map((tournament) => (
            <div key={tournament.id} className="rounded-2xl border border-white/10 bg-[#141821] p-6">
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-2">
                    <span className={cn(
                      'px-2 py-0.5 rounded text-[8px] font-black uppercase tracking-wider',
                      tournament.type === 'wagered' ? 'bg-blue-500/20 text-blue-400' : 'bg-purple-500/20 text-purple-400'
                    )}>
                      {tournament.type}
                    </span>
                    <span className={cn(
                      'px-2 py-0.5 rounded text-[8px] font-black uppercase tracking-wider',
                      tournament.status === 'active' ? 'bg-green-500/20 text-green-400' : 
                      tournament.status === 'upcoming' ? 'bg-yellow-500/20 text-yellow-400' : 'bg-white/10 text-white/40'
                    )}>
                      {tournament.status}
                    </span>
                  </div>
                  <div className="text-xl font-black uppercase">{tournament.name}</div>
                  <div className="text-sm text-white/40 mt-1">
                    {tournament.status === 'active' ? `Ends in ${formatTimeLeft(tournament.endsAt)}` : 
                     tournament.status === 'upcoming' ? `Starts in ${formatTimeLeft(tournament.startsAt)}` : 'Tournament ended'}
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-[10px] text-white/40 uppercase tracking-wider">Prize Pool</div>
                  <div className="text-2xl font-black text-[#00FF88]">{formatMoneyFromCoins(tournament.prize)}</div>
                </div>
              </div>
              {tournament.userRank && tournament.status === 'active' && (
                <div className="mt-4 pt-4 border-t border-white/5">
                  <div className="flex items-center justify-between">
                    <div className="text-sm text-white/60">Your rank: <span className="text-white font-black">#{tournament.userRank}</span></div>
                    <div className="text-sm text-white/40">Wagered: {formatMoneyFromCoins(tournament.userWagered || 0)}</div>
                  </div>
                </div>
              )}
              {tournament.prizes?.length ? (
                <div className="mt-4 pt-4 border-t border-white/5">
                  <div className="text-[10px] uppercase tracking-[0.16em] text-white/25 font-black mb-3">Prize Breakdown</div>
                  <div className="grid grid-cols-3 gap-2 text-xs">
                    {tournament.prizes.map((prize) => (
                      <div key={`${tournament.id}-prize-${prize.position}`} className="rounded-xl border border-white/5 bg-black/20 px-3 py-3 text-center">
                        <div className="text-white/35">#{prize.position}</div>
                        <div className="mt-1 font-black text-[#00FF88]">{formatMoneyFromCoins(prize.amount)}</div>
                      </div>
                    ))}
                  </div>
                </div>
              ) : null}
              {tournament.status === 'ended' && tournament.winners?.length ? (
                <div className="mt-4 pt-4 border-t border-white/5">
                  <div className="flex items-center justify-between gap-3 mb-3">
                    <div className="text-[10px] uppercase tracking-[0.16em] text-white/25 font-black">Winners</div>
                    <div className="text-[10px] text-white/35">{tournament.paidOutAt ? `Paid ${new Date(tournament.paidOutAt).toLocaleString()}` : 'Pending payout'}</div>
                  </div>
                  <div className="space-y-2">
                    {tournament.winners.map((winner) => (
                      <div key={`${tournament.id}-winner-${winner.position}`} className="rounded-xl border border-white/5 bg-black/20 px-3 py-3 flex items-center justify-between gap-3 text-xs">
                        <div>
                          <div className="font-black text-white">#{winner.position} {winner.username}</div>
                          <div className="text-white/35">Wagered {formatMoneyFromCoins(winner.wagered)}</div>
                        </div>
                        <div className="font-black text-[#00FF88]">{formatMoneyFromCoins(winner.prize)}</div>
                      </div>
                    ))}
                  </div>
                </div>
              ) : null}
            </div>
          ))
        ) : (
          <div className="rounded-2xl border border-white/5 bg-black/30 px-4 py-8 text-sm text-white/35">
            No {activeTab} tournaments.
          </div>
        )}
      </div>
    </div>
  );
};

const LeaderboardView = () => {
  const [entries, setEntries] = useState<Array<{ rank: number; userId: number; username: string; value: number }>>([]);
  const [season, setSeason] = useState<{ name: string; startsAt: string; endsAt: string; prizePool: number } | null>(null);
  const [events, setEvents] = useState<Array<{ id: number; title: string; description: string; eventType: string; startsAt: string; endsAt: string; rewardLabel: string | null }>>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [category, setCategory] = useState<LeaderboardCategory>('wagered');

  useEffect(() => {
    const loadLeaderboard = async () => {
      try {
        setIsLoading(true);
        setError('');
        const response = await apiFetch(`/api/leaderboard?category=${category}`);
        const data = await response.json().catch(() => ({}));
        if (!response.ok) {
          throw new Error(data.error || 'Failed to load leaderboard.');
        }
        setEntries(Array.isArray(data.leaderboard) ? data.leaderboard : []);
        setSeason(data.season || null);
        setEvents(Array.isArray(data.events) ? data.events : []);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load leaderboard.');
      } finally {
        setIsLoading(false);
      }
    };

    loadLeaderboard();
  }, [category]);

  const getCategoryLabel = (cat: LeaderboardCategory) => {
    switch (cat) {
      case 'wagered': return 'Total Wagered';
      case 'deposited': return 'Total Deposited';
      case 'wins': return 'Total Wins';
    }
  };

  return (
    <div className="p-6 lg:p-10 max-w-5xl mr-auto ml-0 space-y-8">
      <div className="space-y-2">
        <div className="text-[10px] uppercase tracking-[0.24em] text-[#00FF88] font-black">Competition</div>
        <h1 className="text-4xl md:text-5xl font-black italic uppercase tracking-tighter">Leaderboard</h1>
        <p className="text-sm text-white/50 max-w-2xl leading-relaxed">Compete for prizes by wagering and depositing. Top players win weekly rewards!</p>
      </div>

      {season ? (
        <div className="rounded-[32px] border border-[#00FF88]/20 bg-[linear-gradient(135deg,rgba(0,255,136,0.12),rgba(20,24,33,0.9))] p-6">
          <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-4">
            <div>
              <div className="text-[10px] uppercase tracking-[0.2em] text-[#00FF88] font-black">Active Season</div>
              <div className="mt-2 text-2xl md:text-3xl font-black italic uppercase tracking-tight">{season.name}</div>
              <div className="mt-2 text-sm text-white/55">Ends {new Date(season.endsAt).toLocaleString()} • Current category: {getCategoryLabel(category)}</div>
            </div>
            <div className="text-right">
              <div className="text-[10px] uppercase tracking-[0.18em] text-white/30 font-black">Season Prize Pool</div>
              <div className="mt-2 text-3xl font-black text-[#00FF88]">{formatMoneyFromCoins(season.prizePool)}</div>
            </div>
          </div>
        </div>
      ) : null}

      {events.length ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {events.map((event) => (
            <div key={event.id} className="rounded-[28px] border border-white/10 bg-[#141821] p-5 space-y-3">
              <div className="flex items-center justify-between gap-3">
                <div className="text-sm font-black uppercase tracking-tight">{event.title}</div>
                <div className="rounded-full bg-white/5 px-3 py-1 text-[10px] font-black uppercase tracking-[0.16em] text-white/45">{event.eventType}</div>
              </div>
              <div className="text-sm text-white/55">{event.description}</div>
              <div className="flex items-center justify-between gap-3 text-[11px] text-white/35">
                <span>Ends {new Date(event.endsAt).toLocaleString()}</span>
                <span className="text-[#00FF88] font-black">{event.rewardLabel || 'Live reward'}</span>
              </div>
            </div>
          ))}
        </div>
      ) : null}

      {error ? <div className="rounded-2xl border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm text-red-300">{error}</div> : null}

      <div className="flex gap-2">
        {(['wagered', 'deposited', 'wins'] as LeaderboardCategory[]).map((cat) => (
          <button
            key={cat}
            onClick={() => setCategory(cat)}
            className={cn(
              'px-4 py-2 rounded-xl text-xs font-black uppercase tracking-wider transition-all',
              category === cat 
                ? 'bg-[#00FF88] text-black' 
                : 'bg-white/5 text-white/40 hover:text-white hover:bg-white/10'
            )}
          >
            {getCategoryLabel(cat)}
          </button>
        ))}
      </div>

      <div className="rounded-[32px] border border-white/10 bg-[#141821] p-6 space-y-4">
        <div className="flex items-center justify-between gap-4">
          <div className="text-lg font-black uppercase tracking-tight">{getCategoryLabel(category)}</div>
          <div className="text-[10px] uppercase tracking-[0.16em] text-white/25 font-black">Top 10</div>
        </div>

        {isLoading ? (
          <div className="rounded-2xl border border-white/5 bg-black/30 px-4 py-8 text-sm text-white/35">Loading leaderboard...</div>
        ) : entries.length ? (
          <div className="space-y-3">
            {entries.map((entry) => (
              <div key={entry.userId} className="rounded-2xl border border-white/5 bg-black/30 px-4 py-4 flex items-center justify-between gap-4">
                <div className="flex items-center gap-4">
                  <div className={cn(
                    'flex h-10 w-10 items-center justify-center rounded-2xl border text-sm font-black',
                    entry.rank === 1 ? 'border-[#00FF88]/40 bg-[#00FF88]/12 text-[#00FF88]' : entry.rank === 2 ? 'border-white/20 bg-white/5 text-white' : entry.rank === 3 ? 'border-amber-500/30 bg-amber-500/10 text-amber-300' : 'border-white/10 bg-white/[0.03] text-white/70'
                  )}>
                    #{entry.rank}
                  </div>
                  <div>
                    <div className="text-sm font-black">{entry.username}</div>
                    <div className="text-[11px] text-white/35">
                      {entry.rank <= LEADERBOARD_PRIZES.length ? `#${entry.rank} prize: ${formatMoneyFromCoins(LEADERBOARD_PRIZES[entry.rank - 1])}` : 'No prize tier'}
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-2 text-right font-mono font-bold text-[#00FF88]">
                  <CurrencyIcon className="rounded-full object-cover" size={16} />
                  <span>{formatMoneyFromCoins(entry.value)}</span>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="rounded-2xl border border-white/5 bg-black/30 px-4 py-8 text-sm text-white/35">No activity yet.</div>
        )}
      </div>
    </div>
  );
};

const VipView = () => {
  const { refreshWallet } = useBalance();
  const [stats, setStats] = useState({
    wagered: 0,
    bets: 0,
    deposited: 0,
    level: 1,
    xp: 0,
    xpToNextLevel: 0,
    nextRewardLevel: 3,
    nextRewardAmount: 0,
    currentReward: 0,
    canClaimReward: false,
    reload: {
      claimable: 0,
      totalClaimed: 0,
      canClaim: false,
      availableAt: null as string | null,
    },
    claimableRakeback: 0,
    claimedTotal: 0,
    rakeback: {
      instant: { claimable: 0, canClaim: true, availableAt: null as string | null },
      daily: { claimable: 0, canClaim: false, availableAt: null as string | null },
      weekly: { claimable: 0, canClaim: false, availableAt: null as string | null },
      monthly: { claimable: 0, canClaim: false, availableAt: null as string | null },
    },
  });
  const [status, setStatus] = useState('');
  const [isClaiming, setIsClaiming] = useState<string | null>(null);

  const loadVipOverview = useCallback(() => {
    const token = localStorage.getItem('pasus_auth_token');
    if (!token) {
      return Promise.resolve();
    }

    return apiFetch('/api/vip/overview', {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    })
      .then((response) => response.json().catch(() => ({})))
      .then((data) => {
        const vip = data.vip || {};
        setStats({
          wagered: Number(vip.totalWagered || 0),
          bets: Number(vip.totalBets || 0),
          deposited: Number(vip.totalDeposited || 0),
          level: Number(vip.level || 1),
          xp: Number(vip.xp || 0),
          xpToNextLevel: Number(vip.xpToNextLevel || 0),
          nextRewardLevel: Number(vip.nextRewardLevel || 3),
          nextRewardAmount: Number(vip.nextRewardAmount || 0),
          currentReward: Number(vip.currentReward || 0),
          canClaimReward: Boolean(vip.canClaimReward),
          reload: vip.reload || { claimable: 0, totalClaimed: 0, canClaim: false, availableAt: null },
          claimableRakeback: Number(vip.claimableRakeback || 0),
          claimedTotal: Number(vip.rakebackClaimedTotal || 0),
          rakeback: vip.rakeback || {
            instant: { claimable: 0, canClaim: true, availableAt: null },
            daily: { claimable: 0, canClaim: false, availableAt: null },
            weekly: { claimable: 0, canClaim: false, availableAt: null },
            monthly: { claimable: 0, canClaim: false, availableAt: null },
          },
        });
      })
      .catch(() => undefined);
  }, []);

  useEffect(() => {
    loadVipOverview();
    const interval = window.setInterval(loadVipOverview, 5000);
    return () => window.clearInterval(interval);
  }, [loadVipOverview]);

  const vipTiers = [
    { key: 'bronze', name: 'Bronze', minWagered: 0, perks: ['Base rakeback access', 'Daily reward streak XP', 'Promo entry access'] },
    { key: 'silver', name: 'Silver', minWagered: 10000, perks: ['Higher rain priority', 'Weekly rakeback improves', 'Mid-tier level rewards'] },
    { key: 'gold', name: 'Gold', minWagered: 50000, perks: ['Priority support queue', 'Exclusive promos and races', 'Higher cashback cadence'] },
    { key: 'diamond', name: 'Diamond', minWagered: 200000, perks: ['VIP host routing', 'Private tournaments', 'Top-tier claim windows'] },
  ];

  const vipTier = vipTiers.reduce((current, tier) => (stats.wagered >= tier.minWagered ? tier.name : current), 'Bronze');
  const currentTierIndex = vipTiers.findIndex((tier) => tier.name === vipTier);
  const nextTier = currentTierIndex >= 0 ? vipTiers[currentTierIndex + 1] : null;
  const wagerProgress = nextTier
    ? Math.max(0, Math.min(100, (stats.wagered / nextTier.minWagered) * 100))
    : 100;

  const claimLevelReward = async () => {
    const token = localStorage.getItem('pasus_auth_token');
    if (!token) return;
    try {
      setIsClaiming('level');
      const response = await apiFetch('/api/vip/level-reward/claim', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(data.error || 'Failed to claim VIP reward.');
      }
      setStatus(`Claimed ${formatMoneyFromCoins(Number(data.reward || 0))} for reaching level ${data.level}.`);
      await refreshWallet();
      await loadVipOverview();
    } catch (err) {
      setStatus(err instanceof Error ? err.message : 'Failed to claim VIP reward.');
    } finally {
      setIsClaiming(null);
    }
  };

  const claimRakeback = async (period: 'instant' | 'daily' | 'weekly' | 'monthly') => {
    const token = localStorage.getItem('pasus_auth_token');
    if (!token) {
      return;
    }

    try {
      setIsClaiming(period);
      const response = await apiFetch('/api/vip/rakeback/claim', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ period }),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(data.error || 'Failed to claim rakeback.');
      }
      setStatus(`Claimed ${formatMoneyFromCoins(Number(data.claimed || 0))} from ${period} rakeback.`);
      await refreshWallet();
      await loadVipOverview();
    } catch (err) {
      setStatus(err instanceof Error ? err.message : 'Failed to claim rakeback.');
    } finally {
      setIsClaiming(null);
    }
  };

  const claimReload = async () => {
    const token = localStorage.getItem('pasus_auth_token');
    if (!token) return;
    try {
      setIsClaiming('reload');
      const response = await apiFetch('/api/vip/reload/claim', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(data.error || 'Failed to claim reload reward.');
      }
      setStatus(`Claimed ${formatMoneyFromCoins(Number(data.claimed || 0))} from weekly reload.`);
      await refreshWallet();
      await loadVipOverview();
    } catch (err) {
      setStatus(err instanceof Error ? err.message : 'Failed to claim reload reward.');
    } finally {
      setIsClaiming(null);
    }
  };

  return (
    <div className="p-6 lg:p-10 max-w-6xl mx-auto space-y-8">
      <div className="space-y-2">
        <div className="text-[10px] uppercase tracking-[0.24em] text-[#00FF88] font-black">Loyalty</div>
        <h1 className="text-4xl md:text-5xl font-black italic uppercase tracking-tighter">VIP Club</h1>
        <p className="text-sm text-white/50 max-w-2xl leading-relaxed">Track your tier climb, level reward milestones, and rakeback claim windows from one clearer VIP surface.</p>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="rounded-3xl border border-white/10 bg-[#141821] p-6"><div className="text-[10px] text-white/25 uppercase tracking-[0.18em] font-black">Current Tier</div><div className="mt-3 text-3xl font-black italic">{vipTier}</div></div>
        <div className="rounded-3xl border border-white/10 bg-[#141821] p-6"><div className="text-[10px] text-white/25 uppercase tracking-[0.18em] font-black">Current Level</div><div className="mt-3 text-3xl font-black italic">{stats.level}</div></div>
        <div className="rounded-3xl border border-white/10 bg-[#141821] p-6"><div className="text-[10px] text-white/25 uppercase tracking-[0.18em] font-black">Tracked Wager</div><div className="mt-3 text-3xl font-black italic">{formatMoneyFromCoins(stats.wagered)}</div></div>
        <div className="rounded-3xl border border-white/10 bg-[#141821] p-6"><div className="text-[10px] text-white/25 uppercase tracking-[0.18em] font-black">Tracked Bets</div><div className="mt-3 text-3xl font-black italic">{stats.bets}</div></div>
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-[1.1fr_0.9fr] gap-6">
        <div className="rounded-[32px] border border-white/10 bg-[#141821] p-6 space-y-4">
          <div className="flex items-center justify-between gap-4">
            <div>
              <div className="text-lg font-black uppercase tracking-tight">Tier Progress</div>
              <div className="text-sm text-white/40">{nextTier ? `Reach ${formatMoneyFromCoins(nextTier.minWagered)} wagered for ${nextTier.name}.` : 'Top tier unlocked.'}</div>
            </div>
            <div className="rounded-full bg-[#00FF88]/10 px-3 py-1 text-[10px] font-black uppercase tracking-[0.16em] text-[#00FF88]">{vipTier}</div>
          </div>
          <div className="h-3 rounded-full bg-white/5 overflow-hidden"><div className="h-full bg-[#00FF88] rounded-full" style={{ width: `${wagerProgress}%` }} /></div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {vipTiers.map((tier) => (
              <div key={tier.key} className={cn('rounded-2xl border p-4', stats.wagered >= tier.minWagered ? 'border-[#00FF88]/25 bg-[#00FF88]/8' : 'border-white/5 bg-black/25')}>
                <div className="flex items-center justify-between gap-3">
                  <div className="text-sm font-black uppercase tracking-tight">{tier.name}</div>
                  <div className="text-[10px] text-white/35">{formatMoneyFromCoins(tier.minWagered)}+</div>
                </div>
                <div className="mt-3 space-y-2">
                  {tier.perks.map((perk) => <div key={perk} className="text-xs text-white/55">{perk}</div>)}
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="rounded-[32px] border border-white/10 bg-[#141821] p-6 space-y-4">
          <div className="text-lg font-black uppercase tracking-tight">Level Rewards</div>
          <div className="rounded-2xl border border-white/5 bg-black/25 p-4">
            <div className="flex items-center justify-between gap-3">
              <div>
                <div className="text-[10px] uppercase tracking-[0.16em] text-white/25 font-black">XP To Next Level</div>
                <div className="mt-2 text-2xl font-black">{stats.xpToNextLevel.toLocaleString()}</div>
              </div>
              <div className="text-right">
                <div className="text-[10px] uppercase tracking-[0.16em] text-white/25 font-black">Next Reward</div>
                <div className="mt-2 text-lg font-black text-[#00FF88]">Lvl {stats.nextRewardLevel}</div>
                <div className="text-sm text-white/45">{formatMoneyFromCoins(stats.nextRewardAmount)}</div>
              </div>
            </div>
          </div>
          <div className="rounded-2xl border border-[#00FF88]/15 bg-[#00FF88]/5 p-4">
            <div className="text-[10px] uppercase tracking-[0.16em] text-[#00FF88]/80 font-black">Current Level Reward</div>
            <div className="mt-2 text-2xl font-black">{formatMoneyFromCoins(stats.currentReward)}</div>
            <div className="mt-1 text-sm text-white/45">Every 3 levels unlocks a new claim.</div>
          </div>
          <button onClick={claimLevelReward} disabled={isClaiming !== null || !stats.canClaimReward} className="w-full rounded-2xl bg-[#00FF88] text-black px-4 py-3 text-xs font-black uppercase tracking-[0.16em] disabled:opacity-40">
            {isClaiming === 'level' ? 'Claiming...' : stats.canClaimReward ? `Claim Level ${stats.level} Reward` : 'No Level Reward Ready'}
          </button>
        </div>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="rounded-3xl border border-white/10 bg-[#141821] p-6"><div className="text-[10px] text-white/25 uppercase tracking-[0.18em] font-black">Tracked Deposit</div><div className="mt-3 text-3xl font-black italic">{formatMoneyFromCoins(stats.deposited)}</div></div>
        <div className="rounded-3xl border border-white/10 bg-[#141821] p-6"><div className="text-[10px] text-white/25 uppercase tracking-[0.18em] font-black">Claimable Rakeback</div><div className="mt-3 text-3xl font-black italic text-[#00FF88]">{formatMoneyFromCoins(stats.claimableRakeback)}</div></div>
        <div className="rounded-3xl border border-white/10 bg-[#141821] p-6"><div className="text-[10px] text-white/25 uppercase tracking-[0.18em] font-black">Claimed Rakeback</div><div className="mt-3 text-3xl font-black italic">{formatMoneyFromCoins(stats.claimedTotal)}</div></div>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="rounded-[32px] border border-white/10 bg-[#141821] p-6 space-y-4">
          <div className="text-lg font-black uppercase tracking-tight">Weekly Reload</div>
          <div className="rounded-2xl border border-[#00FF88]/15 bg-[#00FF88]/5 p-4">
            <div className="text-[10px] uppercase tracking-[0.16em] text-[#00FF88]/80 font-black">Claimable Reload</div>
            <div className="mt-2 text-2xl font-black">{formatMoneyFromCoins(stats.reload.claimable)}</div>
            <div className="mt-1 text-sm text-white/45">
              {stats.reload.canClaim ? 'Ready now if you meet deposit and wager thresholds.' : stats.reload.availableAt ? `Available ${new Date(stats.reload.availableAt).toLocaleString()}` : 'Deposit and wager more to unlock reloads.'}
            </div>
          </div>
          <button onClick={claimReload} disabled={isClaiming !== null || !stats.reload.canClaim || stats.reload.claimable <= 0} className="w-full rounded-2xl bg-[#00FF88] text-black px-4 py-3 text-xs font-black uppercase tracking-[0.16em] disabled:opacity-40">
            {isClaiming === 'reload' ? 'Claiming...' : 'Claim Weekly Reload'}
          </button>
        </div>
        <div className="rounded-[32px] border border-white/10 bg-[#141821] p-6 space-y-4">
          <div className="text-lg font-black uppercase tracking-tight">Reward Notes</div>
          {[
            'Instant, daily, weekly, and monthly rakeback buckets keep claims paced out.',
            'Weekly reload rewards unlock after meaningful deposit and wager activity.',
            'Level rewards remain milestone-based so climbing feels slower and more valuable.',
            'All VIP claims are added directly to the wallet and mirrored in notifications.',
          ].map((line) => <div key={line} className="rounded-2xl border border-white/5 bg-black/30 px-4 py-3 text-sm text-white/65">{line}</div>)}
        </div>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
        {([
          ['instant', 'Instant'],
          ['daily', 'Daily'],
          ['weekly', 'Weekly'],
          ['monthly', 'Monthly'],
        ] as const).map(([period, label]) => {
          const bucket = stats.rakeback[period];
          return (
            <div key={period} className="rounded-3xl border border-white/10 bg-[#141821] p-5 space-y-4">
              <div>
                <div className="text-[10px] text-white/25 uppercase tracking-[0.18em] font-black">{label} Rakeback</div>
                <div className="mt-3 text-2xl font-black italic text-[#00FF88]">{formatMoneyFromCoins(Number(bucket.claimable || 0))}</div>
              </div>
              <div className="text-[11px] text-white/35">
                {bucket.canClaim
                  ? 'Ready to claim'
                  : bucket.availableAt
                    ? `Available ${new Date(bucket.availableAt).toLocaleString()}`
                    : 'Not available yet'}
              </div>
              <button
                onClick={() => claimRakeback(period)}
                disabled={isClaiming !== null || !bucket.canClaim || Number(bucket.claimable || 0) <= 0}
                className="w-full rounded-2xl bg-[#00FF88] text-black px-4 py-3 text-xs font-black uppercase tracking-[0.16em] disabled:opacity-40"
              >
                {isClaiming === period ? 'Claiming...' : `Claim ${label}`}
              </button>
            </div>
          );
        })}
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="rounded-[32px] border border-white/10 bg-[#141821] p-6 space-y-4">
          <div className="text-lg font-black uppercase tracking-tight">VIP Perk Summary</div>
          {[
            'Tier perks unlock based on tracked lifetime wager volume.',
            'Level rewards unlock every 3 levels and claim directly into the wallet.',
            'Higher tiers are designed to feel slower and more meaningful to reach.',
            'Rakeback and promo access scale with long-term volume and consistency.',
          ].map((line) => <div key={line} className="rounded-2xl border border-white/5 bg-black/30 px-4 py-3 text-sm text-white/65">{line}</div>)}
        </div>
        <div className="rounded-[32px] border border-white/10 bg-[#141821] p-6 space-y-4">
          <div className="text-lg font-black uppercase tracking-tight">Rakeback</div>
          <div className="rounded-2xl border border-[#00FF88]/15 bg-[#00FF88]/5 px-4 py-4 text-sm text-white/70">
            Rakeback is 0.5% of your total deposited amount. Requires at least $10 deposited. Split across Instant, Daily, Weekly, and Monthly buckets.
          </div>
          {status ? <div className="text-sm text-white/60">{status}</div> : null}
          <div className="text-lg font-black uppercase tracking-tight pt-2">Planned Perks</div>
          {[
            'Rakeback and weekly cashback',
            'Higher rain priority and exclusive drops',
            'VIP host and payout prioritization',
            'Private tournaments and promo unlocks',
          ].map((line) => <div key={line} className="rounded-2xl border border-white/5 bg-black/30 px-4 py-3 text-sm text-white/65">{line}</div>)}
        </div>
      </div>
    </div>
  );
};

const ProvablyFairView = () => {
  const [seed, setSeed] = useState(() => crypto?.randomUUID?.() || Math.random().toString(36).slice(2));
  const [clientSeed, setClientSeed] = useState(() => localStorage.getItem(CLIENT_SEED_STORAGE_KEY) || generateClientSeed());
  const [nonce, setNonce] = useState(() => Number(localStorage.getItem(CLIENT_NONCE_STORAGE_KEY) || 1));
  const [autoRefresh, setAutoRefresh] = useState(() => localStorage.getItem(CLIENT_SEED_AUTO_STORAGE_KEY) !== 'false');
  const [lookupBetId, setLookupBetId] = useState(() => new URLSearchParams(window.location.search).get('bet') || '');
  const [lookupBet, setLookupBet] = useState<any | null>(null);

  useEffect(() => {
    localStorage.setItem(CLIENT_SEED_STORAGE_KEY, clientSeed);
  }, [clientSeed]);

  useEffect(() => {
    localStorage.setItem(CLIENT_NONCE_STORAGE_KEY, String(nonce));
  }, [nonce]);

  useEffect(() => {
    localStorage.setItem(CLIENT_SEED_AUTO_STORAGE_KEY, String(autoRefresh));
  }, [autoRefresh]);

  useEffect(() => {
    if (!lookupBetId.trim()) {
      setLookupBet(null);
      return;
    }
    apiFetch(`/api/activity/bets/${encodeURIComponent(lookupBetId.trim())}`).then((r) => r.json()).then((data) => {
      if (data?.activity) {
        setLookupBet(data.activity);
      }
    }).catch(() => undefined);
  }, [lookupBetId]);

  useEffect(() => {
    const handleBetRecorded = () => {
      setNonce((current) => current + 1);
      setSeed(crypto?.randomUUID?.() || Math.random().toString(36).slice(2));
      if (autoRefresh) {
        setClientSeed(generateClientSeed());
      }
    };

    window.addEventListener('pasus:bet-recorded', handleBetRecorded as EventListener);
    return () => window.removeEventListener('pasus:bet-recorded', handleBetRecorded as EventListener);
  }, [autoRefresh]);

  return (
    <div className="p-6 lg:p-10 max-w-6xl mx-auto space-y-8">
      <div className="space-y-2">
        <div className="text-[10px] uppercase tracking-[0.24em] text-[#00FF88] font-black">Trust</div>
        <h1 className="text-4xl md:text-5xl font-black italic uppercase tracking-tighter">Provably Fair</h1>
        <p className="text-sm text-white/50 max-w-2xl leading-relaxed">Client seed is now editable and can auto-refresh after each recorded bet. Nonce also increments after every logged round.</p>
      </div>
      <div className="flex flex-wrap gap-3">
        <button
          onClick={() => setClientSeed(generateClientSeed())}
          className="rounded-2xl bg-[#00FF88] text-black px-4 py-3 text-xs font-black uppercase tracking-[0.16em]"
        >
          Refresh Client Seed
        </button>
        <button
          onClick={() => setSeed(crypto?.randomUUID?.() || Math.random().toString(36).slice(2))}
          className="rounded-2xl bg-white/5 text-white px-4 py-3 text-xs font-black uppercase tracking-[0.16em]"
        >
          Refresh Server Seed
        </button>
        <button
          onClick={() => setAutoRefresh((current) => !current)}
          className={cn(
            'rounded-2xl px-4 py-3 text-xs font-black uppercase tracking-[0.16em]',
            autoRefresh ? 'bg-[#00FF88]/15 text-[#00FF88] border border-[#00FF88]/30' : 'bg-white/5 text-white/55'
          )}
        >
          Auto Refresh On Bet: {autoRefresh ? 'On' : 'Off'}
        </button>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="rounded-3xl border border-white/10 bg-[#141821] p-6"><div className="text-[10px] uppercase tracking-[0.18em] text-white/25 font-black">Server Seed</div><div className="mt-3 text-xs break-all text-white/70 font-mono">{seed}</div></div>
        <div className="rounded-3xl border border-white/10 bg-[#141821] p-6"><div className="text-[10px] uppercase tracking-[0.18em] text-white/25 font-black">Client Seed</div><input value={clientSeed} onChange={(e) => setClientSeed(e.target.value.toUpperCase())} className="mt-3 w-full rounded-2xl border border-white/10 bg-black/30 px-4 py-3 text-sm font-mono text-white/80 focus:outline-none" /></div>
        <div className="rounded-3xl border border-white/10 bg-[#141821] p-6"><div className="text-[10px] uppercase tracking-[0.18em] text-white/25 font-black">Nonce</div><div className="mt-3 text-3xl font-black italic">{nonce}</div></div>
      </div>
      <div className="rounded-[32px] border border-white/10 bg-[#141821] p-6 space-y-4">
        <div className="text-lg font-black uppercase tracking-tight">Replay / Share Lookup</div>
        <div className="flex gap-3">
          <input value={lookupBetId} onChange={(e) => setLookupBetId(e.target.value)} placeholder="Enter bet ID from a shared link" className="flex-1 rounded-2xl border border-white/10 bg-black/30 px-4 py-3 text-sm font-mono focus:outline-none" />
          <button onClick={() => navigator.clipboard.writeText(getBetShareUrl(Number(lookupBetId || 0)))} disabled={!lookupBetId.trim()} className="rounded-2xl bg-[#00FF88] px-4 py-3 text-xs font-black uppercase tracking-[0.16em] text-black disabled:opacity-40">Copy</button>
        </div>
        {lookupBet ? (
          <div className="rounded-2xl border border-white/5 bg-black/30 px-4 py-4 text-sm text-white/65">
            <div className="flex items-center justify-between gap-3"><span className="font-black capitalize text-white">{lookupBet.gameKey}</span><span>{lookupBet.username}</span></div>
            <div className="mt-2 text-white/40">{lookupBet.detail || 'No replay note saved.'}</div>
            <div className="mt-3 flex flex-wrap gap-4 text-xs">
              <span>Wager {formatMoneyFromCoins(lookupBet.wager)}</span>
              <span>Payout {formatMoneyFromCoins(lookupBet.payout)}</span>
              <span>{lookupBet.multiplier.toFixed(2)}x</span>
            </div>
          </div>
        ) : null}
      </div>
      <div className="rounded-[32px] border border-white/10 bg-[#141821] p-6 space-y-4">
        <div className="text-lg font-black uppercase tracking-tight">How It Should Work</div>
        {[
          'Each game round should use a hidden server seed and a visible server seed hash before play starts.',
          'The player supplies or edits a client seed that is combined with the server seed and nonce.',
          'After the round, Pasus reveals the server seed so the player can reproduce the exact outcome locally.',
        ].map((line) => <div key={line} className="rounded-2xl border border-white/5 bg-black/30 px-4 py-3 text-sm text-white/65">{line}</div>)}
      </div>
    </div>
  );
};

const SupportView = () => {
  const { user } = useAuth();
  const [subject, setSubject] = useState('');
  const [ticketCategory, setTicketCategory] = useState('general');
  const [ticketAttachmentUrl, setTicketAttachmentUrl] = useState('');
  const [message, setMessage] = useState('');
  const [tickets, setTickets] = useState<SupportThread[]>([]);
  const [selectedTicketId, setSelectedTicketId] = useState<number | null>(null);
  const [replyMessage, setReplyMessage] = useState('');
  const [replyAttachmentUrl, setReplyAttachmentUrl] = useState('');
  const [status, setStatus] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const loadTickets = async () => {
    const token = localStorage.getItem('pasus_auth_token');
    if (!token) {
      return;
    }
    const response = await apiFetch('/api/support/tickets', {
      headers: { Authorization: `Bearer ${token}` },
    });
    const data = await response.json().catch(() => ({}));
    if (response.ok) {
      const nextTickets = Array.isArray(data.tickets) ? data.tickets : [];
      setTickets(nextTickets);
      setSelectedTicketId((current) => {
        if (current && nextTickets.some((ticket: SupportThread) => ticket.id === current)) {
          return current;
        }
        return nextTickets[0]?.id ?? null;
      });
    }
  };

  useEffect(() => {
    loadTickets().catch(() => undefined);
  }, []);

  useEffect(() => {
    const timer = window.setInterval(() => {
      loadTickets().catch(() => undefined);
    }, 4000);
    return () => window.clearInterval(timer);
  }, []);

  const submitTicket = async () => {
    const token = localStorage.getItem('pasus_auth_token');
    if (!token) {
      return;
    }
    try {
      setIsSubmitting(true);
      const response = await apiFetch('/api/support/tickets', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ subject, category: ticketCategory, attachmentUrl: ticketAttachmentUrl, message }),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(data.error || 'Failed to create support ticket.');
      }
      setStatus('Support ticket submitted.');
      setSubject('');
      setTicketCategory('general');
      setTicketAttachmentUrl('');
      setMessage('');
      setSelectedTicketId(Number(data.ticket?.id || 0) || null);
      await loadTickets();
    } catch (err) {
      setStatus(err instanceof Error ? err.message : 'Failed to create support ticket.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const selectedTicket = tickets.find((ticket) => ticket.id === selectedTicketId) || null;
  const canReplyToSelectedTicket = Boolean(
    selectedTicket && user && (user.role === 'owner' || selectedTicket.userId === user.id)
  );

  const submitReply = async () => {
    const token = localStorage.getItem('pasus_auth_token');
    if (!token || !selectedTicket || !replyMessage.trim()) {
      return;
    }

    try {
      setIsSubmitting(true);
      const response = await apiFetch(`/api/support/tickets/${selectedTicket.id}/reply`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ message: replyMessage.trim(), attachmentUrl: replyAttachmentUrl }),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(data.error || 'Failed to reply to support ticket.');
      }
      setReplyMessage('');
      setReplyAttachmentUrl('');
      setStatus('Support reply sent.');
      await loadTickets();
    } catch (err) {
      setStatus(err instanceof Error ? err.message : 'Failed to reply to support ticket.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="p-6 lg:p-10 max-w-6xl mx-auto space-y-8">
      <div className="space-y-2">
        <div className="text-[10px] uppercase tracking-[0.24em] text-[#00FF88] font-black">Help</div>
        <h1 className="text-4xl md:text-5xl font-black italic uppercase tracking-tighter">Live Support</h1>
        <p className="text-sm text-white/50 max-w-2xl leading-relaxed">Use this page to contact support and track ticket activity. Everyone can now view the live support threads, while replies stay limited to the ticket owner and the owner account.</p>
        <button 
          onClick={() => {
            if (typeof window !== 'undefined' && (window as any).openFeaturebaseChat) {
              (window as any).openFeaturebaseChat();
            }
          }}
          className="mt-4 rounded-2xl bg-[#00FF88] text-black px-6 py-3 text-xs font-black uppercase tracking-[0.16em]"
        >
          Open Live Chat
        </button>
      </div>
      {status ? <div className="rounded-2xl border border-white/10 bg-[#141821] px-4 py-3 text-sm text-white/70">{status}</div> : null}
      <div className="grid grid-cols-1 lg:grid-cols-[1fr_1.2fr] gap-6">
        <div className="rounded-[32px] border border-white/10 bg-[#141821] p-6 space-y-4">
          <div className="text-lg font-black uppercase tracking-tight">Open Ticket</div>
          <input value={subject} onChange={(e) => setSubject(e.target.value)} placeholder="Subject" className="w-full rounded-2xl border border-white/10 bg-black/30 px-4 py-3 text-sm focus:outline-none" />
          <select value={ticketCategory} onChange={(e) => setTicketCategory(e.target.value)} className="w-full rounded-2xl border border-white/10 bg-black/30 px-4 py-3 text-sm focus:outline-none">
            <option value="general">General</option>
            <option value="payments">Payments</option>
            <option value="account">Account</option>
            <option value="technical">Technical</option>
            <option value="affiliate">Affiliate</option>
            <option value="vip">VIP</option>
          </select>
          <input value={ticketAttachmentUrl} onChange={(e) => setTicketAttachmentUrl(e.target.value)} placeholder="Attachment URL (optional)" className="w-full rounded-2xl border border-white/10 bg-black/30 px-4 py-3 text-sm focus:outline-none" />
          <textarea value={message} onChange={(e) => setMessage(e.target.value)} placeholder="Describe the issue" rows={6} className="w-full rounded-2xl border border-white/10 bg-black/30 px-4 py-3 text-sm focus:outline-none resize-none" />
          <button onClick={submitTicket} disabled={isSubmitting || !subject.trim() || !message.trim()} className="rounded-2xl bg-[#00FF88] text-black px-5 py-3 text-xs font-black uppercase tracking-[0.16em] disabled:opacity-40">
            {isSubmitting ? 'Submitting...' : 'Submit Ticket'}
          </button>
          <div className="text-xs text-white/35">For urgent cases, you can also direct users to your Discord server or Telegram from here.</div>
        </div>
        <div className="rounded-[32px] border border-white/10 bg-[#141821] p-6 space-y-4">
          <div className="text-lg font-black uppercase tracking-tight">Ticket Threads</div>
          <div className="grid grid-cols-1 xl:grid-cols-[0.8fr_1.2fr] gap-4">
            <div className="space-y-3 max-h-[520px] overflow-y-auto custom-scrollbar pr-1">
              {tickets.length ? tickets.map((ticket) => (
                <button
                  key={ticket.id}
                  onClick={() => setSelectedTicketId(ticket.id)}
                  className={cn(
                    'w-full rounded-2xl border px-4 py-4 text-left transition-all',
                    selectedTicketId === ticket.id ? 'border-[#00FF88]/40 bg-[#00FF88]/10' : 'border-white/5 bg-black/30'
                  )}
                  >
                    <div className="flex items-center justify-between gap-4">
                      <div className="text-sm font-black">{ticket.subject}</div>
                      <div className="text-[10px] uppercase tracking-[0.16em] text-[#00FF88] font-black">{ticket.status}</div>
                    </div>
                    <div className="mt-2 text-[10px] uppercase tracking-[0.16em] text-white/25">{ticket.category || 'general'}</div>
                    <div className="mt-2 text-[11px] text-white/30">{new Date(ticket.updatedAt).toLocaleString()}</div>
                    <div className="mt-1 text-[11px] text-white/40">{ticket.username}</div>
                  </button>
              )) : (
                <div className="rounded-2xl border border-white/5 bg-black/30 px-4 py-8 text-sm text-white/35">No support tickets yet.</div>
              )}
            </div>

            <div className="space-y-4">
              <div className="rounded-3xl border border-white/5 bg-black/25 p-4 min-h-[320px] max-h-[420px] overflow-y-auto custom-scrollbar space-y-3">
                {selectedTicket ? selectedTicket.messages.map((entry) => (
                  <div
                    key={`${selectedTicket.id}-${entry.id}-${entry.createdAt}`}
                    className={cn(
                      'rounded-2xl px-4 py-3 border',
                      entry.senderType === 'admin' ? 'border-[#00FF88]/20 bg-[#00FF88]/10 ml-8' : 'border-white/5 bg-white/[0.03] mr-8'
                    )}
                  >
                    <div className="flex items-center justify-between gap-3">
                      <div className="text-xs font-black">{entry.username}</div>
                      <div className="text-[10px] text-white/25">{new Date(entry.createdAt).toLocaleString()}</div>
                    </div>
                    <div className="mt-2 text-sm text-white/65 whitespace-pre-wrap">{entry.message}</div>
                    {entry.attachmentUrl ? (
                      <a href={entry.attachmentUrl} target="_blank" rel="noreferrer" className="mt-3 inline-flex items-center gap-2 rounded-full bg-white/5 px-3 py-1 text-[10px] font-black uppercase tracking-[0.14em] text-[#00FF88]">
                        <Paperclip size={10} />
                        {entry.attachmentName || 'Attachment'}
                      </a>
                    ) : null}
                  </div>
                )) : (
                  <div className="h-full flex items-center justify-center text-sm text-white/35">Select a ticket to view the thread.</div>
                )}
              </div>
              <textarea
                value={replyMessage}
                onChange={(e) => setReplyMessage(e.target.value)}
                rows={4}
                placeholder={
                  !selectedTicket ? 'Select a ticket first' : canReplyToSelectedTicket ? 'Reply to support' : 'Viewing only'
                }
                disabled={!canReplyToSelectedTicket}
                className="w-full rounded-2xl border border-white/10 bg-black/30 px-4 py-3 text-sm focus:outline-none resize-none disabled:opacity-50"
              />
              <input
                value={replyAttachmentUrl}
                onChange={(e) => setReplyAttachmentUrl(e.target.value)}
                placeholder={!canReplyToSelectedTicket ? 'Select a ticket first' : 'Attachment URL (optional)'}
                disabled={!canReplyToSelectedTicket}
                className="w-full rounded-2xl border border-white/10 bg-black/30 px-4 py-3 text-sm focus:outline-none disabled:opacity-50"
              />
              <button
                onClick={submitReply}
                disabled={!canReplyToSelectedTicket || !replyMessage.trim() || isSubmitting}
                className="rounded-2xl bg-[#00FF88] text-black px-5 py-3 text-xs font-black uppercase tracking-[0.16em] disabled:opacity-40"
              >
                {isSubmitting ? 'Sending...' : 'Send Reply'}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

const LegalPage = ({
  eyebrow,
  title,
  sections,
}: {
  eyebrow: string;
  title: string;
  sections: Array<{ heading: string; body: string }>;
}) => (
  <div className="p-6 lg:p-10 max-w-5xl mx-auto space-y-8">
    <div className="space-y-2">
      <div className="text-[10px] uppercase tracking-[0.24em] text-[#00FF88] font-black">{eyebrow}</div>
      <h1 className="text-4xl md:text-5xl font-black italic uppercase tracking-tighter">{title}</h1>
    </div>
    <div className="space-y-5">
      {sections.map((section) => (
        <div key={section.heading} className="rounded-[32px] border border-white/10 bg-[#141821] p-6 space-y-3">
          <div className="text-lg font-black uppercase tracking-tight">{section.heading}</div>
          <div className="text-sm text-white/60 leading-relaxed">{section.body}</div>
        </div>
      ))}
    </div>
  </div>
);

const OnboardingTourModal = ({
  isOpen,
  onClose,
  onOpenWallet,
  onOpenVip,
  onOpenAffiliate,
}: {
  isOpen: boolean;
  onClose: () => void;
  onOpenWallet: () => void;
  onOpenVip: () => void;
  onOpenAffiliate: () => void;
}) => {
  if (!isOpen) return null;

  const steps = [
    { icon: Wallet, title: 'Fund your wallet', body: 'Use deposits, promos, reloads, and bonus offers to get started fast.', action: 'Open Wallet', onClick: onOpenWallet },
    { icon: Star, title: 'Climb VIP', body: 'Track tier progress, claim rakeback, and unlock level rewards as you wager.', action: 'Open VIP', onClick: onOpenVip },
    { icon: Users, title: 'Invite friends', body: 'Share your referral link and grow affiliate earnings from invited players.', action: 'Open Affiliate', onClick: onOpenAffiliate },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/70" onClick={onClose} />
      <div className="relative w-full max-w-3xl rounded-[36px] border border-white/10 bg-[linear-gradient(145deg,#182028_0%,#11161d_100%)] p-6 md:p-8 space-y-6 shadow-2xl">
        <div className="flex items-start justify-between gap-4">
          <div>
            <div className="text-[10px] uppercase tracking-[0.24em] text-[#00FF88] font-black">Welcome To Pasus</div>
            <h2 className="mt-2 text-3xl md:text-4xl font-black italic uppercase tracking-tight">Quick Start Tour</h2>
            <p className="mt-3 max-w-2xl text-sm text-white/55">Here are the fastest places to get value from your account right away.</p>
          </div>
          <button onClick={onClose} className="rounded-2xl border border-white/10 bg-black/20 p-3 text-white/45 hover:text-white">
            <X size={18} />
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {steps.map((step) => {
            const Icon = step.icon;
            return (
              <div key={step.title} className="rounded-[28px] border border-white/10 bg-black/25 p-5 space-y-4">
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[#00FF88]/10 text-[#00FF88]">
                  <Icon size={22} />
                </div>
                <div>
                  <div className="text-lg font-black uppercase tracking-tight">{step.title}</div>
                  <div className="mt-2 text-sm text-white/50 leading-relaxed">{step.body}</div>
                </div>
                <button
                  onClick={() => {
                    step.onClick();
                    onClose();
                  }}
                  className="rounded-2xl bg-white/5 px-4 py-3 text-[10px] font-black uppercase tracking-[0.16em] text-white/70 hover:bg-white/10 hover:text-white"
                >
                  {step.action}
                </button>
              </div>
            );
          })}
        </div>

        <div className="flex items-center justify-between gap-4 rounded-2xl border border-white/10 bg-black/20 px-4 py-4">
          <div className="text-sm text-white/45">You can reopen these sections anytime from the sidebar or header.</div>
          <button onClick={onClose} className="rounded-2xl bg-[#00FF88] px-5 py-3 text-xs font-black uppercase tracking-[0.16em] text-black">
            Got it
          </button>
        </div>
      </div>
    </div>
  );
};

const AppContent = () => {
  consumeRedirectedPath();
  const initialRoute = resolveRoute(window.location.pathname);
  const CHAT_PREFERENCE_KEY = 'pasus_chat_open';
  const [activeGame, setActiveGame] = useState<string | null>(initialRoute.gameId);
  const [isWalletOpen, setIsWalletOpen] = useState(false);
  const [isLoginOpen, setIsLoginOpen] = useState(false);
  const [isDailyBonusOpen, setIsDailyBonusOpen] = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isRightRailOpen, setIsRightRailOpen] = useState(false);
  const [currentView, setCurrentView] = useState<MainView>(initialRoute.view);
  const [chatOpen, setChatOpen] = useState(() => {
    const saved = localStorage.getItem(CHAT_PREFERENCE_KEY);
    return saved === null ? true : saved === 'true';
  });
  const [isDesktopViewport, setIsDesktopViewport] = useState(() => window.innerWidth >= 1280);
  
  const toggleChat = useCallback(() => {
    if (isDesktopViewport) {
      setChatOpen((prev) => !prev);
      return;
    }
    setIsRightRailOpen((prev) => !prev);
  }, [isDesktopViewport]);
  const [dailyBonusStatus, setDailyBonusStatus] = useState<{
    canClaim: boolean;
    streak: number;
    level: number;
    xp: number;
    xpToNextLevel: number;
  }>({ canClaim: false, streak: 0, level: 1, xp: 0, xpToNextLevel: 0 });
  const { isAuthenticated, user } = useAuth();
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isPFOpen, setIsPFOpen] = useState(false);
  const [profileUsername, setProfileUsername] = useState<string | null>(null);
  const [isOnboardingOpen, setIsOnboardingOpen] = useState(false);

  useEffect(() => {
    const onResize = () => {
      const desktop = window.innerWidth >= 1280;
      setIsDesktopViewport(desktop);
      if (desktop) {
        setIsRightRailOpen(false);
      }
    };

    window.addEventListener('resize', onResize);
    onResize();
    return () => window.removeEventListener('resize', onResize);
  }, []);

  useEffect(() => {
    localStorage.setItem(CHAT_PREFERENCE_KEY, chatOpen ? 'true' : 'false');
  }, [chatOpen]);

  useEffect(() => {
    const shouldSuppressWalletNoise = (input: unknown) => {
      const text = String(input ?? '').toLowerCase();
      return (
        text.includes('provider is disconnected from all chains') ||
        text.includes('cannot redefine property: ethereum') ||
        text.includes('window.ethereum is already defined and read-only') ||
        text.includes('could not assign exodus provider to window.ethereum')
      );
    };

    const handleError = (event: ErrorEvent) => {
      const message = event.message || (event.error instanceof Error ? event.error.message : '');
      const source = event.filename || '';

      if (shouldSuppressWalletNoise(message) || shouldSuppressWalletNoise(source)) {
        event.preventDefault();
        event.stopImmediatePropagation();
      }
    };

    const handleUnhandledRejection = (event: PromiseRejectionEvent) => {
      const reason = event.reason as { code?: number; message?: string } | null;
      const code = Number(reason?.code ?? 0);
      const message = String(reason?.message ?? event.reason ?? '');

      if (code === 4900 || shouldSuppressWalletNoise(message)) {
        event.preventDefault();
        event.stopImmediatePropagation();
      }
    };

    window.addEventListener('error', handleError, true);
    window.addEventListener('unhandledrejection', handleUnhandledRejection);
    return () => {
      window.removeEventListener('error', handleError, true);
      window.removeEventListener('unhandledrejection', handleUnhandledRejection);
    };
  }, []);

  useEffect(() => {
    if (!isAuthenticated || !user?.id) {
      setIsOnboardingOpen(false);
      return;
    }
    const key = `pasus_onboarding_seen_${user.id}`;
    if (localStorage.getItem(key) !== 'true') {
      setIsOnboardingOpen(true);
    }
  }, [isAuthenticated, user?.id]);

  const closeOnboarding = useCallback(() => {
    if (user?.id) {
      localStorage.setItem(`pasus_onboarding_seen_${user.id}`, 'true');
    }
    setIsOnboardingOpen(false);
  }, [user?.id]);

  useEffect(() => {
    if (window.bootFeaturebase) {
      window.bootFeaturebase(null);
    }
  }, [isAuthenticated, user]);

  const navigateTo = useCallback((path: string, gameId: string | null, view: MainView) => {
    if (window.location.pathname !== path) {
      window.history.pushState({}, '', path);
    }
    setActiveGame(gameId);
    setCurrentView(view);
  }, []);

  const openDashboard = useCallback(() => {
    navigateTo('/', null, 'dashboard');
  }, [navigateTo]);

  const openView = useCallback((view: MainView) => {
    navigateTo(VIEW_PATHS[view] || '/', null, view);
  }, [navigateTo]);

  const openGame = useCallback((id: string) => {
    navigateTo(`/${id}`, id, 'dashboard');
  }, [navigateTo]);

  const loadDailyBonusStatus = useCallback(async () => {
    if (!isAuthenticated) {
      return;
    }
    const token = localStorage.getItem('pasus_auth_token');
    if (!token) {
      return;
    }

    try {
      const response = await apiFetch('/api/daily-claim/status', {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        return;
      }
      setDailyBonusStatus({
        canClaim: data.canClaim || false,
        streak: data.streak || 0,
        level: data.level || 1,
        xp: data.xp || 0,
        xpToNextLevel: data.xpToNextLevel || 0,
      });
      if (data.canClaim) {
        setIsDailyBonusOpen(true);
      }
    } catch {
    }
  }, [isAuthenticated]);

  useEffect(() => {
    loadDailyBonusStatus();
  }, [loadDailyBonusStatus]);

  useEffect(() => {
    const onPopState = () => {
      const route = resolveRoute(window.location.pathname);
      setActiveGame(route.gameId);
      setCurrentView(route.view);
    };

    window.addEventListener('popstate', onPopState);
    return () => window.removeEventListener('popstate', onPopState);
  }, []);

  const handleSelectGame = (id: string) => {
    if (!isAuthenticated) {
      setIsLoginOpen(true);
      return;
    }
    openGame(id);
  };

  const CurrentGame = activeGame ? GAMES.find(g => g.id === activeGame)?.component : null;

  return (
    <div className="flex h-screen overflow-hidden bg-[radial-gradient(circle_at_top_left,rgba(0,255,136,0.08),transparent_22%),radial-gradient(circle_at_top_right,rgba(67,97,238,0.14),transparent_28%),linear-gradient(180deg,#182028_0%,#141b24_100%)] text-white font-sans selection:bg-[#00FF88] selection:text-black">
      <Sidebar 
        activeGame={activeGame} 
        currentView={currentView}
        onSelectGame={handleSelectGame} 
        onHome={openDashboard}
        onOpenView={openView}
        onOpenPF={() => setIsPFOpen(true)}
        onToggleChat={toggleChat}
        chatOpen={chatOpen}
        isOpen={isSidebarOpen}
        onClose={() => setIsSidebarOpen(false)}
      />
      
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        <Header 
          onOpenWallet={() => setIsWalletOpen(true)} 
          onOpenLogin={() => setIsLoginOpen(true)}
          onOpenProfile={() => openView('profile')}
          onOpenConnections={() => openView('connections')}
          onOpenSettings={() => openView('settings')}
          onOpenAdmin={() => openView('admin')}
          onOpenLeaderboard={() => openView('leaderboard')}
          onOpenSidebar={() => setIsSidebarOpen(true)}
          onToggleChat={toggleChat}
          chatOpen={chatOpen}
          userLevel={dailyBonusStatus.level}
          userStreak={dailyBonusStatus.streak}
          userXp={dailyBonusStatus.xp}
          userXpToNextLevel={dailyBonusStatus.xpToNextLevel}
        />

        <div
          className="fixed inset-0 pointer-events-none z-[-2] opacity-[0.85]"
          style={{
            backgroundImage: `
              radial-gradient(circle at 12% 18%, rgba(255,255,255,0.95) 0 1px, transparent 1.5px),
              radial-gradient(circle at 22% 72%, rgba(255,255,255,0.7) 0 1px, transparent 1.6px),
              radial-gradient(circle at 36% 28%, rgba(170,220,255,0.95) 0 1px, transparent 1.8px),
              radial-gradient(circle at 48% 82%, rgba(255,255,255,0.8) 0 1px, transparent 1.7px),
              radial-gradient(circle at 57% 16%, rgba(200,255,240,0.9) 0 1px, transparent 1.8px),
              radial-gradient(circle at 66% 58%, rgba(255,255,255,0.75) 0 1px, transparent 1.6px),
              radial-gradient(circle at 78% 24%, rgba(255,255,255,0.9) 0 1px, transparent 1.7px),
              radial-gradient(circle at 84% 68%, rgba(130,190,255,0.85) 0 1px, transparent 1.8px),
              radial-gradient(circle at 92% 34%, rgba(255,255,255,0.85) 0 1px, transparent 1.6px)
            `,
            backgroundRepeat: 'repeat',
            backgroundSize: '520px 520px',
          }}
        />
        <div
          className="fixed inset-0 pointer-events-none z-[-1] opacity-[0.22]"
          style={{
            backgroundImage: `
              radial-gradient(circle at 18% 30%, rgba(255,255,255,0.9) 0 1.2px, transparent 1.8px),
              radial-gradient(circle at 44% 64%, rgba(255,255,255,0.65) 0 1px, transparent 1.7px),
              radial-gradient(circle at 63% 38%, rgba(120,210,255,0.75) 0 1.2px, transparent 1.9px),
              radial-gradient(circle at 88% 74%, rgba(255,255,255,0.7) 0 1px, transparent 1.7px)
            `,
            backgroundRepeat: 'repeat',
            backgroundSize: '280px 280px',
          }}
        />
        
        <main className="flex-1 overflow-y-auto custom-scrollbar min-h-0">
          <AnimatePresence mode="wait">
            {activeGame ? (
              <motion.div
                key="game"
                initial={{ opacity: 0, scale: 0.98 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 1.02 }}
                className="p-6 lg:p-10"
              >
                <div className="max-w-6xl mx-auto mb-6 flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <button 
                      onClick={openDashboard}
                      className="w-10 h-10 rounded-xl bg-[#1a1d23] border border-white/5 flex items-center justify-center hover:bg-white/5 transition-colors"
                    >
                      <ChevronRight className="rotate-180 text-white/40" size={20} />
                    </button>
                    <div>
                      <h2 className="text-xl font-black italic uppercase tracking-tighter">
                        {GAMES.find(g => g.id === activeGame)?.name}
                      </h2>
                      <div className="text-[10px] text-white/20 uppercase tracking-[0.2em] font-bold">Original Game</div>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <button className="w-10 h-10 rounded-xl bg-[#1a1d23] border border-white/5 flex items-center justify-center text-white/40 hover:text-white transition-colors">
                      <Star size={18} />
                    </button>
                    <button className="w-10 h-10 rounded-xl bg-[#1a1d23] border border-white/5 flex items-center justify-center text-white/40 hover:text-white transition-colors">
                      <Settings size={18} />
                    </button>
                  </div>
                </div>
                {CurrentGame ? (
                  <Suspense fallback={lazyFallback}>
                    <CurrentGame />
                  </Suspense>
                ) : null}
              </motion.div>
            ) : currentView === 'profile' ? (
              <motion.div
                key="profile"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
              >
                <ProfileView />
              </motion.div>
            ) : currentView === 'settings' ? (
              <motion.div
                key="settings"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
              >
                <SettingsView />
              </motion.div>
            ) : currentView === 'admin' ? (
              <motion.div
                key="admin"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
              >
                <AdminView />
              </motion.div>
            ) : currentView === 'connections' ? (
              <motion.div
                key="connections"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
              >
                <ConnectionsView />
              </motion.div>
            ) : currentView === 'vip' ? (
              <motion.div
                key="vip"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
              >
                <VipView />
              </motion.div>
            ) : currentView === 'affiliate' ? (
              <motion.div
                key="affiliate"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
              >
                <AffiliateView />
              </motion.div>
              ) : currentView === 'leaderboard' ? (
              <motion.div
                key="leaderboard"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
              >
                <LeaderboardView />
              </motion.div>
            ) : currentView === 'tournaments' ? (
              <motion.div
                key="tournaments"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
              >
                <TournamentsView />
              </motion.div>
            ) : currentView === 'friends' ? (
              <motion.div
                key="friends"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
              >
                <FriendsView />
              </motion.div>
            ) : currentView === 'provably-fair' ? (
              <motion.div
                key="provably-fair"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
              >
                <ProvablyFairView />
              </motion.div>
            ) : currentView === 'support' ? (
              <motion.div
                key="support"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
              >
                <SupportView />
              </motion.div>
            ) : currentView === 'terms' ? (
              <motion.div key="terms" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}>
                <LegalPage
                  eyebrow="Legal"
                  title="Terms of Service"
                  sections={[
                    { heading: 'Acceptance of Terms', body: 'By accessing and using Pasus, you agree to be bound by these Terms of Service. If you do not agree to these terms, please do not use our platform. Your continued use of Pasus constitutes your acceptance of these terms and any modifications we may make.' },
                    { heading: 'Eligibility', body: 'You must be at least 18 years of age or the legal age for gambling in your jurisdiction to use Pasus. You are responsible for ensuring your use of our platform is lawful in your location. We reserve the right to request proof of age and to suspend accounts where eligibility cannot be verified.' },
                    { heading: 'Account Responsibilities', body: 'You are solely responsible for maintaining the confidentiality of your account credentials and for all activities that occur under your account. You agree to notify us immediately of any unauthorized use of your account. Pasus is not liable for any loss or damage arising from your failure to protect your account information.' },
                    { heading: 'Use of Service', body: 'Pasus is provided for entertainment purposes only. You agree to use the platform responsibly and not to engage in any activity that could harm the platform, other users, or our business. This includes but is not limited to: cheating, exploiting bugs, colluding with other players, or using automated software.' },
                    { heading: 'Financial Transactions', body: 'All virtual currency purchases are final and non-refundable. Promotional rewards, rakeback, and affiliate earnings are subject to review and may be revoked if abuse, fraud, or system manipulation is detected. We reserve the right to suspend or terminate accounts involved in chargebacks or payment disputes.' },
                    { heading: 'Game Rules and Fair Play', body: 'All games on Pasus use certified random number generators to ensure fair outcomes. However, past performance does not guarantee future results. We do not guarantee that any particular game will be available at all times and reserve the right to modify or discontinue games without notice.' },
                    { heading: 'Prohibited Activities', body: 'The following activities are strictly prohibited: creating multiple accounts to abuse promotions, using VPN or proxy services to circumvent geographic restrictions, engaging in money laundering or terrorist financing, harassment or abuse of other users or staff, and any attempt to manipulate game outcomes.' },
                    { heading: 'Limitation of Liability', body: 'Pasus is provided "as is" without warranties of any kind. We do not guarantee that the service will be uninterrupted or error-free. In no event shall Pasus be liable for any indirect, incidental, special, or consequential damages arising from your use of the platform.' },
                    { heading: 'Indemnification', body: 'You agree to indemnify and hold Pasus harmless from any claim or demand made by third parties due to or arising out of your violation of these Terms, your misuse of the service, or your violation of any law or the rights of third parties.' },
                    { heading: 'Termination', body: 'We reserve the right to terminate or suspend your account at any time, with or without cause, without notice. Upon termination, your right to use the service immediately ceases. All provisions of these Terms which by their nature should survive termination shall survive.' },
                    { heading: 'Changes to Terms', body: 'We reserve the right to modify these Terms at any time. Your continued use of Pasus after any such changes constitutes your acceptance of the new Terms. It is your responsibility to review these Terms periodically.' },
                    { heading: 'Contact Information', body: 'If you have any questions about these Terms, please contact us through our support system. We will respond to inquiries within a reasonable timeframe.' },
                  ]}
                />
              </motion.div>
            ) : currentView === 'privacy' ? (
              <motion.div key="privacy" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}>
                <LegalPage
                  eyebrow="Legal"
                  title="Privacy Policy"
                  sections={[
                    { heading: 'Information We Collect', body: 'Pasus collects information you provide directly when creating an account, such as username, email address, and authentication data. We also collect gameplay data, transaction records, support ticket communications, and usage analytics. When using OAuth login (Discord, Roblox), we receive limited profile information as permitted by the provider.' },
                    { heading: 'How We Use Your Data', body: 'We use your data to provide and improve our services, authenticate your identity, maintain account balances and transaction history, process deposits and withdrawals, respond to support requests, prevent fraud and abuse, and comply with legal obligations. Your data is processed lawfully, fairly, and transparently.' },
                    { heading: 'Data Storage and Security', body: 'Your personal data is stored on secure servers with industry-standard encryption. We implement appropriate technical and organizational measures to protect your data against unauthorized access, loss, or destruction. However, no method of transmission over the Internet is 100% secure, and we cannot guarantee absolute security.' },
                    { heading: 'Data Sharing and Disclosure', body: 'We may share data with third-party service providers who assist in operating our platform (hosting, payment processing, analytics). We may also disclose information when required by law, to enforce our Terms, or to protect the rights, safety, or property of Pasus or its users. We do not sell your personal data to third parties.' },
                    { heading: 'Cookies and Tracking Technologies', body: 'Pasus uses cookies and similar tracking technologies to enhance your experience, remember your preferences, and analyze platform performance. You can control cookie settings through your browser, but disabling cookies may affect certain platform functionalities.' },
                    { heading: 'Data Retention', body: 'We retain your account data for as long as your account remains active. Upon account closure, we may retain certain data as required by law or for legitimate business purposes, such as fraud prevention and regulatory compliance. Inactive accounts may be archived after extended periods of inactivity.' },
                    { heading: 'Your Rights', body: 'Depending on your jurisdiction, you may have rights to access, correct, delete, or restrict processing of your personal data. You may also have the right to data portability. To exercise these rights, please contact our support team. We will respond to your request within the timeframe required by applicable law.' },
                    { heading: "Children's Privacy", body: 'Pasus is not intended for children under the age of 18 or the legal gambling age in their jurisdiction. We do not knowingly collect personal data from minors. If we become aware that we have collected data from a minor, we will take steps to delete such information promptly.' },
                    { heading: 'International Data Transfers', body: 'Your data may be transferred and processed in countries other than where you reside. We ensure appropriate safeguards are in place for international data transfers, including standard contractual clauses or adequacy decisions, to protect your data under applicable law.' },
                    { heading: 'Third-Party Links', body: 'Our platform may contain links to third-party websites or services. Pasus is not responsible for the privacy practices or content of these external sites. We encourage you to review the privacy policies of any third-party sites you visit.' },
                    { heading: 'Changes to This Policy', body: 'We may update this Privacy Policy periodically. We will notify you of material changes by posting the new policy on this page and updating the "last updated" date. Your continued use of Pasus after such changes constitutes acceptance of the new Privacy Policy.' },
                    { heading: 'Data Breach Notification', body: 'In the event of a data breach that affects your personal data, we will notify you and relevant authorities as required by applicable law. We will take appropriate steps to mitigate the effects of the breach and prevent future incidents.' },
                    { heading: 'Contact and Complaints', body: 'If you have concerns about how we handle your data, please contact our support team. You also have the right to lodge a complaint with your local data protection authority if you believe we have violated applicable data protection laws.' },
                  ]}
                />
              </motion.div>
            ) : currentView === 'responsible-gaming' ? (
              <motion.div key="responsible-gaming" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}>
                <LegalPage
                  eyebrow="Safety"
                  title="Responsible Gaming"
                  sections={[
                    { heading: 'Our Commitment', body: 'Pasus is committed to promoting responsible gaming and ensuring our platform remains a safe, enjoyable entertainment experience. We believe gambling should always be a choice, not a necessity, and we take our responsibility to protect vulnerable users seriously.' },
                    { heading: 'Understanding Problem Gambling', body: 'Problem gambling is gambling that disrupts personal, family, or professional life. Warning signs include: chasing losses, hiding gambling activity, gambling with money needed for bills, feeling irritable when not gambling, lying about gambling habits, and borrowing money to gamble. If any of these apply to you, please seek help.' },
                    { heading: 'Setting Personal Limits', body: 'We provide tools to help you stay in control: Deposit Limits - restrict how much you can deposit daily, weekly, or monthly. Loss Limits - cap your losses within a set timeframe. Session Limits - limit how long you can play in one session. These can be adjusted but may require a waiting period to prevent impulsive changes.' },
                    { heading: 'Self-Exclusion Options', body: 'If you need a break from gambling, we offer self-exclusion options: Temporary Cool-Off - take a short break (24 hours to 30 days). Permanent Self-Exclusion - close your account indefinitely. During self-exclusion, you will not be able to access your account or receive promotional materials. We may also restrict new account creation.' },
                    { heading: 'Reality Checks', body: 'Our platform includes periodic reminders to help you stay aware of your playing time and spending. You can enable or adjust these notifications in your account settings. We encourage you to use these features to maintain a healthy balance between gambling and other life activities.' },
                    { heading: 'Underage Gambling Prevention', body: 'Pasus strictly prohibits gambling by anyone under 18 years of age or the legal gambling age in their jurisdiction. We implement age verification measures and are committed to preventing underage access. Parents and guardians can use filtering software to block access to gambling sites.' },
                    { heading: 'Protecting Vulnerable Users', body: 'We have measures in place to identify and assist potentially vulnerable users. This includes staff training to recognize signs of problem gambling and protocols for offering support. If we suspect someone may be experiencing gambling-related harm, we may reach out with information about support resources.' },
                    { heading: 'External Support Resources', body: 'If you or someone you know needs help, please contact these organizations: National Council on Problem Gambling (www.ncpgambling.org) - 1-800-522-4700. Gamblers Anonymous (www.gamblersanonymous.org) - Peer support meetings worldwide. BeGambleAware (www.begambleaware.org) - UK-based support and information. These services offer confidential counseling and support.' },
                    { heading: 'Financial Responsibility', body: 'Never gamble with money you cannot afford to lose. Gambling should never be viewed as a way to make money or solve financial problems. Before playing, set a budget and stick to it. Never chase losses - this often leads to greater losses and financial difficulties.' },
                    { heading: 'Balanced Lifestyle', body: 'Maintain a healthy balance between gambling and other activities. Take regular breaks, engage in other hobbies, maintain social connections outside of gambling, and ensure gambling does not interfere with work, family, or personal responsibilities. If gambling stops being fun, it is time to stop.' },
                    { heading: 'Reporting Concerns', body: 'If you are concerned about your own gambling or someone elses, please reach out to our support team. We can provide information about available tools and resources. You can also contact third-party organizations specializing in problem gambling support. Your wellbeing is our priority.' },
                    { heading: 'Operator Responsibilities', body: 'Pasus adheres to industry best practices for responsible gaming. We regularly review and improve our responsible gaming policies and procedures. Our staff receive training on responsible gaming awareness, and we participate in industry initiatives to promote safe gambling practices.' },
                  ]}
                />
              </motion.div>
            ) : (
              <motion.div
                key="dashboard"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
              >
                <Dashboard onSelectGame={handleSelectGame} onOpenProfile={(username) => setProfileUsername(username)} />
              </motion.div>
            )}
          </AnimatePresence>

          <footer className="p-10 border-t border-white/5 mt-20">
            <div className="max-w-6xl mx-auto grid grid-cols-1 md:grid-cols-4 gap-12 opacity-40">
              <div className="col-span-1 md:col-span-2">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-6 h-6 rounded overflow-hidden">
                    <img src="/assets/icon.png" alt="Pasus" className="w-full h-full object-cover" />
                  </div>
                  <span className="text-lg font-black tracking-tighter uppercase italic">Pasus</span>
                </div>
                <p className="text-xs leading-relaxed max-w-sm">
                  Pasus is a community-driven digital entertainment platform. 
                  We advocate for responsible gaming and provide tools to help you stay in control.
                </p>
              </div>
              <div className="text-xs space-y-2">
                <div className="font-black uppercase tracking-widest mb-4">Links</div>
                <button onClick={() => openView('terms')} className="block text-left hover:text-white transition-colors">Terms of Service</button>
                <button onClick={() => openView('privacy')} className="block text-left hover:text-white transition-colors">Privacy Policy</button>
                <button onClick={() => openView('responsible-gaming')} className="block text-left hover:text-white transition-colors">Responsible Gaming</button>
              </div>
              <div className="text-xs space-y-2">
                <div className="font-black uppercase tracking-widest mb-4">Social</div>
                <a href="https://x.com/PasusInc" target="_blank" rel="noreferrer" className="block hover:text-white transition-colors">Twitter / X</a>
                <a href="https://discord.gg/zRhFqK4kgk" target="_blank" rel="noreferrer" className="block hover:text-white transition-colors">Discord</a>
              </div>
              <div className="text-xs space-y-2">
                <div className="font-black uppercase tracking-widest mb-4">Support</div>
                <a href="mailto:support@pasus.xyz" className="block hover:text-white transition-colors">support@pasus.xyz</a>
              </div>
            </div>
          </footer>
        </main>
      </div>

      <Suspense fallback={null}>
        <ChatRain 
          isOpen={chatOpen && isDesktopViewport}
          isMobileOpen={isRightRailOpen && !isDesktopViewport}
          onCloseMobile={() => setIsRightRailOpen(false)} 
          onClose={() => {
            if (isDesktopViewport) {
              setChatOpen(false);
            } else {
              setIsRightRailOpen(false);
            }
          }}
          onOpenProfile={(username) => setProfileUsername(username)}
        />
      </Suspense>

      {isDesktopViewport && !chatOpen && (
        <button
          onClick={() => setChatOpen(true)}
          className="fixed bottom-6 right-6 z-30 bg-[#00FF88] text-black w-14 h-14 rounded-full shadow-lg shadow-[#00FF88]/30 flex items-center justify-center hover:bg-[#00FF88]/90 transition-all active:scale-95"
          aria-label="Open chat"
        >
          <MessageSquare size={22} />
        </button>
      )}

      {!isDesktopViewport && (
        <button
          onClick={() => setIsRightRailOpen((prev) => !prev)}
          className={cn(
            'fixed bottom-6 right-5 z-40 flex items-center gap-2 rounded-full px-4 py-3 text-xs font-black uppercase tracking-[0.14em] shadow-lg transition-all active:scale-95',
            isRightRailOpen
              ? 'bg-white/90 text-black shadow-black/30'
              : 'bg-[#00FF88] text-black shadow-[#00FF88]/30'
          )}
          aria-label={isRightRailOpen ? 'Hide chat' : 'Show chat'}
        >
          <MessageSquare size={16} />
          {isRightRailOpen ? 'Hide Chat' : 'Show Chat'}
        </button>
      )}

      <AnimatePresence>
        {isWalletOpen && (
          <WalletModal isOpen={isWalletOpen} onClose={() => setIsWalletOpen(false)} />
        )}
        {isLoginOpen && (
          <LoginModal isOpen={isLoginOpen} onClose={() => setIsLoginOpen(false)} />
        )}
        {isDailyBonusOpen && (
          <DailyBonusModal isOpen={isDailyBonusOpen} onClose={() => setIsDailyBonusOpen(false)} />
        )}
        {isSettingsOpen && (
          <Suspense fallback={lazyFallback}>
            <SettingsPanel onClose={() => setIsSettingsOpen(false)} />
          </Suspense>
        )}
        {isPFOpen && (
          <Suspense fallback={lazyFallback}>
            <ProvablyFairPanel onClose={() => setIsPFOpen(false)} />
          </Suspense>
        )}
        {profileUsername && (
          <Suspense fallback={lazyFallback}>
            <ProfilePage username={profileUsername} onClose={() => setProfileUsername(null)} />
          </Suspense>
        )}
        <OnboardingTourModal
          isOpen={isOnboardingOpen}
          onClose={closeOnboarding}
          onOpenWallet={() => setIsWalletOpen(true)}
          onOpenVip={() => openView('vip')}
          onOpenAffiliate={() => openView('affiliate')}
        />
      </AnimatePresence>

      {/* Global Background Texture */}
    </div>
  );
};

export default function App() {
  return (
    <AuthProvider>
      <BalanceProvider>
        <AppContent />
      </BalanceProvider>
    </AuthProvider>
  );
}
