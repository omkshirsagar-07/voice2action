import { redirect } from "next/navigation";
import AdminLoginForm from "@/app/components/AdminLoginForm";
import { getCurrentUser } from "@/lib/auth";

export let metadata = {
  title: "Admin Login | Voice2Action",
};

export default async function AdminLoginPage() {
  let currentUser = await getCurrentUser();

  if (currentUser?.role === "admin") {
    redirect("/admin");
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-[radial-gradient(circle_at_top,_rgba(16,185,129,0.18),_transparent_34%),linear-gradient(180deg,_#ecfdf5,_#f8fafc_45%,_#ecfeff)] px-4 py-10">
      <AdminLoginForm />
    </main>
  );
}
