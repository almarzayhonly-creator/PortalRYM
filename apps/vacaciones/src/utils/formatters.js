import appConfig from '../config/app.json';

export function formatDate(value) {
  if (!value) return '—';
  return new Intl.DateTimeFormat(appConfig.locale, {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    timeZone: appConfig.timezone,
  }).format(new Date(`${value}T12:00:00`));
}

export function formatNumber(value) {
  return new Intl.NumberFormat(appConfig.locale, { maximumFractionDigits: 1 }).format(Number(value || 0));
}

export function currentYear() {
  return Number(new Intl.DateTimeFormat('en', { year: 'numeric', timeZone: appConfig.timezone }).format(new Date()));
}
