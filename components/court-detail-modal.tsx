import React, { memo } from 'react'
import { Square } from 'lucide-react'
import { Button } from '@/components/ui/button'
import type { Court, Game, User, Config } from '../types/database'

interface CourtDetailModalProps {
  court: Court
  game: Game | null
  timers: { [courtId: number]: number }
  config: Config
  currentUser: User
  formatTime: (seconds: number) => string
  getUserDisplayName: (user: User) => string
  getUserTokenStyle: (user: User) => string
  onClose: () => void
  onGameFinish: (gameId: number, courtId: number) => void
}

const CourtDetailModal = memo(({
  court,
  game,
  timers,
  config,
  currentUser,
  formatTime,
  getUserDisplayName,
  getUserTokenStyle,
  onClose,
  onGameFinish
}: CourtDetailModalProps) => {
  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg p-6 w-full max-w-sm">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold">코트 {court.id}</h3>
          <Button variant="ghost" size="icon" onClick={onClose}>
            ✕
          </Button>
        </div>

        {game ? (
          <div className="space-y-3">
            <div className="text-center">
              <div className="text-2xl font-bold text-green-600 mb-2">
                {timers[court.id] !== undefined && formatTime(timers[court.id])}
              </div>
              <div className="text-sm text-gray-600">게임 진행 중</div>
            </div>

            <div>
              <h4 className="font-medium mb-2">플레이어</h4>
              {config?.enable_vs ? (
                <div className="space-y-2">
                  <div>
                    <div className="text-xs text-gray-600 mb-1">좌측</div>
                    <div className="flex flex-wrap gap-1">
                      {game.users.slice(0, 2).map((user) => (
                        <div key={user.id} className={getUserTokenStyle(user) + " text-xs px-2 py-0.5"}>
                          {getUserDisplayName(user)}
                        </div>
                      ))}
                    </div>
                  </div>
                  <div className="text-center text-xs text-gray-500">VS</div>
                  <div>
                    <div className="text-xs text-gray-600 mb-1">우측</div>
                    <div className="flex flex-wrap gap-1">
                      {game.users.slice(2, 4).map((user) => (
                        <div key={user.id} className={getUserTokenStyle(user) + " text-xs px-2 py-0.5"}>
                          {getUserDisplayName(user)}
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              ) : (
                <div className="flex flex-wrap gap-1">
                  {game.users.map((user) => (
                    <div key={user.id} className={getUserTokenStyle(user) + " text-xs px-2 py-0.5"}>
                      {getUserDisplayName(user)}
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="space-y-2">
              <div className="text-xs text-gray-600">
                시작 시간: {new Date(game.start_time!).toLocaleTimeString("ko-KR")}
              </div>
            </div>

            <Button
              className="w-full bg-red-600 hover:bg-red-700 text-white"
              onClick={() => {
                onGameFinish(game.id, court.id)
                onClose()
              }}
            >
              <Square className="h-4 w-4 mr-2" />
              게임 종료
            </Button>
          </div>
        ) : (
          <div className="text-center py-8">
            <div className="text-gray-400 mb-4">
              <div className="w-12 h-12 bg-gray-100 rounded-lg mx-auto mb-2 flex items-center justify-center">
                <span className="text-2xl">🏸</span>
              </div>
            </div>
            <p className="text-gray-600 mb-4">비어있는 코트입니다</p>
            <div className="text-xs text-gray-500">
              대기열에 게임이 있으면 자동으로 시작됩니다
            </div>
          </div>
        )}
      </div>
    </div>
  )
})

CourtDetailModal.displayName = 'CourtDetailModal'

export default CourtDetailModal