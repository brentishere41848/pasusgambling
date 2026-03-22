import React, { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { X, Trophy, Star, Target, Zap, Flame, Wallet, CreditCard, MessageCircle, Heart, CloudRain, TrendingUp, Calendar, Shield, Compass, Award } from 'lucide-react';
import { apiFetch } from '../lib/api';

const ICON_MAP: Record<string, React.FC<{ size?: number; className?: string }>> = {
  star: Star, target: Target, zap: Zap, flame: Flame,
  wallet: Wallet, 'credit-card': CreditCard, 'message-circle': MessageCircle,
  'message-square': MessageCircle, heart: Heart, 'cloud-rain': CloudRain,
  'trending-up': TrendingUp, fish: TrendingUp, calendar: Calendar,
  'calendar-check': Calendar, shield: Shield, compass: Compass,
  trophy: Trophy, award: Award, crown: Award,
};

const CATEGORY_LABELS: Record<string, string> = {
  general: 'General', wins: 'Wins', deposits: 'Deposits',
  social: 'Social', special: 'Special', streaks: 'Streaks', vip: 'VIP',
};

function formatMoney(coins: number) {
  return `$${(coins / 100).toFixed(2)}`;
}

export const AchievementsPanel: React.FC<{ onClose: () => void }> = ({ onClose }) => {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [activeCategory, setActiveCategory] = useState('all');

  useEffect(() => {
    apiFetch('/api/achievements').then(r => r.json()).then(d => { setData(d); setLoading(false); });
  }, []);

  const categories = ['all', 'general', 'wins', 'deposits', 'social', 'special', 'streaks', 'vip'];
  const earned = data?.achievements?.filter((a: any) => a.earned).length || 0;
  const total = data?.achievements?.length || 0;
  const filtered = activeCategory === 'all' ? data?.achievements : data?.achievements?.filter((a: any) => a.category === activeCategory);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="absolute inset-0 bg-black/70" onClick={onClose} />
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 10 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95 }}
        className="relative w-full max-w-lg max-h-[80vh] bg-[#141821] border border-white/10 rounded-3xl p-6 flex flex-col"
      >
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <Trophy size={20} className="text-amber-400" />
            <h2 className="text-lg font-black uppercase tracking-wider">Achievements</h2>
            <span className="text-xs text-white/40 font-bold">{earned}/{total}</span>
          </div>
          <button onClick={onClose} className="p-2 rounded-xl hover:bg-white/5 text-white/40 hover:text-white">
            <X size={18} />
          </button>
        </div>

        {data?.stats && (
          <div className="grid grid-cols-4 gap-2 mb-4">
            {[
              { label: 'Bets', value: data.stats.totalBets },
              { label: 'Wins', value: data.stats.totalWins },
              { label: 'Wagered', value: formatMoney(data.stats.totalWagered) },
              { label: 'Biggest', value: formatMoney(data.stats.biggestWin) },
            ].map((stat) => (
              <div key={stat.label} className="rounded-xl border border-white/5 bg-white/[0.03] px-2 py-2 text-center">
                <div className="text-[10px] text-white/30 uppercase tracking-wider">{stat.label}</div>
                <div className="text-xs font-black text-white mt-0.5 truncate">{stat.value}</div>
              </div>
            ))}
          </div>
        )}

        <div className="flex gap-1 flex-wrap mb-3">
          {categories.map((cat) => (
            <button
              key={cat}
              onClick={() => setActiveCategory(cat)}
              className={`px-3 py-1 rounded-lg text-[10px] font-black uppercase tracking-wider transition-all ${
                activeCategory === cat ? 'bg-[#00FF88] text-black' : 'bg-white/5 text-white/40 hover:bg-white/10'
              }`}
            >
              {CATEGORY_LABELS[cat] || cat}
            </button>
          ))}
        </div>

        <div className="flex-1 overflow-y-auto custom-scrollbar space-y-2 min-h-0">
          {loading ? (
            <div className="text-center text-white/30 text-sm py-8">Loading...</div>
          ) : filtered?.length === 0 ? (
            <div className="text-center text-white/30 text-sm py-8">No achievements in this category</div>
          ) : filtered?.map((ach: any) => {
            const IconComponent = ICON_MAP[ach.icon] || Star;
            return (
              <div key={ach.id} className={`rounded-xl border p-3 flex items-center gap-3 transition-all ${
                ach.earned ? 'border-[#00FF88]/20 bg-[#00FF88]/5' : 'border-white/5 bg-white/[0.02] opacity-60'
              }`}>
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${
                  ach.earned ? 'bg-[#00FF88]/15 text-[#00FF88]' : 'bg-white/5 text-white/30'
                }`}>
                  <IconComponent size={18} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className={`text-xs font-black ${ach.earned ? 'text-white' : 'text-white/50'}`}>{ach.name}</div>
                  <div className="text-[10px] text-white/35 mt-0.5">{ach.description}</div>
                  {ach.earned ? (
                    <div className="text-[9px] text-[#00FF88]/60 mt-1">
                      {ach.coinReward > 0 && `+${formatMoney(ach.coinReward)} `}
                      {ach.xpReward > 0 && `+${ach.xpReward} XP`}
                      {ach.earnedAt && ` - ${new Date(ach.earnedAt).toLocaleDateString()}`}
                    </div>
                  ) : (
                    <div className="text-[9px] text-white/20 mt-1">
                      {ach.coinReward > 0 && `Reward: ${formatMoney(ach.coinReward)} `}
                      {ach.xpReward > 0 && `+${ach.xpReward} XP`}
                    </div>
                  )}
                </div>
                {ach.earned && (
                  <div className="text-[#00FF88] text-sm">✓</div>
                )}
              </div>
            );
          })}
        </div>
      </motion.div>
    </div>
  );
};
