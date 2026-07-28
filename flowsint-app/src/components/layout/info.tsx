import { memo } from 'react'
import { HelpCircle } from 'lucide-react'
import { Dialog, DialogContent, DialogTrigger } from '../ui/dialog'
import { Button } from '../ui/button'
import { useTranslation } from 'react-i18next'

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
              
              <p dangerouslySetInnerHTML={{ __html: t('footer.info.p1') }} />
              <p dangerouslySetInnerHTML={{ __html: t('footer.info.p2') }} />

              <h3 className="font-semibold">{t('footer.info.whatItDoes')}</h3>
              <ul className="list-disc list-inside space-y-1">
                <li dangerouslySetInnerHTML={{ __html: t('footer.info.does1') }} />
                <li dangerouslySetInnerHTML={{ __html: t('footer.info.does2') }} />
                <li dangerouslySetInnerHTML={{ __html: t('footer.info.does3') }} />
                <li dangerouslySetInnerHTML={{ __html: t('footer.info.does4') }} />
              </ul>

              <h3 className="font-semibold">{t('footer.info.whyUse')}</h3>
              <ul className="list-disc list-inside space-y-1">
                <li dangerouslySetInnerHTML={{ __html: t('footer.info.why1') }} />
                <li dangerouslySetInnerHTML={{ __html: t('footer.info.why2') }} />
                <li dangerouslySetInnerHTML={{ __html: t('footer.info.why3') }} />
              </ul>

              <h3 className="font-semibold">{t('footer.info.useCases')}</h3>
              <ul className="list-disc list-inside space-y-1">
                <li dangerouslySetInnerHTML={{ __html: t('footer.info.case1') }} />
                <li dangerouslySetInnerHTML={{ __html: t('footer.info.case2') }} />
                <li dangerouslySetInnerHTML={{ __html: t('footer.info.case3') }} />
                <li dangerouslySetInnerHTML={{ __html: t('footer.info.case4') }} />
                <li dangerouslySetInnerHTML={{ __html: t('footer.info.case5') }} />
              </ul>

              <p dangerouslySetInnerHTML={{ __html: t('footer.info.p3') }} />
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  )
}

export default memo(InfoDialog)
