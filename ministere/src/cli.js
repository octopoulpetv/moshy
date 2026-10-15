import { config } from './config.js';
import { db } from './db.js';
import { plan, write, produce, dailyRun, savePost } from './pipeline.js';
import { closeBrowser } from './studio/render.js';
import { computeStats } from './analyst.js';
import { campaignState } from './campaign.js';
import { DEMO } from './demo.js';

const [cmd, arg] = process.argv.slice(2);

const commands = {
  async demo() {
    for (const d of DEMO) {
      const id = savePost(d.brief, d.content);
      await produce(id);
    }
    console.log('Démo prête : lance « npm start » et ouvre le dashboard.');
  },
  async run() { console.log('posts produits :', await dailyRun(Number(arg) || config.scheduler.postsPerDay)); },
  async plan() { console.log('briefs :', await plan(Number(arg) || config.scheduler.postsPerDay)); },
  async write() { const id = await write(Number(arg)); await produce(id); },
  async render() { await produce(Number(arg)); },
  async stats() { console.log(JSON.stringify(computeStats(), null, 2)); },
  async state() { const s = campaignState(); console.log({ day: s.day, phase: s.phase.label, daysLeft: s.daysLeft, opening: s.openingLabel }); },
  async reset() { db.exec('DELETE FROM publications; DELETE FROM posts; DELETE FROM briefs; DELETE FROM insights;'); console.log('contenus effacés'); },
};

if (!commands[cmd]) {
  console.log(`Usage : node src/cli.js <commande>
  demo            contenus d'exemple rendus sans clé API
  run [n]         tournée complète : stratégie + rédaction + rendu de n contenus
  plan [n]        stratégie seule (crée n briefs)
  write <briefId> rédige et rend un brief
  render <postId> refait le rendu d'un post
  stats           statistiques consolidées
  state           phase de campagne en cours
  reset           efface tous les contenus (garde clics, arrivées, invitations)`);
  process.exit(cmd ? 1 : 0);
}
try { await commands[cmd](); } finally { await closeBrowser(); db.close(); }
