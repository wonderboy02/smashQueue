export interface User {
  id: number
  username: string
  password: string
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

export interface Game {
  id: number
  court_id: number | null
  start_time: string | null
  end_time: string | null
  status: "waiting" | "playing" | "finished"
  created_at: string
  updated_at: string
  users: User[]
}

export interface Court {
  id: number
  is_active: boolean
  created_at: string
  updated_at: string
}

export interface Config {
  id: number
  show_sex: boolean
  show_skill: boolean
  enable_vs: boolean
  enable_undo_game_by_user: boolean
  enable_change_game_by_user: boolean
  enable_add_user_auto: boolean
  warning_time_minutes: number // n분 후 주황색 (기본값: 20)
  danger_time_minutes: number  // m분 후 빨간색 (기본값: 30)
  created_at: string
  updated_at: string
}

export interface GameWithVs extends Game {
  team1: User[]
  team2: User[]
}
