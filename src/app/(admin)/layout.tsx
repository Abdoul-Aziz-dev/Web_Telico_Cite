"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<{ nom: string; prenom: string; role: string } | null>(null);
  const [theme, setTheme] = useState<"dark" | "light">("dark");
  const [sidebarOpen, setSidebarOpen] = useState(false);

  useEffect(() => {
    const savedTheme = localStorage.getItem("site_theme") as "dark" | "light" | null;
    if (savedTheme) {
      setTheme(savedTheme);
    }
  }, []);

  const toggleTheme = () => {
    const newTheme = theme === "dark" ? "light" : "dark";
    setTheme(newTheme);
    localStorage.setItem("site_theme", newTheme);
  };

  // Fermer la sidebar à chaque changement de page
  useEffect(() => {
    setSidebarOpen(false);
  }, [pathname]);

  useEffect(() => {
    let isMounted = true;
    async function checkAuth() {
      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 3000);
        const res = await fetch("/api/auth/me", { signal: controller.signal });
        clearTimeout(timeoutId);
        if (!res.ok) throw new Error("Auth error");
        const data = await res.json();
        if (isMounted) {
          if (!data.user || data.user.role !== "gerant") {
            router.push("/login");
          } else {
            setUser(data.user);
            setLoading(false);
          }
        }
      } catch {
        if (isMounted) {
          router.push("/login");
        }
      }
    }
    checkAuth();
    return () => {
      isMounted = false;
    };
  }, [router]);

  async function handleLogout() {
    try {
      await fetch("/api/auth/logout", { method: "POST" });
      router.push("/login");
    } catch (err) {
      console.error("Erreur de déconnexion", err);
    }
  }

  const menuGroups = [
    {
      label: "Gestion",
      items: [
        { href: "/dashboard", label: "Tableau de bord", icon: "🏠" },
        { href: "/clients", label: "Locataires", icon: "👥" },
        { href: "/chambres", label: "Chambres", icon: "🛏️" },
        { href: "/contrats", label: "Contrats", icon: "📝" },
        { href: "/retards", label: "Loyers en retard", icon: "⚠️" },
      ],
    },
    {
      label: "Finance",
      items: [
        { href: "/paiements", label: "Paiements", icon: "💳" },
        { href: "/depenses", label: "Dépenses", icon: "📉" },
        { href: "/clotures", label: "Clôtures", icon: "📊" },
      ],
    },
    {
      label: "Administration",
      items: [
        { href: "/contacts", label: "Demandes Contact", icon: "📬" },
        { href: "/utilisateurs", label: "Utilisateurs", icon: "👤" },
        { href: "/audit", label: "Journal Audit", icon: "🔍" },
        { href: "/recherche", label: "Recherche globale", icon: "🔎" },
        { href: "/assistant", label: "Assistant IA", icon: "🤖" },
        { href: "/parametres", label: "Paramètres", icon: "⚙️" },
      ],
    },
  ];
  const menuItems = menuGroups.flatMap(g => g.items);

  if (loading) {
    return (
      <div style={{
        minHeight: "100vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        flexDirection: "column",
        gap: "16px",
        background: "#050b14",
        color: "#e2e8f0"
      }}>
        <div style={{
          width: "40px",
          height: "40px",
          border: "4px solid rgba(56, 189, 248, 0.2)",
          borderTopColor: "#38bdf8",
          borderRadius: "50%",
          animation: "spin 1s linear infinite"
        }} />
        <p style={{ color: "#94a3b8" }}>Vérification de l'accès sécurisé...</p>
        <style dangerouslySetInnerHTML={{ __html: `
          @keyframes spin {
            to { transform: rotate(360deg); }
          }
        `}} />
      </div>
    );
  }

  return (
    <div className={`admin-shell ${theme === "light" ? "light-mode" : ""}`}>
      {/* Overlay mobile */}
      <div
        className={`sidebar-overlay ${sidebarOpen ? "visible" : ""}`}
        onClick={() => setSidebarOpen(false)}
      />
      {/* Sidebar de navigation */}
      <aside className={`admin-sidebar ${sidebarOpen ? "open" : ""}`}>
        <div className="brand">
          <img src="/logo.png" alt="Cité Telico Logo" className="brand-logo-img" />
          <div className="brand-texts">
            <span className="brand-name-large">Cité Telico</span>
            <span className="brand-status-badge">Espace Gestion</span>
          </div>
        </div>

        <nav className="sidebar-nav">
          {menuGroups.map(group => (
            <div key={group.label}>
              <div style={{ fontSize: "0.68rem", fontWeight: 700, color: "#334155", textTransform: "uppercase", letterSpacing: "0.1em", padding: "14px 18px 6px" }}>
                {group.label}
              </div>
              {group.items.map(item => {
                const isActive = pathname === item.href || pathname.startsWith(item.href + "/");
                return (
                  <Link key={item.href} href={item.href} className={`sidebar-link ${isActive ? "active" : ""}`}>
                    <span className="sidebar-link-icon">{item.icon}</span>
                    <span className="sidebar-link-label">{item.label}</span>
                  </Link>
                );
              })}
            </div>
          ))}
        </nav>

        <div className="sidebar-footer" style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
          <button onClick={handleLogout} className="btn btn-sm btn-danger back-to-public-btn" style={{ padding: "10px" }}>
            ❌ Déconnexion
          </button>
          <Link href="/" className="btn btn-secondary back-to-public-btn">
            ⬅ Retour au site
          </Link>
        </div>
      </aside>

      {/* Zone de contenu principale de l'administration */}
      <div className="admin-main">
        <header className="admin-topbar">
          <button
            className="hamburger-btn"
            onClick={() => setSidebarOpen(prev => !prev)}
            aria-label="Ouvrir le menu"
          >
            ☰
          </button>
          <div className="admin-breadcrumb">
            Gestion immobilière &gt; {menuItems.find((item) => item.href === pathname)?.label || "Administration"}
          </div>
          <div className="admin-profile" style={{ gap: "16px" }}>
            <button
              onClick={toggleTheme}
              className="btn btn-secondary"
              style={{
                padding: "6px 14px",
                borderRadius: "20px",
                fontSize: "0.85rem",
                display: "flex",
                alignItems: "center",
                gap: "6px",
                background: theme === "light" ? "rgba(0, 0, 0, 0.05)" : "rgba(255, 255, 255, 0.08)",
                border: "1px solid rgba(255, 255, 255, 0.15)",
              }}
              title={theme === "dark" ? "Passer au Mode Clair" : "Passer au Mode Sombre"}
            >
              {theme === "dark" ? "🌙 Sombre" : "☀️ Clair"}
            </button>
            <span className="profile-role">{user ? `${user.prenom} ${user.nom}` : "Gérant Connecté"}</span>
            <div className="profile-avatar">👤</div>
          </div>
        </header>

        <main className="admin-page-content">
          {children}
        </main>
      </div>
    </div>
  );
}
