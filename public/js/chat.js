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

            // Respaldo para vistas donde el scroll quede en el contenedor principal.
            const chatMain = messages.closest(".chat-main");
            if (chatMain) {
                chatMain.scrollTop = chatMain.scrollHeight;
            }
        });
    };

    // Observa nuevos mensajes (MUY IMPORTANTE) - detecta cambios inmediatos
    const observer = new MutationObserver((mutations) => {
        // Scroll inmediato cuando detecta nuevos nodos
        mutations.forEach((mutation) => {
            if (mutation.addedNodes.length > 0) {
                scrollToBottom();
            }
        });
    });

    // Configuración más robusta del observer
    observer.observe(messages, { 
        childList: true,
        subtree: true,
        characterData: true
    });

    const selectedChannelId = localStorage.getItem("selectedChannelId");
    connect(user, selectedChannelId);
    localStorage.removeItem("selectedChannelId");
    
    // Scroll inicial después de conectar
    setTimeout(scrollToBottom, 300);

    chatForm.addEventListener("submit", function (e) {
        e.preventDefault();
        const text = messageInput.value.trim();

        if (text) {
            sendMessage(text);
            messageInput.value = "";

            // Fuerza scroll múltiple para asegurar que funcione
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

<<<<<<< Updated upstream
    const toggleChannels = document.querySelector(".channel-arrow");
    const channelSidebar = document.querySelector(".channel-sidebar");

    if (toggleChannels && channelSidebar) {
        toggleChannels.addEventListener("click", (e) => {
            e.stopPropagation();
            channelSidebar.classList.toggle("open");
=======
        /* =========================
    TOGGLE SIDEBAR CANALES (MÓVIL)
    ========================= */
    const channelSidebar = document.querySelector(".channel-sidebar");
    const channelArrow = document.querySelector(".channel-arrow");
    if (channelArrow && channelSidebar) {
       channelArrow.addEventListener("click", (e) => {
        e.stopPropagation(); 
        channelSidebar.classList.toggle("open");
>>>>>>> Stashed changes
        });
    }

    document.addEventListener("click", (e) => {
<<<<<<< Updated upstream
        if (!channelSidebar || !toggleChannels) return;

        if (!channelSidebar.contains(e.target) && !toggleChannels.contains(e.target)) {
            channelSidebar.classList.remove("open");
        }
    });
    }
=======
    if (
        channelSidebar.classList.contains("open") &&
        !channelSidebar.contains(e.target) &&
        !channelArrow.contains(e.target)
    ) {
        channelSidebar.classList.remove("open");
    }
});
}
>>>>>>> Stashed changes

initChat().catch((err) => {
    console.error("Error iniciando chat:", err);
    clearUser();
    redirectToLogin();
});