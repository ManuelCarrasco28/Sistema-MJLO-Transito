export function Logo({ sidebar = false }) {
  return (
    <div className={`inline-flex items-center rounded-xl bg-white ${sidebar ? 'p-1.5' : 'p-2.5'} shadow-sm`}>
      <img
        src="/img/logo-mjlo.png"
        alt="Municipalidad Distrital de José Leonardo Ortiz"
        className={sidebar ? 'h-10 w-auto' : 'h-14 w-auto sm:h-16'}
      />
    </div>
  )
}
