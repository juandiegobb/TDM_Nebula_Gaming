const messagesDiv = document.getElementById("messages");
const userList = document.getElementById("userList");
const channelList = document.getElementById("channelList");
const currentChannelName = document.getElementById("currentChannelName");
const messageInput = document.getElementById("messageInput");
const sendButton = document.querySelector(".send-btn");

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

    msgEl.classList.add("message");
    if (isSelf) msgEl.classList.add("self");
    if (isAdmin) msgEl.classList.add("admin-message");

    msgEl.innerHTML = `
        <div class="message-header">
            <span class="message-user">${escapeHTML(userName)}</span>
            ${isAdmin ? '<span class="message-role">ADMIN</span>' : ''}
        </div>
        <div class="message-text">${escapeHTML(text)}</div>
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

export function renderChannels(channels, onJoinChannel) {
    channelList.innerHTML = "";

    channels.forEach(channel => {
        const li = document.createElement("li");
        li.classList.add("channel-item");
        li.dataset.channelId = channel.id;
        li.innerHTML = `<i class="fa-solid fa-hashtag"></i><span>${escapeHTML(channel.name)}</span>`;
        li.addEventListener("click", () => onJoinChannel(channel.id));
        channelList.appendChild(li);
    });
}

export function setActiveChannel(channel) {
    currentChannelName.textContent = `# ${channel.name}`;

    document.querySelectorAll(".channel-item").forEach(item => {
        item.classList.toggle("active", Number(item.dataset.channelId) === Number(channel.id));
    });

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
