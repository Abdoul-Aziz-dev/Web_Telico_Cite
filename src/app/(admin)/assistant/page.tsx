"use client";
import { useEffect, useRef, useState } from "react";

type Message = { role: "user" | "assistant"; content: string };

const SUGGESTIONS = [
  "Combien de locataires sont en retard ce mois ?",
  "Rédige un message de relance pour un loyer impayé",
  "Quels sont les derniers paiements enregistrés ?",
  "Donne-moi des conseils pour améliorer le taux d'occupation",
  "Comment calculer la rentabilité de la résidence ?",
  "Rédige un contrat de bail type pour la Cité Telico",
];

export default function AssistantPage() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading]);

  async function sendMessage(content: string) {
    if (!content.trim() || loading) return;
    const userMsg: Message = { role: "user", content: content.trim() };
    const newMessages = [...messages, userMsg];
    setMessages(newMessages);
    setInput("");
    setLoading(true);
    setError(null);

    try {
      const res = await fetch("/api/admin/assistant", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ messages: newMessages }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Erreur");
      setMessages(prev => [...prev, { role: "assistant", content: data.reply }]);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Erreur inconnue");
    } finally {
      setLoading(false);
    }
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    sendMessage(input);
  }

  return (
    <main className="page">
      <div className="page-header">
        <div>
          <h1 className="page-title">🤖 Assistant IA</h1>
          <p className="page-subtitle">Posez vos questions sur la gestion de la Cité Telico. L'IA connaît vos données en temps réel.</p>
        </div>
        {messages.length > 0 && (
          <button className="btn btn-secondary" onClick={() => { setMessages([]); setError(null); }}>
            🗑️ Nouvelle conversation
          </button>
        )}
      </div>

      {/* Zone de chat */}
      <div className="panel" style={{ display: "flex", flexDirection: "column", minHeight: "500px", padding: 0, overflow: "hidden" }}>

        {/* Messages */}
        <div style={{ flex: 1, overflowY: "auto", padding: "24px", display: "flex", flexDirection: "column", gap: "16px" }}>

          {messages.length === 0 && (
            <div style={{ textAlign: "center", padding: "40px 20px" }}>
              <div style={{ fontSize: "3rem", marginBottom: "16px" }}>🤖</div>
              <p style={{ fontSize: "1.1rem", fontWeight: 600, marginBottom: "8px" }}>Bonjour ! Je suis votre assistant IA.</p>
              <p style={{ color: "#64748b", marginBottom: "32px" }}>Je connais les données de votre résidence en temps réel. Comment puis-je vous aider ?</p>
              <div style={{ display: "flex", flexWrap: "wrap", gap: "10px", justifyContent: "center" }}>
                {SUGGESTIONS.map((s, i) => (
                  <button
                    key={i}
                    className="btn btn-secondary"
                    onClick={() => sendMessage(s)}
                    style={{ fontSize: "0.82rem", padding: "8px 14px", borderRadius: "999px" }}
                  >
                    {s}
                  </button>
                ))}
              </div>
            </div>
          )}

          {messages.map((msg, i) => (
            <div key={i} style={{ display: "flex", justifyContent: msg.role === "user" ? "flex-end" : "flex-start" }}>
              <div style={{
                maxWidth: "75%",
                padding: "14px 18px",
                borderRadius: msg.role === "user" ? "20px 20px 4px 20px" : "20px 20px 20px 4px",
                background: msg.role === "user"
                  ? "linear-gradient(135deg, #38bdf8, #0ea5e9)"
                  : "rgba(255,255,255,0.05)",
                border: msg.role === "assistant" ? "1px solid rgba(255,255,255,0.08)" : "none",
                color: msg.role === "user" ? "#07101d" : "#e2e8f0",
                fontSize: "0.92rem",
                lineHeight: 1.6,
                whiteSpace: "pre-wrap",
              }}>
                {msg.role === "assistant" && (
                  <div style={{ fontSize: "0.75rem", color: "#64748b", marginBottom: "6px", fontWeight: 600 }}>🤖 Assistant Telico</div>
                )}
                {msg.content}
              </div>
            </div>
          ))}

          {loading && (
            <div style={{ display: "flex", justifyContent: "flex-start" }}>
              <div style={{ padding: "14px 18px", borderRadius: "20px 20px 20px 4px", background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.08)" }}>
                <div style={{ display: "flex", gap: "6px", alignItems: "center" }}>
                  {[0, 1, 2].map(j => (
                    <div key={j} style={{
                      width: "8px", height: "8px", borderRadius: "50%", background: "#38bdf8",
                      animation: "bounce 1.2s infinite",
                      animationDelay: `${j * 0.2}s`,
                    }} />
                  ))}
                </div>
              </div>
            </div>
          )}

          {error && (
            <div className="status-pill status-warning" style={{ borderRadius: "12px", justifyContent: "center" }}>
              ⚠️ {error}
            </div>
          )}

          <div ref={bottomRef} />
        </div>

        {/* Input */}
        <div style={{ borderTop: "1px solid rgba(255,255,255,0.06)", padding: "16px 24px" }}>
          <form onSubmit={handleSubmit} style={{ display: "flex", gap: "12px" }}>
            <input
              className="input"
              value={input}
              onChange={e => setInput(e.target.value)}
              placeholder="Posez votre question..."
              disabled={loading}
              style={{ flex: 1, borderRadius: "999px", padding: "12px 20px" }}
            />
            <button
              type="submit"
              className="btn btn-primary"
              disabled={loading || !input.trim()}
              style={{ borderRadius: "999px", padding: "12px 24px", opacity: (!input.trim() || loading) ? 0.5 : 1 }}
            >
              {loading ? "⏳" : "Envoyer ➤"}
            </button>
          </form>
        </div>
      </div>

      <style dangerouslySetInnerHTML={{ __html: `
        @keyframes bounce {
          0%, 80%, 100% { transform: translateY(0); }
          40% { transform: translateY(-8px); }
        }
      `}} />
    </main>
  );
}
