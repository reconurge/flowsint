import React from "react";
import { useQuery } from "@tanstack/react-query";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { useTheme } from "../theme-provider";

export type LocationPoint = {
    lat?: number;
    lon?: number;
    address?: string;
    label?: string;
};

type MapFromAddressProps = {
    locations: LocationPoint[];
    height?: string;
    zoom?: number;
    centerOnFirst?: boolean;
};

export const MapFromAddress: React.FC<MapFromAddressProps> = ({
    locations,
    height = "400px",
    zoom = 15,
    centerOnFirst = true,
}) => {
    // Get locations that need geocoding
    const locationsToGeocode = locations.filter(loc => loc.lat === undefined && loc.lon === undefined && loc.address);
    const { theme } = useTheme()
    // Single query for all geocoding
    const geocodeQuery = useQuery({
        queryKey: ["geocode", locationsToGeocode.map(loc => loc.address)],
        queryFn: async () => {
            const results: ({ lat: number; lon: number } | null)[] = [];
            for (const location of locationsToGeocode) {
                if (!location.address) continue;

                const res = await fetch(
                    `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(location.address)}`
                );
                const json = await res.json();
                if (!json || json.length === 0) {
                    results.push(null);
                } else {
                    results.push({
                        lat: parseFloat(json[0].lat),
                        lon: parseFloat(json[0].lon),
                    });
                }
            }
            return results;
        },
        enabled: locationsToGeocode.length > 0,
    });

    // Combine all locations with their coordinates
    const processedLocations = locations.map((location) => {
        // If location already has coordinates
        if (location.lat !== undefined && location.lon !== undefined) {
            return {
                ...location,
                coordinates: { lat: location.lat, lon: location.lon },
                isLoading: false,
                isError: false,
            };
        }

        // If location needs geocoding
        const geocodeIndex = locationsToGeocode.findIndex(loc => loc.address === location.address);
        if (geocodeIndex !== -1 && geocodeQuery.data) {
            const geocoded = geocodeQuery.data[geocodeIndex];
            return {
                ...location,
                coordinates: geocoded,
                isLoading: geocodeQuery.isLoading,
                isError: geocodeQuery.isError,
            };
        }

        // Fallback for locations without address
        return {
            ...location,
            coordinates: null,
            isLoading: geocodeQuery.isLoading,
            isError: geocodeQuery.isError,
        };
    });

    // Get valid coordinates for map bounds
    const validCoordinates = processedLocations
        .filter(location => location.coordinates)
        .map(location => location.coordinates!);

    const mapId = `leaflet-map-${btoa(JSON.stringify(locations)).replace(/[^a-zA-Z0-9]/g, "")}`;

    React.useEffect(() => {
        if (validCoordinates.length === 0) return;

        const map = L.map(mapId);

        const source = theme === 'dark' ? 'alidade_smooth_dark' : 'alidade_smooth'
        L.tileLayer("https://tiles.stadiamaps.com/tiles/{source}/{z}/{x}/{y}.{ext}", {
            // attribution: '&copy; <a href="https://www.stadiamaps.com/" target="_blank">Stadia Maps</a> &copy; <a href="https://openmaptiles.org/" target="_blank">OpenMapTiles</a> &copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
            ext: 'png',
            source: source
        }).addTo(map);

        // Add markers for each location
        const markers: L.Marker[] = [];
        processedLocations.forEach((location) => {
            if (!location.coordinates) return;

            const marker = L.marker([location.coordinates.lat, location.coordinates.lon]).addTo(map);

            // Create popup text
            const popupText = location.label ||
                location.address ||
                `${location.coordinates.lat.toFixed(6)}, ${location.coordinates.lon.toFixed(6)}`;

            marker.bindPopup(popupText);
            markers.push(marker);
        });

        // Set map view
        if (centerOnFirst && validCoordinates.length > 0) {
            // Center on first coordinate
            map.setView([validCoordinates[0].lat, validCoordinates[0].lon], zoom);
        } else if (validCoordinates.length > 1) {
            // Fit bounds to include all markers
            const group = new L.featureGroup(markers);
            map.fitBounds(group.getBounds().pad(0.1));
        } else if (validCoordinates.length === 1) {
            // Single point
            map.setView([validCoordinates[0].lat, validCoordinates[0].lon], zoom);
        }

        return () => {
            map.remove(); // cleanup
        };
    }, [validCoordinates, mapId, zoom, centerOnFirst, theme]);

    // Show loading if geocoding is in progress
    if (geocodeQuery.isLoading) {
        return <div className="p-3"><p>Loading map…</p></div>;
    }

    // Show error if geocoding failed
    if (geocodeQuery.isError) {
        return <div className="p-3"><p>Could not find some addresses.</p></div>;
    }

    // Don't render if we don't have any valid coordinates
    if (validCoordinates.length === 0) {
        return <div className="p-3"><p>No valid coordinates provided.</p></div>;
    }

    return <div id={mapId} style={{ minHeight: height, height: '100%', width: '100%' }} />;
};
