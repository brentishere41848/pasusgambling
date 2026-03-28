import React, { useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { useBalance } from '../../context/BalanceContext';
import { useAuth } from '../../context/AuthContext';
import { cn } from '../../lib/utils';
import { TrendingUp, Play, Square, Timer, Users, Settings } from 'lucide-react';
import { logBetActivity } from '../../lib/activity';
import {
  acknowledgeCrashOutcome,
  cashOutCrashBet,
  cashOutSecondaryCrashBet,
  getCrashSnapshot,
  subscribeToCrashEngine,
  type CrashParticipant,
  type CrashSnapshot,
  placeCrashBet,
  placeSecondaryCrashBet,
} from '../../lib/crashEngine';
import { QuickBetButtons, GameStatsBar, useLocalGameStats, centsToDollars, dollarsToCents, formatCents, MIN_BET } from './GameHooks';

const MAX_HISTORY = 20;

export const CrashGame: React.FC = () => {
  const { balance, addBalance, subtractBalance } = useBalance();
  const { user } = useAuth();
  const [bet, setBet] = useState(1);
  const [secondaryBet, setSecondaryBet] = useState(0);
  const [autoCashout, setAutoCashout] = useState('');
  const [secondaryAutoCashout, setSecondaryAutoCashout] = useState('');
  const [showSettings, setShowSettings] = useState(false);
  const [snapshot, setSnapshot] = useState<CrashSnapshot>(() => getCrashSnapshot());
  const processedOutcomeRef = useRef<number | null>(null);
  const { getStats, recordBet } = useLocalGameStats('crash');
  const stats = getStats();

  useEffect(() => {
    const unsub = subscribeToCrashEngine(setSnapshot);
    return unsub;
  }, []);

  useEffect(() => {
    const outcome = snapshot.playerOutcome;
    if (!outcome || processedOutcomeRef.current === outcome.id) {
      return;
    }

    processedOutcomeRef.current = outcome.id;
    if (outcome.outcome === 'win') {
      addBalance(outcome.payout);
      recordBet(outcome.wager, outcome.payout, true);
    } else {
      recordBet(outcome.wager, 0, false);
    }
    logBetActivity({
      gameKey: 'crash',
      wager: outcome.wager,
      payout: outcome.payout,
      multiplier: outcome.multiplier,
      outcome: outcome.outcome,
      detail: outcome.detail,
    });
    acknowledgeCrashOutcome(outcome.id);
  }, [addBalance, snapshot.playerOutcome, recordBet]);

  const joinNextRound = () => {
    if (snapshot.phase !== 'countdown' || snapshot.playerBet || !user?.username) return;
    const auto = autoCashout ? parseFloat(autoCashout) : undefined;
    const wager = dollarsToCents(bet);
    if (!subtractBalance(wager)) return;
    const placed = placeCrashBet(user.username, wager, auto);
    if (!placed) addBalance(wager);
  };

  const placeSecondBet = () => {
    if (snapshot.phase !== 'countdown' || snapshot.playerSecondaryBet || !user?.username) return;
    if (secondaryBet <= 0) return;
    const wager = dollarsToCents(secondaryBet);
    if (wager > balance) return;
    const auto = secondaryAutoCashout ? parseFloat(secondaryAutoCashout) : undefined;
    if (!subtractBalance(wager)) return;
    const placed = placeSecondaryCrashBet(user.username, wager, auto);
    if (!placed) addBalance(wager);
  };

  const cashOut = () => {
    cashOutCrashBet();
  };

  const cashOutSecond = () => {
    cashOutSecondaryCrashBet();
  };

  const setPreset = (percent: number) => {
    setBet(Math.max(MIN_BET, Number((centsToDollars(balance) * percent / 100).toFixed(2))));
  };

  const setSecondaryPreset = (percent: number) => {
    setSecondaryBet(Math.max(MIN_BET, Number((centsToDollars(balance) * percent / 100).toFixed(2))));
  };

  const progress = snapshot.phase === 'countdown' ? Math.max(0, Math.min(100, (snapshot.countdown / 5) * 100)) : 0;
  const participants = snapshot.participants;
  const playerBet = snapshot.playerBet;
  const secondaryBetData = snapshot.playerSecondaryBet;
  const joined = Boolean(playerBet);
  const joinedSecond = Boolean(secondaryBetData);
  const history = snapshot.history;

  return (
    <div className="flex flex-col lg:grid lg:grid-cols-[360px_1fr] gap-6 p-4 md:p-5 max-w-7xl mx-auto">
      <div className="bg-[linear-gradient(180deg,#141d2e_0%,#0f1624_100%)] border border-cyan-300/20 rounded-3xl p-6 flex flex-col gap-4 shadow-[0_18px_60px_rgba(4,18,40,0.45)]">
        <div className="flex items-center justify-between">
          <div className="text-sm font-black text-white/40 uppercase tracking-widest">Crash</div>
        </div>

        <div className="rounded-2xl border border-cyan-300/20 bg-black/30 px-4 py-3">
          <div className="flex items-center justify-between text-[10px] uppercase tracking-[0.22em] text-white/30">
            <span>Next Round</span>
            <span>{snapshot.phase === 'countdown' ? `${Math.ceil(snapshot.countdown)}s` : 'LIVE'}</span>
          </div>
          <div className="mt-2 h-2 rounded-full bg-white/5 overflow-hidden">
            <motion.div
              initial={false}
              animate={{ width: snapshot.phase === 'countdown' ? `${progress}%` : '0%' }}
              transition={{ duration: 0.08, ease: 'linear' }}
              className="h-full bg-[#00FF88]"
            />
          </div>
        </div>

        <div>
          <label className="text-[10px] font-black uppercase tracking-[0.18em] text-white/45 mb-2 block">Bet Amount</label>
          <div className="relative">
            <input
              type="number"
              value={bet}
              onChange={(e) => setBet(Math.max(0.01, Number(e.target.value)))}
              min="0.01"
              step="0.01"
              disabled={snapshot.phase === 'running' || joined}
              className="w-full bg-black border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-[#00FF88]/50 transition-colors"
            />
            <div className="absolute right-2 top-1/2 -translate-y-1/2 flex gap-1">
              <button onClick={() => setPreset(1)} disabled={snapshot.phase === 'running' || joined} className="px-2 py-1 bg-white/5 hover:bg-white/10 rounded text-[10px] text-white/60">1%</button>
              <button onClick={() => setPreset(5)} disabled={snapshot.phase === 'running' || joined} className="px-2 py-1 bg-white/5 hover:bg-white/10 rounded text-[10px] text-white/60">5%</button>
              <button onClick={() => setPreset(10)} disabled={snapshot.phase === 'running' || joined} className="px-2 py-1 bg-white/5 hover:bg-white/10 rounded text-[10px] text-white/60">10%</button>
            </div>
          </div>
            <QuickBetButtons balance={centsToDollars(balance)} bet={bet} onSetBet={setBet} disabled={snapshot.phase === 'running' || joined} />
        </div>

        <div>
            <label className="text-[10px] font-black uppercase tracking-[0.18em] text-white/45 mb-2 block">
            Auto Cashout <span className="text-white/20">(optional)</span>
          </label>
          <input
            type="number"
            value={autoCashout}
            onChange={(e) => setAutoCashout(e.target.value)}
            placeholder="e.g. 2.00"
            step="0.01"
            min="1.01"
            disabled={snapshot.phase === 'running' || joined}
            className="w-full bg-black border border-white/10 rounded-xl px-4 py-2 text-white text-sm focus:outline-none focus:border-[#00FF88]/50 transition-colors"
          />
          {autoCashout && !isNaN(parseFloat(autoCashout)) && parseFloat(autoCashout) > 1 && (
            <div className="text-[10px] text-white/25 mt-1">
              Payout: {formatCents(Math.round(dollarsToCents(bet) * parseFloat(autoCashout)))}
            </div>
          )}
        </div>

        {snapshot.phase === 'running' && playerBet?.status === 'active' ? (
          <button
            onClick={cashOut}
            className="w-full bg-gradient-to-r from-cyan-300 to-emerald-300 hover:opacity-95 text-slate-900 font-bold py-4 rounded-xl transition-all flex items-center justify-center gap-2 shadow-[0_0_28px_rgba(34,211,238,0.28)]"
          >
            <Square size={18} fill="currentColor" />
            CASH OUT {formatCents(Math.round(playerBet.wager * snapshot.multiplier))}
          </button>
        ) : (
          <button
            onClick={joinNextRound}
            disabled={snapshot.phase !== 'countdown' || joined || balance < dollarsToCents(bet)}
            className="w-full bg-gradient-to-r from-cyan-200 to-white hover:opacity-95 text-black font-bold py-4 rounded-xl transition-all flex items-center justify-center gap-2 disabled:opacity-50"
          >
            <Play size={18} fill="currentColor" />
            {joined ? 'BET LOCKED' : 'JOIN NEXT ROUND'}
          </button>
        )}

        {joined && !playerBet?.autoCashoutAt && snapshot.phase === 'running' && (
          <button
            onClick={() => {
              setAutoCashout(snapshot.multiplier.toFixed(2));
            }}
            className="w-full border border-[#00FF88]/30 bg-[#00FF88]/10 hover:bg-[#00FF88]/20 text-[#00FF88] font-bold py-2 rounded-xl transition-all text-xs"
          >
            Set Auto Cashout at {snapshot.multiplier.toFixed(2)}x
          </button>
        )}

        {joined && (
          <div className="border border-[#00FF88]/20 bg-[#00FF88]/5 rounded-xl p-3">
            <div className="flex justify-between text-[10px] text-white/40 uppercase tracking-widest">
              <span>Primary Bet</span>
              <span>{formatCents(dollarsToCents(bet))}</span>
            </div>
            {playerBet?.autoCashoutAt && (
              <div className="flex justify-between text-[10px] text-white/30 mt-1">
                <span>Auto at</span>
                <span>{playerBet.autoCashoutAt.toFixed(2)}x</span>
              </div>
            )}
            {playerBet?.status === 'cashed_out' && (
              <div className="text-[#00FF88] text-xs font-black mt-1">CASHED OUT</div>
            )}
          </div>
        )}

        {joined && !joinedSecond && secondaryBet > 0 && (
          <div className="border border-purple-500/20 bg-purple-500/5 rounded-xl p-3 space-y-2">
            <div className="text-[10px] font-black text-purple-300 uppercase tracking-widest">Second Bet</div>
            <div>
              <label className="text-[10px] text-white/40 mb-1 block">Amount</label>
              <input
                type="number"
                value={secondaryBet}
                onChange={(e) => setSecondaryBet(Math.max(0, Number(e.target.value)))}
                disabled={snapshot.phase === 'running'}
                className="w-full bg-black border border-white/10 rounded-lg px-3 py-2 text-white text-xs focus:outline-none focus:border-purple-500/50"
              />
              <div className="grid grid-cols-3 gap-1 mt-1">
                {[1, 5, 10].map(p => (
                  <button key={p} onClick={() => setSecondaryPreset(p)} disabled={snapshot.phase === 'running'} className="py-1 bg-white/5 hover:bg-white/10 rounded text-[9px] text-white/50">{p}%</button>
                ))}
              </div>
            </div>
            <div>
              <label className="text-[10px] text-white/40 mb-1 block">Auto Cashout</label>
              <input
                type="number"
                value={secondaryAutoCashout}
                onChange={(e) => setSecondaryAutoCashout(e.target.value)}
                placeholder="e.g. 3.00"
                step="0.01"
                min="1.01"
                disabled={snapshot.phase === 'running'}
                className="w-full bg-black border border-white/10 rounded-lg px-3 py-2 text-white text-xs focus:outline-none focus:border-purple-500/50"
              />
            </div>
            {snapshot.phase === 'countdown' && (
              <button
                onClick={placeSecondBet}
                disabled={balance < dollarsToCents(secondaryBet) || secondaryBet <= 0}
                className="w-full bg-purple-500 hover:bg-purple-400 text-white font-bold py-2 rounded-lg transition-all text-xs disabled:opacity-50"
              >
                Add Second Bet
              </button>
            )}
          </div>
        )}

        {joinedSecond && (
          <div className="border border-purple-500/20 bg-purple-500/5 rounded-xl p-3">
            <div className="flex justify-between text-[10px] text-white/40 uppercase tracking-widest">
              <span>Second Bet</span>
               <span>{formatCents(secondaryBetData?.wager || 0)}</span>
            </div>
            {secondaryBetData?.autoCashoutAt && (
              <div className="flex justify-between text-[10px] text-white/30 mt-1">
                <span>Auto at</span>
                <span>{secondaryBetData.autoCashoutAt.toFixed(2)}x</span>
              </div>
            )}
            {snapshot.phase === 'running' && secondaryBetData?.status === 'active' && (
              <button
                onClick={cashOutSecond}
                className="w-full mt-2 bg-purple-500 hover:bg-purple-400 text-white font-bold py-2 rounded-lg transition-all text-xs"
              >
                Cash Out Second
              </button>
            )}
            {secondaryBetData?.status === 'cashed_out' && (
              <div className="text-purple-400 text-xs font-black mt-1">CASHED OUT</div>
            )}
          </div>
        )}

        {joined && !joinedSecond && snapshot.phase === 'countdown' && (
          <button
            onClick={() => setShowSettings(!showSettings)}
            className="text-[10px] text-white/30 hover:text-white/50 transition-colors"
          >
            + Add Second Bet
          </button>
        )}

        <div className="rounded-2xl border border-white/10 bg-black/20 px-4 py-3 text-xs font-bold text-white/70 flex items-center gap-2">
          <Timer size={14} className="text-[#00FF88]" />
          {snapshot.statusText}
        </div>

        <div className="rounded-2xl border border-white/10 bg-black/20 p-4">
          <div className="flex items-center gap-2 text-[10px] uppercase tracking-[0.18em] text-white/30 font-black mb-3">
            <Users size={12} />
            <span>Participants ({participants.length})</span>
          </div>
          <div className="space-y-2 max-h-[200px] overflow-y-auto custom-scrollbar pr-1">
            {participants.length === 0 ? (
              <div className="text-center text-white/30 py-4 text-xs">Waiting for bets...</div>
            ) : participants.map((participant: CrashParticipant) => (
              <div key={participant.id} className={cn('flex items-center justify-between rounded-xl border px-3 py-2',
                participant.isPlayer ? 'border-[#00FF88]/30 bg-[#00FF88]/5' : 'border-white/5 bg-white/[0.03]'
              )}>
                <div className="flex items-center gap-2">
                  <div className={cn('w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-black',
                    participant.isPlayer ? 'bg-[#00FF88] text-black' : 'bg-white/10 text-white/60'
                  )}>
                    {participant.username.charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <div className={cn('text-sm font-bold', participant.isPlayer ? 'text-[#00FF88]' : 'text-white/80')}>
                      {participant.username} {participant.isPlayer && '(You)'}
                    </div>
                    <div className={cn('text-[10px] uppercase tracking-wider',
                      participant.status === 'cashed_out' ? 'text-[#00FF88]' :
                      participant.status === 'crashed' ? 'text-red-400' :
                      'text-white/40'
                    )}>
                      {participant.status === 'cashed_out' ? `Cashed @ ${participant.payout ? (participant.wager * (participant.payout / participant.wager)).toFixed(2) : participant.autoCashoutAt?.toFixed(2)}x` :
                       participant.status === 'crashed' ? 'Crashed' :
                       participant.status.replace('_', ' ')}
                    </div>
                  </div>
                </div>
                <div className="text-right">
                    <div className="text-sm font-mono text-white">{formatCents(participant.wager)}</div>
                  <div className="text-[10px] text-white/40">
                    {participant.autoCashoutAt ? `Auto @ ${participant.autoCashoutAt.toFixed(2)}x` : 'Manual'}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="mt-auto space-y-3">
          <div>
            <label className="text-[10px] font-black uppercase tracking-[0.18em] text-white/45 mb-2 block">History</label>
            <div className="flex flex-wrap gap-2">
              {history.slice(0, 12).map((h, i) => (
                <span key={i} className={cn('px-2 py-1 rounded text-[10px] font-mono', h >= 2 ? 'bg-[#00FF88]/20 text-[#00FF88]' : 'bg-red-500/20 text-red-400')}>
                  {h.toFixed(2)}x
                </span>
              ))}
            </div>
          </div>
          <GameStatsBar stats={[
            { label: 'Bets', value: String(stats.totalBets) },
            { label: 'Wins', value: String(stats.totalWins) },
            { label: 'Biggest', value: formatCents(stats.biggestWin) },
            { label: 'Wagered', value: formatCents(stats.totalWagered) },
          ]} />
        </div>
      </div>

      <div className="bg-[linear-gradient(180deg,#0a121d_0%,#05090f_100%)] border border-cyan-300/20 rounded-3xl relative overflow-hidden min-h-[400px] flex items-center justify-center shadow-[0_20px_70px_rgba(0,0,0,0.4)]">
        <div className="absolute inset-0 opacity-20 pointer-events-none">
          <div className="absolute inset-0" style={{ backgroundImage: 'radial-gradient(#333 1px, transparent 1px)', backgroundSize: '40px 40px' }} />
        </div>

        <AnimatePresence mode="wait">
          {snapshot.phase === 'countdown' && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="text-center">
              <TrendingUp size={64} className="text-white/10 mx-auto mb-4" />
              <p className="text-white/40 uppercase tracking-[0.2em] text-sm">Live round starts in {Math.ceil(snapshot.countdown)}s</p>
            </motion.div>
          )}

          {snapshot.phase === 'running' && (
            <motion.div key="active" initial={{ scale: 0.8, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="text-center z-10">
              <h2 className={cn(
                'text-8xl font-black tracking-tighter mb-2 transition-colors duration-300',
                playerBet?.status === 'cashed_out' ? 'text-[#00FF88]' : 'text-white'
              )}>
                {snapshot.multiplier.toFixed(2)}x
              </h2>
              {playerBet?.status === 'cashed_out' && (
                <motion.p initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} className="text-[#00FF88] font-mono text-xl">
                  CASHED OUT
                </motion.p>
              )}
              {secondaryBetData?.status === 'cashed_out' && (
                <motion.p initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} className="text-purple-400 font-mono text-xl mt-1">
                  SECOND CASHED OUT
                </motion.p>
              )}
            </motion.div>
          )}

          {snapshot.phase === 'crashed' && (
            <motion.div key="crashed" initial={{ scale: 1.2, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="text-center z-10">
              <h2 className="text-8xl font-black tracking-tighter text-red-500 mb-2">{snapshot.multiplier.toFixed(2)}x</h2>
              <p className="text-red-500/60 uppercase tracking-[0.2em] text-sm">Crashed!</p>
            </motion.div>
          )}
        </AnimatePresence>

        {snapshot.phase === 'running' && (
          <svg className="absolute inset-0 w-full h-full pointer-events-none">
            <motion.path
              d={`M 0 400 Q ${snapshot.multiplier * 50} ${400 - snapshot.multiplier * 20} ${snapshot.multiplier * 100} ${400 - snapshot.multiplier * 50}`}
              fill="none"
              stroke="#00FF88"
              strokeWidth="4"
              initial={{ pathLength: 0 }}
              animate={{ pathLength: 1 }}
            />
          </svg>
        )}
      </div>
    </div>
  );
};
