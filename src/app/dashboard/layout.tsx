import { Navbar } from '@/src/components/navbar';
import React from 'react'

const DashboardLayout = ({
    children,
}: {
    children: React.ReactNode;
}) => {
    return (
        <div>
            <Navbar />
            <div className="container mx-auto max-w-7xl pt-16 px-6 flex-grow">{children}</div>
        </div>
    )
}

export default DashboardLayout