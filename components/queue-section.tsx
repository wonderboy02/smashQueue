import React, { memo } from 'react'
import { Users } from 'lucide-react'
import { Button } from '@/components/ui/button'
import QueueCard from './queue-card'
import type { Game, User, Config } from '../types/database'

interface QueueSectionProps {
  waitingGames: Game[]
  countdownGames: Array<{ gameId: number; courtId: number }>
  courtCountdowns: { [courtId: number]: number }
  config: Config
  currentUser: User
  getUserDisplayName: (user: User) => string
  getUserTokenStyle: (user: User) => string
  onEdit: (game: Game) => void
  onDelete: (game: Game) => void
  onDelay: (game: Game) => void
}

const QueueSection = memo(({
  waitingGames,
  countdownGames,
  courtCountdowns,
  config,
  currentUser,
  getUserDisplayName,
  getUserTokenStyle,
  onEdit,
  onDelete,
  onDelay
}: QueueSectionProps) => {
  return (
    <div className="flex-1 px-4 py-4 overflow-hidden">
      <div className="mb-4">
        <h2 className="text-lg font-semibold text-gray-900 mb-3">
          대기열 {waitingGames.length > 0 && `(${waitingGames.length}개)`}
        </h2>
        
        <div className="space-y-2">
          {waitingGames.slice(0, 3).map((game, index) => {
            const countdownGame = countdownGames.find(cg => cg.gameId === game.id)
            const gameCountdown = countdownGame ? courtCountdowns[countdownGame.courtId] : undefined
            
            return (
              <QueueCard
                key={game.id}
                game={game}
                index={index}
                config={config}
                currentUser={currentUser}
                getUserDisplayName={getUserDisplayName}
                getUserTokenStyle={getUserTokenStyle}
                onEdit={onEdit}
                onDelete={onDelete}
                onDelay={onDelay}
                countdown={gameCountdown}
                isCountdownActive={!!countdownGame}
                assignedCourtId={countdownGame?.courtId}
              />
            )
          })}
        </div>

        {waitingGames.length > 3 && (
          <Button variant="outline" className="w-full mt-3 bg-transparent" size="sm">
            <Users className="h-4 w-4 mr-2" />
            대기열 모두보기 ({waitingGames.length}개)
          </Button>
        )}

        {waitingGames.length === 0 && (
          <div className="text-center py-6 text-gray-500">
            <Users className="h-10 w-10 mx-auto mb-2 opacity-30" />
            <p>대기 중인 게임이 없습니다</p>
            <p className="text-xs mt-1">빈 코트가 있으면 바로 게임이 시작됩니다!</p>
          </div>
        )}
      </div>
    </div>
  )
})

QueueSection.displayName = 'QueueSection'

export default QueueSection