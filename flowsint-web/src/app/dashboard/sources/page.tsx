import React from 'react'
import { Tool } from "@/types"
import { ToolCard } from '@/components/tool-card'
const tools: Tool[] = [
    {
        name: "Maigret",
        path: "/tools/maigret",
        description: "Search for profiles across more than 500 sites based on a username.",
    },
    {
        name: "Holehe",
        path: "/tools/holehe",
        description: "Check if an email address is associated with accounts on various websites.",
    },
    {
        name: "PhoneInfoga",
        path: "/tools/phoneinfoga",
        description: "Gather information from phone numbers.",
    },
    {
        name: "EmailRep",
        path: "/tools/emailrep",
        description: "Analyze the reputation of an email address (scam, social, etc.).",
    },
    {
        name: "Sherlock",
        path: "/tools/sherlock",
        description: "Search for user accounts across social networks.",
    },
    {
        name: "GHunt",
        path: "/tools/ghunt",
        description: "Analyze Google metadata (Gmail, Docs, Photos, etc.).",
    },
    {
        name: "theHarvester",
        path: "/tools/theharvester",
        description: "Collect emails, domain names, IPs from public sources.",
    },
    {
        name: "Sublist3r",
        path: "/tools/sublist3r",
        description: "Enumerate subdomains from a domain name.",
    },
    {
        name: "DnsDumpster",
        path: "/tools/dnsdumpster",
        description: "DNS reconnaissance and network mapping from a domain.",
    },
    {
        name: "ExifTool",
        path: "/tools/exiftool",
        description: "Extract metadata from files (images, documents, etc.).",
    }
]

const SourcesPage = () => {
    return (
        <div className="w-full space-y-8 container mx-auto py-12 px-8">
            <div className='w-full grid md:grid-cols-3 sm:grid-cols-2 grid-cols-1 lg:grid-cols-4 gap-4'>
                {tools.map((tool) => (
                    <ToolCard key={tool.name} tool={tool} />
                ))}
            </div>
        </div>
    )
}

export default SourcesPage