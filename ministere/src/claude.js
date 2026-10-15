import Anthropic from '@anthropic-ai/sdk';
import { config } from './config.js';
import { db } from './db.js';

let client;
function getClient() {
  if (!config.claude.apiKey) throw new Error('ANTHROPIC_API_KEY manquante dans .env');
  client ??= new Anthropic({ apiKey: config.claude.apiKey });
  return client;
}

/**
 * Appel Claude avec sortie JSON garantie par schéma.
 * `system` doit rester stable d'un appel à l'autre (bible du lore) : il est mis en cache.
 * Tout ce qui varie (date, stats, brief) va dans `user`.
 */
export async function generateJSON({ purpose, system, user, schema, effort = 'medium', maxTokens = 16000 }) {
  const params = {
    model: config.claude.model,
    max_tokens: maxTokens,
    system: [{ type: 'text', text: system, cache_control: { type: 'ephemeral' } }],
    messages: [{ role: 'user', content: user }],
    output_config: { effort, format: { type: 'json_schema', schema } },
  };

  const anthropic = getClient();
  let response;
  if (config.claude.fallbacks) {
    try {
      response = await anthropic.beta.messages.create({ ...params, betas: ['server-side-fallback-2026-07-01'], fallbacks: 'default' });
    } catch (e) {
      // Si le compte n'a pas accès au repli serveur, on retombe sur l'appel standard.
      if (!(e instanceof Anthropic.BadRequestError)) throw e;
      console.warn('[claude] repli serveur indisponible, appel standard :', e.message);
      response = await anthropic.messages.create(params);
    }
  } else {
    response = await anthropic.messages.create(params);
  }

  const u = response.usage || {};
  db.prepare(`INSERT INTO api_usage (purpose, model, input_tokens, output_tokens, cache_read, cache_write)
              VALUES (?, ?, ?, ?, ?, ?)`)
    .run(purpose, response.model, u.input_tokens ?? 0, u.output_tokens ?? 0,
      u.cache_read_input_tokens ?? 0, u.cache_creation_input_tokens ?? 0);

  if (response.stop_reason === 'refusal') {
    throw new Error(`Claude a refusé (${response.stop_details?.category ?? 'sans catégorie'}) : ${response.stop_details?.explanation ?? ''}`);
  }
  if (response.stop_reason === 'max_tokens') throw new Error('Réponse tronquée (max_tokens atteint)');

  const text = response.content.filter((b) => b.type === 'text').map((b) => b.text).join('');
  return JSON.parse(text);
}

/** Coût estimé en USD (tarifs Opus 5.5 : 4 $ / 20 $ par million, cache read 0,20 $, cache write 1,25×). */
export function usageCost() {
  const r = db.prepare(`SELECT COALESCE(SUM(input_tokens),0) i, COALESCE(SUM(output_tokens),0) o,
                        COALESCE(SUM(cache_read),0) cr, COALESCE(SUM(cache_write),0) cw, COUNT(*) n FROM api_usage`).get();
  const usd = (r.i * 4 + r.o * 20 + r.cr * 0.2 + r.cw * 5) / 1e6;
  return { calls: r.n, usd: Math.round(usd * 100) / 100 };
}
