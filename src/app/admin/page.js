import { redirect } from "next/navigation";
import AdminClientWrapper from "../components/AdminClientWrapper";
import { getCurrentUser } from "@/lib/auth";

export let metadata = {
  title: "Dashboard | Voice2Action",
};

export default async function AdminPage() {
  let currentUser = await getCurrentUser();

  if (currentUser?.role !== "admin") {
    redirect("/admin/login");
  }

  return <AdminClientWrapper adminUser={currentUser} />;
}
