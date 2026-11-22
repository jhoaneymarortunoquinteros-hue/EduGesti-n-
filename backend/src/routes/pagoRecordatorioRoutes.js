const express = require('express');
const router = express.Router();
const {
    getPagosPendientes,
    getRecordatoriosEnviados,
    generarRecordatorio
} = require('../controllers/pagoRecordatorioController');
const { verificarToken } = require('../middlewares/authMiddleware');
const { requierePermiso } = require('../middlewares/permissionMiddleware');

router.get('/', verificarToken, requierePermiso('ver_pagos'), getPagosPendientes);
router.get('/recordatorios', verificarToken, requierePermiso('ver_pagos'), getRecordatoriosEnviados);
router.post('/', verificarToken, requierePermiso('gestionar_pagos'), generarRecordatorio);

module.exports = router;