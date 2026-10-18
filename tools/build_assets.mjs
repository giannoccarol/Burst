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
  // map props (assets/src/props/<slug>/, see assets/src/props/manifest.json): p_<slug>.glb, placed by MapProps
  // Villette saguaros: the spine cards are alpha-blended (black once opaque): drop them, the bark reads fine
  { id: 'p_saguaro_a', src: 'props/saguaro_a', tex: 512, use: 'Villette: cactus saguaro', prop: true, drop: /spines/i, simplify: 0.5 },
  { id: 'p_saguaro_b', src: 'props/saguaro_b', tex: 512, use: 'Villette: cactus saguaro', prop: true, drop: /spines/i },
  // fewer materials (= draw calls): caravan without the bedding and cabinets inside, pickup without
  // badges, the rock pack without the pebbles, the young Joshua tree without its two tiny leaf sets
  { id: 'p_caravan_50s', src: 'props/caravan_50s', tex: 512, use: 'Villette: roulotte', prop: true, simplify: 0.6, drop: /^Object_(10|11|15|16|17|18|19|20|21)$/ },
  { id: 'p_pickup_rancher50', src: 'props/pickup_rancher50', tex: 1024, use: 'Villette: pick-up in strada', prop: true, drop: /Badges/ },
  { id: 'p_desert_rocks', src: 'props/desert_rocks', tex: 512, use: 'Villette: rocce', prop: true, drop: /small_rock/i },
  { id: 'p_joshua_tree_a', src: 'props/joshua_tree_a', tex: 512, use: 'Villette: albero di Giosuè', prop: true, drop: /leaf 01 H[23]/ },
  ...[
    // Villette
    ['sedan_cadillac_dirty', 1024, 'Villette: berlina parcheggiata', 0.5], ['hudson_abandoned', 512, 'Villette: relitto nel deserto'],
    ['mailbox', 512, 'Villette: cassetta delle lettere'], ['lawn_chair', 512, 'Villette: sedia da giardino'],
    ['charcoal_grill', 512, 'Villette: barbecue'], ['picnic_table', 512, 'Villette: tavolo da picnic'],
    ['doghouse', 512, 'Villette: cuccia'], ['fire_hydrant', 512, 'Villette: idrante'], ['crash_dummy', 512, 'Villette: manichino', 0.25],
    ['sofa_50s', 512, 'Villette: divano'], ['tv_retro', 512, 'Villette: televisore'], ['fridge_50s', 512, 'Villette: frigorifero'],
    ['gas_stove', 512, 'Villette: cucina a gas', 0.25], ['bed_metal', 512, 'Villette: letto'], ['dresser', 512, 'Villette: cassettiera', 0.35],
    ['joshua_tree_b', 512, 'Villette: albero di Giosuè'],
    ['tumbleweed', 512, 'Villette: rotolacampo', 0.4], ['dry_bush', 512, 'Villette: cespuglio secco'],
    ['water_tower', 512, 'Villette: torre dell\'acqua'], ['sandbags', 512, 'Villette: sacchi di sabbia'], ['oil_drums', 512, 'Villette: fusti', 0.5],
    ['propane_tank', 512, 'Villette: bombola del gas'], ['trash_can', 512, 'Villette: bidone'], ['radiation_sign', 512, 'Villette: cartello radiazioni'],
    ['electric_pole', 512, 'Villette: palo della luce'], ['jerry_can', 512, 'Villette: tanica', 0.4],
    // Borgo
    ['vespa_worn', 512, 'Borgo: scooter'], ['fiat500_1966', 1024, 'Borgo: utilitaria'], ['fiat132_abandoned', 512, 'Borgo: auto abbandonata', 0.5],
    ['patio_umbrella', 512, 'Borgo: ombrellone'], ['market_stall', 1024, 'Borgo: bancarella'],
    ['wine_barrel', 512, 'Borgo: botte', 0.5], ['barrels_wood', 512, 'Borgo: barili', 0.5], ['amphora_byz', 512, 'Borgo: anfora'], ['pots_old', 512, 'Borgo: vasi', 0.3],
    ['plant_med_flower', 512, 'Borgo: pianta in vaso'], ['geranium', 512, 'Borgo: gerani'], ['bench_aged', 512, 'Borgo: panchina', 0.2],
    ['street_lamp', 512, 'Borgo: lampione', 0.3], ['bicycle_rusty', 512, 'Borgo: bicicletta', 0.3], ['well_bucket', 512, 'Borgo: pozzo', 0.5],
    ['laundry_line', 512, 'Borgo: panni stesi', 0.3], ['cypress', 1024, 'Borgo: cipresso', 0.45], ['crates_bumstrum', 512, 'Borgo e Villette: casse'],
    ['wooden_boxes', 512, 'Borgo: cassette di legno'], ['floor_sign', 512, 'Borgo: cavalletto del bar'],
  ].map(([slug, tex, use, simplify]) => ({ id: 'p_' + slug, src: 'props/' + slug, tex, use, prop: true, ...(simplify ? { simplify } : {}) })),
  // Borgo café set without its round display platform
  { id: 'p_cafe_set', src: 'props/cafe_set', tex: 512, use: 'Borgo: tavolino del bar', prop: true, drop: /^place$/, simplify: 0.35 },
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
