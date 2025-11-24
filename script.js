// Sistema de gestión de partidos y evaluaciones
let currentMatch = null;
let currentTeam = null;
let useCloudStorage = false;

// Inicialización
document.addEventListener('DOMContentLoaded', async () => {
    showView('adminView');
    
    // Inicializar Google Sheets API
    try {
        await sheetsService.initGoogleAPI();
        updateSyncUI();
    } catch (error) {
        console.error('Error inicializando Google API:', error);
        showStatus('⚠️ Modo offline - Sin conexión a Google Sheets', 'warning');
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
    
    // Event listeners para Google Sheets
    document.getElementById('btnGoogleAuth').addEventListener('click', authenticateGoogle);
    document.getElementById('btnSync').addEventListener('click', syncWithCloud);
    document.getElementById('btnSignOut').addEventListener('click', signOutGoogle);
    
    // Event listeners para formularios
    document.getElementById('showMatchFormBtn').addEventListener('click', showMatchForm);
    document.getElementById('cancelMatchBtn').addEventListener('click', hideMatchForm);
    document.getElementById('createMatchForm').addEventListener('submit', createMatch);
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
});

// ========== FUNCIONES DE GOOGLE SHEETS ==========

async function authenticateGoogle() {
    try {
        showStatus('🔄 Conectando con Google...', 'info');
        await sheetsService.authenticate();
        useCloudStorage = true;
        updateSyncUI();
        showStatus('✓ Conectado con Google Sheets', 'success');
        
        // Preguntar si quiere inicializar la hoja
        if (confirm('¿Es la primera vez que usas esta aplicación? ¿Quieres inicializar las cabeceras de la hoja de Google Sheets?')) {
            await sheetsService.inicializarHoja();
            showStatus('✓ Hoja inicializada correctamente', 'success');
        }
        
        // Preguntar si quiere cargar datos desde la nube
        if (confirm('¿Quieres cargar los datos existentes desde Google Sheets?')) {
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
        await sheetsService.sincronizarConLocalStorage();
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
        await sheetsService.cargarDesdeLaNube();
        loadMatches();
        loadAvailableMatches();
        loadResults();
        showStatus('✓ Datos cargados desde la nube', 'success');
    } catch (error) {
        console.error('Error cargando desde la nube:', error);
        showStatus('❌ Error cargando datos', 'error');
    }
}

function signOutGoogle() {
    sheetsService.signOut();
    useCloudStorage = false;
    updateSyncUI();
    showStatus('Sesión cerrada', 'info');
}

function updateSyncUI() {
    const isAuth = sheetsService.checkAuth();
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
    statusElement.className = `sync-status ${type}`;
    
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
    
    // Guardar en Google Sheets si está conectado
    if (useCloudStorage && sheetsService.checkAuth()) {
        try {
            showStatus('📤 Guardando en Google Sheets...', 'info');
            await sheetsService.guardarPartido(matchData);
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
        
        return `
            <div class="match-card">
                <div class="match-header">
                    <div class="match-title">
                        <strong>${match.categoria} ${match.sexo} - Grupo ${match.grupo}</strong>
                        ${estadoBadge}
                    </div>
                    <div class="match-date">${formatDate(match.fecha)} - ${match.hora}</div>
                </div>
                <div class="match-body">
                    <div class="match-teams">
                        <div class="team">${match.equipoLocal} ${localCompleto ? '✓' : ''}</div>
                        <span class="vs">vs</span>
                        <div class="team">${match.equipoVisitante} ${visitanteCompleto ? '✓' : ''}</div>
                    </div>
                    <div class="match-location">📍 ${match.lugar}</div>
                </div>
                <div class="match-actions">
                    <button onclick="deleteMatch('${match.id}')" class="btn-danger btn-small">Eliminar</button>
                    ${(localCompleto && visitanteCompleto) ? `<button onclick="viewMatchResults('${match.id}')" class="btn-primary btn-small">Ver Resultados</button>` : ''}
                </div>
            </div>
        `;
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
        
        return `
            <div class="match-card selectable">
                <div class="match-header">
                    <div class="match-title"><strong>${match.categoria} ${match.sexo} - Grupo ${match.grupo}</strong></div>
                    <div class="match-date">${formatDate(match.fecha)} - ${match.hora}</div>
                </div>
                <div class="match-body">
                    <div class="match-teams-selection">
                        <button onclick="selectTeamForMatch('${match.id}', 'local')" 
                                class="team-button ${localCompleto ? 'completed' : ''}"
                                ${localCompleto ? 'disabled' : ''}>
                            <div class="team-name">${match.equipoLocal}</div>
                            <div class="team-label">Equipo Local</div>
                            ${localCompleto ? '<span class="check">✓ Completado</span>' : '<span class="action">Completar acta →</span>'}
                        </button>
                        <button onclick="selectTeamForMatch('${match.id}', 'visitante')" 
                                class="team-button ${visitanteCompleto ? 'completed' : ''}"
                                ${visitanteCompleto ? 'disabled' : ''}>
                            <div class="team-name">${match.equipoVisitante}</div>
                            <div class="team-label">Equipo Visitante</div>
                            ${visitanteCompleto ? '<span class="check">✓ Completado</span>' : '<span class="action">Completar acta →</span>'}
                        </button>
                    </div>
                    <div class="match-location">📍 ${match.lugar}</div>
                </div>
            </div>
        `;
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
        const confirmar = confirm(
            `⚠️ ATENCIÓN: El plazo límite era ${formatDateTime(deadline)}.\n` +
            `Esta acta se está completando fuera de plazo.\n\n` +
            `¿Deseas continuar de todos modos?`
        );
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
    matchInfo.innerHTML = `
        <div class="match-info-card">
            <h3>Información del Partido</h3>
            <div class="info-grid">
                <div class="info-item">
                    <span class="info-label">Categoría:</span>
                    <span class="info-value">${currentMatch.categoria} ${currentMatch.sexo} - Grupo ${currentMatch.grupo}</span>
                </div>
                <div class="info-item">
                    <span class="info-label">Fecha:</span>
                    <span class="info-value">${formatDate(currentMatch.fecha)} - ${currentMatch.hora}</span>
                </div>
                <div class="info-item">
                    <span class="info-label">Lugar:</span>
                    <span class="info-value">${currentMatch.lugar}</span>
                </div>
            </div>
        </div>
    `;
    
    document.getElementById('scoringForm').reset();
    calculateTotal();
}

function calculateTotal() {
    const categories = ['entrenador', 'deportistas', 'arbitro', 'aficion'];
    let total = 0;
    
    categories.forEach(category => {
        const selected = document.querySelector(`input[name="${category}"]:checked`);
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
    
    requiredFields.forEach(field => {
        if (!document.querySelector(`input[name="${field}"]:checked`)) {
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
    
    // Guardar en Google Sheets si está conectado
    if (useCloudStorage && sheetsService.checkAuth()) {
        try {
            showStatus('📤 Guardando evaluación en Google Sheets...', 'info');
            await sheetsService.guardarEvaluacion(evaluationData);
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
    
    resultsList.innerHTML = completedMatches.map(match => {
        const evaluaciones = getEvaluationsForMatch(match.id);
        const evalLocal = evaluaciones.find(e => e.equipo === 'local');
        const evalVisitante = evaluaciones.find(e => e.equipo === 'visitante');
        
        return `
            <div class="result-card">
                <div class="result-header">
                    <h3>${match.categoria} ${match.sexo} - Grupo ${match.grupo}</h3>
                    <div class="result-date">${formatDate(match.fecha)} - ${match.hora}</div>
                </div>
                <div class="result-body">
                    <div class="result-teams">
                        <div class="result-team">
                            <div class="team-name">${match.equipoLocal}</div>
                            <div class="team-score">${evalLocal.setsGanados}</div>
                            <div class="team-points">Fair Play: ${evalVisitante.totalPuntos}/16</div>
                        </div>
                        <div class="result-vs">-</div>
                        <div class="result-team">
                            <div class="team-name">${match.equipoVisitante}</div>
                            <div class="team-score">${evalVisitante.setsGanados}</div>
                            <div class="team-points">Fair Play: ${evalLocal.totalPuntos}/16</div>
                        </div>
                    </div>
                    <button onclick="viewDetailedResults('${match.id}')" class="btn-primary btn-small">Ver Detalle</button>
                </div>
            </div>
        `;
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
    
    const detailHtml = `
        <div class="detailed-results">
            <h2>Resultados Detallados</h2>
            <h3>${match.categoria} ${match.sexo} - Grupo ${match.grupo}</h3>
            <p>${formatDate(match.fecha)} - ${match.hora} | ${match.lugar}</p>
            
            <div class="detailed-grid">
                <div class="detailed-team">
                    <h4>${match.equipoLocal}</h4>
                    <p><strong>Sets ganados:</strong> ${evalLocal.setsGanados}</p>
                    <p><strong>Evaluado por:</strong> ${match.equipoVisitante}</p>
                    <p><strong>Puntos Fair Play:</strong> ${evalVisitante.totalPuntos}/16</p>
                    <ul>
                        <li>Entrenador: ${evalVisitante.puntuaciones.entrenador}/4</li>
                        <li>Deportistas: ${evalVisitante.puntuaciones.deportistas}/4</li>
                        <li>Árbitro: ${evalVisitante.puntuaciones.arbitro}/4</li>
                        <li>Afición: ${evalVisitante.puntuaciones.aficion}/4</li>
                    </ul>
                    <p><strong>Firma:</strong> ${evalLocal.firma}</p>
                </div>
                
                <div class="detailed-team">
                    <h4>${match.equipoVisitante}</h4>
                    <p><strong>Sets ganados:</strong> ${evalVisitante.setsGanados}</p>
                    <p><strong>Evaluado por:</strong> ${match.equipoLocal}</p>
                    <p><strong>Puntos Fair Play:</strong> ${evalLocal.totalPuntos}/16</p>
                    <ul>
                        <li>Entrenador: ${evalLocal.puntuaciones.entrenador}/4</li>
                        <li>Deportistas: ${evalLocal.puntuaciones.deportistas}/4</li>
                        <li>Árbitro: ${evalLocal.puntuaciones.arbitro}/4</li>
                        <li>Afición: ${evalLocal.puntuaciones.aficion}/4</li>
                    </ul>
                    <p><strong>Firma:</strong> ${evalVisitante.firma}</p>
                </div>
            </div>
            
            <button onclick="closeDetailedResults()" class="btn-secondary">Cerrar</button>
        </div>
    `;
    
    const modal = document.createElement('div');
    modal.className = 'modal';
    modal.innerHTML = detailHtml;
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
    
    // Eliminar de Google Sheets si está conectado
    if (useCloudStorage && sheetsService.checkAuth()) {
        try {
            showStatus('🗑️ Eliminando de Google Sheets...', 'info');
            await sheetsService.eliminarPartido(matchId);
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
