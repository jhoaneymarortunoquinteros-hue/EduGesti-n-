const pool = require('../config/db');
const { registrarBitacora, getClientIp } = require('../utils/bitacora');

/**
 * CU-N04 — Alertas por Inasistencia
 * Detecta estudiantes con inasistencias recurrentes.
 */

const checkAsistenciaAlertas = async (req, res) => {
  try {
    const { periodoDias = 30, nivelRiesgo = 'alto' } = req.query;

    const dias = Number(periodoDias);
    // Fecha de corte: hace 'dias' días
    const fechaCorte = new Date();
    fechaCorte.setDate(fechaCorte.getDate() - dias);

    // Query para contar ausencias por estudiante
    const result = await pool.query(`
      SELECT
        e.id_estudiante,
        e.nombre,
        e.apellido,
        e.ci,
        COUNT(a.id_asistencia) AS total_ausencias,
        COUNT(CASE WHEN a.estado = 'A' THEN 1 END) AS ausencias_no_justificadas,
        COUNT(CASE WHEN a.estado = 'T' THEN 1 END) AS llegadas_tarde,
        MIN(a.fecha) AS primera_fecha,
        MAX(a.fecha) AS ultima_fecha
      FROM estudiante e
      JOIN asistencia a ON a.id_estudiante = e.id_estudiante
      WHERE a.fecha >= $1
        AND e.estado = 'activo'
      GROUP BY e.id_estudiante, e.nombre, e.apellido, e.ci
      HAVING COUNT(a.id_asistencia) >= 5
      ORDER BY ausencias_no_justificadas DESC
      LIMIT 50
    `, [fechaCorte]);

    // Filtrar según nivel de riesgo
    let alertas = result.rows;

    if (nivelRiesgo === 'alto') {
      alertas = alertas.filter(a => 
        a.ausencias_no_justificadas >= Math.ceil(a.total_ausencias * 0.6)
      );
    } else if (nivelRiesgo === 'medio') {
      alertas = alertas.filter(a => 
        a.ausencias_no_justificadas >= Math.ceil(a.total_ausencias * 0.3) &&
        a.ausencias_no_justificadas < Math.ceil(a.total_ausencias * 0.6)
      );
    }

    // Registrar bitácora
    await registrarBitacora({
      id_usuario: req.usuario.id,
      nombre_modulo: 'asistencias',
      nombre_permiso: 'ver_asistencia',
      metodo: 'GET /api/asistencias/alertas',
      accion: 'CONSULTA',
      tabla_afectada: 'asistencia',
      id_registro_afectado: null,
      descripcion: `Consulta de alertas de inasistencia (periodo: ${dias} días, riesgo: ${nivelRiesgo})`,
      ip_origen: getClientIp(req)
    });

    res.json({
      periodo_dias: dias,
      nivel_riesgo: nivelRiesgo,
      total_estudiantes_con_alertas: alertas.length,
      alertas
    });
  } catch (error) {
    console.error('Error en checkAsistenciaAlertas:', error);
    res.status(500).json({ message: 'Error al verificar alertas de asistencia', error: error.message });
  }
};

const getEstudiantesConAlertas = async (req, res) => {
  try {
    const { id_estudiante } = req.query;

    if (id_estudiante) {
      // Obtener alertas para un estudiante específico
      const result = await pool.query(`
        SELECT a.id_asistencia, a.fecha, a.estado, a.observaciones
        FROM asistencia a
        WHERE a.id_estudiante = $1
        ORDER BY a.fecha DESC
      `, [id_estudiante]);

      res.json({ alertas: result.rows });
    } else {
      // Obtener todas las alertas recientes
      const result = await pool.query(`
        SELECT
          e.id_estudiante,
          e.nombre,
          e.apellido,
          e.ci,
          COUNT(a.id_asistencia) AS total,
          COUNT(CASE WHEN a.estado = 'A' THEN 1 END) AS no_justificadas,
          COUNT(CASE WHEN a.estado = 'T' THEN 1 END) AS llegadas_tarde
        FROM estudiante e
        JOIN asistencia a ON a.id_estudiante = e.id_estudiante
        WHERE e.estado = 'activo'
        GROUP BY e.id_estudiante, e.nombre, e.apellido, e.ci
        HAVING COUNT(a.id_asistencia) >= 10
        ORDER BY no_justificadas DESC
        LIMIT 20
      `);

      res.json({ alertas: result.rows });
    }
  } catch (error) {
    console.error('Error en getEstudiantesConAlertas:', error);
    res.status(500).json({ message: 'Error', error: error.message });
  }
};

module.exports = { checkAsistenciaAlertas, getEstudiantesConAlertas };