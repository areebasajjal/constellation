"use client";

import { Suspense, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { supabase } from "../../lib/supabase";

// The small amount of invitation information this screen needs.
type IncomingInvitation = {
  id: string;
  activity: string;
  senderId: string;
  senderStarId: string;
};

type InvitationStatus =
  | "idle"
  | "pending"
  | "accepted"
  | "declined";

function ConstellationContent() {
  const searchParams = useSearchParams();

  const spaceCode = searchParams.get("space");
  const starId = searchParams.get("star");


  const [text, setText] = useState("");
  const [spaceName, setSpaceName] = useState("");

  const [stars, setStars] = useState<string[]>([]);

  const [releaseError, setReleaseError] = useState("");
  const [showActivities, setShowActivities] = useState(false);
  const [selectedActivity, setSelectedActivity] = useState("");
  const [releasing, setReleasing] = useState(false);

  const [matchedStar, setMatchedStar] = useState("");

  const [currentParticipantId, setCurrentParticipantId] = useState("");

  const [matchedParticipantId, setMatchedParticipantId] = useState("");

  const [sendingInvitation, setSendingInvitation] = useState(false);

  const [invitationSent, setInvitationSent] = useState(false);

  const [invitationError, setInvitationError] = useState("");

  // The sender needs this ID so they can listen for the answer.
  const [sentInvitationId, setSentInvitationId] = useState("");

  const [invitationStatus, setInvitationStatus] =
    useState<InvitationStatus>("idle");

  const [respondingToInvitation, setRespondingToInvitation] =
    useState(false);

  // When another Star invites this person, we keep it here.
  const [incomingInvitation, setIncomingInvitation] =
    useState<IncomingInvitation | null>(null);

  useEffect(() => {
    async function loadSpaceData() {
      if (!spaceCode) {
        return;
      }

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

      setSpaceName(spaceData.name);

      // Find this person's database ID when the page opens.
      // This lets invitations work even after a refresh.
      if (starId) {
        const {
          data: currentParticipant,
          error: currentParticipantError
        } = await supabase
          .from("participants")
          .select("id")
          .eq("space_id", spaceData.id)
          .eq("star_id", starId)
          .maybeSingle();

        if (currentParticipantError || !currentParticipant) {
          console.log(
            "Could not load current participant:",
            currentParticipantError
          );
        } else {
          setCurrentParticipantId(currentParticipant.id);
        }
      }

      const { data: participantData, error: participantError } =
        await supabase.from("participants").select("star_id").eq("space_id", spaceData.id).eq("has_released", true);

      if (participantError) {
        console.log("Error loading stars:");
        console.log(participantError);
        return;
      }

      const starIds = participantData.map(
        (participant) => participant.star_id
      );

      setStars(starIds);
    }

    loadSpaceData();
  }, [spaceCode, starId]);

  useEffect(() => {
    if (!spaceCode) {
      return;
    }

    const channel = supabase
      .channel(`participant-updates-${spaceCode}`)
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "participants"
        },
        () => {
      console.log("A participant was updated.");
      }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [spaceCode]);

  // Load an invitation that may already be waiting, then listen
  // for a new one while this page stays open.
  useEffect(() => {
    if (!currentParticipantId) {
      return;
    }

    let stillMounted = true;

    // Turn the sender's database ID into the friendly Star ID.
    async function showInvitation(invitation: {
      id: string;
      activity: string;
      sender_id: string;
    }) {
      const { data: sender, error: senderError } =
        await supabase
          .from("participants")
          .select("star_id")
          .eq("id", invitation.sender_id)
          .maybeSingle();

      if (senderError || !sender) {
        console.log(
          "Could not load invitation sender:",
          senderError
        );
        return;
      }

      if (!stillMounted) {
        return;
      }

      setIncomingInvitation({
        id: invitation.id,
        activity: invitation.activity,
        senderId: invitation.sender_id,
        senderStarId: sender.star_id
      });
    }

    // If the invitation arrived earlier, show it now.
    async function loadPendingInvitation() {
      const { data: invitation, error } = await supabase
        .from("connection_invitations")
        .select("id, activity, sender_id")
        .eq("receiver_id", currentParticipantId)
        .eq("status", "pending")
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (error) {
        console.log("Could not load invitation:", error);
        return;
      }

      if (invitation) {
        await showInvitation(invitation);
      }
    }

    loadPendingInvitation();

    // New invitations arrive here without refreshing the page.
    const invitationChannel = supabase
      .channel(`invitations-${currentParticipantId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "connection_invitations",
          filter: `receiver_id=eq.${currentParticipantId}`
        },
        async (payload) => {
          console.log("Invitation received:", payload.new);

          const invitation = payload.new as {
            id: string;
            activity: string;
            sender_id: string;
          };

          await showInvitation(invitation);
        }
      )
      .subscribe((status) => {
        console.log("Invitation subscription:", status);
      });

    return () => {
      stillMounted = false;
      supabase.removeChannel(invitationChannel);
    };
  }, [currentParticipantId]);

  // After sending an invitation, listen for the other Star's answer.
  useEffect(() => {
    if (!sentInvitationId) {
      return;
    }

    const responseChannel = supabase
      .channel(`invitation-response-${sentInvitationId}`)
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "connection_invitations",
          filter: `id=eq.${sentInvitationId}`
        },
        (payload) => {
          const status = payload.new.status as InvitationStatus;

          console.log("Invitation answer received:", status);
          setInvitationStatus(status);
        }
      )
      .subscribe((status) => {
        console.log("Response subscription:", status);
      });

    return () => {
      supabase.removeChannel(responseChannel);
    };
  }, [sentInvitationId]);


// test change saviour
  function handleTextChange(event: React.ChangeEvent<HTMLTextAreaElement>) {
      setText(event.target.value);
  }


// handle release click option
async function handleRelease() {

  console.log("1. Release started");

  if (text.trim() === "") {
    console.log("Stopped: thought was empty");
    return;
  }


  // Make sure we know which space
  // and which anonymous star this belongs to.
  if (!spaceCode || !starId) {

    console.log("Stopped: missing spaceCode or starId");
    console.log("spaceCode:", spaceCode);
    console.log("starId:", starId);

    setReleaseError(
      "Your space or Star ID is missing."
    );

    return;
  }


  // Disable the button while everything is saving.
  setReleasing(true);

  setReleaseError("");


  // Find the database UUID for this space.
  const { data: spaceData, error: spaceError } =
    await supabase
      .from("spaces")
      .select("id")
      .eq("code", spaceCode)
      .maybeSingle();


  console.log("2. Space lookup finished");
  console.log("spaceData:", spaceData);
  console.log("spaceError:", spaceError);


  if (spaceError || !spaceData) {

    console.log("Stopped: space could not be found");

    setReleaseError(
      "Could not find your space."
    );

    setReleasing(false);

    return;
  }


  // Find this participant inside the space.
  const { data: participantData, error: participantError } =
    await supabase
      .from("participants")
      .select("id")
      .eq("space_id", spaceData.id)
      .eq("star_id", starId)
      .maybeSingle();


  console.log("3. Participant lookup finished");
  console.log("participantData:", participantData);
  console.log("participantError:", participantError);


  if (participantError || !participantData) {

    console.log("Stopped: participant could not be found");

    setReleaseError(
      "Could not find your Star ID."
    );

    setReleasing(false);

    return;
  }

  setCurrentParticipantId(participantData.id);



  // Send the thought to our own API route.
  // route.ts checks safety first, then creates the embedding.
  const embeddingResponse = await fetch("/api/embed", {
    method: "POST",

    headers: {
      "Content-Type": "application/json"
    },

    body: JSON.stringify({
      text: text.trim()
    })
  });


  console.log(
    "5. Embedding response status:",
    embeddingResponse.status
  );


  // If the API route failed.
  if (!embeddingResponse.ok) {

    const errorData =
      await embeddingResponse.json();

    console.log("Embedding API error:");
    console.log(errorData);

    setReleaseError(
      "Your thought could not be processed."
    );

    setReleasing(false);

    return;
  }


  // Read the response from route.ts.
  const embeddingData =
    await embeddingResponse.json();



  // Self-harm safety response.
  if (
    embeddingData.safe === false &&
    embeddingData.action === "support"
  ) {

    setReleaseError(
      "It sounds like you're carrying something that may need more support than this constellation can provide. Please consider reaching out to someone you trust or appropriate local support."
    );

    setReleasing(false);

    return;
  }



  // Other unsafe content.
  if (
    embeddingData.safe === false &&
    embeddingData.action === "blocked"
  ) {

    setReleaseError(
      "This thought can't be released into the constellation due to unsafe content."
    );

    setReleasing(false);

    return;
  }



  // Safe thought.
  const embedding =
    embeddingData.embedding;


  // Make sure we actually received
  // the expected 512-number vector.
  if (
    !Array.isArray(embedding) ||
    embedding.length !== 512
  ) {

    console.log("Invalid embedding:");
    console.log(embedding);

    setReleaseError(
      "The thought embedding could not be generated."
    );

    setReleasing(false);

    return;
  }


  console.log(
    "Embedding length:",
    embedding.length
  );



  // Permanently save the private thought
  // and its embedding in Supabase.
  const { error: thoughtError } =
    await supabase
      .from("thoughts")
      .insert({
        space_id: spaceData.id,
        participant_id: participantData.id,
        text: text.trim(),
        embedding: embedding
      });


  console.log(
    "thoughtError:",
    thoughtError
  );


  if (thoughtError) {

    console.log("Error saving thought:");
    console.log(thoughtError);

    setReleaseError(
      "Your thought could not be released."
    );

    setReleasing(false);

    return;
  }



  // VECTOR MATCHING


  // Compare this new embedding against other thoughts in the SAME space.
  const { data: matchData, error: matchError } =
    await supabase.rpc(
      "match_thoughts",
      {
        query_embedding: embedding,
        current_space_id: spaceData.id,
        current_participant_id: participantData.id,
        similarity_threshold: 0.70
      }
    );

   if (matchError) {

  console.log("Matching error:");
  console.log(matchError);

} else if (matchData && matchData.length > 0) {

  console.log("Match found:", matchData);

  setMatchedStar(matchData[0].star_id);
  setMatchedParticipantId(matchData[0].participant_id);

} else {

  console.log("No match above threshold.");

  setMatchedStar("");
  setMatchedParticipantId("");
}

  // The participant has now released something,
  // so their star is allowed to appear publicly.
  const { error: updateError } =
    await supabase
      .from("participants")
      .update({
        has_released: true
      })
      .eq("id", participantData.id);


  console.log(
    "updateError:",
    updateError
  );


  if (updateError) {

    setReleaseError(
      "Your thought was saved, but your star could not be displayed."
    );

    setReleasing(false);

    return;
  }



  // Immediately show this star in the current browser.
  setStars((currentStars) => {

    if (currentStars.includes(starId)) {
      return currentStars;
    }

    return [
      ...currentStars,
      starId
    ];
  });


  setText("");

  setReleasing(false);
}

async function handleSendInvitation() {
  if (
    !spaceCode ||
    !selectedActivity ||
    !currentParticipantId ||
    !matchedParticipantId
  ) {
    setInvitationError(
      "The invitation is missing some information."
    );
    return;
  }

  setSendingInvitation(true);
  setInvitationError("");

  try {
    const response = await fetch("/api/invitations", {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        spaceCode,
        senderId: currentParticipantId,
        receiverId: matchedParticipantId,
        activity: selectedActivity
      })
    });

    // API routes should return JSON. If Vercel sends an HTML error
    // page instead, show a useful message rather than crashing.
    const contentType = response.headers.get("content-type");

    if (!contentType?.includes("application/json")) {
      const responseText = await response.text();

      console.error(
        "Invitation API returned a non-JSON response:",
        response.status,
        responseText
      );

      setInvitationError(
        "The invitation service is not available in this deployment."
      );
      return;
    }

    const result = await response.json();

    if (!response.ok) {
      setInvitationError(
        result.error || "The invitation could not be sent."
      );
      return;
    }

    setSentInvitationId(result.invitation.id);
    setInvitationStatus("pending");
    setInvitationSent(true);
  } catch (error) {
    console.error("Sending invitation failed:", error);
    setInvitationError("The invitation could not be sent.");
  } finally {
    setSendingInvitation(false);
  }
}

// Save the receiver's Yes or No answer through our API route.
async function handleInvitationResponse(
  status: "accepted" | "declined"
) {
  if (!incomingInvitation || !currentParticipantId) {
    return;
  }

  setRespondingToInvitation(true);
  setInvitationError("");

  try {
    const response = await fetch("/api/invitations", {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        invitationId: incomingInvitation.id,
        responderId: currentParticipantId,
        status
      })
    });

    const result = await response.json();

    if (!response.ok) {
      setInvitationError(
        result.error || "Your response could not be saved."
      );
      return;
    }

    setInvitationStatus(status);
  } catch (error) {
    console.error("Invitation response failed:", error);
    setInvitationError("Your response could not be saved.");
  } finally {
    setRespondingToInvitation(false);
  }
}

  // Once both people opt in, they share the same confirmation screen.
  if (invitationStatus === "accepted" && starId) {
    const otherStar =
      incomingInvitation?.senderStarId || matchedStar;

    return (
      <main className="match-screen">
        <section className="receiver-invitation-card">
          <p className="receiver-kicker">CONNECTION CONFIRMED</p>

          <div className="received-activity-icon">✦</div>

          <h1>You both said yes.</h1>

          <p className="received-activity-message">
            {starId} and {otherStar} are both open to: {" "}
            <strong>{selectedActivity || incomingInvitation?.activity}</strong>
          </p>

          <p className="received-activity-message">
            Choose a familiar public place and keep the plan
            comfortable for both of you.
          </p>
        </section>
      </main>
    );
  }

  // A decline closes the invitation gently for either participant.
  if (invitationStatus === "declined") {
    return (
      <main className="match-screen">
        <section className="receiver-invitation-card">
          <p className="receiver-kicker">NOT RIGHT NOW</p>
          <div className="received-activity-icon">☾</div>
          <h1>No pressure at all.</h1>
          <p className="received-activity-message">
            This invitation has been closed. You can return to the
            constellation whenever you are ready.
          </p>
        </section>
      </main>
    );
  }

  // The receiver sees this card before the normal match screen.
if (incomingInvitation && starId) {
  return (
    <main className="match-screen">

      <section className="receiver-invitation-card">

        <span
          className="
            receiver-decoration
            receiver-decoration-one
          "
        >
          ✦
        </span>

        <span
          className="
            receiver-decoration
            receiver-decoration-two
          "
        >
          ✧
        </span>

        <span
          className="
            receiver-decoration
            receiver-decoration-three
          "
        >
          ⋆
        </span>

        <p className="receiver-kicker">
          A SMALL INVITATION
        </p>

        <div className="receiver-star-pair">

          <div className="receiver-star">
            <span>✦</span>

            <p>
              {incomingInvitation.senderStarId}
            </p>
          </div>

          <div className="receiver-arrow">
            →
          </div>

          <div className="receiver-star">
            <span>✦</span>

            <p>{starId}</p>
          </div>

        </div>

        <section className="received-activity">

          <p className="received-activity-label">
            YOU HAVE BEEN INVITED TO
          </p>

          <div className="received-activity-icon">
            ✦
          </div>

          <h2>
            {incomingInvitation.activity}
          </h2>

          <p className="received-activity-message">
            {incomingInvitation.senderStarId} would
            like to share this low-pressure activity
            with you. Would you be interested?
          </p>

          <div className="receiver-buttons">

            <button
              className="accept-invitation-button"
              onClick={() => handleInvitationResponse("accepted")}
              disabled={respondingToInvitation}
            >
              {respondingToInvitation
                ? "Saving..."
                : "Yes, I’m interested ✦"}
            </button>

            <button
              className="decline-invitation-button"
              onClick={() => handleInvitationResponse("declined")}
              disabled={respondingToInvitation}
            >
              Not right now
            </button>

          </div>

          {invitationError && (
            <p className="invitation-error">{invitationError}</p>
          )}

        </section>

      </section>

    </main>
  );
}

  if (matchedStar && starId) {
    return (
      <main className="match-screen">
        <section className="match-card">
          <p className="match-label">
            SHARED SIGNAL FOUND
          </p>

          <div className="match-star-pair">
            <div className="match-star-id">
              <span>✦</span>
              <p>{starId}</p>
            </div>

            <div className="match-pair-symbol">+</div>

            <div className="match-star-id">
              <span>✦</span>
              <p>{matchedStar}</p>
            </div>
          </div>

          <h1>You are carrying something similar.</h1>

          <p className="match-sentiment">
            {starId} and {matchedStar} share a similar signal around
            connection and belonging.
          </p>

          {!showActivities ? (
            <button
              className="connection-button"
              onClick={() => setShowActivities(true)}
            >
              Make a connection
            </button>
          ) : invitationSent ? (
            <section className="activity-confirmation">
              <p className="activity-kicker">WAITING FOR A RESPONSE</p>
              <div className="selected-activity-icon">✦</div>
              <h2>{selectedActivity}</h2>
              <p className="invitation-success">
                Your invitation was sent to {matchedStar}. This
                screen will update when they answer.
              </p>
            </section>
          ) : selectedActivity ? (
            <section className="activity-confirmation">
              <p className="activity-kicker">YOUR INVITATION</p>
              <div className="selected-activity-icon">✦</div>
              <h2>{selectedActivity}</h2>
              <p className="activity-description">
                Would you like to invite {matchedStar} to do this
                activity with you?
              </p>

              {invitationError && (
                <p className="invitation-error">{invitationError}</p>
              )}

              <div className="confirmation-buttons">
                <button
                  className="send-invitation-button"
                  onClick={handleSendInvitation}
                  disabled={sendingInvitation}
                >
                  {sendingInvitation
                    ? "Sending..."
                    : "Yes, send invitation"}
                </button>

                <button
                  className="back-button"
                  onClick={() => {
                    setSelectedActivity("");
                    setInvitationError("");
                  }}
                >
                  Choose another activity
                </button>
              </div>
            </section>
          ) : (
            <section className="activity-section">
              <p className="activity-kicker">
                CHOOSE A SHARED ACTIVITY
              </p>

              <h2>What would feel comfortable?</h2>

              <p className="activity-description">
                Choose one small, low-pressure activity. The other
                Star will be able to accept or decline.
              </p>

              <div className="activity-options">
                <button onClick={() => setSelectedActivity("Take a 10-minute walk")}>
                  🌿 Take a 10-minute walk
                </button>
                <button onClick={() => setSelectedActivity("Grab coffee or tea")}>
                  ☕️ Grab coffee or tea
                </button>
                <button onClick={() => setSelectedActivity("Sit somewhere quiet")}>
                  🧘 Sit somewhere quiet
                </button>
                <button onClick={() => setSelectedActivity("Attend the next session together")}>
                  🎟️ Attend the next session together
                </button>
                <button onClick={() => setSelectedActivity("Try a short grounding exercise")}>
                  🧘 Try a short grounding exercise
                </button>
                <button onClick={() => setSelectedActivity("Listen to music together")}>
                  🎵 Listen to music together
                </button>
              </div>
            </section>
          )}
        </section>
      </main>
    );
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

export default function ConstellationPage() {
  return (
    <Suspense fallback={<p>Loading constellation...</p>}>
      <ConstellationContent />
    </Suspense>
  );
}
