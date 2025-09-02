"use client";

import { useEffect } from "react";
import { getAnalyticsInstance } from "@/lib/firebase";

export function AnalyticsLoader() {
  useEffect(() => {
    getAnalyticsInstance().catch(() => undefined);
  }, []);
  return null;
}

