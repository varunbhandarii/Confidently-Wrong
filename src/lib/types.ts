export type EpisodeStatus =
  | "pending"
  | "scripting"
  | "synthesizing"
  | "mixing"
  | "published"
  | "failed";

export type TopicStatus = "pending" | "selected" | "used";

export type AudioAssetType = "dialogue" | "jingle" | "sfx" | "transition";

export type Speaker = "chad" | "marina";

export type EmotionTag =
  | "confident"
  | "excited"
  | "ominous"
  | "confused"
  | "laughing"
  | "interrupting";

export interface VoiceSettings {
  stability: number;
  similarityBoost: number;
  style: number;
}

export interface DialogueTurn {
  speaker: Speaker;
  text: string;
  emotion: EmotionTag;
  stage_direction?: string;
}

export interface FakeSponsor {
  name: string;
  tagline: string;
  read: string;
}

export interface PodcastScript {
  topic: string;
  episode_title: string;
  intro_banter: DialogueTurn[];
  main_discussion: DialogueTurn[];
  hot_takes: DialogueTurn[];
  outro: DialogueTurn[];
  fake_sponsor: FakeSponsor;
  show_notes: string;
}

export interface ScriptCharacterBudget {
  total: number;
  bySpeaker: Record<Speaker, number>;
  bySection: Record<string, number>;
}

export const EMOTION_VOICE_MAP: Record<EmotionTag, VoiceSettings> = {
  confident: { stability: 0.7, similarityBoost: 0.8, style: 0 },
  excited: { stability: 0.3, similarityBoost: 0.7, style: 0.3 },
  ominous: { stability: 0.8, similarityBoost: 0.9, style: 0.1 },
  confused: { stability: 0.4, similarityBoost: 0.6, style: 0 },
  laughing: { stability: 0.2, similarityBoost: 0.5, style: 0.5 },
  interrupting: { stability: 0.3, similarityBoost: 0.7, style: 0.2 },
};
