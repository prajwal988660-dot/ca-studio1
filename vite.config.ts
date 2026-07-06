import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');
  const localApiKeyFromEnv = env.VITE_GEMINI_API_KEY || env.GEMINI_API_KEY;

  return {
    plugins: [
    react(),
    // Dev-only: provide Netlify Functions endpoint locally.
    // This prevents `/.netlify/functions/gemini-plan` 404 when testing AI on localhost.
    {
      name: 'netlify-functions-dev-middleware',
      configureServer(devServer) {
        const isDev = process.env.NODE_ENV !== 'production';
        if (!isDev) return;

        const endpointPath = '/.netlify/functions/gemini-plan';
        const localApiKey = localApiKeyFromEnv;

        devServer.middlewares.use(endpointPath, async (req, res) => {
          if (req.method !== 'POST') {
            res.statusCode = 405;
            res.end('Method not allowed');
            return;
          }

          if (!localApiKey) {
            res.statusCode = 500;
            res.setHeader('content-type', 'application/json');
            res.end(JSON.stringify({ error: 'GEMINI_API_KEY/VITE_GEMINI_API_KEY missing for local dev' }));
            return;
          }

          let raw = '';
          req.on('data', chunk => { raw += chunk; });
          req.on('end', async () => {
            try {
              const body = JSON.parse(raw || '{}');
              const { model = 'gemini-2.0-flash', ...geminiPayload } = body ?? {};

              const response = await fetch(
                `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent`,
                {
                  method: 'POST',
                  headers: {
                    'content-type': 'application/json',
                    'x-goog-api-key': localApiKey,
                  },
                  body: JSON.stringify(geminiPayload),
                },
              );

              const text = await response.text();
              
              res.statusCode = response.status;
              res.setHeader('content-type', 'application/json');
              res.end(text);
            } catch (e: any) {
              res.statusCode = 500;
              res.setHeader('content-type', 'application/json');
              res.end(JSON.stringify({ error: e?.message || 'Local Gemini proxy failed' }));
            }
          });
        });
      },
    },
    ],
    server: {
      port: 1066,
      strictPort: true,
      // Don't watch stray binary/data files dropped in the repo — they can be
      // locked by other apps (image viewers, OneDrive sync) and crash the dev
      // watcher with EBUSY. These aren't source, so hot-reload doesn't need them.
      watch: {
        ignored: [
          '**/node_modules/**',
          '**/.git/**',
          '**/*.png',
          '**/*.jpg',
          '**/*.jpeg',
          '**/*.xml',
          '**/samples/**',
        ],
      },
    },
    resolve: {
      alias: {
        '@': path.resolve(__dirname, './src'),
        'radix-ui': path.resolve(__dirname, './src/shims/radix-ui'),
      },
    },
  };
});
