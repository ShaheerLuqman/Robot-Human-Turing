export type VideoLabel = "human" | "robot";

export type TrialVideo = {
  id: string;
  url: string;
};

export type TrialPayload = {
  left: TrialVideo;
  right: TrialVideo;
};

export type VideoRecord = {
  id: string;
  url: string;
  label: VideoLabel;
  method: string;
  environment: string;
};
