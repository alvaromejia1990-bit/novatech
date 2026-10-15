export const settings = window.SITE_CONFIG || {};
export const money = (value) => new Intl.NumberFormat("es-CO", {style:"currency",currency:"COP",maximumFractionDigits:0}).format(Number(value)||0);
export const clean = (value) => String(value ?? "").replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
export const waUrl = (message) => `https://wa.me/${String(settings.whatsapp||'573103024205').replace(/\D/g, '')}?text=${encodeURIComponent(message)}`;
export const validImage = (url) => {
  const s=String(url||'').trim();
  if (/^https:\/\/[^\s]+$/i.test(s) || /^assets\/products\/[a-z0-9._/-]+$/i.test(s)) return s;
  return 'assets/products/default.svg';
};
export function toast(message) {const el=document.getElementById('toast');if(!el)return;el.textContent=message;el.classList.add('show');clearTimeout(toast.timeout);toast.timeout=setTimeout(()=>el.classList.remove('show'),3500);}
export function configureBrand(){document.querySelectorAll('[data-brand]').forEach(el=>el.textContent=settings.businessName||'NovaTech');}
