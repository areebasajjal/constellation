"use client";

import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { supabase } from "../../lib/supabase";

export default function ConstellationHome() {

  // Reads values from the URL.
  const searchParams = useSearchParams();

  // Example URL:
  // /constellation?space=AAA345&star=CT-583
  const spaceCode = searchParams.get("space");


  const [text, setText] = useState("");


  const [releasedTexts, setReleasedTexts] = useState<string[]>([]);


  const [spaceName, setSpaceName] = useState("");


  useEffect(() => {

    async function getSpaceName() {

      if (!spaceCode) {
        return;
      }

      const { data, error } = await supabase
        .from("spaces")
        .select("name")
        .eq("code", spaceCode)
        .maybeSingle();


      if (error) {
        console.log("Error getting space name:");
        console.log(error);
        return;
      }

      if (data) {
        setSpaceName(data.name);
      }
    }


    getSpaceName();

  }, [spaceCode]);


  function handleTextChange(
    event: React.ChangeEvent<HTMLTextAreaElement>
  ) {
    const newText = event.target.value;

    setText(newText);
  }

  function handleRelease() {

    if (text.trim() === "") {
      return;
    }

    setReleasedTexts([...releasedTexts, text]);

    setText("");
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


          <button onClick={handleRelease}>
            Release it
            <span>✦</span>
          </button>

        </div>

      </section>


      {releasedTexts.length > 0 && (

        <section className="released-section">

          <p className="released-label">
            RELEASED SIGNALS
          </p>


          <div className="released-stars">

            {releasedTexts.map((releasedText, index) => (

              <div
                className="released-star"
                key={index}
              >

                <div className="released-star-symbol">
                  ✦
                </div>


                <p>
                  {releasedText}
                </p>

              </div>

            ))}

          </div>

        </section>

      )}

    </main>
  );
}