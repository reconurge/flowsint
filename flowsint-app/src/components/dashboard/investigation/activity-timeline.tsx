import { Network, FileText, Upload, AlertCircle, CheckCircle } from "lucide-react"

const activities = [
  {
    id: 1,
    action: "created sketch",
    subject: "Infrastructure mapping v3",
    user: "John",
    time: "2h ago",
    icon: Network,
  },
  {
    id: 2,
    action: "updated analysis",
    subject: "C2 Communication Patterns",
    user: "Sarah",
    time: "4h ago",
    icon: FileText,
  },
  {
    id: 3,
    action: "uploaded",
    subject: "network_capture_nov28.pcap",
    user: "Mike",
    time: "6h ago",
    icon: Upload,
  },
  {
    id: 4,
    action: "changed priority to",
    subject: "High",
    user: "John",
    time: "1d ago",
    icon: AlertCircle,
  },
  {
    id: 5,
    action: "completed",
    subject: "Initial triage review",
    user: "Sarah",
    time: "2d ago",
    icon: CheckCircle,
  },
]

export function ActivityTimeline() {
  return (
    <section>
      <h3 className="text-sm font-medium text-foreground mb-3">Activity</h3>
      <div className="space-y-2">
        {activities.map((activity) => (
          <div key={activity.id} className="flex items-start gap-3 py-2 text-sm">
            <activity.icon className="w-4 h-4 text-muted-foreground mt-0.5 shrink-0" />
            <div className="flex-1 min-w-0">
              <span className="text-muted-foreground">
                <span className="text-foreground">{activity.user}</span> {activity.action}{" "}
                <span className="text-foreground">{activity.subject}</span>
              </span>
              <span className="text-muted-foreground/60 ml-2">{activity.time}</span>
            </div>
          </div>
        ))}
      </div>
    </section>
  )
}
