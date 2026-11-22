const express = require('express');
const router = express.Router();
const { crearIncidencia, getIncidencias } = require('../controllers/incidenciaController');
const { verificarToken } = require('../middlewares/authMiddleware');
const { requierePermiso } = require('../middlewares/permissionMiddleware');

router.post('/', verificarToken, requierePermiso('gestionar_incidencias'), crearIncidencia);
router.get('/', verificarToken, requierePermiso('ver_incidencias'), getIncidencias);

module.exports = router;