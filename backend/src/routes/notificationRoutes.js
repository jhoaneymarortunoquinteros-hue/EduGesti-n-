const express = require('express');
const router = express.Router();
const {
    getNotificaciones,
    marcarComoLeida,
    crearNotificacion
} = require('../controllers/notificationController');
const { verificarToken } = require('../middlewares/authMiddleware');
const { requierePermiso } = require('../middlewares/permissionMiddleware');

router.get('/', verificarToken, requierePermiso('ver_notificaciones'), getNotificaciones);

router.put('/:id/leer', verificarToken, marcarComoLeida);

router.post('/', verificarToken, requierePermiso('gestionar_notificaciones'), crearNotificacion);

module.exports = router;