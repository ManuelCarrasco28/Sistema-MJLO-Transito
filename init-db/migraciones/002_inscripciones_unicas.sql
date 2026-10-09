-- No elimina registros ni historial financiero. Si existen duplicados, la
-- restricción falla y deben regularizarse explícitamente antes de reintentarlo.
SELECT id_curso, id_persona, COUNT(*) AS duplicados
FROM inscripciones_curso GROUP BY id_curso, id_persona HAVING COUNT(*) > 1;

ALTER TABLE inscripciones_curso ADD UNIQUE KEY IF NOT EXISTS uq_inscripciones_curso_persona (id_curso, id_persona);
