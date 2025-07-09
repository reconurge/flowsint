import React from "react";
import { useQuery } from "@tanstack/react-query";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

type MapFromAddressProps = {
    address?: string;
    lat?: number;
    lon?: number;
    height?: string;
    zoom?: number;
};

export const MapFromAddress: React.FC<MapFromAddressProps> = ({
    address,
    lat,
    lon,
    height = "400px",
    zoom = 15,
}) => {
    const { data, isLoading, isError } = useQuery({
        queryKey: ["geocode", address],
        queryFn: async () => {
            // If lat and lon are provided, use them directly
            if (lat !== undefined && lon !== undefined) {
                return { lat, lon };
            }
            
            // Otherwise, geocode the address
            if (!address) {
                throw new Error("Either address or lat/lon coordinates must be provided");
            }
            
            const res = await fetch(
                `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(address)}`
            );
            const json = await res.json();
            if (!json || json.length === 0) throw new Error("Address not found");
            return {
                lat: parseFloat(json[0].lat),
                lon: parseFloat(json[0].lon),
            };
        },
        enabled: !(lat !== undefined && lon !== undefined), // Skip query if lat/lon are provided
    });

    // Use provided coordinates or geocoded data
    const coordinates = lat !== undefined && lon !== undefined 
        ? { lat, lon } 
        : data;

    const mapId = `leaflet-map-${btoa(address || `${lat},${lon}`).replace(/[^a-zA-Z0-9]/g, "")}`;

    React.useEffect(() => {
        if (!coordinates) return;

        const map = L.map(mapId).setView([coordinates.lat, coordinates.lon], zoom);

        L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
            attribution: "© OpenStreetMap",
        }).addTo(map);

        const marker = L.marker([coordinates.lat, coordinates.lon]).addTo(map);
        
        // Bind popup with address if available, otherwise show coordinates
        const popupText = address || `${coordinates.lat.toFixed(6)}, ${coordinates.lon.toFixed(6)}`;
        marker.bindPopup(popupText).openPopup();

        return () => {
            map.remove(); // cleanup
        };
    }, [coordinates, mapId, address, zoom]);

    // Show loading only when geocoding is needed
    if (isLoading && !(lat !== undefined && lon !== undefined)) {
        return <div className="p-3"><p>Loading map…</p></div>;
    }
    
    if (isError && !(lat !== undefined && lon !== undefined)) {
        return <div className="p-3"><p>Could not find the address.</p></div>;
    }

    // Don't render if we don't have coordinates
    if (!coordinates) {
        return <div className="p-3"><p>No coordinates provided.</p></div>;
    }

    return <div id={mapId} style={{ height }} />;
};
