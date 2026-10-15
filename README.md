# NovaTech — Catálogo, pedidos por WhatsApp e inventario para GitHub Pages

Sitio **HTML + CSS + JavaScript sin compilación**, preparado para GitHub Pages. Tiene secciones Nosotros, Catálogo, Ventas, Servicios y Contáctanos, además de un carrito y un panel de administración.

## 1. Cómo verlo localmente

El catálogo público de demostración ahora también funciona haciendo **doble clic en `index.html`** (sin servidor). Para probar el panel administrativo y la conexión a Supabase, se recomienda un servidor local. Desde la carpeta del proyecto ejecuta:

```bash
python -m http.server 8080
```

Abre `http://localhost:8080`. También puedes utilizar Live Server de VS Code. La página pública usa scripts clásicos para evitar bloqueos por `file://`. **El panel `admin.html` sí necesita GitHub Pages o servidor local** cuando se conecte Supabase.

**Modo demostración:** sin configurar Supabase, el catálogo de muestra y el pedido por WhatsApp funcionan; el stock no se guarda ni sincroniza y los pedidos no se registran. El panel administrativo requiere una base de datos real.

## 2. Publicar en GitHub Pages

1. Crea un repositorio en GitHub, por ejemplo `mi-tienda-tecnologica`.
2. Sube **el contenido de esta carpeta a la raíz** del repositorio: `index.html`, `admin.html`, `css/`, `js/`, `assets/`, `supabase/`, `.nojekyll`, etc. No subas solo el ZIP.
3. En el repositorio entra a **Settings → Pages**.
4. En **Build and deployment**, escoge **Deploy from a branch**, rama `main`, carpeta `/ (root)` y guarda.
5. Tu página tendrá una URL similar a `https://TU_USUARIO.github.io/mi-tienda-tecnologica/`.

El sitio usa rutas **relativas**, por lo que funciona también con el nombre de repositorio en la URL.

## 3. Personalizar la tienda

Edita `js/config.js`:

- `businessName`: nombre comercial (por defecto **NovaTech**; el logotipo SVG dice “N” y es editable).
- `whatsapp`: `573103024205`, sin signo `+`.
- `email`: correo público de contacto (opcional).
- `facebook`, `instagram`, `tiktok`: enlaces HTTPS a las redes sociales (opcional).
- `supabaseUrl`, `supabasePublishableKey`: solo si vas a activar el inventario.

Edita los textos corporativos en `index.html` (Nosotros, Servicios, mensajes y descripciones). Ajusta los colores en `css/styles.css` y reemplaza `assets/logo.svg` si tienes tu identidad de marca.

Las imágenes de muestra están en `assets/products/`. El panel permite **exportar el inventario como archivo CSV** para Excel. En la administración puedes utilizar una imagen almacenada allí (por ejemplo, `assets/products/mi-foto.jpg`) o una URL **HTTPS** pública. No uses enlaces temporales que requieran iniciar sesión.

## 4. Activar base de datos, ventas e inventario REAL

**GitHub Pages aloja archivos estáticos: no ejecuta una base de datos, PHP ni un backend.** Se usa [Supabase](https://supabase.com/) para alojar productos, autenticación, inventario y pedidos con permisos de acceso. La base de datos es externa; GitHub Pages continúa alojando el sitio.

1. Crea un proyecto nuevo en Supabase.
2. Abre **SQL Editor**, pega el contenido COMPLETO de `supabase/schema.sql` y ejecútalo una vez. Crea tablas, restricciones, políticas de seguridad, funciones de ventas y productos de muestra.
3. En **Project Settings / Connect**, encuentra la **Project URL** y la clave **publishable** (o clave pública `anon` legada). Colócalas en `js/config.js`:

   ```javascript
   supabaseUrl: "https://TU_PROYECTO.supabase.co",
   supabasePublishableKey: "TU_CLAVE_PUBLICA"
   ```

4. En Supabase, entra a **Authentication → Users** y crea/invita un usuario administrador con correo electrónico y contraseña. Confirma el email si tu proyecto lo exige. Por seguridad, no permitas que desconocidos se registren si no lo necesitas.
5. En SQL Editor ejecuta esta instrucción, sustituyendo el correo:

   ```sql
   insert into public.admin_users(user_id)
   select id from auth.users where email='admin@tuempresa.com'
   on conflict(user_id) do nothing;
   ```

6. Abre `admin.html`, inicia sesión y comprueba que puedes editar los productos y revisar pedidos. Puedes ocultar productos con el interruptor **Mostrar en catálogo** sin borrar el historial de ventas.
7. Publica tus cambios en GitHub. Desde ese momento se usan datos compartidos de Supabase en lugar de los seis artículos de demostración locales.

**Seguridad importante:** la clave `publishable/anon` está diseñada para ser pública y las reglas SQL aplican Row Level Security (RLS) para que visitantes solo lean productos publicados y creen pedidos por una función controlada. **Nunca** incluyas `service_role`, `sb_secret_...`, contraseñas o claves privadas en archivos del repositorio, aunque el repositorio sea privado. Los administradores se reconocen mediante una tabla protegida, no por una contraseña incrustada en JavaScript.

## 5. Cómo funciona el proceso de ventas

1. Cliente consulta nombre, **referencia, precio, imagen, stock y unidades vendidas**.
2. Agrega productos al carrito y cambia las cantidades sin superar las existencias mostradas.
3. Diligencia nombre, teléfono y notas, si las tiene.
4. El sistema calcula subtotales y total. Si Supabase está configurado, registra el pedido **pendiente** con precios verificados por la base. Abre WhatsApp al **+57 310 302 4205** con el pedido resumido. **El cliente todavía debe pulsar Enviar dentro de WhatsApp.**
5. El administrador revisa el pedido y la conversación. Una vez que confirma la venta en `admin.html`, la base de datos **descuenta stock y suma unidades vendidas en una transacción atómica**. Si no hay suficiente inventario, rechaza la confirmación sin dejar datos a medias.
6. Cancelar un pedido pendiente no toca el inventario. Revertir una venta confirmada devuelve unidades y ajusta las ventas acumuladas.
7. El catálogo se vuelve a consultar periódicamente (~45 segundos) y al recuperar el foco. El panel tiene botón **Actualizar**.

**No es posible verificar automáticamente si una conversación de WhatsApp se convirtió en venta mediante un enlace `wa.me`.** Para descontar inventario inmediatamente después del pago o sincronizar mensajes reales se requiere una integración autorizada con API de WhatsApp Business y un backend adicional; esta plantilla **no finge** esa integración.

## 6. Archivos

```text
index.html                  Página principal, catálogo, carrito y contacto
admin.html                  Inicio de sesión y panel de administración
css/styles.css              Diseño responsive tecnológico
js/config.js                Teléfono, nombre, redes, Supabase
js/data.js                  Catálogo de ejemplo (visible también al abrir HTML local)
js/shared.js                Utilidades compartidas
js/api.js                   Consultas y operaciones seguras a Supabase
js/main.js                  Tienda, carrito, WhatsApp y mensajes
js/admin.js                 Inventario, pedidos y autenticación
assets/logo.svg             Logo editable
assets/favicon.svg          Icono del navegador
assets/products/*.svg       7 ilustraciones de producto de ejemplo
supabase/schema.sql         Estructura SQL, RLS, transacciones y datos iniciales
.nojekyll                   Desactiva tratamiento Jekyll de GitHub Pages
```

## 7. Recomendaciones para la operación

- Cambia precios, productos y cantidades de demostración antes de vender.
- Verifica los mensajes de WhatsApp antes de confirmar una venta. Un pedido pendiente puede haberse creado aunque el cliente nunca haya pulsado “Enviar” en WhatsApp.
- Habilita verificación antispam (por ejemplo, una función de servidor con CAPTCHA/rate limiting) si se abusa del formulario público. La plantilla básica limita cantidades pero no evita todos los pedidos falsos.
- Activa MFA para tu cuenta de administrador cuando corresponda y revisa el uso/cuotas de Supabase.
- La información de clientes (nombre y teléfono) se almacena en Supabase al registrar el pedido; añade una política de privacidad adecuada y las autorizaciones de tratamiento de datos antes de usarla comercialmente.
- Revisa inventario con frecuencia; los pedidos pendientes **no reservan unidades**.

Creado como plantilla adaptable. Las referencias y los precios de ejemplo son ficticios.


## 8. Corrección de visualización del catálogo (octubre 2026)

- Se corrigió la dependencia de módulos ES en la página pública. Abre directamente `index.html` o publícalo en GitHub Pages.
- Hay seis artículos de muestra con imágenes, referencias, precios, existencias y contador de ventas. También están incluidos en el HTML de respaldo por si JavaScript no se ejecuta.
- Filtros, búsqueda, botones `+` y carrito funcionan sin conectar Supabase.
- Si la base de datos real está caída, la página **no queda vacía**: muestra artículos de ejemplo con aviso claro; no los presenta como stock real ni registra ventas ficticias.
- Para reemplazar todos los archivos en GitHub, sube el **contenido del ZIP descomprimido** a la raíz de tu repositorio, respetando la estructura `js/`, `css/`, `assets/` y `supabase/`.
- Al actualizar en GitHub, recarga el sitio con `Ctrl+F5` si el navegador todavía muestra la versión anterior.
