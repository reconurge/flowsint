import { useLocation, useParams } from "@tanstack/react-router"
import InvestigationList from "../investigations/investigation-list"
import GraphNavigation from "../graphs/graph-navigation"
import TransformNavigation from "../transforms/transform-navigation"
import SketchList from "../investigations/sketch-list"
import WallNavigation from "../walls/wall-navigation"

const SecondaryNavigation = () => {

    const { id, investigationId, type } = useParams({ strict: false })
    const { pathname } = useLocation()

    if (pathname.includes("/dashboard/investigations/wall")) {
        return (
            <div className="grow w-full overflow-x-hidden">
                <WallNavigation />
            </div>
        )
    }

    if (!investigationId && !id && !pathname.startsWith("/dashboard/transforms")) {
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
    if (investigationId && id && type === "graph") {
        return (
            <div className="grow w-full overflow-x-hidden">
                <GraphNavigation />
            </div>
        )
    }

    if (investigationId && id && type === "wall") {
        return (
            <div className="grow">
                (WALL) THis will show: entities, items
            </div>
        )
    }

    if (pathname.startsWith("/dashboard/transforms")) {
        return (
            <div className="grow w-full h-full overflow-x-hidden">
                <TransformNavigation />
            </div>)
    }
    return (
        <div>secondary-navigation</div>
    )
}

export default SecondaryNavigation