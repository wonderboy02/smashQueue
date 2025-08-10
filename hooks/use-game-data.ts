import { useState, useEffect, useCallback, useMemo, useRef } from 'react'
import type { Game, User, Court, Config } from '../types/database'
import {
  getUsers,
  getCourts,
  getConfig,
  getGamesByStatus,
  createGame,
  updateGameStatus,
  delayGame,
  updateMultipleUserStatus,
  autoStartWaitingGames
} from '../lib/supabase/queries'
import { usePerformance } from './use-performance'

export const useGameData = () => {
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [users, setUsers] = useState<User[]>([])
  const [courts, setCourts] = useState<Court[]>([])
  const [config, setConfig] = useState<Config | null>(null)
  const [playingGames, setPlayingGames] = useState<Game[]>([])
  const [waitingGames, setWaitingGames] = useState<Game[]>([])

  // Optimistic update 추적을 위한 ref
  const optimisticUpdatesRef = useRef<Set<number>>(new Set())
  
  // Performance monitoring
  const perf = usePerformance(process.env.NODE_ENV === 'development')

  // 초기 데이터 로드
  const loadInitialData = useCallback(async () => {
    try {
      perf.startTimer('loadInitialData')
      setLoading(true)
      setError(null)

      perf.startTimer('loadBasicData')
      const [usersData, courtsData, configData] = await Promise.all([
        getUsers(),
        getCourts(),
        getConfig()
      ])
      perf.endTimer('loadBasicData')

      setUsers(usersData)
      setCourts(courtsData)
      setConfig(configData)
      
      // 게임 데이터는 별도로 로드
      await loadGames()
    } catch (err) {
      console.error('Initial data load error:', err)
      const errorMessage = err instanceof Error ? err.message : '데이터 로드 중 오류가 발생했습니다.'
      setError(errorMessage)
    } finally {
      setLoading(false)
      perf.endTimer('loadInitialData')
    }
  }, [perf])

  // 게임 데이터 로드
  const loadGames = useCallback(async () => {
    try {
      perf.startTimer('loadGames')
      const [playingData, waitingData] = await Promise.all([
        getGamesByStatus('playing'),
        getGamesByStatus('waiting')
      ])

      setPlayingGames(playingData)
      setWaitingGames(waitingData)
      perf.endTimer('loadGames')
    } catch (err) {
      console.error('Games load error:', err)
      perf.endTimer('loadGames')
    }
  }, [perf])

  // 실시간 업데이트용 (자신의 optimistic update는 무시)
  const loadGamesFromRealtime = useCallback(async () => {
    try {
      const [playingData, waitingData] = await Promise.all([
        getGamesByStatus('playing'),
        getGamesByStatus('waiting')
      ])

      // optimistic update가 진행 중인 게임들은 제외하고 업데이트
      setPlayingGames(prev => {
        const optimisticGames = prev.filter(game => optimisticUpdatesRef.current.has(game.id))
        const newGames = playingData.filter(game => !optimisticUpdatesRef.current.has(game.id))
        return [...optimisticGames, ...newGames]
      })

      setWaitingGames(prev => {
        const optimisticGames = prev.filter(game => optimisticUpdatesRef.current.has(game.id))
        const newGames = waitingData.filter(game => !optimisticUpdatesRef.current.has(game.id))
        return [...optimisticGames, ...newGames]
      })
    } catch (err) {
      console.error('Realtime games load error:', err)
    }
  }, [])

  // 사용자 데이터만 새로고침
  const refreshUsers = useCallback(async () => {
    try {
      const usersData = await getUsers()
      setUsers(usersData)
    } catch (err) {
      console.error('Users refresh error:', err)
    }
  }, [])

  // 코트 데이터만 새로고침
  const refreshCourts = useCallback(async () => {
    try {
      const courtsData = await getCourts()
      setCourts(courtsData)
    } catch (err) {
      console.error('Courts refresh error:', err)
    }
  }, [])

  // 게임 생성 (Optimistic Update)
  const addToQueue = useCallback(async (selectedUsers: User[]) => {
    try {
      // 1. 먼저 optimistic update로 즉시 UI 반영
      const tempGame = {
        id: Date.now(), // 임시 ID
        status: 'waiting' as const,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        start_time: null,
        end_time: null,
        court_id: null,
        users: selectedUsers
      }
      
      // 즉시 UI 업데이트
      setWaitingGames(prev => [tempGame, ...prev])
      
      // 2. 실제 DB 작업
      const result = await createGame({
        status: 'waiting',
        userIds: selectedUsers.map(user => user.id)
      })

      // 3. optimistic update 추적 및 실제 결과로 교체
      optimisticUpdatesRef.current.add(result.id)
      setWaitingGames(prev => 
        prev.map(game => 
          game.id === tempGame.id 
            ? { ...result, users: selectedUsers } 
            : game
        )
      )
      
      // 짧은 시간 후 optimistic update 플래그 제거
      setTimeout(() => {
        optimisticUpdatesRef.current.delete(result.id)
      }, 1000)
      
      return result
    } catch (err) {
      console.error('Game creation error:', err)
      // 실패 시 optimistic update 롤백
      setWaitingGames(prev => prev.filter(game => game.id !== Date.now()))
      throw err
    }
  }, [])

  // 게임 상태 업데이트 (Optimistic Update)
  const updateGame = useCallback(async (
    gameId: number, 
    status: 'playing' | 'finished', 
    courtId?: number
  ) => {
    try {
      // 1. 현재 게임 찾기
      const currentGame = [...playingGames, ...waitingGames].find(g => g.id === gameId)
      if (!currentGame) return
      
      // 2. Optimistic update로 즉시 UI 반영
      const updatedGame = {
        ...currentGame,
        status,
        court_id: courtId || currentGame.court_id,
        start_time: status === 'playing' ? new Date().toISOString() : currentGame.start_time,
        end_time: status === 'finished' ? new Date().toISOString() : currentGame.end_time,
      }
      
      // optimistic update 추적 시작
      optimisticUpdatesRef.current.add(gameId)
      
      // 상태에 따라 즉시 UI 업데이트
      if (status === 'playing') {
        setPlayingGames(prev => [updatedGame, ...prev.filter(g => g.id !== gameId)])
        setWaitingGames(prev => prev.filter(g => g.id !== gameId))
      } else if (status === 'finished') {
        setPlayingGames(prev => prev.filter(g => g.id !== gameId))
        setWaitingGames(prev => prev.filter(g => g.id !== gameId))
      }
      
      // 3. 실제 DB 작업
      await updateGameStatus(gameId, status, courtId)
      
      // optimistic update 플래그 제거
      setTimeout(() => {
        optimisticUpdatesRef.current.delete(gameId)
      }, 1000)
      
    } catch (err) {
      console.error('Game update error:', err)
      // 실패 시 데이터 다시 로드로 롤백
      await loadGames()
      throw err
    }
  }, [playingGames, waitingGames, loadGames])

  // 게임 미루기 (Optimistic Update)
  const handleDelayGame = useCallback(async (gameId: number) => {
    try {
      // 1. 현재 게임 찾기
      const currentGame = waitingGames.find(g => g.id === gameId)
      if (!currentGame) return
      
      // 2. Optimistic update - 대기열 맨 뒤로 이동
      const updatedGame = {
        ...currentGame,
        created_at: new Date().toISOString(), // 새로운 시간으로 업데이트
        updated_at: new Date().toISOString()
      }
      
      // optimistic update 추적 시작
      optimisticUpdatesRef.current.add(gameId)
      
      // 즉시 UI 업데이트 - 맨 뒤로 이동
      setWaitingGames(prev => [
        ...prev.filter(g => g.id !== gameId),
        updatedGame
      ])
      
      // 3. 실제 DB 작업
      await delayGame(gameId)
      
      // optimistic update 플래그 제거
      setTimeout(() => {
        optimisticUpdatesRef.current.delete(gameId)
      }, 1000)
      
    } catch (err) {
      console.error('Game delay error:', err)
      // 실패 시 데이터 다시 로드로 롤백
      await loadGames()
      throw err
    }
  }, [waitingGames, loadGames])

  // 자동 게임 시작
  const triggerAutoStart = useCallback(async () => {
    try {
      await autoStartWaitingGames()
      await loadGames()
    } catch (err) {
      console.error('Auto start error:', err)
    }
  }, [loadGames])

  // Memoized derived state
  const gameStats = useMemo(() => ({
    totalPlaying: playingGames.length,
    totalWaiting: waitingGames.length,
    totalGames: playingGames.length + waitingGames.length,
    activeCourts: courts.filter(court => court.is_active).length,
    occupiedCourts: playingGames.filter(game => game.court_id).length
  }), [playingGames, waitingGames, courts])

  const activeUsers = useMemo(() => 
    users.filter(user => user.is_active && user.is_attendance)
  , [users])

  return {
    // State
    loading,
    error,
    users,
    courts,
    config,
    playingGames,
    waitingGames,
    
    // Derived state
    gameStats,
    activeUsers,
    
    // Actions
    loadInitialData,
    loadGames,
    loadGamesFromRealtime, // 실시간 전용
    refreshUsers,
    refreshCourts,
    addToQueue,
    updateGame,
    handleDelayGame,
    triggerAutoStart,
    
    // Setters (for external updates)
    setUsers,
    setCourts,
    setConfig,
    setPlayingGames,
    setWaitingGames
  }
}