// Configuración de Firebase/Firestore
const FIREBASE_CONFIG = {
    apiKey: "AIzaSyCkfBnPkJ0p51ZQvmQ64seoFj-wqc78N10",
    authDomain: "volleyball-scoring-479222.firebaseapp.com",
    projectId: "volleyball-scoring-479222",
    storageBucket: "volleyball-scoring-479222.appspot.com",
    messagingSenderId: "432486262992",
    appId: "1:432486262992:web:8e9ae38f6dab5ac9a4d6d5"
};

// Inicializar Firebase solo si no está inicializado
if (!firebase.apps || !firebase.apps.length) {
    firebase.initializeApp(FIREBASE_CONFIG);
}
