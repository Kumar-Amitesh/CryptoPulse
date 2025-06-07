import asyncHandler from '../utils/asyncHandler.utils.js'
import ApiError from '../utils/ApiError.utils.js'
import ApiResponse from '../utils/ApiResponse.utils.js'
import User from '../models/Users.models.js'
import {
    uploadOnCloudinary,
    deleteFromCloudinary
} from '../utils/cloudinary.utils.js'
import logger from '../utils/logger.utils.js'
import fs from 'fs'
import jwt from 'jsonwebtoken'
import crypto from 'crypto'
import axios from 'axios'
import{ client as redisClient }from '../config/redis.config.js'

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
    .cookie('accessToken',accessToken,{httpOnly:true, secure:true})
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

const refreshAccessToken = asyncHandler(async(req,res,next)=>{
    const incomingRefreshToken = req.cookies?.refreshToken || req.body.refreshToken

    if(!incomingRefreshToken){
        throw new ApiError(401,'Unauthorized Request')
    }

    try{
        const decodedToken = jwt.verify(incomingRefreshToken,process.env.REFRESH_TOKEN_SECRET)

        const user = await User.findById(decodedToken?._id)

        if(!user){
            throw new ApiError(401,'Invalid Refresh Token')
        }

        if(incomingRefreshToken!==user.refreshToken){
            throw new ApiError(401,'Refresh Token is expired or used')
        }

        const {accessToken,refreshToken} = await generateTokens(user._id)

        return res
        .status(200)
        .cookie('accessToken',accessToken,{
            httpOnly:true,
            secure:true
        })
        .cookie('refreshToken',refreshToken,{
            httpOnly:true,
            secure:true
        })
        .json(
            new ApiResponse(
                200,
                {
                    accessToken:accessToken,
                    refreshToken:refreshToken
                },
                'Access token refreshed'
            )
        )

    }
    catch(err){
        logger.error('Invalid Refresh Token ',err?.message)
        throw new ApiError(401, err?.message || "Invalid refresh token")
    }
})

const chnageCurrentPassword = asyncHandler(async(req,res,next)=>{
    const {oldPassword, newPassword} = req.body

    const user = await User.findById(req.user?._id)

    if(!user){
        throw new ApiError(401,'Unauthorized Request')
    }

    const isPasswordCorrect = await user.isPasswordCorrect(oldPassword)

    if(!isPasswordCorrect){
        throw new ApiError(400,'Invalid Current Password')
    }

    user.password = newPassword
    await user.save({validateBeforeSave:false})

    return res
    .status(200)
    .json(
        new ApiResponse(200,{},'Password Changed Successfully')
    )
})

const getCurrentUser = asyncHandler(async(req,res,next)=>{
    return res
    .status(200)
    .json(
        new ApiResponse(200,req.user,'User fetched successfully')
    )
})

const updateAccountDetails = asyncHandler(async(req,res,next)=>{
    const {fullName, email} = req.body

    if(!fullName && !email){
        throw new ApiError(400,'Fields cannot be empty')
    }

    const updates = {};
    if (fullName) updates.fullName = fullName;
    if (email) updates.email = email;

    const user = await User.aggregate([
        {
            $match:{
                _id:req.user?._id
            }
        },
        {
            $set:{
                ...updates // spread operator to include all updates
            }
        },
        {
            $project:{
                password:0,
                refreshToken:0,
            }
        },
        {
            $merge:{
                into:'users',
                whenMatched:'replace',  // merge changes with existing document
                whenNotMatched:'discard' // don't insert new document if not matched
            }
        }
    ])

    res
    .status(200)
    .json(
        new ApiResponse(200,{},'User details updated successfully')
    )

})

const updateUserAvatar = asyncHandler(async(req,res,next)=>{
    const avatarLocalPath = req.file?.path

    if(!avatarLocalPath){
        throw new ApiError(400,'Avatar file missing')
    }

    const user = await User.findById(req.user?._id)

    if (!user) {
        throw new ApiError(404, 'User not found');
    }

    const url = user.avatar

    const public_id = url.split('/')[url.split('/').length-1].split('.')[0]

    const deleteResponse = await deleteFromCloudinary(public_id)

    if(!deleteResponse){
        throw new ApiError(500,'File deletion failed')
    }

    const avatar = await uploadOnCloudinary(avatarLocalPath)

    if(!avatar){
        throw new ApiError(500,'Error while uploading file')
    }

    user.avatar = avatar.url

    await user.save({validateBeforeSave:false})

    return res
    .status(200)
    .json(
        new ApiResponse(
            200,
            await User.findById(user._id).select('-password -refreshToken'),
            "Avatar image updated successfully"
        )
    )
})


const googleAuthentication = asyncHandler(async(req,res,next)=>{
    const { method } = req.query?.type
    const state = crypto.randomBytes(20).toString('hex')

    const rawNonce = crypto.randomBytes(16).toString('hex')
    const nonce = crypto.createHash('sha256').update(rawNonce).digest('hex')

    await redisClient.setEx(`google:oauth2:state:${state}`,60*2,'valid')
    await redisClient.setEx(`google:oauth2:nonce:${nonce}`,60*2,'valid')

    try{
        const authURL = `https://accounts.google.com/o/oauth2/v2/auth?` +
        `client_id=${process.env.GOOGLE_CLIENT_ID}&` +
        `redirect_uri=${process.env.GOOGLE_REDIRECT_URI}&` +
        `response_type=${process.env.GOOGLE_OAUTH2_RESPONSE_TYPE}&` +
        `scope=${process.env.GOOGLE_OAUTH2_SCOPE}&` +
        `include_granted_scopes:true&` +
        `state=${state}&` +
        `nonce=${nonce}`

        if(method && method==='register'){
            authURL += `&prompt=consent&access_type=offline`
        }

        res.redirect(authURL)

    }
    catch(err){
        logger.error('Google Authentication Error: ', err)
        throw new ApiError(500, 'Google Authentication failed')
    }
})

const googleAuthorizationCallback = asyncHandler(async(req,res,next)=>{
    const {code,state} = req.query

    if(!state || !code){
        throw new ApiError(400, 'Invalid request parameters')
    }

    const isValidState = await redisClient.get(`google:oauth2:state:${state}`)

    if(!isValidState){
        throw new ApiError(400, 'Invalid or expired state parameter')
    }

    await redisClient.del(`google:oauth2:state:${state}`)

    try{
        const response = await axios.post(
            'https://oauth2.googleapis.com/token',
            {
                client_id: process.env.GOOGLE_CLIENT_ID,
                client_secret: process.env.GOOGLE_CLIENT_SECRET,
                redirect_uri: process.env.GOOGLE_REDIRECT_URI,
                grant_type: 'authorization_code',
                code: code
            }
        )

        // implement further logic here
        // check req.query.prompt to determine if it's a registration or login
        // if registration, create a new user in the database and add refresh token
        //if login no refresh token is there in response

        return res
        .status(200)
        .json(
            new ApiResponse(200, response.data, 'Google Authorization successful')
        )
    }
    catch(err){
        logger.error('Google Authorization Error: ', err)
        throw new ApiError(500, 'Google Authorization failed')
    }
})

export {
    registerUser,
    loginUser,
    logoutUser,
    refreshAccessToken,
    chnageCurrentPassword,
    getCurrentUser,
    updateAccountDetails,
    updateUserAvatar,
    googleAuthentication,
    googleAuthorizationCallback
}