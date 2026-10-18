// ===================================================================
// Renderer, lighting, sky, post-processing, graphics presets
// ===================================================================
// Legacy coarse level (0..3) still read by map/backdrop/catalog code through R.q
const QUALITY_NAMES = ['Bassa', 'Media', 'Alta', 'Ultra'];
// Graphics presets. Every field is one of the "Avanzate" controls in the settings screen:
//  scale  render scale (fraction of the device pixel ratio, capped by dpr)
//  shadow 0 off · 1 low (1024, one map) · 2 medium (2048, one map) · 3 high (near cascade 2048 + static map)
//         4 ultra (near 2048 + static 4096, soft PCSS) · 5 extreme (near 4096 + static 4096, PCSS 32 taps)
//  ao 0 off · 1 GTAO half res · 2 GTAO full res      bloom 0/1      aa 0 none · 1 MSAA 4x · 2 MSAA + SMAA
//  tex 0..3 texture size (reload)   aniso 1..16   dist 0 near · 1 medium · 2 far (camera far + fog)
//  bg 0..2 backdrop instances       fx 0..2 particles/decals   refl 0..2 sky reflection cube size
//  post 0 off · 1 grading + vignette · 2 cinematic (+ sun shafts + lens flare)
const GFX_PRESETS = {
  minimo: { n: 'Minimo', scale: 0.6, dpr: 1, shadow: 0, ao: 0, bloom: 0, aa: 0, tex: 0, aniso: 1, dist: 0, bg: 0, fx: 0, refl: 0, post: 0 },
  basso: { n: 'Basso', scale: 0.85, dpr: 1, shadow: 1, ao: 0, bloom: 0, aa: 1, tex: 1, aniso: 2, dist: 1, bg: 1, fx: 1, refl: 0, post: 0 },
  medio: { n: 'Medio', scale: 1, dpr: 1.25, shadow: 2, ao: 0, bloom: 0, aa: 1, tex: 1, aniso: 4, dist: 2, bg: 1, fx: 2, refl: 1, post: 0 },
  alto: { n: 'Alto', scale: 1, dpr: 1.5, shadow: 3, ao: 1, bloom: 1, aa: 1, tex: 2, aniso: 8, dist: 2, bg: 2, fx: 2, refl: 2, post: 1 },
  ultra: { n: 'Ultra', scale: 1, dpr: 2, shadow: 4, ao: 1, bloom: 1, aa: 1, tex: 3, aniso: 16, dist: 2, bg: 2, fx: 2, refl: 2, post: 1 },
  estremo: { n: 'Estremo', scale: 1, dpr: 2, shadow: 5, ao: 2, bloom: 1, aa: 2, tex: 3, aniso: 16, dist: 2, bg: 2, fx: 2, refl: 2, post: 2 },
};
const GFX_ORDER = ['minimo', 'basso', 'medio', 'alto', 'ultra', 'estremo'];
const GFX_KEYS = ['scale', 'shadow', 'ao', 'bloom', 'aa', 'tex', 'aniso', 'dist', 'bg', 'fx', 'refl', 'post'];
// shadow levels: near (camera-following) cascade size/half extent, static map size, filter (0 pcf, 1 pcss), taps
const SHADOW_LV = [
  null,
  { single: 1024 },
  { single: 2048 },
  { near: 2048, half: 16, far: 2048, filt: 0, taps: 12, btaps: 0 },
  { near: 2048, half: 13, far: 4096, filt: 1, taps: 20, btaps: 10 },
  { near: 4096, half: 15, far: 4096, filt: 1, taps: 32, btaps: 16 },
];
const SHADOW_D = 250; // distance of the cascade cameras from their target (depth range = 2 * D - 1)

function detectGPU() {
  let name = '';
  try {
    const c = document.createElement('canvas');
    const gl = c.getContext('webgl2') || c.getContext('webgl');
    const dbg = gl && gl.getExtension('WEBGL_debug_renderer_info');
    name = ((dbg && gl.getParameter(dbg.UNMASKED_RENDERER_WEBGL)) || (gl && gl.getParameter(gl.RENDERER)) || '').toLowerCase();
    const lose = gl && gl.getExtension('WEBGL_lose_context'); if (lose) lose.loseContext();
  } catch (e) { /* no gpu info */ }
  return name;
}
function isTouchDevice() {
  return (navigator.maxTouchPoints || 0) > 0 && (/android|iphone|ipad|ipod|mobile/i.test(navigator.userAgent) || ('ontouchstart' in window && matchMedia('(pointer: coarse)').matches));
}
function autoQuality() {
  const name = detectGPU();
  if (isTouchDevice()) return 0;
  if (/swiftshader|llvmpipe|software|microsoft basic/.test(name)) return 0;
  if (/nvidia|geforce|rtx|gtx|quadro|radeon rx|radeon pro|apple m[1-9]|apple gpu/.test(name)) return 2;
  return 1;
}
// preset picked by "Automatico"
function autoPreset() { return ['basso', 'medio', 'alto'][autoQuality()]; }
// normalise the stored preference (old builds stored 0..3)
function gfxPresetId(pref) {
  if (pref === 'auto' || pref === 'custom' || GFX_PRESETS[pref]) return pref;
  const n = +pref;
  if (Number.isFinite(n)) return ['basso', 'medio', 'alto', 'ultra'][clamp(Math.round(n), 0, 3)];
  return 'auto';
}
// the effective advanced values for the current settings
function gfxConfig() {
  const id = gfxPresetId(SETTINGS.quality);
  const base = GFX_PRESETS[id === 'auto' ? autoPreset() : id === 'custom' ? 'medio' : id];
  const cfg = Object.assign({}, base);
  if (id === 'custom' && SETTINGS.gfx && typeof SETTINGS.gfx === 'object') {
    for (const k of GFX_KEYS) if (typeof SETTINGS.gfx[k] === 'number' && Number.isFinite(SETTINGS.gfx[k])) cfg[k] = SETTINGS.gfx[k];
  }
  cfg.scale = clamp(cfg.scale, 0.4, 1); cfg.shadow = clamp(cfg.shadow | 0, 0, 5); cfg.ao = clamp(cfg.ao | 0, 0, 2);
  cfg.aa = clamp(cfg.aa | 0, 0, 2); cfg.tex = clamp(cfg.tex | 0, 0, 3); cfg.aniso = clamp(cfg.aniso | 0, 1, 16);
  for (const k of ['bloom']) cfg[k] = cfg[k] ? 1 : 0;
  for (const k of ['dist', 'bg', 'fx', 'refl', 'post']) cfg[k] = clamp(cfg[k] | 0, 0, 2);
  if (id === 'custom') cfg.dpr = cfg.shadow >= 4 || cfg.tex >= 3 ? 2 : cfg.tex >= 2 ? 1.5 : 1.25;
  // coarse legacy level for the map builders (backdrop detail) and editor textures
  const pid = id === 'auto' ? autoPreset() : id;
  cfg.lq = id === 'custom' ? clamp(cfg.tex, 0, 3) : { minimo: 0, basso: 0, medio: 1, alto: 2, ultra: 3, estremo: 3 }[pid];
  cfg.id = id;
  return cfg;
}

const SUN_DIR = new THREE.Vector3(-0.58, 0.5, 0.64).normalize();
// time-of-day presets: sun direction/colour/intensity, Sky params [turbidity, rayleigh, mie, mieG]
// or a gradient dome [top, horizon, stars], fog [colour, density], hemisphere [sky, ground, intensity]
// grade: [saturation, contrast, warmth] applied by the final pass (post >= 1); pen: shadow penumbra per metre
const ENV_PRESETS = {
  borgo: { n: 'Pomeriggio', sun: [-0.58, 0.5, 0.64], sunC: 0xffdcb4, sunI: 3.4, sky: [5.5, 1.25, 0.0055, 0.86], fog: [0xc7c2b5, 0.0016], hemi: [0xfff1dc, 0x6b5640, 0.35], env: 0.75, exp: 0.95, grade: [1.1, 1.08, 0.04] },
  alba: { n: 'Alba', sun: [0.78, 0.1, 0.42], sunC: 0xffb07a, sunI: 2.3, sky: [7, 2.6, 0.008, 0.88], fog: [0xd6b7a6, 0.002], hemi: [0xffd6c0, 0x5a4a50, 0.42], env: 0.8, exp: 1.05, grade: [1.05, 1.05, 0.05] },
  mattina: { n: 'Mattina', sun: [0.55, 0.42, 0.35], sunC: 0xfff0d8, sunI: 3.2, sky: [4, 1.4, 0.005, 0.85], fog: [0xc4cdd4, 0.0014], hemi: [0xe4eeff, 0x6b5a48, 0.4], env: 0.8, exp: 0.95, grade: [1.08, 1.06, 0.0] },
  deserto: { n: 'Deserto', sun: [0.52, 0.6, 0.6], sunC: 0xfff0d6, sunI: 3.9, sky: [7, 1.05, 0.006, 0.86], fog: [0xd9c8a8, 0.0013], hemi: [0xfff0dc, 0x8a6a48, 0.42], env: 0.82, exp: 0.9, grade: [1.06, 1.1, 0.03] },
  mezzogiorno: { n: 'Mezzogiorno', sun: [0.2, 0.92, 0.3], sunC: 0xfff6ea, sunI: 3.8, sky: [3, 1.0, 0.004, 0.8], fog: [0xbfcbd6, 0.0012], hemi: [0xdfeaff, 0x6b5a48, 0.45], env: 0.85, exp: 0.9, grade: [1.06, 1.06, 0.0] },
  tramonto: { n: 'Tramonto', sun: [-0.72, 0.07, 0.69], sunC: 0xff8c4c, sunI: 2.3, sky: [9, 3.2, 0.012, 0.92], fog: [0xc98a6e, 0.0022], hemi: [0xffc0a0, 0x4a3a40, 0.42], env: 0.8, exp: 1.1, grade: [1.1, 1.06, 0.06] },
  notte: { n: 'Notte', sun: [0.35, 0.62, -0.42], sunC: 0x9fb4ff, sunI: 0.55, dome: [0x050914, 0x18233e, 1], fog: [0x0d1324, 0.006], hemi: [0x34406a, 0x0c0c10, 0.55], env: 0.55, exp: 1.25, grade: [0.95, 1.05, -0.04] },
  nuvoloso: { n: 'Nuvoloso', sun: [0.3, 0.7, 0.4], sunC: 0xe8eef2, sunI: 1.2, dome: [0x8f979e, 0xc5c9cb, 0], fog: [0xb4b9bc, 0.004], hemi: [0xd0d8e0, 0x55524c, 0.95], env: 1.0, exp: 1.0, soft: true, grade: [1.0, 1.04, -0.01] },
  nebbia: { n: 'Nebbia', sun: [0.3, 0.6, 0.4], sunC: 0xe8e8e0, sunI: 1.0, dome: [0xb4b8b8, 0xc2c6c6, 0], fog: [0xc0c4c4, 0.02], hemi: [0xd8dcdc, 0x5a5a56, 1.0], env: 1.0, exp: 1.0, soft: true, grade: [0.98, 1.02, 0.0] },
};

// ---------------------------------------------------------------------
// Shader patches (global ShaderChunk edits, applied once before anything compiles).
// Cascaded sun shadows: directional shadow light 0 is the sun with the camera-following near cascade,
// light 1 (zero intensity) carries the static whole-map cascade. Selection by shadow-map bounds with a
// blend band, receiver-plane depth bias, PCF or PCSS (contact-hardening) filtering.
// Parameters come from shared uniforms injected into every lit material (Material.prototype.onBeforeCompile
// + GrimeChunk); a material without them falls back to the stock three.js shadow code.
const RafShade = {
  U: {
    rafCsm: { value: new THREE.Vector4(0, 0, 0.012, SHADOW_D * 2 - 1) }, // x cascades on, y filter (0 pcf / 1 pcss), z penumbra per metre, w depth range
    rafCsm2: { value: new THREE.Vector4(16, 62, 12, 0) }, // x near half extent, y far half extent, z filter taps, w blocker taps
    rafSky: { value: new THREE.Vector4(0, 0.4, 0.002, 0.001) }, // x sky occlusion on, y interior floor, z filter radius (uv), w depth bias
  },
  installed: false,
  install() {
    if (this.installed) return;
    this.installed = true;
    const C = THREE.ShaderChunk;
    C.shadowmap_pars_fragment = C.shadowmap_pars_fragment + /* glsl */`
#if defined( USE_SHADOWMAP ) && NUM_DIR_LIGHT_SHADOWS > 0
uniform vec4 rafCsm;
uniform vec4 rafCsm2;
uniform vec4 rafSky;
float rafIGN( vec2 p ) { return fract( 52.9829189 * fract( dot( p, vec2( 0.06711056, 0.00583715 ) ) ) ); }
vec2 rafVogel( int i, int n, float rot ) {
  float r = sqrt( ( float( i ) + 0.5 ) / float( n ) );
  float a = float( i ) * 2.3999632 + rot;
  return vec2( cos( a ), sin( a ) ) * r;
}
vec2 rafRPDB( vec3 dx, vec3 dy, float lim ) {
  float det = dx.x * dy.y - dx.y * dy.x;
  if ( abs( det ) < 1e-14 ) return vec2( 0.0 );
  vec2 b = vec2( dy.y * dx.z - dx.y * dy.z, dx.x * dy.z - dy.x * dx.z ) / det;
  return clamp( b, vec2( - lim ), vec2( lim ) );
}
float rafFilter( sampler2D map, vec3 p, vec3 dx, vec3 dy, vec2 size, float halfExt ) {
  if ( p.x < 0.0 || p.x > 1.0 || p.y < 0.0 || p.y > 1.0 || p.z > 1.0 ) return 1.0;
  float texel = 1.0 / size.x;
  float uvPerM = 1.0 / ( 2.0 * halfExt );
  float range = rafCsm.w;
  // receiver plane bias (limited to ~80 degree slopes) + one texel of constant bias
  vec2 rp = rafRPDB( dx, dy, 6.0 * 2.0 * halfExt / range );
  float z = p.z - 1.2 * texel * 2.0 * halfExt / range;
  float rot = rafIGN( gl_FragCoord.xy ) * 6.2831853;
  int nf = int( rafCsm2.z );
  float rad = 1.6 * texel;
  if ( rafCsm.y > 0.5 ) {
    int nb = int( rafCsm2.w );
    float search = clamp( rafCsm.z * 14.0 * uvPerM, 3.0 * texel, 60.0 * texel );
    float bsum = 0.0, bn = 0.0;
    for ( int i = 0; i < 32; i ++ ) {
      if ( i >= nb ) break;
      vec2 o = rafVogel( i, nb, rot ) * search;
      float d = unpackRGBAToDepth( texture2D( map, p.xy + o ) );
      if ( d < z + dot( o, rp ) ) { bsum += d; bn += 1.0; }
    }
    if ( bn < 0.5 ) return 1.0;
    float pen = ( z - bsum / bn ) * range * rafCsm.z;
    rad = clamp( pen * uvPerM, 1.6 * texel, search );
  }
  float sum = 0.0;
  for ( int i = 0; i < 64; i ++ ) {
    if ( i >= nf ) break;
    vec2 o = rafVogel( i, nf, rot + 1.7 ) * rad;
    sum += step( z + dot( o, rp ), unpackRGBAToDepth( texture2D( map, p.xy + o ) ) );
  }
  return sum / float( max( nf, 1 ) );
}
float rafSunShadow() {
  vec3 p0 = vDirectionalShadowCoord[ 0 ].xyz / vDirectionalShadowCoord[ 0 ].w;
  vec3 dx0 = dFdx( p0 ), dy0 = dFdy( p0 );
  #if NUM_DIR_LIGHT_SHADOWS > 1
  vec3 p1 = vDirectionalShadowCoord[ 1 ].xyz / vDirectionalShadowCoord[ 1 ].w;
  vec3 dx1 = dFdx( p1 ), dy1 = dFdy( p1 );
  float e0 = max( abs( p0.x - 0.5 ), abs( p0.y - 0.5 ) ) * 2.0;
  float w1 = smoothstep( 0.8, 0.96, e0 );
  #else
  float w1 = 0.0;
  #endif
  float s = 1.0;
  if ( w1 < 1.0 ) s = rafFilter( directionalShadowMap[ 0 ], p0, dx0, dy0, directionalLightShadows[ 0 ].shadowMapSize, rafCsm2.x );
  #if NUM_DIR_LIGHT_SHADOWS > 1
  if ( w1 > 0.0 ) s = mix( s, rafFilter( directionalShadowMap[ 1 ], p1, dx1, dy1, directionalLightShadows[ 1 ].shadowMapSize, rafCsm2.y ), w1 );
  #endif
  return s;
}
// sky visibility from the static top-down map (light 2): roofs, porches and interiors get less sky light
float rafSkyVis() {
  #if NUM_DIR_LIGHT_SHADOWS > 2
  if ( rafSky.x < 0.5 ) return 1.0;
  vec3 p = vDirectionalShadowCoord[ 2 ].xyz / vDirectionalShadowCoord[ 2 ].w;
  if ( p.x < 0.0 || p.x > 1.0 || p.y < 0.0 || p.y > 1.0 || p.z > 1.0 ) return 1.0;
  float rot = rafIGN( gl_FragCoord.xy + 17.0 ) * 6.2831853;
  float v = 0.0;
  for ( int i = 0; i < 8; i ++ ) {
    vec2 o = rafVogel( i, 8, rot ) * rafSky.z;
    v += step( p.z - rafSky.w, unpackRGBAToDepth( texture2D( directionalShadowMap[ 2 ], p.xy + o ) ) );
  }
  return mix( rafSky.y, 1.0, v / 8.0 );
  #else
  return 1.0;
  #endif
}
#endif
`;
    const stock = 'directLight.color *= ( directLight.visible && receiveShadow ) ? getShadow( directionalShadowMap[ i ], directionalLightShadow.shadowMapSize, directionalLightShadow.shadowIntensity, directionalLightShadow.shadowBias, directionalLightShadow.shadowRadius, vDirectionalShadowCoord[ i ] ) : 1.0;';
    const lb = C.lights_fragment_begin;
    if (lb.indexOf(stock) < 0) { console.warn('RafShade: lights chunk not recognised, stock shadows'); return; }
    const vanilla = stock.replace('directLight.color *= ( directLight.visible && receiveShadow ) ? ', '').replace(' : 1.0;', '');
    C.lights_fragment_begin = lb.replace(stock,
      '#if ( UNROLLED_LOOP_INDEX == 0 )\n' +
      '\t\tdirectLight.color *= ( directLight.visible && receiveShadow ) ? ( rafCsm.x > 0.5 ? rafSunShadow() : ' + vanilla + ' ) : 1.0;\n' +
      '\t\t#else\n' +
      '\t\tdirectLight.color *= ( directLight.visible && receiveShadow && rafCsm.x < 0.5 ) ? ' + vanilla + ' : 1.0;\n' +
      '\t\t#endif');
    C.lights_fragment_end = '#if defined( USE_SHADOWMAP ) && NUM_DIR_LIGHT_SHADOWS > 2\n{ float rafSV = rafSkyVis();\n' +
      '#if defined( RE_IndirectDiffuse )\n irradiance *= rafSV; iblIrradiance *= rafSV;\n#endif\n' +
      '#if defined( RE_IndirectSpecular )\n radiance *= rafSV; clearcoatRadiance *= rafSV;\n#endif\n}\n#endif\n' + C.lights_fragment_end;
    const self = this;
    THREE.Material.prototype.onBeforeCompile = function (sh) { self.inject(sh); };
  },
  // add the shared uniforms to a lit material's shader (called for every material compile)
  inject(sh) {
    if (!sh || !sh.uniforms || !sh.fragmentShader || sh.fragmentShader.indexOf('lights_fragment_begin') < 0) return;
    for (const k in this.U) sh.uniforms[k] = this.U[k];
  },
};

const R = {
  q: 1, cfg: null, renderer: null, scene: null, camera: null, vmScene: null, vmCamera: null,
  sun: null, sunFar: null, vmSun: null, composer: null, gtao: null, bloom: null, finalPass: null, smaa: null,
  envRT: null, dpr: 1, dynScale: 1, w: 1, h: 1, ctxAA: false, pendingReload: false,
  init(container) {
    RafShade.install();
    this.cfg = gfxConfig();
    const c = this.cfg;
    this.q = c.lq;
    this.texLevel = c.tex;
    // MSAA on the default framebuffer only matters without post-processing
    this.ctxAA = c.aa > 0 && !this.wantsComposer(c);
    const renderer = new THREE.WebGLRenderer({ antialias: this.ctxAA, powerPreference: 'high-performance', stencil: false });
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 0.95;
    renderer.shadowMap.enabled = !(window.__RAF_TEST && window.__RAF_TEST.noshadow) && c.shadow > 0;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    renderer.setClearColor(0x000000, 1);
    container.appendChild(renderer.domElement);
    renderer.domElement.id = 'gl';
    this.renderer = renderer;
    this.scene = new THREE.Scene();
    this.camera = new THREE.PerspectiveCamera(SETTINGS.fov, 1, 0.05, 2600);
    this.camera.rotation.order = 'YXZ';
    this.vmScene = new THREE.Scene();
    this.vmCamera = new THREE.PerspectiveCamera(66, 1, 0.01, 10);
    this.scene.add(this.camera);
    TexGen.init(renderer);
    return this;
  },
  wantsComposer(c) { return c.ao > 0 || c.bloom > 0 || c.post > 0 || c.aa === 2; },
  // dynamic resolution only in "Automatico"
  dynRes() { return gfxPresetId(SETTINGS.quality) === 'auto'; },
  setupSky() {
    const sky = new Sky(); sky.scale.setScalar(1000);
    this.skyMesh = sky;
    // gradient dome with stars for night / overcast / fog presets
    this.dome = new THREE.Mesh(new THREE.SphereGeometry(900, 32, 16), new THREE.ShaderMaterial({
      uniforms: { top: { value: new THREE.Color() }, hor: { value: new THREE.Color() }, stars: { value: 0 }, moon: { value: new THREE.Vector3(0, 1, 0) } },
      vertexShader: 'varying vec3 vDir; void main(){ vDir = normalize(position); gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }',
      fragmentShader: /* glsl */`
        uniform vec3 top; uniform vec3 hor; uniform float stars; uniform vec3 moon; varying vec3 vDir;
        float hh(vec3 p){ return fract(sin(dot(p, vec3(12.9898, 78.233, 37.719))) * 43758.5453); }
        void main(){
          vec3 d = normalize(vDir);
          float y = clamp(d.y, -0.2, 1.0);
          vec3 c = mix(hor, top, pow(max(y, 0.0), 0.45));
          vec3 q = floor(d * 320.0);
          float s = step(0.9972, hh(q)) * smoothstep(0.02, 0.3, y) * stars;
          c += vec3(s) * (0.5 + 0.8 * hh(q + 1.0));
          float m = max(dot(d, normalize(moon)), 0.0);
          c += stars * (vec3(0.9, 0.95, 1.0) * smoothstep(0.9993, 0.9996, m) * 3.0 + vec3(0.08, 0.1, 0.16) * pow(m, 60.0));
          gl_FragColor = vec4(c, 1.0);
        }`,
      side: THREE.BackSide, depthWrite: false,
    }));
    this.skyScene = new THREE.Scene(); this.skyScene.add(sky, this.dome);
    this.makeCube();
    this.scene.fog = new THREE.FogExp2(0xc7c2b5, 0.0016);
    // sun (also the near shadow cascade) + zero-intensity light carrying the static whole-map cascade
    const sun = new THREE.DirectionalLight(0xffdcb4, 3.4);
    sun.castShadow = true;
    this.scene.add(sun, sun.target);
    this.sun = sun;
    const far = new THREE.DirectionalLight(0xffffff, 0);
    far.castShadow = false;
    far.shadow.autoUpdate = false;
    this.scene.add(far, far.target);
    this.sunFar = far;
    // zero-intensity light looking straight down: static sky-visibility map (Ultra/Estremo)
    const skyL = new THREE.DirectionalLight(0xffffff, 0);
    skyL.castShadow = false;
    skyL.shadow.autoUpdate = false;
    this.scene.add(skyL, skyL.target);
    this.sunSky = skyL;
    this.hemi = new THREE.HemisphereLight(0xfff1dc, 0x6b5640, 0.35);
    this.scene.add(this.hemi);
    // viewmodel lights (mirror the world sun direction in camera space each frame)
    this.vmSun = new THREE.DirectionalLight(0xffdcb4, 2.6);
    this.vmScene.add(this.vmSun, this.vmSun.target);
    this.vmHemi = new THREE.HemisphereLight(0xfff1dc, 0x5a4a3a, 0.45);
    this.vmScene.add(this.vmHemi);
    this.vmShade = 1;
    this.shadowHalf = 62;
    this.setupShadows();
    this.applyAniso();
    this.applyEnv('borgo');
    this.setShadowExtent(62);
    this.applyView();
  },
  makeCube() {
    const size = [256, 512, 1024][this.cfg.refl];
    if (this.cubeRT && this.cubeRT.width === size) return false;
    if (this.cubeRT) this.cubeRT.dispose();
    this.cubeRT = new THREE.WebGLCubeRenderTarget(size, { type: THREE.HalfFloatType, generateMipmaps: true, minFilter: THREE.LinearMipmapLinearFilter });
    this.cubeCam = new THREE.CubeCamera(1, 5000, this.cubeRT);
    this.scene.background = this.cubeRT.texture;
    return true;
  },
  // shadow maps for the current level (live)
  setupShadows() {
    const c = this.cfg, L = SHADOW_LV[c.shadow], sun = this.sun, far = this.sunFar;
    const test = window.__RAF_TEST && window.__RAF_TEST.noshadow;
    this.renderer.shadowMap.enabled = !!L && !test;
    const disp = (l) => { if (l.shadow.map) { l.shadow.map.dispose(); l.shadow.map = null; } };
    disp(sun); disp(far); disp(this.sunSky);
    sun.castShadow = !!L;
    this.cascaded = !!(L && L.near);
    far.castShadow = this.cascaded;
    this.skyOcc = this.cascaded && c.shadow >= 4;
    this.sunSky.castShadow = this.skyOcc;
    this.sunSky.shadow.mapSize.set(2048, 2048);
    RafShade.U.rafSky.value.x = this.skyOcc ? 1 : 0;
    const U = RafShade.U;
    if (typeof Game !== 'undefined') this.lampShadows(Game, false);
    if (!L) { U.rafCsm.value.x = 0; return; }
    if (this.cascaded) {
      sun.shadow.mapSize.set(L.near, L.near);
      far.shadow.mapSize.set(L.far, L.far);
      U.rafCsm.value.x = 1; U.rafCsm.value.y = L.filt; U.rafCsm2.value.x = L.half;
      U.rafCsm2.value.z = L.taps; U.rafCsm2.value.w = L.btaps;
      for (const l of [sun, far]) { const sc = l.shadow.camera; sc.near = 1; sc.far = SHADOW_D * 2; sc.updateProjectionMatrix(); }
      sun.shadow.bias = 0; sun.shadow.normalBias = 1.5 * 2 * L.half / L.near;
      sun.shadow.autoUpdate = true;
    } else {
      sun.shadow.mapSize.set(L.single, L.single);
      U.rafCsm.value.x = 0;
      sun.shadow.bias = -0.00025; sun.shadow.normalBias = 0.035;
      sun.shadow.radius = 3; sun.shadow.autoUpdate = true;
    }
    this.staticDirty = true;
    // all lit programs depend on the number of shadow lights: they recompile on their own
  },
  // time of day / weather; regenerates the sky cube map and the image-based lighting
  applyEnv(name, force) {
    const P = ENV_PRESETS[name] || ENV_PRESETS.borgo;
    if (!force && this.envName === name && this.envRT) return;
    this.envName = name;
    this.envP = P;
    SUN_DIR.set(P.sun[0], P.sun[1], P.sun[2]).normalize();
    if (P.dome) {
      this.skyMesh.visible = false; this.dome.visible = true;
      const u = this.dome.material.uniforms;
      u.top.value.setHex(P.dome[0]); u.hor.value.setHex(P.dome[1]); u.stars.value = P.dome[2] || 0; u.moon.value.copy(SUN_DIR);
    } else {
      this.skyMesh.visible = true; this.dome.visible = false;
      const u = this.skyMesh.material.uniforms;
      u.turbidity.value = P.sky[0]; u.rayleigh.value = P.sky[1]; u.mieCoefficient.value = P.sky[2]; u.mieDirectionalG.value = P.sky[3];
      u.sunPosition.value.copy(SUN_DIR);
    }
    this.cubeCam.update(this.renderer, this.skyScene);
    const pm = new THREE.PMREMGenerator(this.renderer);
    const old = this.envRT;
    this.envRT = pm.fromCubemap(this.cubeRT.texture);
    pm.dispose();
    if (old) old.dispose();
    this.scene.environment = this.envRT.texture;
    // with post-processing (Alto and up) a darker sky fill gives deeper, more readable sun shadows
    const amb = this.cfg.post > 0 ? 0.82 : 1;
    this.scene.environmentIntensity = P.env * amb;
    this.vmScene.environment = this.envRT.texture;
    this.vmScene.environmentIntensity = P.env + 0.05;
    this.fogBase = P.fog[1];
    this.scene.fog.color.setHex(P.fog[0]); this.applyView();
    this.sun.color.setHex(P.sunC); this.sun.intensity = P.sunI;
    this.sun.shadow.radius = P.soft ? 9 : 3;
    RafShade.U.rafCsm.value.z = P.soft ? 0.08 : 0.014;
    this.hemi.color.setHex(P.hemi[0]); this.hemi.groundColor.setHex(P.hemi[1]); this.hemi.intensity = P.hemi[2] * amb * amb;
    this.vmSun.color.setHex(P.sunC); this.vmSunBase = Math.min(2.6, P.sunI * 0.8);
    this.vmHemi.color.setHex(P.hemi[0]); this.vmHemi.groundColor.setHex(P.hemi[1]); this.vmHemi.intensity = P.hemi[2] + 0.1;
    this.renderer.toneMappingExposure = P.exp;
    if (this.bloom) this.bloom.threshold = Math.max(1, P.sunI * 1.1);
    this.setShadowExtent(this.shadowHalf);
  },
  // view distance: camera far plane and fog density
  applyView() {
    if (!this.scene || !this.scene.fog) return;
    const d = this.cfg.dist;
    this.camera.far = [700, 1400, 2600][d]; this.camera.updateProjectionMatrix();
    this.scene.fog.density = (this.fogBase || 0.0016) * [1.7, 1.2, 1][d];
  },
  setShadowExtent(half) {
    this.shadowHalf = half;
    if (this.cascaded) {
      // static whole-map cascade, centred on the map
      const far = this.sunFar, sc = far.shadow.camera, h = half + 4;
      sc.left = -h; sc.right = h; sc.top = h; sc.bottom = -h; sc.near = 1; sc.far = SHADOW_D * 2; sc.updateProjectionMatrix();
      far.target.position.set(0, 0, 0); far.position.copy(SUN_DIR).multiplyScalar(SHADOW_D);
      far.shadow.normalBias = 1.5 * 2 * h / far.shadow.mapSize.x; far.shadow.bias = 0;
      RafShade.U.rafCsm2.value.y = h;
      // sky map: same footprint seen from (almost) straight above
      const sk = this.sunSky, ss = sk.shadow.camera;
      ss.left = -h; ss.right = h; ss.top = h; ss.bottom = -h; ss.near = 1; ss.far = SHADOW_D * 2; ss.updateProjectionMatrix();
      sk.target.position.set(0, 0, 0); sk.position.set(0.02, 1, 0.015).normalize().multiplyScalar(SHADOW_D);
      sk.shadow.normalBias = 0.3; sk.shadow.bias = 0;
      const U2 = RafShade.U.rafSky.value;
      U2.z = 0.3 / (2 * h); U2.w = 0.25 / (SHADOW_D * 2 - 1);
      this.staticDirty = true;
      this.updateCascades();
      return;
    }
    const sc = this.sun.shadow.camera, d = Math.max(150, half * 2.2);
    sc.left = -half; sc.right = half; sc.top = half; sc.bottom = -half; sc.near = Math.max(1, d - half * 2.2); sc.far = d + half * 2.2;
    sc.updateProjectionMatrix();
    this.sun.position.copy(SUN_DIR).multiplyScalar(d);
    this.sun.target.position.set(0, 0, 0);
  },
  // near cascade follows the camera, snapped to whole shadow texels (no shimmering when moving or turning)
  updateCascades() {
    if (!this.cascaded) return;
    const L = SHADOW_LV[this.cfg.shadow], h = L.half, texel = 2 * h / L.near;
    const cam = this.camera, sun = this.sun;
    const X = _rv1.crossVectors(UP, SUN_DIR).normalize(), Y = _rv2.crossVectors(SUN_DIR, X);
    const p = cam.getWorldPosition(_rv3);
    const f = cam.getWorldDirection(_rv4); f.y = 0;
    if (f.lengthSq() > 1e-6) f.normalize();
    p.addScaledVector(f, h * 0.45);
    const cx = Math.round(p.dot(X) / texel) * texel, cy = Math.round(p.dot(Y) / texel) * texel, cz = p.dot(SUN_DIR);
    const c = _rv5.set(0, 0, 0).addScaledVector(X, cx).addScaledVector(Y, cy).addScaledVector(SUN_DIR, cz);
    const sc = sun.shadow.camera;
    if (sc.right !== h) { sc.left = -h; sc.right = h; sc.top = h; sc.bottom = -h; sc.near = 1; sc.far = SHADOW_D * 2; sc.updateProjectionMatrix(); }
    sun.target.position.copy(c);
    sun.position.copy(c).addScaledVector(SUN_DIR, SHADOW_D);
  },
  // render the static cascade once (map geometry only, players and effects hidden)
  renderStatic() {
    const far = this.sunFar, scene = this.scene, G = typeof Game !== 'undefined' ? Game : null;
    const keep = new Set(G ? [G.mapGroup, G.backdrop && G.backdrop.group].filter(Boolean) : []);
    const hidden = [];
    if (G && !G.editor) for (const o of scene.children) if (o.visible && !o.isLight && !o.isCamera && !keep.has(o)) { o.visible = false; hidden.push(o); }
    // a regular render call (shadow maps can only be drawn inside one) into a 1x1 target, with a camera
    // whose frustum holds nothing: only the static shadow map gets drawn
    const r = this.renderer, sun = this.sun;
    if (!this._dummyRT) {
      this._dummyRT = new THREE.WebGLRenderTarget(1, 1);
      this._dummyCam = new THREE.PerspectiveCamera(1, 1, 0.001, 0.002);
      this._dummyCam.position.set(0, -9000, 0); this._dummyCam.lookAt(0, -10000, 0); this._dummyCam.updateMatrixWorld();
    }
    const prevRT = r.getRenderTarget(), bg = scene.background;
    // Estremo: the (few) interior lamps of the map cast static shadows too
    this.lampShadows(G, true);
    try {
      sun.shadow.autoUpdate = false; sun.shadow.needsUpdate = false;
      far.shadow.needsUpdate = true;
      if (this.skyOcc) this.sunSky.shadow.needsUpdate = true;
      scene.background = null;
      r.setRenderTarget(this._dummyRT);
      r.render(scene, this._dummyCam);
    } finally {
      r.setRenderTarget(prevRT);
      scene.background = bg;
      sun.shadow.autoUpdate = true;
      for (const o of hidden) o.visible = true;
    }
    this.staticDirty = false;
  },
  lampShadows(G, refresh) {
    const lights = (G && G.mapLights) || [];
    const on = this.cascaded && this.cfg.shadow >= 5;
    const pick = on ? lights.filter((l) => l.isPointLight).slice(0, 2) : [];
    for (const l of lights) {
      const want = pick.indexOf(l) >= 0;
      if (l.castShadow !== want) {
        l.castShadow = want;
        if (!want && l.shadow && l.shadow.map) { l.shadow.map.dispose(); l.shadow.map = null; }
      }
      if (want && refresh) {
        const sh = l.shadow;
        sh.autoUpdate = false; sh.needsUpdate = true; sh.mapSize.set(512, 512);
        sh.bias = -0.002; sh.normalBias = 0.03; sh.radius = 2;
        sh.camera.near = 0.1; sh.camera.far = Math.max(4, l.distance || 20); sh.camera.updateProjectionMatrix();
      }
    }
  },
  // live application of a new configuration (settings screen)
  applyGfx() {
    const prev = this.cfg, c = gfxConfig();
    this.cfg = c;
    this.pendingReload = c.tex !== this.texLevel;
    if (prev.shadow !== c.shadow) this.setupShadows();
    const cube = prev.refl !== c.refl && this.makeCube();
    if (cube || (prev.post > 0) !== (c.post > 0)) this.applyEnv(this.envName, true);
    else if (prev.shadow !== c.shadow) this.setShadowExtent(this.shadowHalf);
    if (prev.aniso !== c.aniso) this.applyAniso();
    if (prev.dist !== c.dist) this.applyView();
    if (prev.bg !== c.bg) this.applyBackdrop();
    if (typeof FX !== 'undefined' && FX.setDensity) FX.setDensity([0.35, 0.65, 1][c.fx]);
    this.dynScale = 1;
    const post = ['ao', 'bloom', 'aa', 'post', 'scale'].some((k) => prev[k] !== c[k]) || prev.dpr !== c.dpr;
    if (post) { this.applyPixelRatio(); this.buildPost(); this.resize(true); }
    return c;
  },
  // anisotropic filtering on every texture of the shared materials (generated render targets included)
  applyAniso() {
    const r = this.renderer, gl = r.getContext(), ext = r.extensions.get('EXT_texture_filter_anisotropic');
    const max = r.capabilities.getMaxAnisotropy();
    const v = Math.max(1, Math.min(max, this.cfg.aniso));
    const seen = new Set();
    for (const k in MAT) {
      const m = MAT[k];
      if (!m || !m.isMaterial) continue;
      for (const t of [m.map, m.normalMap, m.roughnessMap]) {
        if (!t || seen.has(t)) continue;
        seen.add(t);
        const big = t.userData.rafBig != null ? t.userData.rafBig : t.anisotropy > 2;
        t.userData.rafBig = big;
        const a = big ? v : Math.min(2, v);
        t.anisotropy = a;
        const p = r.properties.get(t);
        if (ext && p.__webglTexture) { r.state.bindTexture(gl.TEXTURE_2D, p.__webglTexture); gl.texParameterf(gl.TEXTURE_2D, ext.TEXTURE_MAX_ANISOTROPY_EXT, a); p.__currentAnisotropy = a; }
      }
    }
  },
  // background density: thin out the instanced backdrop (trees, olive groves) built by the map
  applyBackdrop() {
    const g = Game.backdrop && Game.backdrop.group;
    if (!g) return;
    const f = [0.35, 0.65, 1][this.cfg.bg];
    g.traverse((o) => {
      if (!o.isInstancedMesh) return;
      if (o.userData.rafFull == null) o.userData.rafFull = o.count;
      o.count = Math.max(1, Math.round(o.userData.rafFull * (o.userData.rafFull > 100 ? f : 1)));
    });
    this._bdSeen = Game.backdrop;
  },
  buildPost() {
    if (this.composer) { this.composer.dispose(); this.composer = null; }
    this.gtao = null; this.bloom = null; this.finalPass = null; this.smaa = null;
    const c = this.cfg;
    const r = this.renderer;
    r.toneMapping = THREE.ACESFilmicToneMapping;
    const needAA = c.aa > 0 && !this.ctxAA;
    if (!this.wantsComposer(c) && !needAA) return;
    const size = r.getDrawingBufferSize(new THREE.Vector2());
    const rt = new THREE.WebGLRenderTarget(size.x, size.y, { type: THREE.HalfFloatType, samples: c.aa > 0 ? 4 : 0 });
    const comp = new EffectComposer(r, rt);
    comp.addPass(new RenderPass(this.scene, this.camera));
    if (c.ao > 0) {
      const scale = c.ao >= 2 ? 1 : 0.5;
      this.gtao = new GTAOPass(this.scene, this.camera, Math.max(2, size.x * scale), Math.max(2, size.y * scale));
      this.gtao.updateGtaoMaterial({ radius: c.ao >= 2 ? 0.8 : 0.6, distanceExponent: 1.6, thickness: 1.2, scale: 1.0, samples: c.ao >= 2 ? 16 : 10, distanceFallOff: 1.0 });
      this.gtao.updatePdMaterial({ lumaPhi: 10, depthPhi: 2, normalPhi: 3, radius: 6, rings: 2, samples: 12 });
      this.gtao.blendIntensity = 0.85;
      comp.addPass(this.gtao);
    }
    const vp = new RenderPass(this.vmScene, this.vmCamera);
    vp.clear = false; vp.clearDepth = true;
    comp.addPass(vp);
    if (c.bloom) {
      const P = this.envP || ENV_PRESETS.borgo;
      this.bloom = new UnrealBloomPass(new THREE.Vector2(size.x / 2, size.y / 2), 0.24, 0.55, Math.max(1, P.sunI * 1.1));
      comp.addPass(this.bloom);
    }
    comp.addPass(new OutputPass());
    if (c.aa === 2) { this.smaa = new SMAAPass(size.x, size.y); comp.addPass(this.smaa); }
    if (c.post > 0) {
      this.finalPass = new ShaderPass({
        uniforms: {
          tDiffuse: { value: null }, tDepth: { value: this.gtao && c.post >= 2 ? this.gtao.depthTexture : null }, uVig: { value: 0.3 }, uTime: { value: 0 }, uGrain: { value: 0.02 },
          uGrade: { value: new THREE.Vector3(1.08, 1.06, 0.03) }, uSun: { value: new THREE.Vector3(0.5, 0.5, 0) }, uSunC: { value: new THREE.Color(1, 0.9, 0.75) },
          uRays: { value: c.post >= 2 && this.gtao ? 1 : 0 }, uAspect: { value: 1 },
        },
        vertexShader: 'varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }',
        fragmentShader: /* glsl */`
          uniform sampler2D tDiffuse; uniform sampler2D tDepth; uniform float uVig; uniform float uTime; uniform float uGrain;
          uniform vec3 uGrade; uniform vec3 uSun; uniform vec3 uSunC; uniform float uRays; uniform float uAspect; varying vec2 vUv;
          float h(vec2 p){ return fract(sin(dot(p, vec2(12.9898, 78.233)) + uTime) * 43758.5453); }
          float skyAt(vec2 uv){ return (uv.x < 0.0 || uv.x > 1.0 || uv.y < 0.0 || uv.y > 1.0) ? 0.0 : step(0.99999, texture2D(tDepth, uv).x); }
          void main(){
            vec4 c = texture2D(tDiffuse, vUv);
            if (uRays > 0.5 && uSun.z > 0.0) {
              // sun shafts: radial march towards the sun over the sky mask
              vec2 d = (uSun.xy - vUv) / 40.0; vec2 p = vUv; float acc = 0.0, w = 1.0;
              float j = h(vUv * 911.0);
              p += d * j;
              for (int i = 0; i < 40; i++) { acc += skyAt(p) * w; w *= 0.965; p += d; }
              float fall = pow(max(0.0, 1.0 - length((vUv - uSun.xy) * vec2(uAspect, 1.0)) * 0.9), 2.0);
              c.rgb += uSunC * acc / 40.0 * 0.32 * fall * uSun.z;
              // lens flare ghosts along the sun-centre axis, scaled by how much of the sun is visible
              float vis = (skyAt(uSun.xy) + skyAt(uSun.xy + vec2(0.004, 0.0)) + skyAt(uSun.xy - vec2(0.004, 0.0)) + skyAt(uSun.xy + vec2(0.0, 0.006)) + skyAt(uSun.xy - vec2(0.0, 0.006))) * 0.2 * uSun.z;
              if (vis > 0.0) {
                vec2 axis = vec2(0.5) - uSun.xy; vec3 fl = vec3(0.0);
                for (int k = 1; k <= 4; k++) {
                  vec2 gp = uSun.xy + axis * (0.45 * float(k));
                  float r = 0.02 + 0.025 * float(k);
                  float g = smoothstep(r, r * 0.6, length((vUv - gp) * vec2(uAspect, 1.0)));
                  fl += g * vec3(0.9, 0.7 + 0.08 * float(k), 0.55 + 0.1 * float(k)) * 0.035;
                }
                float halo = smoothstep(0.05, 0.0, abs(length((vUv - vec2(0.5)) * vec2(uAspect, 1.0)) - length((uSun.xy - vec2(0.5)) * vec2(uAspect, 1.0)) * 0.6 - 0.12)) * 0.02;
                c.rgb += (fl + halo * vec3(1.0, 0.85, 0.7)) * vis;
              }
            }
            float l = dot(c.rgb, vec3(0.2126, 0.7152, 0.0722));
            c.rgb = mix(vec3(l), c.rgb, uGrade.x);
            c.rgb = (c.rgb - 0.5) * uGrade.y + 0.5;
            c.rgb *= vec3(1.0 + uGrade.z, 1.0, 1.0 - uGrade.z);
            vec2 dd = vUv - 0.5;
            c.rgb *= 1.0 - uVig * smoothstep(0.25, 0.85, length(dd * vec2(1.25, 1.0)));
            c.rgb += (h(vUv * 431.0) - 0.5) * uGrain;
            gl_FragColor = vec4(clamp(c.rgb, 0.0, 1.0), c.a);
          }`,
      });
      comp.addPass(this.finalPass);
    }
    this.composer = comp;
    this.resize(true);
  },
  setQualityLive() { this.applyGfx(); },
  applyPixelRatio() {
    const dpr = window.devicePixelRatio || 1;
    const c = this.cfg;
    this.dpr = Math.min(dpr, c.dpr) * c.scale * this.dynScale;
    if (window.__RAF_TEST && window.__RAF_TEST.lowres) this.dpr = window.__RAF_TEST.lowres;
    this.renderer.setPixelRatio(this.dpr);
  },
  resize(force) {
    const el = this.renderer.domElement.parentElement;
    const w = Math.max(2, el.clientWidth), h = Math.max(2, el.clientHeight);
    if (!force && w === this.w && h === this.h) return;
    this.w = w; this.h = h;
    this.applyPixelRatio();
    this.renderer.setSize(w, h, false);
    this.renderer.domElement.style.width = w + 'px'; this.renderer.domElement.style.height = h + 'px';
    this.camera.aspect = w / h; this.camera.updateProjectionMatrix();
    this.vmCamera.aspect = w / h; this.vmCamera.updateProjectionMatrix();
    if (this.composer) {
      const s = this.renderer.getDrawingBufferSize(new THREE.Vector2());
      this.composer.setPixelRatio(1);
      this.composer.setSize(s.x, s.y);
      if (this.gtao) { const k = this.cfg.ao >= 2 ? 1 : 0.5; this.gtao.setSize(Math.max(2, Math.floor(s.x * k)), Math.max(2, Math.floor(s.y * k))); }
      if (this.finalPass) this.finalPass.uniforms.uAspect.value = w / h;
    }
  },
  updateVMLight(world) {
    // direction of the sun in camera space
    const d = SUN_DIR.clone().applyQuaternion(this.camera.quaternion.clone().invert());
    this.vmSun.position.copy(d).multiplyScalar(5);
    this.vmSun.target.position.set(0, 0, 0);
    if (world) {
      const p = this.camera.getWorldPosition(_v1);
      const lit = world.clear(p.x, p.y, p.z, p.x + SUN_DIR.x * 80, p.y + SUN_DIR.y * 80, p.z + SUN_DIR.z * 80) ? 1 : 0;
      this.vmShade = damp(this.vmShade, lit, 6, 1 / 60);
      this.vmSun.intensity = (0.35 + 2.4 * this.vmShade) * ((this.vmSunBase || 2.6) / 2.6);
      // sky above the player (roof or open sky): darker gun indoors, eye adaptation of the exposure
      if (this.skyOcc) {
        const open = world.clear(p.x, p.y + 0.2, p.z, p.x + 0.6, p.y + 40, p.z + 0.4) ? 1 : 0;
        this.camSky = damp(this.camSky == null ? 1 : this.camSky, open, 2.5, 1 / 60);
      } else this.camSky = 1;
      const P = this.envP || ENV_PRESETS.borgo, k = this.camSky;
      this.vmScene.environmentIntensity = (P.env + 0.05) * (0.45 + 0.55 * k);
      this.vmHemi.intensity = (P.hemi[2] + 0.1) * (0.45 + 0.55 * k);
      this.renderer.toneMappingExposure = P.exp * (1.3 - 0.3 * k);
    }
  },
  render(t) {
    // map changed: static cascade, backdrop density
    if (typeof Game !== 'undefined') {
      if (Game.mapGroup !== this._mapSeen) { this._mapSeen = Game.mapGroup; this.staticDirty = true; }
      if (Game.backdrop && Game.backdrop !== this._bdSeen) this.applyBackdrop();
      if (Game.editor && this.cascaded && t - (this._edT || 0) > 1.5) { this._edT = t; this.staticDirty = true; }
    }
    if (this.cascaded) {
      this.camera.updateMatrixWorld();
      this.updateCascades();
      if (this.staticDirty && this.renderer.shadowMap.enabled) this.renderStatic();
    }
    if (this.composer) {
      if (this.finalPass) {
        const u = this.finalPass.uniforms;
        u.uTime.value = t % 100;
        const P = this.envP || ENV_PRESETS.borgo;
        u.uGrade.value.set(P.grade[0], P.grade[1], P.grade[2]);
        if (u.uRays.value > 0.5) {
          const s = _rv1.copy(SUN_DIR).multiplyScalar(500).add(this.camera.getWorldPosition(_rv2)).project(this.camera);
          const front = this.camera.getWorldDirection(_rv3).dot(SUN_DIR);
          u.uSun.value.set(s.x * 0.5 + 0.5, s.y * 0.5 + 0.5, P.dome ? 0 : smoothstep(0.1, 0.5, front) * clamp(P.sunI / 3.4, 0, 1));
          u.uSunC.value.setHex(P.sunC);
        }
      }
      this.composer.render();
    } else {
      const r = this.renderer;
      r.autoClear = false;
      r.clear();
      r.render(this.scene, this.camera);
      r.clearDepth();
      r.render(this.vmScene, this.vmCamera);
      r.autoClear = true;
    }
  },
};
const _rv1 = new THREE.Vector3(), _rv2 = new THREE.Vector3(), _rv3 = new THREE.Vector3(), _rv4 = new THREE.Vector3(), _rv5 = new THREE.Vector3();
