"use client";

export default function TestSidebarPage() {
  return (
    <main style={{ padding: 24 }}>
      <h1>Test du défilement</h1>
      <p>Cette page sert à vérifier que la barre latérale et le contenu principal défilent indépendamment.</p>
      <div style={{ height: 1200, background: 'linear-gradient(#0f172a,#020617)', borderRadius: 12, marginTop: 20, padding: 16 }}>
        <h2 style={{ color: '#cbd5e1' }}>Contenu principal très long</h2>
        <p style={{ color: '#94a3b8' }}>Faites défiler cette zone pour tester le scroll de la zone principale.</p>
        <p style={{ color: '#94a3b8' }}>Lorem ipsum dolor sit amet, consectetur adipiscing elit. Integer nec odio. Praesent libero. Sed cursus ante dapibus diam.</p>
        <p style={{ color: '#94a3b8' }}>Sed nisi. Nulla quis sem at nibh elementum imperdiet. Duis sagittis ipsum. Praesent mauris.</p>
        <p style={{ color: '#94a3b8' }}>Fusce nec tellus sed augue semper porta. Mauris massa. Vestibulum lacinia arcu eget nulla.</p>
      </div>
    </main>
  );
}
