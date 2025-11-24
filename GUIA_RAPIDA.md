# 🏐 Guía Rápida - Actas de Calificación Voleibol

## 📋 Resumen del Sistema

Esta aplicación permite gestionar actas de calificación de partidos de voleibol de forma digital, con almacenamiento en **Google Sheets** para facilitar el acceso compartido y colaboración entre la federación.

## 🚀 Inicio Rápido

### 1. Configuración Inicial (Solo la primera vez)

1. **Sigue la guía completa**: Lee `SETUP_GOOGLE_SHEETS.md` para configurar Google Cloud y crear las credenciales
2. **Crea el archivo de configuración**:
   - Copia `config.example.js` → `config.js`
   - Completa con tus credenciales de Google
3. **Crea la hoja de cálculo** en Google Sheets con 3 pestañas:
   - `Partidos`
   - `Evaluaciones`
   - `Resultados`

### 2. Ejecutar la Aplicación

```bash
# Con Live Server de VS Code
# O con Python
python -m http.server 5500

# O con Node.js
npx http-server -p 5500
```

⚠️ **IMPORTANTE**: No abrir el archivo HTML directamente. Usar un servidor local.

### 3. Primer Uso

1. Abre la aplicación en el navegador
2. Haz clic en **"🔐 Conectar con Google"**
3. Autoriza el acceso a Google Sheets
4. Cuando te pregunte, acepta **inicializar las cabeceras** de la hoja
5. ¡Listo para usar!

## 📖 Cómo Usar

### Para Administradores

1. **Panel de Administración** → Crear nuevos partidos
2. Completa todos los datos del partido
3. El partido se guarda automáticamente en Google Sheets

### Para Equipos

1. **Completar Acta (Equipos)** → Selecciona tu partido
2. Identifícate como equipo Local o Visitante
3. Completa el resultado y la evaluación del rival
4. La evaluación se guarda automáticamente en Google Sheets

### Ver Resultados

1. **Ver Resultados** → Consulta partidos completados
2. Filtra por categoría si es necesario
3. Haz clic en **"Ver Detalle"** para información completa

## 🔄 Sincronización

### Modos de Operación

- **Online con Google Sheets**: Los datos se guardan automáticamente en la nube
- **Offline / Local**: Los datos se guardan en el navegador (localStorage)
- **Modo Híbrido**: Funciona offline y sincroniza cuando hay conexión

### Botones de Sincronización

- **🔐 Conectar con Google**: Autenticarse con Google
- **🔄 Sincronizar**: Subir datos locales a la nube
- **🚪 Cerrar Sesión**: Desconectar de Google

## 📊 Estructura de Datos en Google Sheets

### Hoja "Partidos"
Registra todos los partidos creados con información completa del encuentro.

### Hoja "Evaluaciones"
Guarda las evaluaciones de fair play que cada equipo hace del rival.

### Hoja "Resultados"
(Opcional) Para reportes y análisis personalizados.

## 🔐 Seguridad

### Protección de Credenciales

- El archivo `config.js` está en `.gitignore`
- **NUNCA** subir credenciales a repositorios públicos
- Limitar los orígenes autorizados en Google Cloud Console

### Permisos de la Hoja

- Compartir la hoja solo con personas autorizadas
- Usar permisos de "Editor" solo para administradores
- Considerar "Comentador" o "Lector" para otros usuarios

## 🐛 Solución de Problemas

### Error: "Access blocked"
- Verifica la configuración de OAuth en Google Cloud Console
- Añade tu email como usuario de prueba

### Error: "API key not valid"
- Verifica que Google Sheets API esté habilitada
- Revisa que la API Key esté correctamente copiada

### Los datos no se sincronizan
- Verifica la conexión a Internet
- Haz clic en el botón "🔄 Sincronizar"
- Comprueba los permisos de la hoja de Google Sheets

### La aplicación no carga
- Asegúrate de usar un servidor local (no `file://`)
- Abre la consola del navegador (F12) para ver errores
- Verifica que todos los archivos JS estén cargados correctamente

## 📱 Compatibilidad

- ✅ Chrome/Edge (Recomendado)
- ✅ Firefox
- ✅ Safari
- ⚠️ Internet Explorer NO soportado

## 🔧 Desarrollo

### Archivos Principales

- `index.html` - Interfaz de usuario
- `script.js` - Lógica de la aplicación
- `styles.css` - Estilos visuales
- `googleSheetsService.js` - Integración con Google Sheets
- `config.js` - Configuración (NO incluir en Git)

### Agregar Funcionalidades

1. Modifica `googleSheetsService.js` para nuevas funciones de API
2. Actualiza `script.js` para integrar con la interfaz
3. Ajusta `styles.css` para nuevos componentes

## 📞 Soporte

Para problemas técnicos o dudas:
1. Revisa esta guía y `SETUP_GOOGLE_SHEETS.md`
2. Consulta la consola del navegador (F12)
3. Revisa los logs en Google Cloud Console

## 📝 Notas Importantes

- Los datos locales (localStorage) se borran si se limpia el navegador
- Recomendado sincronizar con Google Sheets regularmente
- Hacer backup periódico de la hoja de Google Sheets
- El plazo límite para completar actas es el lunes a las 12:00h

## 🎯 Próximos Pasos

1. ✅ Configurar Google Sheets API
2. ✅ Conectar la aplicación
3. ✅ Crear primer partido de prueba
4. ✅ Completar acta de prueba
5. ✅ Verificar datos en Google Sheets
6. 🎉 ¡Usar en producción!
