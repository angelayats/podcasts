'use strict';

/* ---------- Identitat de l'app (canvia el nom aquí) ---------- */
const APP = { nom: "PODCAST's", sub: 'Calendari de gravacions' };

/* ---------- Entorn: versió de proves o definitiva ---------- */
// La versió de proves (adreça amb «proves») guarda les dades a part, per no tocar mai les reals.
const PROVES = /proves/i.test(location.pathname);

/* ---------- Constants i utilitats ---------- */
const KEY = 'calendari-gravacions-v1' + (PROVES ? '-proves' : '');
const ESTATS = [
  ['pendent', 'Pendent'], ['confirmat', 'Confirmat'], ['gravat', 'Gravat'],
  ['editat', 'Editat'], ['publicat', 'Publicat'], ['cancellat', 'Cancel·lat'],
];
const MESOS = ['gener', 'febrer', 'març', 'abril', 'maig', 'juny', 'juliol', 'agost', 'setembre', 'octubre', 'novembre', 'desembre'];
const DIES = ['Dl', 'Dt', 'Dc', 'Dj', 'Dv', 'Ds', 'Dg'];
const DIES_LLARGS = ['dilluns', 'dimarts', 'dimecres', 'dijous', 'divendres', 'dissabte', 'diumenge'];
const COLORS = ['#3D4B6B', '#B08D57', '#0CA678', '#D6336C', '#7048E8', '#1098AD', '#E8590C', '#5C7CFA'];

const $ = (s) => document.querySelector(s);
const mobil = matchMedia('(max-width: 760px)');
const uid = () => Math.random().toString(36).slice(2, 9) + Date.now().toString(36).slice(-4);
const pad = (n) => String(n).padStart(2, '0');
const ymd = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
const parseYmd = (s) => { const [y, m, d] = s.split('-').map(Number); return new Date(y, m - 1, d); };
const addDays = (d, n) => new Date(d.getFullYear(), d.getMonth(), d.getDate() + n);
const mondayOf = (d) => addDays(d, -((d.getDay() + 6) % 7));
const toMin = (h) => { const [a, b] = (h || '00:00').split(':').map(Number); return a * 60 + (b || 0); };
const fromMin = (m) => `${pad(Math.floor(m / 60) % 24)}:${pad(m % 60)}`;
const cap = (s) => s.charAt(0).toUpperCase() + s.slice(1);
const estatNom = (id) => (ESTATS.find((e) => e[0] === id) || [id, id])[1];
const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const dataCurta = (ds) => { const d = parseYmd(ds); return `${DIES[(d.getDay() + 6) % 7]} ${d.getDate()} ${MESOS[d.getMonth()].slice(0, 3)}. ${d.getFullYear()}`; };
const dataLlarga = (ds) => { const d = parseYmd(ds); return `${DIES_LLARGS[(d.getDay() + 6) % 7]} ${d.getDate()} de ${MESOS[d.getMonth()]}`; };
const inicials = (nom) => nom.split(/\s+/).filter(Boolean).slice(0, 2).map((p) => p[0].toUpperCase()).join('');

/* ---------- Dades ---------- */
function seed() {
  // Identificadors fixos: així els dispositius nous no dupliquen els podcasts en sincronitzar
  const angel = 'pe-angel', david = 'pe-david';
  return {
    programes: [
      { id: 'p-lluna', nom: 'La cara oculta de la lluna', tipus: 'podcast', color: '#3D4B6B', imatge: 'img/la-cara-oculta-de-la-lluna.jpg' },
      { id: 'p-blanc-negre', nom: 'Blanc & Negre', tipus: 'podcast', color: '#B08D57', imatge: 'img/blanc-i-negre.jpg' },
    ],
    persones: [
      { id: angel, nom: 'Angel Ayats', rol: 'Producció i realització' },
      { id: david, nom: 'David Izquierdo', rol: 'Presentació' },
    ],
    estudis: ['Estudi 1'],
    gravacions: [],
  };
}
function normalize(d) {
  const arr = (x) => (Array.isArray(x) ? x : []);
  return {
    programes: arr(d.programes), persones: arr(d.persones),
    estudis: arr(d.estudis).filter((s) => typeof s === 'string'),
    gravacions: arr(d.gravacions).map((g) => ({ presentadors: [], durada: 60, estat: 'pendent', ...g })),
  };
}
function load() {
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) {
      const d = normalize(JSON.parse(raw));
      // Les dades d'exemple de la primera versió se substitueixen pels podcasts reals
      if (d.programes.length && d.programes.every((p) => p.nom.includes('(exemple)'))) return seed();
      return d;
    }
  } catch (e) { /* dades corruptes o inaccessibles */ }
  return seed();
}
function save() {
  try { localStorage.setItem(KEY, JSON.stringify(state)); }
  catch (e) { toast("No s'han pogut desar les dades. Exporta-les des d'Ajustos."); }
  if (typeof Sync !== 'undefined') Sync.canvi();
}

let state = load();
save();

const ui = {
  view: 'calendari', mode: 'mes', cursor: new Date(), diaSel: ymd(new Date()),
  filtrePrograma: '', filtreEstat: '', cerca: '', nomesProperes: true,
};

const prog = (id) => state.programes.find((p) => p.id === id);
const pers = (id) => state.persones.find((p) => p.id === id);
const color = (g) => prog(g.programaId)?.color || '#868E96';
const progNom = (g) => prog(g.programaId)?.nom || 'Sense programa';
const visibles = () => state.gravacions.filter((g) => !ui.filtrePrograma || g.programaId === ui.filtrePrograma);
const delDia = (ds) => visibles().filter((g) => g.data === ds).sort((a, b) => toMin(a.hora) - toMin(b.hora));
const ordena = (a, b) => (a.data + a.hora).localeCompare(b.data + b.hora);
const horari = (g) => `${g.hora}–${fromMin(toMin(g.hora) + Number(g.durada || 0))}`;
const equip = (g) => [...(g.presentadors || []).map(pers), pers(g.tecnic)].filter(Boolean).map((p) => p.nom);
const coverProg = (p, cls = 'cover') => p?.imatge
  ? `<img class="${cls}" src="${esc(p.imatge)}" alt="" loading="lazy">`
  : `<span class="${cls}" style="--c:${p?.color || '#868E96'}"></span>`;

function progOptions(sel, buit) {
  return `<option value="">${esc(buit)}</option>` + state.programes
    .map((p) => `<option value="${p.id}" ${p.id === sel ? 'selected' : ''}>${esc(p.nom)}</option>`).join('');
}
function estatOptions(sel, buit) {
  return (buit ? `<option value="">${esc(buit)}</option>` : '') + ESTATS
    .map(([id, nom]) => `<option value="${id}" ${id === sel ? 'selected' : ''}>${nom}</option>`).join('');
}

/* ---------- Render general ---------- */
function render() {
  document.querySelectorAll('#tabs button').forEach((b) => b.classList.toggle('active', b.dataset.view === ui.view));
  const views = { calendari: renderCal, agenda: renderAgenda, programes: renderProgrames, persones: renderPersones, config: renderConfig };
  views[ui.view]($('#main'));
}

/* ---------- Calendari ---------- */
function chip(g) {
  return `<button class="chip ${g.estat === 'cancellat' ? 'cancel' : ''}" style="--c:${color(g)}" data-action="edita" data-id="${g.id}"
    title="${esc(`${horari(g)} · ${progNom(g)} · ${g.titol} · ${estatNom(g.estat)}`)}"><span class="t">${esc(g.hora)}</span> ${esc(g.titol)}</button>`;
}
function card(g) {
  const noms = equip(g);
  return `<button class="card ${g.estat === 'cancellat' ? 'cancel' : ''}" style="--c:${color(g)}" data-action="edita" data-id="${g.id}">
    ${coverProg(prog(g.programaId))}
    <div class="body">
      <div class="h">${horari(g)}${g.estudi ? ' · ' + esc(g.estudi) : ''}</div>
      <div class="ti">${esc(g.titol)}</div>
      <div class="pr">${esc(progNom(g))}</div>
      <div class="meta"><span class="badge ${g.estat}">${estatNom(g.estat)}</span>${noms.length ? `<span class="hint">${esc(noms.join(', '))}</span>` : ''}</div>
    </div>
  </button>`;
}

function renderCal(m) {
  const c = ui.cursor;
  const avui = ymd(new Date());
  let titol, body;

  if (ui.mode === 'mes') {
    titol = `${cap(MESOS[c.getMonth()])} ${c.getFullYear()}`;
    const first = new Date(c.getFullYear(), c.getMonth(), 1);
    const start = mondayOf(first);
    const dim = new Date(c.getFullYear(), c.getMonth() + 1, 0).getDate();
    const weeks = Math.ceil((((first.getDay() + 6) % 7) + dim) / 7);
    let cells = '';
    for (let i = 0; i < weeks * 7; i++) {
      const d = addDays(start, i), ds = ymd(d), items = delDia(ds);
      cells += `<div class="cell ${d.getMonth() !== c.getMonth() ? 'out' : ''} ${ds === avui ? 'today' : ''} ${ds === ui.diaSel ? 'sel' : ''}" data-action="dia" data-date="${ds}">
        <div class="num">${d.getDate()}</div>
        ${items.slice(0, 3).map(chip).join('')}
        ${items.length > 3 ? `<button class="more" data-action="veure-setmana" data-date="${ds}">+${items.length - 3} més</button>` : ''}
        <div class="dots">${items.slice(0, 4).map((g) => `<i style="--c:${color(g)}"></i>`).join('')}</div>
      </div>`;
    }
    const sel = delDia(ui.diaSel);
    body = `<div class="month"><div class="dow">${DIES.map((d) => `<div>${d}</div>`).join('')}</div><div class="grid">${cells}</div></div>
      <div class="dia-sel dia-grup">
        <h3 class="${ui.diaSel === avui ? 'avui' : ''}">${ui.diaSel === avui ? 'Avui · ' : ''}${dataLlarga(ui.diaSel)}</h3>
        ${sel.map(card).join('') || '<p class="empty">Cap gravació aquest dia.</p>'}
        <button class="add" style="width:100%" data-action="nova-dia" data-date="${ui.diaSel}">+ Afegir gravació</button>
      </div>`;
  } else {
    const s = mondayOf(c), e = addDays(s, 6);
    titol = `${s.getDate()} ${MESOS[s.getMonth()].slice(0, 3)}. – ${e.getDate()} ${MESOS[e.getMonth()].slice(0, 3)}. ${e.getFullYear()}`;
    body = '<div class="week">' + [0, 1, 2, 3, 4, 5, 6].map((i) => {
      const d = addDays(s, i), ds = ymd(d), items = delDia(ds);
      return `<section class="wday ${ds === avui ? 'today' : ''}">
        <header data-action="nova-dia" data-date="${ds}"><span>${DIES_LLARGS[i]}</span><b>${d.getDate()}</b></header>
        ${items.map(card).join('') || '<p class="empty">Cap gravació</p>'}
        <button class="add" data-action="nova-dia" data-date="${ds}">+ Afegir</button>
      </section>`;
    }).join('') + '</div>';
  }

  const legend = state.programes.map((p) => `<span><span class="dot" style="--c:${p.color}"></span>${esc(p.nom)}</span>`).join('');
  m.innerHTML = `
    <div class="toolbar">
      <div class="grp">
        <button class="btn nav-btn" data-action="prev" aria-label="Anterior">‹</button>
        <button class="btn" data-action="avui">Avui</button>
        <button class="btn nav-btn" data-action="next" aria-label="Següent">›</button>
        <h2>${titol}</h2>
      </div>
      <div class="grp">
        <div class="seg">
          <button data-action="mode" data-mode="mes" class="${ui.mode === 'mes' ? 'on' : ''}">Mes</button>
          <button data-action="mode" data-mode="setmana" class="${ui.mode === 'setmana' ? 'on' : ''}">Setmana</button>
        </div>
        <select data-filter="programa" aria-label="Filtra per programa">${progOptions(ui.filtrePrograma, 'Tots els programes')}</select>
      </div>
    </div>
    <div class="legend">${legend}</div>
    ${body}`;
}

/* ---------- Agenda ---------- */
function renderAgenda(m) {
  m.innerHTML = `
    <div class="toolbar">
      <div class="grp">
        <input type="search" id="cerca" placeholder="Cerca títol, convidat, nota…" value="${esc(ui.cerca)}">
        <select data-filter="programa" aria-label="Filtra per programa">${progOptions(ui.filtrePrograma, 'Tots els programes')}</select>
        <select data-filter="estat" aria-label="Filtra per estat">${estatOptions(ui.filtreEstat, 'Tots els estats')}</select>
        <label class="check"><input type="checkbox" data-filter="properes" ${ui.nomesProperes ? 'checked' : ''}> Només properes</label>
      </div>
    </div>
    <div id="taula"></div>`;
  renderTaula();
}
function renderTaula() {
  const avui = ymd(new Date());
  const q = ui.cerca.trim().toLowerCase();
  const rows = visibles()
    .filter((g) => !ui.filtreEstat || g.estat === ui.filtreEstat)
    .filter((g) => !ui.nomesProperes || g.data >= avui)
    .filter((g) => !q || [g.titol, g.convidats, g.notes, g.estudi, progNom(g), ...equip(g)].join(' ').toLowerCase().includes(q))
    .sort(ordena);
  const t = $('#taula');
  if (!rows.length) {
    t.innerHTML = `<div class="panel" style="padding:24px;text-align:center"><p class="empty">No hi ha cap gravació${ui.nomesProperes ? ' programada' : ''} amb aquests filtres.</p>
      <button class="btn primary" data-action="nova-dia" data-date="${avui}" style="margin-top:10px">+ Nova gravació</button></div>`;
    return;
  }
  // Ordinador: taula
  const taula = `<div class="panel agenda-taula"><table>
    <thead><tr><th>Data</th><th>Horari</th><th>Programa</th><th>Títol</th><th>Estudi</th><th>Equip</th><th>Convidats</th><th>Estat</th><th></th></tr></thead>
    <tbody>${rows.map((g) => `<tr class="${g.estat === 'cancellat' ? 'cancel' : ''}">
      <td class="nowrap">${dataCurta(g.data)}</td>
      <td class="nowrap">${horari(g)}</td>
      <td><div class="prog">${coverProg(prog(g.programaId))}${esc(progNom(g))}</div></td>
      <td>${esc(g.titol)}</td>
      <td class="nowrap">${esc(g.estudi || '—')}</td>
      <td>${esc(equip(g).join(', ') || '—')}</td>
      <td>${esc(g.convidats || '—')}</td>
      <td><select data-estat="${g.id}" aria-label="Estat">${estatOptions(g.estat)}</select></td>
      <td><button class="btn small" data-action="edita" data-id="${g.id}">Edita</button></td>
    </tr>`).join('')}</tbody></table></div>`;
  // Mòbil: targetes agrupades per dia
  const grups = {};
  rows.forEach((g) => { (grups[g.data] = grups[g.data] || []).push(g); });
  const targetes = `<div class="agenda-cards">${Object.entries(grups).map(([ds, gs]) => `
    <div class="dia-grup"><h3 class="${ds === avui ? 'avui' : ''}">${ds === avui ? 'Avui · ' : ''}${dataLlarga(ds)}</h3>${gs.map(card).join('')}</div>`).join('')}</div>`;
  t.innerHTML = taula + targetes;
}

/* ---------- Programes ---------- */
function renderProgrames(m) {
  const avui = ymd(new Date());
  m.innerHTML = `
    <div class="toolbar"><div class="grp" style="width:auto"><h2 style="margin:0">Programes i podcasts</h2></div>
      <button class="btn primary" data-action="nou-programa">+ Nou programa</button></div>
    <div class="cards">${state.programes.map((p) => {
      const gs = state.gravacions.filter((g) => g.programaId === p.id);
      const properes = gs.filter((g) => g.data >= avui && g.estat !== 'cancellat').sort(ordena);
      return `<div class="item" style="--c:${p.color}">
        <div class="img">${p.imatge ? `<img src="${esc(p.imatge)}" alt="">` : `<span>${esc(inicials(p.nom))}</span>`}</div>
        <div class="in">
          <h3>${esc(p.nom)}</h3>
          <div class="sub"><span class="dot" style="--c:${p.color}"></span>${p.tipus === 'podcast' ? 'Podcast' : 'Programa'} · ${gs.length} gravacions</div>
          <div class="sub">${properes.length ? `Propera: ${dataCurta(properes[0].data)}, ${properes[0].hora}` : 'Cap gravació programada'}</div>
          <div class="acts"><button class="btn small" data-action="edita-programa" data-id="${p.id}">Edita</button>
            <button class="btn small" data-action="filtra-programa" data-id="${p.id}">Calendari</button></div>
        </div>
      </div>`;
    }).join('') || '<p class="empty">Encara no hi ha programes. Crea el primer!</p>'}</div>`;
}

// Redueix la imatge triada perquè ocupi poc espai
function llegeixImatge(file) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      const mida = 320, cv = document.createElement('canvas');
      cv.width = cv.height = mida;
      const s = Math.min(img.width, img.height);
      cv.getContext('2d').drawImage(img, (img.width - s) / 2, (img.height - s) / 2, s, s, 0, 0, mida, mida);
      URL.revokeObjectURL(img.src);
      resolve(cv.toDataURL('image/jpeg', .82));
    };
    img.onerror = reject;
    img.src = URL.createObjectURL(file);
  });
}

function openPrograma(p) {
  const nou = !p;
  p = p || { id: uid(), nom: '', tipus: 'podcast', color: COLORS[state.programes.length % COLORS.length], imatge: '' };
  let imatge = p.imatge || '';
  openDialog(`
    <h3>${nou ? 'Nou programa' : 'Edita programa'}</h3>
    <label>Nom <input name="nom" value="${esc(p.nom)}" required></label>
    <div class="row">
      <label>Tipus <select name="tipus">
        <option value="programa" ${p.tipus === 'programa' ? 'selected' : ''}>Programa</option>
        <option value="podcast" ${p.tipus === 'podcast' ? 'selected' : ''}>Podcast</option></select></label>
      <label>Color al calendari <input type="color" name="color" value="${esc(p.color)}"></label>
    </div>
    <fieldset><legend>Caràtula</legend>
      <div class="img-pick">
        <img class="prev" id="prevImg" src="${esc(imatge)}" alt="" ${imatge ? '' : 'style="visibility:hidden"'}>
        <div class="grp" style="width:auto">
          <button type="button" class="btn small" data-dlg="tria-img">Tria imatge…</button>
          <button type="button" class="btn small" data-dlg="treu-img">Treu</button>
        </div>
        <input type="file" id="fitxerImg" accept="image/*" hidden>
      </div>
    </fieldset>`, {
    onSave(f) {
      const nom = f.get('nom').trim();
      if (!nom) { toast('Cal posar un nom.'); return false; }
      Object.assign(p, { nom, tipus: f.get('tipus'), color: f.get('color'), imatge });
      if (nou) state.programes.push(p);
    },
    onDelete: nou ? null : () => {
      const n = state.gravacions.filter((g) => g.programaId === p.id).length;
      if (!confirm(`Eliminar «${p.nom}»?${n ? ` Les seves ${n} gravacions quedaran sense programa.` : ''}`)) return false;
      state.programes = state.programes.filter((x) => x.id !== p.id);
      state.gravacions.forEach((g) => { if (g.programaId === p.id) g.programaId = ''; });
      if (ui.filtrePrograma === p.id) ui.filtrePrograma = '';
    },
    onExtra(a) {
      const prev = $('#prevImg');
      if (a === 'tria-img') $('#fitxerImg').click();
      if (a === 'treu-img') { imatge = ''; prev.style.visibility = 'hidden'; }
    },
  });
  $('#fitxerImg').addEventListener('change', async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    try {
      imatge = await llegeixImatge(file);
      const prev = $('#prevImg'); prev.src = imatge; prev.style.visibility = 'visible';
    } catch (err) { toast("No s'ha pogut llegir la imatge."); }
  });
}

/* ---------- Equip ---------- */
function renderPersones(m) {
  const avui = ymd(new Date());
  m.innerHTML = `
    <div class="toolbar"><div class="grp" style="width:auto"><h2 style="margin:0">Equip</h2></div>
      <button class="btn primary" data-action="nova-persona">+ Nova persona</button></div>
    <div class="cards equip">${state.persones.map((p) => {
      const n = state.gravacions.filter((g) => g.data >= avui && g.estat !== 'cancellat' && (g.tecnic === p.id || (g.presentadors || []).includes(p.id))).length;
      return `<div class="item persona">
        <div class="avatar">${esc(inicials(p.nom))}</div>
        <div class="in">
          <h3>${esc(p.nom)}</h3>
          <div class="sub">${esc(p.rol || 'Sense rol')} · ${n} gravacions properes</div>
        </div>
        <button class="btn small" data-action="edita-persona" data-id="${p.id}">Edita</button>
      </div>`;
    }).join('') || '<p class="empty">Encara no hi ha ningú. Afegeix presentadors, tècnics, productors…</p>'}</div>`;
}
function openPersona(p) {
  const nou = !p;
  p = p || { id: uid(), nom: '', rol: '' };
  openDialog(`
    <h3>${nou ? 'Nova persona' : 'Edita persona'}</h3>
    <label>Nom <input name="nom" value="${esc(p.nom)}" required></label>
    <label>Rol <input name="rol" value="${esc(p.rol)}" placeholder="Presentació, tècnica de so, producció…"></label>`, {
    onSave(f) {
      const nom = f.get('nom').trim();
      if (!nom) { toast('Cal posar un nom.'); return false; }
      Object.assign(p, { nom, rol: f.get('rol').trim() });
      if (nou) state.persones.push(p);
    },
    onDelete: nou ? null : () => {
      if (!confirm(`Eliminar ${p.nom}? Es traurà de totes les gravacions.`)) return false;
      state.persones = state.persones.filter((x) => x.id !== p.id);
      state.gravacions.forEach((g) => {
        g.presentadors = (g.presentadors || []).filter((id) => id !== p.id);
        if (g.tecnic === p.id) g.tecnic = '';
      });
    },
  });
}

/* ---------- Ajustos ---------- */
function renderConfig(m) {
  m.innerHTML = `
    ${typeof Sync !== 'undefined' ? Sync.html() : ''}
    <div class="section">
      <h2>Estudis i sales</h2>
      <p class="help">Els espais on es grava. L'app avisa si dues gravacions coincideixen al mateix estudi.</p>
      <div class="tags">${state.estudis.map((s, i) => `<span class="tag">${esc(s)}<button data-action="treu-estudi" data-i="${i}" aria-label="Treu ${esc(s)}">×</button></span>`).join('') || '<span class="empty">Cap estudi</span>'}</div>
      <form class="inline-form" id="formEstudi"><input name="estudi" placeholder="Nom de l'estudi"><button class="btn">Afegeix</button></form>
    </div>
    <div class="section">
      <h2>Còpia de seguretat</h2>
      <p class="help">Descarrega una còpia de totes les dades en un fitxer, per guardar-la o per recuperar-la si cal.</p>
      <div class="grp">
        <button class="btn" data-action="exporta">⬇ Exporta</button>
        <button class="btn" data-action="importa">⬆ Importa</button>
        <input type="file" id="fitxer" accept=".json,application/json" hidden>
      </div>
    </div>
    ${(() => {
      const cal = typeof Sync !== 'undefined' ? Sync.enllacCalendari() : '';
      return cal ? `<div class="section">
        <h2>Calendari del iPhone</h2>
        <p class="help">Les gravacions apareixen soles al Calendari del iPhone, amb un avís 30 minuts abans. Les cancel·lades no hi surten.<br>
        <b>Al iPhone:</b> toca el botó, després <b>Subscriure's</b>. A la pantalla següent, posa-li color <b>verd</b> i desactiva <b>«Eliminar alertes»</b> perquè t'arribin els avisos. Finalment toca <b>Afegir</b>.</p>
        <div class="grp">
          <a class="btn primary" href="${esc(cal)}">Afegeix al Calendari</a>
          <button class="btn" data-action="copia-cal" data-url="${esc(cal)}">Copia l'enllaç</button>
        </div></div>` : '';
    })()}
    <div class="section">
      <h2>Instal·lar l'app</h2>
      <p class="help"><b>iPhone:</b> obre-la amb Safari, toca <b>Compartir</b> i després <b>Afegeix a la pantalla d'inici</b>.<br>
      <b>Ordinador:</b> a Chrome o Edge, fes clic a la icona d'instal·lar de la barra d'adreces.</p>
    </div>
    <div class="section">
      <h2>Zona perillosa</h2>
      <div class="grp">
        <button class="btn danger" data-action="esborra-tot">Esborra totes les dades</button>
        <button class="btn" data-action="exemple">Restaura les dades inicials</button>
      </div>
    </div>`;
  if (typeof Sync !== 'undefined') Sync.bind();
  $('#formEstudi').addEventListener('submit', (e) => {
    e.preventDefault();
    const v = new FormData(e.target).get('estudi').trim();
    if (!v) return;
    if (state.estudis.includes(v)) { toast('Aquest estudi ja existeix.'); return; }
    state.estudis.push(v); save(); render();
  });
  $('#fitxer').addEventListener('change', (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const r = new FileReader();
    r.onload = () => {
      try {
        const d = normalize(JSON.parse(r.result));
        if (!confirm(`Importar ${d.gravacions.length} gravacions, ${d.programes.length} programes i ${d.persones.length} persones? Se substituiran les dades actuals.`)) return;
        state = d; save(); render(); toast('Dades importades.');
      } catch (err) { toast('El fitxer no és vàlid.'); }
    };
    r.readAsText(file);
  });
}
function exporta() {
  const blob = new Blob([JSON.stringify(state, null, 2)], { type: 'application/json' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = `gravacions-${ymd(new Date())}.json`;
  a.click();
  setTimeout(() => URL.revokeObjectURL(a.href), 1000);
}

/* ---------- Gravació (formulari) ---------- */
function conflictes(g) {
  const ini = toMin(g.hora), fi = ini + Number(g.durada || 0);
  const gent = new Set([...(g.presentadors || []), g.tecnic].filter(Boolean));
  return state.gravacions.filter((o) => {
    if (o.id === g.id || o.data !== g.data || o.estat === 'cancellat' || g.estat === 'cancellat') return false;
    const oi = toMin(o.hora), of = oi + Number(o.durada || 0);
    if (!(ini < of && oi < fi)) return false;
    const mateixEstudi = g.estudi && o.estudi === g.estudi;
    const persona = [...(o.presentadors || []), o.tecnic].some((id) => id && gent.has(id));
    return mateixEstudi || persona;
  });
}

function openGravacio(g, dataPerDefecte) {
  const nou = !g;
  g = g || {
    id: uid(), titol: '', programaId: ui.filtrePrograma || '', data: dataPerDefecte || ymd(new Date()),
    hora: '10:00', durada: 60, estudi: state.estudis[0] || '', estat: 'pendent',
    presentadors: [], tecnic: '', convidats: '', notes: '',
  };
  const estudis = [...new Set([...state.estudis, g.estudi].filter(Boolean))];
  openDialog(`
    <h3>${nou ? 'Nova gravació' : 'Edita gravació'}</h3>
    <label>Títol o episodi <input name="titol" value="${esc(g.titol)}" required placeholder="Ex.: Episodi 12 – Entrevista"></label>
    <label>Programa / podcast <select name="programaId">${progOptions(g.programaId, '— Sense programa —')}</select></label>
    <div class="row">
      <label>Data <input type="date" name="data" value="${esc(g.data)}" required></label>
      <label>Hora d'inici <input type="time" name="hora" value="${esc(g.hora)}" required></label>
      <label>Durada (min) <input type="number" inputmode="numeric" name="durada" min="5" step="5" value="${esc(g.durada)}"></label>
      <label>Estat <select name="estat">${estatOptions(g.estat)}</select></label>
    </div>
    <label>Estudi <select name="estudi"><option value="">— Cap / fora d'estudi —</option>${estudis.map((s) => `<option ${s === g.estudi ? 'selected' : ''}>${esc(s)}</option>`).join('')}</select></label>
    <fieldset><legend>Presenten / participen</legend>
      ${state.persones.length ? `<div class="checks">${state.persones.map((p) => `<label><input type="checkbox" name="presentadors" value="${p.id}" ${(g.presentadors || []).includes(p.id) ? 'checked' : ''}> ${esc(p.nom)}</label>`).join('')}</div>`
        : '<span class="hint">Afegeix persones a la pestanya «Equip».</span>'}
    </fieldset>
    <label>Tècnic/a <select name="tecnic"><option value="">—</option>${state.persones.map((p) => `<option value="${p.id}" ${p.id === g.tecnic ? 'selected' : ''}>${esc(p.nom)}${p.rol ? ' · ' + esc(p.rol) : ''}</option>`).join('')}</select></label>
    <label>Convidats <input name="convidats" value="${esc(g.convidats)}" placeholder="Noms separats per comes"></label>
    <label>Notes <textarea name="notes" rows="3">${esc(g.notes)}</textarea></label>
    ${nou ? '<label>Repetir cada setmana <input type="number" inputmode="numeric" name="repeticions" min="0" max="52" value="0"><span class="hint">Nombre de setmanes addicionals (0 = només aquesta)</span></label>' : ''}
    <p class="warn" id="avis"></p>`, {
    extraButtons: nou ? '' : '<button type="button" class="btn" data-dlg="duplica">Duplica</button>',
    onSave(f) {
      const dades = {
        titol: f.get('titol').trim(), programaId: f.get('programaId'), data: f.get('data'), hora: f.get('hora'),
        durada: Math.max(5, Number(f.get('durada')) || 60), estudi: f.get('estudi'), estat: f.get('estat'),
        presentadors: f.getAll('presentadors'), tecnic: f.get('tecnic'),
        convidats: f.get('convidats').trim(), notes: f.get('notes').trim(),
      };
      if (!dades.titol || !dades.data || !dades.hora) { toast("Cal omplir el títol, la data i l'hora."); return false; }
      const reps = nou ? Math.min(52, Math.max(0, Number(f.get('repeticions')) || 0)) : 0;
      const noves = [{ ...g, ...dades }];
      for (let i = 1; i <= reps; i++) noves.push({ ...g, ...dades, id: uid(), data: ymd(addDays(parseYmd(dades.data), 7 * i)) });
      const xocs = noves.flatMap(conflictes);
      if (xocs.length) {
        const llista = [...new Set(xocs)].slice(0, 5).map((o) => `• ${dataCurta(o.data)} ${horari(o)} – ${progNom(o)}: ${o.titol}`).join('\n');
        if (!confirm(`Atenció: coincideix amb altres gravacions (mateix estudi o mateixa persona):\n\n${llista}\n\nVols desar-la igualment?`)) return false;
      }
      if (nou) state.gravacions.push(...noves);
      else Object.assign(g, dades);
      ui.diaSel = dades.data;
      toast(reps ? `S'han creat ${noves.length} gravacions.` : 'Gravació desada.');
    },
    onDelete: nou ? null : () => {
      if (!confirm(`Eliminar la gravació «${g.titol}»?`)) return false;
      state.gravacions = state.gravacions.filter((x) => x.id !== g.id);
    },
    onExtra(action) {
      if (action === 'duplica') {
        closeDialog();
        openGravacio(null, g.data);
        const f = $('#dlgForm');
        ['titol', 'programaId', 'hora', 'durada', 'estudi', 'tecnic', 'convidats', 'notes'].forEach((k) => { f.elements[k].value = g[k] ?? ''; });
        f.querySelectorAll('input[name=presentadors]').forEach((c) => { c.checked = (g.presentadors || []).includes(c.value); });
        f.elements.titol.value = g.titol + ' (còpia)';
        f.dispatchEvent(new Event('change'));
      }
    },
  });
  // Avís de conflictes en directe
  const f = $('#dlgForm');
  const comprova = () => {
    if (!f.elements.data) return;
    const prova = { ...g, data: f.elements.data.value, hora: f.elements.hora.value, durada: f.elements.durada.value, estudi: f.elements.estudi.value, estat: f.elements.estat.value,
      presentadors: [...f.querySelectorAll('input[name=presentadors]:checked')].map((c) => c.value), tecnic: f.elements.tecnic.value };
    const x = prova.data && prova.hora ? conflictes(prova) : [];
    $('#avis').textContent = x.length ? `⚠ Coincideix amb: ${x.map((o) => `${horari(o)} ${progNom(o)} – ${o.titol}`).join('; ')}` : '';
  };
  f.oninput = comprova;
  f.onchange = comprova;
  comprova();
  if (!mobil.matches && nou) f.elements.titol.focus();
}

/* ---------- Diàleg genèric ---------- */
let dlgHandlers = null;
function openDialog(html, h) {
  dlgHandlers = h;
  const f = $('#dlgForm');
  f.oninput = f.onchange = null;
  f.innerHTML = html + `
    <div class="dlg-actions">
      ${h.onDelete ? '<button type="button" class="btn danger" data-dlg="delete">Elimina</button>' : ''}
      ${h.extraButtons || ''}
      <span class="sp"></span>
      <button type="button" class="btn" data-dlg="cancel">Cancel·la</button>
      <button type="submit" class="btn primary">Desa</button>
    </div>`;
  const dlg = $('#dlg');
  if (!dlg.open) dlg.showModal();
  f.scrollTop = 0; dlg.scrollTop = 0;
}
function closeDialog() { const d = $('#dlg'); if (d.open) d.close(); }

$('#dlgForm').addEventListener('submit', (e) => {
  e.preventDefault();
  if (!dlgHandlers) return;
  if (dlgHandlers.onSave(new FormData(e.target)) === false) return;
  save(); closeDialog(); render();
});
$('#dlgForm').addEventListener('click', (e) => {
  const b = e.target.closest('[data-dlg]');
  if (!b || !dlgHandlers) return;
  const a = b.dataset.dlg;
  if (a === 'cancel') return closeDialog();
  if (a === 'delete') {
    if (dlgHandlers.onDelete() === false) return;
    save(); closeDialog(); render(); return;
  }
  dlgHandlers.onExtra?.(a);
});
// Tancar tocant fora del diàleg
$('#dlg').addEventListener('click', (e) => { if (e.target === e.currentTarget) closeDialog(); });

/* ---------- Esdeveniments ---------- */
function toast(msg) {
  const t = $('#toast');
  t.textContent = msg; t.hidden = false;
  clearTimeout(toast.t);
  toast.t = setTimeout(() => { t.hidden = true; }, 3000);
}

$('#tabs').addEventListener('click', (e) => {
  const b = e.target.closest('button[data-view]');
  if (b) { ui.view = b.dataset.view; render(); window.scrollTo(0, 0); }
});
$('#btnNova').addEventListener('click', () => {
  const avui = ymd(new Date());
  if (ui.view === 'calendari' && ui.mode === 'mes') return openGravacio(null, ui.diaSel >= avui ? ui.diaSel : avui);
  openGravacio(null, avui);
});

$('#main').addEventListener('click', (e) => {
  const el = e.target.closest('[data-action]');
  if (!el) return;
  const { action, id, date } = el.dataset;
  const c = ui.cursor;
  switch (action) {
    case 'prev': ui.cursor = ui.mode === 'mes' ? new Date(c.getFullYear(), c.getMonth() - 1, 1) : addDays(c, -7); break;
    case 'next': ui.cursor = ui.mode === 'mes' ? new Date(c.getFullYear(), c.getMonth() + 1, 1) : addDays(c, 7); break;
    case 'avui': ui.cursor = new Date(); ui.diaSel = ymd(new Date()); break;
    case 'mode': ui.mode = el.dataset.mode; if (ui.mode === 'setmana') ui.cursor = parseYmd(ui.diaSel); break;
    case 'veure-setmana': ui.cursor = parseYmd(date); ui.mode = 'setmana'; break;
    case 'dia':
      // Mòbil: selecciona el dia i en mostra la llista. Ordinador: crea una gravació aquell dia.
      ui.diaSel = date;
      if (mobil.matches) break;
      return openGravacio(null, date);
    case 'nova-dia': return openGravacio(null, date);
    case 'edita': { const g = state.gravacions.find((x) => x.id === id); return g && openGravacio(g); }
    case 'nou-programa': return openPrograma(null);
    case 'edita-programa': return openPrograma(prog(id));
    case 'filtra-programa': ui.filtrePrograma = id; ui.view = 'calendari'; break;
    case 'nova-persona': return openPersona(null);
    case 'edita-persona': return openPersona(pers(id));
    case 'treu-estudi': state.estudis.splice(Number(el.dataset.i), 1); save(); break;
    case 'exporta': return exporta();
    case 'copia-cal':
      navigator.clipboard?.writeText(el.dataset.url).then(() => toast('Enllaç copiat.'), () => toast('No s\'ha pogut copiar.'));
      return;
    case 'importa': return $('#fitxer').click();
    case 'esborra-tot':
      if (!confirm('Segur que vols esborrar TOTES les dades? Exporta-les abans si les vols conservar.')) return;
      state = { programes: [], persones: [], estudis: [], gravacions: [] }; save(); toast('Dades esborrades.'); break;
    case 'exemple':
      if (!confirm('Substituir les dades actuals per les inicials (els dos podcasts i l\'equip)?')) return;
      state = seed(); save(); break;
    default: return;
  }
  render();
});

$('#main').addEventListener('change', (e) => {
  const t = e.target;
  if (t.dataset.estat) {
    const g = state.gravacions.find((x) => x.id === t.dataset.estat);
    if (g) { g.estat = t.value; save(); renderTaula(); }
    return;
  }
  const f = t.dataset.filter;
  if (!f) return;
  if (f === 'programa') ui.filtrePrograma = t.value;
  if (f === 'estat') ui.filtreEstat = t.value;
  if (f === 'properes') ui.nomesProperes = t.checked;
  ui.view === 'agenda' ? renderTaula() : render();
});
$('#main').addEventListener('input', (e) => {
  if (e.target.id === 'cerca') { ui.cerca = e.target.value; renderTaula(); }
});
mobil.addEventListener('change', render);

/* ---------- Arrencada ---------- */
document.querySelectorAll('.nom-app').forEach((el) => { el.textContent = APP.nom; });
if (PROVES) {
  document.title = '[PROVES] ' + document.title;
  document.querySelector('.brand small').innerHTML = '<span class="proves">VERSIÓ DE PROVES</span>';
}
render();
setTimeout(() => $('#splash').classList.add('fora'), 1100);

if ('serviceWorker' in navigator && location.protocol !== 'file:') {
  navigator.serviceWorker.register('sw.js').catch(() => {});
}
