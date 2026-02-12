import { useGraphStore } from '@/stores/graph-store'
import { useNodesDisplaySettings, type ItemType } from '@/stores/node-display-settings'
import { MapFromAddress } from './map'
import { LocationPoint } from './map'
const MapPanel = () => {
  const nodes = useGraphStore((state) => state.nodes)
  const nodeColors = useNodesDisplaySettings((s) => s.colors)
  const locationNodes = nodes
    .filter(
      (node) =>
        node.nodeType === 'location' ||
        (node.nodeProperties.latitude && node.nodeProperties.longitude)
    )
    .map((node) => ({
      lat: node.nodeProperties.latitude != null ? Number(node.nodeProperties.latitude) : undefined,
      lon:
        node.nodeProperties.longitude != null ? Number(node.nodeProperties.longitude) : undefined,
      address:
        [node.nodeProperties.address, node.nodeProperties.city, node.nodeProperties.country]
          .filter(Boolean)
          .join(', ') || '',
      label: node.nodeProperties.nodeLabel || node.nodeProperties.address || '',
      nodeType: node.nodeType,
      color: node.nodeColor || nodeColors[node.nodeType as ItemType] || null,
      icon: node.nodeIcon
    }))
  return (
    <div className="w-full grow h-full">
      <MapFromAddress locations={locationNodes as LocationPoint[]} />
    </div>
  )
}

export default MapPanel
