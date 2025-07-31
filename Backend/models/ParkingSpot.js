const mongoose = require('mongoose');

const parkingSpotSchema = new mongoose.Schema({
  landowner_id: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  location: { type: String, required: true },
  car_slots: { type: Number, required: true },
  bike_slots: { type: Number, required: true },
  car_cost: { type: Number, required: true },
  bike_cost: { type: Number, required: true },
  full_time: { type: Boolean, default: false },
  start_time: { type: String },
  end_time: { type: String },
  available: { type: Boolean, default: true },
  latitude: { type: Number, required: true }, 
  longitude: { type: Number, required: true } 
}, { timestamps: true });

module.exports = mongoose.model('ParkingSpot', parkingSpotSchema);