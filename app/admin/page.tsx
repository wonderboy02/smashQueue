"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { ArrowLeft, Settings, Users, MapPin } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Switch } from "@/components/ui/switch"
import { Label } from "@/components/ui/label"
import type { User, Game, Court, Config } from "../../types/database"
import { autoLogin } from "../../lib/supabase/auth"
import { getCourts, getConfig, getGamesByStatus, updateCourt, updateConfig } from "../../lib/supabase/queries"

export default function AdminPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [currentUser, setCurrentUser] = useState<User | null>(null)
  const [config, setConfig] = useState<Config | null>(null)
  const [courts, setCourts] = useState<Court[]>([])
  const [playingGames, setPlayingGames] = useState<Game[]>([])
  const [waitingGames, setWaitingGames] = useState<Game[]>([])

  useEffect(() => {
    checkAuthAndLoadData()
  }, [])

  const checkAuthAndLoadData = async () => {
    try {
      setLoading(true)

      // 인증 확인
      const user = await autoLogin()
      if (!user || !user.admin_authority) {
        router.push("/")
        return
      }

      setCurrentUser(user)

      // 데이터 로드
      const [configData, courtsData, playingData, waitingData] = await Promise.all([
        getConfig(),
        getCourts(),
        getGamesByStatus("playing"),
        getGamesByStatus("waiting"),
      ])

      setConfig(configData)
      setCourts(courtsData)
      setPlayingGames(playingData)
      setWaitingGames(waitingData)
    } catch (error) {
      console.error("Admin page load error:", error)
      router.push("/")
    } finally {
      setLoading(false)
    }
  }

  const handleConfigUpdate = async (key: keyof Config, value: boolean) => {
    if (!config) return

    try {
      const updatedConfig = await updateConfig({ [key]: value })
      setConfig(updatedConfig)
    } catch (error) {
      console.error("Config update error:", error)
      alert("설정 업데이트 중 오류가 발생했습니다.")
    }
  }

  const handleCourtToggle = async (courtId: number, isActive: boolean) => {
    try {
      await updateCourt(courtId, isActive)
      setCourts(courts.map((court) => (court.id === courtId ? { ...court, is_active: isActive } : court)))
    } catch (error) {
      console.error("Court update error:", error)
      alert("코트 설정 업데이트 중 오류가 발생했습니다.")
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
        <p className="text-gray-600">관리자 권한이 필요합니다.</p>
      </div>
    )
  }

  return (
    <div className="h-screen flex flex-col bg-gray-50 max-w-md mx-auto">
      {/* Header */}
      <div className="bg-white shadow-sm border-b px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => router.push("/")} className="h-8 w-8">
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <h1 className="text-xl font-bold text-gray-900">관리자</h1>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 p-4 overflow-y-auto space-y-4">
        {/* Game Status */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5" />
              게임 현황
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-4 text-center">
              <div>
                <div className="text-2xl font-bold text-green-600">{playingGames.length}</div>
                <div className="text-sm text-gray-600">진행 중</div>
              </div>
              <div>
                <div className="text-2xl font-bold text-blue-600">{waitingGames.length}</div>
                <div className="text-sm text-gray-600">대기 중</div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Court Management */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <MapPin className="h-5 w-5" />
              코트 관리
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {courts.map((court) => (
              <div key={court.id} className="flex items-center justify-between">
                <Label htmlFor={`court-${court.id}`}>코트 {court.id}</Label>
                <Switch
                  id={`court-${court.id}`}
                  checked={court.is_active}
                  onCheckedChange={(checked) => handleCourtToggle(court.id, checked)}
                />
              </div>
            ))}
          </CardContent>
        </Card>

        {/* App Settings */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Settings className="h-5 w-5" />앱 설정
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-center justify-between">
              <Label htmlFor="show-sex">성별 표시</Label>
              <Switch
                id="show-sex"
                checked={config.show_sex}
                onCheckedChange={(checked) => handleConfigUpdate("show_sex", checked)}
              />
            </div>

            <div className="flex items-center justify-between">
              <Label htmlFor="show-skill">실력 표시</Label>
              <Switch
                id="show-skill"
                checked={config.show_skill}
                onCheckedChange={(checked) => handleConfigUpdate("show_skill", checked)}
              />
            </div>

            <div className="flex items-center justify-between">
              <Label htmlFor="enable-vs">VS 모드</Label>
              <Switch
                id="enable-vs"
                checked={config.enable_vs}
                onCheckedChange={(checked) => handleConfigUpdate("enable_vs", checked)}
              />
            </div>

            <div className="flex items-center justify-between">
              <Label htmlFor="enable-undo">사용자 게임 취소</Label>
              <Switch
                id="enable-undo"
                checked={config.enable_undo_game_by_user}
                onCheckedChange={(checked) => handleConfigUpdate("enable_undo_game_by_user", checked)}
              />
            </div>

            <div className="flex items-center justify-between">
              <Label htmlFor="enable-change">사용자 게임 변경</Label>
              <Switch
                id="enable-change"
                checked={config.enable_change_game_by_user}
                onCheckedChange={(checked) => handleConfigUpdate("enable_change_game_by_user", checked)}
              />
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

// 동적 렌더링 강제
export const dynamic = "force-dynamic"
