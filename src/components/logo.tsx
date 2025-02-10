import React from 'react'
import { CableIcon, HomeIcon } from 'lucide-react'
import Link from 'next/link'
import { IconButton } from '@radix-ui/themes'
const Logo = () => {
    return (

        <Link href="/dashboard">
            <IconButton color="gray" size="2" variant="soft">
                <HomeIcon className="h-5" />
            </IconButton>
        </Link>
    )
}

export default Logo