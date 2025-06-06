import ApiError from '../utils/ApiError.utils.js'
import jwt from 'jsonwebtoken'
import asyncHandler from '../utils/asyncHandler.utils.js'
import User from '../models/Users.models.js'

const verifyJWT = asyncHandler(
    async(req,_,next) => {
        try{
            const token = req.cookies?.accessToken || req.header("Authorization")?.replace("Bearer ","")

            if(!token){
                throw new ApiError(401,'Unauthorized Request')
            }

            const decodedToken = jwt.verify(token,process.env.ACCESS_TOKEN_SECRET)
            const user = await User.findById(decodedToken?._id).select("-password -refreshToken")

            if(!user){
                throw new ApiError(401,'Invalid Access Token')
            }

            req.user = user
            next()
        }
        catch(error){
            throw new ApiError(401,error?.messag||'Invalid access token')
        }
    }
)

export default verifyJWT