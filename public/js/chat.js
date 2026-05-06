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

    const profilePic = document.getElementById("profilePic");
    if (profilePic) {
        profilePic.src = user.img || "https://i.pravatar.cc/150";
        profilePic.onerror = () => {
            profilePic.src = "https://i.pravatar.cc/150";
        };
    }

    const chatForm = document.getElementById("chatForm");
    const messageInput = document.getElementById("messageInput");
    const logoutBtn = document.getElementById("logoutBtn");
    const sidebar = document.getElementById("userSidebar");
    const toggleBtn = document.getElementById("usersToggle");
    const closeBtn = document.getElementById("closeSidebar");

    const messages = document.getElementById("messages");

    /* =========================
       🔥 AUTO SCROLL CHAT FIX
    ========================= */
    const scrollToBottom = () => {
        if (!messages) return;

        requestAnimationFrame(() => {
            messages.scrollTop = messages.scrollHeight;

            const chatMain = messages.closest(".chat-main");
            if (chatMain) {
                chatMain.scrollTop = chatMain.scrollHeight;
            }
        });
    };

    const observer = new MutationObserver((mutations) => {
        mutations.forEach((mutation) => {
            if (mutation.addedNodes.length > 0) {
                scrollToBottom();
            }
        });
    });

    observer.observe(messages, {
        childList: true,
        subtree: true,
        characterData: true
    });

    const selectedChannelId = localStorage.getItem("selectedChannelId");
    connect(user, selectedChannelId);
    localStorage.removeItem("selectedChannelId");

    setTimeout(scrollToBottom, 300);

    chatForm.addEventListener("submit", function (e) {
        e.preventDefault();
        const text = messageInput.value.trim();

        if (text) {
            sendMessage(text);
            messageInput.value = "";

            setTimeout(scrollToBottom, 0);
            setTimeout(scrollToBottom, 50);
            setTimeout(scrollToBottom, 150);
        }
    });

    logoutBtn.addEventListener("click", function () {
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

const channelSidebar = document.querySelector(".channel-sidebar");
const toggleChannels = document.querySelector(".channel-arrow");

if (toggleChannels && channelSidebar) {
    toggleChannels.addEventListener("click", (e) => {
        e.stopPropagation();

        // 🔥 FIX: solo en móvil
        if (window.innerWidth <= 768) {
            channelSidebar.classList.toggle("open");
        }
    });
}

if (toggleChannels && channelSidebar) {
    document.addEventListener("click", (e) => {
        if (window.innerWidth > 768) return; // 🔥 FIX desktop bloqueado

        if (
            !channelSidebar.contains(e.target) &&
            !toggleChannels.contains(e.target)
        ) {
            channelSidebar.classList.remove("open");
        }
    });
}
}

initChat().catch((err) => {
    console.error("Error iniciando chat:", err);
    clearUser();
    redirectToLogin();
});