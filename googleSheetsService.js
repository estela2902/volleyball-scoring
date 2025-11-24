// Servicio para gestionar Google Sheets
class GoogleSheetsService {
    constructor() {
        this.isSignedIn = false;
        this.gapiInited = false;
        this.gisInited = false;
        this.tokenClient = null;
    }

    // Inicializar Google API
    async initGoogleAPI() {
        try {
            await this.loadGapiScript();
            await this.loadGisScript();
            this.gapiInitialize();
            this.gisInitialize();
        } catch (error) {
            console.error('Error inicializando Google API:', error);
            throw error;
        }
    }

    loadGapiScript() {
        return new Promise((resolve, reject) => {
            if (typeof gapi !== 'undefined') {
                resolve();
                return;
            }
            const script = document.createElement('script');
            script.src = 'https://apis.google.com/js/api.js';
            script.onload = resolve;
            script.onerror = reject;
            document.head.appendChild(script);
        });
    }

    loadGisScript() {
        return new Promise((resolve, reject) => {
            if (typeof google !== 'undefined' && google.accounts) {
                resolve();
                return;
            }
            const script = document.createElement('script');
            script.src = 'https://accounts.google.com/gsi/client';
            script.onload = resolve;
            script.onerror = reject;
            document.head.appendChild(script);
        });
    }

    gapiInitialize() {
        gapi.load('client', async () => {
            await gapi.client.init({
                apiKey: GOOGLE_CONFIG.API_KEY,
                discoveryDocs: DISCOVERY_DOCS,
            });
            this.gapiInited = true;
            this.checkInitialization();
        });
    }

    gisInitialize() {
        this.tokenClient = google.accounts.oauth2.initTokenClient({
            client_id: GOOGLE_CONFIG.CLIENT_ID,
            scope: GOOGLE_CONFIG.SCOPES,
            callback: '', // Se define después
        });
        this.gisInited = true;
        this.checkInitialization();
    }

    checkInitialization() {
        if (this.gapiInited && this.gisInited) {
            console.log('Google API inicializada correctamente');
        }
    }

    // Autenticación
    async authenticate() {
        return new Promise((resolve, reject) => {
            try {
                this.tokenClient.callback = async (response) => {
                    if (response.error !== undefined) {
                        reject(response);
                        return;
                    }
                    this.isSignedIn = true;
                    resolve(response);
                };

                if (gapi.client.getToken() === null) {
                    this.tokenClient.requestAccessToken({ prompt: 'consent' });
                } else {
                    this.tokenClient.requestAccessToken({ prompt: '' });
                }
            } catch (error) {
                reject(error);
            }
        });
    }

    // Cerrar sesión
    signOut() {
        const token = gapi.client.getToken();
        if (token !== null) {
            google.accounts.oauth2.revoke(token.access_token);
            gapi.client.setToken('');
            this.isSignedIn = false;
        }
    }

    // Verificar si está autenticado
    checkAuth() {
        return gapi.client.getToken() !== null;
    }

    // ========== MÉTODOS PARA PARTIDOS ==========

    async guardarPartido(matchData) {
        if (!this.checkAuth()) {
            await this.authenticate();
        }

        const values = [[
            matchData.id,
            matchData.modalidad,
            matchData.categoria,
            matchData.sexo,
            matchData.grupo,
            matchData.fecha,
            matchData.hora,
            matchData.lugar,
            matchData.equipoLocal,
            matchData.equipoVisitante,
            matchData.estado,
            matchData.fechaCreacion
        ]];

        try {
            const response = await gapi.client.sheets.spreadsheets.values.append({
                spreadsheetId: GOOGLE_CONFIG.SPREADSHEET_ID,
                range: `${GOOGLE_CONFIG.SHEETS.PARTIDOS}!A:L`,
                valueInputOption: 'USER_ENTERED',
                resource: { values }
            });

            console.log('Partido guardado:', response);
            return response.result;
        } catch (error) {
            console.error('Error guardando partido:', error);
            throw error;
        }
    }

    async obtenerPartidos() {
        if (!this.checkAuth()) {
            await this.authenticate();
        }

        try {
            const response = await gapi.client.sheets.spreadsheets.values.get({
                spreadsheetId: GOOGLE_CONFIG.SPREADSHEET_ID,
                range: `${GOOGLE_CONFIG.SHEETS.PARTIDOS}!A2:L`,
            });

            const rows = response.result.values || [];
            return rows.map(row => ({
                id: row[0],
                modalidad: row[1],
                categoria: row[2],
                sexo: row[3],
                grupo: row[4],
                fecha: row[5],
                hora: row[6],
                lugar: row[7],
                equipoLocal: row[8],
                equipoVisitante: row[9],
                estado: row[10],
                fechaCreacion: row[11]
            }));
        } catch (error) {
            console.error('Error obteniendo partidos:', error);
            throw error;
        }
    }

    async eliminarPartido(matchId) {
        if (!this.checkAuth()) {
            await this.authenticate();
        }

        try {
            // Primero encontrar la fila
            const response = await gapi.client.sheets.spreadsheets.values.get({
                spreadsheetId: GOOGLE_CONFIG.SPREADSHEET_ID,
                range: `${GOOGLE_CONFIG.SHEETS.PARTIDOS}!A:A`,
            });

            const rows = response.result.values || [];
            const rowIndex = rows.findIndex(row => row[0] === matchId);

            if (rowIndex === -1) {
                throw new Error('Partido no encontrado');
            }

            // Eliminar la fila (sumamos 1 porque las filas empiezan en 1, no en 0)
            const deleteRequest = {
                spreadsheetId: GOOGLE_CONFIG.SPREADSHEET_ID,
                resource: {
                    requests: [{
                        deleteDimension: {
                            range: {
                                sheetId: 0, // ID de la hoja "Partidos"
                                dimension: 'ROWS',
                                startIndex: rowIndex,
                                endIndex: rowIndex + 1
                            }
                        }
                    }]
                }
            };

            await gapi.client.sheets.spreadsheets.batchUpdate(deleteRequest);
            console.log('Partido eliminado');
        } catch (error) {
            console.error('Error eliminando partido:', error);
            throw error;
        }
    }

    // ========== MÉTODOS PARA EVALUACIONES ==========

    async guardarEvaluacion(evaluationData) {
        if (!this.checkAuth()) {
            await this.authenticate();
        }

        const values = [[
            evaluationData.id,
            evaluationData.matchId,
            evaluationData.equipo,
            evaluationData.nombreEquipo,
            evaluationData.nombreContrario,
            evaluationData.setsGanados,
            evaluationData.setsContrario,
            evaluationData.puntuaciones.entrenador,
            evaluationData.puntuaciones.deportistas,
            evaluationData.puntuaciones.arbitro,
            evaluationData.puntuaciones.aficion,
            evaluationData.totalPuntos,
            evaluationData.firma,
            evaluationData.fechaEnvio
        ]];

        try {
            const response = await gapi.client.sheets.spreadsheets.values.append({
                spreadsheetId: GOOGLE_CONFIG.SPREADSHEET_ID,
                range: `${GOOGLE_CONFIG.SHEETS.EVALUACIONES}!A:N`,
                valueInputOption: 'USER_ENTERED',
                resource: { values }
            });

            console.log('Evaluación guardada:', response);
            return response.result;
        } catch (error) {
            console.error('Error guardando evaluación:', error);
            throw error;
        }
    }

    async obtenerEvaluaciones() {
        if (!this.checkAuth()) {
            await this.authenticate();
        }

        try {
            const response = await gapi.client.sheets.spreadsheets.values.get({
                spreadsheetId: GOOGLE_CONFIG.SPREADSHEET_ID,
                range: `${GOOGLE_CONFIG.SHEETS.EVALUACIONES}!A2:N`,
            });

            const rows = response.result.values || [];
            return rows.map(row => ({
                id: row[0],
                matchId: row[1],
                equipo: row[2],
                nombreEquipo: row[3],
                nombreContrario: row[4],
                setsGanados: parseInt(row[5]) || 0,
                setsContrario: parseInt(row[6]) || 0,
                puntuaciones: {
                    entrenador: parseInt(row[7]) || 0,
                    deportistas: parseInt(row[8]) || 0,
                    arbitro: parseInt(row[9]) || 0,
                    aficion: parseInt(row[10]) || 0
                },
                totalPuntos: parseInt(row[11]) || 0,
                firma: row[12],
                fechaEnvio: row[13]
            }));
        } catch (error) {
            console.error('Error obteniendo evaluaciones:', error);
            throw error;
        }
    }

    async obtenerEvaluacionesPorPartido(matchId) {
        const evaluaciones = await this.obtenerEvaluaciones();
        return evaluaciones.filter(e => e.matchId === matchId);
    }

    // ========== MÉTODOS DE SINCRONIZACIÓN ==========

    async sincronizarConLocalStorage() {
        try {
            // Sincronizar partidos
            const partidosLocal = JSON.parse(localStorage.getItem('matches') || '[]');
            const partidosNube = await this.obtenerPartidos();

            // Obtener IDs de la nube
            const idsNube = new Set(partidosNube.map(p => p.id));

            // Subir partidos locales que no están en la nube
            for (const partido of partidosLocal) {
                if (!idsNube.has(partido.id)) {
                    await this.guardarPartido(partido);
                }
            }

            // Sincronizar evaluaciones
            const evaluacionesLocal = JSON.parse(localStorage.getItem('evaluations') || '[]');
            const evaluacionesNube = await this.obtenerEvaluaciones();

            const idsEvaluacionesNube = new Set(evaluacionesNube.map(e => e.id));

            for (const evaluacion of evaluacionesLocal) {
                if (!idsEvaluacionesNube.has(evaluacion.id)) {
                    await this.guardarEvaluacion(evaluacion);
                }
            }

            console.log('Sincronización completada');
            return { success: true };
        } catch (error) {
            console.error('Error en sincronización:', error);
            throw error;
        }
    }

    async cargarDesdeLaNube() {
        try {
            const partidos = await this.obtenerPartidos();
            const evaluaciones = await this.obtenerEvaluaciones();

            localStorage.setItem('matches', JSON.stringify(partidos));
            localStorage.setItem('evaluations', JSON.stringify(evaluaciones));

            console.log('Datos cargados desde la nube');
            return { partidos, evaluaciones };
        } catch (error) {
            console.error('Error cargando desde la nube:', error);
            throw error;
        }
    }

    // ========== MÉTODO PARA INICIALIZAR HOJA ==========

    async inicializarHoja() {
        if (!this.checkAuth()) {
            await this.authenticate();
        }

        try {
            // Crear cabeceras para la hoja de Partidos
            const headerPartidos = [[
                'ID', 'Modalidad', 'Categoría', 'Sexo', 'Grupo', 
                'Fecha', 'Hora', 'Lugar', 'Equipo Local', 
                'Equipo Visitante', 'Estado', 'Fecha Creación'
            ]];

            await gapi.client.sheets.spreadsheets.values.update({
                spreadsheetId: GOOGLE_CONFIG.SPREADSHEET_ID,
                range: `${GOOGLE_CONFIG.SHEETS.PARTIDOS}!A1:L1`,
                valueInputOption: 'USER_ENTERED',
                resource: { values: headerPartidos }
            });

            // Crear cabeceras para la hoja de Evaluaciones
            const headerEvaluaciones = [[
                'ID', 'Match ID', 'Equipo', 'Nombre Equipo', 'Nombre Contrario',
                'Sets Ganados', 'Sets Contrario', 'Puntos Entrenador', 
                'Puntos Deportistas', 'Puntos Árbitro', 'Puntos Afición',
                'Total Puntos', 'Firma', 'Fecha Envío'
            ]];

            await gapi.client.sheets.spreadsheets.values.update({
                spreadsheetId: GOOGLE_CONFIG.SPREADSHEET_ID,
                range: `${GOOGLE_CONFIG.SHEETS.EVALUACIONES}!A1:N1`,
                valueInputOption: 'USER_ENTERED',
                resource: { values: headerEvaluaciones }
            });

            console.log('Hoja inicializada correctamente');
        } catch (error) {
            console.error('Error inicializando hoja:', error);
            throw error;
        }
    }
}

// Instancia global del servicio
const sheetsService = new GoogleSheetsService();
