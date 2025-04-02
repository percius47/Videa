import { NextResponse } from "next/server";
import axios from "axios";

// Channel video interface
interface ChannelVideo {
  title: string;
  views: string;
  author: string;
  authorStats: {
    subscribers: string;
    totalViews: string;
  };
  description: string;
  videoId: string;
  publishedText: string;
  stats: {
    views: string;
    likes: string;
    comments: string;
  };
  tags: string[];
  category: string;
}

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
    // Parse channel ID from URL parameters
    const url = new URL(request.url);
    const channelId = url.searchParams.get("channelId");

    if (!channelId) {
      return NextResponse.json(
        { error: "Channel ID is required" },
        { status: 400 }
      );
    }

    console.log(`🎥 Fetching YouTube channel videos for: ${channelId}`);

    // Use YouTube Data API to get channel videos
    const YOUTUBE_API_KEY = process.env.YOUTUBE_API_KEY;

    if (!YOUTUBE_API_KEY) {
      throw new Error(
        "YouTube API key is not defined in environment variables"
      );
    }

    // Step 1: Get channel info
    const channelResponse = await retryRequest(() =>
      axios.get(`https://www.googleapis.com/youtube/v3/channels`, {
        params: {
          part: "snippet,statistics,contentDetails",
          id: channelId,
          key: YOUTUBE_API_KEY,
        },
      })
    );

    if (
      !channelResponse.data.items ||
      channelResponse.data.items.length === 0
    ) {
      return NextResponse.json({ error: "Channel not found" }, { status: 404 });
    }

    const channelInfo = channelResponse.data.items[0];
    const uploadsPlaylistId =
      channelInfo.contentDetails.relatedPlaylists.uploads;

    // Step 2: Get channel videos from uploads playlist
    const videosResponse = await retryRequest(() =>
      axios.get(`https://www.googleapis.com/youtube/v3/playlistItems`, {
        params: {
          part: "snippet,contentDetails",
          playlistId: uploadsPlaylistId,
          maxResults: 50, // Maximum allowed by the API
          key: YOUTUBE_API_KEY,
        },
      })
    );

    console.log("✅ YouTube API Response received");
    console.log(`📊 Total videos fetched: ${videosResponse.data.items.length}`);

    // Step 3: Get details for each video
    const videoIds = videosResponse.data.items
      .map((item: any) => item.contentDetails.videoId)
      .join(",");

    const videoDetailsResponse = await retryRequest(() =>
      axios.get(`https://www.googleapis.com/youtube/v3/videos`, {
        params: {
          part: "snippet,statistics,contentDetails",
          id: videoIds,
          key: YOUTUBE_API_KEY,
        },
      })
    );

    // Process videos and sort by views
    let processedVideos: ChannelVideo[] = [];

    for (const video of videoDetailsResponse.data.items) {
      // Process timestamps for "published X time ago" format
      const publishedAt = new Date(video.snippet.publishedAt);
      const now = new Date();
      const diffTime = Math.abs(now.getTime() - publishedAt.getTime());
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      let publishedText = "";

      if (diffDays < 1) {
        publishedText = "Today";
      } else if (diffDays === 1) {
        publishedText = "1 day ago";
      } else if (diffDays < 7) {
        publishedText = `${diffDays} days ago`;
      } else if (diffDays < 30) {
        const weeks = Math.floor(diffDays / 7);
        publishedText = `${weeks} ${weeks === 1 ? "week" : "weeks"} ago`;
      } else {
        const months = Math.floor(diffDays / 30);
        publishedText = `${months} ${months === 1 ? "month" : "months"} ago`;
      }

      processedVideos.push({
        title: video.snippet.title,
        views: String(video.statistics.viewCount || "0"),
        author: video.snippet.channelTitle,
        authorStats: {
          subscribers: String(channelInfo.statistics.subscriberCount || "0"),
          totalViews: String(channelInfo.statistics.viewCount || "0"),
        },
        description: video.snippet.description,
        videoId: video.id,
        publishedText: publishedText,
        stats: {
          views: String(video.statistics.viewCount || "0"),
          likes: String(video.statistics.likeCount || "0"),
          comments: String(video.statistics.commentCount || "0"),
        },
        tags: video.snippet.tags || [],
        category: video.snippet.categoryId || "N/A",
      });
    }

    // Sort videos by view count (descending)
    processedVideos.sort(
      (a, b) => parseInt(b.stats.views) - parseInt(a.stats.views)
    );

    // Take top 20 videos
    const topVideos = processedVideos.slice(0, 20);

    return NextResponse.json({
      channelInfo: {
        id: channelInfo.id,
        title: channelInfo.snippet.title,
        description: channelInfo.snippet.description,
        customUrl: channelInfo.snippet.customUrl,
        thumbnails: channelInfo.snippet.thumbnails,
        statistics: channelInfo.statistics,
      },
      videos: topVideos,
      metadata: {
        fetchedAt: new Date().toISOString(),
        totalFetched: topVideos.length,
        source: "YouTube Data API",
      },
    });
  } catch (error: any) {
    console.error("❌ Error fetching channel videos:", error);
    console.error("Error details:", {
      message: error.message,
      status: error.response?.status,
      data: error.response?.data,
    });

    return NextResponse.json(
      { error: "Failed to fetch channel videos" },
      { status: 500 }
    );
  }
}
