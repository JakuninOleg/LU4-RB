import { LoginForm } from "@/components/login-form";
import { ThemeToggle } from "@/components/theme-toggle";

export default function LoginPage() {
  return (
    <main className="relative flex flex-1 flex-col items-center justify-center gap-8 p-6">
      <div className="absolute top-4 right-4">
        <ThemeToggle />
      </div>
      <div className="flex flex-col items-center gap-2 text-center">
        <h1 className="font-heading text-5xl font-semibold tracking-wide md:text-6xl">
          LU4-RB
        </h1>
        <p className="text-muted-foreground text-lg">
          Трекер респауна рейд-боссов для клана
        </p>
      </div>
      <div className="w-full max-w-md">
        <LoginForm />
      </div>
    </main>
  );
}
