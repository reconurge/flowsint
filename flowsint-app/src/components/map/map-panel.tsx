import { useGraphStore } from '@/stores/graph-store'
import { MapFromAddress } from './map'
import { LocationPoint } from './map'
const MapPanel = () => {
  const nodes = useGraphStore((state) => state.nodes)
  const locationNodes = nodes
    .filter((node) => node.data.type === 'location' || (node.data.latitude && node.data.longitude))
    .map((node) => ({
      lat: node.data.latitude || 0,
      lon: node.data.longitude || 0,
      address: node.data.address || '',
      label: node.data.label || ''
    }))
  return (
    <div className="w-full grow h-full z-10">
      <MapFromAddress locations={locationNodes as LocationPoint[]} />
    </div>
  )
}

export default MapPanel
