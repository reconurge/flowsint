import { Spinner } from '@radix-ui/themes'
import React from 'react'

const loading = () => {
    return (
        <div className='h-screen w-screen flex items-center justify-center gap-2'><Spinner /> Loading investigation...</div>
    )
}

export default loading