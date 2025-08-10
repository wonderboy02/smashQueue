import { useEffect, useRef, useCallback } from 'react'

interface PerformanceMetric {
  name: string
  duration: number
  timestamp: number
}

export const usePerformance = (enabled = false) => {
  const metricsRef = useRef<PerformanceMetric[]>([])
  const timersRef = useRef<{ [key: string]: number }>({})

  const startTimer = useCallback((name: string) => {
    if (!enabled) return
    timersRef.current[name] = performance.now()
  }, [enabled])

  const endTimer = useCallback((name: string) => {
    if (!enabled || !timersRef.current[name]) return
    
    const duration = performance.now() - timersRef.current[name]
    const metric: PerformanceMetric = {
      name,
      duration,
      timestamp: Date.now()
    }
    
    metricsRef.current.push(metric)
    delete timersRef.current[name]
    
    // Keep only last 100 metrics
    if (metricsRef.current.length > 100) {
      metricsRef.current = metricsRef.current.slice(-100)
    }
    
    console.log(`⚡ ${name}: ${Math.round(duration)}ms`)
  }, [enabled])

  const getMetrics = useCallback(() => {
    return metricsRef.current.slice()
  }, [])

  const getAverageTime = useCallback((name: string, lastN = 10) => {
    const relevantMetrics = metricsRef.current
      .filter(m => m.name === name)
      .slice(-lastN)
    
    if (relevantMetrics.length === 0) return 0
    
    const total = relevantMetrics.reduce((sum, m) => sum + m.duration, 0)
    return total / relevantMetrics.length
  }, [])

  // Log performance metrics periodically
  useEffect(() => {
    if (!enabled) return

    const interval = setInterval(() => {
      const metrics = metricsRef.current.slice(-20) // Last 20 metrics
      if (metrics.length > 0) {
        console.log('📊 Recent performance metrics:', 
          metrics.map(m => `${m.name}: ${Math.round(m.duration)}ms`).join(', ')
        )
      }
    }, 30000) // Every 30 seconds

    return () => clearInterval(interval)
  }, [enabled])

  return {
    startTimer,
    endTimer,
    getMetrics,
    getAverageTime
  }
}