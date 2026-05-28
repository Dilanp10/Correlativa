import { useState, useEffect } from 'react'
import { supabase } from '@/shared/lib/supabase/client'
import type { University } from '@/shared/types'

export function useUniversities() {
  const [universities, setUniversities] = useState<University[]>([])
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    supabase
      .from('universities')
      .select('*')
      .eq('is_active', true)
      .order('name')
      .then(({ data }) => {
        setUniversities(data ?? [])
        setIsLoading(false)
      })
  }, [])

  return { universities, isLoading }
}
