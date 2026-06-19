📌 About Section (Description):
Secure RESTful API for the Smart Deals bidding platform, built with Node.js, Express, and MongoDB. Features Firebase Admin authentication and optimized for Vercel Serverless deployment.

🏷️ Topics (Tags):
nodejs, expressjs, mongodb, rest-api, firebase-admin, vercel, serverless, backend

📄 README.md:

# Smart Deals - Server Side ⚙️

A secure and fast RESTful API built for the **Smart Deals** bidding platform. It handles product management, user bidding logic, and authorization. Optimized for Vercel serverless deployment.

## 🚀 Tech Stack
* **Runtime:** Node.js
* **Framework:** Express.js
* **Database:** MongoDB
* **Security & Auth:** Firebase Admin SDK

## ✨ Key Features
* **Protected Routes:** Critical endpoints (like submitting bids or adding products) are secured using Firebase ID token verification.
* **Data Isolation:** Users can securely fetch and manage only their own bidding history.
* **Serverless Architecture:** Fully configured for deployment on Vercel with optimized connection pooling.
* **Base64 Environment Config:** Uses Base64 decoding for handling complex Firebase Service Keys securely without formatting issues.

## 🔗 Main API Endpoints

| Method | Endpoint | Description | Access |
| :--- | :--- | :--- | :--- |
| `GET` | `/products` | Fetch all available products | Public |
| `POST` | `/products` | Add a new product | Private (Token required) |
| `GET` | `/bids` | Fetch bidding history for a specific user | Private (Token required) |
| `POST` | `/bids` | Place a new bid on a product | Private (Token required) |
| `DELETE` | `/bids/:id` | Remove a specific bid | Public / Private |

## 🛠️ Local Environment Setup

1. **Clone the repository:**
   `git clone <your-backend-repo-link>`

2. **Install dependencies:**
   `npm install`

3. **Environment Variables:**
   Create a `.env` file in the root directory and add the following:
   PORT=3000
   URI=your_mongodb_connection_string
   FIREBASE_SERVICE_KEY=your_base64_encoded_firebase_json

4. **Run the server:**
   `npm run dev`
   *The server will start on http://localhost:3000*
