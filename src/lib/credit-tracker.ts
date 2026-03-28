import { config } from "./config";
import { db } from "./db";

export interface CreditStatus {
  used: number;
  remaining: number;
  budget: number;
  percentUsed: number;
  episodeBreakdown: Array<{
    episodeId: string;
    topic: string;
    characters: number;
    status: string;
  }>;
}

export async function getCreditStatus(): Promise<CreditStatus> {
  const episodes = await db.episode.findMany({
    where: {
      charactersUsed: {
        gt: 0,
      },
    },
    select: {
      id: true,
      topicTitle: true,
      charactersUsed: true,
      status: true,
      createdAt: true,
    },
    orderBy: {
      createdAt: "desc",
    },
  });

  const used = episodes.reduce((sum, episode) => sum + episode.charactersUsed, 0);
  const budget = config.app.creditBudget;
  const remaining = Math.max(budget - used, 0);
  const percentUsed = budget === 0 ? 100 : Math.round((used / budget) * 100);

  return {
    used,
    remaining,
    budget,
    percentUsed,
    episodeBreakdown: episodes.map((episode) => ({
      episodeId: episode.id,
      topic: episode.topicTitle,
      characters: episode.charactersUsed,
      status: episode.status,
    })),
  };
}

export async function canAffordEpisode(
  estimatedCharacters: number,
): Promise<{ canAfford: boolean; status: CreditStatus }> {
  const status = await getCreditStatus();

  return {
    canAfford: status.remaining >= estimatedCharacters,
    status,
  };
}