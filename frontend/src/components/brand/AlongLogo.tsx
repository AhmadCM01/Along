import React from "react";
import { Wordmark, WordmarkProps } from "./Wordmark";

export interface AlongLogoProps extends WordmarkProps {
  variant?: "dark" | "emerald" | "light";
}

/**
 * AlongLogo adapter wrapping the unified Wordmark.
 */
export function AlongLogo({
  size = "md",
  showTagline = false,
  className = "",
}: AlongLogoProps) {
  return <Wordmark size={size} showTagline={showTagline} className={className} />;
}
