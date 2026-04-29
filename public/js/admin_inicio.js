import { getCurrentUser, getChannelsWithUsers } from "./services/api.js";

const channelsGrid = document.getElementById("channelsGrid");
const channelUsersGrid = document.getElementById("channelUsersGrid");
const selectedChannelTitle = document.getElementById("selectedChannelTitle");
const selectedChannelDescription = document.getElementById("selectedChannelDescription");
const channelDots = document.getElementById("channelDots");
const refreshBtn = document.getElementById("refreshBtn");
const logoutBtn = document.getElementById("logoutBtn");
const goChatBtn = document.getElementById("goChatBtn");
const totalChannels = document.getElementById("totalChannels");
const totalUsers = document.getElementById("totalUsers");
const adminName = document.getElementById("adminName");
const adminEmail = document.getElementById("adminEmail");
const profileImg = document.getElementById("profileImg");
const miniProfileImg = document.getElementById("miniProfileImg");

let channels = [];
let selectedChannelId = null;

function escapeHTML(value) {
    return String(value ?? "")
        .replaceAll("&", "&amp;")
        .replaceAll("<", "&lt;")
        .replaceAll(">", "&gt;")
        .replaceAll('"', "&quot;")
        .replaceAll("'", "&#039;");
}

function getLocalUser() {
    try {
        return JSON.parse(localStorage.getItem("user"));
    } catch (error) {
        return null;
    }
}

async function loadAdminUser() {
    const localUser = getLocalUser();

    if (localUser?.rol === "admin" || localUser?.role === "admin") {
        return localUser;
    }

    const data = await getCurrentUser();
    if (!data.authenticated || data.user.rol !== "admin") {
        window.location.href = "/login.html";
        return null;
    }

    localStorage.setItem("user", JSON.stringify(data.user));
    return data.user;
}

function renderAdminProfile(user) {
    adminName.textContent = user.name || "Administrador";
    adminEmail.textContent = user.email || "";
    profileImg.src = user.img || "https://i.pravatar.cc/150";
    miniProfileImg.src = user.img || "https://i.pravatar.cc/150";
}

function renderSidebarDots() {
    document.querySelectorAll(".channel-dot").forEach(dot => dot.remove());

    channels.forEach(channel => {
        const dot = document.createElement("button");
        dot.classList.add("channel-dot");
        dot.title = channel.name;
        dot.textContent = String(channel.name || "#").trim().charAt(0).toUpperCase();
        dot.dataset.channelId = channel.id;
        dot.addEventListener("click", () => {
            localStorage.setItem("selectedChannelId", channel.id);
            window.location.href = "/chat.html";
        });
        channelDots.insertBefore(dot, channelDots.querySelector(".add"));
    });
}

function renderChannels() {
    if (!channels.length) {
        channelsGrid.innerHTML = `<div class="empty-state">No hay canales registrados.</div>`;
        return;
    }

    channelsGrid.innerHTML = channels.map(channel => `
        <button class="channel-card ${Number(channel.id) === Number(selectedChannelId) ? "active" : ""}" data-channel-id="${escapeHTML(channel.id)}">
            <div class="channel-icon">
                ${channel.img ? 
                    `<img src="${escapeHTML(channel.img)}" alt="${escapeHTML(channel.name)}" class="channel-img">` : 
                    `<span class="channel-letter">${escapeHTML(String(channel.name || "#").trim().charAt(0).toUpperCase())}</span>`
                }
            </div>
            <div class="channel-info">
                <strong>${escapeHTML(channel.name)}</strong>
                <span>${escapeHTML(channel.description || "Canal de chat")}</span>
                <small>${channel.userCount || 0} usuario(s) asignado(s)</small>
            </div>
        </button>
    `).join("");

    document.querySelectorAll(".channel-card").forEach(card => {
        card.addEventListener("click", () => selectChannel(card.dataset.channelId));
    });
}

function renderUsers(channel) {
    if (!channel) {
        selectedChannelTitle.textContent = "USUARIOS DEL CANAL";
        selectedChannelDescription.textContent = "Selecciona un canal para ver sus usuarios.";
        channelUsersGrid.innerHTML = `<div class="empty-state">Sin canal seleccionado.</div>`;
        return;
    }

    selectedChannelTitle.textContent = `USUARIOS DE ${channel.name.toUpperCase()}`;
    selectedChannelDescription.textContent = channel.description || "Usuarios validados desde users.json según el arreglo grupos.";

    if (!channel.users?.length) {
        channelUsersGrid.innerHTML = `<div class="empty-state">Este canal todavía no tiene usuarios asignados.</div>`;
        return;
    }

    channelUsersGrid.innerHTML = channel.users.map(user => `
        <article class="user-card">
            <img src="${escapeHTML(user.img || "https://i.pravatar.cc/150")}" alt="${escapeHTML(user.name)}">
            <div>
                <strong>${escapeHTML(user.name)}</strong>
                <span>${escapeHTML(user.email)}</span>
                <small>${escapeHTML(user.rol)} · ${escapeHTML(user.provider || "local")}</small>
            </div>
        </article>
    `).join("");
}

function updateStats() {
    totalChannels.textContent = channels.length;

    const uniqueUserIds = new Set();
    channels.forEach(channel => {
        (channel.users || []).forEach(user => uniqueUserIds.add(Number(user.id)));
    });

    totalUsers.textContent = uniqueUserIds.size;
}

function selectChannel(channelId) {
    selectedChannelId = Number(channelId);
    const channel = channels.find(item => Number(item.id) === selectedChannelId);

    renderChannels();
    renderUsers(channel);

    document.querySelectorAll(".channel-dot").forEach(dot => {
        dot.classList.toggle("active", Number(dot.dataset.channelId) === selectedChannelId);
    });
}

async function loadChannels() {
    channelsGrid.innerHTML = `<div class="empty-state">Cargando canales...</div>`;
    channelUsersGrid.innerHTML = `<div class="empty-state">Cargando usuarios...</div>`;

    channels = await getChannelsWithUsers();

    if (!selectedChannelId && channels.length) {
        selectedChannelId = Number(channels[0].id);
    }

    renderSidebarDots();
    renderChannels();
    renderUsers(channels.find(channel => Number(channel.id) === Number(selectedChannelId)));
    updateStats();
}

async function initAdmin() {
    const admin = await loadAdminUser();
    if (!admin) return;

    renderAdminProfile(admin);
    await loadChannels();

    refreshBtn.addEventListener("click", loadChannels);

    // Botón para crear canal
    document.getElementById("createChannelBtn").addEventListener("click", () => {
        document.getElementById("crearServidorModal").classList.add("open");
    });

    goChatBtn.addEventListener("click", () => {
        window.location.href = "/chat.html";
    });
    document.getElementById("goMembersBtn").addEventListener("click", () => {
        window.location.href = "/anadir_miembros.html";
    });

    logoutBtn.addEventListener("click", () => {
        localStorage.removeItem("user");
        window.location.href = "/login.html";
    });
    // ─── MODAL CREAR SERVIDOR ─────────────────────────
const modal = document.getElementById("crearServidorModal");
const paso1 = document.getElementById("paso1");
const paso2 = document.getElementById("paso2");

// Función para limpiar el modal
function resetModal() {
    paso1.classList.remove("hidden");
    paso2.classList.add("hidden");
    document.getElementById("serverName").value = "";
    document.getElementById("serverDesc").value = "";
    document.getElementById("serverImgUrl").value = "";
    document.getElementById("nameCount").textContent = "0/100";
    document.getElementById("descCount").textContent = "0/500";
    const preview = document.querySelector(".img-preview");
    if (preview) preview.remove();
}

// Abrir modal desde el botón + del sidebar
document.querySelector(".add").addEventListener("click", () => {
    modal.classList.add("open");
});

// Cerrar modal
document.getElementById("closeModal").addEventListener("click", () => {
    modal.classList.remove("open");
    resetModal();
});
document.getElementById("closeModal2").addEventListener("click", () => {
    modal.classList.remove("open");
    resetModal();
});

// Cerrar al hacer clic fuera
modal.addEventListener("click", (e) => {
    if (e.target === modal) {
        modal.classList.remove("open");
        resetModal();
    }
});

// Contadores de caracteres
document.getElementById("serverName").addEventListener("input", function () {
    document.getElementById("nameCount").textContent = `${this.value.length}/100`;
});
document.getElementById("serverDesc").addEventListener("input", function () {
    document.getElementById("descCount").textContent = `${this.value.length}/500`;
});

// Upload imagen desde archivo
document.getElementById("imageUpload").addEventListener("click", () => {
    document.getElementById("imgInput").click();
});
document.getElementById("imgInput").addEventListener("change", function () {
    if (this.files[0]) {
        const url = URL.createObjectURL(this.files[0]);
        let preview = document.querySelector(".img-preview");
        if (!preview) {
            preview = document.createElement("img");
            preview.className = "img-preview";
            document.getElementById("imageUpload").appendChild(preview);
        }
        preview.src = url;
        document.getElementById("serverImgUrl").value = "";
    }
});

// Ingresar URL de imagen
document.getElementById("serverImgUrl").addEventListener("input", function () {
    if (this.value.trim()) {
        let preview = document.querySelector(".img-preview");
        if (!preview) {
            preview = document.createElement("img");
            preview.className = "img-preview";
            document.getElementById("imageUpload").appendChild(preview);
        }
        preview.src = this.value.trim();
        document.getElementById("imgInput").value = "";
    }
});

// Ir a añadir miembros
document.getElementById("goToMembers").addEventListener("click", (e) => {
    e.stopPropagation();
    window.location.href = "/anadir_miembros.html";
});

// Ir al paso 2
document.getElementById("irPaso2").addEventListener("click", async () => {
    const name = document.getElementById("serverName").value.trim();
    if (!name) {
        alert("El nombre del servidor es obligatorio.");
        return;
    }
    paso1.classList.add("hidden");
    paso2.classList.remove("hidden");
});

// Quitar regla
document.getElementById("rulesList").addEventListener("click", (e) => {
    if (e.target.classList.contains("rule-remove")) {
        e.target.closest("li").remove();
    }
});

// Agregar regla
document.getElementById("addRuleBtn").addEventListener("click", () => {
    const text = prompt("Escribe la nueva regla:");
    if (!text) return;
    const li = document.createElement("li");
    li.innerHTML = `<span class="rule-dot">●</span> <span class="rule-text">${text.toUpperCase()}</span> <button class="rule-remove">✕</button>`;
    document.getElementById("rulesList").appendChild(li);
});

// Crear servidor (guardar en channels.json)
document.getElementById("crearServidorBtn").addEventListener("click", async () => {
    const name = document.getElementById("serverName").value.trim();
    const desc = document.getElementById("serverDesc").value.trim();
    const imgUrl = document.getElementById("serverImgUrl").value.trim();
    const imgPreview = document.querySelector(".img-preview");
    const img = imgUrl || (imgPreview ? imgPreview.src : null);

    try {
        const res = await fetch("/api/channels", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "x-user": encodeURIComponent(localStorage.getItem("user"))
            },
            body: JSON.stringify({ name, description: desc, img })
        });

        if (!res.ok) throw new Error("Error al crear el servidor");

        modal.classList.remove("open");
        paso1.classList.remove("hidden");
        paso2.classList.add("hidden");
        document.getElementById("serverName").value = "";
        document.getElementById("serverDesc").value = "";
        document.getElementById("serverImgUrl").value = "";
        const preview = document.querySelector(".img-preview");
        if (preview) preview.remove();
        await loadChannels();
    } catch (e) {
        alert("Error: " + e.message);
    }
});
}

initAdmin().catch(error => {
    console.error("Error cargando panel admin:", error);
    channelsGrid.innerHTML = `<div class="empty-state error">No se pudo cargar la información del administrador.</div>`;
    channelUsersGrid.innerHTML = `<div class="empty-state error">${escapeHTML(error.message || "Error desconocido")}</div>`;
});
