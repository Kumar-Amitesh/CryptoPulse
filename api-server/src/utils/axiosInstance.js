import axios from 'axios'
import dotenv from 'dotenv'

dotenv.config({
    path:'../../.env'
})

const api = axios.create({
    baseURL: process.env.CoinGecko_URL_COIN,
    headers:{
        'x-cg-api-key':process.env.CoinGecko_API_KEY
    }
})

export default api