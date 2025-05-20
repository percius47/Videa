"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useAuth } from "@/components/auth/auth-provider";
import { VideoIdea } from "@/lib/types";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Trash2, AlertCircle, ExternalLink, X } from "lucide-react";
import { toast } from "sonner";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Separator } from "@/components/ui/separator";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";

export default function SavedIdeasClient() {
  const [ideas, setIdeas] = useState<VideoIdea[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const [highlightedId, setHighlightedId] = useState<string | null>(null);
  const [selectedIdea, setSelectedIdea] = useState<VideoIdea | null>(null);

  const ideaRefs = useRef<{ [key: string]: HTMLElement | null }>({});
  const { user, isLoading: authLoading } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();

  // Scroll to the highlighted idea when the page loads or ideas change
  useEffect(() => {
    const idParam = searchParams.get("id");
    if (idParam && ideas.length > 0) {
      setHighlightedId(idParam);

      // Small delay to ensure the DOM is ready
      setTimeout(() => {
        const element = ideaRefs.current[idParam];
        if (element) {
          element.scrollIntoView({ behavior: "smooth", block: "center" });
        }
      }, 300);

      // Clear the highlight after a few seconds
      setTimeout(() => {
        setHighlightedId(null);
      }, 3000);
    }
  }, [searchParams, ideas]);

  // Show delete confirmation
  const showDeleteConfirm = (ideaId: string) => {
    setDeleteConfirmId(ideaId);
  };

  // Cancel delete
  const cancelDelete = () => {
    setDeleteConfirmId(null);
  };

  // Open idea details modal
  const openIdeaDetails = (idea: VideoIdea) => {
    setSelectedIdea(idea);
  };

  // Close idea details modal
  const closeIdeaDetails = () => {
    setSelectedIdea(null);
  };

  // Fetch saved ideas
  const fetchSavedIdeas = useCallback(async () => {
    if (!user) return;

    try {
      setIsLoading(true);
      setError(null);

      // Get auth token from localStorage
      const token = localStorage.getItem(
        "sb-" +
          process.env.NEXT_PUBLIC_SUPABASE_URL?.replace(/[^a-zA-Z0-9]/g, "") +
          "-auth-token"
      );

      const response = await fetch("/api/ideas", {
        cache: "no-store",
        headers: {
          Authorization: token ? `Bearer ${token}` : "",
          "Cache-Control": "no-cache, no-store, must-revalidate",
          Pragma: "no-cache",
          Expires: "0",
        },
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to fetch ideas");
      }

      const data = await response.json();
      setIdeas(data.ideas || []);
    } catch (error) {
      console.error("Error fetching saved ideas:", error);
      setError(
        error instanceof Error ? error.message : "Failed to load saved ideas"
      );
      toast.error("Failed to load saved ideas");
    } finally {
      setIsLoading(false);
    }
  }, [user]);

  // Redirect if not logged in
  useEffect(() => {
    if (!authLoading && !user) {
      router.push("/auth");
    }
  }, [user, authLoading, router]);

  // Fetch on mount
  useEffect(() => {
    if (user) {
      fetchSavedIdeas();
    }
  }, [user, fetchSavedIdeas]);

  // Delete an idea
  const deleteIdea = async (ideaId: string) => {
    try {
      if (isDeleting) return;
      setIsDeleting(true);

      const token = localStorage.getItem(
        "sb-" +
          process.env.NEXT_PUBLIC_SUPABASE_URL?.replace(/[^a-zA-Z0-9]/g, "") +
          "-auth-token"
      );
      const response = await fetch(`/api/ideas/${ideaId}`, {
        method: "DELETE",
        headers: {
          Authorization: token ? `Bearer ${token}` : "",
        },
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to delete idea");
      }

      setIdeas((prev) => prev.filter((idea) => idea.id !== ideaId));
      toast.success("Idea deleted successfully");
      setDeleteConfirmId(null);
    } catch (error) {
      console.error("Error deleting idea:", error);
      toast.error("Failed to delete idea");
    } finally {
      setIsDeleting(false);
    }
  };

  // Loading component
  function LoadingCards() {
    return (
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {[1, 2, 3].map((i) => (
          <div
            key={i}
            className="h-auto rounded-lg border border-border overflow-hidden relative"
          >
            <div className="p-6 border-b space-y-1">
              <div className="h-5 bg-slate-200 animate-pulse w-3/4 mb-3 rounded" />
              <div className="flex gap-1">
                <div className="h-5 w-20 bg-slate-200 animate-pulse rounded-full" />
                <div className="h-5 w-24 bg-slate-200 animate-pulse rounded-full" />
              </div>
            </div>
            <div className="p-6 space-y-4">
              <div className="h-20 bg-slate-200 animate-pulse mb-4" />
              <div className="h-12 bg-slate-200 animate-pulse" />
              <div className="h-16 bg-slate-200 animate-pulse" />
              <div className="h-16 bg-slate-200 animate-pulse" />
            </div>
            <div className="p-4 border-t">
              <div className="h-4 bg-slate-200 animate-pulse w-32" />
            </div>
          </div>
        ))}
      </div>
    );
  }

  // Loading state
  if (authLoading || (isLoading && ideas.length === 0)) {
    return (
      <div className="container py-10">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-bold">Saved Ideas</h1>
          <div className="w-32 h-10 bg-slate-200 animate-pulse rounded-md" />
        </div>
        <LoadingCards />
      </div>
    );
  }

  return (
    <div className="container py-10">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">Saved Ideas</h1>
        <Button onClick={() => router.push("/")}>Create New Idea</Button>
      </div>

      {error && (
        <Alert variant="destructive" className="mb-6">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Error</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {!error && ideas.length === 0 ? (
        <div className="text-center py-12">
          <h2 className="text-xl font-medium mb-2">No saved ideas yet</h2>
          <p className="text-muted-foreground mb-6">
            Generate and save some video ideas to see them here
          </p>
          <Button onClick={() => router.push("/")}>Generate Ideas</Button>
        </div>
      ) : (
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {ideas.map((idea) => (
            <Card
              key={idea.id}
              className={`flex flex-col h-full transition-all duration-200 hover:shadow-md overflow-hidden border-muted ${
                highlightedId === idea.id
                  ? "ring-2 ring-primary animate-pulse"
                  : ""
              }`}
              ref={(el) => {
                ideaRefs.current[idea.id] = el;
              }}
            >
              <CardHeader className="pb-3 bg-muted/30">
                <div className="flex justify-between items-start">
                  <CardTitle className="mr-4 text-lg leading-tight">
                    {idea.title}
                  </CardTitle>

                  {deleteConfirmId === idea.id ? (
                    <div className="flex items-center gap-2">
                      <Button
                        size="sm"
                        variant="destructive"
                        onClick={() => deleteIdea(idea.id)}
                        disabled={isDeleting}
                      >
                        {isDeleting ? "Deleting..." : "Confirm"}
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={cancelDelete}
                      >
                        Cancel
                      </Button>
                    </div>
                  ) : (
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 text-red-500 opacity-50 hover:opacity-100 hover:bg-red-50"
                      disabled={isDeleting}
                      onClick={() => showDeleteConfirm(idea.id)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  )}
                </div>
                <CardDescription>
                  <div className="flex items-center gap-2 mt-2">
                    <Badge className="font-medium px-2.5 py-0.5">
                      {idea.platform}
                    </Badge>
                    <Badge variant="outline" className="px-2.5 py-0.5">
                      {idea.contentType}
                    </Badge>
                  </div>
                </CardDescription>
              </CardHeader>

              <CardContent className="pb-4 space-y-5 pt-4 flex-grow">
                {/* Basic information - always visible */}
                <div className="flex flex-col space-y-3">
                  <div className="p-3 bg-primary/5 rounded-lg border border-primary/10">
                    <h3 className="text-sm font-semibold mb-1.5 text-primary/80">
                      Concept
                    </h3>
                    <p className="text-sm leading-relaxed line-clamp-2">
                      {idea.concept}
                    </p>
                  </div>

                  {/* Virality Score - always visible */}
                  <div>
                    <div className="flex items-center justify-between mb-1.5">
                      <h3 className="text-sm font-semibold text-primary/80">
                        Virality Score
                      </h3>
                      <span className="text-sm font-bold">
                        {idea.viralityScore}%
                      </span>
                    </div>
                    <div className="h-2.5 w-full rounded-full bg-muted overflow-hidden">
                      <div
                        className={`h-full rounded-full ${
                          idea.viralityScore > 75
                            ? "bg-green-500"
                            : idea.viralityScore > 50
                            ? "bg-amber-500"
                            : "bg-rose-500"
                        }`}
                        style={{ width: `${idea.viralityScore}%` }}
                      ></div>
                    </div>
                  </div>
                </div>

                {/* Show More button */}
                <Button
                  variant="outline"
                  className="w-full flex items-center justify-center"
                  onClick={() => openIdeaDetails(idea)}
                >
                  <span className="mr-2">Show Details</span>
                  <ExternalLink className="h-4 w-4" />
                </Button>
              </CardContent>

              <CardFooter className="pt-2 border-t mt-auto bg-muted/10">
                <div className="text-xs text-muted-foreground">
                  Created on {new Date(idea.createdAt).toLocaleDateString()}
                </div>
              </CardFooter>
            </Card>
          ))}
        </div>
      )}

      {/* Idea Details Modal */}
      <Dialog
        open={selectedIdea !== null}
        onOpenChange={(open) => !open && closeIdeaDetails()}
      >
        <DialogContent className="sm:max-w-[700px] h-[90vh] p-0 flex flex-col">
          <div className="p-6 border-b">
            <DialogHeader>
              <div className="flex items-center justify-between">
                <DialogTitle className="text-xl">
                  {selectedIdea?.title}
                </DialogTitle>
              </div>
              <DialogDescription className="flex items-center gap-2 mt-2">
                {selectedIdea && (
                  <>
                    <Badge className="font-medium px-2.5 py-0.5">
                      {selectedIdea.platform}
                    </Badge>
                    <Badge variant="outline" className="px-2.5 py-0.5">
                      {selectedIdea.contentType}
                    </Badge>
                    <span className="text-sm text-muted-foreground ml-auto">
                      Created on{" "}
                      {new Date(selectedIdea.createdAt).toLocaleDateString()}
                    </span>
                  </>
                )}
              </DialogDescription>
            </DialogHeader>
          </div>

          <ScrollArea className="flex-1 p-6">
            {selectedIdea && (
              <div className="space-y-6">
                {/* Concept */}
                <div className="p-4 bg-primary/5 rounded-lg border border-primary/10">
                  <h3 className="text-sm font-semibold mb-2 text-primary/80">
                    Concept
                  </h3>
                  <p className="text-sm leading-relaxed">
                    {selectedIdea.concept}
                  </p>
                </div>

                {/* Virality */}
                <div className="p-4 rounded-lg border border-muted">
                  <div className="flex items-center justify-between mb-2">
                    <h3 className="text-sm font-semibold text-primary/80">
                      Virality Score
                    </h3>
                    <span className="text-sm font-bold">
                      {selectedIdea.viralityScore}%
                    </span>
                  </div>
                  <div className="h-2.5 w-full rounded-full bg-muted overflow-hidden mb-3">
                    <div
                      className={`h-full rounded-full ${
                        selectedIdea.viralityScore > 75
                          ? "bg-green-500"
                          : selectedIdea.viralityScore > 50
                          ? "bg-amber-500"
                          : "bg-rose-500"
                      }`}
                      style={{ width: `${selectedIdea.viralityScore}%` }}
                    ></div>
                  </div>

                  {selectedIdea.viralityJustification && (
                    <div className="mt-3">
                      <h4 className="text-sm font-medium mb-1">
                        Justification
                      </h4>
                      <p className="text-sm text-muted-foreground">
                        {typeof selectedIdea.viralityJustification === "string"
                          ? selectedIdea.viralityJustification
                          : "Justification available"}
                      </p>
                    </div>
                  )}
                </div>

                {/* Hashtags */}
                <div className="p-4 rounded-lg border border-muted">
                  <h3 className="text-sm font-semibold mb-3 text-primary/80">
                    Trending Tags
                  </h3>
                  <div className="flex flex-wrap gap-2">
                    {selectedIdea.hashtags.map((tag, i) => (
                      <Badge
                        key={i}
                        variant="secondary"
                        className="text-xs py-1 px-2.5 bg-secondary/30"
                      >
                        #{tag}
                      </Badge>
                    ))}
                  </div>
                </div>

                <Separator />

                {/* Additional Details */}
                <div className="p-4 rounded-lg border border-muted">
                  <h3 className="text-sm font-semibold mb-4 text-primary/80">
                    Additional Details
                  </h3>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {selectedIdea.monetizationStrategy && (
                      <div className="col-span-full">
                        <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1">
                          Monetization Strategy
                        </h4>
                        <p className="text-sm">
                          {typeof selectedIdea.monetizationStrategy === "string"
                            ? selectedIdea.monetizationStrategy
                            : "Strategy available"}
                        </p>
                      </div>
                    )}

                    {selectedIdea.videoFormat && (
                      <div>
                        <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1">
                          Video Format
                        </h4>
                        <p className="text-sm">
                          {typeof selectedIdea.videoFormat === "string"
                            ? selectedIdea.videoFormat
                            : "Format available"}
                        </p>
                      </div>
                    )}

                    {selectedIdea.region && (
                      <div>
                        <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1">
                          Target Region
                        </h4>
                        <p className="text-sm">
                          {typeof selectedIdea.region === "string"
                            ? selectedIdea.region
                            : "Region information available"}
                        </p>
                      </div>
                    )}

                    {selectedIdea.channelInspirations && (
                      <div className="col-span-full">
                        <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1">
                          Channel Inspirations
                        </h4>
                        <p className="text-sm">
                          {typeof selectedIdea.channelInspirations === "string"
                            ? selectedIdea.channelInspirations
                            : "Inspirations available"}
                        </p>
                      </div>
                    )}

                    {selectedIdea.trendAnalysis && (
                      <div className="col-span-full">
                        <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1">
                          Trend Analysis
                        </h4>
                        <p className="text-sm">
                          {typeof selectedIdea.trendAnalysis === "string"
                            ? selectedIdea.trendAnalysis
                            : "Analysis available"}
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}
          </ScrollArea>
        </DialogContent>
      </Dialog>
    </div>
  );
} 