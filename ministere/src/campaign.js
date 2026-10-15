import { loadCampaign } from './config.js';

const DAY = 86_400_000;

/** Date du jour (AAAA-MM-JJ) dans le fuseau de la campagne. */
export function today(tz) {
  return new Intl.DateTimeFormat('en-CA', { timeZone: tz, year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date());
}

export function campaignState(now = new Date()) {
  const c = loadCampaign();
  const day = today(c.timezone);
  const phase = c.phases.find((p) => day >= p.from && day <= p.to) || c.phases[c.phases.length - 1];
  const opening = new Date(c.opening_at);
  const msLeft = opening - now;
  // Jours calendaires (J-17 = 17 jours entre aujourd'hui et le jour d'ouverture, dans le fuseau de la campagne).
  const openDay = new Intl.DateTimeFormat('en-CA', { timeZone: c.timezone, year: 'numeric', month: '2-digit', day: '2-digit' }).format(opening);
  const calDays = Math.round((Date.parse(openDay) - Date.parse(day)) / DAY);
  return {
    campaign: c,
    day,
    phase,
    opening,
    isOpen: msLeft <= 0,
    daysLeft: Math.max(0, calDays),
    openingLabel: new Intl.DateTimeFormat('fr-BE', {
      timeZone: c.timezone, weekday: 'long', day: 'numeric', month: 'long', hour: '2-digit', minute: '2-digit',
    }).format(opening),
  };
}
