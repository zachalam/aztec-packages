import { fileURLToPath } from 'url';
import { esbuildPlugin } from '@web/dev-server-esbuild';
import { playwrightLauncher } from '@web/test-runner-playwright';
import { fromRollup } from '@web/dev-server-rollup';
import rollupCommonjs from '@rollup/plugin-commonjs';
// import tsConfigPaths from "rollup-plugin-tsconfig-paths"

const commonjs = fromRollup(rollupCommonjs);
// const tsPaths = fromRollup(tsConfigPaths);

async function add_headers(ctx, next) {
  ctx.set('Cross-Origin-Opener-Policy', 'same-origin');
  ctx.set('Cross-Origin-Embedder-Policy', 'require-corp');
  await next(ctx);
}

export default {
  // We need to set these heders for workers to work
  middlewares: [add_headers],
  browsers: [
    playwrightLauncher({ product: 'chromium' }),
    // WebKit currently failing in comlink with "The object can not be cloned"
    // playwrightLauncher({ product: 'webkit' }),
    
    // firefox seems to suffer from known bug causing
    // Error: page.goto: Navigation to "about:blank" is interrupted by another navigation to "about:blank"
    // more https://github.com/microsoft/playwright/issues/6202
    playwrightLauncher({ product: 'firefox' }),
  ],
  nodeResolve: { browser: true },
  plugins: [
    // tsPaths(),
    commonjs({
      // include: ['**/node_modules/events/events.js'],
    }),
    esbuildPlugin({
      ts: true,
      // tsconfig: fileURLToPath(new URL('./tsconfig.browser.json', import.meta.url)),
    }),
  ],
  files: ['src/**/*.browser.test.ts'],

  testFramework: {
    config: {
      ui: 'bdd',
      timeout: 400000,
    },
  },

  testRunnerHtml: testFramework => `
    <html>
      <head>
        <script type="module" src="${testFramework}"></script>
        <script type="module">import 'jest-browser-globals';</script>
      </head>
    </html>
  `,  
};
