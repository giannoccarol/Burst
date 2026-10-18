(() => {
  const { HUD, Game } = window.RAFFICA;
  HUD.killNotice('Gino', true, 3, 125);
  HUD.feed('Tester', '#d8463c', 'Carabina R4', 'Gino', '#3d8ad8', true, false);
  HUD.feed('Pino', '#3d8ad8', 'Lupara', 'Mimmo', '#d8463c', false, false);
  HUD.hitmarker(true, false);
  HUD.chatMessage('Pino', '#3d8ad8', 'dai che li prendiamo alla fontana');
  return { alive: Game.me.alive, hp: Game.me.hp, st: Game.state };
})()
