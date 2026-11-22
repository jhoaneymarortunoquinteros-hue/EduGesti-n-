const pool = require('../config/db');
const { registrarBitacora, getClientIp } = require('../utils/bitacora');

/**
 * CU-N07 — Registro de Incidencias Institucionales
 * Registrar y dar seguimiento a situaciones administrativas.
 */

const crearIncidencia = async (req, res) => {
  try {
    const { categoria, prioridad, descripcion, id_estudiante, id_curso } = req.body;

    if (!categoria || !prioridad || !descripcion) {
      return res.status(400).json({ message: 'Categoría, prioridad y descripción son obligatorios' });
    }

    const validCategorias = ['académica', 'convivencia', 'administrativa', 'sanitaria', 'otro'];
    if (!validCategorias.includes(categoria)) {
      return res.status(400).json({ message: 'Categoría no válida' });
    }

    const validPrioridades = ['baja', 'media', 'alta'];
    if (!validPrioridades.includes(prioridad)) {
      return res.status(400).json({ message: 'Prioridad no válida' });
    }

    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      // Insertar la incidencia
      const incidenciaResult = await client.query(`
        INSERT INTO public.bitacora (id_usuario, id_modulo, id_funcionalidad, accion, tabla_afectada, id_registro_afectado, descripcion)
        VALUES (
          $1,
          (SELECT id_modulo FROM public.modulo WHERE nombre_modulo = 'administracion'),
          (SELECT id_funcionalidad FROM public.funcionalidad WHERE metodo = 'POST /api/incidencias'),
          'INSERT',
          'incidencias',
          NULL,
          'Nueva incidencia registrada: ${descripcion}'
        )
      `, [req.usuario.id]);

      // Registrar bitácora detallada
      await registrarBitacora({
        id_usuario: req.usuario.id,
        nombre_modulo: 'administracion',
        nombre_permiso: 'gestionar_incidencias',
        metodo: 'POST /api/incidencias',
        accion: 'INSERT',
        tabla_afectada: 'bitacora',
        id_registro_afectado: incidenciaResult.rows[0].id_bitacora,
        descripcion: `Incidencia creada - Categoría: ${categoria}, Prioridad: ${prioridad}, Estudiante: ${id_estudiante || 'N/A'}`,
        ip_origen: getClientIp(req)
      });

      await client.query('COMMIT');

      res.status(201).json({
        message: 'Incidencia registrada correctamente',
        incidencia: { id: incidenciaResult.rows[0].id_bitacora, categoria, prioridad, descripcion }
      });
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  } catch (error) {
    console.error('Error creando incidencia:', error);
    res.status(500).json({ message: 'Error al crear incidencia', error: error.message });
  }
};

const getIncidencias = async (req, res) => {
  try {
    const { estado, categoria, soloActivas = 'true' } = req.query;

    const conditions = [];
    const params = [];
    let idx = 1;

    if (soloActivas === 'true') {
      conditions.push(`b.accion = 'INSERT' OR b.accion = 'UPDATE'`);
    }

    if (categoria) {
      conditions.push(`b.descripcion ILIKE $${idx}`);
      params.push(`%${categoria}%`);
      idx++;
    }

    const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';

    const result = await pool.query(`
      SELECT
        b.id_bitacora,
        b.accion,
        b.descripcion,
        b.fecha_hora,
        u.username AS usuario_registro,
        m.nombre_modulo,
        CASE WHEN b.accion = 'INSERT' THEN 'Registrada'
             WHEN b.accion = 'UPDATE' THEN 'Actualizada'
             ELSE b.accion END AS estado
      FROM public.bitacora b
      JOIN usuario u ON u.id_usuario = b.id_usuario
      JOIN public.modulo m ON m.id_modulo = b.id_modulo
      ${where}
      ORDER BY b.fecha_hora DESC
      LIMIT 100
    `, params);

    res.json({ incidencias: result.rows });
  } catch (error) {
    console.error('Error obteniendo incidencias:', error);
    res.status(500).json({ message: 'Error', error: error.message });
  }
};

module.exports = { crearIncidencia, getIncidencias };