import Router from 'express'
import {
    registerUser,
    loginUser
} from '../controllers/user.controllers.js'
import upload from '../middleware/multer.middleware.js'
import {
    validateRegister,
    validateLogin
} from '../middleware/validation.middleware.js'
import verifyJWT from '../middleware/auth.middleware.js'

const router = Router()

router.route('/register').post(
    upload.single('avatar'),
    validateRegister,
    registerUser
)

router.route('/login').post(validateLogin,loginUser)

export default router