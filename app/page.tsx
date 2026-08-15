"use client";

import { useState } from "react";

export default function Home() {
  // text holds whatever the user is presently typing.
  // setText is how we update or clear that value.
  const [text, setText] = useState("");

  // releasedText holds the thought AFTER the user clicks "release it".
  // This is separate from text so we can clear the textarea
  // without losing the thought that was already released.
  const [releasedText, setReleasedText] = useState("");


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
    setReleasedText(text);

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

      {releasedText && (
        <div>
          <p>✦</p>

          {/* Display the thought that was released. */}
          
          <p>{releasedText}</p>
        </div>
      )}
    </main>
  );
}