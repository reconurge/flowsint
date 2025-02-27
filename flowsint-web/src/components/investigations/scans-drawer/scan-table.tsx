"use client"

import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import type { Scan } from "./scan-button"

interface ScanTableProps {
    scans: Scan[]
    onScanClick: (id: string) => void
    selectedScanId: string
}

export function ScanTable({ scans, onScanClick, selectedScanId }: ScanTableProps) {
    return (
        <Table>
            <TableHeader>
                <TableRow>
                    <TableHead>Scan Name</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Results</TableHead>
                </TableRow>
            </TableHeader>
            <TableBody>
                {scans.length === 0 ? (
                    <TableRow>
                        <TableCell colSpan={3} className="text-center">
                            No scans found
                        </TableCell>
                    </TableRow>
                ) : (
                    scans.map((scan) => (
                        <TableRow
                            key={scan.id}
                            className={`cursor-pointer hover:bg-muted/50 ${selectedScanId === scan.id ? "bg-muted" : ""}`}
                            onClick={() => onScanClick(scan.id)}
                        >
                            <TableCell className="font-medium">{scan.scan_name}</TableCell>
                            <TableCell>
                                {scan.status === "pending" ? (
                                    <Badge variant="default" className="bg-yellow-500 hover:bg-yellow-600">
                                        Pending
                                    </Badge>
                                ) : scan.status === "finished" ? (
                                    <Badge variant="default" className="bg-green-500 hover:bg-green-600">
                                        Completed
                                    </Badge>
                                ) : (
                                    <Badge variant="destructive">Failed</Badge>
                                )}
                            </TableCell>
                            <TableCell>{!scan?.results ? "pending..." : `${scan?.results?.results?.length} results`}</TableCell>
                        </TableRow>
                    ))
                )}
            </TableBody>
        </Table>
    )
}

