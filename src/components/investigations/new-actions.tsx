import { supabase } from "@/src/lib/supabase/client";
import { DropdownMenu, Button, Popover, Flex, Box, TextField, Avatar } from "@radix-ui/themes";
import { PlusIcon } from "lucide-react";
import { useParams } from "next/navigation";


export default function NewActions({ addNodes }: { addNodes: any }) {
    const { investigation_id } = useParams()
    const onSubmit = async (e: { preventDefault: () => void; currentTarget: HTMLFormElement | undefined; }) => {
        e.preventDefault();
        const data = Object.fromEntries(new FormData(e.currentTarget));
        const node = await supabase.from("individuals").insert({ ...data, investigation_id: investigation_id?.toString() }).select("*")
            .single()
            .then(({ data, error }) => {
                if (error)
                    console.error(error)
                return data
            })
        addNodes({
            id: node.id,
            type: "individual",
            data: { ...node, "label": data.full_name },
            position: { x: -100, y: -100 }
        });

    }
    return (
        <Popover.Root>
            <Popover.Trigger>
                <Button variant="soft">
                    <PlusIcon width="16" height="16" />
                    Individual
                </Button>
            </Popover.Trigger>
            <Popover.Content width="260px">
                <form onSubmit={onSubmit}>
                    <Flex gap="3">
                        <Avatar
                            size="3"
                            fallback="A"
                            radius="full"
                        />
                        <Box flexGrow="1">
                            <TextField.Root
                                required
                                defaultValue={""}
                                name={"full_name"}
                                placeholder={`Name of the individual`}
                            />
                            <Flex justify={"end"} className="mt-2">
                                <Button type="submit" size="2">Add</Button>
                            </Flex>
                        </Box>
                    </Flex>
                </form>
            </Popover.Content>
        </Popover.Root>
    );
}
