import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

// Server only env the API functions read (never exposed to the browser: no VITE_ prefix).
const SERVER_ENV = ['OPENROUTER_API_KEY', 'OPENROUTER_MODELS', 'FIREBASE_PROJECT_ID', 'SITE_URL']

// `npm run dev` has no Vercel runtime, so serve api/*.js handlers the same way Vercel does
// (spec 0006): JSON body parsed into req.body, the handler writes the response.
const devApi = (env) => ({
  name: 'moviehub-dev-api',
  configureServer(server) {
    SERVER_ENV.forEach((k) => { if (env[k] && !process.env[k]) process.env[k] = env[k] })
    server.middlewares.use('/api/recommend', async (req, res) => {
      let raw = ''
      for await (const chunk of req) raw += chunk
      try { req.body = raw ? JSON.parse(raw) : {} } catch { req.body = {} }
      try {
        const { default: handler } = await server.ssrLoadModule('/api/recommend.js')
        await handler(req, res)
      } catch (err) {
        console.error(err)
        res.statusCode = 500
        res.end(JSON.stringify({ error: 'Dev API crashed. See the terminal.' }))
      }
    })
  },
})

// https://vite.dev/config/
export default defineConfig(({ mode }) => ({
  plugins: [react(), tailwindcss(), devApi(loadEnv(mode, process.cwd(), ''))],
}))
