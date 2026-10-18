// ===================================================================
// Material library (PBR from procedural textures)
// ===================================================================
const MAT = {};
const PLASTER_COLORS = {
  ocra: '#E8B86E', siena: '#D9915F', rosa: '#E9AFA0', crema: '#EFE0C4', giallo: '#EDD08E',
  terracotta: '#CF7D55', bianco: '#F1EBE0', salmone: '#EAA585', pesca: '#EFC29A', grigio: '#D6CFC2',
};
const SHUTTER_COLORS = { verde: '#3E6A4B', marrone: '#6E4C30', verdescuro: '#2E4D3A', azzurro: '#5B7480', bordeaux: '#6B2E2E' };
// colour swaps applied to the rotated half of the map so both sides look different
const PLASTER_SWAP = { ocra: 'rosa', siena: 'giallo', rosa: 'ocra', crema: 'pesca', giallo: 'siena', terracotta: 'salmone', bianco: 'crema', salmone: 'terracotta', pesca: 'bianco', grigio: 'grigio' };
const SHUTTER_SWAP = { verde: 'marrone', marrone: 'verde', verdescuro: 'azzurro', azzurro: 'verdescuro', bordeaux: 'verde' };

const GrimeChunk = {
  // darken walls near the ground and add a little world-space colour variation to break tiling
  apply(mat, opts = {}) {
    const base = opts.base || 0;
    mat.onBeforeCompile = (sh) => {
      RafShade.inject(sh);
      sh.uniforms.uGrimeBase = { value: base };
      sh.vertexShader = sh.vertexShader
        .replace('#include <common>', '#include <common>\nvarying vec3 vWPos; varying vec3 vWNrm;')
        .replace('#include <project_vertex>', '#include <project_vertex>\n vWPos = (modelMatrix * vec4(transformed, 1.0)).xyz; vWNrm = normalize(mat3(modelMatrix) * objectNormal);');
      sh.fragmentShader = sh.fragmentShader
        .replace('#include <common>', '#include <common>\nvarying vec3 vWPos; varying vec3 vWNrm; uniform float uGrimeBase;\n' +
          'float gHash(vec3 p){ p = fract(p * 0.3183099 + 0.1); p *= 17.0; return fract(p.x * p.y * p.z * (p.x + p.y + p.z)); }\n' +
          'float gNoise(vec3 x){ vec3 i = floor(x); vec3 f = fract(x); f = f * f * (3.0 - 2.0 * f);\n' +
          ' return mix(mix(mix(gHash(i), gHash(i + vec3(1,0,0)), f.x), mix(gHash(i + vec3(0,1,0)), gHash(i + vec3(1,1,0)), f.x), f.y),\n' +
          '  mix(mix(gHash(i + vec3(0,0,1)), gHash(i + vec3(1,0,1)), f.x), mix(gHash(i + vec3(0,1,1)), gHash(i + vec3(1,1,1)), f.x), f.y), f.z); }')
        .replace('#include <map_fragment>', '#include <map_fragment>\n' +
          ' { float vert = 1.0 - abs(vWNrm.y);\n' +
          '   float gn = gNoise(vWPos * vec3(1.3, 0.6, 1.3));\n' +
          '   float gr = (1.0 - smoothstep(0.0, 1.0 + 0.6 * gn, vWPos.y - uGrimeBase)) * vert;\n' +
          '   float big = gNoise(vWPos * 0.11) * 0.16 + gNoise(vWPos * 0.37) * 0.08;\n' +
          '   diffuseColor.rgb *= (1.0 - 0.32 * gr) * (0.92 + big); }');
    };
    mat.customProgramCacheKey = () => 'grime' + base;
    return mat;
  },
};

function makeMaterials(q) {
  // texture quality from the graphics settings (R.texLevel): 0 low, 1 medium, 2 high, 3 ultra
  const tq = typeof R !== 'undefined' && R.texLevel != null ? R.texLevel : q;
  const L = [256, 512, 1024, 1024][tq], M = [128, 256, 512, 1024][tq];
  const T = (n, s, o) => TexGen.build(n, s, o);
  const pbr = (tex, extra, uvScale) => {
    const m = new THREE.MeshStandardMaterial(Object.assign({
      map: tex.map, normalMap: tex.normal, roughnessMap: tex.orm, aoMap: tex.orm, metalnessMap: tex.orm,
      roughness: 1, metalness: 1, aoMapIntensity: 1,
    }, extra || {}));
    m.userData.uvScale = uvScale || 2;
    return m;
  };
  const tCobble = T('cobble', L, { normalStrength: 2.2, aniso: true });
  const tSlabs = T('slabs', L, { normalStrength: 2.4, aniso: true });
  const tPlaster = T('plaster', L, { normalStrength: 2.0 });
  const tStone = T('stone', L, { normalStrength: 2.4 });
  const tRubble = T('rubble', L, { normalStrength: 2.6 });
  const tBrick = T('brick', M, { normalStrength: 2.2 });
  const tRoof = T('roof', L, { normalStrength: 2.8, aniso: true });
  const tWood = T('wood', M, { normalStrength: 2.0 });
  const tPainted = T('painted', M, { normalStrength: 1.6 });
  const tCrate = T('crate', M, { normalStrength: 2.2 });
  const tMetal = T('metal', M, { normalStrength: 1.4 });
  const tCotto = T('cotto', M, { normalStrength: 2.0, aniso: true });
  const tTerrain = T('terrain', L, { normalStrength: 2.4, aniso: true });
  const tMarble = T('marble', M, { normalStrength: 1.0 });
  const tBark = T('bark', M, { normalStrength: 3.0 });
  const tLeaves = T('leaves', M, { normalStrength: 1.0 });
  const tLeaves2 = T('leaves2', M, { normalStrength: 1.0 });
  const tAwR = T('awningRed', M, { normalStrength: 1.0 });
  const tAwG = T('awningGreen', M, { normalStrength: 1.0 });
  const tFabric = T('fabric', M, { normalStrength: 1.0 });
  const tWater = T('water', M, { normalStrength: 1.6, normalOnly: true });
  TexGen.disposeTemps();

  MAT.cobble = GrimeChunk.apply(pbr(tCobble, { normalScale: new THREE.Vector2(1.2, 1.2) }, 2.0));
  MAT.slabs = GrimeChunk.apply(pbr(tSlabs, {}, 3.2));
  MAT.sagrato = GrimeChunk.apply(pbr(tSlabs, { color: new THREE.Color('#e9e2d6') }, 2.4));
  MAT.stone = GrimeChunk.apply(pbr(tStone, {}, 2.4));
  MAT.stoneTrim = GrimeChunk.apply(pbr(tStone, { color: new THREE.Color('#f2ece2') }, 1.2));
  MAT.rubble = GrimeChunk.apply(pbr(tRubble, {}, 2.2));
  MAT.brick = GrimeChunk.apply(pbr(tBrick, {}, 1.2));
  MAT.roof = pbr(tRoof, {}, 2.0);
  MAT.wood = GrimeChunk.apply(pbr(tWood, {}, 1.2));
  MAT.woodDark = GrimeChunk.apply(pbr(tWood, { color: new THREE.Color('#8a7360') }, 1.2));
  MAT.crate = pbr(tCrate, {}, 1);
  MAT.metal = pbr(tMetal, {}, 1.0);
  MAT.cotto = GrimeChunk.apply(pbr(tCotto, {}, 1.8));
  MAT.cottoIn = pbr(tCotto, { envMapIntensity: 0.35 }, 1.8);
  MAT.terrain = pbr(tTerrain, {}, 6.0);
  MAT.terrainFar = new THREE.MeshStandardMaterial({ map: tTerrain.map, normalMap: tTerrain.normal, roughness: 0.95, metalness: 0, vertexColors: true });
  MAT.terrainFar.userData.uvScale = 14;
  MAT.marble = pbr(tMarble, {}, 1.5);
  MAT.bark = pbr(tBark, {}, 1.0);
  MAT.leaves = new THREE.MeshStandardMaterial({ map: tLeaves.map, normalMap: tLeaves.normal, roughness: 0.75, metalness: 0, alphaTest: 0.5, side: THREE.DoubleSide });
  MAT.leaves2 = new THREE.MeshStandardMaterial({ map: tLeaves2.map, normalMap: tLeaves2.normal, roughness: 0.7, metalness: 0, alphaTest: 0.5, side: THREE.DoubleSide });
  MAT.awningRed = pbr(tAwR, { side: THREE.DoubleSide }, 2.0);
  MAT.awningGreen = pbr(tAwG, { side: THREE.DoubleSide }, 2.0);
  MAT.fabric = (hex) => {
    const k = 'fabric' + hex; if (MAT[k]) return MAT[k];
    MAT[k] = pbr(tFabric, { color: new THREE.Color(hex), side: THREE.DoubleSide }, 1.0); return MAT[k];
  };
  for (const [k, hex] of Object.entries(PLASTER_COLORS)) {
    MAT['plaster_' + k] = GrimeChunk.apply(pbr(tPlaster, { color: new THREE.Color(hex) }, 3.0));
    MAT['plasterIn_' + k] = pbr(tPlaster, { color: new THREE.Color(hex), envMapIntensity: 0.35 }, 3.0);
  }
  for (const [k, hex] of Object.entries(SHUTTER_COLORS)) {
    MAT['shutter_' + k] = pbr(tPainted, { color: new THREE.Color(hex) }, 1.0);
  }
  MAT.paintWhite = pbr(tPainted, { color: new THREE.Color('#e9e5dc') }, 1.0);
  MAT.paintGreen = pbr(tPainted, { color: new THREE.Color('#2f5a43') }, 1.0);
  MAT.glass = new THREE.MeshPhysicalMaterial({ color: 0x1b2428, roughness: 0.06, metalness: 0.0, clearcoat: 1, clearcoatRoughness: 0.05, reflectivity: 0.6 });
  MAT.glassShop = new THREE.MeshPhysicalMaterial({ color: 0x2a3236, roughness: 0.08, metalness: 0.0, clearcoat: 1, clearcoatRoughness: 0.08, emissive: 0x2a2116, emissiveIntensity: 0.6 });
  MAT.dark = new THREE.MeshStandardMaterial({ color: 0x0d0b0a, roughness: 1, metalness: 0 });
  MAT.iron = new THREE.MeshStandardMaterial({ color: 0x1d1e1f, roughness: 0.55, metalness: 0.6 });
  MAT.brass = new THREE.MeshStandardMaterial({ color: 0xb08a4a, roughness: 0.35, metalness: 1 });
  MAT.chrome = new THREE.MeshStandardMaterial({ color: 0xd8d8d8, roughness: 0.12, metalness: 1 });
  MAT.rubber = new THREE.MeshStandardMaterial({ color: 0x151515, roughness: 0.9, metalness: 0 });
  MAT.carPaint = new THREE.MeshPhysicalMaterial({ color: 0x8fb7c4, roughness: 0.35, metalness: 0.2, clearcoat: 1, clearcoatRoughness: 0.12 });
  MAT.vespaPaint = new THREE.MeshPhysicalMaterial({ color: 0xc94a3b, roughness: 0.3, metalness: 0.15, clearcoat: 1, clearcoatRoughness: 0.1 });
  MAT.lampGlass = new THREE.MeshStandardMaterial({ color: 0xfff2d0, emissive: 0xffd27a, emissiveIntensity: 1.6, roughness: 0.3 });
  MAT.greenCross = new THREE.MeshStandardMaterial({ color: 0x0f7a3a, emissive: 0x18c25a, emissiveIntensity: 2.2, roughness: 0.4 });
  MAT.foliage = new THREE.MeshStandardMaterial({ color: 0x3b4a26, roughness: 0.9, metalness: 0, normalMap: tLeaves2.normal });
  MAT.cypress = new THREE.MeshStandardMaterial({ color: 0x24321c, roughness: 0.95, metalness: 0, normalMap: tBark.normal, normalScale: new THREE.Vector2(0.6, 0.6) });
  MAT.cypressFar = new THREE.MeshStandardMaterial({ color: 0x2a3622, roughness: 1, metalness: 0 });
  MAT.geranium = new THREE.MeshStandardMaterial({ color: 0xc8202c, roughness: 0.7, metalness: 0 });
  MAT.geranium2 = new THREE.MeshStandardMaterial({ color: 0xe0608a, roughness: 0.7, metalness: 0 });
  MAT.potGreen = new THREE.MeshStandardMaterial({ color: 0x3b5a28, roughness: 0.85, metalness: 0 });
  MAT.terracottaPot = GrimeChunk.apply(pbr(tCotto, { color: new THREE.Color('#d08a64') }, 0.8));
  MAT.waterTex = tWater.normal;
  MAT.water = new THREE.MeshPhysicalMaterial({
    color: 0x1f3d3c, roughness: 0.04, metalness: 0.0, normalMap: tWater.normal, normalScale: new THREE.Vector2(0.35, 0.35),
    transparent: true, opacity: 0.86, clearcoat: 1, clearcoatRoughness: 0.03,
  });
  MAT.produce = [0xe58a22, 0xf2d33a, 0xc8321e, 0x6a9b34, 0x8e2a4a].map((c) => new THREE.MeshStandardMaterial({ color: c, roughness: 0.55, metalness: 0 }));
  MAT.bottles = [0x2f5d2a, 0x6b2b18, 0xc9b26a, 0x203c5a].map((c) => new THREE.MeshPhysicalMaterial({ color: c, roughness: 0.1, metalness: 0, clearcoat: 1 }));
}
