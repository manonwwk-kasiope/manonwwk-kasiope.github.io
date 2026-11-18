(function (root) {
  'use strict';
  const bits = {1976: 2, 1985: 4, 1995: 8, 2185: 16, 2985: 32};

  function query(win){
    const pointer=win.matchMedia('(any-pointer:coarse)');
    const media=win.matchMedia('(orientation:portrait)');
    const portrait=()=>pointer.matches && (win.innerWidth&&win.innerHeight?win.innerHeight>win.innerWidth:media.matches);
    let last=portrait();
    const events=new win.EventTarget();
    function refresh(){
      const next=portrait();if(next===last)return;
      last=next;events.dispatchEvent(new win.Event('change'));
    }
    win.addEventListener('resize',refresh);
    win.addEventListener('orientationchange',refresh);
    win.visualViewport?.addEventListener('resize',refresh);
    pointer.addEventListener('change',refresh);media.addEventListener('change',refresh);
    return {get matches(){return portrait();},addEventListener:(...args)=>events.addEventListener(...args),
      removeEventListener:(...args)=>events.removeEventListener(...args)};
  }
  function mount(dialog, {query, year, screen, pause, primary, calm = () => false}) {
    const doc = dialog.ownerDocument;
    const date = dialog.querySelector('#vertical-date');
    let saved = null;

    function refresh() {
      if (query.matches) {
        const current = year();
        dialog.dataset.year = current;
        date.textContent = bits[current] ? current + ' · ' + bits[current] + ' bits' : '';
        dialog.toggleAttribute('data-calm', calm());
        if (dialog.open) return;
        const field = doc.activeElement;
        const playing = screen() === 'play';
        if (playing) pause();
        const target = playing || field === doc.body ? primary() : field;
        const selection = target && typeof target.selectionStart === 'number'
          ? [target.selectionStart, target.selectionEnd, target.selectionDirection] : null;
        saved = {target, selection};
        dialog.showModal();
        return;
      }
      if (!dialog.open) return;
      dialog.close();
      const {target, selection} = saved || {};
      saved = null;
      const destination = target?.isConnected && !target.closest('[hidden],[inert],dialog:not([open])') && !target.disabled
        ? target : primary();
      destination?.focus({preventScroll: true});
      if (destination === target && selection) target.setSelectionRange(...selection);
    }
    function cancel(event) {event.preventDefault();}
    function stopKey(event) {event.stopPropagation();}
    dialog.addEventListener('cancel', cancel);
    dialog.addEventListener('keydown', stopKey);
    query.addEventListener('change', refresh);
    refresh();
    dialog.dataset.ready = '';
    return {refresh};
  }
  root.SnakeOrientation = Object.freeze({mount,query});
  if (typeof module === 'object' && module.exports) module.exports = root.SnakeOrientation;
})(globalThis);
