import React, { memo } from 'react'

interface LoadingScreenProps {
  message?: string
}

const LoadingScreen = memo(({ message = "로딩 중..." }: LoadingScreenProps) => {
  return (
    <div className="h-screen flex items-center justify-center bg-gray-50 max-w-md mx-auto">
      <div className="text-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-2" />
        <p className="text-gray-600">{message}</p>
      </div>
    </div>
  )
})

LoadingScreen.displayName = 'LoadingScreen'

export default LoadingScreen