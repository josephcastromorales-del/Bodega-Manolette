    // firebase-config.js
    import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
    import { getFirestore, collection } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";
    // Si más adelante usas Analytics, descomenta la siguiente línea y la inicialización
    // import { getAnalytics } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-analytics.js";

    // Tu configuración de Firebase REAL
    const firebaseConfig = {
      apiKey: "AIzaSyAE5pMe0loRrtKbKirQlG9H1rSBaoF4viQ",
      authDomain: "sistemaempresa-8b933.firebaseapp.com",
      projectId: "sistemaempresa-8b933",
      storageBucket: "sistemaempresa-8b933.firebasestorage.app",
      messagingSenderId: "992528113878",
      appId: "1:992528113878:web:324dc4f0ed9d49fcad6977",
      measurementId: "G-5RWR0JW8Y4" // Tu ID de Google Analytics
    };

    // Inicializar Firebase
    const app = initializeApp(firebaseConfig);
    const db = getFirestore(app);
    // Si necesitas Analytics, inicialízalo aquí:
    // const analytics = getAnalytics(app);

    // Referencias a tus colecciones en Firestore
    const productosRef = collection(db, "productos");
    const historialRef = collection(db, "historial");

    export { db, productosRef, historialRef };
