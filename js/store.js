'use strict';
// Where the game keeps your place. Three modes:
//   tab      (the default) kept in this tab only: a reload continues, closing the tab forgets
//   browser  (opt-in) kept in this browser too, so you can close it and come back
//   test     nothing is read or written: any dev link (?dev, ?scene=, ?skip=, ...) or the dev panel
// The game saves at the start of each day. Nothing ever leaves the computer.
STORE = (() => {
  const KEY = 'ten-years-save', PREF = 'ten-years-keep';
  const TEST_PARAMS = ['dev', 'test', 'scene', 'skip', 'seed', 'state', 'still', 'bot', 'frame'];
  const q = new URLSearchParams(location.search);
  let test = TEST_PARAMS.some(k => q.has(k));
  const local = f => { try { return f(window.localStorage); } catch (e) { return null; } };
  const session = f => { try { return f(window.sessionStorage); } catch (e) { return null; } };
  const parse = t => { try { const s = JSON.parse(t || 'null'); return s && s.v === 2 && !s.ended ? s : null; } catch (e) { return null; } };

  // A save written before this choice existed means the player was already keeping one: keep keeping it.
  if (!test && local(l => l.getItem(PREF)) === null && parse(local(l => l.getItem(KEY)))) local(l => l.setItem(PREF, 'browser'));

  const store = {
    // 'tab', 'browser', 'test', or null when the player has not been asked yet (behaves as 'tab')
    mode() {
      if (test) return 'test';
      const m = local(l => l.getItem(PREF));
      return m === 'browser' || m === 'tab' ? m : null;
    },
    setMode(m) {
      if (test || (m !== 'browser' && m !== 'tab')) return;
      local(l => l.setItem(PREF, m));
      if (m === 'browser') { const t = session(s => s.getItem(KEY)); if (t) local(l => l.setItem(KEY, t)); }
      else {
        // switching off takes the copy out of the browser at once, but this tab keeps it
        const t = local(l => l.getItem(KEY));
        if (t && !session(s => s.getItem(KEY))) session(s => s.setItem(KEY, t));
        local(l => l.removeItem(KEY));
      }
    },
    load() {
      if (test) return null;
      return parse(session(s => s.getItem(KEY))) || (store.mode() === 'browser' ? parse(local(l => l.getItem(KEY))) : null);
    },
    save(state) {
      if (test) return;
      const t = JSON.stringify(state);
      session(s => s.setItem(KEY, t));
      if (store.mode() === 'browser') local(l => l.setItem(KEY, t));
    },
    clear() {
      if (test) return;
      session(s => s.removeItem(KEY));
      local(l => l.removeItem(KEY));
    },
    testMode() { test = true; },
  };
  return store;
})();
