import { Suspense } from "react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { IdeaGenerator } from "@/components/idea-generator";
import { TrendingTopics } from "@/components/trending-topics";
import { RecentIdeas } from "@/components/recent-ideas";
import { LoadingIdeas } from "@/components/loading-ideas";
import { TrendingVideosCarousel } from "@/components/trending-videos-carousel";
import { PerformanceAnalytics } from "@/components/performance-analytics";

export default function Home() {
  return (
    <div className="flex min-h-screen flex-col">
      <main className="flex-1">
        {/* Hero Section with Netflix-like Carousel */}
        <Suspense
          fallback={<div className="h-[70vh] bg-muted animate-pulse" />}
        >
          <TrendingVideosCarousel />
        </Suspense>

        <div className="container py-6">
          <div className="mb-8 space-y-4">
            <h1 className="text-3xl font-bold tracking-tight">
              Generate Viral Video Ideas
            </h1>
            <p className="text-muted-foreground">
              Use AI to create trending video concepts based on current social
              media patterns.
            </p>
          </div>

          <div className="grid gap-6 md:grid-cols-[1fr_400px]">
            <div className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle>Video Idea Generator</CardTitle>
                  <CardDescription>
                    Customize your preferences to generate viral video ideas
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <Suspense fallback={<LoadingIdeas />}>
                    <IdeaGenerator />
                  </Suspense>
                </CardContent>
              </Card>

              <Tabs defaultValue="ideas">
                <TabsList className="grid w-full grid-cols-2">
                  <TabsTrigger value="ideas">Recent Ideas</TabsTrigger>
                  <TabsTrigger value="analytics">Performance</TabsTrigger>
                </TabsList>
                <TabsContent value="ideas" className="mt-4">
                  <RecentIdeas />
                </TabsContent>
                <TabsContent value="analytics" className="mt-4">
                  <PerformanceAnalytics />
                </TabsContent>
              </Tabs>
            </div>

            <div className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle>Trending Topics</CardTitle>
                  <CardDescription>
                    YouTube trending data to inspire your content
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <TrendingTopics />
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
