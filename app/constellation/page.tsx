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
  if (text.trim() === "") {
    return;
  }


  // 2. Make sure we know which spaceand which anonymous star this belongs to
  if (!spaceCode || !starId) {
    setReleaseError(
      "Your space or Star ID is missing."
    );

    return;
  }


  // Disable the button while everything is saving
  setReleasing(true);

  setReleaseError("");


  // 3. Find the database UUID for this space
  const { data: spaceData, error: spaceError } =
    await supabase
      .from("spaces")
      .select("id")
      .eq("code", spaceCode)
      .maybeSingle();


  if (spaceError || !spaceData) {
    setReleaseError(
      "Could not find your space."
    );

    setReleasing(false);

    return;
  }


  // 4. Find this participant inside the space
  const { data: participantData, error: participantError } =
    await supabase
      .from("participants")
      .select("id")
      .eq("space_id", spaceData.id)
      .eq("star_id", starId)
      .maybeSingle();


  if (participantError || !participantData) {
    setReleaseError(
      "Could not find your Star ID."
    );

    setReleasing(false);

    return;
  }


  // 5. Send the private thought to our own API route. oute.ts then talks to rOpenAI and creates the embedding.
  const embeddingResponse = await fetch("/api/embed", {
    method: "POST",

    headers: {
      "Content-Type": "application/json"
    },

    body: JSON.stringify({
      text: text.trim()
    })
  });



  if (!embeddingResponse.ok) {
    setReleaseError(
      "Your thought could not be processed."
    );

    setReleasing(false);

    return;
  }


  // 6. Read the embedding returned by route.ts
  const embeddingData = await embeddingResponse.json();

  const embedding = embeddingData.embedding;


  // 7. Permanently save the private thought, its embedding in Supabase
  const { error: thoughtError } = await supabase
    .from("thoughts")
    .insert({
      space_id: spaceData.id,
      participant_id: participantData.id,
      text: text.trim(),
      embedding: embedding
    });


  if (thoughtError) {
    console.log("Error saving thought:");
    console.log(thoughtError);

    setReleaseError(
      "Your thought could not be released."
    );

    setReleasing(false);

    return;
  }


  // 8. The participant has now released something, so their star is allowed to appear publicly
  const { error: updateError } = await supabase
    .from("participants")
    .update({
      has_released: true
    })
    .eq("id", participantData.id);


  if (updateError) {
    setReleaseError(
      "Your thought was saved, but your star could not be displayed."
    );

    setReleasing(false);

    return;
  }


  // 9. Immediately show this star in the current browser
  setStars((currentStars) => {

    // Don't add the same star twice
    if (currentStars.includes(starId)) {
      return currentStars;
    }

    return [...currentStars, starId];
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