// Iranian licence plate, as drawn in the designs (WaybillCard, driver and supplier panels).
import { toFaDigits } from '@hm/shared';

export function Plate({ a, letter, b, region, scale = 1 }: { a: string; letter: string; b: string; region: string; scale?: number }) {
  const s = (n: number) => n * scale;
  return (
    <div dir="ltr" aria-label={`پلاک ${toFaDigits(a)} ${letter} ${toFaDigits(b)} ایران ${toFaDigits(region)}`}
      style={{ display: 'inline-flex', alignItems: 'stretch', height: s(40), border: `${s(2)}px solid #141414`, borderRadius: s(7), overflow: 'hidden', background: '#fff', fontWeight: 900, color: '#141414' }}>
      <div style={{ width: s(24), background: '#1E4FD8', color: '#fff', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', fontSize: s(7), lineHeight: 1.3, fontFamily: 'Arial,sans-serif' }}>
        <span>I.R.</span><span>IRAN</span>
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: s(8), padding: `0 ${s(10)}px`, fontSize: s(19) }}>
        {toFaDigits(a)}<span style={{ fontSize: s(17) }}>{letter}</span>{toFaDigits(b)}
      </div>
      <div style={{ borderLeft: `${s(2)}px solid #141414`, padding: `0 ${s(8)}px`, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', lineHeight: 1.1 }}>
        <span style={{ fontSize: s(9), fontWeight: 700 }}>ایران</span><span style={{ fontSize: s(16) }}>{toFaDigits(region)}</span>
      </div>
    </div>
  );
}
