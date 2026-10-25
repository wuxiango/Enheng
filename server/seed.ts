import { join } from 'node:path'
import { normalizeFxTweet } from '../src/lib/normalize'
import { createStore } from '../src/lib/store'

const ids = [
  '2114014762862600587',
  '2112907377267871768',
  '2112871161872977984',
  '2112858672431047051',
  '2112491097830416617',
  '2112132487212343400',
  '2112127540295086460',
  '2111746321111785621',
  '2111389865053213076',
  '2111125465285197969',
]

const store = createStore(join(process.cwd(), 'data', 'tweets.json'))

for (const id of ids) {
  const response = await fetch(`https://api.fxtwitter.com/EnHeng456/status/${id}`, {
    headers: { 'user-agent': 'enheng-select' },
  })
  if (!response.ok) {
    console.error(`抓取失败 ${id} ${response.status}`)
    continue
  }
  const tweet = normalizeFxTweet((await response.json()) as { tweet?: unknown })
  try {
    store.add(tweet)
    console.log(`收录 ${id} → ${tweet.categories.join(',')}`)
  } catch (error) {
    console.log(error instanceof Error ? error.message : error)
  }
}
