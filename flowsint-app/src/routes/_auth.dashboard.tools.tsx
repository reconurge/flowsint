import { createFileRoute } from '@tanstack/react-router'
import { ToolCategory } from '@/types'
import { ToolCard } from '@/components/tool-card'
import { useState } from 'react'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '@/components/ui/select'
import { Input } from '@/components/ui/input'

export const Route = createFileRoute('/_auth/dashboard/tools')({
  component: ToolsPage
})

const toolCategories: ToolCategory = {
  'Social Media & Username Search': {
    Maigret: {
      name: 'Maigret',
      path: '/tools/maigret',
      description: 'Search for profiles across more than 500 sites based on a username.',
      active: true,
      link: 'https://github.com/soxoj/maigret',
      avatar: 'https://raw.githubusercontent.com/soxoj/maigret/main/static/maigret.png'
    },
    Sherlock: {
      name: 'Sherlock',
      path: '/tools/sherlock',
      description: 'Search for user accounts across social networks.',
      active: true,
      link: 'https://github.com/sherlock-project/sherlock',
      avatar: 'https://avatars.githubusercontent.com/u/48293496?s=200&v=4'
    }
  },
  'Email Analysis': {
    Holehe: {
      name: 'Holehe',
      path: '/tools/holehe',
      description: 'Check if an email address is associated with accounts on various websites.',
      active: true,
      link: 'https://github.com/megadose/holehe',
      avatar:
        'https://media.licdn.com/dms/image/v2/D560BAQEJNEwF0E6QyA/company-logo_200_200/company-logo_200_200/0/1731244005282/osint_industries_logo?e=1750896000&v=beta&t=2-4rC5YaEp5Rmt48ijR46XhB-Y4iPaQ3qBDQbVNAVFU'
    },
    EmailRep: {
      name: 'EmailRep',
      path: '/tools/emailrep',
      description: 'Analyze the reputation of an email address (scam, social, etc.).',
      active: false,
      link: 'https://github.com/sublime-security/emailrep.io',
      avatar:
        'https://user-images.githubusercontent.com/11003450/115128085-5805da00-9fa9-11eb-8c7a-dc8b708053ee.png'
    },
    theHarvester: {
      name: 'theHarvester',
      path: '/tools/theharvester',
      description: 'Collect emails, domain names, IPs from public sources.',
      active: false,
      link: 'https://github.com/laramies/theHarvester'
    },
    Epios: {
      name: 'Epios',
      path: '/tools/epios',
      description: 'Search engine to find emails, phone numbers, and more.',
      active: false,
      link: 'https://epieos.com/',
      avatar:
        'https://lh3.googleusercontent.com/p/AF1QipPXBjt3kUBUoN9wOOwWjdbCOaNfDOpUFPcep0IS=w243-h203-n-k-no-nu',
      apiKeyRequired: 'paid'
    }
  },
  'Domain & Network Analysis': {
    Subfinder: {
      name: 'Subfinder',
      path: '/tools/subfinder',
      description: 'Fast passive subdomain enumeration tool.',
      active: true,
      link: 'https://github.com/projectdiscovery/subfinder',
      avatar: 'https://avatars.githubusercontent.com/u/50994705?s=280&v=4'
    },
    DnsDumpster: {
      name: 'DnsDumpster',
      path: '/tools/dnsdumpster',
      description: 'DNS reconnaissance and network mapping from a domain.',
      active: false,
      link: 'https://github.com/PaulSec/API-dnsdumpster.com'
    },
    ASNMap: {
      name: 'ASNMap',
      path: '/tools/asnmap',
      description: 'ASN mapping and network reconnaissance tool.',
      active: true,
      link: 'https://github.com/projectdiscovery/asnmap',
      avatar: 'https://avatars.githubusercontent.com/u/50994705?s=280&v=4'
    }
  },
  'Blockchain Analysis': {
    Etherscan: {
      name: 'Etherscan',
      path: '/tools/etherscan',
      description: 'Blockchain explorer and analytics platform for Ethereum.',
      active: true,
      link: 'https://etherscan.io/apis',
      avatar: 'https://cdn.worldvectorlogo.com/logos/etherscan-1.svg',
      apiKeyRequired: 'free'
    }
  },
  'Metadata Analysis': {
    GHunt: {
      name: 'GHunt',
      path: '/tools/ghunt',
      description: 'Analyze Google metadata (Gmail, Docs, Photos, etc.).',
      active: true,
      link: 'https://github.com/mxrch/GHunt',
      avatar:
        'https://media.licdn.com/dms/image/v2/D560BAQEJNEwF0E6QyA/company-logo_200_200/company-logo_200_200/0/1731244005282/osint_industries_logo?e=1750896000&v=beta&t=2-4rC5YaEp5Rmt48ijR46XhB-Y4iPaQ3qBDQbVNAVFU'
    },
    ExifTool: {
      name: 'ExifTool',
      path: '/tools/exiftool',
      description: 'Extract metadata from files (images, documents, etc.).',
      active: false,
      link: 'https://github.com/exiftool/exiftool',
      avatar: 'https://avatars.githubusercontent.com/u/8656631?s=200&v=4'
    }
  },
  'Business Intelligence': {
    'API Sirene': {
      name: 'API Sirene open data',
      path: '/tools/api-sirene-open-data',
      description:
        'The Sirene API allows you to query the Sirene directory of businesses and establishments, managed by Insee.',
      active: true,
      link: 'https://www.data.gouv.fr/fr/dataservices/api-sirene-open-data/',
      avatar: 'https://www.portlarochelle.com/wp-content/uploads/2020/11/logo-Marianne.jpg'
    }
  },
  'Phone Analysis': {
    PhoneInfoga: {
      name: 'PhoneInfoga',
      path: '/tools/phoneinfoga',
      description: 'Gather information from phone numbers.',
      active: false,
      link: 'https://github.com/sundowndev/phoneinfoga'
    }
  }
}

function ToolsPage() {
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedCategory, setSelectedCategory] = useState<string>('all')

  // Flatten all tools into a single array with their categories
  const allTools = Object.entries(toolCategories).flatMap(([category, tools]) =>
    Object.values(tools).map((tool) => ({
      ...tool,
      category
    }))
  )

  // Filter tools based on search query and selected category
  const filteredTools = allTools.filter((tool) => {
    const matchesSearch =
      tool.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      tool.description?.toLowerCase().includes(searchQuery.toLowerCase())
    const matchesCategory = selectedCategory === 'all' || tool.category === selectedCategory
    return matchesSearch && matchesCategory
  })

  return (
    <div className="h-full w-full px-12 py-12 bg-background overflow-auto">
      <div className="max-w-7xl mx-auto flex flex-col gap-12 items-center justify-start">
        <div className="w-full">
          <h1 className="font-semibold text-2xl">Tools</h1>
          <p className="opacity-60 mt-3">Here are the tools used to gather informations.</p>
        </div>

        <div className="w-full flex flex-col md:flex-row gap-4">
          <div className="flex-1">
            <Input
              type="text"
              placeholder="Search tools..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
          <div className="w-full md:w-64">
            <Select value={selectedCategory} onValueChange={setSelectedCategory}>
              <SelectTrigger className="h-10 w-full">
                <SelectValue placeholder="Select category" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Categories</SelectItem>
                {Object.keys(toolCategories).map((category) => (
                  <SelectItem key={category} value={category}>
                    {category}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="w-full grid lg:grid-cols-3 md:grid-cols-2 grid-cols-1 xl:grid-cols-4 gap-4">
          {filteredTools.map((tool) => (
            <ToolCard key={tool.name} tool={tool} />
          ))}
        </div>
      </div>
    </div>
  )
}

export default ToolsPage
