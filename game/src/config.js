// SOLARA — config: world constants, districts, weapons, ranks, radio, crew
// and the shared game state S. Written fresh from the R5-mirror spec.

export const WORLD = {
  size: 640,
  roadGap: 64,
  roadWidth: 20,
  beachX: -268,
  oceanX: -300,
  blockSize: 50,
};

export const DISTRICTS = [
  { name: 'MARINA BAY', x: -210, z: -210, r: 90, color: '#4fc3f7', grip: 55 },
  { name: 'OLD PORT', x: -210, z: 210, r: 90, color: '#ffb74d', grip: 45 },
  { name: 'DOWNTOWN', x: 0, z: 0, r: 110, color: '#ff5252', grip: 30 },
  { name: 'NEON ROW', x: 0, z: -190, r: 80, color: '#e040fb', grip: 35 },
  { name: 'PALM HEIGHTS', x: 190, z: -190, r: 90, color: '#69f0ae', grip: 50 },
  { name: 'DOCKSIDE', x: 190, z: 190, r: 90, color: '#ffd54f', grip: 40 },
  { name: 'SOLARA BEACH', x: -280, z: 0, r: 90, color: '#fff176', grip: 50 },
];

export const WEAPONS = [
  { name: 'VESPER', kind: 'pistol', mag: 12, dmg: 34, rate: 0.16, range: 90, auto: false },
  { name: 'JACKAL', kind: 'smg', mag: 30, dmg: 16, rate: 0.09, range: 70, auto: true },
  { name: 'LONGSHOT', kind: 'rifle', mag: 8, dmg: 80, rate: 0.70, range: 160, auto: false },
  { name: 'RIOT', kind: 'shotgun', mag: 6, dmg: 22, rate: 0.80, range: 40, auto: false },
  { name: 'FISTS', kind: 'melee', mag: Infinity, dmg: 12, rate: 0.35, range: 3, auto: true },
];

export const RANKS = ['ROOKIE', 'RUNNER', 'HUSTLER', 'FIXER'];

export function rankFor(jobs) {
  if (jobs >= 8) return 'FIXER';
  if (jobs >= 5) return 'HUSTLER';
  if (jobs >= 2) return 'RUNNER';
  return 'ROOKIE';
}

export const RADIO = [
  { name: 'PUERTO 88.3', style: 'latin gold', wave: 'triangle', bpm: 112 },
  { name: 'CELESTE 98.1', style: 'synthwave', wave: 'sawtooth', bpm: 96 },
  { name: 'SOLARA 98.3', style: 'daytime', wave: 'sine', bpm: 120 },
  { name: 'NEON 101.5', style: 'night drive', wave: 'square', bpm: 104 },
];

export const CREW = {
  MARA: { key: 'KeyZ', power: 'GHOST', desc: '-1 wanted star', cd: 90 },
  SULLY: { key: 'KeyX', power: 'PIT CREW', desc: 'full repair in car', cd: 60 },
  KIKI: { key: 'KeyC', power: 'LOOKOUT', desc: 'patrols revealed 20s', cd: 60 },
};

// Shared state — exact fields, exact initial values (spec).
export const S = {
  time: 0,
  paused: false,
  mapOpen: false,
  started: false,
  px: -40,
  pz: 60,
  heading: Math.PI * 0.75,
  speed: 0,
  health: 100,
  armour: 40,
  cash: 250,
  wanted: 0,
  evading: 0,
  seen: false,
  soundOn: true,
  dialogueUntil: 0,
  autopilot: false,
  jackedAt: -99,
  gripBonus: 0,
  shotMode: false,
  weaponIdx: 0,
  ammo: 12,
  reserve: 48,
  inCar: false,
  car: null,
  carSpeed: 0,
  missionIdx: 0,
  missionActive: false,
  missionTime: 0,
  missionStage: 0,
  missionHold: 0,
  jobsDone: 0,
  rank: 'ROOKIE',
  crewCd: { MARA: 0, SULLY: 0, KIKI: 0 },
  lookoutUntil: 0,
  station: 0,
  radioOn: true,
  waypoint: null,
  shotsFired: 0,
  hits: 0,
  carsJacked: 0,
  arrests: 0,
  message: '',
  messageUntil: 0,
  over: false,
};

export function setMessage(text, secs = 3) {
  S.message = text;
  S.messageUntil = S.time + secs;
}

export function districtAt(x, z) {
  for (const d of DISTRICTS) {
    const dx = x - d.x, dz = z - d.z;
    if (dx * dx + dz * dz < d.r * d.r) return d;
  }
  return null;
}

export function dist2(ax, az, bx, bz) {
  const dx = ax - bx, dz = az - bz;
  return dx * dx + dz * dz;
}
