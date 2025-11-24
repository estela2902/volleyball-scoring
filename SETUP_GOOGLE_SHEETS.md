# Configuración de Google Sheets API

Esta guía te ayudará a configurar el backend con Google Sheets API para la aplicación de Actas de Calificación de Voleibol.

## Paso 1: Crear un Proyecto en Google Cloud Console

1. Ve a [Google Cloud Console](https://console.cloud.google.com/)
2. Crea un nuevo proyecto o selecciona uno existente
3. Dale un nombre como "Volleyball Scoring App"

## Paso 2: Habilitar Google Sheets API

1. En el menú lateral, ve a **APIs y servicios** > **Biblioteca**
2. Busca "Google Sheets API"
3. Haz clic en **Habilitar**

## Paso 3: Crear Credenciales

### 3.1 API Key (para acceso público)

1. Ve a **APIs y servicios** > **Credenciales**
2. Haz clic en **+ CREAR CREDENCIALES** > **Clave de API**
3. Copia la API Key generada
4. (Opcional pero recomendado) Haz clic en **Editar clave de API**
5. En **Restricciones de API**, selecciona "Restringir clave"
6. Marca solo **Google Sheets API**
7. Guarda los cambios

### 3.2 OAuth 2.0 Client ID (para autenticación de usuarios)

#### Parte A: Configurar Pantalla de Consentimiento

1. Ve a **APIs y servicios** > **Pantalla de consentimiento de OAuth**
2. Selecciona **Externo** y haz clic en **Crear**
3. **Página 1 - Información de la aplicación:**
   - **Nombre de la aplicación**: Volleyball Scoring
   - **Correo electrónico de asistencia**: tu email
   - **Logotipo de la aplicación**: (opcional, puedes dejarlo vacío)
   - **Dominios de la aplicación**: (opcional)
   - **Correo de contacto del desarrollador**: tu email
   - Haz clic en **GUARDAR Y CONTINUAR**

4. **Página 2 - Ámbitos (Scopes):**
   - Haz clic en **AGREGAR O QUITAR ÁMBITOS**
   - Se abrirá un panel lateral
   - En el buscador escribe: `spreadsheets`
   - Busca en la lista: **Google Sheets API** con el ámbito `.../auth/spreadsheets`
   - ✅ Marca la casilla junto a: `https://www.googleapis.com/auth/spreadsheets`
     - Descripción: "Ver, editar, crear y eliminar todas tus hojas de cálculo de Hojas de cálculo de Google"
   - Haz clic en **ACTUALIZAR** (abajo del panel)
   - Verifica que aparezca en "Tus ámbitos restringidos"
   - Haz clic en **GUARDAR Y CONTINUAR**

5. **Página 3 - Usuarios de prueba:**
   - Haz clic en **+ ADD USERS** (+ AGREGAR USUARIOS)
   - Añade los emails de las personas que usarán la app (uno por línea):
     - tu_email@gmail.com
     - email_federacion@gmail.com
     - etc.
   - Haz clic en **AGREGAR**
   - Haz clic en **GUARDAR Y CONTINUAR**

6. **Página 4 - Resumen:**
   - Revisa la información
   - Haz clic en **VOLVER AL PANEL**

#### Parte B: Crear OAuth Client ID

7. Vuelve a **APIs y servicios** > **Credenciales**
8. Haz clic en **+ CREAR CREDENCIALES** > **ID de cliente de OAuth**
9. **Tipo de aplicación**: Selecciona **Aplicación web**
10. **Nombre**: Escribe "Volleyball Scoring Client"
11. **Orígenes autorizados de JavaScript:**
    - Haz clic en **+ AGREGAR URI**
    - Añade: `http://localhost:5500`
    - Haz clic en **+ AGREGAR URI** otra vez
    - Añade: `http://127.0.0.1:5500`
    - Si tienes un dominio de producción, añádelo también (ej: `https://tudominio.com`)
12. **URIs de redirección autorizados**: (déjalo vacío por ahora)
13. Haz clic en **CREAR**
14. 🎉 Aparecerá un popup con tu **Client ID** - **CÓPIALO**
15. También puedes copiarlo después desde la lista de credenciales

## Paso 4: Crear la Hoja de Cálculo

1. Ve a [Google Sheets](https://sheets.google.com)
2. Crea una nueva hoja de cálculo
3. Nómbrala "Volleyball Scoring - Actas"
4. Crea 3 pestañas (hojas):
   - `Partidos`
   - `Evaluaciones`
   - `Resultados`
5. Copia el ID de la hoja desde la URL:
   - URL: `https://docs.google.com/spreadsheets/d/ESTE_ES_EL_ID/edit`
   - Copia solo el ID (entre `/d/` y `/edit`)

## Paso 5: Compartir la Hoja

1. Haz clic en **Compartir** (botón verde arriba a la derecha)
2. Cambia los permisos a **Cualquier persona con el enlace puede editar**
   - O añade específicamente los correos de los usuarios

## Paso 6: Configurar la Aplicación

Abre el archivo `config.js` y completa los valores:

```javascript
const GOOGLE_CONFIG = {
    API_KEY: 'TU_API_KEY_AQUI',
    CLIENT_ID: 'TU_CLIENT_ID_AQUI.apps.googleusercontent.com',
    SPREADSHEET_ID: 'TU_SPREADSHEET_ID_AQUI',
    
    SCOPES: 'https://www.googleapis.com/auth/spreadsheets',
    
    SHEETS: {
        PARTIDOS: 'Partidos',
        EVALUACIONES: 'Evaluaciones',
        RESULTADOS: 'Resultados'
    }
};
```

## Paso 7: Actualizar index.html

Añade las referencias a los nuevos archivos antes de `</body>`:

```html
<!-- Google API -->
<script src="config.js"></script>
<script src="googleSheetsService.js"></script>
<script src="script.js"></script>
```

## Paso 8: Inicializar la Hoja

Cuando abras la aplicación por primera vez, deberás:

1. Autenticarte con Google
2. Ejecutar el método para inicializar las cabeceras de la hoja

Esto se hará automáticamente la primera vez que uses la app.

## Paso 9: Probar la Aplicación

1. Abre `index.html` con un servidor local (no abrir directamente el archivo)
   - Puedes usar Live Server en VS Code
   - O Python: `python -m http.server 5500`
2. La primera vez pedirá autorización de Google
3. Acepta los permisos solicitados
4. ¡Listo! Los datos se guardarán en Google Sheets

## Estructura de las Hojas

### Hoja "Partidos"
| ID | Modalidad | Categoría | Sexo | Grupo | Fecha | Hora | Lugar | Equipo Local | Equipo Visitante | Estado | Fecha Creación |

### Hoja "Evaluaciones"
| ID | Match ID | Equipo | Nombre Equipo | Nombre Contrario | Sets Ganados | Sets Contrario | Puntos Entrenador | Puntos Deportistas | Puntos Árbitro | Puntos Afición | Total Puntos | Firma | Fecha Envío |

## ❓ Preguntas Frecuentes

### ¿Dónde encuentro el ámbito (scope) de Google Sheets?

En la configuración de OAuth, cuando estés en "Ámbitos":
1. Haz clic en "AGREGAR O QUITAR ÁMBITOS"
2. Escribe en el buscador: `spreadsheets` o `sheets`
3. Busca: **Google Sheets API**
4. El ámbito correcto es: `https://www.googleapis.com/auth/spreadsheets`
5. Tiene esta descripción: "Ver, editar, crear y eliminar todas tus hojas de cálculo"

**IMPORTANTE:** Si no aparece el ámbito, asegúrate de haber habilitado la Google Sheets API primero (Paso 2).

### ¿Qué URL pongo en "Orígenes autorizados"?

Durante desarrollo local:
- `http://localhost:5500` (si usas puerto 5500)
- `http://127.0.0.1:5500`

Para producción:
- `https://tudominio.com` (con HTTPS)

**NO uses** `file://` ni abras el HTML directamente. Siempre usa un servidor local.

### ¿Puedo saltarme los usuarios de prueba?

No, son obligatorios si tu app está en modo "Externo". Añade al menos tu propio email. Cuando la app esté lista, puedes publicarla o cambiar a "Interno" (solo para Google Workspace).

## Solución de Problemas

### Error: "Access blocked: This app's request is invalid"
**Causas:**
- La pantalla de consentimiento no está configurada
- Falta añadir el ámbito de Google Sheets
- Tu email no está en usuarios de prueba

**Solución:**
1. Ve a Pantalla de consentimiento de OAuth
2. Verifica que el ámbito `https://www.googleapis.com/auth/spreadsheets` esté añadido
3. Añade tu email en "Usuarios de prueba"
4. Guarda los cambios

### Error: "The caller does not have permission"
**Causas:**
- La hoja de cálculo no tiene permisos correctos
- El SPREADSHEET_ID es incorrecto

**Solución:**
1. Abre tu hoja de Google Sheets
2. Clic en "Compartir" → "Cualquier persona con el enlace puede editar"
3. Verifica el SPREADSHEET_ID en config.js (está en la URL de la hoja)

### Error: "API key not valid" o "API key not found"
**Causas:**
- La API Key no está correctamente copiada en config.js
- Google Sheets API no está habilitada
- La API Key tiene restricciones incorrectas

**Solución:**
1. Ve a Credenciales → Encuentra tu API Key
2. Copia el valor completo (sin espacios)
3. Verifica en APIs y servicios → Biblioteca que "Google Sheets API" esté HABILITADA
4. Si restringiste la API Key, verifica que solo esté marcada "Google Sheets API"

### Error: "Origin http://localhost:5500 is not allowed"
**Causas:**
- El origen no está añadido en OAuth Client ID

**Solución:**
1. Ve a Credenciales → Tu OAuth Client ID
2. Edita "Orígenes autorizados de JavaScript"
3. Añade `http://localhost:5500` (o el puerto que uses)
4. Guarda los cambios
5. Espera 5 minutos para que se propague

### La app no carga o muestra pantalla en blanco
**Causas:**
- Estás abriendo el HTML directamente (file://)
- config.js no está cargado correctamente

**Solución:**
1. Cierra el archivo HTML
2. Inicia un servidor local:
   - VS Code: Extensión "Live Server" → Clic derecho en index.html → "Open with Live Server"
   - Python: `python -m http.server 5500` en la carpeta del proyecto
   - Node: `npx http-server -p 5500` en la carpeta del proyecto
3. Abre `http://localhost:5500` en el navegador
4. Presiona F12 → Consola para ver errores

### No aparece el botón "Conectar con Google"
**Causas:**
- Los scripts no se cargaron correctamente
- Error en config.js

**Solución:**
1. Abre la consola del navegador (F12)
2. Busca errores en rojo
3. Verifica que config.js, googleSheetsService.js y script.js estén cargados
4. Verifica que config.js tenga valores válidos (no "TU_API_KEY_AQUI")

## Notas de Seguridad

⚠️ **IMPORTANTE**: 
- No subas el archivo `config.js` con tus credenciales a repositorios públicos
- Considera usar variables de entorno en producción
- Limita los orígenes autorizados en la configuración de OAuth

## Modo Offline / Desarrollo

Durante el desarrollo, los datos también se guardan en localStorage como respaldo. La sincronización con Google Sheets ocurre cuando:
- Se crea un nuevo partido
- Se envía una evaluación
- Se solicita explícitamente sincronizar

Esto permite trabajar offline y sincronizar después.
