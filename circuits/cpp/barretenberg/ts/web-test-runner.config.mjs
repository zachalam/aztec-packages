// import { fileURLToPath } from 'url';
import { esbuildPlugin } from '@web/dev-server-esbuild';
import { playwrightLauncher } from '@web/test-runner-playwright';
import { webdriverLauncher } from '@web/test-runner-webdriver';
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
    // (~103.9s) for `double_verify_proof`
    // All below times refer `double_verify_proof` on MBP 8 cores i9
    playwrightLauncher({ product: 'chromium' }),
    
    // WebKit currently failing with `Error: page.goto: Page crashed`
    // Works ok on regular Safari
    // playwrightLauncher({ product: 'webkit' }),
    
    // firefox seems to suffer from known bug causing
    // Error: page.goto: Navigation to "about:blank" is interrupted by another navigation to "about:blank"
    // more https://github.com/microsoft/playwright/issues/6202
    // bu test shall pass
    // besides that, firefox seems to be extremally slow (10m) vs (<2m) in latest firefox when manual testing is launched
    // playwrightLauncher({ product: 'firefox' }),


    // Below options would need "some" system permissions (macOS specificallly)
    // To control applications

    // Completes in ~2m
    // webdriverLauncher({
    //   automationProtocol: 'webdriver',
    //   // path: '/wd/hub/',
    //   capabilities: {
    //     browserName: 'firefox',
    //     'moz:firefoxOptions': {
    //       args: ['-headless'],
    //     },
    //   },
    // }),

    // Needs `Allow Remote Automation` enabled from `Develop` menu
    // Completes in ~ 2m
    // webdriverLauncher({
    //   automationProtocol: 'webdriver',
    //   // path: '/wd/hub/',
    //   capabilities: {
    //     browserName: 'safari',
    //     // 'moz:firefoxOptions': {
    //     //   args: ['-headless'],
    //     // },
    //   },
    // }),

  ],
  testsFinishTimeout: 420000,
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
  files: ['test/browser/extended/**/*.browser.test.ts'],

  testFramework: {
    config: {
      ui: 'bdd',
      timeout: 420000,
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
