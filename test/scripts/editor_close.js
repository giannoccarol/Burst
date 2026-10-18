(() => { const { Game: G, Editor: E } = window.RAFFICA; E.close(true); return { state: G.state, map: G.mapId, menu: !document.querySelector('#menu').hidden, ed: E.active }; })()
