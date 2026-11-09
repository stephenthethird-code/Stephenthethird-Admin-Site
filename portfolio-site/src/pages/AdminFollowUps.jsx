/**
 * AdminFollowUps.jsx — /admin/followups
 * Standalone route — re-uses the FollowUpTracker embedded in AdminWhiteboard
 * but renders it directly in the shell for deep-linking.
 */
import AdminShell from "../components/admin/AdminShell";
import AdminWhiteboard from "./AdminWhiteboard";

// We re-export AdminWhiteboard but default to follow-ups tab via URL hash
export default function AdminFollowUps() {
  // Force the whiteboard to open on follow-ups tab
  if (typeof window !== "undefined") {
    window.__wbTab = "followups";
  }
  return <AdminWhiteboard />;
}
