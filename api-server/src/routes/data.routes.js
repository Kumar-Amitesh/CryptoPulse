import Router from 'express'
import { coinStatus } from '../controllers/data.controllers.js'
import verifyJWT from '../middleware/auth.middleware.js'

const router = Router()

// secured routes
router.route('/stats').post(verifyJWT,coinStatus)

export default router