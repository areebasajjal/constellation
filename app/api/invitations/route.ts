import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!
);

const allowedActivities = [
  "🌿 Take a 10-minute walk",
  " ☕️ Grab coffee or tea",
  " 🧘 Sit somewhere quiet",
  " 🎟️ Attend the next session together",
  " 🧘 Try a short grounding exercise",
  " 🎵 Listen to music together"
];

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { spaceCode, senderId, receiverId, activity } = body;

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

    if (!allowedActivities.includes(activity)) {
      return NextResponse.json(
        { error: "That activity is not available." },
        { status: 400 }
      );
    }

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
      return NextResponse.json(
        { error: "The matched participants could not be verified." },
        { status: 400 }
      );
    }

    const { data: invitation, error: invitationError } =
      await supabase
        .from("connection_invitations")
        .insert({
          space_id: space.id,
          sender_id: senderId,
          receiver_id: receiverId,
          activity,
          status: "pending"
        })
        .select("id, activity, status")
        .single();

    if (invitationError) {
      console.error("Invitation insert failed:", invitationError);
      return NextResponse.json(
        { error: "Invitation could not be saved." },
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
  }}