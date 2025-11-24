# ✅ Checklist de Implementación - Google Sheets Backend

## Configuración Inicial

### 1. Google Cloud Console
- [ ] Crear proyecto en Google Cloud Console
- [ ] Habilitar Google Sheets API
- [ ] Crear API Key
  - [ ] Restringir a Google Sheets API (recomendado)
  - [ ] Copiar la API Key
- [ ] Configurar pantalla de consentimiento OAuth
  - [ ] Nombre de la aplicación: "Volleyball Scoring"
  - [ ] Email de soporte
  - [ ] Añadir scope: `https://www.googleapis.com/auth/spreadsheets`
  - [ ] Añadir usuarios de prueba (emails de la federación)
- [ ] Crear OAuth 2.0 Client ID
  - [ ] Tipo: Aplicación web
  - [ ] Añadir orígenes autorizados (localhost y dominio producción)
  - [ ] Copiar el Client ID

### 2. Google Sheets
- [ ] Crear nueva hoja de cálculo: "Volleyball Scoring - Actas"
- [ ] Crear 3 pestañas:
  - [ ] `Partidos`
  - [ ] `Evaluaciones`
  - [ ] `Resultados`
- [ ] Copiar el ID de la hoja desde la URL
- [ ] Configurar permisos:
  - [ ] Compartir con miembros de la federación
  - [ ] Definir roles (Editor/Lector)

### 3. Configuración Local
- [ ] Copiar `config.example.js` → `config.js`
- [ ] Completar en `config.js`:
  - [ ] `API_KEY` → Tu API Key de Google
  - [ ] `CLIENT_ID` → Tu Client ID de OAuth
  - [ ] `SPREADSHEET_ID` → ID de tu hoja de Google Sheets
- [ ] Verificar que `config.js` está en `.gitignore`

## Primera Ejecución

### 4. Iniciar Aplicación
- [ ] Instalar servidor local:
  - [ ] Opción 1: Live Server en VS Code
  - [ ] Opción 2: `python -m http.server 5500`
  - [ ] Opción 3: `npx http-server -p 5500`
- [ ] Abrir navegador en `http://localhost:5500`
- [ ] Verificar que no hay errores en consola (F12)

### 5. Autenticación
- [ ] Hacer clic en "🔐 Conectar con Google"
- [ ] Autorizar el acceso en la ventana de Google
- [ ] Verificar que aparecen los botones:
  - [ ] "🔄 Sincronizar"
  - [ ] "🚪 Cerrar Sesión"
- [ ] Aceptar inicializar las cabeceras de la hoja
- [ ] Verificar que las cabeceras se crearon en Google Sheets

### 6. Pruebas Básicas
- [ ] **Crear Partido:**
  - [ ] Ir a Panel de Administración
  - [ ] Crear un partido de prueba
  - [ ] Verificar que aparece en la lista
  - [ ] Verificar que se guardó en Google Sheets (pestaña "Partidos")
  
- [ ] **Completar Acta:**
  - [ ] Ir a "Completar Acta (Equipos)"
  - [ ] Seleccionar el partido de prueba
  - [ ] Identificarse como equipo Local
  - [ ] Completar evaluación
  - [ ] Enviar
  - [ ] Verificar que se guardó en Google Sheets (pestaña "Evaluaciones")
  
- [ ] **Ver Resultados:**
  - [ ] Completar la segunda acta (equipo Visitante)
  - [ ] Ir a "Ver Resultados"
  - [ ] Verificar que se muestra el partido completo

### 7. Pruebas de Sincronización
- [ ] Crear varios partidos
- [ ] Verificar sincronización automática
- [ ] Cerrar sesión de Google
- [ ] Crear partido en modo offline
- [ ] Volver a conectar
- [ ] Hacer clic en "🔄 Sincronizar"
- [ ] Verificar que el partido offline se subió a la nube

## Seguridad y Producción

### 8. Seguridad
- [ ] Verificar que `config.js` NO está en Git
- [ ] Limitar orígenes autorizados en Google Cloud Console
- [ ] Revisar usuarios de prueba en OAuth
- [ ] Configurar permisos adecuados en Google Sheets
- [ ] No compartir credenciales públicamente

### 9. Backup
- [ ] Crear copia de seguridad de la hoja de Google Sheets
- [ ] Configurar historial de versiones en Google Sheets
- [ ] Exportar datos periódicamente (opcional)

### 10. Documentación
- [ ] Leer `README.md` completo
- [ ] Revisar `SETUP_GOOGLE_SHEETS.md` para detalles técnicos
- [ ] Consultar `GUIA_RAPIDA.md` para uso diario
- [ ] Compartir documentación con usuarios

## Despliegue

### 11. Preparar para Producción
- [ ] Obtener dominio/hosting si es necesario
- [ ] Actualizar orígenes autorizados en Google Cloud Console
- [ ] Añadir dominio de producción a OAuth
- [ ] Actualizar `config.js` si es necesario
- [ ] Publicar aplicación

### 12. Capacitación
- [ ] Capacitar administradores en creación de partidos
- [ ] Capacitar equipos en completar actas
- [ ] Explicar plazos (lunes 12:00h)
- [ ] Mostrar cómo ver resultados
- [ ] Explicar sincronización y modo offline

### 13. Monitoreo
- [ ] Verificar logs en Google Cloud Console
- [ ] Revisar actividad en Google Sheets
- [ ] Solicitar feedback de usuarios
- [ ] Atender incidencias

## Solución de Problemas

### Si algo no funciona:
1. [ ] Abrir consola del navegador (F12)
2. [ ] Buscar mensajes de error
3. [ ] Verificar credenciales en `config.js`
4. [ ] Verificar que la API está habilitada
5. [ ] Comprobar permisos de la hoja
6. [ ] Revisar usuarios de prueba en OAuth
7. [ ] Consultar `GUIA_RAPIDA.md` → Solución de Problemas

## Notas Adicionales

### Recomendaciones:
- ✅ Hacer pruebas exhaustivas antes del uso real
- ✅ Mantener backup de datos importantes
- ✅ Comunicar plazos claramente a los equipos
- ✅ Revisar periódicamente la sincronización
- ✅ Actualizar documentación si hay cambios

### Recordatorios:
- ⚠️ No subir `config.js` a Git público
- ⚠️ Respetar límites de API de Google (100 requests/100 segundos)
- ⚠️ La primera vez puede pedir autorización varias veces (normal)
- ⚠️ Si cambias el SPREADSHEET_ID, debes inicializar cabeceras de nuevo

---

## ✅ Estado del Proyecto

**Completado cuando todas las casillas estén marcadas:**
- [ ] Configuración completa
- [ ] Pruebas exitosas
- [ ] Seguridad verificada
- [ ] Documentación leída
- [ ] Usuarios capacitados
- [ ] Sistema en producción

**Fecha de implementación:** _______________
**Responsable:** _______________
**Notas:** _______________
