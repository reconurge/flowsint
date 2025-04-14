"use client"

import { useState } from "react"
// @ts-ignore
import { ComposableMap, Geographies, Geography, Marker, ZoomableGroup } from "react-simple-maps"

export default function MapPage() {
    const [position, setPosition] = useState({ coordinates: [0, 0], zoom: 1 })
    const [dimensions, setDimensions] = useState({ width: 800, height: 450 })

    const handleMoveEnd = (position: any) => {
        setPosition(position)
    }

    // Bordeaux coordinates
    const markerCoordinates = { markerOffset: 15, name: "123 Route du Grand Puits, PARIS 17, France", coordinates: [-0.165159, 45.141177] }

    // Responsive scale based on screen width
    const getScale = () => {
        const width = window.innerWidth
        if (width < 640) return 40 // Small screens
        if (width < 1024) return 60 // Medium screens
        return 80 // Large screens
    }
    return (
        <div className="flex flex-col grow w-full">
            <div id="map-container" className="grow w-full relative overflow-hidden">
                <ComposableMap
                    projectionConfig={{
                        scale: getScale(),
                    }}
                    width={dimensions.width}
                    height={dimensions.height}
                    style={{
                        width: "100%",
                        height: "100%",
                        position: "absolute",
                        top: 0,
                        left: 0,
                    }}
                >
                    <ZoomableGroup zoom={position.zoom} center={position.coordinates} onMoveEnd={handleMoveEnd}>
                        <Geographies geography={"/features.json"}>
                            {({ geographies }: { geographies: any[] }) =>
                                geographies.map((geo) => (
                                    <Geography
                                        key={geo.rsmKey}
                                        geography={geo}
                                        fill="#EAEAEC"
                                        stroke="#D6D6DA"
                                        style={{
                                            default: { outline: "none" },
                                            hover: { fill: "#F5F5F5", outline: "none" },
                                            pressed: { outline: "none" },
                                        }}
                                    />
                                ))
                            }
                        </Geographies>
                        <Marker key={name} coordinates={markerCoordinates.coordinates}>
                            <circle r={window.innerWidth < 640 ? 2 : 3} fill="#FF5533" stroke="#FFFFFF" strokeWidth={1} />
                            <text
                                textAnchor="middle"
                                y={markerCoordinates.markerOffset}
                                style={{ fontFamily: "system-ui", fill: "#5D5A6D", fontSize: window.innerWidth < 640 ? "0.2rem" : ".4rem" }}
                            >
                                {markerCoordinates.name}
                            </text>
                        </Marker>
                    </ZoomableGroup>
                </ComposableMap>
            </div>
        </div>
    )
}

