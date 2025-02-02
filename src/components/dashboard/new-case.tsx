import {
    Dropdown,
    DropdownSection,
    DropdownTrigger,
    DropdownMenu,
    DropdownItem,
    Button,
    Chip,
} from "@heroui/react";
import { PlusIcon } from 'lucide-react';
import { JSX, SVGProps } from "react";

export const AddIcon = (props: JSX.IntrinsicAttributes & SVGProps<SVGSVGElement>) => {
    return (
        <svg
            aria-hidden="true"
            fill="none"
            focusable="false"
            height="1em"
            role="presentation"
            viewBox="0 0 24 24"
            width="1em"
            {...props}
        >
            <path
                d="M7.37 22h9.25a4.87 4.87 0 0 0 4.87-4.87V8.37a4.87 4.87 0 0 0-4.87-4.87H7.37A4.87 4.87 0 0 0 2.5 8.37v8.75c0 2.7 2.18 4.88 4.87 4.88Z"
                fill="currentColor"
                opacity={0.4}
            />
            <path
                d="M8.29 6.29c-.42 0-.75-.34-.75-.75V2.75a.749.749 0 1 1 1.5 0v2.78c0 .42-.33.76-.75.76ZM15.71 6.29c-.42 0-.75-.34-.75-.75V2.75a.749.749 0 1 1 1.5 0v2.78c0 .42-.33.76-.75.76ZM12 14.75h-1.69V13c0-.41-.34-.75-.75-.75s-.75.34-.75.75v1.75H7c-.41 0-.75.34-.75.75s.34.75.75.75h1.81V18c0 .41.34.75.75.75s.75-.34.75-.75v-1.75H12c.41 0 .75-.34.75-.75s-.34-.75-.75-.75Z"
                fill="currentColor"
            />
        </svg>
    );
};
export default function NewCase() {
    const iconClasses = "text-xl text-default-500 pointer-events-none flex-shrink-0";
    return (
        <Dropdown
            backdrop="blur"
            classNames={{
                base: "before:bg-default-200", // change arrow background
                content:
                    "py-1 px-1 border border-default-200 bg-gradient-to-br from-white to-default-200 dark:from-default-50 dark:to-black",
            }}
        >
            <DropdownTrigger>
                <Button size="sm" isIconOnly aria-label="options" variant='bordered'>
                    <PlusIcon className='h-4 w-4' />
                </Button>
            </DropdownTrigger>
            <DropdownMenu aria-label="Dropdown menu with description" variant="faded" disabledKeys={["new_org"]}>
                <DropdownSection title="New">
                    <DropdownItem
                        key="new"
                        description="Create a new investigation case."
                        startContent={<AddIcon className={iconClasses} />}
                    >
                        New case
                    </DropdownItem>
                    <DropdownItem
                        key="new_org"
                        description="Create a new organization."
                        startContent={<AddIcon className={iconClasses} />}
                    >
                        New organization <Chip size="sm" color="primary" variant="flat">Soon</Chip>
                    </DropdownItem>
                </DropdownSection>
            </DropdownMenu>
        </Dropdown >
    );
}
