import { handleApi } from '../../cloudflare/api'
import type { Env } from '../../cloudflare/env'

// 所有 /api/* 请求都交给 cloudflare/api.ts；其它路径由 Pages 直接给静态文件，
// 找不到文件时 Pages 自动回退到 index.html（单页应用）。
export const onRequest = (context: { request: Request; env: Env }) => handleApi(context.request, context.env)
