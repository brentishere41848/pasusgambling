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

  try {
    await apiFetch('/api/activity/bets', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        ...input,
        wager: Math.round(input.wager),
        payout: Math.round(input.payout),
      }),
    });
  } catch {
    return;
  }
}
import { apiFetch } from './api';
