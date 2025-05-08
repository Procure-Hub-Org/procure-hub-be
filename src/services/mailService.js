const nodemailer = require('nodemailer');
const { emailUser, emailPass } = require('../config/email');
const {generateOutbidEmailHtml} = require('../utils/templates/emailTemplates');

const transporter = nodemailer.createTransport({
  service: 'gmail',
  /*port: 465, //not mandatory
  secure: true,*/
  auth: {
    user: emailUser, 
    pass: emailPass,
  },
});

/**
 * Function for sending emails using nodemailer
 * @param {string} to - receiver email address
 * @param {string} subject - email subject
 * @param {string} text - email body text
 */

const sendMail = async ({ to, subject, text, html/*, attachments*/}) => {
  try {
    const mailOptions = {
      from: emailUser,
      to,
      subject,
      text,
      html, // HTML body content (optional),
      /*attachments:[
        {
          filename: '',
          path: '', // Path to the image file
          cid: '', // this must match the one used in <img src="cid:...">
        }
      ],*/ // Attachments (optional)
    };

    await transporter.sendMail(mailOptions);
    console.log(`Email sent to: ${to}`);
  } catch (error) {
    console.error('Error while sending email:', error);
    throw error;
  }
};

module.exports = { sendMail };
