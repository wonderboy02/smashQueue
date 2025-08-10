import { useState, useEffect, useCallback, useRef } from 'react'
import { supabase } from '../lib/supabase/client'

interface UseRealtimeProps {
  isAuthenticated: boolean
  onGamesUpdate: (payload?: any) => void
  onUsersUpdate: (payload?: any) => void
  onCourtsUpdate: (payload?: any) => void
  onCourtAssignment?: (courtId: number, gameId: number, players: string[]) => void
}

export const useRealtime = ({ 
  isAuthenticated, 
  onGamesUpdate, 
  onUsersUpdate,
  onCourtsUpdate,
  onCourtAssignment
}: UseRealtimeProps) => {
  const [realtimeConnected, setRealtimeConnected] = useState(false)
  const channelRef = useRef<any>(null)
  const initedRef = useRef(false)
  const callbacksRef = useRef({ onGamesUpdate, onUsersUpdate, onCourtsUpdate, onCourtAssignment })

  // 콜백 참조 업데이트 (리렌더링마다)
  callbacksRef.current = { onGamesUpdate, onUsersUpdate, onCourtsUpdate, onCourtAssignment }

  // 실시간 구독 설정 (StrictMode 이중 실행 방지)
  useEffect(() => {
    // StrictMode 이중 실행 방지
    if (initedRef.current) {
      console.log('⚠️ StrictMode 이중 실행 차단')
      return
    }

    if (!isAuthenticated || !supabase) {
      setRealtimeConnected(false)
      return
    }

    initedRef.current = true
    console.log('🔧 Setting up single realtime channel (StrictMode safe)...')

    let eventReceived = false
    let fallbackInterval: NodeJS.Timeout | null = null

    // 디바운스된 콜백 함수들
    let gamesTimeout: NodeJS.Timeout
    let usersTimeout: NodeJS.Timeout

    const debouncedGamesUpdate = (payload?: any) => {
      clearTimeout(gamesTimeout)
      gamesTimeout = setTimeout(() => callbacksRef.current.onGamesUpdate(payload), 300)
    }

    const debouncedUsersUpdate = (payload?: any) => {
      clearTimeout(usersTimeout)  
      usersTimeout = setTimeout(() => callbacksRef.current.onUsersUpdate(payload), 500)
    }

    // 단일 채널로 여러 테이블 구독 (중복 방지)
    const channel = supabase
      .channel('realtime:app')
      .on('postgres_changes', 
        { event: '*', schema: 'public', table: 'games' }, 
        async (payload) => {
          console.log('🎮 Games change:', payload.eventType, 'Old:', payload.old, 'New:', payload.new)
          eventReceived = true
          setRealtimeConnected(true)
          
          // 모든 UPDATE 이벤트 상세 로깅
          if (payload.eventType === 'UPDATE') {
            console.log('🔍 Game UPDATE detected:')
            console.log('  - Game ID:', payload.new?.id)
            console.log('  - Old status:', payload.old?.status, '→ New status:', payload.new?.status)
            console.log('  - Old court_id:', payload.old?.court_id, '→ New court_id:', payload.new?.court_id)
            
            // 대기열 게임이 코트 배정을 받은 경우 (자동 이동 감지)
            if (payload.new?.status === 'waiting' && 
                !payload.old?.court_id && 
                payload.new?.court_id) {
              console.log('🎯 WAITING GAME GOT COURT ASSIGNMENT - Starting countdown!')
              
              // 카운트다운 콜백 호출
              if (callbacksRef.current.onCourtAssignment) {
                callbacksRef.current.onCourtAssignment(
                  payload.new.court_id,
                  payload.new.id,
                  [] // 사용자 이름은 별도로 처리
                )
              }
            }
          }
          
          // 새로 생성된 게임이 바로 코트 배정된 경우 (다른 사용자의 게임 생성)
          if (payload.eventType === 'INSERT' && 
              payload.new?.status === 'waiting' && 
              payload.new?.court_id) {
            console.log('🎯 NEW GAME WITH COURT ASSIGNMENT - Starting countdown!')
            
            // 카운트다운 콜백 호출
            if (callbacksRef.current.onCourtAssignment) {
              callbacksRef.current.onCourtAssignment(
                payload.new.court_id,
                payload.new.id,
                [] // 사용자 이름은 별도로 처리
              )
            }
          }
          
          // 게임이 playing 상태가 되고 court_id가 할당된 경우 (자동 배정으로 간주)
          // 팝업 알림은 제거하고 대기열 내 카운트다운으로만 처리
          if (payload.eventType === 'UPDATE' && 
              payload.new?.status === 'playing' && 
              payload.new?.court_id && 
              payload.new?.start_time) {
            
            console.log('🎯 AUTO COURT ASSIGNMENT DETECTED (queue countdown only)')
            console.log('  - Court ID:', payload.new.court_id)
            console.log('  - Game ID:', payload.new.id)
            // 대기열 카운트다운 UI로 처리되므로 별도 팝업 알림은 생략
          }
          
          debouncedGamesUpdate(payload)
        }
      )
      .on('postgres_changes',
        { event: '*', schema: 'public', table: 'user_game_relations' },
        (payload) => {
          console.log('🔗 Relations change:', payload.eventType)  
          eventReceived = true
          setRealtimeConnected(true)
          debouncedGamesUpdate(payload)
        }
      )
      .on('postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'users' },
        (payload) => {
          // 중요한 필드 변경시에만 업데이트
          const old = payload.old
          const new_ = payload.new
          
          if (old && new_ && (
            old.user_status !== new_.user_status ||
            old.is_attendance !== new_.is_attendance ||
            old.is_active !== new_.is_active
          )) {
            console.log('👤 User status change:', new_.id)
            eventReceived = true
            setRealtimeConnected(true)
            debouncedUsersUpdate(payload)
          }
        }
      )
      .on('postgres_changes',
        { event: '*', schema: 'public', table: 'courts' },
        (payload) => {
          console.log('🏟️ Courts change:', payload.eventType, payload.new?.id)
          eventReceived = true
          setRealtimeConnected(true)
          
          // 코트 변경사항 즉시 업데이트
          callbacksRef.current.onCourtsUpdate(payload)
        }
      )
      .subscribe((status, err) => {
        console.log(`🔌 Single channel status: ${status}`)
        if (err) {
          console.error('❌ Channel error:', err)
        } else if (status === 'SUBSCRIBED') {
          console.log('✅ Single channel SUBSCRIBED - should stay connected!')
          setRealtimeConnected(true)
        } else if (status === 'CLOSED') {
          console.log('❌ Single channel CLOSED')
          setRealtimeConnected(false)
        }
      })

    channelRef.current = channel

    // 10초 후 이벤트 없으면 폴백 모드
    const fallbackTimeout = setTimeout(() => {
      if (!eventReceived) {
        console.log('⚠️ No events in 10s - starting fallback polling')
        setRealtimeConnected(false)
        
        fallbackInterval = setInterval(() => {
          console.log('🔄 Fallback polling')
          callbacksRef.current.onGamesUpdate(null) // payload 없음을 명시
          callbacksRef.current.onUsersUpdate(null)
        }, 10000)
      }
    }, 10000)

    return () => {
      console.log('🧹 Cleaning up realtime subscription')
      
      clearTimeout(gamesTimeout)
      clearTimeout(usersTimeout)
      clearTimeout(fallbackTimeout)
      
      if (fallbackInterval) {
        clearInterval(fallbackInterval)
      }
      
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current)
        channelRef.current = null
      }
      
      setRealtimeConnected(false)
      initedRef.current = false // 다음 마운트를 위해 리셋
    }
  }, [isAuthenticated]) // 안정적인 의존성

  return {
    realtimeConnected
  }
}