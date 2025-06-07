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

const STATE_TOKENS = new Set()
const NONCE = new Set()

const googleAuthentication = asyncHandler(async(req,res,next)=>{
    const state = crypto.randomBytes(20).toString('hex')
    STATE_TOKENS.add(state)

    const nonce = crypto.createHash('sha256').update(process.env.GOOGLE_NONCE || crypto.randomBytes(20).toString('hex')).digest('hex')
    NONCE.add(nonce)

    try{
        const response = await axios.get(
            'https://accounts.google.com/o/oauth2/v2/auth',
            {
                params:{
                    client_id: process.env.GOOGLE_CLIENT_ID,
                    redirect_uri: process.env.GOOGLE_REDIRECT_URI,
                    response_type: process.env.GOOGLE_OAUTH2_RESPONSE_TYPE,
                    scope: process.env.GOOGLE_OAUTH2_SCOPE,
                    state: state,
                    nonce: nonce
                }
            }
        )

        console.log('Google Authentication Response: ', response.data)
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

    if(!STATE_TOKENS.has(state)){
        throw new ApiError(400, 'Invalid state token')
    }

    const response = await axios.post(
        'https://oauth2.googleapis.com/token',
        {
            params: {
                client_id: process.env.GOOGLE_CLIENT_ID,
                client_secret: process.env.GOOGLE_CLIENT_SECRET,
                redirect_uri: process.env.GOOGLE_REDIRECT_URI,
                grant_type: 'authorization_code',
                code: code
            },
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded'
            }
        }
    )

    console.log('Google Authorization Response: ', response.data)

    if(response.status !== 200){
        logger.error('Google Authorization Error: ', response.data)
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
    updateUserAvatar
}