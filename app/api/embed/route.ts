import OpenAI from "openai";
import { NextResponse } from "next/server";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export async function POST(request: Request) {

  try {

    const body = await request.json();

    const text = body.text?.trim();


    if (!text) {
      return NextResponse.json(
        { error: "Thought is missing." },
        { status: 400 }
      );
    }


    const response = await openai.embeddings.create({
      model: "text-embedding-3-small",
      input: text,
      dimensions: 512,
    });


    const embedding =
      response.data[0]?.embedding;


    if (!embedding || embedding.length !== 512) {

      return NextResponse.json(
        { error: "Invalid embedding returned." },
        { status: 500 }
      );
    }


    return NextResponse.json({
      embedding
    });

  } catch (error) {

    console.error("Embedding route error:");
    console.error(error);

    return NextResponse.json(
      { error: "Embedding generation failed." },
      { status: 500 }
    );
  }
}