CREATE TABLE IF NOT EXISTS "Episode" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "episodeNumber" INTEGER NOT NULL,
    "topicTitle" TEXT NOT NULL,
    "scriptJson" TEXT NOT NULL,
    "audioUrl" TEXT,
    "audioSizeBytes" INTEGER,
    "durationSeconds" INTEGER,
    "showNotes" TEXT,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "charactersUsed" INTEGER NOT NULL DEFAULT 0,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "publishedAt" DATETIME
);

CREATE TABLE IF NOT EXISTS "Topic" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "votes" INTEGER NOT NULL DEFAULT 0,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "submittedByIp" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS "AudioAsset" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "type" TEXT NOT NULL,
    "promptHash" TEXT,
    "filePath" TEXT NOT NULL,
    "episodeId" TEXT,
    CONSTRAINT "AudioAsset_episodeId_fkey" FOREIGN KEY ("episodeId") REFERENCES "Episode" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

CREATE UNIQUE INDEX IF NOT EXISTS "Episode_episodeNumber_key" ON "Episode"("episodeNumber");
CREATE INDEX IF NOT EXISTS "AudioAsset_episodeId_idx" ON "AudioAsset"("episodeId");
