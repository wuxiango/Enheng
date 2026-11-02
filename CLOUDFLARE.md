# 嗯哼精选 · Cloudflare Pages 部署说明

线上地址：https://enheng.pages.dev （Pages 项目 `enheng`，直接上传部署，没有连 Git）。

## 结构

| 部分 | 位置 |
| --- | --- |
| 前端（React + Vite） | `src/`，构建到 `dist/` |
| 后台（Pages Functions） | `functions/api/[[path]].ts` → `cloudflare/api.ts`，数据层 `cloudflare/db.ts` |
| 单页回退 | `functions/[[path]].ts`：找不到的路径都回到 `index.html` |
| 路由 | `public/_routes.json`：静态文件不经过函数 |
| 数据库 | D1，绑定名 `DB`（库名 `enheng`），结构见 `migrations/` |
| 照片 | R2，绑定名 `ALBUMS`（桶名 `enheng-albums`），对象键就是照片文件名 `<uuid>.jpg` |
| 密钥 | `ADMIN_PASSWORD`、`SESSION_SECRET`（至少 32 位），只放在 Cloudflare 后台 / `.dev.vars`，不进仓库 |

接口和原来的 Express 版本（`server/`）一一对应，返回格式一致。

> ⚠️ `migrations/0001_init.sql` 是按接口返回推断出来的。线上 D1 的真实结构还没读过，
> 第一次拿到令牌后先跑：
>
> ```
> npx wrangler d1 execute enheng --remote --command "SELECT name, sql FROM sqlite_master"
> ```
>
> 如果和这里不一样，改 `cloudflare/db.ts` 去适配线上，不要改线上表，也不要在正式库上跑迁移。

## 本地开发（不需要登录 Cloudflare）

需要 Node 22 以上。

```
npm install
cp .dev.vars.example .dev.vars        # 填本地用的密码和随机密钥
npm run cf:migrate:local              # 建本地 D1 表
npm run cf:seed:local                 # 把 data/*.json 和 data/album-images 灌进本地 D1 / R2
npm run cf:dev                        # 构建并在 http://localhost:8788 启动
npm test                              # 含一组用本地 D1/R2 跑的后台测试
```

本地数据存在 `.wrangler/state/`，删掉这个目录就能从头再来。

## 部署

需要主人提供一个 Cloudflare API 令牌（只放在环境变量 `CLOUDFLARE_API_TOKEN`，不写进代码），权限：

- Account → Cloudflare Pages：Edit
- Account → D1：Edit
- Account → Workers R2 Storage：Edit

还需要账号 ID（`CLOUDFLARE_ACCOUNT_ID`）。

### 1. 先对照线上

```
npx wrangler d1 list                                   # 拿到 enheng 的 database_id，填进 wrangler.toml
npx wrangler d1 execute enheng --remote --command "SELECT name, sql FROM sqlite_master"
npx wrangler pages project list
```

`wrangler.toml` 里的 `database_id` 现在是占位的全 0，**不填真实 ID 不要部署**：
用 `wrangler pages deploy` 时，`wrangler.toml` 里的绑定会覆盖后台的设置。

### 2. 预览（测试库 + 测试桶，不碰正式数据）

```
npx wrangler d1 create enheng-preview                 # 把返回的 ID 填进 wrangler.toml 的 [env.preview]
npx wrangler r2 bucket create enheng-albums-preview
npx wrangler d1 migrations apply enheng-preview --remote
node scripts/cf-seed.mjs sql                          # 生成 .wrangler/seed.sql
npx wrangler d1 execute enheng-preview --remote --file .wrangler/seed.sql
node scripts/cf-seed.mjs r2-remote enheng-albums-preview
npm run build
npx wrangler pages deploy dist --project-name enheng --branch cloudflare-functions
```

预览环境的 `ADMIN_PASSWORD`、`SESSION_SECRET` 要在 Cloudflare 后台 → Pages → enheng → Settings →
Variables and Secrets 里切到 **Preview** 单独设置（wrangler 的 `pages secret put` 只管正式环境），
建议用和正式不同的值。

最后一步会给出一个 `https://<hash>.enheng.pages.dev` 的预览地址，交给测试验收。
非 production 分支的部署用的是 `[env.preview]` 里的测试库和测试桶。

（更稳的做法是复制正式库的数据：`wrangler d1 export enheng --remote --output prod.sql`，
再导入 `enheng-preview`。这一步只读正式库。）

### 3. 正式发布

验收通过、主人同意后：

```
npm run build
npx wrangler pages deploy dist --project-name enheng --branch main
```

正式环境继续用现有的 `enheng` 库和 `enheng-albums` 桶，密钥沿用后台已有的设置。
出问题时在 Cloudflare 后台 → Pages → enheng → Deployments 里把上一版设为当前版本即可回滚。

## 和原来 Express 版本的差别

- `/api/admin/publish`：原来会重新构建并推到 GitHub Pages；Cloudflare 上数据直接读 D1，改了就生效，
  这个接口只返回 `{ ok: true, url }`。前端也只在 localhost 上显示“同步到公开网站”按钮。
- 登录失败次数限制按 Cloudflare 的单个实例计数（和原来单进程内存计数相近），不是全局的。
- 请求体不是合法 JSON 时返回 `400 {"error":"请求格式不对"}`，超过大小返回 `413`。
