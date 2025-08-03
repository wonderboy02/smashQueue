"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { ArrowLeft, Settings, LogOut, User } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Switch } from "@/components/ui/switch"
import type { User as UserType } from "../../types/database"
import { autoLogin, logout } from "../../lib/supabase/auth"
import { updateUser } from "../../lib/supabase/queries"

export default function MyPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [currentUser, setCurrentUser] = useState<UserType | null>(null)
  const [formData, setFormData] = useState({
    name: "",
    sex: "M" as "M" | "F",
    skill: "B" as "A" | "B" | "C",
    is_attendance: false,
  })

  useEffect(() => {
    checkAuth()
  }, [])

  const checkAuth = async () => {
    try {
      setLoading(true)
      const user = await autoLogin()
      if (!user) {
        router.push("/")
        return
      }
      setCurrentUser(user)
      setFormData({
        name: user.name,
        sex: user.sex,
        skill: user.skill,
        is_attendance: user.is_attendance,
      })
    } catch (error) {
      console.error("Auth check error:", error)
      router.push("/")
    } finally {
      setLoading(false)
    }
  }

  const handleSave = async () => {
    if (!currentUser) return

    try {
      setSaving(true)
      const updatedUser = await updateUser(currentUser.id, formData)
      setCurrentUser(updatedUser)
      alert("정보가 저장되었습니다.")
    } catch (error) {
      console.error("Save error:", error)
      alert("저장 중 오류가 발생했습니다.")
    } finally {
      setSaving(false)
    }
  }

  const handleLogout = () => {
    logout()
    router.push("/")
  }

  const handleGoToAdmin = () => {
    router.push("/admin")
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

  if (!currentUser) {
    return (
      <div className="h-screen flex items-center justify-center bg-gray-50 max-w-md mx-auto">
        <p className="text-gray-600">사용자 정보를 불러올 수 없습니다.</p>
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
          <h1 className="text-xl font-bold text-gray-900">내 정보</h1>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 p-4 overflow-y-auto">
        <div className="space-y-4">
          {/* Profile Card */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <User className="h-5 w-5" />
                프로필 정보
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="name">이름</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="이름을 입력하세요"
                />
              </div>

              <div>
                <Label htmlFor="sex">성별</Label>
                <Select
                  value={formData.sex}
                  onValueChange={(value: "M" | "F") => setFormData({ ...formData, sex: value })}
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
                <Label htmlFor="skill">실력</Label>
                <Select
                  value={formData.skill}
                  onValueChange={(value: "A" | "B" | "C") => setFormData({ ...formData, skill: value })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="A">고수</SelectItem>
                    <SelectItem value="B">중수</SelectItem>
                    <SelectItem value="C">초보</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="flex items-center justify-between">
                <Label htmlFor="attendance">출석 상태</Label>
                <Switch
                  id="attendance"
                  checked={formData.is_attendance}
                  onCheckedChange={(checked) => setFormData({ ...formData, is_attendance: checked })}
                />
              </div>
            </CardContent>
          </Card>

          {/* Settings Card */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Settings className="h-5 w-5" />
                설정
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {currentUser.admin_authority && (
                <Button variant="outline" className="w-full justify-start bg-transparent" onClick={handleGoToAdmin}>
                  <Settings className="h-4 w-4 mr-2" />
                  관리자 페이지
                </Button>
              )}

              <Button
                variant="outline"
                className="w-full justify-start text-red-600 hover:text-red-700 bg-transparent"
                onClick={handleLogout}
              >
                <LogOut className="h-4 w-4 mr-2" />
                로그아웃
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Save Button */}
      <div className="p-4 bg-white border-t">
        <Button className="w-full" onClick={handleSave} disabled={saving}>
          {saving ? "저장 중..." : "저장"}
        </Button>
      </div>
    </div>
  )
}

// 동적 렌더링 강제
export const dynamic = "force-dynamic"
