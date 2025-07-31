const mongoose = require('mongoose');

const bookingSchema = new mongoose.Schema({
  parking_spot_id: { type: mongoose.Schema.Types.ObjectId, ref: 'ParkingSpot', required: true },
  vehicle_owner_id: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  vehicle_type: { type: String, enum: ['car', 'bike'], required: true },
  start_time: { type: Date, required: true },
  end_time: { type: Date, required: true },
  total_cost: { type: Number, required: true },
  status: { type: String, enum: ['pending', 'confirmed', 'cancelled'], default: 'pending' },
  created_at: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Booking', bookingSchema);