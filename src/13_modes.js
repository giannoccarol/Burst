// ===================================================================
// Game modes. The elected host owns `g` (published in its presence);
// everyone else mirrors it. Scores that depend on kills are tallied by
// the host from DIE events.
// ===================================================================
const MODES = [
  { id: 'ffa', name: 'Tutti contro tutti', short: 'FFA', teams: false, time: 480, limit: 25, desc: 'Ognuno per sé: vince chi arriva per primo a 25 uccisioni.' },
  { id: 'tdm', name: 'Deathmatch a squadre', short: 'TDM', teams: true, time: 480, limit: 50, desc: 'Rossi contro Azzurri: la prima squadra a 50 uccisioni vince.' },
  { id: 'hp', name: 'Hardpoint', short: 'HP', teams: true, time: 480, limit: 200, desc: 'Tieni la zona attiva per fare punti. La zona si sposta ogni 60 secondi.' },
  { id: 'ctf', name: 'Cattura la bandiera', short: 'CTF', teams: true, time: 480, limit: 3, desc: 'Ruba la bandiera nemica e portala alla tua base. Tre catture per vincere.' },
  { id: 'gun', name: 'Gun Game', short: 'GG', teams: false, time: 600, limit: GUNGAME_LIST.length, desc: 'Ogni uccisione ti dà un\'arma nuova. Vince chi chiude col coltello.' },
  { id: 'inf', name: 'Infetti', short: 'INF', teams: true, time: 210, limit: 0, desc: 'Un giocatore è infetto e contagia chi uccide. I sopravvissuti devono resistere.' },
];
const MODE_IDX = Object.fromEntries(MODES.map((m, i) => [m.id, i]));
const TEAM_NAMES = { 0: '', 1: 'Rossi', 2: 'Azzurri' };
const END_TIME = 13;

function newMatchState(modeIdx, mapId, prevId) {
  const m = MODES[modeIdx];
  const g = { id: ((prevId || Math.floor(Math.random() * 1e6)) + 1) % 1e9, m: modeIdx, ph: 0, r: m.time, sc: [0, 0], t: {}, mp: mapId || 'borgo', st: Date.now() % 1e9, cfg: { b: Game.roomCfg.bots | 0, d: Game.roomCfg.diff | 0 } };
  if (m.id === 'hp') g.hz = [0, 0, 60];
  if (m.id === 'ctf') g.fl = [[0, ...FLAGS_POS()[0], ''], [0, ...FLAGS_POS()[1], '']];
  if (m.id === 'inf') g.inf = 0;
  return g;
}
function FLAGS_POS() { return Game.mapInfo && Game.mapInfo.flags ? Game.mapInfo.flags : FLAGS; }
function ZONES() { return Game.mapInfo && Game.mapInfo.zones ? Game.mapInfo.zones : HARDPOINTS; }

function inZone(z, p) {
  if (z.box) { const b = z.box; return p.x > b[0] && p.x < b[3] && p.y > b[1] - 0.2 && p.y < b[4] && p.z > b[2] && p.z < b[5]; }
  return Math.hypot(p.x - z.c[0], p.z - z.c[2]) < z.r && p.y > z.c[1] - 0.6 && p.y < z.c[1] + (z.h || 3);
}
function zoneCenter(z) { return z.box ? [(z.box[0] + z.box[3]) / 2, z.box[1] + 0.2, (z.box[2] + z.box[5]) / 2] : z.c; }

const ModeHost = {
  acc: 0,
  // combatants: [{ id, team, alive, pos, human }]
  update(dt, g, list) {
    const mode = MODES[g.m];
    if (g.ph === 1) {
      g.r -= dt;
      if (g.r <= 0) return this.nextMatch(g, list);
      return;
    }
    g.r -= dt;
    // team assignment
    if (mode.teams) this.assignTeams(g, list, mode);
    else { for (const c of list) g.t[c.id] = 0; }
    this.cleanTeams(g, list);
    if (mode.id === 'hp') this.hardpoint(dt, g, list);
    if (mode.id === 'ctf') this.ctf(dt, g, list);
    if (mode.id === 'inf') this.infected(dt, g, list);
    // win checks
    if (mode.id === 'ffa') {
      for (const c of list) if ((c.kills || 0) >= mode.limit) return this.endMatch(g, c.id);
    } else if (mode.id === 'gun') {
      for (const c of list) if ((c.lvl || 0) >= GUNGAME_LIST.length) return this.endMatch(g, c.id);
    } else if (mode.id === 'tdm' || mode.id === 'hp' || mode.id === 'ctf') {
      if (g.sc[0] >= mode.limit) return this.endMatch(g, 'T1');
      if (g.sc[1] >= mode.limit) return this.endMatch(g, 'T2');
    }
    if (g.r <= 0) {
      if (mode.id === 'inf') return this.endMatch(g, 'T1');
      if (mode.teams) return this.endMatch(g, g.sc[0] > g.sc[1] ? 'T1' : g.sc[1] > g.sc[0] ? 'T2' : 'DRAW');
      let best = null;
      const key = mode.id === 'gun' ? 'lvl' : 'kills';
      for (const c of list) if (!best || (c[key] || 0) > (best[key] || 0) || ((c[key] || 0) === (best[key] || 0) && (c.score || 0) > (best.score || 0))) best = c;
      return this.endMatch(g, best ? best.id : 'DRAW');
    }
  },
  assignTeams(g, list, mode) {
    if (mode.id === 'inf') { for (const c of list) if (!(c.id in g.t)) g.t[c.id] = 1; return; }
    const count = [0, 0, 0];
    for (const c of list) if (g.t[c.id] === 1 || g.t[c.id] === 2) count[g.t[c.id]]++;
    // humans first so bots fill the gaps
    const sorted = list.slice().sort((a, b) => (b.human ? 1 : 0) - (a.human ? 1 : 0));
    for (const c of sorted) {
      if (g.t[c.id] === 1 || g.t[c.id] === 2) continue;
      const team = count[1] <= count[2] ? 1 : 2;
      g.t[c.id] = team; count[team]++;
    }
    // rebalance bots if teams differ by 2+
    if (Math.abs(count[1] - count[2]) >= 2) {
      const big = count[1] > count[2] ? 1 : 2;
      const bot = list.find((c) => !c.human && g.t[c.id] === big);
      if (bot) g.t[bot.id] = big === 1 ? 2 : 1;
    }
  },
  cleanTeams(g, list) {
    this.acc += 1;
    if (this.acc % 60) return;
    const live = new Set(list.map((c) => c.id));
    for (const id of Object.keys(g.t)) if (!live.has(id)) delete g.t[id];
  },
  hardpoint(dt, g, list) {
    const zs = ZONES();
    g.hz[2] -= dt;
    if (g.hz[2] <= 0) { g.hz[0] = (g.hz[0] + 1) % zs.length; g.hz[2] = 60; g.hz[1] = 0; }
    const z = zs[g.hz[0]];
    const pres = [0, 0, 0];
    for (const c of list) if (c.alive && c.pos && inZone(z, c.pos)) pres[g.t[c.id] || 0]++;
    let owner = 0;
    if (pres[1] && pres[2]) owner = -1; else if (pres[1]) owner = 1; else if (pres[2]) owner = 2;
    g.hz[1] = owner;
    if (owner > 0) g.sc[owner - 1] = Math.round((g.sc[owner - 1] + dt) * 100) / 100;
  },
  ctf(dt, g, list) {
    const F = FLAGS_POS();
    for (let i = 0; i < 2; i++) {
      const fl = g.fl[i], flagTeam = i + 1;
      if (fl[0] === 1) {
        const car = list.find((c) => c.id === fl[4]);
        if (!car || !car.alive) {
          const lp = car && car.pos ? car.pos : { x: fl[1], y: fl[2], z: fl[3] };
          const fy = Game.world ? Game.world.floorBelow(lp.x, lp.z, lp.y + 0.5) : lp.y;
          fl[0] = 2; fl[1] = r2(lp.x); fl[2] = r2(Math.max(fy, -1)); fl[3] = r2(lp.z); fl[4] = ''; fl[5] = 25;
          continue;
        }
        fl[1] = r2(car.pos.x); fl[2] = r2(car.pos.y); fl[3] = r2(car.pos.z);
        // capture?
        const base = F[(g.t[car.id] || 1) - 1];
        const own = g.fl[(g.t[car.id] || 1) - 1];
        if (own[0] === 0 && Math.hypot(car.pos.x - base[0], car.pos.z - base[2]) < 2.2 && Math.abs(car.pos.y - base[1]) < 2) {
          g.sc[(g.t[car.id] || 1) - 1]++;
          fl[0] = 0; fl[1] = F[i][0]; fl[2] = F[i][1]; fl[3] = F[i][2]; fl[4] = '';
          g.cap = [car.id, Date.now() % 1e9];
        }
        continue;
      }
      if (fl[0] === 2) { fl[5] = (fl[5] || 25) - dt; if (fl[5] <= 0) { fl[0] = 0; fl[1] = F[i][0]; fl[2] = F[i][1]; fl[3] = F[i][2]; continue; } }
      for (const c of list) {
        if (!c.alive || !c.pos) continue;
        const d = Math.hypot(c.pos.x - fl[1], c.pos.z - fl[3]);
        if (d > 1.7 || Math.abs(c.pos.y - fl[2]) > 2.2) continue;
        const team = g.t[c.id] || 0;
        if (team && team !== flagTeam) { fl[0] = 1; fl[4] = c.id; break; }
        if (team === flagTeam && fl[0] === 2) { fl[0] = 0; fl[1] = F[i][0]; fl[2] = F[i][1]; fl[3] = F[i][2]; fl[4] = ''; break; }
      }
    }
  },
  infected(dt, g, list) {
    const mode = MODES[g.m];
    if (!g.inf) {
      if (mode.time - g.r > 10 && list.length >= 2) {
        const pickC = list[Math.floor(Math.random() * list.length)];
        for (const c of list) g.t[c.id] = 1;
        g.t[pickC.id] = 2; g.inf = 1;
      }
      return;
    }
    const surv = list.filter((c) => g.t[c.id] === 1).length;
    const inf = list.filter((c) => g.t[c.id] === 2).length;
    if (surv === 0 && list.length) return this.endMatch(g, 'T2');
    if (inf === 0 && list.length >= 2) { const s = list[Math.floor(Math.random() * list.length)]; g.t[s.id] = 2; }
  },
  onDeath(g, victim, killer, vTeam, kTeam) {
    if (!g || g.ph !== 0) return;
    const mode = MODES[g.m];
    if (mode.id === 'tdm' && killer && killer !== victim && kTeam && kTeam !== vTeam) g.sc[kTeam - 1]++;
    if (mode.id === 'inf' && g.inf && vTeam === 1) g.t[victim] = 2;
  },
  endMatch(g, winner) {
    g.ph = 1; g.r = END_TIME; g.w = winner;
    const opts = shuffle(MODES.map((_, i) => i).filter((i) => i !== g.m)).slice(0, 2);
    g.vo = shuffle([g.m, ...opts]);
  },
  nextMatch(g, list) {
    const votes = [0, 0, 0];
    // bots only break ties among humans, or decide when no human voted
    const humans = list.some((c) => c.human && c.vote != null && c.vote >= 0 && c.vote < 3);
    for (const c of list) if (c.vote != null && c.vote >= 0 && c.vote < 3) votes[c.vote] += c.human ? 1 : humans ? 0.01 : 0.34;
    let bi = 0; for (let i = 1; i < 3; i++) if (votes[i] > votes[bi]) bi = i;
    const nm = g.vo && g.vo[bi] != null ? g.vo[bi] : g.m;
    const n = newMatchState(nm, g.mp, g.id);
    n.he = g.he; // the host term survives the next match (see Net.elect)
    for (const k of Object.keys(g)) delete g[k];
    Object.assign(g, n);
  },
};
