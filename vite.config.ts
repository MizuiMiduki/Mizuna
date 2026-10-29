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
    return content.replace(
      /const CACHE_NAME = ['"]mizuna-cache-v[^'"]+['"];/,
      `const CACHE_NAME = 'mizuna-cache-v${version}';`
    );
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
    },
    server: {
      port: 3000,
      host: true,
    },
    build: {
      target: 'esnext',
    },
    test: {
      environment: 'jsdom',
      globals: true,
      setupFiles: ['./tests/setupTests.ts'],
      server: {
        deps: {
          inline: [/solid-js/],
        },
      },
    },
  };
});
