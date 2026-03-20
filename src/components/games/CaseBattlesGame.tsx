import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Bot, Crown, LoaderCircle, Sparkles, Swords, Users } from 'lucide-react';
import { motion } from 'motion/react';
import { apiFetch } from '../../lib/api';
import { useAuth } from '../../context/AuthContext';
import { useBalance } from '../../context/BalanceContext';
import { cn } from '../../lib/utils';

type CaseDefinition = {
  id: string;
  name: string;
  price: number;
  image: string;
  accent: string;
  items: Array<{
    id: string;
    name: string;
    value: number;
    image: string;
    rarity: string;
  }>;
};

type BattleFormat = {
  key: string;
  label: string;
  slots: number;
  teamLabels: string[];
};

type BattlePayload = {
  battle: {
    id: number;
    formatKey: string;
    modeLabel: string;
    status: 'waiting' | 'rolling' | 'completed';
    freeToJoin: boolean;
    totalSlots: number;
    openSlots: number[];
    creatorUserId: number;
    seatCost: number;
    totalPot: number;
    createdAt: string;
    startedAt: string | null;
    completedAt: string | null;
    revealMs: number;
    serverSeedHash: string;
    publicSeed: string;
    serverSeed: string | null;
    winningTeamIndexes: number[];
    winningScore: number;
    standings: Array<{
      teamIndex: number;
      totalValue: number;
      players: number[];
    }>;
    cases: Array<{
      id: string;
      name: string;
      image: string;
      price: number;
      accent: string;
    }>;
  };
  players: Array<{
    playerId: number;
    userId: number | null;
    username: string;
    avatarUrl: string | null;
    isBot: boolean;
    slotIndex: number;
    teamIndex: number;
    paidAmount: number;
    joinedAt: string;
    totalValue: number;
    visibleValue: number;
    drops: Array<{
      roundIndex: number;
      caseId: string;
      itemId: string;
      itemName: string;
      itemImage: string;
      itemValue: number;
      rarity: string;
    }>;
  }>;
};

const rarityStyles: Record<string, string> = {
  consumer: 'from-white/12 to-white/4 border-white/10',
  industrial: 'from-sky-400/18 to-sky-400/5 border-sky-300/20',
  'mil-spec': 'from-emerald-400/18 to-emerald-400/5 border-emerald-300/20',
  restricted: 'from-violet-400/18 to-violet-400/5 border-violet-300/20',
  classified: 'from-amber-400/18 to-amber-400/5 border-amber-300/20',
  covert: 'from-rose-400/20 to-rose-400/5 border-rose-300/25',
};

function formatCoins(value: number) {
  return new Intl.NumberFormat('en-US', { maximumFractionDigits: 0 }).format(Math.round(Number(value || 0)));
}

function relativeSeconds(date: string | null) {
  if (!date) {
    return 0;
  }

  const time = new Date(date).getTime() - Date.now();
  return Math.max(0, Math.ceil(time / 1000));
}

export const CaseBattlesGame: React.FC = () => {
  const { user, isAuthenticated } = useAuth();
  const { refreshWallet } = useBalance();
  const [formats, setFormats] = useState<BattleFormat[]>([]);
  const [cases, setCases] = useState<CaseDefinition[]>([]);
  const [battles, setBattles] = useState<BattlePayload[]>([]);
  const [selectedBattle, setSelectedBattle] = useState<BattlePayload | null>(null);
  const [selectedFormat, setSelectedFormat] = useState('1v1');
  const [selectedCaseIds, setSelectedCaseIds] = useState<string[]>(['neon-district', 'ember-rush']);
  const [freeToJoin, setFreeToJoin] = useState(false);
  const [botCount, setBotCount] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [clock, setClock] = useState(Date.now());
  const selectedBattleIdRef = useRef<number | null>(null);

  const loadConfig = async () => {
    const response = await apiFetch('/api/case-battles/config');
    const data = await response.json();
    setFormats(data.formats || []);
    setCases(data.cases || []);
  };

  const loadBattles = async (preserveSelection = true) => {
    const response = await apiFetch('/api/case-battles');
    const data = await response.json();
    const nextBattles = data.battles || [];
    setBattles(nextBattles);

    const selectedId = preserveSelection ? selectedBattleIdRef.current : null;
    if (selectedId) {
      const match = nextBattles.find((entry: BattlePayload) => entry.battle.id === selectedId);
      if (match) {
        setSelectedBattle(match);
        return;
      }
    }

    if (!selectedId && nextBattles[0]) {
      setSelectedBattle(nextBattles[0]);
      selectedBattleIdRef.current = nextBattles[0].battle.id;
    }
  };

  const loadBattle = async (battleId: number) => {
    const response = await apiFetch(`/api/case-battles/${battleId}`);
    const data = await response.json();
    const payload = data.battle as BattlePayload;
    setSelectedBattle(payload);
    selectedBattleIdRef.current = payload.battle.id;
    setBattles((current) => {
      const next = current.filter((entry) => entry.battle.id !== payload.battle.id);
      return [payload, ...next].sort((left, right) => right.battle.id - left.battle.id);
    });
  };

  useEffect(() => {
    const bootstrap = async () => {
      try {
        setIsLoading(true);
        await loadConfig();
        await loadBattles(false);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load case battles.');
      } finally {
        setIsLoading(false);
      }
    };

    bootstrap().catch(() => undefined);
  }, []);

  useEffect(() => {
    const interval = window.setInterval(() => {
      setClock(Date.now());
      loadBattles().catch(() => undefined);
      if (selectedBattleIdRef.current) {
        loadBattle(selectedBattleIdRef.current).catch(() => undefined);
      }
    }, 3000);

    return () => window.clearInterval(interval);
  }, []);

  const selectedFormatMeta = useMemo(
    () => formats.find((entry) => entry.key === selectedFormat) || formats[0],
    [formats, selectedFormat]
  );

  const selectedCases = useMemo(
    () => selectedCaseIds.map((caseId) => cases.find((entry) => entry.id === caseId)).filter(Boolean) as CaseDefinition[],
    [cases, selectedCaseIds]
  );

  const seatCost = useMemo(
    () => selectedCases.reduce((sum, entry) => sum + entry.price, 0),
    [selectedCases]
  );

  const creatorCost = useMemo(() => {
    if (!selectedFormatMeta) {
      return 0;
    }
    return freeToJoin ? seatCost * selectedFormatMeta.slots : seatCost * (1 + botCount);
  }, [botCount, freeToJoin, seatCost, selectedFormatMeta]);

  const toggleCase = (caseId: string) => {
    setSelectedCaseIds((current) => {
      if (current.includes(caseId)) {
        if (current.length === 1) {
          return current;
        }
        return current.filter((entry) => entry !== caseId);
      }

      return [...current, caseId].slice(0, 8);
    });
  };

  const submitCreate = async () => {
    if (!isAuthenticated || isSubmitting || selectedCaseIds.length === 0) {
      return;
    }

    try {
      setIsSubmitting(true);
      setError('');
      const token = localStorage.getItem('pasus_auth_token');
      const response = await apiFetch('/api/case-battles', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          formatKey: selectedFormat,
          caseIds: selectedCaseIds,
          freeToJoin,
          botCount,
        }),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(data.error || 'Failed to create battle.');
      }
      setSelectedBattle(data.battle);
      selectedBattleIdRef.current = data.battle.battle.id;
      await refreshWallet();
      await loadBattles();
      await loadBattle(data.battle.battle.id);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create battle.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const joinBattle = async (battleId: number) => {
    if (!isAuthenticated || isSubmitting) {
      return;
    }

    try {
      setIsSubmitting(true);
      setError('');
      const token = localStorage.getItem('pasus_auth_token');
      const response = await apiFetch(`/api/case-battles/${battleId}/join`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(data.error || 'Failed to join battle.');
      }
      await refreshWallet();
      await loadBattles();
      await loadBattle(battleId);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to join battle.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const addBots = async (battleId: number, count: number) => {
    if (!isAuthenticated || isSubmitting) {
      return;
    }

    try {
      setIsSubmitting(true);
      setError('');
      const token = localStorage.getItem('pasus_auth_token');
      const response = await apiFetch(`/api/case-battles/${battleId}/bots`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ count }),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(data.error || 'Failed to add bots.');
      }
      await refreshWallet();
      await loadBattles();
      await loadBattle(battleId);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to add bots.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const selectedBattleVisibleRounds = useMemo(() => {
    if (!selectedBattle) {
      return 0;
    }

    if (selectedBattle.battle.status === 'completed') {
      return selectedBattle.battle.cases.length;
    }

    if (!selectedBattle.battle.startedAt) {
      return 0;
    }

    return Math.min(
      selectedBattle.battle.cases.length,
      Math.max(0, Math.floor((clock - new Date(selectedBattle.battle.startedAt).getTime()) / selectedBattle.battle.revealMs) + 1)
    );
  }, [clock, selectedBattle]);

  const canCreate = isAuthenticated && selectedCaseIds.length > 0 && !isSubmitting;

  return (
    <div className="max-w-7xl mx-auto px-4 pb-12 space-y-8">
      <div className="grid gap-6 xl:grid-cols-[1.05fr_0.95fr]">
        <div className="rounded-[34px] overflow-hidden border border-white/10 bg-[linear-gradient(135deg,rgba(11,22,28,0.96),rgba(28,14,18,0.96))]">
          <div className="p-6 md:p-8 border-b border-white/10">
            <div className="flex items-center gap-3 text-[#7effc5] text-[11px] font-black uppercase tracking-[0.24em]">
              <Swords size={14} />
              Case Battles
            </div>
            <div className="mt-4 flex flex-wrap items-end justify-between gap-4">
              <div>
                <h2 className="text-4xl md:text-5xl font-black uppercase tracking-tight">Image-first battles</h2>
                <p className="mt-3 max-w-2xl text-sm text-white/55">
                  Pick cases, choose the room size, fund free seats if you want, and fill empty slots with bots.
                </p>
              </div>
              <div className="rounded-3xl border border-white/10 bg-black/25 px-5 py-4 text-right">
                <div className="text-[10px] uppercase tracking-[0.2em] text-white/25 font-black">Creator Cost</div>
                <div className="mt-2 text-3xl font-black text-[#7effc5]">{formatCoins(creatorCost)}</div>
              </div>
            </div>
          </div>

          <div className="p-6 md:p-8 space-y-6">
            <div className="grid md:grid-cols-3 gap-3">
              {formats.map((format) => (
                <button
                  key={format.key}
                  onClick={() => {
                    setSelectedFormat(format.key);
                    setBotCount((current) => Math.min(current, Math.max(0, format.slots - 1)));
                  }}
                  className={cn(
                    'rounded-3xl border px-4 py-4 text-left transition-all',
                    selectedFormat === format.key
                      ? 'border-[#7effc5]/40 bg-[#7effc5]/10 shadow-[0_0_32px_rgba(126,255,197,0.08)]'
                      : 'border-white/10 bg-white/[0.03] hover:bg-white/[0.05]'
                  )}
                >
                  <div className="flex items-center justify-between">
                    <div className="text-lg font-black">{format.label}</div>
                    <Users size={16} className="text-white/45" />
                  </div>
                  <div className="mt-2 text-xs text-white/45">{format.slots} total slots</div>
                </button>
              ))}
            </div>

            <div className="grid lg:grid-cols-2 gap-4">
              {cases.map((entry) => {
                const active = selectedCaseIds.includes(entry.id);
                return (
                  <button
                    key={entry.id}
                    onClick={() => toggleCase(entry.id)}
                    className={cn(
                      'rounded-[30px] border overflow-hidden text-left transition-all',
                      active
                        ? 'border-white/20 bg-white/[0.05] shadow-[0_18px_60px_rgba(0,0,0,0.24)]'
                        : 'border-white/10 bg-white/[0.03] hover:bg-white/[0.05]'
                    )}
                  >
                    <div
                      className="h-40 relative"
                      style={{
                        background: `radial-gradient(circle at top left, ${entry.accent}55, transparent 44%), linear-gradient(135deg, rgba(255,255,255,0.05), rgba(0,0,0,0.1))`,
                      }}
                    >
                      <img src={entry.image} alt={entry.name} className="absolute inset-0 h-full w-full object-cover" />
                      <div className="absolute right-4 top-4 rounded-full bg-black/60 px-3 py-1 text-[10px] font-black uppercase tracking-[0.16em] text-white">
                        {formatCoins(entry.price)}
                      </div>
                    </div>
                    <div className="p-4">
                      <div className="flex items-center justify-between gap-3">
                        <div className="text-xl font-black">{entry.name}</div>
                        {active ? <Sparkles size={16} className="text-[#7effc5]" /> : null}
                      </div>
                      <div className="mt-4 grid grid-cols-6 gap-2">
                        {entry.items.map((item) => (
                          <div key={item.id} className={cn('rounded-2xl border bg-gradient-to-b p-1.5', rarityStyles[item.rarity] || rarityStyles.consumer)}>
                            <img src={item.image} alt={item.name} className="h-11 w-full object-contain" />
                          </div>
                        ))}
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>

            <div className="grid md:grid-cols-[1.2fr_0.8fr] gap-4">
              <div className="rounded-[28px] border border-white/10 bg-black/20 p-5">
                <div className="text-[10px] uppercase tracking-[0.2em] text-white/30 font-black">Battle Strip</div>
                <div className="mt-4 flex gap-3 overflow-x-auto pb-1">
                  {selectedCases.map((entry, index) => (
                    <div key={`${entry.id}-${index}`} className="min-w-[140px] rounded-[24px] overflow-hidden border border-white/10 bg-white/[0.04]">
                      <img src={entry.image} alt={entry.name} className="h-28 w-full object-cover" />
                      <div className="p-3">
                        <div className="text-sm font-black truncate">{entry.name}</div>
                        <div className="mt-1 text-xs text-white/40">{formatCoins(entry.price)}</div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="rounded-[28px] border border-white/10 bg-black/20 p-5 space-y-4">
                <div className="flex items-center justify-between">
                  <div className="text-[10px] uppercase tracking-[0.2em] text-white/30 font-black">Room Setup</div>
                  <div className="text-sm font-black">{selectedFormatMeta?.label || selectedFormat}</div>
                </div>

                <label className="flex items-center justify-between rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-3">
                  <span className="text-sm font-semibold">Creator funds all seats</span>
                  <button
                    type="button"
                    onClick={() => setFreeToJoin((current) => !current)}
                    className={cn(
                      'h-7 w-12 rounded-full p-1 transition-all',
                      freeToJoin ? 'bg-[#7effc5]' : 'bg-white/15'
                    )}
                  >
                    <span className={cn('block h-5 w-5 rounded-full bg-black transition-transform', freeToJoin ? 'translate-x-5' : 'translate-x-0')} />
                  </button>
                </label>

                <div className="rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-3">
                  <div className="flex items-center justify-between">
                    <div className="text-sm font-semibold">Bots</div>
                    <div className="flex items-center gap-2">
                      {[0, 1, 2, 3, 4, 5].map((count) => (
                        <button
                          key={count}
                          onClick={() => setBotCount(Math.min(count, Math.max(0, (selectedFormatMeta?.slots || 2) - 1)))}
                          className={cn(
                            'h-8 w-8 rounded-xl text-xs font-black',
                            botCount === count ? 'bg-[#7effc5] text-black' : 'bg-white/10 text-white/60'
                          )}
                        >
                          {count}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>

                {error ? <div className="rounded-2xl border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm text-red-300">{error}</div> : null}

                <button
                  onClick={submitCreate}
                  disabled={!canCreate}
                  className="w-full rounded-2xl bg-[#7effc5] px-4 py-4 text-sm font-black uppercase tracking-[0.18em] text-black disabled:opacity-45"
                >
                  {isSubmitting ? 'Creating...' : 'Create Battle'}
                </button>
              </div>
            </div>
          </div>
        </div>

        <div className="rounded-[34px] border border-white/10 bg-[linear-gradient(180deg,rgba(14,19,29,0.96),rgba(13,12,19,0.96))] overflow-hidden">
          <div className="p-6 md:p-8 border-b border-white/10 flex items-center justify-between gap-4">
            <div>
              <div className="text-[10px] uppercase tracking-[0.2em] text-white/30 font-black">Lobby</div>
              <h3 className="mt-3 text-2xl font-black uppercase tracking-tight">Open and live rooms</h3>
            </div>
            {isLoading ? <LoaderCircle size={18} className="animate-spin text-white/50" /> : null}
          </div>
          <div className="max-h-[920px] overflow-y-auto p-5 space-y-4 custom-scrollbar">
            {battles.map((entry) => {
              const joined = Boolean(user && entry.players.some((player) => player.userId === user.id));
              const canJoin = entry.battle.status === 'waiting' && entry.battle.openSlots.length > 0 && !joined;
              const canAddBots = Boolean(user && user.id === entry.battle.creatorUserId && entry.battle.status === 'waiting' && entry.battle.openSlots.length > 0);

              return (
                <button
                  key={entry.battle.id}
                  onClick={() => {
                    setSelectedBattle(entry);
                    selectedBattleIdRef.current = entry.battle.id;
                  }}
                  className={cn(
                    'w-full rounded-[28px] border p-4 text-left transition-all',
                    selectedBattle?.battle.id === entry.battle.id ? 'border-[#7effc5]/40 bg-[#7effc5]/8' : 'border-white/10 bg-white/[0.03]'
                  )}
                >
                  <div className="flex items-center justify-between gap-4">
                    <div>
                      <div className="text-[10px] uppercase tracking-[0.2em] text-white/30 font-black">Battle #{entry.battle.id}</div>
                      <div className="mt-2 flex items-center gap-2 text-lg font-black">
                        {entry.battle.modeLabel}
                        {entry.battle.freeToJoin ? <span className="rounded-full bg-[#7effc5]/15 px-2 py-1 text-[10px] uppercase tracking-[0.16em] text-[#7effc5]">Free Join</span> : null}
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-[10px] uppercase tracking-[0.2em] text-white/30 font-black">{entry.battle.status}</div>
                      <div className="mt-2 text-xl font-black">{formatCoins(entry.battle.totalPot)}</div>
                    </div>
                  </div>

                  <div className="mt-4 flex gap-2 overflow-x-auto pb-1">
                    {entry.battle.cases.map((battleCase, index) => (
                      <img key={`${battleCase.id}-${index}`} src={battleCase.image} alt={battleCase.name} className="h-14 w-20 rounded-2xl border border-white/10 object-cover" />
                    ))}
                  </div>

                  <div className="mt-4 flex items-center justify-between gap-3">
                    <div className="flex -space-x-3">
                      {Array.from({ length: entry.battle.totalSlots }).map((_, slotIndex) => {
                        const player = entry.players.find((candidate) => candidate.slotIndex === slotIndex);
                        return player ? (
                          <img
                            key={slotIndex}
                            src={player.avatarUrl || `https://api.dicebear.com/9.x/initials/svg?seed=${encodeURIComponent(player.username)}`}
                            alt={player.username}
                            className="h-10 w-10 rounded-full border-2 border-[#10141d] object-cover"
                          />
                        ) : (
                          <div key={slotIndex} className="h-10 w-10 rounded-full border-2 border-dashed border-white/15 bg-white/[0.03]" />
                        );
                      })}
                    </div>
                    <div className="flex items-center gap-2">
                      {canJoin ? (
                        <span
                          onClick={(event) => {
                            event.stopPropagation();
                            joinBattle(entry.battle.id).catch(() => undefined);
                          }}
                          className="rounded-full bg-white text-black px-3 py-2 text-[10px] font-black uppercase tracking-[0.16em]"
                        >
                          Join
                        </span>
                      ) : null}
                      {canAddBots ? (
                        <span
                          onClick={(event) => {
                            event.stopPropagation();
                            addBots(entry.battle.id, entry.battle.openSlots.length).catch(() => undefined);
                          }}
                          className="rounded-full bg-[#7effc5]/15 px-3 py-2 text-[10px] font-black uppercase tracking-[0.16em] text-[#7effc5]"
                        >
                          Fill Bots
                        </span>
                      ) : null}
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {selectedBattle ? (
        <div className="rounded-[34px] border border-white/10 bg-[linear-gradient(180deg,rgba(13,17,25,0.98),rgba(9,11,17,0.98))] overflow-hidden">
          <div className="p-6 md:p-8 border-b border-white/10 flex flex-wrap items-center justify-between gap-4">
            <div>
              <div className="text-[10px] uppercase tracking-[0.2em] text-[#7effc5] font-black">Battle Viewer</div>
              <h3 className="mt-3 text-3xl font-black uppercase tracking-tight">
                #{selectedBattle.battle.id} {selectedBattle.battle.modeLabel}
              </h3>
              <div className="mt-2 flex items-center gap-3 text-sm text-white/45">
                <span>{selectedBattle.battle.status}</span>
                <span>{formatCoins(selectedBattle.battle.totalPot)} pot</span>
                {selectedBattle.battle.status === 'rolling' ? <span>{relativeSeconds(selectedBattle.battle.completedAt)}s left</span> : null}
              </div>
            </div>
            <div className="rounded-3xl border border-white/10 bg-black/25 px-5 py-4 text-right">
              <div className="text-[10px] uppercase tracking-[0.2em] text-white/25 font-black">Provably Fair</div>
              <div className="mt-2 text-xs font-mono text-white/70">{selectedBattle.battle.serverSeedHash.slice(0, 20)}...</div>
              <div className="mt-1 text-xs font-mono text-white/40">{selectedBattle.battle.serverSeed ? selectedBattle.battle.serverSeed.slice(0, 20) + '...' : 'reveals after finish'}</div>
            </div>
          </div>

          <div className="p-6 md:p-8 space-y-6">
            <div className="flex gap-3 overflow-x-auto pb-2">
              {selectedBattle.battle.cases.map((battleCase, index) => {
                const revealed = index < selectedBattleVisibleRounds;
                return (
                  <motion.div
                    key={`${battleCase.id}-${index}`}
                    initial={{ opacity: 0.65, y: 12 }}
                    animate={{ opacity: revealed ? 1 : 0.55, y: 0 }}
                    className={cn(
                      'min-w-[164px] rounded-[26px] overflow-hidden border',
                      revealed ? 'border-[#7effc5]/30' : 'border-white/10'
                    )}
                  >
                    <img src={battleCase.image} alt={battleCase.name} className="h-28 w-full object-cover" />
                    <div className="p-3 bg-white/[0.03]">
                      <div className="text-sm font-black">{battleCase.name}</div>
                      <div className="mt-1 text-xs text-white/45">{formatCoins(battleCase.price)}</div>
                    </div>
                  </motion.div>
                );
              })}
            </div>

            <div className="grid xl:grid-cols-2 gap-4">
              {selectedBattle.players
                .slice()
                .sort((left, right) => left.slotIndex - right.slotIndex)
                .map((player) => {
                  const winner = selectedBattle.battle.status === 'completed' && selectedBattle.battle.winningTeamIndexes.includes(player.teamIndex);
                  return (
                    <div
                      key={player.playerId}
                      className={cn(
                        'rounded-[30px] border p-5 bg-white/[0.03]',
                        winner ? 'border-[#7effc5]/30 shadow-[0_0_48px_rgba(126,255,197,0.06)]' : 'border-white/10'
                      )}
                    >
                      <div className="flex items-center justify-between gap-4">
                        <div className="flex items-center gap-4">
                          <img
                            src={player.avatarUrl || `https://api.dicebear.com/9.x/initials/svg?seed=${encodeURIComponent(player.username)}`}
                            alt={player.username}
                            className="h-16 w-16 rounded-full border border-white/10 object-cover bg-white/5"
                          />
                          <div>
                            <div className="flex items-center gap-2">
                              <div className="text-xl font-black">{player.username}</div>
                              {player.isBot ? <Bot size={15} className="text-white/35" /> : null}
                              {winner ? <Crown size={15} className="text-[#7effc5]" /> : null}
                            </div>
                            <div className="mt-1 text-xs text-white/45">
                              Team {player.teamIndex + 1} • paid {formatCoins(player.paidAmount)}
                            </div>
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="text-[10px] uppercase tracking-[0.18em] text-white/25 font-black">Visible</div>
                          <div className="mt-2 text-3xl font-black text-[#7effc5]">{formatCoins(player.visibleValue)}</div>
                        </div>
                      </div>

                      <div className="mt-5 grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-3">
                        {player.drops.map((drop, index) => {
                          const revealed = index < selectedBattleVisibleRounds;
                          return (
                            <div
                              key={`${player.playerId}-${drop.roundIndex}`}
                              className={cn(
                                'rounded-[24px] border bg-gradient-to-b p-3 transition-all',
                                rarityStyles[drop.rarity] || rarityStyles.consumer,
                                !revealed && 'opacity-35 grayscale'
                              )}
                            >
                              <img src={drop.itemImage} alt={drop.itemName} className="h-24 w-full object-contain" />
                              <div className="mt-3 text-sm font-black truncate">{revealed ? drop.itemName : 'Hidden'}</div>
                              <div className="mt-1 text-xs text-white/45">{revealed ? formatCoins(drop.itemValue) : '...'}</div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  );
                })}
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
};
