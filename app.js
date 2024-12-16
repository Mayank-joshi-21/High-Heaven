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
const Booking = require("./models/booking.js");
const {validateReview, isLoggedIn, isReviewAuthor}= require("./middleware.js");

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
app.use(express.json()); // To parse incoming JSON bodies


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

app.post("/create-order", isLoggedIn, async (req, res) => {
    try {
        const { amount, checkin, checkout, guests } = req.body;
        console.log("Received data:", req.body); // Log the request body for debugging

        // Validate required fields
        if (!amount || typeof amount !== "number" || amount <= 0 || !checkin || !checkout || !guests) {
            return res.status(400).json({ error: "Missing required fields" });
        }

        // Create Razorpay order
        const order = await razorpay.orders.create({
            amount: amount * 100, // Convert to paise
            currency: "INR",
            receipt: `receipt_${Date.now()}`,
        });

        console.log("Razorpay order created:", order);

        if (!order || !order.id) {
            return res.status(500).json({ error: "Failed to create Razorpay order" });
        }

        // Save booking data into the database
        const bookingData = {
            amount,
            checkin,
            checkout,
            guests,
            orderId: order.id, // Save Razorpay order ID
        };

        const booking = await Booking.create(bookingData); // Save booking to the database
        console.log("Booking saved to database:", booking);

        res.json({ orderId: order.id, bookingId: booking._id }); // Return both orderId and bookingId
    } catch (error) {
        console.error("Error creating order or saving booking:", error);
        res.status(500).json({ error: "Something went wrong while creating the order or saving the booking." });
    }
});



// POST endpoint to update the booking after successful payment
app.post("/update-booking", async (req, res) => {
    const { paymentId, orderId } = req.body;

    console.log("Payment received", req.body);  // Debug the received data

    // Check if paymentId and orderId are present
    if (!paymentId || !orderId) {
        return res.status(400).json({ error: "Invalid data. Payment ID and Order ID are required." });
    }

    try {
        // Update the booking using the orderId
        const booking = await Booking.findOneAndUpdate(
            { orderId: orderId },  // Find the booking by orderId
            { paymentId: paymentId, status: 'paid' },  // Update paymentId and status
            { new: true }  // Return the updated document
        );

        if (!booking) {
            return res.status(404).json({ error: "Booking not found." });
        }

        // Respond with a success message
        res.json({ message: "Booking updated successfully", booking });
    } catch (error) {
        console.error("Error updating booking:", error);
        res.status(500).json({ error: "Failed to update booking" });
    }
});

app.get("/orders", isLoggedIn, async (req, res) => {
    try {
        // Fetch all bookings from the database
        const bookings = await Booking.find({});
        res.render("order", { bookings }); // Render the 'order.ejs' template and pass the bookings
    } catch (error) {
        console.error("Error fetching bookings:", error);
        req.flash("error", "Failed to load orders.");
        res.redirect("/");
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