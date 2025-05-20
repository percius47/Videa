"use client";

import type React from "react";

import { useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import {
  Loader2,
  Sparkles,
  Plus,
  Trash2,
  Youtube,
  ExternalLink,
  RefreshCw,
  Search,
  Bookmark,
  BookmarkCheck,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { CustomSelect } from "@/components/ui/custom-select";
import { Slider } from "@/components/ui/slider";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { generateVideoIdea } from "@/lib/actions";
import { REGION_CODES } from "@/lib/constants";
import type { VideoIdea } from "@/lib/types";
import { useAuth } from "@/components/auth/auth-provider";
import { toast } from "sonner";

// Interface for Channel
interface Channel {
  id: string;
  title: string;
  customUrl?: string;
  thumbnails?: any;
  statistics?: {
    subscriberCount: string;
    videoCount: string;
  };
}

// Interface for Channel search result
interface ChannelSearchResult {
  channelId: string;
  title: string;
  description: string;
  thumbnails: any;
}

export function IdeaGenerator() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [generatedIdea, setGeneratedIdea] = useState<VideoIdea | null>(null);
  const [referenceChannels, setReferenceChannels] = useState<Channel[]>([]);
  const [channelInput, setChannelInput] = useState("");
  const [searchLoading, setSearchLoading] = useState(false);
  const [searchError, setSearchError] = useState("");
  const [showFeedbackField, setShowFeedbackField] = useState(false);
  const [feedbackInput, setFeedbackInput] = useState("");
  const [improvingIdea, setImprovingIdea] = useState(false);
  const [channelSuggestions, setChannelSuggestions] = useState<
    ChannelSearchResult[]
  >([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const suggestionTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Add save-related states
  const [isSaving, setIsSaving] = useState(false);
  const [isSaved, setIsSaved] = useState(false);
  const { user } = useAuth();

  const [formData, setFormData] = useState({
    niche: "",
    platform: "tiktok",
    contentType: "entertainment",
    viralityFactor: 70,
    keywords: "",
    region: "US",
  });

  const handleChange = (field: string, value: string | number) => {
    setFormData((prev) => ({
      ...prev,
      [field]: value,
    }));
  };

  useEffect(() => {
    // Handle clicks outside the dropdown
    const handleClickOutside = (event: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node)
      ) {
        setShowSuggestions(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  // Search for channels when input changes
  useEffect(() => {
    if (suggestionTimeoutRef.current) {
      clearTimeout(suggestionTimeoutRef.current);
    }

    if (channelInput.trim().length < 2) {
      setChannelSuggestions([]);
      setShowSuggestions(false);
      return;
    }

    suggestionTimeoutRef.current = setTimeout(async () => {
      try {
        setSearchLoading(true);
        const baseUrl =
          process.env.NEXT_PUBLIC_BASE_URL || "http://localhost:3000";
        const response = await fetch(
          `${baseUrl}/api/youtube-search?query=${encodeURIComponent(
            channelInput
          )}&maxResults=5`
        );

        if (!response.ok) {
          setChannelSuggestions([]);
          return;
        }

        const data = await response.json();

        if (data.channels && data.channels.length > 0) {
          console.log("Channel suggestions with thumbnails:", data.channels);
          data.channels.forEach((channel: any, index: number) => {
            console.log(
              `Channel ${index} (${channel.title}) thumbnails:`,
              channel.thumbnails
            );
          });
          setChannelSuggestions(data.channels);
          setShowSuggestions(true);
        } else {
          setChannelSuggestions([]);
          setShowSuggestions(false);
        }
      } catch (err) {
        setChannelSuggestions([]);
        setShowSuggestions(false);
      } finally {
        setSearchLoading(false);
      }
    }, 500); // Debounce for 500ms

    return () => {
      if (suggestionTimeoutRef.current) {
        clearTimeout(suggestionTimeoutRef.current);
      }
    };
  }, [channelInput]);

  const handleAddChannel = async (
    channelId?: string,
    channelTitle?: string
  ) => {
    setSearchError("");
    setShowSuggestions(false);

    if (channelId && channelTitle) {
      // Direct add from suggestions
      if (referenceChannels.some((c) => c.id === channelId)) {
        setSearchError("This creator is already in your reference list");
        return;
      }

      setSearchLoading(true);

      try {
        // Fetch channel details
        const baseUrl =
          process.env.NEXT_PUBLIC_BASE_URL || "http://localhost:3000";
        const channelResponse = await fetch(
          `${baseUrl}/api/youtube-channel?channelId=${channelId}`
        );

        if (!channelResponse.ok) {
          throw new Error("Failed to fetch channel data");
        }

        const channelData = await channelResponse.json();
        const channelInfo = channelData.channelInfo;

        // Add channel to the list
        const newChannel: Channel = {
          id: channelInfo.id,
          title: channelInfo.title,
          customUrl: channelInfo.customUrl,
          thumbnails: channelInfo.thumbnails,
          statistics: {
            subscriberCount: channelInfo.statistics.subscriberCount,
            videoCount: channelInfo.statistics.videoCount,
          },
        };

        setReferenceChannels([...referenceChannels, newChannel]);
        setChannelInput("");
      } catch (err: any) {
        setSearchError(err.message || "Failed to add creator");
      } finally {
        setSearchLoading(false);
      }
      return;
    }

    // Manual add via button press (old method as fallback)
    const creatorName = channelInput.trim();

    if (!creatorName) {
      setSearchError("Please enter a creator name");
      return;
    }

    setSearchLoading(true);

    try {
      // Search for channel by creator name
      const baseUrl =
        process.env.NEXT_PUBLIC_BASE_URL || "http://localhost:3000";
      const response = await fetch(
        `${baseUrl}/api/youtube-search?query=${encodeURIComponent(creatorName)}`
      );

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Failed to find creator");
      }

      const data = await response.json();

      if (!data.channels || data.channels.length === 0) {
        throw new Error("Creator not found");
      }

      const channel = data.channels[0];

      // Check if channel already exists
      if (referenceChannels.some((c) => c.id === channel.channelId)) {
        setSearchError("This creator is already in your reference list");
        return;
      }

      // Fetch channel details
      const channelResponse = await fetch(
        `${baseUrl}/api/youtube-channel?channelId=${channel.channelId}`
      );

      if (!channelResponse.ok) {
        throw new Error("Failed to fetch channel data");
      }

      const channelData = await channelResponse.json();
      const channelInfo = channelData.channelInfo;

      // Add channel to the list
      const newChannel: Channel = {
        id: channelInfo.id,
        title: channelInfo.title,
        customUrl: channelInfo.customUrl,
        thumbnails: channelInfo.thumbnails,
        statistics: {
          subscriberCount: channelInfo.statistics.subscriberCount,
          videoCount: channelInfo.statistics.videoCount,
        },
      };

      setReferenceChannels([...referenceChannels, newChannel]);
      setChannelInput("");
    } catch (err: any) {
      setSearchError(err.message || "Failed to add creator");
    } finally {
      setSearchLoading(false);
    }
  };

  const handleRemoveChannel = (id: string) => {
    setReferenceChannels(referenceChannels.filter((c) => c.id !== id));
  };

  const formatSubscribers = (count: string) => {
    const num = parseInt(count);
    if (num >= 1000000) {
      return `${(num / 1000000).toFixed(1)}M subscribers`;
    } else if (num >= 1000) {
      return `${(num / 1000).toFixed(1)}K subscribers`;
    }
    return `${num} subscribers`;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setShowFeedbackField(false);
    setFeedbackInput("");

    try {
      const idea = await generateVideoIdea({
        niche: formData.niche,
        platform: formData.platform,
        contentType: formData.contentType,
        viralityFactor: formData.viralityFactor,
        keywords: formData.keywords,
        region: formData.region,
        referenceChannels: referenceChannels.map((c) => c.id),
      });

      setGeneratedIdea(idea);

      // Save to localStorage for Performance Analytics
      try {
        // Save as the last generated idea
        localStorage.setItem("lastGeneratedIdea", JSON.stringify(idea));

        // Also add to recent ideas array (max 10)
        const storedIdeas = localStorage.getItem("recentIdeas");
        let recentIdeas = storedIdeas ? JSON.parse(storedIdeas) : [];

        // Make sure it's an array
        if (!Array.isArray(recentIdeas)) {
          recentIdeas = [];
        }

        // Add new idea at the beginning
        recentIdeas.unshift(idea);

        // Limit to 10 ideas
        if (recentIdeas.length > 10) {
          recentIdeas = recentIdeas.slice(0, 10);
        }

        // Save back to localStorage
        localStorage.setItem("recentIdeas", JSON.stringify(recentIdeas));
      } catch (storageError) {
        console.error("Error saving to localStorage:", storageError);
      }

      router.refresh(); // Refresh to update recent ideas list
    } catch (error) {
      console.error("Failed to generate idea:", error);
      alert("Failed to generate idea. Please try again later.");
    } finally {
      setLoading(false);
    }
  };

  const handleImproveIdea = () => {
    setShowFeedbackField(true);
  };

  const handleSubmitFeedback = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!feedbackInput.trim()) {
      alert("Please enter some feedback to improve the idea");
      return;
    }

    setImprovingIdea(true);

    try {
      const improvedIdea = await generateVideoIdea({
        niche: formData.niche,
        platform: formData.platform,
        contentType: formData.contentType,
        viralityFactor: formData.viralityFactor,
        keywords: formData.keywords,
        region: formData.region,
        referenceChannels: referenceChannels.map((c) => c.id),
        feedback: feedbackInput.trim(),
        previousIdea: generatedIdea ? JSON.stringify(generatedIdea) : undefined,
      });

      setGeneratedIdea(improvedIdea);

      // Save improved idea to localStorage for Performance Analytics
      try {
        // Save as the last generated idea
        localStorage.setItem("lastGeneratedIdea", JSON.stringify(improvedIdea));

        // Also add to recent ideas array (max 10)
        const storedIdeas = localStorage.getItem("recentIdeas");
        let recentIdeas = storedIdeas ? JSON.parse(storedIdeas) : [];

        // Make sure it's an array
        if (!Array.isArray(recentIdeas)) {
          recentIdeas = [];
        }

        // Add new idea at the beginning
        recentIdeas.unshift(improvedIdea);

        // Limit to 10 ideas
        if (recentIdeas.length > 10) {
          recentIdeas = recentIdeas.slice(0, 10);
        }

        // Save back to localStorage
        localStorage.setItem("recentIdeas", JSON.stringify(recentIdeas));
      } catch (storageError) {
        console.error("Error saving to localStorage:", storageError);
      }
      setShowFeedbackField(false);
      setFeedbackInput("");
      router.refresh();
    } catch (error) {
      console.error("Failed to improve idea:", error);
      alert("Failed to improve idea. Please try again later.");
    } finally {
      setImprovingIdea(false);
    }
  };

  // Handle saving a video idea
  const handleSaveIdea = async () => {
    if (!user) {
      toast.error("Please login to save ideas");
      return;
    }

    if (!generatedIdea) {
      return;
    }

    // Prevent multiple save operations
    if (isSaving || isSaved) {
      return;
    }

    setIsSaving(true);

    try {
      // Get auth token from localStorage
      const token = localStorage.getItem("sb-" + process.env.NEXT_PUBLIC_SUPABASE_URL?.replace(/[^a-zA-Z0-9]/g, '') + "-auth-token");

      const response = await fetch("/api/ideas", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: token ? `Bearer ${token}` : "",
          // Prevent browser caching
          "Cache-Control": "no-cache, no-store, must-revalidate",
          Pragma: "no-cache",
          Expires: "0",
        },
        body: JSON.stringify({
          ...generatedIdea,
          userId: user.id,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to save idea");
      }

      setIsSaved(true);
      toast.success("Idea saved successfully");
    } catch (error) {
      console.error("Error saving idea:", error);
      toast.error(
        error instanceof Error ? error.message : "Failed to save idea"
      );
    } finally {
      setIsSaving(false);
    }
  };

  const resetGenerator = () => {
    setGeneratedIdea(null);
    setIsSaved(false);
    setShowFeedbackField(false);
    setFeedbackInput("");
  };

  const renderGeneratedIdea = () => {
    if (!generatedIdea) return null;

    return (
      <Card className="mt-6 overflow-hidden">
        <CardContent className="p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-2xl font-bold">{generatedIdea.title}</h2>

            {user && (
              <Button
                variant="outline"
                size="sm"
                onClick={handleSaveIdea}
                disabled={isSaving || isSaved}
                className="ml-auto"
              >
                {isSaving ? (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                ) : isSaved ? (
                  <BookmarkCheck className="h-4 w-4 mr-2 text-green-500" />
                ) : (
                  <Bookmark className="h-4 w-4 mr-2" />
                )}
                {isSaving ? "Saving..." : isSaved ? "Saved" : "Save Idea"}
              </Button>
            )}
          </div>

          <div className="space-y-4">
            <div>
              <h3 className="font-semibold">Concept</h3>
              <p>{generatedIdea.concept}</p>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <div>
                <h3 className="font-semibold">Suggested Hashtags</h3>
                <div className="flex flex-wrap gap-1 mt-1">
                  {generatedIdea.hashtags.map((tag, i) => (
                    <span
                      key={i}
                      className="bg-primary/10 text-primary px-2 py-0.5 rounded-full text-xs"
                    >
                      {tag}
                    </span>
                  ))}
                </div>
              </div>

              <div>
                <h3 className="font-semibold">Estimated Performance</h3>
                <div className="flex items-center gap-2 mt-1">
                  <div className="h-2 flex-1 rounded-full bg-muted overflow-hidden">
                    <div
                      className="h-full rounded-full bg-primary"
                      style={{ width: `${generatedIdea.viralityScore}%` }}
                    ></div>
                  </div>
                  <span className="text-xs font-medium">
                    {generatedIdea.viralityScore}%
                  </span>
                </div>
              </div>
            </div>

            <div>
              <h3 className="font-semibold">Region Analysis</h3>
              <p className="text-sm">
                Content optimized for:{" "}
                <span className="font-medium">
                  {REGION_CODES.find((r) => r.value === generatedIdea.region)
                    ?.label || generatedIdea.region}
                </span>
              </p>
            </div>

            <div>
              <h3 className="font-semibold">Monetization Strategy</h3>
              <p>{generatedIdea.monetizationStrategy}</p>
            </div>

            {generatedIdea.channelInspirations && (
              <div>
                <h3 className="font-semibold">Creator Inspirations</h3>
                <p>{generatedIdea.channelInspirations}</p>
              </div>
            )}

            {showFeedbackField && (
              <div className="mt-4 border-t pt-4">
                <form onSubmit={handleSubmitFeedback}>
                  <div className="space-y-2">
                    <Label htmlFor="feedback">
                      How would you like to improve this idea?
                    </Label>
                    <Textarea
                      id="feedback"
                      placeholder="I want more gaming elements, less focus on challenges, more emphasis on storytelling techniques..."
                      value={feedbackInput}
                      onChange={(e) => setFeedbackInput(e.target.value)}
                      className="resize-none"
                      rows={3}
                      required
                    />
                  </div>
                  <div className="flex gap-2 mt-3">
                    <Button
                      type="submit"
                      className="flex-1"
                      disabled={improvingIdea}
                    >
                      {improvingIdea ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          Improving...
                        </>
                      ) : (
                        "Submit Feedback"
                      )}
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => {
                        setShowFeedbackField(false);
                        setFeedbackInput("");
                      }}
                    >
                      Cancel
                    </Button>
                  </div>
                </form>
              </div>
            )}
          </div>
        </CardContent>

        {!showFeedbackField && (
          <CardFooter className="pt-0">
            <Button
              onClick={handleImproveIdea}
              variant="outline"
              className="w-full"
            >
              <RefreshCw className="mr-2 h-4 w-4" />
              Improve This Idea
            </Button>
          </CardFooter>
        )}
      </Card>
    );
  };

  // Create options arrays for select components
  const platformOptions = [
    { value: "tiktok", label: "TikTok" },
    { value: "youtube", label: "YouTube" },
    { value: "instagram", label: "Instagram Reels" },
    { value: "youtube-shorts", label: "YouTube Shorts" },
  ];

  const contentTypeOptions = [
    { value: "entertainment", label: "Entertainment" },
    { value: "educational", label: "Educational" },
    { value: "tutorial", label: "Tutorial" },
    { value: "vlog", label: "Vlog" },
    { value: "challenge", label: "Challenge" },
    { value: "reaction", label: "Reaction" },
  ];

  const regionOptions = REGION_CODES.map((region) => ({
    value: region.value,
    label: region.label,
  }));

  return (
    <div className="space-y-6">
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="grid gap-4 md:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="niche">Content Niche</Label>
            <Input
              id="niche"
              placeholder="e.g. Fitness, Gaming, Cooking"
              value={formData.niche}
              onChange={(e) => handleChange("niche", e.target.value)}
              required
            />
          </div>

          <div className="space-y-2">
            <CustomSelect
              id="platform"
              label="Target Platform"
              options={platformOptions}
              value={formData.platform}
              onChange={(e) => handleChange("platform", e.target.value)}
            />
          </div>
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <div className="space-y-2">
            <CustomSelect
              id="contentType"
              label="Content Type"
              options={contentTypeOptions}
              value={formData.contentType}
              onChange={(e) => handleChange("contentType", e.target.value)}
            />
          </div>

          <div className="space-y-2">
            <CustomSelect
              id="region"
              label="Target Region"
              options={regionOptions}
              value={formData.region}
              onChange={(e) => handleChange("region", e.target.value)}
            />
          </div>
        </div>

        <div className="space-y-2">
          <div className="flex justify-between">
            <Label htmlFor="viralityFactor">Virality Factor</Label>
            <span className="text-sm text-muted-foreground">
              {formData.viralityFactor}%
            </span>
          </div>
          <Slider
            id="viralityFactor"
            min={0}
            max={100}
            step={10}
            value={[formData.viralityFactor]}
            onValueChange={(value) => handleChange("viralityFactor", value[0])}
          />
          <div className="flex justify-between text-xs text-muted-foreground">
            <span>Conservative</span>
            <span>Experimental</span>
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="keywords">Keywords (optional)</Label>
          <Textarea
            id="keywords"
            placeholder="Enter keywords separated by commas"
            value={formData.keywords}
            onChange={(e) => handleChange("keywords", e.target.value)}
            className="resize-none"
            rows={2}
          />
        </div>

        <div className="space-y-2">
          <Label className="flex items-center gap-1.5">
            <Youtube className="h-4 w-4" />
            Reference Creators
          </Label>
          <div className="relative" ref={dropdownRef}>
            <div className="flex gap-2">
              <div className="relative flex-1">
                <Input
                  placeholder="Search for a creator"
                  value={channelInput}
                  onChange={(e) => setChannelInput(e.target.value)}
                  onFocus={() => {
                    if (channelSuggestions.length > 0) {
                      setShowSuggestions(true);
                    }
                  }}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      handleAddChannel();
                    }
                  }}
                />
                {searchLoading && (
                  <div className="absolute right-2 top-1/2 -translate-y-1/2">
                    <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                  </div>
                )}
              </div>
              <Button
                type="button"
                variant="outline"
                size="icon"
                onClick={() => handleAddChannel()}
                disabled={searchLoading}
              >
                <Plus className="h-4 w-4" />
              </Button>
            </div>

            {showSuggestions && channelSuggestions.length > 0 && (
              <div className="absolute z-10 mt-1 w-full rounded-md border bg-background shadow-lg">
                <ScrollArea className="max-h-[200px]">
                  <div className="p-1">
                    {channelSuggestions.map((channel) => (
                      <button
                        key={channel.channelId}
                        type="button"
                        className="flex w-full items-center gap-2 rounded-sm px-2 py-1.5 hover:bg-muted text-left"
                        onClick={() =>
                          handleAddChannel(channel.channelId, channel.title)
                        }
                      >
                        <div className="relative h-6 w-6">
                          {channel.thumbnails?.medium?.url ||
                          channel.thumbnails?.default?.url ||
                          channel.thumbnails?.high?.url ? (
                            <img
                              src={
                                channel.thumbnails?.medium?.url ||
                                channel.thumbnails?.default?.url ||
                                channel.thumbnails?.high?.url
                              }
                              alt={channel.title}
                              className="h-6 w-6 rounded-full object-cover"
                              onError={(e) => {
                                console.error("Image failed to load:", e);
                                e.currentTarget.style.display = "none";
                                e.currentTarget.parentElement!.querySelector(
                                  ".fallback-icon"
                                )!.style.display = "flex";
                              }}
                            />
                          ) : null}
                          <div
                            className="fallback-icon h-6 w-6 rounded-full bg-primary/10 items-center justify-center flex absolute inset-0"
                            style={{
                              display:
                                channel.thumbnails?.medium?.url ||
                                channel.thumbnails?.default?.url ||
                                channel.thumbnails?.high?.url
                                  ? "none"
                                  : "flex",
                            }}
                          >
                            <Youtube className="h-3 w-3" />
                          </div>
                        </div>
                        <div className="flex-1 truncate">
                          <p className="text-sm font-medium">{channel.title}</p>
                          <p className="truncate text-xs text-muted-foreground">
                            {channel.description.substring(0, 50)}
                            {channel.description.length > 50 ? "..." : ""}
                          </p>
                        </div>
                      </button>
                    ))}
                  </div>
                </ScrollArea>
              </div>
            )}
          </div>
          {searchError && (
            <p className="text-sm text-red-500 mt-1">{searchError}</p>
          )}

          {referenceChannels.length > 0 && (
            <div className="mt-2">
              <ScrollArea className="h-[120px] rounded-md border p-2">
                <div className="space-y-2 pr-3">
                  {referenceChannels.map((channel) => (
                    <div
                      key={channel.id}
                      className="flex items-center justify-between rounded-md border p-2"
                    >
                      <div className="flex items-center gap-2">
                        <div className="relative h-8 w-8">
                          {channel.thumbnails?.medium?.url ||
                          channel.thumbnails?.default?.url ||
                          channel.thumbnails?.high?.url ? (
                            <img
                              src={
                                channel.thumbnails?.medium?.url ||
                                channel.thumbnails?.default?.url ||
                                channel.thumbnails?.high?.url
                              }
                              alt={channel.title}
                              className="h-8 w-8 rounded-full object-cover"
                              onError={(e) => {
                                console.error("Image failed to load:", e);
                                e.currentTarget.style.display = "none";
                                e.currentTarget.parentElement!.querySelector(
                                  ".fallback-icon"
                                )!.style.display = "flex";
                              }}
                            />
                          ) : null}
                          <div
                            className="fallback-icon h-8 w-8 rounded-full bg-primary/10 items-center justify-center flex absolute inset-0"
                            style={{
                              display:
                                channel.thumbnails?.medium?.url ||
                                channel.thumbnails?.default?.url ||
                                channel.thumbnails?.high?.url
                                  ? "none"
                                  : "flex",
                            }}
                          >
                            <Youtube className="h-4 w-4" />
                          </div>
                        </div>
                        <div>
                          <h4 className="text-sm font-medium">
                            {channel.title}
                          </h4>
                          {channel.statistics && (
                            <p className="text-xs text-muted-foreground">
                              {formatSubscribers(
                                channel.statistics.subscriberCount
                              )}
                            </p>
                          )}
                        </div>
                      </div>
                      <div className="flex space-x-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7"
                          onClick={() =>
                            window.open(
                              `https://youtube.com/channel/${channel.id}`,
                              "_blank"
                            )
                          }
                        >
                          <ExternalLink className="h-3 w-3" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7"
                          onClick={() => handleRemoveChannel(channel.id)}
                        >
                          <Trash2 className="h-3 w-3 text-red-500" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              </ScrollArea>
              <p className="text-xs text-muted-foreground mt-1 flex items-center">
                <Youtube className="h-3 w-3 mr-1" />
                {referenceChannels.length} creator
                {referenceChannels.length !== 1 ? "s" : ""} will be analyzed for
                inspiration
              </p>
            </div>
          )}
        </div>

        {/* Submit button - separate from reference creator functionality */}
        <Button type="submit" className="w-full" disabled={loading}>
          {loading ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Generating...
            </>
          ) : (
            <>
              <Sparkles className="mr-2 h-4 w-4" />
              Generate Video Idea
            </>
          )}
        </Button>
      </form>

      {generatedIdea && (
        <Card className="border-primary/20 bg-primary/5">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-2xl font-bold">{generatedIdea.title}</h2>

              {user && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleSaveIdea}
                  disabled={isSaving || isSaved}
                  className="ml-auto"
                >
                  {isSaving ? (
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  ) : isSaved ? (
                    <BookmarkCheck className="h-4 w-4 mr-2 text-green-500" />
                  ) : (
                    <Bookmark className="h-4 w-4 mr-2" />
                  )}
                  {isSaving ? "Saving..." : isSaved ? "Saved" : "Save Idea"}
                </Button>
              )}
            </div>

            <div className="space-y-4">
              <div>
                <h3 className="font-semibold">Concept</h3>
                <p>{generatedIdea.concept}</p>
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <div>
                  <h3 className="font-semibold">Suggested Hashtags</h3>
                  <div className="flex flex-wrap gap-1 mt-1">
                    {generatedIdea.hashtags.map((tag, i) => (
                      <span
                        key={i}
                        className="bg-primary/10 text-primary px-2 py-0.5 rounded-full text-xs"
                      >
                        {tag}
                      </span>
                    ))}
                  </div>
                </div>

                <div>
                  <h3 className="font-semibold">Estimated Performance</h3>
                  <div className="flex items-center gap-2 mt-1">
                    <div className="h-2 flex-1 rounded-full bg-muted overflow-hidden">
                      <div
                        className="h-full rounded-full bg-primary"
                        style={{ width: `${generatedIdea.viralityScore}%` }}
                      ></div>
                    </div>
                    <span className="text-xs font-medium">
                      {generatedIdea.viralityScore}%
                    </span>
                  </div>
                </div>
              </div>

              <div>
                <h3 className="font-semibold">Region Analysis</h3>
                <p className="text-sm">
                  Content optimized for:{" "}
                  <span className="font-medium">
                    {REGION_CODES.find((r) => r.value === generatedIdea.region)
                      ?.label || generatedIdea.region}
                  </span>
                </p>
              </div>

              <div>
                <h3 className="font-semibold">Monetization Strategy</h3>
                <p>{generatedIdea.monetizationStrategy}</p>
              </div>

              {generatedIdea.channelInspirations && (
                <div>
                  <h3 className="font-semibold">Creator Inspirations</h3>
                  <p>{generatedIdea.channelInspirations}</p>
                </div>
              )}

              {showFeedbackField && (
                <div className="mt-4 border-t pt-4">
                  <form onSubmit={handleSubmitFeedback}>
                    <div className="space-y-2">
                      <Label htmlFor="feedback">
                        How would you like to improve this idea?
                      </Label>
                      <Textarea
                        id="feedback"
                        placeholder="I want more gaming elements, less focus on challenges, more emphasis on storytelling techniques..."
                        value={feedbackInput}
                        onChange={(e) => setFeedbackInput(e.target.value)}
                        className="resize-none"
                        rows={3}
                        required
                      />
                    </div>
                    <div className="flex gap-2 mt-3">
                      <Button
                        type="submit"
                        className="flex-1"
                        disabled={improvingIdea}
                      >
                        {improvingIdea ? (
                          <>
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            Improving...
                          </>
                        ) : (
                          "Submit Feedback"
                        )}
                      </Button>
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => {
                          setShowFeedbackField(false);
                          setFeedbackInput("");
                        }}
                      >
                        Cancel
                      </Button>
                    </div>
                  </form>
                </div>
              )}
            </div>
          </CardContent>

          {!showFeedbackField && (
            <CardFooter className="pt-0">
              <Button
                onClick={handleImproveIdea}
                variant="outline"
                className="w-full"
              >
                <RefreshCw className="mr-2 h-4 w-4" />
                Improve This Idea
              </Button>
            </CardFooter>
          )}
        </Card>
      )}
    </div>
  );
}
