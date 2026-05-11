"use client";

export type VideoCacheState = { status: "ready" };

export function useVideoCache(): VideoCacheState {
  return { status: "ready" };
}
