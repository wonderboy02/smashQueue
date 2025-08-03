"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { ArrowLeft, Play, Shuffle } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import type { User, Game, Config } from "../../types/database"
import { autoLogin } from "../../lib/supabase/auth"
import { getReadyUsers, getConfig, getGamesByStatus, createGame } from "../../lib/supabase/queries"

export default function GameMaking() {
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [currentUser, setCurrentUser] = useState<User | null>(null)
  const [config, setConfig] = useState<Config | null>(null)
  const [users, setUsers] = useState<User[]>([])
  const [playingGames, setPlayingGames] = useState<Game[]>([])
  const [waitingGames, setWaitingGames] = useState<Game[]>([])
  const [selectedUsers, setSelectedUsers] = useState<User[]>([])
  const [team1, setTeam1] = useState<User[]>([])
  const [team2, setTeam2] = useState<User[]>([])

  useEffect(() => {
    checkAuthAndLoadData()
  }, [])

  const checkAuthAndLoadData = async () => {
    try {
      setLoading(true)

      // 인증 확인
      const user = await autoLogin()
      if (!user) {
        router.push("/")
        return
      }

      setCurrentUser(user)

      // 데이터 로드
      const [configData, usersData, playingData, waitingData] = await Promise.all([
        getConfig(),
        getReadyUsers(),
        getGamesByStatus("playing"),
        getGamesByStatus("waiting"),
      ])

      setConfig(configData)
      setUsers(usersData)
      setPlayingGames(playingData)
      setWaitingGames(waitingData)
    } catch (error) {
      console.error("Game making page load error:", error)
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

  const handleUserSelect = (user: User) => {
    if (selectedUsers.find((u) => u.id === user.id)) {
      setSelectedUsers(selectedUsers.filter((u) => u.id !== user.id))
    } else if (selectedUsers.length < 4) {
      setSelectedUsers([...selectedUsers, user])
    }
  }

  const handleTeamSelect = (user: User, team: 1 | 2) => {
    if (team === 1) {
      if (team1.find((u) => u.id === user.id)) {
        setTeam1(team1.filter((u) => u.id !== user.id))
      } else if (team1.length < 2) {
        setTeam1([...team1, user])
        setTeam2(team2.filter((u) => u.id !== user.id))
      }
    } else {
      if (team2.find((u) => u.id === user.id)) {
        setTeam2(team2.filter((u) => u.id !== user.id))
      } else if (team2.length < 2) {
        setTeam2([...team2, user])
        setTeam1(team1.filter((u) => u.id !== user.id))
      }
    }
  }

  const handleRandomSelect = () => {
    const availableUsers = users.filter(
      (user) =>
        !playingGames.some((game) => game.users.some((u) => u.id === user.id)) &&
        !waitingGames.some((game) => game.users.some((u) => u.id === user.id)),
    )

    if (availableUsers.length >= 4) {
      const shuffled = [...availableUsers].sort(() => Math.random() - 0.5)
      setSelectedUsers(shuffled.slice(0, 4))
    }
  }

  const handleAddToQueue = async () => {
    if (selectedUsers.length !== 4) return

    try {
      const result = await createGame({
        status: "waiting",
        userIds: selectedUsers.map((user) => user.id),
      })

      if (result.autoStarted) {
        alert("빈 코트가 있어서 바로 게임이 시작되었습니다!")
      } else {
        alert("대기열에 추가되었습니다!")
      }

      router.push("/")
    } catch (error) {
      console.error("Add to queue error:", error)
      alert("게임 생성 중 오류가 발생했습니다.")
    }
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
        <p className="text-gray-600">데이터를 불러올 수 없습니다.</p>
      </div>
    )
  }

  const availableUsers = users.filter(
    (user) =>
      !playingGames.some((game) => game.users.some((u) => u.id === user.id)) &&
      !waitingGames.some((game) => game.users.some((u) => u.id === user.id)),
  )

  return (
    <div className="h-screen flex flex-col bg-gray-50 max-w-md mx-auto">
      {/* Header */}
      <div className="bg-white shadow-sm border-b px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => router.push("/")} className="h-8 w-8">
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <h1 className="text-xl font-bold text-gray-900">게임 짜기</h1>
        </div>
        <Button variant="ghost" size="icon" onClick={handleRandomSelect} className="h-8 w-8">
          <Shuffle className="h-4 w-4" />
        </Button>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-hidden">
        <Tabs defaultValue="simple" className="h-full flex flex-col">
          <TabsList className="grid w-full grid-cols-2 mx-4 mt-4">
            <TabsTrigger value="simple">간단 선택</TabsTrigger>
            <TabsTrigger value="vs" disabled={!config.enable_vs}>
              VS 모드
            </TabsTrigger>
          </TabsList>

          <TabsContent value="simple" className="flex-1 p-4 overflow-y-auto">
            <div className="space-y-4">
              {/* Selected Users */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center justify-between">
                    <span>선택된 플레이어 ({selectedUsers.length}/4)</span>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex flex-wrap gap-2 min-h-[60px]">
                    {selectedUsers.map((user) => (
                      <div
                        key={user.id}
                        className={getUserTokenStyle(user) + " cursor-pointer"}
                        onClick={() => handleUserSelect(user)}
                      >
                        {getUserDisplayName(user)}
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>

              {/* Available Users */}
              <Card>
                <CardHeader>
                  <CardTitle>사용 가능한 플레이어 ({availableUsers.length}명)</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex flex-wrap gap-2">
                    {availableUsers.map((user) => (
                      <div
                        key={user.id}
                        className={`${getUserTokenStyle(user)} cursor-pointer ${
                          selectedUsers.find((u) => u.id === user.id) ? "ring-2 ring-blue-500" : ""
                        }`}
                        onClick={() => handleUserSelect(user)}
                      >
                        {getUserDisplayName(user)}
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="vs" className="flex-1 p-4 overflow-y-auto">
            <div className="space-y-4">
              {/* Team 1 */}
              <Card>
                <CardHeader>
                  <CardTitle>팀 1 ({team1.length}/2)</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex flex-wrap gap-2 min-h-[60px]">
                    {team1.map((user) => (
                      <div
                        key={user.id}
                        className={getUserTokenStyle(user) + " cursor-pointer"}
                        onClick={() => handleTeamSelect(user, 1)}
                      >
                        {getUserDisplayName(user)}
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>

              {/* VS */}
              <div className="text-center text-lg font-bold text-gray-500">VS</div>

              {/* Team 2 */}
              <Card>
                <CardHeader>
                  <CardTitle>팀 2 ({team2.length}/2)</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex flex-wrap gap-2 min-h-[60px]">
                    {team2.map((user) => (
                      <div
                        key={user.id}
                        className={getUserTokenStyle(user) + " cursor-pointer"}
                        onClick={() => handleTeamSelect(user, 2)}
                      >
                        {getUserDisplayName(user)}
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>

              {/* Available Users */}
              <Card>
                <CardHeader>
                  <CardTitle>사용 가능한 플레이어</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex flex-wrap gap-2">
                    {availableUsers.map((user) => (
                      <div key={user.id} className="flex gap-1">
                        <div
                          className={`${getUserTokenStyle(user)} cursor-pointer ${
                            team1.find((u) => u.id === user.id) ? "ring-2 ring-blue-500" : ""
                          }`}
                          onClick={() => handleTeamSelect(user, 1)}
                        >
                          {getUserDisplayName(user)}
                        </div>
                        <div
                          className={`${getUserTokenStyle(user)} cursor-pointer ${
                            team2.find((u) => u.id === user.id) ? "ring-2 ring-red-500" : ""
                          }`}
                          onClick={() => handleTeamSelect(user, 2)}
                        >
                          {getUserDisplayName(user)}
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>
        </Tabs>
      </div>

      {/* Bottom Button */}
      <div className="p-4 bg-white border-t">
        <Button
          className="w-full bg-blue-600 hover:bg-blue-700 text-white py-3 text-lg font-medium"
          onClick={handleAddToQueue}
          disabled={selectedUsers.length !== 4 && (team1.length !== 2 || team2.length !== 2)}
        >
          <Play className="h-5 w-5 mr-2" />
          대기열에 추가
        </Button>
      </div>
    </div>
  )
}

// 동적 렌더링 강제
export const dynamic = "force-dynamic"
