import { createClient } from "@supabase/supabase-js"
import type { Database } from "./database.types"

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || ""
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || ""

// 환경 변수가 없을 때는 null을 반환하여 빌드 오류 방지
export const supabaseAdmin =
  supabaseUrl && supabaseServiceKey ? createClient<Database>(supabaseUrl, supabaseServiceKey) : null
