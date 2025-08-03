"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { ArrowLeft, Users, Play, Shuffle } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import type { User, Game, Config } from "../../types/database"
import { getUsers, getConfig, getGamesByStatus, createGame } from "../../lib/supabase/queries"
import { autoLogin } from "../../lib/supabase/auth"

export default function GameMaking() {
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [users, setUsers] = useState<User[]>([])
  const [config, setConfig] = useState<Config | null>(null)
  const [playingGames, setPlayingGames] = useState<Game[]>([])
  const [waitingGames, setWaitingGames] = useState<Game[]>([])
  const [selectedUsers, setSelectedUsers] = useState<User[]>([])
  const [currentUser, setCurrentUser] = useState<User | null>(null)

  useEffect(() => {
    loadData()
  }, [])

  const loadData = async () => {
    try {
      // 인증 확인
      const user = await autoLogin()
      if (!user) {
        router.push("/auth/login")
        return
      }
      setCurrentUser(user)

      // 데이터 로드
      const [usersData, configData, playingData, waitingData] = await Promise.all([
        getUsers(),
        getConfig(),
        getGamesByStatus("playing"),
        getGamesByStatus("waiting"),
      ])

      setUsers(usersData)
      setConfig(configData)
      setPlayingGames(playingData)
      setWaitingGames(waitingData)
    } catch (error) {
      console.error("데이터 로드 오류:", error)
      router.push("/")
    } finally {
      setLoading(false)
    }
  }

  const getUserDisplayName = (user: User) => {
    if (!config) return user.name

    const skillMapping = {
      A: "고수",
      B: "중수",
      C: "초보",
    }

    let displayName = user.name

    if (config.show_skill) {
      displayName = `${user.name}(${skillMapping[user.skill]})`
    }

    if (user.is_guest) {
      displayName += " guest"
    }

    return displayName
  }

  const getUserTokenStyle = (user: User) => {
    if (!config) return "px-2 py-1 rounded text-sm bg-gray-100 text-gray-800"

    let baseStyle = "px-2 py-1 rounded text-sm "

    if (config.show_sex) {
      if (user.sex === "M") {
        baseStyle += "bg-blue-100 text-blue-800 "
      } else {
        baseStyle += "bg-pink-100 text-pink-800 "
      }
    } else {
      baseStyle += "bg-gray-100 text-gray-800 "
    }

    return baseStyle
  }

  const availableUsers = users.filter(
    (user) => user.user_status === "ready" && !selectedUsers.find((selected) => selected.id === user.id),
  )

  const handleUserSelect = (user: User) => {
    if (selectedUsers.find((selected) => selected.id === user.id)) {
      setSelectedUsers(selectedUsers.filter((selected) => selected.id !== user.id))
    } else if (selectedUsers.length < 4) {
      setSelectedUsers([...selectedUsers, user])
    }
  }

  const handleRandomSelect = () => {
    const shuffled = [...availableUsers].sort(() => 0.5 - Math.random())
    const selected = shuffled.slice(0, Math.min(4, shuffled.length))
    setSelectedUsers(selected)
  }

  const handleAddToQueue = async () => {
    if (selectedUsers.length < 2) {
      alert("최소 2명 이상 선택해주세요.")
      return
    }

    try {
      await createGame({
        status: "waiting",
        userIds: selectedUsers.map((user) => user.id),
      })

      setSelectedUsers([])
      router.push("/")
    } catch (error) {
      console.error("게임 생성 오류:", error)
      alert("게임 생성 중 오류가 발생했습니다.")
    }
  }

  const handleBack = () => {
    router.push("/")
  }

  if (loading) {
    return (
      <div className="h-screen flex items-center justify-center bg-gray-50 max-w-md mx-auto">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-2"></div>
          <p className="text-gray-600">로딩 중...</p>
        </div>
      </div>
    )
  }

  if (!currentUser || !config) {
    return (
      <div className="h-screen flex items-center justify-center bg-gray-50 max-w-md mx-auto">
        <p className="text-gray-600">데이터를 불러오는 중...</p>
      </div>
    )
  }

  return (
    <div className="h-screen flex flex-col bg-gray-50 max-w-md mx-auto">
      {/* Header */}
      <div className="bg-white shadow-sm border-b px-4 py-3 flex items-center">
        <Button variant="ghost" size="icon" onClick={handleBack} className="mr-2">
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <h1 className="text-xl font-bold text-gray-900">게임 짜기</h1>
        <Button variant="ghost" size="icon" onClick={handleRandomSelect} className="ml-auto">
          <Shuffle className="h-5 w-5" />
        </Button>
      </div>

      {/* Selected Users */}
      <div className="bg-white px-4 py-3 border-b">
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm font-medium text-gray-700">선택된 플레이어 ({selectedUsers.length}/4)</span>
          <Button variant="ghost" size="sm" onClick={() => setSelectedUsers([])} disabled={selectedUsers.length === 0}>
            초기화
          </Button>
        </div>
        <div className="flex flex-wrap gap-2 min-h-[40px]">
          {selectedUsers.map((user) => (
            <div
              key={user.id}
              className={getUserTokenStyle(user) + " cursor-pointer"}
              onClick={() => handleUserSelect(user)}
            >
              {getUserDisplayName(user)}
            </div>
          ))}
          {selectedUsers.length === 0 && <div className="text-gray-400 text-sm py-2">플레이어를 선택해주세요</div>}
        </div>
      </div>

      {/* Available Users */}
      <div className="flex-1 px-4 py-4 overflow-y-auto">
        <Tabs defaultValue="simple" className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="simple">간단 선택</TabsTrigger>
            <TabsTrigger value="vs" disabled={!config.enable_vs}>
              VS 모드
            </TabsTrigger>
          </TabsList>

          <TabsContent value="simple" className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold text-gray-900">준비완료 ({availableUsers.length}명)</h2>
            </div>

            <div className="space-y-2">
              {availableUsers.map((user) => (
                <Card
                  key={user.id}
                  className={`p-3 cursor-pointer transition-colors ${
                    selectedUsers.find((selected) => selected.id === user.id)
                      ? "bg-blue-50 border-blue-200"
                      : "hover:bg-gray-50"
                  }`}
                  onClick={() => handleUserSelect(user)}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className={getUserTokenStyle(user)}>{getUserDisplayName(user)}</div>
                    </div>
                    <Badge variant="outline">{user.skill}급</Badge>
                  </div>
                </Card>
              ))}

              {availableUsers.length === 0 && (
                <div className="text-center py-8 text-gray-500">
                  <Users className="h-10 w-10 mx-auto mb-2 opacity-30" />
                  <p>준비완료된 플레이어가 없습니다</p>
                </div>
              )}
            </div>
          </TabsContent>

          <TabsContent value="vs" className="space-y-4">
            <div className="text-center py-8 text-gray-500">
              <p>VS 모드는 준비 중입니다</p>
            </div>
          </TabsContent>
        </Tabs>
      </div>

      {/* Bottom Button */}
      <div className="p-4 bg-white border-t">
        <Button
          className="w-full bg-blue-600 hover:bg-blue-700 text-white py-3 text-lg font-medium"
          onClick={handleAddToQueue}
          disabled={selectedUsers.length < 2}
        >
          <Play className="h-5 w-5 mr-2" />
          대기열에 추가 ({selectedUsers.length}명)
        </Button>
      </div>
    </div>
  )
}

export const dynamic = "force-dynamic"
