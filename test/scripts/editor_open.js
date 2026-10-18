(() => { const { Editor, Game, HUD } = window.RAFFICA; HUD.tab('editor'); return { active: Editor.active, objs: Editor.objs.length, state: Game.state, q: Editor.thumbQ && Editor.thumbQ.length }; })()
