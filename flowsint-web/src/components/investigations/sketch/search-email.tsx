import { Button } from '@/components/ui/button'
import React, { useCallback } from 'react'
import { toast } from 'sonner'
import { checkEmail } from '@/lib/actions/search'
const SearchEmail = ({ investigation_id, email }: { investigation_id: string, email: string }) => {

    const [disabled, setDisabled] = React.useState(false)
    const handleCheckEmail = useCallback(() => {
        // @ts-ignore
        setDisabled(true)
        if (!investigation_id && !email) return
        // @ts-ignore
        toast.promise(checkEmail(email, investigation_id), {
            loading: "Loading...",
            success: () => {
                setDisabled(false)
                return `Scan on ${email} has been launched.`
            },
            error: (error: any) => {
                setDisabled(false)
                return (
                    <div className="overflow-hidden">
                        <p className="font-bold">An error occured.</p>
                        <pre className="overflow-auto">
                            <code>{JSON.stringify(error, null, 2)}</code>
                        </pre>
                    </div>
                )
            },
        })
    }, [email, investigation_id])
    return (
        <Button disabled={disabled} onClick={handleCheckEmail}>Search socials</Button>
    )
}

export default SearchEmail