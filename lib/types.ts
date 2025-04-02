export interface VideoIdeaRequest {
  niche: string;
  platform: string;
  contentType: string;
  viralityFactor: number;
  keywords?: string;
  region: string;
  referenceChannels?: string[];
  feedback?: string;
  previousIdea?: string;
}

export interface VideoFormat {
  type: string;
  length: string;
  hooks: string[];
}

export interface TrendAnalysis {
  relevantThemes: string[];
  relatedContent: string[];
  suggestedTags: string[];
}

export interface VideoIdea {
  id: string;
  title: string;
  concept: string;
  hashtags: string[];
  viralityScore: number;
  viralityJustification: string;
  monetizationStrategy: string;
  videoFormat: VideoFormat;
  platform: string;
  contentType: string;
  createdAt: string;
  trendAnalysis: TrendAnalysis;
  region: string;
  channelInspirations?: string;
  userId?: string;
  isSaved?: boolean;
}

export interface User {
  id: string;
  email: string;
}
