-- NOVATECH · BASE DE DATOS PARA GITHUB PAGES + SUPABASE
-- Ejecutar UNA VEZ en el SQL Editor del proyecto nuevo de Supabase.
-- IMPORTANTE: no insertar contraseñas ni claves secretas aquí.
-- El panel administrativo usa Supabase Auth y Row Level Security (RLS).

create table if not exists public.admin_users (
  user_id uuid primary key references auth.users(id) on delete cascade,
  created_at timestamptz not null default now()
);

create table if not exists public.products (
  id uuid primary key default gen_random_uuid(),
  reference text not null unique check (char_length(reference) between 1 and 45),
  name text not null check (char_length(name) between 1 and 130),
  description text not null default '',
  category text not null check (char_length(category) between 1 and 55),
  price numeric(12,2) not null default 0 check (price >= 0),
  stock integer not null default 0 check (stock >= 0),
  sold_count integer not null default 0 check (sold_count >= 0),
  image_url text not null default 'assets/products/default.svg',
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.orders (
  id uuid primary key default gen_random_uuid(),
  order_code text not null unique default ('NT-' || upper(substring(replace(gen_random_uuid()::text, '-', '') from 1 for 12))),
  customer_name text not null,
  customer_phone text not null,
  notes text not null default '',
  total numeric(14,2) not null default 0 check (total >= 0),
  status text not null default 'pending' check (status in ('pending','confirmed','cancelled')),
  created_at timestamptz not null default now(),
  confirmed_at timestamptz
);

create table if not exists public.order_items (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders(id) on delete cascade,
  product_id uuid not null references public.products(id) on delete restrict,
  product_name text not null,
  reference text not null,
  qty integer not null check (qty > 0),
  unit_price numeric(12,2) not null check (unit_price >= 0),
  line_total numeric(14,2) not null check (line_total >= 0)
);
create index if not exists idx_orders_status_created on public.orders(status,created_at desc);
create index if not exists idx_order_items_order on public.order_items(order_id);
create index if not exists idx_products_active on public.products(active);

create or replace function public.set_updated_at()
returns trigger language plpgsql set search_path = public, pg_temp as $$
begin new.updated_at := now();return new;end;$$;
drop trigger if exists products_updated_at on public.products;
create trigger products_updated_at before update on public.products
for each row execute function public.set_updated_at();

-- Prohibir lectura directa de la tabla de administradores.
alter table public.admin_users enable row level security;
alter table public.products enable row level security;
alter table public.orders enable row level security;
alter table public.order_items enable row level security;
revoke all on public.admin_users from anon, authenticated;

-- Función protegida. La cuenta no puede autoconcederse permisos de administrador.
create or replace function public.is_admin()
returns boolean language sql stable security definer
set search_path = public, pg_temp
as $$
  select exists(select 1 from public.admin_users a where a.user_id = auth.uid());
$$;
revoke all on function public.is_admin() from public, anon;
grant execute on function public.is_admin() to authenticated;

-- Clientes anónimos: solo productos activos. Administradores: todos y edición.
drop policy if exists products_public_read on public.products;
create policy products_public_read on public.products
  for select to anon, authenticated using (active = true);
drop policy if exists products_admin_manage on public.products;
create policy products_admin_manage on public.products
  for all to authenticated using (public.is_admin()) with check (public.is_admin());

-- Pedidos y datos de contacto: jamás expuestos a visitantes.
drop policy if exists orders_admin_read on public.orders;
create policy orders_admin_read on public.orders
  for select to authenticated using (public.is_admin());
drop policy if exists order_items_admin_read on public.order_items;
create policy order_items_admin_read on public.order_items
  for select to authenticated using (public.is_admin());

-- Asegurar que solo el panel autorizado edita productos; pedidos se escriben mediante RPC.
revoke all on public.products from anon, authenticated;
grant select on public.products to anon, authenticated;
grant insert,update,delete on public.products to authenticated;
revoke all on public.orders from anon, authenticated;
grant select on public.orders to authenticated;
revoke all on public.order_items from anon, authenticated;
grant select on public.order_items to authenticated;

-- Genera el pedido pendiente con precios tomados de la base (no del navegador).
-- No reserva el stock: las existencias se descuentan al confirmar la venta.
create or replace function public.create_order(
  p_items jsonb,
  p_customer_name text,
  p_customer_phone text,
  p_notes text default ''
)
returns jsonb language plpgsql security definer
set search_path = public, pg_temp
as $$
declare
  v_order_id uuid;
  v_order_code text;
  v_total numeric(14,2) := 0;
  v_product public.products%rowtype;
  v_line record;
begin
  if p_items is null or jsonb_typeof(p_items) <> 'array' or jsonb_array_length(p_items) not between 1 and 30 then
    raise exception 'Agrega entre 1 y 30 referencias al pedido.';
  end if;
  if length(btrim(coalesce(p_customer_name,''))) not between 2 and 80 then
    raise exception 'Nombre de cliente inválido.';
  end if;
  if length(btrim(coalesce(p_customer_phone,''))) not between 7 and 30 then
    raise exception 'Teléfono inválido.';
  end if;
  if length(coalesce(p_notes,'')) > 500 then
    raise exception 'La nota no puede superar 500 caracteres.';
  end if;

  -- Rechazar productos/cantidades malformados antes de procesar.
  if exists (
    select 1 from jsonb_array_elements(p_items) item
    where jsonb_typeof(item) <> 'object'
       or coalesce(item->>'id','') !~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
       or coalesce(item->>'qty','') !~ '^[0-9]{1,3}$'
  ) then
    raise exception 'El pedido contiene productos o cantidades inválidos.';
  end if;

  insert into public.orders(customer_name,customer_phone,notes)
  values (btrim(p_customer_name),btrim(p_customer_phone),coalesce(p_notes,''))
  returning id,order_code into v_order_id,v_order_code;

  -- Agrupar referencias duplicadas para que ninguna cantidad se eluda.
  for v_line in
    select (item->>'id')::uuid as product_id,sum((item->>'qty')::integer)::integer as quantity
    from jsonb_array_elements(p_items) item
    group by 1 order by 1
  loop
    if v_line.quantity < 1 or v_line.quantity > 100 then
      raise exception 'La cantidad por referencia debe estar entre 1 y 100.';
    end if;
    select * into v_product from public.products
      where id=v_line.product_id and active=true and stock >= v_line.quantity;
    if not found then
      raise exception 'Una referencia no está disponible en la cantidad solicitada. Actualiza tu carrito.';
    end if;
    insert into public.order_items(order_id,product_id,product_name,reference,qty,unit_price,line_total)
    values(v_order_id,v_product.id,v_product.name,v_product.reference,v_line.quantity,v_product.price,v_product.price*v_line.quantity);
    v_total := v_total + v_product.price*v_line.quantity;
  end loop;

  update public.orders set total=v_total where id=v_order_id;
  return jsonb_build_object(
    'id',v_order_id,'code',v_order_code,'total',v_total,
    'items',(
      select jsonb_agg(jsonb_build_object(
        'id',oi.product_id,'name',oi.product_name,'reference',oi.reference,
        'qty',oi.qty,'price',oi.unit_price
      ) order by oi.reference)
      from public.order_items oi where oi.order_id=v_order_id
    )
  );
end;
$$;
revoke all on function public.create_order(jsonb,text,text,text) from public;
grant execute on function public.create_order(jsonb,text,text,text) to anon,authenticated;

-- Confirmación ATÓMICA: si falta stock, no cambia el pedido ni ninguna referencia.
create or replace function public.confirm_order(p_order_id uuid)
returns jsonb language plpgsql security definer
set search_path = public, pg_temp
as $$
declare v_order public.orders%rowtype; v_item record; v_updated uuid;
begin
  if not public.is_admin() then raise exception 'No autorizado.';end if;
  select * into v_order from public.orders where id=p_order_id for update;
  if not found then raise exception 'Pedido no encontrado.';end if;
  if v_order.status <> 'pending' then raise exception 'Solo se pueden confirmar pedidos pendientes.';end if;
  for v_item in select * from public.order_items where order_id=p_order_id order by product_id loop
    update public.products
      set stock=stock-v_item.qty,sold_count=sold_count+v_item.qty
      where id=v_item.product_id and stock >= v_item.qty
      returning id into v_updated;
    if v_updated is null then
      raise exception 'Stock insuficiente para %. Actualiza el pedido o la existencia.',v_item.reference;
    end if;
    v_updated := null;
  end loop;
  update public.orders set status='confirmed',confirmed_at=now() where id=p_order_id;
  return jsonb_build_object('code',v_order.order_code,'status','confirmed');
end;
$$;
revoke all on function public.confirm_order(uuid) from public,anon;
grant execute on function public.confirm_order(uuid) to authenticated;

-- Cancelar pendiente no modifica stock. Revertir confirmada RESTITUYE stock y ventas.
create or replace function public.cancel_order(p_order_id uuid)
returns jsonb language plpgsql security definer
set search_path = public, pg_temp
as $$
declare v_order public.orders%rowtype; v_item record;
begin
  if not public.is_admin() then raise exception 'No autorizado.';end if;
  select * into v_order from public.orders where id=p_order_id for update;
  if not found then raise exception 'Pedido no encontrado.';end if;
  if v_order.status = 'cancelled' then raise exception 'Este pedido ya está cancelado.';end if;
  if v_order.status = 'confirmed' then
    for v_item in select * from public.order_items where order_id=p_order_id order by product_id loop
      update public.products set stock=stock+v_item.qty,sold_count=greatest(0,sold_count-v_item.qty)
      where id=v_item.product_id;
    end loop;
  end if;
  update public.orders set status='cancelled',confirmed_at=null where id=p_order_id;
  return jsonb_build_object('code',v_order.order_code,'status','cancelled');
end;
$$;
revoke all on function public.cancel_order(uuid) from public,anon;
grant execute on function public.cancel_order(uuid) to authenticated;

-- CATÁLOGO INICIAL (DATOS DEMOSTRATIVOS, MODIFICAR PRECIOS Y STOCK).
insert into public.products(reference,name,description,category,price,stock,sold_count,image_url)
values
('NET-001','Router Wi-Fi doble banda','Conexión estable para hogares y espacios de trabajo.','Conectividad',189900,12,0,'assets/products/router.svg'),
('AUD-002','Audífonos inalámbricos','Audio envolvente, comodidad y conectividad Bluetooth.','Audio',119900,8,0,'assets/products/headphones.svg'),
('PER-003','Teclado mecánico RGB','Respuesta precisa y diseño para largas jornadas.','Accesorios',159900,15,0,'assets/products/keyboard.svg'),
('VID-004','Cámara web Full HD','Comunicación nítida para reuniones y videollamadas.','Video',139900,4,0,'assets/products/webcam.svg'),
('PER-005','Mouse ergonómico','Control inalámbrico y comodidad durante todo el día.','Accesorios',79900,22,0,'assets/products/mouse.svg'),
('AUD-006','Parlante Bluetooth compacto','Sonido portátil con diseño moderno y funcional.','Audio',99900,0,0,'assets/products/speaker.svg')
on conflict(reference) do nothing;

-- PASO POSTERIOR: crea primero una cuenta en Authentication > Users de Supabase.
-- Después HABILITA al administrador cambiando su correo en esta instrucción
-- y EJECUTANDO SOLO esa instrucción en el SQL Editor:
-- insert into public.admin_users(user_id)
-- select id from auth.users where email='TU_CORREO_ADMIN@EMPRESA.COM'
-- on conflict(user_id) do nothing;
-- Es recomendable desactivar registros públicos de usuarios en Supabase Auth.
