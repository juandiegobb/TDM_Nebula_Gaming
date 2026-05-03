import { getCurrentUser } from "./services/api.js";
import { connect, sendMessage } from "./web/chatSocket.js";
import { showUserList, clearUser, redirectToLogin, showChannelInfo } from "./ui/chatUI.js";

async function loadUser() {
    const localUser = JSON.parse(localStorage.getItem("user"));
    if (localUser) return localUser;

    const data = await getCurrentUser();
    if (!data.authenticated) return null;

    localStorage.setItem("user", JSON.stringify(data.user));
    return data.user;
}

async function initChat() {
    const user = await loadUser();
    if (!user) {
        redirectToLogin();
        return;
    }

    document.getElementById("chat-username").textContent = "Bienvenido " + user.name;

    const chatForm = document.getElementById("chatForm");
    const messageInput = document.getElementById("messageInput");
    const logoutBtn = document.getElementById("logoutBtn");
    const sidebar = document.getElementById("userSidebar");
    const toggleBtn = document.getElementById("usersToggle");
    const closeBtn = document.getElementById("closeSidebar");

    const selectedChannelId = localStorage.getItem("selectedChannelId");
    connect(user, selectedChannelId);
    localStorage.removeItem("selectedChannelId");

    chatForm.addEventListener("submit", function(e) {
        e.preventDefault();
        const text = messageInput.value.trim();

        if (text) {
            sendMessage(text);
            messageInput.value = "";
        }
    });

    logoutBtn.addEventListener("click", function() {
        clearUser();
        window.location.href = "/auth/logout";
    });

    toggleBtn.addEventListener("click", () => {
        showUserList(sidebar, true);
    });

    closeBtn.addEventListener("click", () => {
        showUserList(sidebar, false);
    });

    document.querySelectorAll('.channel-item[data-action]').forEach(item => {
        item.addEventListener('click', () => {
            const action = item.dataset.action;
            if (!action) return;

            document.querySelectorAll('.channel-item[data-action]').forEach(node => {
                node.classList.toggle('active', node === item);
            });

            showChannelInfo(action);
        });
    });
}

initChat().catch((err) => {
    console.error("Error iniciando chat:", err);
    clearUser();
    redirectToLogin();
});
