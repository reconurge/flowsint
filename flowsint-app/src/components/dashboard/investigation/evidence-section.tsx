
import { Button } from "@/components/ui/button"
import { Plus, FileCode, FileImage, FileText, File } from "lucide-react"

const evidence = [
  { id: 1, name: "network_capture_nov28.pcap", size: "245 MB", icon: FileCode },
  { id: 2, name: "malware_sample_hash.zip", size: "12.4 MB", icon: File },
  { id: 3, name: "screenshot_c2_panel.png", size: "2.1 MB", icon: FileImage },
  { id: 4, name: "threat_intel_report.pdf", size: "4.8 MB", icon: FileText },
  { id: 5, name: "memory_dump_srv01.raw", size: "8.2 GB", icon: FileCode },
]

export function EvidenceSection() {
  return (
    <section>
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-sm font-medium text-foreground">Evidence & Files</h2>
        <Button variant="ghost" size="sm" className="h-7 text-xs text-muted-foreground hover:text-foreground gap-1">
          <Plus className="w-3.5 h-3.5" />
          Upload
        </Button>
      </div>

      <div className="space-y-0.5">
        {evidence.map((item) => (
          <div
            key={item.id}
            className="group flex items-center gap-3 p-2 -mx-2 rounded hover:bg-secondary/50 transition-colors cursor-pointer"
          >
            <item.icon className="w-4 h-4 text-muted-foreground shrink-0" />
            <span className="flex-1 text-sm text-foreground truncate">{item.name}</span>
            <span className="text-xs text-muted-foreground">{item.size}</span>
          </div>
        ))}
      </div>
    </section>
  )
}
