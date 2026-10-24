# Porra & Motola · Tienda de gorras

Sitio web estático de la tienda de gorras **Porra & Motola**. Tiene catálogo, carrito, pedidos por WhatsApp y panel de administrador. Funciona en GitHub Pages sin servidor ni base de datos.

## Estructura

```
index.html                 Página principal (Inicio, Catálogo, Contáctenos, Pagos)
404.html                   Página de error que redirige al inicio
.nojekyll                  Hace que GitHub Pages publique los archivos tal cual
assets/
  css/styles.css           Estilos, colores y degradados
  js/app.js                Catálogo, carrito, pedidos, contacto y panel admin
  img/mascota.webp         Ilustración principal del inicio
  img/fondo-inicio.jpg     Imagen fija mientras carga el video
  img/logo-sello.png       Sello circular para la vista previa al compartir
  img/logo-letras.webp     Logo en letras (encabezado y pie de página)
  img/fondo-patron.webp    Fondo geométrico de los banners
  img/favicon.png          Icono de la pestaña del navegador
  video/fondo-inicio.mp4   Video de fondo (marca de agua) del inicio, en bucle y sin sonido
```

## Cómo subirlo a GitHub Pages

1. Entra a tu repositorio en GitHub (por ejemplo `alvaromejia1990-bit/gorrascaps`).
2. Pulsa **Add file → Upload files**.
3. Arrastra **todo el contenido** de esta carpeta: `index.html`, `404.html`, `.nojekyll`, `README.md` y la carpeta `assets`.
   - Los archivos deben quedar en la raíz del repositorio, no dentro de otra carpeta.
   - `.nojekyll` es un archivo oculto. Si no se ve al arrastrar, créalo en GitHub con **Add file → Create new file**, nómbralo `.nojekyll` y guárdalo vacío.
4. Escribe un mensaje (por ejemplo, "Sitio Porra & Motola") y pulsa **Commit changes**.
5. Ve a **Settings → Pages**. En **Source** elige **Deploy from a branch**, rama `main` y carpeta `/ (root)`. Pulsa **Save**.
6. Espera uno o dos minutos. El sitio queda publicado en `https://alvaromejia1990-bit.github.io/gorrascaps/`.

Para actualizar el sitio más adelante, sube de nuevo los archivos que cambiaste. GitHub reemplaza los anteriores.

## Ajustes frecuentes (en `assets/js/app.js`)

| Qué cambiar | Dónde |
|---|---|
| Número de WhatsApp | constante `WA` (formato `57XXXXXXXXXX`) |
| Enlaces de Instagram, Facebook y TikTok | constante `SOCIAL` |
| Clave del panel de administrador | constante `ADMIN_PIN` |
| Referencias, nombres, precios, existencias y colores | lista `SEED_PRODUCTS` |
| Nombres y descripciones de las colecciones | lista `COLLECTIONS` |

Si cambias `SEED_PRODUCTS`, sube también el valor de `KEY` (por ejemplo `pm_store_v3`). Así los navegadores que ya visitaron el sitio cargan los datos nuevos.

## Video de fondo

El video del inicio se reproduce en bucle, sin sonido y con baja opacidad. Para cambiarlo, reemplaza `assets/video/fondo-inicio.mp4` por otro MP4 con el mismo nombre. Para hacerlo más o menos visible, ajusta `opacity` en la regla `.bgvid` de `assets/css/styles.css`. Si el visitante tiene activada la opción de reducir movimiento, el video queda en pausa.

## Límites

- **Datos locales:** visitas, pedidos y cambios de inventario hechos en el panel se guardan solo en el navegador donde se hicieron. Para estadísticas reales de todos los clientes, conecta un servicio externo como Google Analytics o Firebase.
- **Datos de ejemplo:** el panel trae pedidos ficticios para que se vea con información. Bórralos con **Reiniciar datos** o quitando la función `seed()`.
- **Clave visible:** cualquiera que revise el código puede ver la clave del panel. Sirve como acceso rápido, no como protección real.
