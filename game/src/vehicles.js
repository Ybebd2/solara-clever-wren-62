// SOLARA — vehicles: traffic cars on the road grid + the player's car.
// Written fresh from the R5-mirror spec.

import { S } from './config.js';

const CAR_COLORS = [0xe53935, 0x1e88e5, 0xffd600, 0x43a047, 0x8e24aa, 0xff7043, 0x00acc1, 0xf5f5f5, 0x212121, 0xec407a];
const ROAD_LINES = [];
for (let v = -256; v <= 256; v += 64) ROAD_LINES.push(v);

function makeCarMesh(THREE, color, sporty = false) {
  const g = new THREE.Group();
  const bodyMat = new THREE.MeshLambertMaterial({ color });
  const body = new THREE.Mesh(new THREE.BoxGeometry(2.1, 0.75, sporty ? 4.6 : 4.2), bodyMat);
  body.position.y = 0.65;
  g.add(body);
  const cabin = new THREE.Mesh(
    new THREE.BoxGeometry(1.8, 0.65, 2.2),
    new THREE.MeshLambertMaterial({ color: 0x102027 })
  );
  cabin.position.set(0, 1.3, -0.2);
  g.add(cabin);
  const wheelGeo = new THREE.CylinderGeometry(0.42, 0.42, 0.35, 10);
  const wheelMat = new THREE.MeshLambertMaterial({ color: 0x111111 });
  for (const [wx, wz] of [[-1.05, 1.4], [1.05, 1.4], [-1.05, -1.4], [1.05, -1.4]]) {
    const w = new THREE.Mesh(wheelGeo, wheelMat);
    w.rotation.z = Math.PI / 2;
    w.position.set(wx, 0.42, wz);
    g.add(w);
  }
  // headlights
  const lightMat = new THREE.MeshBasicMaterial({ color: 0xfffde7 });
  for (const hx of [-0.7, 0.7]) {
    const hl = new THREE.Mesh(new THREE.BoxGeometry(0.35, 0.2, 0.1), lightMat);
    hl.position.set(hx, 0.7, 2.15);
    g.add(hl);
  }
  return g;
}

// A traffic car drives along one road line, in one lane, looping the city.
export function makeTrafficCar(THREE, i) {
  const alongRoad = i % 2 === 0;
  const line = ROAD_LINES[i % ROAD_LINES.length];
  const lane = (i % 2 === 0 ? -5 : 5);
  const mesh = makeCarMesh(THREE, CAR_COLORS[i % CAR_COLORS.length]);
  const car = {
    mesh,
    alongRoad,
    line,
    lane,
    pos: -300 + ((i * 53) % 600),
    speed: 7 + (i % 5) * 1.5,
    dir: i % 4 < 2 ? 1 : -1,
  };
  return car;
}

export function buildTraffic(scene, THREE, count = 26) {
  const traffic = [];
  for (let i = 0; i < count; i++) {
    const car = makeTrafficCar(THREE, i);
    scene.add(car.mesh);
    traffic.push(car);
  }
  return traffic;
}

export function updateTraffic(traffic, dt, shotMode) {
  for (const car of traffic) {
    car.pos += car.dir * car.speed * dt * (shotMode ? 0.4 : 1);
    if (car.pos > 310) car.pos = -310;
    if (car.pos < -310) car.pos = 310;
    if (car.alongRoad) {
      car.mesh.position.set(car.line + car.lane, 0, car.pos);
      car.mesh.rotation.y = car.dir > 0 ? 0 : Math.PI;
    } else {
      car.mesh.position.set(car.pos, 0, car.line + car.lane);
      car.mesh.rotation.y = car.dir > 0 ? Math.PI / 2 : -Math.PI / 2;
    }
  }
}

// The player's car: a red sports car spawned next to the player.
export function spawnPlayerCar(scene, THREE, x, z, heading) {
  const mesh = makeCarMesh(THREE, 0xe53935, true);
  mesh.position.set(x, 0, z);
  mesh.rotation.y = heading;
  scene.add(mesh);
  return { mesh, x, z, heading, speed: 0, health: 100 };
}

export function nearestTrafficCar(traffic, x, z, maxD = 6) {
  let best = null;
  let bestD = maxD * maxD;
  for (const car of traffic) {
    const dx = car.mesh.position.x - x;
    const dz = car.mesh.position.z - z;
    const d = dx * dx + dz * dz;
    if (d < bestD) { bestD = d; best = car; }
  }
  return best;
}

// Simple circle-vs-AABB push-out for on-foot / in-car movement.
export function collide(colliders, x, z, radius = 1) {
  let nx = x, nz = z;
  for (const c of colliders) {
    if (nx > c.minX - radius && nx < c.maxX + radius && nz > c.minZ - radius && nz < c.maxZ + radius) {
      const dxl = nx - (c.minX - radius);
      const dxr = (c.maxX + radius) - nx;
      const dzl = nz - (c.minZ - radius);
      const dzr = (c.maxZ + radius) - nz;
      const m = Math.min(dxl, dxr, dzl, dzr);
      if (m === dxl) nx = c.minX - radius;
      else if (m === dxr) nx = c.maxX + radius;
      else if (m === dzl) nz = c.minZ - radius;
      else nz = c.maxZ + radius;
    }
  }
  // keep inside the city, out of deep ocean
  nx = Math.max(-315, Math.min(315, nx));
  nz = Math.max(-315, Math.min(315, nz));
  return [nx, nz];
}

export { makeCarMesh };
