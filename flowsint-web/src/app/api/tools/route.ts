import { NextResponse } from "next/server"
import tools from "./tools.json"
export async function GET() {
    try {
        return NextResponse.json(tools)
    } catch (error) {
        return NextResponse.json({ error: "An error occured." }, { status: 500 })
    }
}

