# My Fellow API Documentation

Comprehensive documentation for the My Fellow API. This backend service powers the application providing endpoints for authentication, content management, events, marketplace operations, payments, and system administration.

## Table of Contents

- [Technology Stack](#technology-stack)
- [Project Setup](#project-setup)
- [Available Scripts](#available-scripts)
- [Rate Limits](#rate-limits)
- [API Reference](#api-reference)
  - [Authentication](#authentication)
  - [Administration](#administration)
  - [Uploads](#uploads)
  - [Events](#events)
  - [Devotions](#devotions)
  - [Marketplace](#marketplace)
  - [Payments](#payments)
  - [Join Requests](#join-requests)
  - [Teams](#teams)
  - [Programs](#programs)
  - [Locations](#locations)
  - [Leaders](#leaders)

## Technology Stack

The application is built using the following technologies:

- Node.js
- Express.js
- TypeScript
- Prisma ORM (with PostgreSQL integration)
- Mongoose (for specific components/services as configured)
- Cloudinary (for media uploads)
- Chapa (for payment integrations)
- JSON Web Tokens (for authentication)
- express-rate-limit and Helmet (for basic security)

## Project Setup

1. Copy the environment template:
   Create a `.env` file based on the default requirements (database URLs, JWT secrets, Chapa API keys, Cloudinary credentials).

2. Install dependencies:
   npm install

3. Apply database configurations and generate Prisma types:
   npm run build

4. Run the development server:
   npm run dev

## Available Scripts

| Script                | Description                                                      |
| --------------------- | ---------------------------------------------------------------- |
| `npm run dev`         | Starts the development server using nodemon and tsx.             |
| `npm run build`       | Generates the Prisma client and transpiles TypeScript files.     |
| `npm run lint`        | Runs the TypeScript compiler recursively without emitting files. |
| `npm run db:generate` | Generates the Prisma Client.                                     |
| `npm run db:push`     | Pushes the Prisma schema state to the database.                  |
| `npm run db:studio`   | Opens Prisma Studio to interact with the database graphically.   |

## Rate Limits

The API uses rate limiting to prevent abuse. Rate limits are tracked across rolling 1-minute windows based on the requester's IP.

| Endpoint Prefix    | Maximum Requests per Minute             |
| ------------------ | --------------------------------------- |
| `/api/auth`        | 10                                      |
| `/api/upload`      | 20                                      |
| `/api/events`      | 60                                      |
| `/api/teams`       | 60                                      |
| `/api/programs`    | 60                                      |
| `/api/locations`   | 60                                      |
| `/api/leaders`     | 60                                      |
| `/api/devotions`   | 60                                      |
| `/api/marketplace` | 60                                      |
| All others         | Unrestricted (default Express capacity) |

## API Reference

### Authentication

Base URL: `/api/auth`

| Method | Endpoint   | Authorization | Description                                                               |
| ------ | ---------- | ------------- | ------------------------------------------------------------------------- |
| POST   | `/signup`  | None          | Register a new user account (supports multipart form for profile images). |
| POST   | `/signin`  | None          | Authenticate a user and receive a JWT.                                    |
| GET    | `/me`      | Token         | Retrieve the profile of the currently authenticated user.                 |
| PATCH  | `/profile` | Token         | Update the profile of the currently authenticated user.                   |

### Administration

Base URL: `/api/admin`

| Method | Endpoint         | Authorization | Description                                                  |
| ------ | ---------------- | ------------- | ------------------------------------------------------------ |
| GET    | `/users`         | Token + Admin | Fetch all registered users in the system.                    |
| GET    | `/events`        | Token + Admin | Fetch a list of all system events for administrative review. |
| GET    | `/registrations` | Token + Admin | Fetch all event registrations globally.                      |
| GET    | `/transactions`  | Token + Admin | Fetch all system payment transactions.                       |
| GET    | `/stats`         | Token + Admin | Aggregate platform statistics and metrics.                   |

### Uploads

Base URL: `/api/upload`

| Method | Endpoint           | Authorization | Description                                          |
| ------ | ------------------ | ------------- | ---------------------------------------------------- |
| POST   | `/image`           | Token + Admin | Upload a single image file to Cloudinary.            |
| POST   | `/images`          | Token + Admin | Upload multiple image files to Cloudinary.           |
| DELETE | `/image/:publicId` | Token + Admin | Remove an image from Cloudinary using its public ID. |

### Events

Base URL: `/api/events`

| Method | Endpoint                        | Authorization | Description                                                             |
| ------ | ------------------------------- | ------------- | ----------------------------------------------------------------------- |
| GET    | `/`                             | None          | Fetch all structured events.                                            |
| GET    | `/:id`                          | None          | Fetch complete details for a specific event.                            |
| POST   | `/`                             | Token + Admin | Create a new event.                                                     |
| PUT    | `/:id`                          | Token + Admin | Update configuration for an existing event.                             |
| DELETE | `/:id`                          | Token + Admin | Delete an event completely.                                             |
| POST   | `/register`                     | Token         | Register the current user for an event.                                 |
| POST   | `/unregister`                   | Token         | Cancel current user's registration for an event.                        |
| GET    | `/registrations`                | Token + Admin | List all generic event registrations.                                   |
| GET    | `/registrations/:eventId`       | Token + Admin | Find all registrations for a particular event ID.                       |
| GET    | `/registration-status/:eventId` | Token         | Check if the authenticated user has registered for the specified event. |
| POST   | `/generate-poster`              | Token + Admin | Generate an AI poster using Weavy.ai integration.                       |

### Devotions

Base URL: `/api/devotions`
Accepts query parameters such as `?type=voice&featured=true&tags=faith&page=1&limit=10&search=keyword`.

| Method | Endpoint    | Authorization | Description                                                             |
| ------ | ----------- | ------------- | ----------------------------------------------------------------------- |
| GET    | `/`         | None          | Retrieve all devotions, optionally applying search strings and filters. |
| GET    | `/:id`      | None          | Return details for a specific devotion.                                 |
| POST   | `/`         | Token + Admin | Create a devotion entry with multipart data support.                    |
| PUT    | `/:id`      | Token + Admin | Modify an existing devotion entry.                                      |
| DELETE | `/:id`      | Token + Admin | Remove a devotion entry and cleanup its associated media.               |
| POST   | `/:id/view` | None          | Increment the view counter for a devotion.                              |
| POST   | `/:id/like` | Token         | Toggle a user's like/unlike status on a devotion.                       |

### Marketplace

Base URL: `/api/marketplace`

| Method | Endpoint             | Authorization | Description                                                        |
| ------ | -------------------- | ------------- | ------------------------------------------------------------------ |
| GET    | `/products`          | None          | View all active items in the marketplace.                          |
| GET    | `/products/:id`      | None          | View extensive details of a single market product.                 |
| POST   | `/products`          | Token + Admin | Add a new product listing (supports multiple image uploads).       |
| PUT    | `/products/:id`      | Token + Admin | Update the properties of a product catalog entry.                  |
| DELETE | `/products/:id`      | Token + Admin | Delete a marketplace product.                                      |
| POST   | `/orders`            | Token         | Submit a new order for a marketplace product.                      |
| GET    | `/orders/my`         | Token         | Fetch the complete order history of the current user.              |
| GET    | `/orders`            | Token + Admin | List all orders placed in the system.                              |
| GET    | `/orders/:id`        | Token         | Securely retrieve the details of a specific order.                 |
| PATCH  | `/orders/:id/status` | Token + Admin | Alter the lifecycle status of an order (e.g., pending, fulfilled). |

### Payments

Integration features specific endpoints structured to correspond with the Chapa API specifications.

Base URL: `/api/payments`

| Method | Endpoint                | Authorization | Description                                                               |
| ------ | ----------------------- | ------------- | ------------------------------------------------------------------------- |
| POST   | `/chapa/init`           | Token         | Configure an intent and generate checkout links for Chapa processing.     |
| GET    | `/chapa/verify/:tx_ref` | Token         | Validate the final completion block of a processed transaction reference. |
| POST   | `/chapa/webhook`        | None          | Webhook listener URL configuration for asynchronous confirmation.         |
| GET    | `/my-givings`           | Token         | View all validated past donations and givings linked to the current user. |

### Join Requests

Base URL: `/api/join-requests`

| Method | Endpoint             | Authorization | Description                                                    |
| ------ | -------------------- | ------------- | -------------------------------------------------------------- |
| POST   | `/`                  | Token         | Submit a formal request to join a module or collective.        |
| GET    | `/my`                | Token         | Display the progress and status of all personal join requests. |
| GET    | `/`                  | Token + Admin | Retrieve all unhandled and resolved join requests globally.    |
| PATCH  | `/:requestId/status` | Token + Admin | Acknowledge, approve, or reject an open join request.          |

### Teams

Base URL: `/api/teams`

| Method | Endpoint | Authorization | Description                                            |
| ------ | -------- | ------------- | ------------------------------------------------------ |
| GET    | `/`      | None          | Overview of all registered teams.                      |
| GET    | `/:id`   | None          | Specific details and constituents of a selected team.  |
| POST   | `/`      | Token + Admin | Register a brand new team grouping.                    |
| PUT    | `/:id`   | Token + Admin | Fix parameters associated with a given team structure. |
| DELETE | `/:id`   | Token + Admin | Delete a team category permanently.                    |

### Programs

Base URL: `/api/programs`

| Method | Endpoint | Authorization | Description                                                 |
| ------ | -------- | ------------- | ----------------------------------------------------------- |
| GET    | `/`      | None          | List available scheduled or recurring programs.             |
| GET    | `/:id`   | None          | Detailed timeline and description for a particular program. |
| POST   | `/`      | Token + Admin | Architect and define a new program schedule.                |
| PUT    | `/:id`   | Token + Admin | Correct specifications representing a program structure.    |
| DELETE | `/:id`   | Token + Admin | Deactivate and remove a program record.                     |

### Locations

Base URL: `/api/locations`

| Method | Endpoint | Authorization | Description                                          |
| ------ | -------- | ------------- | ---------------------------------------------------- |
| GET    | `/`      | None          | Survey all listed physical or digital locations.     |
| GET    | `/:id`   | None          | Identify details for an explicit location identity.  |
| POST   | `/`      | Token + Admin | Designate a new location map marker or entry points. |
| PUT    | `/:id`   | Token + Admin | Update the attributes to reflect location changes.   |
| DELETE | `/:id`   | Token + Admin | Erase the reference point for an obsolete location.  |

### Leaders

Base URL: `/api/leaders`

| Method | Endpoint | Authorization | Description                                                     |
| ------ | -------- | ------------- | --------------------------------------------------------------- |
| GET    | `/`      | None          | Examine all leader profiles integrated in the platform.         |
| GET    | `/:id`   | None          | Explore full descriptive bio of a target leadership individual. |
| POST   | `/`      | Token + Admin | Incorporate a new leader onto the platform directories.         |
| PUT    | `/:id`   | Token + Admin | Revise contact, designation, or detail inputs for a leader.     |
| DELETE | `/:id`   | Token + Admin | Expunge an entity from the leader rosters entirely.             |
