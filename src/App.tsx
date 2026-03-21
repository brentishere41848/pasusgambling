/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useCallback, useEffect, useState } from 'react';
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
  Check,
  User,
  Trophy,
  LogIn,
  UserPlus,
  LogOut,
  Mail,
  Lock,
  SendHorizontal,
  LoaderCircle
} from 'lucide-react';
import { AuthProvider, useAuth } from './context/AuthContext';
import { BalanceProvider, useBalance } from './context/BalanceContext';
import { CrashGame } from './components/games/CrashGame';
import { MinesGame } from './components/games/MinesGame';
import { CoinflipGame } from './components/games/CoinflipGame';
import { DiceGame } from './components/games/DiceGame';
import { BlackjackGame } from './components/games/BlackjackGame';
import { HiloGame } from './components/games/HiloGame';
import { BaccaratGame } from './components/games/BaccaratGame';
import { WheelGame } from './components/games/WheelGame';
import { PlinkoGame } from './components/games/PlinkoGame';
import { RouletteGame } from './components/games/RouletteGame';
import { SlotsGame } from './components/games/SlotsGame';
import { LimboGame } from './components/games/LimboGame';
import { KenoGame } from './components/games/KenoGame';
import { apiFetch } from './lib/api';
import { cn } from './lib/utils';

function CurrencyIcon({ className = '', size = 18 }: { className?: string; size?: number }) {
  return (
    <img
      src="/assets/currency.png"
      alt="Coins"
      className={className}
      style={{ width: size, height: size }}
    />
  );
}

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
    image: '/assets/crash.png'
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
    image: '/assets/mines.png'
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
    image: 'https://picsum.photos/seed/casino-coinflip/800/600'
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
    image: 'https://picsum.photos/seed/casino-dice/800/600'
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
    image: 'https://picsum.photos/seed/casino-limbo/800/600'
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
    image: 'https://picsum.photos/seed/casino-keno/800/600'
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
    image: 'https://picsum.photos/seed/casino-hilo/800/600'
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
    image: 'https://picsum.photos/seed/casino-baccarat/800/600'
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
    image: 'https://picsum.photos/seed/casino-plinko/800/600'
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
    image: 'https://picsum.photos/seed/casino-roulette/800/600'
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
    image: 'https://picsum.photos/seed/casino-wheel/800/600'
  },
  {
    id: 'slots',
    name: 'Slots',
    description: 'Browse slot and wheel titles, then open one to play.',
    icon: Star,
    color: 'text-yellow-300',
    bg: 'bg-yellow-300/10',
    component: SlotsGame,
    featured: false,
    image: 'https://picsum.photos/seed/casino-slots/800/600'
  }
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

type MainView = 'dashboard' | 'profile' | 'connections' | 'settings' | 'admin' | 'vip' | 'affiliate' | 'leaderboard' | 'provably-fair' | 'support' | 'terms' | 'privacy' | 'responsible-gaming';

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

const COINS_PER_DOLLAR = 100;
const DISPLAY_CURRENCY_RATES: Record<string, number> = {
  USD: 1,
  EUR: 0.92,
  GBP: 0.79,
  JPY: 149,
  CAD: 1.35,
};

function formatCoins(value: number) {
  return new Intl.NumberFormat('en-US', {
    maximumFractionDigits: 0,
  }).format(Math.round(Number(value || 0)));
}

function coinsToUsd(value: number) {
  return Number(value || 0) / COINS_PER_DOLLAR;
}

function formatMoneyFromCoins(value: number) {
  return formatCoins(Number(value || 0));
}

function usdToCoins(value: number) {
  return Math.round(Number(value || 0) * COINS_PER_DOLLAR);
}

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
                <div className="mt-3 text-3xl font-black text-[#00FF88]">8</div>
                <div className="mt-2 text-xs text-white/45">Crash, blackjack, mines, HiLo, baccarat, wheel, and more.</div>
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
}: {
  activeGame: string | null,
  currentView: MainView,
  onSelectGame: (id: string) => void,
  onHome: () => void,
  onOpenView: (view: MainView) => void,
}) => {
  const { user } = useAuth();
  const [isOriginalsExpanded, setIsOriginalsExpanded] = useState(false);

  return (
    <aside className="w-64 border-r border-white/5 bg-[linear-gradient(180deg,#162229_0%,#171d2a_100%)] h-screen sticky top-0 hidden lg:flex flex-col p-4 overflow-y-auto custom-scrollbar">
      <button onClick={onHome} className="flex items-center gap-3 px-4 mb-8 group shrink-0">
        <div className="w-8 h-8 rounded-lg flex items-center justify-center rotate-3 group-hover:rotate-12 transition-transform overflow-hidden">
          <img src="/assets/icon.png" alt="Pasus" className="w-full h-full object-cover" />
        </div>
        <span className="text-xl font-black tracking-tighter uppercase italic">Pasus</span>
      </button>

      <nav className="flex-1 space-y-1">
        <button 
          onClick={onHome}
          className={cn(
            "w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-bold transition-all",
            !activeGame ? "bg-[#00FF88]/10 text-[#00FF88]" : "text-white/40 hover:text-white hover:bg-white/5"
          )}
        >
          <Home size={18} /> Home
        </button>
        
        <div className="pt-4 pb-1">
          <button 
            onClick={() => setIsOriginalsExpanded(!isOriginalsExpanded)}
            className="w-full flex items-center justify-between px-4 py-2 text-[10px] font-black uppercase tracking-[0.2em] text-white/20 hover:text-white/40 transition-colors"
          >
            <div className="flex items-center gap-2">
              <LayoutGrid size={12} />
              Originals
            </div>
            <ChevronDown size={12} className={cn("transition-transform", isOriginalsExpanded && "rotate-180")} />
          </button>
          
          <AnimatePresence>
            {isOriginalsExpanded && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                className="overflow-hidden space-y-1 mt-1"
              >
                {GAMES.map(game => (
                  <button 
                    key={game.id}
                    onClick={() => onSelectGame(game.id)}
                    className={cn(
                      "w-full flex items-center gap-3 px-4 py-2.5 rounded-xl text-sm font-bold transition-all pl-8",
                      activeGame === game.id ? "bg-[#00FF88]/10 text-[#00FF88]" : "text-white/40 hover:text-white hover:bg-white/5"
                    )}
                  >
                    <game.icon size={16} /> {game.name}
                  </button>
                ))}
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        <div className="pt-4 pb-2 px-4 text-[10px] font-black uppercase tracking-[0.2em] text-white/20">Platform</div>
        <button
          onClick={() => onOpenView('leaderboard')}
          className={cn(
            "w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-bold transition-all",
            currentView === 'leaderboard' ? "bg-[#00FF88]/10 text-[#00FF88]" : "text-white/40 hover:text-white hover:bg-white/5"
          )}
        >
          <Trophy size={18} /> Leaderboard
        </button>
        <button
          onClick={() => onOpenView('vip')}
          className={cn(
            "w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-bold transition-all",
            currentView === 'vip' ? "bg-[#00FF88]/10 text-[#00FF88]" : "text-white/40 hover:text-white hover:bg-white/5"
          )}
        >
          <Star size={18} /> VIP Club
        </button>
        <button
          onClick={() => onOpenView('affiliate')}
          className={cn(
            "w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-bold transition-all",
            currentView === 'affiliate' ? "bg-[#00FF88]/10 text-[#00FF88]" : "text-white/40 hover:text-white hover:bg-white/5"
          )}
        >
          <Users size={18} /> Affiliate
        </button>
        <button
          onClick={() => onOpenView('provably-fair')}
          className={cn(
            "w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-bold transition-all",
            currentView === 'provably-fair' ? "bg-[#00FF88]/10 text-[#00FF88]" : "text-white/40 hover:text-white hover:bg-white/5"
          )}
        >
          <ShieldCheck size={18} /> Provably Fair
        </button>
        {user?.role === 'owner' ? (
          <button
            onClick={() => onOpenView('admin')}
            className={cn(
              "w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-bold transition-all",
              currentView === 'admin' ? "bg-[#00FF88]/10 text-[#00FF88]" : "text-white/40 hover:text-white hover:bg-white/5"
            )}
          >
            <Shield size={18} /> Admin
          </button>
        ) : null}
      </nav>

      <div className="mt-auto pt-4 border-t border-white/5 shrink-0">
        <button
          onClick={() => onOpenView('support')}
          className={cn(
            "w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-bold transition-all",
            currentView === 'support' ? "bg-[#00FF88]/10 text-[#00FF88]" : "text-white/40 hover:text-white hover:bg-white/5"
          )}
        >
          <MessageSquare size={18} /> Live Support
        </button>
      </div>
    </aside>
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

const WalletModal = ({ isOpen, onClose }: { isOpen: boolean, onClose: () => void }) => {
  const { user } = useAuth();
  const { balance, totalDeposited, refreshWallet } = useBalance();
  const [amount, setAmount] = useState('25');
  const [activeTab, setActiveTab] = useState<'deposit' | 'withdraw'>('deposit');
  const [selectedCrypto, setSelectedCrypto] = useState(SUPPORTED_CRYPTO[0]);
  const [withdrawAddress, setWithdrawAddress] = useState('');
  const [copied, setCopied] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [depositTransaction, setDepositTransaction] = useState<DepositTransaction | null>(null);

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

      if (val < 5) {
        setError('Minimum withdrawal is $5.00.');
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

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
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
        className="relative w-full max-w-md bg-[#1a1d23] border border-white/10 rounded-3xl overflow-hidden shadow-2xl"
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
          </div>

          {(error || success) && (
            <div className={cn(
              'rounded-2xl px-4 py-3 text-xs font-bold border',
              error ? 'border-red-500/20 bg-red-500/10 text-red-300' : 'border-[#00FF88]/20 bg-[#00FF88]/10 text-[#9dffca]'
            )}>
              {error || success}
            </div>
          )}

          <div className="space-y-4">
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
              <div className="group flex items-center justify-end gap-2 font-mono font-bold text-[#00FF88]">
                <CurrencyIcon className="rounded-full object-cover" size={16} />
                <span className="group-hover:hidden">{formatMoneyFromCoins(balance)}</span>
                <span className="hidden group-hover:inline">{formatMoney(coinsToUsd(balance))}</span>
              </div>
            </div>
          </div>

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
        </div>
      </motion.div>
    </div>
  );
};

const LoginModal = ({ isOpen, onClose }: { isOpen: boolean, onClose: () => void }) => {
  const { login, register } = useAuth();
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [affiliateCode, setAffiliateCode] = useState('');
  const [isRegister, setIsRegister] = useState(false);
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!isOpen) return null;

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    const params = new URLSearchParams(window.location.search);
    const ref = params.get('ref');
    if (ref) {
      setIsRegister(true);
      setAffiliateCode(ref);
    }
  }, [isOpen]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!username.trim() || !password.trim() || (isRegister && !email.trim())) {
      setError('Please fill in all required fields.');
      return;
    }

    try {
      setIsSubmitting(true);
      if (isRegister) {
        await register(username.trim(), email.trim(), password, affiliateCode.trim());
      } else {
        await login(username.trim(), password);
      }
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Authentication failed.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
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
        className="relative w-full max-w-md bg-[#1a1d23] border border-white/10 rounded-3xl overflow-hidden shadow-2xl"
      >
        <div className="p-8 space-y-8">
          <div className="text-center space-y-2">
            <h2 className="text-3xl font-black italic uppercase tracking-tighter">
              {isRegister ? 'Join Pasus' : 'Welcome Back'}
            </h2>
            <p className="text-white/40 text-sm font-medium">
              {isRegister ? 'Create your account to start winning' : 'Enter your details to access your account'}
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            {error && (
              <div className="rounded-2xl border border-red-500/20 bg-red-500/10 px-4 py-3 text-xs font-bold text-red-300">
                {error}
              </div>
            )}

            <div className="space-y-2">
              <label className="text-[10px] font-black uppercase tracking-[0.2em] text-white/20 ml-2">Username</label>
              <div className="relative">
                <User className="absolute left-4 top-1/2 -translate-y-1/2 text-white/20" size={18} />
                <input 
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  className="w-full bg-black/40 border border-white/5 rounded-2xl pl-12 pr-6 py-4 text-sm font-bold focus:outline-none focus:border-[#00FF88]/50 transition-all"
                  placeholder="Enter username"
                  required
                />
              </div>
            </div>

            {isRegister && (
              <div className="space-y-2">
                <label className="text-[10px] font-black uppercase tracking-[0.2em] text-white/20 ml-2">Email</label>
                <div className="relative">
                  <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-white/20" size={18} />
                  <input 
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full bg-black/40 border border-white/5 rounded-2xl pl-12 pr-6 py-4 text-sm font-bold focus:outline-none focus:border-[#00FF88]/50 transition-all"
                    placeholder="Enter email"
                    required={isRegister}
                  />
                </div>
              </div>
            )}

            {isRegister && (
              <div className="space-y-2">
                <label className="text-[10px] font-black uppercase tracking-[0.2em] text-white/20 ml-2">Affiliate Code</label>
                <div className="relative">
                  <Users className="absolute left-4 top-1/2 -translate-y-1/2 text-white/20" size={18} />
                  <input
                    type="text"
                    value={affiliateCode}
                    onChange={(e) => setAffiliateCode(e.target.value.toUpperCase())}
                    className="w-full bg-black/40 border border-white/5 rounded-2xl pl-12 pr-6 py-4 text-sm font-bold focus:outline-none focus:border-[#00FF88]/50 transition-all"
                    placeholder="Optional affiliate code"
                  />
                </div>
              </div>
            )}

            <div className="space-y-2">
              <label className="text-[10px] font-black uppercase tracking-[0.2em] text-white/20 ml-2">Password</label>
              <div className="relative">
                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-white/20" size={18} />
                <input 
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full bg-black/40 border border-white/5 rounded-2xl pl-12 pr-6 py-4 text-sm font-bold focus:outline-none focus:border-[#00FF88]/50 transition-all"
                  placeholder="Enter password"
                  required
                />
              </div>
            </div>

            <button 
              type="submit"
              disabled={isSubmitting}
              className="w-full py-4 bg-[#00FF88] text-black rounded-2xl text-sm font-black uppercase tracking-widest hover:bg-[#00FF88]/90 transition-all shadow-lg shadow-[#00FF88]/10 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {isSubmitting ? 'Please wait...' : (isRegister ? 'Create Account' : 'Sign In')}
            </button>
          </form>

          <div className="text-center">
            <button 
              onClick={() => {
                setIsRegister(!isRegister);
                setError('');
              }}
              className="text-xs font-bold text-white/40 hover:text-white transition-colors"
            >
              {isRegister ? 'Already have an account? Sign In' : "Don't have an account? Register"}
            </button>
          </div>
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
}: {
  onOpenWallet: () => void,
  onOpenLogin: () => void,
  onOpenProfile: () => void,
  onOpenConnections: () => void,
  onOpenSettings: () => void,
  onOpenAdmin: () => void,
  onOpenLeaderboard: () => void
}) => {
  const { balance } = useBalance();
  const { user, logout, isAuthenticated } = useAuth();
  const [showUserMenu, setShowUserMenu] = useState(false);
  
  return (
    <header className="h-16 border-b border-white/5 bg-[linear-gradient(90deg,rgba(20,49,54,0.9),rgba(23,31,47,0.9))] backdrop-blur-xl sticky top-0 z-50">
      <div className="max-w-full h-full px-6 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-4 lg:hidden">
            <Menu className="text-white/40" />
          </div>
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg overflow-hidden">
              <img src="/assets/icon.png" alt="Pasus" className="w-full h-full object-cover" />
            </div>
            <span className="text-xl font-black italic">PASUS</span>
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
          <div className="group rounded-full border border-white/10 bg-[#1a1d23] px-5 py-2">
            <div className="flex items-center gap-2 font-mono font-bold text-sm text-[#00FF88]">
              <CurrencyIcon className="rounded-full object-cover" size={16} />
              <span className="group-hover:hidden">{formatMoneyFromCoins(balance)}</span>
              <span className="hidden group-hover:inline">{formatMoney(coinsToUsd(balance))}</span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-4">
          {isAuthenticated ? (
            <>
              <div className="bg-[#1f2228] border border-white/10 rounded-full p-1 flex items-center">
                <button 
                  onClick={onOpenWallet}
                  className="bg-[#00FF88] text-black text-sm font-black px-4 py-2 rounded-full hover:bg-[#00FF88]/90 transition-colors"
                >
                  +
                </button>
              </div>

              <div className="relative">
                <button 
                  onClick={() => setShowUserMenu(!showUserMenu)}
                  className="w-10 h-10 rounded-full border border-white/10 overflow-hidden hover:border-[#00FF88]/50 transition-all"
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
                        className="absolute right-0 mt-2 w-48 bg-[#1a1d23] border border-white/10 rounded-2xl overflow-hidden shadow-2xl z-50"
                      >
                        <div className="p-4 border-b border-white/5">
                          <div className="text-sm font-bold truncate">{user?.username}</div>
                          <div className="text-[10px] text-white/40 truncate">{user?.email}</div>
                        </div>
                        <div className="p-2">
                          <button 
                            onClick={() => {
                              onOpenProfile();
                              setShowUserMenu(false);
                            }}
                            className="w-full flex items-center gap-3 px-3 py-2 rounded-xl text-xs font-bold text-white/60 hover:text-white hover:bg-white/5 transition-all"
                          >
                            <User size={14} /> Profile
                          </button>
                          <button
                            onClick={() => {
                              onOpenConnections();
                              setShowUserMenu(false);
                            }}
                            className="w-full flex items-center gap-3 px-3 py-2 rounded-xl text-xs font-bold text-white/60 hover:text-white hover:bg-white/5 transition-all"
                          >
                            <Users size={14} /> Connections
                          </button>
                          <button 
                            onClick={() => {
                              onOpenSettings();
                              setShowUserMenu(false);
                            }}
                            className="w-full flex items-center gap-3 px-3 py-2 rounded-xl text-xs font-bold text-white/60 hover:text-white hover:bg-white/5 transition-all"
                          >
                            <Settings size={14} /> Settings
                          </button>
                          {user?.role === 'owner' ? (
                            <button
                              onClick={() => {
                                onOpenAdmin();
                                setShowUserMenu(false);
                              }}
                              className="w-full flex items-center gap-3 px-3 py-2 rounded-xl text-xs font-bold text-white/60 hover:text-white hover:bg-white/5 transition-all"
                            >
                              <Shield size={14} /> Admin
                            </button>
                          ) : null}
                          <button 
                            onClick={() => {
                              logout();
                              setShowUserMenu(false);
                            }}
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
                className="px-6 py-2.5 rounded-full text-xs font-black uppercase tracking-widest text-white/60 hover:text-white transition-all"
              >
                Sign In
              </button>
              <button 
                onClick={onOpenLogin}
                className="bg-[#00FF88] text-black px-6 py-2.5 rounded-full text-xs font-black uppercase tracking-widest hover:bg-[#00FF88]/90 transition-all shadow-lg shadow-[#00FF88]/10"
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
  createdAt: string;
};

const RecentActivity = () => {
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
    <section>
      <div className="flex items-center justify-between mb-6 gap-4">
        <h2 className="text-xl font-black italic uppercase tracking-tighter flex items-center gap-3">
          <TrendingUp className="text-[#00FF88]" size={20} />
          Live Bets
        </h2>
        <div className="flex p-1 bg-black/40 rounded-full border border-white/5">
          {[
            { id: 'all', label: 'All Bets' },
            { id: 'high', label: 'High Wins' },
            { id: 'lucky', label: 'Lucky Wins' },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as 'all' | 'high' | 'lucky')}
              className={cn(
                'px-4 py-2 rounded-full text-[10px] font-black uppercase tracking-[0.2em] transition-all',
                activeTab === tab.id ? 'bg-[#00FF88] text-black' : 'text-white/40 hover:text-white'
              )}
            >
              {tab.label}
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
              </tr>
            </thead>
            <tbody className="text-xs font-bold">
              {isLoading ? (
                <tr>
                  <td colSpan={6} className="px-6 py-8 text-center text-white/30">Loading activity...</td>
                </tr>
              ) : activities.length ? (
                activities.map((activity) => (
                  <tr key={activity.id} className="border-b border-white/5 hover:bg-white/[0.02] transition-colors">
                    <td className="px-6 py-4 text-white/60 capitalize">{activity.gameKey}</td>
                    <td className="px-6 py-4">{activity.username}</td>
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
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={6} className="px-6 py-8 text-center text-white/30">No bet activity yet.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </section>
  );
};

const DailyRewardsCard = () => {
  const { isAuthenticated } = useAuth();
  const { refreshWallet } = useBalance();
  const [reward, setReward] = useState<{ streak: number; rewardAmount: number; canClaim: boolean; nextClaimAt: string | null } | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isClaiming, setIsClaiming] = useState(false);
  const [status, setStatus] = useState('');

  const loadReward = useCallback(async () => {
    if (!isAuthenticated) {
      setReward(null);
      setIsLoading(false);
      return;
    }

    const token = localStorage.getItem('pasus_auth_token');
    if (!token) {
      setReward(null);
      setIsLoading(false);
      return;
    }

    const response = await apiFetch('/api/rewards/daily/status', {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) {
      throw new Error(data.error || 'Failed to load reward.');
    }
    setReward(data.reward || null);
  }, [isAuthenticated]);

  useEffect(() => {
    loadReward()
      .catch((error) => {
        setStatus(error instanceof Error ? error.message : 'Failed to load reward.');
      })
      .finally(() => setIsLoading(false));
  }, [loadReward]);

  const claimReward = async () => {
    try {
      setIsClaiming(true);
      setStatus('');
      const token = localStorage.getItem('pasus_auth_token');
      const response = await apiFetch('/api/rewards/daily/claim', {
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
      setReward(data.reward || null);
      setStatus(`Claimed ${formatMoneyFromCoins(Number(data.claimed || 0))}.`);
      await refreshWallet();
    } catch (error) {
      setStatus(error instanceof Error ? error.message : 'Failed to claim reward.');
    } finally {
      setIsClaiming(false);
    }
  };

  if (!isAuthenticated) {
    return null;
  }

  const nextClaimLabel = reward?.nextClaimAt ? new Date(reward.nextClaimAt).toLocaleString() : 'Ready now';

  return (
    <section className="grid grid-cols-1 lg:grid-cols-[1.1fr_0.9fr] gap-6">
      <div className="rounded-[32px] border border-white/10 bg-[linear-gradient(180deg,rgba(0,255,136,0.12),rgba(255,255,255,0.02))] p-6">
        <div className="flex items-center justify-between gap-4">
          <div>
            <div className="text-[10px] uppercase tracking-[0.24em] text-[#00FF88] font-black">Daily Rewards</div>
            <div className="text-3xl font-black italic tracking-tight">{isLoading ? 'Loading...' : formatMoneyFromCoins(reward?.rewardAmount || 0)}</div>
          </div>
          <div className="rounded-2xl border border-white/10 bg-black/30 px-4 py-3 text-right">
            <div className="text-[10px] uppercase tracking-[0.2em] text-white/30">Streak</div>
            <div className="text-xl font-black text-[#00FF88]">{reward?.streak || 0} days</div>
          </div>
        </div>
        <div className="mt-4 text-sm text-white/55">Claim once per day. Consecutive claims increase the reward until the streak resets.</div>
        <div className="mt-5 flex items-center gap-3">
          <button
            onClick={claimReward}
            disabled={isLoading || isClaiming || !reward?.canClaim}
            className="rounded-2xl bg-[#00FF88] text-black px-5 py-3 text-xs font-black uppercase tracking-[0.16em] disabled:opacity-40"
          >
            {isClaiming ? 'Claiming...' : reward?.canClaim ? 'Claim Daily Reward' : 'Already Claimed'}
          </button>
          <div className="text-xs text-white/35">Next claim: {nextClaimLabel}</div>
        </div>
        {status ? <div className="mt-4 text-xs text-white/60">{status}</div> : null}
      </div>

      <div className="rounded-[32px] border border-white/10 bg-[#141821] p-6">
        <div className="text-[10px] uppercase tracking-[0.24em] text-white/30 font-black">Reward Ladder</div>
        <div className="mt-4 grid grid-cols-5 gap-2">
          {[1, 2, 3, 4, 5].map((day) => (
            <div key={day} className="rounded-2xl border border-white/10 bg-black/25 px-3 py-4 text-center">
              <div className="text-[10px] uppercase tracking-[0.18em] text-white/25">Day {day}</div>
              <div className="mt-2 text-sm font-black">{formatMoneyFromCoins(Math.min(10, 2 + (day - 1)) * COINS_PER_DOLLAR)}</div>
            </div>
          ))}
        </div>
      </div>
    </section>
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
    <section className="space-y-4">
      <div className="flex items-center gap-3">
        <TrendingUp className="text-[#00FF88]" size={18} />
        <h2 className="text-xl font-black italic uppercase tracking-tighter">Live Bets Feed</h2>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
        {bets.map((betItem) => (
          <div key={betItem.id} className="rounded-[28px] border border-white/10 bg-[#141821] p-5 space-y-3">
            <div className="flex items-center justify-between">
              <div className="text-[10px] uppercase tracking-[0.2em] text-white/25">{betItem.gameKey}</div>
              <div className={cn('text-[10px] font-black uppercase tracking-[0.18em]', betItem.outcome === 'win' ? 'text-[#00FF88]' : betItem.outcome === 'push' ? 'text-blue-400' : 'text-red-400')}>
                {betItem.outcome}
              </div>
            </div>
            <div className="text-lg font-black">{betItem.username}</div>
            <div className="flex items-center justify-between text-sm">
              <span className="text-white/35">Wager</span>
              <span className="font-mono">{formatMoneyFromCoins(betItem.wager)}</span>
            </div>
            <div className="flex items-center justify-between text-sm">
              <span className="text-white/35">Payout</span>
              <span className={betItem.payout > 0 ? 'font-mono text-[#00FF88]' : 'font-mono text-white/25'}>{formatMoneyFromCoins(betItem.payout)}</span>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
};

const Dashboard = ({ onSelectGame }: { onSelectGame: (id: string) => void }) => {
  const featuredGames = GAMES.filter(g => g.featured).slice(0, 3);
  const originals = GAMES;

  return (
    <div className="p-6 lg:p-10 space-y-12">
      {/* Featured Section */}
      <section>
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-black italic uppercase tracking-tighter flex items-center gap-3">
            <Zap className="text-[#00FF88]" size={20} fill="currentColor" />
            Top Picks
          </h2>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {featuredGames.map(game => (
            <FeaturedGame key={game.id} game={game} onClick={() => onSelectGame(game.id)} />
          ))}
        </div>
      </section>

      <DailyRewardsCard />
      <LiveBetsStrip />
      <RecentActivity />
    </div>
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
              <div className="group flex items-center gap-2 font-mono font-bold text-[#00FF88] text-xl">
                <CurrencyIcon className="rounded-full object-cover" size={18} />
                <span className="group-hover:hidden">{formatMoneyFromCoins(balance)}</span>
                <span className="hidden group-hover:inline">{formatMoney(coinsToUsd(balance))}</span>
              </div>
            </div>
            <div className="bg-black/40 border border-white/5 rounded-2xl px-6 py-3">
              <div className="text-[10px] font-black uppercase tracking-widest text-white/20 mb-1">Games Played</div>
              <div className="font-mono font-bold text-white text-xl">1,248</div>
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
              { label: 'Total Wagered', value: '90,400 Coins' },
              { label: 'Total Won', value: '96,300 Coins' },
              { label: 'Net Profit', value: '+5,900 Coins', color: 'text-[#00FF88]' },
              { label: 'Highest Multiplier', value: '1,240x' },
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
              <div>
                <div className="text-xs font-bold mb-1">Two-Factor Auth</div>
                <div className="text-[10px] text-white/20 font-bold">Protect your account with 2FA</div>
              </div>
              <div className="w-12 h-6 bg-white/5 rounded-full relative cursor-pointer">
                <div className="absolute left-1 top-1 w-4 h-4 bg-white/20 rounded-full" />
              </div>
            </div>
            <button className="w-full py-3 bg-white/5 hover:bg-white/10 rounded-2xl text-xs font-bold transition-all">
              Change Password
            </button>
            <button className="w-full py-3 bg-white/5 hover:bg-white/10 rounded-2xl text-xs font-bold transition-all">
              Session History
            </button>
          </div>
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
  const [adminSection, setAdminSection] = useState<'overview' | 'history' | 'payments' | 'support'>('overview');
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
  const [isReplyingToSupport, setIsReplyingToSupport] = useState(false);

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
      createdAt: String(entry.createdAt || entry.created_at || ''),
    })));
  }, [activityTab]);

  useEffect(() => {
    Promise.all([loadOverview(), loadSupportTickets(), loadActivity(activityTab)]).catch((error) => {
      setStatus(error instanceof Error ? error.message : 'Failed to load admin overview.');
    });
  }, [activityTab, loadActivity, loadOverview, loadSupportTickets]);

  useEffect(() => {
    const timer = window.setInterval(() => {
      loadSupportTickets().catch(() => undefined);
    }, 4000);
    return () => window.clearInterval(timer);
  }, [loadSupportTickets]);

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
        body: JSON.stringify({ message: supportReply.trim() }),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(data.error || 'Failed to send support reply.');
      }
      setSupportReply('');
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

  if (user?.role !== 'owner') {
    return <InfoView eyebrow="Access" title="Admin" description="Owner access is required for the admin panel." cards={[{ title: 'Restricted', body: 'This panel is only available to the owner account.', icon: Shield }]} />;
  }

  return (
    <div className="p-6 lg:p-10 max-w-6xl mx-auto space-y-8">
      <div className="space-y-2">
        <div className="text-[10px] uppercase tracking-[0.24em] text-[#00FF88] font-black">Operations</div>
        <h1 className="text-4xl md:text-5xl font-black italic uppercase tracking-tighter">Admin Panel</h1>
        <p className="text-sm text-white/50 max-w-2xl leading-relaxed">Manage balances, review recent users, and monitor withdrawal pressure from one owner-only surface.</p>
      </div>

      {status ? <div className="rounded-2xl border border-white/10 bg-[#141821] px-4 py-3 text-sm text-white/70">{status}</div> : null}

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="rounded-[28px] border border-white/10 bg-[#141821] p-5"><div className="text-[10px] uppercase tracking-[0.18em] text-white/25 font-black">Users</div><div className="mt-3 text-3xl font-black italic">{overview?.stats.totalUsers ?? 0}</div></div>
        <div className="rounded-[28px] border border-white/10 bg-[#141821] p-5"><div className="text-[10px] uppercase tracking-[0.18em] text-white/25 font-black">Platform Balance</div><div className="mt-3 text-3xl font-black italic">{formatMoneyFromCoins(overview?.stats.totalBalance ?? 0)}</div></div>
        <div className="rounded-[28px] border border-white/10 bg-[#141821] p-5"><div className="text-[10px] uppercase tracking-[0.18em] text-white/25 font-black">Total Wagered</div><div className="mt-3 text-3xl font-black italic">{formatMoneyFromCoins(overview?.stats.totalWagered ?? 0)}</div></div>
        <div className="rounded-[28px] border border-white/10 bg-[#141821] p-5"><div className="text-[10px] uppercase tracking-[0.18em] text-white/25 font-black">Pending Withdrawals</div><div className="mt-3 text-3xl font-black italic">{overview?.stats.pendingWithdrawals ?? 0}</div></div>
      </div>

      <div className="flex flex-wrap gap-3">
        {[
          ['overview', 'Overview'],
          ['history', 'Game History'],
          ['payments', 'Payments'],
          ['support', 'Support'],
        ].map(([value, label]) => (
          <button
            key={value}
            onClick={() => setAdminSection(value as 'overview' | 'history' | 'payments' | 'support')}
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
  createdAt: string;
};

type SupportThread = {
  id: number;
  userId: number;
  username: string;
  subject: string;
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

const LeaderboardView = () => {
  const [entries, setEntries] = useState<Array<{ rank: number; userId: number; username: string; totalWagered: number }>>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const loadLeaderboard = async () => {
      try {
        setIsLoading(true);
        setError('');
        const response = await apiFetch('/api/leaderboard');
        const data = await response.json().catch(() => ({}));
        if (!response.ok) {
          throw new Error(data.error || 'Failed to load leaderboard.');
        }
        setEntries(Array.isArray(data.leaderboard) ? data.leaderboard : []);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load leaderboard.');
      } finally {
        setIsLoading(false);
      }
    };

    loadLeaderboard().catch(() => undefined);
  }, []);

  return (
    <div className="p-6 lg:p-10 max-w-5xl mr-auto ml-0 space-y-8">
      <div className="space-y-2">
        <div className="text-[10px] uppercase tracking-[0.24em] text-[#00FF88] font-black">Competition</div>
        <h1 className="text-4xl md:text-5xl font-black italic uppercase tracking-tighter">Leaderboard</h1>
        <p className="text-sm text-white/50 max-w-2xl leading-relaxed">Ranks are based on total wagered volume. Prize amounts are attached to the top four places directly in the list.</p>
      </div>

      {error ? <div className="rounded-2xl border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm text-red-300">{error}</div> : null}

      <div className="rounded-[32px] border border-white/10 bg-[#141821] p-6 space-y-4">
        <div className="flex items-center justify-between gap-4">
          <div className="text-lg font-black uppercase tracking-tight">Top Wagered</div>
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
                  <span>{formatMoneyFromCoins(entry.totalWagered)}</span>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="rounded-2xl border border-white/5 bg-black/30 px-4 py-8 text-sm text-white/35">No wagered activity yet.</div>
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

  const vipTier = stats.wagered >= usdToCoins(2000) ? 'Diamond' : stats.wagered >= usdToCoins(500) ? 'Gold' : stats.wagered >= usdToCoins(100) ? 'Silver' : 'Bronze';

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

  return (
    <div className="p-6 lg:p-10 max-w-6xl mx-auto space-y-8">
      <div className="space-y-2">
        <div className="text-[10px] uppercase tracking-[0.24em] text-[#00FF88] font-black">Loyalty</div>
        <h1 className="text-4xl md:text-5xl font-black italic uppercase tracking-tighter">VIP Club</h1>
        <p className="text-sm text-white/50 max-w-2xl leading-relaxed">This view now tracks a basic loyalty tier off recent wager history so the section feels like an actual product surface instead of filler.</p>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="rounded-3xl border border-white/10 bg-[#141821] p-6"><div className="text-[10px] text-white/25 uppercase tracking-[0.18em] font-black">Current Tier</div><div className="mt-3 text-3xl font-black italic">{vipTier}</div></div>
        <div className="rounded-3xl border border-white/10 bg-[#141821] p-6"><div className="text-[10px] text-white/25 uppercase tracking-[0.18em] font-black">Tracked Wager</div><div className="mt-3 text-3xl font-black italic">{formatMoneyFromCoins(stats.wagered)}</div></div>
        <div className="rounded-3xl border border-white/10 bg-[#141821] p-6"><div className="text-[10px] text-white/25 uppercase tracking-[0.18em] font-black">Tracked Bets</div><div className="mt-3 text-3xl font-black italic">{stats.bets}</div></div>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="rounded-3xl border border-white/10 bg-[#141821] p-6"><div className="text-[10px] text-white/25 uppercase tracking-[0.18em] font-black">Tracked Deposit</div><div className="mt-3 text-3xl font-black italic">{formatMoneyFromCoins(stats.deposited)}</div></div>
        <div className="rounded-3xl border border-white/10 bg-[#141821] p-6"><div className="text-[10px] text-white/25 uppercase tracking-[0.18em] font-black">Claimable Rakeback</div><div className="mt-3 text-3xl font-black italic text-[#00FF88]">{formatMoneyFromCoins(stats.claimableRakeback)}</div></div>
        <div className="rounded-3xl border border-white/10 bg-[#141821] p-6"><div className="text-[10px] text-white/25 uppercase tracking-[0.18em] font-black">Claimed Rakeback</div><div className="mt-3 text-3xl font-black italic">{formatMoneyFromCoins(stats.claimedTotal)}</div></div>
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
          <div className="text-lg font-black uppercase tracking-tight">Tier Ladder</div>
          {[
            'Bronze: 0+ Coins wagered',
            'Silver: 10,000+ Coins wagered',
            'Gold: 50,000+ Coins wagered',
            'Diamond: 200,000+ Coins wagered',
          ].map((line) => <div key={line} className="rounded-2xl border border-white/5 bg-black/30 px-4 py-3 text-sm text-white/65">{line}</div>)}
        </div>
        <div className="rounded-[32px] border border-white/10 bg-[#141821] p-6 space-y-4">
          <div className="text-lg font-black uppercase tracking-tight">Rakeback</div>
          <div className="rounded-2xl border border-[#00FF88]/15 bg-[#00FF88]/5 px-4 py-4 text-sm text-white/70">
            Total rakeback is calculated as 2% of your tracked deposits and wagers, then split across Instant, Daily, Weekly, and Monthly buckets.
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
  const [message, setMessage] = useState('');
  const [tickets, setTickets] = useState<SupportThread[]>([]);
  const [selectedTicketId, setSelectedTicketId] = useState<number | null>(null);
  const [replyMessage, setReplyMessage] = useState('');
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
        body: JSON.stringify({ subject, message }),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(data.error || 'Failed to create support ticket.');
      }
      setStatus('Support ticket submitted.');
      setSubject('');
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
        body: JSON.stringify({ message: replyMessage.trim() }),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(data.error || 'Failed to reply to support ticket.');
      }
      setReplyMessage('');
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
      </div>
      {status ? <div className="rounded-2xl border border-white/10 bg-[#141821] px-4 py-3 text-sm text-white/70">{status}</div> : null}
      <div className="grid grid-cols-1 lg:grid-cols-[1fr_1.2fr] gap-6">
        <div className="rounded-[32px] border border-white/10 bg-[#141821] p-6 space-y-4">
          <div className="text-lg font-black uppercase tracking-tight">Open Ticket</div>
          <input value={subject} onChange={(e) => setSubject(e.target.value)} placeholder="Subject" className="w-full rounded-2xl border border-white/10 bg-black/30 px-4 py-3 text-sm focus:outline-none" />
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

type ChatMessage = {
  id: number;
  user: string;
  text: string;
  tone: 'win' | 'normal';
  role: 'owner' | 'moderator' | 'user';
  avatarUrl?: string;
  createdAt?: string;
};

type TipDraft = {
  username: string;
  amount: string;
};

type RainDraft = {
  amount: string;
  target: 'main' | 'custom';
};

type CustomRainDraft = {
  amount: string;
};

type TipNotification = {
  id: number;
  senderUsername: string;
  amount: number;
  createdAt: string;
};

type LocalCommandNotification = {
  id: number;
  title: string;
  lines: string[];
  createdAt: string;
};

const CHAT_ROLE_STYLES: Record<ChatMessage['role'], string> = {
  owner: 'text-[#FF9F1C]',
  moderator: 'text-[#00FF88]',
  user: 'text-white',
};

const CHAT_ROLE_ICONS: Partial<Record<ChatMessage['role'], string>> = {
  owner: '/assets/chat-owner.png',
  moderator: '/assets/chat-moderator.png',
};

type RainState = {
  id: number;
  poolAmount: number;
  startsAt: string;
  joinOpensAt: string;
  endsAt: string;
  participantCount: number;
  joined: boolean;
  hasEnded: boolean;
};

type CustomRainState = {
  id: number;
  creatorUsername: string;
  creatorAvatarUrl?: string;
  poolAmount: number;
  endsAt: string;
  participantCount: number;
  joined: boolean;
  hasEnded: boolean;
};

const RightRail = () => {
  const { isAuthenticated, user } = useAuth();
  const { refreshWallet } = useBalance();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [rain, setRain] = useState<RainState | null>(null);
  const [customRain, setCustomRain] = useState<CustomRainState | null>(null);
  const [draft, setDraft] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isJoiningRain, setIsJoiningRain] = useState(false);
  const [roomError, setRoomError] = useState('');
  const [lastSeenRainId, setLastSeenRainId] = useState<number | null>(null);
  const [nowMs, setNowMs] = useState(() => Date.now());
  const [onlineCount, setOnlineCount] = useState(0);
  const chatScrollRef = React.useRef<HTMLDivElement | null>(null);
  const [shouldAutoScroll, setShouldAutoScroll] = useState(true);
  const [tipDraft, setTipDraft] = useState<TipDraft | null>(null);
  const [rainDraft, setRainDraft] = useState<RainDraft | null>(null);
  const [customRainDraft, setCustomRainDraft] = useState<CustomRainDraft | null>(null);
  const [commandNotifications, setCommandNotifications] = useState<LocalCommandNotification[]>([]);

  const loadRoom = async (silent = false) => {
    if (!silent) {
      setIsLoading(true);
    }

    try {
      const token = localStorage.getItem('pasus_auth_token');
      const response = await apiFetch('/api/chat/room', {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      const data = await response.json().catch(() => ({}));

      if (!response.ok) {
        throw new Error(data.error || 'Failed to load room.');
      }

      const nextMessages = Array.isArray(data.messages)
        ? data.messages.map((message: any) => ({
            id: Number(message.id),
            user: String(message.username || 'Guest'),
            text: String(message.text || ''),
            tone: message.tone === 'win' ? 'win' : 'normal',
            role: message.role === 'owner' || message.role === 'moderator' ? message.role : 'user',
            avatarUrl: message.avatarUrl || message.avatar_url || undefined,
            createdAt: message.createdAt || message.created_at,
          }))
        : [];

      const nextRain = data.rain
        ? {
            id: Number(data.rain.id),
            poolAmount: Number(data.rain.poolAmount ?? data.rain.pool_amount ?? 0),
            startsAt: String(data.rain.startsAt || data.rain.starts_at || ''),
            joinOpensAt: String(data.rain.joinOpensAt || data.rain.join_opens_at || ''),
            endsAt: String(data.rain.endsAt || data.rain.ends_at || ''),
            participantCount: Number(data.rain.participantCount ?? data.rain.participant_count ?? 0),
            joined: Boolean(data.rain.joined),
            hasEnded: Boolean(data.rain.hasEnded),
          }
        : null;

      const nextOnlineCount = Number(data.onlineCount || 0);
      const nextCustomRain = data.customRain
        ? {
            id: Number(data.customRain.id),
            creatorUsername: String(data.customRain.creatorUsername || data.customRain.creator_username || ''),
            creatorAvatarUrl: data.customRain.creatorAvatarUrl || data.customRain.creator_avatar_url || undefined,
            poolAmount: Number(data.customRain.poolAmount ?? data.customRain.pool_amount ?? 0),
            endsAt: String(data.customRain.endsAt || data.customRain.ends_at || ''),
            participantCount: Number(data.customRain.participantCount ?? data.customRain.participant_count ?? 0),
            joined: Boolean(data.customRain.joined),
            hasEnded: Boolean(data.customRain.hasEnded),
          }
        : null;

      if (lastSeenRainId && nextRain && nextRain.id !== lastSeenRainId) {
        refreshWallet().catch(() => undefined);
      }

      setMessages(nextMessages);
      setRain(nextRain);
      setCustomRain(nextCustomRain);
      setLastSeenRainId((prev) => prev ?? nextRain?.id ?? null);
      if (nextRain) {
        setLastSeenRainId(nextRain.id);
      }
      setOnlineCount(nextOnlineCount);
      setRoomError('');
    } catch (error) {
      setRoomError(error instanceof Error ? error.message : 'Failed to load room.');
    } finally {
      if (!silent) {
        setIsLoading(false);
      }
    }
  };

  useEffect(() => {
    loadRoom().catch(() => undefined);
  }, []);

  useEffect(() => {
    const timer = window.setInterval(() => {
      setNowMs(Date.now());
    }, 1000);

    return () => window.clearInterval(timer);
  }, []);

  useEffect(() => {
    const timer = window.setInterval(() => {
      loadRoom(true).catch(() => undefined);
    }, 3000);
    return () => window.clearInterval(timer);
  }, [isAuthenticated, lastSeenRainId]);

  useEffect(() => {
    const container = chatScrollRef.current;
    if (!container || !shouldAutoScroll) {
      return;
    }

    container.scrollTop = container.scrollHeight;
  }, [messages, shouldAutoScroll]);

  const submitMessage = async () => {
    if (!draft.trim() || !isAuthenticated) {
      return;
    }

    if (/^\.commands$/i.test(draft.trim())) {
      const commandLines = ['.commands shows this private help card.', '.tip <username> opens the tip modal.', '.rain opens the rain contribution modal.'];
      if (user?.role === 'owner' || user?.role === 'moderator') {
        commandLines.push('Staff: admin panel access, support inbox, wallet tools, and staff chat badge.');
      }
      setCommandNotifications((current) => [
        {
          id: Date.now(),
          title: 'Private Commands',
          lines: commandLines,
          createdAt: new Date().toISOString(),
        },
        ...current,
      ]);
      setDraft('');
      return;
    }

    const tipMatch = draft.trim().match(/^\.tip\s+([A-Za-z0-9_]+)$/i);
    if (tipMatch) {
      setTipDraft({ username: tipMatch[1], amount: '' });
      setDraft('');
      return;
    }

    if (/^\.rain$/i.test(draft.trim())) {
      setCustomRainDraft({ amount: '500' });
      setDraft('');
      return;
    }

    try {
      setIsSubmitting(true);
      const token = localStorage.getItem('pasus_auth_token');
      const response = await apiFetch('/api/chat/messages', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ text: draft.trim() }),
      });
      const data = await response.json().catch(() => ({}));

      if (!response.ok) {
        throw new Error(data.error || 'Failed to send message.');
      }

      setDraft('');
      await loadRoom(true);
    } catch (error) {
      setRoomError(error instanceof Error ? error.message : 'Failed to send message.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const submitTip = async () => {
    if (!tipDraft) {
      return;
    }

    try {
      setIsSubmitting(true);
      const token = localStorage.getItem('pasus_auth_token');
      const response = await apiFetch('/api/chat/tip', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          username: tipDraft.username,
          amount: usdToCoins(Number(tipDraft.amount || 0)),
        }),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(data.error || 'Failed to send tip.');
      }
      setTipDraft(null);
      await refreshWallet();
      await loadRoom(true);
    } catch (error) {
      setRoomError(error instanceof Error ? error.message : 'Failed to send tip.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const submitRain = async () => {
    if (!rainDraft) {
      return;
    }

    try {
      setIsSubmitting(true);
      const token = localStorage.getItem('pasus_auth_token');
      const response = await apiFetch('/api/rain/contribute', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          amount: Math.max(1, Math.round(Number(rainDraft.amount || 0))),
        }),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(data.error || 'Failed to start rain.');
      }
      setRainDraft(null);
      await refreshWallet();
      await loadRoom(true);
    } catch (error) {
      setRoomError(error instanceof Error ? error.message : 'Failed to start rain.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const submitCustomRain = async () => {
    if (!customRainDraft) {
      return;
    }

    try {
      setIsSubmitting(true);
      const token = localStorage.getItem('pasus_auth_token');
      const response = await apiFetch('/api/custom-rain', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          amount: Math.max(1, Math.round(Number(customRainDraft.amount || 0))),
        }),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(data.error || 'Failed to create custom rain.');
      }
      setCustomRainDraft(null);
      await refreshWallet();
      await loadRoom(true);
    } catch (error) {
      setRoomError(error instanceof Error ? error.message : 'Failed to create custom rain.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const joinCustomRain = async () => {
    if (!isAuthenticated || !customRain || customRain.joined || customRain.hasEnded) {
      return;
    }

    try {
      setIsSubmitting(true);
      const token = localStorage.getItem('pasus_auth_token');
      const response = await apiFetch('/api/custom-rain/join', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(data.error || 'Failed to join custom rain.');
      }
      await loadRoom(true);
    } catch (error) {
      setRoomError(error instanceof Error ? error.message : 'Failed to join custom rain.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const tipCustomRain = async () => {
    if (!rainDraft || !customRain) {
      return;
    }

    try {
      setIsSubmitting(true);
      const token = localStorage.getItem('pasus_auth_token');
      const response = await apiFetch('/api/custom-rain/tip', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          amount: Math.max(1, Math.round(Number(rainDraft.amount || 0))),
        }),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(data.error || 'Failed to tip custom rain.');
      }
      setRainDraft(null);
      await refreshWallet();
      await loadRoom(true);
    } catch (error) {
      setRoomError(error instanceof Error ? error.message : 'Failed to tip custom rain.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const joinRain = async () => {
    if (!isAuthenticated || !rain || rain.joined || rain.hasEnded) {
      return;
    }

    try {
      setIsJoiningRain(true);
      const token = localStorage.getItem('pasus_auth_token');
      const response = await apiFetch('/api/rain/join', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
      });
      const data = await response.json().catch(() => ({}));

      if (!response.ok) {
        throw new Error(data.error || 'Failed to join rain.');
      }

      await loadRoom(true);
    } catch (error) {
      setRoomError(error instanceof Error ? error.message : 'Failed to join rain.');
    } finally {
      setIsJoiningRain(false);
    }
  };

  const now = nowMs;
  const joinOpensAt = rain ? new Date(rain.joinOpensAt).getTime() : 0;
  const endsAt = rain ? new Date(rain.endsAt).getTime() : 0;
  const joinWindowOpen = Boolean(rain && now >= joinOpensAt && now < endsAt && !rain.hasEnded);
  const secondsUntilJoin = rain ? Math.max(0, Math.floor((joinOpensAt - now) / 1000)) : 0;
  const secondsUntilEnd = rain ? Math.max(0, Math.floor((endsAt - now) / 1000)) : 0;
  const countdownSource = joinWindowOpen ? secondsUntilEnd : secondsUntilJoin;
  const countdownLabel = `${Math.floor(countdownSource / 60)}:${String(countdownSource % 60).padStart(2, '0')}`;
  const rainButtonLabel = !isAuthenticated
    ? 'Sign In To Join'
    : !rain
      ? 'Loading Rain'
      : rain.joined
        ? 'Joined'
        : joinWindowOpen
          ? 'Join Rain'
          : 'Join Opens Soon';

  return (
    <aside className="hidden xl:flex w-[340px] shrink-0 border-l border-white/5 bg-[linear-gradient(180deg,#171f2b_0%,#142026_100%)] flex-col h-screen sticky top-0 relative overflow-hidden">
      <div className="p-5 border-b border-white/5">
        <div className="rounded-3xl border border-[#00FF88]/15 bg-[linear-gradient(180deg,rgba(0,255,136,0.12),rgba(255,255,255,0.02))] p-5">
          <div className="flex items-center justify-between mb-3">
            <div>
              <div className="text-[10px] uppercase tracking-[0.24em] text-[#00FF88] font-black">Rain Drop</div>
              <div className="text-2xl font-black italic tracking-tight">{formatMoneyFromCoins(rain?.poolAmount || 0)}</div>
            </div>
            <CurrencyIcon className="rounded-full object-cover" size={22} />
          </div>
          <div className="flex items-center justify-between text-xs text-white/50 mb-4">
            <span>{rain?.participantCount || 0} joined</span>
            <span>{joinWindowOpen ? `Ends in ${countdownLabel}` : `Join opens in ${countdownLabel}`}</span>
          </div>
          <button
            onClick={joinRain}
            disabled={!isAuthenticated || !rain || rain.joined || !joinWindowOpen || isJoiningRain}
            className="w-full rounded-2xl bg-[#00FF88] text-black py-3 text-xs font-black uppercase tracking-[0.2em] disabled:opacity-40 disabled:cursor-not-allowed"
          >
            {isJoiningRain ? 'Joining...' : rainButtonLabel}
          </button>
          <button
            onClick={() => setRainDraft({ amount: '100', target: 'main' })}
            disabled={!isAuthenticated || isSubmitting}
            className="mt-2 w-full rounded-2xl bg-white/8 text-white py-3 text-xs font-black uppercase tracking-[0.2em] disabled:opacity-40"
          >
            Tip Rain
          </button>
          <div className="mt-3 text-[11px] text-white/40 leading-relaxed">
            One rain round runs every hour. Players can join only during the final 2 minutes, then the full pot is split evenly across everyone who joined.
          </div>
        </div>
        {customRain ? (
          <div className="mt-3 rounded-2xl border border-sky-400/15 bg-[linear-gradient(180deg,rgba(56,189,248,0.12),rgba(255,255,255,0.02))] p-4">
            <div className="flex items-center justify-between gap-3">
              <div className="min-w-0">
                <div className="text-[10px] uppercase tracking-[0.2em] text-sky-300 font-black">Custom Rain</div>
                <div className="mt-1 text-sm font-black truncate">{customRain.creatorUsername}</div>
              </div>
              <div className="text-right">
                <div className="text-lg font-black text-sky-100">{formatMoneyFromCoins(customRain.poolAmount)}</div>
                <div className="text-[10px] text-white/35">{customRain.participantCount} joined</div>
              </div>
            </div>
            <div className="mt-3 flex gap-2">
              <button
                onClick={joinCustomRain}
                disabled={!isAuthenticated || customRain.joined || customRain.hasEnded || isSubmitting}
                className="flex-1 rounded-xl bg-sky-400 px-3 py-2 text-[10px] font-black uppercase tracking-[0.16em] text-black disabled:opacity-40"
              >
                {customRain.joined ? 'Joined' : 'Join'}
              </button>
              <button
                onClick={() => setRainDraft({ amount: '100', target: 'custom' })}
                disabled={!isAuthenticated || isSubmitting}
                className="flex-1 rounded-xl bg-white/8 px-3 py-2 text-[10px] font-black uppercase tracking-[0.16em] text-white disabled:opacity-40"
              >
                Tip Rain
              </button>
            </div>
            <div className="mt-2 text-[10px] text-white/35">
              Ends in {Math.max(0, Math.floor((new Date(customRain.endsAt).getTime() - nowMs) / 1000))}s
            </div>
          </div>
        ) : null}
      </div>

      <div className="flex-1 flex flex-col min-h-0 overflow-hidden">
        <div className="px-5 py-4 border-b border-white/5 flex items-center justify-between">
          <div>
            <div className="text-sm font-black uppercase tracking-[0.18em]">Chat</div>
            <div className="text-[10px] text-white/30 uppercase tracking-[0.18em]">Live room</div>
          </div>
          <div className="text-[10px] text-white/30 uppercase tracking-[0.18em]">{onlineCount} online</div>
        </div>

        <div
          ref={chatScrollRef}
          onScroll={(e) => {
            const target = e.currentTarget;
            const distanceFromBottom = target.scrollHeight - target.scrollTop - target.clientHeight;
            setShouldAutoScroll(distanceFromBottom < 32);
          }}
          className="flex-1 overflow-y-auto custom-scrollbar px-4 py-4 space-y-3"
        >
          {commandNotifications.map((notification) => (
            <div key={notification.id} className="rounded-2xl border border-sky-400/25 bg-sky-400/10 px-4 py-3">
              <div className="flex items-start justify-between gap-3 mb-2">
                <div>
                  <div className="text-[10px] font-black uppercase tracking-[0.18em] text-sky-200">{notification.title}</div>
                  <div className="text-[10px] text-sky-100/55">
                    {new Date(notification.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </div>
                </div>
                <button
                  onClick={() => setCommandNotifications((current) => current.filter((entry) => entry.id !== notification.id))}
                  className="rounded-full p-1 text-sky-100/70 hover:bg-white/10"
                >
                  <X size={14} />
                </button>
              </div>
              <div className="space-y-1">
                {notification.lines.map((line) => (
                  <div key={line} className="text-xs leading-relaxed text-sky-50/90">
                    {line}
                  </div>
                ))}
              </div>
            </div>
          ))}
          {roomError ? (
            <div className="rounded-2xl border border-red-500/20 bg-red-500/10 px-4 py-3 text-xs text-red-200">
              {roomError}
            </div>
          ) : null}
          {isLoading && messages.length === 0 ? (
            <div className="rounded-2xl border border-white/5 bg-white/[0.03] px-4 py-3 text-xs text-white/40">
              Loading chat room...
            </div>
          ) : null}
          {!isLoading && messages.length === 0 && !roomError ? (
            <div className="rounded-2xl border border-white/5 bg-white/[0.03] px-4 py-3 text-xs text-white/40">
              No chat messages yet.
            </div>
          ) : null}
          {messages.map((message) => {
            const isRainNotice = message.user === 'PasusRain';
            const isTipNotice = !isRainNotice && /tipped/i.test(message.text);

            if (isRainNotice) {
              return (
                <div key={message.id} className="rounded-2xl border border-yellow-400/25 bg-yellow-400/12 px-4 py-3">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-[10px] font-black uppercase tracking-[0.18em] text-yellow-200">Rain Notice</span>
                    <span className="text-[10px] text-yellow-100/60">
                      {message.createdAt ? new Date(message.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'now'}
                    </span>
                  </div>
                  <div className="text-xs leading-relaxed text-yellow-50/90">{message.text}</div>
                </div>
              );
            }

            if (isTipNotice) {
              return (
                <div key={message.id} className="rounded-2xl border border-[#00FF88]/20 bg-[#00FF88]/10 px-4 py-3">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-[10px] font-black uppercase tracking-[0.18em] text-[#00FF88]">Tip Notice</span>
                    <span className="text-[10px] text-white/25">
                      {message.createdAt ? new Date(message.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'now'}
                    </span>
                  </div>
                  <div className="text-xs leading-relaxed text-white/75">{message.text}</div>
                </div>
              );
            }

            return (
              <div key={message.id} className="rounded-2xl border border-white/5 bg-white/[0.03] px-4 py-3">
                <div className="flex items-center justify-between mb-1">
                  <span className="flex items-center gap-2 min-w-0">
                    <div className="w-6 h-6 rounded-full overflow-hidden border border-white/10 bg-white/5 shrink-0">
                      {message.avatarUrl ? (
                        <img
                          src={message.avatarUrl}
                          alt={message.user}
                          className="w-full h-full object-cover"
                        />
                      ) : null}
                    </div>
                    {message.role !== 'user' ? (
                      <img
                        src={CHAT_ROLE_ICONS[message.role]}
                        alt={message.role}
                        className="w-4 h-4 rounded-full object-cover shrink-0"
                      />
                    ) : null}
                    <span className={cn('text-xs font-black truncate', CHAT_ROLE_STYLES[message.role])}>
                      {message.user}
                    </span>
                  </span>
                  <span className="text-[10px] text-white/20">
                    {message.createdAt ? new Date(message.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'now'}
                  </span>
                </div>
                <div className="text-xs text-white/55 leading-relaxed">{message.text}</div>
              </div>
            );
          })}
        </div>

        <div className="p-4 border-t border-white/5">
          <div className="flex items-center gap-2 rounded-2xl border border-white/5 bg-black/30 px-3 py-2">
            <input
              type="text"
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  submitMessage();
                }
              }}
              placeholder={isAuthenticated ? 'Send a message...' : 'Sign in to chat'}
              disabled={!isAuthenticated}
              className="flex-1 bg-transparent text-sm text-white/70 placeholder:text-white/20 focus:outline-none disabled:cursor-not-allowed"
            />
            <button
              onClick={submitMessage}
              disabled={!isAuthenticated || !draft.trim() || isSubmitting}
              className="w-10 h-10 rounded-xl bg-[#00FF88] text-black flex items-center justify-center disabled:opacity-40 disabled:cursor-not-allowed"
            >
              <SendHorizontal size={16} />
            </button>
          </div>
        </div>
      </div>

      <AnimatePresence>
        {tipDraft ? (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-black/70 z-20"
              onClick={() => setTipDraft(null)}
            />
            <motion.div
              initial={{ opacity: 0, y: 10, scale: 0.96 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 10, scale: 0.96 }}
              className="absolute left-4 right-4 top-24 rounded-3xl border border-white/10 bg-[#141821] p-5 z-30 space-y-4 shadow-2xl"
            >
              <div>
                <div className="text-[10px] uppercase tracking-[0.2em] text-[#00FF88] font-black">Tip User</div>
                <div className="text-lg font-black mt-2">Send money to {tipDraft.username}</div>
              </div>
              <input
                type="number"
                value={tipDraft.amount}
                onChange={(e) => setTipDraft((prev) => prev ? { ...prev, amount: e.target.value } : prev)}
                placeholder="Amount"
                className="w-full rounded-2xl border border-white/10 bg-black/30 px-4 py-3 text-sm font-mono focus:outline-none"
              />
              <div className="flex gap-3">
                <button
                  onClick={() => setTipDraft(null)}
                  className="flex-1 rounded-2xl bg-white/5 hover:bg-white/10 px-4 py-3 text-xs font-black uppercase tracking-[0.16em]"
                >
                  Cancel
                </button>
                <button
                  onClick={submitTip}
                  disabled={isSubmitting || !tipDraft.amount || Number(tipDraft.amount) <= 0}
                  className="flex-1 rounded-2xl bg-[#00FF88] text-black px-4 py-3 text-xs font-black uppercase tracking-[0.16em] disabled:opacity-40"
                >
                  {isSubmitting ? 'Sending...' : 'Send Tip'}
                </button>
              </div>
            </motion.div>
          </>
        ) : null}
        {rainDraft ? (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-black/70 z-20"
              onClick={() => setRainDraft(null)}
            />
            <motion.div
              initial={{ opacity: 0, y: 10, scale: 0.96 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 10, scale: 0.96 }}
            className="absolute left-4 right-4 top-24 rounded-3xl border border-white/10 bg-[#141821] p-5 z-30 space-y-4 shadow-2xl"
          >
            <div>
                <div className="text-[10px] uppercase tracking-[0.2em] text-[#00FF88] font-black">{rainDraft.target === 'custom' ? 'Tip Custom Rain' : 'Tip Main Rain'}</div>
                <div className="text-lg font-black mt-2">{rainDraft.target === 'custom' ? 'Add money to the active custom rain' : 'Add money to the active hourly rain pool'}</div>
              </div>
              <input
                type="number"
                value={rainDraft.amount}
                onChange={(e) => setRainDraft((prev) => prev ? { ...prev, amount: e.target.value } : prev)}
                placeholder="Amount in coins"
                className="w-full rounded-2xl border border-white/10 bg-black/30 px-4 py-3 text-sm font-mono focus:outline-none"
              />
              <div className="text-[11px] text-white/40">
                {rainDraft.target === 'custom'
                  ? 'This increases the current custom rain amount immediately. Enter the amount in coins.'
                  : 'This contributes directly to the current hourly rain pool. Enter the amount in coins.'}
              </div>
              <div className="flex gap-3">
                <button
                  onClick={() => setRainDraft(null)}
                  className="flex-1 rounded-2xl bg-white/5 hover:bg-white/10 px-4 py-3 text-xs font-black uppercase tracking-[0.16em]"
                >
                  Cancel
                </button>
                <button
                  onClick={rainDraft.target === 'custom' ? tipCustomRain : submitRain}
                  disabled={isSubmitting || !rainDraft.amount || Number(rainDraft.amount) <= 0}
                  className="flex-1 rounded-2xl bg-[#00FF88] text-black px-4 py-3 text-xs font-black uppercase tracking-[0.16em] disabled:opacity-40"
                >
                  {isSubmitting ? 'Sending...' : 'Tip Rain'}
                </button>
              </div>
            </motion.div>
          </>
        ) : null}
        {customRainDraft ? (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-black/70 z-20"
              onClick={() => setCustomRainDraft(null)}
            />
            <motion.div
              initial={{ opacity: 0, y: 10, scale: 0.96 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 10, scale: 0.96 }}
              className="absolute left-4 right-4 top-24 rounded-3xl border border-white/10 bg-[#141821] p-5 z-30 space-y-4 shadow-2xl"
            >
              <div>
                <div className="text-[10px] uppercase tracking-[0.2em] text-[#00FF88] font-black">Custom Rain</div>
                <div className="text-lg font-black mt-2">Create a smaller custom rain</div>
              </div>
              <input
                type="number"
                value={customRainDraft.amount}
                onChange={(e) => setCustomRainDraft((prev) => prev ? { ...prev, amount: e.target.value } : prev)}
                placeholder="Amount in coins"
                className="w-full rounded-2xl border border-white/10 bg-black/30 px-4 py-3 text-sm font-mono focus:outline-none"
              />
              <div className="text-[11px] text-white/40">
                This creates a 5-minute custom rain card under the main rain with your username and amount. Enter the amount in coins.
              </div>
              <div className="flex gap-3">
                <button
                  onClick={() => setCustomRainDraft(null)}
                  className="flex-1 rounded-2xl bg-white/5 hover:bg-white/10 px-4 py-3 text-xs font-black uppercase tracking-[0.16em]"
                >
                  Cancel
                </button>
                <button
                  onClick={submitCustomRain}
                  disabled={isSubmitting || !customRainDraft.amount || Number(customRainDraft.amount) <= 0}
                  className="flex-1 rounded-2xl bg-[#00FF88] text-black px-4 py-3 text-xs font-black uppercase tracking-[0.16em] disabled:opacity-40"
                >
                  {isSubmitting ? 'Creating...' : 'Create Rain'}
                </button>
              </div>
            </motion.div>
          </>
        ) : null}
      </AnimatePresence>
    </aside>
  );
};

const AppContent = () => {
  consumeRedirectedPath();
  const initialRoute = resolveRoute(window.location.pathname);
  const [activeGame, setActiveGame] = useState<string | null>(initialRoute.gameId);
  const [isWalletOpen, setIsWalletOpen] = useState(false);
  const [isLoginOpen, setIsLoginOpen] = useState(false);
  const [currentView, setCurrentView] = useState<MainView>(initialRoute.view);
  const { isAuthenticated } = useAuth();

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
                {CurrentGame && <CurrentGame />}
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
                    { heading: 'Eligibility', body: 'You must meet the legal age and jurisdictional requirements that apply where you access Pasus. You are responsible for ensuring your use is lawful in your location.' },
                    { heading: 'Accounts', body: 'Each user is responsible for maintaining the confidentiality of their login credentials and all activity performed through their account.' },
                    { heading: 'Gameplay And Balances', body: 'All wallet balances, promotional rewards, rakeback claims, and affiliate earnings are subject to review if abuse, fraud, or system manipulation is detected.' },
                  ]}
                />
              </motion.div>
            ) : currentView === 'privacy' ? (
              <motion.div key="privacy" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}>
                <LegalPage
                  eyebrow="Legal"
                  title="Privacy Policy"
                  sections={[
                    { heading: 'Information We Store', body: 'Pasus stores account credentials, wallet and transaction records, support tickets, linked account metadata, and gameplay activity required to operate the service.' },
                    { heading: 'How Data Is Used', body: 'We use stored data to authenticate users, maintain balances, provide support, prevent fraud, and improve product features.' },
                    { heading: 'Third-Party Services', body: 'Payment providers, OAuth providers, hosting services, and analytics tools may process limited data required for their functions.' },
                  ]}
                />
              </motion.div>
            ) : currentView === 'responsible-gaming' ? (
              <motion.div key="responsible-gaming" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}>
                <LegalPage
                  eyebrow="Safety"
                  title="Responsible Gaming"
                  sections={[
                    { heading: 'Stay In Control', body: 'Gambling should remain entertainment. Never wager funds you cannot afford to lose and take regular breaks during play.' },
                    { heading: 'Warning Signs', body: 'Chasing losses, hiding gambling activity, or spending more time and money than intended are signs that intervention may be needed.' },
                    { heading: 'Support', body: 'If you or someone you know needs help, provide self-exclusion tools, cooldown periods, spend limits, and direct links to professional gambling support resources.' },
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
                <Dashboard onSelectGame={handleSelectGame} />
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
            </div>
          </footer>
        </main>
      </div>

      <RightRail />

      <AnimatePresence>
        {isWalletOpen && (
          <WalletModal isOpen={isWalletOpen} onClose={() => setIsWalletOpen(false)} />
        )}
        {isLoginOpen && (
          <LoginModal isOpen={isLoginOpen} onClose={() => setIsLoginOpen(false)} />
        )}
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
