import { createRootRoute, Outlet, redirect } from '@tanstack/react-router'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { hasPermission, getRequiredRole } from '@/lib/utils'
import { api } from '@/lib/api'
import '@/styles/globals.css'

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000,
      retry: (failureCount, error: any) => {
        if (error?.status === 401) return false
        return failureCount < 3
      },
    },
  },
})

export const Route = createRootRoute({
  component: RootLayout,
  beforeLoad: async ({ location }) => {
    try {
      const user = await api.auth.getCurrentUser()
      
      if (!user && !location.pathname.startsWith('/auth')) {
        throw redirect({ to: '/auth/login' })
      }
      
      const requiredRole = getRequiredRole(location.pathname)
      if (requiredRole && user && !hasPermission(user, requiredRole)) {
        throw redirect({ to: '/dashboard' })
      }
      
      return { user }
    } catch (error: any) {
      if (error?.status === 401 && !location.pathname.startsWith('/auth')) {
        throw redirect({ to: '/auth/login' })
      }
      return { user: null }
    }
  }
})

function RootLayout() {
  return (
    <QueryClientProvider client={queryClient}>
      <div className="min-h-screen bg-background">
        <Outlet />
      </div>
    </QueryClientProvider>
  )
}