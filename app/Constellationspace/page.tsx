"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "../../lib/supabase";

export default function SpacesPage() {

  // Router lets us move to another page after
  // the create/join database request succeeds.
  const router = useRouter();


  // Stores whatever the user is currently typing
  // in the "Create a Space" input.
  const [spaceName, setSpaceName] = useState("");


  // Stores the final created space name.
  const [createdSpace, setCreatedSpace] = useState("");


  // Stores the generated code for the created space.
  const [spaceCode, setSpaceCode] = useState("");


  // Stores whatever the user types
  // into the "Join a Space" input.
  const [joinCode, setJoinCode] = useState("");


  // Stores messages like:
  // "Space found" or "Space not found."
  const [joinMessage, setJoinMessage] = useState("");



  // Runs whenever the user types
  // in the Create Space input.
  function handleSpaceNameChange(
    event: React.ChangeEvent<HTMLInputElement>
  ) {
    const newName = event.target.value;

    setSpaceName(newName);
  }



  // Generates a simple space code
  // from the space name.
  function generateSpaceCode(name: string) {

    // Remove spaces and make everything uppercase.
    const cleanName = name
      .replace(/\s+/g, "")
      .toUpperCase();


    // Keep only the first 6 characters.
    const shortName = cleanName.slice(0, 6);


    // Generate a random number from 100 to 999.
    const randomNumber = Math.floor(
      100 + Math.random() * 900
    );


    // Example:
    // "CS Girlies Hackathon"
    // becomes something like:
    // CSGIRL482
    return shortName + randomNumber;
  }



  // Runs when the user clicks
  // "Create space".
  async function handleCreateSpace() {

    // Don't create a space if the input is empty.
    if (spaceName.trim() === "") {
      return;
    }


    // Generate the code for this new space.
    const newCode = generateSpaceCode(spaceName);


    // Save the new space inside Supabase.
    const { error } = await supabase
      .from("spaces")
      .insert({
        name: spaceName,
        code: newCode
      });


    // Stop if the database insert failed.
    if (error) {
      console.log("Error creating space:");
      console.log(error);

      return;
    }


    // Store these locally too.
    setCreatedSpace(spaceName);
    setSpaceCode(newCode);


    // Clear the input field.
    setSpaceName("");


  }



  // Runs whenever the user types
  // into the Join Space input.
  function handleJoinCodeChange(
    event: React.ChangeEvent<HTMLInputElement>
  ) {
    const newCode = event.target.value;

    setJoinCode(newCode);
  }



  // Runs when the user clicks
  // "Join space".
  async function handleJoinSpace() {

    // Don't search if nothing was entered.
    if (joinCode.trim() === "") {
      return;
    }


    // Search Supabase for a space
    // whose code matches the entered code.
    const { data, error } = await supabase
      .from("spaces")
      .select("*")
      .eq(
        "code",
        joinCode.toUpperCase()
      )
      .maybeSingle();


    // Something went wrong while
    // talking to the database.
    if (error) {
      console.log("Error finding space:");
      console.log(error);

      setJoinMessage(
        "Something went wrong."
      );

      return;
    }


    // If Supabase returned a space,
    // the code exists.
    if (data) {

      // setJoinMessage(
      //   `Space found: ${data.name}`
      // );


      // Move into that specific constellation.
      //
      // Example:
      // /constellation?space=CSGIRL482
      router.push(`/Constellationspace/star?space=${data.code}`
);
    } else {

      // No matching row was found.
      setJoinMessage(
        "Space not found."
      );
    }
  }



  return (
    <main className="space-page">

      <section className="space-content">


        {/* Decorative stars */}
        <div className="star star-11"></div>
        <div className="star star-2"></div>
        <div className="star star-77"></div>
        <div className="star star-88"></div>
        <div className="star star-99"></div>
        <div className="star star-00"></div>


        <p className="space-kicker">
          ENTER THE CONSTELLATION
        </p>


        <h1>
          Find your space.
        </h1>


        <div className="space-options">


          {/* JOIN SPACE */}
          <div className="space-option">

            <h2>
              Join a Space
            </h2>


            <p>
              Enter a space code shared
              by your community.
            </p>


            <input
              type="text"
              placeholder="e.g. GIRLIES26"

              // The input displays whatever
              // is currently stored in joinCode.
              value={joinCode}

              onChange={handleJoinCodeChange}
            />


            <button
              onClick={handleJoinSpace}
            >
              Join space →
            </button>


            {/* Show a message after searching */}
            {joinMessage && (
              <p>
                {joinMessage}
              </p>
            )}

          </div>



          {/* CREATE SPACE */}
          <div className="space-option">

            <h2>
              Create a Space
            </h2>


            <p>
              Start a new constellation
              for your group.
            </p>


            <input
              type="text"

              // The input displays whatever
              // is currently stored in spaceName.
              value={spaceName}

              onChange={handleSpaceNameChange}

              placeholder="Name your space"
            />


            <button
              onClick={handleCreateSpace}
            >
              Create space →
            </button>


            {/* This technically only exists briefly now,
                because after creation we immediately
                move to the constellation page. */}
            {createdSpace && (
              <div>

                <p>
                  C O D E : {spaceCode}
                </p>

              </div>
            )}

          </div>


        </div>

      </section>

    </main>
  );
}