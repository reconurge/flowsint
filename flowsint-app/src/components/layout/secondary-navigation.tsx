import { useLocation, useParams } from "@tanstack/react-router"
import InvestigationList from "../investigations/investigation-list"
import GraphNavigation from "../graphs/graph-navigation"
import TransformNavigation from "../transforms/transform-navigation"

const SecondaryNavigation = () => {

    const { id, investigationId, type } = useParams({ strict: false })
    const { pathname } = useLocation()

    if (!investigationId && !id && !pathname.startsWith("/dashboard/transforms")) {
        return (
            <InvestigationList />
        )
    }
    if (investigationId && !id) {
        return (
            <div>
                This will show the sketches + walls
            </div>
        )
    }
    if (investigationId && id && type === "graph") {
        return (
            <GraphNavigation />
        )
    }

    if (investigationId && id && type === "wall") {
        return (
            <div>
                (WALL) THis will show: entities, items
            </div>
        )
    }
    if (pathname.startsWith("/dashboard/transforms")) {
        return <TransformNavigation />
    }
    return (
        <div>secondary-navigation</div>
    )
}

export default SecondaryNavigation