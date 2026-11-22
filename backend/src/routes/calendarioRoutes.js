const express = require('express');
const router = express.Router();
const { getHorarios, getCitas } = require('../controllers/horarioController');
const { verificarToken } = require('../middlewares/authMiddleware');
const { requierePermiso } = require('../middlewares/permissionMiddleware');

router.get('/', verificarToken, requierePermiso('ver_horarios'), getHorarios);
router.get('/citas', verificarToken, requierePermiso('ver_citas'), getCitas);

module.exports = router;