import cron from 'node-cron';
import { config, loadCampaign } from './config.js';
import { startServer } from './server.js';
import { startDiscord } from './discord/bot.js';
import { dailyRun } from './pipeline.js';

startServer();
startDiscord().catch((e) => console.error('[discord]', e.message));

if (config.scheduler.enabled && config.claude.apiKey) {
  cron.schedule(config.scheduler.dailyCron, () => {
    dailyRun(config.scheduler.postsPerDay).catch((e) => console.error('[planificateur]', e.message));
  }, { timezone: loadCampaign().timezone });
  console.log(`[planificateur] ${config.scheduler.postsPerDay} contenus générés selon « ${config.scheduler.dailyCron} »`);
} else {
  console.log('[planificateur] désactivé (SCHEDULER_ENABLED=0 ou ANTHROPIC_API_KEY absente)');
}
