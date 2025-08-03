"use client"

import { useState, useEffect } from "react"
import { ArrowLeft, Settings, Users } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Switch } from "@/components/ui/switch"
import type { User, Game, Court, Config } from "../../types/database"
import { updateConfig, updateCourt, updateUser, getAllUsers } from "../../lib/supabase/queries"

interface AdminPageProps {
  onBack: () => void
  config: Config
  courts: Court[]
  playingGames: Game[]
  waitingGames: Game[]
  onConfigUpdate: (config: Config) => void
  onCourtsUpdate: (courts: Court[]) => void
}

export default function AdminPage({
  onBack,
  config,
  courts,
  playingGames,
  waitingGames,
  onConfigUpdate,
  onCourtsUpdate,
}: AdminPageProps) {
  const [loading, setLoading] = useState<{ [key: string]: boolean }>({})
  const [allUsers, setAllUsers] = useState<User[]>([])

  useEffect(() => {
    loadAllUsers()
  }, [])

  const loadAllUsers = async () => {
    try {
      const usersData = await getAllUsers()
      setAllUsers(usersData)
    } catch (err) {
      console.error("전체 사용자 로드 오류:", err)
    }
  }

  const activeUsers = allUsers.filter((user) => user.is_active)
  const attendingUsers = allUsers.filter((user) => user.is_attendance && user.is_active)
  const guestUsers = allUsers.filter((user) => user.is_guest && user.is_active)
  const pendingUsers = allUsers.filter((user) => !user.is_active)

  const handleConfigUpdate = async (key: keyof Config, value: boolean) => {
    try {
      setLoading((prev) => ({ ...prev, [key]: true }))
      const updatedConfig = await updateConfig({ [key]: value })
      onConfigUpdate(updatedConfig)
    } catch (error) {
      console.error("설정 업데이트 오류:", error)
      alert("설정 업데이트 중 오류가 발생했습니다.")
    } finally {
      setLoading((prev) => ({ ...prev, [key]: false }))
    }
  }

  const handleCourtUpdate = async (courtId: number, isActive: boolean) => {
    try {
      setLoading((prev) => ({ ...prev, [`court_${courtId}`]: true }))
      const updatedCourt = await updateCourt(courtId, isActive)
      const updatedCourts = courts.map((court) => (court.id === courtId ? updatedCourt : court))
      onCourtsUpdate(updatedCourts)
    } catch (error) {
      console.error("코트 업데이트 오류:", error)
      alert("코트 설정 업데이트 중 오류가 발생했습니다.")
    } finally {
      setLoading((prev) => ({ ...prev, [`court_${courtId}`]: false }))
    }
  }

  const handleUserApproval = async (userId: number, approve: boolean) => {
    try {
      setLoading((prev) => ({ ...prev, [`user_${userId}`]: true }))

      // 승인할 때는 is_active와 is_attendance를 모두 true로 설정
      const updateData = approve ? { is_active: true, is_attendance: true } : { is_active: false }

      const updatedUser = await updateUser(userId, updateData)
      const updatedUsers = allUsers.map((user) => (user.id === userId ? updatedUser : user))
      setAllUsers(updatedUsers)
    } catch (error) {
      console.error("사용자 승인 오류:", error)
      alert("사용자 승인 중 오류가 발생했습니다.")
    } finally {
      setLoading((prev) => ({ ...prev, [`user_${userId}`]: false }))
    }
  }

  return (
    <div className="h-screen flex flex-col bg-gray-50 max-w-md mx-auto">
      {/* Header */}
      <div className="bg-white shadow-sm border-b px-4 py-3 flex items-center">
        <Button variant="ghost" size="icon" onClick={onBack} className="mr-2">
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
                disabled={loading.show_sex}
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
                disabled={loading.show_skill}
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
                disabled={loading.enable_vs}
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
                disabled={loading.enable_undo_game_by_user}
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
                disabled={loading.enable_change_game_by_user}
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
                disabled={loading.enable_add_user_auto}
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
                  disabled={loading[`court_${court.id}`]}
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
                      disabled={loading[`user_${user.id}`]}
                    >
                      거절
                    </Button>
                    <Button
                      size="sm"
                      onClick={() => handleUserApproval(user.id, true)}
                      disabled={loading[`user_${user.id}`]}
                    >
                      {loading[`user_${user.id}`] ? "처리 중..." : "승인"}
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

// 이 페이지는 동적으로 렌더링되어야 함 (환경 변수 필요)
export const dynamic = "force-dynamic"
