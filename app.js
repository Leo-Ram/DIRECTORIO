// 1. CONFIGURACIÓN DE SUPABASE (Reemplaza con tus datos reales)
const SUPABASE_URL = "https://iusgakwcwawlqmawsxgs.supabase.co"; 
const SUPABASE_ANON_KEY = "sb_publishable_oh9iqc2Wxc0lAOK7_D5_Lg_U_WV8p5-";

// Inicializar el cliente de Supabase
const supabaseClient = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// 2. REFERENCIAS A ELEMENTOS DEL HTML
const loginSection = document.getElementById('login-section');
const directorySection = document.getElementById('directory-section');
const loginForm = document.getElementById('login-form');
const emailInput = document.getElementById('email');
const passwordInput = document.getElementById('password');
const loginError = document.getElementById('login-error');
const logoutBtn = document.getElementById('logout-btn');
const directoryBody = document.getElementById('directory-body');
const searchInput = document.getElementById('search-input');

// Variable global para almacenar los contactos en memoria y poder filtrarlos rápido
let listaContactos = [];

// 3. EVENTO: INICIAR SESIÓN
loginForm.addEventListener('submit', async (e) => {
    e.preventDefault(); // Evitar que la página se recargue
    loginError.textContent = ""; // Limpiar errores anteriores
    
    const email = emailInput.value.trim();
    const password = passwordInput.value;

    // Intentar iniciar sesión en Supabase
    const { data, error } = await supabaseClient.auth.signInWithPassword({
        email: email,
        password: password
    });

    if (error) {
        loginError.textContent = "Credenciales incorrectas. Inténtalo de nuevo.";
        console.error("Error de autenticación:", error.message);
    } else {
        // Login exitoso
        console.log("Sesión iniciada:", data.user);
        verificarSesion(); // Cambiar de pantalla y cargar datos
    }
});

// 4. EVENTO: CERRAR SESIÓN
logoutBtn.addEventListener('click', async () => {
    await supabaseClient.auth.signOut();
    verificarSesion();
});

// 5. FUNCIÓN: VERIFICAR EL ESTADO DE LA SESIÓN
async function verificarSesion() {
    // Obtener el usuario actual logueado
    const { data: { user } } = await supabaseClient.auth.getUser();

    if (user) {
        // Si hay usuario, mostrar directorio y ocultar login
        loginSection.classList.add('hidden');
        directorySection.classList.remove('hidden');
        
        // Solo cargar datos desde Supabase si la lista interna está vacía
        if (listaContactos.length === 0) {
            cargarContactos();
        }
    } else {
        // Si no hay usuario, mostrar login y ocultar directorio
        loginSection.classList.remove('hidden');
        directorySection.classList.add('hidden');
        directoryBody.innerHTML = "";
        listaContactos = []; // Limpiar memoria
    }
}

// 6. FUNCIÓN: CONSULTAR LOS DATOS DE SUPABASE
async function cargarContactos() {
    directoryBody.innerHTML = '<tr><td colspan="5" style="text-align:center;">Cargando contactos...</td></tr>';

    const { data, error } = await supabaseClient
        .from('dir1') 
        .select('*')
        .order('NOMBRES', { ascending: true }); // 👈 Cambiado a MAYÚSCULAS

    if (error) {
        directoryBody.innerHTML = '<tr><td colspan="5" style="text-align:center; color:red;">Error al cargar datos.</td></tr>';
        console.error("Error al consultar la tabla:", error.message);
        return;
    }

    listaContactos = data; 
    dibujarTabla(listaContactos); 
}

// 7. FUNCIÓN: DIBUJAR LAS FILAS EN LA TABLA
function dibujarTabla(contactos) {
    directoryBody.innerHTML = "";

    if (contactos.length === 0) {
        directoryBody.innerHTML = '<tr><td colspan="5" style="text-align:center;">No se encontraron resultados.</td></tr>';
        return;
    }

    contactos.forEach(contacto => {
        const fila = document.createElement('tr');
        
        // Usamos corchetes para "LUGAR DE TRABAJO" porque tiene espacios internos
        fila.innerHTML = `
            <td>${contacto["NOMBRES"] || ''}</td>
            <td>${contacto["APELLIDOS"] || ''}</td>
            <td>${contacto["CARGO"] || ''}</td>
            <td>${contacto["LUGAR DE TRABAJO"] || ''}</td>
            <td><a href="tel:${contacto["CELULAR"]}">${contacto["CELULAR"] || ''}</a></td>
        `;
        directoryBody.appendChild(fila);
    });
}

// 8. BUSCADOR EN TIEMPO REAL
searchInput.addEventListener('input', (e) => {
    const textoBuscado = e.target.value.toLowerCase().trim();

    const contactosFiltrados = listaContactos.filter(contacto => {
        const nombres = (contacto["NOMBRES"] || "").toLowerCase();
        const apellidos = (contacto["APELLIDOS"] || "").toLowerCase();
        const cargo = (contacto["CARGO"] || "").toLowerCase();
        const lugar = (contacto["LUGAR DE TRABAJO"] || "").toLowerCase();

        return nombres.includes(textoBuscado) || 
               apellidos.includes(textoBuscado) || 
               cargo.includes(textoBuscado) || 
               lugar.includes(textoBuscado);
    });

    dibujarTabla(contactosFiltrados);
});

// Executar verificación de sesión nada más abrir o recargar la página web
verificarSesion();