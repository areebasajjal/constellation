"use client";

import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { supabase } from "../../lib/supabase";

export default function ConstellationHome() {

  // Reads values from the URL.
  const searchParams = useSearchParams();

  // Example:
  // /constellation?space=AAA345&star=CT-583
  const spaceCode = searchParams.get("space");
  const starId = searchParams.get("star");


  // What the user is currently typing.
  const [text, setText] = useState("");


  // Stores the real space name.
  const [spaceName, setSpaceName] = useState("");


  // Stores only visible stars.
  // These are participants who already
  // released at least one thought.
  const [stars, setStars] = useState<string[]>([]);


  // Error message for thought release.
  const [releaseError, setReleaseError] = useState("");


  // Used while Supabase is saving.
  const [releasing, setReleasing] = useState(false);



  // Load the space name and visible stars.
  useEffect(() => {

    async function loadSpaceData() {

      if (!spaceCode) {
        return;
      }


      // Find the current space.
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


      // Show the actual space name.
      setSpaceName(spaceData.name);


      // Only load participants who
      // have already released a thought.
      const { data: participantData, error: participantError } =
        await supabase
          .from("participants")
          .select("star_id")
          .eq("space_id", spaceData.id)
          .eq("has_released", true);


      if (participantError) {

        console.log("Error loading stars:");
        console.log(participantError);

        return;
      }


      // Convert returned participant rows
      // into a simple array of Star IDs.
      const starIds = participantData.map(
        (participant) => participant.star_id
      );


      setStars(starIds);
    }


    loadSpaceData();

  }, [spaceCode]);



  // Runs whenever the textarea changes.
  function handleTextChange(
    event: React.ChangeEvent<HTMLTextAreaElement>
  ) {

    const newText = event.target.value;

    setText(newText);
  }



  // Runs when the user clicks Release it.
  async function handleRelease() {

    // Don't save an empty thought.
    if (text.trim() === "") {
      return;
    }


    if (!spaceCode || !starId) {

      setReleaseError(
        "Your space or Star ID is missing."
      );

      return;
    }


    setReleasing(true);
    setReleaseError("");


    // Find the space UUID.
    const { data: spaceData, error: spaceError } =
      await supabase
        .from("spaces")
        .select("id")
        .eq("code", spaceCode)
        .maybeSingle();


    if (spaceError || !spaceData) {

      console.log("Error finding space:");
      console.log(spaceError);

      setReleaseError(
        "Could not find your space."
      );

      setReleasing(false);

      return;
    }



    // Find this person's participant row.
    const { data: participantData, error: participantError } =
      await supabase
        .from("participants")
        .select("id")
        .eq("space_id", spaceData.id)
        .eq("star_id", starId)
        .maybeSingle();


    if (participantError || !participantData) {

      console.log("Error finding participant:");
      console.log(participantError);

      setReleaseError(
        "Could not find your Star ID."
      );

      setReleasing(false);

      return;
    }



    // Permanently save the private thought.
    const { error: thoughtError } = await supabase
      .from("thoughts")
      .insert({
        space_id: spaceData.id,
        participant_id: participantData.id,
        text: text.trim()
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



    // The participant has now released
    // at least one thought, so make
    // their star visible.
    const { error: updateError } = await supabase
      .from("participants")
      .update({
        has_released: true
      })
      .eq("id", participantData.id);


    if (updateError) {

      console.log("Error making star visible:");
      console.log(updateError);

      setReleaseError(
        "Your thought was saved, but your star could not be displayed."
      );

      setReleasing(false);

      return;
    }



    // Immediately add the current Star ID
    // to this browser's constellation.
    setStars((currentStars) => {

      // Don't show the same star twice.
      if (currentStars.includes(starId)) {
        return currentStars;
      }

      return [...currentStars, starId];
    });


    // Clear the private thought from the textarea.
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



      {/* Only people who released a thought
          appear in the constellation. */}
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