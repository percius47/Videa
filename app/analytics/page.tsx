import { Suspense } from "react";
import { DetailedPerformanceAnalytics } from "@/components/detailed-performance-analytics";

export default function AnalyticsPage() {
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
