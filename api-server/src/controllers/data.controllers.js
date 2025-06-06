import asyncHandler from '../utils/asyncHandler.utils.js'
import ApiError from '../utils/ApiError.utils.js'
import ApiResponse from '../utils/ApiResponse.utils.js'
import api from '../utils/axiosInstance.js'
import logger from '../utils/logger.utils.js'

const coinStatus = asyncHandler(async(req,res,next)=>{
    const {coins, currency} = req.body

    try{
        const response = await api.get('/',{
            params:{
                vs_currency: currency,
                names:coins
            }
        })

        if(!response){
            throw new ApiError(500,'Coins not fetched due to internal error')
        }

        // store in mongoDB
        //store in redis

        return res
        .status(200)
        .json(
            new ApiResponse(200,response.data,'Coins data fetched successfully')
        )
    }
    catch(error){
        logger.error('Coin fetching failed: ',error)
    }
})

export {
    coinStatus
}