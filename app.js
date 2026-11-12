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
const CHECKLIST = [
  ['guio', 'Guió fet'], ['convidat', 'Convidat confirmat'], ['material', 'Material preparat'],
  ['editat', 'Editat'], ['pujat', 'Pujat a la plataforma'],
];
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
const dataCurta = (ds) => { if (!ds) return '—'; const d = parseYmd(ds); return `${DIES[(d.getDay() + 6) % 7]} ${d.getDate()} ${MESOS[d.getMonth()].slice(0, 3)}. ${d.getFullYear()}`; };
const dataLlarga = (ds) => { const d = parseYmd(ds); return `${DIES_LLARGS[(d.getDay() + 6) % 7]} ${d.getDate()} de ${MESOS[d.getMonth()]}`; };
const inicials = (nom) => nom.split(/\s+/).filter(Boolean).slice(0, 2).map((p) => p[0].toUpperCase()).join('');

/* ---------- Dades ---------- */
function seed() {
  // Identificadors fixos: així els dispositius nous no dupliquen els podcasts en sincronitzar
  const angel = 'pe-angel', david = 'pe-david';
  return {
    programes: [
      { id: 'p-lluna', nom: 'La cara oculta de la lluna', tipus: 'podcast', color: '#3D4B6B', imatge: 'img/la-cara-oculta-de-la-lluna.jpg' },
      { id: 'p-blanc-negre', nom: 'Blanc & Negre', tipus: 'podcast', color: '#E03131', imatge: 'img/blanc-i-negre.jpg' },
    ],
    persones: [
      { id: angel, nom: 'Angel Ayats', rol: 'Producció i realització' },
      { id: david, nom: 'David Izquierdo', rol: 'Presentació' },
    ],
    estudis: ['Estudi 1'], ubicacions: {}, agenda: { contactes: [], importat: '' },
    gravacions: [],
  };
}
function normalize(d) {
  const arr = (x) => (Array.isArray(x) ? x : []);
  return {
    programes: arr(d.programes), persones: arr(d.persones),
    estudis: arr(d.estudis).filter((s) => typeof s === 'string'),
    ubicacions: d.ubicacions && typeof d.ubicacions === 'object' && !Array.isArray(d.ubicacions) ? d.ubicacions : {},
    agenda: { contactes: arr(d.agenda?.contactes), importat: d.agenda?.importat || '' },
    plantilles: d.plantilles && typeof d.plantilles === 'object' ? d.plantilles : {},
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

function llegeixPref(k, def) { try { const v = localStorage.getItem('podcasts-pref-' + k); return v === null ? def : JSON.parse(v); } catch (e) { return def; } }
function desaPref(k, v) { try { localStorage.setItem('podcasts-pref-' + k, JSON.stringify(v)); } catch (e) { /* no passa res */ } }
const ui = {
  view: 'portada', mode: 'mes', cursor: new Date(), diaSel: ymd(new Date()),
  filtrePrograma: '', filtreEstat: '', cerca: '', nomesProperes: true,
  veureEmissions: llegeixPref('veureEmissions', true), progStats: llegeixPref('progStats', ''), agendaTipus: llegeixPref('agendaTipus', 'gravacions'),
};

const prog = (id) => state.programes.find((p) => p.id === id);
const esMusical = (pid) => { const p = prog(pid); return Boolean(p && (p.format ? p.format === 'musical' : /blanc/i.test(p.nom))); };
// Quants artistes de cada costat té cada tipus d'episodi musical
const TIPUS_EP = { dialeg: ['Diàleg (clàssic ↔ contemporani)', 1], pindola: ['Píndola resum (4 clàssics + 4 alternatius)', 4], tematic: ['Temàtic (5 clàssics + 5 alternatius)', 5] };
// Artistes d'un episodi (dels camps nous; si encara no en té, de les notes antigues)
const ARTISTA = /^(Clàssic|Contemporani):\s*(.+?)(?:\s+—\s+.*)?$/;
function artistesDe(g) {
  const camps = [...(g.classics || []), ...(g.contemporanis || [])].map((a) => a.artista).filter(Boolean);
  if (camps.length) return camps;
  return (g.notes || '').split('\n').map((l) => l.trim().match(ARTISTA)?.[2]).filter(Boolean);
}
const textMusica = (g) => [g.tema, ...[...(g.classics || []), ...(g.contemporanis || [])].flatMap((a) => [a.artista, a.disc])].filter(Boolean).join(' ');
const pers = (id) => state.persones.find((p) => p.id === id);
const color = (g) => prog(g.programaId)?.color || '#868E96';
const progNom = (g) => prog(g.programaId)?.nom || 'Sense programa';
const visibles = () => state.gravacions.filter((g) => !ui.filtrePrograma || g.programaId === ui.filtrePrograma);
const delDia = (ds) => visibles().filter((g) => g.data === ds).sort((a, b) => toMin(a.hora) - toMin(b.hora));
// Emissions del dia (data d'emissió), separades de les gravacions
const emDia = (ds) => (!ui.veureEmissions ? [] : visibles()).filter((g) => g.emissio === ds && g.estat !== 'cancellat').sort((a, b) => toMin(a.horaEmissio) - toMin(b.horaEmissio));
// Data de referència: la de gravació; si encara no en té, la d'emissió
const dataRef = (g) => g.data || g.emissio || '';
// Ordre: per data; els que encara no tenen data van al final, per número d'episodi
const clauOrdre = (g) => (dataRef(g) ? dataRef(g) + (g.data ? g.hora : g.horaEmissio || '') : '~' + String(Number(g.numero) || 0).padStart(5, '0'));
const ordena = (a, b) => { const x = clauOrdre(a), y = clauOrdre(b); return x < y ? -1 : x > y ? 1 : 0; };
const horari = (g) => (g.data && g.hora ? `${g.hora}–${fromMin(toMin(g.hora) + Number(g.durada || 0))}` : 'Sense data de gravació');
const titolG = (g) => (g.numero ? `Ep. ${g.numero} · ` : '') + (g.titol || '');
const emissioText = (g) => (g.emissio ? `Emissió: ${dataCurta(g.emissio)}${g.horaEmissio ? ', ' + g.horaEmissio : ''}` : '');
const GRAVADA = ['gravat', 'editat', 'publicat'];
const jaGravada = (g, avui = ymd(new Date())) => GRAVADA.includes(g.estat) || Boolean(g.data && g.data <= avui);
const equip = (g) => [...(g.presentadors || []).map(pers), pers(g.tecnic)].filter(Boolean).map((p) => p.nom);
// Les persones poden ser de l'equip o convidats (tipus: 'convidat')
const equipPers = () => state.persones.filter((p) => p.tipus !== 'convidat');
const convidatsPers = () => state.persones.filter((p) => p.tipus === 'convidat').sort((a, b) => a.nom.localeCompare(b.nom, 'ca'));
const nomsConvidats = (g) => {
  const fitxes = (g.convidatsIds || []).map(pers).filter(Boolean).map((p) => p.nom);
  return fitxes.length ? fitxes : (g.convidats ? [g.convidats] : []);
};
const checkFet = (g) => CHECKLIST.filter(([k]) => g.checklist?.[k]).length;
const checkBadge = (g) => {
  const n = checkFet(g);
  return `<span class="chk ${n === CHECKLIST.length ? 'tot' : ''}" title="Checklist: ${n} de ${CHECKLIST.length}">✓ ${n}/${CHECKLIST.length}</span>`;
};
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
  // Portada: la caràtula queda fixa, amb el menú a sota
  const portada = ui.view === 'portada';
  document.body.classList.toggle('a-portada', portada);
  $('#splash').classList.toggle('fora', !portada);
  document.documentElement.style.setProperty('--alt-cap', (document.querySelector('header')?.offsetHeight || 0) + 'px');
  const views = { portada: (m) => { m.innerHTML = ''; }, calendari: renderCal, agenda: renderAgenda, programes: renderProgrames, persones: renderPersones, contactes: renderContactes, config: renderConfig };
  views[ui.view]($('#main'));
}

/* ---------- Calendari ---------- */
function chip(g) {
  return `<button class="chip ${g.estat === 'cancellat' ? 'cancel' : ''}" style="--c:${color(g)}" data-action="edita" data-id="${g.id}"
    title="${esc(`Gravació ${horari(g)} · ${progNom(g)} · ${titolG(g)} · ${estatNom(g.estat)}`)}"><span class="t">${esc(g.hora)}</span> ${esc(g.titol)}</button>`;
}
function chipEmissio(g) {
  return `<button class="chip emissio" style="--c:${color(g)}" data-action="edita" data-id="${g.id}"
    title="${esc(`Emissió ${g.horaEmissio || ''} · ${progNom(g)} · ${titolG(g)} · ${estatNom(g.estat)}`)}"><span class="t">${esc(g.numero ? 'Ep.' + g.numero : g.horaEmissio || '')}</span> ${esc(g.titol)}</button>`;
}
function card(g) {
  const noms = equip(g);
  return `<button class="card ${g.estat === 'cancellat' ? 'cancel' : ''} ${g.data ? 'gravacio' : 'nomes-emissio'}" style="--c:${color(g)}" data-action="edita" data-id="${g.id}">
    ${coverProg(prog(g.programaId))}
    <div class="body">
      <div class="h">${horari(g)}${g.data && g.estudi ? ' · ' + esc(g.estudi) : ''}</div>
      <div class="ti">${esc(titolG(g))}</div>
      <div class="pr">${esc(progNom(g))}</div>
      ${g.emissio ? `<div class="pr">${esc(emissioText(g))}</div>` : ''}
      <div class="meta"><span class="badge ${g.estat}">${estatNom(g.estat)}</span>${g.estat !== 'cancellat' ? checkBadge(g) : ''}${noms.length ? `<span class="hint">${esc(noms.join(', '))}</span>` : ''}</div>
      ${nomsConvidats(g).length ? `<div class="pr">Convidats: ${esc(nomsConvidats(g).join(', '))}</div>` : ''}
    </div>
  </button>`;
}
// Targeta d'emissió (el dia que surt a antena)
function cardEmissio(g) {
  return `<button class="card emissio" style="--c:${color(g)}" data-action="edita" data-id="${g.id}">
    ${coverProg(prog(g.programaId))}
    <div class="body">
      <div class="h">Emissió${g.horaEmissio ? ' · ' + esc(g.horaEmissio) : ''}</div>
      <div class="ti">${esc(titolG(g))}</div>
      <div class="pr">${esc(progNom(g))}</div>
      <div class="meta"><span class="badge ${g.estat}">${estatNom(g.estat)}</span></div>
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
      const d = addDays(start, i), ds = ymd(d), items = delDia(ds), ems = emDia(ds);
      const tots = [...items.map(chip), ...ems.map(chipEmissio)];
      cells += `<div class="cell ${d.getMonth() !== c.getMonth() ? 'out' : ''} ${ds === avui ? 'today' : ''} ${ds === ui.diaSel ? 'sel' : ''}" data-action="dia" data-date="${ds}">
        <div class="num">${d.getDate()}</div>
        ${tots.slice(0, 3).join('')}
        ${tots.length > 3 ? `<button class="more" data-action="veure-setmana" data-date="${ds}">+${tots.length - 3} més</button>` : ''}
        <div class="dots">${items.slice(0, 4).map((g) => `<i style="--c:${color(g)}"></i>`).join('')}${ems.slice(0, 2).map((g) => `<i class="em" style="--c:${color(g)}"></i>`).join('')}</div>
      </div>`;
    }
    const sel = delDia(ui.diaSel), selEm = emDia(ui.diaSel);
    body = `<div class="month"><div class="dow">${DIES.map((d) => `<div>${d}</div>`).join('')}</div><div class="grid">${cells}</div></div>
      <div class="dia-sel dia-grup">
        <h3 class="${ui.diaSel === avui ? 'avui' : ''}">${ui.diaSel === avui ? 'Avui · ' : ''}${dataLlarga(ui.diaSel)}</h3>
        ${sel.map(card).join('') + selEm.map(cardEmissio).join('') || '<p class="empty">Cap gravació aquest dia.</p>'}
        <button class="add" style="width:100%" data-action="nova-dia" data-date="${ui.diaSel}">+ Afegir gravació</button>
      </div>`;
  } else {
    const s = mondayOf(c), e = addDays(s, 6);
    titol = `${s.getDate()} ${MESOS[s.getMonth()].slice(0, 3)}. – ${e.getDate()} ${MESOS[e.getMonth()].slice(0, 3)}. ${e.getFullYear()}`;
    body = '<div class="week">' + [0, 1, 2, 3, 4, 5, 6].map((i) => {
      const d = addDays(s, i), ds = ymd(d), items = delDia(ds);
      return `<section class="wday ${ds === avui ? 'today' : ''}">
        <header data-action="nova-dia" data-date="${ds}"><span>${DIES_LLARGS[i]}</span><b>${d.getDate()}</b></header>
        ${items.map(card).join('') + emDia(ds).map(cardEmissio).join('') || '<p class="empty">Cap gravació</p>'}
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
        <label class="check"><input type="checkbox" data-filter="emissions" ${ui.veureEmissions ? 'checked' : ''}> Emissions</label>
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
        <select data-filter="tipus" aria-label="Què es mostra">
          <option value="gravacions" ${ui.agendaTipus === 'gravacions' ? 'selected' : ''}>Només gravacions</option>
          <option value="tots" ${ui.agendaTipus === 'tots' ? 'selected' : ''}>Gravacions i emissions</option></select>
        <label class="check"><input type="checkbox" data-filter="properes" ${ui.nomesProperes ? 'checked' : ''}> Només properes</label>
        <button class="btn" data-action="imprimeix" data-que="agenda">🖨 Imprimeix</button>
      </div>
    </div>
    <div id="taula"></div>`;
  renderTaula();
}
function renderTaula() {
  const avui = ymd(new Date());
  const q = ui.cerca.trim().toLowerCase();
  const rows = visibles()
    .filter((g) => ui.agendaTipus === 'tots' || g.data)
    .filter((g) => !ui.filtreEstat || g.estat === ui.filtreEstat)
    .filter((g) => !ui.nomesProperes || !dataRef(g) || (g.data || '') >= avui || (g.emissio || '') >= avui)
    .filter((g) => !q || [titolG(g), ...nomsConvidats(g), g.notes, textMusica(g), g.estudi, progNom(g), ...equip(g)].join(' ').toLowerCase().includes(q))
    .sort(ordena);
  ui.filesAgenda = rows;
  const t = $('#taula');
  if (!rows.length) {
    t.innerHTML = `<div class="panel" style="padding:24px;text-align:center"><p class="empty">No hi ha cap gravació${ui.nomesProperes ? ' programada' : ''} amb aquests filtres.</p>
      <button class="btn primary" data-action="nova-dia" data-date="${avui}" style="margin-top:10px">+ Nova gravació</button></div>`;
    return;
  }
  // Ordinador: taula
  const taula = `<div class="panel agenda-taula"><table>
    <thead><tr><th>Gravació</th><th>Horari</th><th>Emissió</th><th>Programa</th><th>Títol</th><th>Estudi</th><th>Equip</th><th>Convidats</th><th>Feina</th><th>Estat</th><th></th></tr></thead>
    <tbody>${rows.map((g) => `<tr class="${g.estat === 'cancellat' ? 'cancel' : ''} ${g.data ? 'gravacio' : 'nomes-emissio'}" style="--c:${color(g)}">
      <td class="nowrap">${dataCurta(g.data)}</td>
      <td class="nowrap">${g.data ? horari(g) : '—'}</td>
      <td class="nowrap">${g.emissio ? `${dataCurta(g.emissio)}${g.horaEmissio ? ' · ' + esc(g.horaEmissio) : ''}` : '—'}</td>
      <td><div class="prog">${coverProg(prog(g.programaId))}${esc(progNom(g))}</div></td>
      <td>${esc(titolG(g))}${g.enllac ? ` <a href="${esc(g.enllac)}" target="_blank" rel="noopener" title="Notícia publicada">📰</a>` : ''}</td>
      <td class="nowrap">${esc(g.estudi || '—')}</td>
      <td>${esc(equip(g).join(', ') || '—')}</td>
      <td>${esc(nomsConvidats(g).join(', ') || '—')}</td>
      <td class="nowrap">${g.estat !== 'cancellat' ? checkBadge(g) : ''}</td>
      <td><select data-estat="${g.id}" aria-label="Estat">${estatOptions(g.estat)}</select></td>
      <td><button class="btn small" data-action="edita" data-id="${g.id}">Edita</button></td>
    </tr>`).join('')}</tbody></table></div>`;
  // Mòbil: targetes agrupades per dia
  const grups = {};
  rows.forEach((g) => { const k = dataRef(g); (grups[k] = grups[k] || []).push(g); });
  const targetes = `<div class="agenda-cards">${Object.entries(grups).map(([ds, gs]) => `
    <div class="dia-grup"><h3 class="${ds === avui ? 'avui' : ''}">${!ds ? 'Sense data' : (ds === avui ? 'Avui · ' : '') + dataLlarga(ds)}</h3>${gs.map(card).join('')}</div>`).join('')}</div>`;
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
          <div class="sub"><span class="dot" style="--c:${p.color}"></span>${p.tipus === 'podcast' ? 'Podcast' : 'Programa'} · ${gs.length} episodis</div>
          <div class="sub">${properes.length ? `Propera: ${dataCurta(properes[0].data)}, ${properes[0].hora}` : 'Cap gravació programada'}</div>
          <div class="acts"><button class="btn small" data-action="edita-programa" data-id="${p.id}">Edita</button>
            <button class="btn small" data-action="filtra-programa" data-id="${p.id}">Calendari</button></div>
        </div>
      </div>`;
    }).join('') || '<p class="empty">Encara no hi ha programes. Crea el primer!</p>'}</div>
    ${estadistiques()}`;
}

/* ---------- Estadístiques ---------- */
// Programa triat a les estadístiques ('' = tots)
const progStats = () => (ui.progStats && prog(ui.progStats) ? ui.progStats : '');
const delProg = (llista) => (progStats() ? llista.filter((g) => g.programaId === progStats()) : llista);
// Un programa «de convidats» té episodis amb convidats; un «musical», episodis amb artistes
const teConvidats = () => delProg(state.gravacions).some((g) => (g.convidatsIds || []).length) || (!progStats() && convidatsPers().length);
const teArtistes = () => delProg(state.gravacions).some((g) => artistesDe(g).length);
// Artistes que surten als episodis: { nom, eps: [episodis] }
function artistes(eps) {
  const m = new Map();
  eps.forEach((g) => artistesDe(g).forEach((nom) => {
    const k = clauCerca(nom);
    if (!m.has(k)) m.set(k, { nom: nom.trim(), eps: [] });
    if (!m.get(k).eps.includes(g)) m.get(k).eps.push(g);
  }));
  return [...m.values()].sort((a, b) => a.nom.localeCompare(b.nom, 'ca'));
}
// Grups de les targetes: [títol, llista]
function grupsStats() {
  const any = ui.anyStats || new Date().getFullYear(), avui = ymd(new Date());
  const tots = delProg(state.gravacions);
  const hist = any === 'tots';
  const del = hist ? tots : tots.filter((g) => dataRef(g).startsWith(String(any)));
  const pid = progStats();
  const grups = {
    gravats: [`Episodis gravats ${hist ? '· històric' : any}`, del.filter((g) => GRAVADA.includes(g.estat))],
    publicats: [`Publicats ${hist ? '· històric' : any}`, del.filter((g) => g.estat === 'publicat')],
    perPublicar: ['Pendents de publicar', tots.filter((g) => g.estat === 'gravat' || g.estat === 'editat')],
    perGravar: ['Pendents de gravar', tots.filter((g) => g.estat === 'pendent' || g.estat === 'confirmat')],
  };
  if (teConvidats()) {
    const conv = convidatsPers();
    const delPrograma = (p) => !pid || historial(p).some((g) => g.programaId === pid);
    grups.vinguts = ['Convidats que ja han vingut', conv.filter((p) => historial(p).some((g) => (!pid || g.programaId === pid) && jaGravada(g, avui)))];
    // Els potencials sense cap episodi encara no són de cap programa: surten a tots els programes amb convidats
    grups.potencials = ['Convidats potencials', conv.filter((p) => p.potencial && (delPrograma(p) || !historial(p).length))];
  }
  if (teArtistes()) {
    // Cada artista porta tots els seus episodis, per veure si un previst ja havia sortit
    const totsArt = artistes(tots.filter((g) => g.estat !== 'cancellat'));
    grups.artistesFets = ['Artistes que ja han sortit', totsArt.filter((x) => x.eps.some((g) => jaGravada(g, avui)))];
    grups.artistesPrevistos = ['Artistes previstos', totsArt.filter((x) => x.eps.some((g) => !jaGravada(g, avui)))];
  }
  return grups;
}
const filaEpisodi = (g) => `<button class="fila" data-action="edita" data-id="${g.id}">
  <span class="dot" style="--c:${color(g)}"></span><b>${esc(titolG(g))}</b><span class="badge ${g.estat}">${estatNom(g.estat)}</span>
  <span class="det">${esc(progNom(g))}${g.data ? ' · gravació ' + dataCurta(g.data) : ''}${g.emissio ? ' · emissió ' + dataCurta(g.emissio) : ''}${nomsConvidats(g).length && nomsConvidats(g).join(', ') !== g.titol ? ' · ' + esc(nomsConvidats(g).join(', ')) : ''}</span></button>`;
const filaConvidat = (p) => {
  const h = historial(p), fets = h.filter((g) => jaGravada(g));
  return `<button class="fila" data-action="edita-persona" data-id="${p.id}">
    <span class="avatar conv mini">${esc(inicials(p.nom))}</span><b>${esc(p.nom)}</b>${p.potencial ? '<span class="badge potencial">Potencial</span>' : ''}
    <span class="det">${fets.length ? `Ha vingut ${fets.length} ${fets.length === 1 ? 'vegada' : 'vegades'}: ${fets.map((g) => esc(titolG(g)) + ' (' + esc(progNom(g)) + ')').join(', ')}`
      : h.length ? `Previst: ${esc(titolG(h.filter((g) => !jaGravada(g)).pop() || h[0]))}` : 'Encara no ha vingut'}</span></button>`;
};
const filaArtista = (a) => `<button class="fila" data-action="edita" data-id="${a.eps[0].id}">
  <span class="avatar conv mini">🎸</span><b>${esc(a.nom)}</b>${a.eps.length > 1 ? `<span class="badge repetit">⚠ Surt en ${a.eps.length} episodis</span>` : ''}<span class="hint">${a.eps.length} ${a.eps.length === 1 ? 'episodi' : 'episodis'}</span>
  <span class="det">${a.eps.map((g) => `${esc(titolG(g))} (${estatNom(g.estat)})`).join(' · ')}</span></button>`;
// Llistat desplegat sota les targetes (segons la xifra tocada i el cercador)
function llistaStats() {
  const sel = ui.statsSel, q = clauCerca(ui.cercaStats);
  const coincideix = (txt) => !q || q.split(' ').every((w) => clauCerca(txt).includes(w));
  const textEp = (g) => [titolG(g), g.notes, textMusica(g), ...nomsConvidats(g), progNom(g)].join(' ');
  if (!sel && !q) return '';
  let titol, eps = [], gent = [], arts = [];
  const grups = grupsStats();
  if (!sel || !grups[sel.tipus] && sel.tipus !== 'mes' && sel.tipus !== 'prog') {
    titol = 'Resultats de la cerca';
    eps = delProg(state.gravacions);
    if (teConvidats()) gent = grups.potencials ? [...new Set([...convidatsPers().filter((p) => !progStats() || historial(p).some((g) => g.programaId === progStats())), ...grups.potencials[1]])] : [];
  } else if (sel.tipus === 'mes' || sel.tipus === 'prog') {
    const p = prog(sel.prog);
    eps = grups.gravats[1].filter((g) => (g.programaId || '') === sel.prog && (sel.tipus === 'prog' || periode(sel.mes)(g)));
    const any = ui.anyStats || new Date().getFullYear();
    titol = `${p?.nom || 'Sense programa'} · ${sel.tipus === 'mes' ? (sel.mes > 12 ? sel.mes : cap(MESOS[sel.mes - 1]) + ' ' + any) : (any === 'tots' ? 'històric' : any)}`;
  } else {
    const [nom, llista] = grups[sel.tipus];
    titol = nom;
    if (sel.tipus === 'vinguts' || sel.tipus === 'potencials') gent = llista;
    else if (sel.tipus.startsWith('artistes')) arts = llista;
    else eps = llista;
  }
  eps = eps.filter((g) => coincideix(textEp(g))).sort(ordena);
  gent = gent.filter((p) => coincideix([p.nom, p.notes].join(' ')));
  arts = arts.filter((a) => coincideix(a.nom + ' ' + a.eps.map(textEp).join(' ')));
  const n = (x, u, v) => (x.length ? `${x.length} ${x.length === 1 ? u : v}` : '');
  const parts = [[gent, 'Convidats', filaConvidat], [arts, 'Artistes', filaArtista], [eps, 'Episodis', filaEpisodi]].filter(([x]) => x.length);
  ui.llistaStats = { titol: titol + (q ? ` · cerca «${ui.cercaStats}»` : ''), gent, arts, eps };
  return `<div class="panel llista-stats">
    <div class="cap-llista"><b>${esc(titol)}</b><span class="hint">${[n(gent, 'convidat', 'convidats'), n(arts, 'artista', 'artistes'), n(eps, 'episodi', 'episodis')].filter(Boolean).join(' · ')}</span>
      <span class="acts-llista">${parts.length ? '<button class="btn small" data-action="imprimeix" data-que="stats">🖨 Imprimeix</button>' : ''}${sel ? '<button class="btn small" data-action="stats" data-tipus="">Tanca</button>' : ''}</span></div>
    ${!parts.length ? `<p class="empty" style="padding:12px">${q ? `Cap coincidència: «${esc(ui.cercaStats)}» no ha sortit mai${progStats() ? ' a ' + esc(prog(progStats()).nom) : ''}.` : 'No hi ha res en aquest llistat.'}</p>` : ''}
    ${parts.map(([x, nom, fila]) => (parts.length > 1 ? `<h4>${nom}</h4>` : '') + x.map(fila).join('')).join('')}
  </div>`;
}
// Període de la taula: 1–12 = mes de l'any triat; un número d'any (p. ex. 2026) = tot aquell any (vista històrica)
const periode = (m) => (m > 12 ? (g) => dataRef(g).startsWith(String(m)) : (g) => Number(dataRef(g).slice(5, 7)) === m);
function estadistiques() {
  const anys = [...new Set([new Date().getFullYear(), ...state.gravacions.filter(dataRef).map((g) => Number(dataRef(g).slice(0, 4)))])].sort((a, b) => b - a);
  const any = ui.anyStats || new Date().getFullYear();
  const hist = any === 'tots';
  const del = hist ? delProg(state.gravacions) : delProg(state.gravacions).filter((g) => dataRef(g).startsWith(String(any)));
  // Files de la taula: els mesos de l'any triat, o els anys a la vista històrica
  const periodes = hist
    ? [...new Set(del.filter(dataRef).map((g) => Number(dataRef(g).slice(0, 4))))].sort((a, b) => a - b).map((y) => ({ m: y, llarg: String(y), curt: String(y) }))
    : MESOS.map((nom, i) => ({ m: i + 1, llarg: cap(nom), curt: cap(nom).slice(0, 3) }));
  const gravades = del.filter((g) => GRAVADA.includes(g.estat));
  const publicades = del.filter((g) => g.estat === 'publicat');
  const progs = progStats() ? [prog(progStats())]
    : [...state.programes, ...(del.some((g) => !prog(g.programaId)) ? [{ id: '', nom: 'Sense programa', color: '#868E96' }] : [])];
  const compta = (llista, pid, mes) => llista.filter((g) => (g.programaId || '') === pid && periode(mes)(g)).length;
  const max = Math.max(1, ...progs.flatMap((p) => periodes.map(({ m }) => compta(gravades, p.id, m))));

  const files = periodes.map(({ m: mes, llarg, curt }) => {
    const total = progs.reduce((s, p) => s + compta(gravades, p.id, mes), 0);
    return `<tr class="${total ? '' : 'buit'}"><th><span class="llarg">${llarg}</span><span class="curt">${curt}</span></th>${progs.map((p) => {
      const gv = compta(gravades, p.id, mes), pb = compta(publicades, p.id, mes);
      const sel = ui.statsSel?.tipus === 'mes' && ui.statsSel.prog === p.id && ui.statsSel.mes === mes;
      return `<td><button class="barra ${sel ? 'on' : ''}" style="--c:${p.color}" data-action="stats" data-tipus="mes" data-prog="${p.id}" data-mes="${mes}" ${gv ? '' : 'disabled'}><i style="width:${(gv / max) * 100}%"></i><span><span class="llarg">${gv ? `${gv} grav.${pb ? ` · ${pb} publ.` : ''}` : '—'}</span><span class="curt">${gv ? `${gv}${pb ? ` · ${pb}` : ''}` : '—'}</span></span></button></td>`;
    }).join('')}</tr>`;
  }).join('');
  const totals = `<tr class="total"><th>Total</th>${progs.map((p) => {
    const gv = gravades.filter((g) => (g.programaId || '') === p.id).length, pb = publicades.filter((g) => (g.programaId || '') === p.id).length;
    return `<td><button class="total-prog ${ui.statsSel?.tipus === 'prog' && ui.statsSel.prog === p.id ? 'on' : ''}" data-action="stats" data-tipus="prog" data-prog="${p.id}"><b>${gv}</b> grav. · <b>${pb}</b> publ.</button></td>`;
  }).join('')}</tr>`;
  const placeholder = teConvidats() && teArtistes() ? 'Cerca un convidat o artista' : teArtistes() ? 'Cerca un artista o disc' : 'Cerca un convidat';

  return `<div class="panel escolta-panel">
      <div><b>🎧 Escolta un programa</b><span class="hint">Tria el fitxer a Arxius (carpeta del programa o Al meu iPhone → BookPlayer). No es puja enlloc.</span></div>
      <div class="grp" style="width:auto">
        <button class="btn primary" data-action="escolta">▶ Tria i escolta</button>
        <a class="btn" href="bookplayer://">Obre Book Player</a>
      </div>
    </div>
    <div class="stats">
    <div class="toolbar" style="margin-top:28px"><div class="grp" style="width:auto"><h2 style="margin:0">Estadístiques</h2></div>
      <div class="grp" style="width:auto">
        <select data-filter="progStats" aria-label="Programa" style="width:auto">${progOptions(progStats(), 'Tots els programes')}</select>
        <select data-filter="any" aria-label="Any" style="width:auto">${anys.map((a) => `<option ${a === any ? 'selected' : ''}>${a}</option>`).join('')}<option value="tots" ${hist ? 'selected' : ''}>Històric</option></select>
      </div></div>
    <div class="metrics">${Object.entries(grupsStats()).map(([k, [nom, llista]]) =>
      `<button class="metric ${ui.statsSel?.tipus === k ? 'on' : ''}" data-action="stats" data-tipus="${k}"><span>${esc(nom)}</span><b>${llista.length}</b></button>`).join('')}
    </div>
    <div class="toolbar"><input type="search" id="cercaStats" value="${esc(ui.cercaStats || '')}" placeholder="🔎 ${placeholder} per saber si ja ha sortit…"></div>
    <div id="statsLlista">${llistaStats()}</div>
    <div class="panel"><table class="taula-stats">
      <thead><tr><th>${hist ? 'Any' : 'Mes'}</th>${progs.map((p) => `<th><span class="dot" style="--c:${p.color}"></span>${esc(p.nom)}</th>`).join('')}</tr></thead>
      <tbody>${files}${totals}</tbody></table></div>
    <p class="hint" style="margin-top:8px">Toca una xifra, un mes o un total per veure'n el llistat. «Gravats» compta els episodis en estat Gravat, Editat o Publicat. «Publicats», només els Publicats. Si un episodi no té data de gravació, es compta pel mes d'emissió.</p>
  </div>`;
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
    <div class="row">
      <label>Format dels episodis <select name="format">
        <option value="entrevista" ${!esMusical(p.id) ? 'selected' : ''}>Entrevista amb un convidat</option>
        <option value="musical" ${esMusical(p.id) ? 'selected' : ''}>Musical (artistes i discos)</option></select></label>
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
      Object.assign(p, { nom, tipus: f.get('tipus'), color: f.get('color'), imatge, format: f.get('format') });
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
const historial = (p) => state.gravacions
  .filter((g) => (g.convidatsIds || []).includes(p.id) && g.estat !== 'cancellat')
  .sort((a, b) => ordena(b, a));

function renderPersones(m) {
  m.innerHTML = `
    <div class="cerca-fixa">
      <input type="search" id="cercaConv" placeholder="🔎 Cerca una fitxa pel nom…" value="${esc(ui.cercaConv || '')}" autocomplete="off">
      <select id="filtreConv" aria-label="Filtra convidats">${[['', 'Tots'], ['vingut', 'Ja han vingut'], ['propers', 'Amb gravació pendent'], ['potencials', 'Potencials']]
        .map(([v, n]) => `<option value="${v}" ${(ui.filtreConv || '') === v ? 'selected' : ''}>${n}</option>`).join('')}</select>
    </div>
    <div class="toolbar"><div class="grp" style="width:auto"><h2 style="margin:0">Equip</h2></div>
      <button class="btn primary" data-action="nova-persona">+ Nova persona</button></div>
    <div class="cards equip" id="llistaEquip">${llistaEquip()}</div>

    <div class="toolbar" style="margin-top:28px"><div class="grp" style="width:auto"><h2 style="margin:0">Convidats <span class="hint" id="compteConv"></span></h2></div>
      <div class="grp" style="width:auto"><button class="btn" data-action="imprimeix" data-que="convidats">🖨 Imprimeix</button>
      <button class="btn primary" data-action="nou-convidat">+ Nou convidat</button></div></div>
    <div class="cards equip" id="llistaConv">${llistaConvidats()}</div>`;
  // El cercador queda just sota la capçalera quan es baixa la pantalla
  document.documentElement.style.setProperty('--alt-cap', (document.querySelector('header')?.offsetHeight || 0) + 'px');
  $('#compteConv').textContent = compteConv();
}
const coincideixNom = (txt) => { const q = clauCerca(ui.cercaConv); return !q || q.split(' ').every((w) => clauCerca(txt).includes(w)); };
function llistaEquip() {
  const avui = ymd(new Date());
  const gent = equipPers().filter((p) => coincideixNom([p.nom, p.rol].join(' ')));
  if (!gent.length && ui.cercaConv) return '<p class="empty">Ningú de l\'equip coincideix amb la cerca.</p>';
  return gent.map((p) => {
      const n = state.gravacions.filter((g) => g.data >= avui && g.estat !== 'cancellat' && (g.tecnic === p.id || (g.presentadors || []).includes(p.id))).length;
      return `<div class="item persona">
        <div class="avatar">${esc(inicials(p.nom))}</div>
        <div class="in">
          <h3>${esc(p.nom)}</h3>
          <div class="sub">${esc(p.rol || 'Sense rol')} · ${n} gravacions properes</div>
        </div>
        <button class="btn small" data-action="edita-persona" data-id="${p.id}">Edita</button>
      </div>`;
  }).join('') || '<p class="empty">Encara no hi ha ningú. Afegeix presentadors, tècnics, productors…</p>';
}
const compteConv = () => { const n = $('#llistaConv')?.querySelectorAll('.item').length || 0, t = convidatsPers().length; return n === t ? `(${t})` : `(${n} de ${t})`; };
function llistaConvidats() {
  const q = ui.cercaConv || '';
  const avui = ymd(new Date());
  const f = ui.filtreConv || '';
  const conv = convidatsPers()
    .filter((p) => coincideixNom([p.nom, p.notes, p.email, p.telefon].join(' ')))
    .map((p) => {
      const h = historial(p);
      return { p, vingut: h.filter((g) => jaGravada(g, avui)), propera: h.filter((g) => !jaGravada(g, avui)).pop() };
    })
    .filter(({ p, vingut, propera }) => !f || (f === 'vingut' && vingut.length) || (f === 'propers' && propera) || (f === 'potencials' && p.potencial));
  ui.filesConv = conv;
  return conv.map(({ p, vingut, propera }) => {
    return `<div class="item persona">
      <div class="avatar conv">${esc(inicials(p.nom))}</div>
      <div class="in">
        <h3>${esc(p.nom)}${p.potencial ? ' <span class="badge potencial">Potencial</span>' : ''}</h3>
        <div class="sub">${vingut.length ? `Ha vingut ${vingut.length} ${vingut.length === 1 ? 'vegada' : 'vegades'} · ${vingut[0].numero ? `Ep. ${vingut[0].numero}` : esc(vingut[0].titol)} · ${esc(progNom(vingut[0]))}` : 'Encara no ha vingut'}</div>
        ${propera ? `<div class="sub">Propera: <b>${propera.data ? 'gravació ' + dataCurta(propera.data) : (propera.emissio ? 'emissió ' + dataCurta(propera.emissio) : 'sense data')}</b> (${esc(titolG(propera))})</div>` : ''}
        <div class="sub contacte">
          ${p.telefon ? `<a href="tel:${esc(p.telefon.replace(/\s+/g, ''))}">📞 ${esc(p.telefon)}</a>` : ''}
          ${waLink(p.telefon) ? `<a href="${esc(waLink(p.telefon, missatgeConv(p)))}" target="_blank" rel="noopener">💬 WhatsApp</a>` : ''}
          ${p.email ? `<a href="mailto:${esc(p.email)}">✉️ ${esc(p.email)}</a>` : ''}
        </div>
      </div>
      <button class="btn small" data-action="edita-persona" data-id="${p.id}">Fitxa</button>
    </div>`;
  }).join('') || `<p class="empty">${q || f ? 'Cap convidat coincideix amb la cerca.' : 'Encara no hi ha cap convidat. Els pots crear aquí o directament des d\'una gravació.'}</p>`;
}

function openPersona(p, tipus) {
  const nou = !p;
  p = p || (tipus === 'convidat'
    ? { id: uid(), nom: '', tipus: 'convidat', telefon: '', email: '', notes: '' }
    : { id: uid(), nom: '', rol: '' });
  const esConv = p.tipus === 'convidat';
  const h = esConv && !nou ? historial(p) : [];
  openDialog(`
    <h3>${nou ? (esConv ? 'Nou convidat' : 'Nova persona') : (esConv ? 'Fitxa del convidat' : 'Edita persona')}</h3>
    <label>Nom <input name="nom" value="${esc(p.nom)}" required></label>
    ${esConv ? `
      <div class="grp" style="width:auto">
        <button type="button" class="btn small" data-dlg="contacte">📇 Des dels contactes</button>
        <input type="file" id="fitxerVcf" accept=".vcf,text/vcard,text/x-vcard" hidden>
      </div>
      <div class="row">
        <label>Telèfon <input type="tel" name="telefon" value="${esc(p.telefon)}" placeholder="600 000 000"></label>
        <label>Correu <input type="email" name="email" value="${esc(p.email)}" placeholder="nom@exemple.com"></label>
      </div>
      <div class="grp" style="width:auto">
        <button type="button" class="btn small" data-dlg="invitacio">✉️ Envia la invitació</button>
        <button type="button" class="btn small" data-dlg="whatsapp">💬 Envia un WhatsApp</button>
        ${(state.estudis.filter(mapaEstudi).length ? state.estudis.filter(mapaEstudi) : ['']).map((e, i, ll) =>
          `<button type="button" class="btn small" data-dlg="ubicacio" data-estudi="${esc(e)}">📍 Envia la ubicació${ll.length > 1 ? ' · ' + esc(e) : ''}</button>`).join('')}
        ${proximaGravacio(p) ? '<span class="hint">El WhatsApp porta el recordatori de la propera gravació</span>' : ''}
      </div>
      <label>Notes <textarea name="notes" rows="3" placeholder="Temes, com el vam conèixer, preferències…">${esc(p.notes)}</textarea></label>
      <label class="check"><input type="checkbox" name="potencial" ${p.potencial ? 'checked' : ''}> Convidat potencial (encara per confirmar)</label>
      ${nou ? '' : `<fieldset><legend>Historial (${h.length})</legend>
        ${h.length ? `<ul class="historial">${h.map((g) => `<li><button type="button" data-dlg="obre-grav" data-id="${g.id}">
          <span class="dot" style="--c:${color(g)}"></span><b>${dataCurta(g.data || g.emissio)}</b> · ${esc(progNom(g))} · ${esc(titolG(g))} <span class="badge ${g.estat}">${estatNom(g.estat)}</span></button></li>`).join('')}</ul>`
          : '<span class="hint">Encara no ha participat en cap gravació.</span>'}
      </fieldset>`}`
    : `<label>Rol <input name="rol" value="${esc(p.rol)}" placeholder="Presentació, tècnica de so, producció…"></label>`}`, {
    onSave(f) {
      const nom = f.get('nom').trim();
      if (!nom) { toast('Cal posar un nom.'); return false; }
      if (esConv) Object.assign(p, { nom, telefon: f.get('telefon').trim(), email: f.get('email').trim(), notes: f.get('notes').trim(), potencial: f.get('potencial') === 'on' });
      else Object.assign(p, { nom, rol: f.get('rol').trim() });
      if (nou) state.persones.push(p);
      if (esConv) state.gravacions.forEach((g) => {   // manté al dia el text de convidats (per al calendari)
        if ((g.convidatsIds || []).includes(p.id)) g.convidats = g.convidatsIds.map(pers).filter(Boolean).map((x) => x.nom).join(', ');
      });
    },
    onDelete: nou ? null : () => {
      if (!confirm(`Eliminar ${p.nom}? Es traurà de totes les gravacions.`)) return false;
      state.persones = state.persones.filter((x) => x.id !== p.id);
      state.gravacions.forEach((g) => {
        g.presentadors = (g.presentadors || []).filter((id) => id !== p.id);
        if (g.tecnic === p.id) g.tecnic = '';
        if ((g.convidatsIds || []).includes(p.id)) {
          g.convidatsIds = g.convidatsIds.filter((id) => id !== p.id);
          g.convidats = g.convidatsIds.map(pers).filter(Boolean).map((x) => x.nom).join(', ');
        }
      });
    },
    onExtra(a, b) {
      if (a === 'obre-grav') {
        const g = state.gravacions.find((x) => x.id === b.dataset.id);
        if (g) { closeDialog(); openGravacio(g); }
      }
      if (a === 'contacte') triaContacte();
      if (a === 'invitacio') {
        const f = $('#dlgForm').elements;
        const nomP = f.nom.value.trim() || p.nom, ag = contacteAgenda(nomP);
        return openInvitacio({ nom: nomP, tel: f.telefon.value.trim() || ag?.tels?.[0] || '', email: f.email.value.trim() || ag?.emails?.[0] || '', p: nou ? null : p });
      }
      if (a === 'whatsapp') {
        const f = $('#dlgForm').elements;
        const enllac = waLink(f.telefon.value || contacteAgenda(f.nom.value.trim() || p.nom)?.tels?.[0], missatgeConv({ ...p, nom: f.nom.value.trim() || p.nom }));
        if (enllac) window.open(enllac, '_blank', 'noopener');
        else toast('Cal posar un telèfon mòbil vàlid.');
      }
      if (a === 'ubicacio') {
        const estudi = b.dataset.estudi;
        if (!estudi) { toast("Primer desa l'adreça de l'estudi a Ajustos → Estudis i sales."); return; }
        const f = $('#dlgForm').elements;
        const qui = { ...p, nom: f.nom.value.trim() || p.nom };
        const g = proximaGravacio(p);
        const text = g && g.estudi === estudi ? missatgeGrav(qui, g)
          : `Hola ${(qui.nom || '').split(' ')[0]}! Aquí tens la ubicació de ${estudi}:\n📍 ${mapaEstudi(estudi)}`;
        const enllac = waLink(f.telefon.value, text);
        if (enllac) window.open(enllac, '_blank', 'noopener');
        else toast('Cal posar un telèfon mòbil vàlid.');
      }
    },
  });
  $('#fitxerVcf')?.addEventListener('change', async (e) => {
    const file = e.target.files[0];
    e.target.value = '';
    if (!file) return;
    try {
      const llista = llegeixVcard(await file.text());
      if (!llista.length) { toast("Aquest fitxer no té cap contacte."); return; }
      const nomForm = $('#dlgForm').elements.nom.value.trim();
      if (llista.length === 1) return omplePersona(llista[0]);
      // Fitxer amb molts contactes (l'agenda sencera): es busca el del convidat pel nom
      const c = cercaContacte(llista, nomForm);
      if (c) omplePersona(c);
      else toast(nomForm ? `No he trobat «${nomForm}» en aquest fitxer de contactes.` : 'Escriu primer el nom del convidat.');
    } catch (err) { toast("No s'ha pogut llegir el contacte."); }
  });
}

/* ---------- WhatsApp ---------- */
// Número en format internacional sense «+» (els de 9 xifres s'entenen d'Espanya)
function waNum(tel) {
  let d = String(tel || '').trim().replace(/[^\d+]/g, '');
  if (d.startsWith('+')) d = d.slice(1);
  else if (d.startsWith('00')) d = d.slice(2);
  else if (d.length === 9) d = '34' + d;
  return /^\d{10,15}$/.test(d) ? d : '';
}
const waLink = (tel, text) => (waNum(tel) ? `https://wa.me/${waNum(tel)}${text ? '?text=' + encodeURIComponent(text) : ''}` : '');
const proximaGravacio = (p) => historial(p).filter((g) => g.data && g.data >= ymd(new Date())).pop();
// Enllaç de mapa de l'estudi: si s'ha desat un enllaç, aquest; si és una adreça, una cerca a Google Maps
const mapaEstudi = (nom) => {
  const v = String(state.ubicacions?.[nom] || '').trim();
  return !v ? '' : /^https?:\/\//i.test(v) ? v : `https://maps.google.com/?q=${encodeURIComponent(v)}`;
};
// Recordatori d'una gravació per a un convidat (es pot canviar abans d'enviar)
function missatgeGrav(p, g) {
  const nom = (p.nom || '').split(' ')[0];
  const mapa = mapaEstudi(g.estudi);
  return `Hola ${nom}! Et recordo la gravació de «${progNom(g)}» el ${dataLlarga(g.data)} a les ${g.hora}${g.estudi ? ` a ${g.estudi}` : ''}.`
    + (mapa ? `\n📍 Com arribar-hi: ${mapa}` : '') + '\nFins aviat!';
}
// Missatge inicial de la fitxa: si té una gravació programada, el recordatori
function missatgeConv(p) {
  const g = proximaGravacio(p);
  return g ? missatgeGrav(p, g) : `Hola ${(p.nom || '').split(' ')[0]}!`;
}

/* ---------- Contactes: omplir la fitxa del convidat ---------- */
const clauCerca = (s) => String(s || '').trim().toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/\s+/g, ' ');

// Busca un contacte pel nom: primer exacte; si no, el que contingui totes les paraules del nom
function cercaContacte(llista, nom) {
  const q = clauCerca(nom);
  if (!q) return null;
  const exacte = llista.find((c) => clauCerca(c.nom) === q);
  if (exacte) return exacte;
  const paraules = q.split(' ');
  const parcials = llista.filter((c) => { const n = clauCerca(c.nom).split(' '); return paraules.every((p) => n.includes(p)); });
  return parcials.length === 1 ? parcials[0] : null;
}

// Si el navegador deixa triar de l'agenda (Contact Picker), s'obre l'agenda; si no, es tria un fitxer .vcf
async function triaContacte() {
  if (navigator.contacts?.select) {
    try {
      const [c] = await navigator.contacts.select(['name', 'tel', 'email'], { multiple: false });
      if (c) omplePersona({ nom: c.name?.[0] || '', telefon: c.tel?.[0] || '', email: c.email?.[0] || '' });
      return;
    } catch (err) { /* si falla, es fa servir el fitxer */ }
  }
  $('#fitxerVcf').click();
}

function omplePersona(c) {
  const f = $('#dlgForm').elements;
  if (c.nom && !f.nom.value.trim()) f.nom.value = c.nom;
  if (c.telefon) f.telefon.value = c.telefon;
  if (c.email) f.email.value = c.email;
  const omplert = [c.telefon && 'telèfon', c.email && 'correu'].filter(Boolean);
  toast(omplert.length ? `Afegit: ${omplert.join(' i ')}. Toca «Desa» per guardar-ho.` : 'Aquest contacte no té telèfon ni correu.');
}

// Llegeix un fitxer vCard (.vcf): nom, primer telèfon (preferit el mòbil) i primer correu de cada contacte
function llegeixVcard(text) {
  const linies = text.replace(/\r\n/g, '\n').replace(/\n[ \t]/g, '').split('\n');
  const desescapa = (s) => s.replace(/\\n/gi, ' ').replace(/\\([,;\\])/g, '$1').trim();
  const out = [];
  let c = null;
  for (const l of linies) {
    const i = l.indexOf(':');
    if (i < 0) continue;
    const cap = l.slice(0, i).toUpperCase(), valor = l.slice(i + 1);
    const prop = cap.split(';')[0].replace(/^ITEM\d+\./, '');
    if (prop === 'BEGIN' && /VCARD/i.test(valor)) c = { nom: '', n: '', tels: [], email: '', emails: [], empresa: '', notes: '' };
    else if (!c) continue;
    else if (prop === 'END') { out.push(c); c = null; }
    else if (prop === 'FN') c.nom = desescapa(valor);
    else if (prop === 'N') { const [cognom, nom] = valor.split(';').map(desescapa); c.n = [nom, cognom].filter(Boolean).join(' '); }
    else if (prop === 'TEL') c.tels.push({ v: desescapa(valor).replace(/^tel:/i, ''), mobil: /CELL|IPHONE|MOBILE/.test(cap), pref: /PREF/.test(cap) });
    else if (prop === 'EMAIL') { const e = desescapa(valor); if (!c.email) c.email = e; if (e && !c.emails.includes(e)) c.emails.push(e); }
    else if (prop === 'ORG') c.empresa = desescapa(valor.split(';')[0]);
    else if (prop === 'NOTE') c.notes = desescapa(valor);
  }
  return out.map((x) => {
    const tel = x.tels.find((t) => t.mobil) || x.tels.find((t) => t.pref) || x.tels[0];
    return { nom: x.nom || x.n || x.empresa, telefon: tel?.v || '', email: x.email,
      tels: [...new Set([tel, ...x.tels].filter(Boolean).map((t) => t.v).filter(Boolean))], emails: x.emails, empresa: x.empresa, notes: x.notes };
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
      ${state.estudis.length ? `<form id="formUbic" class="ubicacions">
        <p class="help" style="margin-top:14px"><b>📍 Ubicació</b> · S'afegeix al WhatsApp de recordatori perquè el convidat sàpiga com arribar-hi. Enganxa l'enllaç de Google Maps o d'Apple Maps (Compartir → Copiar), o escriu l'adreça.</p>
        ${state.estudis.map((s, i) => `<label>${esc(s)}
          <div class="grp"><input name="ub${i}" value="${esc(state.ubicacions[s] || '')}" placeholder="Adreça o enllaç del mapa">
          ${mapaEstudi(s) ? `<a class="btn small" href="${esc(mapaEstudi(s))}" target="_blank" rel="noopener">Obre el mapa</a>` : ''}</div></label>`).join('')}
        <button class="btn">Desa les ubicacions</button>
      </form>` : ''}
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
  $('#formUbic')?.addEventListener('submit', (e) => {
    e.preventDefault();
    const f = new FormData(e.target);
    state.estudis.forEach((s, i) => { const v = String(f.get('ub' + i) || '').trim(); if (v) state.ubicacions[s] = v; else delete state.ubicacions[s]; });
    save(); render(); toast('Ubicacions desades.');
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
  if (!g.data || !g.hora) return [];
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
    <div class="row">
      <label style="flex:3" class="no-dialeg"><span id="lblTitol">Títol o convidat</span> <input name="titol" value="${esc(g.titol)}" placeholder="Ex.: Entrevista a…"></label>
      <label style="flex:1">Núm. episodi <input type="number" inputmode="numeric" name="numero" min="0" value="${esc(g.numero ?? '')}"></label>
    </div>
    <label>Programa / podcast <select name="programaId">${progOptions(g.programaId, '— Sense programa —')}</select></label>
    <fieldset class="nomes-musical musica"><legend>🎵 Contingut de l'episodi</legend>
      <label>Tipus d'episodi <select name="tipusEp">${Object.entries(TIPUS_EP).map(([k, [nom]]) => `<option value="${k}" ${(g.tipusEp || 'dialeg') === k ? 'selected' : ''}>${nom}</option>`).join('')}</select></label>
      <label class="nomes-tematic">Tema <input name="tema" value="${esc(g.tema || '')}" placeholder="Ex.: Guitarres"></label>
      <div class="musica-cols">${[['c', 'Clàssics', g.classics], ['k', 'Contemporanis / alternatius', g.contemporanis]].map(([pre, nom, llista]) => `
        <div><h4>${nom}</h4>${[0, 1, 2, 3, 4].map((i) => `<div class="art-fila" data-i="${i}">
          <input name="${pre}_art_${i}" value="${esc(llista?.[i]?.artista || '')}" placeholder="Artista" autocomplete="off">
          <input name="${pre}_disc_${i}" value="${esc(llista?.[i]?.disc || '')}" placeholder="Disc" class="nomes-dialeg" autocomplete="off"></div>`).join('')}</div>`).join('')}
      </div>
      <button type="button" class="btn small nomes-pindola" data-dlg="omple-pindola">↺ Omple els clàssics amb els dels 4 diàlegs anteriors</button>
      <span class="hint" id="previaTitol"></span>
    </fieldset>
    <fieldset><legend>Gravació</legend>
      <div class="row">
        <label>Data <input type="date" name="data" value="${esc(g.data)}"></label>
        <label>Hora d'inici <input type="time" name="hora" value="${esc(g.hora || '10:00')}"></label>
        <label>Durada (min) <input type="number" inputmode="numeric" name="durada" min="5" step="5" value="${esc(g.durada)}"></label>
        <label>Estat <select name="estat">${estatOptions(g.estat)}</select></label>
      </div>
      <span class="hint">Si encara no saps quan es gravarà, deixa la data buida.</span>
    </fieldset>
    <fieldset><legend>Emissió</legend>
      <div class="row">
        <label>Data d'emissió <input type="date" name="emissio" value="${esc(g.emissio || '')}"></label>
        <label>Hora <input type="time" name="horaEmissio" value="${esc(g.horaEmissio || '')}"></label>
      </div>
      <label>Notícia publicada <input type="url" name="enllac" value="${esc(g.enllac || '')}" placeholder="https://…"></label>
      ${g.enllac ? `<a class="hint" href="${esc(g.enllac)}" target="_blank" rel="noopener">📰 Obre la notícia</a>` : ''}
    </fieldset>
    <label>Estudi <select name="estudi"><option value="">— Cap / fora d'estudi —</option>${estudis.map((s) => `<option ${s === g.estudi ? 'selected' : ''}>${esc(s)}</option>`).join('')}</select></label>
    <fieldset><legend>Presenten / participen</legend>
      ${equipPers().length ? `<div class="checks">${equipPers().map((p) => `<label><input type="checkbox" name="presentadors" value="${p.id}" ${(g.presentadors || []).includes(p.id) ? 'checked' : ''}> ${esc(p.nom)}</label>`).join('')}</div>`
        : '<span class="hint">Afegeix persones a la pestanya «Equip».</span>'}
    </fieldset>
    <label>Tècnic/a <select name="tecnic"><option value="">—</option>${equipPers().map((p) => `<option value="${p.id}" ${p.id === g.tecnic ? 'selected' : ''}>${esc(p.nom)}${p.rol ? ' · ' + esc(p.rol) : ''}</option>`).join('')}</select></label>
    <fieldset class="nomes-entrevista"><legend>Convidats</legend>
      ${(g.convidatsIds || []).map(pers).filter(Boolean).length ? `<div class="checks">${(g.convidatsIds || []).map(pers).filter(Boolean).map((p) => `<label><input type="checkbox" name="convidatsIds" value="${p.id}" checked> ${esc(p.nom)}</label>`).join('')}</div>` : ''}
      <label style="margin-top:8px">Afegeix convidats
        <input name="convidatsNous" list="llistaNomsConv" value="${esc((g.convidatsIds || []).length ? '' : (g.convidats || ''))}" placeholder="Escriu el nom (si ja té fitxa, s'hi enllaça)"></label>
      <datalist id="llistaNomsConv">${convidatsPers().map((p) => `<option value="${esc(p.nom)}">`).join('')}</datalist>
      <span class="hint">Per treure'n un, desmarca'l. Diversos noms, separats per comes.</span>
      ${!nou && g.data ? (g.convidatsIds || []).map(pers).filter((p) => p && waLink(p.telefon)).map((p) => `<a class="btn small" style="margin-top:8px" href="${esc(waLink(p.telefon, missatgeGrav(p, g)))}" target="_blank" rel="noopener">💬 Recordatori a ${esc(p.nom)}</a>`).join(' ') : ''}
    </fieldset>
    <fieldset><legend>Checklist de l'episodi</legend>
      <div class="checks">${CHECKLIST.map(([k, nom]) => `<label><input type="checkbox" name="checklist" value="${k}" ${g.checklist?.[k] ? 'checked' : ''}> ${nom}</label>`).join('')}</div>
    </fieldset>
    <label>Notes <textarea name="notes" rows="3">${esc(g.notes)}</textarea></label>
    ${nou || g.data ? `<fieldset class="repeteix"><legend>🔁 ${nou ? 'Repetició' : 'Copia o repeteix aquesta sessió'}</legend>
      <div class="row">
        <label>${nou ? 'Es repeteix' : 'Crea'} <select name="repeteix">
          <option value="">${nou ? 'No es repeteix' : '—'}</option>
          ${nou ? '' : '<option value="un">Una còpia un altre dia</option>'}
          <option value="7">Cada setmana</option><option value="14">Cada 2 setmanes</option><option value="mes">Cada mes</option>
        </select></label>
        <label><span id="lblFins">Fins al</span> <input type="date" name="finsA"></label>
      </div>
      <span class="hint" id="resumRep"></span>
      ${nou ? '' : '<button type="button" class="btn small" data-dlg="copia">📋 Crea les còpies</button><span class="hint">Es copien el títol, el programa, l\'hora, la durada, l\'estudi i l\'equip (no els convidats ni les notes).</span>'}
    </fieldset>` : ''}
    <p class="warn" id="avis"></p>`, {
    extraButtons: '',
    onSave(f) {
      const dades = {
        titol: f.get('titol').trim(), programaId: f.get('programaId'), data: f.get('data'), hora: f.get('hora') || '10:00',
        numero: f.get('numero') === '' ? '' : Number(f.get('numero')),
        emissio: f.get('emissio'), horaEmissio: f.get('horaEmissio'), enllac: f.get('enllac').trim(),
        durada: Math.max(5, Number(f.get('durada')) || 60), estudi: f.get('estudi'), estat: f.get('estat'),
        presentadors: f.getAll('presentadors'), tecnic: f.get('tecnic'),
        notes: f.get('notes').trim(),
        checklist: Object.fromEntries(f.getAll('checklist').map((k) => [k, true])),
      };
      // Programa musical: tipus d'episodi, tema i artistes/discos; el títol d'un diàleg es fa sol
      const musical = esMusical(dades.programaId);
      if (musical) {
        const m = llegeixMusica(f);
        Object.assign(dades, m);
        if (m.tipusEp === 'dialeg') dades.titol = titolDialeg(m) || dades.titol;
        else if (!dades.titol) dades.titol = m.tipusEp === 'tematic' ? `Temàtic ${m.tema}`.trim() : 'Píndola resum';
      }
      if (!dades.titol) { toast(musical ? 'Cal posar almenys els dos artistes.' : 'Cal posar un títol.'); return false; }
      if (!dades.data && !dades.emissio) { toast("Cal posar la data de gravació o la d'emissió."); return false; }
      const datesRep = nou && dades.data ? datesRepeticio(dades.data, f.get('repeteix'), f.get('finsA')) : [];
      if (nou && f.get('repeteix') && !datesRep.length) { toast('Tria fins a quin dia es repeteix.'); return false; }
      const xocsPrevis = [{ ...g, ...dades }, ...datesRep.map((d, i) => ({ ...g, ...dades, id: 'x' + i, data: d }))];
      const xocs = xocsPrevis.flatMap(conflictes);
      if (xocs.length) {
        const llista = [...new Set(xocs)].slice(0, 5).map((o) => `• ${dataCurta(o.data)} ${horari(o)} – ${progNom(o)}: ${o.titol}`).join('\n');
        if (!confirm(`Atenció: coincideix amb altres gravacions (mateix estudi o mateixa persona):\n\n${llista}\n\nVols desar-la igualment?`)) return false;
      }
      // Convidats: els marcats + els nous (se'ls crea la fitxa, o es reaprofita si ja existeix amb el mateix nom)
      const ids = musical ? [] : f.getAll('convidatsIds');
      String(musical ? '' : f.get('convidatsNous') || '').split(',').map((s) => s.trim()).filter(Boolean).forEach((nom) => {
        let p = convidatsPers().find((x) => x.nom.toLowerCase() === nom.toLowerCase());
        if (!p) { p = { id: uid(), nom, tipus: 'convidat', telefon: '', email: '', notes: '' }; state.persones.push(p); }
        if (!ids.includes(p.id)) ids.push(p.id);
      });
      dades.convidatsIds = ids;
      // Un convidat potencial deixa de ser-ho quan la gravació ja està confirmada
      if (dades.estat !== 'pendent' && dades.estat !== 'cancellat') ids.map(pers).forEach((p) => { if (p?.potencial) p.potencial = false; });
      dades.convidats = ids.map(pers).filter(Boolean).map((p) => p.nom).join(', ');   // text per al calendari del iPhone
      const noves = [{ ...g, ...dades }];
      if (datesRep.length) { noves[0].serie = noves[0].id; noves.push(...copiesSessio(noves[0], datesRep, { ambNotes: true })); }
      if (nou) state.gravacions.push(...noves);
      else Object.assign(g, dades);
      ui.diaSel = dataRef(dades);
      toast(noves.length > 1 ? `S'han creat ${noves.length} gravacions.` : 'Gravació desada.');
    },
    onDelete: nou ? null : () => {
      if (!confirm(`Eliminar la gravació «${g.titol}» del ${dataCurta(g.data || g.emissio)}?`)) return false;
      const seguents = g.serie ? state.gravacions.filter((x) => x.serie === g.serie && x.id !== g.id && (x.data || '') > (g.data || '')) : [];
      const totes = seguents.length && confirm(`Aquesta sessió es repeteix. Vols eliminar també les ${seguents.length} sessions següents de la sèrie?\n\nD'acord: totes les següents\nCancel·la: només aquesta`);
      const fora = new Set([g.id, ...(totes ? seguents.map((x) => x.id) : [])]);
      state.gravacions = state.gravacions.filter((x) => !fora.has(x.id));
      toast(fora.size > 1 ? `S'han eliminat ${fora.size} sessions.` : 'Gravació eliminada.');
    },
    onExtra(action) {
      if (action === 'omple-pindola') omplePindola($('#dlgForm'), g);
      if (action === 'copia') {
        const f = $('#dlgForm').elements;
        const dates = datesRepeticio(g.data, f.repeteix.value, f.finsA.value);
        if (!f.repeteix.value) { toast('Tria primer què vols crear (un altre dia, cada setmana…).'); return; }
        if (!dates.length) { toast(f.repeteix.value === 'un' ? 'Tria el dia de la còpia.' : 'Tria fins a quin dia es repeteix.'); return; }
        const copies = copiesSessio(g, dates);
        const xocs = copies.flatMap(conflictes);
        if (xocs.length) {
          const llista = [...new Set(xocs)].slice(0, 5).map((o) => `• ${dataCurta(o.data)} ${horari(o)} – ${progNom(o)}: ${o.titol}`).join('\n');
          if (!confirm(`Atenció: alguna còpia coincideix amb altres gravacions:\n\n${llista}\n\nVols crear-les igualment?`)) return;
        }
        if (copies.length > 1) g.serie = g.serie || g.id;
        state.gravacions.push(...copies);
        save(); closeDialog(); render();
        toast(copies.length === 1 ? `Còpia creada el ${dataCurta(copies[0].data)}.` : `S'han creat ${copies.length} sessions, fins al ${dataCurta(copies.at(-1).data)}.`);
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
    actualitzaFormat(f);
    if (f.elements.repeteix) {
      const tipus = f.elements.repeteix.value, base = f.elements.data.value || g.data;
      $('#lblFins').textContent = tipus === 'un' ? 'Dia de la còpia' : 'Fins al';
      f.elements.finsA.disabled = !tipus;
      const dates = base ? datesRepeticio(base, tipus, f.elements.finsA.value) : [];
      $('#resumRep').textContent = !tipus ? '' : !dates.length ? (tipus === 'un' ? 'Tria el dia.' : 'Tria fins a quin dia.')
        : `${nou ? 'A més d\'aquesta, es ' : 'Es '}${dates.length === 1 ? 'crearà' : 'crearan'} ${dates.length} ${dates.length === 1 ? 'sessió' : 'sessions'}: ${dates.slice(0, 4).map(dataCurta).join(', ')}${dates.length > 4 ? ` … fins al ${dataCurta(dates.at(-1))}` : ''}.`;
    }
  };
  f.oninput = comprova;
  f.onchange = comprova;
  comprova();
  if (!mobil.matches && nou) f.elements.titol.focus();
}

/* ---------- Formulari d'episodi musical (Blanc & Negre) ---------- */
function llegeixMusica(f) {
  const tipusEp = f.get('tipusEp') || 'dialeg', n = TIPUS_EP[tipusEp][1];
  const llista = (pre) => [0, 1, 2, 3, 4].slice(0, n).map((i) => ({ artista: String(f.get(`${pre}_art_${i}`) || '').trim(), disc: tipusEp === 'dialeg' ? String(f.get(`${pre}_disc_${i}`) || '').trim() : '' }))
    .filter((a) => a.artista).map((a) => (a.disc ? a : { artista: a.artista }));
  return { tipusEp, tema: tipusEp === 'tematic' ? String(f.get('tema') || '').trim() : '', classics: llista('c'), contemporanis: llista('k') };
}
const titolDialeg = (m) => [m.classics[0]?.artista, m.contemporanis[0]?.artista].filter(Boolean).join(' - ');
// Mostra o amaga parts del formulari segons el programa (entrevista / musical) i el tipus d'episodi
function actualitzaFormat(f) {
  if (!f.elements.tipusEp) return;
  const musical = esMusical(f.elements.programaId.value), tipus = f.elements.tipusEp.value, n = TIPUS_EP[tipus][1];
  const mostra = (sel, si) => f.querySelectorAll(sel).forEach((el) => { el.hidden = !si; });
  mostra('.nomes-musical', musical);
  mostra('.nomes-entrevista', !musical);
  mostra('.nomes-dialeg', musical && tipus === 'dialeg');
  mostra('.nomes-pindola', musical && tipus === 'pindola');
  mostra('.nomes-tematic', musical && tipus === 'tematic');
  mostra('.no-dialeg', !musical || tipus !== 'dialeg');
  f.querySelectorAll('.art-fila').forEach((el) => { el.hidden = Number(el.dataset.i) >= n; });
  $('#lblTitol').textContent = musical ? 'Títol (p. ex. Píndola resum 7)' : 'Títol o convidat';
  const previa = $('#previaTitol');
  if (previa) previa.textContent = musical && tipus === 'dialeg' ? `Títol: ${titolDialeg(llegeixMusica(new FormData(f))) || '— posa els dos artistes —'}` : '';
}
// Píndola resum: els clàssics són els dels 4 diàlegs anteriors del mateix programa
function omplePindola(f, g) {
  const num = Number(f.elements.numero.value) || Number(g.numero) || Infinity, pid = f.elements.programaId.value;
  const anteriors = state.gravacions
    .filter((x) => x.programaId === pid && x.id !== g.id && (x.tipusEp || 'dialeg') === 'dialeg' && Number(x.numero) < num && x.classics?.[0]?.artista)
    .sort((a, b) => Number(a.numero) - Number(b.numero)).slice(-4);
  if (!anteriors.length) { toast("No he trobat diàlegs anteriors. Posa primer el número d'episodi."); return; }
  anteriors.forEach((x, i) => { f.elements[`c_art_${i}`].value = x.classics[0].artista; });
  toast(`Clàssics dels episodis ${anteriors.map((x) => x.numero).join(', ')}.`);
}

/* ---------- Repeticions i còpies de sessions ---------- */
// Dates a partir d'una data: «un» = només la data triada; 7/14 = cada N dies; «mes» = el mateix dia de cada mes
function datesRepeticio(base, tipus, finsA) {
  if (!tipus || !finsA || !base) return [];
  if (tipus === 'un') return finsA !== base ? [finsA] : [];
  const out = [], b = parseYmd(base);
  for (let i = 1; out.length < 104; i++) {
    const d = tipus === 'mes' ? new Date(b.getFullYear(), b.getMonth() + i, b.getDate()) : addDays(b, Number(tipus) * i);
    if (tipus === 'mes' && d.getDate() !== b.getDate()) continue;   // p. ex. el 31 en un mes que no en té
    if (ymd(d) > finsA) break;
    out.push(ymd(d));
  }
  return out;
}
// Còpies d'una sessió en altres dates (sense convidats, número, emissió ni checklist)
function copiesSessio(src, dates, { ambNotes = false } = {}) {
  const estat = ['pendent', 'confirmat'].includes(src.estat) ? src.estat : 'confirmat';
  return dates.map((d) => ({
    id: uid(), titol: src.titol, programaId: src.programaId, data: d, hora: src.hora, durada: src.durada, estudi: src.estudi,
    estat, presentadors: [...(src.presentadors || [])], tecnic: src.tecnic || '', notes: ambNotes ? src.notes || '' : '',
    convidatsIds: [], convidats: '', checklist: {}, numero: '', emissio: '', horaEmissio: '', enllac: '',
    serie: dates.length > 1 || src.serie ? src.serie || src.id : undefined,
  }));
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
  dlgHandlers.onExtra?.(a, b);
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
    case 'nou-convidat': return openPersona(null, 'convidat');
    case 'edita-persona': return openPersona(pers(id));
    case 'escolta': return Reproductor.tria();
    case 'imprimeix': return imprimeixLlista(el.dataset.que);
    case 'importa-agenda': return importaAgenda();
    case 'nou-contacte': return openContacte(null);
    case 'contacte': { const c = state.agenda.contactes.find((x) => x.id === id); return c && openContacte(c); }
    case 'stats': {
      const nou = el.dataset.tipus ? { tipus: el.dataset.tipus, prog: el.dataset.prog, mes: Number(el.dataset.mes) || 0 } : null;
      const igual = nou && ui.statsSel && JSON.stringify(nou) === JSON.stringify(ui.statsSel);
      ui.statsSel = igual ? null : nou;
      render();
      if (ui.statsSel) $('#cercaStats')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      return;
    }
    case 'treu-estudi': { const [nom] = state.estudis.splice(Number(el.dataset.i), 1); delete state.ubicacions[nom]; save(); break; }
    case 'exporta': return exporta();
    case 'copia-cal':
      navigator.clipboard?.writeText(el.dataset.url).then(() => toast('Enllaç copiat.'), () => toast('No s\'ha pogut copiar.'));
      return;
    case 'importa': return $('#fitxer').click();
    case 'esborra-tot':
      if (!confirm('Segur que vols esborrar TOTES les dades? Exporta-les abans si les vols conservar.')) return;
      state = { programes: [], persones: [], estudis: [], ubicacions: {}, agenda: { contactes: [], importat: '' }, gravacions: [] }; save(); toast('Dades esborrades.'); break;
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
  if (f === 'tipus') { ui.agendaTipus = t.value; desaPref('agendaTipus', t.value); }
  if (f === 'emissions') { ui.veureEmissions = t.checked; desaPref('veureEmissions', t.checked); render(); return; }
  if (f === 'any') { ui.anyStats = t.value === 'tots' ? 'tots' : Number(t.value); ui.statsSel = null; render(); return; }
  if (f === 'progStats') { ui.progStats = t.value; ui.statsSel = null; desaPref('progStats', t.value); render(); return; }
  ui.view === 'agenda' ? renderTaula() : render();
});
$('#main').addEventListener('input', (e) => {
  if (e.target.id === 'cerca') { ui.cerca = e.target.value; renderTaula(); }
  if (e.target.id === 'cercaCont') { ui.cercaCont = e.target.value; $('#llistaCont').innerHTML = llistaContactes(); }
  if (e.target.id === 'cercaStats') { ui.cercaStats = e.target.value; $('#statsLlista').innerHTML = llistaStats(); }
  if (e.target.id === 'cercaConv' || e.target.id === 'filtreConv') {
    ui[e.target.id] = e.target.value;
    $('#llistaConv').innerHTML = llistaConvidats();
    $('#llistaEquip').innerHTML = llistaEquip();
    $('#compteConv').textContent = compteConv();
  }
});
mobil.addEventListener('change', render);

// Calendari: lliscar el dit cap a l'esquerra o la dreta passa al mes (o setmana) següent o anterior
let toc = null;
$('#main').addEventListener('touchstart', (e) => {
  toc = ui.view === 'calendari' && e.touches.length === 1 && e.target.closest('.month, .week')
    ? { x: e.touches[0].clientX, y: e.touches[0].clientY, t: Date.now() } : null;
}, { passive: true });
$('#main').addEventListener('touchend', (e) => {
  if (!toc) return;
  const dx = e.changedTouches[0].clientX - toc.x, dy = e.changedTouches[0].clientY - toc.y;
  const rapid = Date.now() - toc.t < 700;
  toc = null;
  if (!rapid || Math.abs(dx) < 50 || Math.abs(dx) < Math.abs(dy) * 1.5) return;   // no és un lliscament horitzontal
  const c = ui.cursor, enrere = dx > 0;
  ui.cursor = ui.mode === 'mes' ? new Date(c.getFullYear(), c.getMonth() + (enrere ? -1 : 1), 1) : addDays(c, enrere ? -7 : 7);
  render();
  const cal = $('#main .month, #main .week');
  if (cal) { cal.classList.add(enrere ? 'entra-esq' : 'entra-dre'); }
});

/* ---------- Contactes (la teva agenda, separada dels convidats) ---------- */
const convidatPerNom = () => new Map(convidatsPers().map((p) => [clauCerca(p.nom), p]));
function relacioConvidat(p) {
  if (!p) return '';
  const fets = historial(p).filter((g) => jaGravada(g));
  return fets.length ? `Ha vingut · ${fets.map((g) => (g.numero ? 'Ep. ' + g.numero : g.titol)).join(', ')}`
    : p.invitat ? `Invitat el ${dataCurta(p.invitat)}` : p.potencial ? 'Convidat potencial' : 'Ja és convidat';
}
function renderContactes(m) {
  const ag = state.agenda, n = ag.contactes.length;
  m.innerHTML = `
    ${n ? `<div class="cerca-fixa"><input type="search" id="cercaCont" placeholder="🔎 Cerca a l'agenda (nom, empresa, notes, telèfon)…" value="${esc(ui.cercaCont || '')}" autocomplete="off"></div>` : ''}
    <div class="toolbar"><div class="grp" style="width:auto"><h2 style="margin:0">Contactes <span class="hint">(${n})</span></h2></div>
      <div class="grp" style="width:auto"><button class="btn" data-action="importa-agenda">⬆ ${n ? 'Actualitza' : 'Importa'} l'agenda</button>
      ${n ? '<button class="btn primary" data-action="nou-contacte">+ Nou</button>' : ''}</div></div>
    ${n ? `<p class="hint" style="margin-top:-6px">La teva agenda, importada el ${ag.importat ? dataCurta(ag.importat.slice(0, 10)) : '—'}. Toca un contacte per trucar, enviar un WhatsApp o proposar-lo com a convidat.</p>
      <div class="panel llista-cont" id="llistaCont">${llistaContactes()}</div>`
    : `<div class="panel" style="padding:18px"><p><b>Encara no has importat l'agenda.</b></p>
      <p class="hint">1. Al iPhone, a l'app <b>Contactes</b>, toca <b>‹ Llistes</b>, mantén premut <b>Tots els contactes</b> i toca <b>Exporta → Desa a Arxius</b>.<br>
      2. Aquí, toca <b>⬆ Importa l'agenda</b> i tria aquest fitxer (.vcf).<br>
      L'agenda se sincronitza amb l'ordinador i és separada de les fitxes de convidats.</p></div>`}`;
}
function llistaContactes() {
  const q = clauCerca(ui.cercaCont), conv = convidatPerNom();
  const tots = state.agenda.contactes.filter((c) => !q || q.split(' ').every((w) => clauCerca([c.nom, c.empresa, c.notes, ...(c.tels || []), ...(c.emails || [])].join(' ')).includes(w)));
  const mostra = tots.slice(0, 200);
  return (mostra.map((c) => {
    const rel = relacioConvidat(conv.get(clauCerca(c.nom)));
    return `<button class="fila" data-action="contacte" data-id="${c.id}">
      <span class="avatar conv mini">${esc(inicials(c.nom || '?'))}</span><b>${esc(c.nom)}</b>${rel ? `<span class="badge ${rel.startsWith('Ha vingut') ? 'publicat' : 'potencial'}">${esc(rel)}</span>` : ''}
      <span class="det">${esc([c.empresa, c.tels?.[0]].filter(Boolean).join(' · ') || ' ')}</span></button>`;
  }).join('') || `<p class="empty" style="padding:12px">Cap contacte coincideix amb «${esc(ui.cercaCont)}».</p>`)
    + (tots.length > mostra.length ? `<p class="hint" style="padding:10px 12px">Es mostren 200 de ${tots.length}. Escriu al cercador per trobar-ne més.</p>` : '');
}
const inpAgenda = Object.assign(document.createElement('input'), { type: 'file', accept: '.vcf,text/vcard,text/x-vcard', hidden: true });
document.body.append(inpAgenda);
const importaAgenda = () => inpAgenda.click();
inpAgenda.addEventListener('change', async () => {
  const file = inpAgenda.files[0];
  inpAgenda.value = '';
  if (!file) return;
  try {
    const llista = llegeixVcard(await file.text()).filter((c) => c.nom);
    if (!llista.length) return toast('Aquest fitxer no té cap contacte.');
    const abans = state.agenda.contactes.length;
    const editats = state.agenda.contactes.filter((c) => c.editat);
    if (abans && !confirm(`Actualitzar l'agenda amb aquests ${llista.length} contactes?${editats.length ? `\n\nEs mantenen els ${editats.length} contactes que has editat o creat a l'app.` : ''}\nLes fitxes de convidats no es toquen.`)) return;
    const perNom = new Map(editats.map((c) => [clauCerca(c.nomOriginal || c.nom), c]));
    const importats = llista.map((c) => {
      const ed = perNom.get(clauCerca(c.nom));
      if (ed) { perNom.delete(clauCerca(c.nom)); return ed; }
      return { nom: c.nom, empresa: c.empresa || '', tels: c.tels || [], emails: c.emails || [], notes: c.notes || '' };
    });
    state.agenda = {
      importat: new Date().toISOString(),
      contactes: [...importats, ...perNom.values()].sort((a, b) => a.nom.localeCompare(b.nom, 'ca')).map((c, i) => ({ ...c, id: 'c' + i })),
    };
    save(); render(); toast(`S'han importat ${llista.length} contactes.`);
  } catch (err) { toast("No s'ha pogut llegir el fitxer de contactes."); }
});
function openContacte(c) {
  const nou = !c;
  c = c || { id: uid(), nom: '', empresa: '', tels: [], emails: [], notes: '' };
  const p = nou ? null : convidatPerNom().get(clauCerca(c.nom));
  const camps = (nom, llista, tipus, ph) => [...(llista || []), ''].map((v) => `<input type="${tipus}" name="${nom}" value="${esc(v)}" placeholder="${ph}" autocomplete="off">`).join('');
  openDialog(`
    <h3>${nou ? 'Nou contacte' : 'Contacte'}</h3>
    ${p ? `<p class="warn" style="background:var(--surface-2);color:var(--text)">${esc(relacioConvidat(p))}</p>` : ''}
    ${nou || !(c.tels || []).length ? '' : `<div class="grp" style="width:auto">${c.tels.map((t) => `
      <a class="btn small" href="tel:${esc(t.replace(/\s+/g, ''))}">📞 ${esc(t)}</a>
      ${waLink(t) ? `<a class="btn small" href="${esc(waLink(t, 'Hola ' + (c.nom || '').split(' ')[0] + '!'))}" target="_blank" rel="noopener">💬 WhatsApp</a>` : ''}`).join('')}
      ${(c.emails || []).map((e) => `<a class="btn small" href="mailto:${esc(e)}">✉️ ${esc(e)}</a>`).join('')}</div>`}
    <label>Nom <input name="nom" value="${esc(c.nom)}" required autocomplete="off"></label>
    <label>Empresa / mitjà <input name="empresa" value="${esc(c.empresa || '')}" autocomplete="off"></label>
    <fieldset class="llista-camps"><legend>Telèfons</legend><div id="campsTel">${camps('tel', c.tels, 'tel', 'Telèfon')}</div>
      <button type="button" class="btn small" data-dlg="mes-tel">+ Un altre telèfon</button></fieldset>
    <fieldset class="llista-camps"><legend>Correus</legend><div id="campsMail">${camps('email', c.emails, 'email', 'correu@exemple.cat')}</div>
      <button type="button" class="btn small" data-dlg="mes-mail">+ Un altre correu</button></fieldset>
    <label>Notes <textarea name="notes" rows="3">${esc(c.notes || '')}</textarea></label>
    ${nou ? '' : `<div class="grp" style="width:auto"><button type="button" class="btn primary" data-dlg="invitacio">✉️ Envia la invitació</button>${p ? '<button type="button" class="btn" data-dlg="fitxa">Obre la fitxa de convidat</button>'
      : '<button type="button" class="btn" data-dlg="proposa">➕ Proposa com a convidat</button>'}</div>`}
    ${nou ? '' : '<span class="hint">Els canvis que facis aquí es mantenen encara que tornis a importar l\'agenda.</span>'}`, {
    onSave(f) {
      const nom = f.get('nom').trim();
      if (!nom) { toast('Cal posar un nom.'); return false; }
      const nets = (k) => [...new Set(f.getAll(k).map((v) => String(v).trim()).filter(Boolean))];
      Object.assign(c, { nom, empresa: f.get('empresa').trim(), tels: nets('tel'), emails: nets('email'), notes: f.get('notes').trim(),
        editat: true, nomOriginal: c.nomOriginal || (nou ? nom : c.nom) });
      if (nou) state.agenda.contactes.push(c);
      state.agenda.contactes.sort((x, y) => x.nom.localeCompare(y.nom, 'ca'));
      toast(nou ? 'Contacte creat.' : 'Contacte desat.');
    },
    onDelete: nou ? null : () => {
      if (!confirm(`Eliminar ${c.nom} de l'agenda de l'app?\n\nNomés s'esborra d'aquí, no del teu iPhone. Si tornes a importar l'agenda, tornarà a aparèixer.`)) return false;
      state.agenda.contactes = state.agenda.contactes.filter((x) => x !== c);
    },
    onExtra(a) {
      if (a === 'mes-tel') $('#campsTel').insertAdjacentHTML('beforeend', '<input type="tel" name="tel" placeholder="Telèfon" autocomplete="off">');
      if (a === 'mes-mail') $('#campsMail').insertAdjacentHTML('beforeend', '<input type="email" name="email" placeholder="correu@exemple.cat" autocomplete="off">');
      if (a === 'fitxa') { closeDialog(); openPersona(p); }
      if (a === 'invitacio') return openInvitacio({ nom: c.nom, tel: c.tels?.[0] || '', email: c.emails?.[0] || '', p });
      if (a === 'proposa') {
        const conv = { id: uid(), nom: c.nom, tipus: 'convidat', telefon: c.tels?.[0] || '', email: c.emails?.[0] || '', notes: c.empresa || '', potencial: true };
        state.persones.push(conv); save(); closeDialog(); render();
        toast(`${c.nom} ara és un convidat potencial.`);
        openPersona(conv);
      }
    },
  });
}

/* ---------- Invitació a un convidat (La cara oculta de la lluna) ---------- */
const PDF_INVITACIO = 'invitacio-la-cara-oculta.pdf';
const MODEL_INVITACIO = `Hola {nom}! Soc l'Àngel Ayats, de «La cara oculta de la lluna», el podcast d'històries humanes de Girona FM. 🌙

Ens faria molta il·lusió que fossis el protagonista d'un dels episodis: una conversa íntima i sense presses, guiada per quatre cançons que triïs tu. La gravació dura uns 50–60 minuts i es fa a l'Espai Podcast «Les Veus de la Vall», a Llorà.

T'envio la invitació amb tots els detalls.

Si et ve de gust, respon-me amb un «sí, en parlem» i buscarem el dia que et vagi millor. Una abraçada!`;
const modelInvitacio = () => state.plantilles?.invitacio || MODEL_INVITACIO;
// Desa que s'ha invitat (si encara no té fitxa de convidat, se li crea com a potencial)
// Busca una persona a l'agenda de Contactes pel nom (exacte, o el que contingui totes les paraules si n'hi ha només un)
function contacteAgenda(nom) {
  const q = clauCerca(nom), ll = state.agenda?.contactes || [];
  if (!q) return null;
  const exacte = ll.filter((c) => clauCerca(c.nom) === q);
  if (exacte.length) return exacte[0];
  const w = q.split(' ');
  if (w.length < 2) return null;
  const parcial = ll.filter((c) => { const n = clauCerca(c.nom).split(' '); return w.every((x) => n.includes(x)); });
  return parcial.length === 1 ? parcial[0] : null;
}
function marcaInvitat(dest) {
  let p = dest.p || convidatPerNom().get(clauCerca(dest.nom));
  if (!p) { p = { id: uid(), nom: dest.nom, tipus: 'convidat', telefon: dest.tel || '', email: dest.email || '', notes: '', potencial: true }; state.persones.push(p); }
  p.invitat = ymd(new Date());
  if (!p.telefon && dest.tel) p.telefon = dest.tel;
  save();
}
function openInvitacio(dest) {
  const nom1 = (dest.nom || '').split(' ')[0];
  const urlPdf = new URL(PDF_INVITACIO, location.href).href;
  let fitxerPdf = null;   // es prepara en obrir, perquè el iPhone el deixi compartir en tocar el botó
  fetch(urlPdf).then((r) => r.blob()).then((b) => { fitxerPdf = new File([b], 'Invitacio-La-cara-oculta-de-la-lluna.pdf', { type: 'application/pdf', lastModified: Date.now() }); }).catch(() => {});
  openDialog(`
    <h3>Invitació</h3>
    <p class="hint" style="margin:-6px 0 0">Per a <b>${esc(dest.nom)}</b>${dest.tel ? ' · ' + esc(dest.tel) : ' · <b>sense telèfon</b>: posa\'l a la fitxa o a Contactes'}</p>
    <label>Missatge <textarea name="missatge" rows="11">${esc(modelInvitacio().replaceAll('{nom}', nom1))}</textarea></label>
    <span class="hint">Pots canviar el text abans d'enviar-lo. <a href="#" data-dlg="inv-veure">📄 Mira la invitació</a></span>
    <div class="grp" style="width:auto">
      <button type="button" class="btn primary" data-dlg="inv-wa">💬 WhatsApp amb l'enllaç</button>
      <button type="button" class="btn" data-dlg="inv-pdf">📎 Comparteix amb el PDF</button>
      <button type="button" class="btn" data-dlg="inv-copia">📋 Copia el text</button>
    </div>
    <span class="hint"><b>WhatsApp amb l'enllaç</b> (recomanat) obre directament el xat d'aquesta persona, amb el missatge i l'enllaç a la invitació. <b>Comparteix amb el PDF</b> adjunta el fitxer; si WhatsApp no el deixa enviar, tria <b>Desa a Arxius</b> i adjunta'l des del xat amb <b>+ → Document</b>.</span>
    <button type="button" class="btn small" data-dlg="inv-model" style="align-self:flex-start">Desa aquest text com a model</button>`, {
    onSave() {},
    onExtra(a) {
      const text = $('#dlgForm').elements.missatge.value.trim();
      if (a === 'inv-wa') {
        const enllac = waLink(dest.tel, `${text}\n\n📄 Invitació: ${urlPdf}`);
        if (!enllac) return toast('Cal un telèfon mòbil vàlid per enviar-ho per WhatsApp.');
        window.open(enllac, '_blank', 'noopener');
        marcaInvitat(dest); toast('Invitació preparada a WhatsApp.');
      }
      if (a === 'inv-pdf') {
        if (!fitxerPdf) return toast('La invitació encara s\'està carregant. Torna-ho a provar en un moment.');
        const dades = { files: [fitxerPdf] };
        if (!navigator.canShare?.(dades)) return toast('Aquest dispositiu no permet adjuntar fitxers. Fes servir «WhatsApp amb l\'enllaç».');
        navigator.clipboard?.writeText(text).catch(() => {});
        navigator.share(dades).then(() => { marcaInvitat(dest); toast('PDF enviat. El text del missatge està copiat: enganxa\'l al xat.'); }).catch(() => {});
        toast('Tria WhatsApp i el contacte. El text del missatge ja està copiat per enganxar-lo.');
      }
      if (a === 'inv-veure') return obreVisorPdf(urlPdf, 'Invitació');
      if (a === 'inv-copia') navigator.clipboard?.writeText(text).then(() => toast('Text copiat.'), () => toast("No s'ha pogut copiar."));
      if (a === 'inv-model') {
        state.plantilles = { ...(state.plantilles || {}), invitacio: nom1 ? text.replaceAll(nom1, '{nom}') : text };
        save(); toast('Desat com a model per a les properes invitacions.');
      }
    },
  });
}

// Visor de PDF dins de l'app (amb botó per tancar). És un diàleg a part perquè quedi per sobre de l'altre.
const PDFJS = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/';
let pdfjsCarregat = null;
const carregaPdfjs = () => pdfjsCarregat || (pdfjsCarregat = new Promise((ok, ko) => {
  const sc = Object.assign(document.createElement('script'), { src: PDFJS + 'pdf.min.js', onload: () => { window.pdfjsLib.GlobalWorkerOptions.workerSrc = PDFJS + 'pdf.worker.min.js'; ok(window.pdfjsLib); }, onerror: ko });
  document.head.append(sc);
}));
function obreVisorPdf(url, titol) {
  let v = $('#visorPdf');
  if (!v) {
    v = Object.assign(document.createElement('dialog'), { id: 'visorPdf' });
    v.innerHTML = '<div class="visor-cap"><b></b><button type="button" class="btn small">✕ Tanca</button></div><div class="visor-pag"></div>';
    document.body.append(v);
    v.querySelector('button').onclick = () => v.close();
  }
  v.querySelector('b').textContent = titol;
  const pag = v.querySelector('.visor-pag');
  pag.innerHTML = '<p class="hint" style="padding:16px">Carregant…</p>';
  v.showModal();
  carregaPdfjs().then(async (pdfjs) => {
    const doc = await pdfjs.getDocument(url).promise;
    pag.innerHTML = '';
    const ample = pag.clientWidth - 16, dpr = Math.min(3, window.devicePixelRatio || 1);
    for (let i = 1; i <= doc.numPages; i++) {
      const p = await doc.getPage(i);
      const vp = p.getViewport({ scale: (ample / p.getViewport({ scale: 1 }).width) * dpr });
      const cv = Object.assign(document.createElement('canvas'), { width: vp.width, height: vp.height });
      cv.style.width = ample + 'px';
      pag.append(cv);
      await p.render({ canvasContext: cv.getContext('2d'), viewport: vp }).promise;
    }
  }).catch(() => { pag.innerHTML = `<p style="padding:16px">No s'ha pogut mostrar aquí. <a href="${esc(url)}">Obre el PDF</a></p>`; });
}

/* ---------- Imprimir llistats ---------- */
// Prepara una versió per al paper (taules en blanc i negre, amb casella i columna de notes) i obre la impressió
function imprimeix(titol, seccions) {
  let z = $('#zonaImpressio');
  if (!z) { z = Object.assign(document.createElement('div'), { id: 'zonaImpressio' }); document.body.append(z); }
  const avui = new Date();
  z.innerHTML = `<header><h1>${esc(titol)}</h1><p>${esc(APP.nom)} · imprès el ${avui.getDate()}/${avui.getMonth() + 1}/${avui.getFullYear()}</p></header>`
    + seccions.filter((x) => x.files.length).map((x) => `${seccions.length > 1 || x.nom ? `<h2>${esc(x.nom)} (${x.files.length})</h2>` : ''}
      <table><thead><tr><th class="c">✓</th>${x.cols.map((c) => `<th>${esc(c)}</th>`).join('')}<th class="n">Notes</th></tr></thead>
      <tbody>${x.files.map((f) => `<tr><td class="c">☐</td>${f.map((v) => `<td>${esc(v ?? '')}</td>`).join('')}<td class="n"></td></tr>`).join('')}</tbody></table>`).join('');
  const titolAbans = document.title;
  document.title = titol;   // nom del PDF si es desa
  window.addEventListener('afterprint', () => { document.title = titolAbans; }, { once: true });
  setTimeout(() => window.print(), 50);
}
const grav = (g) => (g.data ? `${dataCurta(g.data)} ${g.hora || ''}`.trim() : '—');
const emis = (g) => (g.emissio ? `${dataCurta(g.emissio)}${g.horaEmissio ? ' ' + g.horaEmissio : ''}` : '—');
const seccioEpisodis = (eps, nom = 'Episodis') => {
  const unProg = new Set(eps.map((g) => g.programaId)).size === 1;   // si tots són del mateix programa, sobra la columna
  return {
    nom, cols: ['Núm.', 'Títol', ...(unProg ? [] : ['Programa']), 'Gravació', 'Emissió', 'Estat'],
    files: eps.map((g) => [g.numero || '', g.titol, ...(unProg ? [] : [progNom(g)]), grav(g), emis(g), estatNom(g.estat)]),
  };
};
function situacioConv(p) {
  const h = historial(p), fets = h.filter((g) => jaGravada(g)), previst = h.filter((g) => !jaGravada(g)).pop();
  return [p.potencial ? 'Potencial' : '', fets.length ? `Ha vingut ${fets.length}× (${fets.map((g) => titolG(g)).join(', ')})` : '',
    previst ? `Previst: ${titolG(previst)}${previst.data ? ' · ' + dataCurta(previst.data) : ''}` : ''].filter(Boolean).join(' · ') || 'Encara no ha vingut';
}
const seccioConvidats = (gent, nom = 'Convidats') => ({
  nom, cols: ['Nom', 'Telèfon', 'Correu', 'Situació'], files: gent.map((p) => [p.nom, p.telefon || '', p.email || '', situacioConv(p)]),
});
function imprimeixLlista(que) {
  const nomProg = (id) => (id ? prog(id)?.nom : 'Tots els programes');
  if (que === 'agenda') {
    const rows = ui.filesAgenda || [];
    if (!rows.length) return toast('No hi ha res per imprimir amb aquests filtres.');
    const titol = ['Agenda', nomProg(ui.filtrePrograma), ui.agendaTipus === 'tots' ? 'gravacions i emissions' : 'gravacions',
      ui.filtreEstat ? estatNom(ui.filtreEstat) : '', ui.nomesProperes ? 'properes' : '', ui.cerca ? `cerca «${ui.cerca}»` : ''].filter(Boolean).join(' · ');
    return imprimeix(titol, [{ nom: '', cols: ['Gravació', 'Horari', 'Emissió', 'Programa', 'Títol', 'Estudi', 'Convidats', 'Estat'],
      files: rows.map((g) => [dataCurta(g.data), g.data ? horari(g) : '—', emis(g), progNom(g), titolG(g), g.estudi || '', nomsConvidats(g).join(', '), estatNom(g.estat)]) }]);
  }
  if (que === 'convidats') {
    const conv = (ui.filesConv || []).map((x) => x.p);
    if (!conv.length) return toast('No hi ha cap convidat per imprimir.');
    const filtre = { vingut: 'ja han vingut', propers: 'amb gravació pendent', potencials: 'potencials' }[ui.filtreConv || ''];
    return imprimeix(['Convidats', filtre, ui.cercaConv ? `cerca «${ui.cercaConv}»` : ''].filter(Boolean).join(' · '), [seccioConvidats(conv, '')]);
  }
  if (que === 'stats') {
    const l = ui.llistaStats;
    if (!l) return;
    const p = progStats() ? nomProg(progStats()) : '';
    const titol = p && !l.titol.includes(p) ? `${l.titol} · ${p}` : l.titol;
    return imprimeix(titol, [
      seccioConvidats(l.gent),
      { nom: 'Artistes', cols: ['Artista', 'Episodis'], files: l.arts.map((a) => [a.nom, a.eps.map((g) => `${titolG(g)} (${estatNom(g.estat)})`).join(' · ')]) },
      seccioEpisodis(l.eps),
    ]);
  }
}

/* ---------- Reproductor d'àudio (llegeix el fitxer del dispositiu; no es puja enlloc) ---------- */
const Reproductor = (() => {
  let url = '';
  const inp = Object.assign(document.createElement('input'), { type: 'file', accept: 'audio/*,.mp3,.m4a,.m4b,.aac,.wav', hidden: true });
  const barra = Object.assign(document.createElement('div'), { id: 'miniPlayer', hidden: true });
  document.body.append(inp, barra);
  function tanca() {
    barra.querySelector('audio')?.pause();
    barra.innerHTML = ''; barra.hidden = true;
    document.body.classList.remove('amb-reproductor');
    if (url) { URL.revokeObjectURL(url); url = ''; }
  }
  inp.addEventListener('change', () => {
    const file = inp.files[0];
    inp.value = '';
    if (!file) return;
    tanca();
    url = URL.createObjectURL(file);
    const nom = file.name.replace(/\.[^.]+$/, '');
    barra.innerHTML = `<div class="mp-cap"><span>🎧 ${esc(nom)}</span><button type="button" aria-label="Tanca el reproductor">×</button></div>
      <audio controls autoplay preload="metadata" src="${url}"></audio>`;
    barra.hidden = false;
    document.body.classList.add('amb-reproductor');
    barra.querySelector('button').onclick = tanca;
    if ('mediaSession' in navigator && window.MediaMetadata) {
      navigator.mediaSession.metadata = new MediaMetadata({ title: nom, artist: APP.nom, artwork: [{ src: 'img/icona-512.png', sizes: '512x512', type: 'image/png' }] });
    }
  });
  return { tria: () => inp.click(), tanca };
})();

/* ---------- Arrencada ---------- */
document.querySelectorAll('.nom-app').forEach((el) => { el.textContent = APP.nom; });
if (PROVES) {
  document.title = '[PROVES] ' + document.title;
  document.querySelector('.brand small').innerHTML = '<span class="proves">VERSIÓ DE PROVES</span>';
}
render();
// Tocar el logo de dalt torna a la portada
document.querySelector('.brand').addEventListener('click', () => { ui.view = 'portada'; render(); window.scrollTo(0, 0); });

if ('serviceWorker' in navigator && location.protocol !== 'file:') {
  navigator.serviceWorker.register('sw.js').catch(() => {});
}
