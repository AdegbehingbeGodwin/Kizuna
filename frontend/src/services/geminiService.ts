import { apiFetch } from "./api";

export const getAnalyticsSummary = async (stats: unknown): Promise<string> => {
  try {
    const response = await apiFetch("/insights", {
      method: "POST",
      body: JSON.stringify({ stats }),
    });
    const data = await response.json();
    return data.summary || "Keep up the good work. Consistent follow-up improves continuity of care.";
  } catch {
    return "AI insights are temporarily unavailable.";
  }
};
