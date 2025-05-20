"use client";

import { useState, useEffect } from "react";
import { REGION_CODES } from "@/lib/constants";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { Play } from "lucide-react";
import { Info } from "lucide-react";
import { UserCircle } from "lucide-react";
import { Trophy } from "lucide-react";
import { TrendingUp } from "lucide-react";
import { Flame } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
} from "@/components/ui/carousel";
import { toast } from "sonner";
import { Youtube } from "lucide-react";

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

// Top regions to fetch for global data - same as in trending-topics.tsx
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

// Add helper function to get color based on ranking
const getRankColor = (rank: number): string => {
  if (rank === 1) return "bg-amber-500"; // Gold
  if (rank === 2) return "bg-slate-300"; // Silver
  if (rank === 3) return "bg-amber-700"; // Bronze
  if (rank <= 5) return "bg-rose-500"; // Hot red
  return "bg-indigo-500"; // Purple for others
};

// Add helper function to get icon based on ranking
const getRankIcon = (rank: number) => {
  if (rank === 1) return <Trophy className="h-3 w-3" />;
  if (rank <= 3) return <TrendingUp className="h-3 w-3" />;
  return <Flame className="h-3 w-3 text-rose-500" />;
};

export function TrendingVideosCarousel() {
  const [region, setRegion] = useState("GLOBAL");
  const [isLoading, setIsLoading] = useState(true);
  const [trendingVideos, setTrendingVideos] = useState<TrendingVideo[]>([]);
  const [currentVideoIndex, setCurrentVideoIndex] = useState(0);

  // Load data from localStorage on initial mount
  useEffect(() => {
    const loadDataFromStorage = () => {
      try {
        const storedVideos = localStorage.getItem("carouselTrendingVideos");
        const storedRegion = localStorage.getItem("carouselTrendingRegion");
        const storedTimestamp = localStorage.getItem(
          "carouselTrendingTimestamp"
        );

        if (storedVideos && storedRegion && storedTimestamp) {
          // Check if data has expired (1 hour = 3600000 milliseconds)
          const currentTime = new Date().getTime();
          const storedTime = parseInt(storedTimestamp);

          if (currentTime - storedTime < 3600000) {
            // Data is still valid
            setTrendingVideos(JSON.parse(storedVideos));
            setRegion(storedRegion);
            setIsLoading(false);
            return true;
          }
          // Data has expired, don't use it
          console.log("Trending data expired, fetching fresh data");
        }
      } catch (error) {
        console.error("Error loading data from localStorage:", error);
      }
      return false;
    };

    const hasData = loadDataFromStorage();

    // If no data in localStorage, fetch on initial load
    if (!hasData) {
      fetchTrendingVideos(region);
    }
  }, []);

  const fetchTrendingVideos = async (regionCode: string) => {
    setIsLoading(true);
    try {
      let allVideos: TrendingVideo[] = [];

      // For GLOBAL, fetch from multiple regions and combine
      if (regionCode === "GLOBAL") {
        // Check if we have cached global data that hasn't expired
        const storedGlobalVideos = localStorage.getItem(
          "carouselTrendingVideos_GLOBAL"
        );
        const storedGlobalTimestamp = localStorage.getItem(
          "carouselTrendingTimestamp_GLOBAL"
        );

        if (storedGlobalVideos && storedGlobalTimestamp) {
          // Check if data has expired (1 hour = 3600000 milliseconds)
          const currentTime = new Date().getTime();
          const storedTime = parseInt(storedGlobalTimestamp);

          if (currentTime - storedTime < 3600000) {
            // Data is still valid
            setTrendingVideos(JSON.parse(storedGlobalVideos));
            setIsLoading(false);
            return;
          }
          // Data has expired, don't use it
          console.log("Global trending data expired, fetching fresh data");
        }

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
          `Fetched a total of ${allVideos.length} videos from ${GLOBAL_REGIONS.length} regions for carousel`
        );

        if (allVideos.length === 0) {
          throw new Error("Failed to fetch global trending data");
        }

        // More sophisticated deduplication to ensure diverse content
        // First deduplicate based on exact videoId
        const uniqueVideos: Record<string, TrendingVideo> = {};
        allVideos.forEach((video) => {
          // If duplicate found, keep the one with more views
          if (uniqueVideos[video.videoId]) {
            const existingViews =
              parseInt(uniqueVideos[video.videoId].stats.views) || 0;
            const newViews = parseInt(video.stats.views) || 0;
            if (newViews > existingViews) {
              uniqueVideos[video.videoId] = video;
            }
          } else {
            uniqueVideos[video.videoId] = video;
          }
        });

        // Convert back to array
        allVideos = Object.values(uniqueVideos);

        // Sort by views first (most popular)
        allVideos.sort((a, b) => {
          const aViews = parseInt(a.stats.views) || 0;
          const bViews = parseInt(b.stats.views) || 0;
          return bViews - aViews;
        });

        // Second-level filtering for content diversity
        const diverseVideos: TrendingVideo[] = [];
        const seenAuthors = new Set<string>();
        const seenTitles = new Set<string>();

        // Helper function to check if title is similar to any in the set
        const isTitleSimilar = (title: string): boolean => {
          const normalizedTitle = title.toLowerCase().replace(/[^\w\s]/g, "");

          for (const existingTitle of seenTitles) {
            // Check for significant overlap
            const existingWords = existingTitle.split(" ");
            const newWords = normalizedTitle.split(" ");

            let matchCount = 0;
            for (const word of newWords) {
              if (word.length > 3 && existingWords.includes(word)) {
                matchCount++;
              }
            }

            // If more than 40% of significant words match, consider it similar
            if (matchCount >= Math.min(3, Math.floor(newWords.length * 0.4))) {
              return true;
            }
          }

          return false;
        };

        // For each video, check if we already have one from the same author or very similar title
        for (const video of allVideos) {
          const normalizedTitle = video.title
            .toLowerCase()
            .replace(/[^\w\s]/g, "");

          // Skip if we already have 2 videos from this author
          if (
            seenAuthors.has(video.author) &&
            [...seenAuthors].filter((a) => a === video.author).length >= 2
          ) {
            continue;
          }

          // Skip if the title is too similar to one we already have
          if (isTitleSimilar(normalizedTitle)) {
            continue;
          }

          // Add to diverse list
          diverseVideos.push(video);
          seenAuthors.add(video.author);
          seenTitles.add(normalizedTitle);

          // Once we have 10 diverse videos, stop
          if (diverseVideos.length >= 10) {
            break;
          }
        }

        // If we couldn't find enough diverse videos, add more from the original list
        if (diverseVideos.length < 10) {
          for (const video of allVideos) {
            if (!diverseVideos.some((v) => v.videoId === video.videoId)) {
              diverseVideos.push(video);
              if (diverseVideos.length >= 10) {
                break;
              }
            }
          }
        }

        allVideos = diverseVideos;
      } else {
        // Check if we have cached data for this specific region that hasn't expired
        const storedRegionVideos = localStorage.getItem(
          `carouselTrendingVideos_${regionCode}`
        );
        const storedRegionTimestamp = localStorage.getItem(
          `carouselTrendingTimestamp_${regionCode}`
        );

        if (storedRegionVideos && storedRegionTimestamp) {
          // Check if data has expired (1 hour = 3600000 milliseconds)
          const currentTime = new Date().getTime();
          const storedTime = parseInt(storedRegionTimestamp);

          if (currentTime - storedTime < 3600000) {
            // Data is still valid
            setTrendingVideos(JSON.parse(storedRegionVideos));
            setIsLoading(false);
            return;
          }
          // Data has expired, don't use it
          console.log(
            `Trending data for ${regionCode} expired, fetching fresh data`
          );
        }

        // Regular single region fetch
        const response = await fetch(
          `/api/youtube-trending?region=${regionCode}`
        );
        if (!response.ok) throw new Error("Failed to fetch trending videos");

        const data = await response.json();
        allVideos = data.videos || [];

        // Sort videos by views first
        allVideos.sort((a, b) => {
          const aViews = parseInt(a.stats.views) || 0;
          const bViews = parseInt(b.stats.views) || 0;
          return bViews - aViews;
        });

        // For single region, also ensure some diversity
        const diverseVideos: TrendingVideo[] = [];
        const seenAuthors = new Set<string>();

        // Limit videos per creator to 2
        for (const video of allVideos) {
          // Skip if we already have 2 videos from this author
          if (
            seenAuthors.has(video.author) &&
            [...seenAuthors].filter((a) => a === video.author).length >= 2
          ) {
            continue;
          }

          // Add to diverse list
          diverseVideos.push(video);
          seenAuthors.add(video.author);

          // Once we have 10 diverse videos, stop
          if (diverseVideos.length >= 10) {
            break;
          }
        }

        // If we couldn't find enough diverse videos, add more from the original list
        if (diverseVideos.length < 10) {
          for (const video of allVideos) {
            if (!diverseVideos.some((v) => v.videoId === video.videoId)) {
              diverseVideos.push(video);
              if (diverseVideos.length >= 10) {
                break;
              }
            }
          }
        }

        allVideos = diverseVideos;
      }

      // Limit to top 10 videos (should already be 10 or fewer)
      const topVideos = allVideos.slice(0, 10);

      setTrendingVideos(topVideos);

      // Store in localStorage with region-specific key
      localStorage.setItem(
        `carouselTrendingVideos_${regionCode}`,
        JSON.stringify(topVideos)
      );
      // Store current timestamp for this region
      localStorage.setItem(
        `carouselTrendingTimestamp_${regionCode}`,
        new Date().getTime().toString()
      );
      // Store as default trending videos
      localStorage.setItem("carouselTrendingVideos", JSON.stringify(topVideos));
      // Store current region
      localStorage.setItem("carouselTrendingRegion", regionCode);
      // Store current timestamp for default data
      localStorage.setItem(
        "carouselTrendingTimestamp",
        new Date().getTime().toString()
      );
    } catch (error) {
      console.error("Error fetching trending videos:", error);
      toast.error(
        `Failed to fetch trending videos for ${getRegionName(regionCode)}`
      );
    } finally {
      setIsLoading(false);
    }
  };

  const handleRegionChange = (newRegion: string) => {
    setRegion(newRegion);

    try {
      // Check if we have cached data for this region that hasn't expired
      const storedVideos = localStorage.getItem(
        `carouselTrendingVideos_${newRegion}`
      );
      const storedTimestamp = localStorage.getItem(
        `carouselTrendingTimestamp_${newRegion}`
      );

      if (storedVideos && storedTimestamp) {
        // Check if data has expired (1 hour = 3600000 milliseconds)
        const currentTime = new Date().getTime();
        const storedTime = parseInt(storedTimestamp);

        if (currentTime - storedTime < 3600000) {
          // Use cached data
          setTrendingVideos(JSON.parse(storedVideos));
          // Update current region in localStorage
          localStorage.setItem("carouselTrendingRegion", newRegion);
          // Reset to first video when changing region
          setCurrentVideoIndex(0);
          return;
        }
      }

      // If no valid cached data, fetch new data
      fetchTrendingVideos(newRegion);
      // Reset to first video when changing region
      setCurrentVideoIndex(0);
    } catch (error) {
      console.error("Error handling region change:", error);
      fetchTrendingVideos(newRegion);
      setCurrentVideoIndex(0);
    }
  };

  const getRegionName = (code: string): string => {
    const region = REGION_CODES.find((r) => r.value === code);
    return region ? region.label : code;
  };

  const formatViews = (viewCount: string) => {
    const count = parseInt(viewCount, 10);
    if (count >= 1000000) {
      return `${(count / 1000000).toFixed(1)}M views`;
    } else if (count >= 1000) {
      return `${(count / 1000).toFixed(1)}K views`;
    } else {
      return `${count} views`;
    }
  };

  const getVideoThumbnail = (videoId: string) => {
    return `https://i.ytimg.com/vi/${videoId}/maxresdefault.jpg`;
  };

  return (
    <div className="relative w-full">
      {/* Hero section with featured video background */}
      <div className="relative w-full h-[70vh] overflow-hidden">
        {isLoading ? (
          <div className="w-full h-full flex flex-col items-center justify-center bg-muted/50">
            <div className="flex flex-col items-center gap-4">
              <div className="relative">
                <div className="w-16 h-16 border-4 border-primary/20 rounded-full animate-spin border-t-primary"></div>
                <Youtube className="w-8 h-8 text-primary absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2" />
              </div>
              <div className="text-center space-y-2">
                <h3 className="text-lg font-semibold">
                  Fetching Live YouTube Data
                </h3>
                <p className="text-sm text-muted-foreground">
                  Loading trending videos from {getRegionName(region)}...
                </p>
              </div>
            </div>
          </div>
        ) : trendingVideos.length > 0 ? (
          <>
            {/* Background video thumbnail with gradient overlay */}
            <div className="absolute inset-0">
              <img
                src={getVideoThumbnail(
                  trendingVideos[currentVideoIndex]?.videoId
                )}
                alt={trendingVideos[currentVideoIndex]?.title}
                className="w-full h-full object-cover"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-background via-background/80 to-transparent" />
            </div>

            {/* Video info */}
            <div className="absolute bottom-0 left-0 right-0 p-8 z-10">
              <div className="container mx-auto">
                <div className="max-w-3xl">
                  <div className="flex items-center gap-3 mb-2">
                    <div
                      className={`${getRankColor(
                        currentVideoIndex + 1
                      )} text-white px-3 py-1 rounded-full text-sm font-medium flex items-center gap-1.5 shadow-md`}
                    >
                      {getRankIcon(currentVideoIndex + 1)}
                      <span className="font-bold">
                        #{currentVideoIndex + 1}
                      </span>
                      <span>Trending</span>
                    </div>
                  </div>
                  <h1 className="text-4xl md:text-5xl font-bold tracking-tight mb-3">
                    {trendingVideos[currentVideoIndex]?.title}
                  </h1>
                  <p className="text-lg text-muted-foreground mb-4 line-clamp-3">
                    {trendingVideos[currentVideoIndex]?.description}
                  </p>
                  <div className="flex items-center gap-2 mb-6">
                    <p className="text-sm font-semibold">
                      {formatViews(
                        trendingVideos[currentVideoIndex]?.stats.views
                      )}
                    </p>
                    <span className="text-muted-foreground">•</span>
                    <p className="text-sm text-muted-foreground">
                      {trendingVideos[currentVideoIndex]?.publishedText}
                    </p>
                    <span className="text-muted-foreground">•</span>
                    <p className="text-sm text-muted-foreground">
                      {trendingVideos[currentVideoIndex]?.author}
                    </p>
                  </div>
                  <div className="flex items-center gap-3">
                    <Button className="gap-2">
                      <Play className="h-4 w-4" />
                      Watch Now
                    </Button>
                    <Button variant="secondary" className="gap-2">
                      <Info className="h-4 w-4" />
                      More Info
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          </>
        ) : (
          <div className="flex items-center justify-center h-full bg-muted">
            <p className="text-muted-foreground">No trending videos found</p>
          </div>
        )}
      </div>

      {/* Region selector and trending carousel */}
      <div className="container mx-auto mt-8">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-2xl font-bold">Trending Videos</h2>
          <div className="flex items-center gap-2">
            <p className="text-sm text-muted-foreground mr-2">Region:</p>
            <Select value={region} onValueChange={handleRegionChange}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Select region" />
              </SelectTrigger>
              <SelectContent>
                {REGION_CODES.map((regionOption) => (
                  <SelectItem
                    key={regionOption.value}
                    value={regionOption.value}
                  >
                    {regionOption.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        {isLoading ? (
          <div className="grid grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="space-y-2">
                <Skeleton className="aspect-video rounded-md" />
                <Skeleton className="h-4 w-3/4" />
                <Skeleton className="h-3 w-1/2" />
              </div>
            ))}
          </div>
        ) : (
          <Carousel
            opts={{
              align: "start",
              loop: true,
            }}
            className="w-full"
          >
            <CarouselContent className="-ml-4">
              {trendingVideos.map((video, index) => (
                <CarouselItem
                  key={video.videoId}
                  className="pl-4 md:basis-1/3 lg:basis-1/4 xl:basis-1/5"
                >
                  <div
                    className="overflow-hidden rounded-md cursor-pointer transition-all duration-200 hover:scale-105"
                    onClick={() => setCurrentVideoIndex(index)}
                  >
                    <div className="relative aspect-video">
                      <img
                        src={getVideoThumbnail(video.videoId)}
                        alt={video.title}
                        className="w-full h-full object-cover"
                      />
                      {/* Ranking label */}
                      <div
                        className={`absolute top-2 left-2 ${getRankColor(
                          index + 1
                        )} text-white font-bold rounded-full h-7 w-7 flex items-center justify-center text-sm shadow-md border border-white/30 backdrop-blur-sm`}
                      >
                        {index + 1}
                      </div>
                      {index < 3 && (
                        <div className="absolute top-2 right-2 text-white">
                          {getRankIcon(index + 1)}
                        </div>
                      )}
                      <div className="absolute inset-0 bg-black/20 opacity-0 hover:opacity-100 transition-opacity flex items-center justify-center">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="text-white bg-black/50 rounded-full"
                        >
                          <Play className="h-6 w-6" />
                        </Button>
                      </div>
                    </div>
                    <div className="p-2">
                      <h3 className="font-medium line-clamp-1">
                        {video.title}
                      </h3>
                      <div className="flex items-center mt-2 gap-1">
                        <UserCircle className="h-3 w-3 text-muted-foreground flex-shrink-0" />
                        <p className="text-xs text-muted-foreground truncate">
                          {video.author}
                        </p>
                      </div>
                      <p className="text-xs text-muted-foreground mt-1">
                        {formatViews(video.stats.views)}
                      </p>
                    </div>
                  </div>
                </CarouselItem>
              ))}
            </CarouselContent>
            <CarouselPrevious className="left-1 bg-primary hover:bg-primary/90 backdrop-blur-sm text-white border-none shadow-md shadow-primary/20" />
            <CarouselNext className="right-1 bg-primary hover:bg-primary/90 backdrop-blur-sm text-white border-none shadow-md shadow-primary/20" />
          </Carousel>
        )}
      </div>
    </div>
  );
}
