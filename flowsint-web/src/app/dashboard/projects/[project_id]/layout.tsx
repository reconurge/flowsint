import FileUploadDialog from "@/components/projects/file-upload";

const DashboardLayout = async ({
    children,
}: {
    children: React.ReactNode;
}) => {
    return (
        <>
            {children}
            <FileUploadDialog />
        </>
    )
}
export default DashboardLayout