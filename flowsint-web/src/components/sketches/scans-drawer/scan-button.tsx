"use client"

import { useEffect, useState } from "react"
import { Zap, ZapIcon } from "lucide-react"
import { createClient } from "@supabase/supabase-js"
import { useQueryState } from "nuqs"

import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import {
  Sheet,
  SheetClose,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet"
import { ScanTable } from "./scan-table"
import { toast } from "sonner"
import { supabase } from "@/lib/supabase/client"
import { notFound, useParams } from "next/navigation"
import { useQuery } from "@tanstack/react-query"
export type Scan = {
  id: string
  value: string
  status: "pending" | "finished" | "failed"
  scan_name: string
  results: { results: any[] }
}

export function ScanButton() {
  const [scans, setScans] = useState<Scan[]>([])
  const [pendingCount, setPendingCount] = useState(0)
  const [scanId, setScanId] = useQueryState("scan_id")
  const [open, setOpen] = useState(false)
  const { investigation_id, sketch_id } = useParams()

  const { refetch } = useQuery({
    queryKey: ["investigations", investigation_id, 'sketches', sketch_id, "data"],
    queryFn: async () => {
      const res = await fetch(`/api/investigations/${investigation_id}/sketches/${sketch_id}/sketch`)
      if (!res.ok) {
        notFound()
      }
      return res.json()
    },
    refetchOnWindowFocus: true,
  })

  useEffect(() => {
    // Initial fetch of scans
    const fetchScans = async () => {
      const { data, error } = await supabase.from("scans").select("*").eq("sketch_id", sketch_id).order("created_at", { ascending: false })
      if (error) {
        console.error("Error fetching scans:", error)
        return
      }
      setScans(data || [])
      updatePendingCount(data || [])
    }
    fetchScans()
    // Set up real-time subscription
    const subscription = supabase
      .channel("scans-channel")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "scans",
        },
        (payload) => {
          // Handle different types of changes
          if (payload.eventType === "INSERT") {
            setScans((current) => {
              const newScans = [...current, payload.new as Scan]
              updatePendingCount(newScans)
              return newScans
            })
          } else if (payload.eventType === "UPDATE") {
            setScans((current) => {
              const newScans = current.map((scan) => (scan.id === payload.new.id ? (payload.new as Scan) : scan))
              updatePendingCount(newScans)
              toast.success('Scan complete on this item ! Refreshing now.')
              refetch()
              return newScans
            })
          } else if (payload.eventType === "DELETE") {
            setScans((current) => {
              const newScans = current.filter((scan) => scan.id !== payload.old.id)
              updatePendingCount(newScans)
              return newScans
            })
          }
        },
      )
      .subscribe()

    return () => {
      // Clean up subscription
      supabase.removeChannel(subscription)
    }
  }, [])

  const updatePendingCount = (scans: Scan[]) => {
    const count = scans.filter((scan) => scan.status === "pending").length
    setPendingCount(count)
  }

  const handleScanClick = (id: string) => {
    setScanId(id)
  }

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button variant="ghost" className="rounded-none">
          {pendingCount > 0 ? (
            <div className="pr-1">
              <ZapIcon fill="var(--primary)" stroke="var(--primary)" className="!h-5 !w-5 animate-pulse" />
              <Badge className='absolute -top-0 right-2 text-xs rounded-full h-4 w-4' variant={"default"}>{pendingCount}</Badge>
            </div>
          ) : (
            <>
              <ZapIcon className="!h-4.5 !w-4.5 opacity-60" />
            </>
          )}
        </Button>
      </SheetTrigger>
      <SheetContent className="w-full !max-w-[500px]">
        <div className="mx-auto w-full !max-w-[500px] h-screen overflow-auto">
          <SheetHeader>
            <SheetTitle>Scans</SheetTitle>
            <SheetDescription>View all your scans. Click on a scan to select it.</SheetDescription>
          </SheetHeader>
          <div className="p-4">
            <ScanTable scans={scans} onScanClick={handleScanClick} selectedScanId={scanId || ""} />
          </div>
          <SheetFooter>
            <SheetClose asChild>
              <Button variant="outline">Close</Button>
            </SheetClose>
          </SheetFooter>
        </div>
      </SheetContent>
    </Sheet>
  )
}

