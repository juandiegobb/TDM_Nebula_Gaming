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
            <div class="channel-icon"><i class="fa-solid fa-hashtag"></i></div>
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
}

initAdmin().catch(error => {
    console.error("Error cargando panel admin:", error);
    channelsGrid.innerHTML = `<div class="empty-state error">No se pudo cargar la información del administrador.</div>`;
    channelUsersGrid.innerHTML = `<div class="empty-state error">${escapeHTML(error.message || "Error desconocido")}</div>`;
});
