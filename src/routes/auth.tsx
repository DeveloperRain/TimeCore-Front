import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Fingerprint, Loader2 } from "lucide-react";
import { authStorage, timecoreApi } from "@/lib/api/timecore";

export const Route = createFileRoute("/auth")({
  head: () => ({
    meta: [
      { title: "Iniciar sesión — TimeCore" },
      {
        name: "description",
        content: "Accede a la consola TimeCore con tu cuenta.",
      },
    ],
  }),
  component: AuthPage,
});

function AuthPage() {
  const navigate = useNavigate();
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);

  useEffect(() => {
    if (authStorage.isAuthenticated()) {
      navigate({ to: "/" });
    }
  }, [navigate]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    setError(null);
    setInfo(null);
    setLoading(true);

    try {
      if (mode === "signin") {
        const res = await timecoreApi.login({
          email,
          password,
        });

        authStorage.saveSession(res.data);
        navigate({ to: "/" });
      } else {
        await timecoreApi.register({
          full_name: fullName,
          email,
          password,
        });

        setInfo("Cuenta creada. Ya puedes iniciar sesión.");
        setMode("signin");
        setPassword("");
      }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Error desconocido";

      if (message.includes("401")) {
        setError("Correo o contraseña incorrectos.");
      } else if (message.includes("409")) {
        setError("Ya existe una cuenta con ese correo.");
      } else {
        setError(message);
      }
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background px-4">
      <div className="w-full max-w-md">
        <div className="flex items-center justify-center gap-2 mb-8">
          <div className="h-10 w-10 rounded-md bg-primary flex items-center justify-center">
            <Fingerprint className="h-5 w-5 text-primary-foreground" />
          </div>

          <h1 className="text-2xl font-bold text-foreground">TimeCore</h1>
        </div>

        <div className="rounded-lg border border-border bg-card p-6 shadow-sm">
          <div className="flex gap-2 mb-6 p-1 rounded-md bg-muted">
            <button
              type="button"
              onClick={() => {
                setMode("signin");
                setError(null);
                setInfo(null);
              }}
              className={`flex-1 py-2 text-sm font-medium rounded ${
                mode === "signin" ? "bg-card shadow-sm" : "text-muted-foreground"
              }`}
            >
              Iniciar sesión
            </button>

            <button
              type="button"
              onClick={() => {
                setMode("signup");
                setError(null);
                setInfo(null);
              }}
              className={`flex-1 py-2 text-sm font-medium rounded ${
                mode === "signup" ? "bg-card shadow-sm" : "text-muted-foreground"
              }`}
            >
              Crear cuenta
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            {mode === "signup" && (
              <div>
                <label className="text-sm font-medium text-foreground">
                  Nombre completo
                </label>
                <input
                  type="text"
                  required
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  className="mt-1 w-full rounded-md border border-input bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary"
                />
              </div>
            )}

            <div>
              <label className="text-sm font-medium text-foreground">
                Correo
              </label>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="mt-1 w-full rounded-md border border-input bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary"
              />
            </div>

            <div>
              <label className="text-sm font-medium text-foreground">
                Contraseña
              </label>
              <input
                type="password"
                required
                minLength={6}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="mt-1 w-full rounded-md border border-input bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary"
              />
            </div>

            {error && <p className="text-sm text-destructive">{error}</p>}
            {info && <p className="text-sm text-primary">{info}</p>}

            <button
              type="submit"
              disabled={loading}
              className="w-full inline-flex items-center justify-center gap-2 rounded-md bg-primary py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-60"
            >
              {loading && <Loader2 className="h-4 w-4 animate-spin" />}
              {mode === "signin" ? "Entrar" : "Registrarme"}
            </button>
          </form>
        </div>

        <br />
        <br />

        <p className="text-xs text-center text-muted-foreground mt-6">
          Todos los derechos reservados.
        </p>
      </div>
    </div>
  );
}