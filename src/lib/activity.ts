type LogBetActivityInput = {
  gameKey: string;
  wager: number;
  payout: number;
  multiplier: number;
  outcome: 'win' | 'loss' | 'push';
  detail?: string;
};

export async function logBetActivity(input: LogBetActivityInput) {
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
