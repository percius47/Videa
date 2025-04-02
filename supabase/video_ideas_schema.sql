-- Create public.video_ideas table
CREATE TABLE IF NOT EXISTS public.video_ideas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  concept TEXT NOT NULL,
  platform TEXT NOT NULL,
  content_type TEXT NOT NULL,
  virality_score INTEGER NOT NULL,
  virality_justification TEXT,
  monetization_strategy TEXT,
  video_format TEXT,
  hashtags TEXT[] NOT NULL,
  trend_analysis TEXT,
  region TEXT,
  channel_inspirations TEXT,
  user_id UUID NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Enable Row Level Security
ALTER TABLE public.video_ideas ENABLE ROW LEVEL SECURITY;

-- Create policy to let authenticated users read their own ideas
CREATE POLICY "Users can view their own ideas"
  ON public.video_ideas
  FOR SELECT
  USING (auth.uid() = user_id);

-- Create policy to let authenticated users insert their own ideas
CREATE POLICY "Users can insert their own ideas"
  ON public.video_ideas
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Create policy to let authenticated users update their own ideas
CREATE POLICY "Users can update their own ideas"
  ON public.video_ideas
  FOR UPDATE
  USING (auth.uid() = user_id);

-- Create policy to let authenticated users delete their own ideas
CREATE POLICY "Users can delete their own ideas"
  ON public.video_ideas
  FOR DELETE
  USING (auth.uid() = user_id);

-- Create an index on the user_id for faster lookups
CREATE INDEX IF NOT EXISTS video_ideas_user_id_idx ON public.video_ideas (user_id);

-- Create a trigger to update the updated_at timestamp
CREATE OR REPLACE FUNCTION public.trigger_set_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = timezone('utc'::text, now());
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create a trigger to call the function before an update
CREATE TRIGGER set_timestamp
BEFORE UPDATE ON public.video_ideas
FOR EACH ROW
EXECUTE FUNCTION public.trigger_set_timestamp(); 