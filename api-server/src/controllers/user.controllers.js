import asyncHandler from '../utils/asyncHandler.utils.js'
import ApiError from '../utils/ApiError.utils.js'
import ApiResponse from '../utils/ApiResponse.utils.js'
import User from '../models/Users.models.js'
import uploadOnCloudinary from '../utils/cloudinary.utils.js'
import logger from '../utils/logger.utils.js'
import fs from 'fs'

const generateTokens = async(userId)=>{
    try{
        const user = await User.findById(userId)
        const accessToken = user.generateAccessToken()
        const refreshToken = user.generateRefreshToken()

        user.refreshToken = refreshToken

        await user.save({validateBeforeSave:false})

        return {accessToken,refreshToken}
    }
    catch(err){
        logger.error("Something went wrong while generating referesh and access token")
        throw new ApiError(500, "Something went wrong while generating referesh and access token")
    }
}

const registerUser = asyncHandler(async(req,res,next)=>{
    const {fullName,email,password,username} = req.body

    if(
        // some - Determines whether the specified callback function returns true for any element of an array.
        [fullName,username,email,password].some((field) => field?.trim()==="")
    ){
        throw new ApiError(400,'All fields are required')
    }

    const existedUser = await User.findOne({$or:[{username},{email}]})

    const avatarLocalPath = req.file?.path
    // console.log('Avatar Local Path: ',avatarLocalPath)

    if(!avatarLocalPath){
        throw new ApiError(400,'Avatar file is required')
    }

    if(existedUser){
        fs.unlinkSync(avatarLocalPath) // remove the locally saved temporary file
        throw new ApiError(400,'User with email or username already exist')
    }

    const avatar = await uploadOnCloudinary(avatarLocalPath)

    if(!avatar){
        throw new ApiError(500, "Avatar file upload failed")
    }

    const user = await User.create({
        fullName,
        avatar:avatar.url,
        email,
        password,
        username
    })

    const createdUser = await User.findById(user._id).select('-password -refreshToken')

    if(!createdUser){
        throw new ApiError(500, "Something went wrong while registering the user")
    }

    return res.status(201).json(
        new ApiResponse(200,createdUser,'User registered successfully')
    )
});

const loginUser = asyncHandler(async(req,res,next)=>{
    const {email,username,password} = req.body

    if(!username && !email){
        throw new ApiError(400,'Username or Email Required')
    }

    const user = await User.findOne(
        {$or:[{username},{email}]}
    )

    if(!user){
        throw new ApiError(400,'User does not exist')
    }

    const isPasswordValid = user.isPasswordCorrect(password)

    if(!isPasswordValid){
        throw new ApiError(401,'Invalid User Credentials')
    }

    const {accessToken, refreshToken} = await generateTokens(user._id)

    const loggedInUser = await User.findById(user._id).select('-password -refreshToken')

    return res
    .status(200)
    .cookie('accessToken',accessToken,{httpOnly:true, sameSite: 'none', secure:true})
    .cookie('refreshToken',refreshToken,{httpOnly:true, secure:true})
    .json(
        new ApiResponse(200,{
            user:loggedInUser,
            accessToken:accessToken,
            refreshToken:refreshToken
        },'User logged in Successfully')
    )
});

const logoutUser = asyncHandler(async(req,res,next)=>{
    await User.findByIdAndUpdate(
        req.user._id,
        {
            $unset:{
                refreshToken:1
            }
        },
        {
            // By default, findOneAndUpdate() returns the document as it was before update was applied. If you set new: true, findOneAndUpdate() will instead give you the object after update was applied.
            new: true
        }
    )

    return res
    .status(200)
    .clearCookie('accessToken',{
        httpOnly: true,
        secure: true
    })
    .clearCookie('refreshToken',{
        httpOnly: true,
        secure: true
    })
    .json(
        new ApiResponse(200,{},'User logged out successfully')
    )
})

export {
    registerUser,
    loginUser,
    logoutUser
}