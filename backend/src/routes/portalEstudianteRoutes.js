const express = require('express');
const router = express.Router();
const {
    obtenerHijosVinculados,
    obtenerInformacionAcademica,
    solicitarCita
} = require('../controllers/portalEstudianteController');
const { verificarToken } = require('../middlewares/authMiddleware');
const { requierePermiso } = require('../middlewares/permissionMiddleware');

router.get('/hijos', verificarToken, requierePermiso('ver_estudiantes'), obtenerHijosVinculados);
router.get('/informacion/:id_estudiante', verificarToken, requierePermiso('ver_estudiantes'), obtenerInformacionAcademica);
router.post('/citas', verificarToken, requierePermiso('solicitar_cita'), solicitarCita);

module.exports = router;