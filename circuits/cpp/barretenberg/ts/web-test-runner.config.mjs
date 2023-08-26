import { fileURLToPath } from 'url';
import { esbuildPlugin } from '@web/dev-server-esbuild';
import { playwrightLauncher } from '@web/test-runner-playwright';
import { fromRollup } from '@web/dev-server-rollup';
import rollupCommonjs from '@rollup/plugin-commonjs';

const commonjs = fromRollup(rollupCommonjs);

async function add_headers(ctx, next) {
  ctx.set('Cross-Origin-Opener-Policy', 'same-origin');
  ctx.set('Cross-Origin-Embedder-Policy', 'require-corp');
  await next(ctx);
}

export default {
  middlewares: [add_headers],
  browsers: [
    playwrightLauncher({ product: 'chromium' }),
    // WebKit currently failing in comlink with "The object can not be cloned"
    //playwrightLauncher({ product: 'webkit' }),
    playwrightLauncher({ product: 'firefox' }),
  ],
  nodeResolve: { browser: true },
  plugins: [
    commonjs({
      // include: ['**/node_modules/events/events.js'],
    }),
    esbuildPlugin({
      ts: true,
      tsconfig: fileURLToPath(new URL('./tsconfig.browser.json', import.meta.url)),
    }),
  ],
  files: ['src/**/*.browser.test.ts'],

  testFramework: {
    config: {
      ui: 'bdd',
      timeout: 400000,
    },
  },
};
