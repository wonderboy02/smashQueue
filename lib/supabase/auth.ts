import { supabase } from "./client"
import type { User } from "../../types/database"

// 로컬 스토리지 키
const USER_SESSION_KEY = "smash_queue_user_session"

// 세션에 저장할 사용자 정보 (비밀번호 제외)
interface UserSession {
  id: number
  username: string
  name: string
  sex: "M" | "F"
  skill: "A" | "B" | "C"
  is_guest: boolean
  is_active: boolean
  is_attendance: boolean
  admin_authority: boolean
  user_status: "ready" | "waiting" | "gaming"
  created_at: string
  updated_at: string
}

// Supabase 클라이언트 확인
const checkSupabaseClient = () => {
  if (!supabase) {
    throw new Error("Supabase client is not initialized. Please check your environment variables.")
  }
  return supabase
}

// 세션 저장
export const saveUserSession = (user: User) => {
  try {
    const session: UserSession = {
      id: user.id,
      username: user.username,
      name: user.name,
      sex: user.sex,
      skill: user.skill,
      is_guest: user.is_guest,
      is_active: user.is_active,
      is_attendance: user.is_attendance,
      admin_authority: user.admin_authority,
      user_status: user.user_status,
      created_at: user.created_at,
      updated_at: user.updated_at,
    }
    localStorage.setItem(USER_SESSION_KEY, JSON.stringify(session))
    console.log("✅ User session saved")
  } catch (error) {
    console.error("❌ Failed to save user session:", error)
  }
}

// 세션 불러오기
export const getUserSession = (): UserSession | null => {
  try {
    if (typeof window === "undefined") return null // SSR 환경에서는 localStorage 사용 불가

    const sessionData = localStorage.getItem(USER_SESSION_KEY)
    if (!sessionData) return null

    const session: UserSession = JSON.parse(sessionData)
    console.log("✅ User session loaded:", session.username)
    return session
  } catch (error) {
    console.error("❌ Failed to load user session:", error)
    return null
  }
}

// 세션 삭제
export const clearUserSession = () => {
  try {
    if (typeof window === "undefined") return // SSR 환경에서는 localStorage 사용 불가

    localStorage.removeItem(USER_SESSION_KEY)
    console.log("✅ User session cleared")
  } catch (error) {
    console.error("❌ Failed to clear user session:", error)
  }
}

// 세션 검증 (사용자가 여전히 활성 상태인지 확인)
export const validateUserSession = async (session: UserSession): Promise<User | null> => {
  try {
    const client = checkSupabaseClient()
    const { data, error } = await client
      .from("users")
      .select("*")
      .eq("id", session.id)
      .eq("username", session.username)
      .eq("is_active", true)
      .single()

    if (error) {
      console.error("Session validation error:", error)
      return null
    }

    if (!data) {
      console.log("User not found or inactive, clearing session")
      clearUserSession()
      return null
    }

    console.log("✅ Session validated successfully")
    return data
  } catch (error) {
    console.error("Session validation catch error:", error)
    return null
  }
}

export const login = async (username: string, password: string): Promise<User | null> => {
  try {
    const client = checkSupabaseClient()
    // First check if the username column exists by trying a simple query
    const { data, error } = await client
      .from("users")
      .select("*")
      .eq("username", username)
      .eq("is_active", true)
      .single()

    if (error) {
      console.error("Login error:", error)

      // Check if it's a column not found error
      if (error.message?.includes("column") && error.message?.includes("username")) {
        throw new Error("데이터베이스 마이그레이션이 필요합니다. scripts/06_add_auth_columns.sql을 먼저 실행해주세요.")
      }

      return null
    }

    // In production, you should use proper password hashing (bcrypt)
    // For now, we'll do a simple comparison
    if (data.password === password) {
      // 로그인 성공 시 세션 저장
      saveUserSession(data)
      return data
    }

    return null
  } catch (error) {
    console.error("Login catch error:", error)
    if (error instanceof Error) {
      throw error
    }
    return null
  }
}

export const register = async (userData: {
  username: string
  password: string
  name: string
  sex: "M" | "F"
  skill: "A" | "B" | "C"
  isGuest?: boolean
}): Promise<User | null> => {
  try {
    const client = checkSupabaseClient()
    const { data, error } = await client
      .from("users")
      .insert({
        username: userData.username,
        password: userData.password, // In production, hash this password
        name: userData.name,
        sex: userData.sex,
        skill: userData.skill,
        is_guest: userData.isGuest || false,
        is_active: false, // Requires admin approval
        is_attendance: false,
        admin_authority: false,
        user_status: "ready",
      })
      .select()
      .single()

    if (error) {
      console.error("Register error:", error)

      // Check if it's a column not found error
      if (error.message?.includes("column") && error.message?.includes("username")) {
        throw new Error("데이터베이스 마이그레이션이 필요합니다. scripts/06_add_auth_columns.sql을 먼저 실행해주세요.")
      }

      return null
    }

    return data
  } catch (error) {
    console.error("Register catch error:", error)
    if (error instanceof Error) {
      throw error
    }
    return null
  }
}

export const checkUsernameAvailable = async (username: string): Promise<boolean> => {
  try {
    const client = checkSupabaseClient()
    const { data, error } = await client.from("users").select("id").eq("username", username).single()

    if (error && error.code === "PGRST116") {
      // No rows returned, username is available
      return true
    }

    if (error) {
      console.error("Check username error:", error)
      throw error
    }

    // If we get data, username is taken
    return false
  } catch (error) {
    console.error("Check username catch error:", error)
    throw error
  }
}

// 자동 로그인 (세션 기반)
export const autoLogin = async (): Promise<User | null> => {
  try {
    const session = getUserSession()
    if (!session) {
      console.log("No session found")
      return null
    }

    console.log("🔄 Validating existing session...")
    const user = await validateUserSession(session)

    if (user) {
      // 세션이 유효하면 최신 정보로 세션 업데이트
      saveUserSession(user)
      return user
    }

    return null
  } catch (error) {
    console.error("Auto login error:", error)
    clearUserSession()
    return null
  }
}

// 로그아웃
export const logout = () => {
  clearUserSession()
  console.log("✅ User logged out")
}
