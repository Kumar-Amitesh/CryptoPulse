import express from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit'

const app = express()

app.use(cors({
    origin: process.env.CORS_ORIGIN,
    credentials: true
}))

app.use(express.json({limit: "5kb"}))
app.use(express.urlencoded({extended: true, limit: "5kb"}))
app.use(express.static('public'))
app.use(cookieParser())
app.use(helmet())

const limiter = rateLimit({
    // How long we should remember the requests. Defaults to 60000 ms (= 1 minute).
    windowMs: 15*60*1000,    //15 minutes
    // The maximum number of connections to allow during the window before rate limiting the client.
    // Limit each IP to 10 requests per `window` (here, per 15 minutes).
    limit:10,
    // Response to return after limit is reached.
    message: 'Too many requests from this IP, please try again later.',
    // HTTP status code after limit is reached (default is 429).
    statusCode: 429
})
app.use(limiter)

// import routes
import userRouter from './routes/user.routes.js'

//routes declaration
app.use('/api/v1/users',userRouter)

export default app