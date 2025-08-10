import React, { memo } from 'react'
import { RefreshCw } from 'lucide-react'
import { Button } from '@/components/ui/button'
import type { User } from '../types/database'

interface NavigationBarProps {
  currentUser: User
  realtimeConnected: boolean
  refreshing: boolean
  onMenuClick: () => void
  onRefresh: () => void
}

const NavigationBar = memo(({ 
  currentUser, 
  realtimeConnected, 
  refreshing, 
  onMenuClick, 
  onRefresh 
}: NavigationBarProps) => {
  return (
    <div className="bg-white shadow-sm border-b px-4 py-3 flex items-center justify-between">
      <h1 className="text-xl font-bold text-gray-900">스매시큐</h1>
      <div className="flex items-center gap-2">
        <Button 
          variant="ghost" 
          size="icon" 
          onClick={onRefresh} 
          disabled={refreshing} 
          className="h-8 w-8"
        >
          <RefreshCw className={`h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} />
        </Button>

        <div className="flex items-center gap-1 text-xs text-gray-500">
          <div className={`w-2 h-2 rounded-full ${
            realtimeConnected ? 'bg-green-500' : 'bg-red-500'
          }`} />
          {realtimeConnected ? '연결됨' : '연결안됨'}
        </div>
        
        <div className="text-xs text-gray-700 font-medium">
          {currentUser.name} 님
        </div>
        
        <Button variant="ghost" size="icon" onClick={onMenuClick}>
          <span className="text-lg">☰</span>
        </Button>
      </div>
    </div>
  )
})

NavigationBar.displayName = 'NavigationBar'

export default NavigationBar