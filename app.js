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
// Enviament a l'emissora: el divendres de la setmana abans de la d'emissió
const diaEnviament = (em) => { if (!em) return ''; const d = parseYmd(em); return ymd(addDays(d, -((d.getDay() + 6) % 7) - 3)); };
const dataBreu = (ds) => { const d = parseYmd(ds); return `${DIES[(d.getDay() + 6) % 7]} ${d.getDate()} ${MESOS[d.getMonth()].slice(0, 3)}.`; };
function avisEnviament(g) {
  const de = diaEnviament(g?.emissio); if (!de) return { txt: 'Enviar', cls: '' };
  const avui = ymd(new Date());
  if (de < avui) return { txt: `Enviar ja · era ${dataBreu(de)}`, cls: 'tard' };
  if (de === avui) return { txt: 'Enviar avui', cls: 'avui' };
  return { txt: `Enviar ${dataBreu(de)}`, cls: '' };
}
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
    gravacions: [], propostes: [],
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
    propostes: arr(d.propostes),
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
// Perfil del dispositiu: l'Angel ho pot fer tot; en David només treballa Blanc & Negre (el servidor ho fa complir)
const esDavid = () => { try { return localStorage.getItem('podcasts-perfil') === 'david'; } catch (e) { return false; } };
const bnId = () => state.programes.find((p) => /blanc/i.test(p.nom))?.id || '';
const NUMERATS = ['dialeg', 'pindola', 'tematic'];
const NOMES_ANGEL = new Set(['invita-ep', 'invita-potencial', 'correu-emissora', 'nou-potencial', 'si-potencial', 'nou-programa', 'edita-programa', 'nova-persona', 'nou-convidat', 'edita-persona', 'renumera', 'importa', 'esborra-tot', 'exemple', 'treu-estudi', 'importa-agenda', 'nou-contacte', 'contacte']);
// Quants artistes de cada costat té cada tipus d'episodi musical
const SESSIO = 'Sessió de gravació';
const TIPUS_EP = { sessio: ['Sessió de gravació (sense episodi concret)', 0], dialeg: ['Diàleg (clàssic ↔ contemporani)', 1], pindola: ['Píndola resum (4 clàssics + 4 alternatius)', 4], tematic: ['Temàtic (5 clàssics + 5 alternatius)', 5] };
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
// Festius de Catalunya + locals de Girona (Pasqua Granada i Sant Narcís)
const festiusCache = {};
function festiusAny(y) {
  if (festiusCache[y]) return festiusCache[y];
  // Diumenge de Pasqua (algorisme de Meeus/Butcher)
  const a = y % 19, b = Math.floor(y / 100), c = y % 100, d = Math.floor(b / 4), e = b % 4, f = Math.floor((b + 8) / 25),
    g = Math.floor((b - f + 1) / 3), h = (19 * a + b - d - g + 15) % 30, i = Math.floor(c / 4), k = c % 4,
    l = (32 + 2 * e + 2 * i - h - k) % 7, m = Math.floor((a + 11 * h + 22 * l) / 451),
    mes = Math.floor((h + l - 7 * m + 114) / 31), dia = ((h + l - 7 * m + 114) % 31) + 1;
  const pasqua = new Date(y, mes - 1, dia);
  const fx = { '01-01': 'Cap d\'Any', '01-06': 'Reis', '05-01': 'Festa del Treball', '06-24': 'Sant Joan', '08-15': 'L\'Assumpció',
    '09-11': 'Diada Nacional de Catalunya', '10-12': 'Festa Nacional d\'Espanya', '10-29': 'Sant Narcís (Girona)', '11-01': 'Tots Sants',
    '12-06': 'Dia de la Constitució', '12-08': 'La Immaculada', '12-25': 'Nadal', '12-26': 'Sant Esteve' };
  const r = {};
  Object.entries(fx).forEach(([md, nom]) => { r[`${y}-${md}`] = nom; });
  r[ymd(addDays(pasqua, -2))] = 'Divendres Sant';
  r[ymd(addDays(pasqua, 1))] = 'Dilluns de Pasqua';
  r[ymd(addDays(pasqua, 50))] = 'Pasqua Granada (Girona)';
  return (festiusCache[y] = r);
}
const festiu = (ds) => festiusAny(Number(ds.slice(0, 4)))[ds] || '';
// Estat del dia per concertar: ocupat (hi ha gravació), festiu, lliure (feiner sense res) o res
function estatDia(d, ds, avui) {
  if (state.gravacions.some((g) => g.data === ds && g.estat !== 'cancellat')) return 'ocupat';
  if (festiu(ds)) return 'festiu';
  if (ds >= avui && d.getDay() % 6 !== 0) return 'lliure';
  return '';
}
// Data de referència: la de gravació; si encara no en té, la d'emissió
const dataRef = (g) => g.data || g.emissio || '';
// Ordre: per data; els que encara no tenen data van al final, per número d'episodi
const clauOrdre = (g) => (dataRef(g) ? dataRef(g) + (g.data ? g.hora : g.horaEmissio || '') : '~' + String(Number(g.numero) || 0).padStart(5, '0'));
const ordena = (a, b) => { const x = clauOrdre(a), y = clauOrdre(b); return x < y ? -1 : x > y ? 1 : 0; };
const horari = (g) => (g.data && g.hora ? `${g.hora}–${fromMin(toMin(g.hora) + Number(g.durada || 0))}` : 'Sense data de gravació');
const titolG = (g) => (g.numero ? `Ep. ${g.numero} · ` : '') + (g.titol || '');
const emissioText = (g) => (g.emissio ? `Emissió Girona FM: ${dataCurta(g.emissio)}${g.horaEmissio ? ', ' + g.horaEmissio : ''}` : '');
const GRAVADA = ['gravat', 'editat', 'publicat'];
// Gravat / emès: ho diu l'estat de la gravació o les caselles de la Planificació (n'hi ha prou amb un dels dos)
const esGravat = (g) => GRAVADA.includes(g.estat) || Boolean(g.pla?.gravat || g.pla?.editat || g.pla?.emes);
const esPublicat = (g) => g.estat === 'publicat' || Boolean(g.pla?.emes);
const jaGravada = (g, avui = ymd(new Date())) => esGravat(g) || Boolean(g.data && g.data <= avui);
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
  const david = esDavid();
  document.body.classList.toggle('perfil-david', david);
  if (david && ui.view === 'contactes') ui.view = 'calendari';
  document.querySelectorAll('#tabs button').forEach((b) => b.classList.toggle('active', b.dataset.view === (ui.view === 'planificacio' ? 'programes' : ui.view)));
  // Portada: la caràtula queda fixa, amb el menú a sota
  const portada = ui.view === 'portada';
  document.body.classList.toggle('a-portada', portada);
  $('#splash').classList.toggle('fora', !portada);
  document.documentElement.style.setProperty('--alt-cap', (document.querySelector('header')?.offsetHeight || 0) + 'px');
  const views = { portada: (m) => { m.innerHTML = ''; }, calendari: renderCal, agenda: renderAgenda, programes: renderProgrames, planificacio: renderPlanificacio, persones: renderPersones, contactes: renderContactes, config: renderConfig };
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
  // Sessió de gravació: hora, qui (o el programa si no té títol propi), programa i lloc. Sense dades d'emissió.
  if (g.data) {
    const titol = !g.titol || g.titol === SESSIO ? progNom(g) : g.titol;
    return `<button class="card ${g.estat === 'cancellat' ? 'cancel' : ''} gravacio" style="--c:${color(g)}" data-action="edita" data-id="${g.id}">
    ${coverProg(prog(g.programaId))}
    <div class="body">
      <div class="h">${horari(g)} · Sessió de gravació</div>
      <div class="ti">${esc(titol)}</div>
      ${titol !== progNom(g) ? `<div class="pr">${esc(progNom(g))}</div>` : ''}
      ${g.estudi ? `<div class="pr">${esc(g.estudi)}</div>` : ''}
      <div class="meta"><span class="badge ${g.estat}">${estatNom(g.estat)}</span>${g.estat !== 'cancellat' ? checkBadge(g) : ''}${noms.length ? `<span class="hint">${esc(noms.join(', '))}</span>` : ''}</div>
    </div>
  </button>`;
  }
  return `<button class="card ${g.estat === 'cancellat' ? 'cancel' : ''} nomes-emissio" style="--c:${color(g)}" data-action="edita" data-id="${g.id}">
    ${coverProg(prog(g.programaId))}
    <div class="body">
      <div class="h">${horari(g)}</div>
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
      <div class="h">Emissió Girona FM${g.horaEmissio ? ' · ' + esc(g.horaEmissio) : ''}</div>
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
      const fora = d.getMonth() !== c.getMonth(), est = fora ? '' : estatDia(d, ds, avui);
      cells += `<div class="cell ${fora ? 'out' : est} ${ds === avui ? 'today' : ''} ${ds === ui.diaSel ? 'sel' : ''}" data-action="dia" data-date="${ds}">
        <div class="num">${d.getDate()}</div>
        ${festiu(ds) && !fora ? `<div class="fest-nom">${esc(festiu(ds))}</div>` : ''}
        ${tots.slice(0, 3).join('')}
        ${tots.length > 3 ? `<button class="more" data-action="veure-setmana" data-date="${ds}">+${tots.length - 3} més</button>` : ''}
        <div class="dots">${items.slice(0, 4).map((g) => `<i style="--c:${color(g)}"></i>`).join('')}${ems.slice(0, 2).map((g) => `<i class="em" style="--c:${color(g)}"></i>`).join('')}</div>
      </div>`;
    }
    const sel = delDia(ui.diaSel), selEm = emDia(ui.diaSel);
    body = `<div class="month"><div class="dow">${DIES.map((d) => `<div>${d}</div>`).join('')}</div><div class="grid">${cells}</div></div>
      <div class="dia-sel dia-grup">
        <h3 class="${ui.diaSel === avui ? 'avui' : ''}">${ui.diaSel === avui ? 'Avui · ' : ''}${dataLlarga(ui.diaSel)}${festiu(ui.diaSel) ? ` · <span class="fest-txt">Festiu: ${esc(festiu(ui.diaSel))}</span>` : ''}</h3>
        ${sel.map(card).join('') + selEm.map(cardEmissio).join('') || '<p class="empty">Cap gravació aquest dia.</p>'}
        <button class="add" style="width:100%" data-action="nova-dia" data-date="${ui.diaSel}">+ Afegir gravació</button>
      </div>`;
  } else {
    const s = mondayOf(c), e = addDays(s, 6);
    titol = `${s.getDate()} ${MESOS[s.getMonth()].slice(0, 3)}. – ${e.getDate()} ${MESOS[e.getMonth()].slice(0, 3)}. ${e.getFullYear()}`;
    body = '<div class="week">' + [0, 1, 2, 3, 4, 5, 6].map((i) => {
      const d = addDays(s, i), ds = ymd(d), items = delDia(ds);
      return `<section class="wday ${ds === avui ? 'today' : ''} ${estatDia(d, ds, avui)}">
        <header data-action="nova-dia" data-date="${ds}"><span>${DIES_LLARGS[i]}</span><b>${d.getDate()}</b></header>
        ${festiu(ds) ? `<div class="fest-nom">${esc(festiu(ds))}</div>` : ''}
        ${items.map(card).join('') + emDia(ds).map(cardEmissio).join('') || '<p class="empty">Cap gravació</p>'}
        <button class="add" data-action="nova-dia" data-date="${ds}">+ Afegir</button>
      </section>`;
    }).join('') + '</div>';
  }

  const legend = state.programes.map((p) => `<span><span class="dot" style="--c:${p.color}"></span>${esc(p.nom)}</span>`).join('')
    + '<span class="llegenda-dies"><span class="caixa lliure"></span>Lliure <span class="caixa ocupat"></span>Gravació <span class="caixa festiu"></span>Festiu</span>';
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
      <td><select data-estat="${g.id}" aria-label="Estat" ${esDavid() ? 'disabled' : ''}>${estatOptions(g.estat)}</select></td>
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
      <button class="btn primary nomes-angel" data-action="nou-programa">+ Nou programa</button></div>
    <div class="cards">${state.programes.map((p) => {
      const gs = state.gravacions.filter((g) => g.programaId === p.id);
      const properes = gs.filter((g) => g.data >= avui && g.estat !== 'cancellat').sort(ordena);
      return `<div class="item" style="--c:${p.color}">
        <div class="img">${p.imatge ? `<img src="${esc(p.imatge)}" alt="">` : `<span>${esc(inicials(p.nom))}</span>`}</div>
        <div class="in">
          <h3>${esc(p.nom)}</h3>
          <div class="sub"><span class="dot" style="--c:${p.color}"></span>${p.tipus === 'podcast' ? 'Podcast' : 'Programa'} · ${gs.length} episodis</div>
          <div class="sub">${properes.length ? `Propera: ${dataCurta(properes[0].data)}, ${properes[0].hora}` : 'Cap gravació programada'}</div>
          <div class="acts"><button class="btn small nomes-angel" data-action="edita-programa" data-id="${p.id}">Edita</button>
            <button class="btn small" data-action="filtra-programa" data-id="${p.id}">Calendari</button>
            <button class="btn small" data-action="planificacio" data-id="${p.id}">Planificació${esMusical(p.id) ? avisPrograma(p.id) : ''}</button></div>
        </div>
      </div>`;
    }).join('') || '<p class="empty">Encara no hi ha programes. Crea el primer!</p>'}</div>
    ${estadistiques()}`;
}

/* ---------- Planificació ----------
   Blanc & Negre (musical): diàlegs, píndoles resum i temàtics. Cicle: 4 diàlegs · píndola · 4 diàlegs · píndola · temàtic. Cada dissabte.
   La cara oculta de la lluna (entrevista): un convidat per programa, amb 4 cançons. Cada dijous.
   Tots dos: juliol i agost, vacances. */
const PLA_ESTATS = [['validat', 'Validat'], ['canvi', 'Canvi'], ['guio', 'Guió'], ['gravat', 'Gravat'], ['enviat', 'Enviat'], ['emes', 'Emès']];
const ESTATS_ENTREVISTA = [['confirmat', 'Confirmat'], ['cancons', 'Cançons'], ['guio', 'Guió'], ['gravat', 'Gravat'], ['editat', 'Editat'], ['enviat', 'Enviat'], ['emes', 'Emès'], ['noticia', 'Notícia']];
// La casella que diu que ja s'ha enviat a l'emissora (el tauler «Enviar a l'emissora» la fa servir)
const kEnvia = () => 'enviat';
const TIPUS_PLA = { dialeg: 'Diàleg', pindola: 'Píndola', tematic: 'Temàtic', entrevista: 'Entrevista' };
const estatsPla = (pid = ui.planProg) => (esMusical(pid) ? PLA_ESTATS : ESTATS_ENTREVISTA);
const tipusPla = (g) => (esMusical(g.programaId) ? g.tipusEp : 'entrevista');
// Caselles que surten en vermell clar mentre no estan fetes
const rosaPla = (k, pid = ui.planProg) => (esMusical(pid) ? ['guio', 'gravat', 'enviat', 'emes'] : ['confirmat', 'cancons', 'guio', 'gravat', 'editat', 'enviat', 'emes']).includes(k);
const capPla = (pid = ui.planProg) => (esMusical(pid) ? ['Clàssic / Títol', 'Alternatiu'] : ['Convidat', 'Cançons']);
const episodisPla = (pid) => state.gravacions.filter((g) => g.programaId === pid && Number(g.numero) > 0 && TIPUS_PLA[tipusPla(g)] && (esMusical(pid) || g.estat !== 'cancellat'))
  .sort((a, b) => a.numero - b.numero);
const fet = (g, k) => Boolean(g.pla?.[k] || (k === 'enviat' && g.pla?.emes));   // un programa emès ja s'havia enviat
const artDisc = (a) => (a?.artista ? `<b>${esc(a.artista)}</b>${a.disc ? ' · ' + esc(a.disc) : ''}` : '');
const artCanco = (ll) => (ll || []).filter((a) => a.artista || a.canco).map((a) => `${esc(a.artista || '')}${a.canco ? ` <i>«${esc(a.canco)}»</i>` : ''}`).join(', ');
const textCanco = (ll) => (ll || []).filter((a) => a.artista || a.canco).map((a) => `${a.artista || ''}${a.canco ? ` «${a.canco}»` : ''}`.trim());
// Guió per refer: en David ha canviat l'alternatiu (o les cançons) després de fer el guió
const abansPla = (g) => {
  const r = g.referGuio;
  if (!r) return '';
  const abans = g.tipusEp === 'dialeg' ? artDisc(r.contemporanis?.[0]) || '<i>cap</i>'
    : [artCanco(r.classics), artCanco(r.contemporanis)].filter(Boolean).join(' · ') || '<i>cap</i>';
  return `<span class="pla-abans">⚠ Abans: ${abans}</span>`;
};
function columnesPla(g) {
  const [a, b] = columnesPlaBase(g);
  return [a, b + abansPla(g)];
}
function columnesPlaBase(g) {
  if (tipusPla(g) === 'entrevista') return [`<b>${esc(g.titol || 'Convidat per decidir')}</b>${g.descripcio ? ` · <span class="pla-desc">${esc(g.descripcio)}</span>` : ''}`,
    artCanco(g.cancons) || '<span class="pla-buit">cançons per triar</span>'];
  if (g.tipusEp === 'pindola') return [`<b><i>${esc(g.titol || 'Píndola resum')}</i></b> · ${artCanco(g.classics)}`, artCanco(g.contemporanis)];
  if (g.tipusEp === 'tematic') return [`<b><i>Temàtic</i></b>${g.tema ? ' · ' + esc(g.tema) : ' · <span class="pla-buit">tema per decidir</span>'}${g.classics?.length ? ' · ' + artCanco(g.classics) : ''}`, artCanco(g.contemporanis)];
  return [artDisc(g.classics?.[0]) || '<span class="pla-buit">clàssic per decidir</span>', artDisc(g.contemporanis?.[0]) || '<span class="pla-buit">alternatiu per decidir</span>'];
}
// Primera vegada que s'obre la planificació d'una entrevista: les caselles surten de l'estat, del checklist i de la notícia.
// «Confirmat» vol dir confirmat amb data de gravació: només si l'estat ja és Confirmat o més enllà
function iniciaPlaEntrevista(pid) {
  if (esDavid()) return false;
  let canvi = false;
  episodisPla(pid).filter((g) => !g.pla).forEach((g) => {
    const r = ['pendent', 'confirmat', 'gravat', 'editat', 'publicat'].indexOf(g.estat);
    g.pla = { confirmat: r >= 1, cancons: r >= 2, guio: r >= 2 || Boolean(g.checklist?.guio), gravat: r >= 2,
      editat: r >= 3 || Boolean(g.checklist?.editat), enviat: r >= 4, emes: r >= 4, noticia: Boolean(g.enllac) };
    canvi = true;
  });
  return canvi;
}
const checksPla = (g) => estatsPla(g.programaId).map(([k, nom]) => `<label class="pc pc-${k}" title="${nom}"><input type="checkbox" data-pla="${g.id}" data-k="${k}" ${fet(g, k) ? 'checked' : ''} ${potMarcar(g, k) ? '' : 'disabled'}><span>${nom}</span></label>`).join('');
// En David només pot marcar Validat i Canvi (l'estudi, l'edició i l'enviament els porta l'Angel), i res d'un episodi emès
const potMarcar = (g, k) => !esDavid() || (!fet(g, 'emes') && (k === 'validat' || k === 'canvi'));

/* Canvis d'en David (els marca el servidor) i propostes de diàlegs i temàtics */
const NOMS_CAMPS = { referGuio: 'guió per refer', classics: 'cançons dels clàssics', contemporanis: 'alternatiu', titol: 'títol', data: 'data de gravació', hora: 'hora', durada: 'durada', estudi: 'estudi', estat: 'estat',
  presentadors: 'equip', tecnic: 'tècnic', notes: 'notes', checklist: 'checklist', pla: 'caselles', nova: 'sessió nova', esborrada: 'esborrada' };
// Avisos pendents de veure. «Vist» no esborra la marca: el filtre «Canviats per en David» els continua mostrant tots
const avisosDavid = (pid) => (esDavid() ? [] : state.gravacions.filter((g) => g.david && !g.david.vist && g.programaId === pid)
  .sort((a, b) => (Number(a.numero) || 1e6) - (Number(b.numero) || 1e6) || ordena(a, b)));
const propostesPendents = () => state.propostes.filter((x) => (x.estat || 'pendent') === 'pendent');
const avisPrograma = (pid) => { const n = esDavid() ? 0 : avisosDavid(pid).length + propostesPendents().length; return n ? ` <span class="avis-n" title="Canvis i propostes d'en David">${n}</span>` : ''; };
const quanDavid = (g) => { const q = g.david?.quan || ''; return q ? `${dataCurta(q.slice(0, 10))} ${q.slice(11, 16)}` : ''; };
function blocRefer(pid) {
  if (esDavid()) return '';
  const ll = episodisPla(pid).filter((g) => g.referGuio);
  if (!ll.length) return '';
  return `<div class="pla-avis pla-refer"><div class="pla-avis-cap"><b>⚠ ${ll.length === 1 ? 'Un guió per refer' : ll.length + ' guions per refer'}</b>
      <span class="hint">En David ha canviat l'alternatiu després de fer el guió. Quan el tornis a fer, marca «Guió».</span></div>
    ${ll.map((g) => `<button class="pla-avis-l" data-action="ves-pla" data-id="${g.id}">
      <span>Ep. ${g.numero} · ${esc(g.titol || '')}</span><span class="hint">${abansPla(g).replace(/<[^>]+>/g, '').replace('⚠ ', '')} · ara: ${esc(g.tipusEp === 'dialeg' ? [g.contemporanis?.[0]?.artista, g.contemporanis?.[0]?.disc].filter(Boolean).join(' · ') : textCanco(g.contemporanis).join(', '))}</span></button>`).join('')}</div>`;
}
function blocAvisos(pid) {
  const av = avisosDavid(pid);
  if (!av.length) return '';
  const camps = (g) => [...new Set((g.david.camps || []).map((c) => NOMS_CAMPS[c] || c))].join(', ');
  return `<div class="pla-avis"><div class="pla-avis-cap"><b>✎ En David ha fet ${av.length === 1 ? 'un canvi' : av.length + ' canvis'}</b>
      <button class="btn small" data-action="avisos-vistos">✓ Vist</button></div>
    ${av.slice(0, 12).map((g) => `<button class="pla-avis-l" data-action="${NUMERATS.includes(g.tipusEp) && g.numero ? 'ves-pla' : 'edita'}" data-id="${g.id}">
      <span>${g.numero ? 'Ep. ' + g.numero : dataCurta(g.data)} · ${esc(g.titol || '')}</span><span class="hint">${esc(camps(g))} · ${quanDavid(g)}</span></button>`).join('')}
    ${av.length > 12 ? `<span class="hint">… i ${av.length - 12} més: tria «Canviats per en David» al filtre.</span>` : ''}</div>`;
}
function avisosVistos() {
  avisosDavid(ui.planProg).forEach((g) => { g.david = { ...g.david, vist: true }; });
  save(); render(); toast('Canvis marcats com a vistos.');
}
const ESTAT_PROP = { pendent: 'Pendent', acceptada: 'Acceptada', descartada: 'Descartada' };
const textProposta = (x) => (x.tipus === 'tematic' ? `Temàtic · <b>${esc(x.tema || '')}</b>`
  : `${artDisc(x.classic) || '<span class="pla-buit">clàssic</span>'} ↔ ${artDisc(x.alternatiu) || '<span class="pla-buit">alternatiu per decidir</span>'}`);
function blocPropostes() {
  const david = esDavid();
  const ll = david
    ? [...state.propostes].sort((a, b) => (a.estat === 'pendent' ? 0 : 1) - (b.estat === 'pendent' ? 0 : 1) || String(b.creada || '').localeCompare(String(a.creada || ''))).slice(0, 15)
    : propostesPendents();
  if (!ll.length) return '';
  return `<div class="pla-prop"><div class="pla-avis-cap"><b>💡 ${david ? 'Les teves propostes' : `Propostes d'en David (${ll.length})`}</b></div>
    ${ll.map((x) => `<div class="pla-prop-l"><div class="pla-prop-txt"><span>${textProposta(x)}</span>${x.notes ? `<span class="hint">${esc(x.notes)}</span>` : ''}</div>
      <div class="pla-prop-b">${david
        ? (x.estat === 'pendent' ? `<span class="pla-prop-e">Pendent</span><button class="btn small" data-action="proposta" data-id="${x.id}">Edita</button>`
          : `<span class="pla-prop-e e-${esc(x.estat)}">${ESTAT_PROP[x.estat] || esc(x.estat)}${x.ep ? ' · Ep. ' + x.ep : ''}</span>`)
        : `<button class="btn small primary" data-action="accepta-proposta" data-id="${x.id}">Accepta</button><button class="btn small" data-action="descarta-proposta" data-id="${x.id}">Descarta</button>`}</div></div>`).join('')}</div>`;
}
function openProposta(x) {
  const nou = !x;
  x = x || { id: uid(), tipus: 'dialeg', classic: {}, alternatiu: {}, tema: '', notes: '', estat: 'pendent' };
  const v = (o, k) => esc(o?.[k] || '');
  openDialog(`<h3>${nou ? 'Nova proposta' : 'Edita la proposta'}</h3>
    <p class="help">L'Angel la revisarà. Si l'accepta, entrarà a la planificació en el primer lloc per decidir.</p>
    <label>Tipus <select name="tipus"><option value="dialeg" ${x.tipus !== 'tematic' ? 'selected' : ''}>Diàleg (clàssic ↔ alternatiu)</option><option value="tematic" ${x.tipus === 'tematic' ? 'selected' : ''}>Temàtic</option></select></label>
    <div class="prop-dialeg">
      <div class="row"><label>Clàssic <input name="ca" value="${v(x.classic, 'artista')}" placeholder="Artista" autocomplete="off"></label><label>Disc <input name="cd" value="${v(x.classic, 'disc')}" autocomplete="off"></label></div>
      <div class="row"><label>Alternatiu <input name="aa" value="${v(x.alternatiu, 'artista')}" placeholder="Artista (si el tens)" autocomplete="off"></label><label>Disc <input name="ad" value="${v(x.alternatiu, 'disc')}" autocomplete="off"></label></div>
    </div>
    <label class="prop-tematic">Tema <input name="tema" value="${v(x, 'tema')}" placeholder="Ex.: Guitarres" autocomplete="off"></label>
    <label>Notes <textarea name="notes" rows="3">${esc(x.notes || '')}</textarea></label>`, {
    onSave(f) {
      const t = (k) => String(f.get(k) || '').trim(), tipus = f.get('tipus');
      const ad = (a, d) => (a ? { artista: a, ...(d ? { disc: d } : {}) } : {});
      const d = tipus === 'tematic' ? { tipus, tema: t('tema'), classic: {}, alternatiu: {}, notes: t('notes') }
        : { tipus, tema: '', classic: ad(t('ca'), t('cd')), alternatiu: ad(t('aa'), t('ad')), notes: t('notes') };
      if (tipus === 'tematic' ? !d.tema : !d.classic.artista) { toast(tipus === 'tematic' ? 'Posa el tema.' : 'Posa almenys el clàssic.'); return false; }
      if (nou) state.propostes.push({ ...x, ...d, creada: ymd(new Date()), autor: esDavid() ? 'david' : 'angel' });
      else Object.assign(x, d);
      toast(nou ? "Proposta enviada a l'Angel." : 'Proposta desada.');
    },
    onDelete: nou ? null : () => {
      if (!confirm('Retirar aquesta proposta?')) return false;
      state.propostes = state.propostes.filter((p) => p.id !== x.id);
      toast('Proposta retirada.');
    },
  });
  const f = $('#dlgForm');
  const mostra = () => { const tm = f.elements.tipus.value === 'tematic'; f.querySelector('.prop-dialeg').hidden = tm; f.querySelector('.prop-tematic').hidden = !tm; };
  f.onchange = mostra; mostra();
}
// Acceptar: ocupa el primer diàleg (o temàtic) per decidir que encara no s'ha emès; si no n'hi ha, s'afegeix al final
function acceptaProposta(id) {
  const x = state.propostes.find((p) => p.id === id);
  if (!x) return;
  const pid = ui.planProg || bnId(), tipus = x.tipus === 'tematic' ? 'tematic' : 'dialeg';
  const lliures = episodisPla(pid).filter((g) => !fet(g, 'emes') && g.tipusEp === tipus);
  let g = tipus === 'tematic' ? lliures.find((e) => !e.tema) : lliures.find((e) => !e.classics?.[0]?.artista);
  const nom = tipus === 'tematic' ? `Temàtic «${x.tema}»` : [x.classic?.artista, x.alternatiu?.artista].filter(Boolean).join(' ↔ ');
  const lloc = g ? `Ocuparà l'episodi ${g.numero}${g.emissio ? ` (${dataCurta(g.emissio)})` : ''}, que estava per decidir.`
    : `No queda cap ${tipus === 'tematic' ? 'temàtic' : 'diàleg'} per decidir: s'afegirà al final. Després fes «↻ Renumera».`;
  if (!confirm(`Acceptar la proposta d'en David?\n\n${nom}\n\n${lloc}`)) return;
  if (!g) {
    g = nouEpPla(pid, tipus);
    g.numero = Math.max(0, ...episodisPla(pid).map((e) => Number(e.numero) || 0)) + 1;
    state.gravacions.push(g);
  }
  if (tipus === 'tematic') { g.tema = x.tema; g.titol = `Temàtic ${x.tema}`; }
  else {
    g.classics = [x.classic];
    g.contemporanis = x.alternatiu?.artista ? [x.alternatiu] : [];
    g.titol = titolDialeg({ classics: g.classics, contemporanis: g.contemporanis });
  }
  if (x.notes) g.notes = [g.notes, `Proposta d'en David: ${x.notes}`].filter(Boolean).join('\n');
  Object.assign(x, { estat: 'acceptada', ep: g.numero, epId: g.id, resolta: ymd(new Date()) });
  save(); render(); setTimeout(() => vesPla(g.id), 60);
  toast(`Proposta acceptada: episodi ${g.numero}.`);
}
function descartaProposta(id) {
  const x = state.propostes.find((p) => p.id === id);
  if (!x || !confirm('Descartar aquesta proposta? En David la veurà com a descartada.')) return;
  Object.assign(x, { estat: 'descartada', resolta: ymd(new Date()) });
  save(); render();
}

const filtresPla = (pid = ui.planProg) => [['tots', 'Tots els episodis'], ['pendents', "Pendents d'emetre"], ['emesos', 'Emesos'],
  ...(esMusical(pid) ? [['novalidats', 'Diàlegs per validar'], ['refer', 'Guions per refer']] : [['perconfirmar', 'Convidats per confirmar'], ['sensecancons', 'Sense cançons']])];
const filtraPla = (eps, f) => eps.filter((g) => f === 'tots' || (f === 'pendents' && !fet(g, 'emes')) || (f === 'emesos' && fet(g, 'emes'))
  || (f === 'novalidats' && g.tipusEp === 'dialeg' && !fet(g, 'validat')) || (f === 'perconfirmar' && !fet(g, 'confirmat'))
  || (f === 'sensecancons' && !fet(g, 'cancons')) || (f === 'refer' && g.referGuio) || (f === 'david' && g.david));
function renderPlanificacio(m) {
  const p = prog(ui.planProg) || state.programes.find((x) => esMusical(x.id)) || state.programes[0];
  if (!p) { ui.view = 'programes'; return renderProgrames(m); }
  ui.planProg = p.id;
  const musical = esMusical(p.id);
  if (!musical && iniciaPlaEntrevista(p.id)) save();
  const eps = episodisPla(p.id);
  const env = eps.find((g) => !fet(g, kEnvia(p.id))), grav = eps.find((g) => !fet(g, 'gravat')), guio = eps.find((g) => g.referGuio) || eps.find((g) => !fet(g, 'guio'));
  const tauler = [['enviar', "Enviar a l'emissora", env], ['gravar', 'Proper a gravar', grav], ['guio', 'Proper guió', guio]];
  const filtres = [...filtresPla(p.id), ...(musical && !esDavid() ? [['david', 'Canviats per en David']] : [])];
  if (!filtres.some(([v]) => v === ui.filtrePla)) ui.filtrePla = 'tots';
  m.innerHTML = `
    <div class="toolbar">
      <div class="grp"><button class="btn nav-btn" data-action="vista" data-v="programes" aria-label="Torna a Programes">‹</button><h2>Planificació</h2></div>
      <div class="grp">
        <label class="cerca-pla" title="Cerca a tota la planificació"><span aria-hidden="true">🔍</span><input type="search" id="cercaPla" placeholder="${musical ? 'Artista, disc, cançó…' : 'Convidat, artista, cançó…'}" value="${esc(ui.cercaPla || '')}" aria-label="Cerca a la planificació"></label>
        <select data-filter="filtrePla" aria-label="Què es mostra">${filtres
          .map(([v, t]) => `<option value="${v}" ${(ui.filtrePla || 'tots') === v ? 'selected' : ''}>${t}</option>`).join('')}</select>
        <button class="btn nomes-angel" data-action="renumera">↻ Renumera</button>
        ${musical ? '<button class="btn primary nomes-david" data-action="proposta">+ Proposta</button>' : ''}
        <button class="btn" data-action="exporta-pla">⬇ Exporta</button>
        <button class="btn nomes-angel" data-action="correu-emissora">✉️ Correu emissora</button>
      </div>
    </div>
    <div class="pla-tauler">${tauler.map(([k, nom, g]) => `<button class="pla-t pla-t-${k}" ${g ? `data-action="ves-pla" data-id="${g.id}"` : ''}>
      <span class="pla-t-nom">${nom}${k === 'enviar' && g?.emissio ? ` · <span class="pla-t-quan ${avisEnviament(g).cls}">${esc(avisEnviament(g).txt.replace(/^Enviar ?/, '') || 'avui')}</span>` : ''}</span>
      <span class="pla-t-ep">${g ? `Ep. ${g.numero}${k === 'enviar' && g.emissio ? ' · ' + dataCurta(g.emissio) : ''} · ${esc(g.tipusEp === 'dialeg' ? titolDialeg({ classics: g.classics || [], contemporanis: g.contemporanis || [] }) || g.titol : g.tipusEp === 'tematic' ? 'Temàtic' + (g.tema ? ' ' + g.tema : '') : g.titol)}` : 'Tot fet ✓'}</span></button>`).join('')}</div>
    <div class="legend pla-llegenda">${musical ? ['dialeg', 'pindola', 'tematic'].map((k) => `<span><span class="caixa t-${k}"></span>${TIPUS_PLA[k]}</span>`).join('') : ''}
      <span><span class="caixa marca-enviar"></span>Per enviar</span><span><span class="caixa marca-gravar"></span>Per gravar</span>
      <span class="hint">${esc(p.nom)} · ${eps.length} ${musical ? 'episodis' : 'programes'}</span></div>
    ${blocRefer(p.id)}${blocAvisos(p.id)}${musical ? blocPropostes() : blocPotencials(p.id)}
    <div id="plaCerca" class="pla-cerca-res" hidden></div>
    <div id="plaLlista"></div>`;
  $('#potencials')?.addEventListener('toggle', (e) => { ui.potObert = e.target.open; });
  plaLlista();
}
function plaLlista() {
  const pid = ui.planProg, musical = esMusical(pid), est = estatsPla(pid), [capA, capB] = capPla(pid);
  const eps = episodisPla(pid);
  const env = eps.find((g) => !fet(g, kEnvia(pid))), grav = eps.find((g) => !fet(g, 'gravat'));
  const q = clauCerca(ui.cercaPla || ''), f = ui.filtrePla || 'tots';
  const textEp = (g) => clauCerca([g.titol, g.tema, g.descripcio, textMusica(g), textCanco([...(g.classics || []), ...(g.contemporanis || [])]).join(' '), textCanco(g.cancons).join(' '), g.notes].join(' '));
  const coincideix = (g) => !q || q.split(' ').every((w) => textEp(g).includes(w));
  const rows = filtraPla(eps, f).filter(coincideix);
  resultatCerca(eps.filter(coincideix), rows, q, musical);
  const marca = (g) => (g === env ? 'enviar' : g === grav ? 'gravar' : '');
  const etiqueta = (g) => (g === env ? `<span class="pla-marca enviar ${avisEnviament(g).cls}">${esc(avisEnviament(g).txt)}</span>` : g === grav ? '<span class="pla-marca gravar">Gravar</span>' : '')
    + (g.referGuio ? '<span class="pla-marca refer">⚠ Refer guió</span>' : '')
    + (g.david && !esDavid() ? `<span class="pla-marca david ${g.david.vist ? 'vist' : ''}" title="Canviat per en David: ${esc(quanDavid(g))}">✎ David${g.david.vist ? ' · ' + esc(quanDavid(g)) : ''}</span>` : '');
  // Entrevistes sense «Confirmat»: botó per enviar la invitació al convidat
  const invPla = (g) => {
    if (musical || fet(g, 'confirmat') || !g.titol) return '';
    const per = state.persones.find((x) => (g.convidatsIds || []).includes(x.id));
    return `<button class="btn small pla-inv nomes-angel" data-action="invita-ep" data-id="${g.id}">📨 Invitació${per?.invitat ? ` <span>· enviada ${esc(dataCurta(per.invitat))}</span>` : ''}</button>`;
  };
  const taula = `<div class="panel pla-taula"><table>
    <thead><tr><th>Núm.</th>${musical ? '<th>Tipus</th>' : ''}<th>Emissió</th><th>${capA}</th><th>${capB}</th>${est.map(([, n]) => `<th class="c">${n}</th>`).join('')}<th>Notes</th></tr></thead>
    <tbody>${rows.map((g) => { const [a, b] = columnesPla(g); return `<tr id="pla-${g.id}" class="t-${tipusPla(g)} ${marca(g)}">
      <td class="nowrap"><button class="pla-n" data-action="edita" data-id="${g.id}">${g.numero}</button>${etiqueta(g)}</td>
      ${musical ? `<td>${TIPUS_PLA[g.tipusEp]}</td>` : ''}
      <td class="nowrap">${g.emissio ? dataCurta(g.emissio) : '—'}</td>
      <td class="pla-obre" data-action="edita" data-id="${g.id}">${a}${invPla(g)}</td>
      <td class="pla-obre" data-action="edita" data-id="${g.id}">${b}</td>
      ${est.map(([k]) => `<td class="c pcel pc-${k} ${fet(g, k) ? 'si' : rosaPla(k, pid) ? 'no' : ''}"><input type="checkbox" data-pla="${g.id}" data-k="${k}" ${fet(g, k) ? 'checked' : ''} ${potMarcar(g, k) ? '' : 'disabled'} aria-label="${k}"></td>`).join('')}
      <td class="pla-notes">${esc(g.notes || '')}</td></tr>`; }).join('')}</tbody></table></div>`;
  const targetes = `<div class="pla-cards">${rows.map((g) => { const [a, b] = columnesPla(g); return `<div id="plac-${g.id}" class="pla-card t-${tipusPla(g)} ${marca(g)} ${est.length > 5 ? 'pla-7' : ''}">
      <button class="pla-cos" data-action="edita" data-id="${g.id}">
        <span class="pla-cap"><b>${g.numero}</b>${musical ? ' · ' + TIPUS_PLA[g.tipusEp] : ''}${g.emissio ? ' · ' + dataCurta(g.emissio) : ''} ${etiqueta(g)}</span>
        <span class="pla-l">${a}</span>${b ? `<span class="pla-l">${b}</span>` : ''}
        ${g.notes ? `<span class="pla-l pla-notes">${esc(g.notes)}</span>` : ''}
      </button>${invPla(g) ? `<div class="pla-inv-c">${invPla(g)}</div>` : ''}
      <div class="pla-checks">${checksPla(g)}</div></div>`; }).join('')}</div>`;
  $('#plaLlista').innerHTML = rows.length ? taula + targetes : '<p class="empty">Cap episodi amb aquests filtres.</p>';
}
// Resposta clara a «el tenim a la planificació?»: on surt (a tota la llista, encara que el filtre n'amagui)
function resultatCerca(tots, visibles, q, musical) {
  const el = $('#plaCerca');
  if (!el) return;
  el.hidden = !q;
  if (!q) { el.innerHTML = ''; return; }
  const paraula = esc(ui.cercaPla.trim());
  if (!tots.length) { el.className = 'pla-cerca-res no'; el.innerHTML = `✗ «${paraula}» no surt a cap ${musical ? 'episodi' : 'programa'} de la planificació.`; return; }
  const on = (g) => {
    if (!musical) return '';
    const w = q.split(' '), te = (a) => a && w.every((x) => clauCerca([a.artista, a.disc, a.canco].join(' ')).includes(x));
    return (g.classics || []).some(te) ? ' · clàssic' : (g.contemporanis || []).some(te) ? ' · alternatiu' : '';
  };
  const nom = (g) => (g.tipusEp === 'dialeg' ? titolDialeg({ classics: g.classics || [], contemporanis: g.contemporanis || [] }) || g.titol : g.tipusEp === 'tematic' ? 'Temàtic ' + (g.tema || '') : g.titol) || '';
  const amagats = tots.length - visibles.length;
  el.className = 'pla-cerca-res si';
  el.innerHTML = `✓ «${paraula}» surt a ${tots.length === 1 ? '1 ' + (musical ? 'episodi' : 'programa') : tots.length + (musical ? ' episodis' : ' programes')}:
    ${tots.map((g) => `<button class="pla-cerca-ep" data-action="ves-pla" data-id="${g.id}"><b>${g.numero}</b>${g.emissio ? ' · ' + dataCurta(g.emissio) : ''} · ${esc(nom(g))}${on(g)}${fet(g, 'emes') ? ' · <i>emès</i>' : ''}</button>`).join('')}
    ${amagats ? `<span class="hint">${amagats} no es veu${amagats > 1 ? 'en' : ''} a la llista pel filtre triat. Posa «Tots els episodis» per veure'ls.</span>` : ''}`;
}
/* ---------- Correu a l'emissora ---------- */
// Text per enganxar al correu de cada setmana, amb les dades del programa que toca enviar
const majus = (t) => String(t || '').toLocaleUpperCase('ca');
function textEmissora(g, enllac) {
  const p = prog(g.programaId), musical = esMusical(g.programaId);
  const art = (a) => [majus(a?.artista), a?.disc].filter(Boolean).join(' — ');
  const noms = (ll) => (ll || []).map((a) => a?.artista).filter(Boolean).join(', ');
  let cos;
  if (!musical) cos = [`El convidat d'aquesta setmana és: ${majus(g.titol) || '(convidat)'}`];
  else if (g.tipusEp === 'dialeg') cos = [`Episodi ${g.numero} · Diàleg`, `Clàssic: ${art(g.classics?.[0]) || '(per decidir)'}`, `Contemporani: ${art(g.contemporanis?.[0]) || '(per decidir)'}`];
  else if (g.tipusEp === 'pindola') cos = [`Episodi ${g.numero} · ${g.titol || 'Píndola resum'}`, `Clàssics: ${noms(g.classics) || '(per decidir)'}`, `Alternatius: ${noms(g.contemporanis) || '(per decidir)'}`];
  else cos = [`Episodi ${g.numero} · Temàtic${g.tema ? ': ' + g.tema : ''}`, `Clàssics: ${noms(g.classics) || '(per decidir)'}`, `Alternatius: ${noms(g.contemporanis) || '(per decidir)'}`];
  return [`Bones, us adjunto en l'enllaç el programa de la setmana que ve de ${p?.nom || 'el podcast'}.`, '',
    ...cos, '', enllac || '[enllaç de WeTransfer]', '', 'Moltes gràcies.', '', 'Àngel Ayats.'].join('\n');
}
function correuEmissora() {
  const pid = ui.planProg, eps = episodisPla(pid);
  const pendents = eps.filter((g) => !fet(g, kEnvia(pid)));
  if (!pendents.length) return toast('No hi ha cap programa pendent d\'enviar.');
  const nomEp = (g) => `${g.numero} · ${g.emissio ? `enviar ${dataBreu(diaEnviament(g.emissio))} · emissió ${dataBreu(g.emissio)} · ` : ''}${g.tipusEp === 'dialeg' ? titolDialeg({ classics: g.classics || [], contemporanis: g.contemporanis || [] }) || g.titol : g.tipusEp === 'tematic' ? 'Temàtic ' + (g.tema || '') : g.titol}`;
  openDialog(`<h3>Correu a l'emissora</h3>
    <label>Programa <select name="ep">${pendents.slice(0, 12).map((g, i) => `<option value="${g.id}" ${i ? '' : 'selected'}>${esc(nomEp(g))}</option>`).join('')}</select></label>
    <label>Enllaç de WeTransfer <input name="enllac" type="url" placeholder="https://we.tl/…" autocomplete="off"></label>
    <label>Text del correu <textarea name="text" rows="12"></textarea></label>
    <span class="hint">Pots retocar el text abans de copiar-lo. Després enganxa'l al correu i adjunta-hi les fotos.</span>`, {
    onSave: () => false,
    extraButtons: '<button type="button" class="btn" data-dlg="enviat">✓ Marca com a enviat</button><button type="button" class="btn primary" data-dlg="copia">Copia el text</button>',
    onExtra(a) {
      const f = $('#dlgForm'), g = state.gravacions.find((x) => x.id === f.elements.ep.value);
      if (a === 'copia') return toast(copiaAra(f.elements.text.value) ? 'Text copiat. Enganxa\'l al correu.' : 'No s\'ha pogut copiar: selecciona el text i copia\'l a mà.');
      if (a === 'enviat' && g) {
        g.pla = { ...(g.pla || {}), [kEnvia(pid)]: true };
        save(); closeDialog(); render(); toast(`Programa ${g.numero} marcat com a enviat.`);
      }
    },
  });
  $('#dlgForm button[type="submit"]').hidden = true;
  const f = $('#dlgForm');
  const omple = () => { const g = state.gravacions.find((x) => x.id === f.elements.ep.value); if (g) f.elements.text.value = textEmissora(g, f.elements.enllac.value.trim()); };
  f.elements.ep.addEventListener('change', omple);
  f.elements.enllac.addEventListener('input', omple);
  omple();
}

/* ---------- Convidats potencials (La cara oculta) ---------- */
// Són els convidats de la fitxa de persones marcats com a potencials que encara no tenen programa a la planificació
const ESTATS_POT = [['idea', '💡 Idea'], ['contactat', '📨 Contactat'], ['esperant', '⏳ Esperant resposta'], ['descartat', '✖ Descartat']];
const enPlanificacio = (persId, pid) => state.gravacions.some((g) => g.programaId === pid && Number(g.numero) > 0 && g.estat !== 'cancellat' && (g.convidatsIds || []).includes(persId));
function potencials(pid) {
  const ordre = { esperant: 0, contactat: 1, idea: 2, descartat: 3 };
  return state.persones.filter((x) => x.tipus === 'convidat' && x.potencial && !enPlanificacio(x.id, pid))
    .sort((a, b) => (ordre[a.estatPot || 'idea'] - ordre[b.estatPot || 'idea']) || a.nom.localeCompare(b.nom, 'ca'));
}
function blocPotencials(pid) {
  const tots = potencials(pid), actius = tots.filter((x) => x.estatPot !== 'descartat');
  const llista = ui.potDescartats ? tots : actius;
  const compte = ESTATS_POT.filter(([k]) => k !== 'descartat').map(([k, nom]) => [nom, actius.filter((x) => (x.estatPot || 'idea') === k).length]).filter(([, n]) => n);
  return `<details class="pot nomes-angel" id="potencials" ${ui.potObert ? 'open' : ''}>
    <summary><b>Convidats potencials · ${actius.length}</b><span class="hint">${compte.map(([nom, n]) => `${nom} ${n}`).join(' · ')}</span></summary>
    <div class="pot-barra">
      <button class="btn primary small" data-action="nou-potencial">+ Convidat potencial</button>
      <label class="check"><input type="checkbox" data-pot-descartats ${ui.potDescartats ? 'checked' : ''}> Mostra els descartats (${tots.length - actius.length})</label>
      <span class="hint">Quan un et digui que sí, prem «✓ Ha dit que sí» i entrarà al final de la planificació.</span>
    </div>
    ${llista.length ? `<div class="pot-llista">${llista.map((x) => `<div class="pot-f ${x.estatPot === 'descartat' ? 'descartat' : ''}">
      <button class="pot-nom" data-action="edita-persona" data-id="${x.id}"><b>${esc(x.nom)}</b>${x.qui ? `<span>${esc(x.qui)}</span>` : ''}
        ${x.invitat ? `<span class="pot-inv">📨 Invitació enviada el ${dataCurta(x.invitat)}</span>` : ''}
        ${x.notes ? `<span class="pot-notes">${esc(x.notes)}</span>` : ''}</button>
      <span class="pot-cont">${x.telefon ? '📞' : ''}${x.email ? '✉️' : ''}</span>
      <select data-pot="${x.id}" aria-label="Estat de ${esc(x.nom)}">${ESTATS_POT.map(([k, nom]) => `<option value="${k}" ${(x.estatPot || 'idea') === k ? 'selected' : ''}>${nom}</option>`).join('')}</select>
      <span class="pot-bots"><button class="btn small" data-action="invita-potencial" data-id="${x.id}" title="Envia la invitació oficial">📨 Invitació</button>
      <button class="btn small pot-si" data-action="si-potencial" data-id="${x.id}">✓ Ha dit que sí</button></span>
    </div>`).join('')}</div>` : '<p class="hint">Encara no hi ha cap convidat potencial. Afegeix-ne amb «+ Convidat potencial».</p>'}
  </details>`;
}
// «Ha dit que sí»: entra al final de la planificació amb el número i el dia d'emissió següents, i Confirmat marcat
function siPotencial(id) {
  const x = pers(id), pid = ui.planProg;
  if (!x || esMusical(pid)) return;
  const eps = episodisPla(pid), ult = eps[eps.length - 1];
  const numero = ult ? Number(ult.numero) + 1 : 1;
  const emissio = ult?.emissio ? seguentEmissio(ult.emissio) : '';
  const jaHi = eps.find((g) => clauCerca(g.titol) === clauCerca(x.nom) || (g.convidatsIds || []).some((i) => clauCerca(pers(i)?.nom) === clauCerca(x.nom)));
  if (jaHi) {
    if (!confirm(`Compte: ${x.nom} ja és a la planificació, al programa ${jaHi.numero}${jaHi.emissio ? ` (${dataCurta(jaHi.emissio)})` : ''}.

Si és la mateixa persona, prem Cancel·la: no cal tornar-lo a afegir.

Vols afegir-lo igualment com a programa nou?`)) return;
  } else
  if (!confirm(`${x.nom} entrarà a la planificació com a programa ${numero}${emissio ? `, amb emissió el ${dataCurta(emissio)}` : ''}, amb Confirmat marcat.\n\nContinuar?`)) return;
  const g = { id: uid(), programaId: pid, numero, emissio, horaEmissio: ult?.horaEmissio || '', titol: x.nom, descripcio: x.qui || '',
    convidatsIds: [x.id], convidats: x.nom, estat: 'confirmat', data: '', hora: '', durada: 60, estudi: '', enllac: '',
    presentadors: [], tecnic: '', notes: '', checklist: {}, cancons: [],
    pla: { confirmat: true, cancons: false, guio: false, gravat: false, editat: false, enviat: false, emes: false, noticia: false } };
  state.gravacions.push(g);
  x.potencial = false; x.estatPot = 'si';
  save(); render();
  setTimeout(() => vesPla(g.id), 60);
  toast(`${x.nom}: programa ${numero}${emissio ? ' · ' + dataCurta(emissio) : ''}.`);
}

// Porta a la vista l'episodi (a la taula o a les targetes, segons la pantalla)
function vesPla(id) {
  const el = document.getElementById((mobil.matches ? 'plac-' : 'pla-') + id);
  if (!el) return;
  el.scrollIntoView({ behavior: 'smooth', block: 'center' });
  el.classList.remove('flash'); void el.offsetWidth; el.classList.add('flash');
}

// Renumeració: els episodis emesos no es toquen; la resta rep número i data seguits (el mateix dia de la setmana que l'últim emès)
function seguentEmissio(ds) {
  const dia = parseYmd(ds).getDay();
  let d = addDays(parseYmd(ds), 7);
  if (d.getMonth() === 6 || d.getMonth() === 7) {           // juliol i agost, vacances: es torna el 2n dia d'emissió de setembre
    d = new Date(d.getFullYear(), 8, 1);
    while (d.getDay() !== dia) d = addDays(d, 1);
    d = addDays(d, 7);
  }
  return ymd(d);
}
// Entrevista: un convidat per programa. Els que ja tenen data de gravació però encara no número s'afegeixen al final;
// els cancel·lats deixen el seu número
function renumeracioEntrevista(pid) {
  const eps = episodisPla(pid);
  const ultEmes = eps.reduce((ix, g, i) => (fet(g, 'emes') ? i : ix), -1);
  const fixos = eps.slice(0, ultEmes + 1), resta = eps.slice(ultEmes + 1);
  const jaHiSon = new Set(eps.flatMap((g) => g.convidatsIds || []));   // la cita de gravació d'un convidat que ja té programa no en crea un altre
  const sense = state.gravacions.filter((g) => g.programaId === pid && !(Number(g.numero) > 0) && g.estat !== 'cancellat' && (g.data || esGravat(g))
    && !(g.convidatsIds || []).some((c) => jaHiSon.has(c))).sort(ordena);
  const cancel = state.gravacions.filter((g) => g.programaId === pid && Number(g.numero) > 0 && g.estat === 'cancellat' && !fet(g, 'emes'));
  const ordre = [...resta, ...sense].map((g) => [g, {}]);
  numeraOrdre(ordre, fixos);
  cancel.forEach((g) => ordre.push([g, { numero: '', emissio: g.emissio }]));
  const num = fixos.length ? Number(fixos[fixos.length - 1].numero) + resta.length + sense.length : resta.length + sense.length;
  const canvis = ordre.filter(([g, x]) => g.numero !== x.numero || (x.emissio && g.emissio !== x.emissio)).length;
  return { ordre, nous: [], sobrants: [], canvis, afegits: sense.length, cancel: cancel.length, desDe: fixos.length ? Number(fixos[fixos.length - 1].numero) + 1 : 1, finsA: num };
}
// Posa número i data d'emissió seguits a partir de l'últim episodi emès
function numeraOrdre(ordre, fixos) {
  let num = fixos.length ? Number(fixos[fixos.length - 1].numero) : 0;
  let data = fixos.length ? fixos[fixos.length - 1].emissio : '';
  const hora = fixos[fixos.length - 1]?.horaEmissio || '';
  ordre.forEach(([g, extra]) => {
    num++;
    if (data) data = seguentEmissio(data);
    extra.numero = num;
    if (data) { extra.emissio = data; if (!g.horaEmissio && hora) extra.horaEmissio = hora; }
  });
  return num;
}
function nouEpPla(pid, tipus) {
  return { id: uid(), programaId: pid, tipusEp: tipus, titol: tipus === 'tematic' ? 'Temàtic per decidir' : '', tema: '', numero: 0, data: '', hora: '', durada: 60,
    estat: 'pendent', presentadors: [], tecnic: '', notes: '', classics: [], contemporanis: [], emissio: '', horaEmissio: '', pla: {} };
}
function calculaRenumeracio(pid) {
  if (!esMusical(pid)) return renumeracioEntrevista(pid);
  const eps = episodisPla(pid);
  const ultEmes = eps.reduce((ix, g, i) => (fet(g, 'emes') ? i : ix), -1);
  const fixos = eps.slice(0, ultEmes + 1), resta = eps.slice(ultEmes + 1);
  let grup = [];                                              // diàlegs ja emesos del grup en curs
  for (let i = fixos.length - 1; i >= 0 && fixos[i].tipusEp === 'dialeg'; i--) grup.unshift(fixos[i]);
  let pinds = 0;                                              // píndoles des de l'últim temàtic
  for (let i = fixos.length - 1; i >= 0 && fixos[i].tipusEp !== 'tematic'; i--) if (fixos[i].tipusEp === 'pindola') pinds++;
  let nP = fixos.filter((g) => g.tipusEp === 'pindola').length;
  const dialegs = resta.filter((g) => g.tipusEp === 'dialeg'), tematics = resta.filter((g) => g.tipusEp === 'tematic');
  const velles = resta.filter((g) => g.tipusEp === 'pindola'), nous = [], ordre = [];
  const posaPindola = () => {
    nP++;
    const p = velles.shift() || (nous.push(nouEpPla(pid, 'pindola')), nous[nous.length - 1]);
    const canco = (a) => (p.classics || []).find((x) => x.artista && x.artista === a)?.canco;
    ordre.push([p, { titol: `Píndola resum ${nP}`, classics: grup.map((d) => { const a = d.classics?.[0]?.artista || ''; return { artista: a, disc: '', ...(canco(a) ? { canco: canco(a) } : {}) }; }) }]);
    grup = []; pinds++;
    if (pinds === 2) { pinds = 0; ordre.push([tematics.shift() || (nous.push(nouEpPla(pid, 'tematic')), nous[nous.length - 1]), {}]); }
  };
  for (const d of dialegs) { if (grup.length === 4) posaPindola(); ordre.push([d, {}]); grup.push(d); }
  if (grup.length === 4) posaPindola();
  tematics.forEach((t) => ordre.push([t, {}]));
  const num = numeraOrdre(ordre, fixos);
  const canvis = ordre.filter(([g, x]) => g.numero !== x.numero || (x.emissio && g.emissio !== x.emissio) || (x.titol && g.titol !== x.titol)).length;
  return { ordre, nous, sobrants: velles, canvis, desDe: fixos.length ? num - ordre.length + 1 : 1, finsA: num };
}
function renumera() {
  const r = calculaRenumeracio(ui.planProg);
  if (!r.canvis && !r.nous.length && !r.sobrants.length) return toast('La numeració ja està bé: no cal canviar res.');
  const musical = esMusical(ui.planProg);
  const txt = [musical ? `Es tornarà a numerar del ${r.desDe} al ${r.finsA} seguint el cicle (4 diàlegs · píndola · 4 diàlegs · píndola · temàtic), amb les dates dels dissabtes.`
    : `Es tornarà a numerar del ${r.desDe} al ${r.finsA}: un programa cada setmana, el mateix dia que l'últim emès, amb vacances al juliol i a l'agost.`,
    `${r.canvis} ${musical ? 'episodis canvien de número, data o títol' : 'programes canvien de número o de data'}.`,
    r.afegits ? `S'afegeixen al final ${r.afegits} convidats que ja tenen data de gravació però encara no tenien número.` : '',
    r.cancel ? `${r.cancel} programes cancel·lats deixen el seu número.` : '',
    r.nous.length ? `Es creen ${r.nous.length} episodis nous (píndoles o temàtics per decidir).` : '',
    r.sobrants.length ? `S'esborren ${r.sobrants.length} píndoles que ja no tenen lloc.` : '',
    'Els episodis emesos no es toquen. Continuar?'].filter(Boolean).join('\n\n');
  if (!confirm(txt)) return;
  r.ordre.forEach(([g, x]) => Object.assign(g, x));
  state.gravacions.push(...r.nous);
  const fora = new Set(r.sobrants.map((g) => g.id));
  state.gravacions = state.gravacions.filter((g) => !fora.has(g.id));
  save(); render(); toast('Planificació renumerada.');
}

// Exporta la planificació a un Excel com el de treball: logo, tauler, colors i caselles (☑ / ☐)
const EXCELJS = 'https://cdnjs.cloudflare.com/ajax/libs/exceljs/4.4.0/exceljs.min.js';
let exceljsCarregat = null;
const carregaExceljs = () => exceljsCarregat || (exceljsCarregat = new Promise((ok, ko) => {
  const sc = Object.assign(document.createElement('script'), { src: EXCELJS, onload: () => ok(window.ExcelJS), onerror: () => { exceljsCarregat = null; ko(); } });
  document.head.append(sc);
}));
async function exportaPla(eps) {
  const p = prog(ui.planProg), musical = esMusical(p.id), est = estatsPla(p.id);
  if (!eps.length) return toast('No hi ha episodis per exportar.');
  toast("Preparant l'Excel…");
  let ExcelJS;
  try { ExcelJS = await carregaExceljs(); } catch (e) { return toast("No s'ha pogut preparar l'Excel. Comprova la connexió."); }
  const SI = '☑', NO = '☐';
  const hx = (c) => c.replace('#', '');
  const C = { enviar: 'FF7A1F', gravar: '1F66C9', guio: '6E4FC0', pendent: 'F4AFAF', cap: '111111' };
  const ple = (c) => ({ type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF' + c }, bgColor: { argb: 'FF' + c } });
  const linia = { style: 'thin', color: { argb: 'FFD0D0D0' } }, vores = { top: linia, bottom: linia, left: linia, right: linia };
  const wb = new ExcelJS.Workbook();
  wb.creator = APP.nom; wb.calcProperties.fullCalcOnLoad = true;
  const sh = wb.addWorksheet('Planificació', {
    views: [{ state: 'frozen', ySplit: 9 }],
    pageSetup: { orientation: 'landscape', paperSize: 9, fitToPage: true, fitToWidth: 1, fitToHeight: 0, printTitlesRow: '9:9' },
  });
  // Columnes: musical = Núm · Tipus · Data · 4 de música · 5 caselles · Notes; entrevista = Núm · Data · Convidat · Qui és · Cançons · 7 caselles · Notes
  const amples = musical ? [7, 10, 13, 28, 36, 28, 36, 9, 9, 9, 9, 9, 9, 30] : [7, 13, 24, 32, 48, 11, 10, 8, 9, 9, 9, 8, 10, 30];
  const nCols = amples.length, cEst = musical ? 8 : 6;
  const lletra = (n) => String.fromCharCode(64 + n);
  const colK = (k) => lletra(cEst + est.findIndex(([x]) => x === k));
  const colData = musical ? 'C' : 'B', colNom = musical ? 'D' : 'C';
  sh.columns = amples.map((width) => ({ width }));
  const F0 = 10, ult = F0 + eps.length - 1;

  // Capçalera: el logo de Blanc & Negre, o el nom del programa en el seu color
  let ambLogo = false;
  if (musical) {
    try {
      const buffer = await fetch('img/capcalera-blanc-i-negre.png').then((r) => r.arrayBuffer());
      sh.addImage(wb.addImage({ buffer, extension: 'png' }), { tl: { col: 0, row: 0 }, br: { col: nCols, row: 1 }, editAs: 'twoCell' });
      sh.getRow(1).height = 148.5; ambLogo = true;
    } catch (e) { /* sense logo */ }
  }
  if (!ambLogo) {
    sh.mergeCells(1, 1, 1, nCols);
    Object.assign(sh.getCell('A1'), { value: p.nom, fill: ple(hx(p.color || '#3D4B6B')), font: { bold: true, size: 22, color: { argb: 'FFFFFFFF' } }, alignment: { vertical: 'middle', indent: 1 } });
    sh.getRow(1).height = 46;
  }
  sh.getCell('A2').value = musical ? 'Cicle: 4 diàlegs · píndola · 4 diàlegs · píndola · temàtic. Emissió cada dissabte; juliol i agost, vacances.'
    : 'Un convidat per programa, amb 4 cançons. Emissió cada setmana; juliol i agost, vacances.';
  sh.getCell('A2').font = { italic: true, color: { argb: 'FF666666' } };
  sh.getCell('A3').value = `Exportat de l'app el ${dataCurta(ymd(new Date()))}`;
  sh.getCell('A3').font = { italic: true, size: 9, color: { argb: 'FF888888' } };

  // Tauler: es recalcula sol quan es canvien les caselles
  const R = (c) => `$${c}$${F0}:$${c}$${ult}`, M = (c) => `MATCH("${NO}",${R(c)},0)`;
  const nomEp = (g) => (g.tipusEp === 'dialeg' ? g.classics?.[0]?.artista || g.titol : g.titol);
  const primer = (k) => eps.find((g) => !fet(g, k));
  const resultat = (g, ambData) => (g ? `Ep. ${g.numero}${ambData && g.emissio ? ' · ' + g.emissio.split('-').reverse().map(Number).join('/') : ''} · ${nomEp(g)}` : '—');
  [["Enviar a l'emissora", C.enviar, kEnvia(p.id), true], ['Proper a gravar', C.gravar, 'gravat', false], ['Proper guió', C.guio, 'guio', false]].forEach(([nom, col, k, ambData], i) => {
    const r = 4 + i, ck = colK(k);
    sh.mergeCells(r, 1, r, 3); sh.mergeCells(r, 4, r, 7);
    Object.assign(sh.getCell(r, 1), { value: nom, fill: ple(col), font: { bold: true, color: { argb: 'FFFFFFFF' } }, alignment: { vertical: 'middle', indent: 1 } });
    const data = ambData ? `&" · "&DAY(INDEX(${R(colData)},${M(ck)}))&"/"&MONTH(INDEX(${R(colData)},${M(ck)}))&"/"&YEAR(INDEX(${R(colData)},${M(ck)}))` : '';
    sh.getCell(r, 4).value = { formula: `IFERROR("Ep. "&INDEX(${R('A')},${M(ck)})${data}&" · "&INDEX(${R(colNom)},${M(ck)}),"—")`, result: resultat(primer(k), ambData) };
    sh.getCell(r, 4).font = { bold: true, size: 12 };
    sh.getRow(r).height = 20;
  });
  // Llegenda
  const llegenda = musical ? [['Diàleg', hx(COL_TIPUS.dialeg)], ['Píndola', hx(COL_TIPUS.pindola)], ['Temàtic', hx(COL_TIPUS.tematic)]] : [];
  [...llegenda, ['Emès', hx(COL_FET.emes)], ['Gravat', hx(COL_FET.gravat)], ['Pendent', C.pendent]].forEach(([t, col], i) => {
    const r = 4 + Math.floor(i / 3), c = 8 + (i % 3) * 2;
    sh.mergeCells(r, c, r, c + 1);
    Object.assign(sh.getCell(r, c), { value: t, fill: ple(col), border: vores, alignment: { horizontal: 'center' } });
  });

  // Capçalera de la taula i files
  const cap = musical ? ['Núm.', 'Tipus', 'Data emissió', 'Artista clàssic / Títol', 'Disc clàssic / Tema', 'Artista contemporani', 'Disc contemporani', ...est.map(([, n]) => n), 'Notes']
    : ['Núm.', 'Data emissió', 'Convidat', 'Qui és', 'Cançons', ...est.map(([, n]) => n), 'Notes'];
  const fc = sh.getRow(F0 - 1);
  cap.forEach((t, i) => Object.assign(fc.getCell(i + 1), { value: t, fill: ple(C.cap), font: { bold: true, color: { argb: 'FFFFFFFF' } }, border: vores,
    alignment: { horizontal: 'center', vertical: 'middle', wrapText: true } }));
  fc.height = 30;
  const centrades = [1, musical ? 2 : 0, musical ? 3 : 2, ...est.map((_, i) => cEst + i)];
  eps.forEach((g, i) => {
    const r = sh.getRow(F0 + i), t = tipusPla(g);
    const data = g.emissio ? new Date(Date.UTC(...g.emissio.split('-').map((x, j) => Number(x) - (j === 1 ? 1 : 0)))) : null;
    const [c0, n0] = [g.classics?.[0] || {}, g.contemporanis?.[0] || {}];
    const vals = !musical ? [g.titol || '', g.descripcio || '', textCanco(g.cancons).join('\n')]
      : t === 'dialeg' ? [c0.artista || '', c0.disc || '', n0.artista || '', n0.disc || '']
        : t === 'pindola' ? [g.titol || 'Píndola resum', textCanco(g.classics).join(', '), textCanco(g.contemporanis).join(', '), '']
          : ['Temàtic' + (g.tema ? ' · ' + g.tema : ''), textCanco(g.classics).join(', '), textCanco(g.contemporanis).join(', '), ''];
    r.values = musical ? [g.numero, TIPUS_PLA[t], data, ...vals, ...est.map(([k]) => (fet(g, k) ? SI : NO)), g.notes || '']
      : [g.numero, data, ...vals, ...est.map(([k]) => (fet(g, k) ? SI : NO)), g.notes || ''];
    r.eachCell({ includeEmpty: true }, (cel, c) => {
      cel.fill = ple(hx(COL_TIPUS[t])); cel.border = vores;
      cel.alignment = { vertical: 'middle', horizontal: centrades.includes(c) ? 'center' : 'left', wrapText: c === nCols || (!musical && c >= 4 && c <= 5) };
    });
    r.getCell(colData).numFmt = 'dd/mm/yyyy';
    r.getCell(colNom).font = { bold: true, italic: musical && t !== 'dialeg' };
    if (musical && t === 'dialeg') r.getCell(6).font = { bold: true };
    est.forEach((_, j) => {
      r.getCell(cEst + j).font = { size: 13 };
      r.getCell(cEst + j).dataValidation = { type: 'list', allowBlank: false, formulae: [`"${SI},${NO}"`] };
    });
  });

  // Colors que canvien sols: fila a enviar (taronja), fila a gravar (blau) i caselles d'estat
  const cfFill = (col) => ({ fill: { type: 'pattern', pattern: 'solid', bgColor: { argb: 'FF' + col } } });
  const zona = `A${F0}:${lletra(nCols)}${ult}`, kE = colK(kEnvia(p.id)), kG = colK('gravat');
  sh.addConditionalFormatting({ ref: zona, rules: [
    { type: 'expression', priority: 1, stopIfTrue: true, formulae: [`AND($${kE}${F0}="${NO}",COUNTIF($${kE}$${F0 - 1}:$${kE}${F0 - 1},"${NO}")=0)`], style: { ...cfFill(C.enviar), font: { bold: true, color: { argb: 'FFFFFFFF' } } } },
    { type: 'expression', priority: 2, stopIfTrue: true, formulae: [`AND($${kG}${F0}="${NO}",COUNTIF($${kG}$${F0 - 1}:$${kG}${F0 - 1},"${NO}")=0)`], style: { ...cfFill(C.gravar), font: { bold: true, color: { argb: 'FFFFFFFF' } } } },
  ] });
  est.forEach(([k], i) => {
    const c = colK(k);
    const regles = [{ type: 'expression', priority: 3 + i * 2, formulae: [`$${c}${F0}="${SI}"`], style: cfFill(hx(COL_FET[k])) }];
    if (rosaPla(k, p.id)) regles.push({ type: 'expression', priority: 4 + i * 2, formulae: [`$${c}${F0}="${NO}"`], style: cfFill(C.pendent) });
    sh.addConditionalFormatting({ ref: `${c}${F0}:${c}${ult}`, rules: regles });
  });
  sh.autoFilter = { from: { row: F0 - 1, column: 1 }, to: { row: ult, column: nCols } };

  // Desa o comparteix (al iPhone, el full de compartir permet desar-lo a Fitxers o enviar-lo)
  const buf = await wb.xlsx.writeBuffer();
  const nom = nomFitxerPla('xlsx');
  const tipus = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
  const fitxer = new File([buf], nom, { type: tipus });
  if (mobil.matches && navigator.canShare?.({ files: [fitxer] })) {
    try { await navigator.share({ files: [fitxer] }); } catch (e) { /* cancel·lat */ }
    return;
  }
  const a = Object.assign(document.createElement('a'), { href: URL.createObjectURL(new Blob([buf], { type: tipus })), download: nom });
  document.body.append(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(a.href), 4000);
  toast('Excel descarregat.');
}

// Quins episodis entren a l'Excel, al PDF o a la impressió (com el filtre de la Planificació)
function triaExportacio() {
  const filtres = filtresPla();
  const actual = filtres.some(([v]) => v === ui.filtrePla) ? ui.filtrePla : 'tots';
  openDialog(`<h3>Exporta la planificació</h3>
    <label>Què hi entra <select name="quins">${filtres.map(([v, t]) => `<option value="${v}" ${v === actual ? 'selected' : ''}>${t}</option>`).join('')}</select></label>
    <div class="exporta-opcions">
      <button type="button" class="btn" data-dlg="pdf"><b>📄 PDF</b><span>Per enviar per WhatsApp o per correu</span></button>
      <button type="button" class="btn" data-dlg="imprimeix"><b>🖨 Imprimeix</b><span>Directament a la impressora</span></button>
      <button type="button" class="btn" data-dlg="excel"><b>📊 Excel</b><span>Per treballar-hi a l'ordinador</span></button>
    </div>`, {
    onSave: () => false,
    onExtra(a) {
      const eps = filtraPla(episodisPla(ui.planProg), $('#dlgForm').elements.quins.value);
      if (!eps.length) return toast('No hi ha cap episodi amb aquesta tria.');
      closeDialog();
      if (a === 'excel') exportaPla(eps);
      if (a === 'pdf') pdfPla(eps);
      if (a === 'imprimeix') imprimeixPla(eps);
    },
  });
  $('#dlgForm button[type="submit"]').hidden = true;
}

// Model comú del PDF i de la impressió: text de cada columna
const dataNum = (ds) => (ds ? ds.split('-').reverse().map(Number).join('/') : '');
function filaPla(g) {
  const t = tipusPla(g), c0 = g.classics?.[0] || {}, k0 = g.contemporanis?.[0] || {};
  const [a, b] = t === 'entrevista' ? [[g.titol || 'Convidat per decidir', g.descripcio], textCanco(g.cancons)]
    : t === 'dialeg' ? [[c0.artista || 'Clàssic per decidir', c0.disc], [k0.artista || 'Alternatiu per decidir', k0.disc]]
      : t === 'pindola' ? [[g.titol || 'Píndola resum', ...textCanco(g.classics)], ['', ...textCanco(g.contemporanis)]]
        : [['Temàtic', g.tema || 'Tema per decidir', ...textCanco(g.classics)], ['', ...textCanco(g.contemporanis)]];
  return { g, t, a: a.filter(Boolean), b: b.filter(Boolean) };
}
const taulerPla = (eps) => {
  const nomEp = (g) => (g.tipusEp === 'dialeg' ? titolDialeg({ classics: g.classics || [], contemporanis: g.contemporanis || [] }) || g.titol : g.tipusEp === 'tematic' ? `Temàtic ${g.tema || ''}`.trim() : g.titol);
  return [["Enviar a l'emissora", kEnvia(), '#FF7A1F', true], ['Proper a gravar', 'gravat', '#1F66C9'], ['Proper guió', 'guio', '#6E4FC0']].map(([nom, k, col, ambData]) => {
    const g = (k === 'guio' && eps.find((x) => x.referGuio)) || eps.find((x) => !fet(x, k));
    return { nom, col, g, text: g ? `Ep. ${g.numero}${ambData && g.emissio ? ' · ' + dataNum(g.emissio) : ''} · ${nomEp(g)}` : 'Tot fet' };
  });
};
const slugPla = () => (prog(ui.planProg)?.nom || 'Planificacio').normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/&/g, 'i').replace(/[^A-Za-z0-9]+/g, '-').replace(/^-|-$/g, '');
const nomFitxerPla = (ext) => `${slugPla()}-Planificacio-${ymd(new Date())}.${ext}`;
const COL_TIPUS = { dialeg: '#BFD7F5', pindola: '#FFDB70', tematic: '#D2B6F0', entrevista: '#D6DCEC' };
const COL_FET = { enviat: '#FFB27A', validat: '#FFC94D', canvi: '#FFC94D', confirmat: '#FFC94D', cancons: '#9FD9C9', guio: '#B99DE6', gravat: '#7FB0EE', editat: '#7FD0D6', emes: '#9FDB95', noticia: '#D9D46E' };

// Desa o comparteix un fitxer (al mòbil, el full de compartir: WhatsApp, Mail, Fitxers…)
async function lliuraFitxer(blob, nom) {
  const fitxer = new File([blob], nom, { type: blob.type });
  if (mobil.matches && navigator.canShare?.({ files: [fitxer] })) {
    try { await navigator.share({ files: [fitxer] }); } catch (e) { /* cancel·lat */ }
    return;
  }
  const a = Object.assign(document.createElement('a'), { href: URL.createObjectURL(blob), download: nom });
  document.body.append(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(a.href), 4000);
  toast('PDF descarregat: ja el pots adjuntar al WhatsApp o al correu.');
}

/* PDF de la planificació (A4 apaïsat): capçalera, tauler, llegenda i taula amb els colors de l'app */
const JSPDF = 'https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js';
const AUTOTABLE = 'https://cdnjs.cloudflare.com/ajax/libs/jspdf-autotable/3.8.2/jspdf.plugin.autotable.min.js';
const carregaScript = (src) => new Promise((ok, ko) => document.head.append(Object.assign(document.createElement('script'), { src, onload: ok, onerror: ko })));
let jspdfCarregat = null;
const carregaJspdf = () => jspdfCarregat || (jspdfCarregat = carregaScript(JSPDF).then(() => carregaScript(AUTOTABLE)).then(() => window.jspdf.jsPDF)
  .catch((e) => { jspdfCarregat = null; throw e; }));
// El logo es passa a JPEG més petit perquè el PDF pesi poc (per WhatsApp)
const imatgeDataUrl = (src) => new Promise((ok, ko) => {
  const img = new Image();
  img.onload = () => {
    const cv = Object.assign(document.createElement('canvas'), { width: 1600, height: Math.round(1600 * img.height / img.width) });
    cv.getContext('2d').drawImage(img, 0, 0, cv.width, cv.height);
    ok(cv.toDataURL('image/jpeg', 0.85));
  };
  img.onerror = ko;
  img.src = src;
});
async function pdfPla(eps) {
  toast('Preparant el PDF…');
  let JsPDF;
  try { JsPDF = await carregaJspdf(); } catch (e) { return toast("No s'ha pogut preparar el PDF. Comprova la connexió."); }
  const p = prog(ui.planProg), musical = esMusical(p.id), est = estatsPla(p.id), [capA, capB] = capPla(p.id);
  const doc = new JsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4', compress: true });
  const W = 297, M = 10, ample = W - 2 * M;
  const rgb = (h) => [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16));
  let y = M;
  let ambLogo = false;
  if (musical) {
    try { doc.addImage(await imatgeDataUrl('img/capcalera-blanc-i-negre.png'), 'JPEG', M, y, ample, ample * 340 / 2800); y += ample * 340 / 2800 + 4; ambLogo = true; } catch (e) { /* sense logo */ }
  }
  if (!ambLogo) {
    doc.setFillColor(...rgb(p.color || '#3D4B6B')); doc.rect(M, y, ample, 16, 'F');
    doc.setTextColor(255); doc.setFont('helvetica', 'bold'); doc.setFontSize(20); doc.text(p.nom, M + 5, y + 10.5);
    y += 20;
  }
  doc.setFont('helvetica', 'italic'); doc.setFontSize(8); doc.setTextColor(100);
  doc.text(`Planificació · ${eps.length} ${musical ? 'episodis' : 'programes'} · ${dataNum(ymd(new Date()))}${musical ? ' · Cicle: 4 diàlegs · píndola · 4 diàlegs · píndola · temàtic' : ' · Un convidat per programa, amb 4 cançons'}`, M, y);
  y += 3;
  // Tauler (sempre sobre tots els episodis)
  const bw = (ample - 8) / 3;
  taulerPla(episodisPla(ui.planProg)).forEach((x, i) => {
    const bx = M + i * (bw + 4);
    doc.setFillColor(...rgb(x.col)); doc.roundedRect(bx, y, bw, 12, 2, 2, 'F');
    doc.setTextColor(255); doc.setFont('helvetica', 'bold'); doc.setFontSize(7); doc.text(x.nom.toUpperCase(), bx + 3, y + 4.5);
    doc.setFontSize(9.5); doc.text(doc.splitTextToSize(x.text, bw - 6)[0], bx + 3, y + 9.5);
  });
  y += 16;
  const env = episodisPla(ui.planProg).find((g) => !fet(g, kEnvia())), grav = episodisPla(ui.planProg).find((g) => !fet(g, 'gravat'));
  const files = eps.map(filaPla);
  const off = musical ? 5 : 4;                                  // primera columna de caselles
  const amplaEst = 13;
  const estils = musical
    ? { 0: { cellWidth: 11, halign: 'center', fontStyle: 'bold' }, 1: { cellWidth: 15 }, 2: { cellWidth: 18, halign: 'center' }, 3: { cellWidth: 62 }, 4: { cellWidth: 62 } }
    : { 0: { cellWidth: 11, halign: 'center', fontStyle: 'bold' }, 1: { cellWidth: 18, halign: 'center' }, 2: { cellWidth: 52 }, 3: { cellWidth: 60 } };
  est.forEach((_, i) => { estils[off + i] = { cellWidth: amplaEst }; });
  estils[off + est.length] = { cellWidth: 'auto', fontSize: 7, textColor: [80, 80, 80] };
  doc.autoTable({
    startY: y, margin: { left: M, right: M, bottom: 12 }, theme: 'grid',
    head: [['Núm.', ...(musical ? ['Tipus'] : []), 'Emissió', capA, capB, ...est.map(([, n]) => n), 'Notes']],
    body: files.map((f) => Object.assign([f.g.numero, ...(musical ? [TIPUS_PLA[f.t]] : []), dataNum(f.g.emissio), f.a.join('\n'), f.b.join('\n'), ...est.map(() => ''), f.g.notes || ''], { f })),
    rowPageBreak: 'avoid',
    styles: { font: 'helvetica', fontSize: 8, cellPadding: 1.4, lineColor: [205, 205, 205], lineWidth: 0.2, textColor: [14, 14, 14], valign: 'middle', overflow: 'linebreak' },
    headStyles: { fillColor: [17, 17, 17], textColor: 255, fontStyle: 'bold', halign: 'center', fontSize: 7.5 },
    columnStyles: estils,
    didParseCell(d) {
      if (d.section !== 'body') return;
      const f = d.row.raw.f, k = est[d.column.index - off]?.[0];
      d.cell.styles.fillColor = rgb(COL_TIPUS[f.t]);
      if ((d.column.index === off - 2 || d.column.index === off - 1) && musical && f.t !== 'dialeg') d.cell.styles.fontStyle = 'italic';
      if (k) d.cell.styles.fillColor = rgb(fet(f.g, k) ? COL_FET[k] : rosaPla(k, p.id) ? '#F4AFAF' : COL_TIPUS[f.t]);
      if (d.column.index === 0 && (f.g === env || f.g === grav)) { d.cell.styles.fillColor = rgb(f.g === env ? '#FF7A1F' : '#1F66C9'); d.cell.styles.textColor = 255; }
    },
    didDrawCell(d) {
      const k = est[d.column.index - off]?.[0];
      if (d.section !== 'body' || !k || !d.row.raw?.f || !fet(d.row.raw.f.g, k)) return;
      const cx = d.cell.x + d.cell.width / 2, cy = d.cell.y + d.cell.height / 2;     // ✓ dibuixat
      doc.setDrawColor(14); doc.setLineWidth(0.6);
      doc.line(cx - 1.8, cy, cx - 0.5, cy + 1.4); doc.line(cx - 0.5, cy + 1.4, cx + 2, cy - 1.6);
    },
    didDrawPage(d) {
      doc.setFont('helvetica', 'normal'); doc.setFontSize(7); doc.setTextColor(120);
      doc.text(`${p.nom} · Planificació · pàgina ${d.pageNumber}`, W - M, 205, { align: 'right' });
    },
  });
  // Llegenda al final
  const ly = Math.min(doc.lastAutoTable.finalY + 5, 200);
  [...(musical ? [['Diàleg', COL_TIPUS.dialeg], ['Píndola', COL_TIPUS.pindola], ['Temàtic', COL_TIPUS.tematic]] : []), ['Per enviar', '#FF7A1F'], ['Per gravar', '#1F66C9'], ['Pendent', '#F4AFAF']].forEach(([t, c], i) => {
    const lx = M + i * 30;
    doc.setFillColor(...rgb(c)); doc.rect(lx, ly - 3, 4, 4, 'F');
    doc.setFont('helvetica', 'normal'); doc.setFontSize(8); doc.setTextColor(60); doc.text(t, lx + 5.5, ly);
  });
  await lliuraFitxer(doc.output('blob'), nomFitxerPla('pdf'));
}

/* Impressió: la mateixa taula, en paper (A4 apaïsat) */
function imprimeixPla(eps) {
  let z = $('#zonaImpressio');
  if (!z) { z = Object.assign(document.createElement('div'), { id: 'zonaImpressio' }); document.body.append(z); }
  const p = prog(ui.planProg), musical = esMusical(p.id), est = estatsPla(p.id), [capA, capB] = capPla(p.id);
  const env = episodisPla(ui.planProg).find((g) => !fet(g, kEnvia())), grav = episodisPla(ui.planProg).find((g) => !fet(g, 'gravat'));
  const linies = (ll, primeraNegreta) => ll.map((x, i) => (i === 0 && primeraNegreta ? `<b>${esc(x)}</b>` : esc(x))).join('<br>');
  z.className = 'pla';
  z.innerHTML = `${musical ? '<img class="zp-logo" src="img/capcalera-blanc-i-negre.png" alt="Blanc & Negre">'
      : `<div class="zp-titol" style="background:${esc(p.color || '#3D4B6B')}">${esc(p.nom)}</div>`}
    <p class="zp-sub">Planificació · ${eps.length} ${musical ? 'episodis' : 'programes'} · imprès el ${dataNum(ymd(new Date()))}${musical ? ' · Cicle: 4 diàlegs · píndola · 4 diàlegs · píndola · temàtic' : ' · Un convidat per programa, amb 4 cançons'}</p>
    <div class="zp-tauler">${taulerPla(episodisPla(ui.planProg)).map((x) => `<div style="background:${x.col}"><span>${esc(x.nom)}</span><b>${esc(x.text)}</b></div>`).join('')}</div>
    <table><thead><tr><th>Núm.</th>${musical ? '<th>Tipus</th>' : ''}<th>Emissió</th><th>${capA}</th><th>${capB}</th>${est.map(([, n]) => `<th class="c">${n}</th>`).join('')}<th>Notes</th></tr></thead>
    <tbody>${eps.map(filaPla).map((f) => `<tr style="background:${COL_TIPUS[f.t]}">
      <td class="c num" ${f.g === env || f.g === grav ? `style="background:${f.g === env ? '#FF7A1F' : '#1F66C9'};color:#fff"` : ''}>${f.g.numero}</td>
      ${musical ? `<td>${TIPUS_PLA[f.t]}</td>` : ''}<td class="c">${dataNum(f.g.emissio)}</td>
      <td class="${musical && f.t !== 'dialeg' ? 'it' : ''}">${linies(f.a, true)}</td><td>${linies(f.b, f.t === 'dialeg')}</td>
      ${est.map(([k]) => `<td class="c" style="background:${fet(f.g, k) ? COL_FET[k] : rosaPla(k, p.id) ? '#F4AFAF' : 'transparent'}">${fet(f.g, k) ? '✓' : ''}</td>`).join('')}
      <td class="zp-notes">${esc(f.g.notes || '')}</td></tr>`).join('')}</tbody></table>`;
  const titolAbans = document.title;
  document.title = nomFitxerPla('pdf').replace('.pdf', '');
  window.addEventListener('afterprint', () => { document.title = titolAbans; z.className = ''; }, { once: true });
  const img = z.querySelector('img');
  const imprimeixAra = () => setTimeout(() => window.print(), 50);
  if (!img || img.complete) imprimeixAra(); else { img.onload = imprimeixAra; img.onerror = imprimeixAra; }
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
    gravats: [`Episodis gravats ${hist ? '· històric' : any}`, del.filter(esGravat)],
    publicats: [`Publicats / emesos ${hist ? '· històric' : any}`, del.filter(esPublicat)],
    perPublicar: ['Pendents de publicar', tots.filter((g) => esGravat(g) && !esPublicat(g) && g.estat !== 'cancellat')],
    perGravar: ['Pendents de gravar', tots.filter((g) => !esGravat(g) && (g.estat === 'pendent' || g.estat === 'confirmat'))],
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
  const gravades = del.filter(esGravat);
  const publicades = del.filter(esPublicat);
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
    <p class="hint" style="margin-top:8px">Toca una xifra, un mes o un total per veure'n el llistat. «Gravats» compta els episodis en estat Gravat, Editat o Publicat, o amb la casella Gravat o Emès marcada a la Planificació. «Publicats / emesos», els Publicats o amb la casella Emès. Si un episodi no té data de gravació, es compta pel mes d'emissió.</p>
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

function openPersona(p, tipus, extra = {}) {
  const nou = !p;
  p = p || (tipus === 'convidat'
    ? { id: uid(), nom: '', tipus: 'convidat', telefon: '', email: '', notes: '', qui: '', ...extra }
    : { id: uid(), nom: '', rol: '' });
  const esConv = p.tipus === 'convidat';
  const h = esConv && !nou ? historial(p) : [];
  openDialog(`
    <h3>${nou ? (esConv ? (p.potencial ? 'Convidat potencial' : 'Nou convidat') : 'Nova persona') : (esConv ? 'Fitxa del convidat' : 'Edita persona')}</h3>
    <label>Nom <input name="nom" value="${esc(p.nom)}" required></label>
    ${esConv ? `
      <label>Qui és <input name="qui" value="${esc(p.qui || '')}" placeholder="Ex.: Pilot de rescat de l'hospital Trueta" autocomplete="off"></label>
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
      <label>Estat del potencial <select name="estatPot">${ESTATS_POT.map(([k, nom]) => `<option value="${k}" ${(p.estatPot || 'idea') === k ? 'selected' : ''}>${nom}</option>`).join('')}</select></label>
      ${nou ? '' : `<fieldset><legend>Historial (${h.length})</legend>
        ${h.length ? `<ul class="historial">${h.map((g) => `<li><button type="button" data-dlg="obre-grav" data-id="${g.id}">
          <span class="dot" style="--c:${color(g)}"></span><b>${dataCurta(g.data || g.emissio)}</b> · ${esc(progNom(g))} · ${esc(titolG(g))} <span class="badge ${g.estat}">${estatNom(g.estat)}</span></button></li>`).join('')}</ul>`
          : '<span class="hint">Encara no ha participat en cap gravació.</span>'}
      </fieldset>`}`
    : `<label>Rol <input name="rol" value="${esc(p.rol)}" placeholder="Presentació, tècnica de so, producció…"></label>`}`, {
    onSave(f) {
      const nom = f.get('nom').trim();
      if (!nom) { toast('Cal posar un nom.'); return false; }
      if (esConv) {   // avisa si ja hi ha un altre convidat amb el mateix nom
        const igual = state.persones.find((x) => x.id !== p.id && x.tipus === 'convidat' && clauCerca(x.nom) === clauCerca(nom));
        if (igual) {
          const ep = state.gravacions.find((g) => Number(g.numero) > 0 && (g.convidatsIds || []).includes(igual.id));
          const on = ep ? `ja és al programa ${ep.numero} de ${progNom(ep)}` : igual.potencial ? 'ja és a la llista de convidats potencials' : 'ja té fitxa de convidat';
          if (!confirm(`Ja tens un convidat que es diu ${igual.nom}: ${on}.

Si és la mateixa persona, prem Cancel·la i fes servir la fitxa que ja tens.

Vols crear-ne un altre igualment?`)) return false;
        }
      }
      if (esConv) Object.assign(p, { nom, qui: String(f.get('qui') || '').trim(), telefon: f.get('telefon').trim(), email: f.get('email').trim(), notes: f.get('notes').trim(),
        potencial: f.get('potencial') === 'on', ...(f.get('potencial') === 'on' ? { estatPot: f.get('estatPot') || 'idea' } : {}) });
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
    <div class="section nomes-angel">
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
    <div class="section nomes-angel">
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
    <div class="section nomes-angel">
      <h2>ChatGPT</h2>
      <p class="help">Enllaç de cada projecte de ChatGPT. El botó «📝 Prepara-ho a ChatGPT» de cada programa l'obre directament. Per trobar-lo: a chatgpt.com, obre la pàgina del projecte i copia l'adreça de dalt (comença per https://chatgpt.com/g/…).</p>
      <form id="formChatGPT" class="ubicacions">
        ${CHATGPT_PROJECTES.map(([k, nom]) => `<label>${esc(nom)} <input name="${k}" type="url" value="${esc(enllacChatGPT(k))}" placeholder="https://chatgpt.com/g/…" autocomplete="off"></label>`).join('')}
        <button class="btn">Desa els enllaços</button>
      </form>
    </div>
    <div class="section">
      <h2>Instal·lar l'app</h2>
      <p class="hint" id="versioApp"></p>
      <p class="help"><b>iPhone:</b> obre-la amb Safari, toca <b>Compartir</b> i després <b>Afegeix a la pantalla d'inici</b>.<br>
      <b>Ordinador:</b> a Chrome o Edge, fes clic a la icona d'instal·lar de la barra d'adreces.</p>
    </div>
    <div class="section nomes-angel">
      <h2>Zona perillosa</h2>
      <div class="grp">
        <button class="btn danger" data-action="esborra-tot">Esborra totes les dades</button>
        <button class="btn" data-action="exemple">Restaura les dades inicials</button>
      </div>
    </div>`;
  if (typeof Sync !== 'undefined') Sync.bind();
  window.caches?.keys().then((k) => { const v = k.find((x) => /^podcasts-v\d+/.test(x)); if (v && $('#versioApp')) $('#versioApp').textContent = "Versió de l'app: " + v.replace('podcasts-', ''); }).catch(() => {});
  $('#formEstudi').addEventListener('submit', (e) => {
    e.preventDefault();
    const v = new FormData(e.target).get('estudi').trim();
    if (!v) return;
    if (state.estudis.includes(v)) { toast('Aquest estudi ja existeix.'); return; }
    state.estudis.push(v); save(); render();
  });
  $('#formChatGPT')?.addEventListener('submit', (e) => {
    e.preventDefault();
    const fd = new FormData(e.target), chatgpt = {};
    CHATGPT_PROJECTES.forEach(([k]) => { const v = String(fd.get(k) || '').trim(); if (v) chatgpt[k] = v; });
    if (Object.values(chatgpt).some((v) => !/^https:\/\/(chatgpt\.com|chat\.openai\.com)\//.test(v))) { toast('Els enllaços han de començar per https://chatgpt.com/'); return; }
    state.plantilles = { ...(state.plantilles || {}), chatgpt };
    save(); toast('Enllaços desats.');
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
    id: uid(), titol: '', programaId: esDavid() ? bnId() : ui.filtrePrograma || '', data: dataPerDefecte || ymd(new Date()),
    hora: '10:00', durada: 60, estudi: state.estudis[0] || '', estat: 'pendent',
    presentadors: [], tecnic: '', convidats: '', notes: '', ...(esDavid() ? { tipusEp: 'sessio' } : {}),
  };
  const estudis = [...new Set([...state.estudis, g.estudi].filter(Boolean))];
  openDialog(`
    <h3>${nou ? 'Nova gravació' : 'Edita gravació'}</h3>
    <div class="row">
      <label style="flex:3" class="no-dialeg"><span id="lblTitol">Títol o convidat</span> <input name="titol" value="${esc(g.titol)}" autocomplete="off"></label>
      <label style="flex:1">Núm. episodi <input type="number" inputmode="numeric" name="numero" min="0" value="${esc(g.numero ?? '')}"></label>
    </div>
    <label>Programa / podcast <select name="programaId">${progOptions(g.programaId, '— Sense programa —')}</select></label>
    <fieldset class="nomes-entrevista cancons-conv"><legend>🎵 Convidat i cançons</legend>
      <label>Qui és <input name="descripcio" value="${esc(g.descripcio || '')}" placeholder="Ex.: Pilot de rescat de l'hospital Trueta" autocomplete="off"></label>
      ${[0, 1, 2, 3].map((i) => `<div class="cv-fila"><input name="cv_art_${i}" value="${esc(g.cancons?.[i]?.artista || '')}" placeholder="Artista ${i + 1}" autocomplete="off">
        <input name="cv_canco_${i}" value="${esc(g.cancons?.[i]?.canco || '')}" placeholder="Cançó (escriu i tria)" autocomplete="off">
        <input type="hidden" name="cv_url_${i}" value="${esc(g.cancons?.[i]?.url || '')}"></div>`).join('')}
      <div class="chatgpt-fila nomes-angel"><button type="button" class="btn small" data-dlg="chatgpt">📝 Prepara-ho a ChatGPT</button>
        <span class="hint">Copia el convidat i les cançons i obre el projecte de ChatGPT: només cal enganxar.</span></div>
    </fieldset>
    <fieldset class="nomes-musical musica"><legend>🎵 Contingut de l'episodi</legend>
      <label>Tipus d'episodi <select name="tipusEp">${Object.entries(TIPUS_EP).map(([k, [nom]]) => `<option value="${k}" ${(g.tipusEp || (g.numero || g.classics?.length ? 'dialeg' : 'sessio')) === k ? 'selected' : ''}>${nom}</option>`).join('')}</select></label>
      <label class="nomes-tematic">Tema <input name="tema" value="${esc(g.tema || '')}" placeholder="Ex.: Guitarres"></label>
      <div class="musica-cols">${[['c', 'Clàssics', g.classics], ['k', 'Contemporanis / alternatius', g.contemporanis]].map(([pre, nom, llista]) => `
        <div><h4>${nom}</h4>${[0, 1, 2, 3, 4].map((i) => `<div class="art-fila" data-i="${i}">
          <input name="${pre}_art_${i}" value="${esc(llista?.[i]?.artista || '')}" placeholder="Artista" autocomplete="off">
          <input name="${pre}_disc_${i}" value="${esc(llista?.[i]?.disc || '')}" placeholder="Disc" class="nomes-dialeg" autocomplete="off">
          <input name="${pre}_canco_${i}" value="${esc(llista?.[i]?.canco || '')}" placeholder="Cançó (escriu i tria)" class="nomes-canco" autocomplete="off">
          <input type="hidden" name="${pre}_url_${i}" value="${esc(llista?.[i]?.url || '')}"></div>`).join('')}</div>`).join('')}
      </div>
      <button type="button" class="btn small nomes-pindola" data-dlg="omple-pindola">↺ Omple els clàssics amb els dels 4 diàlegs anteriors</button>
      <span class="hint" id="previaTitol"></span>
      <div class="chatgpt-fila nomes-angel"><button type="button" class="btn small" data-dlg="chatgpt">📝 Prepara-ho a ChatGPT</button>
        <span class="hint">Copia l'episodi (tipus, artistes, discos i cançons) i obre el projecte de Blanc &amp; Negre: només cal enganxar.</span></div>
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
    ${!nou && g.data && (g.convidatsIds || []).map(pers).some((p) => p && waLink(p.telefon)) ? `<fieldset class="nomes-entrevista"><legend>Recordatori al convidat</legend>
      ${(g.convidatsIds || []).map(pers).filter((p) => p && waLink(p.telefon)).map((p) => `<a class="btn small" href="${esc(waLink(p.telefon, missatgeGrav(p, g)))}" target="_blank" rel="noopener">💬 Recordatori a ${esc(p.nom)}</a>`).join(' ')}
    </fieldset>` : ''}
    <datalist id="llistaConvAgenda">${[...new Set([...convidatsPers().map((p) => p.nom), ...(state.agenda?.contactes || []).map((c) => c.nom)])].map((n) => `<option value="${esc(n)}">`).join('')}</datalist>
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
        // Temàtic: 10 cançons de 10 artistes diferents
        if (m.tipusEp === 'tematic') {
          const noms = [...m.classics, ...m.contemporanis].map((a) => clauCerca(a.artista));
          const repetits = [...new Set(noms.filter((n, i) => noms.indexOf(n) !== i))];
          if (repetits.length && !confirm(`Al temàtic hi ha artistes repetits (${repetits.join(', ')}). Han de ser 10 artistes diferents.\n\nVols desar-lo igualment?`)) return false;
        }
        else if (!dades.titol) dades.titol = m.tipusEp === 'sessio' ? SESSIO : m.tipusEp === 'tematic' ? `Temàtic ${m.tema}`.trim() : 'Píndola resum';
      }
      // En David: el que no pot canviar es queda com estava (el servidor també ho comprova)
      if (esDavid()) {
        const numerat = !nou && NUMERATS.includes(g.tipusEp);
        const fixos = numerat ? ['numero', 'tipusEp', 'programaId', 'estat', 'emissio', 'horaEmissio', 'tema', 'enllac', ...(g.tipusEp === 'dialeg' ? ['classics'] : ['titol'])]
          : ['numero', 'tipusEp', 'programaId', 'estat'];
        // Píndoles i temàtics: els artistes clàssics no canvien; només se'n posen les cançons
        if (numerat && g.tipusEp !== 'dialeg') {
          dades.classics = (g.classics || []).map((a, i) => {
            const n = dades.classics?.[i];
            if (!n || n.artista !== a.artista) return a;
            const { canco, url, ...resta } = a;
            return { ...resta, ...(n.canco ? { canco: n.canco } : {}), ...(n.url ? { url: n.url } : {}) };
          });
        }
        const base = nou ? { programaId: bnId(), tipusEp: 'sessio', numero: '', estat: 'pendent' } : g;
        fixos.forEach((k) => { if (k in base) dades[k] = base[k]; else delete dades[k]; });
        if (numerat && g.tipusEp === 'dialeg') dades.titol = titolDialeg({ classics: g.classics || [], contemporanis: dades.contemporanis || [] }) || g.titol;
      }
      // Entrevista: qui és el convidat i les seves 4 cançons (amb les 4 posades, es marca sola la casella «Cançons»)
      if (!musical) {
        dades.descripcio = String(f.get('descripcio') || '').trim();
        dades.cancons = [0, 1, 2, 3].map((i) => ({ artista: String(f.get(`cv_art_${i}`) || '').trim(), canco: String(f.get(`cv_canco_${i}`) || '').trim(),
          ...(f.get(`cv_url_${i}`) ? { url: String(f.get(`cv_url_${i}`)) } : {}) }))
          .filter((c) => c.artista || c.canco);
        if (dades.cancons.filter((c) => c.artista && c.canco).length === 4 && !fet(g, 'cancons')) dades.pla = { ...(g.pla || {}), cancons: true };
      }
      // Entrevista: el camp de dalt és el convidat; és obligatori i en fa el títol
      const nomsConv = musical ? [] : [...new Set(dades.titol.split(',').map((x) => x.trim()).filter(Boolean))];
      if (!musical) dades.titol = nomsConv.join(', ');
      if (!dades.titol) { toast(musical ? 'Cal posar almenys els dos artistes.' : 'Cal posar el nom del convidat.'); return false; }
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
      // Es vincula la fitxa del convidat (si no en té, se li crea amb el telèfon i el correu de Contactes)
      const ids = [];
      nomsConv.forEach((nom) => {
        let p = convidatsPers().find((x) => clauCerca(x.nom) === clauCerca(nom));
        if (!p) {
          const c = contacteAgenda(nom);
          p = { id: uid(), nom, tipus: 'convidat', telefon: c?.tels?.[0] || '', email: c?.emails?.[0] || '', notes: c?.empresa || '' };
          state.persones.push(p);
        }
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
    onDelete: nou || (esDavid() && (NUMERATS.includes(g.tipusEp) || fet(g, 'emes'))) ? null : () => {
      if (!confirm(`Eliminar la gravació «${g.titol}» del ${dataCurta(g.data || g.emissio)}?`)) return false;
      const seguents = g.serie ? state.gravacions.filter((x) => x.serie === g.serie && x.id !== g.id && (x.data || '') > (g.data || '')) : [];
      const totes = seguents.length && confirm(`Aquesta sessió es repeteix. Vols eliminar també les ${seguents.length} sessions següents de la sèrie?\n\nD'acord: totes les següents\nCancel·la: només aquesta`);
      const fora = new Set([g.id, ...(totes ? seguents.map((x) => x.id) : [])]);
      state.gravacions = state.gravacions.filter((x) => !fora.has(x.id));
      toast(fora.size > 1 ? `S'han eliminat ${fora.size} sessions.` : 'Gravació eliminada.');
    },
    onExtra(action) {
      if (action === 'chatgpt') return enviaChatGPT($('#dlgForm'), g);
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
  if (esDavid()) bloquejaDavid(f, g, nou);
  activaCercaMusica(f);
  if (!mobil.matches && nou) f.elements.titol.focus();
}

/* ---------- Cerca de cançons al catàleg d'Apple Music ----------
   Escrivint a la casella «Cançó» (i, si vols, l'artista al costat) surten les cançons del catàleg d'Apple;
   en triar-ne una s'omplen l'artista i el títol ben escrits i es guarda l'enllaç per escoltar-la.
   Fa servir el cercador públic d'Apple (el mateix catàleg que Apple Music): no cal iniciar sessió. */
const netejaTitol = (t) => String(t || '').replace(/\s*[([][^)\]]*remaster[^)\]]*[)\]]/ig, '').replace(/\s+-\s+.*remaster.*$/i, '').trim();
// A l'ordinador i a Android es pregunta directament a Apple. A l'iPhone Apple redirigeix la cerca a l'app Música
// i falla: llavors es fa a través de la funció «musica» de Supabase, que cerca des del servidor.
let cercaPerServidor = /iPhone|iPad|iPod/.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
async function cercaApple(q, { entitat = 'song', atribut = '', limit = 10 } = {}) {
  const params = `term=${encodeURIComponent(q)}&entity=${entitat}${atribut ? '&attribute=' + atribut : ''}&limit=${limit}`;
  const servidor = () => fetch(`${window.PODCASTS_CONFIG.supabaseUrl}/functions/v1/musica?${params}`).then((x) => { if (!x.ok) throw new Error(x.status); return x.json(); });
  if (cercaPerServidor) return servidor();
  try {
    return await fetch(`https://itunes.apple.com/search?${params}&media=music&country=es`).then((x) => x.json());
  } catch (e) { cercaPerServidor = true; return servidor(); }
}
// Cada fila té artista i cançó. Pas 1: escrivint l'artista surten artistes; en triar-ne un, surten les seves cançons.
// Pas 2: a la casella de la cançó es pot escriure per filtrar. La llista es pot desplaçar: només tria quan es toca (no en lliscar).
// El botó × buida la fila.
function activaCercaMusica(f) {
  f.querySelectorAll('input[name*="_canco_"]').forEach((inp) => {
    const [pre, , i] = inp.name.split('_');
    const art = f.elements[`${pre}_art_${i}`], url = f.elements[`${pre}_url_${i}`], fila = inp.parentElement;
    if (!art || !url || inp.readOnly) return;
    fila.classList.add('amb-cerca');
    const llista = Object.assign(document.createElement('div'), { className: 'cerca-musica', hidden: true });
    const escolta = Object.assign(document.createElement('a'), { className: 'cv-escolta', target: '_blank', rel: 'noopener', textContent: '▶ Escolta', title: 'Obre la cançó a Apple Music' });
    const buida = Object.assign(document.createElement('button'), { type: 'button', className: 'cv-buida', textContent: '×', title: 'Buida aquesta fila' });
    buida.setAttribute('aria-label', 'Buida aquesta fila');
    inp.after(buida);
    fila.append(llista, escolta);
    const visible = () => inp.offsetParent !== null;            // als diàlegs la cançó no hi és
    const mostraEscolta = () => { escolta.hidden = !url.value; if (url.value) escolta.href = url.value; buida.hidden = !visible() || !(art.value || inp.value) || (art.readOnly && !inp.value); };
    mostraEscolta();
    let temps = null, darrera = 0;
    const mostra = (html, tria) => {
      llista.innerHTML = html; llista.hidden = false; llista.scrollTop = 0;
      llista.querySelectorAll('button').forEach((b) => b.addEventListener('click', (e) => { e.preventDefault(); tria(Number(b.dataset.j)); }));
    };
    const pregunta = async (q, opcions) => {
      const n = ++darrera;
      llista.innerHTML = '<span class="hint">Cercant…</span>'; llista.hidden = false;
      try { const r = await cercaApple(q, opcions); return n === darrera ? (r.results || []) : null; }
      catch (e) { if (n === darrera) llista.innerHTML = '<span class="hint">No s\'ha pogut cercar. Comprova la connexió.</span>'; return null; }
    };
    // Pas 1: artistes
    const cercaArtistes = async () => {
      if (!visible() || art.value.trim().length < 2) { llista.hidden = true; return; }
      const res = await pregunta(art.value.trim(), { entitat: 'musicArtist', atribut: 'artistTerm', limit: 8 });
      if (!res) return;
      if (!res.length) { llista.innerHTML = '<span class="hint">No he trobat cap artista amb aquest nom.</span>'; return; }
      mostra(`<span class="hint">Tria l'artista:</span>` + res.map((x, j) => `<button type="button" data-j="${j}"><span class="cm-ico">🎤</span>
        <span><b>${esc(x.artistName)}</b><span>${esc(x.primaryGenreName || '')}</span></span></button>`).join(''), (j) => {
        const x = res[j];
        art.value = x.artistName; art.dataset.id = x.artistId || ''; inp.value = ''; url.value = '';
        mostraEscolta(); f.dispatchEvent(new Event('input'));
        cercaCancons();
      });
    };
    // Pas 2: cançons (de l'artista triat, o del que hi hagi escrit)
    const cercaCancons = async () => {
      if (!visible()) return;
      const q = `${art.value} ${inp.value}`.trim();
      if (q.length < 2) { llista.hidden = true; return; }
      let res = await pregunta(q, art.value && !inp.value ? { entitat: 'song', atribut: 'artistTerm', limit: 25 } : { entitat: 'song', limit: 15 });
      if (!res) return;
      const id = Number(art.dataset.id) || 0;
      if (id && res.some((x) => x.artistId === id)) res = res.filter((x) => x.artistId === id);
      const vist = new Set();
      res = res.filter((x) => { const k = clauCerca(netejaTitol(x.trackName) + x.artistName); if (vist.has(k)) return false; vist.add(k); return true; });
      if (!res.length) { llista.innerHTML = '<span class="hint">No he trobat cap cançó. Prova amb una altra paraula.</span>'; return; }
      mostra(`<span class="hint">${art.value && !inp.value ? `Cançons de ${esc(art.value)} (escriu per filtrar):` : 'Tria la cançó:'}</span>` + res.map((x, j) => `<button type="button" data-j="${j}">
          ${x.artworkUrl60 ? `<img src="${esc(x.artworkUrl60)}" alt="" loading="lazy">` : ''}
          <span><b>${esc(netejaTitol(x.trackName))}</b><span>${esc(x.artistName)}${x.collectionName ? ' · ' + esc(x.collectionName) : ''}${x.releaseDate ? ' · ' + x.releaseDate.slice(0, 4) : ''}</span></span></button>`).join(''), (j) => {
        const x = res[j];
        if (!art.readOnly) { art.value = x.artistName; art.dataset.id = x.artistId || ''; }
        inp.value = netejaTitol(x.trackName); url.value = x.trackViewUrl || '';
        llista.hidden = true; mostraEscolta(); f.dispatchEvent(new Event('input'));
      });
    };
    const amaga = () => setTimeout(() => { if (document.activeElement !== inp && document.activeElement !== art) llista.hidden = true; }, 400);
    inp.addEventListener('input', () => { url.value = ''; mostraEscolta(); clearTimeout(temps); temps = setTimeout(cercaCancons, 400); });
    inp.addEventListener('focus', () => { if (!url.value && (art.value || inp.value.trim().length >= 2)) cercaCancons(); });
    inp.addEventListener('blur', amaga);
    if (!art.readOnly) {
      art.addEventListener('input', () => { url.value = ''; delete art.dataset.id; mostraEscolta(); clearTimeout(temps); temps = setTimeout(cercaArtistes, 450); });
      art.addEventListener('blur', amaga);
    }
    buida.addEventListener('click', () => {
      if (!art.readOnly) { art.value = ''; delete art.dataset.id; }
      inp.value = ''; url.value = ''; llista.hidden = true; mostraEscolta();
      f.dispatchEvent(new Event('input'));
      (art.readOnly ? inp : art).focus();
    });
  });
}
// Perfil d'en David: bloqueja el que no pot canviar i ho explica a dalt del formulari
function bloquejaDavid(f, g, nou) {
  const avis = (txt) => f.querySelector('h3').insertAdjacentHTML('afterend', `<p class="nota-david">${txt}</p>`);
  if (!nou && fet(g, 'emes')) {
    f.querySelectorAll('input, select, textarea, [data-dlg="omple-pindola"], [data-dlg="copia"]').forEach((el) => { el.disabled = true; });
    f.querySelector('button[type="submit"]').hidden = true;
    avis("Aquest episodi ja és emès: el pots consultar, però només l'Angel el pot canviar.");
    return;
  }
  const bloc = (el) => { if (!el) return; if (el.tagName === 'SELECT') { el.classList.add('bloquejat'); el.tabIndex = -1; } else el.readOnly = true; };
  ['programaId', 'tipusEp', 'numero', 'estat'].forEach((n) => bloc(f.elements[n]));
  if (nou || !NUMERATS.includes(g.tipusEp)) { avis('Sessió de gravació de Blanc &amp; Negre.'); return; }
  ['tema', 'emissio', 'horaEmissio', 'enllac'].forEach((n) => bloc(f.elements[n]));
  f.querySelectorAll('[name^="c_art_"], [name^="c_disc_"]').forEach(bloc);
  if (g.tipusEp !== 'dialeg') bloc(f.elements.titol);
  f.querySelector('[data-dlg="omple-pindola"]')?.remove();
  avis(g.tipusEp === 'dialeg' ? "Pots canviar l'alternatiu (artista i disc) i el dia i l'hora de gravació. La resta només la canvia l'Angel."
    : "Pots posar els artistes alternatius i les cançons de tots els artistes, i el dia i l'hora de gravació. Els artistes clàssics i el tema només els canvia l'Angel.");
}

/* ---------- ChatGPT: biografia i guió ----------
   Prepara el missatge amb les dades del programa (tal com estan al formulari, encara que no s'hagin desat),
   el copia i obre el projecte de ChatGPT del programa. L'enllaç del projecte es guarda a Ajustos. */
const CHATGPT_PROJECTES = [['lluna', 'La cara oculta de la lluna'], ['bn', 'Blanc & Negre']];
const enllacChatGPT = (k) => state.plantilles?.chatgpt?.[k] || '';
function missatgeBN(f) {
  const v = (n) => String(f.elements[n]?.value || '').trim();
  const tipus = v('tipusEp'), em = v('emissio');
  const dia = em ? `${DIES_LLARGS[(parseYmd(em).getDay() + 6) % 7]} ${dataNum(em)}` : 'per decidir';
  const fila = (pre, i, ambDisc) => {
    const a = v(`${pre}_art_${i}`), c = v(`${pre}_canco_${i}`), d = v(`${pre}_disc_${i}`), u = v(`${pre}_url_${i}`);
    if (!a && !c) return '';
    return `${a || '(artista per decidir)'}${ambDisc ? (d ? ` — ${d}` : '') : (c ? ` — «${c}»` : '')}${u && !ambDisc ? ' · ' + u : ''}`;
  };
  const cap = `BLANC & NEGRE · Episodi ${v('numero') || '—'} · ${{ dialeg: 'DIÀLEG', pindola: 'PÍNDOLA RESUM', tematic: 'TEMÀTIC' }[tipus]} · Emissió ${dia}`;
  let cos = [];
  if (tipus === 'dialeg') {
    cos = [`Clàssic: ${fila('c', 0, true) || '(per decidir)'}`, `Contemporani: ${fila('k', 0, true) || '(per decidir)'}`];
  } else if (tipus === 'pindola') {
    cos = [`Títol: ${v('titol') || 'Píndola resum'}`, 'Les quatre parelles (clàssic ↔ veu del present):',
      ...[0, 1, 2, 3].map((i) => `${i + 1}. ${fila('c', i) || '(clàssic per decidir)'}  ↔  ${fila('k', i) || '(contemporani per decidir)'}`),
      'Si falta la cançó d’algun clàssic, tria la més representativa.'];
  } else {
    const cl = [0, 1, 2, 3, 4].map((i) => fila('c', i)).filter(Boolean), ct = [0, 1, 2, 3, 4].map((i) => fila('k', i)).filter(Boolean);
    cos = [`Tema: ${v('tema') || '(per decidir)'}`, 'Clàssics:', ...(cl.length ? cl.map((x, i) => `${i + 1}. ${x}`) : ['(per decidir)']),
      'Veus del present:', ...(ct.length ? ct.map((x, i) => `${i + 6}. ${x}`) : ['(per decidir)'])];
  }
  if (cos.some((x) => /per decidir/.test(x))) cos.push("Hi ha artistes o cançons per decidir: proposa-me'n abans de fer el guió i espera que els triï.");
  // Primera línia = nom que volem per al xat (ChatGPT el treu d'aquí)
  const art = (pre) => v(`${pre}_art_0`);
  const quin = tipus === 'dialeg' ? [art('c'), art('k')].filter(Boolean).join(' – ')
    : tipus === 'tematic' ? v('tema')
    : (v('titol') && !/^p[ií]ndola resum$/i.test(v('titol')) ? v('titol') : [0, 1, 2, 3].map((i) => v(`c_art_${i}`)).filter(Boolean).join(', '));
  const nomXat = [v('numero') || '—', { dialeg: 'Diàleg', pindola: 'Píndola', tematic: 'Temàtic' }[tipus], quin].filter(Boolean).join(' · ');
  return [nomXat, '', cap, ...cos, ...(v('notes') ? [`Notes: ${v('notes')}`] : []), '',
    'Fes el guió seguint les instruccions del projecte per a aquest tipus d’episodi, damunt la seva plantilla.'].join('\n');
}
function missatgeChatGPT(f, g) {
  const v = (n) => String(f.elements[n]?.value || '').trim();
  const p = prog(v('programaId'));
  const em = v('emissio');
  const dia = em ? `${DIES_LLARGS[(parseYmd(em).getDay() + 6) % 7]} ${dataNum(em)}` : 'per decidir';
  const cancons = [0, 1, 2, 3].map((i) => ({ a: v(`cv_art_${i}`), c: v(`cv_canco_${i}`), u: v(`cv_url_${i}`) })).filter((x) => x.a || x.c);
  return [
    [v('numero') || '—', v('titol')].filter(Boolean).join(' · '),   // nom del xat
    '',
    `${(p?.nom || 'La cara oculta de la lluna').toUpperCase()} · Programa ${v('numero') || '—'} · Emissió ${dia}`,
    `Convidat: ${v('titol') || '—'}`,
    `Qui és: ${v('descripcio') || '(per completar)'}`,
    'Cançons:',
    ...(cancons.length ? cancons.map((x, i) => `${i + 1}. ${x.c || '(cançó per decidir)'} — ${x.a || '(artista per decidir)'}${x.u ? ' · ' + x.u : ''}`) : ['(encara no les tenim)']),
    ...(v('notes') ? [`Notes: ${v('notes')}`] : []),
    '',
    'Fes primer la recerca biogràfica seguint les instruccions del projecte. Quan te la validi, et demanaré el guió.',
  ].join('\n');
}
// Copia al moment (dins el mateix toc): a l'iPhone, si primer s'obre ChatGPT, l'app ja no pot copiar
function copiaAra(text) {
  const t = Object.assign(document.createElement('textarea'), { value: text, readOnly: false });
  t.setAttribute('contenteditable', 'true');
  Object.assign(t.style, { position: 'fixed', top: '0', left: '0', opacity: '0', fontSize: '16px' });   // 16px: l'iPhone no fa zoom
  const dlg = $('#dlg');
  (dlg?.open ? dlg : document.body).append(t);        // amb el formulari obert, fora del diàleg tot és inactiu
  t.focus(); t.select(); t.setSelectionRange(0, text.length);
  let ok = false; try { ok = document.execCommand('copy'); } catch (e) { /* res */ }
  t.remove();
  try { navigator.clipboard?.writeText(text).catch(() => {}); } catch (e) { /* res */ }
  return ok;                                          // només és segur si la còpia directa ha funcionat
}
// Si el mòbil no ha pogut copiar: mostra el text i un botó per copiar-lo i obrir ChatGPT
function mostraPerCopiar(text, url) {
  const d = document.createElement('dialog');
  d.className = 'copia-dlg';
  d.innerHTML = `<h3>Copia el missatge</h3>
    <p class="hint">El mòbil no l'ha pogut copiar sol. Comprova que la primera línia és la de l'episodi i toca «Copia i obre ChatGPT».</p>
    <textarea rows="9"></textarea>
    <div class="copia-botons"><button type="button" class="btn" data-a="tanca">Tanca</button>
      <button type="button" class="btn primary" data-a="copia">Copia i obre ChatGPT</button></div>`;
  const ta = d.querySelector('textarea');
  ta.value = text;
  ta.style.fontSize = '16px';                         // l'iPhone no fa zoom
  const tanca = () => { d.close(); d.remove(); };
  const obre = () => { tanca(); const w = window.open(url, '_blank'); if (!w) location.href = url; };
  d.addEventListener('click', (e) => {
    const a = e.target.closest('[data-a]')?.dataset.a;
    if (a === 'tanca') tanca();
    if (a === 'obre') obre();
    if (a !== 'copia') return;
    ta.focus(); ta.select(); ta.setSelectionRange(0, ta.value.length);
    let ok = false; try { ok = document.execCommand('copy'); } catch (err) { /* res */ }
    try { navigator.clipboard?.writeText(ta.value).catch(() => {}); } catch (err) { /* res */ }
    if (ok) { obre(); toast('Missatge copiat. A ChatGPT, mantén el dit a la casella i enganxa.'); return; }
    e.target.textContent = 'Obre ChatGPT';
    e.target.dataset.a = 'obre';
    toast("Mantén el dit sobre el text, tria «Seleccionar-ho tot» i «Copiar». Després toca «Obre ChatGPT».");
  });
  d.addEventListener('cancel', (e) => { e.preventDefault(); tanca(); });
  document.body.append(d);
  d.showModal();
}
function enviaChatGPT(f, g) {
  if (esDavid()) return;                              // els guions amb ChatGPT només els fa l'Angel
  const musical = esMusical(f.elements.programaId?.value);
  if (musical && !NUMERATS.includes(f.elements.tipusEp?.value)) return toast('Tria el tipus d’episodi: diàleg, píndola o temàtic.');
  const text = musical ? missatgeBN(f) : missatgeChatGPT(f, g);
  const url = enllacChatGPT(musical ? 'bn' : 'lluna') || 'https://chatgpt.com/';
  const ok = copiaAra(text);                          // primer copiar…
  if (!ok) return mostraPerCopiar(text, url);         // no s'ha pogut: no obris ChatGPT amb un text vell al porta-retalls
  const finestra = window.open(url, '_blank');        // …i després obrir ChatGPT
  if (!finestra) location.href = url;
  toast(ok ? 'Missatge copiat. A ChatGPT, mantén el dit (o Ctrl+V) a la casella i enganxa.' : "No s'ha pogut copiar el missatge.");
}

/* ---------- Formulari d'episodi musical (Blanc & Negre) ---------- */
function llegeixMusica(f) {
  const tipusEp = f.get('tipusEp') || 'dialeg', n = TIPUS_EP[tipusEp][1];
  const camp = (nom) => String(f.get(nom) || '').trim();
  const llista = (pre) => [0, 1, 2, 3, 4].slice(0, n).map((i) => {
    const a = { artista: camp(`${pre}_art_${i}`) };
    const disc = tipusEp === 'dialeg' ? camp(`${pre}_disc_${i}`) : '', canco = tipusEp === 'pindola' || tipusEp === 'tematic' ? camp(`${pre}_canco_${i}`) : '';
    if (disc) a.disc = disc;
    if (canco) a.canco = canco;                                   // píndola resum i temàtic: la cançó de cada artista
    if (canco && camp(`${pre}_url_${i}`)) a.url = camp(`${pre}_url_${i}`);   // enllaç a Apple Music
    return a;
  }).filter((a) => a.artista);
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
  mostra('.musica-cols', musical && tipus !== 'sessio');
  // Sessió de gravació: el títol s'omple sol (es pot canviar)
  if (musical && tipus === 'sessio' && !f.elements.titol.value.trim()) f.elements.titol.value = SESSIO;
  if (musical && tipus !== 'sessio' && f.elements.titol.value.trim() === SESSIO) f.elements.titol.value = '';
  mostra('.nomes-pindola', musical && tipus === 'pindola');
  mostra('.nomes-canco', musical && (tipus === 'pindola' || tipus === 'tematic'));   // píndoles i temàtics: una cançó per artista
  mostra('.nomes-tematic', musical && tipus === 'tematic');
  mostra('.no-dialeg', !musical || tipus !== 'dialeg');
  f.querySelectorAll('.art-fila').forEach((el) => { el.hidden = Number(el.dataset.i) >= n; });
  $('#lblTitol').textContent = !musical ? 'Convidat' : tipus === 'sessio' ? 'Títol' : 'Títol (p. ex. Píndola resum 7)';
  if (musical) f.elements.titol.removeAttribute('list'); else f.elements.titol.setAttribute('list', 'llistaConvAgenda');
  f.elements.titol.placeholder = musical ? '' : 'Nom del convidat (et proposa els que ja tens)';
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
$('#btnPotencial').addEventListener('click', () => openPersona(null, 'convidat', { potencial: true, estatPot: 'idea' }));
$('#btnNova').addEventListener('click', () => {
  const avui = ymd(new Date());
  if (ui.view === 'calendari' && ui.mode === 'mes') return openGravacio(null, ui.diaSel >= avui ? ui.diaSel : avui);
  openGravacio(null, avui);
});

$('#main').addEventListener('click', (e) => {
  const el = e.target.closest('[data-action]');
  if (!el) return;
  const { action, id, date } = el.dataset;
  if (esDavid() && NOMES_ANGEL.has(action)) return toast("Això només ho pot canviar l'Angel.");
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
    case 'planificacio': {
      ui.view = 'planificacio'; ui.planProg = id; render(); window.scrollTo(0, 0);
      const eps = episodisPla(id), g = eps.find((x) => !fet(x, 'emes'));
      if (g) setTimeout(() => vesPla(g.id), 60);
      return;
    }
    case 'vista': ui.view = el.dataset.v; render(); window.scrollTo(0, 0); return;
    case 'ves-pla': return vesPla(id);
    case 'renumera': return renumera();
    case 'exporta-pla': return triaExportacio();
    case 'correu-emissora': return correuEmissora();
    case 'proposta': return openProposta(state.propostes.find((x) => x.id === id) || null);
    case 'accepta-proposta': return acceptaProposta(id);
    case 'descarta-proposta': return descartaProposta(id);
    case 'avisos-vistos': return avisosVistos();
    case 'nova-persona': return openPersona(null);
    case 'nou-convidat': return openPersona(null, 'convidat');
    case 'nou-potencial': return openPersona(null, 'convidat', { potencial: true, estatPot: 'idea' });
    case 'si-potencial': return siPotencial(id);
    case 'invita-ep': { const g = state.gravacions.find((q) => q.id === id); if (!g) return;
      const x = state.persones.find((q) => (g.convidatsIds || []).includes(q.id)), nom = x?.nom || g.titol, ag = contacteAgenda(nom);
      return openInvitacio({ nom, tel: x?.telefon || ag?.tels?.[0] || '', email: x?.email || ag?.emails?.[0] || '', p: x || null, ep: g }); }
    case 'invita-potencial': { const x = state.persones.find((q) => q.id === id); if (!x) return; const ag = contacteAgenda(x.nom);
      return openInvitacio({ nom: x.nom, tel: x.telefon || ag?.tels?.[0] || '', email: x.email || ag?.emails?.[0] || '', p: x }); }
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
      state = { programes: [], persones: [], estudis: [], ubicacions: {}, agenda: { contactes: [], importat: '' }, gravacions: [], propostes: [] }; save(); toast('Dades esborrades.'); break;
    case 'exemple':
      if (!confirm('Substituir les dades actuals per les inicials (els dos podcasts i l\'equip)?')) return;
      state = seed(); save(); break;
    default: return;
  }
  render();
});

$('#main').addEventListener('change', (e) => {
  const t = e.target;
  if (t.dataset.pot) {
    const x = pers(t.dataset.pot);
    if (x) { x.estatPot = t.value; save(); const y = window.scrollY; render(); window.scrollTo(0, y); }
    return;
  }
  if ('potDescartats' in t.dataset) { ui.potDescartats = t.checked; const y = window.scrollY; render(); window.scrollTo(0, y); return; }
  if (t.dataset.pla) {
    const g = state.gravacions.find((x) => x.id === t.dataset.pla);
    if (g && !potMarcar(g, t.dataset.k)) { t.checked = !t.checked; toast(fet(g, 'emes') ? "Aquest episodi ja és emès: només el pot canviar l'Angel." : "Guió, Gravat, Enviat i Emès només els marca l'Angel."); return; }
    if (g) {
      g.pla = { ...(g.pla || {}), [t.dataset.k]: t.checked };
      if (t.dataset.k === 'guio' && t.checked) delete g.referGuio;     // guió refet
      // L'estat de la gravació segueix les caselles: Confirmat → Gravat → Editat → Emès (publicat)
      const k = t.dataset.k, ESTAT_DE = { confirmat: 'confirmat', gravat: 'gravat', editat: 'editat', emes: 'publicat' };
      const ORDRE = ['pendent', 'confirmat', 'gravat', 'editat', 'publicat'], ara = ORDRE.indexOf(g.estat);
      if (ESTAT_DE[k] && g.estat !== 'cancellat') {
        if (t.checked && ORDRE.indexOf(ESTAT_DE[k]) > ara) g.estat = ESTAT_DE[k];
        if (!t.checked) {
          const alt = ['emes', 'editat', 'gravat', 'confirmat'].find((x) => fet(g, x));
          const nou = alt ? ESTAT_DE[alt] : 'pendent';
          if (ORDRE.indexOf(nou) < ara) g.estat = nou;
        }
      }
      save();
      const y = window.scrollY; render(); window.scrollTo(0, y);
    }
    return;
  }
  if (t.dataset.estat) {
    const g = state.gravacions.find((x) => x.id === t.dataset.estat);
    if (g && !esDavid()) { g.estat = t.value; save(); renderTaula(); }
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
  if (f === 'filtrePla') { ui.filtrePla = t.value; plaLlista(); return; }
  ui.view === 'agenda' ? renderTaula() : render();
});
$('#main').addEventListener('input', (e) => {
  if (e.target.id === 'cerca') { ui.cerca = e.target.value; renderTaula(); }
  if (e.target.id === 'cercaPla') { ui.cercaPla = e.target.value; plaLlista(); }
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
  if (dest.ep && !(dest.ep.convidatsIds || []).includes(p.id)) dest.ep.convidatsIds = [...(dest.ep.convidatsIds || []), p.id];
  p.invitat = ymd(new Date());
  if (!p.telefon && dest.tel) p.telefon = dest.tel;
  if (!p.email && dest.email) p.email = dest.email;
  if (p.potencial && (!p.estatPot || p.estatPot === 'idea')) p.estatPot = 'contactat';
  save(); render();
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
      <button type="button" class="btn" data-dlg="inv-mail">✉️ Correu${dest.email ? '' : ' (sense adreça)'}</button>
      <button type="button" class="btn" data-dlg="inv-pdf">📎 Comparteix amb el PDF</button>
      <button type="button" class="btn" data-dlg="inv-copia">📋 Copia el text</button>
    </div>
    <span class="hint"><b>WhatsApp amb l'enllaç</b> (recomanat) obre directament el xat d'aquesta persona, amb el missatge i l'enllaç a la invitació. <b>Correu</b> obre un correu nou amb el text i l'enllaç a la invitació${dest.email ? ' (a ' + esc(dest.email) + ')' : ''}. <b>Comparteix amb el PDF</b> adjunta el fitxer (al mòbil, tria Mail o WhatsApp); si WhatsApp no el deixa enviar, tria <b>Desa a Arxius</b> i adjunta'l des del xat amb <b>+ → Document</b>.</span>
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
      if (a === 'inv-mail') {
        const assumpte = 'Invitació · La cara oculta de la lluna';
        const cos = `${text}

📄 Invitació: ${urlPdf}

Àngel Ayats
La cara oculta de la lluna · Girona FM`;
        const mobil = matchMedia('(max-width: 760px), (pointer: coarse)').matches;
        if (mobil) location.href = `mailto:${encodeURIComponent(dest.email || '')}?subject=${encodeURIComponent(assumpte)}&body=${encodeURIComponent(cos)}`;
        else window.open(`https://mail.google.com/mail/?view=cm&fs=1&to=${encodeURIComponent(dest.email || '')}&su=${encodeURIComponent(assumpte)}&body=${encodeURIComponent(cos)}`, '_blank', 'noopener');
        marcaInvitat(dest); return toast('Correu preparat. Revisa-ho i prem Envia.');
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
  z.className = '';
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
