import { createClient } from "@supabase/supabase-js"
import type { Database } from "./database.types"

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || ""
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ""

// 환경 변수가 없을 때는 null을 반환하여 빌드 오류 방지
export const supabase = supabaseUrl && supabaseAnonKey ? createClient<Database>(
  supabaseUrl, 
  supabaseAnonKey,
  {
    realtime: {
      params: {
        eventsPerSecond: 10
      }
    },
    auth: {
      autoRefreshToken: true,
      persistSession: true,
      detectSessionInUrl: false
    }
  }
) : null

// 항상 리얼타임에 토큰을 명시 주입 (supabase-js v2 인증 꼬임 방지)
async function syncRealtimeAuth() {
  if (!supabase) return
  
  console.log('🔧 Syncing realtime authentication...')
  const { data: { session } } = await supabase.auth.getSession()
  const token = session?.access_token ?? supabaseAnonKey
  
  console.log('🔐 Setting realtime auth token:', session ? 'session token' : 'anon key')
  supabase.realtime.setAuth(token)
}

// 브라우저에서만 실행 (SSR 방지)
if (typeof window !== 'undefined' && supabase) {
  // 초기 인증 동기화
  syncRealtimeAuth()
  
  // 인증 상태 변경 시 토큰 재설정
  supabase.auth.onAuthStateChange((_event, session) => {
    const token = session?.access_token ?? supabaseAnonKey
    console.log('🔄 Auth state changed, updating realtime token:', session ? 'session token' : 'anon key')
    supabase.realtime.setAuth(token)
  })
}

// 실시간은 메인 클라이언트를 사용 (별도 클라이언트 불필요)
export const supabaseRealtime = supabase
