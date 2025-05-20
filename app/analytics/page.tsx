"use client";

import { Suspense } from "react";
import { DetailedPerformanceAnalytics } from "@/components/detailed-performance-analytics";
import { useAuth } from "@/components/auth/auth-provider";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export default function AnalyticsPage() {
  const { user, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="container py-8">
        <div className="h-96 flex items-center justify-center">Loading...</div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="container py-8">
        <Card className="max-w-md mx-auto">
          <CardHeader>
            <CardTitle>Login Required</CardTitle>
            <CardDescription>
              Please login to view your performance analytics
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button asChild className="w-full">
              <Link href="/auth">Login to View Analytics</Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="container py-8">
      <div className="mb-8 space-y-4">
        <h1 className="text-3xl font-bold tracking-tight">
          Performance Analytics
        </h1>
        <p className="text-muted-foreground">
          Detailed insights about your content ideas and their performance
          potential
        </p>
      </div>

      <Suspense
        fallback={
          <div className="h-96 flex items-center justify-center">
            Loading analytics...
          </div>
        }
      >
        <DetailedPerformanceAnalytics />
      </Suspense>
    </div>
  );
}
