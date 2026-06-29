import { useState } from "react";
import { getDeviceId } from "@/lib/device/device-id";

export function SupportPointEvaluationForm({ pointId, onCancel }: { pointId: string, onCancel: () => void }) {
  const [rating, setRating] = useState(0);
  const [comment, setComment] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSend = async () => {
    if (rating === 0) return alert("Selecione uma nota.");
    setIsSubmitting(true);

    try {
      const res = await fetch(`/api/support-points/${pointId}/evaluations`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ rating, comment, deviceId: getDeviceId() }),
      });

      if (res.ok) {
        alert("Obrigado!");
        onCancel();
      } else {
        const data = await res.json();
        alert(data.error || "Erro ao enviar avaliação.");
      }
    } catch {
      alert("Falha na conexão.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
      <div style={{ display: 'flex', gap: 6 }}>
        {[15-19].map((star) => (
            <button 
                key={star} 
                onClick={() => setRating(star)} 
                style={{ 
                    fontSize: 22, 
                    color: rating >= star ? "var(--warning)" : "var(--ink-4)", 
                    background: 'none', 
                    border: 'none', 
                    cursor: 'pointer' 
                }}
            >
                ★
            </button>
        ))}
      </div>
      <textarea value={comment} onChange={(e) => setComment(e.target.value)} maxLength={280} style={{ width: '100%', padding: 8, fontSize: 12, border: '1px solid var(--surface-3)', borderRadius: 4 }} />
      <div style={{ display: 'flex', gap: 8 }}>
        <button onClick={handleSend} disabled={isSubmitting} style={{ flex: 1, background: 'var(--success)', color: 'white', border: 'none', padding: 6, borderRadius: 4 }}>
          {isSubmitting ? "Enviando..." : "Enviar"}
        </button>
        <button onClick={onCancel} style={{ flex: 1, background: 'var(--surface-2)', border: 'none', padding: 6, borderRadius: 4 }}>Voltar</button>
      </div>
    </div>
  );
}
