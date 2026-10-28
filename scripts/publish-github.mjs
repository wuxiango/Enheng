import { execSync } from 'node:child_process'
import { readdirSync, readFileSync, statSync, writeFileSync } from 'node:fs'
import { dirname, join, relative } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const repo = 'wuxiango/Enheng'
const token = execSync('"C:\\Program Files\\GitHub CLI\\gh.exe" auth token', { encoding: 'utf8' }).trim()
const message = process.env.PUBLISH_MESSAGE || 'Publish the current local site.'
const author = {
  name: 'wuxiango',
  email: '347817070+wuxiango@users.noreply.github.com',
  date: new Date().toISOString(),
}

function skipSource(rel) {
  if (rel === '.env' || rel.endsWith('.log')) return true
  if (rel.startsWith('.github/')) return true
  return false
}

function walk(dir, base, predicate) {
  const files = []
  for (const name of readdirSync(dir)) {
    if (name === '.git' || name === 'node_modules') continue
    const full = join(dir, name)
    const rel = relative(base, full).split('\\').join('/')
    const stat = statSync(full)
    if (stat.isDirectory()) {
      if (rel === 'dist' && base === root) continue
      files.push(...walk(full, base, predicate))
    } else if (!predicate(rel)) {
      files.push({ path: rel, abs: full })
    }
  }
  return files
}

async function gh(method, path, body) {
  const response = await fetch(`https://api.github.com${path}`, {
    method,
    headers: {
      authorization: `Bearer ${token}`,
      accept: 'application/vnd.github+json',
      'x-github-api-version': '2022-11-28',
      'content-type': 'application/json',
      'user-agent': 'enheng-select',
    },
    body: body ? JSON.stringify(body) : undefined,
  })
  const text = await response.text()
  if (!response.ok) throw new Error(`${method} ${path} ${response.status} ${text.slice(0, 400)}`)
  return text ? JSON.parse(text) : null
}

async function blobs(files) {
  const tree = []
  for (let index = 0; index < files.length; index += 6) {
    const batch = files.slice(index, index + 6)
    const made = await Promise.all(
      batch.map(async (file) => {
        const blob = await gh('POST', `/repos/${repo}/git/blobs`, {
          content: readFileSync(file.abs).toString('base64'),
          encoding: 'base64',
        })
        return { path: file.path, mode: '100644', type: 'blob', sha: blob.sha }
      }),
    )
    tree.push(...made)
    console.log(`blobs ${tree.length}/${files.length}`)
  }
  return tree
}

async function publish(branch, parent, files) {
  const treeItems = await blobs(files)
  const tree = await gh('POST', `/repos/${repo}/git/trees`, { tree: treeItems })
  const commit = await gh('POST', `/repos/${repo}/git/commits`, {
    message,
    tree: tree.sha,
    parents: [parent],
    author,
    committer: author,
  })
  await gh('PATCH', `/repos/${repo}/git/refs/heads/${branch}`, { sha: commit.sha })
  console.log(`${branch} ${parent.slice(0, 7)} -> ${commit.sha}`)
}

const source = walk(root, root, skipSource)
const dist = walk(join(root, 'dist'), join(root, 'dist'), () => false)
const nojekyll = join(root, 'dist', '.nojekyll')
writeFileSync(nojekyll, '')
dist.push({ path: '.nojekyll', abs: nojekyll })

const pagesRef = await gh('GET', `/repos/${repo}/git/ref/heads/gh-pages`)
const mainRef = await gh('GET', `/repos/${repo}/git/ref/heads/main`)
console.log(`source ${source.length} dist ${dist.length}`)
console.log(`parents ${pagesRef.object.sha} ${mainRef.object.sha}`)
await publish('gh-pages', pagesRef.object.sha, dist)
await publish('main', mainRef.object.sha, source)
