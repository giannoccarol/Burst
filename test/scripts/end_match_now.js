(() => { const G = window.RAFFICA.Game; if (G.g) G.g.r = 0.5; return { m: G.g && G.g.m, host: G.isHost() }; })()
