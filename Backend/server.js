const express = require('express');
const connectDB = require('./config/db');
const cors = require('cors');
const bcrypt = require('bcrypt');
const multer = require('multer');
const path = require('path');
const User = require('./models/User');
const ParkingSpot = require('./models/ParkingSpot');
const Booking = require('./models/Booking');
const Notification = require('./models/Notification');

const app = express();

connectDB();

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Set up multer for file uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, 'uploads/');
  },
  filename: (req, file, cb) => {
    cb(null, Date.now() + path.extname(file.originalname));
  }
});
const upload = multer({ storage });

// Create uploads folder if it doesn't exist
const fs = require('fs');
if (!fs.existsSync('uploads')) {
  fs.mkdirSync('uploads');
}

// Serve uploaded files statically
app.use('/uploads', express.static('uploads'));

// Middleware to check if user is admin
const isAdmin = async (req, res, next) => {
  const userId = req.headers['user-id'];
  if (!userId) {
    return res.status(401).json({ message: 'User ID required' });
  }
  try {
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }
    if (user.role !== 'admin') {
      return res.status(403).json({ message: 'Access denied: Admins only' });
    }
    req.user = user;
    next();
  } catch (error) {
    console.error('Error in isAdmin middleware:', error);
    res.status(500).json({ message: 'Server error in admin check', error: error.message });
  }
};

// Login Route
app.post('/api/login', async (req, res) => {
  console.log('Login attempt:', req.body);
  const { username, password } = req.body;

  if (!username || !password) {
    console.log('Missing username or password');
    return res.status(400).json({ message: 'Username and password are required' });
  }

  try {
    const allUsers = await User.find();
    console.log('All users in database:', allUsers.map(user => ({
      username: user.username,
      role: user.role,
      password: user.password
    })));

    const user = await User.findOne({ username });
    if (!user) {
      console.log('User not found:', username);
      return res.status(401).json({ message: 'Wrong username or password' });
    }

    console.log('Found user:', { username: user.username, password: user.password });
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      console.log('Password mismatch for:', username, 'Input password:', password);
      return res.status(401).json({ message: 'Wrong username or password' });
    }

    console.log('Login successful for:', username);
    res.json({ 
      message: 'Login successful', 
      user: { 
        username, 
        role: user.role, 
        id: user._id 
      }
    });
  } catch (error) {
    console.error('Login error:', error);
    if (error.name === 'MongoNetworkError') {
      res.status(500).json({ message: 'Database connection error', error: error.message });
    } else if (error.name === 'ValidationError') {
      res.status(400).json({ message: 'Validation error', error: error.message });
    } else {
      res.status(500).json({ message: 'Server error during login', error: error.message });
    }
  }
});

// Register Route
app.post('/api/register', upload.fields([
  { name: 'photo', maxCount: 1 },
  { name: 'id_document', maxCount: 1 }
]), async (req, res) => {
  console.log('Received registration data:', req.body);
  console.log('Files:', req.files);
  const {
    first_name, username, password, role,
    registration_type, car_slots, bike_slots, bike_cost, car_cost,
    full_time, start_time, end_time, full_name, contact_address,
    phone_number, id_type, id_number
  } = req.body;

  try {
    if (!first_name || !username || !password) {
      console.log('Missing required fields:', { first_name, username, password });
      return res.status(400).json({ message: 'First name, username, and password are required' });
    }

    const existingUser = await User.findOne({ username });
    if (existingUser) {
      console.log('Username already taken:', username);
      return res.status(400).json({ message: 'Username already taken' });
    }

    const validRoles = ['vehicle_owner', 'landowner', 'admin'];
    if (role && !validRoles.includes(role)) {
      console.log('Invalid role:', role);
      return res.status(400).json({ message: 'Invalid role. Must be vehicle_owner, landowner, or admin' });
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const user = new User({
      first_name,
      username,
      password: hashedPassword,
      role: role || 'vehicle_owner',
      registration_type,
      car_slots: car_slots ? parseInt(car_slots) : undefined,
      bike_slots: bike_slots ? parseInt(bike_slots) : undefined,
      bike_cost: bike_cost ? parseFloat(bike_cost) : undefined,
      car_cost: car_cost ? parseFloat(car_cost) : undefined,
      full_time: full_time === 'true',
      start_time,
      end_time,
      full_name,
      contact_address,
      phone_number,
      id_type,
      id_number,
      photo: req.files && req.files['photo'] ? req.files['photo'][0].path : null,
      id_document: req.files && req.files['id_document'] ? req.files['id_document'][0].path : null
    });
    console.log('New user to save:', user);
    const savedUser = await user.save();
    console.log('User saved successfully:', savedUser);
    res.status(200).json({ message: 'Registration successful' });
  } catch (error) {
    console.error('Error saving user:', error);
    if (error.code === 11000) {
      res.status(400).json({ message: 'Username already taken', error: error.message });
    } else if (error.name === 'ValidationError') {
      res.status(400).json({ message: 'Validation error', error: error.message });
    } else {
      res.status(500).json({ message: 'Server error during registration', error: error.message });
    }
  }
});

app.post('/api/parking-spots', async (req, res) => {
  const { landowner_id, location, car_slots, bike_slots, car_cost, bike_cost, full_time, start_time, end_time, latitude, longitude } = req.body;
  try {
    // Validate required fields
    if (!landowner_id) {
      return res.status(400).json({ message: 'landowner_id is required' });
    }
    if (!location) {
      return res.status(400).json({ message: 'location is required' });
    }
    if (car_slots === undefined || isNaN(car_slots) || Number(car_slots) < 0) {
      return res.status(400).json({ message: 'car_slots must be 0 or a positive number' });
    }
    if (bike_slots === undefined || isNaN(bike_slots) || Number(bike_slots) < 0) {
      return res.status(400).json({ message: 'bike_slots must be 0 or a positive number' });
    }
    if (Number(car_slots) === 0 && Number(bike_slots) === 0) {
      return res.status(400).json({ message: 'At least one of car_slots or bike_slots must be greater than 0' });
    }
    if (Number(car_slots) > 0 && (!car_cost || isNaN(car_cost) || Number(car_cost) <= 0)) {
      return res.status(400).json({ message: 'car_cost must be a positive number if car_slots are provided' });
    }
    if (Number(bike_slots) > 0 && (!bike_cost || isNaN(bike_cost) || Number(bike_cost) <= 0)) {
      return res.status(400).json({ message: 'bike_cost must be a positive number if bike_slots are provided' });
    }
    if (!latitude || isNaN(latitude)) {
      return res.status(400).json({ message: 'latitude must be a valid number' });
    }
    if (!longitude || isNaN(longitude)) {
      return res.status(400).json({ message: 'longitude must be a valid number' });
    }
    if (!full_time && (!start_time || !end_time)) {
      return res.status(400).json({ message: 'start_time and end_time are required if not full_time' });
    }

    const landowner = await User.findById(landowner_id);
    if (!landowner) {
      return res.status(404).json({ message: 'Landowner not found' });
    }

    console.log('Creating parking spot with user:', {
      landowner_id,
      username: landowner.username,
      role: landowner.role
    });

    const newParkingSpot = new ParkingSpot({
      landowner_id,
      location,
      car_slots: parseInt(car_slots),
      bike_slots: parseInt(bike_slots),
      car_cost: parseFloat(car_cost || 0),
      bike_cost: parseFloat(bike_cost || 0),
      full_time: full_time === 'true',
      start_time,
      end_time,
      latitude: parseFloat(latitude),
      longitude: parseFloat(longitude)
    });
    const savedSpot = await newParkingSpot.save();
    res.json({ message: 'Parking spot listed successfully', parkingSpot: savedSpot });
  } catch (error) {
    console.error('Error listing parking spot:', error);
    if (error.name === 'ValidationError') {
      const validationErrors = Object.values(error.errors).map(err => err.message).join(', ');
      res.status(400).json({ message: `Validation error: ${validationErrors}` });
    } else {
      res.status(500).json({ message: 'Server error listing parking spot', error: error.message });
    }
  }
});

app.get('/api/parking-spots', async (req, res) => {
  const { location } = req.query;
  try {
    console.log(`Searching parking spots with location: "${location}"`);
    const userId = req.headers['user-id'];
    let parkingSpots;

    if (userId) {
      const user = await User.findById(userId);
      if (user && user.role === 'admin') {
        parkingSpots = await ParkingSpot.find()
          .populate('landowner_id', 'full_name contact_address phone_number');
      } else {
        const query = {};
        if (location) {
          query.location = { $regex: location, $options: 'i' };
        }
        parkingSpots = await ParkingSpot.find(query)
          .populate('landowner_id', 'full_name contact_address phone_number');
      }
    } else {
      const query = {};
      if (location) {
        query.location = { $regex: location, $options: 'i' };
      }
      parkingSpots = await ParkingSpot.find(query)
        .populate('landowner_id', 'full_name contact_address phone_number');
    }

    console.log('Found parking spots:', parkingSpots.map(spot => ({
      id: spot._id,
      location: spot.location,
      available: spot.available
    })));
    res.json(parkingSpots);
  } catch (error) {
    console.error('Error fetching parking spots:', error);
    res.status(500).json({ message: 'Server error fetching parking spots', error: error.message });
  }
});

app.get('/api/parking-spots/landowner/:landowner_id', async (req, res) => {
  const { landowner_id } = req.params;
  try {
    const parkingSpots = await ParkingSpot.find({ landowner_id });
    res.json(parkingSpots);
  } catch (error) {
    console.error('Error fetching landowner parking spots:', error);
    res.status(500).json({ message: 'Server error fetching landowner parking spots', error: error.message });
  }
});

app.delete('/api/parking-spots/:id', isAdmin, async (req, res) => {
  const { id } = req.params;
  try {
    const parkingSpot = await ParkingSpot.findById(id);
    if (!parkingSpot) {
      return res.status(404).json({ message: 'Parking spot not found' });
    }
    await ParkingSpot.findByIdAndDelete(id);
    res.json({ message: 'Parking spot deleted successfully' });
  } catch (error) {
    console.error('Error deleting parking spot:', error);
    res.status(500).json({ message: 'Server error deleting parking spot', error: error.message });
  }
});

app.put('/api/parking-spots/:id', async (req, res) => {
  const { id } = req.params;
  const userId = req.headers['user-id'];

  try {
    const user = await User.findById(userId);
    if (!user || user.role !== 'admin') {
      return res.status(403).json({ message: 'Access denied: Admins only' });
    }

    const parkingSpot = await ParkingSpot.findById(id);
    if (!parkingSpot) {
      return res.status(404).json({ message: 'Parking spot not found' });
    }

    const updatedSpot = await ParkingSpot.findByIdAndUpdate(
      id,
      {
        location: req.body.location,
        car_slots: parseInt(req.body.car_slots),
        bike_slots: parseInt(req.body.bike_slots),
        car_cost: parseFloat(req.body.car_cost),
        bike_cost: parseFloat(req.body.bike_cost),
        full_time: req.body.full_time,
        landowner_id: req.body.landowner_id,
        latitude: parseFloat(req.body.latitude),
        longitude: parseFloat(req.body.longitude)
      },
      { new: true }
    );

    res.json({ message: 'Parking spot updated successfully', parkingSpot: updatedSpot });
  } catch (error) {
    console.error('Error updating parking spot:', error);
    res.status(500).json({ message: 'Server error updating parking spot', error: error.message });
  }
});

app.post('/api/bookings', async (req, res) => {
  const { parking_spot_id, vehicle_owner_id, vehicle_type, start_time, end_time } = req.body;
  try {
    const parkingSpot = await ParkingSpot.findById(parking_spot_id).populate('landowner_id', 'full_name username');
    if (!parkingSpot) {
      return res.status(404).json({ message: 'Parking spot not found' });
    }
    if (!parkingSpot.available) {
      return res.status(400).json({ message: 'Parking spot is not available' });
    }

    const start = new Date(start_time);
    const end = new Date(end_time);
    const hours = (end - start) / (1000 * 60 * 60);
    if (hours <= 0) {
      return res.status(400).json({ message: 'End time must be after start time' });
    }
    const costPerHour = vehicle_type === 'car' ? parkingSpot.car_cost : parkingSpot.bike_cost;
    const total_cost = hours * costPerHour;

    const availableSlots = vehicle_type === 'car' ? parkingSpot.car_slots : parkingSpot.bike_slots;
    const existingBookings = await Booking.find({
      parking_spot_id,
      status: { $in: ['pending', 'confirmed'] },
      $or: [
        { start_time: { $lte: end }, end_time: { $gte: start } },
        { start_time: { $gte: start, $lte: end } }
      ]
    });
    const bookedSlots = existingBookings.length;
    if (bookedSlots >= availableSlots) {
      return res.status(400).json({ message: `No ${vehicle_type} slots available for this time` });
    }

    // Validate vehicle_owner_id
    const vehicleOwner = await User.findById(vehicle_owner_id);
    if (!vehicleOwner) {
      return res.status(404).json({ message: 'Vehicle owner not found' });
    }
    console.log('Creating booking with vehicle owner:', {
      vehicle_owner_id,
      first_name: vehicleOwner.first_name,
      username: vehicleOwner.username,
      role: vehicleOwner.role
    });

    const newBooking = new Booking({
      parking_spot_id,
      vehicle_owner_id,
      vehicle_type,
      start_time: start,
      end_time: end,
      total_cost
    });
    const savedBooking = await newBooking.save();

    if (bookedSlots + 1 >= availableSlots) {
      parkingSpot.available = false;
      await parkingSpot.save();
    }

    // Notification for landowner
    await Notification.create({
      user_id: parkingSpot.landowner_id,
      message: `New booking for your parking spot at ${parkingSpot.location} by ${vehicleOwner.username}.`
    });
    // Notification for vehicle owner
    await Notification.create({
      user_id: vehicle_owner_id,
      message: `You (${vehicleOwner.username}) have booked a parking spot at ${parkingSpot.location}.`
    });

    res.json({ message: 'Booking created successfully', booking: savedBooking });
  } catch (error) {
    console.error('Error creating booking:', error);
    res.status(500).json({ message: 'Server error creating booking', error: error.message });
  }
});

app.get('/api/bookings/landowner/:landowner_id', async (req, res) => {
  const { landowner_id } = req.params;
  try {
    const parkingSpots = await ParkingSpot.find({ landowner_id });
    const parkingSpotIds = parkingSpots.map(spot => spot._id);
    const bookings = await Booking.find({ parking_spot_id: { $in: parkingSpotIds } })
      .populate('vehicle_owner_id', 'first_name username')
      .populate('parking_spot_id', 'location');
    
    console.log('Bookings for landowner:', landowner_id);
    bookings.forEach(booking => {
      console.log('Booking:', {
        id: booking._id,
        parking_spot_id: booking.parking_spot_id?._id,
        vehicle_owner_id: booking.vehicle_owner_id?._id,
        vehicle_owner_first_name: booking.vehicle_owner_id?.first_name,
        vehicle_owner_username: booking.vehicle_owner_id?.username
      });
    });

    res.json(bookings);
  } catch (error) {
    console.error('Error fetching bookings:', error);
    res.status(500).json({ message: 'Server error fetching bookings', error: error.message });
  }
});

app.get('/api/bookings', isAdmin, async (req, res) => {
  try {
    const bookings = await Booking.find()
      .populate('vehicle_owner_id', 'first_name username')
      .populate('parking_spot_id', 'location')
      .populate({
        path: 'parking_spot_id',
        populate: { path: 'landowner_id', select: 'full_name' }
      });
    res.json(bookings);
  } catch (error) {
    console.error('Error fetching all bookings:', error);
    res.status(500).json({ message: 'Server error fetching all bookings', error: error.message });
  }
});

app.put('/api/bookings/:id', async (req, res) => {
  const { id } = req.params;
  const { status } = req.body;
  try {
    console.log(`Updating booking ${id} with status: ${status}`);
    const booking = await Booking.findById(id);
    if (!booking) {
      console.log(`Booking ${id} not found`);
      return res.status(404).json({ message: 'Booking not found' });
    }

    booking.status = status;
    await booking.save();
    console.log(`Booking ${id} status updated to ${status}`);

    if (status === 'cancelled') {
      console.log(`Handling cancellation for booking ${id}`);
      const parkingSpot = await ParkingSpot.findById(booking.parking_spot_id);
      if (!parkingSpot) {
        console.log(`Parking spot ${booking.parking_spot_id} not found for booking ${id}`);
      } else {
        const availableSlots = booking.vehicle_type === 'car' ? parkingSpot.car_slots : parkingSpot.bike_slots;
        const activeBookings = await Booking.find({
          parking_spot_id: booking.parking_spot_id,
          status: { $in: ['pending', 'confirmed'] }
        });
        if (activeBookings.length < availableSlots) {
          parkingSpot.available = true;
          await parkingSpot.save();
          console.log(`Parking spot ${parkingSpot._id} availability updated to true`);
        }
      }
    }

    let parkingSpot = null;
    try {
      parkingSpot = await ParkingSpot.findById(booking.parking_spot_id).populate('landowner_id', 'full_name username');
      if (!parkingSpot) {
        console.log(`Parking spot ${booking.parking_spot_id} not found for booking ${id}`);
      }
    } catch (error) {
      console.error(`Error fetching parking spot for booking ${id}:`, error);
    }

    let vehicleOwner = null;
    try {
      vehicleOwner = await User.findById(booking.vehicle_owner_id);
      if (!vehicleOwner) {
        console.log(`Vehicle owner ${booking.vehicle_owner_id} not found for booking ${id}`);
      }
    } catch (error) {
      console.error(`Error fetching vehicle owner for booking ${id}:`, error);
    }

    let landowner = null;
    if (parkingSpot) {
      try {
        landowner = await User.findById(parkingSpot.landowner_id);
        if (!landowner) {
          console.log(`Landowner ${parkingSpot.landowner_id} not found for parking spot ${parkingSpot._id}`);
        }
      } catch (error) {
        console.error(`Error fetching landowner for parking spot ${parkingSpot._id}:`, error);
      }
    }

    if (parkingSpot && vehicleOwner && landowner) {
      try {
        await Notification.create({
          user_id: booking.vehicle_owner_id,
          message: `Your booking at ${parkingSpot.location} has been ${status}.`
        });
        console.log(`Notification created for vehicle owner ${booking.vehicle_owner_id}`);
      } catch (error) {
        console.error(`Error creating notification for vehicle owner ${booking.vehicle_owner_id}:`, error);
      }

      try {
        await Notification.create({
          user_id: parkingSpot.landowner_id,
          message: `Booking at ${parkingSpot.location} by ${vehicleOwner.username} has been ${status}.`
        });
        console.log(`Notification created for landowner ${parkingSpot.landowner_id}`);
      } catch (error) {
        console.error(`Error creating notification for landowner ${parkingSpot.landowner_id}:`, error);
      }
    }

    res.json({ message: `Booking ${status} successfully`, booking });
  } catch (error) {
    console.error('Error updating booking status:', error);
    res.status(500).json({ message: 'Server error updating booking status', error: error.message });
  }
});

app.get('/api/bookings/vehicle-owner/:vehicle_owner_id', async (req, res) => {
  const { vehicle_owner_id } = req.params;
  try {
    const bookings = await Booking.find({ vehicle_owner_id })
      .populate('parking_spot_id', 'location')
      .populate({
        path: 'parking_spot_id',
        populate: { path: 'landowner_id', select: 'full_name phone_number contact_address' }
      });

    console.log('Bookings for vehicle owner:', vehicle_owner_id);
    bookings.forEach(booking => {
      console.log('Booking:', {
        id: booking._id,
        parking_spot_id: booking.parking_spot_id?._id,
        landowner_id: booking.parking_spot_id?.landowner_id?._id,
        landowner_full_name: booking.parking_spot_id?.landowner_id?.full_name
      });
    });

    res.json(bookings);
  } catch (error) {
    console.error('Error fetching vehicle owner bookings:', error);
    res.status(500).json({ message: 'Server error fetching vehicle owner bookings', error: error.message });
  }
});

app.delete('/api/bookings/:id', isAdmin, async (req, res) => {
  const { id } = req.params;
  try {
    const booking = await Booking.findById(id);
    if (!booking) {
      return res.status(404).json({ message: 'Booking not found' });
    }
    await Booking.findByIdAndDelete(id);

    const parkingSpot = await ParkingSpot.findById(booking.parking_spot_id);
    const availableSlots = booking.vehicle_type === 'car' ? parkingSpot.car_slots : parkingSpot.bike_slots;
    const activeBookings = await Booking.find({
      parking_spot_id: booking.parking_spot_id,
      status: { $in: ['pending', 'confirmed'] }
    });
    if (activeBookings.length < availableSlots) {
      parkingSpot.available = true;
      await parkingSpot.save();
    }

    res.json({ message: 'Booking deleted successfully' });
  } catch (error) {
    console.error('Error deleting booking:', error);
    res.status(500).json({ message: 'Server error deleting booking', error: error.message });
  }
});

app.get('/api/users', isAdmin, async (req, res) => {
  try {
    const users = await User.find();
    res.json(users);
  } catch (error) {
    console.error('Error fetching users:', error);
    res.status(500).json({ message: 'Server error fetching users', error: error.message });
  }
});

app.delete('/api/users/:id', isAdmin, async (req, res) => {
  const { id } = req.params;
  try {
    const user = await User.findById(id);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }
    if (user.role === 'admin') {
      return res.status(403).json({ message: 'Cannot delete admin users' });
    }
    await User.findByIdAndDelete(id);
    res.json({ message: 'User deleted successfully' });
  } catch (error) {
    console.error('Error deleting user:', error);
    res.status(500).json({ message: 'Server error deleting user', error: error.message });
  }
});

app.get('/api/notifications/:user_id', async (req, res) => {
  const { user_id } = req.params;
  try {
    const notifications = await Notification.find({ user_id, read: false })
      .sort({ created_at: -1 });
    res.json(notifications);
  } catch (error) {
    console.error('Error fetching notifications:', error);
    res.status(500).json({ message: 'Server error fetching notifications', error: error.message });
  }
});

app.put('/api/notifications/:id/read', async (req, res) => {
  const { id } = req.params;
  try {
    const notification = await Notification.findById(id);
    if (!notification) {
      return res.status(404).json({ message: 'Notification not found' });
    }
    notification.read = true;
    await notification.save();
    res.json({ message: 'Notification marked as read' });
  } catch (error) {
    console.error('Error marking notification as read:', error);
    res.status(500).json({ message: 'Server error marking notification as read', error: error.message });
  }
});

const PORT = 5000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));