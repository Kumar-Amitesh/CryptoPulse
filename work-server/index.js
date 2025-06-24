import { createClient } from 'redis'
import dotenv from 'dotenv';
import cron from 'node-cron';

dotenv.config(
    {
        path: '../.env'
    }
);

const client = createClient({
    username: process.env.REDIS_USERNAME,
    password: process.env.REDIS_PASSWORD,
    socket: {
        host: process.env.REDIS_HOST,
        port: process.env.REDIS_PORT
    }
})

client.on('error', (err) => {
    console.error(`Redis client error: ${err.message}`);
})
client.on('ready', () => {
    console.log('Redis client is ready');
});

const startWorker = async()=>{
    try{
        await client.connect();
        console.log(`Redis connected: ${process.env.REDIS_HOST}:${process.env.REDIS_PORT}`);

        // Schedule job every 15 minutes
        cron.schedule('5 * * * * *', async () => {
            const message = JSON.stringify({ trigger: 'update' });

            try {
                await client.publish('crypto-events', message);
                console.log(`[📣 Published] ${message} to channel 'crypto-events'`);
            } catch (err) {
                console.error('❌ Error publishing to Redis:', err);
            }
        })
    }
    catch(error){
        console.error(`Redis connection failed: ${error.message}`);
        process.exit(1);
    }
}
startWorker()
