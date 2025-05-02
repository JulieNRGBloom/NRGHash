import express from 'express';
import nodemailer from 'nodemailer';

const router = express.Router();

router.post('/', async (req, res) => {
  const { email, message, userId } = req.body;

  if (!email || !message || !userId) {
    return res.status(400).json({ success: false, message: 'All fields are required' });
  }

  try {
    const transporter = nodemailer.createTransport({
      service: 'Gmail', // or another SMTP service
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS,
      },
    });

    const mailOptions = {
      from: email,
      to: 'julie@nrgbloom.com',
      subject: `New Contact Form Submission from User ${userId}`,
      text: `User ID: ${userId}\nEmail: ${email}\nMessage: ${message}`,
    };

    await transporter.sendMail(mailOptions);

    res.status(200).json({ success: true, message: 'Email sent successfully' });
  } catch (error) {
    console.error('Email sending failed:', error);
    res.status(500).json({ success: false, message: 'Failed to send email' });
  }
});

export default router;
