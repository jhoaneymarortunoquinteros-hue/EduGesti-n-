const express = require('express');
const router = express.Router();
const { checkAsistenciaAlertas, getEstudiantesConAlertas } = require('../controllers/asistenciaController');
const { verificarToken } = require('../middlewares/authMiddleware');
const { requierePermiso } = require('../middlewares/permissionMiddleware');

router.get('/alertas', verificarToken, requierePermiso('ver_asistencia'), checkAsistenciaAlertas);
router.get('/estudiantes', verificarToken, requierePermiso('ver_asistencia'), getEstudiantesConAlertas);

module.exports = router;