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
    await fetch('/api/activity/bets', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(input),
    });
  } catch {
    return;
  }
}
