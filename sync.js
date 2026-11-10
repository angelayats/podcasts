'use strict';
/* Sincronització entre dispositius amb Supabase, sense usuaris ni contrasenyes.
   Cada dispositiu es vincula una sola vegada amb una clau privada (es guarda al dispositiu).
   Usa de app.js: state, ui, KEY, PROVES, save, render, toast, esc, $ */

const Sync = (() => {
  const cfg = window.PODCASTS_CONFIG || {};
  const disponible = !!(cfg.supabaseUrl && cfg.supabaseKey && window.supabase);
  const ENTORN = PROVES ? 'proves' : 'definitiva';
  const MKEY = KEY + '-sync';
  const CKEY = 'podcasts-clau';
  const COLS = ['programes', 'persones', 'gravacions'];

  let sb = null, clau = '', valida = null;
  let estat = disponible ? 'sense-clau' : 'off', detall = '';
  let ocupat = false, repetir = false, temps = null, aplicant = false;
  let meta = llegeix();

  /* ---------- Clau del dispositiu ---------- */
  function llegeixClau() {
    // Si s'obre l'enllaç privat (…#clau=XXXX), es guarda la clau i es neteja l'adreça
    const m = location.hash.match(/clau=([A-Za-z0-9]+)/);
    if (m) {
      try { localStorage.setItem(CKEY, m[1]); } catch (e) { /* res */ }
      history.replaceState(null, '', location.pathname + location.search);
    }
    try { return localStorage.getItem(CKEY) || ''; } catch (e) { return ''; }
  }
  function client() {
    sb = clau ? window.supabase.createClient(cfg.supabaseUrl, cfg.supabaseKey, {
      auth: { persistSession: false, autoRefreshToken: false },
      global: { headers: { 'x-clau-podcasts': clau } },
    }) : null;
  }

  /* ---------- Memòria local de què s'ha sincronitzat ---------- */
  function llegeix() {
    try { const m = JSON.parse(localStorage.getItem(MKEY)); if (m && m.snap) return m; } catch (e) { /* res */ }
    return { snap: {}, ultima: null };
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
    m['config:estudis'] = estable({ llista: state.estudis, ubicacions: state.ubicacions || {} });
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
      const ub = dades.ubicacions && typeof dades.ubicacions === 'object' ? dades.ubicacions : {};
      if (estable(nou) === estable(state.estudis) && estable(ub) === estable(state.ubicacions || {})) return false;
      state.estudis = nou; state.ubicacions = ub; return true;
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

  // Primera sincronització d'aquest dispositiu: ajunta programes i persones amb el mateix nom
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
    if (est) {
      state.estudis = [...new Set([...(est.dades.llista || []), ...state.estudis])];
      state.ubicacions = { ...(state.ubicacions || {}), ...(est.dades.ubicacions || {}) };
    }
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
      render();
    }
  }

  /* ---------- Cicle de sincronització ---------- */
  async function comprovaClau() {
    const { data, error } = await sb.rpc('te_clau');
    if (error) throw error;
    return data === true;
  }

  async function sincronitza() {
    if (!sb) return;
    if (ocupat) { repetir = true; return; }
    ocupat = true;
    posaEstat('sync');
    try {
      if (valida !== true) {
        valida = await comprovaClau();
        if (!valida) { posaEstat('clau-dolenta'); ocupat = false; return; }
      }
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

  function vincula(nova) {
    clau = nova.trim();
    valida = null;
    try { localStorage.setItem(CKEY, clau); } catch (e) { /* res */ }
    client();
    programa(0);
  }
  function desvincula() {
    clau = ''; valida = null; sb = null;
    try { localStorage.removeItem(CKEY); } catch (e) { /* res */ }
    posaEstat('sense-clau');
  }

  /* ---------- Estat visible ---------- */
  const TEXTOS = {
    'sense-clau': 'Vincula aquest dispositiu', sync: 'Sincronitzant…', ok: 'Sincronitzat',
    offline: 'Sense connexió', error: 'Error de sincronització', 'clau-dolenta': 'Clau incorrecta',
  };
  function posaEstat(e, d = '') {
    estat = e; detall = d;
    const b = $('#syncBtn');
    if (b) {
      b.hidden = e === 'off';
      b.dataset.estat = e;
      b.querySelector('span').textContent = TEXTOS[e] || '';
      b.title = d || TEXTOS[e] || '';
    }
    if (ui.view === 'config' && !document.querySelector('#formClau input:focus')) {
      const s = $('#seccioSync');
      if (s) { s.outerHTML = html(); bind(); }
    }
  }
  const hora = (iso) => { if (!iso) return '—'; const d = new Date(iso); return d.toLocaleString('ca', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' }); };

  /* ---------- Secció d'Ajustos ---------- */
  function html() {
    if (!disponible) {
      return `<div class="section" id="seccioSync"><h2>Sincronització</h2>
        <p class="help">Encara no està configurada. De moment, les dades es guarden només en aquest dispositiu.</p></div>`;
    }
    if (!clau || estat === 'clau-dolenta') {
      return `<div class="section" id="seccioSync"><h2>Sincronització</h2>
        ${estat === 'clau-dolenta' ? '<p class="warn">Aquesta clau no és correcta. Revisa-la i torna-la a enganxar.</p>' : ''}
        <p class="help">Vincula aquest dispositiu <b>una sola vegada</b> per tenir la mateixa agenda al iPhone i a l'ordinador. Enganxa aquí la teva clau privada:</p>
        <form id="formClau" class="sync-form">
          <input name="clau" placeholder="Clau privada" autocomplete="off" autocapitalize="off" spellcheck="false" required>
          <div class="grp"><button class="btn primary">Vincula</button></div>
        </form></div>`;
    }
    const pend = pendents().length;
    return `<div class="section" id="seccioSync"><h2>Sincronització</h2>
      <p class="help">Aquest dispositiu està <b>vinculat</b>${PROVES ? ' · <span class="proves">PROVES</span>' : ''}.<br>
        Estat: <b>${TEXTOS[estat] || '—'}</b> · Darrera actualització: ${hora(meta.ultima)}${pend ? ` · ${pend} canvis per pujar` : ''}
        ${estat === 'error' && detall ? `<br><span class="hint">${esc(detall)}</span>` : ''}</p>
      <div class="grp">
        <button class="btn" id="btnSyncAra">Sincronitza ara</button>
        <button class="btn" id="btnDesvincula">Desvincula aquest dispositiu</button>
      </div></div>`;
  }

  function bind() {
    $('#formClau')?.addEventListener('submit', (e) => {
      e.preventDefault();
      const v = String(new FormData(e.target).get('clau') || '').trim();
      if (!/^[A-Za-z0-9]{16,}$/.test(v)) { toast('La clau no té el format correcte.'); return; }
      vincula(v);
    });
    $('#btnSyncAra')?.addEventListener('click', () => programa(0));
    $('#btnDesvincula')?.addEventListener('click', () => {
      if (!confirm('Desvincular aquest dispositiu? Les dades es quedaran aquí, però deixaran de sincronitzar-se fins que el tornis a vincular.')) return;
      desvincula();
    });
  }

  /* ---------- Arrencada ---------- */
  function inicia() {
    const b = $('#syncBtn');
    if (b) b.addEventListener('click', () => { ui.view = 'config'; render(); window.scrollTo(0, 0); });
    if (!disponible) { posaEstat('off'); return; }
    clau = llegeixClau();
    client();
    addEventListener('online', () => programa(0));
    addEventListener('offline', () => posaEstat('offline'));
    addEventListener('focus', () => programa(0));
    document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'visible') programa(0); });
    // Comprova canvis d'altres dispositius cada 20 segons mentre l'app és oberta
    setInterval(() => { if (document.visibilityState === 'visible') programa(0); }, 20000);
    if (clau) programa(0); else posaEstat('sense-clau');
  }

  // Enllaç per subscriure's al calendari des del iPhone (inclou la clau privada)
  function enllacCalendari() {
    if (!disponible || !clau || valida === false) return '';
    const host = new URL(cfg.supabaseUrl).host;
    return `webcal://${host}/functions/v1/calendari?clau=${encodeURIComponent(clau)}${PROVES ? '&entorn=proves' : ''}`;
  }

  return {
    enllacCalendari,
    canvi() { if (!aplicant && sb && valida !== false) { posaEstat('sync'); programa(); } },
    html, bind, inicia,
  };
})();

Sync.inicia();
