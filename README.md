# Express Starter Boilerplate

A comprehensive Express.js boilerplate project featuring request validation with Zod and JWT authentication. This repository contains two separate server implementations for demonstration purposes.

## Prerequisites

- Node.js installed on your machine.
- npm (Node Package Manager).

## Environment Setup

Create a `.env` file in the root directory with the following variables:

```env
GOOGLE_CLIENT_ID=your_google_client_id
GOOGLE_CLIENT_SECRET=your_google_client_secret
GOOGLE_CALLBACK_URL=your_google_callback_url
JWT_SECRET=your_jwt_secret
```

## Installation

1. Clone the repository.
2. Create and configure your `.env` file.
3. Install dependencies:

```bash
npm install
```

## Usage

This project contains two distinct entry points:

1. **Main Server (`index.js`)**: Demonstrates basic routing and validation.
2. **Auth Server (`auth.js`)**: Demonstrates JWT authentication flows.

### Running the Main Server

```bash
# Production mode
npm start

# Development mode (with watch) - Runs auth.js
npm run dev
```

The server runs on `http://localhost:3000`.

### Running the Auth Server

To run the authentication demonstration server:

```bash
node auth.js
```

The server runs on `http://localhost:3000`.

## API Documentation

### Main Server (`index.js`)

#### 1. Hello World

- **Endpoint**: `GET /helloworld`
- **Headers**:
  - `username`: String (4-12 characters)
- **Response**:
  - Success: `{ "msg": "Hello <username>!", "category": "Noob" }`
  - Error: Zod validation error details.

#### 2. Root

- **Endpoint**: `GET /`
- **Response**: `{ "msg": "Welcome" }`

#### 3. Get ID

- **Endpoint**: `GET /:id`
- **Parameters**:
  - `id`: Number (1-99)
- **Response**:
  - Success: `{ "msg": "This is the ID : <id>" }`
  - Error: `{ "msg": <validation_error> }`

### Auth Server (`auth.js`)

#### 1. Sign In

- **Endpoint**: `GET /signin`
- **Body**:
  - `username`: Email string
  - `password`: String (min 6 characters)
- **Response**:
  - Success: `{ "Token": "<jwt_token>" }`
  - Error: `{ "Error": <validation_error> }`

#### 2. Profile

- **Endpoint**: `GET /profile`
- **Headers**:
  - `Authorization`: `Bearer <token>`
- **Response**:
  - Success: `{ "msg": { "username": "<email>" } }`
  - Error: `{ "error": "Invalid token", ... }`

#### 3. Google OAuth Flow

##### Start Authentication

- **Endpoint**: `GET /auth/google`
- **Description**: Initiates the Google OAuth login flow.

##### Callback

- **Endpoint**: `GET /auth/google/callback`
- **Description**: Callback URL for Google OAuth. Returns a JWT token upon success.
- **Response**:
  - Success: `{ "Token": "<jwt_token>", "message": "Google authentication successful" }`
  - Error: Redirects to failure endpoint.

##### Failure

- **Endpoint**: `GET /auth/google/failure`
- **Response**: `{ "error": "Google OAuth authentication failed" }`
