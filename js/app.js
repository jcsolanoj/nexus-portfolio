const GOOGLE_APPS_SCRIPT_WEB_APP_URL =
  "https://script.google.com/macros/s/AKfycbz0FvkubAJNc4fR6tdk_dl_4jysVxBPC2gtCq5hXTeGYpeeA39UdxdERYPopVQJbZ60/exec";

document.addEventListener("DOMContentLoaded", () => {
  initLiteYouTubeFacades();
  initProjectFilters();
  initContactDialog();
});

/**
 * Inyecta el iframe de youtube-nocookie solo cuando el usuario hace clic.
 */
function initLiteYouTubeFacades() {
  const facades = document.querySelectorAll(".yt-facade[data-video-id]");
  facades.forEach((facade) => {
    const btn = facade.querySelector(".yt-play-btn");
    if (!btn) return;

    btn.addEventListener("click", () => {
      const videoId = facade.dataset.videoId;
      const title = facade.dataset.videoTitle || "Demo en video";
      if (!videoId) return;

      const iframe = document.createElement("iframe");
      iframe.src = `https://www.youtube-nocookie.com/embed/${encodeURIComponent(videoId)}?autoplay=1&rel=0`;
      iframe.title = title;
      iframe.setAttribute("referrerpolicy", "strict-origin-when-cross-origin");
      iframe.setAttribute(
        "allow",
        "accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
      );
      iframe.allowFullscreen = true;

      facade.replaceChildren(iframe);
    });
  });
}

/**
 * Filtra las tarjetas del bloque de herramientas y automatizaciones.
 */
function initProjectFilters() {
  const buttons = document.querySelectorAll(".filter-btn[data-filter]");
  const cards = document.querySelectorAll(".tool-card[data-category]");
  if (!buttons.length || !cards.length) return;

  buttons.forEach((btn) => {
    btn.addEventListener("click", () => {
      const target = btn.dataset.filter;

      buttons.forEach((b) => {
        b.classList.remove("is-active");
        b.setAttribute("aria-pressed", "false");
      });
      btn.classList.add("is-active");
      btn.setAttribute("aria-pressed", "true");

      cards.forEach((card) => {
        const categories = (card.dataset.category || "").split(/\s+/);
        const visible = target === "all" || categories.includes(target);
        card.classList.toggle("is-hidden", !visible);
      });
    });
  });
}

/**
 * Controla el modal nativo <dialog>, fallback de light-dismiss y envío seguro al webhook GAS.
 */
function initContactDialog() {
  const dialog = document.getElementById("contactModal");
  const form = document.getElementById("contactForm");
  const subjectSelect = document.getElementById("contactSubject");
  const messageInput = document.getElementById("contactMessage");
  const statusEl = document.getElementById("contactStatus");
  const submitBtn = document.getElementById("contactSubmitBtn");
  const closeBtn = document.getElementById("closeContactModal");
  const cancelBtn = document.getElementById("cancelContactModal");

  if (!dialog || !form) return;

  let modalOpenedAt = 0;

  function openContactModal(presetSubject = "") {
    if (presetSubject && subjectSelect) {
      const hasOption = Array.from(subjectSelect.options).some((opt) => opt.value === presetSubject);
      if (hasOption) {
        subjectSelect.value = presetSubject;
      }
    }
    statusEl.textContent = "";
    statusEl.className = "form-status";
    modalOpenedAt = performance.now();
    dialog.showModal();
  }

  document.querySelectorAll("[data-open-contact]").forEach((trigger) => {
    trigger.addEventListener("click", () => {
      openContactModal(trigger.dataset.openContact || "");
    });
  });

  closeBtn?.addEventListener("click", () => dialog.close());
  cancelBtn?.addEventListener("click", () => dialog.close());

  // Fallback obligatorio para navegadores sin closedby="any"
  if (!("closedBy" in HTMLDialogElement.prototype)) {
    dialog.addEventListener("click", (event) => {
      if (event.target !== dialog) return;
      const rect = dialog.getBoundingClientRect();
      const isDialogContent =
        rect.top <= event.clientY &&
        event.clientY <= rect.top + rect.height &&
        rect.left <= event.clientX &&
        event.clientX <= rect.left + rect.width;
      if (!isDialogContent) {
        dialog.close();
      }
    });
  }

  form.addEventListener("submit", async (event) => {
    event.preventDefault();

    const fromName = document.getElementById("contactName").value.trim();
    const replyTo = document.getElementById("contactEmail").value.trim();
    const subject = subjectSelect.value.trim();
    const message = messageInput.value.trim();
    const honeypot = document.getElementById("contactWebsite").value.trim();
    const elapsedMs = performance.now() - modalOpenedAt;

    if (honeypot) {
      form.reset();
      dialog.close();
      return;
    }

    if (modalOpenedAt && elapsedMs < 2500) {
      statusEl.textContent = "Por favor tómate un momento para revisar tu mensaje antes de enviarlo.";
      statusEl.className = "form-status is-error";
      return;
    }

    if (fromName.length < 2 || message.length < 10) {
      statusEl.textContent = "Cuéntanos brevemente qué necesitas (mínimo 10 caracteres).";
      statusEl.className = "form-status is-error";
      return;
    }

    submitBtn.disabled = true;
    submitBtn.setAttribute("aria-busy", "true");
    submitBtn.textContent = "Enviando...";
    statusEl.textContent = "";
    statusEl.className = "form-status";

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10000);

    try {
      const payload = new URLSearchParams({
        source: "nexus-portfolio-hub",
        from_name: fromName,
        reply_to: replyTo,
        subject: subject,
        message: message,
        form_age_ms: String(Math.round(elapsedMs)),
        honeypot: honeypot,
      });

      await fetch(GOOGLE_APPS_SCRIPT_WEB_APP_URL, {
        method: "POST",
        mode: "no-cors",
        body: payload,
        signal: controller.signal,
      });

      form.reset();
      statusEl.textContent = "Mensaje enviado. Te responderemos pronto a tu correo.";
      statusEl.className = "form-status is-success";
      setTimeout(() => {
        if (dialog.open) dialog.close();
      }, 2200);
    } catch {
      statusEl.textContent =
        "No se pudo confirmar el envío en este momento. Intenta de nuevo en unos segundos.";
      statusEl.className = "form-status is-error";
    } finally {
      clearTimeout(timeoutId);
      submitBtn.disabled = false;
      submitBtn.removeAttribute("aria-busy");
      submitBtn.textContent = "Enviar mensaje";
    }
  });
}
