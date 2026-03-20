import crypto from 'node:crypto';

export type CaseBattleFormatKey = '1v1' | '1v1v1' | '1v1v1v1' | '2v2' | '2v2v2';
export type CaseBattleStatus = 'waiting' | 'rolling' | 'completed';

export type CaseBattleItem = {
  id: string;
  name: string;
  value: number;
  image: string;
  rarity: 'consumer' | 'industrial' | 'mil-spec' | 'restricted' | 'classified' | 'covert';
  weight: number;
};

export type CaseBattleCase = {
  id: string;
  name: string;
  price: number;
  image: string;
  accent: string;
  items: CaseBattleItem[];
};

export type CaseBattleRoundDrop = {
  roundIndex: number;
  caseId: string;
  itemId: string;
  itemName: string;
  itemImage: string;
  itemValue: number;
  rarity: CaseBattleItem['rarity'];
};

export type CaseBattleResolvedPlayer = {
  playerId: number;
  userId: number | null;
  username: string;
  avatarUrl: string | null;
  isBot: boolean;
  slotIndex: number;
  teamIndex: number;
  paidAmount: number;
  totalValue: number;
  visibleValue: number;
  drops: CaseBattleRoundDrop[];
};

export type CaseBattleResolvedState = {
  winningTeamIndexes: number[];
  winningScore: number;
  standings: Array<{
    teamIndex: number;
    totalValue: number;
    players: number[];
  }>;
};

export const CASE_BATTLE_REVEAL_MS = 2200;

const botNames = [
  'VoltByte',
  'CrateFox',
  'MintRogue',
  'CaseNova',
  'DropPilot',
  'OrbitSkin',
  'NeonCrate',
  'LuckyServo',
  'GhostPull',
  'Jackbot',
];

export const CASE_BATTLE_FORMATS: Array<{
  key: CaseBattleFormatKey;
  label: string;
  slots: number;
  teamLabels: string[];
}> = [
  { key: '1v1', label: '1v1', slots: 2, teamLabels: ['Alpha', 'Bravo'] },
  { key: '1v1v1', label: '1v1v1', slots: 3, teamLabels: ['Alpha', 'Bravo', 'Charlie'] },
  { key: '1v1v1v1', label: '1v1v1v1', slots: 4, teamLabels: ['Alpha', 'Bravo', 'Charlie', 'Delta'] },
  { key: '2v2', label: '2v2', slots: 4, teamLabels: ['Alpha', 'Bravo'] },
  { key: '2v2v2', label: '2v2v2', slots: 6, teamLabels: ['Alpha', 'Bravo', 'Charlie'] },
];

export const CASE_BATTLE_CASES: CaseBattleCase[] = [
  {
    id: 'neon-district',
    name: 'Neon District',
    price: 120,
    image: '/assets/case-battles/case-neon-district.svg',
    accent: '#32ffb5',
    items: [
      { id: 'plasma-card', name: 'Plasma Card', value: 70, image: '/assets/case-battles/item-consumer.svg', rarity: 'consumer', weight: 42 },
      { id: 'mint-chip', name: 'Mint Chip', value: 95, image: '/assets/case-battles/item-industrial.svg', rarity: 'industrial', weight: 28 },
      { id: 'laser-tag', name: 'Laser Tag', value: 130, image: '/assets/case-battles/item-milspec.svg', rarity: 'mil-spec', weight: 18 },
      { id: 'arc-visor', name: 'Arc Visor', value: 220, image: '/assets/case-battles/item-restricted.svg', rarity: 'restricted', weight: 9 },
      { id: 'chrome-pulse', name: 'Chrome Pulse', value: 440, image: '/assets/case-battles/item-classified.svg', rarity: 'classified', weight: 2.7 },
      { id: 'orbit-crown', name: 'Orbit Crown', value: 980, image: '/assets/case-battles/item-covert.svg', rarity: 'covert', weight: 0.3 },
    ],
  },
  {
    id: 'royal-vault',
    name: 'Royal Vault',
    price: 260,
    image: '/assets/case-battles/case-royal-vault.svg',
    accent: '#f7b445',
    items: [
      { id: 'crown-card', name: 'Crown Card', value: 150, image: '/assets/case-battles/item-consumer.svg', rarity: 'consumer', weight: 40 },
      { id: 'gilded-chip', name: 'Gilded Chip', value: 210, image: '/assets/case-battles/item-industrial.svg', rarity: 'industrial', weight: 27 },
      { id: 'vault-key', name: 'Vault Key', value: 320, image: '/assets/case-battles/item-milspec.svg', rarity: 'mil-spec', weight: 18 },
      { id: 'royal-signal', name: 'Royal Signal', value: 520, image: '/assets/case-battles/item-restricted.svg', rarity: 'restricted', weight: 10 },
      { id: 'sun-glyph', name: 'Sun Glyph', value: 980, image: '/assets/case-battles/item-classified.svg', rarity: 'classified', weight: 4.5 },
      { id: 'king-maker', name: 'King Maker', value: 2400, image: '/assets/case-battles/item-covert.svg', rarity: 'covert', weight: 0.5 },
    ],
  },
  {
    id: 'deep-freeze',
    name: 'Deep Freeze',
    price: 180,
    image: '/assets/case-battles/case-deep-freeze.svg',
    accent: '#7fd5ff',
    items: [
      { id: 'glacier-chip', name: 'Glacier Chip', value: 110, image: '/assets/case-battles/item-consumer.svg', rarity: 'consumer', weight: 42 },
      { id: 'ice-badge', name: 'Ice Badge', value: 150, image: '/assets/case-battles/item-industrial.svg', rarity: 'industrial', weight: 27 },
      { id: 'polar-scope', name: 'Polar Scope', value: 220, image: '/assets/case-battles/item-milspec.svg', rarity: 'mil-spec', weight: 18 },
      { id: 'frost-edge', name: 'Frost Edge', value: 360, image: '/assets/case-battles/item-restricted.svg', rarity: 'restricted', weight: 9.5 },
      { id: 'aurora-core', name: 'Aurora Core', value: 760, image: '/assets/case-battles/item-classified.svg', rarity: 'classified', weight: 3.9 },
      { id: 'zero-point', name: 'Zero Point', value: 1680, image: '/assets/case-battles/item-covert.svg', rarity: 'covert', weight: 0.6 },
    ],
  },
  {
    id: 'ember-rush',
    name: 'Ember Rush',
    price: 90,
    image: '/assets/case-battles/case-ember-rush.svg',
    accent: '#ff7b54',
    items: [
      { id: 'spark-chip', name: 'Spark Chip', value: 52, image: '/assets/case-battles/item-consumer.svg', rarity: 'consumer', weight: 43 },
      { id: 'ember-pass', name: 'Ember Pass', value: 78, image: '/assets/case-battles/item-industrial.svg', rarity: 'industrial', weight: 28 },
      { id: 'flare-core', name: 'Flare Core', value: 115, image: '/assets/case-battles/item-milspec.svg', rarity: 'mil-spec', weight: 17.5 },
      { id: 'heat-sigil', name: 'Heat Sigil', value: 190, image: '/assets/case-battles/item-restricted.svg', rarity: 'restricted', weight: 9 },
      { id: 'phoenix-burst', name: 'Phoenix Burst', value: 390, image: '/assets/case-battles/item-classified.svg', rarity: 'classified', weight: 2.9 },
      { id: 'solar-drake', name: 'Solar Drake', value: 860, image: '/assets/case-battles/item-covert.svg', rarity: 'covert', weight: 0.6 },
    ],
  },
];

const casesById = new Map(CASE_BATTLE_CASES.map((entry) => [entry.id, entry]));

export function normalizeCaseBattleFormat(value: unknown): CaseBattleFormatKey | null {
  const normalized = String(value || '').trim() as CaseBattleFormatKey;
  return CASE_BATTLE_FORMATS.some((entry) => entry.key === normalized) ? normalized : null;
}

export function getCaseBattleFormat(formatKey: CaseBattleFormatKey) {
  return CASE_BATTLE_FORMATS.find((entry) => entry.key === formatKey)!;
}

export function getCaseBattleTeamLayout(formatKey: CaseBattleFormatKey) {
  switch (formatKey) {
    case '1v1':
      return [0, 1];
    case '1v1v1':
      return [0, 1, 2];
    case '1v1v1v1':
      return [0, 1, 2, 3];
    case '2v2':
      return [0, 0, 1, 1];
    case '2v2v2':
      return [0, 0, 1, 1, 2, 2];
  }
}

export function getCaseDefinition(caseId: string) {
  return casesById.get(caseId) || null;
}

export function normalizeCaseSelection(input: unknown) {
  if (!Array.isArray(input)) {
    return [];
  }

  return input
    .map((entry) => String(entry || '').trim())
    .filter((entry) => casesById.has(entry))
    .slice(0, 8);
}

export function getCaseSelectionPrice(caseIds: string[]) {
  return caseIds.reduce((sum, caseId) => sum + (casesById.get(caseId)?.price || 0), 0);
}

function randomFraction(seed: string) {
  const hex = crypto.createHash('sha256').update(seed).digest('hex').slice(0, 13);
  const numerator = parseInt(hex, 16);
  return numerator / 0x1fffffffffffff;
}

export function generateCaseBattleServerSeed() {
  return crypto.randomBytes(32).toString('hex');
}

export function hashCaseBattleServerSeed(serverSeed: string) {
  return crypto.createHash('sha256').update(serverSeed).digest('hex');
}

export function createBattlePublicSeed() {
  return crypto.randomBytes(8).toString('hex');
}

export function resolveBattleDrop(serverSeed: string, publicSeed: string, battleId: number, slotIndex: number, roundIndex: number, caseId: string) {
  const caseDefinition = casesById.get(caseId);
  if (!caseDefinition) {
    throw new Error(`Unknown case "${caseId}"`);
  }

  const totalWeight = caseDefinition.items.reduce((sum, item) => sum + item.weight, 0);
  const roll = randomFraction(`${serverSeed}:${publicSeed}:${battleId}:${slotIndex}:${roundIndex}:${caseId}`) * totalWeight;
  let cursor = 0;

  for (const item of caseDefinition.items) {
    cursor += item.weight;
    if (roll <= cursor) {
      return item;
    }
  }

  return caseDefinition.items[caseDefinition.items.length - 1];
}

export function getBotProfile(index: number) {
  const name = botNames[index % botNames.length];
  const suffix = 100 + ((index * 17) % 900);
  const username = `${name}${suffix}`;
  return {
    username,
    avatarUrl: `https://api.dicebear.com/9.x/bottts-neutral/svg?seed=${encodeURIComponent(username)}`,
  };
}

export function getBattleVisibleRounds(startedAt: string | null, now = Date.now()) {
  if (!startedAt) {
    return 0;
  }

  const started = new Date(startedAt).getTime();
  if (!Number.isFinite(started) || now <= started) {
    return 0;
  }

  return Math.max(0, Math.floor((now - started) / CASE_BATTLE_REVEAL_MS) + 1);
}

export function resolveCaseBattleState(
  formatKey: CaseBattleFormatKey,
  players: CaseBattleResolvedPlayer[],
  totalRounds: number
): CaseBattleResolvedState {
  const teamTotals = new Map<number, { totalValue: number; players: number[] }>();

  for (const player of players) {
    const existing = teamTotals.get(player.teamIndex) || { totalValue: 0, players: [] };
    existing.totalValue += player.totalValue;
    existing.players.push(player.playerId);
    teamTotals.set(player.teamIndex, existing);
  }

  const standings = [...teamTotals.entries()]
    .map(([teamIndex, value]) => ({
      teamIndex,
      totalValue: value.totalValue,
      players: value.players,
    }))
    .sort((left, right) => right.totalValue - left.totalValue || left.teamIndex - right.teamIndex);

  const winningScore = standings[0]?.totalValue || 0;
  const winningTeamIndexes = standings
    .filter((entry) => entry.totalValue === winningScore)
    .map((entry) => entry.teamIndex);

  return {
    winningTeamIndexes,
    winningScore,
    standings,
  };
}
