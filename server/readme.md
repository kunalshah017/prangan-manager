# Prangan Backend API

A Node.js backend service built with Fastify, Prisma, and PostgreSQL for managing projects, centers, semesters, and users.

## Environment Setup

Copy the environment variables from `.env.example` to `.env` and configure them:

```bash
cp .env.example .env
```

Required environment variables:

- `DATABASE_URL`: PostgreSQL connection string
- `JWT_SECRET`: Secret key for JWT token generation
- `PORT`: Server port (default: 4000)
- `RESEND_API_KEY`: API key for Resend email service

## Installation

```bash
npm install
```

## Database Setup

```bash
# Generate Prisma client
npx prisma generate

# Run database migrations
npx prisma migrate dev

# Seed the database with test admin
npm run seed
```

## Running the Server

```bash
npm run dev
```

The server will start on the port specified in your `.env` file (default: 4000).

## Health Check

### GET /health

Check if the server is running.

**Response:**

```json
{
  "status": "OK",
  "timestamp": "2024-01-01T00:00:00.000Z",
  "service": "Replink Backend"
}
```

## API Endpoints

All API endpoints are prefixed with `/api/v1`.

### User Routes

#### POST /api/v1/users/register

Register a new user (status will be PENDING by default).

**Body:**

```json
{
  "email": "user@example.com",
  "name": "John Doe",
  "password": "password123",
  "phone": "1234567890",
  "qualification": "Bachelor's",
  "address": "123 Main St"
}
```

**Response (201):**

```json
{
  "message": "User registered successfully"
}
```

#### POST /api/v1/users/login

Login user and get JWT token.

**Body:**

```json
{
  "email": "user@example.com",
  "password": "password123"
}
```

**Response (200):**

```json
{
  "message": "Login successful",
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

#### GET /api/v1/users/me

Get current user details.

_Requires authentication_

**Headers:**

```
Authorization: Bearer <jwt_token>
```

**Response (200):**

```json
{
  "message": "User details retrieved successfully",
  "user": {
    "id": "user_id",
    "email": "user@example.com",
    "name": "John Doe",
    "role": "USER",
    "status": "APPROVED",
    "phone": "1234567890",
    "qualification": "Bachelor's Degree",
    "address": "123 Main St, City, State",
    "dob": "1990-01-01T00:00:00.000Z",
    "createdAt": "2024-01-01T00:00:00.000Z",
    "updatedAt": "2024-01-01T00:00:00.000Z"
  }
}
```

### Project Routes

_Requires authentication_

#### POST /api/v1/projects/create

Create a new project (Admin only).

**Headers:**

```
Authorization: Bearer <jwt_token>
```

**Body:**

```json
{
  "name": "Project Name",
  "description": "Project description",
  "metadata": {},
  "projectType": "Type",
  "imageUrl": "https://example.com/image.jpg"
}
```

**Response (201):**

```json
{
  "message": "Project created successfully",
  "project": {
    "id": "project_id",
    "name": "Project Name",
    "description": "Project description",
    "metadata": {},
    "projectType": "Type",
    "imageUrl": "https://example.com/image.jpg",
    "status": "ACTIVE",
    "createdAt": "2024-01-01T00:00:00.000Z",
    "updatedAt": "2024-01-01T00:00:00.000Z"
  }
}
```

#### GET /api/v1/projects

List all projects.

**Headers:**

```
Authorization: Bearer <jwt_token>
```

**Response (200):**

```json
{
  "projects": [
    {
      "id": "project_id_1",
      "name": "Project One",
      "description": "First project description",
      "metadata": {},
      "projectType": "Web",
      "imageUrl": "https://example.com/image1.jpg",
      "status": "ACTIVE",
      "createdAt": "2024-01-01T00:00:00.000Z",
      "updatedAt": "2024-01-01T00:00:00.000Z"
    }
  ]
}
```

#### GET /api/v1/projects/:id

Get a project by ID.

**Headers:**

```
Authorization: Bearer <jwt_token>
```

**Parameters:**

- `id` (string): The ID of the project

**Response (200):**

```json
{
  "project": {
    "id": "project_id",
    "name": "Project Name",
    "description": "Project description",
    "metadata": {},
    "projectType": "Web",
    "imageUrl": "https://example.com/image.jpg",
    "status": "ACTIVE",
    "centers": [],
    "createdAt": "2024-01-01T00:00:00.000Z",
    "updatedAt": "2024-01-01T00:00:00.000Z"
  }
}
```

#### PUT /api/v1/projects/:id

Update a project (Admin only).

**Headers:**

```
Authorization: Bearer <jwt_token>
```

**Parameters:**

- `id` (string): The ID of the project

**Body:**

```json
{
  "name": "Updated Project Name",
  "description": "Updated description",
  "projectType": "Mobile",
  "imageUrl": "https://example.com/new-image.jpg"
}
```

**Response (200):**

```json
{
  "message": "Project updated successfully",
  "project": {
    "id": "project_id",
    "name": "Updated Project Name",
    "description": "Updated description",
    "metadata": {},
    "projectType": "Mobile",
    "imageUrl": "https://example.com/new-image.jpg",
    "status": "ACTIVE",
    "createdAt": "2024-01-01T00:00:00.000Z",
    "updatedAt": "2024-01-02T00:00:00.000Z"
  }
}
```

#### DELETE /api/v1/projects/:id

Delete a project (Admin only).

**Note:** This operation will cascade delete all related centers and semesters associated with the project.

**Headers:**

```
Authorization: Bearer <jwt_token>
```

**Parameters:**

- `id` (string): The ID of the project

**Response (200):**

```json
{
  "message": "Project deleted successfully"
}
```

### Center Routes

_Requires authentication_

#### POST /api/v1/centers/create

Create a new center (Admin only).

**Headers:**

```
Authorization: Bearer <jwt_token>
```

**Body:**

```json
{
  "name": "Center Name",
  "address": "123 Main Street, City",
  "metadata": {},
  "projectId": "project_id"
}
```

**Response (201):**

```json
{
  "message": "Center created successfully",
  "center": {
    "id": "center_id",
    "name": "Center Name",
    "address": "123 Main Street, City",
    "metadata": {},
    "projectId": "project_id",
    "createdAt": "2024-01-01T00:00:00.000Z",
    "updatedAt": "2024-01-01T00:00:00.000Z"
  }
}
```

#### GET /api/v1/centers

List all centers.

**Headers:**

```
Authorization: Bearer <jwt_token>
```

**Response (200):**

```json
{
  "centers": [
    {
      "id": "center_id_1",
      "name": "Main Center",
      "address": "123 Main Street, City",
      "metadata": {},
      "projectId": "project_id",
      "createdAt": "2024-01-01T00:00:00.000Z",
      "updatedAt": "2024-01-01T00:00:00.000Z"
    }
  ]
}
```

#### GET /api/v1/centers/project/:projectId

Get centers by project ID.

**Headers:**

```
Authorization: Bearer <jwt_token>
```

**Parameters:**

- `projectId` (string): The ID of the project

**Response (200):**

```json
{
  "centers": [
    {
      "id": "center_id_1",
      "name": "Main Center",
      "address": "123 Main Street, City",
      "metadata": {},
      "projectId": "project_id",
      "project": {
        "id": "project_id",
        "name": "Project Name"
      },
      "createdAt": "2024-01-01T00:00:00.000Z",
      "updatedAt": "2024-01-01T00:00:00.000Z"
    }
  ]
}
```

#### GET /api/v1/centers/:id

Get a center by ID.

**Headers:**

```
Authorization: Bearer <jwt_token>
```

**Parameters:**

- `id` (string): The ID of the center

**Response (200):**

```json
{
  "center": {
    "id": "center_id",
    "name": "Center Name",
    "address": "123 Main Street, City",
    "metadata": {},
    "projectId": "project_id",
    "project": {
      "id": "project_id",
      "name": "Project Name"
    },
    "semesters": [],
    "createdAt": "2024-01-01T00:00:00.000Z",
    "updatedAt": "2024-01-01T00:00:00.000Z"
  }
}
```

#### PUT /api/v1/centers/:id

Update a center (Admin only).

**Headers:**

```
Authorization: Bearer <jwt_token>
```

**Parameters:**

- `id` (string): The ID of the center

**Body:**

```json
{
  "name": "Updated Center Name",
  "address": "456 New Street, Updated City",
  "metadata": {}
}
```

**Response (200):**

```json
{
  "message": "Center updated successfully",
  "center": {
    "id": "center_id",
    "name": "Updated Center Name",
    "address": "456 New Street, Updated City",
    "metadata": {},
    "projectId": "project_id",
    "createdAt": "2024-01-01T00:00:00.000Z",
    "updatedAt": "2024-01-02T00:00:00.000Z"
  }
}
```

#### DELETE /api/v1/centers/:id

Delete a center (Admin only).

**Note:** This operation will cascade delete all related semesters associated with the center.

**Headers:**

```
Authorization: Bearer <jwt_token>
```

**Parameters:**

- `id` (string): The ID of the center

**Response (200):**

```json
{
  "message": "Center deleted successfully"
}
```

### Semester Routes

_Requires authentication_

#### POST /api/v1/semesters/create

Create a new semester (Admin only).

**Headers:**

```
Authorization: Bearer <jwt_token>
```

**Body:**

```json
{
  "name": "Semester Name",
  "startDate": "2024-01-01T00:00:00.000Z",
  "endDate": "2024-06-30T00:00:00.000Z",
  "centerId": "center_id"
}
```

**Response (201):**

```json
{
  "message": "Semester created successfully",
  "semester": {
    "id": "semester_id",
    "name": "Semester Name",
    "startDate": "2024-01-01T00:00:00.000Z",
    "endDate": "2024-06-30T00:00:00.000Z",
    "centerId": "center_id",
    "createdAt": "2024-01-01T00:00:00.000Z",
    "updatedAt": "2024-01-01T00:00:00.000Z"
  }
}
```

#### GET /api/v1/semesters/center/:centerId

Get semesters by center ID.

**Headers:**

```
Authorization: Bearer <jwt_token>
```

**Parameters:**

- `centerId` (string): The ID of the center

**Response (200):**

```json
{
  "semesters": [
    {
      "id": "semester_id_1",
      "name": "Spring 2024",
      "startDate": "2024-01-01T00:00:00.000Z",
      "endDate": "2024-06-30T00:00:00.000Z",
      "centerId": "center_id",
      "center": {
        "id": "center_id",
        "name": "Center Name"
      },
      "createdAt": "2024-01-01T00:00:00.000Z",
      "updatedAt": "2024-01-01T00:00:00.000Z"
    }
  ]
}
```

#### GET /api/v1/semesters/:id

Get a semester by ID.

**Headers:**

```
Authorization: Bearer <jwt_token>
```

**Parameters:**

- `id` (string): The ID of the semester

**Response (200):**

```json
{
  "semester": {
    "id": "semester_id",
    "name": "Semester Name",
    "startDate": "2024-01-01T00:00:00.000Z",
    "endDate": "2024-06-30T00:00:00.000Z",
    "centerId": "center_id",
    "center": {
      "id": "center_id",
      "name": "Center Name"
    },
    "createdAt": "2024-01-01T00:00:00.000Z",
    "updatedAt": "2024-01-01T00:00:00.000Z"
  }
}
```

#### PUT /api/v1/semesters/:id

Update a semester (Admin only).

**Headers:**

```
Authorization: Bearer <jwt_token>
```

**Parameters:**

- `id` (string): The ID of the semester

**Body:**

```json
{
  "name": "Updated Semester Name",
  "startDate": "2024-02-01T00:00:00.000Z",
  "endDate": "2024-07-31T00:00:00.000Z"
}
```

**Response (200):**

```json
{
  "message": "Semester updated successfully",
  "semester": {
    "id": "semester_id",
    "name": "Updated Semester Name",
    "startDate": "2024-02-01T00:00:00.000Z",
    "endDate": "2024-07-31T00:00:00.000Z",
    "centerId": "center_id",
    "createdAt": "2024-01-01T00:00:00.000Z",
    "updatedAt": "2024-01-02T00:00:00.000Z"
  }
}
```

#### DELETE /api/v1/semesters/:id

Delete a semester (Admin only).

**Headers:**

```
Authorization: Bearer <jwt_token>
```

**Parameters:**

- `id` (string): The ID of the semester

**Response (200):**

```json
{
  "message": "Semester deleted successfully"
}
```

## Authentication

The API uses JWT (JSON Web Tokens) for authentication. After logging in, include the token in the Authorization header:

```
Authorization: Bearer <your_jwt_token>
```

## User Roles

- **USER**: Default role for registered users
- **ADMIN**: Can create, update, and delete projects, centers, and semesters

## User Status

- **PENDING**: User registration pending approval (default for new registrations)
- **APPROVED**: User approved and can access the system
- **REJECTED**: User registration rejected

## Project Status

- **ACTIVE**: Project is active and available (default)
- **INACTIVE**: Project is temporarily disabled

## Email Integration

The system uses Resend for email delivery. Make sure to set the `RESEND_API_KEY` environment variable with your Resend API key.

## Error Responses

The API returns consistent error responses:

```json
{
  "message": "Error message"
}
```

Common status codes:

- `400`: Bad Request
- `401`: Unauthorized
- `403`: Forbidden
- `404`: Not Found
- `500`: Internal Server Error

**Example Error Responses:**

```json
{
  "message": "Email, password, and name are required."
}
```

```json
{
  "message": "User already exists with this email."
}
```

```json
{
  "message": "Unauthorized: No token provided"
}
```

```json
{
  "message": "Only admins can create projects."
}
```

## Development

### Project Structure

```
├── controllers/     # Request handlers
├── routes/         # Route definitions
├── service/        # Business logic
├── types/          # TypeScript type definitions
├── utils/          # Utility functions
├── prisma/         # Database schema and migrations
└── generated/      # Generated Prisma client
```

### Database Models

- **User**: User accounts with roles and status
- **Projects**: Project management with status
- **Centers**: Center/location management linked to projects
- **Semesters**: Academic semester management linked to centers

### Test Admin Account

After running `npm run seed`, you can use these credentials:

- **Email**: admin@test.com
- **Password**: AdminTest123!
- **Role**: ADMIN
- **Status**: APPROVED

## Scripts

```bash
# Development
npm run dev          # Start development server with watch mode
npm run dev:ts-node  # Start with ts-node (alternative)

# Production
npm run build        # Build the project
npm run start        # Start production server

# Database
npm run seed         # Seed database with test data
npx prisma generate  # Generate Prisma client
npx prisma migrate dev # Run database migrations
npx prisma studio    # Open Prisma Studio
```

## Environment Variables

Create a `.env` file based on `.env.example`:

```env
DATABASE_URL="postgresql://username:password@host:port/database"
JWT_SECRET="your_jwt_secret_key_here"
PORT=4000
RESEND_API_KEY="your_resend_api_key_here"
```

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Run tests
5. Submit a pull request

## License

This project is licensed under the MIT License.
