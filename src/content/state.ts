import type { Root } from "react-dom/client";

type ContentState = {
  refreshTimer: ReturnType<typeof setTimeout> | null;
  lastUrl: string;
  lastMountedTitle: string;
  initialized: boolean;
  reactRoot: Root | null;
};

export const contentState: ContentState = {
  refreshTimer: null,
  lastUrl: window.location.href,
  lastMountedTitle: "",
  initialized: false,
  reactRoot: null,
};
