import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { getRecentIdeas } from "@/lib/actions";
import Link from "next/link";

export async function RecentIdeas() {
  const ideas = await getRecentIdeas();

  if (ideas.length === 0) {
    return (
      <Card>
        <CardContent className="pt-6">
          <div className="text-center py-8 text-muted-foreground">
            <p>No recent ideas generated yet.</p>
            <p className="text-sm">Generate your first idea to see it here!</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  // Only show up to 3 most recent ideas
  const recentIdeas = ideas.slice(0, 3);

  return (
    <div className="flex flex-nowrap gap-4 overflow-x-auto pb-2">
      {recentIdeas.map((idea, index) => (
        <Link
          href={`/saved-ideas?id=${idea.id}`}
          key={index}
          className="flex-none w-full sm:w-72 transition-transform hover:scale-[1.02]"
        >
          <Card className="h-full cursor-pointer hover:shadow-md border-muted">
            <CardHeader className="pb-2">
              <div className="flex justify-between items-start">
                <CardTitle className="text-base line-clamp-1">
                  {idea.title}
                </CardTitle>
                <Badge
                  variant={idea.viralityScore > 75 ? "default" : "outline"}
                  className="text-xs px-2 py-0 h-5 font-normal"
                >
                  {idea.viralityScore}%
                </Badge>
              </div>
              <CardDescription>
                {idea.platform} • {idea.contentType}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-sm line-clamp-3">{idea.concept}</p>
              <div className="flex flex-wrap gap-1 mt-3">
                {idea.hashtags.slice(0, 2).map((tag, i) => (
                  <span
                    key={i}
                    className="bg-muted px-2 py-0.5 rounded-full text-xs"
                  >
                    {tag}
                  </span>
                ))}
                {idea.hashtags.length > 2 && (
                  <span className="bg-muted px-2 py-0.5 rounded-full text-xs">
                    +{idea.hashtags.length - 2} more
                  </span>
                )}
              </div>
            </CardContent>
          </Card>
        </Link>
      ))}
    </div>
  );
}
