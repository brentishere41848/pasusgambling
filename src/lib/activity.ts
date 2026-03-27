type LogBetActivityInput = {
  gameKey: string;
  wager: number;
  payout: number;
  multiplier: number;
  outcome: 'win' | 'loss' | 'push';
  detail?: string;
};

const SERVER_BLOCKED_GAME_ACTIVITY = new Set([
  'baccarat',
  'blackjack',
  'coinflip',
  'crash',
  'dice',
  'hilo',
  'keno',
  'limbo',
  'mines',
  'plinko',
  'roulette',
  'scratch',
  'slots',
  'wheel',
]);

export async function logBetActivity(input: LogBetActivityInput) {
  const normalizedGameKey = String(input.gameKey || '').trim().toLowerCase();
  if (SERVER_BLOCKED_GAME_ACTIVITY.has(normalizedGameKey)) {
    return;
  }

  const token = localStorage.getItem('pasus_auth_token');
  if (!token) {
    return;
  }

  const clientSeed = localStorage.getItem('pasus_client_seed') || '';
  const nonce = Number(localStorage.getItem('pasus_client_nonce') || 1);

  try {
    const response = await apiFetch('/api/activity/bets', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        ...input,
        gameKey: normalizedGameKey,
        wager: Math.round(input.wager),
        payout: Math.round(input.payout),
        clientSeed,
        nonce,
      }),
    });
    if (response.ok) {
      localStorage.setItem('pasus_client_nonce', String(nonce + 1));
      window.dispatchEvent(new CustomEvent('pasus:bet-recorded'));
    }
  } catch {
    return;
  }
}
import { apiFetch } from './api';
