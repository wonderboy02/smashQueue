"use client"

import { useState, useEffect } from "react"
import { Users, Play, Square, AlertCircle, RefreshCw } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import GameMaking from "./game-making/page"
import AdminPage from "./admin/page"
import MyPage from "./mypage/page"
import type { User, Game, Court, Config } from "../types/database"
import {
  getUsers,
  getCourts,
  getConfig,
  getGamesByStatus,
  subscribeToGames,
  subscribeToUsers,
  createGame,
  updateGameStatus,
  autoStartWaitingGames,
  delayGame,
} from "../lib/supabase/queries"
import { autoLogin, logout } from "../lib/supabase/auth"
import LoginPage from "./auth/login/page"
import RegisterPage from "./auth/register/page"
import QueueCard from "../components/queue-card"
import QueueEditModal from "../components/queue-edit-modal"
import { supabase } from "../lib/supabase/client"

export default function HomePage() {
  const [currentPage, setCurrentPage] = useState<"home" | "game-making" | "admin" | "mypage">("home")
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // 현재 사용자
  const [currentUser, setCurrentUser] = useState<User | null>(null)
  const [config, setConfig] = useState<Config | null>(null)
  const [courts, setCourts] = useState<Court[]>([])
  const [users, setUsers] = useState<User[]>([])
  const [playingGames, setPlayingGames] = useState<Game[]>([])
  const [waitingGames, setWaitingGames] = useState<Game[]>([])
  const [timers, setTimers] = useState<{ [key: number]: number }>({})
  const [selectedCourt, setSelectedCourt] = useState<{ court: Court; game: Game | null } | null>(null)
  const [editingGame, setEditingGame] = useState<Game | null>(null)

  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [authPage, setAuthPage] = useState<"login" | "register">("login")
  const [migrationError, setMigrationError] = useState(false)
  const [sessionLoading, setSessionLoading] = useState(true)

  const getUserDisplayName = (user: User) => {
    if (!config) return user.name

    const skillMapping = {
      A: "고수",
      B: "중수",
      C: "초보",
    }

    let displayName = user.name

    if (config.show_skill) {
      displayName = `${user.name}(${skillMapping[user.skill]})`
    }

    // 게스트인 경우 이름 뒤에 작은 guest 텍스트 추가
    if (user.is_guest) {
      displayName += " guest"
    }

    return displayName
  }

  const getUserTokenStyle = (user: User) => {
    if (!config) return "px-2 py-1 rounded text-sm bg-gray-100 text-gray-800"

    let baseStyle = "px-2 py-1 rounded text-sm "

    if (config.show_sex) {
      if (user.sex === "M") {
        baseStyle += "bg-blue-100 text-blue-800 "
      } else {
        baseStyle += "bg-pink-100 text-pink-800 "
      }
    } else {
      baseStyle += "bg-gray-100 text-gray-800 "
    }

    return baseStyle
  }

  // 페이지 로드 시 세션 확인
  useEffect(() => {
    checkSession()
  }, [])

  // 인증된 후 데이터 로드
  useEffect(() => {
    if (isAuthenticated && !migrationError) {
      loadInitialData()
    }
  }, [isAuthenticated, migrationError])

  // 실시간 구독
  useEffect(() => {
    if (!isAuthenticated || migrationError || !supabase) return

    let gamesSubscription: any
    let usersSubscription: any

    try {
      gamesSubscription = subscribeToGames(() => {
        console.log("🔄 Games subscription triggered, reloading games...")
        loadGames()
      })

      usersSubscription = subscribeToUsers(() => {
        console.log("🔄 Users subscription triggered, reloading users...")
        loadUsers()
      })

      console.log("✅ Real-time subscriptions established")
    } catch (error) {
      console.error("❌ Subscription error:", error)
    }

    return () => {
      try {
        if (gamesSubscription) gamesSubscription.unsubscribe()
        if (usersSubscription) usersSubscription.unsubscribe()
        console.log("🔌 Subscriptions unsubscribed")
      } catch (error) {
        console.error("❌ Unsubscribe error:", error)
      }
    }
  }, [isAuthenticated, migrationError])

  // 타이머 업데이트
  useEffect(() => {
    if (!isAuthenticated || migrationError) return

    const interval = setInterval(() => {
      const newTimers: { [key: number]: number } = {}
      playingGames.forEach((game) => {
        if (game.start_time && game.court_id) {
          newTimers[game.court_id] = Math.floor((Date.now() - new Date(game.start_time).getTime()) / 1000)
        }
      })
      setTimers(newTimers)
    }, 1000)

    return () => clearInterval(interval)
  }, [playingGames, isAuthenticated, migrationError])

  // 페이지 로드 시 자동 게임 시작 체크
  useEffect(() => {
    if (isAuthenticated && !migrationError && waitingGames.length > 0) {
      // 페이지 로드 후 1초 뒤에 자동 시작 체크
      const timer = setTimeout(() => {
        autoStartWaitingGames()
      }, 1000)

      return () => clearTimeout(timer)
    }
  }, [isAuthenticated, migrationError, waitingGames.length])

  // 세션 확인
  const checkSession = async () => {
    try {
      setSessionLoading(true)
      console.log("🔄 Checking existing session...")

      // Supabase 클라이언트가 없으면 환경 변수 오류
      if (!supabase) {
        setMigrationError(true)
        setIsAuthenticated(false)
        return
      }

      const user = await autoLogin()
      if (user) {
        console.log("✅ Auto login successful:", user.username)
        setCurrentUser(user)
        setIsAuthenticated(true)
        setMigrationError(false)
      } else {
        console.log("❌ No valid session found")
        setIsAuthenticated(false)
      }
    } catch (err) {
      console.error("❌ Session check error:", err)
      const errorMessage = err instanceof Error ? err.message : "세션 확인 중 오류가 발생했습니다."

      if (errorMessage.includes("마이그레이션") || errorMessage.includes("environment")) {
        setMigrationError(true)
      }

      setIsAuthenticated(false)
    } finally {
      setSessionLoading(false)
    }
  }

  const loadInitialData = async () => {
    try {
      setLoading(true)
      setError(null)

      // Load data sequentially to avoid overwhelming the database
      await loadUsers()
      await loadCourts()
      await loadConfig()
      await loadGames()
    } catch (err) {
      console.error("Initial data load error:", err)
      const errorMessage = err instanceof Error ? err.message : "데이터 로드 중 오류가 발생했습니다."

      if (errorMessage.includes("마이그레이션") || errorMessage.includes("environment")) {
        setMigrationError(true)
      }

      setError(errorMessage)
    } finally {
      setLoading(false)
    }
  }

  const loadUsers = async () => {
    try {
      const usersData = await getUsers()
      setUsers(usersData)
    } catch (err) {
      console.error("사용자 로드 오류:", err)
      throw err
    }
  }

  const loadCourts = async () => {
    try {
      const courtsData = await getCourts()
      setCourts(courtsData)
    } catch (err) {
      console.error("코트 로드 오류:", err)
      throw err
    }
  }

  const loadConfig = async () => {
    try {
      const configData = await getConfig()
      setConfig(configData)
    } catch (err) {
      console.error("설정 로드 오류:", err)
      throw err
    }
  }

  const loadGames = async () => {
    try {
      console.log("🔄 Loading games...")
      const [playingData, waitingData] = await Promise.all([getGamesByStatus("playing"), getGamesByStatus("waiting")])

      console.log("✅ Loaded playing games:", playingData)
      console.log("✅ Loaded waiting games:", waitingData)

      setPlayingGames(playingData)
      setWaitingGames(waitingData)
    } catch (err) {
      console.error("❌ 게임 로드 오류:", err)
      // Don't throw here, just log the error
    }
  }

  // 수동 새로고침 함수
  const handleManualRefresh = async () => {
    try {
      setRefreshing(true)
      console.log("🔄 Manual refresh triggered")

      // 모든 데이터를 새로 로드
      await Promise.all([loadUsers(), loadCourts(), loadConfig(), loadGames()])

      console.log("✅ Manual refresh completed")
    } catch (err) {
      console.error("❌ Manual refresh error:", err)
      alert("새로고침 중 오류가 발생했습니다.")
    } finally {
      setRefreshing(false)
    }
  }

  const formatTime = (seconds: number) => {
    const minutes = Math.floor(seconds / 60)
    const remainingSeconds = seconds % 60
    return `${minutes.toString().padStart(2, "0")}:${remainingSeconds.toString().padStart(2, "0")}`
  }

  const handleGameToQueue = async (gameId: number) => {
    try {
      console.log(`🔄 Moving game ${gameId} back to queue`)
      await updateGameStatus(gameId, "waiting")
      // 실시간 구독으로 자동 업데이트됨
    } catch (err) {
      console.error("❌ 게임 대기열 이동 오류:", err)
      alert("게임을 대기열로 이동하는 중 오류가 발생했습니다.")
    }
  }

  const handleLogin = (user: User) => {
    setCurrentUser(user)
    setIsAuthenticated(true)
    setMigrationError(false)
    // 로그인 후 데이터는 useEffect에서 자동으로 로드됨
  }

  const handleLogout = () => {
    logout() // 세션 정리
    setCurrentUser(null)
    setIsAuthenticated(false)
    setCurrentPage("home")
  }

  const handleRegisterSuccess = () => {
    setAuthPage("login")
    alert("회원가입이 완료되었습니다. 관리자 승인 후 로그인할 수 있습니다.")
  }

  const addToQueue = async (selectedUsers: User[], team1?: User[], team2?: User[]) => {
    try {
      console.log("🎮 Adding to queue:", selectedUsers)
      const result = await createGame({
        status: "waiting",
        userIds: selectedUsers.map((user) => user.id),
      })

      if (result.autoStarted) {
        console.log("🚀 Game auto-started on available court!")
      }

      setCurrentPage("home")
      // 게임 목록을 즉시 새로고침
      setTimeout(() => {
        loadGames()
        loadUsers() // 사용자 상태도 새로고침
      }, 500)
    } catch (err) {
      console.error("❌ 게임 생성 오류:", err)
      alert("게임 생성 중 오류가 발생했습니다.")
    }
  }

  const handleGameFinish = async (gameId: number, courtId: number) => {
    try {
      console.log(`🏁 Finishing game ${gameId} on court ${courtId}`)
      await updateGameStatus(gameId, "finished", courtId)

      // 강제로 즉시 새로고침
      loadGames()
      loadUsers()

      // 추가로 1초 후에 한 번 더 새로고침
      setTimeout(() => {
        loadGames()
        loadUsers()
      }, 1000)

      // 2초 후에 한 번 더 새로고침 (확실하게)
      setTimeout(() => {
        loadGames()
        loadUsers()
      }, 2000)
    } catch (err) {
      console.error("❌ 게임 종료 오류:", err)
      alert("게임 종료 중 오류가 발생했습니다.")
    }
  }

  const handleMenuClick = () => {
    setCurrentPage("mypage")
  }

  // 게임 짜기 페이지로 이동 시 데이터 새로고침
  const handleGoToGameMaking = async () => {
    try {
      console.log("🔄 Refreshing data before going to game making...")

      // 최신 데이터 로드
      await Promise.all([loadUsers(), loadGames()])

      setCurrentPage("game-making")
    } catch (err) {
      console.error("❌ 게임 짜기 데이터 로드 오류:", err)
      // 오류가 있어도 페이지는 이동
      setCurrentPage("game-making")
    }
  }

  const handleEditGame = (game: Game) => {
    setEditingGame(game)
  }

  const handleDeleteGame = async (game: Game) => {
    if (confirm("정말로 이 게임을 삭제하시겠습니까?")) {
      try {
        // 게임 삭제 로직 (user_game_relations도 함께 삭제됨)
        if (!supabase) throw new Error("Supabase client not available")

        const { error } = await supabase.from("games").delete().eq("id", game.id)
        if (error) throw error

        // 게임 목록 새로고침
        loadGames()
        loadUsers() // 사용자 상태도 새로고침
      } catch (err) {
        console.error("게임 삭제 오류:", err)
        alert("게임 삭제 중 오류가 발생했습니다.")
      }
    }
  }

  const handleDelayGame = async (game: Game) => {
    try {
      console.log(`🕐 Delaying game ${game.id}`)
      await delayGame(game.id)

      // 즉시 새로고침과 약간의 지연 후 한 번 더 새로고침
      loadGames()
      setTimeout(() => {
        loadGames()
      }, 1000)
    } catch (err) {
      console.error("게임 미루기 오류:", err)
      alert("게임 미루기 중 오류가 발생했습니다.")
    }
  }

  const handleSaveEditedGame = async (gameId: number, newUserIds: number[]) => {
    try {
      if (!supabase) throw new Error("Supabase client not available")

      // 기존 관계 삭제
      await supabase.from("user_game_relations").delete().eq("game_id", gameId)

      // 새로운 관계 생성
      const relations = newUserIds.map((userId) => ({
        user_id: userId,
        game_id: gameId,
      }))

      const { error } = await supabase.from("user_game_relations").insert(relations)
      if (error) throw error

      setEditingGame(null)
      loadGames()
      loadUsers() // 사용자 상태도 새로고침
    } catch (err) {
      console.error("게임 수정 오류:", err)
      alert("게임 수정 중 오류가 발생했습니다.")
    }
  }

  // 세션 로딩 중
  if (sessionLoading) {
    return (
      <div className="h-screen flex items-center justify-center bg-gray-50 max-w-md mx-auto">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-2"></div>
          <p className="text-gray-600">세션 확인 중...</p>
        </div>
      </div>
    )
  }

  // Show migration error screen
  if (migrationError) {
    return (
      <div className="h-screen flex items-center justify-center bg-gray-50 max-w-md mx-auto p-4">
        <Card className="w-full p-6">
          <div className="text-center">
            <AlertCircle className="h-12 w-12 text-yellow-600 mx-auto mb-4" />
            <h2 className="text-xl font-bold text-gray-900 mb-2">환경 설정 필요</h2>
            <p className="text-gray-600 mb-4">환경 변수를 설정해주세요:</p>
            <div className="bg-gray-50 p-4 rounded-lg text-left mb-4">
              <div className="space-y-1 text-sm font-mono">
                <div>NEXT_PUBLIC_SUPABASE_URL</div>
                <div>NEXT_PUBLIC_SUPABASE_ANON_KEY</div>
                <div>SUPABASE_SERVICE_ROLE_KEY</div>
              </div>
            </div>
            <Button onClick={() => window.location.reload()} className="w-full">
              새로고침
            </Button>
          </div>
        </Card>
      </div>
    )
  }

  // Authentication pages
  if (!isAuthenticated) {
    if (authPage === "register") {
      return <RegisterPage onBack={() => setAuthPage("login")} onRegisterSuccess={handleRegisterSuccess} />
    }
    return <LoginPage onLogin={handleLogin} onGoToRegister={() => setAuthPage("register")} />
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

  if (error) {
    return (
      <div className="h-screen flex items-center justify-center bg-gray-50 max-w-md mx-auto">
        <div className="text-center p-4">
          <p className="text-red-600 mb-4">{error}</p>
          <Button onClick={loadInitialData}>다시 시도</Button>
        </div>
      </div>
    )
  }

  if (!currentUser || !config) {
    return (
      <div className="h-screen flex items-center justify-center bg-gray-50 max-w-md mx-auto">
        <p className="text-gray-600">데이터를 불러오는 중...</p>
      </div>
    )
  }

  if (currentPage === "mypage") {
    return (
      <MyPage
        onBack={() => setCurrentPage("home")}
        onGoToAdmin={() => setCurrentPage("admin")}
        onLogout={handleLogout}
        currentUser={currentUser}
        onUpdateUser={(user) => {
          setCurrentUser(user)
          loadUsers() // 사용자 목록 새로고침
        }}
      />
    )
  }

  if (currentPage === "game-making") {
    return (
      <GameMaking
        onBack={() => setCurrentPage("home")}
        onAddToQueue={addToQueue}
        users={users}
        config={config}
        playingGames={playingGames}
        waitingGames={waitingGames}
        getUserDisplayName={getUserDisplayName}
        getUserTokenStyle={getUserTokenStyle}
      />
    )
  }

  if (currentPage === "admin") {
    return (
      <AdminPage
        onBack={() => setCurrentPage("home")}
        config={config}
        courts={courts}
        playingGames={playingGames}
        waitingGames={waitingGames}
        onConfigUpdate={setConfig}
        onCourtsUpdate={setCourts}
      />
    )
  }

  return (
    <div className="h-screen flex flex-col bg-gray-50 max-w-md mx-auto">
      {/* Navigation Bar */}
      <div className="bg-white shadow-sm border-b px-4 py-3 flex items-center justify-between">
        <h1 className="text-xl font-bold text-gray-900">스매시큐</h1>
        <div className="flex items-center gap-2">
          {/* 수동 새로고침 버튼 */}
          <Button variant="ghost" size="icon" onClick={handleManualRefresh} disabled={refreshing} className="h-8 w-8">
            <RefreshCw className={`h-4 w-4 ${refreshing ? "animate-spin" : ""}`} />
          </Button>

          <div className="flex items-center gap-1 text-xs text-gray-500">
            <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
            실시간
          </div>
          <div className="text-xs text-gray-700 font-medium">{currentUser?.name} 님</div>
          <Button variant="ghost" size="icon" onClick={handleMenuClick}>
            <span className="text-lg">☰</span>
          </Button>
        </div>
      </div>

      {/* Court Status */}
      <div className="bg-white px-4 py-4 border-b">
        <div className="flex gap-3 justify-center">
          {courts
            .filter((court) => court.is_active)
            .map((court) => {
              const game = playingGames.find((g) => g.court_id === court.id)
              return (
                <div key={court.id} className="flex flex-col items-center">
                  <div
                    className={`w-16 h-16 rounded-lg flex flex-col items-center justify-center text-xs font-medium cursor-pointer transition-all hover:scale-105 ${
                      game
                        ? "bg-green-100 border-2 border-green-300 text-green-800 hover:bg-green-200"
                        : "bg-gray-100 border-2 border-gray-300 text-gray-500 hover:bg-gray-200"
                    }`}
                    onClick={() => setSelectedCourt({ court, game })}
                  >
                    <div className="text-xs mb-1">코트 {court.id}</div>
                    {game && timers[court.id] !== undefined && (
                      <div className="text-xs font-bold">{formatTime(timers[court.id])}</div>
                    )}
                  </div>
                </div>
              )
            })}
        </div>
      </div>

      {/* Queue Section */}
      <div className="flex-1 px-4 py-4 overflow-hidden">
        <div className="mb-4">
          <h2 className="text-lg font-semibold text-gray-900 mb-3">
            대기열 {waitingGames.length > 0 && `(${waitingGames.length}개)`}
          </h2>
          <div className="space-y-2">
            {waitingGames.slice(0, 3).map((game, index) => (
              <QueueCard
                key={game.id}
                game={game}
                index={index}
                config={config}
                currentUser={currentUser}
                getUserDisplayName={getUserDisplayName}
                getUserTokenStyle={getUserTokenStyle}
                onEdit={handleEditGame}
                onDelete={handleDeleteGame}
                onDelay={handleDelayGame}
              />
            ))}
          </div>

          {waitingGames.length > 3 && (
            <Button variant="outline" className="w-full mt-3 bg-transparent" size="sm">
              <Users className="h-4 w-4 mr-2" />
              대기열 모두보기 ({waitingGames.length}개)
            </Button>
          )}

          {waitingGames.length === 0 && (
            <div className="text-center py-6 text-gray-500">
              <Users className="h-10 w-10 mx-auto mb-2 opacity-30" />
              <p>대기 중인 게임이 없습니다</p>
              <p className="text-xs mt-1">빈 코트가 있으면 바로 게임이 시작됩니다!</p>
            </div>
          )}
        </div>
      </div>

      {/* Bottom Button */}
      <div className="p-4 bg-white border-t">
        <Button
          className="w-full bg-blue-600 hover:bg-blue-700 text-white py-3 text-lg font-medium"
          onClick={handleGoToGameMaking}
        >
          <Play className="h-5 w-5 mr-2" />
          게임 짜기
        </Button>
      </div>

      {/* Court Detail Modal */}
      {selectedCourt && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg p-6 w-full max-w-sm">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold">코트 {selectedCourt.court.id}</h3>
              <Button variant="ghost" size="icon" onClick={() => setSelectedCourt(null)}>
                ✕
              </Button>
            </div>

            {selectedCourt.game ? (
              <div className="space-y-3">
                <div className="text-center">
                  <div className="text-2xl font-bold text-green-600 mb-2">
                    {timers[selectedCourt.court.id] !== undefined && formatTime(timers[selectedCourt.court.id])}
                  </div>
                  <div className="text-sm text-gray-600">게임 진행 중</div>
                </div>

                <div>
                  <h4 className="font-medium mb-2">플레이어</h4>
                  {config?.enable_vs ? (
                    <div className="space-y-2">
                      <div>
                        <div className="text-xs text-gray-600 mb-1">좌측</div>
                        <div className="flex flex-wrap gap-1">
                          {selectedCourt.game.users.slice(0, 2).map((user) => (
                            <div key={user.id} className={getUserTokenStyle(user) + " text-xs px-2 py-0.5"}>
                              {getUserDisplayName(user)}
                            </div>
                          ))}
                        </div>
                      </div>
                      <div className="text-center text-xs text-gray-500">VS</div>
                      <div>
                        <div className="text-xs text-gray-600 mb-1">우측</div>
                        <div className="flex flex-wrap gap-1">
                          {selectedCourt.game.users.slice(2, 4).map((user) => (
                            <div key={user.id} className={getUserTokenStyle(user) + " text-xs px-2 py-0.5"}>
                              {getUserDisplayName(user)}
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="flex flex-wrap gap-1">
                      {selectedCourt.game.users.map((user) => (
                        <div key={user.id} className={getUserTokenStyle(user) + " text-xs px-2 py-0.5"}>
                          {getUserDisplayName(user)}
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                <div className="space-y-2">
                  <div className="text-xs text-gray-600">
                    시작 시간: {new Date(selectedCourt.game.start_time!).toLocaleTimeString("ko-KR")}
                  </div>
                </div>

                <Button
                  className="w-full bg-red-600 hover:bg-red-700 text-white"
                  onClick={() => {
                    handleGameFinish(selectedCourt.game!.id, selectedCourt.court.id)
                    setSelectedCourt(null)
                  }}
                >
                  <Square className="h-4 w-4 mr-2" />
                  게임 종료
                </Button>

                {currentUser?.admin_authority && (
                  <Button
                    variant="outline"
                    className="w-full bg-transparent"
                    onClick={() => {
                      handleGameToQueue(selectedCourt.game!.id)
                      setSelectedCourt(null)
                    }}
                  >
                    대기열로 돌리기
                  </Button>
                )}
              </div>
            ) : (
              <div className="text-center py-8">
                <div className="text-gray-400 mb-4">
                  <div className="w-12 h-12 bg-gray-100 rounded-lg mx-auto mb-2 flex items-center justify-center">
                    <span className="text-2xl">🏸</span>
                  </div>
                </div>
                <p className="text-gray-600 mb-4">비어있는 코트입니다</p>
                <div className="text-xs text-gray-500">대기열에 게임이 있으면 자동으로 시작됩니다</div>
              </div>
            )}
          </div>
        </div>
      )}
      {/* Queue Edit Modal */}
      {editingGame && (
        <QueueEditModal
          game={editingGame}
          users={users}
          config={config}
          onClose={() => setEditingGame(null)}
          onSave={handleSaveEditedGame}
          getUserDisplayName={getUserDisplayName}
          getUserTokenStyle={getUserTokenStyle}
        />
      )}
    </div>
  )
}

// 이 페이지는 동적으로 렌더링되어야 함 (환경 변수 필요)
export const dynamic = "force-dynamic"
