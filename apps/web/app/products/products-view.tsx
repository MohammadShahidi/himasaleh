'use client';

// Port of design/project/products.dc.html: category/sub-category filter, search, «استعلام قیمت» → ConsultModal.
import { toFaDigits } from '@hm/shared';
import { useSearchParams } from 'next/navigation';
import { useState } from 'react';
import { Icon } from '@/components/icon';
import { ConsultTrigger } from '@/components/site/consult-trigger';
import { Spot } from '@/components/site/spot';
import { PRODUCTS } from '@/lib/catalog';
import { CATEGORIES, openConsult } from '@/lib/site';

const catBtn = { display: 'flex', alignItems: 'center', gap: 10, width: '100%', border: 'none', background: 'transparent', padding: '12px 12px', borderRadius: 12, cursor: 'pointer', fontSize: 15, fontWeight: 700, color: '#222', textAlign: 'right' } as const;
const cnt = { fontSize: 12, background: '#F4F4F4', color: '#666', borderRadius: 999, padding: '2px 10px' } as const;
const chipMain = { flex: 'none', display: 'flex', alignItems: 'center', gap: 6, border: '1.5px solid #E6E6E6', background: '#fff', borderRadius: 999, padding: '10px 16px', fontSize: 14, fontWeight: 700, color: '#333', cursor: 'pointer', whiteSpace: 'nowrap' } as const;
const chipSub = { flex: 'none', border: '1.5px dashed #F1C3AC', background: '#FFF8F4', borderRadius: 999, padding: '8px 14px', fontSize: 13, fontWeight: 700, color: '#FF5B0F', cursor: 'pointer', whiteSpace: 'nowrap' } as const;

export function ProductsView() {
  const params = useSearchParams();
  const initCat = params.get('cat') ?? '';
  const valid = CATEGORIES.some((c) => c.key === initCat);
  const [cat, setCat] = useState(valid ? initCat : 'all');
  const [sub, setSub] = useState(valid ? (params.get('sub') ?? 'all') : 'all');
  const [q, setQ] = useState('');

  const setFilter = (nextCat: string, nextSub: string) => {
    setCat(nextCat);
    setSub(nextSub);
    const u = new URLSearchParams();
    if (nextCat !== 'all') u.set('cat', nextCat);
    if (nextCat !== 'all' && nextSub !== 'all') u.set('sub', nextSub);
    try { history.replaceState(null, '', location.pathname + (u.toString() ? `?${u}` : '')); } catch { /* the URL is a convenience only */ }
  };
  const pickAll = () => { setQ(''); setFilter('all', 'all'); };

  const query = q.trim();
  const list = PRODUCTS.filter((p) => (cat === 'all' || p.cat === cat) && (sub === 'all' || p.sub === sub) && (!query || (p.name + p.spec + p.sub).includes(query)));
  const active = CATEGORIES.find((c) => c.key === cat);
  const catName = active?.name ?? 'همه محصولات';

  return (
    <>
      <section data-wrap="" data-shop="" style={{ maxWidth: 1280, margin: '0 auto', padding: '64px 40px 0', display: 'grid', gridTemplateColumns: '290px minmax(0,1fr)', gap: 36, alignItems: 'start' }}>
        <aside data-side="" data-reveal="right" style={{ position: 'sticky', top: 100, display: 'flex', flexDirection: 'column', gap: 20 }}>
          <div style={{ background: '#fff', border: '1px solid #F0F0F0', borderRadius: 20, boxShadow: '0 12px 34px rgba(0,0,0,.06)', padding: 18 }}>
            <div style={{ fontSize: 16, fontWeight: 900, color: '#141414', padding: '6px 8px 14px', display: 'flex', alignItems: 'center', gap: 8 }}><Icon name="category" size={20} style={{ color: '#FF5B0F' }} />دسته‌بندی محصولات</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
              <button data-cat-btn="" data-active={cat === 'all' ? '1' : '0'} onClick={pickAll} style={catBtn}>
                <span data-ic="" style={{ color: '#FF5B0F', display: 'flex' }}><Icon name="layout-grid" size={20} /></span><span style={{ flex: 1 }}>همه محصولات</span><span data-cnt="" style={cnt}>{toFaDigits(PRODUCTS.length)}</span>
              </button>
              {CATEGORIES.map((c) => (
                <div key={c.key}>
                  <button data-cat-btn="" data-active={cat === c.key ? '1' : '0'} onClick={() => setFilter(c.key, 'all')} style={catBtn}>
                    <span data-ic="" style={{ color: '#FF5B0F', display: 'flex' }}><Icon name={c.icon} size={20} /></span><span style={{ flex: 1 }}>{c.name}</span><span data-cnt="" style={cnt}>{toFaDigits(PRODUCTS.filter((p) => p.cat === c.key).length)}</span>
                  </button>
                  {cat === c.key && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 2, padding: '8px 22px 10px 8px', marginRight: 21, borderRight: '1.5px dashed #F1D6C8' }}>
                      {c.subs.map((s) => (
                        <button key={s} data-sub-btn="" data-active={sub === s ? '1' : '0'} onClick={() => setFilter(c.key, sub === s ? 'all' : s)} style={{ display: 'flex', alignItems: 'center', gap: 10, border: 'none', background: 'transparent', padding: '8px 4px', cursor: 'pointer', fontSize: 14, fontWeight: 500, color: '#555', textAlign: 'right' }}>
                          <span data-dot="" style={{ width: 7, height: 7, borderRadius: '50%', background: '#DDD', flex: 'none', transition: 'all .3s' }} /><span style={{ flex: 1 }}>{s}</span><span style={{ fontSize: 12, color: '#aaa' }}>{toFaDigits(PRODUCTS.filter((p) => p.cat === c.key && p.sub === s).length)}</span>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
          <Spot style={{ position: 'relative', overflow: 'hidden', borderRadius: 20, background: 'radial-gradient(360px circle at var(--mx,50%) var(--my,30%),rgba(255,91,15,.22),transparent 55%),#161616', color: '#fff', padding: 24 }}>
            <Icon name="headset" size={34} style={{ color: '#FF5B0F' }} />
            <div style={{ marginTop: 12, fontSize: 17, fontWeight: 800, lineHeight: 1.8 }}>در انتخاب مصالح مردد هستید؟</div>
            <div style={{ marginTop: 6, fontSize: 14, color: '#BBB', lineHeight: 1.9 }}>کارشناسان ما رایگان راهنمایی‌تان می‌کنند.</div>
            <ConsultTrigger hover="glow" style={{ marginTop: 16, width: '100%', border: 'none', background: '#FF5B0F', color: '#fff', fontSize: 15, fontWeight: 700, padding: '13px 16px', borderRadius: 12, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>درخواست مشاوره<Icon name="chevron-left" size={16} /></ConsultTrigger>
          </Spot>
        </aside>

        <div style={{ minWidth: 0 }}>
          <div data-mfilter="" style={{ display: 'none', flexDirection: 'column', gap: 12, marginBottom: 20 }}>
            <div data-hscroll="" style={{ display: 'flex', gap: 8, overflowX: 'auto', scrollbarWidth: 'none', margin: '0 -20px', padding: '4px 20px' }}>
              <button data-chip="" data-active={cat === 'all' ? '1' : '0'} onClick={pickAll} style={chipMain}>همه</button>
              {CATEGORIES.map((c) => (
                <button key={c.key} data-chip="" data-active={cat === c.key ? '1' : '0'} onClick={() => setFilter(c.key, 'all')} style={chipMain}><Icon name={c.icon} size={17} />{c.name}</button>
              ))}
            </div>
            {active && (
              <div data-hscroll="" style={{ display: 'flex', gap: 8, overflowX: 'auto', scrollbarWidth: 'none', margin: '0 -20px', padding: '2px 20px' }}>
                <button data-chip="" data-active={sub === 'all' ? '1' : '0'} onClick={() => setFilter(cat, 'all')} style={chipSub}>همه زیرگروه‌ها</button>
                {active.subs.map((s) => (
                  <button key={s} data-chip="" data-active={sub === s ? '1' : '0'} onClick={() => setFilter(cat, s)} style={chipSub}>{s}</button>
                ))}
              </div>
            )}
          </div>

          <div data-topbar="" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16, marginBottom: 24 }}>
            <div>
              <div style={{ fontSize: 22, fontWeight: 900, color: '#141414' }}>{sub !== 'all' ? sub : catName}</div>
              <div style={{ marginTop: 4, fontSize: 14, color: '#888' }}>{toFaDigits(list.length)} محصول{sub !== 'all' ? ` در ${catName}` : ''}</div>
            </div>
            <div style={{ position: 'relative', width: 'min(320px,100%)' }}>
              <Icon name="search" size={19} style={{ position: 'absolute', right: 16, top: '50%', transform: 'translateY(-50%)', color: '#999' }} />
              <input data-field="" type="search" aria-label="جستجو در محصولات" placeholder="جستجو در محصولات…" value={q} onChange={(e) => setQ(e.target.value)} style={{ width: '100%', height: 50, border: '1.5px solid #ECECEC', background: '#FAFAFA', borderRadius: 14, padding: '0 46px 0 16px', fontSize: 15, color: '#141414' }} />
            </div>
          </div>

          <div data-pgrid="" style={{ display: 'grid', gridTemplateColumns: 'repeat(3,minmax(0,1fr))', gap: 22 }}>
            {list.map((p, i) => {
              const c = CATEGORIES.find((x) => x.key === p.cat)!;
              return (
                <div key={p.name + p.sub} data-reveal="" data-delay={i % 3}>
                  <article data-card="" data-lift="" style={{ height: '100%', display: 'flex', flexDirection: 'column', background: '#fff', borderRadius: 18, overflow: 'hidden', border: '1px solid #F0F0F0', boxShadow: '0 8px 24px rgba(0,0,0,.05)' }}>
                    <div style={{ position: 'relative', aspectRatio: 1.45, overflow: 'hidden', background: '#222' }}>
                      <div data-zoom="" style={{ width: '100%', height: '100%', backgroundImage: `url('${c.img}')`, backgroundSize: 'cover', backgroundPosition: 'center' }} />
                      {p.tag && <span style={{ position: 'absolute', top: 14, right: 14, background: '#FF5B0F', color: '#fff', fontSize: 12, fontWeight: 800, padding: '5px 12px', borderRadius: 999, boxShadow: '0 6px 16px rgba(255,91,15,.4)' }}>{p.tag}</span>}
                    </div>
                    <div style={{ padding: 20, display: 'flex', flexDirection: 'column', flex: 1 }}>
                      <div style={{ fontSize: 13, fontWeight: 700, color: '#FF5B0F' }}>{c.name} · {p.sub}</div>
                      <h3 style={{ margin: '8px 0 0', fontSize: 18, fontWeight: 800, color: '#141414', lineHeight: 1.6 }}>{p.name}</h3>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginTop: 12, fontSize: 14, color: '#666' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}><span style={{ width: 6, height: 6, borderRadius: '50%', background: '#CCC', flex: 'none' }} />{p.spec}</div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}><span style={{ width: 6, height: 6, borderRadius: '50%', background: '#CCC', flex: 'none' }} />واحد فروش: {p.unit}</div>
                      </div>
                      <div style={{ marginTop: 'auto', paddingTop: 18 }}>
                        <div style={{ borderTop: '1px solid #F2F2F2', paddingTop: 16, display: 'flex' }}>
                          <button data-btn="" data-hv-fill="" onClick={() => openConsult({ topic: 'استعلام قیمت', ctx: p.name })} style={{ flex: 1, justifyContent: 'center', border: '1.5px solid #FF5B0F', background: '#fff', color: '#FF5B0F', fontSize: 14, fontWeight: 800, padding: '10px 16px', borderRadius: 10, display: 'flex', alignItems: 'center', gap: 6, whiteSpace: 'nowrap' }}>
                            استعلام قیمت<Icon name="chevron-left" size={15} />
                          </button>
                        </div>
                      </div>
                    </div>
                  </article>
                </div>
              );
            })}
          </div>

          {list.length === 0 && (
            <div style={{ textAlign: 'center', padding: '70px 20px', border: '1.5px dashed #E6E6E6', borderRadius: 20 }}>
              <Icon name="mood-empty" size={52} style={{ color: '#FF5B0F' }} />
              <div style={{ marginTop: 14, fontSize: 19, fontWeight: 800, color: '#141414' }}>محصولی با این مشخصات پیدا نشد</div>
              <button data-btn="" onClick={pickAll} style={{ marginTop: 20, border: 'none', background: '#FF5B0F', color: '#fff', fontSize: 15, fontWeight: 700, padding: '13px 26px', borderRadius: 12 }}>نمایش همه محصولات</button>
            </div>
          )}
        </div>
      </section>

      <section data-wrap="" style={{ maxWidth: 1280, margin: '0 auto', padding: '70px 40px 90px' }}>
        <Spot data-reveal="" style={{ position: 'relative', overflow: 'hidden', borderRadius: 22, background: 'radial-gradient(520px circle at var(--mx,20%) var(--my,50%),rgba(255,91,15,.18),transparent 45%),#181818', padding: '40px clamp(24px,5vw,64px)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 24, flexWrap: 'wrap', border: '1px solid #262626' }}>
          <div>
            <div style={{ fontSize: 'clamp(20px,2.2vw,28px)', fontWeight: 900, color: '#fff' }}>محصول مورد نظرتان را پیدا نکردید؟</div>
            <div style={{ marginTop: 10, fontSize: 15, color: '#BBB' }}>درخواست خود را ثبت کنید تا از طریق شبکه تامین‌کنندگان برایتان تهیه کنیم.</div>
          </div>
          <ConsultTrigger hover="glow" style={{ border: 'none', background: '#FF5B0F', color: '#fff', fontSize: 16, fontWeight: 800, padding: '17px 30px', borderRadius: 12, display: 'flex', alignItems: 'center', gap: 10, whiteSpace: 'nowrap', boxShadow: '0 14px 30px rgba(255,91,15,.35)' }}><Icon name="message-2" size={18} />درخواست مشاوره</ConsultTrigger>
        </Spot>
      </section>
    </>
  );
}
