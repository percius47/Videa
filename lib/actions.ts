"use server";

import { generateText } from "ai";
import { openai } from "@ai-sdk/openai";
import type { VideoIdeaRequest, VideoIdea } from "./types";
import axios from "axios";
import { ensureAssistant, runAssistantWithPrompt } from "./openai-helpers";
import { createClient } from "@supabase/supabase-js";

// Enhanced TrendingVideo interface to match API
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

// Add interface for ChannelVideo
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

// Add interface for ChannelInfo
interface ChannelInfo {
  id: string;
  title: string;
  description: string;
  customUrl?: string;
  thumbnails?: any;
  statistics: {
    viewCount: string;
    subscriberCount: string;
    videoCount: string;
  };
}

// Add interface for Channel response
interface ChannelResponse {
  channelInfo: ChannelInfo;
  videos: ChannelVideo[];
  metadata: {
    fetchedAt: string;
    totalFetched: number;
    source: string;
  };
}

// In-memory storage for demo purposes
// In a real app, this would be a database
let recentIdeas: VideoIdea[] = [];
let lastTrendAnalysis: any = null;
let lastAnalysisTime: Date | null = null;

async function getTrendingVideos(region: string): Promise<TrendingVideo[]> {
  try {
    console.log(
      `📡 Fetching trending videos from API for region: ${region}...`
    );
    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || "http://localhost:3000";
    const response = await axios.get(
      `${baseUrl}/api/youtube-trending?region=${region}`
    );
    console.log("✅ API Response received");
    return response.data.videos;
  } catch (error) {
    console.error("❌ Error fetching trending videos:", error);
    return [];
  }
}

async function analyzeTrends(videos: TrendingVideo[]) {
  // Check if we have a recent analysis (less than 1 hour old)
  if (
    lastTrendAnalysis &&
    lastAnalysisTime &&
    new Date().getTime() - lastAnalysisTime.getTime() < 3600000
  ) {
    return lastTrendAnalysis;
  }

  // Pre-process videos to extract key metrics and patterns
  const videoMetrics = videos.map((v) => ({
    title: v.title,
    views: Number(v.stats.views) || 0,
    likes: Number(v.stats.likes) || 0,
    comments: Number(v.stats.comments) || 0,
    category: v.category,
    tags: v.tags,
  }));

  // Sort by engagement (views + likes + comments)
  const sortedVideos = [...videos].sort((a, b) => {
    const aEngagement =
      Number(a.stats.views) + Number(a.stats.likes) + Number(a.stats.comments);
    const bEngagement =
      Number(b.stats.views) + Number(b.stats.likes) + Number(b.stats.comments);
    return bEngagement - aEngagement;
  });

  // Take top 20 most engaging videos for detailed analysis
  const topVideos = sortedVideos.slice(0, 20);

  const analysisPrompt = `
    Analyze these ${
      videos.length
    } trending YouTube videos. I'm providing detailed data for the top 20 most engaging videos:
    
    Top Performing Videos:
    ${topVideos
      .map(
        (v, index) => `
    ${index + 1}. "${v.title}"
    Author: ${v.author} (${v.authorStats.subscribers} subscribers)
    Stats: ${v.stats.views} views, ${v.stats.likes} likes, ${
          v.stats.comments
        } comments
    Category: ${v.category}
    Tags: ${v.tags.join(", ")}
    Published: ${v.publishedText}
    `
      )
      .join("\n")}

    Additional Context:
    - Total videos analyzed: ${videos.length}
    - Most common categories: ${getTopCategories(videos, 5).join(", ")}
    - Most used tags: ${getTopTags(videos, 10).join(", ")}
    
    Please provide a comprehensive analysis including:
    1. Common themes and patterns
    2. Popular content types
    3. Successful video formats
    4. Trending topics
    5. Engagement patterns
    6. Top performing categories
    7. Most effective video titles
    8. Popular hashtags/tags
    
    Respond with ONLY a JSON object in this exact format (no markdown, no code blocks):
    {
      "themes": ["theme1", "theme2"],
      "contentTypes": ["type1", "type2"],
      "videoFormats": ["format1", "format2"],
      "trendingTopics": ["topic1", "topic2"],
      "engagementInsights": ["insight1", "insight2"],
      "topCategories": ["category1", "category2"],
      "titlePatterns": ["pattern1", "pattern2"],
      "popularTags": ["tag1", "tag2"]
    }
  `;

  const { text } = await generateText({
    model: openai("gpt-4o-mini"),
    prompt: analysisPrompt,
    temperature: 0.7,
    maxTokens: 1500,
  });

  try {
    // Clean the response text
    const cleanedText = text.replace(/```json\s*|\s*```/g, "").trim();
    console.log("Cleaned GPT Response:", cleanedText);

    const analysis = JSON.parse(cleanedText);

    // Validate the response structure
    const requiredFields = [
      "themes",
      "contentTypes",
      "videoFormats",
      "trendingTopics",
      "engagementInsights",
      "topCategories",
      "titlePatterns",
      "popularTags",
    ];

    const missingFields = requiredFields.filter((field) => !analysis[field]);
    if (missingFields.length > 0) {
      throw new Error(`Missing required fields: ${missingFields.join(", ")}`);
    }

    lastTrendAnalysis = analysis;
    lastAnalysisTime = new Date();
    return analysis;
  } catch (error) {
    console.error("Failed to parse trend analysis:", error);
    console.error("Raw GPT response:", text);

    // Return a default analysis structure
    return {
      themes: ["Unable to analyze themes"],
      contentTypes: ["Unable to analyze content types"],
      videoFormats: ["Unable to analyze formats"],
      trendingTopics: ["Unable to analyze topics"],
      engagementInsights: ["Unable to analyze engagement"],
      topCategories: ["Unable to analyze categories"],
      titlePatterns: ["Unable to analyze patterns"],
      popularTags: ["Unable to analyze tags"],
    };
  }
}

// Helper function to get top categories
function getTopCategories(videos: TrendingVideo[], limit: number): string[] {
  const categoryCount = videos.reduce((acc, video) => {
    acc[video.category] = (acc[video.category] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  return Object.entries(categoryCount)
    .sort(([, a], [, b]) => b - a)
    .slice(0, limit)
    .map(([category]) => category);
}

// Helper function to get top tags
function getTopTags(videos: TrendingVideo[], limit: number): string[] {
  const tagCount = videos.reduce((acc, video) => {
    video.tags.forEach((tag) => {
      acc[tag] = (acc[tag] || 0) + 1;
    });
    return acc;
  }, {} as Record<string, number>);

  return Object.entries(tagCount)
    .sort(([, a], [, b]) => b - a)
    .slice(0, limit)
    .map(([tag]) => tag);
}

// Add function to fetch channel data
async function getChannelData(
  channelId: string
): Promise<ChannelResponse | null> {
  try {
    console.log(`📡 Fetching channel data for: ${channelId}...`);
    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || "http://localhost:3000";
    const response = await axios.get(
      `${baseUrl}/api/youtube-channel?channelId=${channelId}`
    );
    console.log("✅ Channel API Response received");
    return response.data;
  } catch (error) {
    console.error(`❌ Error fetching channel data for ${channelId}:`, error);
    return null;
  }
}

// Update the generateVideoIdea function to use our helper functions
export async function generateVideoIdea(
  request: VideoIdeaRequest
): Promise<VideoIdea> {
  console.log("🎮 Generating video idea with parameters:", request);

  // Fetch trending videos
  const trendingVideos = await getTrendingVideos(request.region);
  console.log(`📊 Found ${trendingVideos.length} trending videos`);

  // Analyze trending data
  const trendAnalysis = await analyzeTrends(trendingVideos);

  // Initialize channelData array
  const channelData: {
    channelInfo: ChannelInfo;
    topVideos: ChannelVideo[];
  }[] = [];

  // Fetch data for reference channels if provided
  if (request.referenceChannels && request.referenceChannels.length > 0) {
    console.log(
      `🔍 Fetching data for ${request.referenceChannels.length} reference channels`
    );

    for (const channelId of request.referenceChannels) {
      const data = await getChannelData(channelId);
      if (data) {
        channelData.push({
          channelInfo: data.channelInfo,
          topVideos: data.videos,
        });
      }
    }

    console.log(`✅ Retrieved data for ${channelData.length} channels`);
  }

  // Prepare channel insights for prompt
  let channelInsightsPrompt = "";
  if (channelData.length > 0) {
    channelInsightsPrompt = `
    Reference Channels Analysis:
    ${channelData
      .map(
        (channel, index) => `
    Channel ${index + 1}: ${channel.channelInfo.title}
    Subscribers: ${channel.channelInfo.statistics.subscriberCount}
    Top Performing Videos:
    ${channel.topVideos
      .slice(0, 5)
      .map(
        (video, vIndex) => `
      ${vIndex + 1}. "${video.title}"
      Stats: ${video.stats.views} views, ${video.stats.likes} likes, ${
          video.stats.comments
        } comments
      Tags: ${video.tags.join(", ")}
    `
      )
      .join("")}
    `
      )
      .join("\n")}
    `;
  }

  // Prepare feedback section if improving an existing idea
  let feedbackPrompt = "";
  let previousIdeaPrompt = "";

  if (request.feedback && request.previousIdea) {
    console.log("🔄 Improving existing idea with user feedback");

    feedbackPrompt = `
    USER FEEDBACK TO INCORPORATE:
    "${request.feedback}"
    
    Please carefully consider this feedback and make specific improvements to the previous idea based on it.
    `;

    try {
      const previousIdea = JSON.parse(request.previousIdea);

      previousIdeaPrompt = `
      PREVIOUS IDEA TO IMPROVE:
      Title: "${previousIdea.title}"
      Concept: "${previousIdea.concept}"
      Hashtags: ${previousIdea.hashtags.join(", ")}
      Virality Score: ${previousIdea.viralityScore}%
      Monetization Strategy: "${previousIdea.monetizationStrategy}"
      
      Using the user's feedback, create an IMPROVED version of this idea. Maintain the strengths but address the feedback directly.
      `;
    } catch (error) {
      console.error("Failed to parse previous idea:", error);
    }
  }

  // Build prompt for idea generation
  const prompt = `
    ${
      request.feedback ? "IMPROVE AN EXISTING" : "CREATE AN ORIGINAL"
    } viral video idea for ${request.platform} focusing on the ${
    request.niche
  } niche.
    
    Details:
    - Content type: ${request.contentType}
    - Region: ${request.region}
    - Virality factor: ${
      request.viralityFactor
    }% (higher means more experimental)
    ${request.keywords ? `- Keywords to incorporate: ${request.keywords}` : ""}
    
    Based on current YouTube trending data:
    - Common themes: ${trendAnalysis.themes.join(", ")}
    - Popular content types: ${trendAnalysis.contentTypes.join(", ")}
    - Trending topics: ${trendAnalysis.trendingTopics.join(", ")}
    - Engagement insights: ${trendAnalysis.engagementInsights.join(", ")}
    - Top categories: ${trendAnalysis.topCategories.join(", ")}
    - Title patterns: ${trendAnalysis.titlePatterns.join(", ")}
    - Popular tags: ${trendAnalysis.popularTags.join(", ")}
    
    ${channelInsightsPrompt}
    
    ${previousIdeaPrompt}
    
    ${feedbackPrompt}
    
    ${
      request.feedback
        ? "Create an improved version of the video idea by incorporating the user's feedback while maintaining viral potential."
        : "Create a completely original video idea that:"
    }
    1. Leverages current trends
    2. Has viral potential
    3. Is authentic to the ${request.niche} niche
    4. Works well on ${request.platform}
    5. Incorporates insights from the reference channels (if provided)
    ${
      request.feedback
        ? "6. Directly addresses the user's feedback for improvements"
        : ""
    }
    
    Provide a JSON response in this exact format (no markdown, no code blocks):
    {
      "title": "Catchy video title",
      "concept": "Detailed description of the video concept, structure, and execution",
      "hashtags": ["tag1", "tag2", "tag3"],
      "viralityScore": 85,
      "viralityJustification": "Explanation of why this idea has viral potential",
      "monetizationStrategy": "How to monetize this content",
      "videoFormat": {
        "type": "The type of video format that works best",
        "length": "Optimal video length",
        "hooks": ["Key moment 1 to hook viewers", "Key moment 2", "Key moment 3"]
      },
      "trendAnalysis": {
        "relevantThemes": ["theme1", "theme2"],
        "relatedContent": ["related1", "related2"],
        "suggestedTags": ["tag1", "tag2", "tag3"]
      },
      "channelInspirations": "How the reference channels influenced this idea (only if reference channels were provided)"
    }
  `;

  try {
    console.log("🧵 Creating a fresh thread for this idea generation");

    // Ensure we have an assistant
    const assistantId = await ensureAssistant();

    // Run the assistant with our prompt on a new thread
    const responseText = await runAssistantWithPrompt(prompt, assistantId);

    // Clean the response text
    const cleanedText = responseText.replace(/```json\s*|\s*```/g, "").trim();

    // Parse the JSON
    const idea: Partial<VideoIdea> = JSON.parse(cleanedText);

    return {
      id: generateId(),
      title: idea.title || "Untitled Video Idea",
      concept: idea.concept || "No concept provided",
      hashtags: idea.hashtags || [],
      viralityScore: idea.viralityScore || 0,
      viralityJustification: idea.viralityJustification || "",
      monetizationStrategy: idea.monetizationStrategy || "",
      videoFormat: idea.videoFormat || {
        type: "Short form",
        length: "60 seconds",
        hooks: ["Hook 1", "Hook 2", "Hook 3"],
      },
      platform: request.platform,
      contentType: request.contentType,
      createdAt: new Date().toISOString(),
      trendAnalysis: idea.trendAnalysis || {
        relevantThemes: [],
        relatedContent: [],
        suggestedTags: [],
      },
      region: request.region,
      channelInspirations: idea.channelInspirations,
    };
  } catch (error) {
    console.error("Failed to generate idea using assistant:", error);

    // Fallback to the traditional method if the assistant fails
    console.log("⚠️ Falling back to traditional method");

    const { text } = await generateText({
      model: openai("gpt-4o-mini"),
      prompt: prompt,
      temperature: 0.7,
      maxTokens: 1500,
    });

    try {
      // Clean the response text
      const cleanedText = text.replace(/```json\s*|\s*```/g, "").trim();

      const idea: Partial<VideoIdea> = JSON.parse(cleanedText);

      return {
        id: generateId(),
        title: idea.title || "Untitled Video Idea",
        concept: idea.concept || "No concept provided",
        hashtags: idea.hashtags || [],
        viralityScore: idea.viralityScore || 0,
        viralityJustification: idea.viralityJustification || "",
        monetizationStrategy: idea.monetizationStrategy || "",
        videoFormat: idea.videoFormat || {
          type: "Short form",
          length: "60 seconds",
          hooks: ["Hook 1", "Hook 2", "Hook 3"],
        },
        platform: request.platform,
        contentType: request.contentType,
        createdAt: new Date().toISOString(),
        trendAnalysis: idea.trendAnalysis || {
          relevantThemes: [],
          relatedContent: [],
          suggestedTags: [],
        },
        region: request.region,
        channelInspirations: idea.channelInspirations,
      };
    } catch (parseError) {
      console.error("Failed to parse idea response:", parseError);
      console.error("Raw GPT response:", text);

      throw new Error("Failed to generate a video idea. Please try again.");
    }
  }
}

export async function getRecentIdeas(): Promise<VideoIdea[]> {
  try {
    // Create a direct Supabase client using the service key
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_KEY!
    );

    // Query for the 3 most recent ideas
    const { data, error } = await supabase
      .from("video_ideas")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(3);

    if (error) {
      console.error("Error fetching recent ideas:", error);
      // Return in-memory ideas if the database call fails
      return recentIdeas;
    }

    // Format the response similar to the API
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

    return ideas;
  } catch (error) {
    console.error("Error fetching recent ideas:", error);
    // Return the in-memory ideas as a fallback
    return recentIdeas;
  }
}

function generateId(): string {
  return Math.random().toString(36).substring(2, 15);
}
