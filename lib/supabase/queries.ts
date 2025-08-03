import { supabase } from "./client"
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

// Game queries with improved N:N relationship handling
export const getGames = async () => {
  try {
    const client = checkSupabaseClient()
    const { data, error } = await client
      .from("games")
      .select(`
        *,
        user_game_relations!inner (
          users (*)
        )
      `)
      .order("created_at", { ascending: false })

    if (error) {
      console.error("getGames error:", error)
      throw error
    }

    console.log("Raw games data:", data)
    return data || []
  } catch (error) {
    console.error("getGames catch error:", error)
    return []
  }
}

export const getGamesByStatus = async (status: "waiting" | "playing" | "finished") => {
  try {
    const client = checkSupabaseClient()
    // 먼저 해당 상태의 게임들을 가져옴 (created_at 기준 오름차순 정렬 - 먼저 만든 게임이 앞에)
    const { data: games, error: gamesError } = await client
      .from("games")
      .select("*")
      .eq("status", status)
      .order("created_at", { ascending: true }) // 대기열은 먼저 만든 순서대로

    if (gamesError) {
      console.error("getGamesByStatus games error:", gamesError)
      throw gamesError
    }

    console.log(`Games with status ${status}:`, games)

    // 각 게임에 대해 사용자 정보를 별도로 가져옴
    const gamesWithUsers = await Promise.all(
      games.map(async (game) => {
        const { data: relations, error: relationsError } = await client
          .from("user_game_relations")
          .select(`
            users (*)
          `)
          .eq("game_id", game.id)

        if (relationsError) {
          console.error("getGamesByStatus relations error:", relationsError)
          return { ...game, users: [] }
        }

        console.log(`Relations for game ${game.id}:`, relations)

        const users = relations?.map((rel: any) => rel.users).filter(Boolean) || []
        return { ...game, users }
      }),
    )

    console.log(`Final games with users (${status}):`, gamesWithUsers)
    return gamesWithUsers
  } catch (error) {
    console.error("getGamesByStatus catch error:", error)
    return []
  }
}

// 빈 코트 찾기 함수
export const getAvailableCourt = async () => {
  try {
    const client = checkSupabaseClient()
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

    console.log("Available courts:", courts)
    console.log("Occupied court IDs:", Array.from(occupiedCourtIds))
    console.log("Available court:", availableCourt)

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

    // 빈 코트가 있고 대기 상태로 게임을 만들려고 하면 바로 플레이 상태로 변경
    if (availableCourt && gameData.status === "waiting") {
      finalStatus = "playing"
      finalCourtId = availableCourt.id
      startTime = new Date().toISOString()
      console.log(`Available court found (${availableCourt.id}), starting game immediately`)
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

    return { ...game, autoStarted: finalStatus === "playing" && gameData.status === "waiting" }
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

    // 게임을 플레이 상태로 변경 (한 번에 하나씩만 처리)
    const { data: updatedGame, error: updateError } = await client
      .from("games")
      .update({
        status: "playing",
        court_id: courtId,
        start_time: new Date().toISOString(),
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

    // 해당 게임의 사용자들을 gaming 상태로 변경
    const { data: relations, error: relationsError } = await client
      .from("user_game_relations")
      .select("user_id")
      .eq("game_id", nextGame.id)

    if (!relationsError && relations) {
      const userIds = relations.map((rel) => rel.user_id)
      await updateMultipleUserStatus(userIds, "gaming")
      console.log(`✅ Updated ${userIds.length} users to gaming status`)
    }

    console.log(`✅ Game ${nextGame.id} successfully moved to court ${courtId}`)
    return updatedGame
  } catch (error) {
    console.error("moveNextGameToCourt catch error:", error)
    throw error
  }
}

export const updateGameStatus = async (
  gameId: number,
  status: "waiting" | "playing" | "finished",
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
    } else if (status === "waiting") {
      // 대기열로 돌릴 때는 코트와 시작시간을 초기화
      updates.court_id = null
      updates.start_time = null
      // 사용자들을 waiting 상태로 변경
      console.log(`Setting users to waiting status:`, userIds)
      await updateMultipleUserStatus(userIds, "waiting")
    } else if (status === "finished") {
      updates.end_time = new Date().toISOString()
      // 사용자들을 ready 상태로 변경
      console.log(`Setting users to ready status:`, userIds)
      await updateMultipleUserStatus(userIds, "ready")

      // 게임이 끝나면 해당 코트에 대기열에서 다음 게임을 이동 (하나씩만)
      if (courtId) {
        setTimeout(async () => {
          try {
            console.log(`🔄 Game finished on court ${courtId}, checking for next game...`)
            await moveNextGameToCourt(courtId)
          } catch (error) {
            console.error("Error moving next game to court:", error)
          }
        }, 1000) // 1초 후에 다음 게임 이동
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

// Real-time subscriptions
export const subscribeToGames = (callback: (payload: any) => void) => {
  const client = checkSupabaseClient()
  return client
    .channel("games")
    .on("postgres_changes", { event: "*", schema: "public", table: "games" }, callback)
    .on("postgres_changes", { event: "*", schema: "public", table: "user_game_relations" }, callback)
    .subscribe()
}

export const subscribeToUsers = (callback: (payload: any) => void) => {
  const client = checkSupabaseClient()
  return client
    .channel("users")
    .on("postgres_changes", { event: "*", schema: "public", table: "users" }, callback)
    .subscribe()
}
