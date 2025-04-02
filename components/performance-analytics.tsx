"use client";

import { useState, useEffect } from "react";
import { createClient } from "@supabase/supabase-js";
import { VideoIdea } from "@/lib/types";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from "recharts";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
import {
  BarChart3,
  PieChart as PieChartIcon,
  TrendingUp,
  ArrowRight,
  Trophy,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";

export function PerformanceAnalytics() {
  const [ideas, setIdeas] = useState<VideoIdea[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  useEffect(() => {
    async function fetchIdeas() {
      try {
        let fetchedIdeas: VideoIdea[] = [];
        let hasData = false;

        // First, try to get from Supabase if browser APIs are available
        if (typeof window !== "undefined") {
          try {
            // Create a Supabase client
            const supabase = createClient(
              process.env.NEXT_PUBLIC_SUPABASE_URL!,
              process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
            );

            // Get ideas from Supabase
            const { data, error } = await supabase
              .from("video_ideas")
              .select("*")
              .order("created_at", { ascending: false })
              .limit(20);

            if (!error && data && data.length > 0) {
              // Format the response
              fetchedIdeas = data.map((item: any) => ({
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
              hasData = true;
            }
          } catch (supabaseError) {
            console.error("Error fetching from Supabase:", supabaseError);
            // Continue to localStorage fallback
          }

          // If no data from Supabase, try localStorage
          if (!hasData) {
            try {
              // Try to get recent ideas from localStorage
              const storedIdeas = localStorage.getItem("recentIdeas");
              const lastGeneratedIdea =
                localStorage.getItem("lastGeneratedIdea");

              if (storedIdeas) {
                const parsedIdeas = JSON.parse(storedIdeas);
                if (Array.isArray(parsedIdeas) && parsedIdeas.length > 0) {
                  fetchedIdeas = parsedIdeas;
                  hasData = true;
                }
              }

              // Add the last generated idea if it's not in the list
              if (lastGeneratedIdea) {
                const parsedIdea = JSON.parse(lastGeneratedIdea);
                if (
                  parsedIdea &&
                  !fetchedIdeas.some((idea) => idea.id === parsedIdea.id)
                ) {
                  fetchedIdeas.unshift(parsedIdea);
                  hasData = true;
                }
              }
            } catch (localStorageError) {
              console.error(
                "Error retrieving from localStorage:",
                localStorageError
              );
            }
          }
        }

        if (hasData) {
          setIdeas(fetchedIdeas);
        } else {
          // If we've tried everything and have no data, set empty array
          setIdeas([]);
        }
      } catch (err) {
        console.error("Error fetching ideas:", err);
        setError("Failed to load analytics data. Please try again later.");
      } finally {
        setLoading(false);
      }
    }

    fetchIdeas();
  }, []);

  // If loading, show skeleton
  if (loading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Skeleton className="h-[120px] w-full rounded-md" />
        <Skeleton className="h-[120px] w-full rounded-md" />
        <Skeleton className="h-[120px] w-full rounded-md" />
        <Skeleton className="h-[120px] w-full rounded-md" />
      </div>
    );
  }

  // If error, show error message
  if (error) {
    return (
      <div className="text-center py-12 text-muted-foreground">
        <p>{error}</p>
      </div>
    );
  }

  // If no ideas found, show message
  if (ideas.length === 0) {
    return (
      <div className="text-center py-12 text-muted-foreground">
        <p>No ideas generated yet.</p>
        <p className="text-sm">Generate ideas to see performance analytics.</p>
      </div>
    );
  }

  // Calculate analytics summary
  const avgViralityScore =
    ideas.reduce((sum, idea) => sum + idea.viralityScore, 0) / ideas.length;

  // Platform usage data
  const platformData = ideas.reduce((acc: any, idea) => {
    const platform = idea.platform;
    if (!acc[platform]) {
      acc[platform] = {
        name: getPlatformDisplayName(platform),
        count: 0,
        totalViralityScore: 0,
      };
    }
    acc[platform].count += 1;
    acc[platform].totalViralityScore += idea.viralityScore;
    return acc;
  }, {});

  // Transform platform data
  const platformChartData = Object.values(platformData).map(
    (platform: any) => ({
      ...platform,
      avgViralityScore: platform.totalViralityScore / platform.count,
    })
  );

  // Calculate most popular platform
  const mostPopularPlatform = platformChartData.sort(
    (a: any, b: any) => b.count - a.count
  )[0];

  // Content type data
  const contentTypeData = ideas.reduce((acc: any, idea) => {
    const contentType = idea.contentType;
    if (!acc[contentType]) {
      acc[contentType] = {
        name: contentType.charAt(0).toUpperCase() + contentType.slice(1),
        count: 0,
        totalViralityScore: 0,
      };
    }
    acc[contentType].count += 1;
    acc[contentType].totalViralityScore += idea.viralityScore;
    return acc;
  }, {});

  // Transform content type data
  const contentTypeChartData = Object.values(contentTypeData).map(
    (contentType: any) => ({
      ...contentType,
      avgViralityScore: contentType.totalViralityScore / contentType.count,
    })
  );

  // Calculate highest performing content type
  const highestPerformingContentType = contentTypeChartData.sort(
    (a: any, b: any) => b.avgViralityScore - a.avgViralityScore
  )[0];

  // Get the idea with the highest virality score
  const highestViralityIdea = [...ideas].sort(
    (a, b) => b.viralityScore - a.viralityScore
  )[0];

  const navigateToDetailedAnalytics = () => {
    router.push("/analytics");
  };

  const COLORS = ["#0088FE", "#00C49F", "#FFBB28", "#FF8042"];

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card
          className="cursor-pointer hover:border-primary/50 transition-colors"
          onClick={navigateToDetailedAnalytics}
        >
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2">
              <BarChart3 className="h-5 w-5 text-primary" />
              <span>Overall Performance</span>
            </CardTitle>
            <CardDescription>
              Average virality score of your ideas
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <span className="text-3xl font-bold">
                {avgViralityScore.toFixed(1)}%
              </span>
              <Button variant="ghost" size="sm" className="gap-1">
                <span className="text-xs">View Details</span>
                <ArrowRight className="h-3 w-3" />
              </Button>
            </div>
          </CardContent>
        </Card>

        <Card
          className="cursor-pointer hover:border-primary/50 transition-colors"
          onClick={navigateToDetailedAnalytics}
        >
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2">
              <PieChart className="h-5 w-5 text-primary" />
              <span>Top Platform</span>
            </CardTitle>
            <CardDescription>Your most used content platform</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <span className="text-xl font-bold">
                {mostPopularPlatform?.name || "N/A"}
              </span>
              <Button variant="ghost" size="sm" className="gap-1">
                <span className="text-xs">Compare All</span>
                <ArrowRight className="h-3 w-3" />
              </Button>
            </div>
          </CardContent>
        </Card>

        <Card
          className="cursor-pointer hover:border-primary/50 transition-colors"
          onClick={navigateToDetailedAnalytics}
        >
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5 text-primary" />
              <span>Best Content Type</span>
            </CardTitle>
            <CardDescription>Highest performing format</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <span className="text-xl font-bold">
                {highestPerformingContentType?.name || "N/A"}
              </span>
              <Button variant="ghost" size="sm" className="gap-1">
                <span className="text-xs">See Analysis</span>
                <ArrowRight className="h-3 w-3" />
              </Button>
            </div>
          </CardContent>
        </Card>

        <Card
          className="cursor-pointer hover:border-primary/50 transition-colors"
          onClick={navigateToDetailedAnalytics}
        >
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2">
              <Trophy className="h-5 w-5 text-primary" />
              <span>Top Idea</span>
            </CardTitle>
            <CardDescription>Your highest rated idea</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col gap-1">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium truncate max-w-[70%]">
                  {highestViralityIdea?.title || "N/A"}
                </span>
                <span className="text-sm font-bold bg-primary/10 text-primary px-2 py-0.5 rounded-full">
                  {highestViralityIdea?.viralityScore || 0}%
                </span>
              </div>
              <Button variant="ghost" size="sm" className="gap-1 mt-1 self-end">
                <span className="text-xs">View All</span>
                <ArrowRight className="h-3 w-3" />
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>

      <Button
        variant="outline"
        className="w-full mt-2"
        onClick={navigateToDetailedAnalytics}
      >
        View Detailed Analytics
        <ArrowRight className="h-4 w-4 ml-2" />
      </Button>
    </div>
  );
}

// Helper function to get a display name for platforms
function getPlatformDisplayName(platform: string): string {
  switch (platform) {
    case "tiktok":
      return "TikTok";
    case "youtube":
      return "YouTube";
    case "instagram":
      return "Instagram Reels";
    case "youtube-shorts":
      return "YouTube Shorts";
    default:
      return platform;
  }
}
