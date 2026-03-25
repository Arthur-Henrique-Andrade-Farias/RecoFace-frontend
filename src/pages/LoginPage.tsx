import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { ShieldCheckIcon, EyeIcon, EyeSlashIcon } from "@heroicons/react/24/outline";

export default function LoginPage() {
  const { login } = useAuth();
  const navigate = useNavigate();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      await login(email, password);
      navigate("/dashboard");
    } catch (err: any) {
      const detail = err.response?.data?.detail;
      if (typeof detail === "string") {
        setError(detail);
      } else if (Array.isArray(detail)) {
        setError(detail.map((d: any) => d.msg).join(", "));
      } else {
        setError("Email ou senha incorretos");
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex">
      {/* Left panel – branding */}
      <div className="hidden lg:flex flex-col justify-between w-1/2 bg-navy-600 p-12 text-white">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-blue-400 rounded-xl flex items-center justify-center">
            <ShieldCheckIcon className="w-6 h-6 text-white" />
          </div>
          <span className="text-2xl font-bold">RecoFace</span>
        </div>

        <div>
          <h2 className="text-4xl font-bold leading-tight mb-4">
            Segurança inteligente<br />para sua escola
          </h2>
          <p className="text-navy-200 text-lg leading-relaxed">
            Reconhecimento facial em tempo real para controle de acesso,
            monitoramento e segurança escolar — preciso, rápido e confiável.
          </p>
          <div className="mt-8 grid grid-cols-3 gap-6">
            {[
              { value: "99%", label: "Precisão" },
              { value: "<1s", label: "Resposta" },
              { value: "24/7", label: "Monitoramento" },
            ].map(({ value, label }) => (
              <div key={label} className="text-center">
                <p className="text-3xl font-bold text-blue-300">{value}</p>
                <p className="text-sm text-navy-200 mt-1">{label}</p>
              </div>
            ))}
          </div>
        </div>

        <p className="text-xs text-navy-300">
          © {new Date().getFullYear()} RecoFace. Todos os direitos reservados.
        </p>
      </div>

      {/* Right panel – login form */}
      <div className="flex-1 flex items-center justify-center p-8 bg-slate-50">
        <div className="w-full max-w-md">
          {/* Mobile logo */}
          <div className="lg:hidden flex items-center gap-3 mb-8 justify-center">
            <div className="w-10 h-10 bg-navy-600 rounded-xl flex items-center justify-center">
              <ShieldCheckIcon className="w-6 h-6 text-white" />
            </div>
            <span className="text-2xl font-bold text-navy-600">RecoFace</span>
          </div>

          <div className="card">
            <div className="mb-6">
              <h1 className="text-2xl font-bold text-slate-800">Entrar</h1>
              <p className="text-slate-500 text-sm mt-1">
                Acesse o painel de controle
              </p>
            </div>

            {error && (
              <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
                {error}
              </div>
            )}

            <form onSubmit={handleLogin} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Email
                </label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="input-field"
                  placeholder="seu@email.com"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Senha
                </label>
                <div className="relative">
                  <input
                    type={showPassword ? "text" : "password"}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="input-field pr-10"
                    placeholder="••••••••"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                  >
                    {showPassword ? (
                      <EyeSlashIcon className="w-4 h-4" />
                    ) : (
                      <EyeIcon className="w-4 h-4" />
                    )}
                  </button>
                </div>
              </div>
              <button type="submit" disabled={loading} className="btn-primary w-full py-2.5">
                {loading ? "Entrando..." : "Entrar"}
              </button>
            </form>

            <p className="mt-4 pt-4 border-t border-slate-100 text-center text-xs text-slate-400">
              Solicite seu acesso ao administrador do sistema
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
