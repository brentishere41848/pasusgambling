/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  TrendingUp, 
  Grid3X3, 
  CircleDot, 
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
  Search,
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
  LogIn,
  UserPlus,
  LogOut,
  Mail,
  Lock,
  Gift,
  SendHorizontal
} from 'lucide-react';
import { BalanceProvider, useBalance } from './context/BalanceContext';
import { useAuth } from './context/AuthContext';
import { CrashGame } from './components/games/CrashGame';
import { MinesGame } from './components/games/MinesGame';
import { PlinkoGame } from './components/games/PlinkoGame';
import { DiceGame } from './components/games/DiceGame';
import { BlackjackGame } from './components/games/BlackjackGame';
import { RouletteGame } from './components/games/RouletteGame';
import { WheelGame } from './components/games/WheelGame';
import { cn } from './lib/utils';

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
    id: 'plinko',
    name: 'Plinko',
    description: 'Drop the ball and watch it bounce into multipliers.',
    icon: CircleDot,
    color: 'text-pink-400',
    bg: 'bg-pink-400/10',
    component: PlinkoGame,
    featured: false,
    image: 'https://picsum.photos/seed/casino-plinko/800/600'
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
    id: 'roulette',
    name: 'Roulette',
    description: 'Spin the wheel and bet on your lucky numbers.',
    icon: Disc,
    color: 'text-red-400',
    bg: 'bg-red-400/10',
    component: RouletteGame,
    featured: false,
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
  }
];

type MainView = 'dashboard' | 'profile' | 'settings' | 'vip' | 'affiliate' | 'provably-fair' | 'support';

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
  const [isOriginalsExpanded, setIsOriginalsExpanded] = useState(false);

  return (
    <aside className="w-64 border-r border-white/5 bg-[#0f1115] h-screen sticky top-0 hidden lg:flex flex-col p-4 overflow-y-auto custom-scrollbar">
      <button onClick={onHome} className="flex items-center gap-3 px-4 mb-8 group shrink-0">
        <div className="w-8 h-8 bg-[#00FF88] rounded-lg flex items-center justify-center rotate-3 group-hover:rotate-12 transition-transform">
          <Gamepad2 className="text-black" size={20} />
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
  const { balance, totalDeposited, refreshWallet, coinsToUsd } = useBalance();
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
        const response = await fetch(`/api/payments/transactions/${depositTransaction.id}`, {
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

    if (activeTab === 'withdraw') {
      if (!withdrawAddress.trim()) {
        setError('Please enter a withdrawal address.');
        return;
      }

      if (totalDeposited < 500) {
        setError('You must deposit at least 500 coins before withdrawing.');
        return;
      }

      if (val < 250) {
        setError('Minimum withdrawal is 250 coins.');
        return;
      }
    }

    setIsProcessing(true);

    try {
      if (activeTab === 'deposit') {
        const response = await fetch('/api/payments/nowpayments/create', {
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
        const response = await fetch('/api/payments/withdrawals/request', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            amount: Math.round(val),
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
              {activeTab === 'deposit' ? 'Deposit Amount (USD)' : 'Withdraw Amount (Coins)'}
            </label>
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
                  {activeTab === 'deposit' ? `${Math.round((parseFloat(amount) || 0) * 50)} coins` : `$${coinsToUsd(parseFloat(amount) || 0).toFixed(2)}`}
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
              <div className="font-mono font-bold text-[#00FF88]">{balance.toLocaleString()} COINS</div>
              <div className="text-[10px] text-white/20 font-bold">~ ${coinsToUsd(balance).toFixed(2)}</div>
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
  const [isRegister, setIsRegister] = useState(false);
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!isOpen) return null;

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
        await register(username.trim(), email.trim(), password);
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

const Header = ({ onOpenWallet, onOpenLogin, onOpenProfile, onOpenSettings }: { onOpenWallet: () => void, onOpenLogin: () => void, onOpenProfile: () => void, onOpenSettings: () => void }) => {
  const { balance, coinsToUsd } = useBalance();
  const { user, logout, isAuthenticated } = useAuth();
  const [showUserMenu, setShowUserMenu] = useState(false);
  
  return (
    <header className="h-16 border-b border-white/5 bg-[#0f1115]/80 backdrop-blur-xl sticky top-0 z-50">
      <div className="max-w-full h-full px-6 flex items-center justify-between">
        <div className="flex items-center gap-4 lg:hidden">
          <Menu className="text-white/40" />
          <span className="text-xl font-black italic">PASUS</span>
        </div>

        <div className="flex-1 max-w-xl mx-auto hidden md:flex items-center bg-black/40 border border-white/5 rounded-full px-4 py-1.5 gap-3">
          <Search size={16} className="text-white/20" />
          <input 
            type="text" 
            placeholder="Search games..." 
            className="bg-transparent border-none focus:outline-none text-sm w-full text-white/60"
          />
        </div>

        <div className="flex items-center gap-4">
          {isAuthenticated ? (
            <>
              <div className="group relative bg-[#1a1d23] border border-white/10 rounded-full pl-4 pr-1 py-1 flex items-center gap-3">
                <div className="flex flex-col items-end">
                  <span className="font-mono font-bold text-sm text-[#00FF88]">{balance.toLocaleString()}</span>
                  <div className="absolute top-full right-0 mt-2 bg-black border border-white/10 rounded-lg px-3 py-1.5 text-[10px] font-bold text-white/60 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap z-50 shadow-2xl">
                    ≈ ${coinsToUsd(balance).toFixed(2)} {user?.currency}
                  </div>
                </div>
                <button 
                  onClick={onOpenWallet}
                  className="bg-[#00FF88] text-black text-[10px] font-black px-4 py-2 rounded-full hover:bg-[#00FF88]/90 transition-colors"
                >
                  WALLET
                </button>
              </div>

              <div className="relative">
                <button 
                  onClick={() => setShowUserMenu(!showUserMenu)}
                  className="w-10 h-10 rounded-full border border-white/10 overflow-hidden hover:border-[#00FF88]/50 transition-all"
                >
                  <img src={user?.avatar} alt="Avatar" className="w-full h-full object-cover" />
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
                              onOpenSettings();
                              setShowUserMenu(false);
                            }}
                            className="w-full flex items-center gap-3 px-3 py-2 rounded-xl text-xs font-bold text-white/60 hover:text-white hover:bg-white/5 transition-all"
                          >
                            <Settings size={14} /> Settings
                          </button>
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

    const loadActivity = async () => {
      setIsLoading(true);
      try {
        const response = await fetch(`/api/activity/bets?tab=${activeTab}&limit=5`);
        const data = await response.json().catch(() => ({}));
        if (!response.ok || !isMounted) {
          return;
        }
        setActivities(data.activities || []);
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    };

    loadActivity();
    const interval = window.setInterval(loadActivity, 10000);

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
          Recent Activity
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
                    <td className="px-6 py-4 font-mono">{activity.wager.toLocaleString()}</td>
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
                        {activity.payout.toLocaleString()}
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

      {/* Recent Activity Section */}
      <RecentActivity />
    </div>
  );
};

const ProfileView = () => {
  const { user, setUser, refreshUser } = useAuth();
  const { balance, coinsToUsd } = useBalance();
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

    fetch('/api/roblox/link/status', {
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

      const response = await fetch('/api/roblox/link/start', {
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

      const response = await fetch('/api/roblox/link/verify', {
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
          <img src={user?.avatar} alt="Avatar" className="w-full h-full rounded-full object-cover" />
        </div>
        <div className="flex-1 text-center md:text-left relative z-10">
          <h2 className="text-4xl font-black italic uppercase tracking-tighter mb-2">{user?.username}</h2>
          <div className="text-white/40 font-bold text-sm mb-6">{user?.email}</div>
          <div className="flex flex-wrap justify-center md:justify-start gap-4">
            <div className="bg-black/40 border border-white/5 rounded-2xl px-6 py-3">
              <div className="text-[10px] font-black uppercase tracking-widest text-white/20 mb-1">Total Balance</div>
              <div className="font-mono font-bold text-[#00FF88] text-xl">{balance.toLocaleString()} COINS</div>
              <div className="text-[10px] text-white/20 font-bold">≈ ${coinsToUsd(balance).toFixed(2)}</div>
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
              { label: 'Total Wagered', value: '45,200 Coins' },
              { label: 'Total Won', value: '48,150 Coins' },
              { label: 'Net Profit', value: '+2,950 Coins', color: 'text-[#00FF88]' },
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

const SettingsView = () => {
  const { user, updateCurrency } = useAuth();
  const currencies = ['USD', 'EUR', 'GBP', 'JPY', 'CAD'];
  
  return (
    <div className="p-6 lg:p-10 max-w-2xl mx-auto space-y-10">
      <div className="space-y-2">
        <h2 className="text-3xl font-black italic uppercase tracking-tighter">Settings</h2>
        <p className="text-white/40 text-sm font-medium">Manage your account preferences and currency</p>
      </div>

      <div className="bg-[#1a1d23] border border-white/10 rounded-3xl p-8 space-y-8">
        <div className="space-y-4">
          <label className="text-[10px] font-black uppercase tracking-[0.2em] text-white/20 ml-2">Display Currency</label>
          <div className="grid grid-cols-3 gap-3">
            {currencies.map(curr => (
              <button
                key={curr}
                onClick={() => updateCurrency(curr)}
                className={cn(
                  "py-4 rounded-2xl border font-bold text-sm transition-all",
                  user?.currency === curr 
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
      </div>
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

type ChatMessage = {
  id: number;
  user: string;
  text: string;
  tone: 'win' | 'normal';
  role: 'owner' | 'moderator' | 'user';
  avatarUrl?: string;
  createdAt?: string;
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

const RightRail = () => {
  const { isAuthenticated, user } = useAuth();
  const { refreshWallet } = useBalance();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [rain, setRain] = useState<RainState | null>(null);
  const [draft, setDraft] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isJoiningRain, setIsJoiningRain] = useState(false);
  const [roomError, setRoomError] = useState('');
  const [lastSeenRainId, setLastSeenRainId] = useState<number | null>(null);
  const [nowMs, setNowMs] = useState(() => Date.now());

  const loadRoom = async (silent = false) => {
    if (!silent) {
      setIsLoading(true);
    }

    try {
      const token = localStorage.getItem('pasus_auth_token');
      const response = await fetch('/api/chat/room', {
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

      if (lastSeenRainId && nextRain && nextRain.id !== lastSeenRainId) {
        refreshWallet().catch(() => undefined);
      }

      setMessages(nextMessages);
      setRain(nextRain);
      setLastSeenRainId((prev) => prev ?? nextRain?.id ?? null);
      if (nextRain) {
        setLastSeenRainId(nextRain.id);
      }
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
    }, 10000);
    return () => window.clearInterval(timer);
  }, [isAuthenticated, lastSeenRainId]);

  const submitMessage = async () => {
    if (!draft.trim() || !isAuthenticated) {
      return;
    }

    try {
      setIsSubmitting(true);
      const token = localStorage.getItem('pasus_auth_token');
      const response = await fetch('/api/chat/messages', {
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

  const joinRain = async () => {
    if (!isAuthenticated || !rain || rain.joined || rain.hasEnded) {
      return;
    }

    try {
      setIsJoiningRain(true);
      const token = localStorage.getItem('pasus_auth_token');
      const response = await fetch('/api/rain/join', {
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
    <aside className="hidden xl:flex w-[340px] shrink-0 border-l border-white/5 bg-[#0f1115] flex-col h-screen sticky top-0">
      <div className="p-5 border-b border-white/5">
        <div className="rounded-3xl border border-[#00FF88]/15 bg-[linear-gradient(180deg,rgba(0,255,136,0.12),rgba(255,255,255,0.02))] p-5">
          <div className="flex items-center justify-between mb-3">
            <div>
              <div className="text-[10px] uppercase tracking-[0.24em] text-[#00FF88] font-black">Rain Drop</div>
              <div className="text-2xl font-black italic tracking-tight">{rain?.poolAmount.toLocaleString() || '0'} Coins</div>
            </div>
            <Gift className="text-[#00FF88]" size={22} />
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
          <div className="mt-3 text-[11px] text-white/40 leading-relaxed">
            One rain round runs every hour. Players can join only during the final 2 minutes, then the full pot is split evenly across everyone who joined.
          </div>
        </div>
      </div>

      <div className="flex-1 flex flex-col min-h-0 overflow-hidden">
        <div className="px-5 py-4 border-b border-white/5 flex items-center justify-between">
          <div>
            <div className="text-sm font-black uppercase tracking-[0.18em]">Chat</div>
            <div className="text-[10px] text-white/30 uppercase tracking-[0.18em]">Live room</div>
          </div>
          <div className="text-[10px] text-white/30 uppercase tracking-[0.18em]">{Math.max(24, (rain?.participantCount || 0) + 21)} online</div>
        </div>

        <div className="flex-1 overflow-y-auto custom-scrollbar px-4 py-4 space-y-3">
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
              {messages.map((message) => (
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
          ))}
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
    </aside>
  );
};

const AppContent = () => {
  const [activeGame, setActiveGame] = useState<string | null>(null);
  const [isWalletOpen, setIsWalletOpen] = useState(false);
  const [isLoginOpen, setIsLoginOpen] = useState(false);
  const [currentView, setCurrentView] = useState<MainView>('dashboard');
  const { isAuthenticated } = useAuth();

  const handleSelectGame = (id: string) => {
    if (!isAuthenticated) {
      setIsLoginOpen(true);
      return;
    }
    setActiveGame(id);
    setCurrentView('dashboard');
  };

  const CurrentGame = activeGame ? GAMES.find(g => g.id === activeGame)?.component : null;

  return (
    <div className="flex min-h-screen bg-[#0a0c10] text-white font-sans selection:bg-[#00FF88] selection:text-black">
      <Sidebar 
        activeGame={activeGame} 
        currentView={currentView}
        onSelectGame={handleSelectGame} 
        onHome={() => {
          setActiveGame(null);
          setCurrentView('dashboard');
        }}
        onOpenView={(view) => {
          setActiveGame(null);
          setCurrentView(view);
        }}
      />
      
      <div className="flex-1 flex flex-col min-w-0">
        <Header 
          onOpenWallet={() => setIsWalletOpen(true)} 
          onOpenLogin={() => setIsLoginOpen(true)}
          onOpenProfile={() => {
            setActiveGame(null);
            setCurrentView('profile');
          }}
          onOpenSettings={() => {
            setActiveGame(null);
            setCurrentView('settings');
          }}
        />
        
        <main className="flex-1 overflow-y-auto custom-scrollbar">
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
                      onClick={() => setActiveGame(null)}
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
            ) : currentView === 'vip' ? (
              <motion.div
                key="vip"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
              >
                <InfoView
                  eyebrow="Loyalty"
                  title="VIP Club"
                  description="Track your level, unlock rakeback-style rewards, and surface premium benefits for active Pasus players."
                  cards={[
                    { title: 'Level Progression', body: 'Tiered rewards, weekly bonuses, and milestone drops can be surfaced here once you finalize your loyalty math.', icon: Star },
                    { title: 'Exclusive Perks', body: 'VIP hosts, higher rain eligibility, private tournaments, and cashback campaigns can live in this section.', icon: Shield },
                  ]}
                />
              </motion.div>
            ) : currentView === 'affiliate' ? (
              <motion.div
                key="affiliate"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
              >
                <InfoView
                  eyebrow="Growth"
                  title="Affiliate"
                  description="Use this page for referral links, commission tracking, and promoter analytics once you wire real affiliate data."
                  cards={[
                    { title: 'Referral Overview', body: 'Show clicks, signups, active players, and net gaming revenue contribution by campaign.', icon: Users },
                    { title: 'Commission Payouts', body: 'Track pending affiliate earnings, payout thresholds, and historical commission withdrawals.', icon: Coins },
                  ]}
                />
              </motion.div>
            ) : currentView === 'provably-fair' ? (
              <motion.div
                key="provably-fair"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
              >
                <InfoView
                  eyebrow="Trust"
                  title="Provably Fair"
                  description="This page is where you explain seeds, hashes, nonces, and post-round verification once each game exposes verifiable fairness data."
                  cards={[
                    { title: 'Seed Verification', body: 'Display server seed hash, client seed controls, and nonce progression so players can verify outcomes.', icon: ShieldCheck },
                    { title: 'Round History', body: 'Let players inspect past rounds, compare generated results, and audit the fairness chain per game.', icon: Search },
                  ]}
                />
              </motion.div>
            ) : currentView === 'support' ? (
              <motion.div
                key="support"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
              >
                <InfoView
                  eyebrow="Help"
                  title="Live Support"
                  description="Use this view for support entry points, account issue triage, payment escalation, and moderation contacts."
                  cards={[
                    { title: 'Support Channels', body: 'Embed live chat, Discord, Telegram, or ticketing links here so players can reach your team fast.', icon: MessageSquare },
                    { title: 'Payment Help', body: 'Handle stuck deposits, withdrawal reviews, KYC document requests, and wallet troubleshooting in one place.', icon: Wallet },
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
                  <div className="w-6 h-6 bg-white rounded flex items-center justify-center">
                    <Gamepad2 className="text-black" size={14} />
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
                <div>Terms of Service</div>
                <div>Privacy Policy</div>
                <div>Responsible Gaming</div>
              </div>
              <div className="text-xs space-y-2">
                <div className="font-black uppercase tracking-widest mb-4">Social</div>
                <div>Twitter / X</div>
                <div>Discord</div>
                <div>Telegram</div>
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
      <div className="fixed inset-0 pointer-events-none opacity-[0.03] z-[-1]" style={{ backgroundImage: 'url("https://www.transparenttextures.com/patterns/carbon-fibre.png")' }} />
    </div>
  );
};

export default function App() {
  return (
    <AppContent />
  );
}
