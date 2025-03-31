"use client"
import { ScanDrawer } from './scan-drawer';
const InvestigationLayout = ({
    children,
}: {
    children: React.ReactNode;
}) => {
    return (<>
        {children}
        < ScanDrawer />
    </>
    )
}

export default InvestigationLayout