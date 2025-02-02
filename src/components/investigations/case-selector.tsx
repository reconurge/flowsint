import { useInvestigations } from "@/src/lib/hooks/investigation";
import { Select, SelectItem } from "@heroui/react";
import { useInvestigationContext } from "./investigation-provider";
import { useRouter } from "next/navigation";

export default function CaseSelector() {
    const router = useRouter()
    const { investigations, isLoading } = useInvestigations()
    const { investigation, isLoadingInvestigation } = useInvestigationContext()
    const handleSelectionChange = (e: { target: { value: any; }; }) => {
        router.push(`/investigations/${e.target.value}`);
    };
    return (
        <Select
            isLoading={isLoading || isLoadingInvestigation}
            radius="sm"
            variant="underlined"
            value={investigation?.id}
            items={investigations || []}
            placeholder="Select a case"
            onChange={handleSelectionChange}

        >
            {(item: any) => <SelectItem key={item.id}>{item.title}</SelectItem>}
        </Select >
    );
}
