# Luque &amp; Merino — Nueva web

Rediseño moderno y profesional de la web de **Luque &amp; Merino**, tienda de ropa de
hogar y decoración en Alcorcón (Calle Sapporo, 20). El objetivo es una web más
atractiva, interactiva y que funcione como escaparate y publicidad del negocio.

## ¿Qué incluye?

- **Hero** con propuesta de valor y llamadas a la acción (colección + WhatsApp).
- **Franja de confianza** (confección a medida, bordado, fibras naturales, trato cercano).
- **Categorías** de producto: ropa de cama, baño, cortinas y estores, mantelerías, bebé.
- **Servicios estrella** destacados:
  - **Cortinas y estores a medida** (proceso en 3 pasos + presupuesto).
  - **Bordado personalizado** de nombres.
- **Galería de inspiración** con filtros por estancia y *lightbox*.
- **Sobre nosotros** con datos de confianza.
- **Testimonios** de clientes.
- **Visítanos**: dirección, horario, teléfono, email y **mapa de Google** embebido.
- **Contacto**: formulario que abre WhatsApp con el mensaje ya preparado.
- **Botón flotante de WhatsApp** y menú móvil.
- SEO local con datos estructurados (`schema.org/HomeGoodsStore`) y etiquetas Open Graph.

## Tecnología

Web **estática** (HTML + CSS + JavaScript, sin build) con **base de datos gestionada**
(Supabase) para el catálogo:

```
index.html         → estructura y contenido
styles.css         → diseño (paleta textil premium, responsive, animaciones)
script.js          → menú móvil, filtros, carrusel, catálogo dinámico, formulario → WhatsApp
supabase-config.js → URL y clave pública de Supabase (seguras de exponer)
admin.html/admin.js→ panel privado de gestión (/admin)
supabase-setup.sql → script para crear las tablas y cargar el catálogo inicial
```

Carga Google Fonts y la librería de Supabase por CDN. No necesita servidor ni compilación.

## Panel de administración (`/admin`)

Página **oculta** (no enlazada, con `noindex`) y **protegida por usuario y contraseña**.
Solo quien escribe `/admin` en el navegador ve el acceso. Desde ahí se puede:

Organizado en tres pestañas:

- **Productos**: añadir, editar y eliminar, con su **categoría**, **⭐ destacados**
  (salen en el carrusel del inicio) y **🏷️ ofertas** (solo se indica el % y el
  precio rebajado se calcula solo). Filtros por categoría, destacados y ofertas.
  Se pueden **subir fotos propias** desde el móvil o el ordenador.
- **Categorías**: crear, **renombrar**, **reordenar** y **eliminar**.
- **Imágenes de la web**: cambiar las fotos grandes de la página principal
  (cortinas a medida, bordados y la tienda).

Los cambios se reflejan en la web al instante. Si la base de datos no responde, la web
muestra un catálogo de demostración de respaldo.

### Puesta en marcha de la base de datos

1. Crear un proyecto en [supabase.com](https://supabase.com) (plan gratuito).
2. Copiar la **Project URL** y la **publishable key** (Project Settings → API) a `supabase-config.js`.
3. Pegar el contenido de `supabase-setup.sql` en **SQL Editor → New query → Run**,
   y después el de `supabase-setup-2.sql` (fotos propias e imágenes de la web).
4. Crear los usuarios administradores en **Authentication → Users → Add user**
   (marcando *Auto Confirm User*).

## Ver en local

Abre `index.html` en el navegador, o sirve la carpeta:

```bash
python3 -m http.server 8080
# luego abre http://localhost:8080
```

## Publicar en Vercel

Es un sitio estático, así que en Vercel:

1. **Add New… → Project** e importa este repositorio de GitHub.
2. Framework Preset: **Other** (no hace falta build).
3. Build Command: *(vacío)* · Output Directory: `./` (raíz).
4. **Deploy**. Cada `push` a la rama desplegará una nueva versión automáticamente.

## Pendiente / siguiente iteración

- Sustituir los **degradados de muestra** por **fotos reales** de la tienda, productos y trabajos.
- Conectar las **reseñas reales de Google**.
- Añadir enlace real de **Instagram** (y feed si se desea).
- Opcional: catálogo/tienda online, blog de inspiración, aviso legal y política de cookies.

---

*Los textos, horarios y datos de contacto se han tomado de la información pública del
negocio; conviene que Luque &amp; Merino los revise y confirme antes de publicar.*
