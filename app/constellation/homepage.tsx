"use client";

import { useState } from "react";

export default function ConstellationHome() {
  // text holds whatever the user is presently typing.
  // setText is how we update or clear that value.
  const [text, setText] = useState("");

  // releasedText holds the thought AFTER the user clicks "release it".
  // This is separate from text so we can clear the textarea
  // without losing the thought that was already released.
  const [releasedTexts, setReleasedText] = useState<string[]>([]); // an array of strings to hold multiple released thoughts
  // starts empthy tho.


  function handleTextChange(event: React.ChangeEvent<HTMLTextAreaElement>) {
    const newText = event.target.value;
    setText(newText);
  }

  function handleRelease() {
    if (text.trim() === "") {
      return;
    }

    // Copy the current typed text into releasedText.
    // Example:
    // text = "I feel lonely"
    // releasedText = "I feel lonely"
    setReleasedText([...releasedTexts, text]); // Adding the new thought to the array of released thoughts.

    // Clear ONLY the typing state.
    // Because the textarea uses value={text}, this clears the textarea.
    setText("");
  }

  return (
    <main>
      <h1>Constellation</h1>
      <p>See what your community shares.</p>

      <textarea
        // The textarea always displays whatever is stored in `text`.
        value={text}
        onChange={handleTextChange}
        placeholder="What's something you're carrying right now?"
      />

      <button onClick={handleRelease}>
        release it
      </button>

          {/* Display the thought that was released. */}

          {releasedTexts.map((releasedText, index) => (
            <div key={index}>
             <p>✦</p> 
             <p> {releasedText} </p> 
        </div> 
          ))}
    </main>
  );
}