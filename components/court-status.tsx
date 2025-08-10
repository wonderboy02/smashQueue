import React, { memo, useCallback } from 'react'
import type { Court, Game } from '../types/database'

interface CourtStatusProps {
  courts: Court[]
  playingGames: Game[]
  countdownGames: Array<{ gameId: number; courtId: number }>
  courtCountdowns: { [courtId: number]: number }
  waitingGames: Game[]
  formatTime: (seconds: number) => string
  timers: { [courtId: number]: number }
  onCourtClick: (court: Court, game: Game | null) => void
  onStartTestCountdown: (courtId: number) => void
  warningTimeMinutes?: number
  dangerTimeMinutes?: number
}

const CourtStatus = memo(({ 
  courts, 
  playingGames, 
  countdownGames, 
  courtCountdowns, 
  waitingGames,
  formatTime, 
  timers, 
  onCourtClick,
  onStartTestCountdown,
  warningTimeMinutes = 20,
  dangerTimeMinutes = 30
}: CourtStatusProps) => {
  
  // 게임 시간에 따른 코트 색상 결정
  const getCourtColorClass = useCallback((game: Game | undefined, countdownGame: any, timerSeconds: number) => {
    if (countdownGame) {
      return "bg-gradient-to-br from-orange-200 to-red-200 border-2 border-orange-400 text-orange-900 hover:from-orange-300 hover:to-red-300 shadow-lg"
    }
    
    if (!game || timerSeconds === undefined) {
      return "bg-gray-100 border-2 border-gray-300 text-gray-500 hover:bg-gray-200"
    }
    
    const minutes = Math.floor(timerSeconds / 60)
    
    if (minutes >= dangerTimeMinutes) {
      // 위험 시간 (빨간색)
      return "bg-red-100 border-2 border-red-300 text-red-800 hover:bg-red-200"
    } else if (minutes >= warningTimeMinutes) {
      // 주의 시간 (주황색)
      return "bg-orange-100 border-2 border-orange-300 text-orange-800 hover:bg-orange-200"
    } else {
      // 정상 시간 (초록색)
      return "bg-green-100 border-2 border-green-300 text-green-800 hover:bg-green-200"
    }
  }, [warningTimeMinutes, dangerTimeMinutes])

  const handleCourtClick = useCallback((court: Court) => {
    const game = playingGames.find(g => g.court_id === court.id)
    const countdownGame = countdownGames.find(cg => cg.courtId === court.id)
    const waitingGameOnCourt = waitingGames.find(wg => wg.court_id === court.id && countdownGame)
    
    if (!game && !countdownGame) {
      onStartTestCountdown(court.id)
    } else {
      onCourtClick(court, game || waitingGameOnCourt || null)
    }
  }, [playingGames, countdownGames, waitingGames, onStartTestCountdown, onCourtClick])

  return (
    <div className="bg-white px-4 py-4 border-b">
      <div className="flex gap-3 justify-center">
        {courts
          .filter(court => court.is_active)
          .map(court => {
            const game = playingGames.find(g => g.court_id === court.id)
            const countdownGame = countdownGames.find(cg => cg.courtId === court.id)
            const countdown = courtCountdowns[court.id]
            
            return (
              <div key={court.id} className="flex flex-col items-center">
                <div
                  className={`w-16 h-16 rounded-lg flex flex-col items-center justify-center text-xs font-medium cursor-pointer transition-all hover:scale-105 relative ${
                    getCourtColorClass(game, countdownGame, timers[court.id])
                  }`}
                  onClick={() => handleCourtClick(court)}
                >
                  <div className="text-xs mb-1">코트 {court.id}</div>
                  {countdown !== undefined ? (
                    <div className="text-2xl font-bold text-red-600">
                      {countdown === 0 ? '시작!' : countdown}
                    </div>
                  ) : game && timers[court.id] !== undefined ? (
                    <div className="text-xs font-bold">{formatTime(timers[court.id])}</div>
                  ) : countdownGame ? (
                    <div className="text-xs text-orange-600 font-bold">준비중...</div>
                  ) : (
                    <div className="text-xs text-gray-400">대기중</div>
                  )}
                </div>
              </div>
            )
          })
        }
      </div>
    </div>
  )
})

CourtStatus.displayName = 'CourtStatus'

export default CourtStatus