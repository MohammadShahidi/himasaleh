'use client';

import { Icon } from '@/components/icon';
import { openConsult } from '@/lib/site';

export function ConsultButton({ topic, ctx, label = 'درخواست مشاوره' }: { topic?: string; ctx?: string; label?: string }) {
  return (
    <button data-btn="" onClick={() => openConsult({ ...(topic ? { topic } : {}), ...(ctx ? { ctx } : {}) })}
      style={{ display: 'flex', alignItems: 'center', gap: 8, border: '1.5px solid rgba(255,255,255,.25)', background: 'rgba(255,255,255,.06)', color: '#fff', fontSize: 16, fontWeight: 800, padding: '15px 26px', borderRadius: 12 }}>
      <Icon name="message-2" size={18} />{label}
    </button>
  );
}
