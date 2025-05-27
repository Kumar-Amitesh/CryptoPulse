// express-validation is an express middleware that validates a request and returns a response with errors; if any of the configured validation rules fail.

// While the user can no longer send empty person names, it can still inject HTML into your page! This is known as the Cross-Site Scripting vulnerability (XSS).

// express-validator validators do not report validation errors to users automatically.
// The reason for this is simple: as you add more validators, or for more fields, how do you want to collect the errors? Do you want a list of all errors, only one per field, only one overall...?

import { check, validationResult } from 'express-validator';
import ApiError from '../utils/ApiError.utils.js'
import logger from '../utils/logger.utils.js'

const validateRegister = [
    // only validates req.body
    check('email').isEmail().normalizeEmail().trim().escape(),
    // withMessage - Sets the error message for the previous validator.
    check('password').isLength({min: 3}).withMessage('Password must be at least 8 characters long').trim.escape(),
    (req,res,next) => {
        // Extracts the validation errors of an express request
        const result = validationResult(req)
        if(!result.isEmpty()){
            logger.error('Validation failed during register')
            throw new ApiError(400,'Validation Failed',errors.array())
        }
        next()
    }
]

const validateLogin = [
    check('email').isEmail().normalizeEmail().trim().escape(),
    check('password').notEmpty().withMessage('Password is required').trim().escape(),
    (req, res, next) => {
        const errors = validationResult(req);
        if (!errors.isEmpty()){
            logger.error('Validation failed during login')
            throw new ApiError(400,'Validation Failed',errors.array())
        }
        next();
    }
]

export { validateRegister, validateLogin };