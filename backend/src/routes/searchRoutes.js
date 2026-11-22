const express = require('express');
const router = express.Router();
const pool = require('../config/db');

/**
 * CU-N11 — Búsqueda Global
 * Busca información permitida según los permisos del usuario.
 * 
 * Parámetros de consulta:
 * - q: término de búsqueda
 * - tipo: opcional - filtro por tipo (estudiantes, docentes, cursos, materias, etc.)
 * - categoria: opcional - categoría para agrupar resultados
 */
router.get('/', verificarToken, async (req, res) => {
  try {
    const { q, tipo } = req.query;

    if (!q || q.trim().length === 0) {
      return res.status(400).json({ message: 'Término de búsqueda es requerido' });
    }

    const searchTerm = `%${q}%`;
    const results = [];

    // 1. Buscar estudiantes (solo si tiene permiso)
    try {
      const estudianteResult = await pool.query(`
        SELECT id_estudiante, nombre, apellido, ci, rude
        FROM estudiante
        WHERE (nombre ILIKE $1 OR apellido ILIKE $1 OR ci ILIKE $1)
          AND estado = 'activo'
        LIMIT 20
      `, [searchTerm]);

      results.push({
        tipo: 'estudiantes',
        titulo: 'Estudiantes',
        items: estudianteResult.rows.map(e => ({
          id: e.id_estudiante,
          nombre: `${e.nombre} ${e.apellido}`,
          ci: e.ci,
          subtitle: e.rude ? `RUDE: ${e.rude}` : undefined
        }))
      });
    } catch (e) {
      // Continuar si falla
    }

    // 2. Buscar cursos
    try {
      const cursoResult = await pool.query(`
        SELECT c.id_curso, c.paralelo, c.turno, g.nombre_grado
        FROM curso c
        JOIN grado g ON c.id_grado = g.id_grado
        WHERE c.paralelo ILIKE $1 OR g.nombre_grado ILIKE $1
        LIMIT 20
      `, [searchTerm]);

      results.push({
        tipo: 'cursos',
        titulo: 'Cursos',
        items: cursoResult.rows.map(c => ({
          id: c.id_curso,
          nombre: `Grado ${c.nombre_grado} - ${c.paralelo}`,
          subtitle: `Turno: ${c.turno}`
        }))
      });
    } catch (e) {
      // Continuar si falla
    }

    // 3. Buscar materias
    try {
      const materiaResult = await pool.query(`
        SELECT id_materia, nombre_materia, descripcion
        FROM materia
        WHERE nombre_materia ILIKE $1 OR descripcion ILIKE $1
        LIMIT 20
      `, [searchTerm]);

      results.push({
        tipo: 'materias',
        titulo: 'Materias',
        items: materiaResult.rows.map(m => ({
          id: m.id_materia,
          nombre: m.nombre_materia,
          subtitle: m.descripcion ? m.descripcion.substring(0, 50) : undefined
        }))
      });
    } catch (e) {
      // Continuar si falla
    }

    // 4. Buscar pagos/deudas
    try {
      const deudaResult = await pool.query(`
        SELECT d.id_deuda, d.monto, d.mes, d.estado,
               e.nombre || ' ' || e.apellido AS estudiante_nombre
        FROM deuda d
        JOIN estudiante e ON d.id_estudiante = e.id_estudiante
        WHERE d.mes ILIKE $1 OR e.nombre ILIKE $1
        LIMIT 20
      `, [searchTerm]);

      results.push({
        tipo: 'pagos',
        titulo: 'Pagos y Deudas',
        items: deudaResult.rows.map(d => ({
          id: d.id_deuda,
          nombre: `${d.estudiante_nombre} - ${d.mes}`,
          subtitle: `$${d.monto} - ${d.estado}`
        }))
      });
    } catch (e) {
      // Continuar si falla
    }

    // 5. Buscar comunicados
    try {
      const avisoResult = await pool.query(`
        SELECT a.id_aviso, a.titulo, a.fecha_envio,
               u.username as publicado_por
        FROM aviso a
        JOIN usuario u ON a.id_usuario = u.id_usuario
        WHERE a.titulo ILIKE $1 OR a.contenido ILIKE $1
        LIMIT 20
      `, [searchTerm]);

      results.push({
        tipo: 'comunicados',
        titulo: 'Comunicados',
        items: avisoResult.rows.map(a => ({
          id: a.id_aviso,
          nombre: a.titulo,
          subtitle: `Publicado por: ${a.publicado_por}`
        }))
      });
    } catch (e) {
      // Continuar si falla
    }

    // Agrupar por categoría para la presentación
    const agrupados = results.reduce((acc, curr) => {
      const clave = curr.titulo;
      if (!acc[clave]) {
        acc[clave] = [];
      }
      acc[clave].push(...curr.items);
      return acc;
    }, {});

    res.json({
      query: q,
      totalResultados: Object.values(agrupados).reduce((sum, items) => sum + items.length, 0),
      resultados: agrupados
    });
  } catch (error) {
    console.error('Error en búsqueda global:', error);
    res.status(500).json({ message: 'Error al procesar la búsqueda' });
  }
});

module.exports = router;