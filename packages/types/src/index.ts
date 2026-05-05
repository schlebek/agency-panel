export type Plan = "trial" | "starter" | "pro" | "enterprise";
export type UserRole = "owner" | "admin" | "member";
export type ReportStatus = "draft" | "generating" | "ready" | "sent" | "failed";
export type NoteType = "optimization" | "text" | "brief" | "link_building" | "technical" | "other";

export interface ApiResponse<T> {
  data?: T;
  error?: string;
}
