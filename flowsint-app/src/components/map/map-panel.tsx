import { useGraphStore } from '@/stores/graph-store'
import { MapFromAddress } from './map'
import { LocationPoint } from './map'
const MapPanel = () => {
  const nodes = useGraphStore((state) => state.nodes)
  const locationNodes = nodes
    .filter((node) => node.nodeType === 'location' || (node.nodeProperties.latitude && node.nodeProperties.longitude))
    .map((node) => ({
      lat: node.nodeProperties.latitude || 0,
      lon: node.nodeProperties.longitude || 0,
      address: node.nodeProperties.address || '',
      label: node.nodeProperties.label || ''
    }))
  return (
    <div className="w-full grow h-full">
      <MapFromAddress locations={locationNodes as LocationPoint[]} />
    </div>
  )
}

export default MapPanel
