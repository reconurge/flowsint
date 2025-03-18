import React from 'react'
import { HomeIcon } from 'lucide-react'
import Image from 'next/image'
const Logo = () => {
    return (
        <Image src="/logo.webp" height={50} width={50} alt="logo" className='w-full rounded-full max-w-[35px] max-h-[35px]' />
    )
}

export default Logo