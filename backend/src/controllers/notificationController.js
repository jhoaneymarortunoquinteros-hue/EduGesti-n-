const pool = require('../config/db');
const { registrarBitacora, getClientIp } = require('../utils/bitacora');

const getNotificaciones = async (req, res) => {
  const { estado, canal, soloNoLeidas } = req.query;

  try {
    const conditions = [];
    const params = [];
    let idx = 1;

    if (soloNoLeidas === 'true') {
      conditions.push(`ne.estado_envio = 'pendiente'`);
    }

    if (canal) {
      conditions.push(`n.canal = $${idx}`);
      params.push(canal);
      idx++;
    }

    if (estado) {
      conditions.push(`ne.estado_envio = $${idx}`);
      params.push(estado);
      idx++;
    }

    const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';

    const result = await pool.query(`
      SELECT
        n.id_notificacion,
        n.titulo,
        n.contenido,
        n.canal,
        ne.estado_envio,
        n.fecha_envio,
        u.username AS remitente,
        a.titulo AS aviso_titulo
      FROM public.notificacion n
      JOIN public.notificacion_envio ne ON ne.id_aviso = n.id_aviso
      JOIN public.usuario u ON u.id_usuario = n.id_usuario
      LEFT JOIN public.aviso a ON a.id_aviso = n.id_aviso
      ${where}
      ORDER BY n.fecha_envio DESC
    `, params);

    res.json(result.rows);
  } catch (error) {
    res.status(500).json({ message: 'Error al obtener notificaciones', error: error.message });
  }
};

const marcarComoLeida = async (req, res) => {
  const { id } = req.params;

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // Verificar que la notificación existe
    const notifCheck = await client.query(
      'SELECT id_notificacion, id_aviso, id_tutor, estado_envio FROM public.notificacion_envio WHERE id_notificacion = $1',
      [id]
    );

    if (notifCheck.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ message: 'Notificación no encontrada.' });
    }

    const notificacion = notifCheck.rows[0];

    // Actualizar estado a 'leido'
    await client.query(`
      UPDATE public.notificacion_envio
      SET estado_envio = 'leido', fecha_envio = now()
      WHERE id_notificacion = $1
    `, [id]);

    await client.query('COMMIT');

    // Registrar bitácora
    await registrarBitacora({
      id_usuario: req.usuario.id,
      nombre_modulo: 'comunicacion',
      nombre_permiso: 'ver_notificaciones',
      metodo: 'PUT /api/notificaciones/:id/leer',
      accion: 'UPDATE',
      tabla_afectada: 'notificacion_envio',
      id_registro_afectado: Number(id),
      descripcion: 'Notificación marcada como leída',
      ip_origen: getClientIp(req)
    });

    res.json({ message: 'Notificación marcada como leída' });
  } catch (error) {
    await client.query('ROLLBACK');
    res.status(500).json({ message: 'Error al marcar notificación', error: error.message });
  } finally {
    client.release();
  }
};

const crearNotificacion = async (req, res) => {
  const { id_aviso, id_tutor, canal, contenido, titulo } = req.body;

  if (!id_aviso || !canal || !contenido) {
    return res.status(400).json({ message: 'Aviso, canal y contenido son obligatorios.' });
  }

  const validCanales = ['whatsapp', 'email', 'sms', 'panel'];
  if (!validCanales.includes(canal)) {
    return res.status(400).json({ message: 'Canal no válido. Use: whatsapp, email, sms, panel' });
  }

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // Verificar que el aviso existe
    const avisoCheck = await client.query(
      'SELECT id_aviso, titulo, destinatario_tipo FROM public.aviso WHERE id_aviso = $1',
      [id_aviso]
    );

    if (avisoCheck.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ message: 'Aviso no encontrado.' });
    }

    const aviso = avisoCheck.rows[0];

    // Insertar la notificación
    const result = await client.query(`
      INSERT INTO public.notificacion (id_aviso, id_tutor, canal, contenido, estado_envio)
      VALUES ($1, $2, $3, $4, 'pendiente')
      RETURNING *
    `, [id_aviso, id_tutor || null, canal, contenido]);

    // Si hay tutores específicos, crear registros de envío
    if (id_tutor && aviso.destinatario_tipo === 'individual') {
      await client.query(`
        INSERT INTO public.notificacion_envio (id_notificacion, id_tutor, estado_envio)
        VALUES ($1, $2, 'pendiente')
      `, [result.rows[0].id_notificacion, id_tutor]);
    } else if (aviso.destinatario_tipo === 'por_curso' || !id_tutor) {
      // Obtener todos los tutores activos
      const tutores = await client.query(
        'SELECT id_tutor FROM public.tutor WHERE estado = true'
      );

      for (const tutor of tutores.rows) {
        await client.query(`
          INSERT INTO public.notificacion_envio (id_notificacion, id_tutor, estado_envio)
          VALUES ($1, $2, 'pendiente')
        `, [result.rows[0].id_notificacion, tutor.id_tutor]);
      }
    }

    await client.query('COMMIT');

    // Registrar bitácora
    await registrarBitacora({
      id_usuario: req.usuario.id,
      nombre_modulo: 'comunicacion',
      nombre_permiso: 'gestionar_notificaciones',
      metodo: 'POST /api/notificaciones',
      accion: 'INSERT',
      tabla_afectada: 'notificacion',
      id_registro_afectado: result.rows[0].id_notificacion,
      descripcion: `Notificación creada: ${titulo} para ${canal}`,
      ip_origen: getClientIp(req)
    });

    res.status(201).json({
      message: 'Notificación creada correctamente',
      notificacion: result.rows[0]
    });
  } catch (error) {
    await client.query('ROLLBACK');
    res.status(500).json({ message: 'Error al crear notificación', error: error.message });
  } finally {
    client.release();
  }
};

module.exports = { getNotificaciones, marcarComoLeida, crearNotificacion };