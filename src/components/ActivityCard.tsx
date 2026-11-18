import type { ReactNode } from 'react'
import { ArrowRight } from 'lucide-react'

export type ActivityCardProps = {
  title: string
  benefit: string
  progress: string
  cta: string
  onClick: () => void
  icon?: ReactNode
  tone?: 'primary' | 'success' | 'neutral'
  disabled?: boolean
}

export default function ActivityCard({
  title, benefit, progress, cta, onClick, icon, tone = 'primary', disabled = false,
}: ActivityCardProps) {
  return (
    <button
      type="button"
      className={`activity-card activity-card-${tone}`}
      onClick={onClick}
      disabled={disabled}
    >
      <span className="activity-card-title">{icon}{title}</span>
      <span className="activity-card-benefit">{benefit}</span>
      <span className="activity-card-progress">{progress}</span>
      <span className="activity-card-cta">{cta}<ArrowRight size={16} aria-hidden="true"/></span>
    </button>
  )
}
