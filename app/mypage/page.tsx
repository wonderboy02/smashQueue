"use client"

import { useState } from "react"
import { ArrowLeft, Settings, User, Edit, LogOut } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import type { User as UserType } from "../../types/database"
import { updateUser } from "../../lib/supabase/queries"

interface MyPageProps {
  onBack: () => void
  onGoToAdmin: () => void
  onLogout: () => void
  currentUser?: UserType | null
  onUpdateUser: (user: UserType) => void
}

export default function MyPage({ onBack, onGoToAdmin, onLogout, currentUser, onUpdateUser }: MyPageProps) {
  // currentUser가 없으면 기본값 처리
  if (!currentUser) {
    return (
      <div className="h-screen flex items-center justify-center bg-gray-50 max-w-md mx-auto">
        <Card className="p-6">
          <div className="text-center">
            <h2 className="text-xl font-bold text-gray-900 mb-2">사용자 정보를 불러오는 중...</h2>
            <Button onClick={onBack} variant="outline">
              돌아가기
            </Button>
          </div>
        </Card>
      </div>
    )
  }

  const [isEditing, setIsEditing] = useState(false)
  const [loading, setLoading] = useState(false)
  const [editForm, setEditForm] = useState({
    name: currentUser.name || '',
    sex: currentUser.sex || 'M',
    skill: currentUser.skill || 'C',
  })

  const skillMapping = {
    고수: "A" as const,
    중수: "B" as const,
    초보: "C" as const,
  }

  const skillReverseMapping = {
    A: "고수",
    B: "중수",
    C: "초보",
  }

  const handleSave = async () => {
    try {
      setLoading(true)
      const updatedUser = await updateUser(currentUser.id, {
        name: editForm.name,
        sex: editForm.sex,
        skill: editForm.skill,
      })
      onUpdateUser(updatedUser)
      setIsEditing(false)
    } catch (error) {
      console.error("사용자 정보 업데이트 오류:", error)
      alert("정보 업데이트 중 오류가 발생했습니다.")
    } finally {
      setLoading(false)
    }
  }

  const handleSkillChange = (skillText: string) => {
    const mappedSkill = skillMapping[skillText as keyof typeof skillMapping]
    setEditForm((prev) => ({ ...prev, skill: mappedSkill }))
  }

  return (
    <div className="h-screen flex flex-col bg-gray-50 max-w-md mx-auto">
      {/* Header */}
      <div className="bg-white shadow-sm border-b px-4 py-3 flex items-center">
        <Button variant="ghost" size="icon" onClick={onBack} className="mr-2">
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <h1 className="text-xl font-bold text-gray-900">마이페이지</h1>
        {!isEditing && (
          <Button variant="ghost" size="icon" onClick={() => setIsEditing(true)} className="ml-auto">
            <Edit className="h-4 w-4" />
          </Button>
        )}
      </div>

      {/* Content */}
      <div className="flex-1 px-4 py-4 overflow-y-auto space-y-4">
        {/* 프로필 정보 */}
        <Card className="p-4">
          <h2 className="text-lg font-semibold mb-4 flex items-center">
            <User className="h-5 w-5 mr-2" />
            프로필 정보
          </h2>

          {isEditing ? (
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">이름</label>
                <Input
                  value={editForm.name}
                  onChange={(e) => setEditForm((prev) => ({ ...prev, name: e.target.value }))}
                  placeholder="이름을 입력하세요"
                  disabled={loading}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">성별</label>
                <Select
                  value={editForm.sex}
                  onValueChange={(value: "M" | "F") => setEditForm((prev) => ({ ...prev, sex: value }))}
                  disabled={loading}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="M">남성</SelectItem>
                    <SelectItem value="F">여성</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">실력</label>
                <Select
                  value={skillReverseMapping[editForm.skill]}
                  onValueChange={handleSkillChange}
                  disabled={loading}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="고수">고수</SelectItem>
                    <SelectItem value="중수">중수</SelectItem>
                    <SelectItem value="초보">초보</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="flex gap-2 pt-2">
                <Button onClick={handleSave} className="flex-1" disabled={loading}>
                  {loading ? "저장 중..." : "저장"}
                </Button>
                <Button
                  variant="outline"
                  onClick={() => {
                    setIsEditing(false)
                    setEditForm({
                      name: currentUser.name || '',
                      sex: currentUser.sex || 'M',
                      skill: currentUser.skill || 'C',
                    })
                  }}
                  className="flex-1"
                  disabled={loading}
                >
                  취소
                </Button>
              </div>
            </div>
          ) : (
            <div className="space-y-3">
              <div className="flex justify-between">
                <span className="text-gray-600">아이디</span>
                <span className="font-medium">{currentUser.username}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">이름</span>
                <span className="font-medium">{currentUser.name}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">성별</span>
                <span className="font-medium">{currentUser.sex === "M" ? "남성" : "여성"}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">실력</span>
                <span className="font-medium">{skillReverseMapping[currentUser.skill]}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">상태</span>
                <div className="flex gap-2">
                  {currentUser.is_guest && (
                    <span className="text-xs bg-orange-100 text-orange-800 px-2 py-1 rounded">게스트</span>
                  )}
                  {currentUser.admin_authority && (
                    <span className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded">관리자</span>
                  )}
                  {currentUser.is_attendance && (
                    <span className="text-xs bg-green-100 text-green-800 px-2 py-1 rounded">출석</span>
                  )}
                </div>
              </div>
            </div>
          )}
        </Card>

        {/* 관리자 메뉴 */}
        {currentUser.admin_authority && (
          <Card className="p-4">
            <h2 className="text-lg font-semibold mb-3 flex items-center">
              <Settings className="h-5 w-5 mr-2" />
              관리자 메뉴
            </h2>
            <Button onClick={onGoToAdmin} className="w-full bg-transparent" variant="outline">
              관리자 설정 페이지
            </Button>
          </Card>
        )}

        {/* 기타 메뉴 */}
        <Card className="p-4">
          <h2 className="text-lg font-semibold mb-3">기타</h2>
          <div className="space-y-2">
            <Button variant="ghost" className="w-full justify-start text-gray-700">
              출석 기록
            </Button>
            <Button variant="ghost" className="w-full justify-start text-gray-700">
              게임 기록
            </Button>
            <Button
              variant="ghost"
              className="w-full justify-start text-red-600 hover:text-red-700 hover:bg-red-50"
              onClick={onLogout}
            >
              <LogOut className="h-4 w-4 mr-2" />
              로그아웃
            </Button>
          </div>
        </Card>
      </div>
    </div>
  )
}
