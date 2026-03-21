export type CrashPhase = 'countdown' | 'running' | 'crashed';

export type CrashParticipant = {
  id: string;
  username: string;
  wager: number;
  status: 'pending' | 'active' | 'cashed_out' | 'crashed';
  autoCashoutAt?: number;
  payout?: number;
  isPlayer?: boolean;
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
  playerOutcome: CrashOutcome | null;
};

const PREP_TIME_MS = 5000;
const BETWEEN_ROUNDS_MS = 1800;
const BOT_NAMES = [
  'PasusRain',
  'LuckyAce',
  'MinesOnly',
  'CrashPilot',
  'HighRoller',
  'BetStorm',
  'RubyRush',
  'BlueChip',
  'TopSpin',
  'GhostCash',
];

type InternalPlayerBet = {
  username: string;
  wager: number;
  status: 'pending' | 'active' | 'cashed_out' | 'crashed';
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
let playerOutcome: CrashOutcome | null = null;
let botParticipants: CrashParticipant[] = [];
const subscribers = new Set<(snapshot: CrashSnapshot) => void>();
let tickInterval: number | null = null;
let phaseTimeout: number | null = null;

function randomBetween(min: number, max: number) {
  return Math.random() * (max - min) + min;
}

function roundNumber(value: number) {
  return Number(value.toFixed(2));
}

function createBotParticipants() {
  const names = [...BOT_NAMES].sort(() => Math.random() - 0.5).slice(0, 5 + Math.floor(Math.random() * 4));
  return names.map((username, index) => {
    const autoCashoutRoll = Math.random();
    return {
      id: `bot-${roundCounter}-${index}`,
      username,
      wager: Math.round(randomBetween(8, 250)),
      status: 'pending' as const,
      autoCashoutAt: autoCashoutRoll > 0.2 ? roundNumber(randomBetween(1.15, 4.8)) : undefined,
    };
  });
}

function toSnapshot(): CrashSnapshot {
  const countdown = phase === 'countdown' ? Math.max(0, roundNumber((countdownEndsAt - Date.now()) / 1000)) : 0;
  const combinedParticipants = [...botParticipants];

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
          isPlayer: true,
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

function startCountdown() {
  clearTimers();
  phase = 'countdown';
  multiplier = 1;
  countdownEndsAt = Date.now() + PREP_TIME_MS;
  botParticipants = createBotParticipants();
  botParticipants.forEach((participant) => {
    participant.status = 'pending';
  });
  if (playerBet?.status === 'pending') {
    playerBet.status = 'pending';
  } else {
    playerBet = null;
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
  history = [roundNumber(crashPoint), ...history].slice(0, 8);

  botParticipants = botParticipants.map((participant) =>
    participant.status === 'active'
      ? { ...participant, status: 'crashed' as const }
      : participant
  );

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

  botParticipants = botParticipants.map((participant) => ({ ...participant, status: 'active' }));
  if (playerBet?.status === 'pending') {
    playerBet = { ...playerBet, status: 'active' };
  }
  emit();

  tickInterval = window.setInterval(() => {
    const elapsed = (Date.now() - roundStartedAt) / 1000;
    const nextMultiplier = roundNumber(Math.pow(Math.E, 0.06 * elapsed));

    botParticipants = botParticipants.map((participant) => {
      if (participant.status !== 'active' || !participant.autoCashoutAt) {
        return participant;
      }
      if (nextMultiplier >= participant.autoCashoutAt) {
        return {
          ...participant,
          status: 'cashed_out',
          payout: Math.round(participant.wager * participant.autoCashoutAt),
        };
      }
      return participant;
    });

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

export function placeCrashBet(username: string, wager: number) {
  if (phase !== 'countdown' || playerBet) {
    return false;
  }
  playerBet = { username, wager, status: 'pending' };
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

export function acknowledgeCrashOutcome(id: number) {
  if (playerOutcome?.id === id) {
    if (!playerBet || playerBet.status !== 'active') {
      playerBet = null;
    }
    playerOutcome = null;
    emit();
  }
}

export function getCrashSnapshot() {
  return toSnapshot();
}
