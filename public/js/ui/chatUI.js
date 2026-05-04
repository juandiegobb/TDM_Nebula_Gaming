const messagesDiv = document.getElementById("messages");
const userList = document.getElementById("userList");
const channelList = document.getElementById("channelList");
const currentChannelName = document.getElementById("currentChannelName");
const messageInput = document.getElementById("messageInput");
const sendButton = document.querySelector(".send-btn");
const channelInfoPanel = document.getElementById("channelInfoPanel");
const channelInfoHeader = document.getElementById("channelInfoHeader");
const channelInfoContent = document.getElementById("channelInfoContent");
const closeChannelInfoBtn = document.getElementById("closeChannelInfoBtn");
let currentChannel = null;
let currentInfoType = "description";

function renderChannelInfo(type = "description") {
    if (!channelInfoPanel || !channelInfoHeader || !channelInfoContent) return;
    currentInfoType = type;
    channelInfoPanel.classList.remove("hidden");

    if (!currentChannel) {
        channelInfoHeader.textContent = "Información del canal";
        channelInfoContent.innerHTML = "<p>Selecciona un canal primero.</p>";
        return;
    }

    const channelName = currentChannel.name ? `#${currentChannel.name}` : "este canal";

    if (type === "rules") {
        channelInfoHeader.textContent = `Reglas de ${channelName}`;
        const rules = Array.isArray(currentChannel.rules) ? currentChannel.rules : [];
        channelInfoContent.innerHTML = rules.length
            ? `<ol>${rules.map(rule => `<li>${escapeHTML(rule)}</li>`).join("")}</ol>`
            : "<p>No hay reglas definidas para este canal.</p>";
        return;
    }

    channelInfoHeader.textContent = `Descripción de ${channelName}`;
    const description = String(currentChannel.description || "").trim();
    channelInfoContent.innerHTML = description
        ? `<p>${escapeHTML(description)}</p>`
        : "<p>No hay descripción definida para este canal.</p>";
}

export function showChannelInfo(type) {
    renderChannelInfo(type);
}

export function hideChannelInfo() {
    if (!channelInfoPanel) return;
    channelInfoPanel.classList.add("hidden");
}

if (closeChannelInfoBtn) {
    closeChannelInfoBtn.addEventListener("click", () => {
        hideChannelInfo();
    });
}

function fixChatHeight() {
    document.querySelector(".chat-container").style.height = window.innerHeight + "px";
}
window.addEventListener("resize", fixChatHeight);
fixChatHeight();

function escapeHTML(value) {
    return String(value)
        .replaceAll("&", "&amp;")
        .replaceAll("<", "&lt;")
        .replaceAll(">", "&gt;")
        .replaceAll('"', "&quot;")
        .replaceAll("'", "&#039;");
}

export function clearMessages() {
    messagesDiv.innerHTML = "";
}

export function addMessage(user, text, isSelf = false) {
    const msgEl = document.createElement("div");
    const isAdmin = String(user?.rol || "").toLowerCase() === "admin";
    const userName = user?.name || "Usuario";
    const userImg = user?.img || "";
    const initial = userName.charAt(0).toUpperCase();

    msgEl.classList.add("message");
    if (isSelf) msgEl.classList.add("self");
    if (isAdmin) msgEl.classList.add("admin-message");

    msgEl.innerHTML = `
        <div class="msg-avatar-wrapper">
            ${userImg
                ? `<img src="${escapeHTML(userImg)}" alt="${escapeHTML(userName)}" class="msg-avatar" 
                       onerror="this.style.display='none';this.nextElementSibling.style.display='flex'">`
                : ""
            }
            <div class="msg-avatar-fallback" ${userImg ? 'style="display:none"' : ""}>
                ${escapeHTML(initial)}
            </div>
        </div>
        <div class="msg-content">
            <div class="message-header">
                <span class="message-user">${escapeHTML(userName)}</span>
                ${isAdmin ? '<span class="message-role">ADMIN</span>' : ""}
            </div>
            <div class="message-text">${escapeHTML(text)}</div>
        </div>
    `;

    messagesDiv.appendChild(msgEl);
    messagesDiv.scrollTop = messagesDiv.scrollHeight;
}

export function addSystemMessage(text) {
    const msgEl = document.createElement("div");
    msgEl.classList.add("message", "system");
    msgEl.innerHTML = `<em>⚙️ ${escapeHTML(text)}</em>`;
    messagesDiv.appendChild(msgEl);
    messagesDiv.scrollTop = messagesDiv.scrollHeight;
}

function getChannelInitial(name) {
    return String(name || "?").trim().charAt(0).toUpperCase() || "?";
}

export function renderChannels(channels, onJoinChannel) {
    channelList.innerHTML = "";

    channels.forEach(channel => {
        const li = document.createElement("li");
        const initial = getChannelInitial(channel.name);
        const channelImg = String(channel.img || "").trim();

        li.classList.add("server-channel-item");
        li.dataset.channelId = channel.id;
        li.title = channel.name || "Canal";

        if (channelImg) {
            li.innerHTML = `
                <img class="server-channel-img" src="${escapeHTML(channelImg)}" alt="${escapeHTML(channel.name || "Canal")}">
                <span class="server-channel-letter hidden">${escapeHTML(initial)}</span>
            `;

            const img = li.querySelector(".server-channel-img");
            const letter = li.querySelector(".server-channel-letter");

            img.addEventListener("error", () => {
                img.remove();
                letter.classList.remove("hidden");
            });
        } else {
            li.innerHTML = `<span class="server-channel-letter">${escapeHTML(initial)}</span>`;
        }

        li.addEventListener("click", () => onJoinChannel(channel.id));
        channelList.appendChild(li);
    });
}

export function setActiveChannel(channel) {
    currentChannel = channel;
    currentChannelName.textContent = `# ${channel.name}`;

    document.querySelectorAll("#channelList .server-channel-item").forEach(item => {
        item.classList.toggle("active", Number(item.dataset.channelId) === Number(channel.id));
    });

    if (channelInfoPanel && !channelInfoPanel.classList.contains("hidden")) {
        renderChannelInfo(currentInfoType);
    }

    if (messageInput) {
        messageInput.disabled = false;
        messageInput.placeholder = `Enviar mensaje a #${channel.name}`;
    }

    if (sendButton) sendButton.disabled = false;
}

export function showNoChannels(message) {
    clearMessages();
    currentChannelName.textContent = "Sin canales";
    addSystemMessage(message);

    if (messageInput) {
        messageInput.disabled = true;
        messageInput.placeholder = "No tienes canales asignados";
    }

    if (sendButton) sendButton.disabled = true;
}

export function showSocketError(message) {
    addSystemMessage(message || "Ocurrió un error en el chat.");
}

export function updateUserList(users) {
    userList.innerHTML = "";

    users.forEach(u => {
        const li = document.createElement("li");
        li.classList.add("user-item");

        li.innerHTML = `
            <div class="user-avatar">
                <img src="${escapeHTML(u.img)}" alt="${escapeHTML(u.name)}" class="avatar-img">
                <span class="status ${u.connected ? "online" : "offline"}"></span>
            </div>
            <div class="user-info">
                <span class="user-name">${escapeHTML(u.name)}</span>
                <small class="user-role">${escapeHTML(u.rol)}</small>
            </div>
        `;

        userList.appendChild(li);
    });
}

export function showUserList(list, show) {
    if (show) {
        list.classList.add("active");
    } else {
        list.classList.remove("active");
    }
}

export function clearUser() {
    localStorage.removeItem("user");
}

export function redirectToLogin() {
    window.location.href = "/login.html";
}
