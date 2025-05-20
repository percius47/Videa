"use client";

import { useState, useEffect } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  ArrowUp,
  ArrowRight,
  TrendingUp,
  Hash,
  Youtube,
  RefreshCw,
  Globe,
} from "lucide-react";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { REGION_CODES } from "@/lib/constants";
import { toast } from "sonner";

// Top regions to fetch for global data
const GLOBAL_REGIONS = [
  "US",
  "GB",
  "IN",
  "JP",
  "BR",
  "CA",
  "DE",
  "FR",
  "AU",
  "KR",
];

export function TrendingTopics() {
  const [region, setRegion] = useState("GLOBAL");
  const [isLoading, setIsLoading] = useState(false);
  const [trendingData, setTrendingData] = useState<any>({
    categories: [],
    tags: [],
    topics: [],
  });

  // Load data from localStorage on initial mount
  useEffect(() => {
    const loadDataFromStorage = () => {
      try {
        const storedData = localStorage.getItem("trendingData");
        const storedRegion = localStorage.getItem("trendingRegion");

        if (storedData && storedRegion) {
          setTrendingData(JSON.parse(storedData));
          setRegion(storedRegion);
          return true;
        }
      } catch (error) {
        console.error("Error loading data from localStorage:", error);
      }
      return false;
    };

    const hasData = loadDataFromStorage();

    // If no data in localStorage, fetch on initial load
    if (!hasData) {
      fetchTrendingData(region);
    }
  }, []);

  // Handle region change
  const handleRegionChange = (newRegion: string) => {
    setRegion(newRegion);

    try {
      // Check if we have cached data for this region
      const storedData = localStorage.getItem(`trendingData_${newRegion}`);

      if (storedData) {
        // Use cached data
        setTrendingData(JSON.parse(storedData));
        // Update current region in localStorage
        localStorage.setItem("trendingRegion", newRegion);
      } else {
        // Fetch new data for region
        fetchTrendingData(newRegion);
      }
    } catch (error) {
      console.error("Error handling region change:", error);
      fetchTrendingData(newRegion);
    }
  };

  // Refresh data handler
  const handleRefresh = () => {
    fetchTrendingData(region);
    toast.success(`Refreshing trends for ${getRegionName(region)}`);
  };

  // Get region name from code
  const getRegionName = (code: string): string => {
    const region = REGION_CODES.find((r) => r.value === code);
    return region ? region.label : code;
  };

  // Fetch trending data from YouTube
  const fetchTrendingData = async (regionCode: string) => {
    setIsLoading(true);

    try {
      let allVideos: any[] = [];

      // For GLOBAL, fetch from multiple regions and combine
      if (regionCode === "GLOBAL") {
        // Fetch data from multiple regions in parallel
        const promises = GLOBAL_REGIONS.map((region) =>
          fetch(`/api/youtube-trending?region=${region}`)
            .then((res) => (res.ok ? res.json() : null))
            .catch((err) => {
              console.error(`Error fetching data for region ${region}:`, err);
              return null;
            })
        );

        const results = await Promise.all(promises);

        // Combine videos from all regions, filtering out failed requests
        results.forEach((result) => {
          if (result && result.videos) {
            allVideos = [...allVideos, ...result.videos];
          }
        });

        console.log(
          `Fetched a total of ${allVideos.length} videos from ${GLOBAL_REGIONS.length} regions`
        );

        if (allVideos.length === 0) {
          throw new Error("Failed to fetch global trending data");
        }
      } else {
        // Regular single region fetch
        const response = await fetch(
          `/api/youtube-trending?region=${regionCode}`
        );
        if (!response.ok) throw new Error("Failed to fetch trending data");

        const data = await response.json();
        allVideos = data.videos || [];
      }

      // Process categories
      const categoryCounts: Record<string, number> = {};
      allVideos.forEach((video: any) => {
        const category = video.category;
        categoryCounts[category] = (categoryCounts[category] || 0) + 1;
      });

      // Get top categories
      const topCategories = Object.entries(categoryCounts)
        .sort(([, a], [, b]) => (b as number) - (a as number))
        .slice(0, 5)
        .map(([category, count]) => ({
          name: getCategoryName(category),
          count: count as number,
          growth: (count as number) > 5 ? "high" : "medium",
        }));

      // Process tags
      const tagCounts: Record<string, number> = {};
      allVideos.forEach((video: any) => {
        (video.tags || []).forEach((tag: string) => {
          // Skip very short tags and non-alphanumeric tags
          if (tag.length < 3 || !/^[a-zA-Z0-9 ]+$/.test(tag)) return;
          tagCounts[tag.toLowerCase()] =
            (tagCounts[tag.toLowerCase()] || 0) + 1;
        });
      });

      // Get top tags
      const topTags = Object.entries(tagCounts)
        .sort(([, a], [, b]) => (b as number) - (a as number))
        .slice(0, 10)
        .map(([tag, count]) => ({
          name: tag,
          count: count as number,
          growth: (count as number) > 3 ? "high" : "medium",
        }));

      // Extract topics from titles using common patterns
      const topics: Record<string, number> = {};
      const excludeWords = [
        "the",
        "this",
        "and",
        "for",
        "with",
        "that",
        "you",
        "can",
        "how",
        "to",
        "its",
        "what",
        "why",
        "who",
        "when",
        "where",
        "does",
        "is",
        "of",
        "on",
        "in",
      ];

      allVideos.forEach((video: any) => {
        const title = video.title.toLowerCase();

        // Extract potential topics from title (n-grams)
        const words = title
          .split(/\s+/)
          .filter(
            (w: string) =>
              w.length > 3 &&
              !excludeWords.includes(w) &&
              /^[a-zA-Z0-9]+$/.test(w)
          );

        // Extract single words as potential topics
        words.forEach((word: string) => {
          topics[word] = (topics[word] || 0) + 1;
        });

        // Extract pairs of words as potential phrases
        for (let i = 0; i < words.length - 1; i++) {
          const phrase = `${words[i]} ${words[i + 1]}`;
          topics[phrase] = (topics[phrase] || 0) + 1;
        }
      });

      // Get top topics
      const topTopics = Object.entries(topics)
        .sort(([, a], [, b]) => (b as number) - (a as number))
        .slice(0, 10)
        .map(([topic, count]) => ({
          name: topic,
          count: count as number,
          growth: (count as number) > 3 ? "high" : "medium",
        }));

      const processedData = {
        categories: topCategories,
        tags: topTags,
        topics: topTopics,
        timestamp: new Date().toISOString(),
        isGlobal: regionCode === "GLOBAL",
        regionsIncluded:
          regionCode === "GLOBAL" ? GLOBAL_REGIONS : [regionCode],
      };

      setTrendingData(processedData);

      // Store in localStorage with region-specific key
      localStorage.setItem(
        `trendingData_${regionCode}`,
        JSON.stringify(processedData)
      );
      // Store current region
      localStorage.setItem("trendingRegion", regionCode);
      // Store as default trending data
      localStorage.setItem("trendingData", JSON.stringify(processedData));
    } catch (error) {
      console.error("Error fetching trending data:", error);
      // Fallback to default data if API fails
      setTrendingData({
        categories: [
          {
            name: "Entertainment",
            growth: "high",
            icon: <ArrowUp className="h-3 w-3 text-green-500" />,
          },
          {
            name: "Music",
            growth: "high",
            icon: <ArrowUp className="h-3 w-3 text-green-500" />,
          },
          {
            name: "Gaming",
            growth: "medium",
            icon: <ArrowRight className="h-3 w-3 text-amber-500" />,
          },
        ],
        tags: [
          {
            name: "trending",
            growth: "high",
            icon: <ArrowUp className="h-3 w-3 text-green-500" />,
          },
          {
            name: "viral",
            growth: "high",
            icon: <ArrowUp className="h-3 w-3 text-green-500" />,
          },
          {
            name: "challenge",
            growth: "medium",
            icon: <ArrowRight className="h-3 w-3 text-amber-500" />,
          },
        ],
        topics: [
          {
            name: "Dance Challenges",
            growth: "high",
            icon: <ArrowUp className="h-3 w-3 text-green-500" />,
          },
          {
            name: "Reaction Videos",
            growth: "medium",
            icon: <ArrowRight className="h-3 w-3 text-amber-500" />,
          },
          {
            name: "Gaming Streams",
            growth: "high",
            icon: <ArrowUp className="h-3 w-3 text-green-500" />,
          },
        ],
        timestamp: new Date().toISOString(),
        isGlobal: regionCode === "GLOBAL",
      });
      toast.error("Could not refresh trends data");
    } finally {
      setIsLoading(false);
    }
  };

  // Helper function to map category IDs to readable names
  function getCategoryName(categoryId: string) {
    const categoryMap: Record<string, string> = {
      "1": "Film & Animation",
      "2": "Autos & Vehicles",
      "10": "Music",
      "15": "Pets & Animals",
      "17": "Sports",
      "19": "Travel & Events",
      "20": "Gaming",
      "22": "People & Blogs",
      "23": "Comedy",
      "24": "Entertainment",
      "25": "News & Politics",
      "26": "Howto & Style",
      "27": "Education",
      "28": "Science & Technology",
      "29": "Nonprofit & Activism",
    };

    return categoryMap[categoryId] || `Category ${categoryId}`;
  }

  // Format timestamp to readable string
  const formatTimestamp = (timestamp: string): string => {
    if (!timestamp) return "Unknown";

    try {
      const date = new Date(timestamp);
      return new Intl.DateTimeFormat("en-US", {
        month: "short",
        day: "numeric",
        hour: "numeric",
        minute: "numeric",
        hour12: true,
      }).format(date);
    } catch (e) {
      return "Unknown";
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="w-48">
          <Select
            value={region}
            onValueChange={handleRegionChange}
            disabled={isLoading}
          >
            <SelectTrigger>
              <SelectValue placeholder="Select region" />
            </SelectTrigger>
            <SelectContent>
              <SelectGroup>
                {REGION_CODES.map((region) => (
                  <SelectItem key={region.value} value={region.value}>
                    {region.value === "GLOBAL" ? (
                      <div className="flex items-center gap-1">
                        <Globe className="h-3.5 w-3.5 inline mr-1" />
                        {region.label}
                      </div>
                    ) : (
                      region.label
                    )}
                  </SelectItem>
                ))}
              </SelectGroup>
            </SelectContent>
          </Select>
        </div>

        <div className="flex flex-col items-end">
          <Button
            size="sm"
            variant="outline"
            className="flex items-center gap-1 mb-1"
            onClick={handleRefresh}
            disabled={isLoading}
          >
            <RefreshCw
              className={`h-3.5 w-3.5 ${isLoading ? "animate-spin" : ""}`}
            />
            <span>Refresh</span>
          </Button>
          <div className="text-xs text-muted-foreground">
            {trendingData.timestamp
              ? `Updated ${formatTimestamp(trendingData.timestamp)}`
              : "No data available"}
          </div>
        </div>
      </div>

      {isLoading ? (
        <div className="space-y-4">
          {[1, 2, 3].map((i) => (
            <Card key={i} className="min-h-[120px]">
              <CardHeader className="pb-2">
                <div className="h-6 bg-slate-200 animate-pulse w-3/4 rounded mb-2"></div>
                <div className="h-4 bg-slate-200 animate-pulse w-1/2 rounded"></div>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {[1, 2, 3].map((j) => (
                    <div key={j} className="flex justify-between items-center">
                      <div className="h-4 bg-slate-200 animate-pulse w-1/3 rounded"></div>
                      <div className="h-4 bg-slate-200 animate-pulse w-1/4 rounded"></div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <div className="space-y-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-lg flex items-center gap-2">
                <Youtube className="h-4 w-4" />
                Top Categories
              </CardTitle>
              <CardDescription>Most popular video categories</CardDescription>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <div className="flex flex-col items-center justify-center py-8 space-y-4">
                  <div className="relative">
                    <div className="w-12 h-12 border-4 border-primary/20 rounded-full animate-spin border-t-primary"></div>
                    <RefreshCw className="w-6 h-6 text-primary absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2" />
                  </div>
                  <div className="text-center space-y-1">
                    <p className="text-sm font-medium">Fetching Live Data</p>
                    <p className="text-xs text-muted-foreground">
                      Analyzing trending content from {getRegionName(region)}
                    </p>
                  </div>
                </div>
              ) : (
                <ul className="space-y-2">
                  {trendingData.categories.map((category: any) => (
                    <li
                      key={category.name}
                      className="flex items-center justify-between"
                    >
                      <span className="text-sm">{category.name}</span>
                      <Badge
                        variant={
                          category.growth === "high" ? "default" : "outline"
                        }
                        className="flex items-center gap-1"
                      >
                        {category.growth === "high" ? (
                          <ArrowUp className="h-3 w-3 text-green-500" />
                        ) : (
                          <ArrowRight className="h-3 w-3 text-amber-500" />
                        )}
                        {category.growth === "high" ? "Hot" : "Rising"}
                      </Badge>
                    </li>
                  ))}
                </ul>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-lg flex items-center gap-2">
                <Hash className="h-4 w-4" />
                Popular Tags
              </CardTitle>
              <CardDescription>Trending hashtags and keywords</CardDescription>
            </CardHeader>
            <CardContent>
              <ul className="space-y-2">
                {trendingData.tags.slice(0, 5).map((tag: any) => (
                  <li
                    key={tag.name}
                    className="flex items-center justify-between"
                  >
                    <span className="text-sm">#{tag.name}</span>
                    <Badge
                      variant={tag.growth === "high" ? "default" : "outline"}
                      className="flex items-center gap-1"
                    >
                      {tag.growth === "high" ? (
                        <ArrowUp className="h-3 w-3 text-green-500" />
                      ) : (
                        <ArrowRight className="h-3 w-3 text-amber-500" />
                      )}
                      {tag.growth === "high" ? "Hot" : "Rising"}
                    </Badge>
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-lg flex items-center gap-2">
                <TrendingUp className="h-4 w-4" />
                Emerging Topics
              </CardTitle>
              <CardDescription>Content themes gaining traction</CardDescription>
            </CardHeader>
            <CardContent>
              <ul className="space-y-2">
                {trendingData.topics.slice(0, 5).map((topic: any) => (
                  <li
                    key={topic.name}
                    className="flex items-center justify-between"
                  >
                    <span className="text-sm">{topic.name}</span>
                    <Badge
                      variant={topic.growth === "high" ? "default" : "outline"}
                      className="flex items-center gap-1"
                    >
                      {topic.growth === "high" ? (
                        <ArrowUp className="h-3 w-3 text-green-500" />
                      ) : (
                        <ArrowRight className="h-3 w-3 text-amber-500" />
                      )}
                      {topic.growth === "high" ? "Hot" : "Rising"}
                    </Badge>
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
