// SOLARA — world: city, beach, ocean, trees, peds, Golden Geckos, lights.
// Written fresh from the R5-mirror spec. Bright daytime ~14:00, blue sky.

import { WORLD, DISTRICTS, districtAt } from './config.js';

const SPAWN = { x: -40, z: 60 };
const MO = { x: -40, z: -192 }; // MO'S / first mission start
const NO_TREE_R = 20;

const PASTELS = ['#ffd9e8', '#c8f7dc', '#fff3b0', '#c5e3ff', '#e8c5ff', '#ffe0b2', '#b2f2f2', '#ffcdd2'];
const SHIRTS = ['#ff1744', '#ffea00', '#00e5ff', '#76ff03', '#ff9100', '#d500f9', '#ffffff', '#ff6d00'];

function nearExcluded(x, z) {
  const d1 = (x - SPAWN.x) ** 2 + (z - SPAWN.z) ** 2;
  const d2 = (x - MO.x) ** 2 + (z - MO.z) ** 2;
  return d1 < NO_TREE_R * NO_TREE_R || d2 < NO_TREE_R * NO_TREE_R;
}

// Canvas texture: pastel facade with a lit window grid.
function facadeTexture(THREE, base, litRatio = 0.45) {
  const c = document.createElement('canvas');
  c.width = 128; c.height = 256;
  const g = c.getContext('2d');
  g.fillStyle = base; g.fillRect(0, 0, 128, 256);
  g.fillStyle = 'rgba(0,0,0,0.12)';
  g.fillRect(0, 0, 128, 10); // roof shadow line
  for (let row = 0; row < 10; row++) {
    for (let col = 0; col < 5; col++) {
      const lit = Math.random() < litRatio;
      g.fillStyle = lit ? '#fff8c9' : '#263238';
      g.fillRect(12 + col * 22, 22 + row * 23, 14, 15);
    }
  }
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

export function buildWorld(scene, THREE) {
  const out = { colliders: [], peds: [], geckos: [], trees: [], buildings: [] };
  const sun = new THREE.DirectionalLight(0xfff2d9, 2.6);
  sun.position.set(120, 220, 80);
  scene.add(sun);
  scene.add(new THREE.HemisphereLight(0x9fd8ff, 0x3d7a4a, 1.15));
  scene.background = new THREE.Color(0x6ec1ff);
  scene.fog = new THREE.Fog(0x9fd4f5, 260, 620);

  // --- Ground: grass city slab ---
  const ground = new THREE.Mesh(
    new THREE.PlaneGeometry(WORLD.size, WORLD.size),
    new THREE.MeshLambertMaterial({ color: 0x69b06a })
  );
  ground.rotation.x = -Math.PI / 2;
  ground.position.y = 0;
  scene.add(ground);

  // --- Beach sand (west strip) + ocean + foam ---
  const sand = new THREE.Mesh(
    new THREE.PlaneGeometry(52, WORLD.size),
    new THREE.MeshLambertMaterial({ color: 0xf2dfa0 })
  );
  sand.rotation.x = -Math.PI / 2;
  sand.position.set(-294, 0.02, 0);
  scene.add(sand);
  const oceanMat = new THREE.MeshLambertMaterial({ color: 0x19b8c9, transparent: true, opacity: 0.92 });
  const ocean = new THREE.Mesh(new THREE.PlaneGeometry(40, WORLD.size), oceanMat);
  ocean.rotation.x = -Math.PI / 2;
  ocean.position.set(-308, 0.06, 0);
  scene.add(ocean);
  out.ocean = ocean;
  const foamMat = new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.75 });
  const foam = new THREE.Mesh(new THREE.PlaneGeometry(4, WORLD.size), foamMat);
  foam.rotation.x = -Math.PI / 2;
  foam.position.set(-288, 0.08, 0);
  scene.add(foam);
  out.foam = foam;

  // Sailboats on the water.
  const boatMat = new THREE.MeshLambertMaterial({ color: 0xffffff });
  const sailMat = new THREE.MeshLambertMaterial({ color: 0xff5252, side: THREE.DoubleSide });
  for (let i = 0; i < 5; i++) {
    const boat = new THREE.Group();
    const hull = new THREE.Mesh(new THREE.BoxGeometry(3, 1, 7), boatMat);
    hull.position.y = 0.4;
    boat.add(hull);
    const mast = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.08, 7), new THREE.MeshLambertMaterial({ color: 0x6d4c41 }));
    mast.position.y = 4;
    boat.add(mast);
    const sail = new THREE.Mesh(new THREE.PlaneGeometry(4.5, 5.5), sailMat);
    sail.position.set(0, 4.2, 0.4);
    boat.add(sail);
    boat.position.set(-306 - Math.random() * 8, 0, -220 + i * 110 + Math.random() * 30);
    boat.rotation.y = Math.random() * Math.PI;
    scene.add(boat);
  }
  // Beach umbrellas.
  const umbColors = [0xff5252, 0xffd54f, 0x4fc3f7, 0x69f0ae, 0xe040fb];
  for (let i = 0; i < 9; i++) {
    const x = -292 + Math.random() * 18;
    const z = -260 + i * 62 + Math.random() * 20;
    const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.09, 3), new THREE.MeshLambertMaterial({ color: 0xffffff }));
    pole.position.set(x, 1.5, z);
    scene.add(pole);
    const top = new THREE.Mesh(
      new THREE.ConeGeometry(2.6, 1.1, 8),
      new THREE.MeshLambertMaterial({ color: umbColors[i % umbColors.length] })
    );
    top.position.set(x, 3.4, z);
    scene.add(top);
  }

  // --- Roads: grid at multiples of 64, width 20 ---
  const roadMat = new THREE.MeshLambertMaterial({ color: 0x2e3440 });
  const sideMat = new THREE.MeshLambertMaterial({ color: 0x9aa5b1 });
  const dashMat = new THREE.MeshBasicMaterial({ color: 0xfff59d });
  const roadLines = [];
  for (let v = -256; v <= 256; v += 64) roadLines.push(v);
  for (const v of roadLines) {
    // vertical road (along z) and horizontal road (along x)
    const rv = new THREE.Mesh(new THREE.PlaneGeometry(WORLD.roadWidth, WORLD.size), roadMat);
    rv.rotation.x = -Math.PI / 2; rv.position.set(v, 0.04, 0);
    scene.add(rv);
    const rh = new THREE.Mesh(new THREE.PlaneGeometry(WORLD.size, WORLD.roadWidth), roadMat);
    rh.rotation.x = -Math.PI / 2; rh.position.set(0, 0.04, v);
    scene.add(rh);
    // sidewalks flanking each road
    for (const off of [-12.5, 12.5]) {
      const sv = new THREE.Mesh(new THREE.PlaneGeometry(5, WORLD.size), sideMat);
      sv.rotation.x = -Math.PI / 2; sv.position.set(v + off, 0.05, 0);
      scene.add(sv);
      const sh = new THREE.Mesh(new THREE.PlaneGeometry(WORLD.size, 5), sideMat);
      sh.rotation.x = -Math.PI / 2; sh.position.set(0, 0.05, v + off);
      scene.add(sh);
    }
    // centre dashes
    for (let d = -300; d <= 300; d += 16) {
      const dv = new THREE.Mesh(new THREE.PlaneGeometry(0.7, 6), dashMat);
      dv.rotation.x = -Math.PI / 2; dv.position.set(v, 0.06, d);
      scene.add(dv);
      const dh = new THREE.Mesh(new THREE.PlaneGeometry(6, 0.7), dashMat);
      dh.rotation.x = -Math.PI / 2; dh.position.set(d, 0.06, v);
      scene.add(dh);
    }
  }

  // --- Buildings: one or two per block, pastel facades, window grids ---
  const textures = PASTELS.map((c) => facadeTexture(THREE, c));
  const neonMats = DISTRICTS.map((d) => new THREE.MeshBasicMaterial({ color: d.color }));
  let bi = 0;
  for (let gx = -4; gx <= 3; gx++) {
    for (let gz = -4; gz <= 3; gz++) {
      const cx = gx * 64 + 32;
      const cz = gz * 64 + 32;
      if (cx < -240) continue; // beach — no buildings
      if (nearExcluded(cx, cz)) continue;
      const d = districtAt(cx, cz);
      const downtown = d && d.name === 'DOWNTOWN';
      const h = downtown ? 26 + Math.random() * 34 : 10 + Math.random() * 16;
      const w = 20 + Math.random() * 10;
      const dep = 20 + Math.random() * 10;
      const tex = textures[(((bi + gx * 3 + gz) % textures.length) + textures.length) % textures.length];
      const mat = new THREE.MeshLambertMaterial({ map: tex });
      const b = new THREE.Mesh(new THREE.BoxGeometry(w, h, dep), mat);
      b.position.set(cx, h / 2, cz);
      scene.add(b);
      out.buildings.push(b);
      out.colliders.push({ minX: cx - w / 2, maxX: cx + w / 2, minZ: cz - dep / 2, maxZ: cz + dep / 2 });
      // neon sign strip on the roof edge, district colour
      if (d) {
        const sign = new THREE.Mesh(new THREE.PlaneGeometry(w * 0.7, 1.6), neonMats[DISTRICTS.indexOf(d)]);
        sign.position.set(cx, h + 0.9, cz + dep / 2 + 0.15);
        scene.add(sign);
      }
      // second smaller building in big blocks
      if (Math.random() < 0.45 && !downtown) {
        const w2 = 12 + Math.random() * 6;
        const h2 = 7 + Math.random() * 6;
        const x2 = cx + (Math.random() < 0.5 ? -14 : 14);
        const z2 = cz + (Math.random() < 0.5 ? -13 : 13);
        if (!nearExcluded(x2, z2) && x2 > -240) {
          const b2 = new THREE.Mesh(
            new THREE.BoxGeometry(w2, h2, w2),
            new THREE.MeshLambertMaterial({ map: textures[(((bi + 2) % textures.length) + textures.length) % textures.length] })
          );
          b2.position.set(x2, h2 / 2, z2);
          scene.add(b2);
          out.colliders.push({ minX: x2 - w2 / 2, maxX: x2 + w2 / 2, minZ: z2 - w2 / 2, maxZ: z2 + w2 / 2 });
        }
      }
      bi++;
    }
  }

  // --- Trees: park blocks + scattered, 20 m clear around spawn and MO'S ---
  const trunkMat = new THREE.MeshLambertMaterial({ color: 0x6d4c41 });
  const leafMats = [0x2e9e4f, 0x43a047, 0x66bb6a, 0x1b8a3c].map((c) => new THREE.MeshLambertMaterial({ color: c }));
  function addTree(x, z, s = 1) {
    if (nearExcluded(x, z)) return;
    if (x < -262) return;
    const g = new THREE.Group();
    const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.35 * s, 0.5 * s, 2.6 * s), trunkMat);
    trunk.position.y = 1.3 * s;
    g.add(trunk);
    const crown = new THREE.Mesh(new THREE.SphereGeometry(1.9 * s, 10, 8), leafMats[Math.floor(Math.random() * leafMats.length)]);
    crown.position.y = 3.6 * s;
    g.add(crown);
    g.position.set(x, 0, z);
    scene.add(g);
    out.trees.push(g);
  }
  // park-block loop: a tree cluster in the middle of every other block
  for (let gx = -4; gx <= 3; gx++) {
    for (let gz = -4; gz <= 3; gz++) {
      if ((gx + gz) % 2 !== 0) continue;
      const cx = gx * 64 + 32;
      const cz = gz * 64 + 32;
      if (cx < -240) continue;
      for (let t = 0; t < 4; t++) {
        addTree(cx + (Math.random() - 0.5) * 26, cz + (Math.random() - 0.5) * 26, 0.9 + Math.random() * 0.5);
      }
    }
  }
  // scattered loop: trees along sidewalks
  for (let i = 0; i < 90; i++) {
    const road = roadLines[Math.floor(Math.random() * roadLines.length)];
    const along = -300 + Math.random() * 600;
    const side = Math.random() < 0.5 ? -13.5 : 13.5;
    if (Math.random() < 0.5) addTree(road + side, along, 0.8 + Math.random() * 0.5);
    else addTree(along, road + side, 0.8 + Math.random() * 0.5);
  }

  // --- Streetlights along roads ---
  const poleMat = new THREE.MeshLambertMaterial({ color: 0x37474f });
  const lampMat = new THREE.MeshBasicMaterial({ color: 0xfff9c4 });
  for (let v = -256; v <= 256; v += 64) {
    for (let d = -256; d <= 256; d += 128) {
      for (const [x, z] of [[v + 11, d], [d, v - 11]]) {
        if (x < -250) continue;
        const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.12, 6), poleMat);
        pole.position.set(x, 3, z);
        scene.add(pole);
        const lamp = new THREE.Mesh(new THREE.SphereGeometry(0.5, 8, 6), lampMat);
        lamp.position.set(x, 6.2, z);
        scene.add(lamp);
      }
    }
  }

  // --- Peds: 64, scale 1.5, bright shirts, in groups on sidewalks ---
  const pedGeoBody = new THREE.CylinderGeometry(0.45, 0.55, 1.7, 8);
  const pedGeoHead = new THREE.SphereGeometry(0.42, 10, 8);
  const legMat = new THREE.MeshLambertMaterial({ color: 0x263238 });
  for (let i = 0; i < 64; i++) {
    const groupX = -240 + Math.random() * 480;
    const groupZ = -240 + Math.random() * 480;
    const shirt = new THREE.MeshLambertMaterial({ color: SHIRTS[i % SHIRTS.length] });
    const ped = new THREE.Group();
    const body = new THREE.Mesh(pedGeoBody, shirt);
    body.position.y = 1.35;
    ped.add(body);
    const head = new THREE.Mesh(pedGeoHead, new THREE.MeshLambertMaterial({ color: 0xffcc9e }));
    head.position.y = 2.5;
    ped.add(head);
    const legL = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.9, 0.3), legMat);
    legL.position.set(-0.22, 0.45, 0);
    ped.add(legL);
    const legR = legL.clone();
    legR.position.x = 0.22;
    ped.add(legR);
    ped.scale.setScalar(1.5);
    ped.position.set(groupX + (Math.random() - 0.5) * 6, 0, groupZ + (Math.random() - 0.5) * 6);
    ped.rotation.y = Math.random() * Math.PI * 2;
    scene.add(ped);
    out.peds.push({ mesh: ped, homeX: groupX, homeZ: groupZ, phase: Math.random() * 10, speed: 0.5 + Math.random() * 0.8 });
  }

  // --- Golden Geckos: 20 collectibles ---
  const geckoGeo = new THREE.SphereGeometry(0.55, 10, 8);
  const geckoMat = new THREE.MeshBasicMaterial({ color: 0xffd600 });
  for (let i = 0; i < 20; i++) {
    const x = -230 + Math.random() * 460;
    const z = -230 + Math.random() * 460;
    if (nearExcluded(x, z)) { i--; continue; }
    const g = new THREE.Mesh(geckoGeo, geckoMat);
    g.position.set(x, 1.2, z);
    scene.add(g);
    out.geckos.push({ mesh: g, x, z, taken: false });
  }

  // --- MO'S safehouse: pink cylinder at (-40,-192) ---
  const mos = new THREE.Mesh(
    new THREE.CylinderGeometry(4, 4, 0.5, 24),
    new THREE.MeshBasicMaterial({ color: 0xff80ab, transparent: true, opacity: 0.7 })
  );
  mos.position.set(MO.x, 0.25, MO.z);
  scene.add(mos);

  return out;
}
