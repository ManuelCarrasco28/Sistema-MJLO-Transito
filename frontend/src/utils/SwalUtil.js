import Swal from 'sweetalert2';

export const showToast = (title, icon = 'success', timer = 2800) => {
    return Swal.fire({
        toast: true,
        position: 'top-end',
        icon: icon,
        title: title,
        showConfirmButton: false,
        timer: timer,
        timerProgressBar: true,
        showClass: {
            popup: 'swal2-toast-in'
        },
        hideClass: {
            popup: 'swal2-toast-out'
        },
        didOpen: (toast) => {
            toast.addEventListener('mouseenter', Swal.stopTimer)
            toast.addEventListener('mouseleave', Swal.resumeTimer)
        }
    });
};

/**
 * options.confirmColor / options.cancelColor: color sólido (ej. un valor
 * oklch(...)) para aplicar como estilo inline al botón, sin tocar el estilo
 * por defecto (bg-rose-600 con sombra) que usan los demás módulos.
 */
export const showConfirm = (title, text, confirmText = 'Sí, continuar', cancelText = 'Cancelar', options = {}) => {
    const { confirmColor, cancelColor } = options;
    return Swal.fire({
        title: title,
        text: text,
        icon: 'warning',
        showCancelButton: true,
        confirmButtonText: confirmText,
        cancelButtonText: cancelText,
        buttonsStyling: false,
        reverseButtons: true,
        customClass: {
            popup: 'rounded-3xl shadow-2xl border border-slate-200 dark:border-slate-700 dark:bg-slate-900',
            title: 'text-xl font-black text-slate-800 dark:text-white mt-2',
            htmlContainer: 'text-sm font-medium text-slate-500 dark:text-slate-400 mt-2',
            actions: 'flex gap-3 w-full justify-center mt-6',
            confirmButton: confirmColor
                ? 'rounded-xl px-6 py-2.5 text-sm font-bold text-white transition-all hover:opacity-90 active:scale-95'
                : 'rounded-xl bg-rose-600 px-6 py-2.5 text-sm font-bold text-white shadow-md shadow-rose-600/20 transition-all hover:bg-rose-700 hover:scale-[1.02] active:scale-95',
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

export const showError = (title, text) => {
    return Swal.fire({
        icon: 'error',
        title: title,
        text: text,
        confirmButtonText: 'Entendido',
        buttonsStyling: false,
        customClass: {
            popup: 'rounded-3xl shadow-2xl border border-rose-100 dark:border-rose-900/30 dark:bg-slate-900',
            title: 'text-xl font-black text-slate-800 dark:text-white mt-2',
            htmlContainer: 'text-sm font-medium text-slate-500 dark:text-slate-400 mt-2',
            confirmButton: 'rounded-xl bg-slate-900 dark:bg-white px-8 py-2.5 text-sm font-bold text-white dark:text-slate-900 shadow-md transition-all hover:scale-[1.02] active:scale-95 mt-4',
            icon: 'border-rose-500 text-rose-500 scale-110',
        }
    });
};

export const showSuccess = (title, text) => {
    return Swal.fire({
        icon: 'success',
        title: title,
        text: text,
        confirmButtonText: '¡Genial!',
        buttonsStyling: false,
        customClass: {
            popup: 'rounded-3xl shadow-2xl border border-emerald-100 dark:border-emerald-900/30 dark:bg-slate-900 p-6',
            title: 'text-2xl font-black text-slate-800 dark:text-white mt-3',
            htmlContainer: 'text-sm font-medium text-slate-500 dark:text-slate-400 mt-2',
            confirmButton: 'rounded-xl bg-emerald-600 px-8 py-2.5 text-sm font-extrabold text-white shadow-md shadow-emerald-600/20 transition-all hover:bg-emerald-700 hover:scale-[1.02] active:scale-95 mt-5',
            icon: 'border-emerald-500 text-emerald-500 scale-125 mb-2',
        }
    });
};

export const loading = (title, text) => {
    Swal.fire({
        title: title,
        text: text,
        allowOutsideClick: false,
        allowEscapeKey: false,
        showConfirmButton: false,
        didOpen: () => {
            Swal.showLoading();
        },
        customClass: {
            popup: 'rounded-3xl shadow-2xl border border-slate-200 dark:border-slate-700 dark:bg-slate-900',
            title: 'text-lg font-bold text-slate-800 dark:text-white mt-4',
            htmlContainer: 'text-sm font-medium text-slate-500 dark:text-slate-400',
        }
    });
};

export const closeLoading = () => {
    Swal.close();
};
