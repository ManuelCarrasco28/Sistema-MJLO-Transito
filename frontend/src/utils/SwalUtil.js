import Swal from 'sweetalert2';

function detectActionType(message, explicitType) {
  if (explicitType) {
    const t = String(explicitType).toLowerCase()
    if (['crear', 'create', 'agregar', 'agregado', 'success'].includes(t)) return 'crear'
    if (['editar', 'edit', 'actualizar', 'actualizado', 'warning'].includes(t)) return 'editar'
    if (['eliminar', 'delete', 'eliminado', 'anular', 'anulado', 'danger'].includes(t)) return 'eliminar'
    if (['error', 'fallo'].includes(t)) return 'error'
    if (['info', 'informacion'].includes(t)) return 'info'
    return 'crear'
  }

  const msg = String(message || '').toLowerCase()
  if (msg.includes('eliminad') || msg.includes('anulad') || msg.includes('desactivad') || msg.includes('borrad')) {
    return 'eliminar'
  }
  if (msg.includes('actualizad') || msg.includes('editad') || msg.includes('modificad') || msg.includes('restablecid')) {
    return 'editar'
  }
  if (msg.includes('agregad') || msg.includes('registrad') || msg.includes('cread') || msg.includes('emitid') || msg.includes('inscrit') || msg.includes('guardad') || msg.includes('asignad') || msg.includes('aplicad')) {
    return 'crear'
  }
  return 'crear'
}

function escapeHtml(str) {
  if (!str) return ''
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;')
}

const ACTION_CONFIG = {
  crear: {
    etiqueta: 'Registro exitoso',
    accentBorder: '#10b981',
    barColor: '#10b981',
    tagColor: 'text-emerald-700 dark:text-emerald-400',
    tagStyle: 'color: #047857;',
    iconWrapClass: 'bg-emerald-50 text-emerald-600 border border-emerald-200/80 dark:bg-emerald-950/60 dark:text-emerald-400 dark:border-emerald-800/60',
    iconWrapStyle: 'background-color: #ecfdf5; border-color: #a7f3d0; color: #059669;',
    iconSvg: '<svg style="width: 1rem; height: 1rem;" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>',
  },
  editar: {
    etiqueta: 'Cambios guardados',
    accentBorder: '#f59e0b',
    barColor: '#f59e0b',
    tagColor: 'text-amber-700 dark:text-amber-400',
    tagStyle: 'color: #b45309;',
    iconWrapClass: 'bg-amber-50 text-amber-600 border border-amber-200/80 dark:bg-amber-950/60 dark:text-amber-400 dark:border-amber-800/60',
    iconWrapStyle: 'background-color: #fffbeb; border-color: #fde68a; color: #d97706;',
    iconSvg: '<svg style="width: 1rem; height: 1rem;" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 20h9"></path><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"></path></svg>',
  },
  eliminar: {
    etiqueta: 'Registro eliminado',
    accentBorder: '#f43f5e',
    barColor: '#f43f5e',
    tagColor: 'text-rose-700 dark:text-rose-400',
    tagStyle: 'color: #be123c;',
    iconWrapClass: 'bg-rose-50 text-rose-600 border border-rose-200/80 dark:bg-rose-950/60 dark:text-rose-400 dark:border-rose-800/60',
    iconWrapStyle: 'background-color: #fff1f2; border-color: #fecdd3; color: #e11d48;',
    iconSvg: '<svg style="width: 1rem; height: 1rem;" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path><line x1="10" y1="11" x2="10" y2="17"></line><line x1="14" y1="11" x2="14" y2="17"></line></svg>',
  },
  error: {
    etiqueta: 'Error al procesar',
    accentBorder: '#e11d48',
    barColor: '#e11d48',
    tagColor: 'text-rose-700 dark:text-rose-300',
    tagStyle: 'color: #be123c;',
    iconWrapClass: 'bg-rose-50 text-rose-700 border border-rose-300 dark:bg-rose-950/70 dark:text-rose-300 dark:border-rose-700',
    iconWrapStyle: 'background-color: #fff1f2; border-color: #fda4af; color: #be123c;',
    iconSvg: '<svg style="width: 1rem; height: 1rem;" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><line x1="12" y1="6" x2="12" y2="13"></line><line x1="12" y1="18" x2="12.01" y2="18"></line></svg>',
  },
  info: {
    etiqueta: 'Información',
    accentBorder: '#3b82f6',
    barColor: '#3b82f6',
    tagColor: 'text-blue-700 dark:text-blue-400',
    tagStyle: 'color: #1d4ed8;',
    iconWrapClass: 'bg-blue-50 text-blue-600 border border-blue-200/80 dark:bg-blue-950/60 dark:text-blue-400 dark:border-blue-800/60',
    iconWrapStyle: 'background-color: #eff6ff; border-color: #bfdbfe; color: #2563eb;',
    iconSvg: '<svg style="width: 1rem; height: 1rem;" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><line x1="12" y1="11" x2="12" y2="18"></line><line x1="12" y1="6" x2="12.01" y2="6"></line></svg>',
  }
};

let toastContainer = null;

function getOrCreateToastContainer() {
  if (typeof document === 'undefined') return null;
  if (!toastContainer || !document.body.contains(toastContainer)) {
    toastContainer = document.getElementById('mjlo-toast-container');
    if (!toastContainer) {
      toastContainer = document.createElement('div');
      toastContainer.id = 'mjlo-toast-container';
      document.body.appendChild(toastContainer);
    }
  }
  return toastContainer;
}

const MAX_TOASTS_VISIBLES = 2;

export const showToast = (title, iconOrType = null, duration = 3200) => {
  if (typeof document === 'undefined') return;

  const container = getOrCreateToastContainer();
  if (!container) return;

  const actionType = detectActionType(title, iconOrType);
  const cfg = ACTION_CONFIG[actionType] || ACTION_CONFIG.crear;
  const clave = `${actionType}|${title}`;

  // Anti-spam: si ya hay una notificación igual en pantalla no se apila otra, se reinicia su tiempo.
  const repetida = Array.from(container.children).find((el) => el.__clave === clave && el.__reiniciar);
  if (repetida) {
    repetida.__reiniciar(duration);
    return;
  }

  // Máximo de notificaciones visibles a la vez: al llegar una nueva se cierran las más antiguas.
  const visibles = Array.from(container.children).filter((el) => el.__cerrar && !el.classList.contains('toast-out'));
  visibles.slice(0, Math.max(0, visibles.length - (MAX_TOASTS_VISIBLES - 1))).forEach((el) => el.__cerrar());

  const toastEl = document.createElement('div');
  toastEl.__clave = clave;
  toastEl.className = `mjlo-toast-card ${actionType === 'error' ? 'toast-shake' : 'toast-in'}`;
  toastEl.style.borderLeft = `4px solid ${cfg.accentBorder}`;

  toastEl.innerHTML = `
    <div style="display: flex; align-items: flex-start; gap: 0.75rem;">
      <div style="width: 1.75rem; height: 1.75rem; margin-top: 0.125rem; border-radius: 9999px; display: flex; align-items: center; justify-content: center; flex-shrink: 0; color: #ffffff; background-color: ${cfg.barColor}; box-shadow: 0 2px 6px ${cfg.barColor}55;">
        ${cfg.iconSvg}
      </div>
      <div style="flex: 1; min-width: 0; text-align: left; padding-right: 0.25rem;">
        <span class="${cfg.tagColor}" style="display: block; font-size: 10px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.05em; ${cfg.tagStyle}">${cfg.etiqueta}</span>
        <p style="margin: 0.125rem 0 0; font-size: 0.75rem; font-weight: 600; line-height: 1.35; color: inherit; word-break: break-word;">${escapeHtml(title)}</p>
      </div>
      <button type="button" class="mjlo-toast-close" style="border: none; background: transparent; cursor: pointer; padding: 0.25rem; display: flex; align-items: center; justify-content: center; border-radius: 0.5rem;" aria-label="Cerrar notificación">
        <svg style="width: 0.875rem; height: 0.875rem;" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
      </button>
    </div>
    <div class="toast-progress" style="position: absolute; bottom: 0; left: 0; right: 0; height: 2.5px; border-bottom-left-radius: 1rem; border-bottom-right-radius: 1rem; background-color: ${cfg.barColor}; animation-duration: ${duration}ms;"></div>
  `;

  container.appendChild(toastEl);

  let isClosed = false;
  let timerId = null;

  const removeToast = () => {
    if (isClosed) return;
    isClosed = true;
    if (timerId) clearTimeout(timerId);
    toastEl.classList.remove('toast-in', 'toast-shake');
    toastEl.classList.add('toast-out');
    setTimeout(() => {
      if (toastEl.parentNode) {
        toastEl.parentNode.removeChild(toastEl);
      }
    }, 260);
  };

  timerId = setTimeout(removeToast, duration);

  const bar = toastEl.querySelector('.toast-progress');

  toastEl.__cerrar = removeToast;
  toastEl.__reiniciar = (nuevaDuracion) => {
    if (isClosed) return;
    if (timerId) clearTimeout(timerId);
    if (bar) {
      bar.style.animation = 'none';
      void bar.offsetWidth;
      bar.style.animation = '';
      bar.style.animationDuration = `${nuevaDuracion}ms`;
      bar.style.animationPlayState = 'running';
    }
    timerId = setTimeout(removeToast, nuevaDuracion);
  };

  toastEl.addEventListener('mouseenter', () => {
    if (timerId) clearTimeout(timerId);
    if (bar) bar.style.animationPlayState = 'paused';
  });

  toastEl.addEventListener('mouseleave', () => {
    if (bar) bar.style.animationPlayState = 'running';
    timerId = setTimeout(removeToast, 1200);
  });

  const closeBtn = toastEl.querySelector('.mjlo-toast-close');
  if (closeBtn) {
    closeBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      removeToast();
    });
  }
};

showToast.created = (title, timer) => showToast(title, 'crear', timer);
showToast.updated = (title, timer) => showToast(title, 'editar', timer);
showToast.deleted = (title, timer) => showToast(title, 'eliminar', timer);
showToast.error = (title, timer) => showToast(title, 'error', timer);
showToast.info = (title, timer) => showToast(title, 'info', timer);

// Colores del diálogo según el tema actual (Swal pinta blanco por defecto, también en modo oscuro).
const temaDialogo = () => {
    const oscuro = document.documentElement.classList.contains('dark');
    return {
        oscuro,
        background: oscuro ? '#1C2438' : '#ffffff',
        color: oscuro ? '#f1f5f9' : '#1e293b',
        texto: oscuro ? 'text-sm font-medium !text-slate-300 mt-2' : 'text-sm font-medium !text-slate-700 mt-2',
    };
};

/**
 * options.confirmColor / options.cancelColor: color sólido (ej. un valor
 * oklch(...)) para aplicar como estilo inline al botón, sin tocar el estilo
 * por defecto (bg-rose-600 con sombra) que usan los demás módulos.
 */
export const showConfirm = (title, text, confirmText = 'Sí, continuar', cancelText = 'Cancelar', options = {}) => {
    // Los colores sueltos que pasaban algunas pantallas (rosados distintos entre sí) se ignoran: todos los
    // diálogos usan el mismo botón rojo de confirmar y el gris de cancelar.
    const confirmColor = null, cancelColor = null;
    const oscuro = document.documentElement.classList.contains('dark');
    return Swal.fire({
        title: title,
        text: text,
        background: oscuro ? '#1C2438' : '#ffffff',
        color: oscuro ? '#f1f5f9' : '#1e293b',
        icon: 'warning',
        showCancelButton: true,
        confirmButtonText: confirmText,
        cancelButtonText: cancelText,
        buttonsStyling: false,
        reverseButtons: true,
        customClass: {
            popup: 'rounded-3xl shadow-2xl border border-slate-200 dark:border-slate-700 dark:bg-slate-900',
            title: 'text-xl font-black mt-2',
            htmlContainer: oscuro ? 'text-sm font-medium !text-slate-300 mt-2' : 'text-sm font-medium !text-slate-700 mt-2',
            actions: 'flex gap-3 w-full justify-center mt-6',
            confirmButton: confirmColor
                ? 'rounded-xl px-6 py-2.5 text-sm font-bold text-white transition-all hover:opacity-90 active:scale-95'
                : 'rounded-xl bg-rose-600 px-6 py-2.5 text-sm font-bold text-white shadow-md transition-all hover:bg-rose-700 hover:scale-[1.02] active:scale-95',
            cancelButton: cancelColor
                ? 'rounded-xl px-6 py-2.5 text-sm font-bold text-white transition-all hover:opacity-90 active:scale-95'
                : 'rounded-xl border border-slate-200 bg-white dark:bg-slate-800 dark:border-slate-700 px-6 py-2.5 text-sm font-bold text-slate-700 dark:text-slate-200 shadow-sm transition-all hover:bg-slate-50 dark:hover:bg-slate-700 active:scale-95',
            icon: 'border-rose-500 text-rose-500',
        },
        didOpen: (popup) => {
            if (confirmColor) {
                const btn = popup.querySelector('.swal2-confirm');
                if (btn) btn.style.backgroundColor = confirmColor;
            }
            if (cancelColor) {
                const btn = popup.querySelector('.swal2-cancel');
                if (btn) btn.style.backgroundColor = cancelColor;
            }
        }
    });
};

// Avisos que no son un fallo del sistema sino algo que el usuario debe corregir o que no existe (validaciones,
// datos faltantes, búsquedas sin resultado): se muestran con el triángulo de advertencia. Un error real
// ("Error…", "No se pudo…", "Consulta fallida") lleva la X roja, para poder distinguirlos de un vistazo.
const ES_ADVERTENCIA = /^(atenci[oó]n|validaci[oó]n|revisa|falta|sin |motivo requerido|consulta de (documento|foto)|no se puede|.*(inv[aá]lid|no disponible|requerid|pendiente))/i
const ES_FALLO_REAL = /^(error|no se pudo|consulta fallida|sesi[oó]n)/i

export const showError = (title, text) => {
    const titulo = String(title || '').trim()
    // Un borrado rechazado por tener registros vinculados no es un fallo del sistema: es una regla.
    if (/^no se puede/i.test(String(text || '').trim()) || (ES_ADVERTENCIA.test(titulo) && !ES_FALLO_REAL.test(titulo))) {
        return showWarning(title, text);
    }
    const tema = temaDialogo();
    return Swal.fire({
        background: tema.background,
        color: tema.color,
        icon: 'error',
        title: title,
        text: text,
        confirmButtonText: 'Entendido',
        buttonsStyling: false,
        customClass: {
            popup: 'rounded-3xl shadow-2xl border border-rose-100 dark:border-rose-900/30 dark:bg-slate-900',
            title: 'text-xl font-black mt-2',
            htmlContainer: tema.texto,
            confirmButton: 'rounded-xl bg-slate-900 dark:bg-white px-8 py-2.5 text-sm font-bold text-white dark:text-slate-900 shadow-md transition-all hover:scale-[1.02] active:scale-95 mt-4',
            icon: 'border-rose-500 text-rose-500 scale-110',
        }
    });
};

// Señal de advertencia: triángulo rojo oscuro con interior blanco y exclamación negra
const ICONO_ADVERTENCIA = `<svg viewBox="0 0 100 90" width="92" height="83" aria-hidden="true" xmlns="http://www.w3.org/2000/svg">
  <path d="M50 4 L96 84 Q98 88 93 88 L7 88 Q2 88 4 84 Z" fill="#8b0000" stroke="#8b0000" stroke-width="6" stroke-linejoin="round"/>
  <path d="M50 24 L82 79 L18 79 Z" fill="#fff" stroke="#fff" stroke-width="4" stroke-linejoin="round"/>
  <path d="M46.2 38 Q50 36.5 53.8 38 L52.6 62 Q50 63.5 47.4 62 Z" fill="#000"/>
  <circle cx="50" cy="70" r="4.2" fill="#000"/>
</svg>`

// Advertencia: algo no salió como se esperaba pero no es un error del sistema (ej. una búsqueda sin resultados).
export const showWarning = (title, text) => {
    const tema = temaDialogo();
    return Swal.fire({
        background: tema.background,
        color: tema.color,
        iconHtml: ICONO_ADVERTENCIA,
        title: title,
        text: text,
        confirmButtonText: 'Entendido',
        buttonsStyling: false,
        customClass: {
            popup: 'rounded-3xl shadow-2xl border border-amber-100 dark:border-amber-900/30',
            icon: '!border-0 !bg-transparent',
            title: 'text-xl font-black mt-2',
            htmlContainer: tema.texto,
            confirmButton: 'rounded-xl bg-slate-900 dark:bg-white px-8 py-2.5 text-sm font-bold text-white dark:text-slate-900 shadow-md transition-all hover:scale-[1.02] active:scale-95 mt-4',
        }
    });
};

export const showSuccess = (title, text) => {
    const tema = temaDialogo();
    return Swal.fire({
        background: tema.background,
        color: tema.color,
        icon: 'success',
        title: title,
        text: text,
        confirmButtonText: '¡Genial!',
        buttonsStyling: false,
        customClass: {
            popup: 'rounded-3xl shadow-2xl border border-emerald-100 dark:border-emerald-900/30 dark:bg-slate-900 p-6',
            title: 'text-2xl font-black mt-3',
            htmlContainer: tema.texto,
            confirmButton: 'rounded-xl bg-emerald-600 px-8 py-2.5 text-sm font-extrabold text-white shadow-md transition-all hover:bg-emerald-700 hover:scale-[1.02] active:scale-95 mt-5',
            icon: 'border-emerald-500 text-emerald-500 scale-125 mb-2',
        }
    });
};

export const loading = (title, text, { onCancel } = {}) => {
    const oscuro = document.documentElement.classList.contains('dark');
    return Swal.fire({
        title: title,
        text: text,
        background: oscuro ? '#1C2438' : '#ffffff',
        color: oscuro ? '#f1f5f9' : '#1e293b',
        allowOutsideClick: false,
        allowEscapeKey: false,
        showConfirmButton: false,
        showCancelButton: Boolean(onCancel),
        cancelButtonText: 'Cancelar',
        cancelButtonColor: '#e11d48',
        didOpen: () => {
            Swal.showLoading();
        },
        customClass: {
            popup: 'rounded-3xl shadow-2xl border border-slate-200 dark:border-slate-700 dark:bg-slate-900',
            title: 'text-lg font-bold mt-4',
            htmlContainer: 'text-sm font-medium text-slate-500 dark:text-slate-400',
        }
    }).then(result => {
        if (result.dismiss === Swal.DismissReason.cancel) onCancel?.();
        return result;
    });
};

export const closeLoading = () => {
    Swal.close();
};
