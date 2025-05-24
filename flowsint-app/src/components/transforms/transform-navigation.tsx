import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { UserPlus, Users } from "lucide-react"
import RawMaterial from "./raw-material"
import TransformsList from "./transforms-list"

const TransformNavigation = () => {
    return (
        <div className="h-full w-full">
            <Tabs defaultValue="transforms" className="w-full h-full gap-0 border-b">
                <TabsList className="w-full p-0 rounded-none my-0 border-b" >
                    <TabsTrigger value="transforms"><Users className="h-3 w-3 opacity-60" /> Transforms</TabsTrigger>
                    <TabsTrigger value="items"><UserPlus className="h-3 w-3 opacity-60" /> Items</TabsTrigger>
                </TabsList>
                <TabsContent value="transforms" className="my-0">
                    <TransformsList />
                </TabsContent>
                <TabsContent value="items">
                    <RawMaterial />
                </TabsContent>
            </Tabs>
        </div>
    )
}

export default TransformNavigation