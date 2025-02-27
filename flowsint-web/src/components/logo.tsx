import React from 'react'
import { HomeIcon } from 'lucide-react'
import Link from 'next/link'
import { Button } from './ui/button'
const Logo = () => {
    return (
        <Link href="/dashboard">
            <Button variant="outline" size="icon">
                <HomeIcon className="h-5" />
            </Button>
        </Link>
    )
}

export default Logo