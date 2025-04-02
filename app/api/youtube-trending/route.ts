import { NextResponse } from "next/server";
import axios from "axios";
import { REGION_CODES } from "@/lib/constants";

// Enhanced TrendingVideo interface
interface TrendingVideo {
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
    // Parse region from URL parameters
    const url = new URL(request.url);
    let region = url.searchParams.get("region") || "US";

    // Validate region code
    const validRegions = REGION_CODES.map((r) => r.value);
    if (!validRegions.includes(region)) {
      console.log(`Invalid region code ${region}, falling back to US`);
      region = "US";
    }

    console.log(`🎥 Fetching YouTube trending videos for region: ${region}`);

    // Use YouTube Data API to get trending videos
    const YOUTUBE_API_KEY = process.env.YOUTUBE_API_KEY;

    if (!YOUTUBE_API_KEY) {
      throw new Error(
        "YouTube API key is not defined in environment variables"
      );
    }

    // Step 1: Get most popular videos (trending)
    const trendingVideosResponse = await retryRequest(() =>
      axios.get(`https://www.googleapis.com/youtube/v3/videos`, {
        params: {
          part: "snippet,statistics,contentDetails",
          chart: "mostPopular",
          regionCode: region,
          maxResults: 50, // Maximum allowed by the API
          key: YOUTUBE_API_KEY,
        },
      })
    );

    console.log("✅ YouTube API Response received");
    console.log(
      `📊 Total videos fetched: ${trendingVideosResponse.data.items.length}`
    );

    // Process videos in batches to avoid rate limiting
    const BATCH_SIZE = 5;
    const videos = trendingVideosResponse.data.items;
    let processedVideos: TrendingVideo[] = [];

    for (let i = 0; i < videos.length; i += BATCH_SIZE) {
      const batch = videos.slice(i, i + BATCH_SIZE);

      const batchResults = await Promise.all(
        batch.map(async (video: any) => {
          try {
            // Get channel details
            const channelResponse = await retryRequest(() =>
              axios.get(`https://www.googleapis.com/youtube/v3/channels`, {
                params: {
                  part: "statistics",
                  id: video.snippet.channelId,
                  key: YOUTUBE_API_KEY,
                },
              })
            );

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
              publishedText = `${months} ${
                months === 1 ? "month" : "months"
              } ago`;
            }

            return {
              title: video.snippet.title,
              views: String(video.statistics.viewCount || "0"),
              author: video.snippet.channelTitle,
              authorStats: {
                subscribers: String(
                  channelResponse.data.items[0]?.statistics?.subscriberCount ||
                    "0"
                ),
                totalViews: String(
                  channelResponse.data.items[0]?.statistics?.viewCount || "0"
                ),
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
              category: video.snippet.categoryId || "N/A", // Using categoryId as category
            };
          } catch (error) {
            console.error(`Error processing video ${video.id}:`, error);
            // Return basic video info if processing fails
            return {
              title: video.snippet.title,
              views: String(video.statistics?.viewCount || "0"),
              author: video.snippet.channelTitle,
              authorStats: { subscribers: "0", totalViews: "0" },
              description: video.snippet.description,
              videoId: video.id,
              publishedText: "Unknown",
              stats: {
                views: String(video.statistics?.viewCount || "0"),
                likes: String(video.statistics?.likeCount || "0"),
                comments: String(video.statistics?.commentCount || "0"),
              },
              tags: video.snippet.tags || [],
              category: video.snippet.categoryId || "N/A",
            };
          }
        })
      );

      processedVideos = [...processedVideos, ...batchResults];
      console.log(
        `✅ Processed batch ${Math.floor(i / BATCH_SIZE) + 1}/${Math.ceil(
          videos.length / BATCH_SIZE
        )} (${processedVideos.length}/${videos.length} videos)`
      );

      // Add delay between batches to avoid rate limiting
      if (i + BATCH_SIZE < videos.length) {
        await delay(500);
      }
    }

    console.log("📝 Processed trending videos:");
    console.table(
      processedVideos.map((v) => ({
        title: v.title.substring(0, 50) + "...",
        author: v.author,
        views: v.stats.views,
        likes: v.stats.likes,
        comments: v.stats.comments,
        category: v.category,
      }))
    );

    return NextResponse.json({
      videos: processedVideos,
      metadata: {
        fetchedAt: new Date().toISOString(),
        region: region,
        totalFetched: processedVideos.length,
        source: "YouTube Data API",
      },
    });
  } catch (error: any) {
    console.error("❌ Error fetching trending videos:", error);
    console.error("Error details:", {
      message: error.message,
      status: error.response?.status,
      data: error.response?.data,
    });
    return NextResponse.json(
      { error: "Failed to fetch trending videos" },
      { status: 500 }
    );
  }
}

/* 
// RapidAPI Implementation (Kept for reference)
async function processBatchRapidAPI(
  videos: any[],
  options: any,
  startIdx: number,
  batchSize: number
): Promise<TrendingVideo[]> {
  const batch = videos.slice(startIdx, startIdx + batchSize);
  const results = await Promise.all(
    batch.map(async (video) => {
      const videoDetailsOptions = {
        ...options,
        url: `https://youtube138.p.rapidapi.com/video/details/`,
        params: {
          id: video.videoId,
        },
      };

      try {
        const videoDetails = await retryRequest(() =>
          axios.request(videoDetailsOptions)
        );
        const details = videoDetails.data;

        return {
          title: video.title,
          views: String(video.viewCount || "0"),
          author: video.author,
          authorStats: {
            subscribers: String(details.author?.stats?.subscribers || "0"),
            totalViews: String(details.author?.stats?.views || "0"),
          },
          description: video.description,
          videoId: video.videoId,
          publishedText: video.publishedText,
          stats: {
            views: String(details.stats?.views || "0"),
            likes: String(details.stats?.likes || "0"),
            comments: String(details.stats?.comments || "0"),
          },
          tags: details.tags || [],
          category: details.category?.name || "N/A",
        };
      } catch (error) {
        console.error(
          `Error fetching details for video ${video.videoId}:`,
          error
        );
        // Return basic video info if details fetch fails
        return {
          title: video.title,
          views: String(video.viewCount || "0"),
          author: video.author,
          authorStats: { subscribers: "0", totalViews: "0" },
          description: video.description,
          videoId: video.videoId,
          publishedText: video.publishedText,
          stats: { views: "0", likes: "0", comments: "0" },
          tags: [],
          category: "N/A",
        };
      }
    })
  );

  // Add delay between batches
  if (startIdx + batchSize < videos.length) {
    await delay(1000);
  }

  return results;
}

// RapidAPI Implementation
export async function GETRapidAPI() {
  try {
    console.log("🎥 Fetching YouTube trending videos...");

    const options = {
      method: "GET",
      url: "https://youtube138.p.rapidapi.com/v2/trending",
      headers: {
        "x-rapidapi-key": process.env.RAPIDAPI_KEY,
        "x-rapidapi-host": "youtube138.p.rapidapi.com",
      },
      params: {
        region: "US",
        type: "now",
      },
    };

    const response = await axios.request(options);
    console.log("✅ YouTube API Response received");
    console.log(`📊 Total videos fetched: ${response.data.list.length}`);

    // Process all videos in batches of 3
    const BATCH_SIZE = 3;
    const videos = response.data.list;
    let processedVideos: TrendingVideo[] = [];

    for (let i = 0; i < videos.length; i += BATCH_SIZE) {
      const batchResults = await processBatchRapidAPI(videos, options, i, BATCH_SIZE);
      processedVideos = [...processedVideos, ...batchResults];
      console.log(
        `✅ Processed batch ${Math.floor(i / BATCH_SIZE) + 1}/${Math.ceil(
          videos.length / BATCH_SIZE
        )} (${processedVideos.length}/${videos.length} videos)`
      );
    }

    return NextResponse.json({
      videos: processedVideos,
      metadata: {
        fetchedAt: new Date().toISOString(),
        region: "US",
        totalFetched: processedVideos.length,
      },
    });
  } catch (error: any) {
    console.error("❌ Error fetching trending videos:", error);
    return NextResponse.json(
      { error: "Failed to fetch trending videos" },
      { status: 500 }
    );
  }
}
*/
