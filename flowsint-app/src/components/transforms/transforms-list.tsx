import { transformService } from "@/api/transfrom-service"
import { useQuery } from "@tanstack/react-query"

const TransformsList = () => {
    const { data: transforms, isLoading } = useQuery({
        queryKey: ["transforms"],
        queryFn: () => transformService.get(),
    })
    if (isLoading) return <div>loading</div>
    return (
        <div className="h-full">{JSON.stringify(transforms)}</div>
    )
}

export default TransformsList