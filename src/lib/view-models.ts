export interface SponsorSummary {
  name: string;
  tagline: string;
}

export interface PublicEpisodeSummary {
  id: string;
  episodeNumber: number;
  title: string;
  topicTitle: string;
  audioUrl: string | null;
  memeUrl: string | null;
  durationSeconds: number | null;
  audioSizeBytes: number | null;
  showNotes: string;
  sponsor: SponsorSummary | null;
  publishedAt: string | null;
  status: string;
}

export interface PublicTopicSummary {
  id: string;
  title: string;
  description: string | null;
  votes: number;
  status: string;
  createdAt: string;
}

export interface PipelineEpisodeSummary {
  id: string;
  episodeNumber: number;
  title: string;
  topicTitle: string;
  status: string;
  audioUrl: string | null;
  durationSeconds: number | null;
  publishedAt: string | null;
  createdAt: string;
  charactersUsed: number;
}

export interface CreditBreakdownEntry {
  episodeId: string;
  topic: string;
  characters: number;
  status: string;
}

export interface CreditStatusSnapshot {
  used: number;
  remaining: number;
  budget: number;
  percentUsed: number;
  episodeBreakdown: CreditBreakdownEntry[];
}

export interface CacheStatusSnapshot {
  sfx: number;
  jingles: number;
  transitions: number;
  totalSizeBytes: number;
}

export interface PipelineStatusSnapshot {
  generating: {
    id: string;
    episodeNumber: number;
    topicTitle: string;
    status: string;
    createdAt: string;
  } | null;
  publishedCount: number;
  pendingTopics: number;
  pendingPublishCount: number;
  credits: CreditStatusSnapshot;
  cache: CacheStatusSnapshot;
  recentEpisodes: PipelineEpisodeSummary[];
}
