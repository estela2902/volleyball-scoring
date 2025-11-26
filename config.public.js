// Configuración de Google Sheets API para Producción
const GOOGLE_CONFIG = {
    // Credenciales públicas de Google Cloud
    API_KEY: 'AIzaSyDUOPWDNgO2itGiAjwfyHm-97bg4quUivI',
    CLIENT_ID: '432486262992-j1pne1baug2o8tq45bdrbst0bfi7qhra.apps.googleusercontent.com',
    SPREADSHEET_ID: '1NnLODgXsOcRKzbarO1_dZROZ0K1iGYC7WBWLMrCxZf0',

    // Scopes necesarios para Google Sheets
    SCOPES: 'https://www.googleapis.com/auth/spreadsheets',
    
    // IDs de las hojas
    SHEETS: {
        PARTIDOS: 'Partidos',
        EVALUACIONES: 'Evaluaciones',
        RESULTADOS: 'Resultados'
    }
};

// Discovery docs
const DISCOVERY_DOCS = ['https://sheets.googleapis.com/$discovery/rest?version=v4'];
