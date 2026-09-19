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

// Referencias — TAREAS
const tabDirectorio     = document.getElementById('tab-directorio');
const tabTareas         = document.getElementById('tab-tareas');
const viewDirectorio    = document.getElementById('view-directorio');
const viewTareas        = document.getElementById('view-tareas');
const subtabActivos     = document.getElementById('subtab-activos');
const subtabHistorial   = document.getElementById('subtab-historial');
const tasksActiveBody   = document.getElementById('tasks-active-body');
const tasksHistoryBody  = document.getElementById('tasks-history-body');
const tasksCount        = document.getElementById('tasks-count');
const taskSearchInput   = document.getElementById('task-search-input');
const newTaskBtn        = document.getElementById('new-task-btn');
const taskModal         = document.getElementById('task-modal');
const closeTaskModalBtn = document.getElementById('close-task-modal');
const taskForm          = document.getElementById('task-form');
const taskTitleInput    = document.getElementById('task-title');
const taskDescInput     = document.getElementById('task-desc');
const taskDueInput      = document.getElementById('task-due');
const taskPriorityInput = document.getElementById('task-priority');
const assigneeListEl    = document.getElementById('assignee-list');
const taskError         = document.getElementById('task-error');
const saveTaskBtn       = document.getElementById('save-task-btn');

let listaContactos = [];
let listaTareas    = [];
let listaPerfiles  = [];   // usuarios con acceso a la app (tabla profiles)
let usuarioActual  = null; // { id, full_name, email }
let subvistaTareas = 'activos';
let tareasChannel   = null;

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
    try {
        // Intentamos obtener el usuario actual de Supabase
        const { data, error } = await supabaseClient.auth.getUser();

        // Si la API de Supabase responde con un error de sesión, lo lanzamos al catch
        if (error) throw error;

        const user = data?.user;

        if (user) {
            loginSection.classList.add('hidden');
            directorySection.classList.remove('hidden');
            if (listaContactos.length === 0) cargarContactos();

            usuarioActual = { id: user.id, email: user.email };
            await cargarPerfiles();
            await cargarTareas();
            suscribirRealtimeTareas();
        } else {
            // No hay un usuario activo, mandamos al login de forma limpia
            irAlLogin();
        }

    } catch (error) {
        console.error("Error al verificar la sesión de Supabase:", error);
        
        // Si hay un error de red o de servidor, aseguramos que el usuario no quede 
        // atrapado en un estado intermedio y lo enviamos al login de forma segura
        irAlLogin();
        
        // Opcional: Puedes mostrar un mensaje sutil en la pantalla de login si deseas
        if (loginError) {
            loginError.textContent = "Hubo un problema de conexión. Por favor, intenta iniciar sesión nuevamente.";
        }
    }
}

// Función auxiliar para limpiar el estado visual del formulario de login
function irAlLogin() {
    loginSection.classList.remove('hidden');
    directorySection.classList.add('hidden');
    directoryBody.innerHTML = "";
    listaContactos = [];
    if (loginBtn) {
        loginBtn.textContent = "Iniciar sesión";
        loginBtn.disabled = false;
    }

    // Reset del módulo de tareas
    listaTareas = [];
    listaPerfiles = [];
    usuarioActual = null;
    tasksActiveBody.innerHTML = "";
    tasksHistoryBody.innerHTML = "";
    taskModal.classList.add('hidden');
    cambiarVista('directorio');
    if (tareasChannel) {
        supabaseClient.removeChannel(tareasChannel);
        tareasChannel = null;
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
                <a href="https://wa.me/57${celularLimpio}" target="_blank" rel="noopener" class="btn-action btn-whatsapp">
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

// =============================================
// 10. MÓDULO DE TAREAS Y PENDIENTES
// =============================================

// --- 10.1 Navegación entre vistas (Directorio / Tareas) ---
function cambiarVista(vista) {
    const esDirectorio = vista === 'directorio';
    viewDirectorio.classList.toggle('hidden', !esDirectorio);
    viewTareas.classList.toggle('hidden', esDirectorio);
    tabDirectorio.classList.toggle('active', esDirectorio);
    tabTareas.classList.toggle('active', !esDirectorio);
}
tabDirectorio.addEventListener('click', () => cambiarVista('directorio'));
tabTareas.addEventListener('click', () => cambiarVista('tareas'));

function cambiarSubvistaTareas(subvista) {
    subvistaTareas = subvista;
    const esActivos = subvista === 'activos';
    tasksActiveBody.classList.toggle('hidden', !esActivos);
    tasksHistoryBody.classList.toggle('hidden', esActivos);
    subtabActivos.classList.toggle('active', esActivos);
    subtabHistorial.classList.toggle('active', !esActivos);
    aplicarFiltroTareas();
}
subtabActivos.addEventListener('click', () => cambiarSubvistaTareas('activos'));
subtabHistorial.addEventListener('click', () => cambiarSubvistaTareas('historial'));

// --- 10.2 Cargar perfiles (solo usuarios con acceso a la app) ---
async function cargarPerfiles() {
    const { data, error } = await supabaseClient
        .from('profiles')
        .select('id, full_name')
        .order('full_name', { ascending: true });

    if (error) {
        console.error('Error al cargar perfiles:', error);
        listaPerfiles = [];
        return;
    }
    listaPerfiles = data || [];
    dibujarCheckboxesResponsables();
}

function dibujarCheckboxesResponsables() {
    if (listaPerfiles.length === 0) {
        assigneeListEl.innerHTML = `<p style="font-size:0.82rem;color:var(--gray-500);padding:4px;">No hay usuarios disponibles para asignar.</p>`;
        return;
    }
    assigneeListEl.innerHTML = listaPerfiles.map(p => `
        <label class="assignee-item">
            <input type="checkbox" value="${p.id}" class="assignee-checkbox">
            ${p.full_name}
        </label>
    `).join('');
}

// --- 10.3 Cargar tareas activas + historial ---
async function cargarTareas() {
    const { data, error } = await supabaseClient
        .from('tasks')
        .select(`
            id, title, description, status, priority_manual, due_date,
            created_at, completed_at,
            creador:profiles!tasks_created_by_fkey(full_name),
            completador:profiles!tasks_completed_by_fkey(full_name),
            task_assignees(profiles(id, full_name))
        `)
        .order('due_date', { ascending: true });

    if (error) {
        console.error('Error al cargar tareas:', error);
        tasksActiveBody.innerHTML = `
            <div class="empty-state">
                <p>Error al cargar los pendientes.<br>Intenta recargar la página.</p>
            </div>`;
        return;
    }

    listaTareas = data || [];
    aplicarFiltroTareas();
}

// --- 10.4 Urgencia según due_date ---
function calcularUrgencia(dueDateStr) {
    if (!dueDateStr) return 'plazo';
    const ahora = new Date();
    const vence = new Date(dueDateStr);
    const diffHoras = (vence - ahora) / (1000 * 60 * 60);

    if (diffHoras < 0) return 'vencido';
    if (diffHoras <= 24) return 'hoy';
    if (diffHoras <= 24 * 7) return 'proximo';
    return 'plazo';
}

const ETIQUETA_URGENCIA = {
    vencido: 'Vencido',
    hoy: 'Urgente / Hoy',
    proximo: 'Próximo',
    plazo: 'En plazo'
};

function formatearFecha(fechaStr) {
    if (!fechaStr) return 'Sin fecha límite';
    const f = new Date(fechaStr);
    return f.toLocaleString('es-CO', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' });
}

// --- 10.5 Filtro / búsqueda + separación activos vs historial ---
function aplicarFiltroTareas() {
    const q = taskSearchInput.value.toLowerCase().trim();

    const coincide = (t) => {
        const responsables = (t.task_assignees || []).map(a => a.profiles?.full_name || '').join(' ');
        return (t.title || '').toLowerCase().includes(q) ||
               responsables.toLowerCase().includes(q) ||
               (t.creador?.full_name || '').toLowerCase().includes(q);
    };

    const activas    = listaTareas.filter(t => t.status !== 'completado' && coincide(t));
    const completadas = listaTareas.filter(t => t.status === 'completado' && coincide(t));

    if (subvistaTareas === 'activos') {
        dibujarTareas(activas, tasksActiveBody, false);
        tasksCount.textContent = `${activas.length} pendiente${activas.length === 1 ? '' : 's'} activo${activas.length === 1 ? '' : 's'}`;
    } else {
        // Historial ordenado por fecha de completado, más reciente primero
        completadas.sort((a, b) => new Date(b.completed_at || 0) - new Date(a.completed_at || 0));
        dibujarTareas(completadas, tasksHistoryBody, true);
        tasksCount.textContent = `${completadas.length} completado${completadas.length === 1 ? '' : 's'}`;
    }
}
taskSearchInput.addEventListener('input', aplicarFiltroTareas);

// --- 10.6 Render de tarjetas de tareas ---
function dibujarTareas(tareas, contenedor, esHistorial) {
    contenedor.innerHTML = "";

    if (tareas.length === 0) {
        contenedor.innerHTML = `
            <div class="empty-state">
                <svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M9 11l3 3L22 4"/><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"/></svg>
                <p>${esHistorial ? 'Aún no hay pendientes completados.' : 'No hay pendientes activos.'}</p>
            </div>`;
        return;
    }

    tareas.forEach(t => {
        const urgencia = esHistorial ? null : calcularUrgencia(t.due_date);
        const responsables = (t.task_assignees || []).map(a => a.profiles?.full_name).filter(Boolean).join(', ') || 'Sin asignar';
        const creador = t.creador?.full_name || 'Desconocido';

        const card = document.createElement('div');
        card.className = 'task-card' + (esHistorial ? ' is-completed' : ` urgency-${urgencia}`);
        card.innerHTML = `
            <div class="task-top-row">
                <div class="task-title">${t.title}</div>
                ${esHistorial
                    ? `<span class="task-badge status-completado">Completado</span>`
                    : `<span class="task-badge urgency-${urgencia}">${ETIQUETA_URGENCIA[urgencia]}</span>`}
            </div>
            <span class="task-priority-tag priority-${t.priority_manual || 'media'}">Prioridad ${t.priority_manual || 'media'}</span>
            ${t.description ? `<div class="task-desc">${t.description}</div>` : ''}
            <div class="task-meta">
                <span><strong>Resp:</strong> ${responsables}</span>
                <span><strong>Creado por:</strong> ${creador}</span>
            </div>
            <div class="task-meta">
                <span><strong>${esHistorial ? 'Completado' : 'Vence'}:</strong> ${esHistorial ? formatearFecha(t.completed_at) : formatearFecha(t.due_date)}</span>
                ${esHistorial && t.completador?.full_name ? `<span><strong>Por:</strong> ${t.completador.full_name}</span>` : ''}
            </div>
            ${!esHistorial ? `<button class="btn-complete-task" data-task-id="${t.id}">Marcar como completado</button>` : ''}
        `;

        if (!esHistorial) {
            card.querySelector('.btn-complete-task').addEventListener('click', (e) => marcarCompletado(t.id, e.target));
        }

        contenedor.appendChild(card);
    });
}

// --- 10.7 Marcar tarea como completada ---
async function marcarCompletado(taskId, btnEl) {
    if (!usuarioActual) return;
    btnEl.disabled = true;
    btnEl.textContent = 'Guardando…';

    const { error } = await supabaseClient
        .from('tasks')
        .update({
            status: 'completado',
            completed_by: usuarioActual.id,
            completed_at: new Date().toISOString()
        })
        .eq('id', taskId);

    if (error) {
        console.error('Error al completar la tarea:', error);
        btnEl.disabled = false;
        btnEl.textContent = 'Marcar como completado';
        mostrarToast('No se pudo completar. Intenta de nuevo.');
        return;
    }

    mostrarToast('Pendiente completado ✓');
    await cargarTareas();
}

// --- 10.8 Modal: abrir / cerrar ---
function abrirModalTarea() {
    taskForm.reset();
    taskError.textContent = "";
    dibujarCheckboxesResponsables();
    taskModal.classList.remove('hidden');
}
function cerrarModalTarea() {
    taskModal.classList.add('hidden');
}
newTaskBtn.addEventListener('click', abrirModalTarea);
closeTaskModalBtn.addEventListener('click', cerrarModalTarea);
taskModal.addEventListener('click', (e) => {
    if (e.target === taskModal) cerrarModalTarea();
});

// --- 10.9 Guardar nuevo pendiente ---
taskForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    taskError.textContent = "";

    const titulo = taskTitleInput.value.trim();
    const descripcion = taskDescInput.value.trim();
    const fechaLimite = taskDueInput.value ? new Date(taskDueInput.value).toISOString() : null;
    const prioridad = taskPriorityInput.value;
    const responsablesSeleccionados = Array.from(
        assigneeListEl.querySelectorAll('.assignee-checkbox:checked')
    ).map(cb => cb.value);

    if (!titulo) {
        taskError.textContent = "El título es obligatorio.";
        return;
    }
    if (!usuarioActual) {
        taskError.textContent = "No se pudo identificar tu sesión. Vuelve a iniciar sesión.";
        return;
    }

    saveTaskBtn.disabled = true;
    saveTaskBtn.textContent = "Guardando…";

    const { data: nuevaTarea, error: errorTarea } = await supabaseClient
        .from('tasks')
        .insert({
            title: titulo,
            description: descripcion || null,
            due_date: fechaLimite,
            priority_manual: prioridad,
            created_by: usuarioActual.id,
            status: 'pendiente'
        })
        .select('id')
        .single();

    if (errorTarea) {
        console.error('Error al crear la tarea:', errorTarea);
        taskError.textContent = "No se pudo crear el pendiente. Intenta de nuevo.";
        saveTaskBtn.disabled = false;
        saveTaskBtn.textContent = "Guardar pendiente";
        return;
    }

    if (responsablesSeleccionados.length > 0) {
        const filas = responsablesSeleccionados.map(userId => ({
            task_id: nuevaTarea.id,
            user_id: userId
        }));
        const { error: errorAsignados } = await supabaseClient
            .from('task_assignees')
            .insert(filas);

        if (errorAsignados) {
            console.error('Error al asignar responsables:', errorAsignados);
            mostrarToast('Pendiente creado, pero falló asignar responsables.');
        }
    }

    saveTaskBtn.disabled = false;
    saveTaskBtn.textContent = "Guardar pendiente";
    cerrarModalTarea();
    mostrarToast('Pendiente creado ✓');
    await cargarTareas();
});

// --- 10.10 Sincronización en tiempo real ---
function suscribirRealtimeTareas() {
    if (tareasChannel) return; // ya suscrito
    tareasChannel = supabaseClient
        .channel('tasks-changes')
        .on('postgres_changes', { event: '*', schema: 'public', table: 'tasks' }, () => cargarTareas())
        .on('postgres_changes', { event: '*', schema: 'public', table: 'task_assignees' }, () => cargarTareas())
        .subscribe();
}

// Iniciar
verificarSesion();
