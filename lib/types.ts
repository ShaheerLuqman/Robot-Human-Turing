export type VideoLabel = "human" | "robot";

export type TrialPayload = {
  id: string;
  url: string;
};

export type VideoRecord = {
  id: string;
  url: string;
  label: VideoLabel;
};
