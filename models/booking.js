const mongoose = require('mongoose');

const bookingSchema = new mongoose.Schema({
    amount: { type: Number, required: true },
    checkin: { type: Date, required: true },
    checkout: { type: Date, required: true },
    guests: { type: String, required: true },
    orderId: { type: String, required: true },
});

const Booking = mongoose.model("Booking", bookingSchema);

module.exports = Booking;
