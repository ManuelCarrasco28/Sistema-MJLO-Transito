export function PageLoadError({ message = 'No se pudo mostrar la información en este momento.' }) {
  return (
    <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm font-bold text-amber-800 dark:border-amber-900/60 dark:bg-amber-950/40 dark:text-amber-200">
      {message}
      <span className="ml-1 font-semibold">Actualiza la página o vuelve a intentarlo en unos segundos.</span>
    </div>
  )
}
