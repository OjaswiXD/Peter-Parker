const bcrypt = require('bcrypt');

async function hashPassword() {
  const password = 'Admin123';
  const hashedPassword = await bcrypt.hash(password, 10);
  console.log('Hashed password:', hashedPassword);
}

hashPassword();