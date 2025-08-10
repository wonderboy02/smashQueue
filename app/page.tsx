"use client"

import { useState, useCallback, useEffect } from "react"
import { Play } from "lucide-react"
import { Button } from "@/components/ui/button"

// Pages
import GameMaking from "./game-making/page"
import AdminPage from "./admin/page"
import MyPage from "./mypage/page"
import LoginPage from "./auth/login/page"
import RegisterPage from "./auth/register/page"

// Components
import NavigationBar from "../components/navigation-bar"
import CourtStatus from "../components/court-status"
import QueueSection from "../components/queue-section"
import CourtDetailModal from "../components/court-detail-modal"
import QueueEditModal from "../components/queue-edit-modal"
import LoadingScreen from "../components/loading-screen"
import ErrorScreen from "../components/error-screen"

// Hooks
import { useAuth } from "../hooks/use-auth"
import { useGameData } from "../hooks/use-game-data"
import { useRealtime } from "../hooks/use-realtime"
import { useTimers } from "../hooks/use-timers"

// Types
import type { User, Game, Court } from "../types/database"
import { supabase } from "../lib/supabase/client"

export default function HomePage() {
  // Page state
  const [currentPage, setCurrentPage] = useState<"home" | "game-making" | "admin" | "mypage">("home")
  const [authPage, setAuthPage] = useState<"login" | "register">("login")
  const [refreshing, setRefreshing] = useState(false)
  
  // Modal state
  const [selectedCourt, setSelectedCourt] = useState<{ court: Court; game: Game | null } | null>(null)
  const [editingGame, setEditingGame] = useState<Game | null>(null)
  

  // Custom hooks
  const auth = useAuth()
  const gameData = useGameData()
  const timers = useTimers(gameData.playingGames)
  
  // User display helper functions
  const getUserDisplayName = useCallback((user: User) => {
    if (!gameData.config) return user.name

    const skillMapping = {
      A: "고수",
      B: "중수", 
      C: "초보",
    }

    let displayName = user.name

    if (gameData.config.show_skill) {
      displayName = `${user.name}(${skillMapping[user.skill]})`
    }

    if (user.is_guest) {
      displayName += " guest"
    }

    return displayName
  }, [gameData.config])

  const getUserTokenStyle = useCallback((user: User) => {
    if (!gameData.config) return "px-2 py-1 rounded text-sm bg-gray-100 text-gray-800"

    let baseStyle = "px-2 py-1 rounded text-sm "

    if (gameData.config.show_sex) {
      if (user.sex === "M") {
        baseStyle += "bg-blue-100 text-blue-800 "
      } else {
        baseStyle += "bg-pink-100 text-pink-800 "
      }
    } else {
      baseStyle += "bg-gray-100 text-gray-800 "
    }

    return baseStyle
  }, [gameData.config])

  // 게임 데이터 업데이트 핸들러 (optimistic update 고려)
  const handleGameStatusChange = useCallback((payload?: any) => {
    // 실시간 업데이트용 - 자신의 optimistic update는 무시
    gameData.loadGamesFromRealtime()
  }, [gameData])

  // Users 업데이트 핸들러 (payload 대응)
  const handleUsersUpdate = useCallback((payload?: any) => {
    // payload가 있든 없든 사용자 데이터 새로고침
    gameData.refreshUsers()
  }, [gameData])

  // Courts 업데이트 핸들러 (실시간 코트 변경사항)
  const handleCourtsUpdate = useCallback((payload?: any) => {
    console.log('🏟️ Courts update received:', payload?.eventType)
    // 코트 데이터만 새로고침
    gameData.refreshCourts()
  }, [gameData])

  // 코트 배정 콜백 (자동 배정 시 카운트다운 시작)
  const handleCourtAssignment = useCallback((courtId: number, gameId: number, players: string[]) => {
    console.log('🔔 Auto court assignment - starting countdown:', { courtId, gameId })
    timers.startCountdown(gameId, courtId)
  }, [timers])

  // Realtime hook
  const { realtimeConnected } = useRealtime({
    isAuthenticated: auth.isAuthenticated,
    onGamesUpdate: handleGameStatusChange,
    onUsersUpdate: handleUsersUpdate,
    onCourtsUpdate: handleCourtsUpdate,
    onCourtAssignment: handleCourtAssignment
  })

  // Initialize data when authenticated
  useEffect(() => {
    if (auth.isAuthenticated && !auth.migrationError) {
      gameData.loadInitialData()
    }
  }, [auth.isAuthenticated, auth.migrationError])

  // Event handlers
  const handleManualRefresh = useCallback(async () => {
    try {
      setRefreshing(true)
      await Promise.all([
        gameData.refreshUsers(),
        gameData.loadGames()
      ])
    } catch (err) {
      console.error('Manual refresh error:', err)
      alert('새로고침 중 오류가 발생했습니다.')
    } finally {
      setRefreshing(false)
    }
  }, [gameData])

  const handleCourtClick = useCallback((court: Court, game: Game | null) => {
    setSelectedCourt({ court, game })
  }, [])


  const handleRegisterSuccess = useCallback(() => {
    setAuthPage('login')
    alert('회원가입이 완료되었습니다. 관리자 승인 후 로그인할 수 있습니다.')
  }, [])

  const handleAddToQueue = useCallback(async (selectedUsers: User[]) => {
    try {
      const result = await gameData.addToQueue(selectedUsers)
      
      if (result.countdownTriggered && result.courtId) {
        // 타이머 시작만 하고 팝업 알림은 표시하지 않음
        timers.startCountdown(result.id, result.courtId)
      }
      
      setCurrentPage('home')
    } catch (err) {
      alert('게임 생성 중 오류가 발생했습니다.')
    }
  }, [gameData, timers, getUserDisplayName])

  const handleGameFinish = useCallback(async (gameId: number, courtId: number) => {
    try {
      // 1. 즉시 코트 타이머 초기화
      timers.clearCourtTimer(courtId)
      
      // 2. 게임 상태 업데이트 (optimistic update로 즉시 UI 반영)
      await gameData.updateGame(gameId, 'finished', courtId)
    } catch (err) {
      alert('게임 종료 중 오류가 발생했습니다.')
    }
  }, [gameData, timers])

  const handleGoToGameMaking = useCallback(async () => {
    try {
      await Promise.all([gameData.refreshUsers(), gameData.loadGames()])
      setCurrentPage('game-making')
    } catch (err) {
      setCurrentPage('game-making')
    }
  }, [gameData])

  const handleEditGame = useCallback((game: Game) => {
    setEditingGame(game)
  }, [])

  const handleDeleteGame = useCallback(async (game: Game) => {
    if (confirm('정말로 이 게임을 삭제하시겠습니까?')) {
      try {
        if (!supabase) throw new Error('Supabase client not available')
        const { error } = await supabase.from('games').delete().eq('id', game.id)
        if (error) throw error
      } catch (err) {
        alert('게임 삭제 중 오류가 발생했습니다.')
      }
    }
  }, [])

  const handleSaveEditedGame = useCallback(async (gameId: number, newUserIds: number[]) => {
    try {
      if (!supabase) throw new Error('Supabase client not available')

      await supabase.from('user_game_relations').delete().eq('game_id', gameId)
      
      const relations = newUserIds.map(userId => ({
        user_id: userId,
        game_id: gameId,
      }))

      const { error } = await supabase.from('user_game_relations').insert(relations)
      if (error) throw error

      setEditingGame(null)
    } catch (err) {
      alert('게임 수정 중 오류가 발생했습니다.')
    }
  }, [])

  // Loading and error states
  if (auth.sessionLoading) {
    return <LoadingScreen message="세션 확인 중..." />
  }

  if (auth.migrationError) {
    return <ErrorScreen showEnvironmentError />
  }

  if (!auth.isAuthenticated) {
    if (authPage === 'register') {
      return (
        <RegisterPage 
          onBack={() => setAuthPage('login')} 
          onRegisterSuccess={handleRegisterSuccess} 
        />
      )
    }
    return (
      <LoginPage 
        onLogin={auth.handleLogin} 
        onGoToRegister={() => setAuthPage('register')} 
      />
    )
  }

  if (gameData.loading) {
    return <LoadingScreen />
  }

  if (gameData.error) {
    return <ErrorScreen error={gameData.error} onRetry={gameData.loadInitialData} />
  }

  if (!auth.currentUser || !gameData.config) {
    return <LoadingScreen message="데이터를 불러오는 중..." />
  }

  // Page navigation
  if (currentPage === 'mypage') {
    return (
      <MyPage
        onBack={() => setCurrentPage('home')}
        onGoToAdmin={() => setCurrentPage('admin')}
        onLogout={auth.handleLogout}
        currentUser={auth.currentUser}
        onUpdateUser={(user) => {
          auth.updateCurrentUser(user)
          gameData.refreshUsers()
        }}
      />
    )
  }

  if (currentPage === 'game-making') {
    return (
      <GameMaking
        onBack={() => setCurrentPage('home')}
        onAddToQueue={handleAddToQueue}
        users={gameData.users}
        config={gameData.config}
        playingGames={gameData.playingGames}
        waitingGames={gameData.waitingGames}
        getUserDisplayName={getUserDisplayName}
        getUserTokenStyle={getUserTokenStyle}
      />
    )
  }

  if (currentPage === 'admin') {
    return (
      <AdminPage
        onBack={() => setCurrentPage('home')}
        config={gameData.config}
        courts={gameData.courts}
        playingGames={gameData.playingGames}
        waitingGames={gameData.waitingGames}
        onConfigUpdate={gameData.setConfig}
        onCourtsUpdate={gameData.setCourts}
      />
    )
  }

  // Main home page
  return (
    <div data-role="root" className="h-screen flex flex-col bg-gray-50 max-w-md mx-auto">
      <NavigationBar
        currentUser={auth.currentUser}
        realtimeConnected={realtimeConnected}
        refreshing={refreshing}
        onMenuClick={() => setCurrentPage('mypage')}
        onRefresh={handleManualRefresh}
      />

      <CourtStatus
        courts={gameData.courts}
        playingGames={gameData.playingGames}
        countdownGames={timers.countdownGames}
        courtCountdowns={timers.courtCountdowns}
        waitingGames={gameData.waitingGames}
        formatTime={timers.formatTime}
        timers={timers.timers}
        onCourtClick={handleCourtClick}
        onStartTestCountdown={timers.startTestCountdown}
        warningTimeMinutes={gameData.config?.warning_time_minutes || 20}
        dangerTimeMinutes={gameData.config?.danger_time_minutes || 30}
      />

      <QueueSection
        waitingGames={gameData.waitingGames}
        countdownGames={timers.countdownGames}
        courtCountdowns={timers.courtCountdowns}
        config={gameData.config}
        currentUser={auth.currentUser}
        getUserDisplayName={getUserDisplayName}
        getUserTokenStyle={getUserTokenStyle}
        onEdit={handleEditGame}
        onDelete={handleDeleteGame}
        onDelay={gameData.handleDelayGame}
      />

      <div className="p-4 bg-white border-t">
        <Button
          className="w-full bg-blue-600 hover:bg-blue-700 text-white py-3 text-lg font-medium"
          onClick={handleGoToGameMaking}
        >
          <Play className="h-5 w-5 mr-2" />
          게임 짜기
        </Button>
      </div>

      {selectedCourt && (
        <CourtDetailModal
          court={selectedCourt.court}
          game={selectedCourt.game}
          timers={timers.timers}
          config={gameData.config}
          currentUser={auth.currentUser}
          formatTime={timers.formatTime}
          getUserDisplayName={getUserDisplayName}
          getUserTokenStyle={getUserTokenStyle}
          onClose={() => setSelectedCourt(null)}
          onGameFinish={handleGameFinish}
        />
      )}

      {editingGame && (
        <QueueEditModal
          game={editingGame}
          users={gameData.users}
          config={gameData.config}
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
