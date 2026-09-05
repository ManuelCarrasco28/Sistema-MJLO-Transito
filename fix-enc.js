const fs = require('fs');

function fixFile(file) {
  if (fs.existsSync(file)) {
    let content = fs.readFileSync(file, 'utf8');
    content = content.replace(/dgitos/g, 'dígitos');
    content = content.replace(/Asociacin/g, 'Asociación');
    content = content.replace(/Inscripcin/g, 'Inscripción');
    content = content.replace(/o/g, '✕');
    content = content.replace(/JOS%/g, 'JOSÉ');
    content = content.replace(/CAPACITACI"N/g, 'CAPACITACIÓN');
    content = content.replace(/N/g, 'N°');
    content = content.replace(/calificacin/g, 'calificación');
    content = content.replace(/Pǧblico/g, 'Público');
    content = content.replace(/AcadǸmico/g, 'Académico');
    content = content.replace(/Trǭnsito/g, 'Tránsito');
    content = content.replace(/Gracias/g, '¡Gracias');
    content = content.replace(/edicin/g, 'edición');
    content = content.replace(/Aǧn/g, 'Aún');
    content = content.replace(/JosǸ/g, 'José');
    
    fs.writeFileSync(file, content, 'utf8');
  }
}

fixFile('frontend/src/pages/CursosSeguridad.jsx');
fixFile('frontend/src/pages/Pagos.jsx');
fixFile('frontend/src/pages/Papeletas.jsx');
