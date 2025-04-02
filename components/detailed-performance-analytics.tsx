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
  LineChart,
  Line,
  Legend,
} from "recharts";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
import {
  BarChart3,
  PieChart as PieChartIcon,
  TrendingUp,
  Timer,
  Calendar,
  Globe,
  RefreshCw,
} from "lucide-react";
import { REGION_CODES } from "@/lib/constants";

export function DetailedPerformanceAnalytics() {
  const [ideas, setIdeas] = useState<VideoIdea[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

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

            // Get ideas from Supabase - get more ideas for detailed analysis
            const { data, error } = await supabase
              .from("video_ideas")
              .select("*")
              .order("created_at", { ascending: false })
              .limit(50);

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
          // Sort by creation date for timeline charts
          fetchedIdeas.sort(
            (a, b) =>
              new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
          );
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
      <div className="space-y-6">
        <Skeleton className="h-[50px] w-full" />
        <Skeleton className="h-[300px] w-full" />
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Skeleton className="h-[250px] w-full" />
          <Skeleton className="h-[250px] w-full" />
        </div>
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

  // Platform analytics
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

  const platformChartData = Object.values(platformData).map(
    (platform: any) => ({
      ...platform,
      avgViralityScore: Math.round(
        platform.totalViralityScore / platform.count
      ),
    })
  );

  // Content type analytics
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

  const contentTypeChartData = Object.values(contentTypeData).map(
    (contentType: any) => ({
      ...contentType,
      avgViralityScore: Math.round(
        contentType.totalViralityScore / contentType.count
      ),
    })
  );

  // Region analytics
  const regionData = ideas.reduce((acc: any, idea) => {
    const region = idea.region;
    if (!acc[region]) {
      acc[region] = {
        name: getRegionName(region),
        count: 0,
        totalViralityScore: 0,
      };
    }
    acc[region].count += 1;
    acc[region].totalViralityScore += idea.viralityScore;
    return acc;
  }, {});

  const regionChartData = Object.values(regionData).map((region: any) => ({
    ...region,
    avgViralityScore: Math.round(region.totalViralityScore / region.count),
  }));

  // Create timeline data (virality score over time)
  const timelineData = ideas.map((idea) => ({
    date: new Date(idea.createdAt).toLocaleDateString(),
    viralityScore: idea.viralityScore,
    platform: getPlatformDisplayName(idea.platform),
    contentType:
      idea.contentType.charAt(0).toUpperCase() + idea.contentType.slice(1),
  }));

  // Virality score distribution
  const viralityDistribution = [
    { name: "0-25%", count: 0 },
    { name: "26-50%", count: 0 },
    { name: "51-75%", count: 0 },
    { name: "76-100%", count: 0 },
  ];

  ideas.forEach((idea) => {
    if (idea.viralityScore <= 25) {
      viralityDistribution[0].count += 1;
    } else if (idea.viralityScore <= 50) {
      viralityDistribution[1].count += 1;
    } else if (idea.viralityScore <= 75) {
      viralityDistribution[2].count += 1;
    } else {
      viralityDistribution[3].count += 1;
    }
  });

  // Top performing ideas table data
  const topIdeas = [...ideas]
    .sort((a, b) => b.viralityScore - a.viralityScore)
    .slice(0, 5);

  // Time to create analytics (average time between generated ideas)
  const timeToCreateData = calculateTimeToCreate(ideas);

  // Chart colors
  const COLORS = [
    "#0088FE",
    "#00C49F",
    "#FFBB28",
    "#FF8042",
    "#8884d8",
    "#82ca9d",
  ];

  return (
    <div className="space-y-8">
      {/* Summary cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-xl flex items-center">
              <BarChart3 className="h-5 w-5 mr-2 text-primary" />
              Avg Performance
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">
              {avgViralityScore.toFixed(1)}%
            </div>
            <p className="text-sm text-muted-foreground">
              Overall virality score
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-xl flex items-center">
              <RefreshCw className="h-5 w-5 mr-2 text-primary" />
              Ideas Generated
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{ideas.length}</div>
            <p className="text-sm text-muted-foreground">
              Total ideas analyzed
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-xl flex items-center">
              <Timer className="h-5 w-5 mr-2 text-primary" />
              High Potential
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">
              {viralityDistribution[3].count}
            </div>
            <p className="text-sm text-muted-foreground">
              Ideas with 76-100% score
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-xl flex items-center">
              <Calendar className="h-5 w-5 mr-2 text-primary" />
              First Created
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-xl font-bold">
              {ideas.length > 0
                ? new Date(ideas[0].createdAt).toLocaleDateString()
                : "N/A"}
            </div>
            <p className="text-sm text-muted-foreground">Date of first idea</p>
          </CardContent>
        </Card>
      </div>

      {/* Main analytics tabs */}
      <Tabs defaultValue="overview" className="space-y-4">
        <TabsList className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="platforms">Platforms</TabsTrigger>
          <TabsTrigger value="contentTypes">Content Types</TabsTrigger>
          <TabsTrigger value="regions">Regions</TabsTrigger>
          <TabsTrigger value="topIdeas">Top Ideas</TabsTrigger>
        </TabsList>

        {/* Overview tab */}
        <TabsContent value="overview" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Performance Timeline</CardTitle>
              <CardDescription>
                Virality score of your ideas over time
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="h-80">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart
                    data={timelineData}
                    margin={{ top: 20, right: 30, left: 20, bottom: 5 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="date" />
                    <YAxis domain={[0, 100]} />
                    <Tooltip />
                    <Legend />
                    <Line
                      type="monotone"
                      dataKey="viralityScore"
                      name="Virality Score"
                      stroke="#8884d8"
                      activeDot={{ r: 8 }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Card>
              <CardHeader>
                <CardTitle>Virality Score Distribution</CardTitle>
                <CardDescription>
                  Distribution of ideas by virality score range
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart
                      data={viralityDistribution}
                      margin={{ top: 20, right: 30, left: 20, bottom: 5 }}
                    >
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="name" />
                      <YAxis />
                      <Tooltip />
                      <Bar
                        dataKey="count"
                        name="Number of Ideas"
                        fill="#8884d8"
                      />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Content Platform Distribution</CardTitle>
                <CardDescription>Number of ideas by platform</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={platformChartData}
                        cx="50%"
                        cy="50%"
                        labelLine={true}
                        label={({ name, percent }) =>
                          `${name}: ${(percent * 100).toFixed(0)}%`
                        }
                        outerRadius={80}
                        fill="#8884d8"
                        dataKey="count"
                      >
                        {platformChartData.map((entry: any, index: number) => (
                          <Cell
                            key={`cell-${index}`}
                            fill={COLORS[index % COLORS.length]}
                          />
                        ))}
                      </Pie>
                      <Tooltip />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Platforms tab */}
        <TabsContent value="platforms" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Performance by Platform</CardTitle>
              <CardDescription>
                Average virality scores and idea count by platform
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="h-80">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    data={platformChartData}
                    margin={{ top: 20, right: 30, left: 20, bottom: 5 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="name" />
                    <YAxis yAxisId="left" orientation="left" stroke="#8884d8" />
                    <YAxis
                      yAxisId="right"
                      orientation="right"
                      stroke="#82ca9d"
                    />
                    <Tooltip />
                    <Legend />
                    <Bar
                      yAxisId="left"
                      dataKey="avgViralityScore"
                      name="Avg Virality Score"
                      fill="#8884d8"
                    />
                    <Bar
                      yAxisId="right"
                      dataKey="count"
                      name="Number of Ideas"
                      fill="#82ca9d"
                    />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {platformChartData.map((platform: any, index: number) => (
              <Card key={index}>
                <CardHeader className="pb-2">
                  <CardTitle className="text-xl">{platform.name}</CardTitle>
                  <CardDescription>
                    {platform.count} ideas · {platform.avgViralityScore}% avg
                    score
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center gap-2">
                    <div className="h-2 flex-1 rounded-full bg-muted overflow-hidden">
                      <div
                        className="h-full rounded-full bg-primary"
                        style={{ width: `${platform.avgViralityScore}%` }}
                      ></div>
                    </div>
                    <span className="text-sm font-medium">
                      {platform.avgViralityScore}%
                    </span>
                  </div>

                  {/* Top idea for this platform */}
                  {ideas.filter(
                    (idea) =>
                      getPlatformDisplayName(idea.platform) === platform.name
                  ).length > 0 && (
                    <div className="mt-4">
                      <p className="text-sm font-medium">Top idea:</p>
                      <p className="text-sm text-muted-foreground truncate">
                        {ideas
                          .filter(
                            (idea) =>
                              getPlatformDisplayName(idea.platform) ===
                              platform.name
                          )
                          .sort((a, b) => b.viralityScore - a.viralityScore)[0]
                          ?.title || "N/A"}
                      </p>
                    </div>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        {/* Content Types tab */}
        <TabsContent value="contentTypes" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Performance by Content Type</CardTitle>
              <CardDescription>
                Average virality scores and idea count by content type
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="h-80">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    data={contentTypeChartData}
                    margin={{ top: 20, right: 30, left: 20, bottom: 5 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="name" />
                    <YAxis yAxisId="left" orientation="left" stroke="#8884d8" />
                    <YAxis
                      yAxisId="right"
                      orientation="right"
                      stroke="#82ca9d"
                    />
                    <Tooltip />
                    <Legend />
                    <Bar
                      yAxisId="left"
                      dataKey="avgViralityScore"
                      name="Avg Virality Score"
                      fill="#8884d8"
                    />
                    <Bar
                      yAxisId="right"
                      dataKey="count"
                      name="Number of Ideas"
                      fill="#82ca9d"
                    />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {contentTypeChartData.map((contentType: any, index: number) => (
              <Card key={index}>
                <CardHeader className="pb-2">
                  <CardTitle className="text-xl">{contentType.name}</CardTitle>
                  <CardDescription>{contentType.count} ideas</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center gap-2">
                    <div className="h-2 flex-1 rounded-full bg-muted overflow-hidden">
                      <div
                        className="h-full rounded-full bg-primary"
                        style={{ width: `${contentType.avgViralityScore}%` }}
                      ></div>
                    </div>
                    <span className="text-sm font-medium">
                      {contentType.avgViralityScore}%
                    </span>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        {/* Regions tab */}
        <TabsContent value="regions" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <Globe className="h-5 w-5 mr-2" />
                Performance by Region
              </CardTitle>
              <CardDescription>
                Average virality scores by target region
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="h-80">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    data={regionChartData}
                    margin={{ top: 20, right: 30, left: 20, bottom: 5 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="name" />
                    <YAxis yAxisId="left" orientation="left" stroke="#8884d8" />
                    <YAxis
                      yAxisId="right"
                      orientation="right"
                      stroke="#82ca9d"
                    />
                    <Tooltip />
                    <Legend />
                    <Bar
                      yAxisId="left"
                      dataKey="avgViralityScore"
                      name="Avg Virality Score"
                      fill="#8884d8"
                    />
                    <Bar
                      yAxisId="right"
                      dataKey="count"
                      name="Number of Ideas"
                      fill="#82ca9d"
                    />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Top Ideas tab */}
        <TabsContent value="topIdeas" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Top Performing Ideas</CardTitle>
              <CardDescription>
                Your highest rated ideas sorted by virality score
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {topIdeas.map((idea, index) => (
                  <div
                    key={idea.id}
                    className="p-4 border rounded-md hover:bg-muted/50 transition-colors"
                  >
                    <div className="flex items-start justify-between">
                      <div>
                        <h3 className="font-medium">
                          <span className="text-muted-foreground mr-2">
                            #{index + 1}
                          </span>
                          {idea.title}
                        </h3>
                        <p className="text-sm text-muted-foreground mt-1 line-clamp-2">
                          {idea.concept}
                        </p>
                        <div className="flex items-center mt-2 text-xs text-muted-foreground gap-2">
                          <span className="bg-primary/10 text-primary px-2 py-0.5 rounded-full">
                            {getPlatformDisplayName(idea.platform)}
                          </span>
                          <span className="bg-muted px-2 py-0.5 rounded-full">
                            {idea.contentType.charAt(0).toUpperCase() +
                              idea.contentType.slice(1)}
                          </span>
                          <span className="bg-muted px-2 py-0.5 rounded-full">
                            {getRegionName(idea.region)}
                          </span>
                        </div>
                      </div>
                      <div className="flex flex-col items-end">
                        <span className="text-xl font-bold">
                          {idea.viralityScore}%
                        </span>
                        <span className="text-xs text-muted-foreground">
                          {new Date(idea.createdAt).toLocaleDateString()}
                        </span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
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

// Helper function to get region name from code
function getRegionName(regionCode: string): string {
  const region = REGION_CODES.find((r) => r.value === regionCode);
  return region ? region.label : regionCode;
}

// Helper function to calculate time between idea creation
function calculateTimeToCreate(ideas: VideoIdea[]) {
  if (ideas.length < 2) return [];

  // Sort by date
  const sortedIdeas = [...ideas].sort(
    (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
  );

  return sortedIdeas
    .map((idea, index) => {
      if (index === 0) return null;

      const prevDate = new Date(sortedIdeas[index - 1].createdAt).getTime();
      const currDate = new Date(idea.createdAt).getTime();
      const diffHours = (currDate - prevDate) / (1000 * 60 * 60);

      return {
        date: new Date(idea.createdAt).toLocaleDateString(),
        hoursToCreate: diffHours.toFixed(2),
      };
    })
    .filter(Boolean);
}
