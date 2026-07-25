import { LoginForm } from "../components/LoginForm/LoginForm";

interface LoginPageProps {
  onNavigateToRegister: () => void;
}

export function LoginPage({ onNavigateToRegister }: LoginPageProps) {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-6 bg-white p-4 text-center">
      <h1 className="text-3xl font-semibold text-on-surface">StudyFlow</h1>
      <LoginForm onNavigateToRegister={onNavigateToRegister} />
    </main>
  );
}
