import { useState, useCallback } from 'react'

interface ErrorState {
  message: string
  code?: string
  timestamp: number
}

export const useErrorHandler = () => {
  const [error, setError] = useState<ErrorState | null>(null)
  const [isRetrying, setIsRetrying] = useState(false)

  const handleError = useCallback((err: unknown, context?: string) => {
    console.error(`Error ${context ? `in ${context}` : ''}:`, err)

    let message = '알 수 없는 오류가 발생했습니다.'
    let code: string | undefined

    if (err instanceof Error) {
      message = err.message
      code = (err as any).code
    } else if (typeof err === 'string') {
      message = err
    }

    // 특정 오류에 대한 사용자 친화적 메시지
    if (message.includes('Failed to fetch') || message.includes('NetworkError')) {
      message = '네트워크 연결을 확인해 주세요.'
    } else if (message.includes('마이그레이션') || message.includes('environment')) {
      message = '환경 설정이 필요합니다.'
    } else if (message.includes('PGRST116') || message.includes('not found')) {
      message = '요청한 데이터를 찾을 수 없습니다.'
    } else if (message.includes('PGRST301') || message.includes('permission')) {
      message = '권한이 없습니다.'
    }

    setError({
      message,
      code,
      timestamp: Date.now()
    })
  }, [])

  const clearError = useCallback(() => {
    setError(null)
  }, [])

  const retry = useCallback(async (retryFn: () => Promise<void>) => {
    try {
      setIsRetrying(true)
      clearError()
      await retryFn()
    } catch (err) {
      handleError(err, 'retry')
    } finally {
      setIsRetrying(false)
    }
  }, [handleError, clearError])

  const withErrorHandling = useCallback(<T extends any[], R>(
    fn: (...args: T) => Promise<R>,
    context?: string
  ) => {
    return async (...args: T): Promise<R | null> => {
      try {
        return await fn(...args)
      } catch (err) {
        handleError(err, context)
        return null
      }
    }
  }, [handleError])

  return {
    error,
    isRetrying,
    handleError,
    clearError,
    retry,
    withErrorHandling
  }
}