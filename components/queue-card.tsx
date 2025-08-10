"use client"

import { useState } from "react"
import { MoreVertical, Edit, Trash2, Clock } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import type { Game, User, Config } from "../types/database"

interface QueueCardProps {
  game: Game
  index: number
  config: Config
  currentUser: User | null
  getUserDisplayName: (user: User) => string
  getUserTokenStyle: (user: User) => string
  onEdit?: (game: Game) => void
  onDelete?: (game: Game) => void
  onDelay?: (game: Game) => void
  countdown?: number // 카운트다운 시간
  isCountdownActive?: boolean // 카운트다운 활성 여부
  assignedCourtId?: number // 배정된 코트 ID
}

export default function QueueCard({
  game,
  index,
  config,
  currentUser,
  getUserDisplayName,
  getUserTokenStyle,
  onEdit,
  onDelete,
  onDelay,
  countdown,
  isCountdownActive,
  assignedCourtId,
}: QueueCardProps) {
  const [dropdownOpen, setDropdownOpen] = useState(false)

  const isAdmin = currentUser?.admin_authority || false

  return (
    <Card className={`p-3 transition-all duration-300 ${
      isCountdownActive 
        ? "bg-gradient-to-r from-orange-50 to-yellow-50 border-2 border-orange-400 shadow-lg scale-105" 
        : "bg-white hover:shadow-md"
    }`}>
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <span className="text-xs font-medium text-gray-600">{index + 1}번째 대기</span>
          {assignedCourtId && (
            <div className="flex items-center gap-1 bg-blue-100 px-2 py-1 rounded-full">
              <span className="text-xs font-bold text-blue-700">
                코트 {assignedCourtId} 예정
              </span>
            </div>
          )}
          {isCountdownActive && countdown !== undefined && (
            <div className="flex items-center gap-1 bg-gradient-to-r from-orange-100 to-red-100 px-3 py-1.5 rounded-full border border-orange-300 shadow-sm">
              <div className="w-2 h-2 bg-orange-500 rounded-full animate-pulse"></div>
              <span className="text-sm font-bold text-orange-800">
                {countdown === 0 ? "🎾 시작!" : `${countdown}초`}
              </span>
            </div>
          )}
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs text-gray-400">
            {new Date(game.created_at).toLocaleTimeString("ko-KR", {
              hour: "2-digit",
              minute: "2-digit",
            })}
          </span>
          {isAdmin && (
            <DropdownMenu open={dropdownOpen} onOpenChange={setDropdownOpen}>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="h-6 w-6 p-0">
                  <MoreVertical className="h-3 w-3" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-32">
                <DropdownMenuItem
                  onClick={() => {
                    onEdit?.(game)
                    setDropdownOpen(false)
                  }}
                  className="text-xs"
                >
                  <Edit className="h-3 w-3 mr-2" />
                  수정
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={() => {
                    onDelay?.(game)
                    setDropdownOpen(false)
                  }}
                  className="text-xs"
                >
                  <Clock className="h-3 w-3 mr-2" />
                  미루기
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={() => {
                    onDelete?.(game)
                    setDropdownOpen(false)
                  }}
                  className="text-xs text-red-600 hover:text-red-700"
                >
                  <Trash2 className="h-3 w-3 mr-2" />
                  삭제
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          )}
        </div>
      </div>
      {config.enable_vs ? (
        <div className="flex items-center justify-between">
          <div className="flex flex-wrap gap-1">
            {game.users.slice(0, 2).map((user) => (
              <div key={user.id} className={getUserTokenStyle(user) + " text-xs px-2 py-1"}>
                {getUserDisplayName(user)}
              </div>
            ))}
          </div>
          <div className="text-xs text-gray-500 mx-2">VS</div>
          <div className="flex flex-wrap gap-1">
            {game.users.slice(2, 4).map((user) => (
              <div key={user.id} className={getUserTokenStyle(user) + " text-xs px-2 py-1"}>
                {getUserDisplayName(user)}
              </div>
            ))}
          </div>
        </div>
      ) : (
        <div className="flex flex-wrap gap-1">
          {game.users.map((user) => (
            <div key={user.id} className={getUserTokenStyle(user) + " text-xs px-2 py-1"}>
              {getUserDisplayName(user)}
            </div>
          ))}
        </div>
      )}
    </Card>
  )
}
