import { useEffect, useRef } from 'react'

export const useRealtime = (callback: () => void, intervalMs = 15000): void => {
  const callbackRef = useRef(callback)

  useEffect(() => {
    callbackRef.current = callback
  }, [callback])

  useEffect(() => {
    const timer = window.setInterval(() => {
      callbackRef.current()
    }, intervalMs)

    return () => {
      window.clearInterval(timer)
    }
  }, [intervalMs])
}
