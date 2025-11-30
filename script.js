// Sistema de gestión de partidos y evaluaciones
let currentMatch = null;
let currentTeam = null;
let useCloudStorage = false;
let __submittingEvaluation = false;
const __submittingByMatch = new Map();

// Inicialización
document.addEventListener('DOMContentLoaded', async () => {

    // Botón de partidos públicos en la cabecera pública (opcional, recarga la vista)
    const btnIrPartidos2 = document.getElementById('btnIrPartidos2');
    if (btnIrPartidos2) {
        btnIrPartidos2.addEventListener('click', () => {
            document.querySelectorAll('.view').forEach(view => view.classList.add('hidden'));
            const publicViewEl = document.getElementById('publicView');
            if (publicViewEl) {
                publicViewEl.classList.remove('hidden');
                publicViewEl.style.display = '';
            }
            if (typeof cargarPartidosPublicos === 'function') {
                cargarPartidosPublicos();
            }
        });
    }
    // Botón para ir a la pantalla pública de partidos
    const btnIrPartidos = document.getElementById('btnIrPartidos');
    if (btnIrPartidos) {
        btnIrPartidos.addEventListener('click', () => {
            // Ocultar todas las vistas y mostrar solo la pública
            document.querySelectorAll('.view').forEach(view => view.classList.add('hidden'));
            const publicViewEl2 = document.getElementById('publicView');
            if (publicViewEl2) {
                publicViewEl2.classList.remove('hidden');
                publicViewEl2.style.display = '';
            }
            // Forzar recarga de partidos públicos
            if (typeof cargarPartidosPublicos === 'function') {
                cargarPartidosPublicos();
            }
        });
    }
    // --- LÓGICA VISTA PÚBLICA ---

    // Elementos de filtros y tabla (Choices.js y Grid.js)
    const filtroEdicion = document.getElementById('filtroEdicion');
    const filtroGrupo = document.getElementById('filtroGrupo');
    const filtroEquipoLocal = document.getElementById('filtroEquipoLocal');
    const btnLimpiarFiltros = document.getElementById('btnLimpiarFiltros');
    const publicMatchesList = document.getElementById('publicMatchesList');

    // Inicializar Choices.js en los selects
    const choicesEdicion = new Choices(filtroEdicion, { searchEnabled: true, itemSelectText: '', shouldSort: false, placeholder: true, placeholderValue: 'Todas las Ediciones' });
    const choicesGrupo = new Choices(filtroGrupo, { searchEnabled: true, itemSelectText: '', shouldSort: false, placeholder: true, placeholderValue: 'Todos los Grupos' });

    let gridInstance = null;

        // Small debounce helper to avoid rapid duplicate calls
        function debounce(fn, wait) {
            let timer = null;
            return function(...args) {
                if (timer) clearTimeout(timer);
                timer = setTimeout(() => {
                    timer = null;
                    try { fn.apply(this, args); } catch (e) { console.error('debounced fn error', e); }
                }, wait);
            };
        }

    // Cargar y mostrar partidos públicos
    async function cargarPartidosPublicos() {
        // Obtener todos los partidos de Supabase
        let partidos = [];
            console.log('cargarPartidosPublicos: start');
            try {
                // Use the `publicMatchesList` container present in the HTML
                const lista = publicMatchesList || document.getElementById('publicMatchesList') || document.getElementById('listaPartidosDisponibles');
                if (!lista) {
                    console.warn('cargarPartidosPublicos: publicMatchesList not found in DOM');
                    return;
                }
                lista.innerHTML = '';
                console.log('cargarPartidosPublicos: container found, querying supabase...');
                let { data, error } = await supabase.from('partidos').select('*');
                if (error) throw error;
            partidos = data;
            console.log('cargarPartidosPublicos: supabase returned', partidos && partidos.length);
            // Normalizar claves para la vista pública (renderizarPartidosPublicos espera keys como 'idPartido', 'Local', 'Visitante', 'Fecha')
            partidos = (partidos || []).map(p => {
                return Object.assign({}, p, {
                    idPartido: p.idpartido || p.idPartido || p.id || p.ID_PARTIDO || p.idPartida || '',
                    Local: p.local || p.Local || p.equipoLocal || '',
                    Visitante: p.visitante || p.Visitante || p.equipoVisitante || '',
                    Fecha: p.fecha || p.fechajornada || p.Fecha || p['Fecha jornada'] || '',
                    Edicion: p.edicion || p.Edicion || '',
                    'Grupo edicion': p.grupoedicion || p['grupo edicion'] || p.grupo || ''
                });
            });
            console.log('cargarPartidosPublicos -> partidos sample:', partidos.length, partidos.slice(0,3));
            // Log detected ediciones/grupos para depuración
            const ediciones = [...new Set(partidos.map(x => x.Edicion).filter(Boolean))];
            const grupos = [...new Set(partidos.map(x => x['Grupo edicion']).filter(Boolean))];
            console.log('Ediciones detectadas:', ediciones.slice(0,10));
            console.log('Grupos detectados:', grupos.slice(0,10));
        } catch (e) {
            // Si falla Supabase, usa localStorage como respaldo
            partidos = JSON.parse(localStorage.getItem('matches') || '[]');
            if (!partidos.length) {
                publicMatchesList.innerHTML = '<p class="no-data">No se pudieron cargar los partidos.</p>';
                return;
            }
        }
        poblarFiltros(partidos);
        renderizarPartidosPublicos(partidos);
        console.log('cargarPartidosPublicos: renderizarPartidosPublicos called');
    }

    // Debounced wrappers to avoid duplicate rapid invocations (e.g. MutationObserver + manual calls)
    const debouncedCargarPartidosPublicos = debounce(() => { cargarPartidosPublicos(); }, 250);
    const debouncedLoadMatches = debounce(() => { loadMatches(); }, 250);
    

    // Renderizar lista de partidos según filtros
    function renderizarPartidosPublicos(partidos) {
        // Aplicar filtros
        let edicion = filtroEdicion.value;
        let grupo = filtroGrupo.value;
        let equipoLocal = filtroEquipoLocal.value.trim().toLowerCase();
        let filtrados = partidos.filter(p => {
            let ok = true;
            if (edicion && p['Edicion'] !== edicion) ok = false;
            if (grupo && p['Grupo edicion'] !== grupo) ok = false;
            if (equipoLocal && (!p['Local'] || !p['Local'].toLowerCase().includes(equipoLocal))) ok = false;
            return ok;
        });
        // Ordenar por Edicion, Grupo, Fecha ASCENDENTE
        filtrados.sort((a, b) => {
            const edA = (a['Edicion'] || '').toString();
            const edB = (b['Edicion'] || '').toString();
            if (edA < edB) return -1;
            if (edA > edB) return 1;
            const grA = (a['Grupo edicion'] || '').toString();
            const grB = (b['Grupo edicion'] || '').toString();
            if (grA < grB) return -1;
            if (grA > grB) return 1;
            // Fecha ascendente
            const fA = (a['Fecha'] || a['Fecha jornada'] || '').toString();
            const fB = (b['Fecha'] || b['Fecha jornada'] || '').toString();
            if (fA < fB) return -1;
            if (fA > fB) return 1;
            return 0;
        });
        // Construir datos para Grid.js
        const rows = filtrados.map(function(p) {
            return [
                p['idPartido'] || '',
                p['Local'] || '',
                p['Visitante'] || '',
                formatearFecha(p['Fecha'] || p['Fecha jornada']),
                gridjs.html(gridEstadoEvaluacionHtml(p))
            ];
        });
        // Destruir grid anterior si existe
        if (gridInstance) gridInstance.destroy();
        gridInstance = new gridjs.Grid({
            columns: [
                { name: 'ID Partido', width: '110px' },
                { name: 'Local', width: '180px' },
                { name: 'Visitante', width: '180px' },
                { name: 'Fecha', width: '110px' },
                { name: 'Estado Evaluación', width: '120px', sort: false }
            ],
            data: rows,
            search: false,
            sort: true,
            pagination: { enabled: true, limit: 20 },
            resizable: true,
            style: {
                th: { 'background-color': '#eaf1fb', 'font-weight': '700', color: '#1a2a3a' },
                td: { 'font-size': '1.05rem' }
            },
            className: {
                table: 'public-matches-table',
                th: 'public-matches-th',
                td: 'public-matches-td'
            }
        }).render(publicMatchesList);
        // Estado Evaluación: iconos SVG para local, visitante, árbitro
        function gridEstadoEvaluacionHtml(p) {
            var id = p['idPartido'] || p.idpartido || p.id || '';
            // Preferimos marcar completado según datos de evaluaciones si existen
            var doneLocal = false;
            var doneVisitante = false;
            var doneArbitro = false;
            try {
                if (p.evaluaciones) {
                    // Si la fila incluye un objeto 'evaluaciones' con claves local/visitante
                    doneLocal = !!p.evaluaciones.local;
                    doneVisitante = !!p.evaluaciones.visitante;
                }
            } catch (err) {
                // ignore
            }
            // Añadir handlers para mostrar pantalla de evaluación
            var html = '';
            html += "<span class='eval-icons'>";
            // Shield (Tabler Icons) para equipo local
            html += "<svg class='eval-icon eval-icon-local" + (doneLocal ? ' filled' : '') + "' data-rol='local' data-id='" + id + "' viewBox='0 0 24 24' fill='none' stroke='currentColor' stroke-width='1.5' stroke-linecap='round' stroke-linejoin='round' onclick='window.mostrarPublicEval && window.mostrarPublicEval(event, \"local\")'><path d='M12 20.5c-6-2.5-8.5-6-8.5-10.5V5.5l8.5-3 8.5 3v4.5c0 4.5-2.5 8-8.5 10.5z'/></svg>";
            // Swords (Tabler Icons) para equipo visitante (ajustado viewBox y paths)
            html += "<svg class='eval-icon eval-icon-visitante" + (doneVisitante ? ' filled' : '') + "' data-rol='visitante' data-id='" + id + "' viewBox='0 0 24 24' fill='none' stroke='currentColor' stroke-width='1.5' stroke-linecap='round' stroke-linejoin='round' onclick='window.mostrarPublicEval && window.mostrarPublicEval(event, \"visitante\")'><path d='M14.5 17.5l-7-7'/><path d='M19 21l-6.5-6.5'/><path d='M21 21l-6-6'/><path d='M8 13l-3 3v3h3l3-3'/><path d='M16 5l3-3'/><path d='M19 8l-6-6'/></svg>";
            // ShieldOff (Tabler Icons) para árbitro
            html += "<svg class='eval-icon eval-icon-arbitro" + (doneArbitro ? ' filled' : '') + "' data-rol='arbitro' data-id='" + id + "' viewBox='0 0 24 24' fill='none' stroke='currentColor' stroke-width='1.5' stroke-linecap='round' stroke-linejoin='round' onclick='window.mostrarPublicEval && window.mostrarPublicEval(event, \"arbitro\")'><path d='M3 3l18 18'/><path d='M17.669 17.669C15.5 19 12 20.5 12 20.5c-6-2.5-8.5-6-8.5-10.5V5.5l5.17-1.824M19.5 5.5l-7.5-3-2.223.783M19.5 5.5v4.5c0 1.61-.195 3.117-.558 4.5'/></svg>";
            html += "</span>";
            return html;
        }
        // Función global para mostrar pantalla de evaluación pública
        window.mostrarPublicEval = async function (event, rol) {
            event = event || window.event;
            try {
                if (event && typeof event.preventDefault === 'function') event.preventDefault();
                const svg = (event.currentTarget || event.target);
                const idPartido = (svg && ((svg.dataset && svg.dataset.id) || svg.getAttribute && svg.getAttribute('data-id'))) || event;

                // Buscar partido en Supabase (con fallback a localStorage)
                let partido = null;
                try {
                    let { data, error } = await supabase.from('partidos').select('*');
                    if (error) throw error;
                    partido = (data || []).find(p => String(p.idpartido) === String(idPartido) || String(p.idPartido) === String(idPartido) || String(p.id) === String(idPartido) || String(p.ID_PARTIDO) === String(idPartido));
                } catch (err) {
                    const partidos = JSON.parse(localStorage.getItem('matches') || '[]');
                    partido = (partidos || []).find(p => String(p.idPartido) === String(idPartido) || String(p.idpartido) === String(idPartido) || String(p.id) === String(idPartido));
                }

                if (!partido) return;

                // Set global current match/team so submitEvaluation can use them
                currentMatch = partido;
                currentTeam = rol;
                console.log('mostrarPublicEval -> currentMatch.id, currentTeam:', currentMatch && currentMatch.id, currentTeam);

                // Mostrar pantalla
                document.querySelectorAll('.view').forEach(function(v) { v.classList.add('hidden'); });
                const publicEvalViewEl = document.getElementById('publicEvalView');
                if (publicEvalViewEl) publicEvalViewEl.style.display = '';
                const publicEvalViewEl3 = document.getElementById('publicEvalView'); if (publicEvalViewEl3) publicEvalViewEl3.classList.remove('hidden');

                // Renderizar contenido (usar campos alternativos si no existen)
                const localName = partido.local || partido.equipoLocal || partido.Local || '';
                const visitanteName = partido.visitante || partido.equipoVisitante || partido.Visitante || '';

                var evalHtml = '';
                evalHtml += '<div class="match-header">' + localName + ' vs ' + visitanteName + '</div>';
                evalHtml += '<div class="match-meta">';
                evalHtml += '<span>' + (partido.edicion || '') + '</span>';
                evalHtml += '<span>📍 ' + (partido['campojuego'] || partido.lugar || '') + '</span>';
                evalHtml += '<span>📅 ' + formatearFecha(partido.fecha || partido['fechajornada']) + '</span>';
                evalHtml += '</div>';
                evalHtml += '<form id="scoringForm">';
                evalHtml += '<div class="eval-form-section">';
                evalHtml += '<h3>Información del Evaluador</h3>';
                evalHtml += '<div class="eval-form-row">';
                evalHtml += '<div style="flex:2">';
                evalHtml += '<label>Nombre completo</label>';
                evalHtml += '<input type="text" name="nombre" id="nombre" placeholder="Tu nombre y apellidos" required>';
                evalHtml += '</div>';
                evalHtml += '<div style="flex:1">';
                evalHtml += '<label>Email</label>';
                evalHtml += '<input type="email" name="email" id="email" placeholder="tu@email.com" required>';
                evalHtml += '</div>';
                evalHtml += '</div>';
                evalHtml += '<div class="eval-form-row">';
                evalHtml += '<div style="flex:1">';
                evalHtml += '<label>Tu rol en el partido</label>';
                evalHtml += '<input type="text" name="rol" id="rol" value="' + (rol === 'local' ? 'Entrenador/a Equipo Local' : rol === 'visitante' ? 'Entrenador/a Equipo Visitante' : 'Árbitro/a') + '" readonly>';
                evalHtml += '</div>';
                evalHtml += '</div>';
                evalHtml += '</div>';
                evalHtml += '<div class="resultado-box">RESULTADO <span id="publicEvalResultado">0</span> / 16</div>';
                evalHtml += '<div class="eval-form-section">';
                evalHtml += '<h3>Cuestionario de Evaluación</h3>';
                evalHtml += '<div style="color:#888;font-size:1em;margin-bottom:1em;">Selecciona una opción para cada categoría.</div>';
                // (Preguntas - reutilizamos las mismas opciones que antes)
                evalHtml += '<div class="eval-question">';
                evalHtml += '<strong>1. Entrenador/a Contrario/a</strong>';
                evalHtml += '<div>';
                evalHtml += '<label><input type="radio" name="entrenador" value="0" required> <span class="score-badge" style="background:#e53935;color:#fff;">0</span> Conducta antideportiva (protestas constantes, faltas de respeto, incitación a la tensión).</label><br>';
                evalHtml += '<label><input type="radio" name="entrenador" value="1"> <span class="score-badge" style="background:#fb8c00;color:#fff;">1</span> Actitud negativa frecuente, poco colaborativa.</label><br>';
                evalHtml += '<label><input type="radio" name="entrenador" value="2"> <span class="score-badge" style="background:#fbc02d;color:#222;">2</span> Actitud correcta en general, aunque con momentos de tensión.</label><br>';
                evalHtml += '<label><input type="radio" name="entrenador" value="3"> <span class="score-badge" style="background:#8bc34a;color:#222;">3</span> Actitud positiva, respeta las decisiones arbitrales y fomenta el juego limpio.</label><br>';
                evalHtml += '<label><input type="radio" name="entrenador" value="4"> <span class="score-badge" style="background:#43a047;color:#fff;">4</span> Ejemplo de deportividad: colaboración, respeto total, facilita el desarrollo del partido.</label>';
                evalHtml += '</div>';
                evalHtml += '</div>';
                // Preguntas 2..4 (omitidas here for brevity but identical to above original code)
                evalHtml += '<div class="eval-question">';
                evalHtml += '<strong>2. Deportistas Equipo Contrario</strong>';
                evalHtml += '<div>';
                evalHtml += '<label><input type="radio" name="deportistas" value="0" required> <span class="score-badge" style="background:#e53935;color:#fff;">0</span> Conducta violenta o antideportiva reiterada.</label><br>';
                evalHtml += '<label><input type="radio" name="deportistas" value="1"> <span class="score-badge" style="background:#fb8c00;color:#fff;">1</span> Incidentes frecuentes (provocaciones, malas actitudes, protestas al árbitro/a).</label><br>';
                evalHtml += '<label><input type="radio" name="deportistas" value="2"> <span class="score-badge" style="background:#fbc02d;color:#222;">2</span> Comportamiento aceptable con algunas acciones negativas aisladas.</label><br>';
                evalHtml += '<label><input type="radio" name="deportistas" value="3"> <span class="score-badge" style="background:#8bc34a;color:#222;">3</span> Buen comportamiento, respeto entre rivales, pocas incidencias.</label><br>';
                evalHtml += '<label><input type="radio" name="deportistas" value="4"> <span class="score-badge" style="background:#43a047;color:#fff;">4</span> Ejemplo de juego limpio: cooperación, respeto total a compañeros/as, rivales y árbitro.</label>';
                evalHtml += '</div>';
                evalHtml += '</div>';
                evalHtml += '<div class="eval-question">';
                evalHtml += '<strong>3. Árbitro/a</strong>';
                evalHtml += '<div>';
                evalHtml += '<label><input type="radio" name="arbitro" value="0" required> <span class="score-badge" style="background:#e53935;color:#fff;">0</span> Parcialidad clara, falta de control del partido.</label><br>';
                evalHtml += '<label><input type="radio" name="arbitro" value="1"> <span class="score-badge" style="background:#fb8c00;color:#fff;">1</span> Errores graves o repetidos, actitud poco dialogante.</label><br>';
                evalHtml += '<label><input type="radio" name="arbitro" value="2"> <span class="score-badge" style="background:#fbc02d;color:#222;">2</span> Actuación correcta con errores puntuales.</label><br>';
                evalHtml += '<label><input type="radio" name="arbitro" value="3"> <span class="score-badge" style="background:#8bc34a;color:#222;">3</span> Buen arbitraje, comunicación clara, mantiene el control.</label><br>';
                evalHtml += '<label><input type="radio" name="arbitro" value="4"> <span class="score-badge" style="background:#43a047;color:#fff;">4</span> Excelente: imparcial, firme, dialogante y respetuoso/a.</label>';
                evalHtml += '</div>';
                evalHtml += '</div>';
                evalHtml += '<div class="eval-question">';
                evalHtml += '<strong>4. Conducta de la Afición</strong>';
                evalHtml += '<div>';
                evalHtml += '<label><input type="radio" name="aficion" value="0" required> <span class="score-badge" style="background:#e53935;color:#fff;">0</span> Conducta inaceptable (insultos, agresiones verbales o físicas, violencia).</label><br>';
                evalHtml += '<label><input type="radio" name="aficion" value="1"> <span class="score-badge" style="background:#fb8c00;color:#fff;">1</span> Comportamiento negativo frecuente (protestas continuas, ambiente hostil).</label><br>';
                evalHtml += '<label><input type="radio" name="aficion" value="2"> <span class="score-badge" style="background:#fbc02d;color:#222;">2</span> Conducta aceptable, aunque con momentos de tensión.</label><br>';
                evalHtml += '<label><input type="radio" name="aficion" value="3"> <span class="score-badge" style="background:#8bc34a;color:#222;">3</span> Buena actitud, apoyo mayormente positivo.</label><br>';
                evalHtml += '<label><input type="radio" name="aficion" value="4"> <span class="score-badge" style="background:#43a047;color:#fff;">4</span> Ejemplo de deportividad: ánimos constantes, respeto al rival y árbitro/a.</label>';
                evalHtml += '</div>';
                evalHtml += '</div>';
                evalHtml += '</div>';
                // Hidden compatibility fields expected by submitEvaluation
                evalHtml += '<input type="hidden" id="setsGanados" value="0">';
                evalHtml += '<input type="hidden" id="setsContrario" value="0">';
                evalHtml += '<input type="hidden" id="firma" value="">';
                evalHtml += '<button type="submit" class="btn-primary">Guardar Acta</button>';
                evalHtml += '</form>';
                const publicEvalContentEl = document.getElementById('publicEvalContent');
                if (publicEvalContentEl) publicEvalContentEl.innerHTML = evalHtml;

                // Actualizar resultado en tiempo real
                var form = document.getElementById('scoringForm');
                function updateResultado() {
                    var total = 0;
                    if (!form) return;
                    ['entrenador','deportistas','arbitro','aficion'].forEach(function(name) {
                        var val = form.querySelector("input[name='"+name+"']:checked");
                        if (val) total += parseInt(val.value);
                    });
                    const publicEvalResultadoEl = document.getElementById('publicEvalResultado');
                    if (publicEvalResultadoEl) publicEvalResultadoEl.textContent = total;
                }

                if (form) {
                        form.addEventListener('change', updateResultado);
                        updateResultado();
                        // disable submit button until currentMatch is set (accept any id field)
                        const submitBtn = form.querySelector('button[type="submit"]');
                        const hasId = currentMatch && (currentMatch.id || currentMatch.idpartido || currentMatch.idPartido);
                        if (submitBtn) submitBtn.disabled = !hasId;
                        // Ensure only one submit listener exists on this dynamically created form
                        try {
                            form.removeEventListener('submit', submitEvaluation);
                        } catch (remErr) { /* ignore */ }
                        form.addEventListener('submit', submitEvaluation);
                        console.log('Attached direct submit listener to scoringForm');
                }
            } catch (err) {
                console.error('mostrarPublicEval error', err);
            }
        };
        if (filtrados.length === 0) {
            publicMatchesList.innerHTML = '<p class="no-data">No hay partidos con los filtros seleccionados.</p>';
        }
    }

    // Poblar select de filtros Edición y Grupo
    function poblarFiltros(partidos) {
        // Guardar selección actual
        const edicionSeleccionada = filtroEdicion.value;
        const grupoSeleccionado = filtroGrupo.value;
        // Edicion
        const ediciones = [...new Set(partidos.map(p => p['Edicion']).filter(Boolean))].sort();
        const edicionOptions = [{ value: '', label: 'Todas las Ediciones' }, ...ediciones.map(e => ({ value: e, label: e }))];
        choicesEdicion.clearChoices();
        choicesEdicion.setChoices(edicionOptions, 'value', 'label', true);
        if (ediciones.includes(edicionSeleccionada)) {
            choicesEdicion.setChoiceByValue(edicionSeleccionada);
        }
        // Grupo
        const grupos = [...new Set(partidos.map(p => p['Grupo edicion']).filter(Boolean))].sort();
        const grupoOptions = [{ value: '', label: 'Todos los Grupos' }, ...grupos.map(g => ({ value: g, label: g }))];
        choicesGrupo.clearChoices();
        choicesGrupo.setChoices(grupoOptions, 'value', 'label', true);
        if (grupos.includes(grupoSeleccionado)) {
            choicesGrupo.setChoiceByValue(grupoSeleccionado);
        }
    }

    // Formatear fecha a dd/mm/yyyy
    function formatearFecha(fechaIso) {
        if (!fechaIso) return '';
        const d = new Date(fechaIso);
        if (isNaN(d)) return fechaIso;
        return d.toLocaleDateString('es-ES');
    }

    // Eventos de filtros con Choices.js
    if (filtroEdicion && filtroGrupo && filtroEquipoLocal && btnLimpiarFiltros) {
        filtroEdicion.addEventListener('change', () => debouncedCargarPartidosPublicos());
        filtroGrupo.addEventListener('change', () => debouncedCargarPartidosPublicos());
        filtroEquipoLocal.addEventListener('input', () => debouncedCargarPartidosPublicos());
            btnLimpiarFiltros.addEventListener('click', () => {
            choicesEdicion.setChoiceByValue('');
            choicesGrupo.setChoiceByValue('');
            filtroEquipoLocal.value = '';
            debouncedCargarPartidosPublicos();
        });
    }

    // Cargar partidos públicos al mostrar la vista pública
    function activarVistaPublica() {
        debouncedCargarPartidosPublicos();
    }

    // Hook: cuando se muestre la publicView, cargar partidos
    const observer = new MutationObserver((mutations) => {
        mutations.forEach(m => {
            // Solo actuamos sobre cambios de la clase del publicView y cuando la clase 'hidden' fue removida
            if (m.type === 'attributes' && m.attributeName === 'class' && m.target.id === 'publicView') {
                const oldClass = m.oldValue || '';
                const newClass = m.target.className || '';
                const hadHidden = oldClass.split(' ').includes('hidden');
                const hasHidden = newClass.split(' ').includes('hidden');
                if (hadHidden && !hasHidden) {
                    activarVistaPublica();
                }
            }
        });
    });
    const publicViewDiv = document.getElementById('publicView');
    if (publicViewDiv) {
        observer.observe(publicViewDiv, { attributes: true, attributeFilter: ['class'], attributeOldValue: true });
    }
    // Importar partidos desde Excel
    const importExcelBtn = document.getElementById('importExcelBtn');
    if (importExcelBtn) importExcelBtn.addEventListener('click', () => {
        const fileInput = document.getElementById('excelFileInput');
        if (fileInput) fileInput.click();
    });
    const excelFileInputEl = document.getElementById('excelFileInput');
    if (excelFileInputEl) excelFileInputEl.addEventListener('change', handleExcelFile, false);

    // Control de acceso: mostrar vista admin solo a la cuenta admin, el resto ve la vista pública
    
    // --- BLOQUE DE AUTENTICACIÓN COMENTADO TEMPORALMENTE ---
    /*
    await firestoreService.initialize();
    firebase.auth().onAuthStateChanged(async (user) => {
        if (user && user.email === 'estelagonzalez@fvbpa.com') {
            // Usuario admin
            showView('adminView');
            document.getElementById('mainNav').style.display = '';
            document.getElementById('adminView').style.display = '';
            document.getElementById('publicView').style.display = 'none';
            updateSyncUI();
            loadMatches();
        } else {
            // Usuario público o no autenticado
            showView('publicView');
            const mainNavEl = document.getElementById('mainNav'); if (mainNavEl) mainNavEl.style.display = 'none';
            const adminViewEl = document.getElementById('adminView'); if (adminViewEl) adminViewEl.style.display = 'none';
            const publicViewEl3 = document.getElementById('publicView'); if (publicViewEl3) publicViewEl3.style.display = '';
            // Aquí luego se cargará la lógica de partidos públicos
        }
    });
    // Si no hay auth, forzar vista pública por defecto
    if (!firebase.auth().currentUser) {
        showView('publicView');
        const mainNavEl3 = document.getElementById('mainNav'); if (mainNavEl3) mainNavEl3.style.display = 'none';
        const adminViewEl3 = document.getElementById('adminView'); if (adminViewEl3) adminViewEl3.style.display = 'none';
        const publicViewEl5 = document.getElementById('publicView'); if (publicViewEl5) publicViewEl5.style.display = '';
    }
    */

    // Mostrar siempre la vista de administración por defecto (sin autenticación)
    showView('adminView');
    const mainNavEl2 = document.getElementById('mainNav'); if (mainNavEl2) mainNavEl2.style.display = '';
    const adminViewEl2 = document.getElementById('adminView'); if (adminViewEl2) adminViewEl2.style.display = '';
    const publicViewEl4 = document.getElementById('publicView'); if (publicViewEl4) publicViewEl4.style.display = 'none';
    // ========== IMPORTACIÓN DE PARTIDOS DESDE EXCEL ==========

    function handleExcelFile(event) {
        const file = event.target.files[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = function(e) {
            const data = new Uint8Array(e.target.result);
            const workbook = XLSX.read(data, { type: 'array' });
            // Tomar la primera hoja
            const sheetName = workbook.SheetNames[0];
            const worksheet = workbook.Sheets[sheetName];
            const json = XLSX.utils.sheet_to_json(worksheet, { header: 1 });
            showExcelPreview(json);
        };
        reader.readAsArrayBuffer(file);
    }

    function showExcelPreview(json) {
        // Asumimos que la primera fila es el encabezado
        if (!json || json.length < 2) {
            alert('El archivo no contiene datos.');
            return;
        }
        const headers = json[0];
        const rows = json.slice(1);
        console.log('Encabezados detectados en el Excel:', headers);

        // Columnas a mostrar
        const columnas = [
            { label: 'Edicion', keys: ['Edicion'] },
            { label: 'Grupo', keys: ['Grupo'] },
            { label: 'Fecha', keys: ['Fecha', 'Fecha Jornada'] },
            { label: 'Local', keys: ['Local'] },
            { label: 'Visitante', keys: ['Visitante'] }
        ];

        // Índices de las columnas en el Excel
        const colIndices = columnas.map(col => {
            for (const key of col.keys) {
                const idx = headers.indexOf(key);
                if (idx !== -1) return idx;
            }
            return -1;
        });

        let html = '<h3>Vista previa de partidos a importar</h3>';
        html += '<table class="excel-preview"><thead><tr>';
        columnas.forEach(function(col) { html += '<th>' + col.label + '</th>'; });
        html += '</tr></thead><tbody>';
        rows.forEach(row => {
            html += '<tr>';
            columnas.forEach(function(col, i) {
                var val = '';
                if (col.label === 'Fecha') {
                    // Mostrar Fecha o, si está vacía, Fecha Jornada
                    var idxFecha = headers.indexOf('Fecha');
                    var idxJornada = headers.indexOf('Fecha Jornada');
                    var raw = '';
                    if (idxFecha !== -1 && row[idxFecha] != null && String(row[idxFecha]).trim() !== '') {
                        raw = row[idxFecha];
                    } else if (idxJornada !== -1 && row[idxJornada] != null && String(row[idxJornada]).trim() !== '') {
                        raw = row[idxJornada];
                    }
                    // Si es número (Excel) o string numérico, convertir a fecha
                    if ((typeof raw === 'number' && !isNaN(raw)) || (typeof raw === 'string' && /^\d+(\.\d+)?$/.test(raw.trim()))) {
                        val = excelDateToString(Number(raw));
                    } else {
                        val = raw;
                    }
                } else {
                    var idx = colIndices[i];
                    val = (idx !== -1) ? (row[idx] != null ? row[idx] : '') : '';
                }
                html += '<td>' + val + '</td>';
            });
            html += '</tr>';
        });
        // Función para convertir número de Excel a dd/mm/yyyy
        function excelDateToString(serial) {
            if (!serial || isNaN(serial)) return '';
            const utc_days = Math.floor(serial - 25569);
            const utc_value = utc_days * 86400;
            const date_info = new Date(utc_value * 1000);
            const day = String(date_info.getUTCDate()).padStart(2, '0');
            const month = String(date_info.getUTCMonth() + 1).padStart(2, '0');
            const year = date_info.getUTCFullYear();
            return day + '/' + month + '/' + year;
        }
        html += '</tbody></table>';
        html += '<button id="confirmImportBtn" class="btn-primary">Importar partidos</button>';

        // Mostrar en el adminView
        const adminView = document.getElementById('adminView');
        let previewDiv = document.getElementById('excelPreviewDiv');
        if (!previewDiv) {
            previewDiv = document.createElement('div');
            previewDiv.id = 'excelPreviewDiv';
            if (adminView) adminView.appendChild(previewDiv);
        }
        if (previewDiv) previewDiv.innerHTML = html;

        const confirmBtn = document.getElementById('confirmImportBtn');
        if (confirmBtn) confirmBtn.onclick = () => { importMatchesFromExcel(headers, rows); };
    }

    async function importMatchesFromExcel(headers, rows) {
        // Mapear los datos según los nombres de columna esperados
        // Guardar todos los campos del Excel y convertir fechas a ISO
        console.log('Importando desde Excel - headers:', headers);
        console.log('Filas leídas del Excel (total):', rows.length);

        // Mapear cada fila del Excel a un objeto con las claves exactas de la tabla `partidos`
        const headerToDbFieldMap = {
            'idpartido': 'idpartido', 'idpartido': 'idpartido', 'id_partido': 'idpartido', 'id': 'idpartido', 'idpartida': 'idpartido',
            'temporada': 'temporada',
            'categoria': 'categoria',
            'competicion': 'competicion',
            'edicion': 'edicion',
            'faseedicion': 'faseedicion', 'fase edicion': 'faseedicion',
            'grupoedicion': 'grupoedicion', 'grupo edicion': 'grupoedicion',
            'campodejuego': 'campojuego', 'campo de juego': 'campojuego', 'campojuego': 'campojuego',
            'fechajornada': 'fechajornada', 'fecha jornada': 'fechajornada',
            'jornada': 'jornada',
            'fecha': 'fecha',
            'local': 'local', 'equipolocal': 'local',
            'visitante': 'visitante', 'equipovisitante': 'visitante',
            'genero': 'genero',
            'estado': 'estado',
            'fechacreacion': 'fechacreacion', 'fecha creacion': 'fechacreacion'
        };

        function normalizeHeader(h) {
            if (h == null) return '';
            return String(h).toLowerCase().trim().normalize('NFD').replace(/\p{Diacritic}/gu, '').replace(/[^a-z0-9]/g, '');
        }

        const partidosAll = rows.map(row => {
            const raw = {};
            headers.forEach((h, i) => {
                raw[h] = row[i];
            });

            // Construir objeto con claves DB
            const dbObj = {};
            headers.forEach((h, i) => {
                const rawVal = row[i];
                const norm = normalizeHeader(h);
                const dbField = headerToDbFieldMap[norm];
                let val = rawVal;
                // Convertir números Excel que representan fechas a ISO
                if (['fecha', 'fechajornada', 'fechacreacion'].includes(dbField)) {
                    if ((typeof val === 'number' && !isNaN(val)) || (typeof val === 'string' && /^\d+(\.\d+)?$/.test(String(val).trim()))) {
                        val = excelDateToISO(val);
                    }
                }
                if (dbField) {
                    dbObj[dbField] = val;
                } else {
                    // Si no hay mapping conocido, lo dejamos como está en un campo adicional opcional
                    dbObj[String(h).trim()] = val;
                }
            });

            // Asegurar campos obligatorios / estándar
            if (!dbObj.fechacreacion) dbObj.fechacreacion = new Date().toISOString();
            // Normalizar idpartido a string si no está presente, generar uno temporal
            if (!dbObj.idpartido || String(dbObj.idpartido).trim() === '') dbObj.idpartido = 'tmp-' + Date.now().toString();

            console.log('Fila raw leída:', raw);
            console.log('Objeto mapeado a columnas DB:', dbObj);

            return dbObj;
        });

        // Procesar todas las filas leídas del Excel
        const partidos = partidosAll;
        console.log('Partidos preparados para procesar (total):', partidos.length);
        // Conversor de número Excel a fecha ISO
        function excelDateToISO(serial) {
            const n = Number(serial);
            if (!n || isNaN(n)) return '';
            const utc_days = Math.floor(n - 25569);
            const utc_value = utc_days * 86400;
            const date_info = new Date(utc_value * 1000);
            return date_info.toISOString().slice(0, 10);
        }
        let ok = 0, fail = 0, updated = 0, skipped = 0;
        for (const partido of partidos) {
            const pid = partido.idpartido || partido.idPartido || partido.id || partido.ID_PARTIDO || null;
            if (!pid || String(pid).trim() === '') {
                skipped++;
                console.warn('Saltado partido sin idpartido:', partido);
                continue;
            }
            try {
                console.log('Verificando existencia en Supabase para idpartido=', pid);
                // No asumimos el nombre de columna en la DB (evita error 42703 si no existe idPartido)
                let { data: allRows, error: errorSelectAll } = await supabase.from('partidos').select('*');
                console.log('Respuesta supabase select *:', { count: allRows ? allRows.length : 0, error: errorSelectAll });
                if (errorSelectAll) throw errorSelectAll;
                // Buscar coincidencia por varios posibles nombres de campo
                const existentes = (allRows || []).filter(r => {
                    return (r.idpartido && String(r.idpartido) === String(pid)) ||
                           (r.idPartido && String(r.idPartido) === String(pid)) ||
                           (r.id_partido && String(r.id_partido) === String(pid)) ||
                           (r.id && String(r.id) === String(pid)) ||
                           (r.ID_PARTIDO && String(r.ID_PARTIDO) === String(pid));
                });
                console.log('Coincidencias encontradas (local):', existentes.length, existentes);
                if (existentes && existentes.length > 0) {
                    // Usar la primera coincidencia y determinar la columna clave para el update
                    const existing = existentes[0];
                    const keyName = existing.id ? 'id' : (existing.idpartido ? 'idpartido' : (existing.id_partido ? 'id_partido' : (existing.idPartido ? 'idPartido' : (existing.ID_PARTIDO ? 'ID_PARTIDO' : null))));
                    console.log('Actualizando partido en Supabase (clave=', keyName, '):', partido);
                    if (!keyName) throw new Error('No se pudo determinar la columna clave para actualizar el partido.');
                    let { data: dataUpdate, error: errorUpdate } = await supabase.from('partidos').update(partido).eq(keyName, existing[keyName]).select();
                    console.log('Respuesta update:', { dataUpdate, errorUpdate });
                    if (errorUpdate) throw errorUpdate;
                    updated++;
                } else {
                    console.log('Insertando nuevo partido en Supabase:', partido);
                    let { data: dataInsert, error: errorInsert } = await supabase.from('partidos').insert([partido]).select();
                    console.log('Respuesta insert:', { dataInsert, errorInsert });
                    if (errorInsert) throw errorInsert;
                    ok++;
                }
            } catch (e) {
                // Si falla Supabase, guardar en localStorage
                fail++;
                console.error('Error enviando partido a Supabase:', partido, e);
                try {
                    let matches = JSON.parse(localStorage.getItem('matches') || '[]');
                    const idx = matches.findIndex(m => m.idPartido === partido.idPartido || m.id === partido.id);
                    if (idx !== -1) {
                        matches[idx] = partido;
                        updated++;
                    } else {
                        matches.push(partido);
                        ok++;
                    }
                    localStorage.setItem('matches', JSON.stringify(matches));
                } catch (err) {
                    // Falla también localStorage
                    console.error('Error guardando partido en localStorage tras fallo:', partido, err);
                }
            }
        }
        if (skipped > 0) {
            console.warn('Saltados ' + skipped + ' partidos por falta de ID Partido.');
        }
        alert('Importación finalizada. Nuevos: ' + ok + ', Actualizados: ' + updated + ', Fallidos: ' + fail);
        const excelPreviewDivEl2 = document.getElementById('excelPreviewDiv'); if (excelPreviewDivEl2) excelPreviewDivEl2.remove();
        // Solo recargar partidos si existe el panel/lista
        if (document.getElementById('matchesList')) {
            debouncedLoadMatches();
        }
    }
    showView('adminView');
    
    debouncedLoadMatches();
    
    // Event listeners para navegación
    const btnAdminEl = document.getElementById('btnAdmin');
    if (btnAdminEl) btnAdminEl.addEventListener('click', () => { showView('adminView'); debouncedLoadMatches(); });
    const btnTeamEl = document.getElementById('btnTeam');
    if (btnTeamEl) btnTeamEl.addEventListener('click', () => { showView('selectMatchView'); loadAvailableMatches(); });
    const btnResultsEl = document.getElementById('btnResults');
    if (btnResultsEl) btnResultsEl.addEventListener('click', () => { showView('resultsView'); loadResults(); });
    /*
    // Event listeners para Firestore
    const btnGoogleAuthEl = document.getElementById('btnGoogleAuth'); if (btnGoogleAuthEl) btnGoogleAuthEl.addEventListener('click', authenticateFirestore);
    const btnSyncEl = document.getElementById('btnSync'); if (btnSyncEl) btnSyncEl.addEventListener('click', syncWithCloud);
    const btnSignOutEl = document.getElementById('btnSignOut'); if (btnSignOutEl) btnSignOutEl.addEventListener('click', signOutFirestore);
    */
    // Event listeners para formularios
    // Eliminados eventos de crear partido
    const scoringFormEl = document.getElementById('scoringForm');
    if (scoringFormEl) {
        scoringFormEl.addEventListener('submit', submitEvaluation);
    } else {
        console.warn('scoringForm element not found - submitEvaluation listener not attached');
    }
    const cancelEvalBtn = document.getElementById('cancelEvaluationBtn');
    if (cancelEvalBtn) cancelEvalBtn.addEventListener('click', () => { showView('selectMatchView'); loadAvailableMatches(); });
    
    // Event listeners para filtros
    const filterCategoriaEl = document.getElementById('filterCategoria'); if (filterCategoriaEl) filterCategoriaEl.addEventListener('change', loadAvailableMatches);
    const filterSexoEl = document.getElementById('filterSexo'); if (filterSexoEl) filterSexoEl.addEventListener('change', loadAvailableMatches);
    const filterGrupoEl = document.getElementById('filterGrupo'); if (filterGrupoEl) filterGrupoEl.addEventListener('change', loadAvailableMatches);
    const filterFechaEl = document.getElementById('filterFecha'); if (filterFechaEl) filterFechaEl.addEventListener('change', loadAvailableMatches);
    const resultsFilterCategoriaEl = document.getElementById('resultsFilterCategoria'); if (resultsFilterCategoriaEl) resultsFilterCategoriaEl.addEventListener('change', loadResults);
    // Event listener para actualización de categoría
    const categoriaEl = document.getElementById('categoria'); if (categoriaEl) categoriaEl.addEventListener('change', updateSexoOptions);
    
    // Event listeners para cálculo de puntos
    document.addEventListener('change', (e) => {
        if (e.target.type === 'radio' && e.target.form && e.target.form.id === 'scoringForm') {
            calculateTotal();
        }
    });

    // NOTE: delegated submit handler removed to avoid double-submit issues.
    // For dynamically injected forms we attach the submit listener where the form is created.
    
    const fechaPartidoEl = document.getElementById('fechaPartido'); if (fechaPartidoEl) fechaPartidoEl.valueAsDate = new Date();

    function showStatus(message, type = 'info') {
        const statusElement = document.getElementById('syncStatus');
        statusElement.textContent = message;
        statusElement.className = 'sync-status ' + type;
        
        setTimeout(() => {
            statusElement.textContent = '';
            statusElement.className = 'sync-status';
        }, 5000);
    }

    function showView(viewId) {
        document.querySelectorAll('.view').forEach(view => view.classList.add('hidden'));
        const viewEl = document.getElementById(viewId); if (viewEl) viewEl.classList.remove('hidden');
    }

    function updateSexoOptions() {
        const categoria = (document.getElementById('categoria') && document.getElementById('categoria').value) || '';
        const sexoSelect = document.getElementById('sexo');
        const currentValue = sexoSelect.value;
        
        while (sexoSelect.options.length > 1) {
            sexoSelect.remove(1);
        }
        
        if (categoria === 'Cadete') {
            sexoSelect.add(new Option('Masculino', 'Masculino'));
            sexoSelect.add(new Option('Femenino', 'Femenino'));
        } else if (categoria) {
            sexoSelect.add(new Option('Masculino', 'Masculino'));
            sexoSelect.add(new Option('Femenino', 'Femenino'));
            sexoSelect.add(new Option('Mixto', 'Mixto'));
        }
        
        if (currentValue && Array.from(sexoSelect.options).some(opt => opt.value === currentValue)) {
            sexoSelect.value = currentValue;
        }
    }

    function showMatchForm() {
        const matchFormSectionEl = document.getElementById('matchFormSection'); if (matchFormSectionEl) matchFormSectionEl.classList.remove('hidden');
        const showMatchBtn = document.getElementById('showMatchFormBtn'); if (showMatchBtn) showMatchBtn.style.display = 'none';
    }

    function hideMatchForm() {
        const matchFormSectionEl2 = document.getElementById('matchFormSection'); if (matchFormSectionEl2) matchFormSectionEl2.classList.add('hidden');
        const showMatchBtn2 = document.getElementById('showMatchFormBtn'); if (showMatchBtn2) showMatchBtn2.style.display = 'inline-block';
        document.getElementById('createMatchForm').reset();
        document.getElementById('fechaPartido').valueAsDate = new Date();
    }

    async function createMatch(e) {
        e.preventDefault();
        
        const matchData = {
            id: Date.now().toString(),
            modalidad: document.getElementById('modalidad').value,
            categoria: document.getElementById('categoria').value,
            sexo: document.getElementById('sexo').value,
            grupo: document.getElementById('grupo').value,
            fecha: document.getElementById('fechaPartido').value,
            hora: document.getElementById('horaPartido').value,
            lugar: document.getElementById('lugar').value,
            equipoLocal: document.getElementById('equipoLocal').value,
            equipoVisitante: document.getElementById('equipoVisitante').value,
            estado: 'pendiente',
            evaluaciones: { local: null, visitante: null },
            fechaCreacion: new Date().toISOString()
        };
        
        try {
            let { error } = await supabase.from('partidos').insert([matchData]);
            if (error) throw error;
            showStatus('✓ Partido guardado en la nube', 'success');
        } catch (error) {
            // Si falla Supabase, guardar en localStorage
            const matches = await getMatches();
            matches.push(matchData);
            localStorage.setItem('matches', JSON.stringify(matches));
            showStatus('⚠️ Guardado localmente (error en la nube)', 'warning');
        }

        hideMatchForm();
        loadMatches();
        alert('Partido creado correctamente');
    }

    async function getMatches() {
        function normalizeMatch(r) {
            if (!r) return null;
            const id = r.idpartido || r.idPartido || r.id || r.ID_PARTIDO || r.idPartida || r.ID || null;
            const fecha = r.fecha || r.fechajornada || null;
            const fechaCreacion = r.fechacreacion || r.fechaCreacion || r.fecha_creacion || null;
            const lugar = r.campojuego || r['campo de juego'] || r.lugar || r.campodejuego || '';
            const equipoLocal = r.local || r.equipolocal || r.equipoLocal || r['Local'] || '';
            const equipoVisitante = r.visitante || r.equipovisitante || r.equipoVisitante || r['Visitante'] || '';
            const grupo = r.grupo || r.grupoedicion || r['grupo edicion'] || r.grupoeleccion || '';
            const out = {
                id: id ? String(id) : null,
                idpartido: id ? String(id) : null,
                modalidad: r.modalidad || r.modalidad_partido || '',
                categoria: r.categoria || '',
                sexo: r.sexo || r.genero || '',
                grupo: grupo || '',
                fecha: fecha || '',
                hora: r.hora || '',
                lugar: lugar || '',
                equipoLocal: equipoLocal || '',
                equipoVisitante: equipoVisitante || '',
                estado: r.estado || 'pendiente',
                evaluaciones: r.evaluaciones || { local: null, visitante: null },
                fechaCreacion: fechaCreacion || new Date().toISOString()
            };
            // Add alternate keys expected by older UI code / Grid.js
            out.idPartido = out.idpartido;
            out['ID PARTIDO'] = out.idpartido;
            out.Local = out.equipoLocal;
            out.Visitante = out.equipoVisitante;
            out.Fecha = out.fecha;
            out['Fecha jornada'] = out.fecha;
            return out;
        }

        try {
            let { data, error } = await supabase.from('partidos').select('*');
            if (error) throw error;
            const mapped = (data || []).map(normalizeMatch).filter(Boolean);
            console.log('getMatches() supabase -> mapped sample:', mapped.length, mapped.slice(0,3));
            return mapped;
        } catch (e) {
            const local = JSON.parse(localStorage.getItem('matches') || '[]');
            const mapped = (local || []).map(normalizeMatch).filter(Boolean);
            console.log('getMatches() localStorage fallback -> mapped sample:', mapped.length, mapped.slice(0,3));
            return mapped;
        }
    }

    async function getEvaluations() {
        try {
            let { data, error } = await supabase.from('evaluaciones').select('*');
            if (error) throw error;
            return data;
        } catch (e) {
            return JSON.parse(localStorage.getItem('evaluations') || '[]');
        }
    }

    async function loadMatches() {
        const matches = await getMatches();
        const matchesList = document.getElementById('matchesList');

        console.log('loadMatches -> matches loaded:', matches.length, matches.slice(0,3));

        if (!matches || matches.length === 0) {
            if (matchesList) matchesList.innerHTML = '<p class="no-data">No hay partidos registrados. Crea uno para comenzar.</p>';
            return;
        }

        // Obtener todas las evaluaciones en una sola petición y filtrar en memoria
        const allEvaluations = await getEvaluations();

        let htmlParts = [];
        for (const match of matches) {
            const evaluaciones = (allEvaluations || []).filter(e => String(e.matchId || e.idpartido || e.idPartido || e.id) === String(match.id));
            const localCompleto = (evaluaciones || []).some(e => e.equipo === 'local');
            const visitanteCompleto = (evaluaciones || []).some(e => e.equipo === 'visitante');

            let estadoBadge = '';
            if (localCompleto && visitanteCompleto) {
                estadoBadge = '<span class="badge badge-success">Completado</span>';
            } else if (localCompleto || visitanteCompleto) {
                estadoBadge = '<span class="badge badge-warning">En progreso</span>';
            } else {
                estadoBadge = '<span class="badge badge-pending">Pendiente</span>';
            }

            var html = '';
            html += '<div class="match-card">';
            html += '<div class="match-header">';
            html += '<div class="match-title">';
            html += '<strong>' + (match.categoria || '') + ' ' + (match.sexo || '') + ' - Grupo ' + (match.grupo || '') + '</strong>';
            html += estadoBadge;
            html += '</div>';
            html += '<div class="match-date">' + formatDate(match.fecha) + ' - ' + (match.hora || '') + '</div>';
            html += '</div>';
            html += '<div class="match-body">';
            html += '<div class="match-teams">';
            html += '<div class="team">' + (match.equipoLocal || '') + (localCompleto ? ' ✓' : '') + '</div>';
            html += '<span class="vs">vs</span>';
            html += '<div class="team">' + (match.equipoVisitante || '') + (visitanteCompleto ? ' ✓' : '') + '</div>';
            html += '</div>';
            html += '<div class="match-location">📍 ' + (match.lugar || '') + '</div>';
            html += '</div>';
            html += '<div class="match-actions">';
            html += '<button onclick="deleteMatch(\'' + (match.id || '') + '\')" class="btn-danger btn-small">Eliminar</button>';
            if (localCompleto && visitanteCompleto) {
                html += '<button onclick="viewMatchResults(\'' + (match.id || '') + '\')" class="btn-primary btn-small">Ver Resultados</button>';
            }
            html += '</div>';
            html += '</div>';
            htmlParts.push(html);
        }

        if (matchesList) matchesList.innerHTML = htmlParts.join('');
    }

    async function loadAvailableMatches() {
        const matches = await getMatches();
        let lista = document.getElementById('availableMatchesList');
        if (!lista) {
            console.warn('loadAvailableMatches: availableMatchesList not found, falling back to publicMatchesList');
            lista = document.getElementById('publicMatchesList') || document.getElementById('listaPartidosDisponibles');
        }
        if (!lista) {
            console.warn('loadAvailableMatches: no container found to render available matches, aborting');
            return;
        }

        const filterCategoria = (document.getElementById('filterCategoria') && document.getElementById('filterCategoria').value) || '';
        const filterSexo = (document.getElementById('filterSexo') && document.getElementById('filterSexo').value) || '';
        const filterGrupo = (document.getElementById('filterGrupo') && document.getElementById('filterGrupo').value) || '';
        const filterFecha = (document.getElementById('filterFecha') && document.getElementById('filterFecha').value) || '';

        let filteredMatches = (matches || []).filter(match => {
            if (filterCategoria && match.categoria !== filterCategoria) return false;
            if (filterSexo && match.sexo !== filterSexo) return false;
            if (filterGrupo && match.grupo !== filterGrupo) return false;
            if (filterFecha && match.fecha !== filterFecha) return false;
            return true;
        });

        if (filteredMatches.length === 0) {
            lista.innerHTML = '<p class="no-data">No hay partidos disponibles con los filtros seleccionados.</p>';
            return;
        }

        // Traer todas las evaluaciones en una sola petición
        const allEvaluations = await getEvaluations();

        let htmlParts = [];
        for (const match of filteredMatches) {
            const evaluaciones = (allEvaluations || []).filter(e => String(e.matchId || e.idpartido || e.idPartido || e.id) === String(match.id));
            const localCompleto = (evaluaciones || []).some(e => e.equipo === 'local');
            const visitanteCompleto = (evaluaciones || []).some(e => e.equipo === 'visitante');

            var html = '';
            html += '<div class="match-card selectable">';
            html += '<div class="match-header">';
            html += '<div class="match-title"><strong>' + (match.categoria || '') + ' ' + (match.sexo || '') + ' - Grupo ' + (match.grupo || '') + '</strong></div>';
            html += '<div class="match-date">' + formatDate(match.fecha) + ' - ' + (match.hora || '') + '</div>';
            html += '</div>';
            html += '<div class="match-body">';
            html += '<div class="match-teams-selection">';
            html += '<button onclick="selectTeamForMatch(\'' + (match.id || '') + '\', \'local\')" class="team-button' + (localCompleto ? ' completed' : '') + '"' + (localCompleto ? ' disabled' : '') + '>';
            html += '<div class="team-name">' + (match.equipoLocal || '') + '</div>';
            html += '<div class="team-label">Equipo Local</div>';
            html += (localCompleto ? '<span class="check">✓ Completado</span>' : '<span class="action">Completar acta →</span>');
            html += '</button>';
            html += '<button onclick="selectTeamForMatch(\'' + (match.id || '') + '\', \'visitante\')" class="team-button' + (visitanteCompleto ? ' completed' : '') + '"' + (visitanteCompleto ? ' disabled' : '') + '>';
            html += '<div class="team-name">' + (match.equipoVisitante || '') + '</div>';
            html += '<div class="team-label">Equipo Visitante</div>';
            html += (visitanteCompleto ? '<span class="check">✓ Completado</span>' : '<span class="action">Completar acta →</span>');
            html += '</button>';
            html += '</div>';
            html += '<div class="match-location">📍 ' + (match.lugar || '') + '</div>';
            html += '</div>';
            html += '</div>';
            htmlParts.push(html);
        }

        lista.innerHTML = htmlParts.join('');
    }

    async function selectTeamForMatch(matchId, team) {
        const matches = await getMatches();
        const match = (matches || []).find(m => m.id === matchId);
        
        if (!match) {
            alert('Partido no encontrado');
            return;
        }
        
        const deadline = calculateDeadline(match.fecha);
        const now = new Date();
        
        if (now > deadline) {
            var confirmar = confirm('⚠️ ATENCIÓN: El plazo límite era ' + formatDateTime(deadline) + '.\n' +
                'Esta acta se está completando fuera de plazo.\n\n' +
                '¿Deseas continuar de todos modos?');
            if (!confirmar) return;
        }
        
        currentMatch = match;
        currentTeam = team;
        showEvaluationForm();
    }

    function showEvaluationForm() {
        showView('evaluationView');
        
        const miEquipo = currentTeam === 'local' ? currentMatch.equipoLocal : currentMatch.equipoVisitante;
        const equipoContrario = currentTeam === 'local' ? currentMatch.equipoVisitante : currentMatch.equipoLocal;
        
        document.getElementById('miEquipo').textContent = miEquipo;
        document.getElementById('equipoContrario').textContent = equipoContrario;
        document.getElementById('labelMiEquipo').textContent = miEquipo;
        document.getElementById('labelEquipoContrario').textContent = equipoContrario;
        
        const matchInfo = document.getElementById('matchInfo');
        var html = '';
        html += '<div class="match-info-card">';
        html += '<h3>Información del Partido</h3>';
        html += '<div class="info-grid">';
        html += '<div class="info-item"><span class="info-label">Categoría:</span><span class="info-value">' + currentMatch.categoria + ' ' + currentMatch.sexo + ' - Grupo ' + currentMatch.grupo + '</span></div>';
        html += '<div class="info-item"><span class="info-label">Fecha:</span><span class="info-value">' + formatDate(currentMatch.fecha) + ' - ' + currentMatch.hora + '</span></div>';
        html += '<div class="info-item"><span class="info-label">Lugar:</span><span class="info-value">' + currentMatch.lugar + '</span></div>';
        html += '</div>';
        html += '</div>';
        matchInfo.innerHTML = html;
        
        const scoringFormEl2 = document.getElementById('scoringForm'); if (scoringFormEl2) scoringFormEl2.reset();
        calculateTotal();
    }

    function calculateTotal() {
        const categories = ['entrenador', 'deportistas', 'arbitro', 'aficion'];
        let total = 0;
        
        categories.forEach(function(category) {
            var selected = document.querySelector('input[name="' + category + '"]:checked');
            if (selected) {
                total += parseInt(selected.value);
            }
        });
        
        const totalPuntosEl2 = document.getElementById('totalPuntos'); if (totalPuntosEl2) totalPuntosEl2.textContent = total;
        return total;
    }

    async function submitEvaluation(e) {
        console.log('submitEvaluation called', e && e.type ? e.type : 'no-event');
        if (e && typeof e.preventDefault === 'function') e.preventDefault();
        if (e && typeof e.stopImmediatePropagation === 'function') {
            e.stopImmediatePropagation();
        }

        if (__submittingEvaluation) {
            console.warn('submitEvaluation: already submitting, ignoring duplicate call');
            return;
        }
        __submittingEvaluation = true;
        // Disable submit button immediately to avoid double-clicks
        try {
            const formEl = (e && e.target && e.target.tagName === 'FORM') ? e.target : document.getElementById('scoringForm');
            if (formEl) {
                const sb = formEl.querySelector('button[type="submit"]');
                if (sb) {
                    sb.disabled = true;
                    sb.dataset.__disabledByScript = '1';
                }
                // remove submit listener to avoid reentrancy from other attached handlers
                try { formEl.removeEventListener('submit', submitEvaluation); } catch (rmErr) { /* ignore */ }
            }
        } catch (disErr) { console.warn('Could not disable submit button:', disErr); }
        
        const requiredFields = ['entrenador', 'deportistas', 'arbitro', 'aficion'];
        let allSelected = true;
        
        requiredFields.forEach(function(field) {
            if (!document.querySelector('input[name="' + field + '"]:checked')) {
                allSelected = false;
            }
        });
        
        if (!allSelected) {
            alert('Por favor, completa todas las secciones de calificación.');
            __submittingEvaluation = false;
            try {
                const formEl = document.getElementById('scoringForm');
                if (formEl) formEl.addEventListener('submit', submitEvaluation);
            } catch (reErr) {}
            return;
        }
        if (!currentMatch || !currentMatch.id && !currentMatch.idpartido && !currentMatch.idPartido) {
            alert('No se ha seleccionado correctamente el partido. Vuelve a seleccionar el partido antes de guardar.');
            console.warn('submitEvaluation aborted: currentMatch missing', currentMatch);
            __submittingEvaluation = false;
            try {
                const formEl = document.getElementById('scoringForm');
                if (formEl) formEl.addEventListener('submit', submitEvaluation);
            } catch (reErr) {}
            return;
        }

        const resolvedMatchId = currentMatch.id || currentMatch.idpartido || currentMatch.idPartido;

        const evaluationData = {
            id: Date.now().toString(),
            idpartido: resolvedMatchId,
            evaluador: (document.getElementById('nombre') && document.getElementById('nombre').value) || '',
            email: (document.getElementById('email') && document.getElementById('email').value) || '',
            rol: (document.getElementById('rol') && document.getElementById('rol').value) || '',
            puntuaciones: {
                entrenador: parseInt(document.querySelector('input[name="entrenador"]:checked').value),
                deportistas: parseInt(document.querySelector('input[name="deportistas"]:checked').value),
                arbitro: parseInt(document.querySelector('input[name="arbitro"]:checked').value),
                aficion: parseInt(document.querySelector('input[name="aficion"]:checked').value)
            },
            totalPuntos: calculateTotal(),
            fechaEnvio: new Date().toISOString()
        };

        console.log('Built evaluation payload (before insert):', evaluationData);
        // Map client payload keys to DB column names expected in Supabase table `evaluaciones`.
        const payloadDb = {
            id: evaluationData.id,
            idpartido: evaluationData.idpartido,
            evaluador: evaluationData.evaluador,
            email: evaluationData.email,
            rol: evaluationData.rol,
            puntuaciones: evaluationData.puntuaciones || {},
            totalpuntos: Number.isFinite(Number(evaluationData.totalPuntos)) ? parseInt(evaluationData.totalPuntos) : 0,
            fechaenvio: evaluationData.fechaEnvio ? new Date(evaluationData.fechaEnvio).toISOString() : new Date().toISOString()
        };
        // Ensure we include the 'equipo' column (local/visitante/arbitro) expected by the DB
        try {
            const derivedEquipo = currentTeam || (String(payloadDb.rol || '').toLowerCase().includes('local') ? 'local' : (String(payloadDb.rol || '').toLowerCase().includes('visitante') ? 'visitante' : (String(payloadDb.rol || '').toLowerCase().includes('arbitro') || String(payloadDb.rol || '').toLowerCase().includes('árbitro') ? 'arbitro' : '')));
            payloadDb.equipo = derivedEquipo;
            // nombre del equipo evaluado (nombreequipo) según el equipo seleccionado
            if (derivedEquipo === 'local') {
                payloadDb.nombreequipo = (currentMatch && (currentMatch.local || currentMatch.equipoLocal || currentMatch.Local)) || '';
            } else if (derivedEquipo === 'visitante') {
                payloadDb.nombreequipo = (currentMatch && (currentMatch.visitante || currentMatch.equipoVisitante || currentMatch.Visitante)) || '';
            } else {
                // Fallback: store the rol text if we can't derive equipo
                payloadDb.nombreequipo = payloadDb.rol || '';
            }
        } catch (derErr) {
            console.warn('Could not derive equipo/nombreequipo for payload:', derErr);
        }

        // Derive a deterministic id to avoid double-inserts when user clicks twice quickly.
        try {
            const idKeyPart = String(payloadDb.idpartido || payloadDb.id || '').trim();
            const equipoPart = String(payloadDb.equipo || payloadDb.rol || '').trim();
            let detId = (idKeyPart + '::' + equipoPart).replace(/\s+/g, '_');
            if (!detId || detId === '::') {
                detId = 'eval-' + Date.now().toString();
            }
            payloadDb.id = detId;
        } catch (idErr) {
            console.warn('Could not derive deterministic id for evaluation:', idErr);
        }
        console.log('Mapped payload for DB (keys match table evaluaciones):', payloadDb);

        // Prevent duplicate evaluation for same idpartido + equipo (server check + client lock)
        try {
            const lockKey = String(payloadDb.idpartido || '') + '::' + String(payloadDb.equipo || '');
            if (__submittingByMatch.has(lockKey)) {
                console.warn('submitEvaluation: another submission in progress for', lockKey);
                showStatus('⚠️ Ya se está enviando una evaluación para este partido y rol. Espera un momento.', 'warning');
                __submittingEvaluation = false;
                // re-enable submit button and reattach listener
                try { const f = document.getElementById('scoringForm'); if (f) { const sb = f.querySelector('button[type="submit"]'); if (sb && sb.dataset.__disabledByScript) { sb.disabled = false; delete sb.dataset.__disabledByScript; } f.addEventListener('submit', submitEvaluation); } } catch (rr) {}
                return;
            }
            __submittingByMatch.set(lockKey, true);

            const { data: existing, error: existErr } = await supabase.from('evaluaciones').select('*').eq('idpartido', payloadDb.idpartido).eq('equipo', payloadDb.equipo).limit(1);
            if (existErr) {
                console.warn('Could not check existing evaluation before insert:', existErr);
            } else if (existing && existing.length > 0) {
                console.warn('An evaluation for this partido and rol already exists:', existing[0]);
                showStatus('⚠️ Ya existe una evaluación para este partido y rol (no se guardó otra).', 'warning');
                __submittingEvaluation = false;
                try { const f = document.getElementById('scoringForm'); if (f) { const sb = f.querySelector('button[type="submit"]'); if (sb && sb.dataset.__disabledByScript) { sb.disabled = false; delete sb.dataset.__disabledByScript; } f.addEventListener('submit', submitEvaluation); } } catch (rr) {}
                __submittingByMatch.delete(lockKey);
                return;
            }
        } catch (checkErr) {
            console.warn('Error checking existing evaluation:', checkErr);
        }
        // Helper to attempt insert and optionally retry removing unknown columns
        async function tryInsertEval(payload) {
            console.log('Attempting to insert evaluation payload to Supabase:', payload);
            const { data: inserted, error } = await supabase.from('evaluaciones').insert([payload]).select();
            console.log('supabase insert evaluaciones ->', { inserted, error });
            if (!error) return { inserted };

            // If error mentions unknown column, try removing that column and retry once
            const msg = (error && error.message) || (error && error.details) || '';
            const m = /Could not find the '([^']+)' column/.exec(msg);
            if (m && m[1]) {
                const col = m[1];
                console.warn('Supabase insert error - unknown column detected:', col, ' - retrying without it');
                const payload2 = Object.assign({}, payload);
                delete payload2[col];
                const { data: inserted2, error: error2 } = await supabase.from('evaluaciones').insert([payload2]).select();
                console.log('supabase insert retry ->', { inserted2, error2 });
                if (!error2) return { inserted: inserted2 };
                return { error: error2 };
            }

            return { error };
        }

        try {
            const result = await tryInsertEval(payloadDb);
            if (result && result.error) throw result.error;
            showStatus('✓ Evaluación guardada en la nube', 'success');
        } catch (error) {
            console.error('Error inserting evaluation to supabase:', error);
            // Si falla Supabase, guardar en localStorage (evitamos duplicados)
            try {
                let evaluations = JSON.parse(localStorage.getItem('evaluations') || '[]');
                // Remove any existing entry with same idpartido+equipo
                evaluations = (evaluations || []).filter(ev => !(String(ev.idpartido) === String(payloadDb.idpartido) && String(ev.equipo) === String(payloadDb.equipo)));
                const fallback = Object.assign({}, payloadDb);
                evaluations.push(fallback);
                localStorage.setItem('evaluations', JSON.stringify(evaluations));
                showStatus('⚠️ Evaluación guardada localmente (error en la nube)', 'warning');
            } catch (lsErr) {
                console.error('Error saving evaluation to localStorage fallback:', lsErr);
            }
        } finally {
            // release lock and reset submitting flag
            try {
                const lockKey = String(payloadDb.idpartido || '') + '::' + String(payloadDb.equipo || '');
                __submittingByMatch.delete(lockKey);
            } catch (delErr) {}
            __submittingEvaluation = false;
            // re-enable submit button and reattach listener
            try {
                const formEl = document.getElementById('scoringForm');
                if (formEl) {
                    const sb = formEl.querySelector('button[type="submit"]');
                    if (sb && sb.dataset.__disabledByScript) {
                        sb.disabled = false;
                        delete sb.dataset.__disabledByScript;
                    }
                    // Ensure listener exists for subsequent submissions
                    try { formEl.removeEventListener('submit', submitEvaluation); } catch (rmErr) {}
                    formEl.addEventListener('submit', submitEvaluation);
                }
            } catch (reErr) { console.warn('Error re-enabling submit button/listener:', reErr); }
        }
        
        const submissionMsgEl3 = document.getElementById('submissionMessage'); if (submissionMsgEl3) submissionMsgEl3.classList.remove('hidden');
        window.scrollTo({ top: 0, behavior: 'smooth' });
        
        setTimeout(() => {
            const submissionMsgEl4 = document.getElementById('submissionMessage'); if (submissionMsgEl4) submissionMsgEl4.classList.add('hidden');
            showView('selectMatchView');
            loadAvailableMatches();
        }, 2000);
    }

    async function getEvaluationsForMatch(matchId) {
        try {
            let { data, error } = await supabase.from('evaluaciones').select('*').eq('idpartido', matchId);
            if (error) throw error;
            return data;
        } catch (e) {
            const evaluations = await getEvaluations();
            return evaluations.filter(e => e.matchId === matchId);
        }
    }

    async function loadResults() {
        const matches = await getMatches();
        const filterCategoria = document.getElementById('resultsFilterCategoria').value;
        const resultsList = document.getElementById('resultsList');

        let filteredMatches = matches;
        if (filterCategoria) {
            filteredMatches = (matches || []).filter(m => m.categoria === filterCategoria);
        }

        // Traer todas las evaluaciones de una sola vez
        const allEvaluations = await getEvaluations();
        const completedMatches = [];
        for (const match of filteredMatches) {
            const evaluaciones = (allEvaluations || []).filter(e => String(e.matchId || e.idpartido || e.idPartido || e.id) === String(match.id));
            if ((evaluaciones || []).length === 2) completedMatches.push(match);
        }

        if (completedMatches.length === 0) {
            resultsList.innerHTML = '<p class="no-data">No hay partidos completados todavía.</p>';
            return;
        }

        let htmlParts = [];
        for (const match of completedMatches) {
            const evaluaciones = (allEvaluations || []).filter(e => String(e.matchId || e.idpartido || e.idPartido || e.id) === String(match.id));
            const evalLocal = (evaluaciones || []).find(function(e) { return e.equipo === 'local'; }) || {};
            const evalVisitante = (evaluaciones || []).find(function(e) { return e.equipo === 'visitante'; }) || {};
            var html = '';
            html += '<div class="result-card">';
            html += '<div class="result-header">';
            html += '<h3>' + (match.categoria || '') + ' ' + (match.sexo || '') + ' - Grupo ' + (match.grupo || '') + '</h3>';
            html += '<div class="result-date">' + formatDate(match.fecha) + ' - ' + (match.hora || '') + '</div>';
            html += '</div>';
            html += '<div class="result-body">';
            html += '<div class="result-teams">';
            html += '<div class="result-team">';
            html += '<div class="team-name">' + (match.equipoLocal || '') + '</div>';
            html += '<div class="team-score">' + (evalLocal.setsGanados || '') + '</div>';
            html += '<div class="team-points">Fair Play: ' + (evalVisitante.totalPuntos || '') + '/16</div>';
            html += '</div>';
            html += '<div class="result-vs">-</div>';
            html += '<div class="result-team">';
            html += '<div class="team-name">' + (match.equipoVisitante || '') + '</div>';
            html += '<div class="team-score">' + (evalVisitante.setsGanados || '') + '</div>';
            html += '<div class="team-points">Fair Play: ' + (evalLocal.totalPuntos || '') + '/16</div>';
            html += '</div>';
            html += '</div>';
            html += '<button onclick="viewDetailedResults(\'' + (match.id || '') + '\')" class="btn-primary btn-small">Ver Detalle</button>';
            html += '</div>';
            html += '</div>';
            htmlParts.push(html);
        }

        resultsList.innerHTML = htmlParts.join('');
    }

    async function viewDetailedResults(matchId) {
        const matches = await getMatches();
        const match = (matches || []).find(m => m.id === matchId);
        const evaluaciones = await getEvaluationsForMatch(matchId);
        
        if (!match || evaluaciones.length !== 2) {
            alert('No se pueden mostrar los resultados');
            return;
        }
        
        const evalLocal = evaluaciones.find(e => e.equipo === 'local');
        const evalVisitante = evaluaciones.find(e => e.equipo === 'visitante');
        
        var html = '';
        html += '<div class="detailed-results">';
        html += '<h2>Resultados Detallados</h2>';
        html += '<h3>' + match.categoria + ' ' + match.sexo + ' - Grupo ' + match.grupo + '</h3>';
        html += '<p>' + formatDate(match.fecha) + ' - ' + match.hora + ' | ' + match.lugar + '</p>';
        html += '<div class="detailed-grid">';
        html += '<div class="detailed-team">';
        html += '<h4>' + match.equipoLocal + '</h4>';
        html += '<p><strong>Sets ganados:</strong> ' + evalLocal.setsGanados + '</p>';
        html += '<p><strong>Evaluado por:</strong> ' + match.equipoVisitante + '</p>';
        html += '<p><strong>Puntos Fair Play:</strong> ' + evalVisitante.totalPuntos + '/16</p>';
        html += '<ul>';
        html += '<li>Entrenador: ' + evalVisitante.puntuaciones.entrenador + '/4</li>';
        html += '<li>Deportistas: ' + evalVisitante.puntuaciones.deportistas + '/4</li>';
        html += '<li>Árbitro: ' + evalVisitante.puntuaciones.arbitro + '/4</li>';
        html += '<li>Afición: ' + evalVisitante.puntuaciones.aficion + '/4</li>';
        html += '</ul>';
        html += '<p><strong>Firma:</strong> ' + evalLocal.firma + '</p>';
        html += '</div>';
        html += '<div class="detailed-team">';
        html += '<h4>' + match.equipoVisitante + '</h4>';
        html += '<p><strong>Sets ganados:</strong> ' + evalVisitante.setsGanados + '</p>';
        html += '<p><strong>Evaluado por:</strong> ' + match.equipoLocal + '</p>';
        html += '<p><strong>Puntos Fair Play:</strong> ' + evalLocal.totalPuntos + '/16</p>';
        html += '<ul>';
        html += '<li>Entrenador: ' + evalLocal.puntuaciones.entrenador + '/4</li>';
        html += '<li>Deportistas: ' + evalLocal.puntuaciones.deportistas + '/4</li>';
        html += '<li>Árbitro: ' + evalLocal.puntuaciones.arbitro + '/4</li>';
        html += '<li>Afición: ' + evalLocal.puntuaciones.aficion + '/4</li>';
        html += '</ul>';
        html += '<p><strong>Firma:</strong> ' + evalVisitante.firma + '</p>';
        html += '</div>';
        html += '</div>';
        html += '<button onclick="closeDetailedResults()" class="btn-secondary">Cerrar</button>';
        html += '</div>';
        var modal = document.createElement('div');
        modal.className = 'modal';
        modal.innerHTML = html;
        document.body.appendChild(modal);
    }

    function closeDetailedResults() {
        const modal = document.querySelector('.modal');
        if (modal) modal.remove();
    }

    function viewMatchResults(matchId) {
        viewDetailedResults(matchId);
    }

    function calculateDeadline(matchDate) {
        const fecha = new Date(matchDate + 'T00:00:00');
        const diaPartido = fecha.getDay();
        let diasHastaLunes = (8 - diaPartido) % 7;
        if (diasHastaLunes === 0) diasHastaLunes = 7;
        
        const deadline = new Date(fecha);
        deadline.setDate(fecha.getDate() + diasHastaLunes);
        deadline.setHours(12, 0, 0, 0);
        
        return deadline;
    }

    function formatDate(dateString) {
        const date = new Date(dateString + 'T00:00:00');
        return date.toLocaleDateString('es-ES', { 
            weekday: 'long', 
            year: 'numeric', 
            month: 'long', 
            day: 'numeric' 
        });
    }

    function formatDateTime(date) {
        return date.toLocaleDateString('es-ES', { 
            weekday: 'long', 
            year: 'numeric', 
            month: 'long', 
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
    }
});