import { defineConfig, loadEnv, type Plugin } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { fileURLToPath } from 'node:url'
import type { IncomingMessage, ServerResponse } from 'node:http'

/** En desarrollo, sirve /api/* ejecutando el mismo router que usa Netlify (sin necesitar la CLI de Netlify). */
function apiDev(): Plugin {
  return {
    name: 'api-dev',
    configureServer(server) {
      server.middlewares.use('/api', async (req: IncomingMessage, res: ServerResponse) => {
        try {
          const mod = await server.ssrLoadModule('/server/router.ts')
          const url = new URL(req.url ?? '/', 'http://localhost')
          const chunks: Buffer[] = []
          for await (const c of req) chunks.push(c as Buffer)
          const body = chunks.length ? Buffer.concat(chunks) : undefined
          const request = new Request(`http://localhost/api${url.pathname}${url.search}`, {
            method: req.method,
            headers: req.headers as Record<string, string>,
            body: req.method === 'GET' || req.method === 'HEAD' ? undefined : body,
          })
          const response: Response = await mod.route(request)
          res.statusCode = response.status
          response.headers.forEach((v, k) => res.setHeader(k, v))
          res.end(Buffer.from(await response.arrayBuffer()))
        } catch (err) {
          res.statusCode = 500
          res.setHeader('content-type', 'application/json')
          res.end(JSON.stringify({ error: { code: 'DEV_SERVER', message: String(err) } }))
        }
      })
    },
  }
}

export default defineConfig(({ mode }) => {
  Object.assign(process.env, loadEnv(mode, process.cwd(), ''))
  return {
    plugins: [react(), tailwindcss(), apiDev()],
    resolve: { alias: { '@': fileURLToPath(new URL('./src', import.meta.url)) } },
    test: { environment: 'node', include: ['tests/**/*.test.ts', 'src/**/*.test.ts', 'server/**/*.test.ts'] },
  }
})
