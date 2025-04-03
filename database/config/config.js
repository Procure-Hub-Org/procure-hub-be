require('dotenv').config();

module.exports = {
  development: {
    username: process.env.DB_USER,
    password: process.env.DB_PASS,
    database: process.env.DB_NAME,
    host: process.env.DB_HOST,
    dialect: "postgres",
  },
  production: {
    username: process.env.SUPABASE_USER,
    password: process.env.SUPABASE_PASSWORD,
    database: process.env.SUPABASE_DB,
    host: process.env.SUPABASE_HOST,
    dialect: "postgres",
  }
};