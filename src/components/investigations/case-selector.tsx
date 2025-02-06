import { useInvestigations } from "@/src/lib/hooks/investigation/investigation";
import { useInvestigationContext } from "../contexts/investigation-provider";
import { useRouter } from "next/navigation";
import { Select, Spinner } from "@radix-ui/themes";

export default function CaseSelector() {
    const router = useRouter()
    const { investigations, isLoading } = useInvestigations()
    const { investigation, isLoadingInvestigation } = useInvestigationContext()
    const handleSelectionChange = (value: string) => {
        router.push(`/investigations/${value}`);
    };
    return (
        <div className="ml-2 flex items-center">
            <Spinner loading={isLoading || isLoadingInvestigation}>
                <Select.Root onValueChange={handleSelectionChange} defaultValue={investigation?.id}>
                    <Select.Trigger className="min-w-none w-full text-ellipsis truncate" variant="ghost" />
                    <Select.Content>
                        {investigations?.map((investigation) => (
                            <Select.Item className="text-ellipsis truncate" key={investigation.id} value={investigation.id}>{investigation.title}</Select.Item>
                        ))}
                    </Select.Content>
                </Select.Root >
            </Spinner>
        </div>
    );
}
