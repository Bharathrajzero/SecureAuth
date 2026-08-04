<div align="center">

# 🔐 SecureAuth

  <p>
    <b>A production-ready, full-stack authentication system built with Node.js, Express, Supabase (PostgreSQL), Nodemailer, and Vanilla JS.</b>
  </p>

  <p>
    <a href="https://github.com/Bharathrajzero/SecureAuth/blob/main/LICENSE">
      <img src="https://img.shields.io/badge/License-MIT-yellow.svg" alt="License: MIT" />
    </a>
    <a href="https://nodejs.org/">
      <img src="https://img.shields.io/badge/Node.js-v16%2B-green.svg?logo=node.js" alt="Node.js Version" />
    </a>
    <a href="https://supabase.com/">
      <img src="https://img.shields.io/badge/Database-Supabase-3ECF8E.svg?logo=supabase&logoColor=white" alt="Supabase" />
    </a>
    <a href="https://expressjs.com/">
      <img src="https://img.shields.io/badge/Backend-Express.js-000000.svg?logo=express" alt="Express" />
    </a>
  </p>

  <sub>Includes real-time Email OTP verification, Password Reset workflows, Bcrypt hashing, JWT session management, Rate limiting, and a Glassmorphism Single-Page UI with Dark & Light themes.</sub>

</div>

---

##  Screenshots

<table>
  <tr>
    <td width="50%"><img src="https://github.com/user-attachments/assets/80a2583f-96a4-4877-a133-e1770d9984d9" alt="Login View"></td>
    <td width="50%"><img src="https://github.com/user-attachments/assets/e80cc2c8-4568-4754-98df-e9b057e08d80" alt="Sign Up View"></td>
  </tr>
  <tr>
    <td width="50%"><img src="https://github.com/user-attachments/assets/e9ad6817-61d4-4c4e-bfe7-527a55174875" alt="OTP Verification"></td>
    <td width="50%"><img src="https://github.com/user-attachments/assets/49d8429e-a3be-475a-8b38-34ce89e425ec" alt="Dashboard View"></td>
  </tr>
</table>

---

##  Features

- 🌓 **Dark & Light Mode Toggle**: Seamlessly switches themes with smooth CSS transitions, system preference auto-detection (`prefers-color-scheme`), and `localStorage` persistence.
- 🗄️ **Supabase Database Persistence**: User profiles, password hashes, and OTP tokens are securely persisted in a PostgreSQL database using Supabase.
- 📧 **Email OTP Verification**: Sends a 6-digit verification code with a 10-minute expiration window upon user sign-up.
- 🔑 **Forgot & Reset Password Flow**: Secure 6-digit OTP email workflow to reset forgotten passwords.
- 🛡️ **Bcrypt Password Hashing**: Passwords are encrypted with `bcryptjs` (12 salt rounds) before reaching storage.
- 🔑 **Stateless JWT Tokens**: Issues signed JSON Web Tokens for authenticated user sessions.
- 🚦 **Rate Limiting**: Protects login, registration, and reset endpoints from brute-force attacks via `express-rate-limit`.

---

##  Tech Stack

* **Backend**: Node.js, Express.js
* **Database**: Supabase (PostgreSQL)
* **Security**: `bcryptjs`, `jsonwebtoken`, `express-rate-limit`, `cors`
* **Email Service**: Nodemailer (SMTP / Gmail App Password)
* **Frontend**: Single Page Architecture (SPA) with Vanilla JavaScript, CSS Variables, and HTML5

---

##  Project Structure

```text
SecureAuth/
├── public/
│   └── index.html            # SPA Frontend (Login, Sign Up, OTP, Reset, Theme Switcher)
├── .env                      # Sample environment variables file
├── .gitignore                # Files excluded from source control        
├── LICENSE                   # Open-source license (MIT)
├── package.json              # Project dependencies and scripts
├── README.md                 # Project documentation
└── server.js                 # Express server with Supabase integration

```

---

##  Database Setup (Supabase)

1. Go to your **[Supabase Dashboard](https://www.google.com/search?q=https://supabase.com/dashboard)** and open the **SQL Editor**.
2. Run the following query to initialize the `users` table:

```sql
CREATE TABLE public.users (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    name TEXT NOT NULL,
    email TEXT UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    is_verified BOOLEAN DEFAULT FALSE,
    otp TEXT,
    otp_expires TIMESTAMPTZ,
    reset_otp TEXT,
    reset_otp_expires TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable Row Level Security (RLS)
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;

```

---

## 🚀 Getting Started

### 1. Prerequisites

* [Node.js](https://nodejs.org/) (v16 or higher)
* A [Supabase](https://supabase.com) account and project
* A Gmail account with an **App Password** (or custom SMTP credentials)

---

### 2. Installation & Configuration

1. **Clone the repository:**
```bash
git clone [https://github.com/your-username/SecureAuth.git](https://github.com/your-username/SecureAuth.git)
cd SecureAuth

```


2. **Install dependencies:**
```bash
npm install

```


3. **Set up Environment Variables:**
Create a `.env` file in the root directory:
```env
PORT=3000
JWT_SECRET=your_super_secret_jwt_key
EMAIL_USER=your_email@gmail.com
EMAIL_PASS=your_gmail_app_password

SUPABASE_URL=[https://your-project-ref.supabase.co](https://your-project-ref.supabase.co)
SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key

```



> [!IMPORTANT]
> **Gmail Users:** Do not use your primary account password. Generate an **App Password** under **Google Account > Security > 2-Step Verification > App Passwords**.

4. **Run the server:**
```bash
# Development mode
npm run dev

# Production mode
npm start

```


5. **Open the App:**
Navigate to `http://localhost:3000` in your web browser.

---

## 📡 API Endpoints

| Method | Endpoint | Description | Security / Throttling |
| --- | --- | --- | --- |
| `POST` | `/api/register` | Registers new user & dispatches verification OTP | Global Rate Limiter |
| `POST` | `/api/verify-otp` | Validates 6-digit registration code | Max 5 attempts / 15 min |
| `POST` | `/api/login` | Authenticates user & issues JWT token | Max 5 attempts / 15 min |
| `POST` | `/api/forgot-password` | Dispatches 6-digit reset code via email | Max 5 attempts / 15 min |
| `POST` | `/api/reset-password` | Validates reset OTP & updates user password | Max 5 attempts / 15 min |

---

##  Security Safeguards

> [!NOTE]
> All user authentication paths in this repository adhere to standard modern web security practices.

1. **Password Encryption**: Raw passwords never touch database storage. `bcryptjs` performs 12 salt rounds prior to record insertion.
2. **Normalized Input**: Emails are auto-trimmed and lowercased server-side (`email.trim().toLowerCase()`) to eliminate duplicate user records.
3. **Short-lived Verification Codes**: Registration and password reset OTPs expire automatically after 10 minutes.
4. **Service-Role Key Protection**: Supabase operations execute server-side using the secret `service_role` key, preventing direct database exposure to client applications.
5. **Brute Force Defense**: `express-rate-limit` enforces strict request thresholds across sensitive authentication routes.

---

##  Contributing

Contributions, issues, and feature requests are welcome! Feel free to check the [issues page](https://www.google.com/search?q=https://github.com/Bharathrajzero/SecureAuth/issues).

1. Fork the Project
2. Create your Feature Branch (`git checkout -b feature/AmazingFeature`)
3. Commit your Changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the Branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

## Author

* **Developer:** Bharath Raj
* **GitHub Profile:** [github.com/bharathrajzero](https://github.com/bharathrajzero)
  
---

## License

This project is licensed under the MIT License © 2026 Bharath Raj, AlphaGroup .
