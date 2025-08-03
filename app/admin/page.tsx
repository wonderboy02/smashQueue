"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { ArrowLeft, Settings, Users } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Switch } from "@/components/ui/switch"
import type { User, Game, Court, Config } from "../../types/database"
import { updateConfig, updateCourt, updateUser, getAllUsers } from "../../lib/supabase/queries"
import { autoLogin } from "../../lib/supabase/auth"

export default function AdminPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [updateLoading, setUpdateLoading] = useState<{ [key: string]: boolean }>({})
  const [allUsers, setAllUsers] = useState<User[]>([])
  const [config, setConfig] = useState<Config | null>(null)
  const [courts, setCourts] = useState<Court[]>([])
  const [playingGames, setPlayingGames] = useState<Game[]>([])
  const [waitingGames, setWaitingGames] = useState<Game[]>([])
  const [currentUser, setCurrentUser] = useState<User | null>(null)

  useEffect(() => {
    loadData()
  }, [])

  const loadData = async () => {
    try {
      // 현재 사용자가 관리자인지 확인
      const user = await autoLogin()
      if (!user || !user.admin_authority) {
        router.push("/")
        return
      }
      setCurrentUser(user)

      // 모든 데이터 로드
      const usersData = await getAllUsers()
      setAllUsers(usersData)

      // 기본 설정값 설정
      setConfig({
        id: 1,
        show_sex: true,
        show_skill: true,
        enable_vs: true,
        enable_undo_game_by_user: false,
        enable_change_game_by_user: false,
        enable_add_user_auto: false,
      })

      // 기본 코트 설정
      setCourts([
        { id: 1, name: "코트 1", is_active: true },
        { id: 2, name: "코트 2", is_active: true },
        { id: 3, name: "코트 3", is_active: false },
      ])
    } catch (error) {
      console.error("데이터 로드 오류:", error)
      router.push("/")
    } finally {
      setLoading(false)
    }
  }

  const activeUsers = allUsers.filter((user) => user.is_active)
  const attendingUsers = allUsers.filter((user) => user.is_attendance && user.is_active)
  const guestUsers = allUsers.filter((user) => user.is_guest && user.is_active)
  const pendingUsers = allUsers.filter((user) => !user.is_active)

  const handleConfigUpdate = async (key: keyof Config, value: boolean) => {
    if (!config) return

    try {
      setUpdateLoading((prev) => ({ ...prev, [key]: true }))
      const updatedConfig = await updateConfig({ [key]: value })
      setConfig(updatedConfig)
    } catch (error) {
      console.error("설정 업데이트 오류:", error)
      alert("설정 업데이트 중 오류가 발생했습니다.")
    } finally {
      setUpdateLoading((prev) => ({ ...prev, [key]: false }))
    }
  }

  const handleCourtUpdate = async (courtId: number, isActive: boolean) => {
    try {
      setUpdateLoading((prev) => ({ ...prev, [`court_${courtId}`]: true }))
      const updatedCourt = await updateCourt(courtId, isActive)
      const updatedCourts = courts.map((court) => (court.id === courtId ? updatedCourt : court))
      setCourts(updatedCourts)
    } catch (error) {
      console.error("코트 업데이트 오류:", error)
      alert("코트 설정 업데이트 중 오류가 발생했습니다.")
    } finally {
      setUpdateLoading((prev) => ({ ...prev, [`court_${courtId}`]: false }))
    }
  }

  const handleUserApproval = async (userId: number, approve: boolean) => {
    try {
      setUpdateLoading((prev) => ({ ...prev, [`user_${userId}`]: true }))

      // 승인할 때는 is_active와 is_attendance를 모두 true로 설정
      const updateData = approve ? { is_active: true, is_attendance: true } : { is_active: false }

      const updatedUser = await updateUser(userId, updateData)
      const updatedUsers = allUsers.map((user) => (user.id === userId ? updatedUser : user))
      setAllUsers(updatedUsers)
    } catch (error) {
      console.error("사용자 승인 오류:", error)
      alert("사용자 승인 중 오류가 발생했습니다.")
    } finally {
      setUpdateLoading((prev) => ({ ...prev, [`user_${userId}`]: false }))
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
        <p className="text-gray-600">관리자 권한이 필요합니다.</p>
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
        <h1 className="text-xl font-bold text-gray-900">관리자 페이지</h1>
      </div>

      {/* Content */}
      <div className="flex-1 px-4 py-4 overflow-y-auto space-y-4">
        {/* 통계 */}
        <Card className="p-4">
          <h2 className="text-lg font-semibold mb-3 flex items-center">
            <Users className="h-5 w-5 mr-2" />
            현황
          </h2>
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <div className="text-gray-600">전체 회원</div>
              <div className="text-xl font-bold">{activeUsers.length}명</div>
            </div>
            <div>
              <div className="text-gray-600">출석</div>
              <div className="text-xl font-bold text-green-600">{attendingUsers.length}명</div>
            </div>
            <div>
              <div className="text-gray-600">게스트</div>
              <div className="text-xl font-bold text-orange-600">{guestUsers.length}명</div>
            </div>
            <div>
              <div className="text-gray-600">승인 대기</div>
              <div className="text-xl font-bold text-red-600">{pendingUsers.length}명</div>
            </div>
          </div>
        </Card>

        {/* 설정 */}
        <Card className="p-4">
          <h2 className="text-lg font-semibold mb-3 flex items-center">
            <Settings className="h-5 w-5 mr-2" />
            시스템 설정
          </h2>
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <div className="font-medium">성별 표시</div>
                <div className="text-sm text-gray-600">플레이어 토큰에 성별 색상 표시</div>
              </div>
              <Switch
                checked={config.show_sex}
                onCheckedChange={(checked) => handleConfigUpdate("show_sex", checked)}
                disabled={updateLoading.show_sex}
              />
            </div>

            <div className="flex items-center justify-between">
              <div>
                <div className="font-medium">실력 표시</div>
                <div className="text-sm text-gray-600">이름 앞에 A/B/C 랭크 표시</div>
              </div>
              <Switch
                checked={config.show_skill}
                onCheckedChange={(checked) => handleConfigUpdate("show_skill", checked)}
                disabled={updateLoading.show_skill}
              />
            </div>

            <div className="flex items-center justify-between">
              <div>
                <div className="font-medium">VS 모드</div>
                <div className="text-sm text-gray-600">2vs2 팀 구성 모드</div>
              </div>
              <Switch
                checked={config.enable_vs}
                onCheckedChange={(checked) => handleConfigUpdate("enable_vs", checked)}
                disabled={updateLoading.enable_vs}
              />
            </div>

            <div className="flex items-center justify-between">
              <div>
                <div className="font-medium">사용자 게임 되돌리기</div>
                <div className="text-sm text-gray-600">일반 사용자도 게임을 대기열로 되돌리기 가능</div>
              </div>
              <Switch
                checked={config.enable_undo_game_by_user}
                onCheckedChange={(checked) => handleConfigUpdate("enable_undo_game_by_user", checked)}
                disabled={updateLoading.enable_undo_game_by_user}
              />
            </div>

            <div className="flex items-center justify-between">
              <div>
                <div className="font-medium">사용자 대기열 수정</div>
                <div className="text-sm text-gray-600">일반 사용자도 대기열 수정 가능</div>
              </div>
              <Switch
                checked={config.enable_change_game_by_user}
                onCheckedChange={(checked) => handleConfigUpdate("enable_change_game_by_user", checked)}
                disabled={updateLoading.enable_change_game_by_user}
              />
            </div>

            <div className="flex items-center justify-between">
              <div>
                <div className="font-medium">자동 회원 승인</div>
                <div className="text-sm text-gray-600">신규 가입자 자동 승인</div>
              </div>
              <Switch
                checked={config.enable_add_user_auto}
                onCheckedChange={(checked) => handleConfigUpdate("enable_add_user_auto", checked)}
                disabled={updateLoading.enable_add_user_auto}
              />
            </div>
          </div>
        </Card>

        {/* 코트 관리 */}
        <Card className="p-4">
          <h2 className="text-lg font-semibold mb-3">코트 관리</h2>
          <div className="space-y-2">
            {courts.map((court) => (
              <div key={court.id} className="flex items-center justify-between p-2 bg-gray-50 rounded">
                <span>코트 {court.id}</span>
                <Switch
                  checked={court.is_active}
                  onCheckedChange={(checked) => handleCourtUpdate(court.id, checked)}
                  disabled={updateLoading[`court_${court.id}`]}
                />
              </div>
            ))}
          </div>
        </Card>

        {/* 승인 대기 회원 */}
        {pendingUsers.length > 0 && (
          <Card className="p-4">
            <h2 className="text-lg font-semibold mb-3">승인 대기 회원</h2>
            <div className="space-y-2">
              {pendingUsers.map((user) => (
                <div key={user.id} className="flex items-center justify-between p-2 bg-gray-50 rounded">
                  <div>
                    <div className="font-medium flex items-center gap-2">
                      {user.name}
                      {user.is_guest && (
                        <span className="text-xs bg-orange-100 text-orange-800 px-2 py-0.5 rounded">게스트</span>
                      )}
                    </div>
                    <div className="text-sm text-gray-600">
                      {user.sex === "M" ? "남성" : "여성"} · {user.skill}급
                    </div>
                  </div>
                  <div className="space-x-2">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleUserApproval(user.id, false)}
                      disabled={updateLoading[`user_${user.id}`]}
                    >
                      거절
                    </Button>
                    <Button
                      size="sm"
                      onClick={() => handleUserApproval(user.id, true)}
                      disabled={updateLoading[`user_${user.id}`]}
                    >
                      {updateLoading[`user_${user.id}`] ? "처리 중..." : "승인"}
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </Card>
        )}
      </div>
    </div>
  )
}

export const dynamic = "force-dynamic"
