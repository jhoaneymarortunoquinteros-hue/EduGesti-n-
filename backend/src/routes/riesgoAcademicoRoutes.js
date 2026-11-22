const express = require('express');
const router = express.Router();
const {
    analizarRiesgo,
    consultarEstudiantesEnRiesgo,
    obtenerAnalisisCurso
} = require('../controllers/riesgoAcademicoController');
const { verificarToken } = require('../middlewares/authMiddleware');
const { requierePermiso } = require('../middlewares/permissionMiddleware');

router.post('/', verificarToken, requierePermiso('ver_riesgo_academico'), analizarRiesgo);
router.get('/estudiantes', verificarToken, requierePermiso('ver_riesgo_academico'), consultarEstudiantesEnRiesgo);
router.post('/analisis', verificarToken, requierePermiso('ver_riesgo_academico'), obtenerAnalisisCurso);

module.exports = router;