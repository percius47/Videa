import { NextResponse } from "next/server";
import axios from "axios";

// Helper function to delay execution
const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

// Helper function to retry failed requests
async function retryRequest(
  fn: () => Promise<any>,
  retries = 3,
  delayMs = 1000
): Promise<any> {
  try {
    return await fn();
  } catch (error: any) {
    if (
      retries > 0 &&
      (error?.response?.status === 429 || error?.response?.status === 403)
    ) {
      console.log(
        `Rate limited, retrying after ${delayMs}ms... (${retries} retries left)`
      );
      await delay(delayMs);
      return retryRequest(fn, retries - 1, delayMs * 2);
    }
    throw error;
  }
}

export async function GET(request: Request) {
  try {
    // Parse query from URL parameters
    const url = new URL(request.url);
    const query = url.searchParams.get("query");
    const maxResults = url.searchParams.get("maxResults") || "5"; // Default to 5 results

    if (!query) {
      return NextResponse.json(
        { error: "Search query is required" },
        { status: 400 }
      );
    }

    console.log(`🔍 Searching YouTube for creator: "${query}"`);

    // Use YouTube Data API to search for channels
    const YOUTUBE_API_KEY = process.env.YOUTUBE_API_KEY;

    if (!YOUTUBE_API_KEY) {
      throw new Error(
        "YouTube API key is not defined in environment variables"
      );
    }

    // Search for channels matching the query
    const searchResponse = await retryRequest(() =>
      axios.get(`https://www.googleapis.com/youtube/v3/search`, {
        params: {
          part: "snippet",
          q: query,
          type: "channel",
          maxResults: parseInt(maxResults),
          key: YOUTUBE_API_KEY,
        },
      })
    );

    // Check if any channels were found
    if (!searchResponse.data.items || searchResponse.data.items.length === 0) {
      return NextResponse.json(
        { error: "No channels found matching that name" },
        { status: 404 }
      );
    }

    // Format the results
    const channels = searchResponse.data.items.map((channel: any) => ({
      channelId: channel.id.channelId,
      title: channel.snippet.title,
      description: channel.snippet.description,
      thumbnails: channel.snippet.thumbnails,
    }));

    return NextResponse.json({
      channels: channels,
    });
  } catch (error: any) {
    console.error("❌ Error searching for YouTube channel:", error);
    console.error("Error details:", {
      message: error.message,
      status: error.response?.status,
      data: error.response?.data,
    });

    return NextResponse.json(
      { error: "Failed to search for YouTube channel" },
      { status: 500 }
    );
  }
}
