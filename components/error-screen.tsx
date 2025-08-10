import React, { memo } from 'react'
import { AlertCircle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'

interface ErrorScreenProps {
  error?: string
  onRetry?: () => void
  showEnvironmentError?: boolean
}

const ErrorScreen = memo(({ 
  error, 
  onRetry, 
  showEnvironmentError = false 
}: ErrorScreenProps) => {
  if (showEnvironmentError) {
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

  return (
    <div className="h-screen flex items-center justify-center bg-gray-50 max-w-md mx-auto">
      <div className="text-center p-4">
        <p className="text-red-600 mb-4">{error}</p>
        {onRetry && (
          <Button onClick={onRetry}>다시 시도</Button>
        )}
      </div>
    </div>
  )
})

ErrorScreen.displayName = 'ErrorScreen'

export default ErrorScreen