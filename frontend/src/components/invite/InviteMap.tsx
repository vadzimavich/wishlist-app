'use client'

import { useEffect, useRef, useState } from 'react'
import { MapPin } from 'lucide-react'

interface Props {
  location: string | null
  latitude: number | null
  longitude: number | null
}

export function InviteMap({ location, latitude, longitude }: Props) {
  const mapRef = useRef<HTMLDivElement>(null)
  const [mapLoaded, setMapLoaded] = useState(false)
  const [mapError, setMapError] = useState(false)

  useEffect(() => {
    if (!location || !mapRef.current) return

    const apiKey = process.env.NEXT_PUBLIC_YANDEX_MAPS_API_KEY
    if (!apiKey) {
      setMapError(true)
      return
    }

    const script = document.createElement('script')
    script.src = `https://api-maps.yandex.ru/2.1/?apikey=${apiKey}&lang=ru_RU`
    script.async = true
    script.onload = () => {
      const checkReady = () => {
        if (window.ymaps?.Map) {
          initMap()
        } else {
          setTimeout(checkReady, 100)
        }
      }
      checkReady()
    }
    script.onerror = () => setMapError(true)
    document.head.appendChild(script)

    return () => {
      const existingScript = document.querySelector(`script[src*="api-maps.yandex.ru"]`)
      if (existingScript) existingScript.remove()
    }
  }, [location])

  const initMap = () => {
    if (!mapRef.current || !window.ymaps?.Map) return

    try {
      // If we have stored coordinates, use them directly; otherwise geocode
      const hasCoords = latitude != null && longitude != null
      const defaultCenter: [number, number] = hasCoords
        ? [latitude, longitude]
        : [55.751574, 37.573856]

      const map = new window.ymaps.Map(mapRef.current, {
        center: defaultCenter,
        zoom: hasCoords ? 16 : 13,
        controls: ['zoomControl', 'fullscreenControl'],
      })

      if (hasCoords) {
        const placemark = new window.ymaps.Placemark(
          [latitude, longitude],
          { balloonContent: location },
          { preset: 'islands#violetDotIcon', iconColor: '#8b5cf6' }
        )
        map.geoObjects.add(placemark)
        setMapLoaded(true)
      } else {
        // Fallback: geocode from address text
        window.ymaps.geocode(location!).then((res: any) => {
          const firstGeoObject = res.geoObjects.get(0)
          if (firstGeoObject) {
            const coords = firstGeoObject.geometry.getCoordinates()
            map.setCenter(coords, 15)
            const placemark = new window.ymaps.Placemark(coords, {
              balloonContent: location,
            }, {
              preset: 'islands#violetDotIcon',
              iconColor: '#8b5cf6',
            })
            map.geoObjects.add(placemark)
            setMapLoaded(true)
          }
        }).catch(() => setMapError(true))
      }
    } catch {
      setMapError(true)
    }
  }

  if (!location) return null

  return (
    <section className="relative z-10 px-4 py-16 max-w-2xl mx-auto space-y-6">
      {/* Location header + text */}
      <div className="space-y-2">
        <h2 className="font-display font-extrabold text-3xl sm:text-4xl tracking-tight gradient-text-sweep">Где</h2>
        <p className="text-brand-pearl/80 text-sm sm:text-base">{location}</p>
      </div>

      {/* Map in its own rounded container */}
      {mapError ? (
        <a
          href={`https://yandex.ru/maps/?text=${encodeURIComponent(location)}`}
          target="_blank"
          rel="noopener noreferrer"
          className="block w-full h-[200px] rounded-2xl bg-brand-deep/50 flex items-center justify-center
                     text-brand-pearl/40 text-sm hover:text-brand-pearl/60 transition-colors"
        >
          <MapPin size={20} className="mr-2" />
          Открыть на карте
        </a>
      ) : (
        <div className="rounded-2xl overflow-hidden border border-brand-pearl/5">
          <div
            ref={mapRef}
            className="w-full h-[320px] bg-brand-deep/50"
            style={{ opacity: mapLoaded ? 1 : 0.5 }}
          />
        </div>
      )}
    </section>
  )
}

declare global {
  interface Window {
    ymaps: any
  }
}
