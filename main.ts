// SOLARA — main.ts: hands the game in. Copies game/ and screenshots/ from
// this repository into /output (or MAKEFUN_OUTPUT_DIR outside the grader)
// and writes /output/dossier.json with buildDossier from the kit library.
// The dossier is built FROM /output, after the final commit, so it always
// matches the exact files being submitted.
import { cpSync, existsSync, mkdirSync, rmSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { buildDossier } from './vendor/makefun-game.ts';

const repoRoot = resolve(new URL('.', import.meta.url).pathname);
const outDir = process.env.MAKEFUN_OUTPUT_DIR
  ? resolve(process.env.MAKEFUN_OUTPUT_DIR)
  : '/output';

const gameSrc = resolve(repoRoot, 'game');
const shotsSrc = resolve(repoRoot, 'screenshots');

if (!existsSync(gameSrc)) {
  throw new Error('game/ directory missing in ' + repoRoot);
}

// Start clean so stale files from an older build never leak into the entry.
rmSync(outDir, { recursive: true, force: true });
mkdirSync(outDir, { recursive: true });

cpSync(gameSrc, resolve(outDir, 'game'), { recursive: true });
if (existsSync(shotsSrc)) {
  cpSync(shotsSrc, resolve(outDir, 'screenshots'), { recursive: true });
}

const dossier = buildDossier(outDir, {
  text_max_bytes: 163840,
  screenshots: { max: 4, max_bytes: 262144 },
  game_max_files: 993,
  game_max_bytes: 50331648,
  game_path_max_bytes: 1000,
});

writeFileSync(resolve(outDir, 'dossier.json'), dossier);
console.log('dossier written: ' + resolve(outDir, 'dossier.json') + ' (' + dossier.length + ' bytes)');
