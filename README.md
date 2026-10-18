# Raffica

FPS multiplayer nel browser, stile Krunker ma con grafica realistica, da giocare tra colleghi come artifact di claude.ai. Una mappa (il Borgo), 9 classi, 6 modalità, bot, livelli e sfide giornaliere. In lavorazione: editor e creatore di mappe.

## Provarlo in locale

```bash
python3 build.py test/game.html --standalone --inject test/mock_claude.js,test/autostart.js
python3 -m http.server 8765 --bind 127.0.0.1
```

Poi apri http://127.0.0.1:8765/test/game.html (menu) oppure http://127.0.0.1:8765/test/game.html#offline&bots=5&mode=0 (partita subito contro i bot). Serve la connessione a internet: three.js arriva da cdn.jsdelivr.net.

## Pubblicare

```bash
python3 build.py dist/raffica.html
```

e pubblica `dist/raffica.html` come artifact sullo stesso URL. Dettagli tecnici, architettura e stato dei lavori sono in [CLAUDE.md](CLAUDE.md).
