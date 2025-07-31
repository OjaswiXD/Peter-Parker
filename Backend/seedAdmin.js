const mongoose = require('mongoose');
const bcrypt = require('bcrypt');
const User = require('./models/User');

// Connect to MongoDB
mongoose.connect('mongodb://localhost:27017/Peter-Parker');

const db = mongoose.connection;
db.on('error', console.error.bind(console, 'MongoDB connection error:'));
db.once('open', () => {
  console.log('Connected to MongoDB for seeding');
  seedAdmin();
});

async function seedAdmin() {
  try {
    // Check if an admin user already exists
    const existingAdmin = await User.findOne({ role: 'admin' });
    if (existingAdmin) {
      console.log('Admin user already exists:', existingAdmin.username);
      mongoose.connection.close();
      return;
    }

    // Hash the admin password
    const adminPassword = 'Admin123';
    const hashedPassword = await bcrypt.hash(adminPassword, 10);

    // Create the admin user
    const adminUser = new User({
      first_name: 'Alex',
      username: 'admin@gmail.com',
      password: hashedPassword,
      role: 'admin',
      full_name: 'Alex Admin',
      contact_address: 'Admin Office',
      phone_number: '1234567890',
      full_time: false
    });

    // Save the admin user
    await adminUser.save();
    console.log('Admin user created successfully:', adminUser.username);

    // Verify the user was saved by querying the database
    const savedUser = await User.findOne({ username: 'admin@gmail.com' });
    if (savedUser) {
      console.log('Verified: Admin user exists in database:', savedUser);
    } else {
      console.log('Error: Admin user was not saved to the database!');
    }

    // Add a small delay to ensure the save operation is committed
    await new Promise(resolve => setTimeout(resolve, 1000));

    // Close the connection
    mongoose.connection.close();
  } catch (error) {
    console.error('Error seeding admin user:', error);
    mongoose.connection.close();
  }
}