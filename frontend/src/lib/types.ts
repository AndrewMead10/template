export interface LoginData {
  email: string
  password: string
}

export interface RegisterData {
  email: string
  password: string
  confirmPassword: string
}

export interface User {
  id: number
  email: string
  is_active: boolean
  roles: string[]
  created_at?: string
}

export interface ApiError {
  message: string
  code: string
}

export interface DashboardData {
  user_stats: {
    user_id: number
    email: string
    account_created: string
  }
  system_metrics: {
    total_users: number
    active_users: number
    pending_resets: number
  }
}