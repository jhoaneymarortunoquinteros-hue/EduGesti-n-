const pool = require('../config/db');
const { registrarBitacora, getClientIp } = require('../utils/bitacora');

/**
 * CU-N05 — Portal de Padres de Familia
 * Acceso controlado a información de sus dependientes.
 */

const obtenerHijosVinculados = async (req, res) => {
  try {
    const idTutor = req.usuario.id_usuario;

    const result = await pool.query(`
      SELECT
        e.id_estudiante,
        e.nombre,
        e.apellido,
        e.ci,
        e.grado,
        e.seccion,
        t.parentesco,
        t.autorizado_recoger,
        t.contacto_emergencia
      FROM public.tutor_estudiante t
      JOIN public.estudiante e ON e.id_estudiante = t.id_estudiante
      JOIN public.tutor t2 ON t2.id_tutor = t.id_tutor
      WHERE t2.id_tutor = $1
        AND t.autorizado_recoger = true
      ORDER BY e.apellido, e.nombre
    `, [idTutor]);

    res.json({ hijos: result.rows });
  } catch (error) {
    console.error('Error obteniendo hijos:', error);
    res.status(500).json({ message: 'Error al obtener hijos vinculados', error: error.message });
  }
};

const obtenerInformacionAcademica = async (req, res) => {
  try {
    const { id_estudiante } = req.query;

    if (!id_estudiante) {
      return res.status(400).json({ message: 'ID de estudiante es requerido' });
    }

    // Obtener datos básicos del estudiante
    const estudianteResult = await pool.query(
      'SELECT id_estudiante, nombre, apellido, ci, fecha_nacimiento, genero, grado, seccion FROM estudiante WHERE id_estudiante = $1',
      [id_estudiante]
    );

    if (estudianteResult.rows.length === 0) {
      return res.status(404).json({ message: 'Estudiante no encontrado' });
    }

    // Obtener calificaciones recientes
    const calificacionesResult = await pool.query(`
      SELECT ae.nombre_actividad, c.nota, c.fecha_evaluacion
      FROM calificacion c
      JOIN actividad_evaluacion ae ON ae.id_actividad = c.id_actividad
      WHERE c.id_estudiante = $1
      ORDER BY c.fecha_evaluacion DESC
      LIMIT 10
    `, [id_estudiante]);

    // Obtener asistencias recientes
    const asistenciasResult = await pool.query(`
      SELECT a.fecha, a.estado, a.observaciones
      FROM asistencia a
      WHERE a.id_estudiante = $1
      ORDER BY a.fecha DESC
      LIMIT 10
    `, [id_estudiante]);

    // Obtener deudas/pagos pendientes
    const deudasResult = await pool.query(`
      SELECT d.mes, d.monto, d.estado, p.monto_pagado, p.estado AS pago_estado
      FROM public.deuda d
      LEFT JOIN public.pago p ON p.id_deuda = d.id_deuda AND p.id_estudiante = $1
      WHERE d.id_estudiante = $1
        AND d.estado IN ('pendiente', 'mora')
      ORDER BY d.fecha_generacion
    `, [id_estudiante]);

    res.json({
      estudiante: estudianteResult.rows[0],
      calificaciones: calificacionesResult.rows,
      asistencias: asistenciasResult.rows,
      deudas: deudasResult.rows
    });
  } catch (error) {
    console.error('Error obteniendo información académica:', error);
    res.status(500).json({ message: 'Error', error: error.message });
  }
};

const solicitarCita = async (req, res) => {
  try {
    const { id_estudiante, fecha, hora, motivo } = req.body;
    const idTutor = req.usuario.id_usuario;

    if (!id_estudiante || !fecha || !hora || !motivo) {
      return res.status(400).json({ message: 'Faltan campos obligatorios' });
    }

    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      // Verificar que el estudiante existe
      const estudianteCheck = await client.query(
        'SELECT id_estudiante, nombre FROM estudiante WHERE id_estudiante = $1',
        [id_estudiante]
      );

      if (estudianteCheck.rows.length === 0) {
        await client.query('ROLLBACK');
        return res.status(404).json({ message: 'Estudiante no encontrado' });
      }

      // Crear la cita
      const citaResult = await client.query(`
        INSERT INTO public.cita (id_estudiante, id_tutor, fecha, hora, motivo, estado)
        VALUES ($1, $2, $3, $4, $5, 'pendiente')
        RETURNING *
      `, [id_estudiante, idTutor, fecha, hora, motivo]);

      // Registrar notificación al tutor
      await client.query(`
        INSERT INTO public.notificacion (id_aviso, id_tutor, canal, contenido, estado_envio, fecha_envio)
        VALUES (
          (SELECT id_aviso FROM public.aviso WHERE destinatario_tipo = 'individual' LIMIT 1),
          $1,
          'panel',
          'Nueva solicitud de cita para estudiante',
          'pendiente',
          now()
        )
      `, [idTutor]);

      // Registrar bitácora
      await registrarBitacora({
        id_usuario: req.usuario.id,
        nombre_modulo: 'citas',
        nombre_permiso: 'solicitar_cita',
        metodo: 'POST /api/citas',
        accion: 'INSERT',
        tabla_afectada: 'cita',
        id_registro_afectado: citaResult.rows[0].id_cita,
        descripcion: `Solicitud de cita para estudiante ID ${id_estudiante} por tutor ${idTutor}`,
        ip_origen: getClientIp(req)
      });

      await client.query('COMMIT');

      res.status(201).json({
        message: 'Solicitud de cita registrada correctamente',
        cita: citaResult.rows[0]
      });
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  } catch (error) {
    console.error('Error solicitando cita:', error);
    res.status(500).json({ message: 'Error al solicitar cita', error: error.message });
  }
};

module.exports = { obtenerHijosVinculados, obtenerInformacionAcademica, solicitarCita };