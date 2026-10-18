(() => { const { Game: G, Editor: E } = window.RAFFICA; G.leave(); return { state: G.state, edActive: E.active, objs: E.objs.length, testing: E.testing }; })()
