const express = require('express');
const router = express.Router();
const {
    getSolicitudesAdministrativas,
    crearSolicitudAdministrativa,
    aprobarSolicitudAdministrativa
} = require('../controllers/solicitudAdministrativaController');
const { verificarToken } = require('../middlewares/authMiddleware');
const { requierePermiso } = require('../middlewares/permissionMiddleware');

router.get('/', verificarToken, requierePermiso('ver_solicitudes'), getSolicitudesAdministrativas);
router.post('/', verificarToken, requierePermiso('gestionar_solicitudes'), crearSolicitudAdministrativa);
router.put('/:id/aprobar', verificarToken, requierePermiso('gestionar_solicitudes'), aprobarSolicitudAdministrativa);

module.exports = router;