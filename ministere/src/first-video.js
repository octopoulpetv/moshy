// Première vidéo de la campagne (phase « Le Mystère »), écrite à la main en attendant la clé Claude.
// Usage : node src/first-video.js
import { savePost, produce } from './pipeline.js';
import { closeBrowser } from './studio/render.js';
import { db } from './db.js';

const v = (o) => ({ kicker: '', headline: '', body: '', footer: '', stamp: '', figure: '', accent: 'rouge', corp: 'none', ...o });

const hook = v({ template: 'affiche', kicker: 'Message du Gouvernement', stamp: 'Avis n°0001',
  headline: 'Vous n\'avez *rien* à craindre', body: 'Si vous n\'avez rien à cacher.' });

const content = {
  title: 'Short n°1 — Vous n\'avez rien à craindre',
  visual: hook,
  scenes: [
    { ...hook, seconds: 4.5 },
    { ...v({ template: 'communique', kicker: 'Bureau de l\'Accueil Civique', figure: 'Décret n° 2026-117',
      headline: 'Ouverture des frontières de l\'État du Sud',
      body: 'À compter du 1er novembre, l\'État du Sud accueille de nouveaux résidents.\n\nChaque arrivant sera recensé, noté et orienté, dans le respect des délais légaux.',
      footer: 'Pour le Gouverneur, L. Van-Ranke', stamp: 'Approuvé' }), seconds: 6 },
    { ...v({ template: 'fiche', accent: 'bleu', figure: '500', kicker: 'Relevé individuel — nouvel arrivant',
      headline: 'Votre crédit civique de départ : 500.', body: 'Il ne tient qu\'à vous de le faire monter. Ou de le perdre.',
      footer: 'Bureau du Crédit Civique', stamp: 'Réf. CC-0001' }), seconds: 5 },
    { ...v({ template: 'corpo', corp: 'kronos', kicker: 'Chaque seconde compte',
      headline: 'Votre avenir est déjà planifié.', body: 'Détendez-vous. Nous nous occupons de tout.',
      footer: 'Kronos, partenaire de l\'État du Sud. Toute ressemblance entre vos projets et nos prévisions est purement administrative.' }), seconds: 4.5 },
    { ...v({ template: 'countdown', kicker: 'Ouverture des frontières', headline: 'Les guichets ouvrent le 1er novembre',
      body: 'Présentez-vous à 20 h. Munissez-vous de patience.' }), seconds: 4 },
  ],
  voiceover: 'Citoyens. Ici Leopold Van-Ranke, gouverneur de l\'État du Sud. Depuis l\'effondrement, nous avons rebâti l\'ordre. Patiemment. Un formulaire après l\'autre. Le premier novembre, nos frontières s\'ouvrent. Chaque nouvel arrivant recevra un crédit civique. Ce qu\'il en fera ne dépend que de lui. N\'ayez aucune crainte. Si vous n\'avez rien à cacher, l\'État du Sud vous accueille.',
  reddit_title: '',
  captions: [
    { platform: 'tiktok', text: 'Avis n°0001 du Gouvernement de l\'État du Sud.\nVous n\'avez rien à craindre. 🏛️\n\nServeur RP FiveM francophone — ouverture le 1er novembre à 20 h. Lien en bio.', hashtags: ['FiveM', 'GTARP', 'RPFR', 'GTA6', 'roleplay'] },
    { platform: 'instagram', text: 'Avis n°0001. Le Gouvernement de l\'État du Sud ouvre ses frontières le 1er novembre.\nChaque arrivant sera recensé, noté et orienté.\n\nTHE EMPIRE — serveur RP FiveM francophone. Lien en bio.', hashtags: ['FiveM', 'GTARP', 'RPFR', 'GTAV', 'GTA6', 'roleplay', 'TheEmpireRP'] },
    { platform: 'youtube', text: 'Vous n\'avez rien à craindre — serveur RP FiveM FR', hashtags: ['FiveM', 'GTARP', 'Shorts'] },
    { platform: 'x', text: 'Avis n°0001 — Vous n\'avez rien à craindre.\nL\'État du Sud ouvre ses frontières le 1er novembre. Serveur RP FiveM : {LIEN}', hashtags: ['FiveM', 'GTARP'] },
    { platform: 'discord', text: '📢 **Avis n°0001 du Gouvernement**\nLe 1er novembre à 20 h, l\'État du Sud ouvre ses frontières. Chaque arrivant sera recensé, noté et orienté.\nPartagez l\'avis : {LIEN}', hashtags: [] },
  ],
};

const id = savePost({ phase: 'mystere', format: 'short', angle: 'mystere_teaser', theme: 'ouverture des frontières' }, content);
const t0 = Date.now();
try { await produce(id); } finally { await closeBrowser(); db.close(); }
console.log(`post #${id} rendu en ${Math.round((Date.now() - t0) / 1000)} s`);
