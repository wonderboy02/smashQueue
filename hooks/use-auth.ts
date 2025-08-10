import { useState, useEffect, useCallback } from 'react'
import type { User } from '../types/database'
import { autoLogin, logout } from '../lib/supabase/auth'
import { supabase } from '../lib/supabase/client'

export const useAuth = () => {
  const [currentUser, setCurrentUser] = useState<User | null>(null)
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [sessionLoading, setSessionLoading] = useState(true)
  const [migrationError, setMigrationError] = useState(false)

  // 세션 확인
  const checkSession = useCallback(async () => {
    try {
      setSessionLoading(true)
      console.log('🔄 Checking existing session...')

      if (!supabase) {
        setMigrationError(true)
        setIsAuthenticated(false)
        return
      }

      const user = await autoLogin()
      if (user) {
        console.log('✅ Auto login successful:', user.username)
        setCurrentUser(user)
        setIsAuthenticated(true)
        setMigrationError(false)
      } else {
        console.log('❌ No valid session found')
        setIsAuthenticated(false)
      }
    } catch (err) {
      console.error('❌ Session check error:', err)
      const errorMessage = err instanceof Error ? err.message : '세션 확인 중 오류가 발생했습니다.'

      if (errorMessage.includes('마이그레이션') || errorMessage.includes('environment')) {
        setMigrationError(true)
      }

      setIsAuthenticated(false)
    } finally {
      setSessionLoading(false)
    }
  }, [])

  // 로그인 처리
  const handleLogin = useCallback((user: User) => {
    setCurrentUser(user)
    setIsAuthenticated(true)
    setMigrationError(false)
  }, [])

  // 로그아웃 처리
  const handleLogout = useCallback(() => {
    logout()
    setCurrentUser(null)
    setIsAuthenticated(false)
  }, [])

  // 사용자 업데이트
  const updateCurrentUser = useCallback((user: User) => {
    setCurrentUser(user)
  }, [])

  // 초기 세션 체크
  useEffect(() => {
    checkSession()
  }, [checkSession])

  return {
    currentUser,
    isAuthenticated,
    sessionLoading,
    migrationError,
    handleLogin,
    handleLogout,
    updateCurrentUser,
    checkSession
  }
}