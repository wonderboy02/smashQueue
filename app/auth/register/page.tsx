"use client"

import type React from "react"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Checkbox } from "@/components/ui/checkbox"
import { ArrowLeft, Eye, EyeOff } from "lucide-react"
import { register, checkUsernameAvailable } from "../../../lib/supabase/auth"

interface RegisterPageProps {
  onBack: () => void
  onRegisterSuccess: () => void
}

export default function RegisterPage({ onBack, onRegisterSuccess }: RegisterPageProps) {
  const [formData, setFormData] = useState({
    username: "",
    password: "",
    confirmPassword: "",
    name: "",
    sex: "" as "M" | "F" | "",
    skill: "" as "A" | "B" | "C" | "",
    isGuest: false,
  })
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")
  const [usernameChecking, setUsernameChecking] = useState(false)
  const [usernameCheckResult, setUsernameCheckResult] = useState<"available" | "taken" | null>(null)

  const handleInputChange = (field: string, value: string | boolean) => {
    setFormData((prev) => ({ ...prev, [field]: value }))
    setError("")

    // 아이디가 변경되면 중복확인 결과 초기화
    if (field === "username") {
      setUsernameCheckResult(null)
    }
  }

  const checkUsername = async () => {
    if (!formData.username.trim()) {
      setError("아이디를 입력해주세요.")
      return
    }

    try {
      setUsernameChecking(true)
      setError("")
      const available = await checkUsernameAvailable(formData.username.trim())

      if (available) {
        setUsernameCheckResult("available")
      } else {
        setUsernameCheckResult("taken")
        setError("이미 사용 중인 아이디입니다.")
      }
    } catch (err) {
      console.error("Username check error:", err)
      setError("아이디 중복확인 중 오류가 발생했습니다.")
    } finally {
      setUsernameChecking(false)
    }
  }

  const validateForm = () => {
    if (!formData.username.trim()) {
      setError("아이디를 입력해주세요.")
      return false
    }
    if (formData.username.length < 3) {
      setError("아이디는 3자 이상이어야 합니다.")
      return false
    }
    if (usernameCheckResult !== "available") {
      setError("아이디 중복확인을 해주세요.")
      return false
    }
    if (!formData.password) {
      setError("비밀번호를 입력해주세요.")
      return false
    }
    if (formData.password.length < 4) {
      setError("비밀번호는 4자 이상이어야 합니다.")
      return false
    }
    if (formData.password !== formData.confirmPassword) {
      setError("비밀번호가 일치하지 않습니다.")
      return false
    }
    if (!formData.name.trim()) {
      setError("이름을 입력해주세요.")
      return false
    }
    if (!formData.sex) {
      setError("성별을 선택해주세요.")
      return false
    }
    if (!formData.skill) {
      setError("실력을 선택해주세요.")
      return false
    }
    return true
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!validateForm()) return

    try {
      setLoading(true)
      setError("")

      const user = await register({
        username: formData.username.trim(),
        password: formData.password,
        name: formData.name.trim(),
        sex: formData.sex,
        skill: formData.skill,
        isGuest: formData.isGuest,
      })

      if (user) {
        onRegisterSuccess()
      } else {
        setError("회원가입 중 오류가 발생했습니다.")
      }
    } catch (err) {
      console.error("Register error:", err)
      setError("회원가입 중 오류가 발생했습니다.")
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="h-screen flex items-center justify-center bg-gray-50 max-w-md mx-auto p-4">
      <Card className="w-full p-6">
        <div className="flex items-center mb-6">
          <Button variant="ghost" size="icon" onClick={onBack} className="mr-2">
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="text-xl font-bold text-gray-900">회원가입</h1>
            <p className="text-sm text-gray-600">새 계정을 만들어보세요</p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="username" className="block text-sm font-medium text-gray-700 mb-1">
              아이디
            </label>
            <div className="flex gap-2">
              <Input
                id="username"
                type="text"
                value={formData.username}
                onChange={(e) => handleInputChange("username", e.target.value)}
                placeholder="아이디 (3자 이상)"
                disabled={loading}
                className="flex-1"
              />
              <Button
                type="button"
                variant="outline"
                onClick={checkUsername}
                disabled={loading || usernameChecking || !formData.username.trim()}
                className="px-3 bg-transparent"
              >
                {usernameChecking ? "확인중..." : "중복확인"}
              </Button>
            </div>
            {usernameCheckResult === "available" && (
              <p className="text-xs text-green-600 mt-1">사용 가능한 아이디입니다.</p>
            )}
          </div>

          <div>
            <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-1">
              비밀번호
            </label>
            <div className="relative">
              <Input
                id="password"
                type={showPassword ? "text" : "password"}
                value={formData.password}
                onChange={(e) => handleInputChange("password", e.target.value)}
                placeholder="비밀번호 (4자 이상)"
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

          <div>
            <label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-700 mb-1">
              비밀번호 확인
            </label>
            <div className="relative">
              <Input
                id="confirmPassword"
                type={showConfirmPassword ? "text" : "password"}
                value={formData.confirmPassword}
                onChange={(e) => handleInputChange("confirmPassword", e.target.value)}
                placeholder="비밀번호를 다시 입력하세요"
                disabled={loading}
                className="w-full pr-10"
              />
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="absolute right-0 top-0 h-full px-3"
                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                disabled={loading}
              >
                {showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </Button>
            </div>
          </div>

          <div>
            <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-1">
              이름
            </label>
            <Input
              id="name"
              type="text"
              value={formData.name}
              onChange={(e) => handleInputChange("name", e.target.value)}
              placeholder="실명을 입력하세요"
              disabled={loading}
              className="w-full"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">성별</label>
            <Select
              value={formData.sex}
              onValueChange={(value: "M" | "F") => handleInputChange("sex", value)}
              disabled={loading}
            >
              <SelectTrigger>
                <SelectValue placeholder="성별을 선택하세요" />
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
              value={formData.skill}
              onValueChange={(value: "A" | "B" | "C") => handleInputChange("skill", value)}
              disabled={loading}
            >
              <SelectTrigger>
                <SelectValue placeholder="실력을 선택하세요" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="A">고수</SelectItem>
                <SelectItem value="B">중수</SelectItem>
                <SelectItem value="C">초보</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="flex items-center space-x-2">
            <Checkbox
              id="isGuest"
              checked={formData.isGuest}
              onCheckedChange={(checked) => handleInputChange("isGuest", checked as boolean)}
              disabled={loading}
            />
            <label htmlFor="isGuest" className="text-sm font-medium text-gray-700">
              게스트로 가입
            </label>
          </div>

          {error && <div className="text-red-600 text-sm text-center bg-red-50 p-2 rounded">{error}</div>}

          <Button type="submit" className="w-full bg-blue-600 hover:bg-blue-700 text-white" disabled={loading}>
            {loading ? "가입 중..." : "회원가입"}
          </Button>
        </form>

        <div className="mt-4 text-xs text-gray-500 text-center">
          <p>회원가입 후 관리자 승인이 필요합니다.</p>
        </div>
      </Card>
    </div>
  )
}
