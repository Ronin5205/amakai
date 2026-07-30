"use client"

import * as React from "react"
import type { User } from "@supabase/supabase-js"

import { getUsername } from "@/lib/auth/user"
import { createClient } from "@/utils/supabase/client"

export function usePortalSession() {
  const [user, setUser] = React.useState<User | null>(null)
  const [isLoading, setIsLoading] = React.useState(true)

  React.useEffect(() => {
    const supabase = createClient()

    supabase.auth.getUser().then(({ data }) => {
      setUser(data.user)
      setIsLoading(false)
    })

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null)
      setIsLoading(false)
    })

    return () => subscription.unsubscribe()
  }, [])

  const signOut = React.useCallback(async () => {
    const supabase = createClient()
    await supabase.auth.signOut()
    setUser(null)
  }, [])

  return {
    user,
    username: getUsername(user),
    isSignedIn: user !== null,
    isLoading,
    signOut,
  }
}
