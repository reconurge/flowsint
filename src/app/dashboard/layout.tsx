import React from 'react'

const DashboardLayout = ({
    children,
}: {
    children: React.ReactNode;
}) => {
    return (
        <div>
            <div className="container mx-auto max-w-7xl pt-16 px-6 flex-grow">{children}</div>
        </div>
    )
}

export default DashboardLayout