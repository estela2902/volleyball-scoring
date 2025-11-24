# 🏐 Sistema de Actas de Calificación - Voleibol

## 📋 Descripción

Aplicación web para gestionar actas de calificación digitales de partidos de voleibol para los Juegos Deportivos del Principado de Asturias. Incluye evaluación de Fair Play y almacenamiento en **Google Sheets** para colaboración en tiempo real entre todos los miembros de la federación.

## ⚠️ Importante

**PLAZO DE ENTREGA:** Las actas deben ser completadas **antes del lunes siguiente a las 12:00 horas** tras la finalización del partido.

## ✨ Características Principales

- 📝 **Gestión de Partidos**: Crear y administrar partidos desde panel de administración
- 🏆 **Evaluación Fair Play**: Sistema de puntuación 0-4 puntos por categoría
- ☁️ **Google Sheets**: Almacenamiento en la nube con Google Workspace
- 🔄 **Sincronización Automática**: Datos guardados automáticamente en Google Sheets
- 📱 **Diseño Responsive**: Funciona en ordenadores, tablets y móviles
- 🔐 **Autenticación Google**: OAuth 2.0 para acceso seguro
- 💾 **Modo Offline**: Funciona sin conexión usando localStorage
- ⏰ **Alerta de plazos**: Avisa si se envía fuera del plazo (lunes 12:00h)
- 📊 **Visualización de Resultados**: Panel para consultar todos los partidos completados

## 🏐 Secciones de Evaluación

Cada equipo evalúa al equipo contrario en 4 categorías (0-4 puntos cada una):

1. **Entrenador/a Contrario/a** - Conducta y actitud del entrenador
2. **Deportistas Equipo Contrario** - Comportamiento de los jugadores
3. **Árbitro/a** - Calidad del arbitraje
4. **Conducta de la Afición** - Comportamiento de los espectadores

**Puntuación Total:** 0-16 puntos por equipo

## 🚀 Inicio Rápido

### Instalación y Configuración

1. **Configura Google Sheets API**
   - Lee la guía completa: [`SETUP_GOOGLE_SHEETS.md`](./SETUP_GOOGLE_SHEETS.md)
   - Crea proyecto en Google Cloud Console
   - Habilita Google Sheets API
   - Crea credenciales (API Key + OAuth 2.0)

2. **Configura la aplicación**
   ```bash
   cp config.example.js config.js
   # Edita config.js con tus credenciales
   ```

3. **Inicia servidor local**
   ```bash
   # Con Live Server de VS Code (recomendado)
   # O con Python
   python -m http.server 5500
   ```

4. **Abre en el navegador**
   ```
   http://localhost:5500
   ```

### Uso Diario

#### Para Administradores
1. Accede al **Panel de Administración**
2. Crea nuevos partidos con toda la información
3. Los partidos se sincronizan automáticamente con Google Sheets

#### Para Equipos
1. Accede a **"Completar Acta (Equipos)"**
2. Filtra y selecciona tu partido
3. Identifícate como Local o Visitante
4. Completa resultado y evaluación Fair Play
5. Envía antes del **lunes 12:00h**

#### Ver Resultados
1. Accede a **"Ver Resultados"**
2. Consulta partidos completados
3. Filtra por categoría
4. Ver detalles completos de cada partido

## 🔄 Sincronización con Google Sheets

### Conectar
1. Clic en **"🔐 Conectar con Google"**
2. Autoriza el acceso
3. Primera vez: Acepta inicializar cabeceras

### Automático
- Crear partido → Se guarda en Google Sheets
- Enviar evaluación → Se guarda en Google Sheets
- Eliminar partido → Se elimina de Google Sheets

### Manual
- Clic en **"🔄 Sincronizar"** para forzar sincronización

## 📊 Estructura de Google Sheets

### Hoja "Partidos"
| ID | Modalidad | Categoría | Sexo | Grupo | Fecha | Hora | Lugar | Equipo Local | Equipo Visitante | Estado | Fecha Creación |

### Hoja "Evaluaciones"
| ID | Match ID | Equipo | Nombre Equipo | ... | Total Puntos | Firma | Fecha Envío |

### Hoja "Resultados"
(Opcional - Para reportes personalizados)

## 🏗️ Arquitectura

```
volleyball-scoring/
├── index.html                  # Interfaz de usuario
├── script.js                   # Lógica principal
├── styles.css                  # Estilos visuales
├── googleSheetsService.js      # Google Sheets API
├── config.js                   # Configuración (privado)
├── config.example.js           # Plantilla
├── SETUP_GOOGLE_SHEETS.md     # Guía de configuración
└── GUIA_RAPIDA.md             # Guía de uso rápido
```

## 🛠️ Tecnologías

- **Frontend**: HTML5, CSS3, JavaScript Vanilla
- **Backend**: Google Sheets API v4
- **Autenticación**: Google OAuth 2.0
- **Storage**: localStorage + Google Sheets

## 📱 Compatibilidad

| Navegador | Soporte |
|-----------|---------|
| Chrome/Edge | ✅ Completo |
| Firefox | ✅ Completo |
| Safari | ✅ Completo |
| IE | ❌ No soportado |

## 🔐 Seguridad

### Credenciales
- ✅ `config.js` en `.gitignore`
- ❌ Nunca subir credenciales a Git público
- ✅ Limitar orígenes en Google Cloud Console

### Permisos Google Sheets
- Editor: Solo administradores
- Lector/Comentador: Otros usuarios
- Compartir solo con la federación

## 🐛 Solución de Problemas

Ver [`GUIA_RAPIDA.md`](./GUIA_RAPIDA.md) para soluciones detalladas.

**Comunes:**
- "Access blocked" → Añadir usuario de prueba en OAuth
- "API key not valid" → Verificar API habilitada
- No sincroniza → Verificar permisos de la hoja

## 📈 Roadmap

- [ ] Exportar actas a PDF
- [ ] Dashboard estadísticas Fair Play
- [ ] Notificaciones automáticas
- [ ] App móvil (PWA)
- [ ] Integración con calendario

## 📞 Soporte

Para soporte técnico, consulta:
1. [`GUIA_RAPIDA.md`](./GUIA_RAPIDA.md)
2. [`SETUP_GOOGLE_SHEETS.md`](./SETUP_GOOGLE_SHEETS.md)
3. Consola del navegador (F12)
4. Google Cloud Console logs

---

**Versión:** 2.0 (con Google Sheets)  
**Fecha:** Noviembre 2025  
**Organización:** Juegos Deportivos del Principado de Asturias  
**Desarrollado por:** Estela González - ACM TEMU
