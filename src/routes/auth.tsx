import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Eye, EyeOff, Loader2 } from "lucide-react";
import { authStorage, timecoreApi } from "@/lib/api/timecore";
import timeCoreLogo from "@/imgs/TIMECORE_LOGO_Blanco.png";

export const Route = createFileRoute("/auth")({
  head: () => ({
    meta: [
      { title: "Iniciar sesión — TimeCore" },
      {
        name: "description",
        content: "Accede a TimeCore con tu cuenta.",
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
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);

  useEffect(() => {
    if (authStorage.isAuthenticated()) {
      navigate({
        to: "/",
        search: {
          branch_id: undefined,
        },
      });
    }
  }, [navigate]);

  function changeMode(nextMode: "signin" | "signup") {
    setMode(nextMode);
    setError(null);
    setInfo(null);
    setShowPassword(false);

    if (nextMode === "signup") {
      setFullName("");
      setEmail("");
      setPassword("");
    }
  }

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

        navigate({
          to: "/",
          search: {
            branch_id: undefined,
          },
        });
      } else {
        await timecoreApi.register({
          full_name: fullName,
          email,
          password,
        });

        setInfo("Cuenta creada. Ya puedes iniciar sesión.");
        setMode("signin");
        setFullName("");
        setEmail("");
        setPassword("");
        setShowPassword(false);
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
            <img
              src={timeCoreLogo}
              alt="TimeCore"
              className="h-9 w-9 object-contain"
            />
          </div>

          <h1 className="text-2xl font-bold text-foreground">TimeCore</h1>
        </div>

        <div className="rounded-lg border border-border bg-card p-6 shadow-sm">
          <div className="flex gap-2 mb-6 p-1 rounded-md bg-muted">
            <button
              type="button"
              onClick={() => changeMode("signin")}
              className={`flex-1 py-2 text-sm font-medium rounded ${
                mode === "signin"
                  ? "bg-card shadow-sm"
                  : "text-muted-foreground"
              }`}
            >
              Iniciar sesión
            </button>

            <button
              type="button"
              onClick={() => changeMode("signup")}
              className={`flex-1 py-2 text-sm font-medium rounded ${
                mode === "signup"
                  ? "bg-card shadow-sm"
                  : "text-muted-foreground"
              }`}
            >
              Crear cuenta
            </button>
          </div>

          <form
            key={mode}
            onSubmit={handleSubmit}
            className="space-y-4"
            autoComplete={mode === "signup" ? "off" : "on"}
          >
            {mode === "signup" && (
              <div>
                <label className="text-sm font-medium text-foreground">
                  Nombre completo
                </label>

                <input
                  type="text"
                  required
                  name="timecore-new-full-name"
                  autoComplete="name"
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
                name={
                  mode === "signup"
                    ? "timecore-new-account-email"
                    : "timecore-login-email"
                }
                autoComplete={mode === "signup" ? "off" : "username"}
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="mt-1 w-full rounded-md border border-input bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary"
              />
            </div>

            <div>
              <label className="text-sm font-medium text-foreground">
                Contraseña
              </label>

              <div className="relative mt-1">
                <input
                  type={showPassword ? "text" : "password"}
                  required
                  minLength={6}
                  name={
                    mode === "signup"
                      ? "timecore-new-account-password"
                      : "timecore-login-password"
                  }
                  autoComplete={
                    mode === "signup" ? "new-password" : "current-password"
                  }
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full rounded-md border border-input bg-background px-3 py-2 pr-10 text-sm outline-none focus:ring-2 focus:ring-primary"
                />

                <button
                  type="button"
                  onClick={() => setShowPassword((value) => !value)}
                  className="absolute inset-y-0 right-0 flex items-center px-3 text-muted-foreground hover:text-foreground"
                  aria-label={
                    showPassword ? "Ocultar contraseña" : "Mostrar contraseña"
                  }
                >
                  {showPassword ? (
                    <EyeOff className="h-4 w-4" />
                  ) : (
                    <Eye className="h-4 w-4" />
                  )}
                </button>
              </div>
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