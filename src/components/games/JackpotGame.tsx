import React, { useEffect, useState, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Gift, Users, Clock, DollarSign, TrendingUp } from 'lucide-react';
import { apiFetch } from '../../lib/api';
import { useBalance } from '../../context/BalanceContext';
import { useAuth } from '../../context/AuthContext';
import { cn } from '../../lib/utils';
import { logBetActivity } from '../../lib/activity';
import { GameStatsBar, useLocalGameStats } from './GameHooks';

function formatMoney(coins: number) {
  return `$${(coins / 100).toFixed(2)}`;
}

export const JackpotGame: React.FC = () => {
  const { balance, addBalance, subtractBalance, refreshWallet } = useBalance();
  const { user } = useAuth();
  const [amount, setAmount] = useState('1');
  const [round, setRound] = useState<any>(null);
  const [error, setError] = useState('');
  const [joining, setJoining] = useState(false);
  const [spinning, setSpinning] = useState(false);
  const [showResult, setShowResult] = useState<any>(null);
  const pollRef = useRef<number | null>(null);
  const [userTickets, setUserTickets] = useState(0);
  const [totalTickets, setTotalTickets] = useState(0);
  const { getStats, recordBet } = useLocalGameStats('jackpot');
  const stats = getStats();

  const loadRound = async (silent = false) => {
    if (!silent) setError('');
    try {
      const res = await apiFetch('/api/jackpot/current').then(r => r.json());
      if (res.round) {
        setRound(res.round);
        setTotalTickets(res.round.participants.reduce((s: number, p: any) => s + p.tickets, 0));
        const myPart = res.round.participants.find((p: any) => p.userId === user?.id);
        setUserTickets(myPart?.tickets || 0);
      }
    } catch { /* silent */ }
  };

  useEffect(() => {
    loadRound();
    pollRef.current = window.setInterval(() => loadRound(true), 3000);
    return () => { if (pollRef.current) clearInterval(pollRef.current); };
  }, [user]);

  const join = async () => {
    if (!user || joining) return;
    const amt = Math.max(100, Math.round(Number(amount) * 100));
    if (amt > balance) { setError('Insufficient balance'); return; }
    if (!subtractBalance(amt)) { setError('Insufficient balance'); return; }
    setJoining(true);
    try {
      const res = await apiFetch('/api/jackpot/join', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${localStorage.getItem('pasus_auth_token')}` },
        body: JSON.stringify({ amount: amt }),
      }).then(r => r.json());
      if (res.error) { setError(res.error); addBalance(amt); }
      else {
        recordBet(amt, 0, false);
        await loadRound(true);
        await refreshWallet();
      }
    } catch (e: any) { setError(e.message || 'Failed to join'); addBalance(amt); }
    finally { setJoining(false); }
  };

  const now = Date.now();
  const endsAt = round ? new Date(round.endsAt).getTime() : 0;
  const timeLeft = round ? Math.max(0, Math.floor((endsAt - now) / 1000)) : 0;
  const minLabel = `${Math.floor(timeLeft / 60)}:${String(timeLeft % 60).padStart(2, '0')}`;

  return (
    <div className="max-w-2xl mx-auto p-4 space-y-6">
      <div className="text-center">
        <div className="flex items-center justify-center gap-3 mb-2">
          <Gift size={28} className="text-amber-400" />
          <h1 className="text-3xl font-black uppercase tracking-wider">Jackpot</h1>
        </div>
        <p className="text-sm text-white/40">Everyone deposits funds. One random winner takes the pot!</p>
      </div>

      {/* Pool */}
      <div className="rounded-3xl border border-amber-500/15 bg-gradient-to-br from-amber-500/10 to-transparent p-6 text-center">
        <div className="text-[10px] uppercase tracking-[0.3em] text-amber-400/60 font-black mb-2">Total Pot</div>
        <div className="text-5xl font-black text-white tracking-tight">{formatMoney(round?.totalPool || 0)}</div>
        <div className="flex items-center justify-center gap-2 mt-3">
          <Users size={14} className="text-white/30" />
          <span className="text-sm text-white/40">{round?.participants?.length || 0} players</span>
          <span className="text-white/20">•</span>
          <Clock size={14} className="text-white/30" />
          <span className="text-sm text-white/40">{timeLeft > 0 ? `Ends in ${minLabel}` : 'Drawing...'}</span>
        </div>
      </div>

      {/* Bet */}
      <div className="bg-[#111] border border-white/10 rounded-2xl p-5 space-y-4">
        <div>
          <label className="text-xs uppercase tracking-widest text-white/40 mb-2 block">Your Bet</label>
          <div className="relative">
            <span className="absolute left-4 top-1/2 -translate-y-1/2 text-white/40 font-bold text-lg">$</span>
            <input
              type="number"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              min="0.01"
              step="0.01"
              className="w-full bg-black/40 border border-white/10 rounded-xl pl-8 pr-4 py-3 text-xl font-mono text-white focus:outline-none focus:border-amber-500/30"
            />
          </div>
          <div className="text-[10px] text-white/25 mt-1">Min bet: $0.01</div>
        </div>

        <div className="grid grid-cols-4 gap-1">
          {[1, 5, 10, 25].map(p => (
            <button
              key={p}
              onClick={() => setAmount(String(p))}
              className="py-2 bg-white/5 hover:bg-white/10 rounded-xl text-[10px] font-black text-white/50"
            >
              ${p}
            </button>
          ))}
        </div>

        {userTickets > 0 && (
          <div className="rounded-xl border border-[#00FF88]/15 bg-[#00FF88]/5 px-4 py-2 flex items-center justify-between">
            <span className="text-xs text-white/50">Your tickets</span>
            <span className="text-sm font-black text-[#00FF88]">{userTickets}</span>
          </div>
        )}

        {error && (
          <div className="rounded-xl border border-red-500/20 bg-red-500/5 px-3 py-2 text-xs text-red-300">{error}</div>
        )}

        <GameStatsBar stats={[
          { label: 'Rounds', value: stats.totalBets.toString() },
          { label: 'Wins', value: stats.totalWins.toString() },
          { label: 'Biggest', value: formatMoney(stats.biggestWin) },
          { label: 'Wagered', value: formatMoney(stats.totalWagered) },
        ]} />

        <button
          onClick={join}
          disabled={!user || joining || timeLeft <= 0}
          className="w-full rounded-2xl bg-amber-400 hover:bg-amber-300 text-black py-4 text-sm font-black uppercase tracking-[0.2em] disabled:opacity-40 transition-all"
        >
          {!user ? 'Sign In to Play' : joining ? 'Joining...' : `Enter with ${formatMoney(Math.round(Number(amount || 0) * 100))}`}
        </button>
      </div>

      {/* Participants */}
      <div>
        <div className="text-xs uppercase tracking-widest text-white/30 font-black mb-3 flex items-center gap-2">
          <Users size={12} /> Players ({round?.participants?.length || 0})
        </div>
        <div className="space-y-2">
          {(round?.participants || []).map((p: any, i: number) => (
            <div key={i} className="flex items-center gap-3 rounded-xl border border-white/5 bg-white/[0.02] px-4 py-3">
              <div className="w-8 h-8 rounded-full bg-gradient-to-br from-[#2a3a5a] to-[#1a2540] flex items-center justify-center text-xs font-black text-white/50 shrink-0">
                {p.username.charAt(0).toUpperCase()}
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-xs font-black truncate">{p.username}</div>
                <div className="text-[10px] text-white/30">{p.tickets} tickets</div>
              </div>
              <div className="text-right">
                <div className="text-sm font-black">{formatMoney(p.amount)}</div>
                <div className="text-[9px] text-white/20">
                  {totalTickets > 0 ? `${((p.tickets / totalTickets) * 100).toFixed(1)}%` : '0%'} chance
                </div>
              </div>
            </div>
          ))}
          {(!round?.participants || round.participants.length === 0) && (
            <div className="text-center text-white/25 text-xs py-6 rounded-xl border border-dashed border-white/5">
              No players yet. Be the first!
            </div>
          )}
        </div>
      </div>

      {/* How it works */}
      <div className="rounded-2xl border border-white/5 bg-white/[0.02] p-4 space-y-2">
        <div className="text-[10px] uppercase tracking-widest text-white/30 font-black">How it works</div>
        <div className="text-[11px] text-white/40 space-y-1">
          <p>1. Enter any amount (min $1.00). Each $1.00 = 1 ticket.</p>
          <p>2. More tickets = higher chance to win.</p>
          <p>3. When the timer runs out, a random winner is selected.</p>
          <p>4. The winner gets the entire pot instantly!</p>
        </div>
      </div>
    </div>
  );
};
