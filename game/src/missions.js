// SOLARA — missions: 8 jobs, type-based completion, start marker, beacon,
// two-way dialogue. Written fresh from the R5-mirror spec.

import { S, rankFor, setMessage } from './config.js';

export const MISSIONS = [
  { name: 'First Fix', giver: 'LUPE', type: 'goto', target: [-40, -192], time: 180, reward: 400,
    brief: "Meet Lupe at MO'S on Neon Row. She has your first job.",
    lines: ["Kai: Lupe, I'm here. What's the job?", "Lupe: Easy one, cariño. Just show up and listen. The city talks if you walk it."] },
  { name: 'Tow Job', giver: 'SULLY', type: 'driveTo', target: [192, 192], time: 240, reward: 650,
    brief: 'Sully needs a car moved to Dockside. Grab wheels and drive it there.',
    lines: ["Sully: That coupe at the corner? It needs to be at Dockside. No scratches, yeah?", "Kai: No scratches. You got it, Sully."] },
  { name: "Marco's Run", giver: 'MARCO', type: 'driveTo', target: [-192, 192], time: 210, reward: 800,
    brief: "Marco's package goes to Old Port. Drive it there, no scratches.",
    lines: ["Marco: Package goes to Old Port. You don't open it. You don't ask.", "Kai: I drive. That's all I do."] },
  { name: 'The Ledger', giver: 'BRANDT', type: 'hold', target: [64, 64], time: 240, reward: 1100,
    brief: "Brandt's ledger is in the Downtown office. Hold the spot 5s to lift it.",
    lines: ["Brandt: The ledger sits in that office. Hold the spot, lift it, walk out.", "Kai: Five seconds. In and out."] },
  { name: "Aurora's Light", giver: 'AURORA', type: 'goto', target: [-262, -40], time: 200, reward: 900,
    brief: 'Aurora waits on the beach boardwalk. Walk the sand, hear her out.',
    lines: ["Aurora: The ocean keeps what the city forgets, Kai.", "Kai: Then let's hear what it has to say."] },
  { name: 'Hot Wheels', giver: 'LUPE', type: 'carjack', target: [0, -128], time: 180, reward: 1000,
    brief: 'Lupe wants a fresh ride. Jack any car on Neon Row and bring it to the mark.',
    lines: ["Lupe: I need fresh wheels, and I need them now. Neon Row. Any car.", "Kai: One hot car, coming up."] },
  { name: 'Heat Wave', giver: 'SULLY', type: 'escape', target: [256, -192], time: 300, reward: 1400,
    brief: "The heat is on. Lose the cops, then reach Sully's hideout in Palm Heights.",
    lines: ["Sully: Heat's on you, kid. Shake them first — then come to Palm Heights.", "Kai: They can't catch what they can't see."] },
  { name: 'The Solara Job', giver: 'BRANDT', type: 'finale', target: [-128, 0], time: 360, reward: 5000,
    brief: 'The big one. Hold the bank door 5s, then drive the getaway to the Marina.',
    lines: ["Brandt: The bank. Five seconds on the door, then the Marina. This is the one, Kai.", "Kai: The Solara Job. Let's take the whole city."] },
];

// Every job starts at MO'S — the safehouse marker.
export const MISSION_START = [-40, -192];

export function currentMission() {
  return MISSIONS[S.missionIdx] || null;
}

export function currentTarget() {
  const m = currentMission();
  if (!m) return null;
  if (m.type === 'finale' && S.missionStage === 1) return [-192, -192];
  return m.target;
}

export function createMissionVisuals(scene, THREE) {
  // start marker: big yellow cylinder at the current mission's start point
  const marker = new THREE.Mesh(
    new THREE.CylinderGeometry(3.2, 3.2, 1.2, 24),
    new THREE.MeshBasicMaterial({ color: 0xffd600, transparent: true, opacity: 0.8 })
  );
  marker.position.set(MISSION_START[0], 0.6, MISSION_START[1]);
  scene.add(marker);
  // beacon: pulsing yellow ring + vertical beam at the current target
  const ring = new THREE.Mesh(
    new THREE.RingGeometry(4.5, 6, 32),
    new THREE.MeshBasicMaterial({ color: 0xffd600, transparent: true, opacity: 0.85, side: THREE.DoubleSide })
  );
  ring.rotation.x = -Math.PI / 2;
  ring.position.set(0, 0.15, 0);
  scene.add(ring);
  const beam = new THREE.Mesh(
    new THREE.CylinderGeometry(0.9, 0.9, 60, 12, 1, true),
    new THREE.MeshBasicMaterial({ color: 0xffd600, transparent: true, opacity: 0.35, side: THREE.DoubleSide, depthWrite: false })
  );
  beam.position.set(0, 30, 0);
  scene.add(beam);
  return { marker, ring, beam };
}

export function startMission(idx, dialogueCb) {
  const m = MISSIONS[idx];
  if (!m) return false;
  S.missionIdx = idx;
  S.missionActive = true;
  S.missionTime = m.time;
  S.missionStage = 0;
  S.missionHold = 0;
  setMessage(m.giver + ': ' + m.name + ' — ' + m.brief, 5);
  if (dialogueCb) dialogueCb(m.lines[0], m.giver, 6);
  return true;
}

export function completeMission() {
  const m = currentMission();
  if (!m) return;
  S.cash += m.reward;
  S.jobsDone++;
  S.rank = rankFor(S.jobsDone);
  S.missionActive = false;
  S.missionStage = 0;
  S.missionHold = 0;
  setMessage('JOB DONE — +$' + m.reward + '  •  ' + S.jobsDone + '/8 jobs  •  Rank: ' + S.rank, 5);
  S.missionIdx = Math.min(S.missionIdx + 1, MISSIONS.length - 1);
  if (S.jobsDone >= 8) {
    setMessage('ALL 8 JOBS DONE — YOU ARE THE FIXER OF SOLARA', 8);
  }
}

export function failMission(reason) {
  S.missionActive = false;
  S.missionStage = 0;
  S.missionHold = 0;
  setMessage('JOB FAILED — ' + reason + '. Talk to the crew at MO\'S to retry.', 5);
}

export function updateMissions(ctx, dt) {
  const { marker, ring, beam, dialogueCb } = ctx.missions;
  const m = currentMission();
  if (!m) return;

  // marker visible only when no mission is running
  marker.visible = !S.missionActive;
  // pulse the marker
  const pulse = 1 + Math.sin(S.time * 3) * 0.12;
  marker.scale.set(pulse, 1, pulse);

  const t = currentTarget();
  if (t) {
    ring.position.set(t[0], 0.15, t[1]);
    beam.position.set(t[0], 30, t[1]);
    const rp = 1 + Math.sin(S.time * 4) * 0.15;
    ring.scale.set(rp, rp, 1);
    ring.visible = true;
    beam.visible = true;
  } else {
    ring.visible = false;
    beam.visible = false;
  }

  if (!S.missionActive) return;

  S.missionTime -= dt;
  if (S.missionTime <= 0) {
    failMission('time ran out');
    return;
  }

  const dx = S.px - t[0];
  const dz = S.pz - t[1];
  const d = Math.hypot(dx, dz);
  const inCar = S.inCar;

  switch (m.type) {
    case 'goto':
      if (!inCar && d <= 7) completeMission();
      break;
    case 'driveTo':
      if (inCar && d <= 7) completeMission();
      break;
    case 'hold':
      if (!inCar && d <= 7) {
        S.missionHold += dt;
        if (S.missionHold >= 5) completeMission();
      } else {
        S.missionHold = Math.max(0, S.missionHold - dt * 2);
      }
      break;
    case 'carjack':
      if (inCar && d <= 7) completeMission();
      break;
    case 'escape':
      if (S.wanted === 0 && d <= 7) completeMission();
      break;
    case 'finale':
      if (S.missionStage === 0) {
        if (!inCar && d <= 7) {
          S.missionHold += dt;
          if (S.missionHold >= 5) {
            S.missionStage = 1;
            S.missionHold = 0;
            setMessage('Door held — NOW DRIVE to the Marina!', 4);
          }
        } else {
          S.missionHold = Math.max(0, S.missionHold - dt * 2);
        }
      } else if (inCar && d <= 7) {
        completeMission();
      }
      break;
  }

  // second dialogue line halfway through the first minute
  if (m.lines[1] && S.missionTime < m.time - 12 && !ctx.missions.secondLineShown) {
    ctx.missions.secondLineShown = true;
    if (dialogueCb) dialogueCb(m.lines[1], 'KAI', 6);
  }
  if (!S.missionActive) ctx.missions.secondLineShown = false;
}
