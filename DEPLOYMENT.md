# Guía de Despliegue - GitHub Pages con Dominio Personalizado

## Configuración de GitHub Pages

### 1. Subir el código a GitHub

```bash
git add .
git commit -m "Preparar para despliegue en GitHub Pages"
git push origin main
```

### 2. Activar GitHub Pages

1. Ve a tu repositorio en GitHub: https://github.com/estela2972/volleyball-scoring
2. Click en **Settings** (Configuración)
3. En el menú lateral, click en **Pages**
4. En **Source** (Origen):
   - Branch: `main`
   - Folder: `/ (root)`
5. Click en **Save**
6. Espera 2-3 minutos

Tu sitio estará disponible temporalmente en:
`https://estela2972.github.io/volleyball-scoring/`

---

## Configuración del Dominio Personalizado (voleyasturias.com)

### 3. Comprar el dominio

Compra `voleyasturias.com` en alguno de estos proveedores:
- **Namecheap** (recomendado): ~10-12€/año
- **Google Domains**: ~12€/año
- **GoDaddy**: ~15€/año
- **Ionos**: ~10€/año

### 4. Configurar DNS

Una vez comprado el dominio, configura los registros DNS en tu proveedor:

#### Opción A: Dominio principal (voleyasturias.com)

Añade estos 4 registros **A**:
```
Type: A
Name: @
Value: 185.199.108.153

Type: A
Name: @
Value: 185.199.109.153

Type: A
Name: @
Value: 185.199.110.153

Type: A
Name: @
Value: 185.199.111.153
```

Y este registro **CNAME** para www:
```
Type: CNAME
Name: www
Value: estela2972.github.io
```

#### Opción B: Subdominio (ej: actas.voleyasturias.com)

Solo necesitas 1 registro **CNAME**:
```
Type: CNAME
Name: actas
Value: estela2972.github.io
```

### 5. Configurar el dominio en GitHub

1. Ve a: **Settings** → **Pages**
2. En **Custom domain**, escribe: `voleyasturias.com`
3. Click en **Save**
4. Espera 5-10 minutos
5. Marca la casilla: ✅ **Enforce HTTPS** (cuando esté disponible)

**Nota:** El archivo `CNAME` ya está creado en tu repositorio con el dominio.

---

## Actualizar Google Cloud OAuth

⚠️ **IMPORTANTE:** Después de activar GitHub Pages, actualiza las URLs autorizadas:

### 6. Actualizar Orígenes Autorizados

1. Ve a [Google Cloud Console](https://console.cloud.google.com/)
2. **APIs y servicios** → **Credenciales**
3. Click en tu OAuth Client ID: **Volleyball Scoring Client**
4. En **Orígenes autorizados de JavaScript**, añade:
   - `https://voleyasturias.com`
   - `https://www.voleyasturias.com` (si usas www)
5. Click en **GUARDAR**
6. Espera 5 minutos para que se propague

---

## Verificación

### 7. Probar el sitio

1. Abre: `https://voleyasturias.com`
2. Click en **🔐 Conectar con Google**
3. Acepta los permisos
4. Crea un partido de prueba
5. Verifica que se guarde en Google Sheets

---

## Actualización del Sitio

Para actualizar la aplicación después del despliegue:

```bash
# 1. Hacer cambios en tus archivos
# 2. Commit y push
git add .
git commit -m "Descripción de cambios"
git push origin main

# 3. GitHub Pages se actualizará automáticamente en 2-3 minutos
```

---

## Solución de Problemas

### DNS no resuelve (Error 404)
- Los cambios DNS pueden tardar hasta 48 horas
- Verifica con: https://dnschecker.org

### Error: "Origin not allowed"
- Verifica que agregaste el dominio en Google Cloud OAuth
- Espera 5-10 minutos después de guardar cambios

### HTTPS no disponible
- Espera 24 horas después de configurar DNS
- GitHub Pages generará el certificado SSL automáticamente

### El sitio muestra la URL antigua
- Limpia caché del navegador (Ctrl+F5)
- Modo incógnito para probar

---

## Notas de Seguridad

✅ Las API Keys y Client IDs en `config.public.js` son seguras de publicar porque:
- La API Key está restringida solo a Google Sheets API
- El Client ID solo permite autenticación desde dominios autorizados
- La hoja de Google Sheets tiene sus propios permisos

⚠️ **NUNCA** publiques:
- CLIENT_SECRET (ya fue eliminado del archivo público)
- Contraseñas
- Tokens de acceso

---

## Recursos

- [Documentación GitHub Pages](https://docs.github.com/es/pages)
- [Configurar dominio personalizado](https://docs.github.com/es/pages/configuring-a-custom-domain-for-your-github-pages-site)
- [DNS Checker](https://dnschecker.org)
