import { useEffect, useState } from 'react'

/**
 * Задерживает обновление значения.
 * Полезно для поиска — чтобы не делать запросы на каждый введённый символ.
 *
 * @example
 * const debouncedSearch = useDebounce(search, 400)
 * useEffect(() => { fetchResults(debouncedSearch) }, [debouncedSearch])
 */
export function useDebounce<T>(value: T, delay = 300): T {
  const [debounced, setDebounced] = useState<T>(value)

  useEffect(() => {
    const id = setTimeout(() => setDebounced(value), delay)
    return () => clearTimeout(id)
  }, [value, delay])

  return debounced
}
