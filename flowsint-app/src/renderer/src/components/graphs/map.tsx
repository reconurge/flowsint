import React from "react";
import { useQuery } from "@tanstack/react-query";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

type MapFromAddressProps = {
    address: string;
    height?: string;
    zoom?: number;
};

export const MapFromAddress: React.FC<MapFromAddressProps> = ({
    address,
    height = "400px",
    zoom = 15,
}) => {
    const { data, isLoading, isError } = useQuery({
        queryKey: ["geocode", address],
        queryFn: async () => {
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
    });

    const mapId = `leaflet-map-${btoa(address).replace(/[^a-zA-Z0-9]/g, "")}`;

    React.useEffect(() => {
        if (!data) return;

        const map = L.map(mapId).setView([data.lat, data.lon], zoom);

        L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
            attribution: "© OpenStreetMap",
        }).addTo(map);

        L.marker([data.lat, data.lon]).addTo(map).bindPopup(address).openPopup();

        return () => {
            map.remove(); // cleanup
        };
    }, [data, mapId, address, zoom]);

    if (isLoading) return <div className="p-3"><p>Loading map…</p></div>;
    if (isError) return <div className="p-3"><p>Could not find the address.</p></div>;

    return <div id={mapId} style={{ height }} />;
};
