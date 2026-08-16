"use client";

import { Suspense, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { supabase } from "../../lib/supabase";

function ConstellationContent() {
  const searchParams = useSearchParams();

  const spaceCode = searchParams.get("space");
  const starId = searchParams.get("star");

  const [text, setText] = useState("");
  const [spaceName, setSpaceName] = useState("");
  const [stars, setStars] = useState<string[]>([]);
  const [releaseError, setReleaseError] = useState("");
  const [releasing, setReleasing] = useState(false);

  useEffect(() => {
    async function loadSpaceData() {
      if (!spaceCode) {
        return;
      }

      const { data: spaceData, error: spaceError } =
        await supabase
          .from("spaces")
          .select("id, name")
          .eq("code", spaceCode)
          .maybeSingle();

      if (spaceError || !spaceData) {
        console.log("Error loading space:");
        console.log(spaceError);
        return;
      }

      setSpaceName(spaceData.name);

      const { data: participantData, error: participantError } =
        await supabase.from("participants").select("star_id").eq("space_id", spaceData.id).eq("has_released", true);

      if (participantError) {
        console.log("Error loading stars:");
        console.log(participantError);
        return;
      }

      const starIds = participantData.map(
        (participant) => participant.star_id
      );

      setStars(starIds);
    }

    loadSpaceData();
  }, [spaceCode]);

  useEffect(() => {
    if (!spaceCode) {
      return;
    }

    const channel = supabase
      .channel(`participant-updates-${spaceCode}`)
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "participants"
        },
        () => {
          window.location.reload();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [spaceCode]);


// test change saviour
  function handleTextChange(event: React.ChangeEvent<HTMLTextAreaElement>) {
      setText(event.target.value);
  }


// handle release click option
async function handleRelease() {

  console.log("1. Release started");

  if (text.trim() === "") {
    console.log("Stopped: thought was empty");
    return;
  }


  // Make sure we know which space
  // and which anonymous star this belongs to.
  if (!spaceCode || !starId) {

    console.log("Stopped: missing spaceCode or starId");
    console.log("spaceCode:", spaceCode);
    console.log("starId:", starId);

    setReleaseError(
      "Your space or Star ID is missing."
    );

    return;
  }


  // Disable the button while everything is saving.
  setReleasing(true);

  setReleaseError("");


  // Find the database UUID for this space.
  const { data: spaceData, error: spaceError } =
    await supabase
      .from("spaces")
      .select("id")
      .eq("code", spaceCode)
      .maybeSingle();


  console.log("2. Space lookup finished");
  console.log("spaceData:", spaceData);
  console.log("spaceError:", spaceError);


  if (spaceError || !spaceData) {

    console.log("Stopped: space could not be found");

    setReleaseError(
      "Could not find your space."
    );

    setReleasing(false);

    return;
  }


  // Find this participant inside the space.
  const { data: participantData, error: participantError } =
    await supabase
      .from("participants")
      .select("id")
      .eq("space_id", spaceData.id)
      .eq("star_id", starId)
      .maybeSingle();


  console.log("3. Participant lookup finished");
  console.log("participantData:", participantData);
  console.log("participantError:", participantError);


  if (participantError || !participantData) {

    console.log("Stopped: participant could not be found");

    setReleaseError(
      "Could not find your Star ID."
    );

    setReleasing(false);

    return;
  }



  // Send the thought to our own API route.
  // route.ts checks safety first, then creates the embedding.
  const embeddingResponse = await fetch("/api/embed", {
    method: "POST",

    headers: {
      "Content-Type": "application/json"
    },

    body: JSON.stringify({
      text: text.trim()
    })
  });


  console.log(
    "5. Embedding response status:",
    embeddingResponse.status
  );


  // If the API route failed.
  if (!embeddingResponse.ok) {

    const errorData =
      await embeddingResponse.json();

    console.log("Embedding API error:");
    console.log(errorData);

    setReleaseError(
      "Your thought could not be processed."
    );

    setReleasing(false);

    return;
  }


  // Read the response from route.ts.
  const embeddingData =
    await embeddingResponse.json();



  // Self-harm safety response.
  if (
    embeddingData.safe === false &&
    embeddingData.action === "support"
  ) {

    setReleaseError(
      "It sounds like you're carrying something that may need more support than this constellation can provide. Please consider reaching out to someone you trust or appropriate local support."
    );

    setReleasing(false);

    return;
  }



  // Other unsafe content.
  if (
    embeddingData.safe === false &&
    embeddingData.action === "blocked"
  ) {

    setReleaseError(
      "This thought can't be released into the constellation due to unsafe content."
    );

    setReleasing(false);

    return;
  }



  // Safe thought.
  const embedding =
    embeddingData.embedding;


  // Make sure we actually received
  // the expected 512-number vector.
  if (
    !Array.isArray(embedding) ||
    embedding.length !== 512
  ) {

    console.log("Invalid embedding:");
    console.log(embedding);

    setReleaseError(
      "The thought embedding could not be generated."
    );

    setReleasing(false);

    return;
  }


  console.log(
    "Embedding length:",
    embedding.length
  );



  // Permanently save the private thought
  // and its embedding in Supabase.
  const { error: thoughtError } =
    await supabase
      .from("thoughts")
      .insert({
        space_id: spaceData.id,
        participant_id: participantData.id,
        text: text.trim(),
        embedding: embedding
      });


  console.log(
    "thoughtError:",
    thoughtError
  );


  if (thoughtError) {

    console.log("Error saving thought:");
    console.log(thoughtError);

    setReleaseError(
      "Your thought could not be released."
    );

    setReleasing(false);

    return;
  }



  // VECTOR MATCHING


  // Compare this new embedding against other thoughts in the SAME space.
  const { data: matchData, error: matchError } =
    await supabase.rpc(
      "match_thoughts",
      {
        query_embedding: embedding,
        current_space_id: spaceData.id,
        current_participant_id: participantData.id,
        similarity_threshold: 0.78
      }
    );


  if (matchError) {

    console.log("Matching error:");
    console.log(matchError);

  } else {

    console.log("Match result:", matchData);

if (matchData && matchData.length > 0) {
  console.log(
    "MATCH FOUND:",
    starId,
    "↔",
    matchData[0].star_id
  );

  console.log(
    "SIMILARITY:",
    matchData[0].similarity
  );
} else {
  console.log("NO MATCH ABOVE THRESHOLD");
}
  }



  // The participant has now released something,
  // so their star is allowed to appear publicly.
  const { error: updateError } =
    await supabase
      .from("participants")
      .update({
        has_released: true
      })
      .eq("id", participantData.id);


  console.log(
    "updateError:",
    updateError
  );


  if (updateError) {

    setReleaseError(
      "Your thought was saved, but your star could not be displayed."
    );

    setReleasing(false);

    return;
  }



  // Immediately show this star
  // in the current browser.
  setStars((currentStars) => {

    if (currentStars.includes(starId)) {
      return currentStars;
    }

    return [
      ...currentStars,
      starId
    ];
  });


  setText("");

  setReleasing(false);
}

  return (
    <main className="constellation-home">

      <section className="thought-section">

        <div className="thought-symbol">
          ✦
        </div>

        <p className="thought-kicker">
          welcome to {spaceName}
        </p>

        <h1>
          What are you carrying?
        </h1>

        <p className="thought-description">
          You don&apos;t need to name an emotion.
          Just say what feels true right now.
        </p>

        <textarea
          value={text}
          onChange={handleTextChange}
          placeholder="Everyone here already seems to know someone..."
          maxLength={180}
        />

        <div className="thought-footer">

          <span>
            {text.length}/180
          </span>

          <button
            onClick={handleRelease}
            disabled={releasing}
          >
            {releasing
              ? "Releasing..."
              : "Release it"}

            <span>
              ✦
            </span>
          </button>

        </div>

        {releaseError && (
          <p>
            {releaseError}
          </p>
        )}

      </section>

      {stars.length > 0 && (
        <section className="released-section">

          <p className="released-label">
            YOUR CONSTELLATION
          </p>

          <div className="released-stars">

            {stars.map((star) => (
              <div
                className="released-star"
                key={star}
              >

                <div className="released-star-symbol">
                  ✦
                </div>

                <p>
                  {star}
                </p>

              </div>
            ))}

          </div>

        </section>
      )}

    </main>
  );
}

export default function ConstellationPage() {
  return (
    <Suspense fallback={<p>Loading constellation...</p>}>
      <ConstellationContent />
    </Suspense>
  );
}