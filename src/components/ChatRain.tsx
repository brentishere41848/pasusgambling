import React, { useEffect, useRef, useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { useBalance } from '../context/BalanceContext';
import { useAuth } from '../context/AuthContext';
import { cn } from '../lib/utils';
import { apiFetch } from '../lib/api';
import { Droplets, ChevronDown, Crown, ShieldCheck, X, Users } from 'lucide-react';

type ChatMessage = {
  id: number;
  username: string;
  text: string;
  tone: string;
  role: string;
  avatarUrl?: string;
  createdAt: string;
};

type RainRound = {
  id: number;
  poolAmount: number;
  startsAt: string;
  joinOpensAt: string;
  endsAt: string;
  participantCount: number;
  joined: boolean;
  hasEnded: boolean;
};

type CustomRain = {
  id: number;
  creatorUsername: string;
  creatorAvatarUrl?: string;
  poolAmount: number;
  endsAt: string;
  participantCount: number;
  joined: boolean;
  hasEnded: boolean;
};

type Broadcast = {
  id: number;
  message: string;
  createdAt: string;
  expiresAt?: string;
  isActive: boolean;
};

type TipNotification = {
  id: number;
  senderUsername: string;
  amount: number;
  createdAt: string;
};

type ChatRoomResponse = {
  messages: ChatMessage[];
  rain: RainRound | null;
  customRain: CustomRain | null;
  tipNotifications: TipNotification[];
  onlineCount: number;
  broadcasts: Broadcast[];
};

function formatMoney(coins: number) {
  return `$${(coins / 100).toFixed(2)}`;
}

function formatTimeLeft(ms: number): string {
  if (ms <= 0) return '0:00';
  const totalSec = Math.floor(ms / 1000);
  const min = Math.floor(totalSec / 60);
  const sec = totalSec % 60;
  return `${min}:${String(sec).padStart(2, '0')}`;
}

export const ChatRain: React.FC<{
  isMobileOpen?: boolean;
  onCloseMobile?: () => void;
}> = ({ isMobileOpen, onCloseMobile }) => {
  const { refreshWallet } = useBalance();
  const { user, isAuthenticated } = useAuth();

  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [rain, setRain] = useState<RainRound | null>(null);
  const [customRain, setCustomRain] = useState<CustomRain | null>(null);
  const [broadcasts, setBroadcasts] = useState<Broadcast[]>([]);
  const [tipNotifications, setTipNotifications] = useState<TipNotification[]>([]);
  const [onlineCount, setOnlineCount] = useState(0);
  const [dismissedBroadcasts, setDismissedBroadcasts] = useState<Set<number>>(new Set());
  const [dismissedTips, setDismissedTips] = useState<Set<number>>(new Set());

  const [draft, setDraft] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(true);

  const [rainDraft, setRainDraft] = useState<{ amount: string; target: 'main' | 'custom' } | null>(null);
  const [customRainDraft, setCustomRainDraft] = useState<{ amount: string } | null>(null);
  const [tipDraft, setTipDraft] = useState<{ username: string; amount: string } | null>(null);
  const [showTipPanel, setShowTipPanel] = useState(false);

  const [nowMs, setNowMs] = useState(Date.now());
  const [shouldAutoScroll, setShouldAutoScroll] = useState(true);
  const chatScrollRef = useRef<HTMLDivElement>(null);

  const loadRoom = useCallback(async (silent = false) => {
    if (!silent) setIsLoading(true);
    try {
      const res = await apiFetch('/api/chat/room');
      if (!res.ok) throw new Error('Failed to load room');

      const data: ChatRoomResponse = await res.json();

      if (Array.isArray(data.messages)) {
        setMessages(data.messages.map((m) => ({
          id: Number(m.id),
          username: String(m.username || ''),
          text: String(m.text || ''),
          tone: String(m.tone || 'normal'),
          role: String(m.role || 'user'),
          avatarUrl: m.avatarUrl,
          createdAt: String(m.createdAt || ''),
        })));
      }

      setOnlineCount(Number(data.onlineCount ?? 0));

      if (data.rain) {
        setRain(data.rain);
      }

      if (data.customRain !== undefined) {
        setCustomRain(data.customRain);
      }

      if (Array.isArray(data.broadcasts)) {
        setBroadcasts(data.broadcasts.map((b) => ({
          id: Number(b.id),
          message: String(b.message || ''),
          createdAt: b.createdAt || '',
          expiresAt: b.expiresAt,
          isActive: Boolean(b.isActive),
        })));
      }

      if (Array.isArray(data.tipNotifications)) {
        setTipNotifications(data.tipNotifications.filter(
          (t) => !dismissedTips.has(t.id)
        ));
      }
    } catch {
      // silent
    } finally {
      if (!silent) setIsLoading(false);
    }
  }, [dismissedTips]);

  useEffect(() => {
    loadRoom();
  }, [loadRoom]);

  useEffect(() => {
    const poll = setInterval(() => loadRoom(true), 3000);
    return () => clearInterval(poll);
  }, [loadRoom]);

  useEffect(() => {
    const ticker = setInterval(() => setNowMs(Date.now()), 1000);
    return () => clearInterval(ticker);
  }, []);

  useEffect(() => {
    if (shouldAutoScroll && chatScrollRef.current) {
      chatScrollRef.current.scrollTop = chatScrollRef.current.scrollHeight;
    }
  }, [messages, shouldAutoScroll]);

  const token = localStorage.getItem('pasus_auth_token');

  const submitMessage = async () => {
    if (!draft.trim() || !isAuthenticated || isSubmitting) return;

    const text = draft.trim();

    if (text.match(/^\/commands$/i) || text.match(/^\/help$/i)) {
      const lines = [
        '/tip <user> - open tip modal',
        '/rain - open create custom rain modal',
      ];
      if (user?.role === 'owner' || user?.role === 'moderator') {
        lines.push('Staff: /admin, /support, /wallet, /staff');
      }
      setDraft('');
      return;
    }

    const tipMatch = text.match(/^\/tip\s+([A-Za-z0-9_]+)$/i);
    if (tipMatch) {
      setTipDraft({ username: tipMatch[1], amount: '' });
      setDraft('');
      return;
    }

    if (text.match(/^\/rain$/i)) {
      setCustomRainDraft({ amount: '5' });
      setDraft('');
      return;
    }

    setIsSubmitting(true);
    setError('');
    try {
      const res = await apiFetch('/api/chat/messages', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ text }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || 'Failed to send message.');
      setDraft('');
      await loadRoom(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to send');
    } finally {
      setIsSubmitting(false);
    }
  };

  const submitTip = async () => {
    if (!tipDraft || !tipDraft.username || !tipDraft.amount || isSubmitting) return;
    const amount = Math.max(1, Math.round(Number(tipDraft.amount) * 100));
    setIsSubmitting(true);
    setError('');
    try {
      const res = await apiFetch('/api/chat/tip', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ username: tipDraft.username, amount }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || 'Failed to send tip.');
      setTipDraft(null);
      await refreshWallet();
      await loadRoom(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to send tip');
    } finally {
      setIsSubmitting(false);
    }
  };

  const submitRainTip = async () => {
    if (!rainDraft || !rainDraft.amount || isSubmitting) return;
    const amount = Math.max(1, Math.round(Number(rainDraft.amount) * 100));
    setIsSubmitting(true);
    setError('');
    try {
      const res = await apiFetch('/api/rain/contribute', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ amount }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || 'Failed to tip rain.');
      if (data.rain) setRain(data.rain);
      setRainDraft(null);
      await refreshWallet();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to tip rain');
    } finally {
      setIsSubmitting(false);
    }
  };

  const submitCustomRainTip = async () => {
    if (!rainDraft || !rainDraft.amount || isSubmitting) return;
    const amount = Math.max(1, Math.round(Number(rainDraft.amount) * 100));
    setIsSubmitting(true);
    setError('');
    try {
      const res = await apiFetch('/api/custom-rain/tip', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ amount }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || 'Failed to tip custom rain.');
      if (data.customRain) setCustomRain(data.customRain);
      setRainDraft(null);
      await refreshWallet();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to tip custom rain');
    } finally {
      setIsSubmitting(false);
    }
  };

  const submitCustomRain = async () => {
    if (!customRainDraft || !customRainDraft.amount || isSubmitting) return;
    const amount = Math.max(1, Math.round(Number(customRainDraft.amount) * 100));
    setIsSubmitting(true);
    setError('');
    try {
      const res = await apiFetch('/api/custom-rain', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ amount }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || 'Failed to create rain.');
      if (data.customRain) setCustomRain(data.customRain);
      setCustomRainDraft(null);
      await refreshWallet();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create rain');
    } finally {
      setIsSubmitting(false);
    }
  };

  const joinHourlyRain = async () => {
    if (!isAuthenticated || isSubmitting) return;
    setIsSubmitting(true);
    setError('');
    try {
      const res = await apiFetch('/api/rain/join', {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || 'Failed to join rain.');
      if (data.rain) setRain(data.rain);
      await loadRoom(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to join rain');
    } finally {
      setIsSubmitting(false);
    }
  };

  const joinCustomRain = async () => {
    if (!isAuthenticated || !customRain || customRain.joined || isSubmitting) return;
    setIsSubmitting(true);
    setError('');
    try {
      const res = await apiFetch('/api/custom-rain/join', {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || 'Failed to join rain.');
      if (data.customRain) setCustomRain(data.customRain);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to join rain');
    } finally {
      setIsSubmitting(false);
    }
  };

  const now = nowMs;
  const joinOpensAt = rain ? new Date(rain.joinOpensAt).getTime() : 0;
  const endsAt = rain ? new Date(rain.endsAt).getTime() : 0;
  const joinOpen = Boolean(rain && now >= joinOpensAt && now < endsAt && !rain.hasEnded);
  const secsUntilJoin = rain ? Math.max(0, Math.floor((joinOpensAt - now) / 1000)) : 0;
  const secsUntilEnd = rain ? Math.max(0, Math.floor((endsAt - now) / 1000)) : 0;
  const rainCountdown = joinOpen ? secsUntilEnd : secsUntilJoin;
  const rainCountdownLabel = `${Math.floor(rainCountdown / 60)}:${String(rainCountdown % 60).padStart(2, '0')}`;

  const customRainMs = customRain ? Math.max(0, new Date(customRain.endsAt).getTime() - now) : 0;

  const activeBroadcasts = broadcasts.filter(
    (b) => !dismissedBroadcasts.has(b.id) && (b.isActive || user?.role === 'owner' || user?.role === 'moderator')
  );

  const roleColor = (role: string) =>
    role === 'owner' ? 'text-yellow-400' : role === 'moderator' ? 'text-sky-400' : 'text-white/70';

  const roleBadge = (role: string) => {
    if (role === 'owner') return <span className="text-[8px] font-black uppercase tracking-[0.15em] text-yellow-400 flex items-center gap-0.5"><Crown size={8} /> Owner</span>;
    if (role === 'moderator') return <span className="text-[8px] font-black uppercase tracking-[0.15em] text-sky-400 flex items-center gap-0.5"><ShieldCheck size={8} /> Mod</span>;
    return null;
  };

  return (
    <>
      <AnimatePresence>
        {isMobileOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/70 backdrop-blur-sm z-40 xl:hidden"
            onClick={onCloseMobile}
          />
        )}
      </AnimatePresence>

      <aside className={cn(
        'w-[340px] shrink-0 border-l border-white/5 bg-[linear-gradient(180deg,#171f2b_0%,#142026_100%)] flex-col h-screen sticky top-0 relative overflow-hidden xl:flex',
        isMobileOpen ? 'fixed right-0 top-0 bottom-0 z-50 xl:hidden flex' : 'hidden xl:flex'
      )}>
        <div className="flex items-center justify-between xl:hidden px-4 py-3 border-b border-white/5">
          <span className="text-sm font-black uppercase tracking-widest text-white/60">Chat & Rain</span>
          <button onClick={onCloseMobile} className="p-2 hover:bg-white/5 rounded-xl transition-colors">
            <ChevronDown size={18} className="text-white/40" />
          </button>
        </div>

        {/* Tip Notifications */}
        {tipNotifications.length > 0 && (
          <div className="px-4 pt-4 pb-2 space-y-2">
            {tipNotifications.map((tip) => (
              <div key={tip.id} className="rounded-xl border border-[#d9bb63]/25 bg-[#d9bb63]/8 px-3 py-2 flex items-center justify-between">
                <div>
                  <div className="text-[10px] text-[#d9bb63]/80 font-black uppercase tracking-wider">Tip Received</div>
                  <div className="text-xs font-black text-white/80">{tip.senderUsername} sent you {formatMoney(tip.amount)}</div>
                </div>
                <button
                  onClick={() => {
                    setDismissedTips((prev) => new Set([...prev, tip.id]));
                    setTipNotifications((prev) => prev.filter((t) => t.id !== tip.id));
                  }}
                  className="p-1 text-white/30 hover:text-white/60"
                >
                  <X size={12} />
                </button>
              </div>
            ))}
          </div>
        )}

        {/* Rain Cards */}
        <div className="p-4 space-y-3 border-b border-white/5">
          {/* Hourly Rain */}
          <div className="rounded-2xl border border-[#00FF88]/15 bg-[linear-gradient(180deg,rgba(0,255,136,0.08),rgba(255,255,255,0.02))] p-4">
            <div className="flex items-center justify-between mb-2">
              <div className="text-[9px] uppercase tracking-[0.25em] text-[#00FF88] font-black">Hourly Rain</div>
              <Droplets size={16} className="text-[#00FF88]/50" />
            </div>
            <div className="flex items-center justify-between">
              <div className="text-2xl font-black tracking-tight">{formatMoney(rain?.poolAmount || 0)}</div>
              <div className="text-right">
                <div className="text-[10px] text-white/30">{rain?.participantCount || 0} joined</div>
                <div className="text-[10px] text-white/40">{joinOpen ? `Ends ${rainCountdownLabel}` : `Opens ${rainCountdownLabel}`}</div>
              </div>
            </div>
            <button
              onClick={joinHourlyRain}
              disabled={!isAuthenticated || !rain || rain.joined || !joinOpen || isSubmitting}
              className="mt-3 w-full rounded-xl bg-[#00FF88] text-black py-2.5 text-[10px] font-black uppercase tracking-[0.2em] disabled:opacity-40"
            >
              {!isAuthenticated ? 'Sign In' : !rain ? 'Loading...' : rain.joined ? 'Joined' : joinOpen ? 'Join Rain' : 'Opens Soon'}
            </button>
            <button
              onClick={() => setRainDraft({ amount: '5', target: 'main' })}
              disabled={!isAuthenticated || isSubmitting}
              className="mt-2 w-full rounded-xl bg-white/8 text-white/70 py-2 text-[10px] font-black uppercase tracking-[0.2em] disabled:opacity-40"
            >
              Tip Rain
            </button>
            <div className="mt-2 text-[9px] text-white/30 leading-relaxed">
              Join during the last 2 minutes. Pot splits evenly.
            </div>
          </div>

          {/* Custom Rain */}
          {customRain ? (
            <div className="rounded-2xl border border-sky-400/15 bg-[linear-gradient(180deg,rgba(56,189,248,0.08),rgba(255,255,255,0.02))] p-4">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-[9px] uppercase tracking-[0.2em] text-sky-300 font-black">Custom Rain</div>
                  <div className="text-sm font-black mt-0.5 text-white/80">{customRain.creatorUsername}</div>
                </div>
                <div className="text-right">
                  <div className="text-lg font-black text-white">{formatMoney(customRain.poolAmount)}</div>
                  <div className="text-[10px] text-white/30">{customRain.participantCount} joined</div>
                </div>
              </div>
              <div className="mt-3 text-[10px] text-white/35 mb-2">Ends in {formatTimeLeft(customRainMs)}</div>
              <div className="flex gap-2">
                <button
                  onClick={joinCustomRain}
                  disabled={!isAuthenticated || customRain.joined || customRain.hasEnded || isSubmitting}
                  className="flex-1 rounded-xl bg-sky-400 text-black py-2 text-[10px] font-black uppercase tracking-[0.15em] disabled:opacity-40"
                >
                  {customRain.joined ? 'Joined' : 'Join'}
                </button>
                <button
                  onClick={() => setRainDraft({ amount: '5', target: 'custom' })}
                  disabled={!isAuthenticated || isSubmitting}
                  className="flex-1 rounded-xl bg-white/8 text-white/70 py-2 text-[10px] font-black uppercase tracking-[0.15em] disabled:opacity-40"
                >
                  Tip
                </button>
              </div>
            </div>
          ) : (
            <button
              onClick={() => setCustomRainDraft({ amount: '5' })}
              disabled={!isAuthenticated || isSubmitting}
              className="w-full rounded-2xl border border-dashed border-white/10 bg-white/[0.02] py-3 text-[10px] text-white/30 font-black uppercase tracking-[0.2em] hover:bg-white/[0.04] transition-colors disabled:opacity-40"
            >
              + Create Custom Rain
            </button>
          )}
        </div>

        {/* Chat */}
        <div className="flex-1 flex flex-col min-h-0 overflow-hidden">
          <div className="px-4 py-3 border-b border-white/5 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="text-sm font-black uppercase tracking-[0.15em]">Chat</div>
              <div className="flex items-center gap-1 text-[10px] text-white/25">
                <Users size={10} />
                <span>{onlineCount} online</span>
              </div>
            </div>
            <button
              onClick={() => setShowTipPanel(!showTipPanel)}
              className="text-[10px] text-white/30 hover:text-white/60 uppercase tracking-wider"
            >
              {showTipPanel ? 'Hide Tips' : 'Show Tips'}
            </button>
          </div>

          {/* Broadcasts */}
          {activeBroadcasts.length > 0 && (
            <div className="px-4 py-3 border-b border-white/5 space-y-2">
              {activeBroadcasts.map((b) => (
                <div key={b.id} className={cn(
                  'rounded-xl px-3 py-2 text-xs border',
                  b.isActive ? 'border-amber-500/20 bg-amber-500/8' : 'border-red-500/20 bg-red-500/8'
                )}>
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 text-white/80 whitespace-pre-wrap">{b.message}</div>
                    <button
                      onClick={() => setDismissedBroadcasts((p) => new Set([...p, b.id]))}
                      className="shrink-0 p-0.5 text-white/30 hover:text-white/60"
                    >
                      <X size={12} />
                    </button>
                  </div>
                  {!b.isActive && <div className="text-[9px] text-red-400 mt-1 font-black">INACTIVE</div>}
                </div>
              ))}
            </div>
          )}

          {/* Tip Panel */}
          {showTipPanel && (
            <div className="px-4 py-2 border-b border-white/5 bg-white/[0.02]">
              <div className="text-[9px] uppercase tracking-[0.2em] text-[#d9bb63]/60 font-black mb-2">Your Tip Summary</div>
              <div className="text-[10px] text-white/40">
                Use <span className="text-white/60 font-mono">/tip username</span> in chat to tip any user.
              </div>
            </div>
          )}

          {/* Error */}
          {error && (
            <div className="mx-4 mt-2 rounded-xl border border-red-500/20 bg-red-500/8 px-3 py-2 text-[10px] text-red-200">
              {error}
            </div>
          )}

          {/* Messages */}
          <div
            ref={chatScrollRef}
            onScroll={(e) => {
              const target = e.currentTarget;
              const dist = target.scrollHeight - target.scrollTop - target.clientHeight;
              setShouldAutoScroll(dist < 32);
            }}
            className="flex-1 overflow-y-auto custom-scrollbar px-4 py-3 space-y-3"
          >
            {isLoading && messages.length === 0 && (
              <div className="text-center text-[11px] text-white/30 py-8">Loading...</div>
            )}
            {!isLoading && messages.length === 0 && (
              <div className="text-center text-[11px] text-white/30 py-8">No messages yet. Be the first!</div>
            )}
            {messages.map((msg) => (
              <div key={msg.id} className="flex gap-2 items-start">
                {msg.avatarUrl ? (
                  <img src={msg.avatarUrl} alt="" className="w-7 h-7 rounded-full object-cover mt-0.5 shrink-0" />
                ) : (
                  <div className="w-7 h-7 rounded-full bg-gradient-to-br from-[#2a3a5a] to-[#1a2540] flex items-center justify-center text-[10px] font-black text-white/50 shrink-0 mt-0.5">
                    {msg.username.charAt(0).toUpperCase()}
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5 flex-wrap">
                    {roleBadge(msg.role)}
                  </div>
                  <div className="flex items-center gap-1.5 mt-0.5">
                    <span className={cn('text-[11px] font-black', roleColor(msg.role))}>
                      {msg.username}
                    </span>
                    <span className="text-[9px] text-white/20">
                      {new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>
                  <div className={cn(
                    'text-[11px] leading-relaxed break-words',
                    msg.tone === 'win' ? 'text-[#00FF88]/90 font-medium' : 'text-white/75'
                  )}>
                    {msg.text}
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Input */}
          <div className="p-3 border-t border-white/5">
            {tipDraft ? (
              <motion.div
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                className="flex gap-2 items-center rounded-xl border border-[#d9bb63]/20 bg-[#d9bb63]/8 px-3 py-2"
              >
                <div className="flex-1">
                  <div className="text-[9px] text-[#d9bb63]/70 font-black uppercase tracking-widest">Tip {tipDraft.username}</div>
                  <input
                    type="number"
                    value={tipDraft.amount}
                    onChange={(e) => setTipDraft((p) => p ? { ...p, amount: e.target.value } : p)}
                    placeholder="0.00"
                    className="w-full bg-transparent text-sm text-white font-mono focus:outline-none mt-0.5"
                  />
                </div>
                <button onClick={submitTip} disabled={isSubmitting || !tipDraft.amount} className="rounded-lg bg-[#d9bb63] text-black px-3 py-1.5 text-[10px] font-black uppercase shrink-0 disabled:opacity-40">
                  Send
                </button>
                <button onClick={() => setTipDraft(null)} className="p-1 text-white/30 hover:text-white/60 shrink-0">
                  <X size={14} />
                </button>
              </motion.div>
            ) : isAuthenticated ? (
              <div className="flex gap-2">
                <input
                  type="text"
                  value={draft}
                  onChange={(e) => setDraft(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') { e.preventDefault(); submitMessage(); }
                    if (e.key === 'Escape') setDraft('');
                  }}
                  placeholder="Type a message..."
                  className="flex-1 bg-black/40 border border-white/8 rounded-xl px-3 py-2 text-[11px] text-white placeholder:text-white/20 focus:outline-none focus:border-white/20"
                />
                <button
                  onClick={submitMessage}
                  disabled={isSubmitting || !draft.trim()}
                  className="rounded-xl bg-white/10 hover:bg-white/15 px-3 py-2 text-[10px] text-white/60 font-black uppercase tracking-wider disabled:opacity-30"
                >
                  Send
                </button>
              </div>
            ) : (
              <div className="text-center text-[10px] text-white/25 py-1">Sign in to chat</div>
            )}
          </div>
        </div>

        {/* Modals */}
        <AnimatePresence>
          {rainDraft && (
            <>
              <motion.div
                initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                className="absolute inset-0 bg-black/70 z-20"
                onClick={() => setRainDraft(null)}
              />
              <motion.div
                initial={{ opacity: 0, y: 10, scale: 0.96 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: 10, scale: 0.96 }}
                className="absolute left-4 right-4 top-24 rounded-2xl border border-white/10 bg-[#141821] p-5 z-30 space-y-3 shadow-2xl"
              >
                <div className="text-[10px] uppercase tracking-[0.2em] text-[#00FF88] font-black">
                  {rainDraft.target === 'custom' ? 'Tip Custom Rain' : 'Tip Rain Pool'}
                </div>
                <div className="text-base font-black">
                  {rainDraft.target === 'custom' ? 'Add to custom rain' : 'Add to hourly rain pool'}
                </div>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-white/40 text-base font-bold">$</span>
                  <input
                    type="number"
                    value={rainDraft.amount}
                    onChange={(e) => setRainDraft((p) => p ? { ...p, amount: e.target.value } : p)}
                    placeholder="0.00"
                    className="w-full rounded-xl border border-white/10 bg-black/30 pl-7 pr-3 py-2.5 text-base font-mono text-white focus:outline-none"
                  />
                </div>
                <div className="text-[10px] text-white/35">100 coins = $1.00</div>
                <div className="flex gap-2">
                  <button onClick={() => setRainDraft(null)} className="flex-1 rounded-xl bg-white/5 py-2.5 text-[10px] font-black uppercase tracking-wider">
                    Cancel
                  </button>
                  <button
                    onClick={rainDraft.target === 'custom' ? submitCustomRainTip : submitRainTip}
                    disabled={isSubmitting || !rainDraft.amount || Number(rainDraft.amount) <= 0}
                    className="flex-1 rounded-xl bg-[#00FF88] text-black py-2.5 text-[10px] font-black uppercase tracking-wider disabled:opacity-40"
                  >
                    {isSubmitting ? 'Sending...' : `Tip $${rainDraft.amount || '0'}`}
                  </button>
                </div>
              </motion.div>
            </>
          )}
          {customRainDraft && (
            <>
              <motion.div
                initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                className="absolute inset-0 bg-black/70 z-20"
                onClick={() => setCustomRainDraft(null)}
              />
              <motion.div
                initial={{ opacity: 0, y: 10, scale: 0.96 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: 10, scale: 0.96 }}
                className="absolute left-4 right-4 top-24 rounded-2xl border border-white/10 bg-[#141821] p-5 z-30 space-y-3 shadow-2xl"
              >
                <div className="text-[10px] uppercase tracking-[0.2em] text-[#00FF88] font-black">Custom Rain</div>
                <div className="text-base font-black">Create a custom rain</div>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-white/40 text-base font-bold">$</span>
                  <input
                    type="number"
                    value={customRainDraft.amount}
                    onChange={(e) => setCustomRainDraft((p) => p ? { ...p, amount: e.target.value } : p)}
                    placeholder="0.00"
                    className="w-full rounded-xl border border-white/10 bg-black/30 pl-7 pr-3 py-2.5 text-base font-mono text-white focus:outline-none"
                  />
                </div>
                <div className="text-[10px] text-white/35">5-minute rain. Your username shown. Pot splits evenly.</div>
                <div className="flex gap-2">
                  <button onClick={() => setCustomRainDraft(null)} className="flex-1 rounded-xl bg-white/5 py-2.5 text-[10px] font-black uppercase tracking-wider">
                    Cancel
                  </button>
                  <button
                    onClick={submitCustomRain}
                    disabled={isSubmitting || !customRainDraft.amount || Number(customRainDraft.amount) <= 0}
                    className="flex-1 rounded-xl bg-[#00FF88] text-black py-2.5 text-[10px] font-black uppercase tracking-wider disabled:opacity-40"
                  >
                    {isSubmitting ? 'Creating...' : 'Create'}
                  </button>
                </div>
              </motion.div>
            </>
          )}
        </AnimatePresence>
      </aside>
    </>
  );
};
