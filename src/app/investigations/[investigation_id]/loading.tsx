import { Spinner } from '@radix-ui/themes'
import React from 'react'

const loading = () => {
    return (
        <div className='h-[90vh] w-full flex items-center justify-center gap-2'><Spinner /> Loading nodes and edges...</div>
    )
}

export default loading