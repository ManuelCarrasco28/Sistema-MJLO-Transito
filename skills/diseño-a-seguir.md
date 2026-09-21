---
name: design-system-premium
description: Guía maestra y enciclopédica de patrones UI/UX para crear interfaces premium, limpias y modernas con React y Tailwind CSS.
---

# Design System Maestro (React + Tailwind CSS)

Este documento actúa como la **Regla de Diseño Suprema (Skill)** para la creación, refactorización y auditoría de cualquier módulo, vista CRUD o componente de este proyecto (y cualquier otro proyecto donde se importe esta skill). 

El objetivo principal es mantener una estética **"Premium"**, moderna, limpia y compacta. Se prohíbe el desarrollo de interfaces que luzcan genéricas, básicas o con el anticuado aspecto de "hoja de cálculo" (estilo Excel). Todo componente debe sentirse táctil, fluido y altamente profesional.

A continuación, se documentan las reglas exactas para cada bloque de la interfaz:

---

## 1. Filosofía de Tipografía, Sombras y Colores

1. **Jerarquía Tipográfica:** 
   - Títulos principales y números de impacto: `font-black`, `font-extrabold` con un espaciado reducido (`tracking-tight`).
   - Textos secundarios, etiquetas y metadatos: `font-medium` o `font-semibold` utilizando colores atenuados (`text-slate-500` o `text-slate-400`).
2. **Uso del Color:** 
   - Se evitan los colores crudos predeterminados del navegador. Usa paletas semánticas refinadas (ej. `indigo`, `cyan`, `amber`, `rose`, `emerald`, `slate`).
   - Los elementos flotantes o interactivos deben usar sombras tintadas (ej. `shadow-indigo-500/25` o `shadow-cyan-500/20`) en lugar de grises puros, para generar un efecto de brillo y profundidad moderna.
3. **Márgenes y Redondeo:**
   - La interfaz debe priorizar curvas suaves (`rounded-xl`, `rounded-2xl`, `rounded-3xl` para modales). Los bordes duros (`rounded-none` o `rounded-sm`) están reservados solo para excepciones.

---

## 2. Page Header (Cabecera Principal)

La cabecera de cada módulo debe transmitir claridad inmediata.
- **Estructura:** Flexbox horizontal (`flex flex-col sm:flex-row sm:items-center sm:justify-between`).
- **Icono Heroico:** En el extremo izquierdo, usar un contenedor cuadrado redondeado (`size-11 rounded-2xl`). Aplicar un degradado de fondo (ej. `bg-gradient-to-br from-indigo-600 to-violet-600`) y una sombra tintada (`shadow-md shadow-indigo-500/25`).
- **Textos:** Título en `text-2xl font-black text-slate-900`. Subtítulo descriptivo justo debajo en `text-xs font-medium text-slate-500`.

---

## 3. Tarjetas KPI (Dashboards Compactos)

Los indicadores clave deben mostrar alta densidad de información sin consumir excesivo espacio vertical.
- **Grid:** Utilizar contenedores responsivos (ej. `grid-cols-2 sm:grid-cols-3 lg:grid-cols-5`).
- **Aspecto de la Tarjeta:** Padding mínimo (`px-3.5 py-2.5`). Usar bordes sutiles pero coloridos (`border-[1.5px] border-indigo-400`) en lugar de sombras pesadas que ensucien el fondo.
- **Micro-Icono:** Un pequeño contenedor (`size-6 rounded-md`) con un fondo extremadamente claro (`bg-indigo-50`) alojando el icono semántico (`text-indigo-600`) en la esquina superior derecha.
- **Interacción (Hover):** Al pasar el cursor, la tarjeta debe elevarse sutilmente ajustando la sombra (`transition-all shadow-2xs hover:shadow-xs`).

---

## 4. Tablas de Datos (Clean Data Grids)

Eliminar por completo la apariencia tradicional de celdas cuadradas y bordes densos.
- **Sin Bordes Verticales:** Queda prohibido el uso de `divide-x` o `border-l` (excepto en columnas sticky). Separar las filas únicamente con suaves divisiones horizontales (`divide-y divide-slate-100`).
- **Efecto Hover en Filas:** Al hacer hover sobre un registro, iluminar la fila entera para unificar los datos visualmente (`hover:bg-cyan-50/30`).
- **Agrupación de Datos:** En lugar de crear decenas de columnas, agrupar datos relacionados en una misma celda. Por ejemplo, nombre en negrita arriba (`text-[13px]`) y debajo el email o teléfono atenuado (`text-xs text-slate-500 truncate`).
- **Columna de Acciones Sticky:** La última columna de la tabla (Acciones) debe estar anclada a la derecha (`sticky right-0 z-10 bg-white`). Debe separarse visualmente proyectando una suave sombra hacia la izquierda (`shadow-[-4px_0_8px_rgba(0,0,0,0.03)]`) para dar la ilusión de flotar sobre los registros que se desplazan.
- **Botones de Tabla:** Deben ser compactos y cuadrados (`size-8`), con íconos semánticos (Ver=Cyan, Editar=Ambar, Eliminar=Rose) y bordes redondeados (`rounded-lg`).

---

## 5. Paginación Compacta en Bloques (Chunked Pagination)

Para soportar el crecimiento ilimitado de datos sin desbordar la interfaz gráfica:
- **Minimalismo:** Eliminar textos innecesarios como "Mostrando X de Y registros". El selector de cantidad de "Filas" debe flotar discretamente a la izquierda (`sm:absolute sm:left-4`).
- **Bloques Fijos (Chunks):** Los botones numéricos de página NO se muestran todos. Se muestran en ventanas o bloques fijos (ej. páginas 1, 2, 3 y 4).
- **Estabilidad Visual:** Al utilizar botones suspensivos (`...`) para saltar de bloque, la botonera debe mantener su ancho constante, permaneciendo estéticamente centrada y equilibrada en todo momento.

---

## 6. Modales (Glassmorphism) y Formularios (Floating Labels)

Los formularios de creación o edición deben sentirse como una experiencia inmersiva.
- **Efecto Backdrop Glassmorphism:** Oscurecer y difuminar severamente el fondo de la aplicación (`bg-slate-950/70 backdrop-blur-xs`) para centrar toda la atención en el modal.
- **Contenedor del Modal:** Usar un radio de borde exagerado pero moderno (`rounded-3xl`) con una sombra prominente (`shadow-2xl`).
- **Botón de Cierre Orgánico:** Una pequeña esfera (`size-9 rounded-full bg-rose-50 text-rose-600 hover:bg-rose-100`) para cerrar el modal, ubicada en la esquina superior derecha.
- **Inputs Estilo Facebook / Google Material (Floating Labels):** 
  - Estructura base: Inputs estandarizados a `h-[42px]` y fuertemente redondeados (`rounded-xl`).
  - Animación del Label: No usar placeholders estáticos. El Label (`label`) debe flotar transicionalmente (`transition-all duration-150`). Si el campo está vacío, el label descansa en el centro vertical. Si el campo recibe foco o tiene un valor, el label salta a la posición `top-1` reduciendo su tamaño a `text-[9.5px]` y tomando un color de acento (`font-bold text-blue-600`).
- **Secciones del Formulario:** Separar lógicamente las áreas (Ej. Datos Personales, Contacto) usando pequeños títulos en mayúsculas (`text-xs font-bold uppercase tracking-wider`) acompañados de un punto de color circular (`size-2 rounded-full`).

---

## 7. Fichas de Detalle (Diccionarios Visuales)

Cuando el objetivo sea visualizar un registro detallado (solo lectura), **jamás** se deben utilizar campos de formulario deshabilitados (`disabled`).
- **Sistema de Sub-Tarjetas:** Agrupar campos en bloques con fondo distinto (`bg-slate-50/60 rounded-2xl border border-slate-200/80 p-3.5`).
- **Alineación Flex Between:** Mostrar cada dato en una fila separada por un borde inferior (`border-b border-slate-200/50 py-1`).
- **Contraste Lectura Rápida:** A la izquierda, la etiqueta del dato muy atenuada y en tamaño mínimo (`text-[11px] font-semibold text-slate-400`). A la derecha extrema, el valor principal en negrita e intensidad máxima (`font-bold text-slate-800 break-all`), logrando que el ojo humano escanee rápidamente los valores de interés.

> **NOTA FINAL PARA AGENTES IA:** Si se te solicita crear o editar una vista en un proyecto que incluye esta skill, tu obligación es replicar EXACTAMENTE los paddings, los efectos hover, el sticky, el floating label y las sombras aquí documentadas. Tu solución debe compilar en una experiencia visual inmaculada y Premium.
