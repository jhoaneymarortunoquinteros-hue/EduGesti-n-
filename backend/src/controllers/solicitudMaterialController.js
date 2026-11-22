const pool = require('../config/db');
const { registrarBitacora, getClientIp } = require('../utils/bitacora');

const getSolicitudes = async (req, res) => {
  const { search, estado, id_material } = req.query;

  try {
    const conditions = [];
    const params = [];
    let idx = 1;

    if (estado) {
      conditions.push(`sm.estado = $${idx}`);
      params.push(estado);
      idx++;
    }

    if (id_material) {
      conditions.push(`sm.id_material = $${idx}`);
      params.push(id_material);
      idx++;
    }

    if (search) {
      conditions.push(`(m.nombre_item ILIKE $${idx} OR m.descripcion ILIKE $${idx})`);
      params.push(`%${search}%`);
      idx++;
    }

    const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';
    const orderBy = `ORDER BY sm.fecha_solicitud DESC`;

    const result = await pool.query(`
      SELECT
        sm.id_solicitud,
        sm.estado,
        sm.fecha_solicitud,
        sm.fecha_resolucion,
        sm.justificacion,
        sm.cantidad_solicitada_entregada,
        sm.cantidad_solicitada,
        u.username AS solicitante,
        m.nombre_item AS material_nombre,
        smc.cantidad_solicitada AS cantidad_detalle,
        smc.cantidad_entregada AS cantidad_entregada_detalle
      FROM public.solicitud_material sm
      JOIN public.usuario u ON u.id_usuario = sm.id_solicitante
      JOIN public.material m ON m.id_material = sm.id_material
      LEFT JOIN LATERAL (
        SELECT sd.cantidad_solicitada, sd.cantidad_entregada
        FROM public.solicitud_material_detalle sd
        WHERE sd.id_solicitud = sm.id_solicitud
      ) smc ON TRUE
      ${where}
      ${orderBy}
    `, params);

    res.json(result.rows);
  } catch (error) {
    res.status(500).json({ message: 'Error al obtener solicitudes', error: error.message });
  }
};

const crearSolicitud = async (req, res) => {
  const { id_material, cantidad_solicitada, justificacion } = req.body;

  if (!id_material || !cantidad_solicitada || cantidad_solicitada <= 0) {
    return res.status(400).json({ message: 'Material y cantidad solicitada son obligatorios.' });
  }

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // Verificar que el material existe y está activo
    const materialCheck = await client.query(
      'SELECT id_material, nombre_item, stock_actual, estado FROM material WHERE id_material = $1',
      [id_material]
    );

    if (materialCheck.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ message: 'Material no encontrado.' });
    }

    if (!materialCheck.rows[0].estado) {
      await client.query('ROLLBACK');
      return res.status(400).json({ message: 'No se puede solicitar material inactivo.' });
    }

    // Crear la solicitud principal
    const solicitudResult = await client.query(`
      INSERT INTO public.solicitud_material (
        id_solicitante, id_material, cantidad_solicitada, justificacion, estado
      )
      VALUES ($1, $2, $3, $4, 'pendiente')
      RETURNING *
    `, [req.usuario.id, id_material, cantidad_solicitada, justificacion || '']);

    // Agregar detalle de la solicitud (el material específico)
    await client.query(`
      INSERT INTO public.solicitud_material_detalle (
        id_solicitud, id_material, cantidad_solicitada, cantidad_entregada
      )
      VALUES ($1, $2, $3, 0)
    `, [solicitudResult.rows[0].id_solicitud, id_material, cantidad_solicitada]);

    await client.query('COMMIT');

    // Registrar bitácora
    await registrarBitacora({
      id_usuario: req.usuario.id,
      nombre_modulo: 'inventario',
      nombre_permiso: 'gestionar_inventario',
      metodo: 'POST /api/inventario/solicitudes',
      accion: 'INSERT',
      tabla_afectada: 'solicitud_material',
      id_registro_afectado: solicitudResult.rows[0].id_solicitud,
      descripcion: `Solicitud de material: ${materialCheck.rows[0].nombre_item} - ${cantidad_solicitada} unidades`,
      ip_origen: getClientIp(req)
    });

    res.status(201).json({
      message: 'Solicitud creada correctamente',
      solicitud: solicitudResult.rows[0]
    });
  } catch (error) {
    await client.query('ROLLBACK');
    res.status(500).json({ message: 'Error al crear solicitud', error: error.message });
  } finally {
    client.release();
  }
};

const aprobarSolicitud = async (req, res) => {
  const { id } = req.params;
  const { observaciones } = req.body;

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // Verificar que la solicitud existe
    const solicitudCheck = await client.query(
      'SELECT id_solicitud, id_material, cantidad_solicitada, cantidad_solicitada_entregada, estado, id_solicitante FROM public.solicitud_material WHERE id_solicitud = $1',
      [id]
    );

    if (solicitudCheck.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ message: 'Solicitud no encontrada.' });
    }

    const solicitud = solicitudCheck.rows[0];

    // Si ya está aprobada o entregada, no volver a aprobar
    if (solicitud.estado === 'aprobada' || solicitud.estado === 'entregada') {
      await client.query('ROLLBACK');
      return res.status(400).json({ message: 'La solicitud ya ha sido procesada.' });
    }

    // Actualizar estado a aprobada
    await client.query(`
      UPDATE public.solicitud_material
      SET estado = 'aprobada', observaciones = $1, fecha_resolucion = now()
      WHERE id_solicitud = $2
    `, [observaciones || '', id]);

    // Actualizar cantidad entregada (será actualizada cuando se marque como entregada)
    await client.query(`
      UPDATE public.solicitud_material
      SET cantidad_solicitada_entregada = cantidad_solicitada
      WHERE id_solicitud = $1
    `, [id]);

    await client.query('COMMIT');

    // Registrar bitácora
    await registrarBitacora({
      id_usuario: req.usuario.id,
      nombre_modulo: 'inventario',
      nombre_permiso: 'gestionar_inventario',
      metodo: 'PUT /api/inventario/solicitudes/:id/aprobar',
      accion: 'UPDATE',
      tabla_afectada: 'solicitud_material',
      id_registro_afectado: Number(id),
      descripcion: `Solicitud aprobada: ${solicitud.cantidad_solicitada} unidades de material ID ${solicitud.id_material}`,
      ip_origen: getClientIp(req)
    });

    res.json({
      message: 'Solicitud aprobada correctamente',
      solicitud: { ...solicitud, estado: 'aprobada', observaciones }
    });
  } catch (error) {
    await client.query('ROLLBACK');
    res.status(500).json({ message: 'Error al aprobar solicitud', error: error.message });
  } finally {
    client.release();
  }
};

const rechazarSolicitud = async (req, res) => {
  const { id } = req.params;
  const { observaciones } = req.body;

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // Verificar que la solicitud existe y no ha sido procesada
    const solicitudCheck = await client.query(
      'SELECT id_solicitud, estado FROM public.solicitud_material WHERE id_solicitud = $1',
      [id]
    );

    if (solicitudCheck.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ message: 'Solicitud no encontrada.' });
    }

    const solicitud = solicitudCheck.rows[0];
    if (solicitud.estado === 'aprobada' || solicitud.estado === 'entregada' || solicitud.estado === 'cancelada') {
      await client.query('ROLLBACK');
      return res.status(400).json({ message: 'La solicitud ya ha sido procesada y no puede ser rechazada.' });
    }

    // Actualizar estado a rechazada
    await client.query(`
      UPDATE public.solicitud_material
      SET estado = 'rechazada', observaciones = $1, fecha_resolucion = now()
      WHERE id_solicitud = $2
    `, [observaciones || '', id]);

    await client.query('COMMIT');

    // Registrar bitácora
    await registrarBitacora({
      id_usuario: req.usuario.id,
      nombre_modulo: 'inventario',
      nombre_permiso: 'gestionar_inventario',
      metodo: 'PUT /api/inventario/solicitudes/:id/rechazar',
      accion: 'UPDATE',
      tabla_afectada: 'solicitud_material',
      id_registro_afectado: Number(id),
      descripcion: `Solicitud rechazada: ${solicitud.estado}`,
      ip_origen: getClientIp(req)
    });

    res.json({ message: 'Solicitud rechazada correctamente' });
  } catch (error) {
    await client.query('ROLLBACK');
    res.status(500).json({ message: 'Error al rechazar solicitud', error: error.message });
  } finally {
    client.release();
  }
};

const entregarSolicitud = async (req, res) => {
  const { id } = req.params;
  const { id_tutor, id_estudiante } = req.body;

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // Verificar que la solicitud existe y está aprobada
    const solicitudCheck = await client.query(`
      SELECT sm.*, m.nombre_item, m.stock_actual,
             u1.username AS solicitante_nombre,
             u2.username AS responsable_nombre
      FROM public.solicitud_material sm
      JOIN public.material m ON m.id_material = sm.id_material
      JOIN public.usuario u1 ON u1.id_usuario = sm.id_solicitante
      LEFT JOIN public.usuario u2 ON u2.id_usuario = $3
      WHERE sm.id_solicitud = $1 AND sm.estado = 'aprobada'
    `, [id, id_material || null, req.usuario.id]);

    if (solicitudCheck.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ message: 'Solicitud no encontrada o no está aprobada.' });
    }

    const solicitud = solicitudCheck.rows[0];

    // Verificar que el tutor está autorizado (usar función existente)
    // Nota: Esta validación depende del contexto (entrega de estudiante vs material)
    // Por ahora, registramos la entrega

    // Marcar solicitud como entregada
    await client.query(`
      UPDATE public.solicitud_material
      SET estado = 'entregada', fecha_resolucion = now()
      WHERE id_solicitud = $1
    `, [id]);

    // Registrar movimiento de stock (entrega)
    await client.query(`
      INSERT INTO public.movimiento_inventario (id_material, tipo_movimiento, cantidad, id_usuario, observaciones)
      VALUES ($1, 'salida', $2, $3, 'Entrega por solicitud ')
    `, [solicitud.id_material, solicitud.cantidad_solicitada_entregada, req.usuario.id]);

    // Actualizar stock del material
    await client.query(`
      UPDATE public.material
      SET stock_actual = stock_actual - $1
      WHERE id_material = $2
    `, [solicitud.cantidad_solicitada_entregada, solicitud.id_material]);

    await client.query('COMMIT');

    // Registrar bitácora
    await registrarBitacora({
      id_usuario: req.usuario.id,
      nombre_modulo: 'inventario',
      nombre_permiso: 'gestionar_inventario',
      metodo: 'PUT /api/inventario/solicitudes/:id/entregar',
      accion: 'UPDATE',
      tabla_afectada: 'solicitud_material',
      id_registro_afectado: Number(id),
      descripcion: `Solicitud entregada: ${solicitud.cantidad_solicitada_entregada} unidades de ${solicitud.nombre_item}`,
      ip_origen: getClientIp(req)
    });

    res.json({
      message: 'Solicitud entregada correctamente',
      solicitud: { ...solicitud, estado: 'entregada' }
    });
  } catch (error) {
    await client.query('ROLLBACK');
    res.status(500).json({ message: 'Error al entregar solicitud', error: error.message });
  } finally {
    client.release();
  }
};

module.exports = { getSolicitudes, crearSolicitud, aprobarSolicitud, rechazarSolicitud, entregarSolicitud };