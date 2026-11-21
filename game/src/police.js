// SOLARA — police: cruisers, officers, helicopter with a live searchlight
// beam computed from the heli lamp position every frame, roadblocks at 3+.
// Written fresh from the R5-mirror spec.

import { S, setMessage } from './config.js';
import { makeCarMesh } from './vehicles.js';

function makeCruiser(THREE) {
  const g = makeCarMesh(THREE, 0x1a1a1a);
  const barMat = new THREE.MeshBasicMaterial({ color: 0xff1744 });
  const barMat2 = new THREE.MeshBasicMaterial({ color: 0x2979ff });
  const bar1 = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.18, 0.3), barMat);
  bar1.position.set(-0.4, 1.75, -0.2);
  g.add(bar1);
  const bar2 = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.18, 0.3), barMat2);
  bar2.position.set(0.4, 1.75, -0.2);
  g.add(bar2);
  g.userData.bar1 = bar1;
  g.userData.bar2 = bar2;
  return g;
}

function makeOfficer(THREE) {
  const g = new THREE.Group();
  const body = new THREE.Mesh(
    new THREE.CylinderGeometry(0.45, 0.55, 1.6, 8),
    new THREE.MeshLambertMaterial({ color: 0x0d47a1 })
  );
  body.position.y = 1.3;
  g.add(body);
  const head = new THREE.Mesh(new THREE.SphereGeometry(0.4, 10, 8), new THREE.MeshLambertMaterial({ color: 0xffcc9e }));
  head.position.y = 2.45;
  g.add(head);
  const hat = new THREE.Mesh(new THREE.CylinderGeometry(0.42, 0.44, 0.16, 10), new THREE.MeshLambertMaterial({ color: 0x0d1b2a }));
  hat.position.y = 2.75;
  g.add(hat);
  g.scale.setScalar(1.5);
  return g;
}

function makeHeli(THREE) {
  const g = new THREE.Group();
  const white = new THREE.MeshLambertMaterial({ color: 0xffffff });
  const blue = new THREE.MeshLambertMaterial({ color: 0x1565c0 });
  const body = new THREE.Mesh(new THREE.BoxGeometry(2.4, 1.6, 5.2), white);
  body.position.y = 0;
  g.add(body);
  const stripe = new THREE.Mesh(new THREE.BoxGeometry(2.45, 0.4, 5.25), blue);
  stripe.position.y = -0.2;
  g.add(stripe);
  const glass = new THREE.Mesh(new THREE.BoxGeometry(2.0, 0.9, 1.4), new THREE.MeshLambertMaterial({ color: 0x0d2b45 }));
  glass.position.set(0, 0.25, 2.0);
  g.add(glass);
  const tail = new THREE.Mesh(new THREE.BoxGeometry(0.7, 0.7, 4.2), white);
  tail.position.set(0, 0.3, -4.4);
  g.add(tail);
  const fin = new THREE.Mesh(new THREE.BoxGeometry(0.2, 1.6, 1.2), blue);
  fin.position.set(0, 0.9, -6.2);
  g.add(fin);
  const rotor = new THREE.Mesh(new THREE.BoxGeometry(11, 0.12, 0.6), new THREE.MeshLambertMaterial({ color: 0x212121 }));
  rotor.position.y = 1.15;
  g.add(rotor);
  const rotor2 = rotor.clone();
  rotor2.rotation.y = Math.PI / 2;
  g.add(rotor2);
  g.userData.rotor = rotor;
  g.userData.rotor2 = rotor2;
  // spotlight lamp under the nose
  const lamp = new THREE.Mesh(new THREE.SphereGeometry(0.35, 10, 8), new THREE.MeshBasicMaterial({ color: 0xfffde7 }));
  lamp.position.set(0, -0.95, 2.2);
  g.add(lamp);
  g.userData.lamp = lamp;
  // beam cone: apex at the lamp, opening downward; pool on the ground
  const beamMat = new THREE.MeshBasicMaterial({ color: 0xfff9c4, transparent: true, opacity: 0.28, side: THREE.DoubleSide, depthWrite: false });
  const beam = new THREE.Mesh(new THREE.ConeGeometry(4.5, 1, 20, 1, true), beamMat);
  g.add(beam);
  g.userData.beam = beam;
  const poolMat = new THREE.MeshBasicMaterial({ color: 0xfffde7, transparent: true, opacity: 0.55, depthWrite: false });
  const pool = new THREE.Mesh(new THREE.CircleGeometry(4.5, 24), poolMat);
  pool.rotation.x = -Math.PI / 2;
  g.add(pool);
  g.userData.pool = pool;
  // searchlight that actually lights the ground pool
  const spot = new THREE.SpotLight(0xfff9c4, 900, 90, 0.35, 0.45, 1.2);
  g.add(spot);
  g.userData.spot = spot;
  const spotTarget = new THREE.Object3D();
  g.add(spotTarget);
  spot.target = spotTarget;
  g.userData.spotTarget = spotTarget;
  return g;
}

export function createPolice(scene, THREE) {
  const state = {
    cruisers: [],
    officers: [],
    heli: null,
    heliAlt: 26,
    heliAngle: 0,
    roadblocks: [],
    chaseT: 0,
  };
  return state;
}

function spawnCruiser(state, scene, THREE) {
  const mesh = makeCruiser(THREE);
  const a = Math.random() * Math.PI * 2;
  const x = S.px + Math.sin(a) * 45;
  const z = S.pz + Math.cos(a) * 45;
  mesh.position.set(x, 0, z);
  scene.add(mesh);
  state.cruisers.push({ mesh, speed: 0, sirenT: Math.random() * 2 });
}

function spawnOfficer(state, scene, THREE) {
  const mesh = makeOfficer(THREE);
  // in staged shots, officers stand to the player's sides (visible heat,
  // never blocking the staged car or Kai)
  const a = S.shotMode
    ? (state.officers.length % 2 === 0 ? Math.PI / 2 : -Math.PI / 2) + 0.3
    : Math.random() * Math.PI * 2;
  const d = S.shotMode ? 11 : 8;
  mesh.position.set(S.px + Math.sin(a) * d, 0, S.pz + Math.cos(a) * d);
  scene.add(mesh);
  state.officers.push({ mesh, phase: Math.random() * 10 });
}

function buildRoadblock(state, scene, THREE, x, z) {
  const g = new THREE.Group();
  const mat = new THREE.MeshLambertMaterial({ color: 0xff7043 });
  for (let i = -1; i <= 1; i++) {
    const bar = new THREE.Mesh(new THREE.BoxGeometry(2.2, 1.0, 0.6), mat);
    bar.position.set(i * 2.4, 0.5, 0);
    g.add(bar);
  }
  const cop = makeOfficer(THREE);
  cop.position.set(3.5, 0, 1.5);
  g.add(cop);
  g.position.set(x, 0, z);
  scene.add(g);
  state.roadblocks.push(g);
}

export function updatePolice(state, scene, THREE, dt) {
  if (!S.started || S.paused) return;
  const wantCruisers = Math.min(S.wanted, 4);
  const wantOfficers = S.wanted >= 1 ? Math.min(S.wanted * 2, 6) : 0;

  while (state.cruisers.length < wantCruisers) spawnCruiser(state, scene, THREE);
  while (state.cruisers.length > wantCruisers) {
    const c = state.cruisers.pop();
    scene.remove(c.mesh);
  }
  while (state.officers.length < wantOfficers) spawnOfficer(state, scene, THREE);
  while (state.officers.length > wantOfficers) {
    const o = state.officers.pop();
    scene.remove(o.mesh);
  }

  // cruisers chase
  for (const c of state.cruisers) {
    const m = c.mesh;
    const dx = S.px - m.position.x;
    const dz = S.pz - m.position.z;
    const d = Math.hypot(dx, dz) || 1;
    const want = Math.atan2(dx, dz);
    let diff = want - m.rotation.y;
    while (diff > Math.PI) diff -= Math.PI * 2;
    while (diff < -Math.PI) diff += Math.PI * 2;
    m.rotation.y += Math.max(-dt * 1.8, Math.min(dt * 1.8, diff));
    const spd = S.shotMode ? 0 : Math.min(20, 10 + S.wanted * 2);
    c.speed += (spd - c.speed) * Math.min(1, dt * 1.2);
    m.position.x += Math.sin(m.rotation.y) * c.speed * dt;
    m.position.z += Math.cos(m.rotation.y) * c.speed * dt;
    // siren flash
    c.sirenT += dt * 8;
    const on = Math.sin(c.sirenT) > 0;
    m.userData.bar1.material.color.setHex(on ? 0xff1744 : 0x550000);
    m.userData.bar2.material.color.setHex(on ? 0x002266 : 0x2979ff);
    // busted if a cruiser sits on the player
    if (d < 3 && !S.shotMode) {
      S.arrests++;
      S.wanted = 0;
      S.health = Math.max(20, S.health - 10);
      S.px = -40; S.pz = 60;
      setMessage('BUSTED — dropped at the spawn', 4);
    }
  }

  // officers walk toward the player
  for (const o of state.officers) {
    const m = o.mesh;
    const dx = S.px - m.position.x;
    const dz = S.pz - m.position.z;
    const d = Math.hypot(dx, dz) || 1;
    if (!S.shotMode && d > 2) {
      m.position.x += (dx / d) * 3.2 * dt;
      m.position.z += (dz / d) * 3.2 * dt;
      m.rotation.y = Math.atan2(dx, dz);
    }
    if (d < 2.2 && !S.shotMode) {
      S.health = Math.max(0, S.health - 8 * dt);
      if (S.health <= 0 && !S.over) {
        S.over = true;
        setMessage('WASTED — Kai is down', 5);
      }
    }
  }

  // heli at wanted >= 2
  if (S.wanted >= 2 && !state.heli) {
    state.heli = makeHeli(THREE);
    scene.add(state.heli);
  } else if (S.wanted < 2 && state.heli) {
    scene.remove(state.heli);
    state.heli = null;
  }
  if (state.heli) {
    const h = state.heli;
    state.heliAngle += dt * 0.12;
    // bob + slow orbit above the player
    const bob = Math.sin(S.time * 1.1) * 1.0;
    const hx = S.px + Math.sin(state.heliAngle) * 14;
    const hz = S.pz + Math.cos(state.heliAngle) * 14;
    const hy = state.heliAlt + bob;
    h.position.set(hx, hy, hz);
    h.rotation.y = Math.atan2(S.px - hx, S.pz - hz);
    h.userData.rotor.rotation.y += dt * 22;
    h.userData.rotor2.rotation.y += dt * 22;
    // BEAM: computed LIVE from the lamp's world position every frame.
    const lampWorld = new THREE.Vector3();
    h.userData.lamp.getWorldPosition(lampWorld);
    const groundY = 0.1;
    const beamLen = lampWorld.y - groundY;
    const beam = h.userData.beam;
    beam.scale.set(1, beamLen, 1);
    // cone geometry is centred, apex up at the lamp; place its centre halfway lamp->ground
    beam.position.set(0, -0.95 - beamLen / 2, 2.2);
    // pool sits exactly where the beam hits the ground
    const pool = h.userData.pool;
    pool.position.set(lampWorld.x - hx, -hy + groundY + 0.02, lampWorld.z - hz);
    pool.rotation.x = -Math.PI / 2;
    // spotlight aims at the same hit point
    h.userData.spotTarget.position.set(lampWorld.x - hx, -hy + groundY, lampWorld.z - hz);
  }

  // roadblocks at 3+ stars, one per district road near the player
  if (S.wanted >= 3 && state.roadblocks.length === 0) {
    const spots = [
      [Math.round(S.px / 64) * 64 + 32, S.pz + 40],
      [S.px + 40, Math.round(S.pz / 64) * 64],
    ];
    for (const [x, z] of spots) buildRoadblock(state, scene, THREE, x, z);
  } else if (S.wanted < 3 && state.roadblocks.length > 0) {
    for (const rb of state.roadblocks) scene.remove(rb);
    state.roadblocks.length = 0;
  }

  // wanted decay: stay unseen and it cools off
  if (S.wanted > 0) {
    state.chaseT += dt;
    const nearestCop = state.cruisers.length
      ? Math.min(...state.cruisers.map((c) => Math.hypot(c.mesh.position.x - S.px, c.mesh.position.z - S.pz)))
      : 999;
    S.seen = nearestCop < 45;
    if (!S.seen) {
      S.evading += dt;
      if (S.evading > 14) {
        S.wanted = Math.max(0, S.wanted - 1);
        S.evading = 0;
        if (S.wanted === 0) setMessage('You lost them — heat is off', 3);
      }
    } else {
      S.evading = 0;
    }
  }
}

export function policeCount(state) {
  return state.cruisers.length + state.officers.length + (state.heli ? 1 : 0);
}
