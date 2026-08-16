import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

// debugging to see if this works now
export const dynamic = "force-dynamic";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!
);

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { spaceCode, senderId, receiverId, activity } = body;

    // Make sure the request contains everything needed.
    if (!spaceCode || !senderId || !receiverId || !activity) {
      return NextResponse.json(
        { error: "Invitation information is missing." },
        { status: 400 }
      );
    }

    if (senderId === receiverId) {
      return NextResponse.json(
        { error: "You cannot invite yourself." },
        { status: 400 }
      );
    }

    // Keep validation simple so tiny wording changes do not break invitations.
    if (
      typeof activity !== "string" ||
      activity.trim().length === 0 ||
      activity.trim().length > 100
    ) {
      return NextResponse.json(
        { error: "The selected activity is invalid." },
        { status: 400 }
      );
    }

    // Find the space that both Stars should belong to.
    const { data: space, error: spaceError } = await supabase
      .from("spaces")
      .select("id")
      .eq("code", spaceCode)
      .maybeSingle();

    if (spaceError || !space) {
      return NextResponse.json(
        { error: "Space could not be found." },
        { status: 404 }
      );
    }

    // Do not create invitations between Stars from different spaces.
    const { data: participants, error: participantError } =
      await supabase
        .from("participants")
        .select("id")
        .eq("space_id", space.id)
        .in("id", [senderId, receiverId]);

    if (
      participantError ||
      !participants ||
      participants.length !== 2
    ) {
      console.error(
        "Participant verification failed:",
        participantError
      );

      return NextResponse.json(
        { error: "The matched participants could not be verified." },
        { status: 400 }
      );
    }

    // Save the invitation so the receiver can load it or get it live.
    const { data: invitation, error: invitationError } =
      await supabase
        .from("connection_invitations")
        .insert({
          space_id: space.id,
          sender_id: senderId,
          receiver_id: receiverId,
          activity: activity.trim(),
          status: "pending"
        })
        .select("id, activity, status")
        .single();

    if (invitationError) {
      console.error("Invitation insert failed:", invitationError);

      return NextResponse.json(
        {
          error: "Invitation could not be saved.",
          details: invitationError.message
        },
        { status: 500 }
      );
    }

    return NextResponse.json({ invitation }, { status: 201 });
  } catch (error) {
    console.error("Invitation route failed:", error);

    return NextResponse.json(
      { error: "Invitation could not be sent." },
      { status: 500 }
    );
  }
}
