// 非 /api 的路径：先找静态文件，找不到就回退到 index.html，交给前端路由（/admin、/status/:id 等）。
// public/404.html 是给 GitHub Pages 用的跳转页，在 Cloudflare 上不用它，也一并回退到 index.html。
type Assets = { fetch: (input: Request | string) => Promise<Response> }

export const onRequest = async (context: { request: Request; env: { ASSETS: Assets } }) => {
  const { request, env } = context
  const url = new URL(request.url)
  if (url.pathname !== '/404.html') {
    const response = await env.ASSETS.fetch(request)
    if (response.status !== 404) return response
  }
  if (request.method !== 'GET' && request.method !== 'HEAD') return new Response(null, { status: 405 })
  const index = await env.ASSETS.fetch(new Request(new URL('/', url), { headers: request.headers }))
  return new Response(index.body, { status: 200, headers: index.headers })
}
