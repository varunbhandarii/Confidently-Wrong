import type { DialogueTurn, PodcastScript, Speaker } from "./types";

export interface FlattenedAudioTurn extends DialogueTurn {
  turnIndex: number;
  section: "intro_banter" | "main_discussion" | "hot_takes" | "sponsor_read" | "outro";
}

export interface AudioSectionBoundaries {
  introEnd: number;
  mainEnd: number;
  hotTakesEnd: number;
}

export function createSponsorTurn(script: PodcastScript): DialogueTurn | null {
  const sponsorRead = script.fake_sponsor.read.trim();

  if (!sponsorRead) {
    return null;
  }

  const explicitSpeakerMatch = sponsorRead.match(/^(chad|marina)\s*[:\-]\s*(.+)$/i);

  if (explicitSpeakerMatch) {
    const speaker = explicitSpeakerMatch[1].toLowerCase() as Speaker;
    const text = explicitSpeakerMatch[2].trim();

    return {
      speaker,
      text,
      emotion: speaker === "marina" ? "ominous" : "confident",
      stage_direction: `[sponsor read: ${script.fake_sponsor.name}]`,
    };
  }

  return {
    speaker: "chad",
    text: sponsorRead,
    emotion: "confident",
    stage_direction: `[sponsor read: ${script.fake_sponsor.name}]`,
  };
}

export function getAudioSectionBoundaries(script: PodcastScript): AudioSectionBoundaries {
  return {
    introEnd: script.intro_banter.length,
    mainEnd: script.intro_banter.length + script.main_discussion.length,
    hotTakesEnd: script.intro_banter.length + script.main_discussion.length + script.hot_takes.length,
  };
}

export function flattenScriptForAudio(script: PodcastScript): FlattenedAudioTurn[] {
  const flattened: FlattenedAudioTurn[] = [];
  let turnIndex = 0;

  const pushSection = (
    section: FlattenedAudioTurn["section"],
    turns: DialogueTurn[],
  ) => {
    for (const turn of turns) {
      flattened.push({
        ...turn,
        turnIndex,
        section,
      });
      turnIndex += 1;
    }
  };

  pushSection("intro_banter", script.intro_banter);
  pushSection("main_discussion", script.main_discussion);
  pushSection("hot_takes", script.hot_takes);

  const sponsorTurn = createSponsorTurn(script);
  if (sponsorTurn) {
    pushSection("sponsor_read", [sponsorTurn]);
  }

  pushSection("outro", script.outro);

  return flattened;
}
