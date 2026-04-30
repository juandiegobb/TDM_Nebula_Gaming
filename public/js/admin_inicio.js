import {
    getCurrentUser,
    getChannelsWithUsers,
    getAvailableUsersForChannels,
    createChannelWithMembers
} from "./services/api.js";

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
let availableUsers = [];
let selectedMemberIds = new Set();

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
    } catch {
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

function renderSelectedMembersPreview() {
    const selectedMembersPreview = document.getElementById("selectedMembersPreview");
    if (!selectedMembersPreview) return;

    const selectedUsers = availableUsers.filter(user => selectedMemberIds.has(Number(user.id)));

    if (!selectedUsers.length) {
        selectedMembersPreview.innerHTML = `<span class="members-empty">Sin miembros seleccionados</span>`;
        return;
    }

    selectedMembersPreview.innerHTML = selectedUsers.map(user => `
        <span class="member-chip">
            <img src="${escapeHTML(user.img || "https://i.pravatar.cc/150")}" alt="${escapeHTML(user.name)}">
            ${escapeHTML(user.name)}
            <button type="button" class="remove-selected-member" data-user-id="${escapeHTML(user.id)}">✕</button>
        </span>
    `).join("");

    selectedMembersPreview.querySelectorAll(".remove-selected-member").forEach(button => {
        button.addEventListener("click", () => {
            selectedMemberIds.delete(Number(button.dataset.userId));
            renderMembersPicker(document.getElementById("membersSearch")?.value || "");
            renderSelectedMembersPreview();
        });
    });
}

function renderMembersPicker(search = "") {
    const membersList = document.getElementById("membersList");
    const membersCount = document.getElementById("membersCount");
    if (!membersList) return;

    const query = search.trim().toLowerCase();
    const filteredUsers = availableUsers.filter(user => {
        const name = String(user.name || "").toLowerCase();
        const email = String(user.email || "").toLowerCase();
        return name.includes(query) || email.includes(query);
    });

    if (membersCount) membersCount.textContent = `${selectedMemberIds.size} seleccionado(s)`;

    if (!filteredUsers.length) {
        membersList.innerHTML = `<div class="members-empty">No hay usuarios disponibles.</div>`;
        return;
    }

    membersList.innerHTML = filteredUsers.map(user => {
        const userId = Number(user.id);
        const checked = selectedMemberIds.has(userId) ? "checked" : "";

        return `
            <label class="member-option">
                <input type="checkbox" value="${escapeHTML(userId)}" ${checked}>
                <img src="${escapeHTML(user.img || "https://i.pravatar.cc/150")}" alt="${escapeHTML(user.name)}">
                <span>
                    <strong>${escapeHTML(user.name)}</strong>
                    <small>${escapeHTML(user.email || "Sin email")}</small>
                </span>
            </label>
        `;
    }).join("");

    membersList.querySelectorAll('input[type="checkbox"]').forEach(input => {
        input.addEventListener("change", () => {
            const userId = Number(input.value);
            if (input.checked) selectedMemberIds.add(userId);
            else selectedMemberIds.delete(userId);
            renderMembersPicker(document.getElementById("membersSearch")?.value || "");
            renderSelectedMembersPreview();
        });
    });
}

async function openMembersPicker() {
    const membersPanel = document.getElementById("membersPanel");
    const membersList = document.getElementById("membersList");
    const membersSearch = document.getElementById("membersSearch");

    if (!membersPanel) return;

    membersPanel.classList.remove("hidden");
    if (membersList) membersList.innerHTML = `<div class="members-empty">Cargando usuarios...</div>`;

    try {
        availableUsers = await getAvailableUsersForChannels();
        if (membersSearch) membersSearch.value = "";
        renderMembersPicker();
        renderSelectedMembersPreview();
    } catch (error) {
        if (membersList) membersList.innerHTML = `<div class="members-empty error">${escapeHTML(error.message)}</div>`;
    }
}

function closeMembersPicker() {
    document.getElementById("membersPanel")?.classList.add("hidden");
}

function resetModal() {
    document.getElementById("paso1").classList.remove("hidden");
    document.getElementById("paso2").classList.add("hidden");
    document.getElementById("serverName").value = "";
    document.getElementById("serverDesc").value = "";
    document.getElementById("serverImgUrl").value = "";
    document.getElementById("nameCount").textContent = "0/100";
    document.getElementById("descCount").textContent = "0/500";
    const preview = document.querySelector(".img-preview");
    if (preview) preview.remove();
    selectedMemberIds.clear();
    closeMembersPicker();
    renderSelectedMembersPreview();
}

async function initAdmin() {
    const admin = await loadAdminUser();
    if (!admin) return;

    renderAdminProfile(admin);
    await loadChannels();

    const modal = document.getElementById("crearServidorModal");
    const paso1 = document.getElementById("paso1");
    const paso2 = document.getElementById("paso2");

    refreshBtn.addEventListener("click", loadChannels);

    document.getElementById("createChannelBtn").addEventListener("click", () => modal.classList.add("open"));
    document.querySelector(".add").addEventListener("click", () => modal.classList.add("open"));

    goChatBtn.addEventListener("click", () => window.location.href = "/chat.html");

    document.getElementById("goMembersBtn").addEventListener("click", () => {
        window.location.href = "/anadir_miembros.html";
    });

    logoutBtn.addEventListener("click", () => {
        localStorage.removeItem("user");
        window.location.href = "/login.html";
    });

    document.getElementById("closeModal").addEventListener("click", () => {
        modal.classList.remove("open");
        resetModal();
    });

    document.getElementById("closeModal2").addEventListener("click", () => {
        modal.classList.remove("open");
        resetModal();
    });

    modal.addEventListener("click", (event) => {
        if (event.target === modal) {
            modal.classList.remove("open");
            resetModal();
        }
    });

    document.getElementById("serverName").addEventListener("input", function () {
        document.getElementById("nameCount").textContent = `${this.value.length}/100`;
    });

    document.getElementById("serverDesc").addEventListener("input", function () {
        document.getElementById("descCount").textContent = `${this.value.length}/500`;
    });

    document.getElementById("imageUpload").addEventListener("click", () => {
        document.getElementById("imgInput").click();
    });

    document.getElementById("imgInput").addEventListener("change", function () {
        if (!this.files[0]) return;

        const url = URL.createObjectURL(this.files[0]);
        let preview = document.querySelector(".img-preview");
        if (!preview) {
            preview = document.createElement("img");
            preview.className = "img-preview";
            document.getElementById("imageUpload").appendChild(preview);
        }
        preview.src = url;
        document.getElementById("serverImgUrl").value = "";
    });

    document.getElementById("serverImgUrl").addEventListener("input", function () {
        if (!this.value.trim()) return;

        let preview = document.querySelector(".img-preview");
        if (!preview) {
            preview = document.createElement("img");
            preview.className = "img-preview";
            document.getElementById("imageUpload").appendChild(preview);
        }
        preview.src = this.value.trim();
        document.getElementById("imgInput").value = "";
    });

    document.getElementById("goToMembers").addEventListener("click", async (event) => {
        event.preventDefault();
        event.stopPropagation();
        await openMembersPicker();
    });

    document.getElementById("closeMembersPanel")?.addEventListener("click", closeMembersPicker);
    document.getElementById("confirmMembersBtn")?.addEventListener("click", closeMembersPicker);
    document.getElementById("membersSearch")?.addEventListener("input", (event) => renderMembersPicker(event.target.value));

    document.getElementById("irPaso2").addEventListener("click", () => {
        const name = document.getElementById("serverName").value.trim();
        if (!name) {
            alert("El nombre del servidor es obligatorio.");
            return;
        }
        paso1.classList.add("hidden");
        paso2.classList.remove("hidden");
    });

    document.getElementById("rulesList").addEventListener("click", (event) => {
        if (event.target.classList.contains("rule-remove")) {
            event.target.closest("li").remove();
        }
    });

    document.getElementById("addRuleBtn").addEventListener("click", () => {
        const text = prompt("Escribe la nueva regla:");
        if (!text) return;
        const li = document.createElement("li");
        li.innerHTML = `<span class="rule-dot">●</span> <span class="rule-text">${escapeHTML(text).toUpperCase()}</span> <button class="rule-remove">✕</button>`;
        document.getElementById("rulesList").appendChild(li);
    });

    document.getElementById("crearServidorBtn").addEventListener("click", async () => {
        const name = document.getElementById("serverName").value.trim();
        const desc = document.getElementById("serverDesc").value.trim();
        const imgUrl = document.getElementById("serverImgUrl").value.trim();
        const imgPreview = document.querySelector(".img-preview");
        const img = imgUrl || (imgPreview ? imgPreview.src : null);

        try {
            await createChannelWithMembers({
                name,
                description: desc,
                img,
                memberIds: [...selectedMemberIds]
            });

            modal.classList.remove("open");
            resetModal();
            await loadChannels();
        } catch (error) {
            alert("Error: " + error.message);
        }
    });

    renderSelectedMembersPreview();
}

initAdmin().catch(error => {
    console.error("Error cargando panel admin:", error);
    channelsGrid.innerHTML = `<div class="empty-state error">No se pudo cargar la información del administrador.</div>`;
    channelUsersGrid.innerHTML = `<div class="empty-state error">${escapeHTML(error.message || "Error desconocido")}</div>`;
});
