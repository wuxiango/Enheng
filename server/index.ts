import { createServer } from 'node:http'
import { join } from 'node:path'
import express from 'express'
import { app, root } from './app'

const isProd = process.env.NODE_ENV === 'production'
if (isProd) {
  const dist = join(root, 'dist')
  app.use(express.static(dist))
  app.get(/^(?!\/api).*/, (_req, res) => {
    res.sendFile(join(dist, 'index.html'))
  })
} else {
  const { createServer: createViteServer } = await import('vite')
  const vite = await createViteServer({
    root,
    server: { middlewareMode: true },
    appType: 'spa',
  })
  app.use(vite.middlewares)
}

const port = Number(process.env.PORT || 5173)
createServer(app).listen(port, () => {
  console.log(`嗯哼精选 http://localhost:${port}`)
})
