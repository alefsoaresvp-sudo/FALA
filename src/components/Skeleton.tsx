import type { CSSProperties } from 'react'

type SkeletonProps = {
  rows?: number
  compact?: boolean
  className?: string
  style?: CSSProperties
  label?: string
}

export default function Skeleton({ rows = 3, compact = false, className = '', style, label = 'Carregando conteúdo' }: SkeletonProps) {
  return (
    <div className={`fala-skeleton-group ${compact ? 'compact' : ''} ${className}`} style={style} role="status" aria-label={label} aria-busy="true">
      {Array.from({ length: Math.max(1, rows) }, (_, index) => (
        <span className="fala-skeleton-line" key={index} />
      ))}
    </div>
  )
}
