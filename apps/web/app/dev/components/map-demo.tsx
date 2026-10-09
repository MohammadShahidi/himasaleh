'use client';

import { useState } from 'react';
import { MapPicker, type PickedPlace } from '@/components/map-picker';

export function MapDemo() {
  const [picked, setPicked] = useState<PickedPlace | null>(null);
  return (
    <section style={{ background: '#fff', borderRadius: 22, padding: 16 }}>
      <MapPicker onPick={setPicked} />
      {picked && <pre dir="ltr" style={{ fontSize: 12, marginTop: 10 }}>{JSON.stringify(picked)}</pre>}
    </section>
  );
}
