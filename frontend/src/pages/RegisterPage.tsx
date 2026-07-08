import { RegisterForm } from "../components/RegisterForm/RegisterForm";

interface RegisterPageProps {
  onNavigateToLogin: () => void;
}

export function RegisterPage({ onNavigateToLogin }: RegisterPageProps) {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-6 bg-white p-4 text-center">
      <h1 className="text-3xl font-semibold text-slate-900">StudyFlow</h1>
      <RegisterForm onNavigateToLogin={onNavigateToLogin} />
    </main>
  );
}
