"use client";

import { useState } from "react";

export default function SpacesPage() {

  // Stores whatever the user is currently typing in the "Create a Space" input.
  const [spaceName, setSpaceName] = useState("");

  // Stores the final space name after clicks "Create space".
  const [createdSpace, setCreatedSpace] = useState("");

  const [spaceCode, setSpaceCode] = useState("");

  const [joinCode, setJoinCode] = useState("");

  // Function to handle changes in the "Create a Space" input field.
  function handleSpaceNameChange(event: React.ChangeEvent<HTMLInputElement>) {
    const newName = event.target.value;

    setSpaceName(newName);
  }

// function to generate a unique space code based on the space name.
  function generateSpaceCode(name: string) {
      const cleanName = name.replace(/\s+/g, "").toUpperCase();

      const shortName = cleanName.slice(0, 6);

      const randomNumber = Math.floor(100 + Math.random() * 900
  );

  return shortName + randomNumber;
}

// fuction to handle the creation of a new space when the user clicks the "Create space" button.
  function handleCreateSpace() {
       if (spaceName.trim() === "") {
           return;
    }

    const newCode = generateSpaceCode(spaceName);
    
    setCreatedSpace(spaceName);
    setSpaceCode(newCode);

    setSpaceName("");
  }


   function handleJoinCodeChange(event: React.ChangeEvent<HTMLInputElement>) {
        const newCode = event.target.value;
        setJoinCode(newCode);
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
              value={joinCode}
              onChange={handleJoinCodeChange}
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
                <div>
                    <p> Space created: {createdSpace} </p>
           <p> Space code: {spaceCode} </p>
  </div>
)}

          </div>

        </div>

      </section>

    </main>
  );
}