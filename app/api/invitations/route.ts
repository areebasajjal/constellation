import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export const dynamic = "force-dynamic";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!
);

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
          activity: activity.trim(),
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
  }
}

export async function PATCH(request: Request) {
  try {
    const body = await request.json();
    const { invitationId, responderId, status } = body;

    if (!invitationId || !responderId || !status) {
      return NextResponse.json(
        { error: "Response information is missing." },
        { status: 400 }
      );
    }

    if (status !== "accepted" && status !== "declined") {
      return NextResponse.json(
        { error: "That invitation response is invalid." },
        { status: 400 }
      );
    }

    // Only the intended receiver should be able to answer this row.
    const { data: invitation, error: invitationError } =
      await supabase
        .from("connection_invitations")
        .select("id, receiver_id, status")
        .eq("id", invitationId)
        .maybeSingle();

    if (
      invitationError ||
      !invitation ||
      invitation.receiver_id !== responderId ||
      invitation.status !== "pending"
    ) {
      return NextResponse.json(
        { error: "This invitation can no longer be answered." },
        { status: 400 }
      );
    }

    const { data: updatedInvitation, error: updateError } =
      await supabase
        .from("connection_invitations")
        .update({ status })
        .eq("id", invitationId)
        .eq("receiver_id", responderId)
        .eq("status", "pending")
        .select("id, activity, status")
        .single();

    if (updateError) {
      console.error("Invitation response failed:", updateError);

      return NextResponse.json(
        { error: "Your response could not be saved." },
        { status: 500 }
      );
    }

    return NextResponse.json({ invitation: updatedInvitation });
  } catch (error) {
    console.error("Invitation response route failed:", error);

    return NextResponse.json(
      { error: "Your response could not be saved." },
      { status: 500 }
    );
  }
}
