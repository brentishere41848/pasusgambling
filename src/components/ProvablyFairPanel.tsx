import React, { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { X, RefreshCw, Shield, Check } from 'lucide-react';
import { apiFetch } from '../lib/api';
import { cn } from '../lib/utils';

function formatCoins(v: number) {
  return (v / 100).toFixed(2);
}

export const ProvablyFairPanel: React.FC<{ onClose: () => void }> = ({ onClose }) => {
  const [seedData, setSeedData] = useState<any>(null);
  const [clientSeed, setClientSeed] = useState('');
  const [loading, setLoading] = useState(true);
  const [rotating, setRotating] = useState(false);
  const [verifyResult, setVerifyResult] = useState<any>(null);
  const [verifyInput, setVerifyInput] = useState({ clientSeed: '', serverSeed: '', nonce: '0' });

  useEffect(() => {
    apiFetch('/api/pf/current-seed').then(r => r.json()).then(d => {
      setSeedData(d);
      setClientSeed(d.clientSeed || '');
      setLoading(false);
    });
  }, []);

  const rotate = async () => {
    if (!clientSeed || clientSeed.length < 8) return;
    setRotating(true);
    try {
      const res = await apiFetch('/api/pf/rotate-seed', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ clientSeed }),
      }).then(r => r.json());
      setSeedData(res);
      setVerifyResult(null);
    } finally {
      setRotating(false);
    }
  };

  const verify = async () => {
    if (!verifyInput.clientSeed || !verifyInput.serverSeed) return;
    const res = await apiFetch(`/api/pf/verify?clientSeed=${verifyInput.clientSeed}&serverSeed=${verifyInput.serverSeed}&nonce=${verifyInput.nonce}`).then(r => r.json());
    setVerifyResult(res);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="absolute inset-0 bg-black/70" onClick={onClose} />
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        className="relative w-full max-w-md bg-[#141821] border border-white/10 rounded-3xl p-6 space-y-5"
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
            </>
          )}
        </div>

        <div className="rounded-2xl border border-white/5 bg-white/[0.02] p-4 space-y-3">
          <div className="text-[10px] uppercase tracking-widest text-white/30 font-black">Verify a Result</div>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <div className="text-[10px] text-white/25 mb-1">Client Seed</div>
              <input
                value={verifyInput.clientSeed}
                onChange={(e) => setVerifyInput(p => ({ ...p, clientSeed: e.target.value }))}
                className="w-full bg-black/40 border border-white/10 rounded-xl px-3 py-2 text-xs font-mono text-white focus:outline-none"
              />
            </div>
            <div>
              <div className="text-[10px] text-white/25 mb-1">Nonce</div>
              <input
                value={verifyInput.nonce}
                onChange={(e) => setVerifyInput(p => ({ ...p, nonce: e.target.value }))}
                className="w-full bg-black/40 border border-white/10 rounded-xl px-3 py-2 text-xs font-mono text-white focus:outline-none"
              />
            </div>
          </div>
          <div>
            <div className="text-[10px] text-white/25 mb-1">Server Seed</div>
            <input
              value={verifyInput.serverSeed}
              onChange={(e) => setVerifyInput(p => ({ ...p, serverSeed: e.target.value }))}
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
          {verifyResult && (
            <div className="rounded-xl border border-[#00FF88]/15 bg-[#00FF88]/5 p-3">
              <div className="text-[10px] text-white/30 mb-1">Server Seed Hash</div>
              <div className="font-mono text-[9px] text-white/40 break-all mb-2">{verifyResult.serverSeedHash}</div>
              <div className="text-[10px] text-white/30 mb-1">Random Result (0-1)</div>
              <div className="text-lg font-black text-[#00FF88] font-mono">{verifyResult.result?.toFixed(8)}</div>
            </div>
          )}
        </div>

        <div className="text-[10px] text-white/25 leading-relaxed space-y-1">
          <div className="font-black text-white/40 uppercase tracking-wider mb-1">How it works</div>
          <p>Each bet uses a combination of your client seed and the server's secret seed to generate a random result. The server seed hash is shown before you bet, so you can verify it wasn't changed after the result.</p>
          <p>You can rotate your client seed anytime to get a new one. The nonce increments with each bet.</p>
        </div>
      </motion.div>
    </div>
  );
};
