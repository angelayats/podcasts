// Connexió amb la base de dades (Supabase).
// La clau "anon / publishable" és pública per disseny: la seguretat la donen les regles de la base de dades
// (només els correus de la taula «membres» poden llegir i escriure).
window.PODCASTS_CONFIG = {
  supabaseUrl: 'https://uikzjyqtiskmwxjsdlem.supabase.co',
  supabaseKey: 'sb_publishable_0AAXEBczG4BIXwPnuk4Qbw_3y2hSqF7',
};
