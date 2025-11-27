import { memo } from 'react'
import { HelpCircle } from 'lucide-react'
import { Dialog, DialogContent, DialogTrigger } from '../ui/dialog'
import { Button } from '../ui/button'

const InfoDialog = () => {
  return (
    <>
      <Dialog>
        <DialogTrigger asChild>
          <div>
            <Button variant="ghost" size="sm" className="h-6 gap-1 text-xs">
              <HelpCircle className="h-3 w-3 opacity-60" />
            </Button>
          </div>
        </DialogTrigger>
        <DialogContent className="sm:max-w-2xl">
          <div className="p-2">
            <div className="p-2 text-sm space-y-4 overflow-y-auto max-h-[80vh]">
              <h2 className="text-base font-semibold flex items-center gap-2">About Flowsint</h2>
              <p>
                <strong>Flowsint</strong> is an{' '}
                <strong>investigation and intelligence platform</strong> built to support complex
                research workflows involving{' '}
                <strong>people, organizations, infrastructure, and online activity</strong>.
              </p>

              <p>
                Whether you're conducting <strong>cyber investigations</strong>, mapping out{' '}
                <strong>fraud networks</strong>, or gathering intelligence for{' '}
                <strong>threat assessments</strong>, Flowsint helps you collect, visualize, and
                understand fragmented data points in a structured and interactive way.
              </p>

              <h3 className="font-semibold">What Flowsint Does</h3>
              <ul className="list-disc list-inside space-y-1">
                <li>
                  <strong>Connects scattered data</strong> — emails, domains, social accounts, IPs,
                  phone numbers, addresses, and more — into a single{' '}
                  <strong>investigative graph</strong>.
                </li>
                <li>
                  Offers <strong>visual enrichers</strong> to pivot from one entity to related
                  ones: find <strong>connected individuals</strong>, discover{' '}
                  <strong>infrastructure</strong>, uncover <strong>aliases</strong>.
                </li>
                <li>
                  <strong>Tracks and saves investigation states</strong> over time, letting you
                  explore multiple hypotheses or revisit older threads without losing context.
                </li>
                <li>
                  Supports <strong>live data enrichment</strong> from custom or built-in enrichers,
                  giving you <strong>actionable insights</strong> as you explore.
                </li>
              </ul>

              <h3 className="font-semibold">Why Use Flowsint?</h3>
              <ul className="list-disc list-inside space-y-1">
                <li>
                  Built for <strong>speed and clarity</strong> — fast graph rendering, clean UI,
                  responsive enrichers.
                </li>
                <li>
                  <strong>Flexible graph model</strong> that mirrors how investigators think — not
                  just tables and tags, but <strong>relationships</strong>.
                </li>
                <li>
                  Ideal for <strong>solo analysts and teams</strong> that need to move fast, explore
                  freely, and make sense of <strong>partial or messy data</strong>.
                </li>
              </ul>

              <h3 className="font-semibold">Use Cases</h3>
              <ul className="list-disc list-inside space-y-1">
                <li>
                  Mapping <strong>digital infrastructure</strong> of individuals or organizations
                </li>
                <li>
                  Investigating <strong>online fraud schemes</strong> or{' '}
                  <strong>fake identities</strong>
                </li>
                <li>
                  Uncovering <strong>links between actors</strong> across platforms
                </li>
                <li>
                  Visualizing the reach of <strong>leaked or exposed data</strong>
                </li>
                <li>
                  Tracking <strong>threat actor behavior</strong> across social and technical
                  surfaces
                </li>
              </ul>

              <p>
                Flowsint is designed for <strong>professionals</strong> who need{' '}
                <strong>full control</strong> over their investigation logic, from how data is
                structured to how relationships are interpreted. It's not just a tool — it's a{' '}
                <strong>flexible workspace</strong> for building intelligence.
              </p>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  )
}

export default memo(InfoDialog)
