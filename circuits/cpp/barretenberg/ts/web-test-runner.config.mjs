// import { fileURLToPath } from 'url';
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
  // We need to set these heders for workers to work
  middlewares: [add_headers],
  browsers: [
    playwrightLauncher({ product: 'chromium' }),
    // WebKit currently failing in comlink with "The object can not be cloned"
    // playwrightLauncher({ product: 'webkit' }),
    
    // firefox seems to suffer from known bug causing
    // Error: page.goto: Navigation to "about:blank" is interrupted by another navigation to "about:blank"
    // more https://github.com/microsoft/playwright/issues/6202
    // bu test shall pass
    // playwrightLauncher({ product: 'firefox' }),
  ],
  nodeResolve: { browser: true },
  plugins: [
    commonjs({
      // include: ['**/node_modules/events/events.js'],
    }),
    esbuildPlugin({
      ts: true,
      // Using tsconfig would be valid in scenario where we import library directly
      // from TS source
      // tsconfig: fileURLToPath(new URL('./tsconfig.browser.json', import.meta.url)),
    }),
  ],
  files: ['test/browser/sanity/**/*.browser.test.ts'],

  testFramework: {
    config: {
      ui: 'bdd',
      timeout: 400000,
    },
  },

  // This approach could be used if we insist to use Jest instead of Mocha
  // testRunnerHtml: testFramework => `
  //   <html>
  //     <head>
  //       <script type="module" src="${testFramework}"></script>
  //       <script type="module">import 'jest-browser-globals';</script>
  //     </head>
  //   </html>
  // `,  
};
