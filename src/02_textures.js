// ===================================================================
// GPU procedural PBR textures (albedo / normal / AO-rough-metal)
// Every pattern is periodic on [0,1] so it tiles seamlessly.
// ===================================================================
const GLSL_COMMON = /* glsl */`
float hash12(vec2 p){ vec3 p3 = fract(vec3(p.xyx) * 0.1031); p3 += dot(p3, p3.yzx + 33.33); return fract((p3.x + p3.y) * p3.z); }
vec2 hash22(vec2 p){ vec3 p3 = fract(vec3(p.xyx) * vec3(0.1031, 0.1030, 0.0973)); p3 += dot(p3, p3.yzx + 33.33); return fract((p3.xx + p3.yz) * p3.zy); }
vec3 hash32(vec2 p){ vec3 p3 = fract(vec3(p.xyx) * vec3(0.1031, 0.1030, 0.0973)); p3 += dot(p3, p3.yxz + 33.33); return fract((p3.xxy + p3.yzz) * p3.zyx); }
float gnoise(vec2 x, vec2 P){
  vec2 i = floor(x); vec2 f = fract(x);
  vec2 u = f*f*f*(f*(f*6.0-15.0)+10.0);
  vec2 ga = hash22(mod(i, P))*2.0-1.0;
  vec2 gb = hash22(mod(i+vec2(1.0,0.0), P))*2.0-1.0;
  vec2 gc = hash22(mod(i+vec2(0.0,1.0), P))*2.0-1.0;
  vec2 gd = hash22(mod(i+vec2(1.0,1.0), P))*2.0-1.0;
  float va = dot(ga, f), vb = dot(gb, f-vec2(1.0,0.0)), vc = dot(gc, f-vec2(0.0,1.0)), vd = dot(gd, f-vec2(1.0,1.0));
  return mix(mix(va,vb,u.x), mix(vc,vd,u.x), u.y) * 1.4142;
}
float fbm(vec2 x, vec2 P, int oct, float gain){
  float s = 0.0, a = 0.5;
  for (int k = 0; k < 8; k++){ if (k >= oct) break; s += a * gnoise(x, P); x *= 2.0; P *= 2.0; a *= gain; }
  return s;
}
float ridged(vec2 x, vec2 P, int oct){
  float s = 0.0, a = 0.5;
  for (int k = 0; k < 8; k++){ if (k >= oct) break; s += a * (1.0 - abs(gnoise(x, P))); x *= 2.0; P *= 2.0; a *= 0.5; }
  return s;
}
// periodic voronoi; returns (F1, F2, cell hash, -)
vec4 voronoi(vec2 x, vec2 P, float jitter, out vec2 rel){
  vec2 n = floor(x), f = fract(x);
  float F1 = 8.0, F2 = 8.0; vec2 bid = vec2(0.0); vec2 br = vec2(0.0);
  for (int j = -1; j <= 1; j++) for (int i = -1; i <= 1; i++){
    vec2 g = vec2(float(i), float(j));
    vec2 id = mod(n + g, P);
    vec2 o = hash22(id) * jitter + (1.0 - jitter) * 0.5;
    vec2 r = g + o - f;
    float d = dot(r, r);
    if (d < F1){ F2 = F1; F1 = d; bid = id; br = r; } else if (d < F2){ F2 = d; }
  }
  rel = -br;
  return vec4(sqrt(F1), sqrt(F2), hash12(bid), 0.0);
}
float sdRoundRect(vec2 p, vec2 b, float r){ vec2 q = abs(p) - b + r; return length(max(q, 0.0)) + min(max(q.x, q.y), 0.0) - r; }
vec3 toLin(vec3 c){ return pow(max(c, vec3(0.0)), vec3(2.2)); }
// jittered row segmentation: returns segment index and local coordinate in [0,1]
vec2 segRow(float x, float K, float row, float jit){
  float i0 = floor(x * K);
  float b0 = (i0 + (hash12(vec2(mod(i0, K), row)) - 0.5) * jit) / K;
  float b1 = (i0 + 1.0 + (hash12(vec2(mod(i0 + 1.0, K), row)) - 0.5) * jit) / K;
  float i = i0;
  if (x < b0){ i = i0 - 1.0; b1 = b0; b0 = (i + (hash12(vec2(mod(i, K), row)) - 0.5) * jit) / K; }
  else if (x >= b1){ i = i0 + 1.0; b0 = b1; b1 = (i + 1.0 + (hash12(vec2(mod(i + 1.0, K), row)) - 0.5) * jit) / K; }
  return vec2(mod(i, K), (x - b0) / (b1 - b0));
}
`;

const SURF = {};

// --- sampietrini (square basalt cobbles) -----------------------------
SURF.cobble = /* glsl */`
void surf(vec2 uv, out vec4 alb, out float h, out vec3 orm){
  float N = 10.0;
  vec2 p = uv * N;
  float row = floor(p.y);
  p.x += mod(row, 2.0) * 0.5 + (hash12(vec2(row, 3.0)) - 0.5) * 0.3;
  vec2 cell = floor(p);
  vec2 cid = vec2(mod(cell.x, N), mod(row, N));
  vec2 f = fract(p) - 0.5;
  vec3 r = hash32(cid + 7.0);
  float ang = (r.x - 0.5) * 0.22;
  mat2 R = mat2(cos(ang), -sin(ang), sin(ang), cos(ang));
  vec2 q = R * (f + (r.yz - 0.5) * 0.07);
  vec2 hs = vec2(0.43, 0.43) - r.yx * vec2(0.05, 0.04);
  float nEdge = fbm(uv * 30.0, vec2(30.0), 4, 0.5);
  float d = sdRoundRect(q, hs, 0.10 + r.z * 0.06) + nEdge * 0.035;
  float stone = smoothstep(0.015, -0.05, d);
  float dome = sqrt(clamp(-d * 4.5, 0.0, 1.0));
  float fine = fbm(uv * 80.0, vec2(80.0), 4, 0.55);
  float pits = smoothstep(0.55, 0.75, fbm(uv * 140.0 + r.xy * 9.0, vec2(140.0), 2, 0.5));
  h = stone * (0.52 + 0.36 * dome + 0.05 * fine - 0.04 * pits) + (1.0 - stone) * (0.10 + 0.06 * fine);
  vec3 base = mix(vec3(0.38, 0.36, 0.33), vec3(0.52, 0.49, 0.44), r.x);
  base = mix(base, vec3(0.50, 0.44, 0.37), r.z * 0.45);
  base *= 0.82 + 0.34 * (0.5 + 0.5 * fbm(uv * 14.0 + r.xy * 5.0, vec2(14.0), 3, 0.5));
  base *= 1.0 + 0.10 * dome;
  vec3 grout = mix(vec3(0.36, 0.31, 0.25), vec3(0.46, 0.40, 0.32), 0.5 + 0.5 * fine);
  vec3 c = mix(grout, base, stone);
  alb = vec4(toLin(c), 1.0);
  orm = vec3(mix(0.55, 1.0, clamp(stone * 0.75 + dome * 0.3, 0.0, 1.0)), mix(0.97, mix(0.82, 0.58, dome), stone), 0.0);
}`;

// --- stone slabs (street paving) ------------------------------------
SURF.slabs = /* glsl */`
void surf(vec2 uv, out vec4 alb, out float h, out vec3 orm){
  float R = 5.0, K = 3.0;
  float row = floor(uv.y * R);
  float ly = fract(uv.y * R);
  vec2 sg = segRow(uv.x, K, row, 0.55);
  vec2 sid = vec2(sg.x, mod(row, R));
  vec3 r = hash32(sid + 13.0);
  vec2 lp = vec2(sg.y, ly) - 0.5;
  float asp = R / K;
  vec2 q = lp * vec2(asp, 1.0);
  vec2 hs = vec2(0.5 * asp, 0.5) - 0.025;
  float nEdge = fbm(uv * 24.0, vec2(24.0), 4, 0.5);
  float d = sdRoundRect(q, hs, 0.035) + nEdge * 0.02;
  float slab = smoothstep(0.01, -0.02, d);
  float bevel = clamp(-d * 14.0, 0.0, 1.0);
  float fine = fbm(uv * 60.0, vec2(60.0), 5, 0.55);
  float mid = fbm(uv * 8.0 + r.xy * 3.0, vec2(8.0), 4, 0.5);
  vec2 rel; vec4 v = voronoi(uv * 9.0, vec2(9.0), 1.0, rel);
  float crack = (1.0 - smoothstep(0.0, 0.025, v.y - v.x)) * smoothstep(0.55, 0.75, fbm(uv * 5.0 + 4.0, vec2(5.0), 3, 0.5));
  h = slab * (0.55 + 0.25 * bevel + 0.05 * fine + 0.04 * mid - 0.2 * crack) + (1.0 - slab) * (0.18 + 0.05 * fine);
  vec3 base = mix(vec3(0.64, 0.59, 0.51), vec3(0.55, 0.50, 0.43), r.x);
  base = mix(base, vec3(0.66, 0.58, 0.47), r.y * 0.4);
  base *= 0.9 + 0.12 * mid + 0.05 * fine;
  base *= 1.0 - 0.25 * crack;
  vec3 grout = vec3(0.40, 0.36, 0.30) * (0.9 + 0.2 * fine);
  vec3 c = mix(grout, base, slab);
  alb = vec4(toLin(c), 1.0);
  orm = vec3(mix(0.55, 1.0, slab), mix(0.95, 0.78 - 0.1 * bevel, slab), 0.0);
}`;

// --- plaster / stucco (tinted by material colour) ---------------------
SURF.plaster = /* glsl */`
void surf(vec2 uv, out vec4 alb, out float h, out vec3 orm){
  float low = fbm(uv * 3.0, vec2(3.0), 4, 0.5);
  float mid = fbm(uv * 12.0 + 5.3, vec2(12.0), 5, 0.5);
  float grain = fbm(uv * 110.0, vec2(110.0), 3, 0.6);
  float streak = gnoise(vec2(uv.x * 34.0, uv.y * 2.0), vec2(34.0, 2.0)) * 0.5 + 0.5;
  streak = smoothstep(0.55, 0.95, streak) * (0.5 + 0.5 * gnoise(vec2(uv.x * 7.0, uv.y * 3.0), vec2(7.0, 3.0)));
  vec2 rel; vec4 v = voronoi(uv * 5.0 + vec2(mid * 0.35), vec2(5.0), 1.0, rel);
  float crackMask = smoothstep(0.42, 0.62, fbm(uv * 4.0 + 3.1, vec2(4.0), 3, 0.5));
  float crack = (1.0 - smoothstep(0.0, 0.018, v.y - v.x)) * crackMask;
  float peelN = fbm(uv * 4.0 + 11.3, vec2(4.0), 5, 0.55);
  float peel = smoothstep(0.40, 0.42, peelN);
  float peelEdge = smoothstep(0.37, 0.40, peelN) - peel;
  h = 0.6 + 0.08 * low + 0.05 * mid + 0.035 * grain - 0.25 * crack - 0.22 * peel + 0.06 * peelEdge;
  vec3 c = vec3(0.93, 0.91, 0.87) * (0.92 + 0.07 * low + 0.05 * mid + 0.02 * grain);
  c *= 1.0 - 0.13 * streak;
  c *= 1.0 - 0.22 * crack;
  c = mix(c, vec3(0.66, 0.62, 0.56) * (0.9 + 0.2 * grain), peel);
  c *= 1.0 - 0.18 * peelEdge;
  alb = vec4(toLin(c), 1.0);
  orm = vec3(1.0 - 0.5 * crack - 0.25 * peel, 0.93 + 0.05 * peel, 0.0);
}`;

// --- ashlar stone blocks (travertine) ---------------------------------
SURF.stone = /* glsl */`
void surf(vec2 uv, out vec4 alb, out float h, out vec3 orm){
  float R = 6.0, K = 3.0;
  float row = floor(uv.y * R);
  float ly = fract(uv.y * R);
  vec2 sg = segRow(uv.x, K, row, 0.6);
  vec3 r = hash32(vec2(sg.x, mod(row, R)) + 21.0);
  vec2 lp = vec2(sg.y, ly) - 0.5;
  vec2 q = lp * vec2(2.0, 1.0);
  float nEdge = fbm(uv * 26.0, vec2(26.0), 4, 0.5);
  float d = sdRoundRect(q, vec2(0.98, 0.48), 0.05) + nEdge * 0.018;
  float blk = smoothstep(0.012, -0.012, d);
  float pillow = clamp(-d * 9.0, 0.0, 1.0);
  vec2 rel; vec4 v = voronoi(uv * vec2(28.0, 56.0), vec2(28.0, 56.0), 0.9, rel);
  float pit = smoothstep(0.28, 0.10, v.x) * step(0.82, v.z);
  float fine = fbm(uv * 90.0, vec2(90.0), 4, 0.55);
  float stain = fbm(vec2(uv.x * 10.0, uv.y * 3.0) + r.xy * 4.0, vec2(10.0, 3.0), 4, 0.5);
  h = blk * (0.55 + 0.28 * sqrt(pillow) + 0.05 * fine - 0.3 * pit) + (1.0 - blk) * (0.20 + 0.04 * fine);
  vec3 base = mix(vec3(0.82, 0.77, 0.67), vec3(0.74, 0.68, 0.58), r.x);
  base = mix(base, vec3(0.80, 0.74, 0.60), r.y * 0.35);
  base *= 0.92 + 0.10 * stain + 0.04 * fine;
  base *= 1.0 - 0.16 * pit;
  vec3 mortar = vec3(0.62, 0.59, 0.53) * (0.9 + 0.2 * fine);
  vec3 c = mix(mortar, base, blk);
  alb = vec4(toLin(c), 1.0);
  orm = vec3(mix(0.6, 1.0, blk) * (1.0 - 0.4 * pit), mix(0.95, 0.84, blk), 0.0);
}`;

// --- rubble stone wall (opus incertum) --------------------------------
SURF.rubble = /* glsl */`
void surf(vec2 uv, out vec4 alb, out float h, out vec3 orm){
  vec2 rel; vec4 v = voronoi(uv * vec2(6.0, 7.0), vec2(6.0, 7.0), 0.85, rel);
  float edge = v.y - v.x;
  float nEdge = fbm(uv * 20.0, vec2(20.0), 4, 0.5);
  float st = smoothstep(0.05, 0.13, edge + nEdge * 0.05);
  float dome = clamp(edge * 3.0, 0.0, 1.0);
  float fine = fbm(uv * 70.0, vec2(70.0), 5, 0.55);
  h = st * (0.45 + 0.4 * sqrt(dome) + 0.08 * fine) + (1.0 - st) * (0.12 + 0.05 * fine);
  vec3 base = mix(vec3(0.55, 0.50, 0.43), vec3(0.68, 0.63, 0.55), v.z);
  base = mix(base, vec3(0.50, 0.45, 0.40), step(0.8, fract(v.z * 7.0)) * 0.6);
  base *= 0.88 + 0.15 * fbm(uv * 12.0 + v.z * 9.0, vec2(12.0), 3, 0.5) + 0.06 * fine;
  vec3 mortar = vec3(0.60, 0.57, 0.50) * (0.85 + 0.25 * fine);
  vec3 c = mix(mortar, base, st);
  alb = vec4(toLin(c), 1.0);
  orm = vec3(mix(0.5, 1.0, st), mix(0.97, 0.86, st), 0.0);
}`;

// --- bricks ----------------------------------------------------------
SURF.brick = /* glsl */`
void surf(vec2 uv, out vec4 alb, out float h, out vec3 orm){
  float R = 16.0, K = 4.0;
  float row = floor(uv.y * R);
  float ly = fract(uv.y * R);
  float x = uv.x * K + mod(row, 2.0) * 0.5;
  float bi = floor(x);
  float lx = fract(x);
  vec3 r = hash32(vec2(mod(bi, K), mod(row, R)) + 31.0);
  float nEdge = fbm(uv * 40.0, vec2(40.0), 3, 0.5);
  vec2 q = vec2((lx - 0.5) * 4.0, (ly - 0.5));
  float d = sdRoundRect(q, vec2(1.86, 0.36), 0.04) + nEdge * 0.03;
  float b = smoothstep(0.015, -0.02, d);
  float fine = fbm(uv * 120.0, vec2(120.0), 3, 0.6);
  h = b * (0.6 + 0.15 * clamp(-d * 10.0, 0.0, 1.0) + 0.06 * fine) + (1.0 - b) * (0.25 + 0.05 * fine);
  vec3 base = mix(vec3(0.62, 0.30, 0.19), vec3(0.72, 0.42, 0.27), r.x);
  base = mix(base, vec3(0.38, 0.20, 0.14), step(0.86, r.y));
  base *= 0.88 + 0.14 * fbm(uv * 20.0 + r.xz * 7.0, vec2(20.0), 3, 0.5) + 0.05 * fine;
  vec3 mortar = vec3(0.66, 0.62, 0.55) * (0.9 + 0.15 * fine);
  vec3 c = mix(mortar, base, b);
  alb = vec4(toLin(c), 1.0);
  orm = vec3(mix(0.6, 1.0, b), mix(0.95, 0.85, b), 0.0);
}`;

// --- terracotta roof tiles (coppi) -----------------------------------
SURF.roof = /* glsl */`
void surf(vec2 uv, out vec4 alb, out float h, out vec3 orm){
  float C = 10.0, R = 5.0;
  float row = floor(uv.y * R);
  float ly = fract(uv.y * R);
  float x = uv.x * C + (hash12(vec2(mod(row, R), 5.0)) - 0.5) * 0.25;
  float ci = floor(x);
  float lx = fract(x);
  vec3 r = hash32(vec2(mod(ci, C), mod(row, R)) + 41.0);
  float bump = pow(max(sin(3.14159 * lx), 0.0), 0.55);
  float tileH = bump * (0.78 + 0.22 * ly);
  float gap = smoothstep(0.0, 0.08, lx) * smoothstep(1.0, 0.92, lx);
  float lowerEdge = smoothstep(0.0, 0.06, ly);
  float fine = fbm(uv * 90.0, vec2(90.0), 4, 0.55);
  h = 0.1 + 0.75 * tileH * gap * (0.82 + 0.18 * lowerEdge) + 0.04 * fine;
  vec3 base = mix(vec3(0.66, 0.33, 0.20), vec3(0.74, 0.44, 0.28), r.x);
  base = mix(base, vec3(0.48, 0.27, 0.18), step(0.82, r.y) * 0.8);
  base = mix(base, vec3(0.78, 0.52, 0.33), step(0.9, r.z) * 0.6);
  float lichen = smoothstep(0.35, 0.65, fbm(uv * 18.0 + r.xy * 3.0, vec2(18.0), 4, 0.55)) * 0.55;
  base = mix(base, vec3(0.62, 0.60, 0.48), lichen);
  base *= 0.85 + 0.2 * fine;
  base *= mix(0.55, 1.0, lowerEdge);
  base *= mix(0.35, 1.0, gap);
  alb = vec4(toLin(base), 1.0);
  orm = vec3(mix(0.35, 1.0, gap * (0.6 + 0.4 * bump)), 0.82 + 0.1 * lichen, 0.0);
}`;

// --- natural wood planks ------------------------------------------------
SURF.wood = /* glsl */`
void surf(vec2 uv, out vec4 alb, out float h, out vec3 orm){
  float P = 6.0;
  float pi = floor(uv.x * P);
  float lx = fract(uv.x * P);
  vec3 r = hash32(vec2(mod(pi, P), 9.0) + 51.0);
  float vy = uv.y + r.x * 0.7;
  float g1 = fbm(vec2(uv.x * P * 3.0 + r.y * 10.0, vy * 2.0), vec2(P * 3.0, 2.0), 5, 0.55);
  float rings = sin((lx * 2.5 + g1 * 2.2 + r.z * 6.0) * 6.2832 * 2.5) * 0.5 + 0.5;
  float fibers = fbm(vec2(uv.x * P * 24.0, vy * 3.0), vec2(P * 24.0, 3.0), 3, 0.6);
  float seam = smoothstep(0.0, 0.035, lx) * smoothstep(1.0, 0.965, lx);
  float knotN = fbm(uv * vec2(P * 2.0, 4.0) + r.xy * 3.0, vec2(P * 2.0, 4.0), 3, 0.5);
  float knot = smoothstep(0.55, 0.62, knotN);
  h = 0.5 + 0.08 * rings + 0.06 * fibers - 0.4 * (1.0 - seam) - 0.05 * knot;
  vec3 base = mix(vec3(0.46, 0.31, 0.19), vec3(0.58, 0.41, 0.26), r.x);
  base *= 0.82 + 0.22 * rings + 0.08 * fibers;
  base = mix(base, vec3(0.25, 0.16, 0.10), knot * 0.8);
  base *= mix(0.4, 1.0, seam);
  alb = vec4(toLin(base), 1.0);
  orm = vec3(mix(0.5, 1.0, seam), 0.72 + 0.1 * fibers, 0.0);
}`;

// --- painted, chipped wood (tint with colour) --------------------------
SURF.painted = /* glsl */`
void surf(vec2 uv, out vec4 alb, out float h, out vec3 orm){
  float P = 8.0;
  float pi = floor(uv.x * P);
  float lx = fract(uv.x * P);
  vec3 r = hash32(vec2(mod(pi, P), 2.0) + 61.0);
  float seam = smoothstep(0.0, 0.05, lx) * smoothstep(1.0, 0.95, lx);
  float brush = fbm(vec2(uv.x * P * 20.0, uv.y * 2.0 + r.x), vec2(P * 20.0, 2.0), 3, 0.6);
  float chipN = fbm(uv * 9.0 + r.xy, vec2(9.0), 5, 0.6);
  float chip = smoothstep(0.30, 0.34, chipN);
  float grain = fbm(vec2(uv.x * P * 6.0, uv.y * 3.0), vec2(P * 6.0, 3.0), 4, 0.55);
  h = 0.6 + 0.03 * brush - 0.08 * chip + 0.03 * grain * chip - 0.35 * (1.0 - seam);
  vec3 paint = vec3(0.9, 0.9, 0.88) * (0.93 + 0.05 * brush + 0.04 * r.y);
  vec3 woodc = vec3(0.42, 0.33, 0.24) * (0.8 + 0.3 * grain);
  vec3 c = mix(paint, woodc, chip);
  c *= mix(0.45, 1.0, seam);
  alb = vec4(toLin(c), 1.0);
  orm = vec3(mix(0.55, 1.0, seam), mix(0.55, 0.82, chip), 0.0);
}`;

// --- crate faces (uv 0..1 per face) ------------------------------------
SURF.crate = /* glsl */`
void surf(vec2 uv, out vec4 alb, out float h, out vec3 orm){
  float bw = 0.13;
  bool frameH = (uv.y < bw || uv.y > 1.0 - bw);
  bool frameV = (uv.x < bw || uv.x > 1.0 - bw);
  float diag = abs(uv.x - uv.y);
  bool brace = diag < 0.075 && !frameH && !frameV;
  vec2 g; float seam; float idx;
  if (frameV) { g = vec2(uv.x * 30.0, uv.y * 3.0); idx = step(0.5, uv.x); seam = smoothstep(0.0, 0.01, min(abs(uv.x - bw), abs(uv.x - (1.0 - bw)))); }
  else if (frameH) { g = vec2(uv.y * 30.0, uv.x * 3.0); idx = 2.0 + step(0.5, uv.y); seam = smoothstep(0.0, 0.01, min(abs(uv.y - bw), abs(uv.y - (1.0 - bw)))); }
  else if (brace) { vec2 d = vec2(uv.x + uv.y, uv.x - uv.y); g = vec2(d.y * 30.0, d.x * 3.0); idx = 4.0; seam = smoothstep(0.065, 0.05, diag); }
  else { float pl = floor((uv.y - bw) / (1.0 - 2.0 * bw) * 4.0); g = vec2(uv.y * 30.0, uv.x * 3.0 + pl); idx = 5.0 + pl; float ly = fract((uv.y - bw) / (1.0 - 2.0 * bw) * 4.0); seam = smoothstep(0.0, 0.06, ly) * smoothstep(1.0, 0.94, ly); }
  vec3 r = hash32(vec2(idx, 3.0));
  float grain = fbm(g + r.xy * 10.0, vec2(30.0, 3.0), 5, 0.55);
  float rings = sin((g.x * 0.08 + grain * 1.6) * 18.0) * 0.5 + 0.5;
  float raised = (frameH || frameV || brace) ? 1.0 : 0.0;
  vec2 corner = min(uv, 1.0 - uv);
  float nail = 1.0 - smoothstep(0.008, 0.016, length(abs(uv - 0.5) - vec2(0.5 - bw * 0.5)));
  h = 0.45 + 0.25 * raised + 0.05 * grain + 0.04 * rings - 0.25 * (1.0 - seam) - 0.1 * nail;
  vec3 base = mix(vec3(0.62, 0.46, 0.29), vec3(0.72, 0.56, 0.36), r.x) * (0.84 + 0.16 * rings + 0.08 * grain);
  base *= mix(1.0, 0.86, raised * 0.5);
  base *= mix(0.45, 1.0, seam);
  base = mix(base, vec3(0.2, 0.2, 0.2), nail);
  float edgeDirt = 1.0 - smoothstep(0.0, 0.06, min(corner.x, corner.y));
  base *= 1.0 - 0.3 * edgeDirt;
  alb = vec4(toLin(base), 1.0);
  orm = vec3(mix(0.55, 1.0, seam), 0.78, nail * 0.9);
}`;

// --- painted iron with rust ----------------------------------------------
SURF.metal = /* glsl */`
void surf(vec2 uv, out vec4 alb, out float h, out vec3 orm){
  float rustN = fbm(uv * 6.0, vec2(6.0), 6, 0.55);
  float rust = smoothstep(0.12, 0.32, rustN);
  float fine = fbm(uv * 80.0, vec2(80.0), 4, 0.6);
  float sc = 1.0 - abs(gnoise(vec2(uv.x * 60.0, uv.y * 3.0), vec2(60.0, 3.0)));
  float scr = smoothstep(0.965, 0.995, sc) * step(0.15, fbm(uv * 5.0 + 7.0, vec2(5.0), 3, 0.5));
  h = 0.5 + 0.02 * fine + rust * (0.06 + 0.1 * fine) - 0.05 * scr;
  vec3 paint = vec3(0.13, 0.14, 0.13) * (0.9 + 0.15 * fine);
  vec3 rc = mix(vec3(0.36, 0.17, 0.08), vec3(0.50, 0.28, 0.12), 0.5 + 0.5 * fine);
  vec3 c = mix(paint, rc, rust);
  c = mix(c, vec3(0.55, 0.55, 0.56), scr * (1.0 - rust));
  alb = vec4(toLin(c), 1.0);
  orm = vec3(1.0, mix(0.42, 0.9, rust) - 0.15 * scr, scr * (1.0 - rust));
}`;

// --- cotto floor tiles ---------------------------------------------------
SURF.cotto = /* glsl */`
void surf(vec2 uv, out vec4 alb, out float h, out vec3 orm){
  float N = 6.0;
  vec2 p = uv * N;
  vec2 cid = mod(floor(p), N);
  vec2 f = fract(p) - 0.5;
  vec3 r = hash32(cid + 71.0);
  float d = sdRoundRect(f, vec2(0.465), 0.03) + fbm(uv * 30.0, vec2(30.0), 3, 0.5) * 0.01;
  float t = smoothstep(0.01, -0.01, d);
  float fine = fbm(uv * 90.0 + r.xy * 7.0, vec2(90.0), 4, 0.55);
  float wave = fbm(uv * 12.0 + r.yz * 5.0, vec2(12.0), 3, 0.5);
  h = t * (0.6 + 0.05 * wave + 0.03 * fine + 0.08 * clamp(-d * 12.0, 0.0, 1.0)) + (1.0 - t) * 0.25;
  vec3 base = mix(vec3(0.66, 0.36, 0.22), vec3(0.75, 0.47, 0.30), r.x);
  base = mix(base, vec3(0.55, 0.30, 0.20), step(0.85, r.y) * 0.7);
  base *= 0.88 + 0.12 * wave + 0.06 * fine;
  float wear = 1.0 - length(f) * 1.2;
  base *= 1.0 + 0.06 * wear;
  vec3 c = mix(vec3(0.55, 0.52, 0.47), base, t);
  alb = vec4(toLin(c), 1.0);
  orm = vec3(mix(0.6, 1.0, t), mix(0.9, 0.62 + 0.15 * (1.0 - wear), t), 0.0);
}`;

// --- dry grass and dirt terrain ----------------------------------------
SURF.terrain = /* glsl */`
void surf(vec2 uv, out vec4 alb, out float h, out vec3 orm){
  float m = fbm(uv * 4.0, vec2(4.0), 5, 0.55);
  float grass = smoothstep(-0.12, 0.12, m);
  float blades = fbm(vec2(uv.x * 160.0, uv.y * 160.0), vec2(160.0), 3, 0.6);
  float tuft = fbm(uv * 40.0, vec2(40.0), 4, 0.55);
  vec2 rel; vec4 v = voronoi(uv * 46.0, vec2(46.0), 1.0, rel);
  float pebble = smoothstep(0.32, 0.18, v.x) * step(0.6, v.z);
  h = mix(0.35 + 0.15 * pebble * (0.3 - v.x) * 3.0 + 0.04 * tuft, 0.45 + 0.12 * blades + 0.06 * tuft, grass);
  vec3 dirt = mix(vec3(0.42, 0.34, 0.25), vec3(0.50, 0.41, 0.30), 0.5 + 0.5 * tuft);
  dirt = mix(dirt, vec3(0.62, 0.58, 0.52) * (0.8 + 0.4 * v.z), pebble);
  vec3 gr = mix(vec3(0.42, 0.43, 0.21), vec3(0.55, 0.50, 0.27), 0.5 + 0.5 * tuft);
  gr = mix(gr, vec3(0.30, 0.36, 0.17), smoothstep(0.1, 0.5, blades) * 0.5);
  gr *= 0.85 + 0.25 * blades;
  vec3 c = mix(dirt, gr, grass);
  alb = vec4(toLin(c), 1.0);
  orm = vec3(0.9 + 0.1 * blades, 0.95, 0.0);
}`;

// --- marble -------------------------------------------------------------
SURF.marble = /* glsl */`
void surf(vec2 uv, out vec4 alb, out float h, out vec3 orm){
  float t = fbm(uv * 4.0, vec2(4.0), 6, 0.55);
  float vein = abs(sin((uv.x * 6.2832 * 2.0 + uv.y * 6.2832 + t * 5.0)));
  vein = pow(1.0 - vein, 10.0);
  float vein2 = pow(1.0 - abs(sin(uv.y * 6.2832 * 3.0 + t * 7.0 + 1.3)), 18.0);
  float fine = fbm(uv * 60.0, vec2(60.0), 4, 0.55);
  float dirt = smoothstep(0.1, 0.6, fbm(uv * 8.0 + 3.0, vec2(8.0), 4, 0.5));
  h = 0.5 + 0.02 * fine - 0.03 * vein;
  vec3 c = vec3(0.80, 0.78, 0.74) * (0.93 + 0.07 * t);
  c = mix(c, vec3(0.50, 0.51, 0.52), vein * 0.7 + vein2 * 0.4);
  c = mix(c, vec3(0.62, 0.58, 0.50), dirt * 0.5);
  alb = vec4(toLin(c), 1.0);
  orm = vec3(1.0, 0.32 + 0.25 * dirt, 0.0);
}`;

// --- bark ---------------------------------------------------------------
SURF.bark = /* glsl */`
void surf(vec2 uv, out vec4 alb, out float h, out vec3 orm){
  float rid = ridged(vec2(uv.x * 12.0, uv.y * 2.0), vec2(12.0, 2.0), 5);
  float fine = fbm(uv * vec2(60.0, 20.0), vec2(60.0, 20.0), 4, 0.55);
  h = 0.2 + 0.6 * rid + 0.06 * fine;
  vec3 c = mix(vec3(0.20, 0.17, 0.14), vec3(0.45, 0.40, 0.33), rid) * (0.85 + 0.2 * fine);
  alb = vec4(toLin(c), 1.0);
  orm = vec3(mix(0.4, 1.0, rid), 0.95, 0.0);
}`;

// --- olive leaves cluster (alpha) -----------------------------------------
SURF.leaves = /* glsl */`
void surf(vec2 uv, out vec4 alb, out float h, out vec3 orm){
  float N = 5.0;
  vec2 p = uv * N;
  vec2 c0 = floor(p);
  float best = 0.0; float shade = 0.0; float idv = 0.0;
  for (int j = -1; j <= 1; j++) for (int i = -1; i <= 1; i++){
    vec2 cc = c0 + vec2(float(i), float(j));
    for (int k = 0; k < 3; k++){
      vec3 r = hash32(mod(cc, N) * 3.17 + float(k) * 11.3);
      vec2 ctr = cc + r.xy;
      float a = r.z * 6.2832;
      vec2 d = p - ctr;
      d = mat2(cos(a), -sin(a), sin(a), cos(a)) * d;
      float e = (d.x * d.x) / 0.12 + (d.y * d.y) / 0.006;
      float leaf = 1.0 - smoothstep(0.7, 1.0, e);
      if (leaf > best){ best = leaf; shade = 0.5 + 0.5 * (d.y / 0.08); idv = r.x + float(k) * 0.1; }
    }
  }
  float alpha = step(0.5, best);
  h = best;
  vec3 base = mix(vec3(0.33, 0.39, 0.25), vec3(0.50, 0.55, 0.42), fract(idv * 3.7));
  base *= 0.75 + 0.35 * clamp(shade, 0.0, 1.0);
  alb = vec4(toLin(base), alpha);
  orm = vec3(1.0, 0.75, 0.0);
}`;

// --- broad leaves (plane tree / generic) -----------------------------------
SURF.leaves2 = /* glsl */`
void surf(vec2 uv, out vec4 alb, out float h, out vec3 orm){
  float N = 4.0;
  vec2 p = uv * N;
  vec2 c0 = floor(p);
  float best = 0.0; float idv = 0.0; float vein = 0.0;
  for (int j = -1; j <= 1; j++) for (int i = -1; i <= 1; i++){
    vec2 cc = c0 + vec2(float(i), float(j));
    for (int k = 0; k < 3; k++){
      vec3 r = hash32(mod(cc, N) * 5.31 + float(k) * 7.7);
      vec2 ctr = cc + r.xy;
      float a = r.z * 6.2832;
      vec2 d = p - ctr;
      d = mat2(cos(a), -sin(a), sin(a), cos(a)) * d;
      float ang = atan(d.y, d.x);
      float rad = 0.30 + 0.06 * sin(ang * 5.0);
      float leaf = 1.0 - smoothstep(rad * 0.85, rad, length(d * vec2(1.0, 1.25)));
      if (leaf > best){ best = leaf; idv = r.x + float(k) * 0.13; vein = abs(d.y) < 0.012 ? 1.0 : 0.0; }
    }
  }
  float alpha = step(0.5, best);
  h = best - vein * 0.2;
  vec3 base = mix(vec3(0.22, 0.34, 0.12), vec3(0.40, 0.50, 0.20), fract(idv * 5.3));
  base *= 1.0 - 0.15 * vein;
  alb = vec4(toLin(base), alpha);
  orm = vec3(1.0, 0.7, 0.0);
}`;

function awningSurf(r, g, b) {
  return /* glsl */`
void surf(vec2 uv, out vec4 alb, out float h, out vec3 orm){
  float s = step(0.5, fract(uv.x * 8.0));
  float weave = gnoise(uv * vec2(120.0, 120.0), vec2(120.0)) * 0.5 + 0.5;
  float fade = fbm(uv * 3.0, vec2(3.0), 4, 0.5);
  float dirt = smoothstep(0.2, 0.7, fbm(uv * 6.0 + 2.0, vec2(6.0), 4, 0.5));
  h = 0.5 + 0.06 * weave + 0.05 * fade;
  vec3 c = mix(vec3(0.88, 0.84, 0.74), vec3(${r}, ${g}, ${b}), s);
  c *= 0.92 + 0.08 * fade + 0.05 * weave;
  c = mix(c, c * 0.7, dirt * 0.4);
  alb = vec4(toLin(c), 1.0);
  orm = vec3(1.0, 0.92, 0.0);
}`;
}
SURF.awningRed = awningSurf('0.62', '0.12', '0.10');
SURF.awningGreen = awningSurf('0.10', '0.36', '0.22');

SURF.water = /* glsl */`
void surf(vec2 uv, out vec4 alb, out float h, out vec3 orm){
  h = fbm(uv * 6.0, vec2(6.0), 6, 0.5) * 0.5 + 0.5;
  alb = vec4(0.5, 0.5, 0.5, 1.0);
  orm = vec3(1.0, 0.1, 0.0);
}`;

// --- fabric (clothes, tablecloths): tinted by colour --------------------
SURF.fabric = /* glsl */`
void surf(vec2 uv, out vec4 alb, out float h, out vec3 orm){
  float wx = sin(uv.x * 6.2832 * 64.0) * 0.5 + 0.5;
  float wy = sin(uv.y * 6.2832 * 64.0) * 0.5 + 0.5;
  float weave = mix(wx, wy, step(0.5, fract(uv.x * 32.0 + uv.y * 32.0)));
  float fold = fbm(uv * 3.0, vec2(3.0), 4, 0.5);
  h = 0.5 + 0.05 * weave + 0.12 * fold;
  vec3 c = vec3(0.9) * (0.9 + 0.08 * weave + 0.08 * fold);
  alb = vec4(toLin(c), 1.0);
  orm = vec3(1.0, 0.95, 0.0);
}`;

const TexGen = {
  renderer: null, scene: null, cam: null, quad: null, cache: {}, heightRT: {},
  init(renderer) {
    this.renderer = renderer;
    this.scene = new THREE.Scene();
    this.cam = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
    this.quad = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), null);
    this.quad.frustumCulled = false;
    this.scene.add(this.quad);
    const ext = renderer.extensions;
    this.floatOK = ext.has('EXT_color_buffer_float') || ext.has('EXT_color_buffer_half_float');
    this.normalMat = new THREE.ShaderMaterial({
      uniforms: { tH: { value: null }, uTexel: { value: new THREE.Vector2() }, uStrength: { value: 4 } },
      vertexShader: 'varying vec2 vUv; void main(){ vUv = uv; gl_Position = vec4(position.xy, 0.0, 1.0); }',
      fragmentShader: /* glsl */`
        uniform sampler2D tH; uniform vec2 uTexel; uniform float uStrength; varying vec2 vUv;
        float s(vec2 o){ return texture2D(tH, vUv + o * uTexel).r; }
        void main(){
          float tl = s(vec2(-1.0, 1.0)), t = s(vec2(0.0, 1.0)), tr = s(vec2(1.0, 1.0));
          float l = s(vec2(-1.0, 0.0)), r = s(vec2(1.0, 0.0));
          float bl = s(vec2(-1.0, -1.0)), b = s(vec2(0.0, -1.0)), br = s(vec2(1.0, -1.0));
          float dx = (tr + 2.0 * r + br) - (tl + 2.0 * l + bl);
          float dy = (tl + 2.0 * t + tr) - (bl + 2.0 * b + br);
          vec3 n = normalize(vec3(-dx * uStrength, -dy * uStrength, 1.0));
          gl_FragColor = vec4(n * 0.5 + 0.5, 1.0);
        }`,
      depthTest: false, depthWrite: false,
    });
  },
  _rt(size, opts) {
    const rt = new THREE.WebGLRenderTarget(size, size, Object.assign({
      depthBuffer: false, wrapS: THREE.RepeatWrapping, wrapT: THREE.RepeatWrapping,
      magFilter: THREE.LinearFilter, minFilter: THREE.LinearMipmapLinearFilter, generateMipmaps: true,
    }, opts));
    rt.texture.wrapS = rt.texture.wrapT = THREE.RepeatWrapping;
    return rt;
  },
  _heightTarget(size) {
    if (!this.heightRT[size]) {
      this.heightRT[size] = this._rt(size, {
        type: this.floatOK ? THREE.HalfFloatType : THREE.UnsignedByteType,
        minFilter: THREE.LinearFilter, generateMipmaps: false,
      });
    }
    return this.heightRT[size];
  },
  _draw(mat, rt) {
    const r = this.renderer;
    this.quad.material = mat;
    const prev = r.getRenderTarget();
    const prevAuto = r.autoClear;
    r.autoClear = false;
    r.setRenderTarget(rt);
    r.render(this.scene, this.cam);
    r.setRenderTarget(prev);
    r.autoClear = prevAuto;
  },
  build(name, size, opts = {}) {
    if (this.cache[name]) return this.cache[name];
    const surf = SURF[name];
    const mat = new THREE.ShaderMaterial({
      uniforms: { uMode: { value: 0 } },
      vertexShader: 'varying vec2 vUv; void main(){ vUv = uv; gl_Position = vec4(position.xy, 0.0, 1.0); }',
      fragmentShader: 'precision highp float; uniform int uMode; varying vec2 vUv;\n' + GLSL_COMMON + surf + `
        void main(){ vec4 a; float h; vec3 o; surf(vUv, a, h, o);
          if (uMode == 0) gl_FragColor = a; else if (uMode == 1) gl_FragColor = vec4(h, h, h, 1.0); else gl_FragColor = vec4(o, 1.0); }`,
      depthTest: false, depthWrite: false,
    });
    const out = {};
    const maxAniso = Math.min(8, this.renderer.capabilities.getMaxAnisotropy());
    if (!opts.normalOnly) {
      const albRT = this._rt(size, { colorSpace: THREE.SRGBColorSpace });
      mat.uniforms.uMode.value = 0; this._draw(mat, albRT);
      albRT.texture.anisotropy = opts.aniso ? maxAniso : 2;
      out.map = albRT.texture;
      const ormRT = this._rt(size, {});
      mat.uniforms.uMode.value = 2; this._draw(mat, ormRT);
      ormRT.texture.anisotropy = opts.aniso ? maxAniso : 2;
      out.orm = ormRT.texture;
    }
    const hRT = this._heightTarget(size);
    mat.uniforms.uMode.value = 1; this._draw(mat, hRT);
    const nRT = this._rt(size, {});
    this.normalMat.uniforms.tH.value = hRT.texture;
    this.normalMat.uniforms.uTexel.value.set(1 / size, 1 / size);
    this.normalMat.uniforms.uStrength.value = (opts.normalStrength || 3) * size / 512;
    this._draw(this.normalMat, nRT);
    nRT.texture.anisotropy = opts.aniso ? maxAniso : 2;
    out.normal = nRT.texture;
    mat.dispose();
    this.cache[name] = out;
    return out;
  },
  disposeTemps() { for (const k in this.heightRT) this.heightRT[k].dispose(); this.heightRT = {}; },
};

// Canvas-generated small textures (signs, decals, particles)
const CanvasTex = {
  make(w, h, draw, srgb = true) {
    const c = document.createElement('canvas'); c.width = w; c.height = h;
    const g = c.getContext('2d'); draw(g, w, h);
    const t = new THREE.CanvasTexture(c);
    if (srgb) t.colorSpace = THREE.SRGBColorSpace;
    t.anisotropy = 4;
    return t;
  },
  sign(text, opts = {}) {
    const w = opts.w || 1024, h = opts.h || 256;
    return this.make(w, h, (g) => {
      g.fillStyle = opts.bg || '#2d4a3a'; g.fillRect(0, 0, w, h);
      if (opts.border !== false) { g.strokeStyle = opts.borderColor || 'rgba(230,210,160,0.85)'; g.lineWidth = h * 0.05; g.strokeRect(h * 0.06, h * 0.06, w - h * 0.12, h - h * 0.12); }
      g.fillStyle = opts.fg || '#efe3c2';
      g.font = `${opts.weight || 700} ${Math.floor(h * (opts.size || 0.56))}px ${opts.font || 'Georgia, "Times New Roman", serif'}`;
      g.textAlign = 'center'; g.textBaseline = 'middle';
      if (opts.spacing) { try { g.letterSpacing = opts.spacing + 'px'; } catch (e) { /* unsupported */ } }
      g.fillText(text, w / 2, h * 0.53);
      // grime
      for (let i = 0; i < 1600; i++) { g.fillStyle = `rgba(40,30,20,${Math.random() * 0.06})`; g.fillRect(Math.random() * w, Math.random() * h, 2 + Math.random() * 6, 2 + Math.random() * 6); }
      const grd = g.createLinearGradient(0, 0, 0, h); grd.addColorStop(0, 'rgba(0,0,0,0)'); grd.addColorStop(1, 'rgba(30,20,10,0.25)');
      g.fillStyle = grd; g.fillRect(0, 0, w, h);
    });
  },
};
