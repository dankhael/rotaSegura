import { LoginHeader } from "../../components/login/login-header";
import { LoginForm } from "../../components/login/login-form";

export default function LoginPage() {
  return (
    <main className="min-h-screen flex items-center justify-center px-4 py-10">
      <div
        className="
          w-full
          max-w-md
          rounded-3xl
          border
          border-white/10
          bg-white/5
          backdrop-blur-md
          shadow-2xl
          p-8
        "
      >
        <LoginHeader />

        <LoginForm />
      </div>
    </main>
  );
}
