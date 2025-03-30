"use client"
import { ScanDrawer } from './scan-drawer';
const InvestigationLayout = ({
    children,
}: {
    children: React.ReactNode;
    left: React.ReactNode;
    investigation_id: string
    user: any
}) => {
    return (
        <>
            {children}
            <ScanDrawer />
        </>
    )
}

export default InvestigationLayout