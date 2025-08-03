"use client"

import type React from "react"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Eye, EyeOff, AlertCircle } from "lucide-react"
import { login } from "../../../lib/supabase/auth"
import type { User } from "../../../types/database"

interface LoginPageProps {
  onLogin: (user: User) => void
  onGoToRegister: () => void
}

export default function LoginPage({ onLogin, onGoToRegister }: LoginPageProps) {
  const [username, setUsername] = useState("")
  const [password, setPassword] = useState("")
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!username.trim() || !password.trim()) {
      setError("아이디와 비밀번호를 입력해주세요.")
      return
    }

    try {
      setLoading(true)
      setError("")

      const user = await login(username.trim(), password)

      if (user) {
        onLogin(user)
      } else {
        setError("아이디 또는 비밀번호가 올바르지 않습니다.")
      }
    } catch (err) {
      console.error("Login error:", err)
      if (err instanceof Error) {
        setError(err.message)
      } else {
        setError("로그인 중 오류가 발생했습니다.")
      }
    } finally {
      setLoading(false)
    }
  }

  const isMigrationError = error.includes("마이그레이션")

  return (
    <div className="h-screen flex items-center justify-center bg-gray-50 max-w-md mx-auto p-4">
      <Card className="w-full p-6">
        <div className="text-center mb-6">
          <h1 className="text-2xl font-bold text-gray-900 mb-2">스매시큐</h1>
          <p className="text-gray-600">배드민턴 대기열 관리</p>
        </div>

        {isMigrationError && (
          <div className="mb-4 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
            <div className="flex items-start">
              <AlertCircle className="h-5 w-5 text-yellow-600 mt-0.5 mr-2 flex-shrink-0" />
              <div className="text-sm">
                <p className="font-medium text-yellow-800 mb-1">데이터베이스 설정 필요</p>
                <p className="text-yellow-700 mb-2">다음 스크립트를 순서대로 실행해주세요:</p>
                <ol className="list-decimal list-inside text-yellow-700 space-y-1 text-xs">
                  <li>scripts/06_add_auth_columns.sql</li>
                  <li>scripts/07_update_existing_data.sql</li>
                </ol>
              </div>
            </div>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="username" className="block text-sm font-medium text-gray-700 mb-1">
              아이디
            </label>
            <Input
              id="username"
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="아이디를 입력하세요"
              disabled={loading}
              className="w-full"
            />
          </div>

          <div>
            <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-1">
              비밀번호
            </label>
            <div className="relative">
              <Input
                id="password"
                type={showPassword ? "text" : "password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="비밀번호를 입력하세요"
                disabled={loading}
                className="w-full pr-10"
              />
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="absolute right-0 top-0 h-full px-3"
                onClick={() => setShowPassword(!showPassword)}
                disabled={loading}
              >
                {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </Button>
            </div>
          </div>

          {error && !isMigrationError && (
            <div className="text-red-600 text-sm text-center bg-red-50 p-2 rounded">{error}</div>
          )}

          <Button
            type="submit"
            className="w-full bg-blue-600 hover:bg-blue-700 text-white"
            disabled={loading || isMigrationError}
          >
            {loading ? "로그인 중..." : "로그인"}
          </Button>
        </form>

        <div className="mt-6 text-center">
          <p className="text-sm text-gray-600">
            계정이 없으신가요?{" "}
            <Button
              variant="link"
              className="p-0 h-auto text-blue-600 hover:text-blue-700"
              onClick={onGoToRegister}
              disabled={loading || isMigrationError}
            >
              회원가입
            </Button>
          </p>
        </div>

        {!isMigrationError && (
          <div className="mt-4 text-xs text-gray-500 text-center">
            <p>테스트 계정:</p>
            <p>아이디: admin / 비밀번호: admin123</p>
          </div>
        )}
      </Card>
    </div>
  )
}
