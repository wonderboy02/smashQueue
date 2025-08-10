import { supabase, supabaseRealtime } from "./client"
import type { Database } from "./database.types"

type User = Database["public"]["Tables"]["users"]["Row"]
type Game = Database["public"]["Tables"]["games"]["Row"]
type Court = Database["public"]["Tables"]["courts"]["Row"]
type Config = Database["public"]["Tables"]["config"]["Row"]

// Supabase 클라이언트가 없을 때 오류 처리
const checkSupabaseClient = () => {
  if (!supabase) {
    throw new Error("Supabase client is not initialized. Please check your environment variables.")
  }
  return supabase
}

// 자동 시작 중인지 확인하는 플래그 (메모리에 저장)
let isAutoStarting = false

// Real-time connection diagnostic function
export const testRealtimeConnection = async () => {
  const client = checkSupabaseClient()
  
  console.log('🔧 Testing single channel realtime connection...')
  
  // Check current auth status
  const { data: { session } } = await client.auth.getSession()
  console.log('🔐 Current session status:', session ? 'authenticated' : 'anonymous')
  
  // Test basic query access
  try {
    const { data: games, error: gamesError } = await client
      .from('games')
      .select('id')
      .limit(1)
    
    if (gamesError) {
      console.error('❌ Games table access error:', gamesError)
    } else {
      console.log('✅ Games table access working, found', games?.length || 0, 'games')
    }
  } catch (err) {
    console.error('❌ Games table query failed:', err)
  }
  
  // Test single channel subscription (same pattern as app)
  console.log('🔧 Testing single channel subscription...')
  console.log('📡 Should NOT see SUBSCRIBED → CLOSED cycles!')
  
  const testChannel = client
    .channel('test-single-channel')
    .on('postgres_changes', { event: '*', schema: 'public', table: 'games' }, (payload) => {
      console.log('✅ Test event received:', payload.eventType)
    })
    .subscribe((status, err) => {
      console.log(`🔌 Test single channel status: ${status}`)
      if (err) {
        console.error('❌ Test subscription error:', JSON.stringify(err, null, 2))
      }
      
      if (status === 'SUBSCRIBED') {
        console.log('✅ Test subscription STABLE - no more CLOSED events expected!')
      } else if (status === 'CLOSED') {
        console.log('❌ Test subscription closed - this should not happen repeatedly!')
      }
    })
  
  // Clean up after 10 seconds
  setTimeout(() => {
    client.removeChannel(testChannel)
    console.log('🧹 Test channel removed cleanly')
  }, 10000)
}

// User status update functions
export const updateUserStatus = async (userId: number, status: "ready" | "waiting" | "gaming") => {
  try {
    const client = checkSupabaseClient()
    const { data, error } = await client
      .from("users")
      .update({ user_status: status })
      .eq("id", userId)
      .select()
      .single()

    if (error) {
      console.error("updateUserStatus error:", error)
      throw error
    }
    return data
  } catch (error) {
    console.error("updateUserStatus catch error:", error)
    throw error
  }
}

export const updateMultipleUserStatus = async (userIds: number[], status: "ready" | "waiting" | "gaming") => {
  try {
    const client = checkSupabaseClient()
    const { data, error } = await client.from("users").update({ user_status: status }).in("id", userIds).select()

    if (error) {
      console.error("updateMultipleUserStatus error:", error)
      throw error
    }
    return data
  } catch (error) {
    console.error("updateMultipleUserStatus catch error:", error)
    throw error
  }
}

// Game delay function
export const delayGame = async (gameId: number) => {
  try {
    const client = checkSupabaseClient()
    console.log(`🕐 Delaying game ${gameId}`)

    // 현재 대기 중인 모든 게임을 가져와서 순서 확인
    const { data: waitingGames, error: waitingError } = await client
      .from("games")
      .select("*")
      .eq("status", "waiting")
      .order("created_at", { ascending: true })

    if (waitingError) {
      console.error("delayGame waiting games error:", waitingError)
      throw waitingError
    }

    if (!waitingGames || waitingGames.length === 0) {
      console.log("No waiting games found")
      return null
    }

    // 현재 게임의 인덱스 찾기
    const currentGameIndex = waitingGames.findIndex((game) => game.id === gameId)

    if (currentGameIndex === -1) {
      console.log("Game not found in waiting queue")
      return null
    }

    // 다음 게임이 있는지 확인
    let newCreatedAt: string

    if (currentGameIndex < waitingGames.length - 1) {
      // 다음 게임이 있으면 그 게임의 created_at + 1초
      const nextGame = waitingGames[currentGameIndex + 1]
      const nextGameTime = new Date(nextGame.created_at)
      newCreatedAt = new Date(nextGameTime.getTime() + 1000).toISOString()
    } else {
      // 마지막 게임이면 현재 시간 + 1초
      newCreatedAt = new Date(Date.now() + 1000).toISOString()
    }

    // 게임의 created_at 업데이트
    const { data, error } = await client
      .from("games")
      .update({
        created_at: newCreatedAt,
        updated_at: new Date().toISOString(), // updated_at도 강제로 업데이트하여 실시간 구독 트리거
      })
      .eq("id", gameId)
      .select()
      .single()

    if (error) {
      console.error("delayGame update error:", error)
      throw error
    }

    console.log(`✅ Game ${gameId} delayed to ${newCreatedAt}`)
    return data
  } catch (error) {
    console.error("delayGame catch error:", error)
    throw error
  }
}

// User queries
export const getUsers = async () => {
  const client = checkSupabaseClient()
  const { data, error } = await client.from("users").select("*").eq("is_active", true).order("name")

  if (error) {
    console.error("getUsers error:", error)
    throw error
  }
  return data || []
}

export const getReadyUsers = async () => {
  const client = checkSupabaseClient()
  const { data, error } = await client
    .from("users")
    .select("*")
    .eq("is_active", true)
    .eq("is_attendance", true)
    .eq("user_status", "ready")
    .order("name")

  if (error) {
    console.error("getReadyUsers error:", error)
    throw error
  }
  return data || []
}

export const getAttendingUsers = async () => {
  const client = checkSupabaseClient()
  const { data, error } = await client
    .from("users")
    .select("*")
    .eq("is_active", true)
    .eq("is_attendance", true)
    .order("name")

  if (error) {
    console.error("getAttendingUsers error:", error)
    throw error
  }
  return data || []
}

export const getAllUsers = async () => {
  const client = checkSupabaseClient()
  const { data, error } = await client.from("users").select("*").order("name")

  if (error) {
    console.error("getAllUsers error:", error)
    throw error
  }
  return data || []
}

export const updateUser = async (id: number, updates: Partial<User>) => {
  const client = checkSupabaseClient()
  const { data, error } = await client.from("users").update(updates).eq("id", id).select().single()

  if (error) {
    console.error("updateUser error:", error)
    throw error
  }
  return data
}

// 모든 게임 조회 (최적화된 JOIN)
export const getGames = async () => {
  try {
    const client = checkSupabaseClient()
    const { data, error } = await client
      .from("games")
      .select(`
        *,
        user_game_relations (
          users (
            id,
            name,
            sex,
            skill,
            is_guest,
            is_active,
            is_attendance,
            user_status,
            admin_authority
          )
        )
      `)
      .order("created_at", { ascending: false })

    if (error) {
      console.error("getGames error:", error)
      throw error
    }

    // 데이터 변환
    const gamesWithUsers = (data || []).map((game) => ({
      ...game,
      users: game.user_game_relations?.map((rel: any) => rel.users).filter(Boolean) || []
    }))

    return gamesWithUsers
  } catch (error) {
    console.error("getGames catch error:", error)
    return []
  }
}

export const getGamesByStatus = async (status: "waiting" | "playing" | "finished") => {
  try {
    const client = checkSupabaseClient()
    
    // 단일 JOIN 쿼리로 N+1 문제 해결
    const { data, error } = await client
      .from("games")
      .select(`
        *,
        user_game_relations (
          users (
            id,
            name,
            sex,
            skill,
            is_guest,
            is_active,
            is_attendance,
            user_status,
            admin_authority
          )
        )
      `)
      .eq("status", status)
      .order("created_at", { ascending: true })

    if (error) {
      console.error(`getGamesByStatus error (${status}):`, error)
      throw error
    }

    // 데이터 변환: user_game_relations을 users 배열로 변환
    const gamesWithUsers = (data || []).map((game) => ({
      ...game,
      users: game.user_game_relations?.map((rel: any) => rel.users).filter(Boolean) || []
    }))

    console.log(`Games loaded (${status}): ${gamesWithUsers.length} games`)
    return gamesWithUsers
  } catch (error) {
    console.error(`getGamesByStatus catch error (${status}):`, error)
    return []
  }
}

// 빈 코트 찾기 함수
export const getAvailableCourt = async () => {
  try {
    const client = checkSupabaseClient()
    console.log("🔍 Checking for available courts...")
    
    // 활성화된 코트들 가져오기
    const { data: courts, error: courtsError } = await client
      .from("courts")
      .select("*")
      .eq("is_active", true)
      .order("id")

    if (courtsError) {
      console.error("getAvailableCourt courts error:", courtsError)
      throw courtsError
    }

    // 현재 게임 중인 코트들 가져오기
    const { data: playingGames, error: gamesError } = await client
      .from("games")
      .select("court_id")
      .eq("status", "playing")
      .not("court_id", "is", null)

    if (gamesError) {
      console.error("getAvailableCourt games error:", gamesError)
      throw gamesError
    }

    const occupiedCourtIds = new Set(playingGames.map((game) => game.court_id))
    const availableCourt = courts.find((court) => !occupiedCourtIds.has(court.id))

    console.log("🏟️ All active courts:", courts.map(c => c.id))
    console.log("🎮 Occupied court IDs:", Array.from(occupiedCourtIds))
    console.log("✅ Available court:", availableCourt?.id || "none")

    return availableCourt || null
  } catch (error) {
    console.error("getAvailableCourt catch error:", error)
    return null
  }
}

export const createGame = async (gameData: {
  court_id?: number
  status: "waiting" | "playing" | "finished"
  userIds: number[]
}) => {
  try {
    const client = checkSupabaseClient()
    console.log("Creating game with data:", gameData)

    // 빈 코트가 있는지 확인
    const availableCourt = await getAvailableCourt()

    let finalStatus = gameData.status
    let finalCourtId = gameData.court_id || null
    let startTime = null
    let countdownTriggered = false

    // 빈 코트가 있고 대기 상태로 게임을 만들려고 하면 일단 waiting으로 생성하고 카운트다운 트리거
    if (availableCourt && gameData.status === "waiting") {
      finalStatus = "waiting" // DB에서는 waiting 상태로 유지
      finalCourtId = availableCourt.id
      countdownTriggered = true
      console.log(`Available court found (${availableCourt.id}), starting 5-second countdown`)
    }

    // Create game
    const { data: game, error: gameError } = await client
      .from("games")
      .insert({
        court_id: finalCourtId,
        status: finalStatus,
        start_time: startTime,
      })
      .select()
      .single()

    if (gameError) {
      console.error("createGame gameError:", gameError)
      throw gameError
    }

    console.log("Created game:", game)

    // Create user-game relations
    const relations = gameData.userIds.map((userId) => ({
      user_id: userId,
      game_id: game.id,
    }))

    console.log("Creating relations:", relations)

    const { data: createdRelations, error: relationsError } = await client
      .from("user_game_relations")
      .insert(relations)
      .select()

    if (relationsError) {
      console.error("createGame relationsError:", relationsError)
      throw relationsError
    }

    console.log("Created relations:", createdRelations)

    // Update user status based on game status
    const userStatus = finalStatus === "playing" ? "gaming" : "waiting"
    await updateMultipleUserStatus(gameData.userIds, userStatus)

    console.log("🎮 Game created:", {
      gameId: game.id,
      finalStatus,
      countdownTriggered,
      finalCourtId,
      originalStatus: gameData.status
    })
    
    return { 
      ...game, 
      autoStarted: finalStatus === "playing" && gameData.status === "waiting",
      countdownTriggered: countdownTriggered,
      courtId: finalCourtId
    }
  } catch (error) {
    console.error("createGame catch error:", error)
    throw error
  }
}

// 대기열에서 다음 게임을 코트로 이동 (개선된 버전)
export const moveNextGameToCourt = async (courtId: number) => {
  try {
    const client = checkSupabaseClient()
    console.log(`🎯 Attempting to move next game to court ${courtId}`)

    // 트랜잭션을 사용하여 race condition 방지
    const { data: waitingGames, error: waitingError } = await client
      .from("games")
      .select("*")
      .eq("status", "waiting")
      .order("created_at", { ascending: true })
      .limit(1)

    if (waitingError) {
      console.error("moveNextGameToCourt waiting error:", waitingError)
      throw waitingError
    }

    if (!waitingGames || waitingGames.length === 0) {
      console.log("❌ No waiting games found")
      return null
    }

    const nextGame = waitingGames[0]
    console.log(`🎮 Found waiting game ${nextGame.id}, moving to court ${courtId}`)

    // 먼저 코트 배정만 하고 카운트다운을 위해 waiting 상태 유지
    const { data: updatedGame, error: updateError } = await client
      .from("games")
      .update({
        court_id: courtId,
        // status는 여전히 waiting으로 유지 - 카운트다운 후에 playing으로 변경
      })
      .eq("id", nextGame.id)
      .eq("status", "waiting") // 여전히 waiting 상태인 경우에만 업데이트
      .select()
      .single()

    if (updateError) {
      console.error("moveNextGameToCourt update error:", updateError)
      // 이미 다른 프로세스에서 처리된 경우일 수 있음
      if (updateError.code === "PGRST116") {
        console.log("⚠️ Game already processed by another process")
        return null
      }
      throw updateError
    }

    if (!updatedGame) {
      console.log("⚠️ Game was already processed by another process")
      return null
    }

    // 해당 게임의 사용자 정보 가져오기 (상태 변경은 카운트다운 후에)
    const { data: relations, error: relationsError } = await client
      .from("user_game_relations")
      .select(`
        user_id,
        users (
          id,
          name,
          sex,
          skill,
          is_guest,
          is_active,
          is_attendance,
          user_status,
          admin_authority
        )
      `)
      .eq("game_id", nextGame.id)

    let gameUsers = []
    if (!relationsError && relations) {
      gameUsers = relations.map((rel: any) => rel.users).filter(Boolean)
      // 사용자 상태는 카운트다운이 끝난 후에 gaming으로 변경
    }

    console.log(`✅ Game ${nextGame.id} assigned to court ${courtId}, waiting for countdown`)
    return {
      ...updatedGame,
      users: gameUsers,
      courtAssigned: true,
      needsCountdown: true // 카운트다운이 필요함을 표시
    }
  } catch (error) {
    console.error("moveNextGameToCourt catch error:", error)
    throw error
  }
}

export const updateGameStatus = async (
  gameId: number,
  status: "playing" | "finished",
  courtId?: number,
) => {
  try {
    const client = checkSupabaseClient()
    console.log(`🔄 Updating game ${gameId} status to ${status}`)

    const updates: any = { status }

    // 게임의 사용자들 가져오기
    const { data: relations, error: relationsError } = await client
      .from("user_game_relations")
      .select("user_id")
      .eq("game_id", gameId)

    if (relationsError) {
      console.error("updateGameStatus relations error:", relationsError)
      throw relationsError
    }

    const userIds = relations?.map((rel) => rel.user_id) || []
    console.log(`Found ${userIds.length} users in game ${gameId}:`, userIds)

    if (status === "playing") {
      updates.start_time = new Date().toISOString()
      if (courtId) updates.court_id = courtId
      // 사용자들을 gaming 상태로 변경
      console.log(`Setting users to gaming status:`, userIds)
      await updateMultipleUserStatus(userIds, "gaming")
    } else if (status === "finished") {
      updates.end_time = new Date().toISOString()
      // 사용자들을 ready 상태로 변경
      console.log(`Setting users to ready status:`, userIds)
      await updateMultipleUserStatus(userIds, "ready")

      // 게임이 끝나면 해당 코트에 대기열에서 다음 게임을 이동 (하나씩만)
      if (courtId) {
        // 즉시 다음 게임 이동
        try {
          console.log(`🔄 Game finished on court ${courtId}, checking for next game...`)
          await moveNextGameToCourt(courtId)
        } catch (error) {
          console.error("Error moving next game to court:", error)
        }
      }
    }

    const { data, error } = await client.from("games").update(updates).eq("id", gameId).select().single()

    if (error) {
      console.error("updateGameStatus error:", error)
      throw error
    }

    console.log(`✅ Game ${gameId} status updated to ${status}`)
    return data
  } catch (error) {
    console.error("updateGameStatus catch error:", error)
    throw error
  }
}

// 빈 코트가 있을 때 대기열에서 자동으로 게임 시작 (개선된 버전)
export const autoStartWaitingGames = async () => {
  try {
    const client = checkSupabaseClient()
    // 이미 자동 시작 중이면 중복 실행 방지
    if (isAutoStarting) {
      console.log("⚠️ Auto-start already in progress, skipping...")
      return
    }

    isAutoStarting = true
    console.log("🔄 Checking for auto-start opportunities...")

    // 활성화된 코트들 가져오기
    const { data: courts, error: courtsError } = await client
      .from("courts")
      .select("*")
      .eq("is_active", true)
      .order("id")

    if (courtsError) {
      console.error("autoStartWaitingGames courts error:", courtsError)
      return
    }

    // 현재 게임 중인 코트들 가져오기
    const { data: playingGames, error: gamesError } = await client
      .from("games")
      .select("court_id")
      .eq("status", "playing")
      .not("court_id", "is", null)

    if (gamesError) {
      console.error("autoStartWaitingGames games error:", gamesError)
      return
    }

    const occupiedCourtIds = new Set(playingGames.map((game) => game.court_id))
    const availableCourts = courts.filter((court) => !occupiedCourtIds.has(court.id))

    console.log("Available courts for auto-start:", availableCourts)

    // 빈 코트가 있으면 하나씩 차례대로 처리
    if (availableCourts.length > 0) {
      // 첫 번째 빈 코트에만 게임을 배정 (한 번에 하나씩)
      const firstAvailableCourt = availableCourts[0]
      console.log(`🎯 Processing court ${firstAvailableCourt.id}`)

      const result = await moveNextGameToCourt(firstAvailableCourt.id)

      if (result) {
        console.log(`✅ Successfully started game on court ${firstAvailableCourt.id}`)

        // 성공적으로 게임을 시작했으면, 다른 빈 코트가 있는지 재귀적으로 확인
        // 하지만 약간의 지연을 두어 race condition 방지
        setTimeout(() => {
          isAutoStarting = false
          autoStartWaitingGames()
        }, 500)
      } else {
        console.log("❌ No more waiting games to start")
        isAutoStarting = false
      }
    } else {
      console.log("❌ No available courts")
      isAutoStarting = false
    }
  } catch (error) {
    console.error("autoStartWaitingGames catch error:", error)
    isAutoStarting = false
  }
}

// Court queries
export const getCourts = async () => {
  try {
    const client = checkSupabaseClient()
    const { data, error } = await client.from("courts").select("*").order("id")

    if (error) {
      console.error("getCourts error:", error)
      throw error
    }
    return data || []
  } catch (error) {
    console.error("getCourts catch error:", error)
    return []
  }
}

export const updateCourt = async (id: number, isActive: boolean) => {
  try {
    const client = checkSupabaseClient()
    
    // 코트를 비활성화할 때, 현재 진행 중인 게임은 그대로 두고
    // 새로운 게임 배정만 막도록 처리
    if (!isActive) {
      console.log(`🚫 Court ${id} being deactivated - current games will continue, new games will not be assigned`)
    }
    
    const { data, error } = await client.from("courts").update({ is_active: isActive }).eq("id", id).select().single()

    if (error) {
      console.error("updateCourt error:", error)
      throw error
    }
    return data
  } catch (error) {
    console.error("updateCourt catch error:", error)
    throw error
  }
}

// Config queries
export const getConfig = async () => {
  try {
    const client = checkSupabaseClient()
    const { data, error } = await client.from("config").select("*").limit(1).single()

    if (error) {
      console.error("getConfig error:", error)
      // If no config exists, create a default one
      if (error.code === "PGRST116") {
        const { data: newConfig, error: createError } = await client
          .from("config")
          .insert({
            show_sex: true,
            show_skill: true,
            enable_vs: true,
            enable_undo_game_by_user: false,
            enable_change_game_by_user: false,
            enable_add_user_auto: false,
            warning_time_minutes: 20,
            danger_time_minutes: 30,
          })
          .select()
          .single()

        if (createError) {
          console.error("getConfig createError:", createError)
          throw createError
        }
        return newConfig
      }
      throw error
    }
    return data
  } catch (error) {
    console.error("getConfig catch error:", error)
    throw error
  }
}

export const updateConfig = async (updates: Partial<Config>) => {
  try {
    const client = checkSupabaseClient()
    // First, get the existing config to find the ID
    const { data: existingConfig } = await client.from("config").select("id").limit(1).single()

    if (!existingConfig) {
      // Create new config if none exists
      const { data, error } = await client
        .from("config")
        .insert({
          show_sex: true,
          show_skill: true,
          enable_vs: true,
          enable_undo_game_by_user: false,
          enable_change_game_by_user: false,
          enable_add_user_auto: false,
          warning_time_minutes: 20,
          danger_time_minutes: 30,
          ...updates,
        })
        .select()
        .single()

      if (error) {
        console.error("updateConfig insert error:", error)
        throw error
      }
      return data
    }

    const { data, error } = await client.from("config").update(updates).eq("id", existingConfig.id).select().single()

    if (error) {
      console.error("updateConfig error:", error)
      throw error
    }
    return data
  } catch (error) {
    console.error("updateConfig catch error:", error)
    throw error
  }
}

// 더 이상 개별 구독 함수는 사용하지 않음 
// useRealtime 훅에서 단일 채널로 통합 관리
