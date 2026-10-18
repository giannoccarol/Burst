// Asset pipeline: assets/src/<slug>/model.glb (downloaded from Sketchfab) -> assets/<id>.glb
//
//   cd tools && npm install && node build_assets.mjs [id ...] [--geom meshopt|quantize]
//
// Per model: spec-gloss -> metal-rough, drop unwanted nodes, strip cameras/lights/unused
// animations, prune/dedup/weld, resample animation keys, WebP textures (max 1024 px),
// quantized geometry + EXT_meshopt_compression (default) or plain KHR_mesh_quantization
// (--geom quantize: no WebAssembly needed to decode). Also writes assets/CREDITS.json.
// Downloaded files are only read as data.
import { NodeIO } from '@gltf-transform/core';
import { ALL_EXTENSIONS } from '@gltf-transform/extensions';
import { metalRough, prune, dedup, weld, resample, textureCompress, meshopt, quantize, simplify } from '@gltf-transform/functions';
import { MeshoptEncoder, MeshoptDecoder, MeshoptSimplifier } from 'meshoptimizer';
import sharp from 'sharp';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const SRC = path.join(ROOT, 'assets', 'src');
const OUT = path.join(ROOT, 'assets');

// soldier variants with one texture set per part (denser than the packed atlases): smaller maps
const PER_PART = new Set(['desert', 'snow', 'marine', 'navy', 'mechanic', 'swat']);

// id: output file; src: assets/src/<src>/model.glb; anim: keep the animation clip;
// drop: regex of node names to remove; tex: max texture size; character: skinned soldier
export const MODELS = [
  { id: 'w_ar', src: 'carbine', anim: true, use: 'Carabina R4 (prima persona, braccia e animazioni)' },
  { id: 'w_smg', src: 'smg', anim: true, use: 'Vespa 9 (prima persona, braccia e animazioni)' },
  { id: 'w_revolver', src: 'revolver', anim: true, use: 'Magnum .44 (prima persona, braccia e animazioni)' },
  { id: 'w_knife', src: 'knife', anim: true, use: 'Coltello (prima persona, braccia e animazioni)' },
  { id: 'w_sniper', src: 'sniper', use: 'Falco .308' },
  { id: 'w_lmg', src: 'lmg', use: 'Martello' },
  { id: 'w_shotgun', src: 'shotgun', use: 'Pompa 12' },
  { id: 'w_pistol', src: 'pistol', use: 'P9', basedOn: { title: 'Beretta M9', author: 'eNse7en', url: 'https://sketchfab.com/3d-models/beretta-m9-348015284eca46fe8e1822508381dfd8', license: 'CC Attribution' } },
  { id: 'w_dmr', src: 'uar10', drop: /^Object_(4|5|7|8|9|13)$/, use: 'Sparviero 7.62' },
  { id: 'w_rocket', src: 'rpg7_tb', use: 'Lanciarazzi R7' },
  // extra roster (assets/src/extra/<id>/, downloaded by the roster search)
  { id: 'w_mp5', src: 'extra/mp5', use: 'Calabrone 9' },
  { id: 'w_m1911', src: 'extra/m1911', use: 'Mastino .45' },
  // soldiers: same Adobe Fuse / Mixamo base, one file per variant (see Soldiers in src/09b_avatar.js)
  ...[
    ['ru', 'Soldato, squadra A (bosco digitale)'], ['uk', 'Soldato, squadra B (deserto DPM)'], ['ua', 'Soldato: pixel chiaro'],
    ['ua2', 'Soldato: pixel chiaro senza maschera'], ['marine_wood', 'Soldato: bosco MARPAT'], ['marine_desert', 'Soldato: deserto MARPAT'],
    ['sniper', 'Soldato: tiratore scelto'], ['desert', 'Soldato: deserto pesante'], ['snow', 'Soldato: neve'], ['marine', 'Soldato: mimetica da campo'],
    ['navy', 'Soldato: blu marina'], ['mechanic', 'Soldato: tecnico'], ['swat', 'Soldato: squadra speciale'],
  ].map(([v, use]) => ({ id: 'soldier_' + v, src: 'soldier_' + v, character: true, use, tex: PER_PART.has(v) ? 768 : 1024 })),
];

const args = process.argv.slice(2);
const geom = args.includes('--geom') ? args[args.indexOf('--geom') + 1] : 'meshopt';
const only = args.filter((a, i) => !a.startsWith('--') && args[i - 1] !== '--geom');

await MeshoptEncoder.ready; await MeshoptDecoder.ready; await MeshoptSimplifier.ready;
const io = new NodeIO().registerExtensions(ALL_EXTENSIONS).registerDependencies({
  'meshopt.encoder': MeshoptEncoder, 'meshopt.decoder': MeshoptDecoder,
});

const kb = (n) => (n / 1024).toFixed(0) + ' KB';
const report = [];
for (const m of MODELS) {
  if (only.length && !only.includes(m.id)) continue;
  const inFile = path.join(SRC, m.src, 'model.glb');
  if (!fs.existsSync(inFile)) { console.log(m.id, 'missing source', inFile); continue; }
  const doc = await io.read(inFile);
  const root = doc.getRoot();
  // spec-gloss -> metal-rough
  if (root.listExtensionsUsed().some((e) => e.extensionName === 'KHR_materials_pbrSpecularGlossiness')) await doc.transform(metalRough());
  // unwanted nodes
  if (m.drop) for (const n of root.listNodes()) if (m.drop.test(n.getName())) n.dispose();
  // cameras, lights, animations
  for (const n of root.listNodes()) { if (n.getCamera()) n.setCamera(null); n.setExtension('KHR_lights_punctual', null); }
  for (const c of root.listCameras()) c.dispose();
  if (!m.anim) for (const a of root.listAnimations()) a.dispose();
  for (const ext of root.listExtensionsUsed()) if (ext.extensionName === 'KHR_lights_punctual') ext.dispose();
  // characters: name every skinned mesh after its Fuse part (Body, Tops, Bottoms, Hats, ...)
  if (m.character) {
    for (const n of root.listNodes()) {
      const mesh = n.getMesh();
      if (!mesh) continue;
      const part = mesh.getName().replace(/_(PackedMaterial\d+mat|[A-Za-z]+mat)(_\d+)?$/, '').replace(/^default$/, 'Lashes');
      n.setName(part); mesh.setName(part);
    }
  }
  // materials: characters come from Fuse with every part alpha-blended and double-sided
  for (const mat of root.listMaterials()) {
    if (m.character) { mat.setAlphaMode('MASK'); mat.setAlphaCutoff(0.5); mat.setDoubleSided(false); }
    else if (mat.getAlphaMode() === 'BLEND' && !/lens|glass/i.test(mat.getName())) mat.setAlphaMode('OPAQUE');
  }
  await doc.transform(
    prune({ keepAttributes: false, keepLeaves: false }),
    dedup(),
    weld(),
    ...(m.anim ? [resample()] : []),
    ...(m.simplify ? [simplify({ simplifier: MeshoptSimplifier, ratio: m.simplify, error: 0.002 })] : []),
    textureCompress({ encoder: sharp, targetFormat: 'webp', resize: [m.tex || 1024, m.tex || 1024], quality: 82 }),
    ...(geom === 'meshopt' ? [meshopt({ encoder: MeshoptEncoder, level: 'medium' })] : [quantize()]),
    prune(),
  );
  const outFile = path.join(OUT, m.id + '.glb');
  await io.write(outFile, doc);
  const a = fs.statSync(inFile).size, b = fs.statSync(outFile).size;
  report.push([m.id, a, b]);
  console.log(m.id.padEnd(11), kb(a).padStart(9), '->', kb(b).padStart(8));
}
if (report.length) {
  const tot = report.reduce((s, r) => [s[0] + r[1], s[1] + r[2]], [0, 0]);
  console.log('total'.padEnd(11), kb(tot[0]).padStart(9), '->', kb(tot[1]).padStart(8));
}

// credits (title, author, url, license) from the metadata saved by sketchfab_fetch.sh
const credits = [];
for (const m of MODELS) {
  const mf = path.join(SRC, m.src, 'meta.json');
  if (!fs.existsSync(mf)) continue;
  const meta = JSON.parse(fs.readFileSync(mf, 'utf8'));
  credits.push({
    id: m.id, use: m.use, title: meta.title, author: meta.author, authorUrl: meta.authorUrl, url: meta.url,
    license: meta.license, licenseUrl: meta.licenseUrl,
    modified: 'Ottimizzato per il gioco (texture WebP ridimensionate, geometria quantizzata e compressa' + (m.drop ? ', parti rimosse' : '') + (m.character ? ', materiali convertiti' : '') + '); posizionato e animato via codice.',
    ...(m.basedOn ? { basedOn: m.basedOn } : {}),
  });
}
fs.writeFileSync(path.join(OUT, 'CREDITS.json'), JSON.stringify(credits, null, 2) + '\n');
