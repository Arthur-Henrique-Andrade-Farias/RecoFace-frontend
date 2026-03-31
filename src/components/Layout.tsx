import React, { useState } from "react";
import { Outlet, NavLink, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import {
  HomeIcon,
  VideoCameraIcon,
  UsersIcon,
  ClipboardDocumentListIcon,
  ArrowRightOnRectangleIcon,
  Bars3Icon,
  ShieldCheckIcon,
  UserGroupIcon,
  Cog6ToothIcon,
  DocumentChartBarIcon,
} from "@heroicons/react/24/outline";

const ROLE_LABELS: Record<string, string> = {
  admin: "Administrador",
  gerente: "Gerente",
  configurador: "Configurador",
  visualizador: "Visualizador",
};

const ROLE_COLORS: Record<string, string> = {
  admin: "bg-red-500",
  gerente: "bg-purple-500",
  configurador: "bg-yellow-500",
  visualizador: "bg-blue-400",
};

export default function Layout() {
  const { user, logout, branding } = useAuth();
  const logoUrl = branding.brand_logo_url
    ? `${process.env.REACT_APP_API_URL || "http://localhost:8000"}${branding.brand_logo_url}`
    : null;
  const navigate = useNavigate();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const handleLogout = () => {
    logout();
    navigate("/login");
  };

  const role = user?.role ?? "porteiro";

  // Build nav items based on role
  const navItems = [
    { to: "/dashboard", label: "Painel", Icon: HomeIcon },
    { to: "/cameras", label: "Câmeras", Icon: VideoCameraIcon },
    // Persons: admin & vigia
    ...(role === "admin" || role === "configurador"
      ? [{ to: "/persons", label: "Pessoas", Icon: UsersIcon }]
      : []),
    { to: "/logs", label: "Logs", Icon: ClipboardDocumentListIcon },
    // Admin + gerente
    ...(role === "admin" || role === "gerente"
      ? [
          { to: "/reports", label: "Relatórios", Icon: DocumentChartBarIcon },
          { to: "/settings", label: "Configurações", Icon: Cog6ToothIcon },
          { to: "/users", label: "Usuários", Icon: UserGroupIcon },
        ]
      : []),
  ];

  const Sidebar = ({ mobile = false }) => (
    <div
      className={`flex flex-col h-full bg-navy-600 text-white ${
        mobile ? "w-72" : "w-64"
      }`}
    >
      {/* Logo */}
      <div className="flex items-center gap-3 px-6 py-6 border-b border-navy-500">
        {logoUrl ? (
          <img src={logoUrl} alt="" className="w-10 h-10 rounded-xl object-cover flex-shrink-0" />
        ) : (
          <div className="w-10 h-10 bg-blue-400 rounded-xl flex items-center justify-center flex-shrink-0">
            <ShieldCheckIcon className="w-6 h-6 text-white" />
          </div>
        )}
        <div>
          <h1 className="text-xl font-bold tracking-tight">{branding.brand_name}</h1>
          <p className="text-xs text-navy-200 font-medium">{branding.brand_subtitle}</p>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 px-3 py-4 space-y-1">
        {navItems.map(({ to, label, Icon }) => (
          <NavLink
            key={to}
            to={to}
            onClick={() => setSidebarOpen(false)}
            className={({ isActive }) =>
              `flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                isActive
                  ? "bg-blue-500 text-white"
                  : "text-navy-100 hover:bg-navy-500 hover:text-white"
              }`
            }
          >
            <Icon className="w-5 h-5 flex-shrink-0" />
            {label}
          </NavLink>
        ))}
      </nav>

      {/* User */}
      <div className="px-4 py-4 border-t border-navy-500">
        <div className="flex items-center gap-3 mb-3">
          <div className="w-8 h-8 bg-blue-400 rounded-full flex items-center justify-center text-sm font-bold">
            {user?.name?.charAt(0).toUpperCase() || "U"}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold truncate">{user?.name}</p>
            <div className="flex items-center gap-1.5">
              <span className={`w-1.5 h-1.5 rounded-full ${ROLE_COLORS[role]}`} />
              <p className="text-xs text-navy-200">{ROLE_LABELS[role]}</p>
            </div>
          </div>
        </div>
        <button
          onClick={handleLogout}
          className="flex items-center gap-2 w-full px-3 py-2 text-sm text-navy-200 hover:text-white hover:bg-navy-500 rounded-lg transition-colors"
        >
          <ArrowRightOnRectangleIcon className="w-4 h-4" />
          Sair
        </button>
      </div>
    </div>
  );

  return (
    <div className="flex h-screen overflow-hidden">
      {/* Desktop sidebar */}
      <aside className="hidden lg:flex flex-col flex-shrink-0">
        <Sidebar />
      </aside>

      {/* Mobile sidebar overlay */}
      {sidebarOpen && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div
            className="absolute inset-0 bg-black/50"
            onClick={() => setSidebarOpen(false)}
          />
          <div className="absolute left-0 top-0 h-full z-10">
            <Sidebar mobile />
          </div>
        </div>
      )}

      {/* Main content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Mobile topbar */}
        <header className="lg:hidden flex items-center gap-3 px-4 py-3 bg-navy-600 text-white">
          <button onClick={() => setSidebarOpen(true)}>
            <Bars3Icon className="w-6 h-6" />
          </button>
          <span className="font-bold text-lg">{branding.brand_name}</span>
        </header>

        <main className="flex-1 overflow-y-auto bg-slate-50">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
