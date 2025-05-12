import React from 'react'
import { Tool } from "@/types"
import { ToolCard } from '@/components/tool-card'
const tools: Tool[] = [
    {
        name: "Maigret",
        path: "/tools/maigret",
        description: "Search for profiles across more than 500 sites based on a username.",
        active: true,
        repo: "https://github.com/soxoj/maigret",
        avatar: "https://raw.githubusercontent.com/soxoj/maigret/main/static/maigret.png"
    },
    {
        name: "Holehe",
        path: "/tools/holehe",
        description: "Check if an email address is associated with accounts on various websites.",
        active: true,
        repo: "https://github.com/megadose/holehe",
        avatar: "https://media.licdn.com/dms/image/v2/D560BAQEJNEwF0E6QyA/company-logo_200_200/company-logo_200_200/0/1731244005282/osint_industries_logo?e=1750896000&v=beta&t=2-4rC5YaEp5Rmt48ijR46XhB-Y4iPaQ3qBDQbVNAVFU"
    },
    {
        name: "API Sirene open data",
        path: "/tools/api-sirene-open-data",
        description: "The Sirene API allows you to query the Sirene directory of businesses and establishments, managed by Insee.",
        active: true,
        repo: "https://www.data.gouv.fr/fr/dataservices/api-sirene-open-data/",
        avatar: "https://www.portlarochelle.com/wp-content/uploads/2020/11/logo-Marianne.jpg"
    },
    {
        name: "Subfinder",
        path: "/tools/subfinder",
        description: "Fast passive subdomain enumeration tool.",
        active: true,
        repo: "https://github.com/projectdiscovery/subfinder",
        avatar: "https://avatars.githubusercontent.com/u/50994705?s=280&v=4"
    },
    {
        name: "Sherlock",
        path: "/tools/sherlock",
        description: "Search for user accounts across social networks.",
        active: true,
        repo: "https://github.com/sherlock-project/sherlock",
        avatar: "https://avatars.githubusercontent.com/u/48293496?s=200&v=4"
    },
    {
        name: "GHunt",
        path: "/tools/ghunt",
        description: "Analyze Google metadata (Gmail, Docs, Photos, etc.).",
        active: true,
        repo: "https://github.com/mxrch/GHunt",
        avatar: "https://media.licdn.com/dms/image/v2/D560BAQEJNEwF0E6QyA/company-logo_200_200/company-logo_200_200/0/1731244005282/osint_industries_logo?e=1750896000&v=beta&t=2-4rC5YaEp5Rmt48ijR46XhB-Y4iPaQ3qBDQbVNAVFU"
    },
    {
        name: "PhoneInfoga",
        path: "/tools/phoneinfoga",
        description: "Gather information from phone numbers.",
        active: false,
        repo: "https://github.com/sundowndev/phoneinfoga",
    },
    {
        name: "EmailRep",
        path: "/tools/emailrep",
        description: "Analyze the reputation of an email address (scam, social, etc.).",
        active: false,
        repo: "https://github.com/sublime-security/emailrep.io",
        avatar: "https://user-images.githubusercontent.com/11003450/115128085-5805da00-9fa9-11eb-8c7a-dc8b708053ee.png"
    },
    {
        name: "theHarvester",
        path: "/tools/theharvester",
        description: "Collect emails, domain names, IPs from public sources.",
        active: false,
        repo: "https://github.com/laramies/theHarvester",
    },
    {
        name: "DnsDumpster",
        path: "/tools/dnsdumpster",
        description: "DNS reconnaissance and network mapping from a domain.",
        active: false,
        repo: "https://github.com/PaulSec/API-dnsdumpster.com",
    },
    {
        name: "ExifTool",
        path: "/tools/exiftool",
        description: "Extract metadata from files (images, documents, etc.).",
        active: false,
        repo: "https://github.com/exiftool/exiftool",
        avatar: "https://avatars.githubusercontent.com/u/8656631?s=200&v=4"
    }
]


const ToolsPage = () => {
    return (
        <div className="w-full space-y-8 container mx-auto py-12 px-8">
            <div>
                <h1 className="font-semibold text-2xl">Tools</h1>
                <p className="opacity-60 mt-3">Here are the tools used to gather informations.</p>
            </div>
            <div className='w-full grid lg:grid-cols-3 md:grid-cols-2 grid-cols-1 xl:grid-cols-4 gap-4'>
                {tools.map((tool) => (
                    <ToolCard key={tool.name} tool={tool} />
                ))}
            </div>
        </div>
    )
}

export default ToolsPage