if(process.env.NODE_ENV != "production"){
    require('dotenv').config();
}

const express=require("express");
const app=express();
const mongoose=require("mongoose");
const path =require ("path");
const methodOverride=require("method-override");
const ejsMate = require("ejs-mate");
const ExpressError=require("./utils/ExpressError.js");
const session=require("express-session");
const MongoStore = require('connect-mongo');
const flash= require("connect-flash");
const passport = require("passport");
const LocalStrategy =require("passport-local");
const User= require("./models/user.js");


const listingRouter=require("./routes/listing.js");
const reviewRouter = require("./routes/review.js");
const userRouter = require("./routes/user.js");

const Razorpay = require("razorpay");

const razorpay = new Razorpay({
    key_id: process.env.RAZORPAY_KEY_ID,
    key_secret: process.env.RAZORPAY_KEY_SECRET,
});


const dbUrl=process.env.ATLASDB_URL;

main()
    .then(()=>{
        console.log("connected to DB");
    })
    .catch((err)=>{
        console.log(err);
    });
async function main(){
    await mongoose.connect(dbUrl);
}

app.set ("view engine", "ejs");
app.set("views", path.join(__dirname, "views"));
app.use(express.urlencoded({extended:true}));
app.use(methodOverride("_method"));
app.engine("ejs",ejsMate);
app.use(express.static(path.join(__dirname, "/public")));

const store = MongoStore.create({
    mongoUrl: dbUrl,
    crypto: {
        secret: process.env.SECRET,
    },
    touchAfter: 24*3600,
});

store.on("error", () => {
    console.log("ERROR in MONGO SESSION STORE", err);
});

const sessionOptions={
    store,
    secret:process.env.SECRET,
    resave:false,
    saveUnintialized:true,
    cookie:{
        expires :Date.now()+1000*60*60*24*3,
        maxAge:1000*60*60*24*3,
        httpOnly:true
    },
};

// app.get("/",(req,res)=>{
//     res.send("Hi, I am root");
// });

app.use(session(sessionOptions));
app.use(flash());

app.use(passport.initialize());
app.use(passport.session());
passport.use(new LocalStrategy(User.authenticate()));

passport.serializeUser(User.serializeUser());
passport.deserializeUser(User.deserializeUser());

app.use((req,res,next)=>{
    res.locals.success = req.flash("success");
    res.locals.error = req.flash("error");
    res.locals.currUser =req.user;
    next();
});

app.post("/create-order", async (req, res) => {
    try {
        console.log("Request body:", req.body); // Debugging log
        const { amount } = req.body;

        if (!amount || typeof amount !== "number") {
            return res.status(400).json({ error: "Invalid or missing amount" });
        }

        const order = await razorpay.orders.create({
            amount: amount * 100, // Convert to paise
            currency: "INR",
            receipt: `receipt_${Date.now()}`,
        });

        res.json({ orderId: order.id });
    } catch (error) {
        console.error("Error creating Razorpay order:", error);
        res.status(500).json({ error: "Something went wrong while creating the order." });
    }
});



// app.get("/demouser", async(req,res)=>{
//     let fakeUser = new User({
//         email:"student@gmail.com",
//         username: "delta-student",
//     });

//     let registeredUser =await User.register(fakeUser, "helloworld");
//     res.send(registeredUser);
// });

const validateListing =(req,res,next)=>{
    let {error}= listingSchema.validate(req.body);
    if(error){
        let errMsg =error.details.map((el)=> el.message).join(",");
        throw new ExpressError(400, errMsg);
    }else{
        next();
    }
}

app.use("/listings",listingRouter);
app.use("/listings/:id/reviews", reviewRouter);
app.use("/", userRouter);


app.all("*",(req,res,next)=>{
    next(new ExpressError(404,"Page Not Found!"));
});

app.use((err,req,res,next)=>{
    let {statusCode=500, message="Something went wrong!"}=err;
    // res.render("error.ejs",{message})
    res.status (statusCode).render("error.ejs",{message});
});

app.listen(8080, ()=>{
    console.log("server is listening to port 8080");
});