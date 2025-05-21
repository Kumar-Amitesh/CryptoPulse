import mongoose from 'mongoose';
import {DB_NAME} from '../constants.js';


const connectDB = async()=>{
    try{
        const connectInstance = await mongoose.connect(`${process.env.MONGO_URI}/${DB_NAME}`,{
            useNewUrlParser: true,
            useUnifiedTopology: true,
        })
        console.log(`MongoDB connected: ${connectInstance.connection.host}`);
    }
    catch(err){
        console.error(`MongoDB connection failed ${err.message}`);
        process.exit(1);
    }
}

export default connectDB;