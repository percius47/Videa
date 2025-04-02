import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

// Helper to get user ID from request
async function getUserIdFromRequest(
  request: NextRequest
): Promise<string | null> {
  // Extract token from Authorization header
  const authHeader = request.headers.get("authorization");
  const token = authHeader?.startsWith("Bearer ") ? authHeader.slice(7) : null;

  if (!token) {
    // Try to get user ID from Supabase directly using service role
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_KEY!
    );

    // This will work for server-side requests with cookies
    const { data } = await supabase.auth.getUser();
    return data?.user?.id || null;
  }

  // Verify the token
  try {
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_KEY!
    );

    // Get user from token
    const { data } = await supabase.auth.getUser(token);
    return data?.user?.id || null;
  } catch (error) {
    console.error("Error verifying token:", error);
    return null;
  }
}

// DELETE /api/ideas/[id] - Delete a specific idea
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const ideaId = params.id;
    const userId = await getUserIdFromRequest(request);

    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Create a direct Supabase client for the API route
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_KEY! // Using service key bypasses RLS
    );

    // Direct delete with admin rights (bypasses RLS)
    const { error } = await supabase
      .from("video_ideas")
      .delete()
      .eq("id", ideaId)
      .eq("user_id", userId);

    if (error) {
      console.error("Error deleting idea:", error);

      if (error.code === "42P01") {
        return NextResponse.json(
          {
            error: "Database table not found. Please run the setup SQL script.",
          },
          { status: 500 }
        );
      }

      return NextResponse.json(
        { error: error.message || "Failed to delete idea" },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting idea:", error);
    const errorMessage =
      error instanceof Error ? error.message : "Failed to delete idea";

    // Check if it's a database table error
    if (errorMessage.includes("Database table not found")) {
      return NextResponse.json(
        {
          error:
            "System is currently undergoing maintenance. Please try again later.",
        },
        { status: 503 }
      );
    }

    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}
