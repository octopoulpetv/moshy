// Contenus d'exemple pour tester toute la chaîne sans clé API (commande : npm run demo).
const v = (o) => ({ kicker: '', headline: '', body: '', footer: '', stamp: '', figure: '', accent: 'rouge', corp: 'none', ...o });

export const DEMO = [
  {
    brief: { phase: 'mystere', format: 'affiche', angle: 'propagande', theme: 'crédit civique' },
    content: {
      title: 'Votre crédit civique vous remercie',
      visual: v({ template: 'affiche', kicker: 'Ministère de la Cohésion', stamp: 'Avis n°0412', headline: 'Votre crédit civique *vous remercie*',
        body: 'Chaque citoyen noté est un citoyen protégé. Consultez votre relevé au guichet le plus proche.',
        footer: 'Toute contestation doit être déposée en trois exemplaires.' }),
      scenes: [], voiceover: '', reddit_title: '',
      captions: [
        { platform: 'instagram', text: 'Avis n°0412. Le Ministère rappelle que la notation est une forme de protection.\n\nL\'État du Sud ouvre ses frontières le 1er novembre. Serveur RP FiveM francophone — lien en bio.', hashtags: ['FiveM', 'GTARP', 'RPFR', 'roleplay'] },
        { platform: 'x', text: 'Avis n°0412 — Votre crédit civique vous remercie.\nL\'État du Sud ouvre ses frontières le 1er novembre. Serveur RP FiveM : {LIEN}', hashtags: ['FiveM', 'GTARP'] },
        { platform: 'discord', text: '📢 **Avis n°0412** — Le Ministère de la Cohésion rappelle à chaque futur résident que la notation est une forme de protection. {LIEN}', hashtags: [] },
      ],
    },
  },
  {
    brief: { phase: 'mystere', format: 'corpo', angle: 'satire_corpo', theme: 'Aethernet' },
    content: {
      title: 'Aethernet — vie privée',
      visual: v({ template: 'corpo', corp: 'aethernet', kicker: 'Toujours connecté. Toujours compté.', headline: 'Votre vie privée est notre priorité absolue.',
        body: 'Aethernet sécurise vos données pour que vous n\'ayez plus jamais à vous en soucier.',
        footer: 'Offre réservée aux citoyens de crédit civique ≥ 500. Les données transmises deviennent propriété de l\'État du Sud.' }),
      scenes: [], voiceover: '', reddit_title: '',
      captions: [
        { platform: 'facebook', text: 'Aethernet. Toujours connecté. Toujours compté.\n\nDécouvrez l\'État du Sud, serveur RP FiveM francophone : {LIEN}', hashtags: ['FiveM', 'GTARP', 'RPFR'] },
        { platform: 'x', text: 'Votre vie privée est notre priorité absolue. — Aethernet\n{LIEN}', hashtags: ['FiveM', 'GTARP'] },
      ],
    },
  },
  {
    brief: { phase: 'mystere', format: 'short', angle: 'mystere_teaser', theme: 'recensement' },
    content: {
      title: 'Short — Avis de recensement',
      visual: v({ template: 'communique', kicker: 'Bureau du Recensement Civique', figure: 'Décret n° 2026-117', headline: 'Ouverture du recensement des nouveaux résidents',
        body: 'Tout individu franchissant la frontière de l\'État du Sud est tenu de se présenter au guichet d\'accueil.', footer: 'Pour le Gouverneur, L. Van-Ranke', stamp: 'Approuvé' }),
      scenes: [
        { ...v({ template: 'affiche', kicker: 'Message officiel', headline: 'Vous êtes *attendu*', body: 'Ceci n\'est pas une invitation. C\'est une convocation.' }), seconds: 3 },
        { ...v({ template: 'communique', kicker: 'Bureau du Recensement Civique', figure: 'Décret n° 2026-117', headline: 'Ouverture du recensement des nouveaux résidents',
          body: 'Tout individu franchissant la frontière est tenu de se présenter au guichet d\'accueil.', footer: 'Pour le Gouverneur, L. Van-Ranke', stamp: 'Urgent' }), seconds: 4 },
        { ...v({ template: 'fiche', kicker: 'Relevé individuel — citoyen n° 0047-B', figure: '500', accent: 'bleu', headline: 'Votre score de départ : 500.',
          body: 'Ce qu\'il deviendra ne dépend que de vous. Et de nous.', footer: 'Données certifiées par Aethernet' }), seconds: 4 },
        { ...v({ template: 'countdown', kicker: 'Ouverture des frontières', headline: 'Les guichets ouvrent bientôt', body: 'Préparez vos documents.' }), seconds: 3 },
      ],
      voiceover: 'Citoyen. L\'État du Sud vous informe de l\'ouverture du recensement des nouveaux résidents. Tout individu franchissant la frontière recevra un crédit civique de départ. Ce qu\'il deviendra ne dépend que de vous. Les guichets ouvrent le premier novembre. Présentez-vous.',
      reddit_title: '',
      captions: [
        { platform: 'tiktok', text: 'Le recensement commence. Votre crédit civique aussi. 🏛️\nServeur RP FiveM francophone — ouverture le 1er novembre, lien en bio.', hashtags: ['FiveM', 'GTARP', 'RPFR', 'GTA6', 'roleplay'] },
        { platform: 'youtube', text: 'Le recensement commence. Serveur RP FiveM FR', hashtags: ['FiveM', 'GTARP', 'Shorts'] },
        { platform: 'instagram', text: 'Décret n° 2026-117. Présentez-vous au guichet.\nServeur RP FiveM francophone — lien en bio.', hashtags: ['FiveM', 'GTARP', 'RPFR', 'roleplay'] },
      ],
    },
  },
];
