// EJEMPLO DE CONFIGURACIÓN
// Copia este archivo como "config.js" y completa con tus credenciales de Google

const GOOGLE_CONFIG = {
    // API Key de Google Cloud Console
    API_KEY: 'TU_API_KEY_AQUI',
    
    // Client ID de OAuth 2.0
    CLIENT_ID: 'TU_CLIENT_ID_AQUI.apps.googleusercontent.com',
    
    // ID de tu hoja de Google Sheets (de la URL)
    SPREADSHEET_ID: 'TU_SPREADSHEET_ID_AQUI',
    
    // Scopes necesarios para Google Sheets
    SCOPES: 'https://www.googleapis.com/auth/spreadsheets',
    
    // Nombres de las hojas en tu spreadsheet
    SHEETS: {
        PARTIDOS: 'Partidos',
        EVALUACIONES: 'Evaluaciones',
        RESULTADOS: 'Resultados'
    }
};

// Discovery docs para Google Sheets API v4
const DISCOVERY_DOCS = ['https://sheets.googleapis.com/$discovery/rest?version=v4'];
