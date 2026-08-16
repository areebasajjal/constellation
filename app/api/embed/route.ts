import OpenAI from "openai";
import { NextResponse } from "next/server";

const openai = new OpenAI({apiKey: process.env.OPENAI_API_KEY,});

export async function POST(request: Request) {

  const body = await request.json();

  const text = body.text;

  if (!text) {return NextResponse.json({ error: "Thought is missing." },{ status: 400 }
    );
  }

  const response = await openai.embeddings.create({model: "text-embedding-3-small",
    input: text,
    dimensions: 512,
  });

  const embedding = response.data[0].embedding;

  return NextResponse.json({embedding});
}