const express = require('express');
const router = express.Router();
const {
    getSolicitudes,
    crearSolicitud,
    aprobarSolicitud,
    rechazarSolicitud,
    entregarSolicitud
} = require('../controllers/solicitudMaterialController');
const { verificarToken } = require('../middlewares/authMiddleware');
const { requierePermiso } = require('../middlewares/permissionMiddleware');

router.get('/', verificarToken, requierePermiso('ver_inventario'), getSolicitudes);

router.post('/', verificarToken, requierePermiso('gestionar_inventario'), crearSolicitud);

router.put('/:id/aprobar', verificarToken, requierePermiso('gestionar_inventario'), aprobarSolicitud);

router.put('/:id/rechazar', verificarToken, requierePermiso('gestionar_inventario'), rechazarSolicitud);

router.put('/:id/entregar', verificarToken, requierePermiso('gestionar_inventario'), entregarSolicitud);

module.exports = router;