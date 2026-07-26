import { LoginForm } from "../components/LoginForm/LoginForm";

interface LoginPageProps {
  onNavigateToRegister: () => void;
}

export function LoginPage({ onNavigateToRegister }: LoginPageProps) {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-lg bg-gradient-to-b from-surface-container-low to-background p-md">
      <div className="flex flex-col items-center gap-xs">
        <span className="font-display text-display-lg text-primary">StudyFlow</span>
        <p className="text-body-md text-on-surface-variant">Tu asistente de planificación académica</p>
      </div>
      <LoginForm onNavigateToRegister={onNavigateToRegister} />
    </main>
  );
}
