// SOLARA — shots: ?shot=1..4 fixed cameras. Each shot STAGES the scene —
// puts Kai in a car, packs traffic, starts missions, shows dialogue, sets
// wanted — not just a camera move. Written fresh from the R5-mirror spec.

import { S } from './config.js';
import { startMission, MISSIONS } from './missions.js';
import { spawnPlayerCar } from './vehicles.js';

// Move any ped standing within r of (x,z) far away, so a staged shot is
// never photobombed by a wandering citizen. Peds do not wander in shot
// mode (see main.js), so they stay where they are put.
function clearPedsNear(ctx, x, z, r) {
  for (const p of ctx.peds) {
    const dx = p.mesh.position.x - x;
    const dz = p.mesh.position.z - z;
    if (dx * dx + dz * dz < r * r) {
      p.homeX = x + 45 + Math.random() * 20;
      p.homeZ = z + 45 + Math.random() * 20;
      p.mesh.position.set(p.homeX, 0, p.homeZ);
    }
  }
}

export function applyShot(ctx, n) {
  const { scene, THREE, traffic, police, playerMesh } = ctx;
  S.shotMode = true;

  if (n === 1) {
    // start menu: keep the menu visible, camera over downtown looking east
    // at the street and the gold/teal skyscrapers.
    S.started = false;
    ctx.fixedCam = { pos: [-236, 9, 84], look: [-40, 26, -20] };
    return true;
  }

  S.started = true;

  if (n === 2) {
    // packed street: Kai in the red sports car, driving east on road z=64;
    // 8 traffic cars clustered tight ahead in both lanes, bumper-to-bumper.
    const car = spawnPlayerCar(scene, THREE, -55, 64, Math.PI / 2);
    S.inCar = true;
    S.car = car;
    S.px = -55; S.pz = 64; S.heading = Math.PI / 2;
    S.carSpeed = 14;
    car.speed = 14;
    playerMesh.visible = false;
    let placed = 0;
    for (const t of traffic) {
      if (placed >= 8) break;
      t.alongRoad = false;
      t.line = 64;
      t.lane = placed % 2 === 0 ? -5 : 5;
      t.pos = -30 + Math.floor(placed / 2) * 6;
      t.dir = 1;
      t.speed = 6;
      placed++;
    }
    clearPedsNear(ctx, -40, 64, 25);
    S.wanted = 1;
    ctx.fixedCam = { pos: [-64, 6, 78], look: [-20, 2, 64] };
    return true;
  }

  if (n === 3) {
    // Kai on foot at MO'S, mission 0 started, Lupe dialogue, wanted 2.
    S.inCar = false;
    S.px = -40; S.pz = -184; S.heading = Math.PI;
    playerMesh.position.set(S.px, 0, S.pz);
    playerMesh.rotation.y = S.heading;
    playerMesh.visible = true;
    startMission(0, (text, who) => ctx.showDialogue(text, who, 8));
    S.wanted = 2;
    clearPedsNear(ctx, -40, -184, 16);
    ctx.showDialogue(MISSIONS[0].lines[0], 'LUPE', 8);
    ctx.fixedCam = { pos: [-46, 1.7, -184], look: [-39, 1.25, -184] };
    return true;
  }

  if (n === 4) {
    // neon chase: mission 5 started, heli up at alt 26, wanted 3.
    S.inCar = false;
    S.px = -8; S.pz = -186; S.heading = Math.PI;
    playerMesh.position.set(S.px, 0, S.pz);
    playerMesh.rotation.y = S.heading;
    playerMesh.visible = true;
    S.missionIdx = 5;
    startMission(5, (text, who) => ctx.showDialogue(text, who, 8));
    police.heliAlt = 26;
    S.wanted = 3;
    clearPedsNear(ctx, -8, -186, 16);
    ctx.fixedCam = { pos: [36, 10, -220], look: [-12, 10, -176] };
    return true;
  }

  return false;
}
