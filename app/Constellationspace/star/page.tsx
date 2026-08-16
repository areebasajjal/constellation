"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { supabase } from "../../../lib/supabase";

export default function StarPage() {

  // Lets us read values from the URL.
  const searchParams = useSearchParams();

  // Lets us move to the next page.
  const router = useRouter();

  // Example:
  // /Constellationspace/star?space=AAA345
  const spaceCode = searchParams.get("space");

  // Stores the Star ID after it is created.
  const [starId, setStarId] = useState("");

  // Used while Supabase is creating the participant.
  const [loading, setLoading] = useState(true);

  // Stores an error message if something goes wrong.
  const [errorMessage, setErrorMessage] = useState("");

  // Prevents React development mode from creating
  // the participant twice.
  const participantCreated = useRef(false);


  // Generates something like CT-583.
  function generateStarId() {

    const randomNumber = Math.floor(
      100 + Math.random() * 900
    );

    return `CT-${randomNumber}`;
  }


  useEffect(() => {

    // Stop if this effect already ran once.
    if (participantCreated.current) {
      return;
    }

    participantCreated.current = true;


    async function createParticipant() {

      if (!spaceCode) {
        setErrorMessage("Space code is missing.");
        setLoading(false);
        return;
      }


      // Find the actual space row first.
      const { data: spaceData, error: spaceError } = await supabase
        .from("spaces")
        .select("id")
        .eq("code", spaceCode)
        .maybeSingle();


      if (spaceError) {
        console.log("Error finding space:");
        console.log(spaceError);

        setErrorMessage("Could not find the space.");
        setLoading(false);

        return;
      }


      if (!spaceData) {
        setErrorMessage("Space not found.");
        setLoading(false);

        return;
      }


      // Try a few times in case a Star ID
      // already exists inside this same space.
      for (let attempt = 0; attempt < 5; attempt++) {

        const newStarId = generateStarId();


        const { error } = await supabase
          .from("participants")
          .insert({
            space_id: spaceData.id,
            star_id: newStarId,

            // The star is NOT visible yet.
            // It only becomes visible after
            // the participant releases a thought.
            has_released: false
          });


        // Insert worked.
        if (!error) {

          setStarId(newStarId);
          setLoading(false);

          return;
        }


        // 23505 = UNIQUE constraint failed.
        // So generate another Star ID and retry.
        if (error.code === "23505") {
          continue;
        }


        console.log("Error creating participant:");
        console.log(error);

        setErrorMessage(
          "Could not create your Star ID."
        );

        setLoading(false);

        return;
      }


      setErrorMessage(
        "Could not generate a unique Star ID."
      );

      setLoading(false);
    }


    createParticipant();

  }, [spaceCode]);


  function handleContinue() {

    if (!starId || !spaceCode) {
      return;
    }


    // Carry both the space code
    // and the anonymous Star ID
    // to the thought screen.
    router.push(
      `/constellation?space=${spaceCode}&star=${starId}`
    );
  }


  return (
    <main className="star-id-page">

      {/* Decorative stars */}
      <div className="star-deco star-deco-1">✦</div>
      <div className="star-deco star-deco-2">✧</div>
      <div className="star-deco star-deco-3">⋆</div>
      <div className="star-deco star-deco-4">✦</div>
      <div className="star-deco star-deco-5">✧</div>
      <div className="star-deco star-deco-6">⋆</div>


      <section className="star-id-content">

        <div className="star-id-symbol">
          ✦
        </div>


        <p className="star-id-kicker">
          YOUR PLACE IN THE CONSTELLATION
        </p>


        {loading && (
          <p>
            Finding your star...
          </p>
        )}


        {!loading && starId && (
          <>
            <h1>
              {starId}
            </h1>

            <p className="star-id-description">
              This is your anonymous Star ID
              for this space.
            </p>

            <button onClick={handleContinue}>
              Continue →
            </button>
          </>
        )}


        {!loading && errorMessage && (
          <p>
            {errorMessage}
          </p>
        )}

      </section>

    </main>
  );
}