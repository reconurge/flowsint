import React from 'react'
import { useQuery } from '@tanstack/react-query'
// @ts-ignore
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import { useTheme } from '../theme-provider'
import { MapPin } from 'lucide-react'

export type LocationPoint = {
  lat?: number
  lon?: number
  address?: string
  label?: string
}

type MapFromAddressProps = {
  locations: LocationPoint[]
  height?: string
  zoom?: number
  centerOnFirst?: boolean
}

export const MapFromAddress: React.FC<MapFromAddressProps> = ({
  locations,
  height = '400px',
  zoom = 15,
  centerOnFirst = true
}) => {
  // Get locations that need geocoding
  const locationsToGeocode = locations.filter(
    (loc) => loc.lat === undefined && loc.lon === undefined && loc.address
  )
  const { theme } = useTheme()
  // Single query for all geocoding
  const geocodeQuery = useQuery({
    queryKey: ['geocode', locationsToGeocode.map((loc) => loc.address)],
    queryFn: async () => {
      const results: ({ lat: number; lon: number } | null)[] = []
      for (const location of locationsToGeocode) {
        if (!location.address) continue

        const res = await fetch(
          `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(location.address)}`
        )
        const json = await res.json()
        if (!json || json.length === 0) {
          results.push(null)
        } else {
          results.push({
            lat: parseFloat(json[0].lat),
            lon: parseFloat(json[0].lon)
          })
        }
      }
      return results
    },
    enabled: locationsToGeocode.length > 0
  })

  // Combine all locations with their coordinates
  const processedLocations = locations.map((location) => {
    // If location already has coordinates
    if (location.lat !== undefined && location.lon !== undefined) {
      return {
        ...location,
        coordinates: { lat: location.lat, lon: location.lon },
        isLoading: false,
        isError: false
      }
    }

    // If location needs geocoding
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

    // Fallback for locations without address
    return {
      ...location,
      coordinates: null,
      isLoading: geocodeQuery.isLoading,
      isError: geocodeQuery.isError
    }
  })

  // Get valid coordinates for map bounds
  const validCoordinates = processedLocations
    .filter((location) => location.coordinates)
    .map((location) => location.coordinates!)

  const mapId = `leaflet-map-${btoa(JSON.stringify(locations)).replace(/[^a-zA-Z0-9]/g, '')}`

  React.useEffect(() => {
    if (validCoordinates.length === 0) return

    // Create custom icon using SVG
    const customIcon = L.divIcon({
      html: `
        <div style="
          background-color: ${theme === 'dark' ? '#3b82f6' : '#2563eb'};
          width: 24px;
          height: 24px;
          border-radius: 50% 50% 50% 0;
          transform: rotate(-45deg);
          border: 2px solid white;
          box-shadow: 0 2px 4px rgba(0,0,0,0.3);
        "></div>
      `,
      className: 'custom-marker',
      iconSize: [24, 24],
      iconAnchor: [12, 24],
      popupAnchor: [0, -24]
    })

    const map = L.map(mapId)

    const source = theme === 'dark' ? 'alidade_smooth_dark' : 'alidade_smooth'
    L.tileLayer('https://tiles.stadiamaps.com/tiles/{source}/{z}/{x}/{y}.{ext}', {
      // attribution: '&copy; <a href="https://www.stadiamaps.com/" target="_blank">Stadia Maps</a> &copy; <a href="https://openmaptiles.org/" target="_blank">OpenMapTiles</a> &copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
      ext: 'png',
      source: source
    }).addTo(map)

    // Add markers for each location
    const markers: L.Marker[] = []
    processedLocations.forEach((location) => {
      if (!location.coordinates) return

      const marker = L.marker([location.coordinates.lat, location.coordinates.lon], { icon: customIcon }).addTo(map)

      // Create popup text
      const popupText =
        location.label ||
        location.address ||
        `${location.coordinates.lat.toFixed(6)}, ${location.coordinates.lon.toFixed(6)}`

      marker.bindPopup(popupText)
      markers.push(marker)
    })

    // Set map view
    if (centerOnFirst && validCoordinates.length > 0) {
      // Center on first coordinate
      map.setView([validCoordinates[0].lat, validCoordinates[0].lon], zoom)
    } else if (validCoordinates.length > 1) {
      // Fit bounds to include all markers
      const group = new L.featureGroup(markers)
      map.fitBounds(group.getBounds().pad(0.1))
    } else if (validCoordinates.length === 1) {
      // Single point
      map.setView([validCoordinates[0].lat, validCoordinates[0].lon], zoom)
    }

    return () => {
      map.remove() // cleanup
    }
  }, [validCoordinates, mapId, zoom, centerOnFirst, theme])

  // Show loading if geocoding is in progress
  if (geocodeQuery.isLoading) {
    return (
      <div className="h-full w-full flex items-center justify-center">
        <div className="text-center space-y-3">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
          <p className="text-muted-foreground">Loading map data...</p>
        </div>
      </div>
    )
  }

  // Show error if geocoding failed
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

  // Don't render if we don't have any valid coordinates
  if (validCoordinates.length === 0) {
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

  return <div id={mapId} style={{ minHeight: height, height: '100%', width: '100%', zIndex: 0 }} />
}
