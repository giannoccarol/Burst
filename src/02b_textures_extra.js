// ===================================================================
// Extra procedural surfaces for the map editor (built lazily, only
// when a map uses them). Same contract as SURF.* in 02_textures.js:
// periodic on [0,1], albedo in linear space, orm = (ao, rough, metal).
// ===================================================================

// --- board-formed concrete with seams and tie holes ---------------------
SURF.concrete = /* glsl */`
void surf(vec2 uv, out vec4 alb, out float h, out vec3 orm){
  vec2 p = uv * vec2(2.0, 4.0);
  vec2 f = fract(p);
  vec2 cid = mod(floor(p), vec2(2.0, 4.0));
  float dx = min(f.x, 1.0 - f.x) * 0.5, dy = min(f.y, 1.0 - f.y) * 0.25;
  float seam = 1.0 - smoothstep(0.0012, 0.0035, min(dx, dy));
  vec2 hp = vec2(abs(f.x - 0.25) < abs(f.x - 0.75) ? 0.25 : 0.75, 0.5);
  float hole = 1.0 - smoothstep(0.004, 0.0065, length((f - hp) * vec2(0.5, 0.25)));
  vec2 rel; vec4 v = voronoi(uv * 70.0, vec2(70.0), 1.0, rel);
  float pore = smoothstep(0.14, 0.06, v.x) * step(0.86, v.z);
  float fine = fbm(uv * 90.0, vec2(90.0), 4, 0.55);
  float mid = fbm(uv * 8.0, vec2(8.0), 4, 0.5);
  float r = hash12(cid + 3.0);
  float drip = smoothstep(0.55, 0.95, gnoise(vec2(uv.x * 40.0, uv.y * 2.0), vec2(40.0, 2.0)) * 0.5 + 0.5) * (0.35 + 0.65 * f.y);
  vec3 c = vec3(0.63, 0.63, 0.61) * (0.88 + 0.12 * r + 0.09 * mid + 0.05 * fine);
  c *= 1.0 - 0.12 * drip;
  c *= 1.0 - 0.35 * seam - 0.55 * hole - 0.25 * pore;
  h = 0.6 + 0.03 * fine + 0.04 * mid - 0.3 * seam - 0.4 * hole - 0.2 * pore;
  alb = vec4(toLin(c), 1.0);
  orm = vec3(1.0 - 0.45 * hole - 0.3 * seam, 0.9 - 0.06 * r, 0.0);
}`;

// --- asphalt with aggregate and cracks ---------------------------------
SURF.asphalt = /* glsl */`
void surf(vec2 uv, out vec4 alb, out float h, out vec3 orm){
  vec2 rel; vec4 v = voronoi(uv * 140.0, vec2(140.0), 1.0, rel);
  float stone = smoothstep(0.45, 0.2, v.x);
  float fine = fbm(uv * 200.0, vec2(200.0), 3, 0.6);
  float wear = smoothstep(-0.1, 0.4, fbm(uv * 3.0, vec2(3.0), 5, 0.5));
  vec2 off = vec2(fbm(uv * 9.0, vec2(9.0), 3, 0.5)) * 0.4;
  vec2 rel2; vec4 cr = voronoi(uv * 5.0 + off, vec2(5.0), 1.0, rel2);
  float crackMask = smoothstep(0.25, 0.6, fbm(uv * 2.0 + 7.7, vec2(2.0), 3, 0.5));
  float crack = (1.0 - smoothstep(0.0, 0.015, cr.y - cr.x)) * crackMask;
  vec3 c = vec3(0.10, 0.10, 0.105) * (0.85 + 0.3 * wear);
  c = mix(c, vec3(0.30, 0.29, 0.27) * (0.8 + 0.4 * v.z), stone * 0.5);
  c *= 0.92 + 0.1 * fine;
  c *= 1.0 - 0.6 * crack;
  h = 0.5 + 0.12 * stone * (0.5 + 0.5 * v.z) + 0.03 * fine - 0.3 * crack;
  alb = vec4(toLin(c), 1.0);
  orm = vec3(1.0 - 0.5 * crack, 0.84 - 0.14 * stone, 0.0);
}`;

// --- corrugated sheet metal with rust streaks ------------------------------
SURF.corrugated = /* glsl */`
void surf(vec2 uv, out vec4 alb, out float h, out vec3 orm){
  float w = sin(uv.x * 6.2832 * 16.0);
  float sheet = fract(uv.y * 2.0);
  float lap = smoothstep(0.0, 0.012, sheet) * (1.0 - smoothstep(0.985, 1.0, sheet));
  float rustN = fbm(uv * 5.0, vec2(5.0), 6, 0.55);
  float streaks = fbm(vec2(uv.x * 30.0, uv.y * 2.0), vec2(30.0, 2.0), 4, 0.5);
  float rust = smoothstep(0.18, 0.5, rustN + 0.25 * streaks);
  float fine = fbm(uv * 120.0, vec2(120.0), 3, 0.6);
  h = 0.5 + 0.36 * w * lap + 0.02 * fine + 0.04 * rust;
  vec3 paint = vec3(0.66, 0.67, 0.67) * (0.92 + 0.08 * fine);
  vec3 rc = mix(vec3(0.38, 0.18, 0.08), vec3(0.55, 0.32, 0.14), 0.5 + 0.5 * fine);
  vec3 c = mix(paint, rc, rust * 0.85);
  c *= 0.9 + 0.1 * (w * 0.5 + 0.5);
  c *= 1.0 - 0.3 * (1.0 - lap);
  alb = vec4(toLin(c), 1.0);
  orm = vec3(1.0 - 0.3 * (1.0 - lap), mix(0.42, 0.88, rust), mix(0.75, 0.05, rust));
}`;

// --- glazed ceramic tiles ---------------------------------------------------
SURF.tiles = /* glsl */`
void surf(vec2 uv, out vec4 alb, out float h, out vec3 orm){
  float N = 8.0;
  vec2 p = uv * N;
  vec2 f = fract(p) - 0.5;
  vec2 cid = mod(floor(p), N);
  float r = hash12(cid + 5.0);
  float d = sdRoundRect(f, vec2(0.47), 0.04);
  float tile = smoothstep(0.01, -0.01, d);
  float bev = clamp(-d * 18.0, 0.0, 1.0);
  float fine = fbm(uv * 160.0, vec2(160.0), 3, 0.6);
  float dirt = fbm(uv * 4.0, vec2(4.0), 4, 0.5);
  vec3 c = vec3(0.90, 0.90, 0.88) * (0.95 + 0.06 * r);
  vec3 grout = vec3(0.55, 0.54, 0.50) * (0.9 + 0.2 * fine) * (0.9 + 0.2 * dirt);
  c = mix(grout, c, tile);
  h = mix(0.3, 0.6 + 0.05 * sqrt(bev), tile);
  alb = vec4(toLin(c), 1.0);
  orm = vec3(mix(0.7, 1.0, tile), mix(0.85, 0.12 + 0.08 * r, tile), 0.0);
}`;

// --- black and white marble checkerboard -----------------------------------------
SURF.checker = /* glsl */`
void surf(vec2 uv, out vec4 alb, out float h, out vec3 orm){
  float N = 4.0;
  vec2 p = uv * N;
  vec2 cid = mod(floor(p), N);
  vec2 f = fract(p) - 0.5;
  float black = mod(cid.x + cid.y, 2.0);
  float d = sdRoundRect(f, vec2(0.495), 0.01);
  float tile = smoothstep(0.004, -0.004, d);
  float vein = smoothstep(0.82, 0.98, ridged(uv * 3.0 + hash22(cid) * 3.0, vec2(3.0), 5));
  float fine = fbm(uv * 60.0, vec2(60.0), 3, 0.5);
  vec3 w = vec3(0.88, 0.87, 0.84) * (0.95 + 0.05 * fine) * (1.0 - 0.25 * vein);
  vec3 b = vec3(0.06, 0.06, 0.065) * (0.9 + 0.2 * fine) + vec3(0.22) * vein;
  vec3 c = mix(w, b, black);
  c = mix(vec3(0.35), c, tile);
  h = mix(0.4, 0.6, tile);
  alb = vec4(toLin(c), 1.0);
  orm = vec3(1.0, mix(0.6, 0.14, tile), 0.0);
}`;

// --- wind-rippled sand ------------------------------------------------------------
SURF.sand = /* glsl */`
void surf(vec2 uv, out vec4 alb, out float h, out vec3 orm){
  float warp = fbm(uv * 3.0, vec2(3.0), 3, 0.5);
  float rip = sin((uv.y + 0.08 * warp) * 6.2832 * 18.0 + 3.0 * fbm(uv * 6.0, vec2(6.0), 3, 0.5));
  float fine = fbm(uv * 180.0, vec2(180.0), 3, 0.6);
  float big = fbm(uv * 2.0, vec2(2.0), 4, 0.5);
  h = 0.5 + 0.12 * rip + 0.04 * fine + 0.1 * big;
  vec3 c = vec3(0.83, 0.72, 0.52) * (0.9 + 0.1 * big + 0.06 * fine + 0.04 * rip);
  alb = vec4(toLin(c), 1.0);
  orm = vec3(1.0, 0.95, 0.0);
}`;

// --- packed snow ---------------------------------------------------------------------
SURF.snow = /* glsl */`
void surf(vec2 uv, out vec4 alb, out float h, out vec3 orm){
  float big = fbm(uv * 3.0, vec2(3.0), 5, 0.5);
  float mid = fbm(uv * 14.0, vec2(14.0), 4, 0.5);
  float fine = fbm(uv * 150.0, vec2(150.0), 3, 0.6);
  float sp = step(0.985, hash12(mod(floor(uv * 512.0), 512.0)));
  h = 0.5 + 0.15 * big + 0.06 * mid + 0.02 * fine;
  vec3 c = vec3(0.93, 0.95, 0.98) * (0.94 + 0.04 * big + 0.03 * fine);
  c = mix(c, vec3(0.80, 0.86, 0.96), smoothstep(0.1, -0.3, big) * 0.5);
  alb = vec4(toLin(c), 1.0);
  orm = vec3(1.0, 0.78 - 0.4 * sp, 0.0);
}`;

// --- cracked ice ---------------------------------------------------------------------
SURF.ice = /* glsl */`
void surf(vec2 uv, out vec4 alb, out float h, out vec3 orm){
  vec2 rel; vec4 v = voronoi(uv * 4.0, vec2(4.0), 1.0, rel);
  float cr = 1.0 - smoothstep(0.0, 0.02, v.y - v.x);
  vec2 rel2; vec4 v2 = voronoi(uv * 11.0 + 3.0, vec2(11.0), 1.0, rel2);
  float cr2 = (1.0 - smoothstep(0.0, 0.015, v2.y - v2.x)) * step(0.0, fbm(uv * 3.0, vec2(3.0), 3, 0.5));
  float cloud = fbm(uv * 5.0, vec2(5.0), 5, 0.5);
  vec3 c = mix(vec3(0.50, 0.68, 0.80), vec3(0.80, 0.90, 0.96), 0.5 + 0.5 * cloud);
  c = mix(c, vec3(0.95, 0.98, 1.0), max(cr, cr2 * 0.7));
  h = 0.5 + 0.05 * cloud - 0.15 * cr - 0.08 * cr2;
  alb = vec4(toLin(c), 1.0);
  orm = vec3(1.0, 0.05 + 0.3 * max(cr, cr2), 0.0);
}`;

// --- lawn grass ------------------------------------------------------------------------
SURF.grass = /* glsl */`
void surf(vec2 uv, out vec4 alb, out float h, out vec3 orm){
  float big = fbm(uv * 3.0, vec2(3.0), 4, 0.5);
  float mid = fbm(uv * 20.0, vec2(20.0), 4, 0.55);
  float blades = fbm(vec2(uv.x * 260.0, uv.y * 90.0), vec2(260.0, 90.0), 3, 0.6);
  vec2 rel; vec4 v = voronoi(uv * 40.0, vec2(40.0), 1.0, rel);
  float clump = smoothstep(0.6, 0.1, v.x);
  float dry = smoothstep(0.1, 0.5, big);
  vec3 c = mix(vec3(0.20, 0.34, 0.11), vec3(0.38, 0.45, 0.17), 0.5 + 0.5 * mid);
  c = mix(c, vec3(0.55, 0.50, 0.28), dry * 0.6);
  c *= 0.75 + 0.3 * clump + 0.15 * blades;
  h = 0.4 + 0.2 * clump + 0.1 * blades + 0.05 * mid;
  alb = vec4(toLin(c), 1.0);
  orm = vec3(0.7 + 0.3 * clump, 0.93, 0.0);
}`;

// --- lava: dark crust with glowing cracks (the albedo doubles as emissive map) ---
SURF.lava = /* glsl */`
void surf(vec2 uv, out vec4 alb, out float h, out vec3 orm){
  vec2 warp = vec2(fbm(uv * 3.0, vec2(3.0), 4, 0.5), fbm(uv * 3.0 + 5.2, vec2(3.0), 4, 0.5));
  vec2 rel; vec4 v = voronoi(uv * 5.0 + warp * 0.8, vec2(5.0), 1.0, rel);
  float edge = v.y - v.x;
  float hot = 1.0 - smoothstep(0.0, 0.12, edge);
  float fine = fbm(uv * 60.0, vec2(60.0), 4, 0.55);
  float crust = smoothstep(0.02, 0.25, edge);
  vec3 crustC = vec3(0.07, 0.05, 0.045) * (0.8 + 0.4 * fine);
  vec3 hotC = mix(vec3(1.0, 0.22, 0.02), vec3(1.0, 0.72, 0.2), hot);
  vec3 c = mix(hotC, crustC, crust);
  h = 0.35 + 0.3 * crust + 0.05 * fine;
  alb = vec4(toLin(c), 1.0);
  orm = vec3(1.0, mix(0.4, 0.95, crust), 0.0);
}`;

// --- carpet with a small woven motif (tinted) -----------------------------------------
SURF.carpet = /* glsl */`
void surf(vec2 uv, out vec4 alb, out float h, out vec3 orm){
  float fib = fbm(uv * 300.0, vec2(300.0), 3, 0.7);
  float mid = fbm(uv * 12.0, vec2(12.0), 4, 0.5);
  vec2 q = fract(uv * 8.0) - 0.5;
  float dm = abs(q.x) + abs(q.y);
  float motif = smoothstep(0.30, 0.27, dm) - smoothstep(0.22, 0.19, dm);
  vec3 c = vec3(0.78) * (0.85 + 0.12 * fib + 0.06 * mid);
  c *= 1.0 - 0.2 * motif;
  h = 0.5 + 0.08 * fib + 0.03 * mid - 0.05 * motif;
  alb = vec4(toLin(c), 1.0);
  orm = vec3(1.0, 0.98, 0.0);
}`;

// --- basket-weave parquet ----------------------------------------------------------------
SURF.parquet = /* glsl */`
void surf(vec2 uv, out vec4 alb, out float h, out vec3 orm){
  float N = 8.0;
  vec2 p = uv * N;
  vec2 cell = floor(p);
  vec2 f = fract(p);
  float alt = mod(cell.x + cell.y, 2.0);
  float coord = alt > 0.5 ? f.x : f.y;
  float along = alt > 0.5 ? f.y : f.x;
  float k = floor(coord * 4.0);
  float lc = fract(coord * 4.0);
  vec3 r = hash32(vec2(mod(cell.x, N) * 4.0 + k, mod(cell.y, N) + alt * 31.0));
  float seam = 1.0 - smoothstep(0.0, 0.07, min(lc, 1.0 - lc));
  float seamEnd = 1.0 - smoothstep(0.0, 0.015, min(along, 1.0 - along));
  float grain = fbm(vec2(along * 3.0 + r.x * 10.0, lc + r.y * 7.0), vec2(3.0, 1.0), 4, 0.5);
  float lines = sin(along * 40.0 + grain * 6.0 + r.z * 9.0) * 0.5 + 0.5;
  vec3 wood = mix(vec3(0.52, 0.33, 0.18), vec3(0.70, 0.50, 0.30), r.z);
  wood *= 0.85 + 0.12 * lines + 0.1 * grain;
  float s = max(seam, seamEnd);
  vec3 c = wood * (1.0 - 0.6 * s);
  h = 0.55 + 0.04 * lines - 0.3 * s;
  alb = vec4(toLin(c), 1.0);
  orm = vec3(1.0 - 0.3 * s, 0.5 + 0.12 * r.x, 0.0);
}`;

// --- diamond tread plate -----------------------------------------------------------------
SURF.diamond = /* glsl */`
void surf(vec2 uv, out vec4 alb, out float h, out vec3 orm){
  float N = 12.0;
  vec2 p = uv * N;
  vec2 cid = floor(p);
  vec2 f = fract(p) - 0.5;
  float flip = mod(cid.x + cid.y, 2.0);
  vec2 q = flip > 0.5 ? vec2(f.x + f.y, f.x - f.y) * 0.7071 : vec2(f.x - f.y, f.x + f.y) * 0.7071;
  float d = sdRoundRect(q, vec2(0.34, 0.07), 0.06);
  float bump = smoothstep(0.03, -0.03, d);
  float fine = fbm(uv * 100.0, vec2(100.0), 3, 0.6);
  float wear = smoothstep(0.2, 0.6, fbm(uv * 4.0, vec2(4.0), 4, 0.5));
  vec3 c = vec3(0.62, 0.63, 0.64) * (0.88 + 0.1 * fine);
  c = mix(c, vec3(0.80, 0.81, 0.82), bump * 0.6);
  c *= 1.0 - 0.15 * wear;
  h = 0.4 + 0.3 * bump + 0.02 * fine;
  alb = vec4(toLin(c), 1.0);
  orm = vec3(1.0, mix(0.4, 0.22, bump) + 0.15 * wear, 0.95);
}`;

// --- blockout grid (1 m cells, 25 cm sub-lines at uvScale 4), tinted -------------------
SURF.grid = /* glsl */`
void surf(vec2 uv, out vec4 alb, out float h, out vec3 orm){
  vec2 p = uv * 4.0;
  vec2 f = fract(p);
  float mainL = 1.0 - smoothstep(0.0, 0.014, min(min(f.x, 1.0 - f.x), min(f.y, 1.0 - f.y)));
  vec2 g = fract(p * 4.0);
  float subL = 1.0 - smoothstep(0.0, 0.035, min(min(g.x, 1.0 - g.x), min(g.y, 1.0 - g.y)));
  float fine = fbm(uv * 64.0, vec2(64.0), 3, 0.5);
  vec3 c = vec3(0.85) * (0.97 + 0.03 * fine);
  c *= 1.0 - 0.10 * subL;
  c *= 1.0 - 0.30 * mainL;
  h = 0.5 - 0.05 * mainL;
  alb = vec4(toLin(c), 1.0);
  orm = vec3(1.0, 0.78, 0.0);
}`;

// --- gravel ---------------------------------------------------------------------------------
SURF.gravel = /* glsl */`
void surf(vec2 uv, out vec4 alb, out float h, out vec3 orm){
  vec2 rel; vec4 v = voronoi(uv * 36.0, vec2(36.0), 1.0, rel);
  vec2 rel2; vec4 v2 = voronoi(uv * 55.0 + 0.5, vec2(55.0), 1.0, rel2);
  float s1 = smoothstep(0.03, 0.12, v.y - v.x);
  float s2 = smoothstep(0.03, 0.10, v2.y - v2.x);
  float dome = clamp((v.y - v.x) * 4.0, 0.0, 1.0);
  float fine = fbm(uv * 150.0, vec2(150.0), 3, 0.6);
  vec3 c1 = mix(vec3(0.52, 0.49, 0.45), vec3(0.72, 0.68, 0.62), v.z);
  vec3 c2 = mix(vec3(0.40, 0.38, 0.35), vec3(0.62, 0.58, 0.52), v2.z);
  vec3 c = mix(vec3(0.30, 0.26, 0.21), c2, s2 * 0.9);
  c = mix(c, c1, s1);
  c *= 0.9 + 0.12 * fine;
  h = 0.25 + 0.4 * s1 * sqrt(dome) + 0.2 * s2 + 0.04 * fine;
  alb = vec4(toLin(c), 1.0);
  orm = vec3(mix(0.5, 1.0, max(s1, s2)), 0.9, 0.0);
}`;

// --- natural rock face ----------------------------------------------------------------------
SURF.rock = /* glsl */`
void surf(vec2 uv, out vec4 alb, out float h, out vec3 orm){
  float r1 = ridged(uv * 3.0, vec2(3.0), 6);
  float n = fbm(uv * 8.0, vec2(8.0), 5, 0.5);
  float strata = sin((uv.y * 10.0 + n * 1.5) * 6.2832) * 0.5 + 0.5;
  float fine = fbm(uv * 90.0, vec2(90.0), 4, 0.55);
  float moss = smoothstep(0.25, 0.55, fbm(uv * 4.0 + 9.0, vec2(4.0), 4, 0.5));
  vec3 c = mix(vec3(0.42, 0.40, 0.37), vec3(0.62, 0.59, 0.54), r1 * 0.8 + 0.2 * strata);
  c *= 0.88 + 0.12 * fine;
  c = mix(c, vec3(0.28, 0.34, 0.16), moss * 0.35);
  h = 0.3 + 0.45 * r1 + 0.08 * strata + 0.05 * fine;
  alb = vec4(toLin(c), 1.0);
  orm = vec3(0.6 + 0.4 * r1, 0.9, 0.0);
}`;

// --- riveted steel plates -------------------------------------------------------------------
SURF.plate = /* glsl */`
void surf(vec2 uv, out vec4 alb, out float h, out vec3 orm){
  vec2 f = fract(uv * 2.0);
  float ed = min(min(f.x, 1.0 - f.x), min(f.y, 1.0 - f.y));
  float seam = 1.0 - smoothstep(0.0, 0.008, ed);
  vec2 rp = fract(uv * 16.0) - 0.5;
  float rivet = smoothstep(0.17, 0.11, length(rp)) * step(ed, 0.06) * step(0.02, ed);
  float fine = fbm(uv * 100.0, vec2(100.0), 3, 0.6);
  float smudge = fbm(uv * 6.0, vec2(6.0), 4, 0.5);
  vec3 c = vec3(0.55, 0.57, 0.58) * (0.85 + 0.12 * smudge + 0.06 * fine);
  c *= 1.0 - 0.4 * seam;
  c = mix(c, vec3(0.72), rivet * 0.5);
  h = 0.5 - 0.25 * seam + 0.2 * rivet + 0.02 * fine;
  alb = vec4(toLin(c), 1.0);
  orm = vec3(1.0 - 0.3 * seam, 0.36 + 0.16 * smudge, 0.9);
}`;

// --- chain-link fence (alpha in albedo.a) -------------------------------------------------------
SURF.chain = /* glsl */`
void surf(vec2 uv, out vec4 alb, out float h, out vec3 orm){
  vec2 p = uv * 16.0;
  vec2 q = vec2(p.x + p.y, p.x - p.y) * 0.7071;
  vec2 f = abs(fract(q) - 0.5);
  float wire = 1.0 - smoothstep(0.035, 0.07, min(f.x, f.y));
  float fine = fbm(uv * 60.0, vec2(60.0), 3, 0.5);
  vec3 c = vec3(0.62, 0.64, 0.64) * (0.85 + 0.15 * fine);
  h = 0.5 + 0.3 * wire;
  alb = vec4(toLin(c), wire);
  orm = vec3(1.0, 0.45, 0.85);
}`;
