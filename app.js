// 1. CONFIGURACIÓN DE SUPABASE
const SUPABASE_URL = "https://iusgakwcwawlqmawsxgs.supabase.co"; 
const SUPABASE_ANON_KEY = "sb_publishable_oh9iqc2Wxc0lAOK7_D5_Lg_U_WV8p5-";

const supabaseClient = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// 2. REFERENCIAS
const loginSection      = document.getElementById('login-section');
const directorySection  = document.getElementById('directory-section');
const loginForm         = document.getElementById('login-form');
const emailInput        = document.getElementById('email');
const passwordInput     = document.getElementById('password');
const loginError        = document.getElementById('login-error');
const loginBtn          = document.getElementById('login-btn');
const logoutBtn         = document.getElementById('logout-btn');
const directoryBody     = document.getElementById('directory-body');
const searchInput       = document.getElementById('search-input');
const contactsCount     = document.getElementById('contacts-count');
const toast             = document.getElementById('toast');

let listaContactos = [];

// 3. LOGIN
loginForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    loginError.textContent = "";
    loginBtn.textContent = "Ingresando…";
    loginBtn.disabled = true;

    const email    = emailInput.value.trim();
    const password = passwordInput.value;

    const { data, error } = await supabaseClient.auth.signInWithPassword({ email, password });

    if (error) {
        loginError.textContent = "Credenciales incorrectas. Inténtalo de nuevo.";
        loginBtn.textContent = "Iniciar sesión";
        loginBtn.disabled = false;
    } else {
        verificarSesion();
    }
});

// 4. LOGOUT
logoutBtn.addEventListener('click', async () => {
    await supabaseClient.auth.signOut();
    listaContactos = [];
    verificarSesion();
});

// 5. VERIFICAR SESIÓN
async function verificarSesion() {
    const { data: { user } } = await supabaseClient.auth.getUser();

    if (user) {
        loginSection.classList.add('hidden');
        directorySection.classList.remove('hidden');
        if (listaContactos.length === 0) cargarContactos();
    } else {
        loginSection.classList.remove('hidden');
        directorySection.classList.add('hidden');
        directoryBody.innerHTML = "";
        listaContactos = [];
        loginBtn.textContent = "Iniciar sesión";
        loginBtn.disabled = false;
    }
}

// 6. CARGAR CONTACTOS
async function cargarContactos() {
    mostrarSkeletons();

    const { data, error } = await supabaseClient
        .from('dir1')
        .select('*')
        .order('NOMBRES', { ascending: true });

    if (error) {
        directoryBody.innerHTML = `
            <div class="empty-state">
                <svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
                <p>Error al cargar los contactos.<br>Intenta recargar la página.</p>
            </div>`;
        return;
    }

    listaContactos = data;
    actualizarConteo(listaContactos.length, listaContactos.length);
    dibujarCards(listaContactos);
}

// 7. DIBUJAR CARDS
function dibujarCards(contactos) {
    directoryBody.innerHTML = "";

    if (contactos.length === 0) {
        directoryBody.innerHTML = `
            <div class="empty-state">
                <svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
                <p>Sin resultados para esa búsqueda.</p>
            </div>`;
        return;
    }

    contactos.forEach(c => {
        const nombre    = c["NOMBRES"]        || '';
        const apellido  = c["APELLIDOS"]      || '';
        const cargo     = c["CARGO"]          || '';
        const lugar     = c["LUGAR DE TRABAJO"] || '';
        const celular   = c["CELULAR"]        || '';

        const nombreCompleto = `${nombre} ${apellido}`.trim();
        const iniciales = obtenerIniciales(nombre, apellido);
        const celularLimpio = celular.toString().replace(/\D/g, '');

        const card = document.createElement('div');
        card.className = 'contact-card';
        card.innerHTML = `
            <div class="contact-info">
                <div class="contact-avatar">${iniciales}</div>
                <div class="contact-details">
                    <div class="contact-name">${nombreCompleto}</div>
                    ${cargo  ? `<div class="contact-cargo">${cargo}</div>` : ''}
                    ${lugar  ? `<div class="contact-lugar">
                        <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/></svg>
                        ${lugar}
                    </div>` : ''}
                </div>
            </div>

            ${celular ? `<div class="contact-number">
                <svg xmlns="http://www.w3.org/2000/svg" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07A19.5 19.5 0 0 1 4.69 12 19.79 19.79 0 0 1 1.59 3.41 2 2 0 0 1 3.56 1.26h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L7.91 8.7a16 16 0 0 0 6 6l.89-.89a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 21.73 16z"/></svg>
                ${celular}
            </div>

            <div class="contact-actions">
                <a href="tel:${celularLimpio}" class="btn-action btn-call">
                    <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07A19.5 19.5 0 0 1 4.69 12 19.79 19.79 0 0 1 1.59 3.41 2 2 0 0 1 3.56 1.26h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L7.91 8.7a16 16 0 0 0 6 6l.89-.89a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 21.73 16z"/></svg>
                    Llamar
                </a>
                <a href="https://wa.me/${celularLimpio}" target="_blank" rel="noopener" class="btn-action btn-whatsapp">
                    <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347z"/><path d="M12 0C5.373 0 0 5.373 0 12c0 2.123.554 4.118 1.523 5.854L0 24l6.29-1.498A11.945 11.945 0 0 0 12 24c6.627 0 12-5.373 12-12S18.627 0 12 0zm0 21.818a9.818 9.818 0 0 1-5.007-1.369l-.36-.213-3.732.888.934-3.617-.235-.373A9.818 9.818 0 1 1 12 21.818z"/></svg>
                    WhatsApp
                </a>
                <button class="btn-action btn-copy" data-number="${celular}" onclick="copiarNumero(this)">
                    <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>
                    Copiar
                </button>
            </div>` : ''}
        `;
        directoryBody.appendChild(card);
    });
}

// 8. BUSCADOR
searchInput.addEventListener('input', (e) => {
    const q = e.target.value.toLowerCase().trim();
    const filtrados = listaContactos.filter(c =>
        (c["NOMBRES"]         || "").toLowerCase().includes(q) ||
        (c["APELLIDOS"]       || "").toLowerCase().includes(q) ||
        (c["CARGO"]           || "").toLowerCase().includes(q) ||
        (c["LUGAR DE TRABAJO"]|| "").toLowerCase().includes(q)
    );
    actualizarConteo(filtrados.length, listaContactos.length);
    dibujarCards(filtrados);
});

// 9. HELPERS

function obtenerIniciales(nombre, apellido) {
    const n = nombre ? nombre.charAt(0).toUpperCase() : '';
    const a = apellido ? apellido.charAt(0).toUpperCase() : '';
    return n + a || '?';
}

function actualizarConteo(visible, total) {
    if (contactsCount) {
        contactsCount.textContent = visible === total
            ? `${total} contactos`
            : `${visible} de ${total} contactos`;
    }
}

function mostrarSkeletons() {
    directoryBody.innerHTML = Array(5).fill(`
        <div class="skeleton-card">
            <div class="skeleton-avatar"></div>
            <div class="skeleton-lines">
                <div class="skeleton-line"></div>
                <div class="skeleton-line short"></div>
            </div>
        </div>
    `).join('');
}

function copiarNumero(btn) {
    const numero = btn.getAttribute('data-number');
    navigator.clipboard.writeText(numero).then(() => {
        mostrarToast('Número copiado ✓');
    }).catch(() => {
        // Fallback para navegadores sin clipboard API
        const ta = document.createElement('textarea');
        ta.value = numero;
        document.body.appendChild(ta);
        ta.select();
        document.execCommand('copy');
        document.body.removeChild(ta);
        mostrarToast('Número copiado ✓');
    });
}

function mostrarToast(msg) {
    toast.textContent = msg;
    toast.classList.remove('hidden');
    requestAnimationFrame(() => toast.classList.add('show'));
    setTimeout(() => {
        toast.classList.remove('show');
        setTimeout(() => toast.classList.add('hidden'), 300);
    }, 2200);
}

// Iniciar
verificarSesion();
