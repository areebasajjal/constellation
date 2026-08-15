"use client";

import { useState } from "react";

export default function Home() {
  const [text, setText] = useState("");
  const [ releasedText , setReleasedText ] = useState("");

  function handleTextChange(event: React.ChangeEvent<HTMLTextAreaElement>) {
    const newText = event.target.value;
    setText(newText);
  }
   function handleRelease() {
    setReleasedText(text);
  }

  return (
    <main>
      <h1>Constellation</h1>
      <p>See what your community shares.</p>

      <textarea
        value={text}
        onChange={handleTextChange}
        placeholder="What's something you're carrying right now?"
      />

      <button 
        onClick={handleRelease}>
        release it
      </button>

      {releasedText && (
        <div>
          <p>✦</p>
          <p>{releasedText}</p>
        </div>
      )}
    </main>
  );
}