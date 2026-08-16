import OpenAI from "openai";
import { NextResponse } from "next/server";
import { containsProfanity } from "../../../lib/moderation";

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

    // Check the thought for unsafe content before we create an embedding.
    const moderationResponse =
      await openai.moderations.create({
        model: "omni-moderation-latest",
        input: text
      });


    const moderation = moderationResponse.results[0];


    const categories = moderation.categories;



    // Check specifically for self-harm risk.
    const selfHarmRisk =
      categories["self-harm"] ||
      categories["self-harm/intent"] ||
      categories["self-harm/instructions"];



    // Check for other content we don't want  participating in community matching.
    const harmfulContent =
      categories["harassment/threatening"] ||
      categories["hate"] || 
      categories["hate/threatening"] ||
      categories["violence/graphic"] ||
      categories["sexual/minors"] ||
      categories["illicit/violent"];



    // Self-harm gets its own response for helping purposes
    if (selfHarmRisk) {

      return NextResponse.json(
        {
          safe: false,
          action: "support"
        },
        { status: 200 }
      );
    }

    if (containsProfanity(text)) {
        return NextResponse.json({
            safe: false,
          action: "profanity"
        });
        }

    // Other unsafe material gets blocked from entering the constellation.
    if (harmfulContent) {

      return NextResponse.json(
        {
          safe: false,
          action: "blocked"
        },
        { status: 200 }
      );
    }



    // The thought passed moderation, so now we create its embedding.
    const response =
      await openai.embeddings.create({
        model: "text-embedding-3-small",
        input: text,
        dimensions: 512
      });


    const embedding =
      response.data[0]?.embedding;



    if (!embedding || embedding.length !== 512) {

      return NextResponse.json(
        {
          error: "Invalid embedding returned."
        },
        { status: 500 }
      );
    }



    // Safe thought + valid embedding.
    return NextResponse.json({
      safe: true,
      embedding: embedding
    });


  } catch (error) {

    console.error(
      "Thought processing error:"
    );

    console.error(error);


    return NextResponse.json(
      {
        error: "Thought processing failed."
      },
      { status: 500 }
    );
  }
}