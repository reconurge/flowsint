import { useLocation, useParams } from '@tanstack/react-router'
import InvestigationList from '../investigations/investigation-list'
import GraphNavigation from '../sketches/graph/panels/graph-navigation'
import FlowNavigation from '../flows/flow-navigation'
import SketchList from '../investigations/sketch-list'
import AnalysesList from '../analyses/analyses-list'
import { memo } from 'react'

const SecondaryNavigation = memo(() => {
  const { id, investigationId, type } = useParams({ strict: false })
  const { pathname } = useLocation()

  if (!investigationId && !id && !pathname.startsWith('/dashboard/flows')) {
    return (
      <div className="grow w-full overflow-x-hidden">
        <InvestigationList />
      </div>
    )
  }
  if (investigationId && !id) {
    return (
      <div className="grow w-full overflow-x-hidden">
        <SketchList />
      </div>
    )
  }

  if (investigationId && id && type === 'graph') {
    return (
      <div className="grow w-full overflow-x-hidden">
        <GraphNavigation />
      </div>
    )
  }
  if (investigationId && id && type === 'analysis') {
    return (
      <div className="grow w-full overflow-x-hidden">
        <AnalysesList />
      </div>
    )
  }

  if (pathname.startsWith('/dashboard/flows')) {
    return (
      <div className="grow w-full h-full overflow-x-hidden">
        <FlowNavigation />
      </div>
    )
  }
  return null
})

export default SecondaryNavigation
