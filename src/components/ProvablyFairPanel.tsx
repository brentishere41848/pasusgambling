import React, { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { X, RefreshCw, Shield, Search } from 'lucide-react';
import { apiFetch } from '../lib/api';

export const ProvablyFairPanel: React.FC<{ onClose: () => void }> = ({ onClose }) => {
  const [seedData, setSeedData] = useState<any>(null);
  const [clientSeed, setClientSeed] = useState('');
  const [loading, setLoading] = useState(true);
  const [rotating, setRotating] = useState(false);
  const [verifyResult, setVerifyResult] = useState<any>(null);
  const [verifyInput, setVerifyInput] = useState({ clientSeed: '', serverSeed: '', nonce: '0' });
  const [betId, setBetId] = useState('');
  const [betLookup, setBetLookup] = useState<any>(null);
  const [betLookupError, setBetLookupError] = useState('');

  useEffect(() => {
    const token = localStorage.getItem('pasus_auth_token');
    apiFetch('/api/pf/current-seed', {
      headers: { Authorization: `Bearer ${token}` },
    }).then((r) => r.json()).then((d) => {
      setSeedData(d);
      setClientSeed(d.clientSeed || '');
      setLoading(false);
    });
  }, []);

  const rotate = async () => {
    if (!clientSeed || clientSeed.length < 8) return;
    setRotating(true);
    try {
      const token = localStorage.getItem('pasus_auth_token');
      const res = await apiFetch('/api/pf/rotate-seed', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ clientSeed }),
      }).then((r) => r.json());
      setSeedData(res);
      if (res.revealedServerSeed) {
        setVerifyInput((prev: any) => ({ ...prev, serverSeed: res.revealedServerSeed }));
      }
      setVerifyResult(null);
    } finally {
      setRotating(false);
    }
  };

  const verify = async () => {
    if (!verifyInput.clientSeed || !verifyInput.serverSeed) return;
    const res = await apiFetch(`/api/pf/verify?clientSeed=${encodeURIComponent(verifyInput.clientSeed)}&serverSeed=${encodeURIComponent(verifyInput.serverSeed)}&nonce=${encodeURIComponent(verifyInput.nonce)}`).then((r) => r.json());
    setVerifyResult(res);
  };

  const loadBet = async () => {
    if (!betId.trim()) return;
    setBetLookup(null);
    setBetLookupError('');
    const response = await apiFetch(`/api/pf/bet/${encodeURIComponent(betId.trim())}`);
    const data = await response.json().catch(() => ({}));
    if (!response.ok) {
      setBetLookupError(data.error || 'Failed to load bet verifier.');
      return;
    }
    setBetLookup(data.bet);
    setVerifyInput((prev) => ({
      ...prev,
      clientSeed: data.bet.clientSeed || '',
      nonce: String(data.bet.nonce || 0),
    }));
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="absolute inset-0 bg-black/70" onClick={onClose} />
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        className="relative w-full max-w-2xl bg-[#141821] border border-white/10 rounded-3xl p-6 space-y-5 max-h-[88vh] overflow-y-auto custom-scrollbar"
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Shield size={18} className="text-[#00FF88]" />
            <h2 className="text-lg font-black uppercase tracking-wider">Provably Fair</h2>
          </div>
          <button onClick={onClose} className="p-2 rounded-xl hover:bg-white/5 text-white/40 hover:text-white"><X size={18} /></button>
        </div>

        <div className="rounded-2xl border border-[#00FF88]/15 bg-[#00FF88]/5 p-4 space-y-3">
          <div className="text-[10px] uppercase tracking-widest text-[#00FF88]/70 font-black">Current Seeds</div>
          {loading ? (
            <div className="text-white/40 text-xs">Loading...</div>
          ) : (
            <>
              <div>
                <div className="text-[10px] text-white/30 mb-1">Client Seed</div>
                <div className="flex gap-2">
                  <input
                    value={clientSeed}
                    onChange={(e) => setClientSeed(e.target.value)}
                    className="flex-1 bg-black/40 border border-white/10 rounded-xl px-3 py-2 text-xs font-mono text-white focus:outline-none focus:border-[#00FF88]/30"
                  />
                  <button
                    onClick={rotate}
                    disabled={rotating || !clientSeed || clientSeed.length < 8}
                    className="px-3 py-2 bg-[#00FF88] text-black rounded-xl text-xs font-black uppercase disabled:opacity-40"
                  >
                    <RefreshCw size={14} className={rotating ? 'animate-spin' : ''} />
                  </button>
                </div>
              </div>
              <div>
                <div className="text-[10px] text-white/30 mb-1">Server Seed Hash</div>
                <div className="font-mono text-xs text-white/50 bg-black/30 rounded-xl px-3 py-2 break-all select-all">
                  {seedData?.serverSeedHash || 'N/A'}
                </div>
              </div>
              <div>
                <div className="text-[10px] text-white/30 mb-1">Nonce (Bet Count)</div>
                <div className="text-sm font-black text-white">{seedData?.nonce ?? 0}</div>
              </div>
              {seedData?.revealedServerSeed ? (
                <div className="rounded-xl border border-amber-400/15 bg-amber-400/5 p-3">
                  <div className="text-[10px] uppercase tracking-widest text-amber-300/70 font-black">Revealed Previous Server Seed</div>
                  <div className="mt-2 font-mono text-xs text-amber-100/80 break-all select-all">{seedData.revealedServerSeed}</div>
                </div>
              ) : null}
            </>
          )}
        </div>

        <div className="rounded-2xl border border-white/5 bg-white/[0.02] p-4 space-y-3">
          <div className="text-[10px] uppercase tracking-widest text-white/30 font-black">Public Bet Verifier</div>
          <div className="flex gap-2">
            <input
              value={betId}
              onChange={(e) => setBetId(e.target.value)}
              placeholder="Enter bet ID"
              className="flex-1 bg-black/40 border border-white/10 rounded-xl px-3 py-2 text-xs font-mono text-white focus:outline-none"
            />
            <button onClick={loadBet} className="px-3 py-2 bg-white/8 rounded-xl text-xs font-black uppercase">
              <Search size={14} />
            </button>
          </div>
          {betLookupError ? <div className="text-xs text-red-300">{betLookupError}</div> : null}
          {betLookup ? (
            <div className="rounded-xl border border-white/5 bg-black/30 p-3 space-y-2 text-xs">
              <div className="flex justify-between gap-3"><span className="text-white/35">Game</span><span className="font-black capitalize">{betLookup.gameKey}</span></div>
              <div className="flex justify-between gap-3"><span className="text-white/35">User</span><span>{betLookup.username}</span></div>
              <div className="flex justify-between gap-3"><span className="text-white/35">Outcome</span><span>{betLookup.outcome}</span></div>
              <div className="flex justify-between gap-3"><span className="text-white/35">Hash</span><span className="font-mono text-[10px] text-right break-all">{betLookup.serverSeedHash}</span></div>
              <div className="flex justify-between gap-3"><span className="text-white/35">Client Seed</span><span className="font-mono text-right break-all">{betLookup.clientSeed}</span></div>
              <div className="flex justify-between gap-3"><span className="text-white/35">Nonce</span><span className="font-mono">{betLookup.nonce}</span></div>
              <div className="flex justify-between gap-3"><span className="text-white/35">Recorded Result</span><span className="font-mono text-[#00FF88]">{Number(betLookup.result || 0).toFixed(8)}</span></div>
            </div>
          ) : null}
        </div>

        <div className="rounded-2xl border border-white/5 bg-white/[0.02] p-4 space-y-3">
          <div className="text-[10px] uppercase tracking-widest text-white/30 font-black">Verify a Result</div>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <div className="text-[10px] text-white/25 mb-1">Client Seed</div>
              <input
                value={verifyInput.clientSeed}
                onChange={(e) => setVerifyInput((p) => ({ ...p, clientSeed: e.target.value }))}
                className="w-full bg-black/40 border border-white/10 rounded-xl px-3 py-2 text-xs font-mono text-white focus:outline-none"
              />
            </div>
            <div>
              <div className="text-[10px] text-white/25 mb-1">Nonce</div>
              <input
                value={verifyInput.nonce}
                onChange={(e) => setVerifyInput((p) => ({ ...p, nonce: e.target.value }))}
                className="w-full bg-black/40 border border-white/10 rounded-xl px-3 py-2 text-xs font-mono text-white focus:outline-none"
              />
            </div>
          </div>
          <div>
            <div className="text-[10px] text-white/25 mb-1">Server Seed</div>
            <input
              value={verifyInput.serverSeed}
              onChange={(e) => setVerifyInput((p) => ({ ...p, serverSeed: e.target.value }))}
              className="w-full bg-black/40 border border-white/10 rounded-xl px-3 py-2 text-xs font-mono text-white focus:outline-none"
            />
          </div>
          <button
            onClick={verify}
            disabled={!verifyInput.clientSeed || !verifyInput.serverSeed}
            className="w-full rounded-xl bg-white/8 hover:bg-white/12 py-2.5 text-xs font-black uppercase tracking-wider disabled:opacity-40"
          >
            Verify
          </button>
          {verifyResult ? (
            <div className="rounded-xl border border-[#00FF88]/15 bg-[#00FF88]/5 p-3">
              <div className="text-[10px] text-white/30 mb-1">Server Seed Hash</div>
              <div className="font-mono text-[9px] text-white/40 break-all mb-2">{verifyResult.serverSeedHash}</div>
              <div className="text-[10px] text-white/30 mb-1">Random Result (0-1)</div>
              <div className="text-lg font-black text-[#00FF88] font-mono">{verifyResult.result?.toFixed(8)}</div>
              {betLookup ? (
                <div className="mt-2 text-[10px] text-white/35">
                  Matches bet: {Number(verifyResult.result || 0).toFixed(8) === Number(betLookup.result || 0).toFixed(8) ? 'yes' : 'no'}
                </div>
              ) : null}
            </div>
          ) : null}
        </div>

        <div className="text-[10px] text-white/25 leading-relaxed space-y-1">
          <div className="font-black text-white/40 uppercase tracking-wider mb-1">How it works</div>
          <p>Each recorded bet stores a client seed, server seed hash, nonce, and provably fair random result snapshot.</p>
          <p>Rotate your seed to reveal the previous server seed, then plug that seed into the verifier to confirm any past bet.</p>
        </div>
      </motion.div>
    </div>
  );
};
