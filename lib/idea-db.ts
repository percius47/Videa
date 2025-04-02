import { createClientSupabase } from "./supabase-client";
import type { VideoIdea } from "./types";

// Save a video idea to the database
export async function saveVideoIdea(idea: VideoIdea, userId: string) {
  // Instead of using client-side Supabase directly, use our API
  const token = localStorage.getItem("supabase.auth.token");

  const response = await fetch("/api/ideas", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: token ? `Bearer ${token}` : "",
    },
    body: JSON.stringify({
      ...idea,
      userId,
    }),
  });

  if (!response.ok) {
    const errorData = await response.json();
    throw new Error(errorData.error || "Failed to save idea");
  }

  const data = await response.json();
  return data.data;
}

// Get all video ideas for a user
export async function getUserVideoIdeas(userId: string) {
  // Instead of using client-side Supabase directly, use our API
  const token = localStorage.getItem("supabase.auth.token");

  const response = await fetch("/api/ideas", {
    headers: {
      Authorization: token ? `Bearer ${token}` : "",
    },
  });

  if (!response.ok) {
    const errorData = await response.json();
    throw new Error(errorData.error || "Failed to fetch ideas");
  }

  const data = await response.json();
  return data.ideas || [];
}

// Delete a video idea
export async function deleteVideoIdea(ideaId: string, userId: string) {
  // Instead of using client-side Supabase directly, use our API
  const token = localStorage.getItem("supabase.auth.token");

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

  return true;
}
