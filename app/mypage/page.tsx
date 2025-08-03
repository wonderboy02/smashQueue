"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { ArrowLeft, User, Settings, LogOut, Shield } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { autoLogin, logout } from "../../lib/supabase/auth"
import type { User as UserType } from "../../types/database"

export default function MyPage() {
  const router = useRouter()
  const [currentUser, setCurrentUser] = useState<UserType | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const loadUserData = async () => {
      try {
        const user = await autoLogin()
        if (!user) {
          router.push("/auth/login")
          return
        }
        setCurrentUser(user)
      } catch (error) {
        console.error("Failed to load user data:", error)
        router.push("/auth/login")
      } finally {
        setLoading(false)
      }
    }

    loadUserData()
  }, [router])

  const handleLogout = async () => {
    try {
      await logout()
      router.push("/auth/login")
    } catch (error) {
      console.error("Logout error:", error)
    }
  }

  const handleGoToAdmin = () => {
    router.push("/admin")
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

  if (!currentUser) {
    return null
  }

  return (
    <div className="h-screen flex flex-col bg-gray-50 max-w-md mx-auto">
      {/* Header */}
      <div className="bg-white shadow-sm border-b px-4 py-3 flex items-center">
        <Button variant="ghost" size="icon" onClick={handleBack} className="mr-2">
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <h1 className="text-xl font-bold text-gray-900">마이페이지</h1>
      </div>

      {/* Content */}
      <div className="flex-1 px-4 py-6 overflow-y-auto">
        <div className="space-y-6">
          {/* User Profile */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <User className="h-5 w-5" />
                프로필
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600">이름</span>
                <span className="font-medium">{currentUser.name}</span>
              </div>
              <Separator />
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600">성별</span>
                <span className="font-medium">{currentUser.sex === "M" ? "남성" : "여성"}</span>
              </div>
              <Separator />
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600">실력</span>
                <Badge variant="outline">{currentUser.skill}급</Badge>
              </div>
              <Separator />
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600">상태</span>
                <Badge
                  variant={
                    currentUser.user_status === "ready"
                      ? "default"
                      : currentUser.user_status === "gaming"
                        ? "secondary"
                        : "outline"
                  }
                >
                  {currentUser.user_status === "ready"
                    ? "준비완료"
                    : currentUser.user_status === "gaming"
                      ? "게임중"
                      : "대기중"}
                </Badge>
              </div>
              {currentUser.is_guest && (
                <>
                  <Separator />
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-600">계정 유형</span>
                    <Badge variant="outline">게스트</Badge>
                  </div>
                </>
              )}
            </CardContent>
          </Card>

          {/* Admin Section */}
          {currentUser.admin_authority && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Shield className="h-5 w-5" />
                  관리자
                </CardTitle>
              </CardHeader>
              <CardContent>
                <Button onClick={handleGoToAdmin} className="w-full bg-transparent" variant="outline">
                  <Settings className="h-4 w-4 mr-2" />
                  관리자 페이지
                </Button>
              </CardContent>
            </Card>
          )}

          {/* Actions */}
          <Card>
            <CardContent className="pt-6">
              <Button onClick={handleLogout} variant="destructive" className="w-full">
                <LogOut className="h-4 w-4 mr-2" />
                로그아웃
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}

export const dynamic = "force-dynamic"
