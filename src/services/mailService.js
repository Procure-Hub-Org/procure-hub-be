const nodemailer = require('nodemailer');

const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.EMAIL_USER, 
    pass: process.env.EMAIL_PASS,
  },
});

/**
 * Function for sending emails using nodemailer
 * @param {string} to - receiver email address
 * @param {string} subject - email subject
 * @param {string} text - email body text
 */

const sendMail = async ({ to, subject, text }) => {
  try {
    const mailOptions = {
      from: process.env.EMAIL_USER,
      to,
      subject,
      text,
    };

    await transporter.sendMail(mailOptions);
    console.log(`Email sent to: ${to}`);
  } catch (error) {
    console.error('Error while sending email:', error);
    throw error;
  }
};

module.exports = { sendMail };
