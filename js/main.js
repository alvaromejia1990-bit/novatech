// Catálogo accesible mediante <script defer>, incluso al abrir index.html directamente.
// En modo conectado, los pedidos e inventario se obtienen de Supabase.
'use strict';
const settings=window.SITE_CONFIG||{};
const money=(value)=>new Intl.NumberFormat('es-CO',{style:'currency',currency:'COP',maximumFractionDigits:0}).format(Number(value)||0);
const clean=(value)=>String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const waUrl=(message)=>`https://wa.me/${String(settings.whatsapp||'573103024205').replace(/\D/g,'')}?text=${encodeURIComponent(message)}`;
const validImage=(url)=>{const s=String(url||'').trim();return /^https:\/\/[^\s]+$/i.test(s)||/^assets\/products\/[a-z0-9._/-]+$/i.test(s)?s:'assets/products/default.svg';};
function toast(message){const el=document.getElementById('toast');if(!el)return;el.textContent=message;el.classList.add('show');clearTimeout(toast.timeout);toast.timeout=setTimeout(()=>el.classList.remove('show'),3500);}
function configureBrand(){document.querySelectorAll('[data-brand]').forEach(el=>el.textContent=settings.businessName||'NovaTech');}
const demoProducts=()=>Array.isArray(window.DEMO_PRODUCTS)?window.DEMO_PRODUCTS.map(p=>({...p})):[];
const isConnected=()=>!!(settings.supabaseUrl&&settings.supabasePublishableKey&&String(settings.supabaseUrl).trim().startsWith('https://'));
let clientPromise;
async function db(){
  if(!isConnected())throw new Error('Configura Supabase en js/config.js.');
  if(!clientPromise)clientPromise=import('https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm').then(({createClient})=>createClient(settings.supabaseUrl.trim(),settings.supabasePublishableKey.trim()));
  return clientPromise;
}
async function publicProducts(){
  if(!isConnected())return demoProducts();
  const sdk=await db();
  const {data,error}=await sdk.from('products').select('id,reference,name,description,category,price,stock,sold_count,image_url,active').eq('active',true).order('created_at',{ascending:true});
  if(error)throw new Error(error.message||'No fue posible consultar productos');
  return data||[];
}
async function submitOrder(items,name,phone,notes){
  const sdk=await db();
  const {data,error}=await sdk.rpc('create_order',{p_items:items,p_customer_name:name,p_customer_phone:phone,p_notes:notes||''});
  if(error)throw new Error(error.message||'No fue posible registrar el pedido');
  return data;
}
let catalogOnline=false;
function showCatalogNotice(message){
  const el=document.getElementById('mode-message');el.hidden=false;el.textContent=message;
}


configureBrand();
document.title=`${settings.businessName||'NovaTech'} | Soluciones tecnológicas`;
document.getElementById('year').textContent=new Date().getFullYear();
for(const id of ['cta-whatsapp','contact-whatsapp']) document.getElementById(id).href=waUrl('Hola, me gustaría recibir información sobre sus productos y servicios tecnológicos.');
document.querySelector('.topbar a').href=waUrl('Hola, necesito asesoría sobre sus productos y servicios.');
const contactEmail=document.getElementById('contact-email-line');
if(settings.email){document.getElementById('email-display').textContent=settings.email;const a=document.createElement('a');a.href=`mailto:${settings.email}`;a.className=contactEmail.className;a.innerHTML=contactEmail.innerHTML;contactEmail.replaceWith(a);}
const socialContainer=document.getElementById('social-links');
const socialNetworks=[['Instagram',settings.instagram,'IG'],['Facebook',settings.facebook,'FB'],['TikTok',settings.tiktok,'TK']];
socialContainer.innerHTML=socialNetworks.map(([name,url,short])=>url&&/^https:\/\//i.test(url)?`<a href="${clean(url)}" target="_blank" rel="noopener noreferrer" aria-label="${name}">${short}</a>`:`<span class="social-disabled" title="Agrega tu enlace en js/config.js">${short}</span>`).join('');
const navToggle=document.getElementById('menu-toggle');const mobileNav=document.getElementById('mobile-nav');
navToggle.addEventListener('click',()=>{mobileNav.hidden=!mobileNav.hidden;navToggle.setAttribute('aria-expanded',String(!mobileNav.hidden));});
mobileNav.querySelectorAll('a').forEach(a=>a.addEventListener('click',()=>{mobileNav.hidden=true;navToggle.setAttribute('aria-expanded','false');}));

let products=[];let activeCategory='Todos';let search='';
const cart=readCart();
function readCart(){try{const d=JSON.parse(localStorage.getItem('nt-cart-v1')||'{}');return d&&typeof d==='object'&&!Array.isArray(d)?d:{};}catch{return {};}}
function saveCart(){try{localStorage.setItem('nt-cart-v1',JSON.stringify(cart));}catch{}}
function getItems(){return Object.entries(cart).map(([id,qty])=>({product:products.find(p=>p.id===id),qty:Number(qty)})).filter(x=>x.product&&x.product.active&&x.product.stock>0&&x.qty>0).map(x=>({...x,qty:Math.min(x.qty,x.product.stock)}));}
function alignCart(){for(const key of Object.keys(cart)){const p=products.find(t=>t.id===key);if(!p||p.stock<=0||!p.active)delete cart[key];else cart[key]=Math.max(0,Math.min(Number(cart[key])||0,p.stock));if(cart[key]===0)delete cart[key];}saveCart();updateCart();}
function renderFilters(){const options=['Todos',...new Set(products.map(p=>p.category))];document.getElementById('category-filters').innerHTML=options.map(c=>`<button type="button" class="filter-chip ${c===activeCategory?'active':''}" data-category="${clean(c)}">${clean(c)}</button>`).join('');}
function renderCatalog(){const filtered=products.filter(p=>(activeCategory==='Todos'||p.category===activeCategory)&&`${p.name||''} ${p.reference||''} ${p.description||''}`.toLowerCase().includes(search));document.getElementById('catalog-grid').innerHTML=filtered.length?filtered.map(p=>`<article class="product-card"><div class="product-image-wrap"><span class="product-tag">${clean(p.category)}</span><img src="${clean(validImage(p.image_url))}" alt="${clean(p.name)}" loading="lazy" onerror="this.onerror=null;this.src='assets/products/default.svg'"><span class="product-image-id">${clean(p.reference)}</span></div><div class="product-content"><div class="product-ref">REF. ${clean(p.reference)}</div><h3>${clean(p.name)}</h3><p>${clean(p.description)}</p><div class="product-metadata"><span class="stock-pill ${p.stock===0?'out-of-stock':p.stock<=5?'low-stock':''}">${p.stock>0?`● ${p.stock} disponibles`:'● Agotado'}</span><span class="sold-text">${Number(p.sold_count)||0} vendidos</span></div><div class="product-footer"><strong>${money(p.price)}</strong><button type="button" class="add-cart" data-add="${clean(p.id)}" ${p.stock<=0?'disabled':''} aria-label="Agregar ${clean(p.name)}">${p.stock>0?'+':'×'}</button></div></div></article>`).join(''):'<div class="empty-state no-results">No encontramos productos con esos filtros. Prueba con otra búsqueda.</div>';}
function addToCart(id){const p=products.find(x=>x.id===id);if(!p||p.stock<=0)return toast('Producto sin existencias.');const next=(Number(cart[id])||0)+1;if(next>p.stock)return toast('No hay más unidades disponibles.');cart[id]=next;saveCart();updateCart();toast('Producto agregado a tu pedido.');}
function changeQuantity(id,delta){const p=products.find(x=>x.id===id);if(!p)return;const next=(Number(cart[id])||0)+delta;if(next<=0)delete cart[id];else if(next<=p.stock)cart[id]=next;else return toast('No hay más unidades disponibles.');saveCart();updateCart();}
function updateCart(){const items=getItems();const qty=items.reduce((acc,x)=>acc+x.qty,0);const total=items.reduce((acc,x)=>acc+x.qty*Number(x.product.price),0);document.getElementById('cart-count').textContent=qty;document.getElementById('cart-heading-count').textContent=`(${qty})`;document.getElementById('cart-total').textContent=money(total);const checkoutBtn=document.getElementById('checkout-button');checkoutBtn.disabled=!qty;document.getElementById('cart-items').innerHTML=items.length?items.map(({product:p,qty:q})=>`<div class="cart-item"><img src="${clean(validImage(p.image_url))}" alt=""><div class="cart-item-details"><span>${clean(p.reference)}</span><h3>${clean(p.name)}</h3><strong>${money(p.price*q)}</strong><div class="qty-control"><button type="button" data-step="-1" data-id="${clean(p.id)}" aria-label="Quitar una unidad">−</button><span>${q}</span><button type="button" data-step="1" data-id="${clean(p.id)}" aria-label="Agregar una unidad">+</button></div></div><button type="button" class="remove-item" data-remove="${clean(p.id)}" aria-label="Quitar producto">✕</button></div>`).join(''):'<div class="cart-empty"><span>◌</span><h3>Tu carrito está vacío.</h3><p>Explora el catálogo y agrega los productos que necesitas.</p><button class="btn btn-primary" id="continue-shopping" type="button">Ver catálogo</button></div>';}
function openCart(){document.getElementById('cart-overlay').hidden=false;document.getElementById('cart-panel').classList.add('open');document.getElementById('cart-panel').setAttribute('aria-hidden','false');document.body.classList.add('has-overlay');document.getElementById('cart-panel').focus();}
function closeCart(){document.getElementById('cart-overlay').hidden=true;document.getElementById('cart-panel').classList.remove('open');document.getElementById('cart-panel').setAttribute('aria-hidden','true');document.body.classList.remove('has-overlay');}
document.getElementById('cart-open').addEventListener('click',openCart);
document.getElementById('sales-cart-open').addEventListener('click',openCart);
document.getElementById('cart-close').addEventListener('click',closeCart);
document.getElementById('cart-overlay').addEventListener('click',closeCart);
document.addEventListener('keydown',e=>{if(e.key==='Escape')closeCart();});
document.getElementById('category-filters').addEventListener('click',e=>{const btn=e.target.closest('[data-category]');if(!btn)return;activeCategory=btn.dataset.category;renderFilters();renderCatalog();});
document.getElementById('search').addEventListener('input',e=>{search=e.target.value.trim().toLowerCase();renderCatalog();});
document.getElementById('catalog-grid').addEventListener('click',e=>{const btn=e.target.closest('[data-add]');if(btn)addToCart(btn.dataset.add);});
document.getElementById('cart-items').addEventListener('click',e=>{if(e.target.closest('#continue-shopping')){closeCart();document.getElementById('catalogo').scrollIntoView({behavior:'smooth'});return;}const step=e.target.closest('[data-step]');if(step)changeQuantity(step.dataset.id,Number(step.dataset.step));const remove=e.target.closest('[data-remove]');if(remove){delete cart[remove.dataset.remove];saveCart();updateCart();}});

function orderText(items,info,code,verifiedTotal){const lines=[`Hola, quiero solicitar un pedido en ${settings.businessName||'NovaTech'}.`,'',...(code?[`Pedido: ${code}`,'']:[]),`Cliente: ${info.name}`,`Teléfono: ${info.phone}`,'','*DETALLE DEL PEDIDO*',...items.map(({product:p,qty})=>`• ${p.name} [${p.reference}]\n  Cantidad: ${qty} × ${money(p.price)} = ${money(qty*Number(p.price))}`),'',`*TOTAL: ${money(verifiedTotal??items.reduce((sum,x)=>sum+x.qty*Number(x.product.price),0))}*`,...(info.notes?[``,`Notas: ${info.notes}`]:[]),'','Solicito confirmar existencias y disponibilidad.'];return lines.join('\n');}
let placingOrder=false;
document.getElementById('checkout-form').addEventListener('submit',async e=>{e.preventDefault();if(placingOrder)return;const items=getItems();if(!items.length)return toast('Tu pedido está vacío.');const name=document.getElementById('checkout-name').value.trim();const phone=document.getElementById('checkout-phone').value.trim();const notes=document.getElementById('checkout-notes').value.trim();if(name.length<2||phone.length<7)return toast('Completa tu nombre y teléfono.');const status=document.getElementById('checkout-status');const btn=document.getElementById('checkout-button');placingOrder=true;btn.disabled=true;btn.textContent='Preparando pedido...';status.textContent='';status.classList.remove('error');document.getElementById('retry-whatsapp').hidden=true;
// La ventana se crea durante el clic del usuario; se redirige una vez guardado el pedido.
const popup=window.open('about:blank','_blank');
try{let order=null;if(catalogOnline){order=await submitOrder(items.map(x=>({id:x.product.id,qty:x.qty})),name,phone,notes);}const officialItems=order?.items?.length?order.items.map(x=>({product:{name:x.name,reference:x.reference,price:x.price},qty:x.qty})):items;const text=orderText(officialItems,{name,phone,notes},order?.code,order?.total);const url=waUrl(text);if(popup&&!popup.closed){popup.location.href=url;}else{const link=document.getElementById('retry-whatsapp');link.href=url;link.hidden=false;}status.textContent=catalogOnline?'Pedido registrado como pendiente. Envía el mensaje por WhatsApp para completar la solicitud.':'Vista demostrativa: envía el mensaje por WhatsApp. Este pedido no queda registrado en una base de datos.';if(order){for(const key of Object.keys(cart))delete cart[key];saveCart();updateCart();}toast('Tu resumen de pedido está preparado.');}catch(err){if(popup&&!popup.closed)popup.close();status.textContent=`No se registró el pedido: ${err.message}. Intenta de nuevo.`;status.classList.add('error');}finally{placingOrder=false;btn.textContent='Confirmar y abrir WhatsApp ↗';btn.disabled=!getItems().length;}});

document.getElementById('contact-form').addEventListener('submit',e=>{e.preventDefault();const name=document.getElementById('contact-name').value.trim();const email=document.getElementById('contact-email').value.trim();const message=document.getElementById('contact-message').value.trim();if(!name||!message)return;const text=`Hola, soy ${name}.${email?`\nCorreo: ${email}`:''}\n\n${message}`;window.open(waUrl(text),'_blank','noopener,noreferrer');});
async function loadProducts(){
  const grid=document.getElementById('catalog-grid');
  try{
    const loaded=await publicProducts();
    if(!Array.isArray(loaded))throw new Error('Respuesta no válida');
    if(isConnected()&&loaded.length===0){
      catalogOnline=false;
      products=demoProducts();
      showCatalogNotice('No hay productos publicados en Supabase. Se muestra el catálogo ilustrativo; estos productos y existencias no son reales. Publica los tuyos desde Administración.');
    }else{
      catalogOnline=isConnected();
      products=loaded;
      if(catalogOnline)document.getElementById('mode-message').hidden=true;
      else showCatalogNotice('Catálogo de demostración: precios y existencias ilustrativos. Para inventario real, configura Supabase.');
    }
    alignCart();renderFilters();renderCatalog();
  }catch(err){
    console.warn('Error al cargar inventario; se usa la vista demostrativa:',err);
    catalogOnline=false;
    products=demoProducts();
    showCatalogNotice('No se pudo conectar con el inventario en línea. Se muestran productos de ejemplo, NO existencias reales. Revisa Supabase y vuelve a intentar.');
    alignCart();renderFilters();renderCatalog();
    // Botón para recuperar la conexión sin dejar el catálogo vacío.
    if(!document.getElementById('reload-products')){
      const retry=document.createElement('button');retry.type='button';retry.id='reload-products';retry.className='btn btn-outline-dark btn-sm';retry.textContent='Actualizar catálogo';retry.style.margin='12px 0 0';
      retry.addEventListener('click',loadProducts);document.getElementById('mode-message').append(retry);
    }
  }
}

loadProducts();
// Sincronización ligera con la base compartida. No reserva existencias mientras el pedido está pendiente.
if(isConnected()){setInterval(()=>{if(!document.hidden)loadProducts();},45000);window.addEventListener('focus',loadProducts);}
