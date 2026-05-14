import AuthForm from "../components/AuthForm";

export let metadata = {
  title: "Sign Up | Voice2Action",
};

export default function SignUpPage() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-[radial-gradient(circle_at_top,_rgba(59,130,246,0.16),_transparent_34%),linear-gradient(180deg,_#eff6ff,_#f8fafc_45%,_#eef2ff)] px-4 py-10">
      <AuthForm mode="signup" />
    </main>
  );
}
