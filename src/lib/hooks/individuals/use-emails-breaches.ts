import { supabase } from "@/lib/supabase/client"
import { useQuery } from "@supabase-cache-helpers/postgrest-swr"

export function useEmailsAndBreaches(individualId: string | null | undefined) {
    const { data: emails, error } = useQuery(
        individualId ? supabase.from("individuals").select(`*, emails(*)`).eq("id", individualId).single() : null,
        {
            revalidateOnFocus: false,
            revalidateOnReconnect: false,
        },
    )

    const emailAddresses = emails?.emails?.map(({ email }: { email: string }) => email) || []

    const { data: breaches, error: breachesError, mutate } = useQuery(
        emailAddresses.length > 0
            ? supabase.from("accounts_breaches").select(`account, breach:breach_id(raw_content)`).in("account", emailAddresses)
            : null,
        {
            revalidateOnFocus: false,
            revalidateOnReconnect: false,
        },
    )

    const formattedData = emailAddresses.map((email: string) => ({
        email,
        breaches: breaches?.filter((breach: any) => breach.account === email).map((breach: any) => breach.breach.raw_content) || [],
    }))

    const isLoading = !emails && !error

    return {
        emails: formattedData,
        isLoading,
        refetch: mutate,
        error: error || breachesError,
    }
}

