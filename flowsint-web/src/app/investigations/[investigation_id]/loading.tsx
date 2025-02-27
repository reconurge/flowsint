import Loader from '@/components/loader'
import React from 'react'

const loading = () => {
    return (
        <div className='h-[90vh] w-full flex items-center justify-center gap-2'><Loader />Loading nodes and edges...</div>
    )
}

export default loading