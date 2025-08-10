import { useState, useEffect, useCallback } from 'react'
import type { Game } from '../types/database'
import { updateGameStatus } from '../lib/supabase/queries'

interface CountdownGame {
  gameId: number
  courtId: number
}

export const useTimers = (playingGames: Game[]) => {
  const [timers, setTimers] = useState<{ [courtId: number]: number }>({})
  const [countdownGames, setCountdownGames] = useState<CountdownGame[]>([])
  const [courtCountdowns, setCourtCountdowns] = useState<{ [courtId: number]: number }>({})

  // 게임 타이머 업데이트
  useEffect(() => {
    if (playingGames.length === 0) return

    const interval = setInterval(() => {
      const newTimers: { [courtId: number]: number } = {}
      
      playingGames.forEach((game) => {
        if (game.start_time && game.court_id) {
          const elapsed = Math.floor((Date.now() - new Date(game.start_time).getTime()) / 1000)
          newTimers[game.court_id] = elapsed
        }
      })
      
      setTimers(newTimers)
    }, 1000)

    return () => clearInterval(interval)
  }, [playingGames])

  // 카운트다운 관리
  useEffect(() => {
    if (countdownGames.length === 0) return

    const intervals: { [gameId: number]: NodeJS.Timeout } = {}

    countdownGames.forEach((countdownGame) => {
      let countdown = 5
      
      setCourtCountdowns(prev => ({
        ...prev,
        [countdownGame.courtId]: countdown
      }))
      
      const interval = setInterval(async () => {
        countdown -= 1
        
        setCourtCountdowns(prev => ({
          ...prev,
          [countdownGame.courtId]: countdown
        }))
        
        // 진동 피드백 (모바일)
        if (countdown > 0 && countdown <= 3 && navigator.vibrate) {
          navigator.vibrate(countdown === 1 ? 200 : 100)
        }
        
        if (countdown <= 0) {
          clearInterval(interval)
          
          // 시작 진동
          if (navigator.vibrate) {
            navigator.vibrate(300)
          }
          
          // 카운트다운 상태 정리
          setCourtCountdowns(prev => {
            const newCountdowns = { ...prev }
            delete newCountdowns[countdownGame.courtId]
            return newCountdowns
          })
          
          setCountdownGames(prev => 
            prev.filter(cg => cg.gameId !== countdownGame.gameId)
          )
          
          // 게임 시작
          try {
            await updateGameStatus(countdownGame.gameId, 'playing', countdownGame.courtId)
          } catch (error) {
            console.error('Failed to start game after countdown:', error)
          }
        }
      }, 1000)
      
      intervals[countdownGame.gameId] = interval
    })

    return () => {
      Object.values(intervals).forEach(clearInterval)
    }
  }, [countdownGames])

  // 카운트다운 시작
  const startCountdown = useCallback((gameId: number, courtId: number) => {
    // 카운트다운 시작 전 해당 코트의 이전 타이머 즉시 초기화
    console.log(`🔄 Starting countdown for court ${courtId}, clearing previous timer`)
    setTimers(prev => {
      const newTimers = { ...prev }
      delete newTimers[courtId] // 해당 코트 타이머 즉시 제거
      return newTimers
    })
    
    const newCountdown = { gameId, courtId }
    setCountdownGames(prev => [...prev, newCountdown])
  }, [])

  // 테스트 카운트다운 시작
  const startTestCountdown = useCallback((courtId: number) => {
    const testGameId = Date.now() // 유니크한 임시 ID
    startCountdown(testGameId, courtId)
  }, [startCountdown])

  // 특정 코트 타이머 즉시 초기화
  const clearCourtTimer = useCallback((courtId: number) => {
    console.log(`🧹 Immediately clearing timer for court ${courtId}`)
    setTimers(prev => {
      const newTimers = { ...prev }
      delete newTimers[courtId]
      return newTimers
    })
  }, [])

  // 시간 포맷팅
  const formatTime = useCallback((seconds: number) => {
    const minutes = Math.floor(seconds / 60)
    const remainingSeconds = seconds % 60
    return `${minutes.toString().padStart(2, '0')}:${remainingSeconds.toString().padStart(2, '0')}`
  }, [])

  return {
    timers,
    countdownGames,
    courtCountdowns,
    startCountdown,
    startTestCountdown,
    clearCourtTimer, // 새로 추가
    formatTime
  }
}