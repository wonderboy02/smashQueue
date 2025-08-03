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
}: QueueCardProps) {
  const [dropdownOpen, setDropdownOpen] = useState(false)

  const isAdmin = currentUser?.admin_authority || false

  return (
    <Card className="p-3 bg-white">
      <div className="flex items-center justify-between mb-2">
        <span className="text-xs font-medium text-gray-600">{index + 1}번째 대기</span>
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
