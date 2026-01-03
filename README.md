# Express Starter Boilerplate

A comprehensive Express.js boilerplate project featuring request validation with Zod and JWT authentication. This repository contains two separate server implementations for demonstration purposes.

## Prerequisites

- Node.js installed on your machine.
- npm (Node Package Manager).

## Installation

1. Clone the repository.
2. Install dependencies:

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

# Development mode (with watch)
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
