"use client";

import { useState } from "react";

export default function SpacesPage() {

  // Stores whatever the user is currently typing in the "Create a Space" input.
  const [spaceName, setSpaceName] = useState("");

  // Stores the final space name after clicks "Create space".
  const [createdSpace, setCreatedSpace] = useState("");

  function handleSpaceNameChange(event: React.ChangeEvent<HTMLInputElement>) {
    const newName = event.target.value;

    setSpaceName(newName);
  }

  function handleCreateSpace() {

    if (spaceName.trim() === "") {
      return;
    }

    // Save the current typed space nameas the created space.
    setCreatedSpace(spaceName);

    setSpaceName("");
  }

  return (
    <main className="space-page">

      <section className="space-content">

        <div className="star star-11"></div>
        <div className="star star-2"></div>
        <div className="star star-77"></div>
        <div className="star star-88"></div>
        <div className="star star-99"></div>
         <div className="star star-00"></div>

        <p className="space-kicker">
          ENTER THE CONSTELLATION
        </p>

        <h1>Find your space.</h1>

        <div className="space-options">

          <div className="space-option">

            <h2>Join a Space</h2>

            <p>
              Enter a space code shared by your community.
            </p>

            <input
              type="text"
              placeholder="e.g. GIRLIES26"
            />

            <button>
              Join space →
            </button>

          </div>


          <div className="space-option">

            <h2>Create a Space</h2>

            <p>
              Start a new constellation for your group.
            </p>

            <input
              type="text"

              // The input always shows whateveris currently stored in spaceName.
              value={spaceName}

              onChange={handleSpaceNameChange}

              placeholder="Name your space"
            />

            <button onClick={handleCreateSpace}>
              Create space →
            </button>

            {createdSpace && (
              <p>
                Space created: {createdSpace}
              </p>
            )}

          </div>

        </div>

      </section>

    </main>
  );
}