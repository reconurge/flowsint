import { memo } from 'react'
import { HelpCircle } from 'lucide-react'
import { Dialog, DialogContent, DialogTrigger } from '../ui/dialog'
import { Button } from '../ui/button'
import { useTranslation, Trans } from 'react-i18next'

const InfoDialog = () => {
  const { t } = useTranslation()
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
              <h2 className="text-base font-semibold flex items-center gap-2">{t('footer.info.title')}</h2>
              <p>
                <Trans i18nKey="footer.info.p1">
                  <strong>Flowsint</strong> is an{' '}
                  <strong>investigation and intelligence platform</strong> built to support complex
                  research workflows involving{' '}
                  <strong>people, organizations, infrastructure, and online activity</strong>.
                </Trans>
              </p>

              <p>
                <Trans i18nKey="footer.info.p2">
                  Whether you're conducting <strong>cyber investigations</strong>, mapping out{' '}
                  <strong>fraud networks</strong>, or gathering intelligence for{' '}
                  <strong>threat assessments</strong>, Flowsint helps you collect, visualize, and
                  understand fragmented data points in a structured and interactive way.
                </Trans>
              </p>

              <h3 className="font-semibold">{t('footer.info.whatItDoes')}</h3>
              <ul className="list-disc list-inside space-y-1">
                <li>
                  <Trans i18nKey="footer.info.does1">
                    <strong>Connects scattered data</strong> — emails, domains, social accounts, IPs,
                    phone numbers, addresses, and more — into a single{' '}
                    <strong>investigative graph</strong>.
                  </Trans>
                </li>
                <li>
                  <Trans i18nKey="footer.info.does2">
                    Offers <strong>visual enrichers</strong> to pivot from one entity to related
                    ones: find <strong>connected individuals</strong>, discover{' '}
                    <strong>infrastructure</strong>, uncover <strong>aliases</strong>.
                  </Trans>
                </li>
                <li>
                  <Trans i18nKey="footer.info.does3">
                    <strong>Tracks and saves investigation states</strong> over time, letting you
                    explore multiple hypotheses or revisit older threads without losing context.
                  </Trans>
                </li>
                <li>
                  <Trans i18nKey="footer.info.does4">
                    Supports <strong>live data enrichment</strong> from custom or built-in enrichers,
                    giving you <strong>actionable insights</strong> as you explore.
                  </Trans>
                </li>
              </ul>

              <h3 className="font-semibold">{t('footer.info.whyUse')}</h3>
              <ul className="list-disc list-inside space-y-1">
                <li>
                  <Trans i18nKey="footer.info.why1">
                    Built for <strong>speed and clarity</strong> — fast graph rendering, clean UI,
                    responsive enrichers.
                  </Trans>
                </li>
                <li>
                  <Trans i18nKey="footer.info.why2">
                    <strong>Flexible graph model</strong> that mirrors how investigators think — not
                    just tables and tags, but <strong>relationships</strong>.
                  </Trans>
                </li>
                <li>
                  <Trans i18nKey="footer.info.why3">
                    Ideal for <strong>solo analysts and teams</strong> that need to move fast, explore
                    freely, and make sense of <strong>partial or messy data</strong>.
                  </Trans>
                </li>
              </ul>

              <h3 className="font-semibold">{t('footer.info.useCases')}</h3>
              <ul className="list-disc list-inside space-y-1">
                <li>
                  <Trans i18nKey="footer.info.case1">
                    Mapping <strong>digital infrastructure</strong> of individuals or organizations
                  </Trans>
                </li>
                <li>
                  <Trans i18nKey="footer.info.case2">
                    Investigating <strong>online fraud schemes</strong> or{' '}
                    <strong>fake identities</strong>
                  </Trans>
                </li>
                <li>
                  <Trans i18nKey="footer.info.case3">
                    Uncovering <strong>links between actors</strong> across platforms
                  </Trans>
                </li>
                <li>
                  <Trans i18nKey="footer.info.case4">
                    Visualizing the reach of <strong>leaked or exposed data</strong>
                  </Trans>
                </li>
                <li>
                  <Trans i18nKey="footer.info.case5">
                    Tracking <strong>threat actor behavior</strong> across social and technical
                    surfaces
                  </Trans>
                </li>
              </ul>

              <p>
                <Trans i18nKey="footer.info.p3">
                  Flowsint is designed for <strong>professionals</strong> who need{' '}
                  <strong>full control</strong> over their investigation logic, from how data is
                  structured to how relationships are interpreted. It's not just a tool — it's a{' '}
                  <strong>flexible workspace</strong> for building intelligence.
                </Trans>
              </p>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  )
}

export default memo(InfoDialog)
