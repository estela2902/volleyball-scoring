# Acta de Calificación - Juegos Deportivos del Principado de Asturias

## 📋 Descripción

Aplicación web para que los equipos de voleibol completen el acta de calificación después de cada partido. El sistema permite evaluar la conducta deportiva de entrenadores, deportistas, árbitros y afición, calculando automáticamente las puntuaciones totales.

## ⚠️ Importante

**PLAZO DE ENTREGA:** Las actas deben ser completadas **antes del lunes siguiente a las 12:00 horas** tras la finalización del partido.

## 🎯 Características

- **Formulario completo** basado en el acta oficial de los Juegos Deportivos del Principado de Asturias
- **Cálculo automático** de puntuaciones totales
- **Validación de campos** requeridos
- **Alerta de plazo** - avisa si se está enviando fuera del plazo límite
- **Diseño responsive** - funciona en ordenadores, tablets y móviles
- **Exportación a PDF** - imprime o guarda el acta completada
- **Almacenamiento local** - guarda las actas enviadas

## 🏐 Secciones de Evaluación

Cada equipo evalúa al equipo contrario en 4 categorías (0-4 puntos cada una):

1. **Entrenador/a Contrario/a** - Conducta y actitud del entrenador
2. **Deportistas Equipo Contrario** - Comportamiento de los jugadores
3. **Árbitro/a** - Calidad del arbitraje
4. **Conducta de la Afición** - Comportamiento de los espectadores

**Puntuación Total:** 0-16 puntos por equipo

## 🚀 Uso

1. Abre `index.html` en tu navegador web
2. Completa los datos del partido (modalidad, categoría, fecha, lugar)
3. Introduce los nombres de ambos equipos
4. Registra el resultado del partido
5. Evalúa cada categoría seleccionando la opción apropiada (0-4 puntos)
6. Los totales se calculan automáticamente
7. Firma el acta
8. Haz clic en "Guardar y Enviar"

## 💾 Almacenamiento

Las actas se guardan en el almacenamiento local del navegador (localStorage). Para una implementación en producción, se recomienda:

- Conectar con un backend (Node.js, PHP, etc.)
- Guardar en una base de datos
- Enviar notificaciones por email
- Implementar autenticación de usuarios

## 📄 Exportar PDF

Haz clic en "Exportar a PDF" para:
- Imprimir el acta
- Guardar como PDF (usando "Imprimir a PDF")
- Crear una copia física del documento

## 🔧 Personalización

### Modificar colores del badge de puntuación

Edita `styles.css`:

```css
.score-badge.red { background-color: #e53e3e; }
.score-badge.orange { background-color: #ed8936; }
.score-badge.yellow { background-color: #ecc94b; }
.score-badge.light-green { background-color: #48bb78; }
.score-badge.green { background-color: #2f855a; }
```

### Cambiar el plazo de entrega

Modifica la función `checkDeadline()` en `script.js`.

## 📱 Responsive Design

La aplicación se adapta a diferentes tamaños de pantalla:
- **Desktop:** Vista de dos columnas (equipos lado a lado)
- **Tablet/Móvil:** Vista de una columna (equipos apilados)

## 🌐 Compatibilidad

- Chrome, Firefox, Safari, Edge (versiones modernas)
- Dispositivos móviles iOS y Android
- Requiere JavaScript habilitado

## 📊 Datos Guardados

Cada acta guardada incluye:
- Información del partido (modalidad, categoría, fecha, lugar)
- Datos de ambos equipos (nombre, resultado, puntuaciones, firma)
- Fecha y hora de envío
- Puntuaciones totales calculadas

## 🔐 Seguridad

Para uso en producción, implementa:
- Autenticación de usuarios
- Validación server-side
- Protección CSRF
- Conexión HTTPS
- Backup de datos

## 📞 Soporte

Para modificaciones o preguntas sobre la implementación, consulta el código fuente o contacta con el administrador del sistema.

---

**Versión:** 1.0  
**Fecha:** Noviembre 2025  
**Organización:** Juegos Deportivos del Principado de Asturias
