import { Button, Card, IconButton, Separator, Table, Tabs } from "@radix-ui/themes"
import { Trash2 } from 'lucide-react'

export default function APIKeys() {
    return (
        <div className="max-w-6xl mx-auto p-6 space-y-24">
            <div>
                <div className="flex flex-col justify-between items-start mb-4">
                    <div className="flex justify-between w-full items-center">
                        <div>
                            <h1 className="text-3xl font-semibold mb-2">Vos clés API</h1>
                            <p className="mb-6 opacity-70">
                                Gérez vos clés API personnelles pour votre espace de travail.
                            </p>
                        </div>
                        <Button
                        >
                            Créer une nouvelle clé
                        </Button>
                    </div>
                    <Separator className='w-full' size={"4"} />
                    <p className="mb-8 mt-4 opacity-70">
                        Vous pouvez créer jusqu&apos;à 10 clés API et les supprimer lorsque vous n&apos;en avez plus besoin.
                    </p>
                </div>
                <Tabs.Root defaultValue="active" className="mb-3">
                    <Tabs.List>
                        <Tabs.Trigger
                            value="active"
                        >
                            Actif
                        </Tabs.Trigger>
                        <Tabs.Trigger
                            value="expired"
                        >
                            Expiré
                        </Tabs.Trigger>
                    </Tabs.List>
                </Tabs.Root>
                <Card>
                    <Table.Root>
                        <Table.Header>
                            <Table.Row>
                                <Table.ColumnHeaderCell className="w-[300px]">Nom</Table.ColumnHeaderCell>
                                <Table.ColumnHeaderCell>Clé</Table.ColumnHeaderCell>
                                <Table.ColumnHeaderCell className="text-right">Date d&apos;expiration</Table.ColumnHeaderCell>
                                <Table.ColumnHeaderCell className="w-[50px]"></Table.ColumnHeaderCell>
                            </Table.Row>
                        </Table.Header>
                        <Table.Body>
                            <Table.Row>
                                <Table.RowHeaderCell>clé d&apos;essai</Table.RowHeaderCell>
                                <Table.Cell className="font-mono">************************pnA5</Table.Cell>
                                <Table.Cell className="text-right">15 février 2025</Table.Cell>
                                <Table.Cell>
                                    <IconButton variant="ghost">
                                        <Trash2 className="h-4 w-4" />
                                    </IconButton>
                                </Table.Cell>
                            </Table.Row>
                        </Table.Body>
                    </Table.Root>
                </Card>
            </div>
            <div>
                <div className="flex flex-col justify-between items-start mb-4">
                    <div className="flex justify-between w-full items-center">
                        <div>
                            <h1 className="text-3xl font-semibold mb-2">Vos clés de services tiers</h1>
                            <p className="mb-6 opacity-70">
                                Gérez vos clés API de services tiers pour votre espace de travail.
                            </p>
                        </div>
                        <Button
                        >
                            Créer une nouvelle clé
                        </Button>
                    </div>
                </div>
                <Tabs.Root defaultValue="active" className="mb-3">
                    <Tabs.List>
                        <Tabs.Trigger
                            value="active"
                        >
                            Actif
                        </Tabs.Trigger>
                        <Tabs.Trigger
                            value="expired"
                        >
                            Expiré
                        </Tabs.Trigger>
                    </Tabs.List>
                </Tabs.Root>
                <Card>
                    <Table.Root>
                        <Table.Header>
                            <Table.Row>
                                <Table.ColumnHeaderCell className="w-[300px]">Nom</Table.ColumnHeaderCell>
                                <Table.ColumnHeaderCell>Clé</Table.ColumnHeaderCell>
                                <Table.ColumnHeaderCell className="text-right">Date d&apos;expiration</Table.ColumnHeaderCell>
                                <Table.ColumnHeaderCell className="w-[50px]"></Table.ColumnHeaderCell>
                            </Table.Row>
                        </Table.Header>
                        <Table.Body>
                            <Table.Row>
                                <Table.RowHeaderCell>clé d&apos;essai</Table.RowHeaderCell>
                                <Table.Cell className="font-mono">************************pnA5</Table.Cell>
                                <Table.Cell className="text-right">15 février 2025</Table.Cell>
                                <Table.Cell>
                                    <IconButton variant="ghost">
                                        <Trash2 className="h-4 w-4" />
                                    </IconButton>
                                </Table.Cell>
                            </Table.Row>
                        </Table.Body>
                    </Table.Root>
                </Card>
            </div>
        </div>
    )
}
