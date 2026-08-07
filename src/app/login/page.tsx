import { LoginForm } from "@/components/login-form";

export default function LoginPage() {
  return (
    <main className="relative flex flex-1 flex-col items-center justify-center gap-8 overflow-hidden p-6">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 opacity-40"
        style={{
          backgroundImage:
            "radial-gradient(circle at 20% 20%, oklch(0.45 0.08 75 / 20%), transparent 35%), radial-gradient(circle at 80% 70%, oklch(0.35 0.05 40 / 25%), transparent 40%)",
        }}
      />
      <div className="relative flex flex-col items-center gap-3 text-center">
        <p className="text-gold font-heading text-sm tracking-[0.35em] uppercase">
          Lineage 2 · LU4
        </p>
        <h1 className="font-heading brand-glow text-5xl font-semibold tracking-wide md:text-6xl">
          LU4-RB
        </h1>
        <p className="text-muted-foreground max-w-sm text-sm md:text-base">
          Трекер респауна рейд-боссов для клана
        </p>
      </div>
      <div className="relative w-full max-w-sm">
        <LoginForm />
      </div>
    </main>
  );
}
