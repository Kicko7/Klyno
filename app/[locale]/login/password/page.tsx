"use client"

import { ChangePassword } from "@/components/utility/change-password"
import { supabase } from "@/lib/supabase/browser-client"
import { useRouter } from "next/navigation"
import { useEffect, useState } from "react"

export default function ChangePasswordPage() {
  // State to track if we're still checking authentication
  const [loading, setLoading] = useState(true)

  // Get the router for navigation
  const router = useRouter()

  useEffect(() => {
    // Self-executing async function to check authentication status
    ;(async () => {
      // Get the current user session from Supabase
      const session = (await supabase.auth.getSession()).data.session

      // If no active session exists, redirect to login page
      if (!session) {
        router.push("/login")
      } else {
        // User is authenticated, allow access to password change
        setLoading(false)
      }
    })()
  }, [router]) // Include router in dependency array to avoid React Hook warning

  // Show nothing while checking authentication
  if (loading) {
    return null
  }

  // Render the password change component once authenticated
  return <ChangePassword />
}
