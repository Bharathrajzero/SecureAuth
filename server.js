require('dotenv').config();
const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const nodemailer = require('nodemailer');
const rateLimit = require('express-rate-limit');
const cors = require('cors');
const path = require('path');
const { createClient } = require('@supabase/supabase-js');

const app = express();
app.use(express.json());
app.use(cors());
app.use(express.static(path.join(__dirname, 'public')));

// Initialize Supabase Client
const supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
);

// Rate Limiters
const globalLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 100,
    message: { message: "Too many requests. Please try again later." }
});

const authLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 5,
    message: { message: "Too many attempts. Please try again in 15 minutes." }
});

app.use('/api/', globalLimiter);

// Nodemailer Transporter
const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS
    }
});

const generateOTP = () => Math.floor(100000 + Math.random() * 900000).toString();

// --- API ROUTES WITH SUPABASE ---

// 1. User Registration
app.post('/api/register', async (req, res) => {
    try {
        const { name, email, password } = req.body;
        const normalizedEmail = email.trim().toLowerCase();

        if (!name || !normalizedEmail || !password) {
            return res.status(400).json({ message: "All fields are required." });
        }

        // Check if user already exists
        const { data: existingUser } = await supabase
            .from('users')
            .select('*')
            .eq('email', normalizedEmail)
            .maybeSingle();

        if (existingUser && existingUser.is_verified) {
            return res.status(400).json({ message: "User already exists. Please log in." });
        }

        const hashedPassword = await bcrypt.hash(password, 12);
        const otp = generateOTP();
        const otpExpires = new Date(Date.now() + 10 * 60 * 1000).toISOString(); // 10 minutes

        if (existingUser) {
            // Update unverified user record
            await supabase
                .from('users')
                .update({ name, password_hash: hashedPassword, otp, otp_expires: otpExpires })
                .eq('email', normalizedEmail);
        } else {
            // Create new user record
            const { error } = await supabase.from('users').insert([{
                name,
                email: normalizedEmail,
                password_hash: hashedPassword,
                is_verified: false,
                otp,
                otp_expires: otpExpires
            }]);

            if (error) throw error;
        }

        // Send OTP via Email
        await transporter.sendMail({
            from: `"SecureAuth" <${process.env.EMAIL_USER}>`,
            to: normalizedEmail,
            subject: "Your Registration Verification Code",
            html: `
                <div style="font-family: Arial, sans-serif; padding: 20px; border: 1px solid #e0e0e0; border-radius: 8px;">
                    <h2 style="color: #4f46e5;">Welcome, ${name}!</h2>
                    <p>Your verification code is:</p>
                    <h1 style="color: #4f46e5; letter-spacing: 4px;">${otp}</h1>
                    <p>This code expires in 10 minutes.</p>
                </div>
            `
        });

        res.status(200).json({ message: "Verification code sent to your email." });
    } catch (error) {
        console.error('Registration Error:', error);
        res.status(500).json({ message: "Failed to process registration." });
    }
});

// 2. Verify Registration OTP
app.post('/api/verify-otp', authLimiter, async (req, res) => {
    try {
        const { email, otp } = req.body;
        const normalizedEmail = email.trim().toLowerCase();

        const { data: user } = await supabase
            .from('users')
            .select('*')
            .eq('email', normalizedEmail)
            .maybeSingle();

        if (!user) return res.status(404).json({ message: "User account not found." });
        if (user.is_verified) return res.status(400).json({ message: "Account is already verified." });

        if (user.otp !== otp || new Date(user.otp_expires) < new Date()) {
            return res.status(400).json({ message: "Invalid or expired verification code." });
        }

        // Update verification status in Supabase
        await supabase
            .from('users')
            .update({ is_verified: true, otp: null, otp_expires: null })
            .eq('email', normalizedEmail);

        res.status(200).json({ message: "Email verified successfully! You can now log in." });
    } catch (error) {
        res.status(500).json({ message: "Error verifying OTP." });
    }
});

// 3. User Login
app.post('/api/login', authLimiter, async (req, res) => {
    try {
        const { email, password } = req.body;
        const normalizedEmail = email.trim().toLowerCase();

        const { data: user } = await supabase
            .from('users')
            .select('*')
            .eq('email', normalizedEmail)
            .maybeSingle();

        if (!user) return res.status(400).json({ message: "Invalid email or password." });
        if (!user.is_verified) return res.status(403).json({ message: "Please verify your email address first." });

        const isMatch = await bcrypt.compare(password, user.password_hash);
        if (!isMatch) return res.status(400).json({ message: "Invalid email or password." });

        const token = jwt.sign(
            { id: user.id, email: user.email, name: user.name },
            process.env.JWT_SECRET,
            { expiresIn: '2h' }
        );

        res.status(200).json({
            message: "Login successful!",
            token,
            user: { name: user.name, email: user.email }
        });
    } catch (error) {
        res.status(500).json({ message: "Server error during login." });
    }
});

// 4. Forgot Password Request
app.post('/api/forgot-password', authLimiter, async (req, res) => {
    try {
        const { email } = req.body;
        const normalizedEmail = email.trim().toLowerCase();

        const { data: user } = await supabase
            .from('users')
            .select('*')
            .eq('email', normalizedEmail)
            .maybeSingle();

        if (!user || !user.is_verified) {
            return res.status(404).json({ message: "No verified account found with this email." });
        }

        const resetOtp = generateOTP();
        const resetOtpExpires = new Date(Date.now() + 10 * 60 * 1000).toISOString();

        await supabase
            .from('users')
            .update({ reset_otp: resetOtp, reset_otp_expires: resetOtpExpires })
            .eq('email', normalizedEmail);

        await transporter.sendMail({
            from: `"SecureAuth" <${process.env.EMAIL_USER}>`,
            to: normalizedEmail,
            subject: "Password Reset Code",
            html: `
                <div style="font-family: Arial, sans-serif; padding: 20px; border: 1px solid #e0e0e0; border-radius: 8px;">
                    <h2 style="color: #e11d48;">Password Reset Request</h2>
                    <p>Your 6-digit reset code is:</p>
                    <h1 style="color: #e11d48; letter-spacing: 4px;">${resetOtp}</h1>
                    <p>This code expires in 10 minutes.</p>
                </div>
            `
        });

        res.status(200).json({ message: "Password reset code sent to your email." });
    } catch (error) {
        res.status(500).json({ message: "Error sending password reset email." });
    }
});

// 5. Reset Password
app.post('/api/reset-password', authLimiter, async (req, res) => {
    try {
        const { email, otp, newPassword } = req.body;
        const normalizedEmail = email.trim().toLowerCase();

        const { data: user } = await supabase
            .from('users')
            .select('*')
            .eq('email', normalizedEmail)
            .maybeSingle();

        if (!user) return res.status(404).json({ message: "User account not found." });

        if (user.reset_otp !== otp || new Date(user.reset_otp_expires) < new Date()) {
            return res.status(400).json({ message: "Invalid or expired reset code." });
        }

        const newHashedPassword = await bcrypt.hash(newPassword, 12);

        await supabase
            .from('users')
            .update({ password_hash: newHashedPassword, reset_otp: null, reset_otp_expires: null })
            .eq('email', normalizedEmail);

        res.status(200).json({ message: "Password updated successfully! Please log in." });
    } catch (error) {
        res.status(500).json({ message: "Error resetting password." });
    }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server live on http://localhost:${PORT}`));