"use client"

import { useState, useEffect } from "react"
import { X } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import type { Game, User, Config } from "../types/database"

interface QueueEditModalProps {
  game: Game | null
  users: User[]
  config: Config
  onClose: () => void
  onSave: (gameId: number, newUserIds: number[]) => void
  getUserDisplayName: (user: User) => string
  getUserTokenStyle: (user: User) => string
}

export default function QueueEditModal({
  game,
  users,
  config,
  onClose,
  onSave,
  getUserDisplayName,
  getUserTokenStyle,
}: QueueEditModalProps) {
  const [selectedUsers, setSelectedUsers] = useState<User[]>([])
  const [team1, setTeam1] = useState<User[]>([])
  const [team2, setTeam2] = useState<User[]>([])

  useEffect(() => {
    if (game) {
      setSelectedUsers(game.users)
      if (config.enable_vs && game.users.length === 4) {
        setTeam1(game.users.slice(0, 2))
        setTeam2(game.users.slice(2, 4))
      }
    }
  }, [game, config.enable_vs])

  if (!game) return null

  // 선택 가능한 사용자들 (ready 상태이고 출석한 사용자들)
  const availableUsers = users.filter((user) => user.is_attendance && user.is_active && user.user_status === "ready")

  // 현재 게임에 참여 중인 사용자들도 선택 가능하게 추가
  const currentGameUsers = game.users.filter((user) => user.is_attendance && user.is_active)

  // 중복 제거하여 최종 선택 가능한 사용자 목록 생성
  const selectableUsers = [
    ...availableUsers,
    ...currentGameUsers.filter((user) => !availableUsers.some((availableUser) => availableUser.id === user.id)),
  ].sort((a, b) => a.name.localeCompare(b.name))

  const toggleUser = (user: User) => {
    if (config.enable_vs) {
      // VS 모드일 때
      if (team1.some((u) => u.id === user.id)) {
        setTeam1((prev) => prev.filter((u) => u.id !== user.id))
      } else if (team2.some((u) => u.id === user.id)) {
        setTeam2((prev) => prev.filter((u) => u.id !== user.id))
      } else if (team1.length < 2) {
        setTeam1((prev) => [...prev, user])
      } else if (team2.length < 2) {
        setTeam2((prev) => [...prev, user])
      }
    } else {
      // 일반 모드일 때
      setSelectedUsers((prev) => {
        const isSelected = prev.some((u) => u.id === user.id)
        if (isSelected) {
          return prev.filter((u) => u.id !== user.id)
        } else if (prev.length < 4) {
          return [...prev, user]
        }
        return prev
      })
    }
  }

  const isUserSelected = (user: User) => {
    if (config.enable_vs) {
      return team1.some((u) => u.id === user.id) || team2.some((u) => u.id === user.id)
    }
    return selectedUsers.some((u) => u.id === user.id)
  }

  const getUserStatusBadge = (user: User) => {
    const statusMap = {
      ready: { text: "대기", color: "bg-green-100 text-green-800" },
      waiting: { text: "대기열", color: "bg-yellow-100 text-yellow-800" },
      gaming: { text: "게임중", color: "bg-red-100 text-red-800" },
    }

    const status = statusMap[user.user_status]
    return <span className={`text-xs px-1 py-0.5 rounded ${status.color}`}>{status.text}</span>
  }

  const handleSave = () => {
    const finalUsers = config.enable_vs ? [...team1, ...team2] : selectedUsers
    if (finalUsers.length === 4) {
      onSave(
        game.id,
        finalUsers.map((u) => u.id),
      )
    }
  }

  const canSave = config.enable_vs ? team1.length === 2 && team2.length === 2 : selectedUsers.length === 4

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg w-full max-w-md max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b">
          <h3 className="text-lg font-semibold">대기열 수정</h3>
          <Button variant="ghost" size="icon" onClick={onClose}>
            <X className="h-4 w-4" />
          </Button>
        </div>

        {/* Selected Players */}
        <div className="p-4 border-b bg-gray-50">
          {config.enable_vs ? (
            <div className="space-y-3">
              <div>
                <h4 className="text-sm font-medium text-gray-600 mb-2">좌측 ({team1.length}/2)</h4>
                <div className="flex flex-wrap gap-2 min-h-[32px]">
                  {team1.map((user) => (
                    <div
                      key={user.id}
                      className={getUserTokenStyle(user) + " cursor-pointer text-xs px-2 py-1"}
                      onClick={() => toggleUser(user)}
                    >
                      {getUserDisplayName(user)}
                    </div>
                  ))}
                  {team1.length === 0 && <p className="text-gray-400 text-sm">좌측 플레이어를 선택해주세요</p>}
                </div>
              </div>
              <div className="text-center text-sm text-gray-500">VS</div>
              <div>
                <h4 className="text-sm font-medium text-gray-600 mb-2">우측 ({team2.length}/2)</h4>
                <div className="flex flex-wrap gap-2 min-h-[32px]">
                  {team2.map((user) => (
                    <div
                      key={user.id}
                      className={getUserTokenStyle(user) + " cursor-pointer text-xs px-2 py-1"}
                      onClick={() => toggleUser(user)}
                    >
                      {getUserDisplayName(user)}
                    </div>
                  ))}
                  {team2.length === 0 && <p className="text-gray-400 text-sm">우측 플레이어를 선택해주세요</p>}
                </div>
              </div>
            </div>
          ) : (
            <div>
              <h4 className="text-sm font-medium text-gray-600 mb-2">선택된 플레이어 ({selectedUsers.length}/4)</h4>
              <div className="flex flex-wrap gap-2 min-h-[32px]">
                {selectedUsers.map((user) => (
                  <div
                    key={user.id}
                    className={getUserTokenStyle(user) + " cursor-pointer text-xs px-2 py-1"}
                    onClick={() => toggleUser(user)}
                  >
                    {getUserDisplayName(user)}
                  </div>
                ))}
                {selectedUsers.length === 0 && <p className="text-gray-400 text-sm">플레이어를 선택해주세요</p>}
              </div>
            </div>
          )}
        </div>

        {/* Player List */}
        <div className="flex-1 p-4 overflow-y-auto max-h-80">
          <h4 className="text-sm font-medium text-gray-900 mb-3">선택 가능한 회원 ({selectableUsers.length}명)</h4>
          <div className="grid grid-cols-1 gap-2">
            {selectableUsers.map((user) => (
              <Card
                key={user.id}
                className={`p-2 cursor-pointer transition-all text-xs ${
                  isUserSelected(user)
                    ? config.show_sex
                      ? user.sex === "M"
                        ? "bg-blue-100 border-blue-300 text-blue-800"
                        : "bg-pink-100 border-pink-300 text-pink-800"
                      : "bg-blue-100 border-blue-300 text-blue-800"
                    : "bg-white hover:bg-gray-50 border-gray-200"
                }`}
                onClick={() => toggleUser(user)}
              >
                <div className="flex items-center justify-between">
                  <span>{getUserDisplayName(user)}</span>
                  {getUserStatusBadge(user)}
                </div>
              </Card>
            ))}
          </div>

          {selectableUsers.length === 0 && (
            <div className="text-center py-4 text-gray-500">
              <p className="text-sm">선택 가능한 회원이 없습니다</p>
              <p className="text-xs mt-1">대기 상태인 출석 회원만 선택할 수 있습니다</p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t bg-gray-50 flex gap-2">
          <Button variant="outline" onClick={onClose} className="flex-1 bg-transparent">
            취소
          </Button>
          <Button onClick={handleSave} disabled={!canSave} className="flex-1">
            저장
          </Button>
        </div>
      </div>
    </div>
  )
}
