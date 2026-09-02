# 🚀 Guía Paso a Paso: Desplegar el Sistema en Vercel con Supabase (100% Gratis)

Esta guía te explica de forma clara y detallada cómo publicar el **Sistema de Gestión de Compras y Presupuesto de Ciencias Agropecuarias (FICA)** en internet con su base de datos permanente en la nube y costo \$0.

---

## 📋 Resumen del Proceso
1. **Supabase**: Creas la base de datos PostgreSQL gratis y ejecutas el script `supabase_schema.sql`.
2. **GitHub**: Subes los archivos del proyecto a un repositorio.
3. **Vercel**: Conectas el repositorio de GitHub y configuras la variable `DATABASE_URL`.

---

## 🛠️ PASO 1: Crear la Base de Datos en Supabase (5 minutos)

1. Ingresa a **[supabase.com](https://supabase.com)** y haz clic en **"Start your project"** (puedes registrarte con tu cuenta de GitHub o Google).
2. Haz clic en el botón verde **"New Project"**.
3. Completa los datos:
   - **Name:** `compras-agro-fica`
   - **Database Password:** Elige una contraseña segura y **anótala** (la necesitarás en el paso 6).
   - **Region:** Elige `South America (São Paulo)` para máxima velocidad en Argentina.
   - **Pricing Plan:** Free Plan (\$0 / mes).
4. Haz clic en **"Create new project"** y espera 1 minuto a que termine de inicializarse.
5. En el menú lateral izquierdo de Supabase, entra a **"SQL Editor"** (ícono de terminal `>_`).
6. Haz clic en **"New query"**, abre el archivo **`supabase_schema.sql`** que está en esta carpeta, copia **todo su contenido** y pégalo en el editor de Supabase.
7. Haz clic en el botón verde **"Run"**.
   > ✅ ¡Listo! Todas las tablas, áreas, rubros y los 3 usuarios (`director`, `vicedir`, `dpto`) quedan creados en la nube.
8. En el menú lateral izquierdo, ve a **"Project Settings"** (ícono de tuerca) ➔ **"Database"** ➔ desplázate hasta **"Connection string"** ➔ selecciona la pestaña **"URI"** (o **"Transaction pooler"** en el puerto 6543 / 5432).
9. Copia esa URL de conexión. Será similar a:
   ```
   postgresql://postgres.xxxxxx:[YOUR-PASSWORD]@aws-0-sa-east-1.pooler.supabase.com:6543/postgres
   ```
   *Reemplaza `[YOUR-PASSWORD]` por la contraseña que creaste en el punto 3.*

---

## 📦 PASO 2: Subir el Proyecto a GitHub (3 minutos)

1. Abre una terminal (o usa GitHub Desktop / VS Code) en la carpeta del proyecto `c:\Users\Usuario\Documents\sistema_agro`.
2. Si aún no inicializaste Git, ejecuta:
   ```bash
   git init
   git add .
   git commit -m "Sistema de Compras FICA completo"
   ```
3. Crea un nuevo repositorio en **[github.com](https://github.com)** llamado `sistema-compras-agro` (puede ser Público o Privado).
4. Conecta y sube el código con los comandos que te indica GitHub:
   ```bash
   git branch -M main
   git remote add origin https://github.com/TU_USUARIO/sistema-compras-agro.git
   git push -u origin main
   ```

---

## 🌐 PASO 3: Desplegar en Vercel (2 minutos)

1. Ingresa a **[vercel.com](https://vercel.com)** e inicia sesión con tu cuenta de GitHub.
2. En el panel principal (Dashboard), haz clic en **"Add New..."** ➔ **"Project"**.
3. Busca tu repositorio `sistema-compras-agro` y haz clic en **"Import"**.
4. En la pantalla de configuración de Vercel:
   - **Framework Preset:** `Vite` (lo detecta automáticamente).
   - Despliega la sección **"Environment Variables"** (Variables de Entorno) y agrega:
     - **Key (Nombre):** `DATABASE_URL`
     - **Value (Valor):** Pega la URL de conexión de Supabase que obtuviste en el Paso 1 (con tu contraseña real).
5. Haz clic en el botón azul **"Deploy"**.
6. Espera 1 minuto mientras Vercel compila la aplicación y las Serverless Functions.

---

## 🎉 PASO 4: ¡Tu Sistema ya está Online!

Vercel te dará una dirección web segura con candado SSL (HTTPS) lista para compartir, por ejemplo:
👉 `https://sistema-compras-agro.vercel.app`

### 👥 Acceso de Administradores en la Web:
* **Director:** Usuario `director` | Clave `Omar26+`
* **Vicedirectora:** Usuario `vicedir` | Clave `Marisa26+`
* **Departamento:** Usuario `dpto` | Clave `Selva26+`

Cualquier otra persona que ingrese sin usuario ni clave podrá ver el panel de control, descargar las fichas oficiales en PDF y consultar los saldos en **Modo Consulta Pública**.
