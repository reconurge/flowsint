import Image from "next/image"
import Link from "next/link"
import {
    ArrowRight,
    Calendar,
    ExternalLink,
    CreditCard,
    User,
    Mail,
    Phone,
    Facebook,
    Instagram,
    Twitter,
    Youtube,
    Building2,
    Waypoints,
    UserIcon,
} from "lucide-react"

import { Card, CardContent, CardHeader } from "@/components/ui/card"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import DashboardLayout from "@/components/dashboard/layout"

// This is a mock type for the individual object
// Replace with your actual type definition
type Individual = {
    id: string
    full_name: string
    investigation: {
        title: string
        id: string,
        project: {
            name: string,
            id: string
        }
    }
    avatar: string
    email: string
    phoneNumber: string
    stats: {
        accounts: number
        names: number
        emails: number
        phoneNumbers: number
    }
    profile: {
        birthday: string
        familyStatus: string
        isJobSeeker: boolean
        education: string
        jobTitle: string
        company: string
    }
    jobHistory: Array<{
        title: string
        company: string
        logo: string
        startDate: string
        endDate: string
    }>
    scores: {
        overall: number
        phone: number
        email: number
        ipAddress: number | null
    }
    socialMedia: {
        facebook?: {
            firstSeen: string
            followersCount: number
            fullName: string
            username: string
            location: string
            profileImage?: string
        }
        instagram?: {
            firstSeen: string
            followersCount: number
            followingCount: number
            username: string
            isVerified: boolean
            probability: string
            profileImage?: string
        }
        x?: {
            firstSeen: string
        }
        youtube?: Record<string, any>
    }
}

// This would typically come from a database or API
async function getIndividual(id: string): Promise<Individual> {
    // Mock data based on the screenshot
    return {
        id,
        full_name: "Lawrence Jackson",
        avatar: "/placeholder.svg?height=100&width=100",
        email: "lawrencejackson@gmail.com",
        phoneNumber: "+41 952 874 321",
        investigation: {
            title: "Investigation 1",
            id: "1",
            project: {
                name: "Project 1",
                id: "1"
            },
        },
        stats: {
            accounts: 24,
            names: 16,
            emails: 5,
            phoneNumbers: 2,
        },
        profile: {
            birthday: "16/02/1985",
            familyStatus: "Married",
            isJobSeeker: false,
            education: "Bachelor's Degree",
            jobTitle: "Manager",
            company: "Liberty LDA",
        },
        jobHistory: [
            {
                title: "Data Analyst",
                company: "Vertex Dynamics",
                logo: "/placeholder.svg?height=40&width=40",
                startDate: "Nov 2023",
                endDate: "Mar 2024",
            },
            {
                title: "Senior Software Engineer",
                company: "Innovatech Solutions",
                logo: "/placeholder.svg?height=40&width=40",
                startDate: "Jul 2022",
                endDate: "Nov 2023",
            },
            {
                title: "Software Engineer",
                company: "Quantum Systems",
                logo: "/placeholder.svg?height=40&width=40",
                startDate: "Feb 2021",
                endDate: "Dec 2022",
            },
        ],
        scores: {
            overall: 60,
            phone: 60,
            email: 10,
            ipAddress: null,
        },
        socialMedia: {
            facebook: {
                firstSeen: "02/07/2016, 16:42",
                followersCount: 12,
                fullName: "Lawrence Jackson",
                username: "ameliaj",
                location: "Texas, United States",
                profileImage: "/placeholder.svg?height=100&width=100",
            },
            instagram: {
                firstSeen: "02/07/2016, 16:42",
                followersCount: 650,
                followingCount: 847,
                username: "Jackson23",
                isVerified: false,
                probability: "100%",
                profileImage: "/placeholder.svg?height=100&width=100",
            },
            x: {
                firstSeen: "02/07/2016, 16:42",
            },
            youtube: {},
        },
    }
}

export default async function IndividualPage({ params }: { params: Promise<{ individual_id: string }> }) {
    const { individual_id } = await params
    const individual = await getIndividual(individual_id)

    return (
        <div className="min-h-screen p-6">
            <div className="max-w-7xl mx-auto my-12 space-y-6">
                {/* Header with profile info */}
                <div className="flex flex-col md:flex-row gap-6 items-start md:items-center">
                    <Avatar className="w-24 h-24 rounded-full border-2">
                        <AvatarImage src={individual.avatar} alt={individual.full_name} />
                        <AvatarFallback className="">
                            {individual.full_name
                                .split(" ")
                                .map((n) => n[0])
                                .join("")}
                        </AvatarFallback>
                    </Avatar>
                    <div className="space-y-4">
                        <h1 className="text-3xl md:text-4xl font-bold">{individual.full_name}</h1>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="flex items-center gap-2">
                                <span className="opacity-60">Email</span>
                                <span>{individual.email}</span>
                            </div>
                            <div className="flex items-center gap-2">
                                <span className="opacity-60">Phone Number</span>
                                <span>{individual.phoneNumber}</span>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Stats cards */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                    <Card className="bg-sidebar shadow-none border-border backdrop-blur">
                        <CardContent className="p-4 flex justify-between items-center">
                            <div className="flex items-center gap-2">
                                <div className="p-2 rounded-md ">
                                    <CreditCard className="h-5 w-5" />
                                </div>
                                <span className="opacity-60">Accounts</span>
                            </div>
                            <div className="flex items-center gap-1">
                                <span className="text-2xl font-bold">{individual.stats.accounts}</span>
                                <ArrowRight className="h-4 w-4 text-gray-500" />
                            </div>
                        </CardContent>
                    </Card>

                    <Card className="bg-sidebar shadow-none border-border backdrop-blur">
                        <CardContent className="p-4 flex justify-between items-center">
                            <div className="flex items-center gap-2">
                                <div className="p-2 rounded-md ">
                                    <User className="h-5 w-5" />
                                </div>
                                <span className="opacity-60">Names</span>
                            </div>
                            <div className="flex items-center gap-1">
                                <span className="text-2xl font-bold">{individual.stats.names}</span>
                                <ArrowRight className="h-4 w-4 text-gray-500" />
                            </div>
                        </CardContent>
                    </Card>

                    <Card className="bg-sidebar shadow-none border-border backdrop-blur">
                        <CardContent className="p-4 flex justify-between items-center">
                            <div className="flex items-center gap-2">
                                <div className="p-2 rounded-md ">
                                    <Mail className="h-5 w-5" />
                                </div>
                                <span className="opacity-60">Emails</span>
                            </div>
                            <div className="flex items-center gap-1">
                                <span className="text-2xl font-bold">{individual.stats.emails}</span>
                                <ArrowRight className="h-4 w-4 text-gray-500" />
                            </div>
                        </CardContent>
                    </Card>

                    <Card className="bg-sidebar shadow-none border-border backdrop-blur">
                        <CardContent className="p-4 flex justify-between items-center">
                            <div className="flex items-center gap-2">
                                <div className="p-2 rounded-md ">
                                    <Phone className="h-5 w-5" />
                                </div>
                                <span className="opacity-60">Phone Numbers</span>
                            </div>
                            <div className="flex items-center gap-1">
                                <span className="text-2xl font-bold">{individual.stats.phoneNumbers}</span>
                                <ArrowRight className="h-4 w-4 text-gray-500" />
                            </div>
                        </CardContent>
                    </Card>
                </div>

                {/* Main content grid */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    {/* Profile section */}
                    <Card className="bg-sidebar shadow-none border-border backdrop-blur">
                        <CardHeader className="border-b pb-4">
                            <h2 className="text-xl font-bold">Profile</h2>
                        </CardHeader>
                        <CardContent className="p-4 space-y-4">
                            <div className="grid grid-cols-2 gap-y-4">
                                <span className="opacity-60">Birthday</span>
                                <span className="text-right">{individual.profile.birthday}</span>

                                <span className="opacity-60">Family status</span>
                                <span className="text-right">{individual.profile.familyStatus}</span>

                                <span className="opacity-60">Is job seeker</span>
                                <span className="text-right">{individual.profile.isJobSeeker ? "Yes" : "No"}</span>

                                <span className="opacity-60">Education</span>
                                <span className="text-right">{individual.profile.education}</span>

                                <span className="opacity-60">Job title</span>
                                <span className="text-right">{individual.profile.jobTitle}</span>

                                <span className="opacity-60">Company</span>
                                <span className="text-right">{individual.profile.company}</span>
                            </div>
                        </CardContent>
                    </Card>

                    {/* Job History section */}
                    <Card className="bg-sidebar shadow-none border-border backdrop-blur">
                        <CardHeader className="border-b pb-4">
                            <h2 className="text-xl font-bold">Job History</h2>
                        </CardHeader>
                        <CardContent className="p-4 space-y-6">
                            {individual.jobHistory.map((job, index) => (
                                <div key={index} className="flex gap-4">
                                    <div className="flex-shrink-0">
                                        <div className="w-10 h-10 rounded-md overflow-hidden bg-sidebar shadow-none flex items-center justify-center">
                                            {/* <Image
                                                src={job.logo || "/placeholder.svg"}
                                                alt={job.company}
                                                width={40}
                                                height={40}
                                                className="object-cover"
                                            /> */}
                                            <Building2 className="h-5 w-5" />
                                        </div>
                                    </div>
                                    <div className="flex-1">
                                        <h3 className="font-medium">{job.title}</h3>
                                        <p className="opacity-60">{job.company}</p>
                                    </div>
                                    <div className="text-right opacity-60 text-sm">
                                        {job.startDate} - {job.endDate}
                                    </div>
                                </div>
                            ))}
                        </CardContent>
                    </Card>
                </div>

                {/* Social Media section */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {/* Facebook */}
                    {individual.socialMedia.facebook && (
                        <Card className="bg-sidebar shadow-none border-border backdrop-blur">
                            <CardHeader className="border-b pb-4 flex flex-row justify-between items-center">
                                <div className="flex items-center gap-2">
                                    <div className="w-8 h-8 bg-blue-600 rounded flex items-center justify-center">
                                        <Facebook className="h-5 w-5 text-white" />
                                    </div>
                                    <h2 className="text-xl font-bold">Facebook</h2>
                                </div>
                                <div className="flex items-center gap-1 text-sm opacity-60">
                                    <Calendar className="h-4 w-4" />
                                    <span>First seen {individual.socialMedia.facebook.firstSeen}</span>
                                </div>
                            </CardHeader>
                            <CardContent className="p-4">
                                <div className="flex justify-between">
                                    <div className="space-y-4">
                                        <div className="grid grid-cols-2 gap-y-4 gap-x-8">
                                            <span className="opacity-60">Followers count</span>
                                            <span>{individual.socialMedia.facebook.followersCount}</span>

                                            <span className="opacity-60">Full name</span>
                                            <span>{individual.socialMedia.facebook.fullName}</span>

                                            <span className="opacity-60">Username</span>
                                            <span>{individual.socialMedia.facebook.username}</span>

                                            <span className="opacity-60">Location</span>
                                            <span>{individual.socialMedia.facebook.location}</span>
                                        </div>
                                    </div>

                                    {individual.socialMedia.facebook.profileImage && (
                                        <div className="flex-shrink-0">
                                            <Image
                                                src={individual.socialMedia.facebook.profileImage || "/placeholder.svg"}
                                                alt={individual.socialMedia.facebook.fullName}
                                                width={100}
                                                height={100}
                                                className="rounded-md"
                                            />
                                        </div>
                                    )}
                                </div>
                            </CardContent>
                        </Card>
                    )}

                    {/* Instagram */}
                    {individual.socialMedia.instagram && (
                        <Card className="bg-sidebar shadow-none border-border backdrop-blur">
                            <CardHeader className="border-b pb-4 flex flex-row justify-between items-center">
                                <div className="flex items-center gap-2">
                                    <div className="w-8 h-8 bg-gradient-to-tr from-purple-600 via-pink-500 to-orange-400 rounded flex items-center justify-center">
                                        <Instagram className="h-5 w-5 text-white" />
                                    </div>
                                    <h2 className="text-xl font-bold">Instagram</h2>
                                </div>
                                <Link href="#" className="text-green-500 flex items-center gap-1 text-sm">
                                    <span>See profile</span>
                                    <ExternalLink className="h-4 w-4" />
                                </Link>
                            </CardHeader>
                            <CardContent className="p-4">
                                <div className="flex justify-between">
                                    <div className="space-y-4">
                                        <div className="grid grid-cols-2 gap-y-4 gap-x-8">
                                            <span className="opacity-60">Followers count</span>
                                            <span>{individual.socialMedia.instagram.followersCount}</span>

                                            <span className="opacity-60">Following count</span>
                                            <span>{individual.socialMedia.instagram.followingCount}</span>

                                            <span className="opacity-60">Username</span>
                                            <span>{individual.socialMedia.instagram.username}</span>

                                            <span className="opacity-60">Is Verified</span>
                                            <span>{individual.socialMedia.instagram.isVerified ? "Yes" : "No"}</span>

                                            <span className="opacity-60">Probability</span>
                                            <span>{individual.socialMedia.instagram.probability}</span>
                                        </div>
                                    </div>

                                    {individual.socialMedia.instagram.profileImage && (
                                        <div className="flex-shrink-0">
                                            <Image
                                                src={individual.socialMedia.instagram.profileImage || "/placeholder.svg"}
                                                alt={individual.socialMedia.instagram.username}
                                                width={100}
                                                height={100}
                                                className="rounded-md"
                                            />
                                        </div>
                                    )}
                                </div>

                                <div className="mt-4 flex justify-end">
                                    <button className=" hover:bg-gray-700 text-sm px-4 py-2 rounded-md">Show more</button>
                                </div>
                            </CardContent>
                        </Card>
                    )}

                    {/* X (Twitter) */}
                    {individual.socialMedia.x && (
                        <Card className="bg-sidebar shadow-none border-border backdrop-blur">
                            <CardHeader className="border-b pb-4 flex flex-row justify-between items-center">
                                <div className="flex items-center gap-2">
                                    <div className="w-8 h-8 bg-black rounded flex items-center justify-center">
                                        <Twitter className="h-5 w-5 text-white" />
                                    </div>
                                    <h2 className="text-xl font-bold">X</h2>
                                </div>
                                <Link href="#" className="text-green-500 flex items-center gap-1 text-sm">
                                    <span>See profile</span>
                                    <ExternalLink className="h-4 w-4" />
                                </Link>
                            </CardHeader>
                            <CardContent className="p-4">
                                <div className="flex items-center gap-1 text-sm opacity-60">
                                    <Calendar className="h-4 w-4" />
                                    <span>First seen {individual.socialMedia.x.firstSeen}</span>
                                </div>
                            </CardContent>
                        </Card>
                    )}

                    {/* YouTube */}
                    {individual.socialMedia.youtube && Object.keys(individual.socialMedia.youtube).length > 0 && (
                        <Card className="bg-sidebar shadow-none border-border backdrop-blur">
                            <CardHeader className="border-b pb-4 flex flex-row justify-between items-center">
                                <div className="flex items-center gap-2">
                                    <div className="w-8 h-8 bg-red-600 rounded flex items-center justify-center">
                                        <Youtube className="h-5 w-5 text-white" />
                                    </div>
                                    <h2 className="text-xl font-bold">YouTube</h2>
                                </div>
                                <Link href="#" className="text-green-500 flex items-center gap-1 text-sm">
                                    <span>See profile</span>
                                    <ExternalLink className="h-4 w-4" />
                                </Link>
                            </CardHeader>
                        </Card>
                    )}
                </div>
            </div>
        </div>
    )
}