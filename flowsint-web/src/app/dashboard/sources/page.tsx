import React from 'react'
import { Tool } from "@/types"
import { ToolCard } from '@/components/tool-card'
export const tools: Tool[] = [
    {
        name: "Maigret",
        path: "/tools/maigret",
        description: "Recherche de profils sur plus de 500 sites à partir d'un username.",
    },
    {
        name: "Holehe",
        path: "/tools/holehe",
        description: "Vérifie si une adresse e-mail est utilisée pour des comptes sur différents sites web.",
    },
    {
        name: "PhoneInfoga",
        path: "/tools/phoneinfoga",
        description: "Collecte d'informations à partir de numéros de téléphone.",
    },
    {
        name: "EmailRep",
        path: "/tools/emailrep",
        description: "Analyse de réputation d'adresse email (scam, social, etc.).",
    },
    {
        name: "Sherlock",
        path: "/tools/sherlock",
        description: "Recherche de comptes utilisateurs sur les réseaux sociaux.",
    },
    {
        name: "GHunt",
        path: "/tools/ghunt",
        description: "Analyse des métadonnées Google (Gmail, Docs, Photos, etc.).",
    },
    {
        name: "theHarvester",
        path: "/tools/theharvester",
        description: "Collecte d'emails, noms de domaine, IPs depuis des sources publiques.",
    },
    {
        name: "Sublist3r",
        path: "/tools/sublist3r",
        description: "Enumération de sous-domaines à partir d'un nom de domaine.",
    },
    {
        name: "DnsDumpster",
        path: "/tools/dnsdumpster",
        description: "Reconnaissance DNS et cartographie réseau à partir d'un domaine.",
    },
    {
        name: "ExifTool",
        path: "/tools/exiftool",
        description: "Extraction de métadonnées des fichiers (images, documents, etc.).",
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