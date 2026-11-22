const pool = require('../config/db');
const { registrarBitacora, getClientIp } = require('../utils/bitacora');

/**
 * CU-N10 — Recordatorios de Pagos
 * Mejora el seguimiento de obligaciones pendientes.
 */

const getPagosPendientes = async (req, res) => {
  try {
    const { vencidosSolo = 'false', mes, concepto } = req.query;

    const conditions = [];
    const params = [];
    let idx = 1;

    if (vencidosSolo === 'true') {
      conditions.push(`p.fecha_pago IS NULL OR p.fecha_pago < now()`);
    }

    if (mes) {
      conditions.push(`p.mes = $${idx}`);
      params.push(mes);
      idx++;
    }

    if (concepto) {
      conditions.push(`d.id_concepto = $${idx}`);
      params.push(concepto);
      idx++;
    }

    // Si solo vencidos, añadimos condición de estado
    if (vencidosSolo === 'true') {
      conditions.push(`p.estado = 'pendiente_validacion' OR p.estado = 'pendiente'`);
    }

    const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';

    const result = await pool.query(`
      SELECT
        p.id_pago,
        p.id_deuda,
        p.id_estudiante,
        p.monto_pagado,
        p.metodo_pago,
        p.estado,
        p.fecha_pago,
        p.comprobante_url,
        d.monto AS monto_deuda,
        d.mes AS mes_deuda,
        d.estado AS deuda_estado,
        e.nombre || ' ' || e.apellido AS estudiante_nombre
      FROM public.pago p
      JOIN public.deuda d ON d.id_deuda = p.id_deuda
      JOIN public.estudiante e ON e.id_estudiante = p.id_estudiante
      ${where}
      ORDER BY p.fecha_generacion DESC
      LIMIT 100
    `, params);

    // Calcular cuántos están vencidos
    let vencidos = 0;
    if (vencidosSolo === 'true' || !vencidosSolo) {
      const vencResult = await pool.query(`
        SELECT COUNT(*) AS count
        FROM public.pago p
        JOIN public.deuda d ON d.id_deuda = p.id_deuda
        WHERE (p.fecha_pago IS NULL OR p.fecha_pago < now())
          AND p.estado IN ('pendiente_validacion', 'pendiente', 'mora')
      `);
      vencidos = parseInt(vencResult.rows[0].count);
    }

    res.json({
      pagos: result.rows,
      total: result.rows.length,
      vencidos,
      parametros: { vencidosSolo, mes, concepto }
    });
  } catch (error) {
    console.error('Error en getPagosPendientes:', error);
    res.status(500).json({ message: 'Error al obtener pagos pendientes', error: error.message });
  }
};

const getRecordatoriosEnviados = async (req, res) => {
  try {
    const { id_estudiante } = req.query;

    let query = `
      SELECT id_notificacion, id_pago, fecha_enviado, canal, estado_envio
      FROM public.notificacion_envio ne
      JOIN public.pago p ON p.id_pago = ne.id_pago
      WHERE 1=1
    `;
    const params = [];
    let idx = 1;

    if (id_estudiante) {
      query += ` AND p.id_estudiante = $${idx}`;
      params.push(id_estudiante);
      idx++;
    }

    query += ` ORDER BY ne.fecha_enviado DESC LIMIT 50`;

    const result = await pool.query(query, params);

    res.json({ recordatorios: result.rows });
  } catch (error) {
    console.error('Error en getRecordatoriosEnviados:', error);
    res.status(500).json({ message: 'Error', error: error.message });
  }
};

const generarRecordatorio = async (req, res) => {
  try {
    const { id_estudiante } = req.body;

    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      // Obtener deudas pendientes del estudiante
      const deudasResult = await client.query(`
        SELECT d.id_deuda, d.monto, d.mes, d.estado
        FROM public.deuda d
        WHERE d.id_estudiante = $1
          AND d.estado IN ('pendiente', 'mora')
        ORDER BY d.fecha_generacion
      `, [id_estudiante]);

      if (deudasResult.rows.length === 0) {
        await client.query('ROLLBACK');
        return res.status(404).json({ message: 'No hay deudas pendientes para este estudiante.' });
      }

      // Verificar qué recordatorios ya fueron enviados hoy
      const hoy = new Date();
      hoy.setHours(0, 0, 0, 0);

      const recordatoriosExistentes = await client.query(`
        SELECT ne.id_notificacion, ne.fecha_enviado, p.metodo_pago
        FROM public.notificacion_envio ne
        JOIN public.pago p ON p.id_pago = ne.id_pago
        WHERE ne.id_pago = ANY($1::int[])
          AND ne.fecha_enviado >= $2
      `, [deudasResult.rows.map(d => d.id_deuda), hoy]);

      const recordatoriosPorPagar = deudasResult.rows.filter(
        d => !recordatoriosExistentes.rows.some(r => r.id_pago === d.id_deuda)
      );

      if (recordatoriosPorPagar.length === 0) {
        await client.query('ROLLBACK');
        return res.json({
          message: 'No hay nuevos recordatorios para generar hoy. Todos los pagos ya tienen recordatorios registrados para hoy.',
          generados: 0
        });
      }

      // Crear notificaciones para cada deuda pendiente sin registro hoy
      const ahora = new Date();
      const recordatoriosCreados = [];

      for (const deuda of recordatoriosPorPagar) {
        await client.query(`
          INSERT INTO public.notificacion (id_aviso, id_tutor, canal, contenido, estado_envio, fecha_envio)
          VALUES (
            (SELECT id_aviso FROM public.aviso WHERE destinatario_tipo = 'individual' LIMIT 1),
            NULL,
            'email',
            'Recordatorio de pago pendiente: Tiene una deuda de $' || d.monto || ' del mes ' || d.mes || ' que vence pronto.',
            'pendiente',
            ahora
          )
        `);

        // Registrar en bitácora
        await registrarBitacora({
          id_usuario: req.usuario.id,
          nombre_modulo: 'pagos',
          nombre_permiso: 'gestionar_pagos',
          metodo: 'POST /api/pagos/recordatorio',
          accion: 'INSERT',
          tabla_afectada: 'notificacion',
          id_registro_afectado: null,
          descripcion: `Recordatorio de pago generado para estudiante ID ${id_estudiante}, deuda $${deuda.monto} - ${deuda.mes}`,
          ip_origen: getClientIp(req)
        });

        recordatoriosCreados.push({
          id_deuda: deuda.id_deuda,
          monto: deuda.monto,
          mes: deuda.mes
        });
      }

      await client.query('COMMIT');

      res.json({
        message: `Se generaron ${recordatoriosCreados.length} nuevos recordatorios`,
        generados: recordatoriosCreados.length,
        recordatorios: recordatoriosCreados
      });
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  } catch (error) {
    console.error('Error en generarRecordatorio:', error);
    res.status(500).json({ message: 'Error al generar recordatorio', error: error.message });
  }
};

module.exports = { getPagosPendientes, getRecordatoriosEnviados, generarRecordatorio };