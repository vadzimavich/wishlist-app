'use client'

import { useEffect, useRef, useState } from 'react'
import { MapPin } from 'lucide-react'

interface Props {
  location: string | null
}

export function InviteMap({ location }: Props) {
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
      const map = new window.ymaps.Map(mapRef.current, {
        center: [55.751574, 37.573856],
        zoom: 13,
        controls: ['zoomControl', 'fullscreenControl'],
      })

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
    } catch {
      setMapError(true)
    }
  }

  if (!location) return null

  return (
    <section className="relative z-10 px-4 py-8 max-w-2xl mx-auto">
      <div className="liquid-glass p-4 rounded-2xl overflow-hidden">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 rounded-xl bg-brand-champagne/10 border border-brand-champagne/20
                          flex items-center justify-center shrink-0">
            <MapPin size={18} className="text-brand-champagne" />
          </div>
          <div>
            <p className="text-brand-pearl/40 text-xs uppercase tracking-wider">Место проведения</p>
            <p className="text-brand-pearl font-medium text-sm">{location}</p>
          </div>
        </div>

        {mapError ? (
          <a
            href={`https://yandex.ru/maps/?text=${encodeURIComponent(location)}`}
            target="_blank"
            rel="noopener noreferrer"
            className="block w-full h-[200px] rounded-xl bg-brand-deep/50 flex items-center justify-center
                       text-brand-pearl/40 text-sm hover:text-brand-pearl/60 transition-colors"
          >
            <MapPin size={20} className="mr-2" />
            Открыть на карте
          </a>
        ) : (
          <div
            ref={mapRef}
            className="w-full h-[300px] rounded-xl bg-brand-deep/50"
            style={{ opacity: mapLoaded ? 1 : 0.5 }}
          />
        )}
      </div>
    </section>
  )
}

declare global {
  interface Window {
    ymaps: any
  }
}
