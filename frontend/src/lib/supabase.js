import { createClient } from '@supabase/supabase-js'
import axios from 'axios'

// ✅ ENV VALUES
const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY
export const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000'

// ✅ SUPABASE CLIENT
export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY)

// ✅ AXIOS INSTANCE
export const api = axios.create({
  baseURL: API_URL,
  timeout: 10000, // prevent hanging requests
})

// ✅ REQUEST INTERCEPTOR (ATTACH TOKEN)
api.interceptors.request.use(
  async (config) => {
    try {
      const { data: { session } } = await supabase.auth.getSession()

      const token = session?.access_token

      // 🔥 DEBUG LOG
      console.log("API CALL:", config.url)
      console.log("TOKEN:", token)

      if (token) {
        config.headers.Authorization = `Bearer ${token}`
      }

      return config
    } catch (err) {
      console.error("Interceptor Error:", err)
      return config
    }
  },
  (error) => Promise.reject(error)
)

// ✅ RESPONSE INTERCEPTOR (BETTER ERROR HANDLING)
api.interceptors.response.use(
  (response) => response,
  (error) => {
    console.error("API ERROR:", error)

    // 🔥 IMPORTANT: return original axios error (DON'T WRAP)
    return Promise.reject(error)
  }
)