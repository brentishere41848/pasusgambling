import React, { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { X, Trophy, TrendingUp, Clock, Calendar, Crown, ShieldCheck, Star } from 'lucide-react';
import { apiFetch } from '../lib/api';
import { cn } from '../lib/utils';

function formatMoney(coins: number) {
  return `$${(coins / 100).toFixed(2)}`;
}

export const ProfilePage: React.FC<{ username: string; onClose: () => void }> = ({ username, onClose }) => {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    apiFetch(`/api/profile/${encodeURIComponent(username)}`)
      .then(r => r.json())
      .then(d => { setData(d); setLoading(false); })
      .catch(() => { setError('Failed to load profile'); setLoading(false); });
  }, [username]);

  const roleColor = (role: string) =>
    role === 'owner' ? 'text-yellow-400' : role === 'moderator' ? 'text-sky-400' : 'text-white/60';

  const roleIcon = (role: string) => {
    if (role === 'owner') return <><Crown size={12} className="inline mr-0.5" /> Owner</>;
    if (role === 'moderator') return <><ShieldCheck size={12} className="inline mr-0.5" /> Mod</>;
    return null;
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="absolute inset-0 bg-black/70" onClick={onClose} />
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        className="relative w-full max-w-lg max-h-[85vh] bg-[#141821] border border-white/10 rounded-3xl overflow-hidden flex flex-col"
      >
        <div className="relative">
          <div className="h-24 bg-gradient-to-br from-[#00FF88]/20 via-[#1a2540] to-[#2a3a5a]" />
          <button onClick={onClose} className="absolute top-4 right-4 p-2 rounded-xl bg-black/40 hover:bg-black/60 text-white/60 hover:text-white">
            <X size={18} />
          </button>
        </div>

        <div className="px-6 pb-4 -mt-10">
          <div className="flex items-end gap-4">
            <div className="w-20 h-20 rounded-2xl border-4 border-[#141821] bg-gradient-to-br from-[#2a3a5a] to-[#1a2540] flex items-center justify-center text-2xl font-black text-white/70 overflow-hidden shrink-0">
              {data?.profile?.avatarUrl ? (
                <img src={data.profile.avatarUrl} alt="" className="w-full h-full object-cover" />
              ) : (
                data?.profile?.username?.charAt(0)?.toUpperCase() || '?'
              )}
            </div>
            <div className="pb-1">
              <div className="flex items-center gap-2">
                <h2 className="text-xl font-black">{data?.profile?.username || username}</h2>
                {data?.profile?.role && data.profile.role !== 'user' && (
                  <span className={`text-[10px] font-black uppercase tracking-wider ${roleColor(data.profile.role)}`}>
                    {roleIcon(data.profile.role)}
                  </span>
                )}
              </div>
              {data?.profile?.streak > 0 && (
                <div className="text-xs text-white/30 mt-0.5">{data.profile.streak} day streak</div>
              )}
            </div>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto custom-scrollbar px-6 pb-6 space-y-4">
          {loading ? (
            <div className="text-center text-white/30 py-8">Loading...</div>
          ) : error ? (
            <div className="text-center text-red-400 py-8">{error}</div>
          ) : (
            <>
              {data?.stats && (
                <div className="grid grid-cols-2 gap-2">
                  {[
                    { label: 'Total Bets', value: data.stats.totalBets, icon: Star },
                    { label: 'Win Rate', value: `${data.stats.winRate}%`, icon: Trophy },
                    { label: 'Total Wagered', value: formatMoney(data.stats.totalWagered), icon: TrendingUp },
                    { label: 'Biggest Win', value: formatMoney(data.stats.biggestWin), icon: Trophy },
                    { label: 'Net Profit', value: formatMoney(data.stats.totalPayout - data.stats.totalWagered), icon: data.stats.totalPayout - data.stats.totalWagered >= 0 ? TrendingUp : TrendingUp, color: data.stats.totalPayout - data.stats.totalWagered >= 0 ? 'text-[#00FF88]' : 'text-red-400' },
                  ].map((stat) => (
                    <div key={stat.label} className="rounded-xl border border-white/5 bg-white/[0.03] p-3">
                      <div className="flex items-center gap-1 text-[10px] text-white/30 uppercase tracking-wider mb-1">
                        <stat.icon size={10} /> {stat.label}
                      </div>
                      <div className={cn('text-base font-black', (stat as any).color || 'text-white')}>
                        {stat.value}
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {data?.profile?.joinedAt && (
                <div className="flex items-center gap-2 text-[11px] text-white/30">
                  <Calendar size={12} />
                  Joined {new Date(data.profile.joinedAt).toLocaleDateString('en-US', { year: 'numeric', month: 'long' })}
                </div>
              )}

              {data?.recentBets?.length > 0 && (
                <div>
                  <div className="text-[10px] uppercase tracking-widest text-white/30 font-black mb-2">Recent Bets</div>
                  <div className="space-y-1">
                    {data.recentBets.map((bet: any, i: number) => (
                      <div key={i} className="flex items-center justify-between rounded-xl border border-white/5 bg-white/[0.02] px-3 py-2">
                        <div>
                          <span className="text-xs font-black capitalize">{bet.game}</span>
                          <span className="text-[10px] text-white/30 ml-2">{bet.multiplier.toFixed(2)}x</span>
                        </div>
                        <div className="text-right">
                          <div className="text-xs font-mono text-white/60">{formatMoney(bet.wager)}</div>
                          <div className={cn('text-[10px] font-mono font-black', bet.payout > bet.wager ? 'text-[#00FF88]' : 'text-red-400')}>
                            {bet.payout > bet.wager ? '+' : ''}{formatMoney(bet.payout - bet.wager)}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </motion.div>
    </div>
  );
};
