import { NextRequest, NextResponse } from "next/server";
import { VideoIdea } from "@/lib/types";
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

// POST /api/ideas - Save a video idea
export async function POST(request: NextRequest) {
  try {
    const userId = await getUserIdFromRequest(request);

    if (!userId) {
      return NextResponse.json(
        { error: "You must be logged in to save ideas" },
        { status: 401 }
      );
    }

    const idea: VideoIdea = await request.json();

    if (!idea || !idea.id || !idea.title) {
      return NextResponse.json(
        { error: "Invalid idea data provided" },
        { status: 400 }
      );
    }

    // Create a direct Supabase client for the API route
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_KEY! // Using service key bypasses RLS
    );

    // Direct insert with admin rights (bypasses RLS)
    const { data, error } = await supabase
      .from("video_ideas")
      .insert({
        id: idea.id,
        title: idea.title,
        concept: idea.concept,
        platform: idea.platform,
        content_type: idea.contentType,
        virality_score: idea.viralityScore,
        virality_justification: idea.viralityJustification,
        monetization_strategy: idea.monetizationStrategy,
        video_format: idea.videoFormat,
        hashtags: idea.hashtags,
        trend_analysis: idea.trendAnalysis,
        region: idea.region,
        channel_inspirations: idea.channelInspirations,
        user_id: userId,
      })
      .select("*")
      .single();

    if (error) {
      console.error("Error saving idea:", error);

      if (error.code === "42P01") {
        return NextResponse.json(
          {
            error: "Database table not found. Please run the setup SQL script.",
          },
          { status: 500 }
        );
      }

      return NextResponse.json(
        { error: error.message || "Failed to save idea" },
        { status: 500 }
      );
    }

    // Format the response
    const result = {
      id: data.id,
      title: data.title,
      concept: data.concept,
      hashtags: data.hashtags,
      viralityScore: data.virality_score,
      viralityJustification: data.virality_justification,
      monetizationStrategy: data.monetization_strategy,
      videoFormat: data.video_format,
      platform: data.platform,
      contentType: data.content_type,
      createdAt: data.created_at,
      trendAnalysis: data.trend_analysis,
      region: data.region,
      channelInspirations: data.channel_inspirations,
      userId: data.user_id,
      isSaved: true,
    };

    return NextResponse.json({ success: true, data: result });
  } catch (error) {
    console.error("Error saving idea:", error);
    const errorMessage =
      error instanceof Error ? error.message : "Failed to save idea";

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

// GET /api/ideas - Get all ideas for the current user
export async function GET(request: NextRequest) {
  try {
    const userId = await getUserIdFromRequest(request);

    if (!userId) {
      return NextResponse.json(
        { error: "You must be logged in to view ideas" },
        { status: 401 }
      );
    }

    // Create a direct Supabase client for the API route
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_KEY! // Using service key bypasses RLS
    );

    // Direct query with admin rights (bypasses RLS)
    const { data, error } = await supabase
      .from("video_ideas")
      .select("*")
      .eq("user_id", userId)
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Error getting ideas:", error);

      if (error.code === "42P01") {
        return NextResponse.json(
          {
            error: "Database table not found. Please run the setup SQL script.",
          },
          { status: 500 }
        );
      }

      return NextResponse.json(
        { error: error.message || "Failed to fetch ideas" },
        { status: 500 }
      );
    }

    // Format the response
    const ideas = data.map((item: any) => ({
      id: item.id,
      title: item.title,
      concept: item.concept,
      hashtags: item.hashtags,
      viralityScore: item.virality_score,
      viralityJustification: item.virality_justification,
      monetizationStrategy: item.monetization_strategy,
      videoFormat: item.video_format,
      platform: item.platform,
      contentType: item.content_type,
      createdAt: item.created_at,
      trendAnalysis: item.trend_analysis,
      region: item.region,
      channelInspirations: item.channel_inspirations,
      userId: item.user_id,
      isSaved: true,
    }));

    return NextResponse.json({ ideas });
  } catch (error) {
    console.error("Error getting ideas:", error);
    const errorMessage =
      error instanceof Error ? error.message : "Failed to fetch ideas";

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
