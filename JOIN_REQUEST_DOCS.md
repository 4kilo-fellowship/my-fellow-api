# Join Request API Documentation

This document describes the endpoints and data types required for managing team join requests.

## Base URL

`/api/join-requests`

---

## 1. Create a Join Request

Submits a new request for a user to join a specific team.

- **URL:** `/`
- **Method:** `POST`
- **Authentication:** Required (User/Admin)
- **Content-Type:** `application/json`

### Request Body

| Field            | Type     | Required | Description                                   |
| :--------------- | :------- | :------- | :-------------------------------------------- |
| `teamId`         | `string` | Yes      | A valid MongoDB ObjectId of the team.         |
| `fullName`       | `string` | Yes      | Applicant's full name.                        |
| `phoneNumber`    | `string` | Yes      | Applicant's phone number.                     |
| `department`     | `string` | Yes      | Applicant's department.                       |
| `year`           | `string` | Yes      | Applicant's year of study.                    |
| `telegramHandle` | `string` | Yes      | Applicant's Telegram username.                |
| `profileImage`   | `string` | No       | URL to the applicant's profile picture.       |
| `pastTeam`       | `string` | No       | Previous team name or "another team".         |
| `message`        | `string` | No       | Optional message to the team (max 500 chars). |

### Success Response

- **Code:** 201 Created
- **Body:**

```json
{
  "success": true,
  "message": "Join request submitted successfully",
  "data": {
    "_id": "65c...",
    "userId": "65b...",
    "teamId": "65a...",
    "fullName": "John Doe",
    "phoneNumber": "0700000000",
    "department": "Engineering",
    "year": "Year 3",
    "telegramHandle": "@johndoe",
    "status": "pending",
    "createdAt": "2024-02-09T..."
  }
}
```

---

## 2. Get My Join Requests

Retrieves all join requests submitted by the current authenticated user.

- **URL:** `/my`
- **Method:** `GET`
- **Authentication:** Required (User/Admin)

### Success Response

- **Code:** 200 OK
- **Body:** List of join request objects with `teamId` populated (name, icon, color).

---

## 3. List All Join Requests (Staff/Admin Only)

Retrieves all join requests across all teams. Used by staff to review applicants.

- **URL:** `/`
- **Method:** `GET`
- **Authentication:** Required (Admin only)

### Success Response

- **Code:** 200 OK
- **Body:** List of join request objects with `userId` and `teamId` populated.

---

## 4. Update Join Request Status (Staff/Admin Only)

Approves or rejects a join request. When approved, the user's profile (name, phone, department, year, telegram, etc.) is automatically updated to match the request data, and they are added to the team.

- **URL:** `/:requestId/status`
- **Method:** `PATCH`
- **Authentication:** Required (Admin only)

### Request Body

| Field    | Type     | Required | Description                                  |
| :------- | :------- | :------- | :------------------------------------------- |
| `status` | `string` | Yes      | Must be either `"approved"` or `"rejected"`. |

### Success Response

- **Code:** 200 OK
- **Body:**

```json
{
  "success": true,
  "message": "Join request approved",
  "data": { ... updated request object ... }
}
```

## Data Types Reference

| Type Name      | MongoDB Storage         | Regex/Validation                            |
| :------------- | :---------------------- | :------------------------------------------ |
| `ObjectId`     | `Schema.Types.ObjectId` | Must be a 24-character hex string.          |
| `status`       | `String`                | Enum: `["pending", "approved", "rejected"]` |
| `phoneNumber`  | `String`                | Min 10, Max 15 characters.                  |
| `profileImage` | `String (URL)`          | Must be a valid URL string.                 |

---

## 5. Update User Profile

Allows a user to update their personal information provided during sign-up.

- **URL:** `/api/auth/profile`
- **Method:** `PATCH`
- **Authentication:** Required (User/Admin)
- **Content-Type:** `multipart/form-data` (to support profile image upload) or `application/json`

### Request Body (Optional Fields)

| Field              | Type     | Description                                        |
| :----------------- | :------- | :------------------------------------------------- |
| `fullName`         | `string` | Updated full name.                                 |
| `phoneNumber`      | `string` | Updated phone number.                              |
| `department`       | `string` | Updated department.                                |
| `yearOfStudy`      | `string` | Updated year of study.                             |
| `telegramUserName` | `string` | Updated Telegram handle.                           |
| `pastTeam`         | `string` | Updated past team preference.                      |
| `image`            | `file`   | New profile picture file (use field name `image`). |

### Success Response

- **Code:** 200 OK
- **Body:**

```json
{
  "success": true,
  "message": "Profile updated successfully",
  "user": { ... updated user object ... }
}
```
