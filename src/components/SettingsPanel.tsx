import React, { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { X, Moon, Sun, Volume2, VolumeX, Bell, BellOff, Coins } from 'lucide-react';
import { apiFetch } from '../lib/api';
import { cn } from '../lib/utils';

export const SettingsPanel: React.FC<{ onClose: () => void }> = ({ onClose }) => {
  const [theme, setTheme] = useState('dark');
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [notificationsEnabled, setNotificationsEnabled] = useState(true);
  const [chatNotifications, setChatNotifications] = useState(true);
  const [rainNotifications, setRainNotifications] = useState(true);
  const [defaultBet, setDefaultBet] = useState('1');
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    apiFetch('/api/settings').then(r => r.json()).then(data => {
      if (data.theme) setTheme(data.theme);
      setSoundEnabled(data.soundEnabled ?? true);
      setNotificationsEnabled(data.notificationsEnabled ?? true);
      setChatNotifications(data.chatNotifications ?? true);
      setRainNotifications(data.rainNotifications ?? true);
      setDefaultBet(String((data.defaultBet || 100) / 100));
    });
  }, []);

  const save = async () => {
    setSaving(true);
    try {
      await apiFetch('/api/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          theme,
          soundEnabled,
          notificationsEnabled,
          defaultBet: Math.max(1, Math.round(Number(defaultBet) * 100)),
          chatNotifications,
          rainNotifications,
        }),
      });
      localStorage.setItem('theme', theme);
      localStorage.setItem('soundEnabled', String(soundEnabled));
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="absolute inset-0 bg-black/70" onClick={onClose} />
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 10 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95 }}
        className="relative w-full max-w-md bg-[#141821] border border-white/10 rounded-3xl p-6 space-y-5"
      >
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-black uppercase tracking-wider">Settings</h2>
          <button onClick={onClose} className="p-2 rounded-xl hover:bg-white/5 text-white/40 hover:text-white">
            <X size={18} />
          </button>
        </div>

        <div className="space-y-4">
          <div>
            <label className="text-xs uppercase tracking-wider text-white/40 font-black mb-3 block">Theme</label>
            <div className="flex gap-2">
              {['dark', 'light'].map(t => (
                <button
                  key={t}
                  onClick={() => setTheme(t)}
                  className={cn('flex-1 rounded-xl py-3 text-xs font-black uppercase tracking-wider transition-all',
                    theme === t ? 'bg-white text-black' : 'bg-white/5 text-white/50 hover:bg-white/10'
                  )}
                >
                  {t === 'dark' ? <><Moon size={14} className="inline mr-1" /> Dark</> : <><Sun size={14} className="inline mr-1" /> Light</>}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="text-xs uppercase tracking-wider text-white/40 font-black mb-3 block">Sound</label>
            <button
              onClick={() => setSoundEnabled(!soundEnabled)}
              className={cn('w-full rounded-xl py-3 text-xs font-black uppercase tracking-wider transition-all flex items-center justify-center gap-2',
                soundEnabled ? 'bg-[#00FF88]/15 text-[#00FF88]' : 'bg-white/5 text-white/40'
              )}
            >
              {soundEnabled ? <Volume2 size={14} /> : <VolumeX size={14} />}
              {soundEnabled ? 'Sound On' : 'Sound Off'}
            </button>
          </div>

          <div>
            <label className="text-xs uppercase tracking-wider text-white/40 font-black mb-3 block">Notifications</label>
            <div className="space-y-2">
              <button
                onClick={() => setNotificationsEnabled(!notificationsEnabled)}
                className={cn('w-full rounded-xl py-2.5 text-xs font-black uppercase tracking-wider transition-all flex items-center justify-center gap-2',
                  notificationsEnabled ? 'bg-[#00FF88]/15 text-[#00FF88]' : 'bg-white/5 text-white/40'
                )}
              >
                {notificationsEnabled ? <Bell size={14} /> : <BellOff size={14} />}
                {notificationsEnabled ? 'Notifications On' : 'Notifications Off'}
              </button>
              {notificationsEnabled && (
                <div className="flex gap-2">
                  <button
                    onClick={() => setChatNotifications(!chatNotifications)}
                    className={cn('flex-1 rounded-xl py-2 text-[10px] font-bold uppercase tracking-wider transition-all',
                      chatNotifications ? 'bg-white/10 text-white/70' : 'bg-white/5 text-white/25'
                    )}
                  >
                    Chat {chatNotifications ? 'On' : 'Off'}
                  </button>
                  <button
                    onClick={() => setRainNotifications(!rainNotifications)}
                    className={cn('flex-1 rounded-xl py-2 text-[10px] font-bold uppercase tracking-wider transition-all',
                      rainNotifications ? 'bg-white/10 text-white/70' : 'bg-white/5 text-white/25'
                    )}
                  >
                    Rain {rainNotifications ? 'On' : 'Off'}
                  </button>
                </div>
              )}
            </div>
          </div>

          <div>
            <label className="text-xs uppercase tracking-wider text-white/40 font-black mb-3 block">Default Bet ($)</label>
            <div className="relative">
              <span className="absolute left-4 top-1/2 -translate-y-1/2 text-white/40 font-bold">$</span>
              <input
                type="number"
                value={defaultBet}
                onChange={(e) => setDefaultBet(e.target.value)}
                min="0.01"
                step="0.01"
                className="w-full rounded-xl bg-black/40 border border-white/10 pl-8 pr-4 py-3 text-white font-mono text-sm focus:outline-none focus:border-white/25"
              />
            </div>
            <div className="text-[10px] text-white/25 mt-1">Default bet amount when starting a game</div>
          </div>
        </div>

        <button
          onClick={save}
          disabled={saving}
          className={cn('w-full rounded-2xl py-3.5 text-xs font-black uppercase tracking-[0.2em] transition-all',
            saved ? 'bg-[#00FF88] text-black' : 'bg-white/10 hover:bg-white/15 text-white'
          )}
        >
          {saving ? 'Saving...' : saved ? 'Saved!' : 'Save Settings'}
        </button>
      </motion.div>
    </div>
  );
};
