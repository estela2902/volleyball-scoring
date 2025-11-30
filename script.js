// Sistema de gestión de partidos y evaluaciones
let currentMatch = null;
let currentTeam = null;
let useCloudStorage = false;

// Inicialización
document.addEventListener('DOMContentLoaded', async () => {
    // Mostrar email del usuario autenticado en la cabecera pública
    function mostrarEmailUsuarioPublic() {
        const user = firebase.auth().currentUser;
        const emailDiv = document.getElementById('userEmailPublic');
        if (emailDiv) {
            if (user && user.email) {
                emailDiv.textContent = user.email;
            } else {
                emailDiv.textContent = '';
            }
        }
    }
    firebase.auth().onAuthStateChanged(() => {
        mostrarEmailUsuarioPublic();
    });
    mostrarEmailUsuarioPublic();

    // Botón de partidos públicos en la cabecera pública (opcional, recarga la vista)
    const btnIrPartidos2 = document.getElementById('btnIrPartidos2');
    if (btnIrPartidos2) {
        btnIrPartidos2.addEventListener('click', () => {
            document.querySelectorAll('.view').forEach(view => view.classList.add('hidden'));
            document.getElementById('publicView').classList.remove('hidden');
            document.getElementById('publicView').style.display = '';
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
            document.getElementById('publicView').classList.remove('hidden');
            document.getElementById('publicView').style.display = '';
            // Forzar recarga de partidos públicos
            if (typeof cargarPartidosPublicos === 'function') {
                cargarPartidosPublicos();
            }
        });
    }
    // Mostrar email del usuario autenticado en la cabecera
    function mostrarEmailUsuario() {
        const user = firebase.auth().currentUser;
        const emailDiv = document.getElementById('userEmail');
        if (user && user.email) {
            emailDiv.textContent = user.email;
        } else {
            emailDiv.textContent = '';
        }
    }

    firebase.auth().onAuthStateChanged(() => {
        mostrarEmailUsuario();
    });
    mostrarEmailUsuario();
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

    // Cargar y mostrar partidos públicos
    async function cargarPartidosPublicos() {
        // Obtener todos los partidos de Firestore
        let partidos = [];
        try {
            const snapshot = await firestoreService.db.collection('partidos').get();
            partidos = snapshot.docs.map(doc => doc.data());
        } catch (e) {
            publicMatchesList.innerHTML = '<p class="no-data">No se pudieron cargar los partidos.</p>';
            return;
        }
        poblarFiltros(partidos);
        renderizarPartidosPublicos(partidos);
    }

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
            var id = p['idPartido'] || '';
            var doneLocal = id.endsWith('1');
            var doneVisitante = id.endsWith('2');
            var doneArbitro = id.endsWith('3');
            // Añadir handlers para mostrar pantalla de evaluación
            var html = '';
            html += "<span class='eval-icons'>";
            html += "<svg class='eval-icon eval-icon-local' " + (doneLocal ? 'filled' : '') + " data-rol='local' data-id='" + id + "' viewBox='0 0 24 24' onclick='window.mostrarPublicEval && window.mostrarPublicEval(event, \"local\")'><path d='M12 2C7.03 2 2.5 6.03 2.5 11c0 5.25 7.5 11 9.5 11s9.5-5.75 9.5-11C21.5 6.03 16.97 2 12 2zm0 15.5c-2.5 0-4.5-2-4.5-4.5s2-4.5 4.5-4.5 4.5 2 4.5 4.5-2 4.5-4.5 4.5z' fill='none' stroke='currentColor' stroke-width='1.5'/></svg>";
            html += "<svg class='eval-icon eval-icon-visitante' " + (doneVisitante ? 'filled' : '') + " data-rol='visitante' data-id='" + id + "' viewBox='0 0 24 24' onclick='window.mostrarPublicEval && window.mostrarPublicEval(event, \"visitante\")'><path d='M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 17.5c-2.5 0-4.5-2-4.5-4.5s2-4.5 4.5-4.5 4.5 2 4.5 4.5-2 4.5-4.5 4.5z' fill='none' stroke='currentColor' stroke-width='1.5'/></svg>";
            html += "<svg class='eval-icon eval-icon-arbitro' " + (doneArbitro ? 'filled' : '') + " data-rol='arbitro' data-id='" + id + "' viewBox='0 0 24 24' onclick='window.mostrarPublicEval && window.mostrarPublicEval(event, \"arbitro\")'><circle cx='12' cy='12' r='10' fill='none' stroke='currentColor' stroke-width='1.5'/><path d='M8 12h8' stroke='currentColor' stroke-width='1.5'/></svg>";
            html += "</span>";
            return html;
        }
        // Función global para mostrar pantalla de evaluación pública
        window.mostrarPublicEval = async function (event, rol) {
            // Obtener idPartido
            var svg = event.currentTarget;
            var idPartido = svg.getAttribute('data-id');
            // Buscar partido en Firestore
            var partido = null;
            try {
                var snap = await firestoreService.db.collection('partidos').where('idPartido', '==', idPartido).get();
                if (!snap.empty) partido = snap.docs[0].data();
            } catch (e) { return; }
            if (!partido) return;
            // Mostrar pantalla
            document.querySelectorAll('.view').forEach(function(v) { v.classList.add('hidden'); });
            document.getElementById('publicEvalView').style.display = '';
            document.getElementById('publicEvalView').classList.remove('hidden');
            // Renderizar contenido
            var evalHtml = '';
            evalHtml += '<div class="match-header">' + partido.Local + ' vs ' + partido.Visitante + '</div>';
            evalHtml += '<div class="match-meta">';
            evalHtml += '<span>' + (partido.Edicion || '') + '</span>';
            evalHtml += '<span>📍 ' + (partido['Campo de juego'] || '') + '</span>';
            evalHtml += '<span>📅 ' + formatearFecha(partido.Fecha || partido['Fecha jornada']) + '</span>';
            evalHtml += '</div>';
            evalHtml += '<form id="publicEvalForm">';
            evalHtml += '<div class="eval-form-section">';
            evalHtml += '<h3>Información del Evaluador</h3>';
            evalHtml += '<div class="eval-form-row">';
            evalHtml += '<div style="flex:2">';
            evalHtml += '<label>Nombre completo</label>';
            evalHtml += '<input type="text" name="nombre" placeholder="Tu nombre y apellidos" required>';
            evalHtml += '</div>';
            evalHtml += '<div style="flex:1">';
            evalHtml += '<label>Email</label>';
            evalHtml += '<input type="email" name="email" placeholder="tu@email.com" required>';
            evalHtml += '</div>';
            evalHtml += '</div>';
            evalHtml += '<div class="eval-form-row">';
            evalHtml += '<div style="flex:1">';
            evalHtml += '<label>Tu rol en el partido</label>';
            evalHtml += '<input type="text" name="rol" value="' + (rol === 'local' ? 'Entrenador/a Equipo Local' : rol === 'visitante' ? 'Entrenador/a Equipo Visitante' : 'Árbitro/a') + '" readonly>';
            evalHtml += '</div>';
            evalHtml += '</div>';
            evalHtml += '</div>';
            evalHtml += '<div class="resultado-box">RESULTADO <span id="publicEvalResultado">0</span> / 16</div>';
            evalHtml += '<div class="eval-form-section">';
            evalHtml += '<h3>Cuestionario de Evaluación</h3>';
            evalHtml += '<div style="color:#888;font-size:1em;margin-bottom:1em;">Selecciona una opción para cada categoría.</div>';
            // Pregunta 1
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
            // Pregunta 2
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
            // Pregunta 3
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
            // Pregunta 4
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
            evalHtml += '<button type="submit" class="btn-primary">Guardar Acta</button>';
            evalHtml += '</form>';
            document.getElementById('publicEvalContent').innerHTML = evalHtml;
            // Actualizar resultado en tiempo real
            var form = document.getElementById('publicEvalForm');
            var updateResultado = function() {
                var total = 0;
                ['entrenador','deportistas','arbitro','aficion'].forEach(function(name) {
                    var val = form.querySelector("input[name='"+name+"']:checked");
                    if (val) total += parseInt(val.value);
                });
                document.getElementById('publicEvalResultado').textContent = total;
            };
            form.addEventListener('change', updateResultado);
            updateResultado();
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
        filtroEdicion.addEventListener('change', () => cargarPartidosPublicos());
        filtroGrupo.addEventListener('change', () => cargarPartidosPublicos());
        filtroEquipoLocal.addEventListener('input', () => cargarPartidosPublicos());
        btnLimpiarFiltros.addEventListener('click', () => {
            choicesEdicion.setChoiceByValue('');
            choicesGrupo.setChoiceByValue('');
            filtroEquipoLocal.value = '';
            cargarPartidosPublicos();
        });
    }

    // Cargar partidos públicos al mostrar la vista pública
    function activarVistaPublica() {
        cargarPartidosPublicos();
    }

    // Hook: cuando se muestre la publicView, cargar partidos
    const observer = new MutationObserver((mutations) => {
        mutations.forEach(m => {
            if (m.target.id === 'publicView' && !m.target.classList.contains('hidden')) {
                activarVistaPublica();
            }
        });
    });
    const publicViewDiv = document.getElementById('publicView');
    if (publicViewDiv) {
        observer.observe(publicViewDiv, { attributes: true, attributeFilter: ['class'] });
    }
    // Importar partidos desde Excel
    document.getElementById('importExcelBtn').addEventListener('click', () => {
        document.getElementById('excelFileInput').click();
    });
    document.getElementById('excelFileInput').addEventListener('change', handleExcelFile, false);

    // Control de acceso: mostrar vista admin solo a la cuenta admin, el resto ve la vista pública
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
            document.getElementById('mainNav').style.display = 'none';
            document.getElementById('adminView').style.display = 'none';
            document.getElementById('publicView').style.display = '';
            // Aquí luego se cargará la lógica de partidos públicos
        }
    });
    // Si no hay auth, forzar vista pública por defecto
    if (!firebase.auth().currentUser) {
        showView('publicView');
        document.getElementById('mainNav').style.display = 'none';
        document.getElementById('adminView').style.display = 'none';
        document.getElementById('publicView').style.display = '';
    }
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
            adminView.appendChild(previewDiv);
        }
        previewDiv.innerHTML = html;

        document.getElementById('confirmImportBtn').onclick = () => {
            importMatchesFromExcel(headers, rows);
        };
    }

    async function importMatchesFromExcel(headers, rows) {
        // Mapear los datos según los nombres de columna esperados
        // Guardar todos los campos del Excel y convertir fechas a ISO
        const partidos = rows.map(row => {
            const obj = {};
            headers.forEach((h, i) => {
                let val = row[i];
                // Si el campo es una fecha (por nombre), convertir a ISO
                if (["Fecha", "Fecha jornada", "fecha", "fecha jornada", "fechaPartido", "fechaJornada"].includes(h.trim())) {
                    if ((typeof val === 'number' && !isNaN(val)) || (typeof val === 'string' && /^\d+(\.\d+)?$/.test(val))) {
                        val = excelDateToISO(val);
                    }
                }
                obj[h] = val;
            });
            // Alias para compatibilidad con el resto del sistema
            obj.idPartido = obj["ID PARTIDO"];
            obj.fechaPartido = obj["Fecha"] || obj["Fecha jornada"];
            obj.fechaJornada = obj["Fecha jornada"];
            obj.equipoLocal = obj["Local"];
            obj.equipoVisitante = obj["Visitante"];
            obj.fechaCreacion = new Date().toISOString();
            // Eliminar campos undefined
            Object.keys(obj).forEach(k => { if (obj[k] === undefined) delete obj[k]; });
            return obj;
        });
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
        const batchSize = 20;
        for (let i = 0; i < partidos.length; i += batchSize) {
            const batch = partidos.slice(i, i + batchSize);
            await Promise.all(batch.map(async partido => {
                if (!partido.idPartido || String(partido.idPartido).trim() === '') {
                    skipped++;
                    return;
                }
                try {
                    // Buscar si ya existe un partido con ese idPartido
                    const querySnapshot = await firestoreService.db.collection('partidos').where('idPartido', '==', partido.idPartido).get();
                    if (!querySnapshot.empty) {
                        // Actualizar el primero encontrado
                        const docId = querySnapshot.docs[0].id;
                        await firestoreService.db.collection('partidos').doc(docId).update(partido);
                        updated++;
                    } else {
                        await firestoreService.guardarPartido(partido);
                        ok++;
                    }
                } catch (e) {
                    fail++;
                    console.error('Error importando partido', partido, e);
                }
            }));
        }
        if (skipped > 0) {
            console.warn('Saltados ' + skipped + ' partidos por falta de ID Partido.');
        }
        alert('Importación finalizada. Nuevos: ' + ok + ', Actualizados: ' + updated + ', Fallidos: ' + fail);
        document.getElementById('excelPreviewDiv').remove();
        // Solo recargar partidos si existe el panel/lista
        if (document.getElementById('matchesList')) {
            loadMatches();
        }
    }
    showView('adminView');
    
    // Inicializar Firestore
    try {
        await firestoreService.initialize();
        updateSyncUI();
    } catch (error) {
        console.error('Error inicializando Firestore:', error);
        showStatus('⚠️ Modo offline - Sin conexión a Firestore', 'warning');
    }
    
    loadMatches();
    
    // Event listeners para navegación
    document.getElementById('btnAdmin').addEventListener('click', () => {
        showView('adminView');
        loadMatches();
    });
    
    document.getElementById('btnTeam').addEventListener('click', () => {
        showView('selectMatchView');
        loadAvailableMatches();
    });
    
    document.getElementById('btnResults').addEventListener('click', () => {
        showView('resultsView');
        loadResults();
    });
    
    // Event listeners para Firestore
    document.getElementById('btnGoogleAuth').addEventListener('click', authenticateFirestore);
    document.getElementById('btnSync').addEventListener('click', syncWithCloud);
    document.getElementById('btnSignOut').addEventListener('click', signOutFirestore);
    
    // Event listeners para formularios
    // Eliminados eventos de crear partido
    document.getElementById('scoringForm').addEventListener('submit', submitEvaluation);
    document.getElementById('cancelEvaluationBtn').addEventListener('click', () => {
        showView('selectMatchView');
        loadAvailableMatches();
    });
    
    // Event listeners para filtros
    document.getElementById('filterCategoria').addEventListener('change', loadAvailableMatches);
    document.getElementById('filterSexo').addEventListener('change', loadAvailableMatches);
    document.getElementById('filterGrupo').addEventListener('change', loadAvailableMatches);
    document.getElementById('filterFecha').addEventListener('change', loadAvailableMatches);
    document.getElementById('resultsFilterCategoria').addEventListener('change', loadResults);
    
    // Event listener para actualización de categoría
    document.getElementById('categoria').addEventListener('change', updateSexoOptions);
    
    // Event listeners para cálculo de puntos
    document.addEventListener('change', (e) => {
        if (e.target.type === 'radio' && e.target.form && e.target.form.id === 'scoringForm') {
            calculateTotal();
        }
    });
    
    document.getElementById('fechaPartido').valueAsDate = new Date();

    // ========== FUNCIONES DE FIRESTORE ==========

    async function authenticateFirestore() {
        try {
            showStatus('🔄 Conectando con Google...', 'info');
            await firestoreService.authenticate();
            useCloudStorage = true;
            updateSyncUI();
            showStatus('✓ Conectado con Firestore', 'success');
            
            // Preguntar si quiere cargar datos desde la nube
            if (confirm('¿Quieres cargar los datos existentes desde Firestore?')) {
                await loadFromCloud();
            }
        } catch (error) {
            console.error('Error en autenticación:', error);
            showStatus('❌ Error conectando con Google', 'error');
        }
    }

    async function syncWithCloud() {
        try {
            showStatus('🔄 Sincronizando...', 'info');
            await firestoreService.sincronizarConLocalStorage();
            showStatus('✓ Sincronización completada', 'success');
            await loadFromCloud();
        } catch (error) {
            console.error('Error en sincronización:', error);
            showStatus('❌ Error en sincronización', 'error');
        }
    }

    async function loadFromCloud() {
        try {
            showStatus('🔄 Cargando datos desde la nube...', 'info');
            await firestoreService.cargarDesdeLaNube();
            loadMatches();
            loadAvailableMatches();
            loadResults();
            showStatus('✓ Datos cargados desde la nube', 'success');
        } catch (error) {
            console.error('Error cargando desde la nube:', error);
            showStatus('❌ Error cargando datos', 'error');
        }
    }

    async function signOutFirestore() {
        await firestoreService.signOutUser();
        useCloudStorage = false;
        updateSyncUI();
        showStatus('Sesión cerrada', 'info');
    }

    function updateSyncUI() {
        const isAuth = firestoreService.isAuthenticated();
        document.getElementById('btnGoogleAuth').classList.toggle('hidden', isAuth);
        document.getElementById('btnSync').classList.toggle('hidden', !isAuth);
        document.getElementById('btnSignOut').classList.toggle('hidden', !isAuth);
        
        if (isAuth) {
            useCloudStorage = true;
        }
    }

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
        document.getElementById(viewId).classList.remove('hidden');
    }

    function updateSexoOptions() {
        const categoria = document.getElementById('categoria').value;
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
        document.getElementById('matchFormSection').classList.remove('hidden');
        document.getElementById('showMatchFormBtn').style.display = 'none';
    }

    function hideMatchForm() {
        document.getElementById('matchFormSection').classList.add('hidden');
        document.getElementById('showMatchFormBtn').style.display = 'inline-block';
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
        
        // Guardar en localStorage
        const matches = getMatches();
        matches.push(matchData);
        localStorage.setItem('matches', JSON.stringify(matches));
        
        // Guardar en Firestore si está conectado
        if (useCloudStorage && firestoreService.isAuthenticated()) {
            try {
                showStatus('📤 Guardando en Firestore...', 'info');
                await firestoreService.guardarPartido(matchData);
                showStatus('✓ Partido guardado en la nube', 'success');
            } catch (error) {
                console.error('Error guardando en la nube:', error);
                showStatus('⚠️ Guardado localmente (error en la nube)', 'warning');
            }
        }
        
        hideMatchForm();
        loadMatches();
        alert('Partido creado correctamente');
    }

    function getMatches() {
        return JSON.parse(localStorage.getItem('matches') || '[]');
    }

    function getEvaluations() {
        return JSON.parse(localStorage.getItem('evaluations') || '[]');
    }

    function loadMatches() {
        const matches = getMatches();
        const matchesList = document.getElementById('matchesList');
        
        if (matches.length === 0) {
            matchesList.innerHTML = '<p class="no-data">No hay partidos registrados. Crea uno para comenzar.</p>';
            return;
        }
        
        matchesList.innerHTML = matches.map(match => {
            const evaluaciones = getEvaluationsForMatch(match.id);
            const localCompleto = evaluaciones.some(e => e.equipo === 'local');
            const visitanteCompleto = evaluaciones.some(e => e.equipo === 'visitante');
            
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
            html += '<strong>' + match.categoria + ' ' + match.sexo + ' - Grupo ' + match.grupo + '</strong>';
            html += estadoBadge;
            html += '</div>';
            html += '<div class="match-date">' + formatDate(match.fecha) + ' - ' + match.hora + '</div>';
            html += '</div>';
            html += '<div class="match-body">';
            html += '<div class="match-teams">';
            html += '<div class="team">' + match.equipoLocal + (localCompleto ? ' ✓' : '') + '</div>';
            html += '<span class="vs">vs</span>';
            html += '<div class="team">' + match.equipoVisitante + (visitanteCompleto ? ' ✓' : '') + '</div>';
            html += '</div>';
            html += '<div class="match-location">📍 ' + match.lugar + '</div>';
            html += '</div>';
            html += '<div class="match-actions">';
            html += '<button onclick="deleteMatch(\'' + match.id + '\')" class="btn-danger btn-small">Eliminar</button>';
            if (localCompleto && visitanteCompleto) {
                html += '<button onclick="viewMatchResults(\'' + match.id + '\')" class="btn-primary btn-small">Ver Resultados</button>';
            }
            html += '</div>';
            html += '</div>';
            return html;
        }).join('');
    }

    function loadAvailableMatches() {
        const matches = getMatches();
        const lista = document.getElementById('availableMatchesList');
        
        const filterCategoria = document.getElementById('filterCategoria').value;
        const filterSexo = document.getElementById('filterSexo').value;
        const filterGrupo = document.getElementById('filterGrupo').value;
        const filterFecha = document.getElementById('filterFecha').value;
        
        let filteredMatches = matches.filter(match => {
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
        
        lista.innerHTML = filteredMatches.map(match => {
            const evaluaciones = getEvaluationsForMatch(match.id);
            const localCompleto = evaluaciones.some(e => e.equipo === 'local');
            const visitanteCompleto = evaluaciones.some(e => e.equipo === 'visitante');
            
            var html = '';
            html += '<div class="match-card selectable">';
            html += '<div class="match-header">';
            html += '<div class="match-title"><strong>' + match.categoria + ' ' + match.sexo + ' - Grupo ' + match.grupo + '</strong></div>';
            html += '<div class="match-date">' + formatDate(match.fecha) + ' - ' + match.hora + '</div>';
            html += '</div>';
            html += '<div class="match-body">';
            html += '<div class="match-teams-selection">';
            html += '<button onclick="selectTeamForMatch(\'' + match.id + '\', \'local\')" class="team-button' + (localCompleto ? ' completed' : '') + '"' + (localCompleto ? ' disabled' : '') + '>';
            html += '<div class="team-name">' + match.equipoLocal + '</div>';
            html += '<div class="team-label">Equipo Local</div>';
            html += (localCompleto ? '<span class="check">✓ Completado</span>' : '<span class="action">Completar acta →</span>');
            html += '</button>';
            html += '<button onclick="selectTeamForMatch(\'' + match.id + '\', \'visitante\')" class="team-button' + (visitanteCompleto ? ' completed' : '') + '"' + (visitanteCompleto ? ' disabled' : '') + '>';
            html += '<div class="team-name">' + match.equipoVisitante + '</div>';
            html += '<div class="team-label">Equipo Visitante</div>';
            html += (visitanteCompleto ? '<span class="check">✓ Completado</span>' : '<span class="action">Completar acta →</span>');
            html += '</button>';
            html += '</div>';
            html += '<div class="match-location">📍 ' + match.lugar + '</div>';
            html += '</div>';
            html += '</div>';
            return html;
        }).join('');
    }

    function selectTeamForMatch(matchId, team) {
        const matches = getMatches();
        const match = matches.find(m => m.id === matchId);
        
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
        
        document.getElementById('scoringForm').reset();
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
        
        document.getElementById('totalPuntos').textContent = total;
        return total;
    }

    async function submitEvaluation(e) {
        e.preventDefault();
        
        const requiredFields = ['entrenador', 'deportistas', 'arbitro', 'aficion'];
        let allSelected = true;
        
        requiredFields.forEach(function(field) {
            if (!document.querySelector('input[name="' + field + '"]:checked')) {
                allSelected = false;
            }
        });
        
        if (!allSelected) {
            alert('Por favor, completa todas las secciones de calificación.');
            return;
        }
        
        const evaluationData = {
            id: Date.now().toString(),
            matchId: currentMatch.id,
            equipo: currentTeam,
            nombreEquipo: currentTeam === 'local' ? currentMatch.equipoLocal : currentMatch.equipoVisitante,
            nombreContrario: currentTeam === 'local' ? currentMatch.equipoVisitante : currentMatch.equipoLocal,
            setsGanados: parseInt(document.getElementById('setsGanados').value),
            setsContrario: parseInt(document.getElementById('setsContrario').value),
            puntuaciones: {
                entrenador: parseInt(document.querySelector('input[name="entrenador"]:checked').value),
                deportistas: parseInt(document.querySelector('input[name="deportistas"]:checked').value),
                arbitro: parseInt(document.querySelector('input[name="arbitro"]:checked').value),
                aficion: parseInt(document.querySelector('input[name="aficion"]:checked').value)
            },
            totalPuntos: calculateTotal(),
            firma: document.getElementById('firma').value,
            fechaEnvio: new Date().toISOString()
        };
        
        // Guardar en localStorage
        const evaluations = getEvaluations();
        evaluations.push(evaluationData);
        localStorage.setItem('evaluations', JSON.stringify(evaluations));
        
        // Guardar en Firestore si está conectado
        if (useCloudStorage && firestoreService.isAuthenticated()) {
            try {
                showStatus('📤 Guardando evaluación en Firestore...', 'info');
                await firestoreService.guardarEvaluacion(evaluationData);
                showStatus('✓ Evaluación guardada en la nube', 'success');
            } catch (error) {
                console.error('Error guardando evaluación en la nube:', error);
                showStatus('⚠️ Evaluación guardada localmente (error en la nube)', 'warning');
            }
        }
        
        document.getElementById('submissionMessage').classList.remove('hidden');
        window.scrollTo({ top: 0, behavior: 'smooth' });
        
        setTimeout(() => {
            document.getElementById('submissionMessage').classList.add('hidden');
            showView('selectMatchView');
            loadAvailableMatches();
        }, 2000);
    }

    function getEvaluationsForMatch(matchId) {
        const evaluations = getEvaluations();
        return evaluations.filter(e => e.matchId === matchId);
    }

    function loadResults() {
        const matches = getMatches();
        const filterCategoria = document.getElementById('resultsFilterCategoria').value;
        const resultsList = document.getElementById('resultsList');
        
        let filteredMatches = matches;
        if (filterCategoria) {
            filteredMatches = matches.filter(m => m.categoria === filterCategoria);
        }
        
        const completedMatches = filteredMatches.filter(match => {
            const evaluaciones = getEvaluationsForMatch(match.id);
            return evaluaciones.length === 2;
        });
        
        if (completedMatches.length === 0) {
            resultsList.innerHTML = '<p class="no-data">No hay partidos completados todavía.</p>';
            return;
        }
        
        resultsList.innerHTML = completedMatches.map(function(match) {
            var evaluaciones = getEvaluationsForMatch(match.id);
            var evalLocal = evaluaciones.find(function(e) { return e.equipo === 'local'; });
            var evalVisitante = evaluaciones.find(function(e) { return e.equipo === 'visitante'; });
            var html = '';
            html += '<div class="result-card">';
            html += '<div class="result-header">';
            html += '<h3>' + match.categoria + ' ' + match.sexo + ' - Grupo ' + match.grupo + '</h3>';
            html += '<div class="result-date">' + formatDate(match.fecha) + ' - ' + match.hora + '</div>';
            html += '</div>';
            html += '<div class="result-body">';
            html += '<div class="result-teams">';
            html += '<div class="result-team">';
            html += '<div class="team-name">' + match.equipoLocal + '</div>';
            html += '<div class="team-score">' + evalLocal.setsGanados + '</div>';
            html += '<div class="team-points">Fair Play: ' + evalVisitante.totalPuntos + '/16</div>';
            html += '</div>';
            html += '<div class="result-vs">-</div>';
            html += '<div class="result-team">';
            html += '<div class="team-name">' + match.equipoVisitante + '</div>';
            html += '<div class="team-score">' + evalVisitante.setsGanados + '</div>';
            html += '<div class="team-points">Fair Play: ' + evalLocal.totalPuntos + '/16</div>';
            html += '</div>';
            html += '</div>';
            html += '<button onclick="viewDetailedResults(\'' + match.id + '\')" class="btn-primary btn-small">Ver Detalle</button>';
            html += '</div>';
            html += '</div>';
            return html;
        }).join('');
    }

    function viewDetailedResults(matchId) {
        const matches = getMatches();
        const match = matches.find(m => m.id === matchId);
        const evaluaciones = getEvaluationsForMatch(matchId);
        
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

    async function deleteMatch(matchId) {
        if (!confirm('¿Estás seguro de eliminar este partido? Esta acción no se puede deshacer.')) {
            return;
        }
        
        // Eliminar de localStorage
        let matches = getMatches();
        matches = matches.filter(m => m.id !== matchId);
        localStorage.setItem('matches', JSON.stringify(matches));
        
        let evaluations = getEvaluations();
        evaluations = evaluations.filter(e => e.matchId !== matchId);
        localStorage.setItem('evaluations', JSON.stringify(evaluations));
        
        // Eliminar de Firestore si está conectado
        if (useCloudStorage && firestoreService.isAuthenticated()) {
            try {
                showStatus('🗑️ Eliminando de Firestore...', 'info');
                await firestoreService.eliminarPartido(matchId);
                showStatus('✓ Partido eliminado de la nube', 'success');
            } catch (error) {
                console.error('Error eliminando de la nube:', error);
                showStatus('⚠️ Eliminado localmente (error en la nube)', 'warning');
            }
        }
        
        loadMatches();
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
})();