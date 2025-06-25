# 🚀 CryptoPulse

**CryptoPulse** is a full-stack cryptocurrency data platform that offers real-time data aggregation, user authentication (including Google OAuth), and a robust caching mechanism using Redis. Designed for developers and crypto enthusiasts alike, it combines a secure REST API with a worker service that ensures up-to-date market information via scheduled background jobs.

---

## 🧠 Table of Contents

* [Project Overview](#project-overview)
* [Folder Structure](#folder-structure)
* [Features](#features)

  * [api-server](#api-server)
  * [work-server](#work-server)
* [Getting Started](#getting-started)

  * [Prerequisites](#prerequisites)
  * [Environment Variables](#environment-variables)
  * [Installation](#installation)
* [API Endpoints](#api-endpoints)

  * [User Routes](#user-routes)
  * [Data Routes](#data-routes)
* [Logging](#logging)
* [Background Jobs](#background-jobs)
* [Contributing](#contributing)
* [License](#license)
* [Authors](#authors)

---

## 📌 Project Overview

CryptoPulse is built with **Node.js**, **Express**, **MongoDB**, and **Redis**. It utilizes **Cloudinary** for media handling, **CoinGecko API** for crypto data, and **JWT** for session management. A separate worker service (work-server) ensures data freshness through scheduled events published via Redis Pub/Sub.

---

## 📁 Folder Structure

```
CryptoPulse/
│
├── api-server/          # REST API server
│   ├── src/
│   │   ├── config/         # Database & Redis configs
│   │   ├── controllers/    # Request handlers
│   │   ├── middleware/     # Auth, validation, file handling
│   │   ├── models/         # Mongoose schemas
│   │   ├── routes/         # API route definitions
│   │   ├── utils/          # Utilities (e.g., logger, cloudinary)
│   │   ├── app.js          # App configuration
│   │   ├── index.js        # Main entry point
│   │   └── constants.js    # Constants & keys
│   ├── logs/              # Winston logs
│   ├── public/            # Static files/uploads
│   └── package.json
│
└── work-server/         # Background worker service
    ├── index.js          # Cron job and Redis publisher
    └── package.json
```

---

## 🔧 Features

### 🧩 api-server

* **Authentication System**

  * Register/Login with email or username
  * Secure **JWT-based** access and refresh tokens (stored in HTTP-only cookies)
  * **Google OAuth2** login with secure state/nonce management
* **User Management**

  * Profile update, password change
  * Avatar upload using **Cloudinary**
* **Crypto Data**

  * Fetch latest coin stats from **CoinGecko API**
  * Efficient **Redis caching** to reduce API calls
* **Security**

  * Helmet, CORS, express-rate-limit, input sanitization
* **Logging**

  * Multi-level logging with **Winston**
* **Redis Integration**

  * OAuth state, coin cache, Pub/Sub listener for updates

### ⏱ work-server

* **Scheduled Background Jobs**

  * Uses `node-cron` to trigger jobs every **15 minutes**
* **Redis Pub/Sub**

  * Publishes `update` messages to `crypto-events` channel
  * Decouples background tasks from the API server

---

## 🚀 Getting Started

### ✅ Prerequisites

Make sure the following are installed:

* [Node.js](https://nodejs.org/) (v18+ recommended)
* [MongoDB](https://www.mongodb.com/)
* [Redis](https://redis.io/)
* [Cloudinary](https://cloudinary.com/) account
* [CoinGecko API](https://www.coingecko.com/en/api)
* [Google Developer Console](https://console.developers.google.com/) OAuth2 credentials

---

### 🔐 Environment Variables

Create a `.env` file in the root folder with the following:

```env
MONGO_URI=mongodb://localhost:27017/
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_USERNAME=default
REDIS_PASSWORD=yourpassword

CLOUDINARY_CLOUD_NAME=your_cloud_name
CLOUDINARY_API_KEY=your_api_key
CLOUDINARY_API_SECRET=your_api_secret

CoinGecko_URL_COIN=https://api.coingecko.com/api/v3/coins/markets
CoinGecko_API_KEY=your_coingecko_api_key

GOOGLE_CLIENT_ID=your_google_client_id
GOOGLE_CLIENT_SECRET=your_google_client_secret
GOOGLE_REDIRECT_URI=http://localhost:5000/api/v1/users/auth/google/callback
GOOGLE_OAUTH2_RESPONSE_TYPE=code
GOOGLE_OAUTH2_SCOPE=openid%20email%20profile

ACCESS_TOKEN_SECRET=your_access_token_secret
ACCESS_TOKEN_EXPIRY=15m
REFRESH_TOKEN_SECRET=your_refresh_token_secret
REFRESH_TOKEN_EXPIRY=7d

CORS_ORIGIN=http://localhost:3000
PORT=5000
```

---

### 📦 Installation

1. **Install dependencies**

```bash
# API server
cd api-server
npm install

# Worker server
cd ../work-server
npm install
```

2. **Start MongoDB and Redis**
   Ensure both services are running.

3. **Run the API server**

```bash
cd ../api-server
node src/index.js
```

4. **Run the worker server**

```bash
cd ../work-server
node index.js
```

---

## 📡 API Endpoints

### 👤 User Routes

| Method | Endpoint                             | Description                              |
| ------ | ------------------------------------ | ---------------------------------------- |
| POST   | `/api/v1/users/register`             | Register a new user with optional avatar |
| POST   | `/api/v1/users/login`                | Login using email/username and password  |
| GET    | `/api/v1/users/auth/google`          | Start Google OAuth flow                  |
| GET    | `/api/v1/users/auth/google/callback` | Handle Google OAuth callback             |
| GET    | `/api/v1/users/logout`               | Logout user                              |
| POST   | `/api/v1/users/refresh-token`        | Refresh JWT token                        |
| POST   | `/api/v1/users/change-password`      | Update user password                     |
| GET    | `/api/v1/users/current-user`         | Fetch currently logged-in user           |
| POST   | `/api/v1/users/update-account`       | Update account info                      |
| POST   | `/api/v1/users/update-avatar`        | Update profile picture                   |

### 📊 Data Routes

| Method | Endpoint             | Description                             |
| ------ | -------------------- | --------------------------------------- |
| POST   | `/api/v1/data/stats` | Fetch coin market stats (auth required) |

---

## 📝 Logging

* Logs are managed via **Winston** and saved to `api-server/logs/`:

  * `error.log` — All error messages
  * `warn.log` — Warnings
  * `http.log` — HTTP request logs
  * `combined.log` — Full log aggregation

---

## ⏲ Background Jobs

* The **work-server** uses `node-cron` to run a job every 15 minutes.
* It publishes `{ trigger: "update" }` to Redis on the `crypto-events` channel.
* The **api-server** listens on this channel and updates coin data accordingly.

---

## 🤝 Contributing

Contributions, issues, and feature requests are welcome!

1. Fork the repo
2. Create a new branch (`git checkout -b feature-name`)
3. Commit your changes (`git commit -m 'Add feature'`)
4. Push to the branch (`git push origin feature-name`)
5. Open a pull request

---



