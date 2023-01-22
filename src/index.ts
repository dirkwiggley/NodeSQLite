import express from "express"
import * as dotenv from "dotenv"
import cookieParser from "cookie-parser"
import cors from "cors"

import authRoute from "./routes/auth.js"
import userRoute from "./routes/users.js"
import roleRoute from "./routes/roles.js"
import dbUtilsRoute from "./routes/dbutils.js"
import testRoute from "./routes/test.js"

const app = express()
app.use(function (req, res, next) {	
  res.setHeader('Access-Control-Allow-Headers', 'X-Requested-With,content-type');
  next();
});
var corsOptions = {
  credentials : true,
  origin: 'https://clowncar.loca.lt',
}
app.use(cors(corsOptions))
dotenv.config()

// DEBUGGING 
console.debug(process.env.SECRET_DATA)
console.debug(process.env.ACCESS_KEY)

app.use(express.json())
app.use(cookieParser())

app.use("/auth", authRoute)
app.use("/users", userRoute)
app.use("/roles", roleRoute)
app.use("/dbutils", dbUtilsRoute)
app.use("/test", testRoute)
app.use("/", testRoute)

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
