import { analysisService } from "@/api/analysis-service"
import { Analysis } from "@/types"
import { useMutation, useQueryClient } from "@tanstack/react-query"
import { useTranslation } from 'react-i18next'
import { queryKeys } from "@/api/query-keys"
import { toast } from "sonner"

const generateDefaultContent = (t: any) => ({
    "type": "doc",
    "content": [
        {
            "type": "heading",
            "attrs": { "level": 2 },
            "content": [{ "type": "text", "text": t('sketches.analysisEditor.template.title', { defaultValue: 'Title of your investigation' }) }]
        },
        {
            "type": "paragraph",
            "content": [{ "type": "text", "text": t('sketches.analysisEditor.template.titleDesc', { defaultValue: 'Include a clear title, your organization’s name, and the date.' }) }]
        },
        {
            "type": "heading",
            "attrs": { "level": 3 },
            "content": [{ "type": "text", "marks": [{ "type": "textStyle", "attrs": { "color": "" } }, { "type": "bold" }], "text": t('sketches.analysisEditor.template.execSummary', { defaultValue: 'Executive Summary' }) }]
        },
        {
            "type": "paragraph",
            "content": [{ "type": "text", "text": t('sketches.analysisEditor.template.execSummaryDesc', { defaultValue: 'A snapshot of key findings and recommendations.' }) }]
        },
        {
            "type": "heading",
            "attrs": { "level": 3 },
            "content": [{ "type": "text", "marks": [{ "type": "textStyle", "attrs": { "color": "" } }, { "type": "bold" }], "text": t('sketches.analysisEditor.template.intro', { defaultValue: 'Introduction' }) }]
        },
        {
            "type": "paragraph",
            "content": [{ "type": "text", "text": t('sketches.analysisEditor.template.introDesc', { defaultValue: 'Define the scope and objectives.' }) }]
        },
        {
            "type": "heading",
            "attrs": { "level": 4 },
            "content": [{ "type": "text", "marks": [{ "type": "textStyle", "attrs": { "color": "" } }, { "type": "bold" }], "text": t('sketches.analysisEditor.template.mainBody', { defaultValue: 'Main Body' }) }]
        },
        {
            "type": "paragraph",
            "content": [{ "type": "text", "marks": [{ "type": "textStyle", "attrs": { "color": "" } }], "text": t('sketches.analysisEditor.template.mainBodyDesc', { defaultValue: 'Dive into the findings, broken into logical sections.' }) }]
        },
        {
            "type": "heading",
            "attrs": { "level": 4 },
            "content": [{ "type": "text", "marks": [{ "type": "textStyle", "attrs": { "color": "" } }, { "type": "bold" }], "text": t('sketches.analysisEditor.template.analysis', { defaultValue: 'Analysis' }) }]
        },
        {
            "type": "paragraph",
            "content": [{ "type": "text", "text": t('sketches.analysisEditor.template.analysisDesc', { defaultValue: 'Highlight patterns, anomalies, and actionable insights.' }) }]
        },
        {
            "type": "paragraph",
            "content": [{ "type": "text", "marks": [{ "type": "textStyle", "attrs": { "color": "" } }, { "type": "bold" }], "text": t('sketches.analysisEditor.template.conclusion', { defaultValue: 'Conclusion and Recommendations' }) }]
        },
        {
            "type": "paragraph",
            "content": [{ "type": "text", "text": t('sketches.analysisEditor.template.conclusionDesc', { defaultValue: 'Wrap up with a clear summary and next steps.' }) }]
        },
        {
            "type": "heading",
            "attrs": { "level": 4 },
            "content": [{ "type": "text", "marks": [{ "type": "textStyle", "attrs": { "color": "" } }, { "type": "bold" }], "text": t('sketches.analysisEditor.template.appendices', { defaultValue: 'Appendices' }) }]
        },
        {
            "type": "paragraph",
            "content": [
                { "type": "text", "marks": [{ "type": "textStyle", "attrs": { "color": "" } }], "text": t('sketches.analysisEditor.template.appendicesDesc1', { defaultValue: 'Include raw data or supporting documents if ' }) },
                { "type": "text", "text": t('sketches.analysisEditor.template.appendicesDesc2', { defaultValue: 'needed.' }) }
            ]
        }
    ]
});

export const useCreateAnalysis = (investigationId: string, onAnalysisCreate?: any) => {

    const queryClient = useQueryClient()
    const { t } = useTranslation()

    return useMutation({
        mutationFn: async () => {
            const newAnalysis: Partial<Analysis> = {
                title: t('sketches.analysisEditor.untitledAnalysis', { defaultValue: 'Untitled Analysis' }),
                investigation_id: investigationId,
                content: generateDefaultContent(t)
            }
            const res = await analysisService.create(JSON.stringify(newAnalysis))
            return res
        },
        onSuccess: async () => {
            queryClient.invalidateQueries({
                queryKey: queryKeys.analyses.byInvestigation(investigationId || '')
            })
            onAnalysisCreate?.(investigationId)
            toast.success(t('sketches.analysisEditor.toasts.createSuccess', { defaultValue: 'New analysis created' }))
        },
        onError: (error) => {
            toast.error(
                t('sketches.analysisEditor.toasts.createFailed', { defaultValue: 'Failed to create analysis: ' }) + (error instanceof Error ? error.message : 'Unknown error')
            )
        }
    })
}
