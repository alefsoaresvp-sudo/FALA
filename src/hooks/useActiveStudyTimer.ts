import { useCallback, useEffect, useRef, useState } from 'react'

const DEFAULT_IDLE_MS = 60_000

/**
 * Counts only visible, recently-active time. Visibility changes pause the clock;
 * pointer/keyboard/touch input renews the active window. finish() returns and
 * resets the accumulated whole seconds for a completed activity.
 */
export function useActiveStudyTimer(enabled: boolean, idleAfterMs = DEFAULT_IDLE_MS) {
  const accumulatedMs = useRef(0)
  const lastTickAt = useRef(0)
  const lastActivityAt = useRef(0)
  const [elapsedSeconds, setElapsedSeconds] = useState(0)

  const finish = useCallback(() => {
    const now = Date.now()
    if (enabled && !document.hidden && now - lastActivityAt.current <= idleAfterMs && lastTickAt.current > 0) {
      accumulatedMs.current += Math.max(0, now - lastTickAt.current)
    }
    const seconds = Math.floor(accumulatedMs.current / 1000)
    accumulatedMs.current = 0
    lastTickAt.current = enabled && !document.hidden ? now : 0
    lastActivityAt.current = now
    setElapsedSeconds(0)
    return seconds
  }, [enabled, idleAfterMs])

  const reset = useCallback(() => {
    accumulatedMs.current = 0
    lastTickAt.current = enabled && !document.hidden ? Date.now() : 0
    lastActivityAt.current = Date.now()
    setElapsedSeconds(0)
  }, [enabled])

  useEffect(() => {
    if (!enabled) {
      lastTickAt.current = 0
      return
    }

    const now = Date.now()
    lastTickAt.current = now
    lastActivityAt.current = now

    const markActivity = () => {
      lastActivityAt.current = Date.now()
      if (!document.hidden) lastTickAt.current = lastActivityAt.current
    }
    const handleVisibility = () => {
      lastTickAt.current = Date.now()
      if (!document.hidden) lastActivityAt.current = lastTickAt.current
    }
    const interval = window.setInterval(() => {
      const tick = Date.now()
      const previous = lastTickAt.current || tick
      const active = !document.hidden && tick - lastActivityAt.current <= idleAfterMs
      if (active) accumulatedMs.current += Math.min(tick - previous, 1_500)
      lastTickAt.current = tick
      setElapsedSeconds(Math.floor(accumulatedMs.current / 1000))
    }, 1_000)

    const activityEvents: Array<keyof WindowEventMap> = ['pointerdown', 'keydown', 'touchstart', 'click']
    activityEvents.forEach(event => window.addEventListener(event, markActivity, { passive: true }))
    document.addEventListener('visibilitychange', handleVisibility)

    return () => {
      window.clearInterval(interval)
      activityEvents.forEach(event => window.removeEventListener(event, markActivity))
      document.removeEventListener('visibilitychange', handleVisibility)
      lastTickAt.current = 0
    }
  }, [enabled, idleAfterMs])

  return { elapsedSeconds, finish, reset }
}
