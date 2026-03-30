import AdminDashboard from "@/components/AdminDashboard";
import { getPipelineStatus, getPendingTopics } from "@/lib/app-data";

export default async function AdminPage() {
  const [status, topics] = await Promise.all([getPipelineStatus(), getPendingTopics()]);

  return <AdminDashboard initialStatus={status} initialTopics={topics} />;
}

