import asyncHandler from '../utils/asyncHandler.utils.js';
import ApiError from '../utils/ApiError.utils.js';
import ApiResponse from '../utils/ApiResponse.utils.js';
import api from '../utils/axiosInstance.utils.js';
import logger from '../utils/logger.utils.js';
import { client as redisClient } from '../config/redis.config.js';

const coinStatus = asyncHandler(async (req, res, next) => {
    const { coins, currency } = req.body;

    // Validate input
    if (!coins || typeof coins !== 'string' || coins.trim().length === 0) {
        throw new ApiError(400, 'Coins must be a non-empty comma-separated string');
    }
    const coinArray = coins.split(',').map(coin => coin.trim()).filter(coin => coin);
    if (coinArray.length === 0) {
        throw new ApiError(400, 'At least one valid coin ID is required');
    }
    if (!currency || typeof currency !== 'string' || currency.trim().length === 0) {
        throw new ApiError(400, 'Currency must be a valid non-empty string');
    }

    // Check cache for all coins
    const cachedCoins = [];
    try {
        for (const coin of coinArray) {
            const cached = await redisClient.hGet(`data:coins:${currency}`, coin);
            if (cached) {
                cachedCoins.push(JSON.parse(cached));
            } else {
                break; // If any coin is missing from cache, fetch from API
            }
        }

        // If all coins were found in cache, return them
        if (cachedCoins.length === coinArray.length) {
            return res
                .status(200)
                .json(
                    new ApiResponse(200, cachedCoins, 'Coins data fetched successfully from cache')
                );
        }
    } catch (error) {
        logger.error(`Redis cache check failed for currency ${currency}:`, error);
        // Continue to API call if cache check fails
    }

    // Fetch from API if cache miss
    try {
        const response = await api.get('/', {
            params: {
                vs_currency: currency,
                ids: coinArray.join(','), // Ensure clean comma-separated IDs
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
        for (const coin of response.data) {
            if (coin.name) {
                await redisClient.hSet(`data:coins:${currency}`, coin.name, JSON.stringify(coin));
            }
        }
        await redisClient.expire(`data:coins:${currency}`, 60); // Set to 60 seconds

        //store in mongodb

        return res
            .status(200)
            .json(
                new ApiResponse(200, response.data, 'Coins data fetched successfully')
            );
    } catch (error) {
        logger.error(`Coin fetching failed for coins ${coins} and currency ${currency}:`, error);
        throw new ApiError(500, 'Internal server error while fetching coins');
    }
});

export { coinStatus };