import { mistral } from '@ai-sdk/mistral';
import { streamText } from 'ai';

// Allow streaming responses up to 30 seconds
export const maxDuration = 30;

export async function POST(req: Request) {
    const { messages } = await req.json();

    const result = streamText({
        model: mistral('mistral-tiny'),
        messages,
    });

    return result.toDataStreamResponse();
}