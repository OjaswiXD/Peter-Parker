const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
  first_name: { type: String, required: true },
  username: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  role: { type: String, enum: ['vehicle_owner', 'landowner', 'admin'], default: 'vehicle_owner' }, // Added 'admin'
  registration_type: { type: String },
  car_slots: { type: Number },
  bike_slots: { type: Number },
  bike_cost: { type: Number },
  car_cost: { type: Number },
  full_time: { type: Boolean, default: false },
  start_time: { type: String },
  end_time: { type: String },
  full_name: { type: String },
  contact_address: { type: String },
  phone_number: { type: String },
  id_type: { type: String },
  id_number: { type: String },
  photo_url: { type: String }, // for KYC photo
  id_url: { type: String }     // for KYC ID document
});

module.exports = mongoose.model('User', userSchema);