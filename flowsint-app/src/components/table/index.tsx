import { useGraphStore } from '@/stores/graph-store'
import NodesTable from './nodes-view'

export default function NodesViewTable() {
  const nodes = useGraphStore((s) => s.filteredNodes)

  return <NodesTable nodes={nodes} />
}
