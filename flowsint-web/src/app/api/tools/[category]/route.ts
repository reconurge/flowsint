import { NextResponse } from "next/server"
import tools from "../tools.json"
import { Tool } from "@/types"
export async function GET(_: Request, { params }: { params: Promise<{ category: string }> }) {
    const { category } = await params
    const tt: { [key: string]: Tool }[] = Object.keys(tools).map((cat) => ({ [cat.toLowerCase()]: (tools as any)[cat] }))
    try {
        const tool = tt.find(t => t.hasOwnProperty(category.toLowerCase()));
        return NextResponse.json(tool ? Object.values(tool[category.toLowerCase()]) : { error: "Category not found." })
    } catch (error) {
        return NextResponse.json({ error: "An error occured." }, { status: 500 })
    }
}

