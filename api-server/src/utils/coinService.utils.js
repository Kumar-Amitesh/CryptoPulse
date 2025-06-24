import asyncHnadler from "./asyncHandler.utils.js";
import ApiError from "./ApiError.utils.js";
// import ApiResponse from "./ApiResponse.utils.js";
import logger from "./logger.utils.js";
import api from './axiosInstance.utils.js'

const cryptoStats = asyncHnadler(async()=>{
    try {
        const response = await api.get('/', {
            params: {
                vs_currency: 'usd',
                names: 'Bitcoin,Ethereum,Matic-Network',
            },
        });

        // Validate API response
        if (!response.data || response.status !== 200 || !Array.isArray(response.data)) {
            throw new ApiError(500, 'Failed to fetch coins from API');
        }
        if (response.data.length === 0) {
            throw new ApiError(404, 'No data found for the requested coins');
        }

        // Store in Redis
        // for (const coin of response.data) {
        //     if (coin.name) {
        //         await redisClient.hSet(`data:coins:${currency}`, coin.name, JSON.stringify(coin));
        //     }
        // }
        // await redisClient.expire(`data:coins:${currency}`, 60); // Set to 60 seconds

        //store in mongodb
        console.log(response.data)
    } catch (error) {
        logger.error(`Coin fetching failed for coins ${coins} and currency ${currency}:`, error);
        throw new ApiError(500, 'Internal server error while fetching coins');
    }
})

export default cryptoStats