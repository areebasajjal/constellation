"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { supabase } from "../../../lib/supabase";

export default function StarPage() {

  // Lets us read values from the URL.
  const searchParams = useSearchParams();

  // move to the next page.
  const router = useRouter();

  const spaceCode = searchParams.get("space");

  const [starId, setStarId] = useState("");
  const [loading, setLoading] = useState(true);

  const [errorMessage, setErrorMessage] = useState("");


  function generateStarId() {
    const randomNumber = Math.floor(
      100 + Math.random() * 900
    );

    return `CT-${randomNumber}`;
  }


  useEffect(() => {

    async function createParticipant() {

      // if there is no space code in the URL.
      if (!spaceCode) {
        setErrorMessage("Space code is missing.");
        setLoading(false);
        return;
      }


      // First find the actual space row.
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


      // Try a few times in case the generated Star ID already exists inside this same space.
      for (let attempt = 0; attempt < 5; attempt++) {

        const newStarId = generateStarId();


        const { error } = await supabase
          .from("participants")
          .insert({
            space_id: spaceData.id,
            star_id: newStarId
          });


        // If there is no error,
        if (!error) {
          setStarId(newStarId);
          setLoading(false);
          return;
        }


        // PostgreSQL error 23505 means
        // a UNIQUE constraint was violated.
        if (error.code === "23505") {
          continue;
        }

        console.log("Error creating participant:");
        console.log(error);

        setErrorMessage("Could not create your Star ID.");
        setLoading(false);
        return;
      }


      // If all retry attempts failed.
      setErrorMessage("Could not generate a unique Star ID.");
      setLoading(false);
    }


    createParticipant();

  }, [spaceCode]);


  function handleContinue() {

    if (!starId || !spaceCode) {
      return;
    }


    // Move to the thought screen.
    router.push(
      `/constellation?space=${spaceCode}&star=${starId}`
    );
  }


  return (

    
    <main className="star-id-page">
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