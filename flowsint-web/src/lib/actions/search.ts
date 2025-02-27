'use server'
import { createClient } from "../supabase/server";

export async function checkEmail(email: string) {
    const url = `http://localhost:5000/scan/`;
        const response = await fetch(url, {
            method: 'POST',
            headers: {
                "Content-Type": "application/json",
            },
            body: JSON.stringify({
                "email": email
            })
        },
        );
        return response.json();
}

async function checkBreachedAccount(account: string | number | boolean, apiKey: string, appName: string) {
    const url = `https://haveibeenpwned.com/api/v3/breachedaccount/${encodeURIComponent(account)}?truncateResponse=false`;
    const supabase = await createClient()
    try {
        const response = await fetch(url, {
            method: 'GET',
            headers: {
                'hibp-api-key': apiKey,
                'user-agent': appName
            }
        });

        if (response.ok) {
            const data = await response.json() as any[];
            for (const breach of data) {
                // insert a new breach if not exist
                const { error } = await supabase.from('breaches').upsert({
                    name: breach.Name, description: breach.Description, raw_content: breach
                }, { onConflict: 'name' })
                if (error) return error
                // then get the breach and upsert a new relation with account
                const { data: br, error: breachError } = await supabase.from('breaches')
                    .select('id')
                    .eq("name", breach.Name).single()
                if (breachError) return breachError
                if (br) {
                    // finally insert new relation between account and breach
                    const { error: relationError } = await supabase.from('accounts_breaches').upsert({
                        account: account, breach_id: br.id
                    }, {
                        onConflict: 'account,breach_id'
                    })
                    if (relationError) return relationError
                }

            }
            return data;
        } else if (response.status === 404) {
            return `Good news! Account ${account} hasn't been found in any breaches.`;
        } else {
            return `Error: ${response.status} - ${response.statusText}`;
        }
    } catch (error) {
        console.error('An error occurred:', error);
        return null;
    }
}

const apiKey = process.env.HIBP_API_KEY || ""
const appName = 'MyHIBPChecker';

export async function investigateHIBPwd(username: string) {
    if (!username) {
        throw new Error("Malformed query.")
    }
    return checkBreachedAccount(username, apiKey, appName);

}