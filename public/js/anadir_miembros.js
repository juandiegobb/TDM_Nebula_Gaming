import { getCurrentUser, getChannelsWithUsers, getUsers } from "./services/api.js";
import { addMemberToChannel, removeMemberFromChannel } from "./services/api.js";

let channels = [];
let allUsers = [];
const pendingAdds = {};
const pendingRemoves = {};

const channelsColumns = document.getElementById("channelsColumns");
const channelDots = document.getElementById("channelDots");
const confirmBtn = document.getElementById("confirmBtn");
const miniProfileImg = document.getElementById("miniProfileImg");

function escapeHTML(value) {
    return String(value ?? "")
        .replaceAll("&", "&amp;")
        .replaceAll("<", "&lt;")
        .replaceAll(">", "&gt;")
        .replaceAll('"', "&quot;")
        .replaceAll("'", "&#039;");
}

function showToast(msg, isError = false) {
    let toast = document.getElementById("toast");
    if (!toast) {
        toast = document.createElement("div");
        toast.id = "toast";
        toast.className = "toast";
        document.body.appendChild(toast);
    }
    toast.textContent = msg;
    toast.className = isError ? "toast error show" : "toast show";
    setTimeout(() => { toast.className = isError ? "toast error" : "toast"; }, 3000);
}

function getLocalUser() {
    try { return JSON.parse(localStorage.getItem("user")); } catch { return null; }
}

async function loadAdminUser() {
    const localUser = getLocalUser();
    if (localUser?.rol === "admin" || localUser?.role === "admin") return localUser;
    const data = await getCurrentUser();
    if (!data.authenticated || data.user.rol !== "admin") {
        window.location.href = "/login.html";
        return null;
    }
    localStorage.setItem("user", JSON.stringify(data.user));
    return data.user;
}

function renderSidebarDots() {
    document.querySelectorAll(".channel-dot").forEach(d => d.remove());
    channels.forEach(channel => {
        const dot = document.createElement("button");
        dot.className = "channel-dot";
        dot.title = channel.name;
        dot.textContent = String(channel.name || "#").trim().charAt(0).toUpperCase();
        channelDots.appendChild(dot);
    });
}

function isMemberOfChannel(user, channelId) {
    return Array.isArray(user.grupos) && user.grupos.map(Number).includes(Number(channelId));
}

function getEffectiveStatus(user, channelId) {
    const isMember = isMemberOfChannel(user, channelId);
    const addedPending = pendingAdds[channelId]?.has(user.id);
    const removedPending = pendingRemoves[channelId]?.has(user.id);
    if (isMember && !removedPending) return "added";
    if (!isMember && addedPending) return "added";
    return "add";
}

function renderColumns() {
    if (!channels.length) {
        channelsColumns.innerHTML = `<div class="empty-state">No hay canales registrados.</div>`;
        return;
    }

    const users = allUsers.filter(u => u.rol !== "admin");

    channelsColumns.innerHTML = channels.map(channel => {
        const rows = users.map(user => {
            const status = getEffectiveStatus(user, channel.id);
            const imgSrc = escapeHTML(user.img || "https://i.pravatar.cc/150");
            const userName = escapeHTML(user.name || "Usuario");

            const btn = status === "added"
                ? `<button class="btn-added" data-action="remove" data-channel="${channel.id}" data-user="${user.id}">
                       AÑADIDO <i class="fa-solid fa-check"></i>
                   </button>`
                : `<button class="btn-add" data-action="add" data-channel="${channel.id}" data-user="${user.id}">
                       AÑADIR <i class="fa-solid fa-plus"></i>
                   </button>`;

            return `
                <div class="user-row">
                    <div class="user-avatar">
                        <img src="${imgSrc}" alt="${userName}" onerror="this.src='https://i.pravatar.cc/150'">
                        <div class="online-dot"></div>
                    </div>
                    <span class="user-name">${userName}</span>
                    ${btn}
                </div>
            `;
        }).join("");

        return `<div class="canal-col" data-channel-id="${channel.id}">${rows}</div>`;
    }).join("");

    channelsColumns.querySelectorAll("[data-action]").forEach(btn => {
        btn.addEventListener("click", () => {
            togglePending(btn.dataset.action, Number(btn.dataset.channel), Number(btn.dataset.user));
        });
    });
}

function togglePending(action, channelId, userId) {
    if (!pendingAdds[channelId]) pendingAdds[channelId] = new Set();
    if (!pendingRemoves[channelId]) pendingRemoves[channelId] = new Set();

    const user = allUsers.find(u => u.id === userId);
    const isMember = isMemberOfChannel(user, channelId);

    if (action === "add") {
        if (!isMember) pendingAdds[channelId].add(userId);
        else pendingRemoves[channelId].delete(userId);
    } else {
        if (isMember) pendingRemoves[channelId].add(userId);
        else pendingAdds[channelId].delete(userId);
    }

    renderColumns();
}

async function applyChanges() {
    confirmBtn.disabled = true;
    confirmBtn.innerHTML = `<i class="fa-solid fa-spinner fa-spin"></i> Guardando...`;

    let totalOps = 0;
    let errors = 0;

    for (const channelId of Object.keys(pendingAdds)) {
        for (const userId of pendingAdds[channelId]) {
            try { await addMemberToChannel(Number(channelId), Number(userId)); totalOps++; }
            catch (e) { console.error(e); errors++; }
        }
        pendingAdds[channelId].clear();
    }

    for (const channelId of Object.keys(pendingRemoves)) {
        for (const userId of pendingRemoves[channelId]) {
            try { await removeMemberFromChannel(Number(channelId), Number(userId)); totalOps++; }
            catch (e) { console.error(e); errors++; }
        }
        pendingRemoves[channelId].clear();
    }

    if (errors > 0) showToast(`${totalOps} cambios guardados, ${errors} error(es).`, true);
    else if (totalOps === 0) showToast("No hay cambios pendientes.");
    else showToast(`✔ ${totalOps} cambio(s) guardados correctamente.`);

    await loadData();
    confirmBtn.disabled = false;
    confirmBtn.innerHTML = `<i class="fa-solid fa-user-plus"></i> AÑADIR MIEMBROS`;
}

async function loadData() {
    channelsColumns.innerHTML = `<div class="empty-state">Cargando...</div>`;
    try {
        [channels, allUsers] = await Promise.all([getChannelsWithUsers(), getUsers()]);
        renderSidebarDots();
        renderColumns();
    } catch (e) {
        channelsColumns.innerHTML = `<div class="empty-state error">Error: ${escapeHTML(e.message)}</div>`;
    }
}

async function init() {
    const admin = await loadAdminUser();
    if (!admin) return;

    miniProfileImg.src = admin.img || "https://i.pravatar.cc/150";

    await loadData();

    confirmBtn.addEventListener("click", applyChanges);

    document.getElementById("goAdminBtn").addEventListener("click", () => {
        window.location.href = "/admi_inicio.html";
    });

    document.getElementById("logoutBtn").addEventListener("click", () => {
        localStorage.removeItem("user");
        window.location.href = "/login.html";
    });
}

init().catch(e => {
    console.error(e);
    channelsColumns.innerHTML = `<div class="empty-state error">No se pudo cargar la página.</div>`;
});