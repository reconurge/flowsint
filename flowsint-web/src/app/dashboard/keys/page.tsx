"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Trash2 } from "lucide-react"
import { Separator } from "@/components/ui/separator"

export default function TokensPage() {
  const [tokens, setTokens] = useState([
    {
      id: "1",
      name: "My key",
      key: "****************************CmDi",
      expiration: "Jamais",
    },
  ])

  return (
      <div className="space-y-12 container mx-auto py-12 px-8">
        <div>
          <div className="flex justify-between items-start mb-4">
            <div>
              <h1 className="text-2xl font-bold">Vos clés API</h1>
              <p className="text-muted-foreground mt-1">
                Gérez vos clés API personnelles pour votre espace de travail actuel
              </p>
            </div>
            <Button className="bg-primary text-white">Créer une nouvelle clé</Button>
          </div>
          <Separator className="my-6" />
          <p className="text-muted-foreground mb-8">
            Vous pouvez créer jusqu&apos;à 10 clés API et les supprimer lorsque vous n&apos;en avez plus besoin.
          </p>

          <Tabs defaultValue="active">
            <TabsList className="bg-transparent border-b w-full justify-start rounded-none p-0 h-auto">
              <TabsTrigger
                value="active"
                className="rounded-none border-b-2 border-transparent data-[state=active]:shadow-none data-[state=active]:border-primary data-[state=active]:text-primary px-4 py-2 font-medium"
              >
                Actives
              </TabsTrigger>
              <TabsTrigger
                value="expired"
                className="rounded-none border-b-2 border-transparent data-[state=active]:shadow-none data-[state=active]:border-primary data-[state=active]:text-primary px-4 py-2 font-medium"
              >
                Expirées
              </TabsTrigger>
            </TabsList>
            <TabsContent value="active" className="mt-6">
              <div className="border rounded-md">
                <table className="w-full">
                  <thead>
                    <tr className="border-b">
                      <th className="text-left py-3 px-4 font-medium opacity-60">Nom</th>
                      <th className="text-left py-3 px-4 font-medium opacity-60">Clé</th>
                      <th className="text-left py-3 px-4 font-medium opacity-60">Expiration</th>
                      <th className="py-3 px-4"></th>
                    </tr>
                  </thead>
                  <tbody>
                    {tokens.map((token) => (
                      <tr key={token.id} className="border-b last:border-0">
                        <td className="py-4 px-4">{token.name}</td>
                        <td className="py-4 px-4 font-mono">{token.key}</td>
                        <td className="py-4 px-4">{token.expiration}</td>
                        <td className="py-4 px-4 text-right">
                          <Button variant="ghost" size="icon">
                            <Trash2 className="h-5 w-5 text-gray-500" />
                          </Button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </TabsContent>
            <TabsContent value="expired" className="mt-6">
              <div className="border rounded-md p-8 text-center text-muted-foreground">
                Aucune clé API expirée
              </div>
            </TabsContent>
          </Tabs>
        </div>
        <div>
          <div className="flex justify-between items-start mb-4">
            <div>
              <h1 className="text-xl font-bold">Vos clés de services tiers</h1>
              <p className="text-muted-foreground mt-1">
                Gérez vos clés de services tiers pour votre espace de travail actuel
              </p>
            </div>
            {/* <Button className="bg-primary text-white">Créer une nouvelle clé</Button> */}
          </div>
          <Tabs defaultValue="active">
            <TabsList className="bg-transparent border-b w-full justify-start rounded-none p-0 h-auto">
              <TabsTrigger
                value="active"
                className="rounded-none border-b-2 border-transparent data-[state=active]:shadow-none data-[state=active]:border-primary data-[state=active]:text-primary px-4 py-2 font-medium"
              >
                Actives
              </TabsTrigger>
              <TabsTrigger
                value="expired"
                className="rounded-none border-b-2 border-transparent data-[state=active]:shadow-none data-[state=active]:border-primary data-[state=active]:text-primary px-4 py-2 font-medium"
              >
                Expirées
              </TabsTrigger>
            </TabsList>
            <TabsContent value="active" className="mt-6">
              <div className="border rounded-md">
                <table className="w-full">
                  <thead>
                    <tr className="border-b">
                      <th className="text-left py-3 px-4 font-medium opacity-60">Nom</th>
                      <th className="text-left py-3 px-4 font-medium opacity-60">Clé</th>
                      <th className="text-left py-3 px-4 font-medium opacity-60">Expiration</th>
                      <th className="py-3 px-4"></th>
                    </tr>
                  </thead>
                  <tbody>
                    {tokens.map((token) => (
                      <tr key={token.id} className="border-b last:border-0">
                        <td className="py-4 px-4">{token.name}</td>
                        <td className="py-4 px-4 font-mono">{token.key}</td>
                        <td className="py-4 px-4">{token.expiration}</td>
                        <td className="py-4 px-4 text-right">
                          <Button variant="ghost" size="icon">
                            <Trash2 className="h-5 w-5 text-gray-500" />
                          </Button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </TabsContent>
            <TabsContent value="expired" className="mt-6">
              <div className="border rounded-md p-8 text-center text-muted-foreground">
                Aucune clé API expirée
              </div>
            </TabsContent>
          </Tabs>
        </div>
      </div>
  )
}

