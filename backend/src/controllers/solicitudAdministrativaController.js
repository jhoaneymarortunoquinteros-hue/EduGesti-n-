const pool = require('../config/db');
const { registrarBitacora, getClientIp } = require('../utils/bitacora');

/**
 * CU-N08 — Solicitudes Administrativas
 * Digitalizar trámites institucionales adicionales.
 * 
 * NOTE: No duplicar trámites ya cubiertos por licencias, permisos,
 * justificaciones, citas o reemplazos. Determinar primero qué trámites
 * nuevos hacen falta.
 */

const getSolicitudesAdministrativas = async (req, res) => {
  try {
    const { tipo, estado, search } = req.query;

    const conditions = [];
    const params = [];
    let idx = 1;

    if (estado) {
      conditions.push(`sa.estado = $${idx}`);
      params.push(estado);
      idx++;
    }

    if (search) {
      conditions.push(`(sa.titulo ILIKE $${idx} OR sa.descripcion ILIKE $${idx})`);
      params.push(`%${search}%`);
      idx++;
    }

    if (tipo) {
      conditions.push(`sa.tipo = $${idx}`);
      params.push(tipo);
      idx++;
    }

    const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';

    const result = await pool.query(`
      SELECT
        sa.id_solicitud,
        sa.tipo,
        sa.titulo,
        sa.descripcion,
        sa.estado,
        sa.fecha_solicitud,
        sa.fecha_resolucion,
        sa.id_solicitante,
        u.username AS solicitante,
        sa.observaciones,
        sa.id_responsable_asignado
      FROM public.solicitud_administrativa sa
      JOIN public.usuario u ON u.id_usuario = sa.id_solicitante
      ${where}
      ORDER BY sa.fecha_solicitud DESC
    `, params);

    res.json({ solicitudes: result.rows });
  } catch (error) {
    console.error('Error obteniendo solicitudes administrativas:', error);
    res.status(500).json({ message: 'Error', error: error.message });
  }
};

const crearSolicitudAdministrativa = async (req, res) => {
  try {
    const { tipo, titulo, descripcion, id_tipo_tramite, id_solicitante } = req.body;

    if (!tipo || !titulo || !descripcion) {
      return res.status(400).json({ message: 'Tipo, título y descripción son obligatorios' });
    }

    const validTipos = ['licencia', 'permiso', 'justificacion', 'cambio_datos', 'otro'];
    if (!validTipos.includes(tipo)) {
      return res.status(400).json({ message: 'Tipo de trámite no válido' });
    }

    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      // Verificar que no sea duplicado de trámites existentes
      const existente = await client.query(`
        SELECT id_solicitud, titulo FROM public.solicitud_administrativa
        WHERE LOWER(titulo) = LOWER($1)
          AND estado IN ('pendiente', 'aprobada')
      `, [titulo]);

      if (existente.rows.length > 0) {
        await client.query('ROLLBACK');
        return res.status(409).json({
          message: 'Ya existe un trámite con el mismo título y estado activo.',
          existente: existente.rows[0]
        });
      }

      const solicitudResult = await client.query(`
        INSERT INTO public.solicitud_administrativa (
          tipo, titulo, descripcion, id_solicitante, estado, fecha_solicitud
        )
        VALUES ($1, $2, $3, $4, 'pendiente', now())
        RETURNING *
      `, [tipo, titulo, descripcion, id_solicitante || req.usuario.id]);

      // Registrar bitácora
      await registrarBitacora({
        id_usuario: req.usuario.id,
        nombre_modulo: 'administracion',
        nombre_permiso: 'gestionar_solicitudes',
        metodo: 'POST /api/solicitudes-administrativas',
        accion: 'INSERT',
        tabla_afectada: 'solicitud_administrativa',
        id_registro_afectado: solicitudResult.rows[0].id_solicitud,
        descripcion: `Solicitud administrativa creada: ${titulo} (tipo: ${tipo})`,
        ip_origen: getClientIp(req)
      });

      await client.query('COMMIT');

      res.status(201).json({
        message: 'Solicitud administrativa creada correctamente',
        solicitud: solicitudResult.rows[0]
      });
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  } catch (error) {
    console.error('Error creando solicitud administrativa:', error);
    res.status(500).json({ message: 'Error', error: error.message });
  }
};

const aprobarSolicitudAdministrativa = async (req, res) => {
  try {
    const { id } = req.params;
    const { observaciones, estado } = req.body;

    if (!estado) {
      return res.status(400).json({ message: 'El estado es obligatorio' });
    }

    const validEstados = ['aprobada', 'rechazada', 'en_proceso', 'resuelta', 'cerrada'];
    if (!validEstados.includes(estado)) {
      return res.status(400).json({ message: 'Estado no válido' });
    }

    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      // Verificar que existe
      const check = await client.query(
        'SELECT id_solicitud, titulo, estado FROM public.solicitud_administrativa WHERE id_solicitud = $1',
        [id]
      );

      if (check.rows.length === 0) {
        await client.query('ROLLBACK');
        return res.status(404).json({ message: 'Solicitud no encontrada' });
      }

      // Actualizar estado
      await client.query(`
        UPDATE public.solicitud_administrativa
        SET estado = $1, observaciones = $2, fecha_resolucion = now()
        WHERE id_solicitud = $3
      `, [estado, observaciones || '', id]);

      // Registrar bitácora
      await registrarBitacora({
        id_usuario: req.usuario.id,
        nombre_modulo: 'administracion',
        nombre_permiso: 'gestionar_solicitudes',
        metodo: 'PUT /api/solicitudes-administrativas/:id/aprobar',
        accion: 'UPDATE',
        tabla_afectada: 'solicitud_administrativa',
        id_registro_afectado: Number(id),
        descripcion: `Solicitud ${estado}: ${check.rows[0].titulo}`,
        ip_origen: getClientIp(req)
      });

      await client.query('COMMIT');

      res.json({
        message: `Solicitud ${estado} correctamente`,
        solicitud: { ...check.rows[0], estado, observaciones }
      });
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  } catch (error) {
    console.error('Error aprobando solicitud:', error);
    res.status(500).json({ message: 'Error', error: error.message });
  }
};

module.exports = { getSolicitudesAdministrativas, crearSolicitudAdministrativa, aprobarSolicitudAdministrativa };