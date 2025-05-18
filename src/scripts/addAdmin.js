const readline = require('readline');
const bcrypt = require('bcrypt');
const { sequelize, User } = require("../../database/models"); // adjust path as needed

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
});

const ask = (question) => new Promise(resolve => rl.question(question, resolve));

(async () => {
  try {
    const email = await ask('Enter admin email: ');
    const password = await ask('Enter admin password: ');
    const firstName = await ask('Enter admin first name: ');
    const lastName = await ask('Enter admin last name: ');

    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(password, salt);

    const user = await User.create({
      email,
      password_hash: passwordHash,
      first_name: firstName,
      last_name: lastName,
      role: 'admin',
      status: 'active', // optional
    });

    console.log(`Admin user "${email}" created with ID: ${user.id}`);
  } catch (error) {
    console.error('Error creating admin user:', error.message || error);
  } finally {
    rl.close();
    await sequelize.close();
  }
})();
