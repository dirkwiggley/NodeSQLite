import express from "express"
import * as dotenv from "dotenv"
import cookieParser from "cookie-parser"
import cors from "cors"

import userRoute from "./routes/users.js"
import videoRoute from "./routes/videos.js"
import videoListRoute from './routes/videoList.js'
import videoInListRoute from './routes/videoInList.js';
import dbUtilsRoute from "./routes/dbutils.js"

const app = express();
if (process.env.DEBUG !== 'true') {
  app.use(function (req, res, next) {	
    res.setHeader('Access-Control-Allow-Headers', 'X-Requested-With,content-type');
    next();
  });
}
dotenv.config()
var corsOptions = process.env.DEBUG === 'true' ? {
  credentials : true,
  origin: 'http://10.0.0.154:3000', 
} : {
  credentials : true,
  origin: 'https://softwarewolf2.loca.lt',
};
app.use(cors(corsOptions))

// DEBUGGING 
console.debug(process.env.SECRET_DATA)
console.debug(process.env.ACCESS_KEY)

app.use(express.json())
app.use(cookieParser())

app.use("/users", userRoute)
app.use("/videos", videoRoute)
app.use("/video_list", videoListRoute)
app.use("/video_in_list", videoInListRoute)
app.use("/dbutils", dbUtilsRoute)
app.use("/", userRoute)

// Error handler
app.use((err,req,res,next)=>{
  console.log(err.message)
  const errorStatus = err.status || 500
  const errorMessage = err.message || "Error in backend"
  return res.status(errorStatus).json({
    success: false,
    status: errorStatus,
    message: errorMessage,
    stack: err.stack
  })
})

app.listen(8800, ()=>{
  console.log("Connected to port 8800")
})
