"use client"

import { useState } from "react"
import { ArrowLeft, Shuffle } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import type { User, Game, Config } from "../../types/database"

interface GameMakingProps {
  onBack: () => void
  onAddToQueue: (users: User[], team1?: User[], team2?: User[]) => void
  users: User[]
  config: Config
  playingGames: Game[]
  waitingGames: Game[]
  getUserDisplayName: (user: User) => string
  getUserTokenStyle: (user: User) => string
}

const skillMapping = {
  A: "고수",
  B: "중수",
  C: "초보",
}

export default function GameMaking({
  onBack,
  onAddToQueue,
  users,
  config,
  playingGames,
  waitingGames,
  getUserDisplayName: getUserDisplayNameProp,
  getUserTokenStyle,
}: GameMakingProps) {
  const [selectedUsers, setSelectedUsers] = useState<User[]>([])
  const [team1, setTeam1] = useState<User[]>([])
  const [team2, setTeam2] = useState<User[]>([])

  // config가 없을 때 기본값 사용 (빌드 시 안전성 확보)
  const safeConfig = config || {
    enable_vs: false,
    show_skill: false,
    show_sex: false,
    enable_undo_game_by_user: false,
    enable_change_game_by_user: false,
    enable_add_user_auto: false,
  }

  const toggleUser = (user: User) => {
    // ready 상태가 아닌 사용자는 선택할 수 없음
    if (user.user_status !== "ready" || !user.is_active || !user.is_attendance) return

    if (safeConfig.enable_vs) {
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

  const shuffleTeams = () => {
    if (safeConfig.enable_vs && team1.length === 2 && team2.length === 2) {
      const allUsers = [...team1, ...team2]
      const shuffled = [...allUsers].sort(() => Math.random() - 0.5)
      setTeam1(shuffled.slice(0, 2))
      setTeam2(shuffled.slice(2, 4))
    }
  }

  const handleAddToQueue = () => {
    if (safeConfig.enable_vs) {
      if (team1.length === 2 && team2.length === 2) {
        onAddToQueue([...team1, ...team2], team1, team2)
      }
    } else {
      if (selectedUsers.length === 4) {
        onAddToQueue(selectedUsers)
      }
    }
  }

  const isUserSelected = (user: User) => {
    if (safeConfig.enable_vs) {
      return team1.some((u) => u.id === user.id) || team2.some((u) => u.id === user.id)
    }
    return selectedUsers.some((u) => u.id === user.id)
  }

  const isUserDisabled = (user: User) => {
    return user.user_status !== "ready" || !user.is_active || !user.is_attendance
  }

  const getUserDisabledReason = (user: User) => {
    if (!user.is_active) return "비활성"
    if (!user.is_attendance) return "미출석"
    if (user.user_status === "gaming") return "게임 중"
    if (user.user_status === "waiting") return "대기열"
    return ""
  }

  const canAddToQueue = safeConfig.enable_vs ? team1.length === 2 && team2.length === 2 : selectedUsers.length === 4

  // 출석한 사용자 필터링
  const attendingUsers = users.filter((user) => user.is_attendance && user.is_active)

  // 게스트 사용자를 위한 스타일 (이름만 흐리게)
  const getGuestTokenContent = (user: User) => {
    const baseDisplayName = safeConfig?.show_skill
      ? `${user.name}(${skillMapping[user.skill as keyof typeof skillMapping]})`
      : user.name

    if (user.is_guest) {
      return (
        <>
          {baseDisplayName}
          <span className="opacity-50 text-xs ml-1">guest</span>
        </>
      )
    }

    return baseDisplayName
  }

  const getUserDisplayName = (user: User) => {
    if (!safeConfig) return user.name

    let displayName = user.name

    if (safeConfig.show_skill) {
      displayName = `${user.name}(${skillMapping[user.skill]})`
    }

    // 게스트인 경우 이름 뒤에 작은 guest 텍스트 추가
    if (user.is_guest) {
      displayName += " guest"
    }

    return displayName
  }

  // showSex 설정 시 성별에 따른 은은한 색상 표시
  const getUserCardStyle = (user: User) => {
    let baseStyle = "p-3 cursor-pointer transition-all text-center "

    if (isUserDisabled(user)) {
      baseStyle += "bg-gray-100 text-gray-400 cursor-not-allowed"
    } else if (isUserSelected(user)) {
      if (safeConfig.show_sex) {
        baseStyle +=
          user.sex === "M" ? "bg-blue-100 border-blue-300 text-blue-800" : "bg-pink-100 border-pink-300 text-pink-800"
      } else {
        baseStyle += "bg-blue-100 border-blue-300 text-blue-800"
      }
    } else {
      // 선택되지 않았을 때도 showSex가 true면 은은한 색상 표시
      if (safeConfig.show_sex) {
        baseStyle +=
          user.sex === "M"
            ? "bg-blue-50 hover:bg-blue-100 border-blue-200 text-blue-700"
            : "bg-pink-50 hover:bg-pink-100 border-pink-200 text-pink-700"
      } else {
        baseStyle += "bg-white hover:bg-gray-50 border-gray-200"
      }
    }

    return baseStyle
  }

  return (
    <div className="h-screen flex flex-col bg-gray-50 max-w-md mx-auto">
      {/* Header */}
      <div className="bg-white shadow-sm border-b px-4 py-3 flex items-center">
        <Button variant="ghost" size="icon" onClick={onBack} className="mr-2">
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <h1 className="text-xl font-bold text-gray-900">게임 짜기</h1>
        {safeConfig.enable_vs && (
          <Button variant="ghost" size="icon" onClick={shuffleTeams} className="ml-auto">
            <Shuffle className="h-4 w-4" />
          </Button>
        )}
      </div>

      {/* Selected Players */}
      <div className="bg-white px-4 py-4 border-b">
        {safeConfig.enable_vs ? (
          <div className="flex items-center justify-between gap-4">
            {/* 좌측 팀 */}
            <div className="flex-1">
              <h3 className="text-sm font-medium text-gray-600 mb-2 text-center">좌측 ({team1.length}/2)</h3>
              <div className="flex flex-col gap-2 min-h-[64px]">
                {team1.map((user) => (
                  <div
                    key={user.id}
                    className={getUserTokenStyle(user) + " cursor-pointer text-center"}
                    onClick={() => toggleUser(user)}
                  >
                    {getGuestTokenContent(user)}
                  </div>
                ))}
                {team1.length === 0 && (
                  <p className="text-gray-400 text-xs text-center">좌측 플레이어를 선택해주세요</p>
                )}
              </div>
            </div>

            {/* VS 표시 */}
            <div className="flex items-center justify-center px-2">
              <div className="text-sm font-medium text-gray-500">VS</div>
            </div>

            {/* 우측 팀 */}
            <div className="flex-1">
              <h3 className="text-sm font-medium text-gray-600 mb-2 text-center">우측 ({team2.length}/2)</h3>
              <div className="flex flex-col gap-2 min-h-[64px]">
                {team2.map((user) => (
                  <div
                    key={user.id}
                    className={getUserTokenStyle(user) + " cursor-pointer text-center"}
                    onClick={() => toggleUser(user)}
                  >
                    {getGuestTokenContent(user)}
                  </div>
                ))}
                {team2.length === 0 && (
                  <p className="text-gray-400 text-xs text-center">우측 플레이어를 선택해주세요</p>
                )}
              </div>
            </div>
          </div>
        ) : (
          <div>
            <h2 className="text-sm font-medium text-gray-600 mb-3">선택된 플레이어 ({selectedUsers.length}/4)</h2>
            <div className="flex flex-wrap gap-2 min-h-[40px]">
              {selectedUsers.map((user) => (
                <div
                  key={user.id}
                  className={getUserTokenStyle(user) + " cursor-pointer"}
                  onClick={() => toggleUser(user)}
                >
                  {getGuestTokenContent(user)}
                </div>
              ))}
              {selectedUsers.length === 0 && <p className="text-gray-400 text-sm">플레이어를 선택해주세요</p>}
            </div>
          </div>
        )}
      </div>

      {/* Player List */}
      <div className="flex-1 px-4 py-4 overflow-y-auto">
        <h2 className="text-lg font-semibold text-gray-900 mb-3">출석한 회원 ({attendingUsers.length}명)</h2>
        <div className="grid grid-cols-2 gap-3">
          {attendingUsers.map((user) => (
            <Card key={user.id} className={getUserCardStyle(user)} onClick={() => toggleUser(user)}>
              <div className="flex items-center justify-between">
                <div className="text-xs font-medium flex-1">{getGuestTokenContent(user)}</div>
                {isUserDisabled(user) && (
                  <div className="text-xs text-gray-500 ml-2">{getUserDisabledReason(user)}</div>
                )}
              </div>
            </Card>
          ))}
        </div>
      </div>

      {/* Bottom Button */}
      <div className="p-4 bg-white border-t">
        <Button
          className={`w-full py-3 text-lg font-medium ${
            canAddToQueue ? "bg-blue-600 hover:bg-blue-700 text-white" : "bg-gray-300 text-gray-500 cursor-not-allowed"
          }`}
          onClick={handleAddToQueue}
          disabled={!canAddToQueue}
        >
          {safeConfig.enable_vs
            ? `대기열에 넣기 (${team1.length + team2.length}/4)`
            : `대기열에 넣기 (${selectedUsers.length}/4)`}
        </Button>
      </div>
    </div>
  )
}

// 이 페이지는 동적으로 렌더링되어야 함 (props에 의존)
export const dynamic = "force-dynamic"
