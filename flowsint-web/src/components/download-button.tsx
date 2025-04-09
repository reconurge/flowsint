// components/DownloadButton.tsx
"use client";

import { Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { useState } from "react";
import Loader from "./loader";
export const DownloadButton = ({ endpoint, name = "sketch" }: { endpoint: string, name?: string }) => {
    const [loading, setLoading] = useState(false)
    const handleDownload = async () => {
        try {
            setLoading(true)
            const response = await fetch(endpoint);
            if (!response.ok) {
                toast.error("Could not download data. Try again later.");
                setLoading(false)
            }
            const blob = await response.blob();
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement("a");
            a.href = url;
            a.download = `${name}-${new Date().toISOString()}.json`; // à adapter selon ton format
            document.body.appendChild(a);
            a.click();
            a.remove();
            window.URL.revokeObjectURL(url);
            setLoading(false)
            toast.success("Download complete.");
        } catch (error) {
            toast.error("Could not download data. Try again later.");
            setLoading(false)
        }
    };
    return (
        <Button variant={"ghost"} disabled={loading} onClick={handleDownload} className="flex gap-2 h-full text-sm rounded-none">
            <Download />  {loading ? <>Loading...</> : <>Download</>}
        </Button>
    );
};
