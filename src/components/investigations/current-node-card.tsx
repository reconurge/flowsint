import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader } from "@/components/ui/card"
import { Phone, XIcon } from "lucide-react"
import { useState } from "react"
import { useInvestigationStore } from '@/store/investigation-store';

interface PhoneNumber {
    id: string
    country: string | null
    phone_number: string
    individual_id: string
    investigation_id: string
}

interface Individual {
    id: string
    investigation_id: string
    full_name: string
    birth_date: string | null
    gender: string
    nationality: string
    notes: string
    image_url: string
    ip_addresses: string[]
    phone_numbers: PhoneNumber[]
}

interface CurrentNodeProps {
    individual: Partial<Individual>
}

export default function CurrentNode({ individual }: CurrentNodeProps) {
    const { handleOpenIndividualModal } = useInvestigationStore()
    const [show, setShow] = useState(true)
    if (!show) return
    return (
        <Card className="w-full max-w-sm overflow-hidden bg-background">
            <div className="h-24 bg-primary relative">
                <Button onClick={() => setShow(false)} className="text-white hover:text-white hover:bg-background/5 absolute top-2 right-2" size={"icon"} variant="ghost">
                    <XIcon className="h-4 w-4" />
                </Button>
            </div>
            <div className="relative">
                <div className="absolute -top-12 left-1/2 -translate-x-1/2">
                    <Avatar className="h-24 w-24 border-4 border-background">
                        <AvatarImage src={individual.image_url} />
                        <AvatarFallback className="bg-muted">
                            <span className="text-3xl">{individual?.full_name?.[0]}</span>
                        </AvatarFallback>
                    </Avatar>
                </div>
            </div>
            <CardHeader className="mt-8 text-center">
                <h2 className="text-2xl font-bold">{individual.full_name}</h2>
                <p className="text-sm text-muted-foreground">{individual.notes || <span className="italic">No notes.</span>}</p>
            </CardHeader>
            <CardContent className="grid gap-4">
                {individual?.phone_numbers && individual?.phone_numbers?.length > 0 && (
                    <div className="flex items-center gap-2 justify-center text-sm">
                        <Phone className="h-4 w-4 text-muted-foreground" />
                        {individual?.phone_numbers?.map((phone) => (
                            <span key={phone.id}>{phone.phone_number}</span>
                        ))}
                    </div>
                )}
                <div className="flex gap-2 justify-center">
                    <Button onClick={() => handleOpenIndividualModal(individual.id as string)}
                        variant="outline">View Details</Button>
                    {/* <Button>Contact</Button> */}
                </div>
                <div className="flex justify-between gap-8 text-sm text-muted-foreground border-t pt-4">
                    <div className="text-center">
                        <p className="font-medium">Nationality</p>
                        <p>{individual.nationality || "N/A"}</p>
                    </div>
                    <div className="text-center">
                        <p className="font-medium">Gender</p>
                        <p>{individual.gender || "N/A"}</p>
                    </div>
                    <div className="text-center">
                        <p className="font-medium">IPs</p>
                        <p>{individual?.ip_addresses?.length}</p>
                    </div>
                </div>
            </CardContent>
        </Card>
    )
}
