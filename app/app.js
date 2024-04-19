import express from "express";
import cors from "cors";
// import bodyParser from "body-parser";
import router from "./routes/index.js";


const app =express();
app.use(cors());
app.use(express.json());
// app.use(bodyParser.text());
app.use(express.urlencoded());


router(app);

export default app;
