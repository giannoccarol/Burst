(() => { const { Editor: E } = window.RAFFICA; document.querySelector('#ed-tmode').value = '3'; E.playTest(); return { testing: E.testing }; })()
