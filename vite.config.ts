import { defineConfig } from 'vite';
import solidPlugin from 'vite-plugin-solid';

export default defineConfig(({ mode }) => {
  const isCanary = mode === 'canary';

  return {
    plugins: [
      solidPlugin(),
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
    server: {
      port: 3000,
      host: true,
    },
    build: {
      target: 'esnext',
    },
  };
});
