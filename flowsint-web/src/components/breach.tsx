"use client"

import type React from "react"
import * as Accordion from "@radix-ui/react-accordion"
import { ChevronDownIcon } from "@radix-ui/react-icons"
import Image from "next/image"

type BreachData = {
    Name: string
    Title: string
    Domain: string
    BreachDate: string
    AddedDate: string
    ModifiedDate: string
    PwnCount: number
    Description: string
    LogoPath: string
    DataClasses: string[]
    IsVerified: boolean
    IsFabricated: boolean
    IsSensitive: boolean
    IsRetired: boolean
    IsSpamList: boolean
    IsMalware: boolean
    IsSubscriptionFree: boolean
    IsStealerLog: boolean
}

type BreachProps = {
    breaches: BreachData[]
}
const Breaches: React.FC<BreachProps> = ({ breaches }) => {
    return (
        <Accordion.Root type="single" collapsible className="w-full mx-auto">
            {breaches.map((breach) => (
                <Accordion.Item
                    key={breach.Name}
                    value={breach.Name}
                    className="mt-2 border dark:border-gray-500/10 rounded-lg overflow-hidden"
                >
                    <Accordion.Trigger className="flex items-center justify-between w-full p-2 text-left">
                        <div className="flex items-center space-x-4">
                            <Image
                                src={breach.LogoPath || "/placeholder.svg"}
                                alt={`${breach.Title} logo`}
                                width={40}
                                height={40}
                                className="rounded-full h-[40px] w-[40px]"
                            />
                            <div>
                                <h3 className="text-lg font-semibold">{breach.Title}</h3>
                                <p className="text-sm">{new Date(breach.BreachDate).toLocaleDateString()}</p>
                            </div>
                        </div>
                        <ChevronDownIcon
                            className="w-6 h-6 transition-transform duration-300 ease-in-out"
                            aria-hidden
                        />
                    </Accordion.Trigger>
                    <Accordion.Content className="p-6">
                        <div className="space-y-3">
                            <div>
                                <h4 className="text-sm font-semibold">Description:</h4>
                                <p className="text-sm opacity-70" dangerouslySetInnerHTML={{ __html: breach.Description }} />
                            </div>
                            <div>
                                <h4 className="text-sm font-semibold">Compromised Data:</h4>
                                <ul className="list-disc list-inside text-sm opacity-70">
                                    {breach.DataClasses.map((dataClass) => (
                                        <li key={dataClass}>{dataClass}</li>
                                    ))}
                                </ul>
                            </div>
                            <div className="grid grid-cols-2 gap-4 text-sm">
                                <div>
                                    <h4 className="font-semibold">Affected Accounts:</h4>
                                    <p className="opacity-70">{breach.PwnCount.toLocaleString()}</p>
                                </div>
                                <div>
                                    <h4 className="font-semibold">Domain:</h4>
                                    <p className="opacity-70">{breach.Domain || "N/A"}</p>
                                </div>
                                <div>
                                    <h4 className="font-semibold">Added Date:</h4>
                                    <p className="opacity-70">{new Date(breach.AddedDate).toLocaleDateString()}</p>
                                </div>
                                <div>
                                    <h4 className="font-semibold">Modified Date:</h4>
                                    <p className="opacity-70">{new Date(breach.ModifiedDate).toLocaleDateString()}</p>
                                </div>
                            </div>
                            <div className="grid grid-cols-2 gap-2 text-sm">
                                {Object.entries(breach)
                                    .filter(([key, value]) => typeof value === "boolean")
                                    .map(([key, value]) => (
                                        <div key={key} className="flex items-center">
                                            <span className={`w-4 h-4 mr-2 rounded-full ${value ? "bg-green-500" : "bg-red-500"}`}></span>
                                            <span className="opacity-70">{key.replace(/^Is/, "")}</span>
                                        </div>
                                    ))}
                            </div>
                        </div>
                    </Accordion.Content>
                </Accordion.Item>
            ))}
        </Accordion.Root>
    )
}

export default Breaches