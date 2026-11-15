// Laces It colours and type, matching the web app.
export const C = {
  accent: '#FF5A36',
  accentInk: '#1A0B06',
  run: '#12B886',
  ink: '#16181D',
  muted: '#6B7280',
  bg: '#F1F2F5',
  card: '#FFFFFF',
  line: '#E3E5EA',
  night: '#0B1622',
  gold: '#FFD24A',
};

export const fmt = (lang: string) => ({
  date: new Intl.DateTimeFormat(lang, { weekday: 'short', day: 'numeric', month: 'short', timeZone: 'Asia/Dubai' }),
  time: new Intl.DateTimeFormat(lang, { hour: 'numeric', minute: '2-digit', timeZone: 'Asia/Dubai' }),
});
