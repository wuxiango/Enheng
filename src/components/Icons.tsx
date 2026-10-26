import {
  ArrowLeft,
  BarChart3,
  Camera,
  Heart,
  Images,
  MessageCircle,
  Play,
  Repeat2,
  type LucideProps,
} from 'lucide-react'

const stroke = { strokeWidth: 1.75 } satisfies LucideProps

export function IconReply(props: LucideProps) {
  return <MessageCircle {...stroke} {...props} />
}

export function IconRepost(props: LucideProps) {
  return <Repeat2 {...stroke} {...props} />
}

export function IconLike(props: LucideProps) {
  return <Heart {...stroke} {...props} />
}

export function IconViews(props: LucideProps) {
  return <BarChart3 {...stroke} {...props} />
}

export function IconShot(props: LucideProps) {
  return <Camera {...stroke} {...props} />
}

export function IconLongShot(props: LucideProps) {
  return <Images {...stroke} {...props} />
}

export function IconBack(props: LucideProps) {
  return <ArrowLeft {...stroke} {...props} />
}

export function IconPlay(props: LucideProps) {
  return <Play {...stroke} fill="currentColor" {...props} />
}

export function VerifiedBadge() {
  return (
    <svg className="badge" viewBox="0 0 22 22" aria-label="已认证">
      <path
        fill="#1d9bf0"
        d="M20.4 11c0 .2-.1.5-.2.6l-1.9 2.2c-.1.1-.2.3-.2.5v2.7c0 .4-.3.8-.8.8h-2.7c-.2 0-.4.1-.5.2l-2.2 1.9c-.2.1-.4.2-.6.2s-.5-.1-.6-.2l-2.2-1.9c-.1-.1-.3-.2-.5-.2H4.6c-.4 0-.8-.3-.8-.8v-2.7c0-.2-.1-.4-.2-.5L1.8 11.6a.9.9 0 0 1 0-1.3l1.9-2.2c.1-.1.2-.3.2-.5V4.9c0-.4.3-.8.8-.8h2.7c.2 0 .4-.1.5-.2L10.1 2c.3-.3.9-.3 1.2 0l2.2 1.9c.1.1.3.2.5.2h2.7c.4 0 .8.3.8.8v2.7c0 .2.1.4.2.5l1.9 2.2c.1.1.2.4.2.6Z"
      />
      <path fill="#fff" d="m9.5 14.3-2.6-2.6 1.1-1.1 1.5 1.5 3.6-3.6 1.1 1.1-4.7 4.7Z" />
    </svg>
  )
}
