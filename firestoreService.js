// Servicio para gestionar Firestore
class FirestoreService {
    constructor() {
        this.db = null;
        this.auth = null;
        this.initialized = false;
    }

    // Inicializar Firebase
    async initialize() {
        try {
            // Importar Firebase desde CDN
            const { initializeApp } = await import('https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js');
            const { getFirestore, collection, addDoc, getDocs, doc, updateDoc, deleteDoc, query, where, orderBy } = await import('https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js');
            const { getAuth, signInWithPopup, GoogleAuthProvider, signOut } = await import('https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js');

            // Inicializar Firebase
            const app = initializeApp(FIREBASE_CONFIG);
            this.db = getFirestore(app);
            this.auth = getAuth(app);
            
            // Guardar referencias a las funciones de Firestore
            this.collection = collection;
            this.addDoc = addDoc;
            this.getDocs = getDocs;
            this.doc = doc;
            this.updateDoc = updateDoc;
            this.deleteDoc = deleteDoc;
            this.query = query;
            this.where = where;
            this.orderBy = orderBy;
            this.GoogleAuthProvider = GoogleAuthProvider;
            this.signInWithPopup = signInWithPopup;
            this.signOut = signOut;

            this.initialized = true;
            console.log('Firebase inicializado correctamente');
            return true;
        } catch (error) {
            console.error('Error inicializando Firebase:', error);
            throw error;
        }
    }

    // Autenticación con Google
    async authenticate() {
        if (!this.initialized) {
            await this.initialize();
        }

        try {
            const provider = new this.GoogleAuthProvider();
            const result = await this.signInWithPopup(this.auth, provider);
            console.log('Usuario autenticado:', result.user.email);
            return result.user;
        } catch (error) {
            console.error('Error en autenticación:', error);
            throw error;
        }
    }

    // Cerrar sesión
    async signOutUser() {
        try {
            await this.signOut(this.auth);
            console.log('Sesión cerrada');
        } catch (error) {
            console.error('Error cerrando sesión:', error);
            throw error;
        }
    }

    // Verificar si está autenticado
    isAuthenticated() {
        return this.auth && this.auth.currentUser !== null;
    }

    // ========== MÉTODOS PARA PARTIDOS ==========

    async guardarPartido(matchData) {
        if (!this.initialized) {
            await this.initialize();
        }

        try {
            const partidosRef = this.collection(this.db, 'partidos');
            const docRef = await this.addDoc(partidosRef, matchData);
            console.log('Partido guardado con ID:', docRef.id);
            return { ...matchData, firestoreId: docRef.id };
        } catch (error) {
            console.error('Error guardando partido:', error);
            throw error;
        }
    }

    async obtenerPartidos() {
        if (!this.initialized) {
            await this.initialize();
        }

        try {
            const partidosRef = this.collection(this.db, 'partidos');
            const q = this.query(partidosRef, this.orderBy('fechaCreacion', 'desc'));
            const querySnapshot = await this.getDocs(q);
            
            const partidos = [];
            querySnapshot.forEach((doc) => {
                partidos.push({
                    firestoreId: doc.id,
                    ...doc.data()
                });
            });
            
            console.log('Partidos obtenidos:', partidos.length);
            return partidos;
        } catch (error) {
            console.error('Error obteniendo partidos:', error);
            throw error;
        }
    }

    async eliminarPartido(firestoreId) {
        if (!this.initialized) {
            await this.initialize();
        }

        try {
            const partidoRef = this.doc(this.db, 'partidos', firestoreId);
            await this.deleteDoc(partidoRef);
            console.log('Partido eliminado:', firestoreId);
        } catch (error) {
            console.error('Error eliminando partido:', error);
            throw error;
        }
    }

    // ========== MÉTODOS PARA EVALUACIONES ==========

    async guardarEvaluacion(evaluationData) {
        if (!this.initialized) {
            await this.initialize();
        }

        try {
            const evaluacionesRef = this.collection(this.db, 'evaluaciones');
            const docRef = await this.addDoc(evaluacionesRef, evaluationData);
            console.log('Evaluación guardada con ID:', docRef.id);
            return { ...evaluationData, firestoreId: docRef.id };
        } catch (error) {
            console.error('Error guardando evaluación:', error);
            throw error;
        }
    }

    async obtenerEvaluaciones() {
        if (!this.initialized) {
            await this.initialize();
        }

        try {
            const evaluacionesRef = this.collection(this.db, 'evaluaciones');
            const q = this.query(evaluacionesRef, this.orderBy('fechaEnvio', 'desc'));
            const querySnapshot = await this.getDocs(q);
            
            const evaluaciones = [];
            querySnapshot.forEach((doc) => {
                evaluaciones.push({
                    firestoreId: doc.id,
                    ...doc.data()
                });
            });
            
            console.log('Evaluaciones obtenidas:', evaluaciones.length);
            return evaluaciones;
        } catch (error) {
            console.error('Error obteniendo evaluaciones:', error);
            throw error;
        }
    }

    async obtenerEvaluacionesPorPartido(matchId) {
        if (!this.initialized) {
            await this.initialize();
        }

        try {
            const evaluacionesRef = this.collection(this.db, 'evaluaciones');
            const q = this.query(evaluacionesRef, this.where('matchId', '==', matchId));
            const querySnapshot = await this.getDocs(q);
            
            const evaluaciones = [];
            querySnapshot.forEach((doc) => {
                evaluaciones.push({
                    firestoreId: doc.id,
                    ...doc.data()
                });
            });
            
            return evaluaciones;
        } catch (error) {
            console.error('Error obteniendo evaluaciones por partido:', error);
            throw error;
        }
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

            console.log('Datos cargados desde Firestore');
            return { partidos, evaluaciones };
        } catch (error) {
            console.error('Error cargando desde Firestore:', error);
            throw error;
        }
    }
}

// Instancia global del servicio
const firestoreService = new FirestoreService();
