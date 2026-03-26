import { createClient } from '@supabase/supabase-js'
import axios from 'axios'

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY
export const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000'

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY)

// Axios instance — auto-attaches Supabase JWT to every request
export const api = axios.create({ baseURL: API_URL })

api.interceptors.request.use(async (config) => {
  const { data: { session } } = await supabase.auth.getSession()
  if (session?.access_token) {
    config.headers.Authorization = `Bearer ${session.access_token}`
  }
  return config
})

api.interceptors.response.use(
  res => res,
  err => {
    const msg = err.response?.data?.detail || err.message || 'Something went wrong'
    return Promise.reject(new Error(msg))
  }
)
