/// <reference types="vitest" />
import fs from 'node:fs';
import path from 'node:path';
import { defineConfig } from 'vite';
import solidPlugin from 'vite-plugin-solid';
import packageJson from './package.json';

/**
 * Service Worker のバージョン自動同期プラグイン
 * package.json の version を sw.js の CACHE_NAME に自動注入し、バージョンの変更忘れを防止する
 */
function syncSwVersionPlugin() {
  const version = packageJson.version;
  const updateSwContent = (content: string) => {
    return content
      .replace(
        /const SW_VERSION = ['"][^'"]+['"];/,
        `const SW_VERSION = '${version}';`
      )
      .replace(
        /const CACHE_NAME = ['"]mizuna-cache-v[^'"]+['"];/,
        `const CACHE_NAME = 'mizuna-cache-v${version}';`
      );
  };

  const updateVersionJson = (filePath: string) => {
    try {
      const data = { version };
      fs.writeFileSync(filePath, JSON.stringify(data, null, 2) + '\n', 'utf-8');
    } catch {
      // ignore
    }
  };

  return {
    name: 'mizuna-sync-sw-version',
    buildStart() {
      const publicSwPath = path.resolve(__dirname, 'public/sw.js');
      if (fs.existsSync(publicSwPath)) {
        const original = fs.readFileSync(publicSwPath, 'utf-8');
        const updated = updateSwContent(original);
        if (original !== updated) {
          fs.writeFileSync(publicSwPath, updated, 'utf-8');
        }
      }
      const publicVersionPath = path.resolve(__dirname, 'public/version.json');
      updateVersionJson(publicVersionPath);
    },
    configureServer(server: any) {
      server.middlewares.use((req: any, res: any, next: any) => {
        if (req.url === '/sw.js') {
          const publicSwPath = path.resolve(__dirname, 'public/sw.js');
          if (fs.existsSync(publicSwPath)) {
            const content = fs.readFileSync(publicSwPath, 'utf-8');
            res.setHeader('Content-Type', 'application/javascript');
            res.end(updateSwContent(content));
            return;
          }
        }
        if (req.url === '/version.json') {
          res.setHeader('Content-Type', 'application/json');
          res.end(JSON.stringify({ version }, null, 2));
          return;
        }
        next();
      });
    },
    closeBundle() {
      const distSwPath = path.resolve(__dirname, 'dist/sw.js');
      if (fs.existsSync(distSwPath)) {
        const original = fs.readFileSync(distSwPath, 'utf-8');
        const updated = updateSwContent(original);
        if (original !== updated) {
          fs.writeFileSync(distSwPath, updated, 'utf-8');
        }
      }
      const distVersionPath = path.resolve(__dirname, 'dist/version.json');
      updateVersionJson(distVersionPath);
    },
  };
}

export default defineConfig(({ mode }) => {
  const isCanary = mode === 'canary';

  return {
    plugins: [
      solidPlugin({ hot: false }),
      syncSwVersionPlugin(),
      {
        name: 'mizuna-pwa-channel',
        transformIndexHtml(html) {
          if (!isCanary) return html;
          return html
            .replace(
              '<title>Mizuna -ノート専用Misskeyクライアント</title>',
              '<title>Mizuna Canary -ノート専用Misskeyクライアント</title>'
            )
            .replace(
              'content="Mizuna"',
              'content="Mizuna Canary"'
            )
            .replace(
              'href="/manifest.json"',
              'href="/manifest-canary.json"'
            );
        },
      },
    ],
    resolve: {
      conditions: mode === 'test' ? ['development', 'browser'] : [],
      alias: {
        'solid-js/web': path.resolve(__dirname, 'node_modules/solid-js/web'),
        'solid-js': path.resolve(__dirname, 'node_modules/solid-js'),
      },
      dedupe: ['solid-js', 'solid-js/web'],
    },
    server: {
      port: 3000,
      host: true,
    },
    build: {
      target: 'esnext',
      cssMinify: true,
      rollupOptions: {
        output: {
          manualChunks(id) {
            if (id.includes('node_modules')) {
              if (id.includes('gsap')) return 'vendor-gsap';
              if (id.includes('dexie')) return 'vendor-db';
              if (id.includes('mfm-js')) return 'vendor-mfm';
              if (id.includes('solid-js')) return 'vendor-solid';
            }
          },
        },
      },
    },
    test: {
      environment: 'jsdom',
      globals: true,
      setupFiles: ['./tests/setupTests.ts'],
      deps: {
        optimizer: {
          web: {
            include: ['solid-js', 'solid-js/web', '@solidjs/testing-library'],
          },
        },
      },
      server: {
        deps: {
          inline: [/solid-js/, /@solidjs\/testing-library/],
        },
      },
    },
  };
});
