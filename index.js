require("dotenv").config();
const axios = require("axios");
const OpenAI = require("openai");

// Initialize OpenAI
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// YouTube API configuration
const youtubeOptions = {
  method: "GET",
  url: "https://youtube138.p.rapidapi.com/v2/trending",
  headers: {
    "x-rapidapi-key": process.env.RAPIDAPI_KEY,
    "x-rapidapi-host": "youtube138.p.rapidapi.com",
  },
};

async function analyzeTrendingVideos() {
  try {
    // Fetch trending videos
    const response = await axios.request(youtubeOptions);
    const trendingVideos = response.data.list;

    // Prepare data for ChatGPT - now analyzing top 15 videos
    const videoSummaries = trendingVideos.slice(0, 15).map((video) => ({
      title: video.title,
      views: video.viewCountText,
      author: video.author,
      description: video.description,
    }));

    // Generate analysis with ChatGPT
    const completion = await openai.chat.completions.create({
      messages: [
        {
          role: "system",
          content:
            "You are an expert content analyst. Analyze these top 15 trending YouTube videos and provide insights about current trends, common themes, and what makes them popular. Group similar content together if found.",
        },
        {
          role: "user",
          content: `Analyze these trending YouTube videos and provide insights, grouping similar content types together: ${JSON.stringify(
            videoSummaries,
            null,
            2
          )}`,
        },
      ],
      model: "gpt-4o-mini",
    });

    // Print the analysis
    console.log("\n=== YouTube Trending Videos Analysis (Top 15) ===\n");
    console.log(completion.choices[0].message.content);
  } catch (error) {
    console.error("Error:", error.message);
    if (error.response) {
      console.error("API Response Error:", error.response.data);
    }
  }
}

// Run the analysis
analyzeTrendingVideos();
