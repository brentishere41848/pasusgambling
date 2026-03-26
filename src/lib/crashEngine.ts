export type CrashPhase = 'countdown' | 'running' | 'crashed';

export type CrashParticipant = {
  id: string;
  username: string;
  wager: number;
  status: 'pending' | 'active' | 'cashed_out' | 'crashed';
  autoCashoutAt?: number;
  payout?: number;
  isPlayer?: boolean;
  isSecondary?: boolean;
};

export type CrashOutcome = {
  id: number;
  wager: number;
  payout: number;
  multiplier: number;
  outcome: 'win' | 'loss';
  detail: string;
};

export type CrashSnapshot = {
  phase: CrashPhase;
  multiplier: number;
  crashPoint: number;
  history: number[];
  countdown: number;
  statusText: string;
  participants: CrashParticipant[];
  playerBet: CrashParticipant | null;
  playerSecondaryBet: CrashParticipant | null;
  playerOutcome: CrashOutcome | null;
};

const PREP_TIME_MS = 5000;
const BETWEEN_ROUNDS_MS = 1800;
const HISTORY_SIZE = 20;
type InternalPlayerBet = {
  username: string;
  wager: number;
  status: 'pending' | 'active' | 'cashed_out' | 'crashed';
  autoCashoutAt?: number;
  isSecondary?: boolean;
};

let roundCounter = 0;
let outcomeCounter = 0;
let phase: CrashPhase = 'countdown';
let multiplier = 1;
let crashPoint = 0;
let history: number[] = [];
let roundStartedAt = 0;
let countdownEndsAt = Date.now() + PREP_TIME_MS;
let playerBet: InternalPlayerBet | null = null;
let playerSecondaryBet: InternalPlayerBet | null = null;
let playerOutcome: CrashOutcome | null = null;
const subscribers = new Set<(snapshot: CrashSnapshot) => void>();
let tickInterval: number | null = null;
let phaseTimeout: number | null = null;



function randomBetween(min: number, max: number) {
  return Math.random() * (max - min) + min;
}

function roundNumber(value: number) {
  return Number(value.toFixed(2));
}

function toSnapshot(): CrashSnapshot {
  const countdown = phase === 'countdown' ? Math.max(0, roundNumber((countdownEndsAt - Date.now()) / 1000)) : 0;
  const combinedParticipants: CrashParticipant[] = [];

  if (playerSecondaryBet) {
    combinedParticipants.unshift({
      id: 'player-secondary',
      username: playerSecondaryBet.username,
      wager: playerSecondaryBet.wager,
      status: playerSecondaryBet.status,
      isPlayer: true,
      isSecondary: true,
    });
  }
  if (playerBet) {
    combinedParticipants.unshift({
      id: 'player',
      username: playerBet.username,
      wager: playerBet.wager,
      status: playerBet.status,
      isPlayer: true,
    });
  }

  return {
    phase,
    multiplier,
    crashPoint,
    history,
    countdown,
    statusText:
      phase === 'countdown'
        ? playerBet?.status === 'pending'
          ? 'Bet locked for next round'
          : `Next round in ${Math.ceil(countdown)}s`
        : phase === 'running'
          ? 'Crash round live'
          : `Crashed at ${crashPoint.toFixed(2)}x`,
    participants: combinedParticipants,
    playerBet: playerBet
      ? {
          id: 'player',
          username: playerBet.username,
          wager: playerBet.wager,
          status: playerBet.status,
          autoCashoutAt: playerBet.autoCashoutAt,
          isPlayer: true,
        }
      : null,
    playerSecondaryBet: playerSecondaryBet
      ? {
          id: 'player-secondary',
          username: playerSecondaryBet.username,
          wager: playerSecondaryBet.wager,
          status: playerSecondaryBet.status,
          autoCashoutAt: playerSecondaryBet.autoCashoutAt,
          isPlayer: true,
          isSecondary: true,
        }
      : null,
    playerOutcome,
  };
}

function emit() {
  const snapshot = toSnapshot();
  subscribers.forEach((subscriber) => subscriber(snapshot));
}

function clearTimers() {
  if (tickInterval !== null) {
    window.clearInterval(tickInterval);
    tickInterval = null;
  }
  if (phaseTimeout !== null) {
    window.clearTimeout(phaseTimeout);
    phaseTimeout = null;
  }
}

function checkAutoCashout(participant: InternalPlayerBet): InternalPlayerBet {
  if (participant.status !== 'active' || !participant.autoCashoutAt) {
    return participant;
  }
  if (multiplier >= participant.autoCashoutAt) {
    return { ...participant, status: 'cashed_out' };
  }
  return participant;
}

function startCountdown() {
  clearTimers();
  phase = 'countdown';
  multiplier = 1;
  countdownEndsAt = Date.now() + PREP_TIME_MS;
  if (playerBet?.status === 'pending') {
    playerBet = checkAutoCashout(playerBet);
  } else {
    playerBet = null;
  }
  if (playerSecondaryBet?.status === 'pending') {
    playerSecondaryBet = checkAutoCashout(playerSecondaryBet);
  } else {
    playerSecondaryBet = null;
  }
  emit();

  tickInterval = window.setInterval(() => {
    emit();
    if (Date.now() >= countdownEndsAt) {
      startRound();
    }
  }, 100);
}

function finalizeCrash() {
  clearTimers();
  phase = 'crashed';
  multiplier = crashPoint;
  history = [roundNumber(crashPoint), ...history].slice(0, HISTORY_SIZE);

  if (playerBet?.status === 'active') {
    playerBet = { ...playerBet, status: 'crashed' };
    playerOutcome = {
      id: ++outcomeCounter,
      wager: playerBet.wager,
      payout: 0,
      multiplier: 0,
      outcome: 'loss',
      detail: `Crashed at ${crashPoint.toFixed(2)}x`,
    };
  } else {
    playerBet = null;
  }

  if (playerSecondaryBet?.status === 'active') {
    playerSecondaryBet = { ...playerSecondaryBet, status: 'crashed' };
  } else {
    playerSecondaryBet = null;
  }

  emit();
  phaseTimeout = window.setTimeout(startCountdown, BETWEEN_ROUNDS_MS);
}

function startRound() {
  clearTimers();
  phase = 'running';
  roundCounter += 1;
  roundStartedAt = Date.now();
  const houseEdge = 0.22;
  const r = Math.random();
  crashPoint = Math.max(1.01, Math.floor(100 / (1 - r)) / 100) * (1 - houseEdge);
  playerOutcome = null;

  if (playerBet?.status === 'pending') {
    playerBet = { ...playerBet, status: 'active' };
  }
  if (playerSecondaryBet?.status === 'pending') {
    playerSecondaryBet = { ...playerSecondaryBet, status: 'active' };
  }
  emit();

  tickInterval = window.setInterval(() => {
    const elapsed = (Date.now() - roundStartedAt) / 1000;
    const nextMultiplier = roundNumber(Math.pow(Math.E, 0.06 * elapsed));

    let playerCashedOut = false;
    let secondaryCashedOut = false;

    if (playerBet) {
      playerBet = checkAutoCashout(playerBet);
      if (playerBet.status === 'cashed_out' && playerCashedOut === false) {
        playerCashedOut = true;
        const payout = Math.round(playerBet.wager * playerBet.autoCashoutAt!);
        playerOutcome = {
          id: ++outcomeCounter,
          wager: playerBet.wager,
          payout,
          multiplier: playerBet.autoCashoutAt!,
          outcome: 'win',
          detail: `Cashed out at ${playerBet.autoCashoutAt!.toFixed(2)}x`,
        };
      }
    }

    if (playerSecondaryBet) {
      playerSecondaryBet = checkAutoCashout(playerSecondaryBet);
      if (playerSecondaryBet.status === 'cashed_out' && secondaryCashedOut === false) {
        secondaryCashedOut = true;
      }
    }

    if (nextMultiplier >= crashPoint) {
      finalizeCrash();
      return;
    }

    multiplier = nextMultiplier;
    emit();
  }, 50);
}

startCountdown();

export function subscribeToCrashEngine(subscriber: (snapshot: CrashSnapshot) => void) {
  subscribers.add(subscriber);
  subscriber(toSnapshot());
  return () => {
    subscribers.delete(subscriber);
  };
}

export function placeCrashBet(username: string, wager: number, autoCashoutAt?: number) {
  if (phase !== 'countdown' || playerBet) {
    return false;
  }
  playerBet = { username, wager, status: 'pending', autoCashoutAt };
  emit();
  return true;
}

export function placeSecondaryCrashBet(username: string, wager: number, autoCashoutAt?: number) {
  if (phase !== 'countdown' || playerSecondaryBet || playerBet?.wager === wager) {
    return false;
  }
  playerSecondaryBet = { username, wager, status: 'pending', autoCashoutAt, isSecondary: true };
  emit();
  return true;
}

export function cashOutCrashBet() {
  if (phase !== 'running' || !playerBet || playerBet.status !== 'active') {
    return null;
  }

  const payout = Math.round(playerBet.wager * multiplier);
  const outcome: CrashOutcome = {
    id: ++outcomeCounter,
    wager: playerBet.wager,
    payout,
    multiplier,
    outcome: 'win',
    detail: `Cashed out at ${multiplier.toFixed(2)}x`,
  };

  playerBet = { ...playerBet, status: 'cashed_out' };
  playerOutcome = outcome;
  emit();
  return outcome;
}

export function cashOutSecondaryCrashBet() {
  if (phase !== 'running' || !playerSecondaryBet || playerSecondaryBet.status !== 'active') {
    return null;
  }

  const payout = Math.round(playerSecondaryBet.wager * multiplier);
  playerSecondaryBet = { ...playerSecondaryBet, status: 'cashed_out' };
  emit();
  return payout;
}

export function acknowledgeCrashOutcome(id: number) {
  if (playerOutcome?.id === id) {
    if (!playerBet || playerBet.status !== 'active') {
      playerBet = null;
    }
    if (!playerSecondaryBet || playerSecondaryBet.status !== 'active') {
      playerSecondaryBet = null;
    }
    playerOutcome = null;
    emit();
  }
}

export function getCrashSnapshot() {
  return toSnapshot();
}
