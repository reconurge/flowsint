import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import Map, { Marker, Popup } from 'react-map-gl/maplibre'
import maplibregl from 'maplibre-gl'
import 'maplibre-gl/dist/maplibre-gl.css'
import { useTheme } from '../theme-provider'
import { Globe, MapPin } from 'lucide-react'
import LoadingSpinner from '@/components/shared/loader'
import { preloadImage, getCachedImage } from '@/components/sketches/graph/utils/image-cache'
import { useGraphControls } from '@/stores/graph-controls-store'
import { useGraphStore } from '@/stores/graph-store'
import { Switch } from '../ui/switch'
import { Label } from '../ui/label'
import type { MapRef } from 'react-map-gl/maplibre'
import type {
  StyleSpecification
} from 'maplibre-gl'

export type LocationPoint = {
  nodeId?: string
  lat?: number
  lon?: number
  address?: string
  label?: string
  nodeType?: string
  color?: string | null
  icon?: string | null
}

type MapFromAddressProps = {
  locations: LocationPoint[]
  height?: string
  zoom?: number
  centerOnFirst?: boolean
}

type MapStyleVariant = 'standard' | 'voyager' | 'satellite'

const VECTOR_STYLES: Record<'standard' | 'voyager', { dark: string; light: string }> = {
  standard: {
    dark: 'https://basemaps.cartocdn.com/gl/dark-matter-gl-style/style.json',
    light: 'https://basemaps.cartocdn.com/gl/positron-gl-style/style.json'
  },
  voyager: {
    dark: 'https://basemaps.cartocdn.com/gl/dark-matter-gl-style/style.json',
    light: 'https://basemaps.cartocdn.com/gl/voyager-gl-style/style.json'
  }
}

const SATELLITE_STYLE = {
  version: 8 as const,
  glyphs: 'https://demotiles.maplibre.org/font/{fontstack}/{range}.pbf',
  sources: {
    'esri-satellite': {
      type: 'raster' as const,
      tiles: [
        'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}'
      ],
      tileSize: 256,
      maxzoom: 19
      // attribution: '&copy; Esri'
    }
  },
  layers: [
    {
      id: 'esri-satellite-layer',
      type: 'raster' as const,
      source: 'esri-satellite',
      minzoom: 0,
      maxzoom: 22
    }
  ]
}

function resolveMapStyle(
  variant: MapStyleVariant,
  theme: 'dark' | 'light'
): string | StyleSpecification {
  if (variant === 'satellite') return SATELLITE_STYLE
  return VECTOR_STYLES[variant][theme]
}

function useResolvedTheme() {
  const { theme } = useTheme()
  const [resolved, setResolved] = useState<'dark' | 'light'>(() => {
    if (theme === 'system') {
      return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
    }
    return theme
  })

  useEffect(() => {
    if (theme !== 'system') {
      setResolved(theme)
      return
    }
    const mq = window.matchMedia('(prefers-color-scheme: dark)')
    const handler = (e: MediaQueryListEvent) => setResolved(e.matches ? 'dark' : 'light')
    setResolved(mq.matches ? 'dark' : 'light')
    mq.addEventListener('change', handler)
    return () => mq.removeEventListener('change', handler)
  }, [theme])

  return resolved
}

export const MapFromAddress: React.FC<MapFromAddressProps> = ({
  locations,
  height = '400px',
  zoom = 15,
  centerOnFirst = true
}) => {
  const mapRef = useRef<MapRef>(null)
  const resolvedTheme = useResolvedTheme()
  const [popupInfo, setPopupInfo] = useState<{
    lng: number
    lat: number
    label: string
    color: string
    nodeType: string
  } | null>(null)
  const [isGlobe, setIsGlobe] = useState(true)
  const isGlobeRef = useRef(true)
  const [styleVariant, setStyleVariant] = useState<MapStyleVariant>('standard')
  const [zoomLevel, setZoomLevel] = useState(2)
  const isDarkStyle = resolvedTheme === 'dark' || styleVariant === 'satellite'
  const showDetails = zoomLevel >= 6

  // Geocoding
  const locationsToGeocode = locations.filter(
    (loc) => loc.lat === undefined && loc.lon === undefined && loc.address
  )

  const geocodeQuery = useQuery({
    queryKey: ['geocode', locationsToGeocode.map((loc) => loc.address)],
    queryFn: async () => {
      const results = await Promise.all(
        locationsToGeocode.map(async (location) => {
          if (!location.address) return null
          try {
            const res = await fetch(
              `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(location.address)}`
            )
            const json = await res.json()
            if (!json || json.length === 0) return null
            return {
              lat: parseFloat(json[0].lat),
              lon: parseFloat(json[0].lon)
            }
          } catch {
            return null
          }
        })
      )
      return results
    },
    enabled: locationsToGeocode.length > 0
  })

  // Combine all locations with their coordinates
  const processedLocations = locations.map((location) => {
    if (location.lat !== undefined && location.lon !== undefined) {
      return {
        ...location,
        coordinates: { lat: location.lat, lon: location.lon },
        isLoading: false,
        isError: false
      }
    }
    const geocodeIndex = locationsToGeocode.findIndex((loc) => loc.address === location.address)
    if (geocodeIndex !== -1 && geocodeQuery.data) {
      const geocoded = geocodeQuery.data[geocodeIndex]
      return {
        ...location,
        coordinates: geocoded,
        isLoading: geocodeQuery.isLoading,
        isError: geocodeQuery.isError
      }
    }
    return {
      ...location,
      coordinates: null,
      isLoading: geocodeQuery.isLoading,
      isError: geocodeQuery.isError
    }
  })

  const validLocations = useMemo(
    () => processedLocations.filter((l) => l.coordinates),
    [JSON.stringify(processedLocations)]
  )

  const DEFAULT_MARKER_COLOR = '#6366f1'

  // Preload icons for all unique node types
  const [iconsReady, setIconsReady] = useState(false)
  useEffect(() => {
    const uniqueTypes = new Set<string>()
    validLocations.forEach((loc) => {
      if (loc.nodeType) uniqueTypes.add(loc.nodeType)
    })
    if (uniqueTypes.size === 0) {
      setIconsReady(true)
      return
    }
    Promise.all(
      Array.from(uniqueTypes).map((t) => preloadImage(t, '#ffffff'))
    ).then(() => setIconsReady(true)).catch(() => setIconsReady(true))
  }, [validLocations])

  // Fly to markers on data load
  useEffect(() => {
    const map = mapRef.current?.getMap()
    if (!map || validLocations.length === 0) return

    // Wait for map to be loaded
    const doFly = () => {
      if (validLocations.length === 1 || centerOnFirst) {
        const loc = validLocations[0].coordinates!
        map.flyTo({
          center: [Number(loc.lon), Number(loc.lat)],
          zoom,
          duration: 2000
        })
      } else {
        const bounds = new maplibregl.LngLatBounds()
        validLocations.forEach((l) => {
          bounds.extend([Number(l.coordinates!.lon), Number(l.coordinates!.lat)])
        })
        map.fitBounds(bounds, { padding: 60, duration: 2000 })
      }
    }

    if (map.loaded()) {
      doFly()
    } else {
      map.once('load', doFly)
    }
  }, [validLocations, zoom, centerOnFirst])

  const setCurrentNodeId = useGraphStore((s) => s.setCurrentNodeId)

  const onMarkerClick = useCallback(
    (loc: typeof validLocations[number]) => {
      const lat = Number(loc.coordinates!.lat)
      const lon = Number(loc.coordinates!.lon)
      if (loc.nodeId) setCurrentNodeId(loc.nodeId)
      setPopupInfo({
        lng: lon,
        lat,
        label: loc.label || loc.address || `${lat.toFixed(6)}, ${lon.toFixed(6)}`,
        color: loc.color || DEFAULT_MARKER_COLOR,
        nodeType: loc.nodeType || ''
      })
    },
    [setCurrentNodeId]
  )

  const onMapClick = useCallback(() => {
    setPopupInfo(null)
    setCurrentNodeId(null)
  }, [setCurrentNodeId])

  const applyProjection = useCallback(() => {
    const map = mapRef.current?.getMap()
    if (!map) return
    ;(map as any).setProjection({ type: isGlobeRef.current ? 'globe' : 'mercator' })
  }, [])

  const handleGlobeToggle = useCallback(
    (checked: boolean) => {
      setIsGlobe(checked)
      isGlobeRef.current = checked
      applyProjection()
    },
    [applyProjection]
  )

  const onMapLoad = useCallback(() => {
    const map = mapRef.current?.getMap()
    if (!map) return
    applyProjection()
    map.on('style.load', () => {
      applyProjection()
    })
  }, [applyProjection])

  // Wire up zoom actions to the shared toolbar controls
  const setActions = useGraphControls((s) => s.setActions)

  useEffect(() => {
    setActions({
      zoomIn: () => {
        const map = mapRef.current?.getMap()
        if (map) map.zoomIn({ duration: 300 })
      },
      zoomOut: () => {
        const map = mapRef.current?.getMap()
        if (map) map.zoomOut({ duration: 300 })
      },
      zoomToFit: () => {
        const map = mapRef.current?.getMap()
        if (!map || validLocations.length === 0) return
        if (validLocations.length === 1) {
          const loc = validLocations[0].coordinates!
          map.flyTo({ center: [Number(loc.lon), Number(loc.lat)], zoom, duration: 500 })
        } else {
          const bounds = new maplibregl.LngLatBounds()
          validLocations.forEach((l) => {
            bounds.extend([Number(l.coordinates!.lon), Number(l.coordinates!.lat)])
          })
          map.fitBounds(bounds, { padding: 60, duration: 500 })
        }
      }
    })

    return () => {
      setActions({
        zoomIn: () => {},
        zoomOut: () => {},
        zoomToFit: () => {}
      })
    }
  }, [setActions, validLocations, zoom])

  // Loading state
  if (geocodeQuery.isLoading) {
    return (
      <div className="h-full w-full flex items-center justify-center">
        <div className="text-center space-y-3">
          <LoadingSpinner size="lg" className="mx-auto" />
          <p className="text-muted-foreground">Loading map data...</p>
        </div>
      </div>
    )
  }

  // Error state
  if (geocodeQuery.isError) {
    return (
      <div className="h-full w-full flex items-center justify-center">
        <div className="text-center space-y-3">
          <div className="w-12 h-12 bg-destructive/10 rounded-full flex items-center justify-center mx-auto">
            <svg
              className="w-6 h-6 text-destructive"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z"
              />
            </svg>
          </div>
          <div>
            <p className="font-medium text-foreground">Unable to load map</p>
            <p className="text-sm text-muted-foreground">Could not find some addresses.</p>
          </div>
        </div>
      </div>
    )
  }

  // Empty state
  if (validLocations.length === 0) {
    return (
      <div className="w-full flex items-center justify-center h-full">
        <div className="text-center space-y-4">
          <MapPin className="mx-auto h-12 w-12 text-muted-foreground" />
          <div>
            <h3 className="text-lg font-semibold">No location to display</h3>
            <p className="text-muted-foreground">This sketch doesn't have any location yet.</p>
          </div>
        </div>
      </div>
    )
  }

  const mapStyle = resolveMapStyle(styleVariant, resolvedTheme)

  return (
    <div style={{ minHeight: height, height: '100%', width: '100%' }} className="relative">
      <div className="absolute bottom-6 left-3 z-10 flex flex-col gap-2">
        {/*<div className="flex items-center gap-2 rounded-lg bg-card/90 backdrop-blur-sm border border-border px-3 py-2 shadow-sm">
          <MapIcon className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
          <Select value={styleVariant} onValueChange={(v) => setStyleVariant(v as MapStyleVariant)}>
            <SelectTrigger className="h-6 w-[110px] border-0 bg-transparent text-xs px-1 py-0 shadow-none focus:ring-0">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="standard">Standard</SelectItem>
              <SelectItem value="voyager">Voyager</SelectItem>
              <SelectItem value="satellite">Satellite</SelectItem>
            </SelectContent>
          </Select>
        </div>*/}
        <div className="flex items-center gap-2 rounded-lg bg-card/90 backdrop-blur-sm border border-border px-3 py-2 shadow-sm">
          <Globe className="h-3.5 w-3.5 text-muted-foreground" />
          <Label
            htmlFor="globe-toggle"
            className="text-xs text-muted-foreground cursor-pointer select-none"
          >
            Globe
          </Label>
          <Switch
            id="globe-toggle"
            checked={isGlobe}
            onCheckedChange={handleGlobeToggle}
            className="scale-75"
          />
        </div>
      </div>
      <Map
        ref={mapRef}
        initialViewState={{
          longitude: Number(validLocations[0].coordinates!.lon),
          latitude: Number(validLocations[0].coordinates!.lat),
          zoom: 2
        }}
        style={{ width: '100%', height: '100%' }}
        mapStyle={mapStyle}
        onClick={onMapClick}
        onLoad={onMapLoad}
        onZoom={(e) => setZoomLevel(e.viewState.zoom)}
        cursor="auto"
        attributionControl={false}
      >
        {validLocations.map((loc, i) => {
          const lat = Number(loc.coordinates!.lat)
          const lon = Number(loc.coordinates!.lon)
          const color = loc.color || DEFAULT_MARKER_COLOR
          const cachedImg = showDetails && loc.nodeType ? getCachedImage(loc.nodeType, '#ffffff') : undefined
          const dotSize = showDetails ? 24 : 10
          const glowSize = showDetails ? 36 : 16
          return (
            <Marker
              key={loc.nodeId || `${lat}-${lon}-${i}`}
              longitude={lon}
              latitude={lat}
              anchor="center"
              onClick={(e) => {
                e.originalEvent.stopPropagation()
                onMarkerClick(loc)
              }}
            >
              <div
                className="cursor-pointer"
                style={{
                  width: dotSize,
                  height: dotSize,
                  borderRadius: '50%',
                  background: color,
                  border: showDetails
                    ? `2px solid ${isDarkStyle ? 'rgba(255,255,255,0.25)' : 'rgba(255,255,255,0.8)'}`
                    : 'none',
                  boxShadow: `0 0 ${showDetails ? 12 : 6}px ${color}66`,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  transition: 'width 0.2s, height 0.2s, box-shadow 0.2s'
                }}
              >
                {cachedImg && (
                  <img src={cachedImg.src} width={14} height={14} alt="" />
                )}
              </div>
            </Marker>
          )
        })}

        {popupInfo && (
          <Popup
            longitude={popupInfo.lng}
            latitude={popupInfo.lat}
            anchor="bottom"
            onClose={() => setPopupInfo(null)}
            closeButton={true}
            closeOnClick={false}
            className="maplibre-popup"
          >
            <div className="flex flex-col gap-1.5 px-1 py-0.5 min-w-[140px]">
              <div className="flex items-center gap-2">
                {(() => {
                  const cachedImg = popupInfo.nodeType
                    ? getCachedImage(popupInfo.nodeType, '#ffffff')
                    : undefined
                  return cachedImg ? (
                    <div
                      className="rounded-full flex items-center justify-center shrink-0"
                      style={{ background: popupInfo.color, width: 24, height: 24 }}
                    >
                      <img src={cachedImg.src} width={14} height={14} alt="" />
                    </div>
                  ) : (
                    <div
                      className="rounded-full shrink-0"
                      style={{ background: popupInfo.color, width: 10, height: 10 }}
                    />
                  )
                })()}
                <span className="text-sm font-medium text-foreground">{popupInfo.label}</span>
              </div>
              <div className="text-xs text-muted-foreground font-mono">
                {popupInfo.lat.toFixed(6)}, {popupInfo.lng.toFixed(6)}
              </div>
            </div>
          </Popup>
        )}
      </Map>
    </div>
  )
}
