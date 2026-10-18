# Raffica

FPS multiplayer nel browser da giocare tra colleghi, pubblicato come **artifact di claude.ai**. Si ispira a Krunker per le dinamiche (movimento veloce, bunny hop, scivolate, classi, modalità), ma con grafica realistica (three.js r170, materiali PBR generati sulla GPU). Mappe integrate: **Borgo** (piazza italiana) e **Villette** (villaggio di prova anni '50 nel deserto, due case una di fronte all'altra stile "Nuketown"); in più le mappe custom dell'editor. Tutti i testi del gioco sono in **italiano**.

- **Artifact attuale** (versione del 18/10/2026: Villette, armeria, personaggio, modelli 3D, grafica a preset, rete PROTO 4, capability `room`, `user`, `db`): https://claude.ai/artifact/PZAiesVYaqcMc5CHzV4ENn. Privato: i colleghi lo vedono solo dopo la condivisione dal menu Condividi. La vecchia v1 (PROTO 3, senza editor) resta su https://claude.ai/artifact/HzKV4UPoe4PP1DKSCDADYP e non si collega con la nuova.
- Verificato dentro claude.ai: il gioco parte, il nome arriva dal profilo e i modelli GLB (pubblicati in base64) si caricano. L'editor di mappe è nel build ma va ancora collaudato a fondo (vedi "Editor mappe").

## Comandi

```bash
python3 build.py dist/raffica.html          # build da pubblicare (nessun doctype/head/body: li aggiunge l'artifact)
python3 test/check.py                       # build + `node --check` del modulo: controllo di sintassi in un secondo
python3 -m http.server 8765 --bind 127.0.0.1             # dalla radice del progetto, per i test nel browser

# pagina di test (three.js dal CDN, mock della runtime claude, avvio da hash URL)
python3 build.py test/game.html --standalone --inject test/mock_claude.js,test/autostart.js
#   http://127.0.0.1:8765/test/game.html                        menu
#   http://127.0.0.1:8765/test/game.html#offline&bots=6&mode=3  partita offline (mode = indice in MODES)
#   http://127.0.0.1:8765/test/game.html#room=prova&bots=2      stanza multiplayer simulata (&cls=N per la classe)
#   ...#offline&bots=6&map=villette                               &map=<id> sceglie la mappa integrata (borgo, villette)

# variante senza rendering e con loop a timer, per simulare partite lunghe velocemente
python3 build.py test/fast.html --standalone --inject test/autostart_fast.js,test/mock_claude.js,test/autostart_core.js

# test headless con Playwright (pip install playwright && playwright install chromium)
python3 test/run.py --pages "http://127.0.0.1:8765/test/fast.html#room=prova&bots=2&mode=1|http://127.0.0.1:8765/test/fast.html#room=prova" \
  --wait 45 --eval @test/scripts/mp_summary.js --out /tmp/mp
```

- `run.py`: più pagine nello stesso browser = più giocatori (il mock usa BroadcastChannel). `--steps "T:PAGINA:@file.js;;…"` esegue JS al secondo T, `--shots 30,60` cattura screenshot, `--eval` valuta a fine corsa. Gli script pronti sono in `test/scripts/` (stato rete, bot, fisica, modalità, fine partita, progressione, editor).
- Per default i test usano SwiftShader (rendering software: lento ma uguale ovunque). `RAFFICA_GPU=1` usa la GPU, `RAFFICA_CHROME=/percorso/chrome` sceglie il browser.
- In pagina: `window.RAFFICA` espone `Game, Net, R, HUD, SFX, FX, Input, Nav, MODES, WEAPONS, CLASSES, Progress, Editor, CATALOG, EDIT_MATS, BUILTIN_MAPS, buildCustomMap, exampleMapDef, emat`.
- Playwright sta in `.venv/` (`python3 -m venv .venv && .venv/bin/pip install playwright && .venv/bin/python -m playwright install chromium`): lanciare `run.py` con `.venv/bin/python`. Flag di test: `window.__RAF_TEST = { lowres, noshadow, norender, timerLoop }`; gli errori finiscono in `window.__errs`.
- Ambienti senza accesso al CDN: `--local` (+ `--three /percorso/three.js`) carica three.js r170 da un checkout servito dallo stesso server.

## Come è fatto il build

Nessun bundler e nessun npm. `build.py` concatena `src/*.js` **in ordine alfabetico** in un unico `<script type="module">` dentro `src/index.html` (segnaposti `<!--IMPORTMAP-->` e `<!--SCRIPT-->`). Conseguenze:

- tutti i file condividono un solo scope: ogni dichiarazione top-level è visibile ovunque, i nomi devono essere unici;
- il prefisso numerico decide l'ordine: una `const`/`class` usata da codice **top-level** deve stare in un file precedente (TDZ); dentro funzioni e metodi l'ordine non conta; le `function` sono hoisted;
- l'unica dipendenza è three r170 + addons via import map (jsdelivr); tutti gli `import` stanno in `src/00_head.js`.

## Mappa dei file (`src/`)

| File | Contenuto |
|---|---|
| `index.html` | Tutto il CSS (token in `:root`) e il markup: menu a schede, HUD, overlay (pausa, classi, morte, fine partita, impostazioni), editor, controlli touch |
| `00_head.js` | Import di three e addons (Sky, EffectComposer, GTAO, Bloom, TransformControls, RoundedBoxGeometry…) |
| `01_util.js` | Matematica, rng (`mulberry32`, `hashStr`), `store` (localStorage con prefisso `raffica.`), `$`/`$$`/`el`, sanificatori, `SETTINGS` |
| `02_textures.js` | `TexGen`: texture PBR procedurali sulla GPU (albedo, normal, ORM); superfici del borgo in `SURF.*` |
| `02b_textures_extra.js` | Superfici extra per l'editor: cemento, asfalto, lamiere, piastrelle, scacchiera, sabbia, neve, ghiaccio, prato, lava, moquette, parquet, griglia prototipo, ghiaia, roccia, rete |
| `03_world.js` | `CollisionWorld`: AABB su griglia + triangoli solo-raggio. Flag `F_NORAY` (blocca il movimento, non i proiettili), `F_NOCOLLIDE` (solo proiettili), `F_WATER` |
| `04a_materials.js` | Libreria `MAT`, colori degli intonaci e delle persiane, `GrimeChunk` (sporco alla base dei muri) |
| `04b_geo.js` | `GeoBuilder`: accumula geometria per materiale e la fonde (`absorbXf` per le mappe custom) |
| `04c_build.js` | `MapCtx` e helper architettonici: facciate, finestre, porte, balconi, tetti, archi |
| `04d_props.js` | Case e oggetti del borgo (casse, barili, lampioni, tavolini, bancarelle, alberi, 500, Vespa…) |
| `04e_map.js`, `04f_mapbuild.js` | Il Borgo: metà A + copia ruotata di 180° (simmetria centrale) + chiesa, palazzo e fontana unici; spawn, hardpoint, basi CTF; sfondo collinare |
| `04h_villette.js` | Mappa Villette: metà A (casa gialla a nord, cortili, metà strada) + copia ruotata con scambio materiali (casa verde); pezzi unici in strada (pick-up, scuolabus percorribile, furgone con cassone aperto, cartello "Abitanti" dinamico); sfondo desertico (`buildDesert`). Helper `vl*`: `vlWall`/`vlCut` (muri a due pelli con aperture anche sovrapposte), `vlLocal` (telaio locale a 90°), `vlCat` (oggetti del catalogo nella mappa), recinzioni |
| `04j_mapprops.js` | `MapProps`: oggetti GLB nelle mappe integrate (`assets/p_<slug>.glb`, registri `PROP_GLB_BORGO` in `04d_props.js` e `PROP_GLB_VILLETTE` in `04h_villette.js`), normalizzati (`fit`, `rot`, fronte = +x locale) e fusi per materiale |
| `04i_maps.js` | `BUILTIN_MAPS` (id → nome, sottotitolo, preset ambiente, ombre, `load`), `builtinMap(id)`, `mapLabel(id)` |
| `04g_catalog.js` | Editor: 83 materiali `EDIT_MATS` in 10 gruppi e catalogo `CATALOG` di 58 elementi (11 forme, 37 oggetti, 10 di gioco), `buildObject`, `addObjCollision` |
| `05_render.js` | `R`: renderer, ombre, cielo→cubemap→PMREM, preset ambiente `ENV_PRESETS` con `R.applyEnv(nome)` (incluso `deserto` per Villette), post-processing per qualità ≥ 2, qualità automatica |
| `06_physics.js` | `Mover`: movimento stile Quake (accelerazione in aria, bhop, slide, coyote time, step-up 0,52 m), substep a 125 Hz, costanti in `PHYS` |
| `07_input.js` | Tastiera, mouse (pointer lock con ripiego a trascinamento), touch |
| `08_weapons.js` | `WEAPONS`, `CLASSES` (9), lista Gun Game, modelli procedurali delle armi |
| `09_viewmodel.js`, `09b_avatar.js` | Arma in prima persona (animazioni di ricarica, ADS, rinculo) e soldato in terza persona con IK |
| `10_fx.js`, `11_audio.js` | Particelle, traccianti, decal, esplosioni; audio sintetizzato con WebAudio |
| `12_net.js` | Rete sulla capability `room` (dettagli sotto) |
| `13_modes.js` | `MODES` (ffa, tdm, hp, ctf, gun, inf) e `ModeHost`, la logica di partita eseguita dall'host |
| `16_game.js` | `Game`: ciclo principale, giocatore locale, armi e danni, morti, razzi, partita, mappe, trigger delle mappe custom |
| `17_bots.js` | Bot: griglia di navigazione multilivello (1 m) + A*, percezione, mira con errore, obiettivi per modalità |
| `18_hud.js` | Menu, HUD, classifica, chat, impostazioni, segnalini degli obiettivi |
| `19_progress.js` | Livelli/XP, 3 sfide giornaliere seminate dalla data (uguali per tutti), statistiche; tutto in localStorage |
| `20_editor.js` | Editor mappe (UI, camera libera, piazzamento, gizmo, ispettore, undo/redo, salvataggi, pubblicazione, prova) |
| `21_custommap.js` | Formato JSON delle mappe custom, sanificazione, `buildCustomMap`, mappa d'esempio |
| `99_boot.js` | Avvio, `window.RAFFICA`, hot reload |

## Vincoli dell'artifact (rispettarli sempre)

- Il file pubblicato **non** contiene `<!doctype>`, `<html>`, `<head>`, `<body>`: li aggiunge claude.ai. In cima restano `<title>Raffica</title>` e `<meta name="claude:viewport-fit-sides" content="cover">`; i margini laterali usano `max(16px, env(safe-area-inset-*))`.
- CSP: script solo da `cdn.jsdelivr.net/npm` (versioni fissate, qui three@0.170.0), fogli di stile solo da Google Fonts (Archivo, Barlow, Permanent Marker), nessuna fetch verso altri host. Tutto il resto è inline o generato.
- Capability da dichiarare al prossimo publish (l'editor aggiunge `db`):
  ```json
  { "room": {}, "user": { "scopes": ["profile"] },
    "db": { "rules": [ { "path": "maps", "read": "view", "write": "owner" },
                       { "path": "maps/{self}", "write": "interact" } ] } }
  ```
  La versione attuale le dichiara tutte e tre (la v1 solo `room` e `user`). Si accede alle capability con `await window.claude.use(nome)`, che restituisce `null` se non disponibili: il gioco deve funzionare anche offline (bot) e senza db.
- localStorage può fallire: passare sempre da `store` o da try/catch.
- Pubblicazione: `python3 build.py dist/raffica.html` (copia i modelli come `dist/assets/<nome>.glb.txt` in base64, perché gli artifact non servono i `.glb`; `07b_assets.js` li decodifica quando `ASSET_B64`), poi pubblicare `dist/raffica.html` **sullo stesso URL** (strumento Artifact, `file_path` uguale o `url`) passando in `files` ogni `assets/<nome>` → `dist/assets/<nome>` (26 file, ~39 MB, sotto i 64 MB per pubblicazione) e le capability qui sopra; icona `game`. I modelli sono generati con `--geom quantize` (niente WebAssembly, per prudenza con la CSP): `cd tools && node build_assets.mjs --geom quantize`.

## Multiplayer (`12_net.js`, `16_game.js`)

- Si usa solo la **presence** della room (niente `emit`): ogni client pubblica circa 30 volte al secondo un oggetto di **massimo 4 KiB**, misurati in **byte UTF-8** (budget 3800):
  `{ v: PROTO(4), j, n, c, tm, mp, ap, s: [t,x,y,z,yaw,pitch,vx,vy,vz,flags,wIdx,hp], k: [k,d,a,sc,streak,lvl,caps], vt, e: [[seq,tipo,attore,…]…], g (solo host), b (bot, solo host) }`. PROTO 3 (la v1 pubblicata) e 4 si ignorano a vicenda.
- Protocollo 4 (revisione del 18/10/2026): `g.t` viaggia come coppie `[id, squadra]` (le etichette dei peer non sono chiavi valide); gli eventi importanti (colpi, morti, razzi, esplosioni, chat, respawn) vivono 3 s e non vengono mai scartati per gli spari (0,7 s); ogni HIT porta il numero di "vita" del bersaglio; `ap` = aspetto (4 interi 0..63, da `Game.appearance`); `wIdx` validato su `WEAPON_IDS.length` (ripiego su `ar`).
- Elezione dell'host: vince chi pubblica la partita col turno più alto (`g.he`), poi il `j` più basso; un peer silenzioso da 4 s o con la scheda nascosta non viene eletto (un host in background cede in meno di 1 s, uno bloccato in 4–5 s). Chi entra aspetta prima di poter fare l'host e chi subentra riprende l'ultimo `g` visto (mappa compresa). Interpolazione dei remoti con ritardo adattivo per peer; niente scie su respawn/teletrasporto.
- Test di rete: il mock accetta `lat`, `jit`, `loss`, `stall`, `noroom`, `joinlat` nell'hash (`__mock.drop/crash/freeze`), `run.py --json --stagger`, script `test/scripts/net_*.js` e `test/net_analyze.py` (comandi nel rapporto della revisione; esempio: pagine `test/net_fast.html#room=h&bots=4` con `--steps "15:0:RAFFICA.Game.leave()"`).
- Eventi in un buffer circolare (al massimo 18, vita 2,5 s): `EV = { SHOT:1, HIT:2, DIE:3, ROCKET:4, BOOM:5, CHAT:6, MELEE:7, SPAWN:8, RELOAD:9 }`. Il danno lo decide la vittima; l'host conta i punteggi dagli eventi DIE.
- **Host** = il peer con `j` (momento di ingresso) più basso. Pubblica `g` (stato della partita: modalità, tempo, punteggi, squadre, zona, bandiere, voti, mappa `mp`, config bot `cfg`) e i bot `[id,name,cls,team,x,y,z,yaw,pitch,f,w,hp,k,d,sc,lvl]`. Se l'host esce, il successivo adotta l'ultimo `g`. Solo l'host può parlare per i bot.
- Lobby: nella room principale ogni client pubblica `{ rm, n, md, mp, hn }` → elenco delle partite nel menu; le partite usano `room.join(nome)`.
- I giocatori remoti sono interpolati con 110 ms di ritardo e un offset di orologio per peer.
- Bit di `flags`: ALIVE 1, CROUCH 2, SLIDE 4, GROUND 8, ADS 16, RELOAD 32, PROT 64, FIRE 128.
- Tutto ciò che arriva dagli altri è **non fidato**: va sanificato (`sanitizeName`, `sanitizeChat`, `sanitizeMapName`, `decObj`, controlli sui tipi in `ingest`).

## Mappe integrate

- Oggetti GLB (`MapProps`): `put(ctx, id, x, y, z, rot)` sostituisce un oggetto procedurale (ritorna false se il file non è caricato: il chiamante disegna la versione procedurale), `add(...)` aggiunge un oggetto nuovo. Le **collisioni restano nel codice delle mappe** (uguali per tutti i client anche senza file). Le posizioni di `ctx.glb` della metà A vanno specchiate (`MapProps.mirrored`), le mappe restituiscono `props` (e lo sfondo `backdrop.props`, senza ombre). I file si precaricano con la mappa (`MapProps.preload`); nel menu la mappa si ricostruisce quando arrivano (`Game.upgradeMapProps`). Sorgenti e licenze in `assets/src/props/manifest.json` (non nel repo), pipeline in `tools/build_assets.mjs` (voci `p_<slug>`), crediti automatici. Controllo visivo: `test/scripts/props_lineup.js` (freccia rossa = fronte).

- Registro in `04i_maps.js`: `Game.loadMap(id)` usa `BUILTIN_MAPS[id].load(holder)` (ritorna `{ map, backdrop, info }`), `switchMap` riconosce gli id integrati; tutto il resto è una mappa custom. Il menu ha i chip della mappa sopra le modalità (`HUD.pickMap`, salvata in `store('map')`), usati da Gioca, Allenamento e Crea stanza; Gioca rapido entra solo in stanze con la stessa modalità **e** mappa, e apre `<mappa>-<modalità>`.
- Villette (`VL.bounds` ±28 m): strada est-ovest a z = 0, case a z ∈ [-20, -12] (A) e specchiata (B). Piano terra a 0,3 m, primo piano a 3,4, gronda a 6,4; scala lungo il muro di fondo con pedata 0,4 (pendenza < 0,5 per cella: i bot la percorrono senza "salti"). Tetti del garage (3,45) raggiungibili da casse impilate e dalle finestre del primo piano; finestre aperte con vetro finto senza collisioni.
- Per la navigazione dei bot (celle da 1 m centrate su k+0,5) porte e varchi delle recinzioni devono essere larghi ≥ 1,2 m e centrati su coordinate k+0,5.
- Hardpoint: Strada, Casa Gialla, Scuolabus, Casa Verde, Furgone; bandiere CTF nei cortili (`VL_FLAGS`); squadra 1 (Rossi) nel cortile nord.

## Feedback dei colpi e movimento (stile CoD)

- Colpi inferti: `HUD.hitmarker(head, kill, prot)` (X bianca, dorata con anello sulla testa, rossa e più grande sulla kill; animazione CSS riavviata a ogni colpo), suoni `SFX.hit(head)` (tick secco + ping metallico) e `SFX.kill(head)`. Punti per zona (stile Krunker) in `Game.dealDamage(..., zone)`: danno × 0,8 testa / 0,5 busto / 0,4 gambe, kill 100 (+50 alla testa), popup cumulativo `HUD.scorePop(pts, etichetta, 'hs'|'k')` accanto al mirino.
- Precisione: `me.acc = { sh, hi, h, b, l }` (un colpo per pressione del grilletto, zona migliore colpita), a fine partita in `#endxp` e nel totale `Progress.data.st` (`sh, hi, zh, zb, zl`, tile "Precisione" e "Colpi alla testa").
- Colpi subiti: archi rossi `HUD.damageDir(src, f, attackerId)` che seguono l'attaccante mentre giri (aggiornati in `HUD.updateDamageDirs`), lampo `#hurtflash`, vignetta pulsante, sangue ai bordi (`#blood`, canvas disegnato una volta) e desaturazione (`#desat`, mix-blend-mode) sotto il 45% di vita, `SFX.hurt(f, head)`, battito e audio ovattato con `SFX.lowHealth(level)` (filtro `SFX.muffle` prima del compressore), sussulto della visuale (`punchP/punchY`, `Game.rollKick`).
- Camera (`Game.updateCamera`, disattivabile con `SETTINGS.viewBob = false`): molla d'atterraggio (`camFx.land`), oscillazione della corsa, inclinazione laterale e in scivolata, FOV +7° ad alta velocità.
- Arrampicata (`Mover.tryMantle`/`stepMantle`): tenendo salto contro un bordo fino a 2,05 m sopra i piedi ci si arrampica (se il bordo è profondo almeno quanto il corpo) o lo si scavalca (davanzali, staccionate, ringhiere: si atterra dall'altra parte). La sonda cerca dal basso il primo bordo con spazio libero sopra; le finestre attraversabili devono avere un'apertura ≥ 1,3 m. `mv.mantled` vale per il passo in cui parte.
- Navigazione bot (`Nav.build`): niente punti sopra 36 m (soffitto di clip) né su cime sottili (< 0,25 m: ringhiere, recinzioni); sulle scale una cella può stare un gradino sopra l'impronta interna; un salto di quota fino a 1,05 m è "a piedi" se il pavimento in mezzo sale a gradini ≤ 0,5; le discese controllano che sopra il punto d'arrivo non ci sia un tetto; `Nav.reach` = nodi raggiungibili dagli spawn (le mete casuali escono solo da lì); `Nav.nearest` preferisce nodi in vista. I bot votano solo se nessun umano ha votato.

## Gameplay in breve

- Classi: Assalto (carabina + pistola), Cecchino, Incursore (solo coltello, il più veloce), Mitragliere, Ombra (mitraglietta), Pistolero (revolver), Tiratore (semiautomatico), Artificiere (razzi, rocket jump), Guardiano (fucile a pompa).
- Modalità: Tutti contro tutti (25 uccisioni), Deathmatch a squadre (50), Hardpoint (200 punti, zona che ruota ogni 60 s), Cattura la bandiera (3), Gun Game, Infetti. A fine partita si vota la modalità successiva.
- Comandi: WASD, Spazio (tenuto = bhop), Shift/C accovacciato e scivolata, clic sinistro spara, destro mira, R ricarica, 1-2-3 e Q armi, V coltellata, Tab classifica, Invio/T chat, B classe, Esc pausa.

## Interfaccia

Stile scuro da "battle royale" scelto dall'utente: fondo quasi nero, caratteri larghi e pesanti (Archivo al 125% di larghezza), accento rosso `--red`, pulsante principale bianco pieno, una parola "a pennello" (Permanent Marker) in rosso, schede scure a destra con barre di avanzamento. Nome e logo restano **Raffica**, nessun marchio di terzi. Token di colore e font in `:root` dentro `src/index.html`. `[hidden]{display:none!important}` è voluto: si mostra/nasconde con `el.hidden`.

## Editor mappe (in corso, da finire)

Richiesta dell'utente: un editor e creatore di mappe con **tantissimo materiale**, non solo quello del borgo.

- Fatto: catalogo (11 forme ridimensionabili, 37 oggetti tra borgo e nuovi, 10 elementi di gioco: spawn per squadra, basi bandiera, zone hardpoint, trampolini, teletrasporti a canali, acqua, zone letali, barriere invisibili, luci), 83 materiali in 10 gruppi con colore personalizzabile, 8 preset di ambiente, terreni, dimensione dell'area; camera libera (tasto destro + mouse, WASD, Q/E), piazzamento a griglia con anteprima, gizmo sposta/ruota/scala (TransformControls), ispettore, undo/redo a snapshot, autosalvataggio in localStorage, apri/importa/esporta JSON, pubblicazione sul db dell'artifact, prova con i bot (Prova → partita offline → Esci torna all'editor), mappe custom nelle partite multiplayer (`g.mp = "<uid>~<mid>"`, i client la scaricano dal db).
- Formato: `{ v:1, name, env:{ sky, ground, size }, o:[ [tipo, x,y,z, sx,sy,sz, rotazioneGradi, materiale, tinta, parametri, seed], … ] }`, limiti in `MAP_LIMITS` (2500 oggetti, 12 luci, 240 KB). Le mappe arrivano da altri utenti: `normDef`/`decObj` sanificano tutto.
- Db: `maps/<uid>` = indice `{ list: { <mid>: { n, t, c, e, s } } }`, `maps/<uid>/defs/<mid>` = `{ def: <stringa JSON>, t }`. Le mappe in prova usano la chiave `local:<mid>`.
- Collisioni: gli oggetti ruotati di angoli non retti vengono spezzati in piccoli AABB (`F_NORAY`) più triangoli esatti per i proiettili; rampe e scale sono gradini `F_NORAY` + superficie per i proiettili.
- **Verificato finora**: l'editor si apre dal menu, carica la mappa d'esempio (61 oggetti) e genera tutte le 141 miniature senza errori; layout corretto a 1366×768.
- **Da verificare/sistemare** (prossimi passi, in ordine):
  1. interazioni reali col mouse: piazzamento, selezione, gizmo, scorciatoie, ispettore, undo/redo (`test/scripts/editor_actions.js` copre il grosso via codice);
  2. ciclo Prova → partita → Esci → di nuovo nell'editor (`editor_playtest.js`, `editor_check_play.js`, `editor_leave.js`, `editor_close.js`), trigger (trampolini, teletrasporti, zone letali), bot e navigazione sulle mappe custom;
  3. resa visiva delle nuove superfici GLSL (`test/swatch_main.js` va esteso a `EDIT_MATS`);
  4. pubblicazione e caricamento dal db con più utenti, poi aggiornare la build pubblicata dichiarando `db`;
  5. prestazioni su mappe grandi e layout stretto (sotto 760 px il pannello destro è nascosto).

## Lezioni imparate

- Prestazioni (analisi del 18/10/2026, `test/profile.py`): misurare con la GPU giusta. Il portatile dell'utente ha Intel Arc integrata + NVIDIA RTX 500: Chromium usa l'Intel salvo `__NV_PRIME_RENDER_OFFLOAD=1 __GLX_VENDOR_LIBRARY_NAME=nvidia __EGL_VENDOR_LIBRARY_FILENAMES=/usr/share/glvnd/egl_vendor.d/10_nvidia.json`. Sull'Intel è il GPU a limitare (Medio ok, Alto al limite); sulla NVIDIA Ultra 1080p sta a 60 fps con ~8 ms di GPU e ~10 ms di CPU (render). Un container Docker di scraping sulla macchina (gmaps) carica la CPU e rende rumorose le misure.
- Il warmup deve compilare per il bersaglio del composer (lineare, senza tone mapping), non per il canvas; le ombre si disegnano una volta per fotogramma (`shadowMap.autoUpdate = false` + `needsUpdate` in `R.render`), gli scheletri si aggiornano una volta per fotogramma (patch di `Skeleton.update`), il viewmodel usa copie proprie dei materiali (un materiale condiviso tra scena e viewmodel ricalcola il programma a ogni draw), il BRDF salta le luci che non contribuiscono.
- `test/profile.py` riporta tempo GPU (timer query), programmi compilati durante il campione (`progNew` con il diff della chiave), fotogrammi lenti con update/render; `--bench`, `--gfx`, `--callers`, `--shot`. `#...&menu=N` resta N secondi nel menu prima di partire (come un giocatore vero). `test/shot.py` fa screenshot a piena qualità con JS e viste.

- SwiftShader è lentissimo nella scena di gioco (anche oltre 1 s per frame): per i test usare `lowres`, `noshadow`, `norender`.
- Le schede in background vengono rallentate: `run.py` passa i flag anti-throttling e la build `fast` usa `timerLoop`.
- I caratteri U+2028/U+2029 letterali dentro una regex rompono lo script: `stripCtl` filtra per code point.
- `clone()` di un Object3D non copia in profondità i `Vector3` in `userData` (vedi `TPGuns.cloneOf`).
- Il numero di luci puntiformi forza la ricompilazione degli shader: tenerle poche (limite 12 nelle mappe custom).
- Quando si cambia host va migrata anche la configurazione della stanza (`g.cfg`).

## Convenzioni

- JavaScript moderno senza dipendenze, 2 spazi, punto e virgola, apici singoli. Oggetti singleton (`Game`, `HUD`, `R`, `Net`, `Editor`…) con metodi; classi per entità (`Ent`, `Bot`, `Mover`, `Avatar`).
- DOM con `$`, `$$`, `el(tag, classe, testo)`; i testi che vengono da altri utenti vanno sempre in `textContent`.
- Testi rivolti al giocatore in italiano; commenti nel codice in inglese.
- Dopo ogni modifica: `python3 test/check.py`, poi una prova nel browser o con `test/run.py` sulla parte toccata.
