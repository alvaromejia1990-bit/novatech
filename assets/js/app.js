/* Porra & Motola · lógica de la tienda (catálogo, carrito, pedidos por WhatsApp y panel admin) */
const WA="573103024205";
/* Redes sociales: reemplaza cada dirección por el enlace de tu perfil */
const SOCIAL={ig:"https://www.instagram.com/",fb:"https://www.facebook.com/",tt:"https://www.tiktok.com/"};
const ADMIN_PIN="motola2026";
const C={mostaza:"#D4A02A",teja:"#6B4226",bosque:"#2F5233",oliva:"#C49A6C",tinta:"#2B2725"};
const COLORS={"Mostaza":"#D4A02A","Teja":"#6B4226","Verde bosque":"#2F5233","Oliva":"#C49A6C","Crema":"#EFE1BC","Tinta":"#2A2418","Arena":"#C9A877","Vino":"#6E2A2A"};
const COLLECTIONS=[
  {id:"raices",name:"Raíces",bg:"#6B4226",soft:"#F1E6DA",desc:"Para quienes no olvidan de dónde vienen: plumas, soles y símbolos ancestrales bordados en tonos de barro.",pat:"sol"},
  {id:"tropico",name:"Trópico",bg:"#2F5233",soft:"#DCE7DE",desc:"El calor de la tarde y el verde del monte. Ligeras y frescas para vivir la tierra caliente.",pat:"zig"},
  {id:"calle",name:"Calle Retro",bg:"#A97A14",soft:"#F7EDD3",desc:"La nostalgia de los 90 hecha gorra: trucker y snapback con puntos, franjas y actitud de barrio.",pat:"dots"},
  {id:"paramo",name:"Páramo",bg:"#6F6B67",soft:"#ECEAE7",desc:"Abrigo para la tierra fría en lana y pana, con los tonos del frailejón y la niebla de la montaña.",pat:"tri"}
];
const SEED_PRODUCTS=[
 ["raices","PM-RA-01","Gorra Pluma Sagrada",89000,12,["Teja","Mostaza","Crema"]],
 ["raices","PM-RA-02","Sol de Barro",85000,3,["Mostaza","Verde bosque","Teja"]],
 ["raices","PM-RA-03","Cacique Snapback",95000,8,["Tinta","Mostaza","Teja"]],
 ["raices","PM-RA-04","Tejido Wayúu",92000,0,["Crema","Teja","Verde bosque"]],
 ["tropico","PM-TR-01","Monte Adentro",79000,15,["Verde bosque","Mostaza","Crema"]],
 ["tropico","PM-TR-02","Mango Biche",75000,9,["Mostaza","Verde bosque","Oliva"]],
 ["tropico","PM-TR-03","Río Grande",82000,2,["Oliva","Crema","Teja"]],
 ["tropico","PM-TR-04","Guadua",78000,11,["Arena","Verde bosque","Mostaza"]],
 ["calle","PM-CR-01","Trucker 90s",69000,20,["Crema","Teja","Tinta"]],
 ["calle","PM-CR-02","Semitono",72000,6,["Mostaza","Tinta","Crema"]],
 ["calle","PM-CR-03","Franja Doble",74000,0,["Teja","Crema","Mostaza"]],
 ["calle","PM-CR-04","Zigzag Snap",76000,14,["Tinta","Mostaza","Teja"]],
 ["paramo","PM-PA-01","Frailejón",88000,7,["Oliva","Crema","Mostaza"]],
 ["paramo","PM-PA-02","Niebla Pana",94000,4,["Arena","Oliva","Tinta"]],
 ["paramo","PM-PA-03","Laguna Fría",86000,10,["Verde bosque","Arena","Crema"]],
 ["paramo","PM-PA-04","Ruana Lana",98000,1,["Vino","Arena","Mostaza"]]
].map(([col,ref,name,price,stock,colors])=>({col,ref,name,price,stock,colors}));

/* ---------- almacenamiento local ---------- */
const KEY="pm_store_v2";
function load(){try{const s=JSON.parse(localStorage.getItem(KEY));if(s&&s.products)return s}catch(e){}return null}
function save(){try{localStorage.setItem(KEY,JSON.stringify(S))}catch(e){}}
function dayKey(d){const z=n=>String(n).padStart(2,"0");return d.getFullYear()+"-"+z(d.getMonth()+1)+"-"+z(d.getDate())}
function seed(){
  let r=7;const rnd=()=>(r=(r*9301+49297)%233280)/233280;
  const visits={},orders=[],now=new Date();
  for(let i=29;i>=0;i--){const d=new Date(now);d.setDate(d.getDate()-i);visits[dayKey(d)]=Math.round(40+rnd()*70+(d.getDay()===0||d.getDay()===6?35:0))}
  for(let i=0;i<46;i++){
    const d=new Date(now);d.setDate(d.getDate()-Math.floor(rnd()*30));
    const items=[];const n=1+Math.floor(rnd()*2);
    for(let k=0;k<n;k++){const p=SEED_PRODUCTS[Math.floor(rnd()*16)];items.push({ref:p.ref,color:p.colors[Math.floor(rnd()*3)],qty:1+Math.floor(rnd()*2),price:p.price})}
    orders.push({id:"D"+(1000+i),date:d.toISOString(),name:"Cliente ejemplo "+(i+1),city:["Bogotá","Girardot","Ibagué","Medellín","Cali","Neiva"][Math.floor(rnd()*6)],pay:["Bre-B","Transferencia bancaria","Contraentrega"][Math.floor(rnd()*3)],items,demo:true});
  }
  orders.sort((a,b)=>b.date.localeCompare(a.date));
  return {products:JSON.parse(JSON.stringify(SEED_PRODUCTS)),visits,orders,views:{},cart:[]};
}
let S=load()||seed();
(function countVisit(){let seen=false;try{seen=sessionStorage.getItem("pm_v")}catch(e){}
  if(!seen){const k=dayKey(new Date());S.visits[k]=(S.visits[k]||0)+1;try{sessionStorage.setItem("pm_v","1")}catch(e){}save()}})();

/* ---------- utilidades ---------- */
const $=s=>document.querySelector(s);
const $$=s=>document.querySelectorAll(s);
const cop=n=>"$"+Math.round(n).toLocaleString("es-CO");
const P=ref=>S.products.find(p=>p.ref===ref);
const colOf=id=>COLLECTIONS.find(c=>c.id===id);
function toast(t){const el=$("#toast");el.textContent=t;el.hidden=false;clearTimeout(toast.t);toast.t=setTimeout(()=>el.hidden=true,2400)}
function stockInfo(s){return s<=0?["st-out","Agotado"]:s<=3?["st-low","Últimas "+s]:["st-ok","Disponible · "+s]}
function esc(s){return String(s).replace(/[&<>"]/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;"}[c]))}
const VIEWS=["inicio","catalogo","contactenos","pagos"];
function showView(v){VIEWS.forEach(x=>$("#v-"+x).hidden=x!==v);$$(".navbtn").forEach(b=>b.classList.toggle("on",b.dataset.go===v))}
function goTo(id){
  if(id==="contacto")id="contactenos";
  const v=VIEWS.includes(id)?id:"inicio";const wasHidden=$("#v-"+v).hidden;showView(v);
  const smooth=matchMedia("(prefers-reduced-motion: reduce)").matches?"auto":"smooth";
  if(VIEWS.includes(id)){window.scrollTo({top:0,behavior:wasHidden?"auto":smooth})}
  else{const el=document.getElementById(id);if(el)setTimeout(()=>el.scrollIntoView({behavior:wasHidden?"auto":smooth,block:"start"}),wasHidden?20:0)}
}

/* Ilustración de gorra */
function capSVG(colors,pat){
  const [a,b,c]=colors.map(n=>COLORS[n]);const T=C.tinta;
  const patch=pat==="sol"?`<circle cx="142" cy="66" r="8" fill="${a}"/><g stroke="${a}" stroke-width="2.2">${[0,45,90,135].map(g=>`<line x1="142" y1="53" x2="142" y2="79" transform="rotate(${g} 142 66)"/>`).join("")}</g>`
   :pat==="zig"?`<polyline points="124,72 131,60 138,72 145,60 152,72 159,60" fill="none" stroke="${a}" stroke-width="3"/>`
   :pat==="dots"?[0,1,2,3].map(i=>[0,1,2].map(j=>`<circle cx="${127+i*10}" cy="${58+j*8}" r="2.4" fill="${a}"/>`).join("")).join("")
   :`<path d="M126 76 L138 56 L148 70 L154 62 L162 76Z" fill="${a}"/>`;
  return `<svg viewBox="0 0 210 140" aria-hidden="true">
  <ellipse cx="108" cy="125" rx="84" ry="6" fill="${T}" opacity=".12"/>
  <path d="M28 104 C26 52 66 22 108 22 C152 22 176 56 174 104 Z" fill="${a}" stroke="${T}" stroke-width="2.5" stroke-linejoin="round"/>
  <path d="M108 22 C96 46 92 76 94 104" fill="none" stroke="${T}" stroke-width="2" opacity=".45"/>
  <path d="M108 22 C70 34 52 70 56 104" fill="none" stroke="${T}" stroke-width="1.5" opacity=".25" stroke-dasharray="4 4"/>
  <rect x="118" y="48" width="50" height="36" rx="5" fill="${c}" stroke="${T}" stroke-width="2"/>${patch}
  <path d="M120 100 L174 98 C196 100 208 110 204 117 C200 124 160 122 116 112 Z" fill="${b}" stroke="${T}" stroke-width="2.5" stroke-linejoin="round"/>
  <path d="M28 100 L174 100" stroke="${b}" stroke-width="6"/><path d="M28 104 L174 104" stroke="${T}" stroke-width="2"/>
  <circle cx="108" cy="21" r="5.5" fill="${b}" stroke="${T}" stroke-width="2"/></svg>`;
}
function bg(col){return `background:${colOf(col).soft}`}

/* ---------- Inicio: colecciones ---------- */
function renderColCards(){
  $("#colCards").innerHTML=COLLECTIONS.map(c=>{const ps=S.products.filter(p=>p.col===c.id);const min=Math.min(...ps.map(p=>p.price));
    return `<button type="button" class="colcard" data-col="${c.id}"><div class="art" style="${bg(c.id)}">${capSVG(ps[0].colors,c.pat)}</div><div class="t"><h3 style="color:${c.bg}">${c.name}</h3><small>${c.desc}</small><small>4 referencias · desde ${cop(min)}</small><span class="go">Ver colección →</span></div></button>`}).join("");
}
$("#colCards").addEventListener("click",e=>{const b=e.target.closest("[data-col]");if(!b)return;filter=b.dataset.col;renderCatalog();goTo("catalogo")});

/* ---------- Catálogo ---------- */
let filter="todas";const sel={};
function renderCatalog(){
  $("#filters").innerHTML=[["todas","Todas"],...COLLECTIONS.map(c=>[c.id,c.name])].map(([id,n])=>`<button type="button" role="tab" aria-selected="${filter===id}" class="chip ${filter===id?"on":""}" data-f="${id}">${n}</button>`).join("");
  $("#lines").innerHTML=COLLECTIONS.filter(c=>filter==="todas"||c.id===filter).map(c=>{
    const ps=S.products.filter(p=>p.col===c.id);const li=COLLECTIONS.indexOf(c)+1;
    return `<div class="line"><div class="linehead"><span class="dot" style="background:${c.bg}"></span><h3>${c.name}</h3><span class="tag">Línea ${li} de 4</span><p>${c.desc}</p></div>
    <div class="grid4">${ps.map(p=>{const ci=sel[p.ref]||0;const [cls,lbl]=stockInfo(p.stock);const cs=[...p.colors.slice(ci),...p.colors.slice(0,ci)];
      return `<article class="prod"><button type="button" class="pic" data-q="${p.ref}" style="${bg(c.id)}" aria-label="Ver detalle de ${esc(p.name)}"><span class="badge ${cls}">${lbl}</span>${capSVG(cs,c.pat)}</button>
      <div class="body"><span class="ref">REF ${p.ref}</span><h4>${esc(p.name)}</h4>
      <div class="swatches" role="group" aria-label="Color">${p.colors.map((n,k)=>`<button type="button" class="sw ${k===ci?"on":""}" style="background:${COLORS[n]}" title="${n}" aria-label="Color ${n}" aria-pressed="${k===ci}" data-sw="${p.ref}" data-k="${k}"></button>`).join("")}<span>${p.colors[ci]}</span></div>
      <div class="row"><span class="price">${cop(p.price)}</span><button type="button" class="addbtn" data-add="${p.ref}" ${p.stock<=0?"disabled":""}>${p.stock<=0?"Agotado":`<svg class="i" viewBox="0 0 24 24"><path d="M12 5v14M5 12h14"/></svg>Agregar`}</button></div></div></article>`}).join("")}</div></div>`}).join("");
}
$("#filters").addEventListener("click",e=>{const b=e.target.closest("[data-f]");if(!b)return;filter=b.dataset.f;renderCatalog()});
$("#lines").addEventListener("click",e=>{
  const sw=e.target.closest("[data-sw]");if(sw){sel[sw.dataset.sw]=+sw.dataset.k;renderCatalog();return}
  const add=e.target.closest("[data-add]");if(add){addToCart(add.dataset.add);return}
  const q=e.target.closest("[data-q]");if(q)quick(q.dataset.q);
});
function quick(ref){
  const p=P(ref),c=colOf(p.col),ci=sel[ref]||0,cs=[...p.colors.slice(ci),...p.colors.slice(0,ci)];const [cls,lbl]=stockInfo(p.stock);
  S.views[ref]=(S.views[ref]||0)+1;save();
  const m=$("#modal");
  m.innerHTML=`<div class="box" role="dialog" aria-modal="true" aria-label="${esc(p.name)}"><div class="pic" style="${bg(p.col)}">${capSVG(cs,c.pat)}</div><div class="det"><button class="x" type="button" id="qClose" aria-label="Cerrar">×</button><span class="ref">REF ${p.ref} · ${c.name}</span><h3 style="font-size:1.5rem;font-weight:800;color:var(--bosque)">${esc(p.name)}</h3><p style="margin:0;color:var(--suave)">${c.desc} Combinación: ${cs.join(" / ")}. Talla única ajustable.</p><span class="badge ${cls}" style="align-self:flex-start">${lbl}</span><span class="price" style="font-size:1.5rem">${cop(p.price)}</span><button class="btn" type="button" id="qAdd" ${p.stock<=0?"disabled":""}>${p.stock<=0?"Agotado":"Agregar al carrito"}</button></div></div>`;
  m.hidden=false;$("#qClose").focus();
  $("#qClose").addEventListener("click",()=>m.hidden=true);
  const qa=$("#qAdd");if(qa)qa.addEventListener("click",()=>{addToCart(ref);m.hidden=true});
}
$("#modal").addEventListener("click",e=>{if(e.target.id==="modal")e.currentTarget.hidden=true});
document.addEventListener("keydown",e=>{if(e.key==="Escape"){$("#modal").hidden=true}});

/* ---------- Carrito ---------- */
function addToCart(ref){
  const p=P(ref),color=p.colors[sel[ref]||0];
  const inCart=S.cart.filter(i=>i.ref===ref).reduce((a,i)=>a+i.qty,0);
  if(inCart>=p.stock){toast("No quedan más unidades de "+p.name);return}
  const it=S.cart.find(i=>i.ref===ref&&i.color===color);
  it?it.qty++:S.cart.push({ref,color,qty:1});
  save();renderCart();toast("Agregaste "+p.name+" ("+color+") al carrito");
}
const subtotal=()=>S.cart.reduce((a,i)=>a+P(i.ref).price*i.qty,0);
const shipping=s=>s>=150000?0:12000;
function renderCart(){
  const n=S.cart.reduce((a,i)=>a+i.qty,0);$("#cartN").textContent=n;
  if(!S.cart.length){$("#cartList").innerHTML=`<div class="empty"><p>Tu carrito está vacío.</p><button class="btn ghost" type="button" data-go="catalogo">Ir al catálogo</button></div>`;$("#totals").innerHTML="";$("#sendBtn").disabled=true;return}
  $("#sendBtn").disabled=false;
  $("#cartList").innerHTML=S.cart.map((i,k)=>{const p=P(i.ref),c=colOf(p.col);const cs=[i.color,...p.colors.filter(x=>x!==i.color)];
    return `<div class="citem"><div class="mini" style="${bg(p.col)}">${capSVG(cs,c.pat)}</div><div class="meta"><b>${esc(p.name)}</b><span class="ref">${p.ref} · ${i.color} · ${cop(p.price)} c/u</span><br><button class="link" type="button" data-rm="${k}">Quitar</button></div>
    <div class="qty"><button type="button" data-m="${k}" aria-label="Quitar una unidad">−</button><span>${i.qty}</span><button type="button" data-p="${k}" aria-label="Agregar una unidad">+</button></div></div>`}).join("");
  const sub=subtotal(),env=shipping(sub);
  $("#totals").innerHTML=`<div><span>Subtotal (${n} ${n===1?"gorra":"gorras"})</span><span>${cop(sub)}</span></div><div><span>Envío</span><span>${env?cop(env):"Gratis"}</span></div><div class="g"><span>Total</span><span>${cop(sub+env)}</span></div><p class="note" style="margin:4px 0 0">Envío gratis en compras desde $150.000.</p>`;
}
$("#cartList").addEventListener("click",e=>{
  const rm=e.target.closest("[data-rm]"),m=e.target.closest("[data-m]"),pl=e.target.closest("[data-p]");
  if(rm){S.cart.splice(+rm.dataset.rm,1)}
  else if(m){const i=S.cart[+m.dataset.m];i.qty--;if(i.qty<1)S.cart.splice(+m.dataset.m,1)}
  else if(pl){const i=S.cart[+pl.dataset.p],p=P(i.ref);const tot=S.cart.filter(x=>x.ref===i.ref).reduce((a,x)=>a+x.qty,0);if(tot>=p.stock){toast("Solo quedan "+p.stock+" unidades");return}i.qty++}
  else return;
  save();renderCart();
});

let pending=null;
$("#orderForm").addEventListener("submit",e=>{
  e.preventDefault();
  const v=id=>$(id).value.trim();const err=$("#formErr");
  if(!S.cart.length){err.hidden=false;err.textContent="Agrega al menos una gorra al carrito.";return}
  const req=[["#fNombre","nombre"],["#fTel","celular"],["#fEmail","correo electrónico"],["#fCiudad","ciudad"],["#fDir","dirección"]];
  const miss=req.filter(([id])=>!v(id));
  if(miss.length){err.hidden=false;err.textContent="Falta completar: "+miss.map(x=>x[1]).join(", ")+".";$(miss[0][0]).focus();return}
  if(!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(v("#fEmail"))){err.hidden=false;err.textContent="Revisa el correo electrónico: debe tener la forma nombre@correo.com.";$("#fEmail").focus();return}
  err.hidden=true;
  const pago=document.querySelector("[name=pago]:checked").value;
  const sub=subtotal(),env=shipping(sub);const id="PM"+Date.now().toString().slice(-6);
  const lines=S.cart.map(i=>{const p=P(i.ref);return `• ${i.qty} x ${p.name} (${p.ref}) – ${i.color} – ${cop(p.price*i.qty)}`});
  const msg=`*PEDIDO PORRA & MOTOLA* #${id}\n\n${lines.join("\n")}\n\nSubtotal: ${cop(sub)}\nEnvío: ${env?cop(env):"Gratis"}\n*TOTAL: ${cop(sub+env)}*\n\nNombre: ${v("#fNombre")}\nCelular: ${v("#fTel")}\nCorreo: ${v("#fEmail")}\nDirección: ${v("#fDir")}, ${v("#fCiudad")}\nPago: ${pago}${v("#fNota")?"\nNota: "+v("#fNota"):""}`;
  pending={id,date:new Date().toISOString(),name:v("#fNombre"),email:v("#fEmail"),city:v("#fCiudad"),pay:pago,items:S.cart.map(i=>({...i,price:P(i.ref).price}))};
  $("#msgTxt").textContent=msg;$("#waLink").href=`https://wa.me/${WA}?text=${encodeURIComponent(msg)}`;
  $("#orderForm").hidden=true;$("#sendBox").hidden=false;
});
function registerOrder(){
  if(!pending)return;S.orders.unshift(pending);
  pending.items.forEach(i=>{const p=P(i.ref);p.stock=Math.max(0,p.stock-i.qty)});
  pending=null;S.cart=[];save();renderCart();renderCatalog();renderColCards();
  $("#sendBox").hidden=true;$("#orderForm").hidden=false;$("#orderForm").reset();
}
$("#waLink").addEventListener("click",()=>{setTimeout(()=>{registerOrder();toast("Pedido registrado. Te respondemos por WhatsApp.")},500)});
$("#doneBtn").addEventListener("click",()=>{registerOrder();toast("Pedido registrado")});
$("#editBtn").addEventListener("click",()=>{pending=null;$("#sendBox").hidden=true;$("#orderForm").hidden=false});
function selectNode(n){const r=document.createRange();r.selectNodeContents(n);const s=getSelection();s.removeAllRanges();s.addRange(r);toast("Texto seleccionado: cópialo con Ctrl+C o mantén pulsado")}
function copyText(t,ok,node){try{navigator.clipboard.writeText(t).then(()=>toast(ok),()=>selectNode(node))}catch(e){selectNode(node)}}
$("#copyMsg").addEventListener("click",()=>copyText($("#msgTxt").textContent,"Mensaje copiado",$("#msgTxt")));
$("#copyPhone").addEventListener("click",()=>copyText("+573103024205","Número copiado",$("#phoneTxt")));

/* ---------- Formulario de contacto ---------- */
$("#contactForm").addEventListener("submit",e=>{
  e.preventDefault();const v=id=>$(id).value.trim();const err=$("#cErr");
  const miss=[["#cNombre","nombre"],["#cEmail","correo electrónico"],["#cMsg","mensaje"]].filter(([id])=>!v(id));
  if(miss.length){err.hidden=false;err.textContent="Falta completar: "+miss.map(x=>x[1]).join(", ")+".";$(miss[0][0]).focus();return}
  if(!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(v("#cEmail"))){err.hidden=false;err.textContent="Revisa el correo electrónico: debe tener la forma nombre@correo.com.";$("#cEmail").focus();return}
  err.hidden=true;
  const msg=`*CONTACTO PORRA & MOTOLA*\nMotivo: ${v("#cMotivo")}\n\n${v("#cMsg")}\n\nNombre: ${v("#cNombre")}\nCorreo: ${v("#cEmail")}`;
  $("#cTxt").textContent=msg;$("#cWa").href=`https://wa.me/${WA}?text=${encodeURIComponent(msg)}`;
  $("#contactForm").hidden=true;$("#cBox").hidden=false;
});
$("#cEdit").addEventListener("click",()=>{$("#cBox").hidden=true;$("#contactForm").hidden=false});
$("#cCopy").addEventListener("click",()=>copyText($("#cTxt").textContent,"Mensaje copiado",$("#cTxt")));

/* ---------- Navegación (botones, sin enlaces internos) ---------- */
document.addEventListener("click",e=>{const b=e.target.closest("[data-go]");if(!b)return;e.preventDefault();goTo(b.dataset.go)});

/* ---------- Admin ---------- */
let authed=false;try{authed=sessionStorage.getItem("pm_admin")==="1"}catch(e){}
function openAdmin(){$("#adminLayer").hidden=false;document.body.style.overflow="hidden";renderAdmin();if(!authed)setTimeout(()=>$("#pin").focus(),50)}
function closeAdmin(){$("#adminLayer").hidden=true;document.body.style.overflow=""}
$("#openAdmin").addEventListener("click",openAdmin);
$("#footAdmin").addEventListener("click",openAdmin);
Object.entries(SOCIAL).forEach(([k,u])=>{const a=document.getElementById("soc-"+k);if(a)a.href=u});
$("#closeAdmin").addEventListener("click",closeAdmin);
$("#loginForm").addEventListener("submit",e=>{e.preventDefault();if($("#pin").value===ADMIN_PIN){authed=true;try{sessionStorage.setItem("pm_admin","1")}catch(e){}$("#pin").value="";$("#pinErr").hidden=true;renderAdmin()}else $("#pinErr").hidden=false});
$("#logoutBtn").addEventListener("click",()=>{authed=false;try{sessionStorage.removeItem("pm_admin")}catch(e){}renderAdmin()});
let resetArm=false;
$("#resetBtn").addEventListener("click",()=>{
  if(!resetArm){resetArm=true;$("#resetBtn").textContent="¿Seguro? Toca otra vez";setTimeout(()=>{resetArm=false;$("#resetBtn").textContent="Reiniciar datos"},3000);return}
  resetArm=false;$("#resetBtn").textContent="Reiniciar datos";S=seed();save();renderAll();toast("Datos reiniciados con ejemplos");
});
function renderAdmin(){
  $("#loginBox").hidden=authed;$("#dash").hidden=!authed;if(!authed)return;
  $("#demoTag").hidden=!S.orders.some(o=>o.demo);
  const now=new Date(),d30=new Date(now);d30.setDate(d30.getDate()-30);
  const recent=S.orders.filter(o=>new Date(o.date)>=d30);
  const units=recent.reduce((a,o)=>a+o.items.reduce((b,i)=>b+i.qty,0),0);
  const rev=recent.reduce((a,o)=>a+o.items.reduce((b,i)=>b+i.qty*i.price,0),0);
  const days=[];for(let i=13;i>=0;i--){const d=new Date(now);d.setDate(d.getDate()-i);days.push([d,S.visits[dayKey(d)]||0])}
  const k30=dayKey(d30);const v30=Object.entries(S.visits).filter(([k])=>k>k30).reduce((a,[,v])=>a+v,0);
  const conv=v30?recent.length/v30*100:0;const low=S.products.filter(p=>p.stock<=3).length;
  $("#kpis").innerHTML=[
    ["Visitas",v30.toLocaleString("es-CO"),`Hoy: ${S.visits[dayKey(now)]||0}`,"#2F5233"],
    ["Pedidos",recent.length,`Conversión ${conv.toFixed(1).replace(".",",")} %`,"#6B4226"],
    ["Ventas",cop(rev),`${units} gorras vendidas`,"#D4A02A"],
    ["Productos",S.products.length,`${low} con 3 o menos unidades`,"#C49A6C"]
  ].map(([l,v,s,c])=>`<div class="kpi" style="--c:${c}"><small>${l}</small><b>${v}</b><span>${s}</span></div>`).join("");

  const W=640,H=240,pl=40,pb=34,pt=20,max=Math.max(...days.map(d=>d[1]),1);const top=Math.ceil(max/50)*50;
  const bw=(W-pl-10)/days.length;const y=v=>pt+(H-pt-pb)*(1-v/top);
  let g="";for(let t=0;t<=top;t+=top/4){g+=`<line x1="${pl}" x2="${W-6}" y1="${y(t)}" y2="${y(t)}" stroke="#2B2725" stroke-opacity=".08"/><text x="${pl-6}" y="${y(t)+4}" text-anchor="end" font-size="11" fill="#6F6B67" font-family="IBM Plex Mono,monospace">${t}</text>`}
  const bars=days.map(([d,v],i)=>{const x=pl+i*bw+4,last=i===days.length-1,we=d.getDay()===0||d.getDay()===6;
    return `<rect x="${x}" y="${y(v)}" width="${bw-8}" height="${y(0)-y(v)}" rx="3" fill="${last?"#6B4226":we?"#D4A02A":"#2F5233"}"><title>${d.toLocaleDateString("es-CO",{weekday:"long",day:"numeric",month:"short"})}: ${v} visitas</title></rect>${last?`<text x="${x+(bw-8)/2}" y="${y(v)-6}" text-anchor="middle" font-size="12" font-weight="600" fill="#6B4226" font-family="IBM Plex Mono,monospace">${v}</text>`:""}<text x="${x+(bw-8)/2}" y="${H-pb+16}" text-anchor="middle" font-size="10.5" fill="#6F6B67" font-family="IBM Plex Mono,monospace">${d.getDate()}</text>`}).join("");
  $("#visitsChart").innerHTML=`<svg viewBox="0 0 ${W} ${H}" role="img" aria-label="Visitas diarias de los últimos 14 días">${g}${bars}<line x1="${pl}" x2="${W-6}" y1="${y(0)}" y2="${y(0)}" stroke="#2B2725" stroke-width="1.5"/></svg><div class="legend" style="margin-top:8px"><span><i style="background:#2F5233"></i>Entre semana</span><span><i style="background:#D4A02A"></i>Fin de semana</span><span><i style="background:#6B4226"></i>Hoy</span></div>`;

  const byCol=COLLECTIONS.map(c=>{let u=0,r=0;recent.forEach(o=>o.items.forEach(i=>{const p=P(i.ref);if(p&&p.col===c.id){u+=i.qty;r+=i.qty*i.price}}));return{c,u,r}});
  const mr=Math.max(...byCol.map(x=>x.r),1);
  $("#byCol").innerHTML=byCol.map(x=>`<div class="hbar"><span>${x.c.name}</span><div class="tr"><i style="width:${x.r/mr*100}%;background:${x.c.bg}"></i></div><span class="v">${cop(x.r)}</span></div>`).join("")+`<p class="note">Unidades: ${byCol.map(x=>x.c.name+" "+x.u).join(" · ")}</p>`;

  const agg={};S.orders.forEach(o=>o.items.forEach(i=>{agg[i.ref]=agg[i.ref]||{u:0,r:0};agg[i.ref].u+=i.qty;agg[i.ref].r+=i.qty*i.price}));
  const top6=Object.entries(agg).sort((a,b)=>b[1].u-a[1].u).slice(0,6);
  $("#topProd").innerHTML=`<table><thead><tr><th>Ref</th><th>Producto</th><th>Unid.</th><th>Ventas</th><th>Vistas</th></tr></thead><tbody>${top6.map(([ref,a])=>{const p=P(ref);return `<tr><td class="ref">${ref}</td><td>${p?esc(p.name):"—"}</td><td>${a.u}</td><td>${cop(a.r)}</td><td>${S.views[ref]||0}</td></tr>`}).join("")}</tbody></table>`;

  const cc={};S.orders.forEach(o=>o.items.forEach(i=>cc[i.color]=(cc[i.color]||0)+i.qty));
  const tot=Object.values(cc).reduce((a,b)=>a+b,0)||1;const ent=Object.entries(cc).sort((a,b)=>b[1]-a[1]);
  $("#byColor").innerHTML=`<div class="colorbar">${ent.map(([n,v])=>`<i style="width:${v/tot*100}%;background:${COLORS[n]}" title="${n}: ${v}"></i>`).join("")}</div><div class="legend">${ent.map(([n,v])=>`<span><i style="background:${COLORS[n]}"></i>${n} · ${Math.round(v/tot*100)} %</span>`).join("")}</div><p class="note">Color elegido en cada unidad vendida.</p>`;

  $("#invTable").innerHTML=`<table><thead><tr><th>Ref</th><th>Producto</th><th>Colección</th><th>Precio (COP)</th><th>Existencias</th><th>Estado</th></tr></thead><tbody>${S.products.map((p,k)=>{const [cls,lbl]=stockInfo(p.stock);return `<tr><td class="ref">${p.ref}</td><td>${esc(p.name)}</td><td>${colOf(p.col).name}</td><td><input id="pr-${p.ref}" type="number" min="0" step="1000" value="${p.price}" data-ip="${k}" aria-label="Precio ${esc(p.name)}"></td><td><input id="st-${p.ref}" type="number" min="0" value="${p.stock}" data-is="${k}" aria-label="Existencias ${esc(p.name)}" style="width:72px"></td><td><span class="badge ${cls}">${lbl}</span></td></tr>`}).join("")}</tbody></table>`;

  $("#orders").innerHTML=`<table><thead><tr><th>Pedido</th><th>Fecha</th><th>Cliente</th><th>Correo</th><th>Ciudad</th><th>Pago</th><th>Gorras</th><th>Total</th></tr></thead><tbody>${S.orders.slice(0,10).map(o=>`<tr><td class="ref">${o.id}${o.demo?' <span class="badge st-low">ejemplo</span>':""}</td><td>${new Date(o.date).toLocaleDateString("es-CO",{day:"2-digit",month:"short"})}</td><td>${esc(o.name)}</td><td>${esc(o.email||"—")}</td><td>${esc(o.city)}</td><td>${o.pay}</td><td>${o.items.reduce((a,i)=>a+i.qty,0)}</td><td>${cop(o.items.reduce((a,i)=>a+i.qty*i.price,0))}</td></tr>`).join("")}</tbody></table>`;
}
$("#invTable").addEventListener("change",e=>{
  const ip=e.target.closest("[data-ip]"),is=e.target.closest("[data-is]");
  if(ip){S.products[+ip.dataset.ip].price=Math.max(0,+ip.value||0);toast("Precio actualizado")}
  else if(is){S.products[+is.dataset.is].stock=Math.max(0,Math.floor(+is.value||0));toast("Existencias actualizadas")}
  else return;
  save();renderCatalog();renderColCards();renderCart();renderAdmin();
});

(function(){const v=document.getElementById("bgvid");if(!v)return;
  const rm=matchMedia("(prefers-reduced-motion: reduce)");
  const sync=()=>{if(rm.matches){v.pause()}else{v.muted=true;const p=v.play();if(p&&p.catch)p.catch(()=>{})}};
  sync();rm.addEventListener&&rm.addEventListener("change",sync);
  document.addEventListener("visibilitychange",()=>{if(!document.hidden&&!rm.matches)v.play().catch(()=>{})});
})();
function renderAll(){renderColCards();renderCatalog();renderCart();renderAdmin()}
renderAll();showView("inicio");
(function(){const h=(location.hash||"").slice(1);if(h==="admin")openAdmin();else if(h&&document.getElementById(h))goTo(h)})();
