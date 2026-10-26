import {
  Bookmark,
  Bot,
  Clock3,
  Coffee,
  Hash,
  LayoutGrid,
  MessageSquare,
  TrendingUp,
  UserRound,
  type LucideIcon,
} from 'lucide-react'

export const TOPIC_ICONS: Record<string, { icon: LucideIcon; tint: string }> = {
  home: { icon: LayoutGrid, tint: '#1d9bf0' },
  latest: { icon: Clock3, tint: '#1d9bf0' },
  picks: { icon: Bookmark, tint: '#a16207' },
  market: { icon: TrendingUp, tint: '#00ba7c' },
  views: { icon: MessageSquare, tint: '#8a5a2a' },
  people: { icon: UserRound, tint: '#f91880' },
  ai: { icon: Bot, tint: '#7856ff' },
  life: { icon: Coffee, tint: '#8e5b3a' },
  other: { icon: Hash, tint: '#536471' },
}

export function TopicGlyph({ id, size = 22 }: { id: string; size?: number }) {
  const item = TOPIC_ICONS[id] ?? TOPIC_ICONS.other
  const Glyph = item.icon
  return <Glyph size={size} strokeWidth={2} />
}
