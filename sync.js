'use strict';
/* Sincronització entre dispositius amb Supabase.
   Usa de app.js: state, ui, KEY, PROVES, save, render, toast, $ */

const Sync = (() => {
  const cfg = window.PODCASTS_CONFIG || {};
  const disponible = !!(cfg.supabaseUrl && cfg.supabaseKey && window.supabase);
  const ENTORN = PROVES ? 'proves' : 'definitiva';
  const MKEY = KEY + '-sync';
  const COLS = ['programes', 'persones', 'gravacions'];

  let sb = null, sessio = null, membre = null, canal = null;
  let estat = disponible ? 'sense-sessio' : 'off', detall = '';
  let ocupat = false, repetir = false, temps = null, aplicant = false;
  let meta = llegeix();

  /* ---------- Memòria local de què s'ha sincronitzat ---------- */
  function llegeix() {
    try { const m = JSON.parse(localStorage.getItem(MKEY)); if (m && m.snap) return m; } catch (e) { /* res */ }
    return { snap: {}, ultima: null, email: null };
  }
  function desa() { try { localStorage.setItem(MKEY, JSON.stringify(meta)); } catch (e) { /* res */ } }

  // JSON amb les claus ordenades, per comparar registres de manera fiable
  const estable = (v) => Array.isArray(v) ? '[' + v.map(estable).join(',') + ']'
    : v && typeof v === 'object'
      ? '{' + Object.keys(v).sort().filter((k) => v[k] !== undefined).map((k) => JSON.stringify(k) + ':' + estable(v[k])).join(',') + '}'
      : JSON.stringify(v ?? null);

  function mapa() {
    const m = {};
    COLS.forEach((c) => state[c].forEach((r) => { m[c + ':' + r.id] = estable(r); }));
    m['config:estudis'] = estable({ llista: state.estudis });
    return m;
  }
  function pendents() {
    const ara = mapa(), out = [];
    for (const k in ara) if (meta.snap[k] !== ara[k]) out.push({ k, v: ara[k], esborrat: false });
    for (const k in meta.snap) if (!(k in ara)) out.push({ k, v: meta.snap[k], esborrat: true });
    return out;
  }
  const parteix = (k) => { const i = k.indexOf(':'); return [k.slice(0, i), k.slice(i + 1)]; };

  /* ---------- Pujar canvis locals ---------- */
  async function puja() {
    const p = pendents();
    if (!p.length) return;
    const files = p.map(({ k, v, esborrat }) => {
      const [coleccio, id] = parteix(k);
      return { entorn: ENTORN, coleccio, id, dades: JSON.parse(v), esborrat };
    });
    for (let i = 0; i < files.length; i += 500) {
      const { error } = await sb.from('registres').upsert(files.slice(i, i + 500), { onConflict: 'entorn,coleccio,id' });
      if (error) throw error;
    }
    p.forEach(({ k, v, esborrat }) => { if (esborrat) delete meta.snap[k]; else meta.snap[k] = v; });
    desa();
  }

  /* ---------- Baixar canvis d'altres dispositius ---------- */
  function posa(col, id, dades) {
    if (col === 'config') {
      if (id !== 'estudis') return false;
      const nou = Array.isArray(dades.llista) ? dades.llista : [];
      if (estable(nou) === estable(state.estudis)) return false;
      state.estudis = nou; return true;
    }
    if (!COLS.includes(col)) return false;
    const r = state[col].find((x) => x.id === id);
    if (r) {
      if (estable(r) === estable(dades)) return false;
      Object.keys(r).forEach((k) => delete r[k]);   // es manté el mateix objecte (per si està obert en un formulari)
      Object.assign(r, dades);
    } else {
      state[col].push(col === 'gravacions' ? { presentadors: [], durada: 60, estat: 'pendent', ...dades } : dades);
    }
    return true;
  }
  function treu(col, id) {
    if (!COLS.includes(col)) return false;
    const n = state[col].length;
    state[col] = state[col].filter((x) => x.id !== id);
    return state[col].length !== n;
  }

  // Primera connexió d'aquest dispositiu: ajunta programes i persones amb el mateix nom
  function fusionaPrimer(files) {
    const remots = files.filter((f) => !f.esborrat);
    const remap = {};
    ['programes', 'persones'].forEach((c) => {
      const perNom = new Map(remots.filter((f) => f.coleccio === c && f.dades?.nom).map((f) => [f.dades.nom.trim().toLowerCase(), f.id]));
      state[c] = state[c].filter((r) => {
        const rid = perNom.get((r.nom || '').trim().toLowerCase());
        if (rid && rid !== r.id) { remap[r.id] = rid; return false; }
        return true;
      });
    });
    if (Object.keys(remap).length) {
      state.gravacions.forEach((g) => {
        if (remap[g.programaId]) g.programaId = remap[g.programaId];
        g.presentadors = (g.presentadors || []).map((id) => remap[id] || id);
        if (remap[g.tecnic]) g.tecnic = remap[g.tecnic];
      });
    }
    const est = remots.find((f) => f.coleccio === 'config' && f.id === 'estudis');
    if (est) state.estudis = [...new Set([...(est.dades.llista || []), ...state.estudis])];
  }

  async function baixa() {
    const primer = !meta.ultima;
    const desde = primer ? null : new Date(new Date(meta.ultima).getTime() - 10000).toISOString();
    const files = [];
    for (let des = 0; ; des += 1000) {
      let q = sb.from('registres').select('coleccio,id,dades,esborrat,actualitzat')
        .eq('entorn', ENTORN).order('actualitzat').range(des, des + 999);
      if (desde) q = q.gte('actualitzat', desde);
      const { data, error } = await q;
      if (error) throw error;
      files.push(...data);
      if (data.length < 1000) break;
    }
    if (!files.length) return;

    if (primer) fusionaPrimer(files);
    const ara = mapa();
    let canvi = primer;
    for (const f of files) {
      const k = f.coleccio + ':' + f.id;
      const pendentLocal = primer ? k === 'config:estudis' : (k in ara ? ara[k] !== meta.snap[k] : k in meta.snap);
      if (!pendentLocal) {
        if (f.esborrat) { if (treu(f.coleccio, f.id)) canvi = true; delete meta.snap[k]; }
        else { if (posa(f.coleccio, f.id, f.dades)) canvi = true; meta.snap[k] = estable(f.dades); }
      }
      if (!meta.ultima || f.actualitzat > meta.ultima) meta.ultima = f.actualitzat;
    }
    desa();
    if (canvi) {
      aplicant = true;
      save();
      aplicant = false;
      if (!document.querySelector('#dlg')?.open || ui.view !== 'agenda') render();
    }
  }

  /* ---------- Cicle de sincronització ---------- */
  async function sincronitza() {
    if (!sb || !sessio || membre !== true) return;
    if (ocupat) { repetir = true; return; }
    ocupat = true;
    posaEstat('sync');
    try {
      if (meta.email && meta.email !== sessio.user.email) meta = { snap: {}, ultima: null, email: null };
      meta.email = sessio.user.email;
      if (!meta.ultima) { await baixa(); await puja(); await baixa(); }
      else { await puja(); await baixa(); }
      posaEstat('ok');
    } catch (e) {
      console.warn('Sincronització:', e);
      posaEstat(navigator.onLine ? 'error' : 'offline', e.message || String(e));
    }
    ocupat = false;
    if (repetir) { repetir = false; programa(0); }
  }
  function programa(ms = 700) {
    clearTimeout(temps);
    temps = setTimeout(sincronitza, ms);
  }

  async function comprovaMembre() {
    const { data, error } = await sb.from('membres').select('email').limit(1);
    if (error) { membre = null; posaEstat(navigator.onLine ? 'error' : 'offline', error.message); return; }
    membre = data.length > 0;
    if (!membre) { posaEstat('nomembre'); return; }
    obreCanal();
    programa(0);
  }
  function obreCanal() {
    if (canal) return;
    canal = sb.channel('registres-' + ENTORN)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'registres', filter: `entorn=eq.${ENTORN}` }, () => programa(400))
      .subscribe();
  }
  function tancaCanal() { if (canal) { sb.removeChannel(canal); canal = null; } }

  /* ---------- Estat visible ---------- */
  const TEXTOS = {
    'sense-sessio': 'Entra per sincronitzar', sync: 'Sincronitzant…', ok: 'Sincronitzat',
    offline: 'Sense connexió', error: 'Error de sincronització', nomembre: 'Sense accés',
  };
  function posaEstat(e, d = '') {
    estat = e; detall = d;
    const b = $('#syncBtn');
    if (!b) return;
    b.hidden = e === 'off';
    b.dataset.estat = e;
    b.querySelector('span').textContent = TEXTOS[e] || '';
    b.title = d || TEXTOS[e] || '';
    if (ui.view === 'config' && !document.querySelector('#formSync input:focus')) {
      const s = $('#seccioSync');
      if (s) { s.outerHTML = html(); bind(); }
    }
  }

  const traduccio = (m = '') => {
    if (/invalid login/i.test(m)) return 'Correu o contrasenya incorrectes.';
    if (/not confirmed/i.test(m)) return 'Encara has de confirmar el correu: mira la safata d\'entrada.';
    if (/already registered/i.test(m)) return 'Aquest correu ja té compte. Fes servir «Entra».';
    if (/at least 6/i.test(m) || /password should/i.test(m)) return 'La contrasenya ha de tenir com a mínim 6 caràcters.';
    if (/fetch|network/i.test(m)) return 'No hi ha connexió amb el servidor.';
    return m;
  };
  const hora = (iso) => { if (!iso) return '—'; const d = new Date(iso); return d.toLocaleString('ca', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' }); };

  /* ---------- Secció d'Ajustos ---------- */
  function html() {
    if (!disponible) {
      return `<div class="section" id="seccioSync"><h2>Sincronització</h2>
        <p class="help">Encara no està configurada. De moment, les dades es guarden només en aquest dispositiu.</p></div>`;
    }
    if (!sessio) {
      return `<div class="section" id="seccioSync"><h2>Sincronització</h2>
        <p class="help">Entra amb el teu correu per tenir les mateixes dades al iPhone i a l'ordinador.</p>
        <form id="formSync" class="sync-form">
          <input type="email" name="email" placeholder="correu@exemple.com" autocomplete="username" required>
          <input type="password" name="pass" placeholder="Contrasenya (mínim 6 caràcters)" autocomplete="current-password" required minlength="6">
          <div class="grp">
            <button class="btn primary" value="entra">Entra</button>
            <button class="btn" value="registra">Crea el compte</button>
          </div>
          <p class="hint">La primera vegada, fes «Crea el compte». Només poden entrar els correus autoritzats.</p>
        </form></div>`;
    }
    const pend = pendents().length;
    return `<div class="section" id="seccioSync"><h2>Sincronització</h2>
      ${membre === false
        ? `<p class="warn">El correu <b>${esc(sessio.user.email)}</b> no té accés a les dades. Demana que l'afegeixin a la llista de membres.</p>`
        : `<p class="help">Connectat com <b>${esc(sessio.user.email)}</b>${PROVES ? ' · <span class="proves">PROVES</span>' : ''}<br>
           Estat: <b>${TEXTOS[estat] || '—'}</b> · Darrera actualització: ${hora(meta.ultima)}${pend ? ` · ${pend} canvis per pujar` : ''}
           ${estat === 'error' && detall ? `<br><span class="hint">${esc(traduccio(detall))}</span>` : ''}</p>`}
      <div class="grp">
        ${membre ? '<button class="btn" id="btnSyncAra">Sincronitza ara</button>' : ''}
        <button class="btn" id="btnSurt">Surt</button>
      </div></div>`;
  }

  function bind() {
    const f = $('#formSync');
    if (f) {
      f.addEventListener('submit', async (e) => {
        e.preventDefault();
        const accio = e.submitter?.value || 'entra';
        const d = new FormData(f);
        const email = String(d.get('email')).trim(), pass = String(d.get('pass'));
        if (!email || pass.length < 6) { toast('Escriu el correu i una contrasenya de 6 caràcters o més.'); return; }
        f.querySelectorAll('button').forEach((b) => { b.disabled = true; });
        try {
          if (accio === 'registra') {
            const { data, error } = await sb.auth.signUp({ email, password: pass, options: { emailRedirectTo: location.origin + location.pathname } });
            if (error) throw error;
            if (!data.session) toast('Compte creat. Confirma el correu i després fes «Entra».');
          } else {
            const { error } = await sb.auth.signInWithPassword({ email, password: pass });
            if (error) throw error;
          }
        } catch (err) {
          toast(traduccio(err.message));
        }
        f.querySelectorAll('button').forEach((b) => { b.disabled = false; });
      });
    }
    $('#btnSyncAra')?.addEventListener('click', () => programa(0));
    $('#btnSurt')?.addEventListener('click', async () => {
      if (pendents().length && !confirm('Hi ha canvis que encara no s\'han pujat. Vols sortir igualment? Es quedaran en aquest dispositiu.')) return;
      await sb.auth.signOut();
    });
  }

  /* ---------- Arrencada ---------- */
  function inicia() {
    const b = $('#syncBtn');
    if (b) b.addEventListener('click', () => { ui.view = 'config'; render(); window.scrollTo(0, 0); });
    if (!disponible) { posaEstat('off'); return; }
    sb = window.supabase.createClient(cfg.supabaseUrl, cfg.supabaseKey, {
      auth: { persistSession: true, autoRefreshToken: true, storageKey: 'podcasts-auth' },
    });
    sb.auth.onAuthStateChange((ev, s) => {
      sessio = s;
      setTimeout(() => {
        if (s) {
          if (membre === null || ev === 'SIGNED_IN') comprovaMembre();
        } else {
          membre = null; tancaCanal(); posaEstat('sense-sessio');
        }
        if (ui.view === 'config') render();
      }, 0);
    });
    addEventListener('online', () => programa(0));
    addEventListener('offline', () => posaEstat('offline'));
    document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'visible') programa(0); });
    setInterval(() => programa(0), 60000);
    posaEstat('sense-sessio');
  }

  return {
    canvi() { if (!aplicant && sessio && membre) { posaEstat('sync'); programa(); } },
    html, bind, inicia,
  };
})();

Sync.inicia();
