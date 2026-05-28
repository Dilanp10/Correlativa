import { useState, useEffect } from 'react'
import { supabase } from '@/shared/lib/supabase/client'
import type { CareerWithUniversity } from '@/shared/types'

export function useCareers(universityId: string | null, userId: string) {
  const [careers, setCareers] = useState<CareerWithUniversity[]>([])
  const [isLoading, setIsLoading] = useState(false)

  useEffect(() => {
    if (!universityId) {
      setCareers([])
      return
    }
    setIsLoading(true)
    supabase
      .from('careers')
      .select('*, university:universities(id, name, short_name)')
      .eq('university_id', universityId)
      .eq('is_active', true)
      .or(`is_custom.eq.false,created_by.eq.${userId}`)
      .order('name')
      .then(({ data }) => {
        setCareers((data as CareerWithUniversity[]) ?? [])
        setIsLoading(false)
      })
  }, [universityId, userId])

  async function createCustomCareer(name: string, totalYears: number): Promise<CareerWithUniversity | null> {
    const { data } = await supabase
      .from('careers')
      .insert({ university_id: universityId!, name, total_years: totalYears, is_custom: true, created_by: userId })
      .select('*, university:universities(id, name, short_name)')
      .single()
    return (data as CareerWithUniversity) ?? null
  }

  return { careers, isLoading, createCustomCareer }
}
