import React, { useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { useBalance } from '../../context/BalanceContext';
import { useAuth } from '../../context/AuthContext';
import { cn } from '../../lib/utils';
import { TrendingUp, Play, Square, Timer, Users } from 'lucide-react';
import { logBetActivity } from '../../lib/activity';
import {
  acknowledgeCrashOutcome,
  cashOutCrashBet,
  getCrashSnapshot,
  subscribeToCrashEngine,
  type CrashParticipant,
  type CrashSnapshot,
  placeCrashBet,
} from '../../lib/crashEngine';

export const CrashGame: React.FC = () => {
  const { balance, addBalance, subtractBalance } = useBalance();
  const { user } = useAuth();
  const [bet, setBet] = useState(10);
  const [snapshot, setSnapshot] = useState<CrashSnapshot>(() => getCrashSnapshot());
  const processedOutcomeRef = useRef<number | null>(null);

  useEffect(() => subscribeToCrashEngine(setSnapshot), []);

  useEffect(() => {
    const outcome = snapshot.playerOutcome;
    if (!outcome || processedOutcomeRef.current === outcome.id) {
      return;
    }

    processedOutcomeRef.current = outcome.id;
    if (outcome.outcome === 'win') {
      addBalance(outcome.payout);
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
  }, [addBalance, snapshot.playerOutcome]);

  const joinNextRound = () => {
    if (snapshot.phase !== 'countdown' || snapshot.playerBet || !user?.username) {
      return;
    }

    if (!subtractBalance(bet)) {
      return;
    }

    const placed = placeCrashBet(user.username, bet);
    if (!placed) {
      addBalance(bet);
    }
  };

  const cashOut = () => {
    cashOutCrashBet();
  };

  const progress = snapshot.phase === 'countdown' ? Math.max(0, Math.min(100, (snapshot.countdown / 5) * 100)) : 0;
  const participants = snapshot.participants;
  const playerBet = snapshot.playerBet;
  const joined = Boolean(playerBet);

  return (
    <div className="flex flex-col lg:grid lg:grid-cols-[320px_1fr] gap-6 p-4 max-w-7xl mx-auto">
      <div className="bg-[#111] border border-white/10 rounded-2xl p-6 flex flex-col gap-4">
        <div className="rounded-2xl border border-white/10 bg-black/30 px-4 py-3">
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
          <label className="text-xs uppercase tracking-widest text-white/40 mb-2 block">Bet Amount</label>
          <div className="relative">
            <input
              type="number"
              value={bet}
              onChange={(e) => setBet(Math.max(1, Number(e.target.value)))}
              disabled={snapshot.phase === 'running' || joined}
              className="w-full bg-black border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-[#00FF88]/50 transition-colors"
            />
            <div className="absolute right-2 top-1/2 -translate-y-1/2 flex gap-1">
              <button onClick={() => setBet((prev) => Math.max(1, Math.min(Math.floor(balance), prev * 2)))} className="px-2 py-1 bg-white/5 hover:bg-white/10 rounded text-[10px] text-white/60">x2</button>
              <button onClick={() => setBet(Math.max(1, Math.floor(balance)))} className="px-2 py-1 bg-white/5 hover:bg-white/10 rounded text-[10px] text-white/60">Max</button>
            </div>
          </div>
        </div>

        {snapshot.phase === 'running' && playerBet?.status === 'active' ? (
          <button
            onClick={cashOut}
            className="w-full bg-[#00FF88] hover:bg-[#00FF88]/90 text-black font-bold py-4 rounded-xl transition-all flex items-center justify-center gap-2 shadow-[0_0_20px_rgba(0,255,136,0.3)]"
          >
            <Square size={18} fill="currentColor" />
            CASH OUT ({Math.round(playerBet.wager * snapshot.multiplier)})
          </button>
        ) : (
          <button
            onClick={joinNextRound}
            disabled={snapshot.phase !== 'countdown' || joined || balance < bet}
            className="w-full bg-white hover:bg-white/90 text-black font-bold py-4 rounded-xl transition-all flex items-center justify-center gap-2 disabled:opacity-50"
          >
            <Play size={18} fill="currentColor" />
            {joined ? 'BET LOCKED' : 'JOIN NEXT ROUND'}
          </button>
        )}

        <div className="rounded-2xl border border-white/10 bg-black/20 px-4 py-3 text-xs font-bold text-white/70 flex items-center gap-2">
          <Timer size={14} className="text-[#00FF88]" />
          {snapshot.statusText}
        </div>

        <div className="rounded-2xl border border-white/10 bg-black/20 p-4">
          <div className="flex items-center gap-2 text-[10px] uppercase tracking-[0.18em] text-white/30 font-black mb-3">
            <Users size={12} />
            <span>Participants</span>
            <span className="ml-auto">{participants.length}</span>
          </div>
          <div className="space-y-2 max-h-[240px] overflow-y-auto custom-scrollbar pr-1">
            {participants.map((participant: CrashParticipant) => (
              <div key={participant.id} className="flex items-center justify-between rounded-xl border border-white/5 bg-white/[0.03] px-3 py-2">
                <div>
                  <div className={cn('text-sm font-bold', participant.isPlayer ? 'text-[#00FF88]' : 'text-white/80')}>
                    {participant.username}
                  </div>
                  <div className="text-[10px] uppercase tracking-[0.18em] text-white/25">{participant.status.replace('_', ' ')}</div>
                </div>
                <div className="text-right">
                  <div className="text-sm font-mono text-white">{participant.wager}</div>
                  <div className="text-[10px] uppercase tracking-[0.18em] text-white/25">
                    {participant.status === 'cashed_out' && participant.payout ? `+${participant.payout}` : participant.autoCashoutAt ? `${participant.autoCashoutAt.toFixed(2)}x` : 'Manual'}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="mt-auto">
          <label className="text-xs uppercase tracking-widest text-white/40 mb-2 block">History</label>
          <div className="flex flex-wrap gap-2">
            {snapshot.history.map((h, i) => (
              <span
                key={i}
                className={cn('px-2 py-1 rounded text-[10px] font-mono', h >= 2 ? 'bg-[#00FF88]/20 text-[#00FF88]' : 'bg-red-500/20 text-red-400')}
              >
                {h.toFixed(2)}x
              </span>
            ))}
          </div>
        </div>
      </div>

      <div className="bg-black border border-white/10 rounded-2xl relative overflow-hidden min-h-[400px] flex items-center justify-center">
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
              <h2 className={cn('text-8xl font-black tracking-tighter mb-2 transition-colors duration-300', playerBet?.status === 'cashed_out' ? 'text-[#00FF88]' : 'text-white')}>
                {snapshot.multiplier.toFixed(2)}x
              </h2>
              {playerBet?.status === 'cashed_out' && (
                <motion.p initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} className="text-[#00FF88] font-mono text-xl">
                  CASHED OUT
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
