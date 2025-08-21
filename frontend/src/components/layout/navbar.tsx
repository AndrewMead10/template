import { Link } from '@tanstack/react-router'
import { useAuth } from '@/lib/api'
import { Button } from '@/components/ui/button'
import { LogOut, User, Settings } from 'lucide-react'

export function Navbar() {
  const { user, logout, isAuthenticated } = useAuth()

  const handleLogout = () => {
    logout.mutate()
  }

  if (!isAuthenticated) {
    return null
  }

  return (
    <nav className="bg-white shadow-sm border-b">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16">
          <div className="flex items-center">
            <Link
              to="/"
              className="text-xl font-semibold text-gray-900 hover:text-gray-700"
            >
              Service Template
            </Link>
          </div>
          
          <div className="flex items-center space-x-4">
            <Link
              to="/dashboard"
              className="text-gray-700 hover:text-gray-900 px-3 py-2 rounded-md text-sm font-medium"
            >
              Dashboard
            </Link>
            
            {/* Admin navigation removed */}
            
            <div className="flex items-center space-x-2">
              <div className="flex items-center space-x-2 text-sm text-gray-600">
                <User className="h-4 w-4" />
                <span>{user?.email}</span>
              </div>
              
              <Button
                variant="ghost"
                size="sm"
                onClick={handleLogout}
                disabled={logout.isPending}
              >
                <LogOut className="h-4 w-4" />
                {logout.isPending ? 'Signing out...' : 'Sign out'}
              </Button>
            </div>
          </div>
        </div>
      </div>
    </nav>
  )
}
