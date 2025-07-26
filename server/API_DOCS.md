# Prangan Manager Backend API

A Node.js backend service built with Fastify, Prisma, and PostgreSQL for managing projects, centers, semesters, users, and students.

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

# Seed the database with test data
npm run seed
```

**Note:** After updating the schema with new student enrollment features, make sure to regenerate the Prisma client:

```bash
# If you've pulled schema changes, regenerate the client
npx prisma generate

# Apply any new migrations
npx prisma db push
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
  "service": "Prangan Manager Backend"
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
  "address": "123 Main St",
  "profileImageUrl": "https://example.com/profile.jpg"
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
    "profileImageUrl": "https://example.com/profile.jpg",
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

#### POST /api/v1/users/verify

Verify/approve a user registration and assign role permissions (Admin only).

_Requires admin authentication_

**Headers:**

```
Authorization: Bearer <admin_jwt_token>
```

**Body:**

```json
{
  "userId": "user_id",
  "status": "APPROVED",
  "role": "USER",
  "email": "user@example.com",
  "name": "John Doe",
  "rejectionReason": "Inadequate qualifications",
  "roleAssignments": [
    {
      "subRole": "EDUCATOR",
      "projectId": "project_id",
      "centerId": "center_id",
      "semesterId": "semester_id",
      "level": "LEVEL_2",
      "committedDays": "BOTH"
    },
    {
      "subRole": "CENTER_MANAGER",
      "projectId": "project_id",
      "centerId": "center_id",
      "committedDays": "SATURDAY"
    }
  ]
}
```

**Field Requirements:**

**Required Fields:**

- `userId` (string): ID of the user to verify
- `status` (string): APPROVED, REJECTED, or PENDING
- `role` (string): USER or ADMIN
- `email` (string): User's email address
- `name` (string): User's full name
- `rejectionReason` (string): Reason for rejection (if applicable)

**Optional Fields:**

- `roleAssignments` (array): Only applies to USER role. For ADMIN role, omit this field.

**Role Assignment Fields:**

- `subRole` (string, required): One of: TRAINING_DEVELOPMENT, RECRUITMENT, GROWTH_DEVELOPMENT, CURRICULUM_MENTOR, TECH, CENTER_MANAGER, EDUCATOR
- `projectId` (string, optional): Project assignment
- `centerId` (string, optional): Center assignment
- `semesterId` (string, optional): Semester assignment
- `level` (string, optional): Only for EDUCATOR sub-role (LEVEL_1, LEVEL_2, LEVEL_3, LEVEL_4, PRIMARY_A, PRIMARY_B)
- `committedDays` (string, optional): Only for CENTER_MANAGER and EDUCATOR sub-roles (SATURDAY, SUNDAY, BOTH)

**Validation Rules:**

- If `semesterId` is provided, `centerId` must belong to that semester
- If `centerId` is provided with `projectId`, center must belong to that project
- If `semesterId` is provided with `projectId`, semester's center must belong to that project
- `level` can only be set for EDUCATOR sub-role
- `committedDays` can only be set for CENTER_MANAGER and EDUCATOR sub-roles

**Response (200):**

```json
{
  "message": "User status updated successfully and password sent via email",
  "user": {
    "id": "user_id",
    "email": "user@example.com",
    "name": "John Doe",
    "status": "APPROVED",
    "role": "USER"
  }
}
```

#### GET /api/v1/users/registration-requests

Get all pending user registrations (Admin only).

_Requires admin authentication_

**Headers:**

```
Authorization: Bearer <admin_jwt_token>
```

**Response (200):**

```json
{
  "message": "Unverified users retrieved successfully",
  "users": [
    {
      "id": "user_id",
      "email": "pending@example.com",
      "name": "Jane Doe",
      "profileImageUrl": "https://example.com/jane.jpg",
      "role": "USER",
      "phone": "0987654321",
      "qualification": "Master's Degree",
      "address": "456 Oak St, City, State",
      "dob": "1992-05-15T00:00:00.000Z",
      "createdAt": "2024-01-01T00:00:00.000Z",
      "updatedAt": "2024-01-01T00:00:00.000Z"
    }
  ]
}
```

### Student Routes

_All student routes require authentication_

#### POST /api/v1/users/students

Add a new student (Admin only). **Note:** You can optionally include enrollment details to assign the student to a center, project, and level in the same request.

**Headers:**

```
Authorization: Bearer <admin_jwt_token>
```

**Student Fields:**

**Required Fields:**

- `name` (string): Student's full name

**Optional Basic Fields:**

- `dob` (string): Date of birth in YYYY-MM-DD format
- `phoneNumber` (string): Student's phone number
- `whatsappNumber` (string): WhatsApp number for communication
- `alternateNumber` (string): Alternative contact number
- `profileImageUrl` (string): URL to student's profile image

**Optional Family Details:**

- `fatherName` (string): Father's full name
- `motherName` (string): Mother's full name
- `address` (string): Complete residential address
- `schoolName` (string): Name of the school student is attending
- `fatherOccupation` (string): Father's occupation/profession
- `motherOccupation` (string): Mother's occupation/profession
- `familyIncome` (string): Family income bracket (e.g., "0-25000", "25000-50000", "50000-75000", "75000-100000", "100000+")

**Optional Enrollment:**

- `enrollment` (object): Enrollment details to assign student to center and level

**Body:**

```json
{
  "name": "Aarav Mehta",
  "dob": "2015-03-12",
  "phoneNumber": "+919876541001",
  "whatsappNumber": "+919876541001",
  "alternateNumber": "+912267891001",
  "profileImageUrl": "https://example.com/student.jpg",
  "fatherName": "Rajesh Mehta",
  "motherName": "Priya Mehta",
  "address": "123 Main Street, Andheri West, Mumbai, Maharashtra 400058",
  "schoolName": "St. Xavier's High School",
  "fatherOccupation": "Software Engineer",
  "motherOccupation": "Teacher",
  "familyIncome": "50000-75000",
  "enrollment": {
    "centerId": "center_id",
    "semesterId": "semester_id",
    "projectId": "project_id",
    "level": "LEVEL_2"
  }
}
```

**Note:** The `enrollment` field is optional. If not provided, use the enrollment endpoints to assign level and center later.

**Response (201):**

```json
{
  "message": "Student added and enrolled successfully",
  "student": {
    "id": "student_id",
    "name": "Aarav Mehta",
    "dob": "2015-03-12T00:00:00.000Z",
    "phoneNumber": "+919876541001",
    "whatsappNumber": "+919876541001",
    "alternateNumber": "+912267891001",
    "profileImageUrl": "https://example.com/student.jpg",
    "fatherName": "Rajesh Mehta",
    "motherName": "Priya Mehta",
    "address": "123 Main Street, Andheri West, Mumbai, Maharashtra 400058",
    "schoolName": "St. Xavier's High School",
    "fatherOccupation": "Software Engineer",
    "motherOccupation": "Teacher",
    "familyIncome": "50000-75000",
    "createdAt": "2024-01-01T00:00:00.000Z",
    "updatedAt": "2024-01-01T00:00:00.000Z"
  },
  "enrollment": {
    "id": "enrollment_id",
    "studentId": "student_id",
    "centerId": "center_id",
    "semesterId": "semester_id",
    "projectId": "project_id",
    "level": "LEVEL_2",
    "isActive": true,
    "enrolledAt": "2024-01-01T00:00:00.000Z"
  }
}
    "whatsappNumber": "+919876541001",
    "alternateNumber": "+912267891001",
    "level": "LEVEL_2",
    "profileImageUrl": "https://example.com/student.jpg",
    "createdAt": "2024-01-01T00:00:00.000Z",
    "updatedAt": "2024-01-01T00:00:00.000Z"
  }
}
```

#### GET /api/v1/users/students

Get all students.

**Headers:**

```
Authorization: Bearer <jwt_token>
```

**Response (200):**

```json
{
  "message": "Students retrieved successfully",
  "students": [
    {
      "id": "student_id_1",
      "name": "Aarav Mehta",
      "dob": "2015-03-12T00:00:00.000Z",
      "phoneNumber": "+919876541001",
      "whatsappNumber": "+919876541001",
      "alternateNumber": "+912267891001",
      "profileImageUrl": "https://example.com/student1.jpg",
      "fatherName": "Rajesh Mehta",
      "motherName": "Priya Mehta",
      "address": "123 Main Street, Andheri West, Mumbai, Maharashtra 400058",
      "schoolName": "St. Xavier's High School",
      "fatherOccupation": "Software Engineer",
      "motherOccupation": "Teacher",
      "familyIncome": "50000-75000",
      "createdAt": "2024-01-01T00:00:00.000Z",
      "updatedAt": "2024-01-01T00:00:00.000Z"
    }
  ]
}
```

#### GET /api/v1/users/students/:id

Get a student by ID.

**Headers:**

```
Authorization: Bearer <jwt_token>
```

**Parameters:**

- `id` (string): The ID of the student

**Response (200):**

```json
{
  "message": "Student retrieved successfully",
  "student": {
    "id": "student_id",
    "name": "Aarav Mehta",
    "dob": "2015-03-12T00:00:00.000Z",
    "phoneNumber": "+919876541001",
    "whatsappNumber": "+919876541001",
    "alternateNumber": "+912267891001",
    "level": "LEVEL_2",
    "profileImageUrl": "https://example.com/student.jpg",
    "createdAt": "2024-01-01T00:00:00.000Z",
    "updatedAt": "2024-01-01T00:00:00.000Z"
  }
}
```

#### PUT /api/v1/users/students/:id

Update a student (Admin only). **Note:** You can optionally include enrollment details to promote the student to a new level or change their center assignment.

**Headers:**

```
Authorization: Bearer <admin_jwt_token>
```

**Parameters:**

- `id` (string): The ID of the student

**Body:**

```json
{
  "name": "Aarav Kumar Mehta",
  "dob": "2015-03-12",
  "phoneNumber": "+919876541001",
  "whatsappNumber": "+919876541001",
  "alternateNumber": "+912267891001",
  "profileImageUrl": "https://example.com/updated-student.jpg",
  "fatherName": "Rajesh Kumar Mehta",
  "motherName": "Priya Devi Mehta",
  "address": "456 New Address, Bandra East, Mumbai, Maharashtra 400051",
  "schoolName": "Don Bosco High School",
  "fatherOccupation": "Senior Software Engineer",
  "motherOccupation": "Principal",
  "familyIncome": "75000-100000",
  "enrollment": {
    "level": "LEVEL_3",
    "centerId": "new_center_id"
  }
}
```

**Note:** The `enrollment` field is optional. If `level` is provided, the student will be promoted. If `centerId` is also provided, they will be moved to that center during promotion.

**Response (200):**

```json
{
  "message": "Student updated and promoted successfully",
  "student": {
    "id": "student_id",
    "name": "Aarav Kumar Mehta",
    "dob": "2015-03-12T00:00:00.000Z",
    "phoneNumber": "+919876541001",
    "whatsappNumber": "+919876541001",
    "alternateNumber": "+912267891001",
    "profileImageUrl": "https://example.com/updated-student.jpg",
    "fatherName": "Rajesh Kumar Mehta",
    "motherName": "Priya Devi Mehta",
    "address": "456 New Address, Bandra East, Mumbai, Maharashtra 400051",
    "schoolName": "Don Bosco High School",
    "fatherOccupation": "Senior Software Engineer",
    "motherOccupation": "Principal",
    "familyIncome": "75000-100000",
    "createdAt": "2024-01-01T00:00:00.000Z",
    "updatedAt": "2024-01-02T00:00:00.000Z"
  },
  "enrollment": {
    "id": "new_enrollment_id",
    "studentId": "student_id",
    "centerId": "new_center_id",
    "semesterId": "semester_id",
    "projectId": "project_id",
    "level": "LEVEL_3",
    "isActive": true,
    "enrolledAt": "2024-01-02T00:00:00.000Z",
    "promotedAt": "2024-01-02T00:00:00.000Z"
  }
}
```

#### DELETE /api/v1/users/students/:id

Delete a student (Admin only).

**Headers:**

```
Authorization: Bearer <admin_jwt_token>
```

**Parameters:**

- `id` (string): The ID of the student

**Response (200):**

```json
{
  "message": "Student deleted successfully"
}
```

#### GET /api/v1/users/students/level/:level

Get students by level through their active enrollments.

**Headers:**

```
Authorization: Bearer <jwt_token>
```

**Parameters:**

- `level` (string): The level (LEVEL_1, LEVEL_2, LEVEL_3, LEVEL_4, PRIMARY_A, PRIMARY_B)

**Response (200):**

```json
{
  "message": "Students retrieved successfully",
  "students": [
    {
      "id": "enrollment_id_1",
      "level": "LEVEL_1",
      "isActive": true,
      "enrolledAt": "2024-01-01T00:00:00.000Z",
      "student": {
        "id": "student_id_1",
        "name": "Diya Sharma",
        "dob": "2016-07-25T00:00:00.000Z",
        "phoneNumber": "+919876541002",
        "whatsappNumber": "+919876541002",
        "alternateNumber": "+912267891002",
        "profileImageUrl": "https://example.com/diya.jpg",
        "createdAt": "2024-01-01T00:00:00.000Z",
        "updatedAt": "2024-01-01T00:00:00.000Z"
      },
      "center": {
        "id": "center_id",
        "name": "Mumbai Central Center"
      },
      "project": {
        "id": "project_id",
        "name": "Project Alpha"
      },
      "semester": {
        "id": "semester_id",
        "name": "Fall 2024"
      }
    }
  ]
}
```

#### GET /api/v1/users/students/project/:projectId

Get students enrolled in a specific project.

**Headers:**

```
Authorization: Bearer <jwt_token>
```

**Parameters:**

- `projectId` (string): The ID of the project

**Response (200):**

```json
{
  "message": "Students by project retrieved successfully",
  "enrollments": [
    {
      "id": "enrollment_id_1",
      "studentId": "student_id_1",
      "centerId": "center_id_1",
      "semesterId": "semester_id_1",
      "projectId": "project_id",
      "level": "LEVEL_2",
      "isActive": true,
      "enrolledAt": "2024-01-01T00:00:00.000Z",
      "promotedAt": null,
      "student": {
        "id": "student_id_1",
        "name": "Aarav Mehta",
        "dob": "2015-03-12T00:00:00.000Z",
        "level": "LEVEL_2",
        "profileImageUrl": "https://example.com/student1.jpg"
      },
      "center": {
        "id": "center_id_1",
        "name": "Main Center",
        "address": "123 Main Street, City"
      },
      "semester": {
        "id": "semester_id_1",
        "name": "Spring 2024",
        "startDate": "2024-01-01T00:00:00.000Z",
        "endDate": "2024-06-30T00:00:00.000Z"
      }
    }
  ]
}
```

#### GET /api/v1/users/students/center/:centerId

Get students enrolled in a specific center.

**Headers:**

```
Authorization: Bearer <jwt_token>
```

**Parameters:**

- `centerId` (string): The ID of the center

**Response (200):**

```json
{
  "message": "Students by center retrieved successfully",
  "enrollments": [
    {
      "id": "enrollment_id_1",
      "studentId": "student_id_1",
      "centerId": "center_id",
      "semesterId": "semester_id_1",
      "projectId": "project_id_1",
      "level": "LEVEL_2",
      "isActive": true,
      "enrolledAt": "2024-01-01T00:00:00.000Z",
      "promotedAt": null,
      "student": {
        "id": "student_id_1",
        "name": "Aarav Mehta",
        "dob": "2015-03-12T00:00:00.000Z",
        "level": "LEVEL_2",
        "profileImageUrl": "https://example.com/student1.jpg"
      },
      "project": {
        "id": "project_id_1",
        "name": "Project One",
        "projectType": "Education"
      },
      "semester": {
        "id": "semester_id_1",
        "name": "Spring 2024",
        "startDate": "2024-01-01T00:00:00.000Z",
        "endDate": "2024-06-30T00:00:00.000Z"
      }
    }
  ]
}
```

#### GET /api/v1/users/students/semester/:semesterId

Get students enrolled in a specific semester.

**Headers:**

```
Authorization: Bearer <jwt_token>
```

**Parameters:**

- `semesterId` (string): The ID of the semester

**Response (200):**

```json
{
  "message": "Students by semester retrieved successfully",
  "enrollments": [
    {
      "id": "enrollment_id_1",
      "studentId": "student_id_1",
      "centerId": "center_id_1",
      "semesterId": "semester_id",
      "projectId": "project_id_1",
      "level": "LEVEL_2",
      "isActive": true,
      "enrolledAt": "2024-01-01T00:00:00.000Z",
      "promotedAt": null,
      "student": {
        "id": "student_id_1",
        "name": "Aarav Mehta",
        "dob": "2015-03-12T00:00:00.000Z",
        "level": "LEVEL_2",
        "profileImageUrl": "https://example.com/student1.jpg"
      },
      "center": {
        "id": "center_id_1",
        "name": "Main Center",
        "address": "123 Main Street, City"
      },
      "project": {
        "id": "project_id_1",
        "name": "Project One",
        "projectType": "Education"
      }
    }
  ]
}
```

#### POST /api/v1/users/students/enroll

Enroll a student in a project, center, and semester (Admin only).

**Headers:**

```
Authorization: Bearer <admin_jwt_token>
```

**Body:**

```json
{
  "studentId": "student_id",
  "centerId": "center_id",
  "semesterId": "semester_id",
  "projectId": "project_id",
  "level": "LEVEL_2"
}
```

**Response (201):**

```json
{
  "message": "Student enrolled successfully",
  "enrollment": {
    "id": "enrollment_id",
    "studentId": "student_id",
    "centerId": "center_id",
    "semesterId": "semester_id",
    "projectId": "project_id",
    "level": "LEVEL_2",
    "isActive": true,
    "enrolledAt": "2024-01-01T00:00:00.000Z",
    "promotedAt": null,
    "createdAt": "2024-01-01T00:00:00.000Z",
    "updatedAt": "2024-01-01T00:00:00.000Z"
  }
}
```

#### POST /api/v1/users/students/:studentId/promote

Promote a student to a new level (Admin only).

**Headers:**

```
Authorization: Bearer <admin_jwt_token>
```

**Parameters:**

- `studentId` (string): The ID of the student to promote

**Body:**

```json
{
  "newLevel": "LEVEL_3",
  "newCenterId": "center_id_2"
}
```

**Note:** `newCenterId` is optional. If not provided, the student will be promoted in their current center.

**Response (200):**

```json
{
  "message": "Student promoted successfully",
  "enrollment": {
    "id": "new_enrollment_id",
    "studentId": "student_id",
    "centerId": "center_id_2",
    "semesterId": "semester_id_1",
    "projectId": "project_id_1",
    "level": "LEVEL_3",
    "isActive": true,
    "enrolledAt": "2024-01-02T00:00:00.000Z",
    "promotedAt": "2024-01-02T00:00:00.000Z",
    "createdAt": "2024-01-02T00:00:00.000Z",
    "updatedAt": "2024-01-02T00:00:00.000Z"
  }
}
```

#### GET /api/v1/users/students/:studentId/history

Get the enrollment and promotion history of a student.

**Headers:**

```
Authorization: Bearer <jwt_token>
```

**Parameters:**

- `studentId` (string): The ID of the student

**Response (200):**

```json
{
  "message": "Student history retrieved successfully",
  "history": [
    {
      "id": "enrollment_id_1",
      "studentId": "student_id",
      "centerId": "center_id_1",
      "semesterId": "semester_id_1",
      "projectId": "project_id_1",
      "level": "LEVEL_2",
      "isActive": false,
      "enrolledAt": "2024-01-01T00:00:00.000Z",
      "promotedAt": "2024-01-02T00:00:00.000Z",
      "center": {
        "id": "center_id_1",
        "name": "Main Center"
      },
      "semester": {
        "id": "semester_id_1",
        "name": "Spring 2024"
      },
      "project": {
        "id": "project_id_1",
        "name": "Project One"
      }
    },
    {
      "id": "enrollment_id_2",
      "studentId": "student_id",
      "centerId": "center_id_2",
      "semesterId": "semester_id_1",
      "projectId": "project_id_1",
      "level": "LEVEL_3",
      "isActive": true,
      "enrolledAt": "2024-01-02T00:00:00.000Z",
      "promotedAt": null,
      "center": {
        "id": "center_id_2",
        "name": "Advanced Center"
      },
      "semester": {
        "id": "semester_id_1",
        "name": "Spring 2024"
      },
      "project": {
        "id": "project_id_1",
        "name": "Project One"
      }
    }
  ]
}
```

### User Management Routes

_All user management routes require admin authentication_

#### GET /api/v1/users/management

Get all users with their role assignments for user management board (Admin only).

**Headers:**

```
Authorization: Bearer <admin_jwt_token>
```

**Response (200):**

```json
{
  "message": "Users retrieved successfully",
  "users": [
    {
      "id": "user_id_1",
      "email": "user@example.com",
      "name": "John Doe",
      "profileImageUrl": "https://example.com/profile.jpg",
      "role": "USER",
      "status": "APPROVED",
      "phone": "1234567890",
      "qualification": "Bachelor's Degree",
      "address": "123 Main St",
      "dob": "1990-01-01T00:00:00.000Z",
      "createdAt": "2024-01-01T00:00:00.000Z",
      "updatedAt": "2024-01-01T00:00:00.000Z",
      "roleAssignments": [
        {
          "id": "assignment_id_1",
          "subRole": "EDUCATOR",
          "level": "LEVEL_2",
          "committedDays": "BOTH",
          "isActive": true,
          "assignedAt": "2024-01-01T00:00:00.000Z",
          "project": {
            "id": "project_id",
            "name": "Project One"
          },
          "center": {
            "id": "center_id",
            "name": "Main Center"
          },
          "semester": {
            "id": "semester_id",
            "name": "Spring 2024"
          }
        }
      ]
    }
  ]
}
```

#### GET /api/v1/users/:userId/assignments

Get role assignments for a specific user (Admin only).

**Headers:**

```
Authorization: Bearer <admin_jwt_token>
```

**Parameters:**

- `userId` (string): The ID of the user

**Response (200):**

```json
{
  "message": "User assignments retrieved successfully",
  "assignments": [
    {
      "id": "assignment_id_1",
      "subRole": "CENTER_MANAGER",
      "committedDays": "SATURDAY",
      "isActive": true,
      "assignedAt": "2024-01-01T00:00:00.000Z",
      "project": {
        "id": "project_id",
        "name": "Project One"
      },
      "center": {
        "id": "center_id",
        "name": "Main Center"
      }
    }
  ]
}
```

#### PUT /api/v1/users/:userId/management

Update user's role assignments in bulk (Admin only). This route intelligently handles changes by deactivating old assignments and creating new ones.

**Headers:**

```
Authorization: Bearer <admin_jwt_token>
```

**Parameters:**

- `userId` (string): The ID of the user

**Body:**

```json
{
  "roleAssignments": [
    {
      "subRole": "EDUCATOR",
      "projectId": "project_id",
      "centerId": "center_id",
      "semesterId": "semester_id",
      "level": "LEVEL_3",
      "committedDays": "BOTH"
    },
    {
      "subRole": "TECH",
      "projectId": "project_id"
    }
  ]
}
```

**Field Requirements:**

**Required Fields:**

- `roleAssignments` (array): Array of role assignment objects

**Role Assignment Fields:**

- `subRole` (string, required): One of: TRAINING_DEVELOPMENT, RECRUITMENT, GROWTH_DEVELOPMENT, CURRICULUM_MENTOR, TECH, CENTER_MANAGER, EDUCATOR
- `projectId` (string, optional): Project assignment
- `centerId` (string, optional): Center assignment
- `semesterId` (string, optional): Semester assignment
- `level` (string, optional): Only for EDUCATOR sub-role (LEVEL_1, LEVEL_2, LEVEL_3, LEVEL_4, PRIMARY_A, PRIMARY_B)
- `committedDays` (string, optional): Only for CENTER_MANAGER and EDUCATOR sub-roles (SATURDAY, SUNDAY, BOTH)

**Validation Rules:**

- If `semesterId` is provided, `centerId` must belong to that semester
- If `centerId` is provided with `projectId`, center must belong to that project
- If `semesterId` is provided with `projectId`, semester's center must belong to that project
- `level` can only be set for EDUCATOR sub-role
- `committedDays` can only be set for CENTER_MANAGER and EDUCATOR sub-roles
- Multiple assignments are allowed for the same user

**Response (200):**

```json
{
  "message": "User assignments updated successfully",
  "assignments": [
    {
      "id": "new_assignment_id_1",
      "subRole": "EDUCATOR",
      "level": "LEVEL_3",
      "committedDays": "BOTH",
      "isActive": true,
      "project": {
        "id": "project_id",
        "name": "Project One"
      },
      "center": {
        "id": "center_id",
        "name": "Main Center"
      },
      "semester": {
        "id": "semester_id",
        "name": "Spring 2024"
      }
    }
  ]
}
```

#### POST /api/v1/users/assignments

Create a new role assignment for a user (Admin only).

**Headers:**

```
Authorization: Bearer <admin_jwt_token>
```

**Body:**

```json
{
  "userId": "user_id",
  "subRole": "CENTER_MANAGER",
  "projectId": "project_id",
  "centerId": "center_id",
  "committedDays": "SUNDAY"
}
```

**Field Requirements:**

**Required Fields:**

- `userId` (string): ID of the user to assign
- `subRole` (string): One of: TRAINING_DEVELOPMENT, RECRUITMENT, GROWTH_DEVELOPMENT, CURRICULUM_MENTOR, TECH, CENTER_MANAGER, EDUCATOR

**Optional Fields:**

- `projectId` (string): Project assignment
- `centerId` (string): Center assignment
- `semesterId` (string): Semester assignment
- `level` (string): Only for EDUCATOR sub-role (LEVEL_1, LEVEL_2, LEVEL_3, LEVEL_4, PRIMARY_A, PRIMARY_B)
- `committedDays` (string): Only for CENTER_MANAGER and EDUCATOR sub-roles (SATURDAY, SUNDAY, BOTH)

**Validation Rules:**

- If `semesterId` is provided, `centerId` must belong to that semester
- If `centerId` is provided with `projectId`, center must belong to that project
- If `semesterId` is provided with `projectId`, semester's center must belong to that project
- `level` can only be set for EDUCATOR sub-role
- `committedDays` can only be set for CENTER_MANAGER and EDUCATOR sub-roles

**Response (201):**

```json
{
  "message": "User assignment created successfully",
  "assignment": {
    "id": "assignment_id",
    "subRole": "CENTER_MANAGER",
    "committedDays": "SUNDAY",
    "isActive": true,
    "assignedAt": "2024-01-01T00:00:00.000Z",
    "user": {
      "id": "user_id",
      "name": "John Doe",
      "email": "user@example.com"
    },
    "project": {
      "id": "project_id",
      "name": "Project One"
    },
    "center": {
      "id": "center_id",
      "name": "Main Center"
    }
  }
}
```

#### DELETE /api/v1/users/assignments/:assignmentId

Delete (deactivate) a user role assignment (Admin only).

**Headers:**

```
Authorization: Bearer <admin_jwt_token>
```

**Parameters:**

- `assignmentId` (string): The ID of the assignment to delete

**Response (200):**

```json
{
  "message": "User assignment deleted successfully"
}
```

### Student Attendance Routes

_All student attendance routes require authentication_

#### POST /api/v1/student-attendance/mark

Mark attendance for a student (Admin only).

**Headers:**

```
Authorization: Bearer <admin_jwt_token>
```

**Body:**

```json
{
  "studentId": "student_id",
  "enrollmentId": "enrollment_id",
  "date": "2024-01-15",
  "status": "PRESENT",
  "notes": "Present and participating well",
  "holidayReason": null
}
```

**Response (201):**

```json
{
  "message": "Attendance marked successfully",
  "attendance": {
    "id": "attendance_id",
    "studentId": "student_id",
    "date": "2024-01-15T00:00:00.000Z",
    "status": "PRESENT",
    "enrollmentId": "enrollment_id",
    "projectId": "project_id",
    "centerId": "center_id",
    "semesterId": "semester_id",
    "notes": "Present and participating well",
    "holidayReason": null,
    "markedBy": "admin_user_id",
    "markedAt": "2024-01-15T10:30:00.000Z",
    "student": {
      "id": "student_id",
      "name": "John Doe",
      "profileImageUrl": "https://example.com/student.jpg"
    },
    "enrollment": {
      "id": "enrollment_id",
      "level": "LEVEL_2"
    },
    "project": {
      "id": "project_id",
      "name": "Project Alpha"
    },
    "center": {
      "id": "center_id",
      "name": "Main Center",
      "address": "123 Main St"
    },
    "semester": {
      "id": "semester_id",
      "name": "Spring 2024",
      "startDate": "2024-01-01T00:00:00.000Z",
      "endDate": "2024-06-30T00:00:00.000Z"
    },
    "markedByUser": {
      "id": "admin_user_id",
      "name": "Admin User"
    }
  }
}
```

#### POST /api/v1/student-attendance/bulk

Mark attendance for multiple students at once (Admin only).

**Headers:**

```
Authorization: Bearer <admin_jwt_token>
```

**Body:**

```json
{
  "date": "2024-01-15",
  "status": "PRESENT",
  "projectId": "project_id",
  "centerId": "center_id",
  "semesterId": "semester_id",
  "studentAttendances": [
    {
      "studentId": "student_id_1",
      "enrollmentId": "enrollment_id_1",
      "status": "PRESENT"
    },
    {
      "studentId": "student_id_2",
      "enrollmentId": "enrollment_id_2",
      "status": "ABSENT",
      "notes": "Sick leave"
    },
    {
      "studentId": "student_id_3",
      "enrollmentId": "enrollment_id_3",
      "status": "HOLIDAY"
    }
  ],
  "holidayReason": "National Holiday"
}
```

**Response (200):**

```json
{
  "message": "Bulk student attendance marked successfully",
  "attendances": [
    {
      "id": "attendance_id_1",
      "studentId": "student_id_1",
      "date": "2024-01-15T00:00:00.000Z",
      "status": "PRESENT",
      "enrollmentId": "enrollment_id_1",
      "projectId": "project_id",
      "centerId": "center_id",
      "semesterId": "semester_id",
      "markedBy": "admin_user_id",
      "markedAt": "2024-01-15T10:30:00.000Z",
      "student": {
        "id": "student_id_1",
        "name": "John Doe"
      }
    },
    {
      "id": "attendance_id_2",
      "studentId": "student_id_2",
      "date": "2024-01-15T00:00:00.000Z",
      "status": "ABSENT",
      "notes": "Sick leave"
    },
    {
      "id": "attendance_id_3",
      "studentId": "student_id_3",
      "date": "2024-01-15T00:00:00.000Z",
      "status": "HOLIDAY"
    }
  ],
  "processed": 3,
  "total": 3
}
```

#### GET /api/v1/student-attendance

Get student attendance records with optional filters.

**Headers:**

```
Authorization: Bearer <jwt_token>
```

**Query Parameters:**

- `studentId` (string, optional): Filter by specific student
- `projectId` (string, optional): Filter by project
- `centerId` (string, optional): Filter by center
- `semesterId` (string, optional): Filter by semester
- `date` (string, optional): Filter by specific date (YYYY-MM-DD)
- `dateFrom` (string, optional): Filter from date (YYYY-MM-DD)
- `dateTo` (string, optional): Filter to date (YYYY-MM-DD)
- `status` (string, optional): Filter by attendance status (PRESENT, ABSENT, HOLIDAY)

**Response (200):**

```json
{
  "message": "Attendance records retrieved successfully",
  "attendance": [
    {
      "id": "attendance_id",
      "studentId": "student_id",
      "date": "2024-01-15T00:00:00.000Z",
      "status": "PRESENT",
      "enrollmentId": "enrollment_id",
      "projectId": "project_id",
      "centerId": "center_id",
      "semesterId": "semester_id",
      "notes": "Present and participating well",
      "holidayReason": null,
      "markedBy": "admin_user_id",
      "markedAt": "2024-01-15T10:30:00.000Z",
      "student": {
        "id": "student_id",
        "name": "John Doe",
        "profileImageUrl": "https://example.com/student.jpg"
      },
      "enrollment": {
        "id": "enrollment_id",
        "level": "LEVEL_2"
      },
      "project": {
        "id": "project_id",
        "name": "Project Alpha"
      },
      "center": {
        "id": "center_id",
        "name": "Main Center",
        "address": "123 Main St"
      },
      "semester": {
        "id": "semester_id",
        "name": "Spring 2024",
        "startDate": "2024-01-01T00:00:00.000Z",
        "endDate": "2024-06-30T00:00:00.000Z"
      },
      "markedByUser": {
        "id": "admin_user_id",
        "name": "Admin User"
      }
    }
  ]
}
```

#### GET /api/v1/student-attendance/student/:studentId

Get attendance records for a specific student.

**Headers:**

```
Authorization: Bearer <jwt_token>
```

**Path Parameters:**

- `studentId` (string): The ID of the student

**Query Parameters:**

- `semesterId` (string, optional): Filter by semester
- `centerId` (string, optional): Filter by center
- `dateFrom` (string, optional): Filter from date (YYYY-MM-DD)
- `dateTo` (string, optional): Filter to date (YYYY-MM-DD)

**Response (200):**

```json
{
  "message": "Student attendance records retrieved successfully",
  "attendance": [
    {
      "id": "attendance_id",
      "studentId": "student_id",
      "date": "2024-01-15T00:00:00.000Z",
      "status": "PRESENT",
      "notes": "Present and participating well"
    }
  ]
}
```

#### GET /api/v1/student-attendance/stats/:studentId

Get attendance statistics for a specific student.

**Headers:**

```
Authorization: Bearer <jwt_token>
```

**Path Parameters:**

- `studentId` (string): The ID of the student

**Query Parameters:**

- `semesterId` (string, optional): Filter by semester
- `centerId` (string, optional): Filter by center
- `dateFrom` (string, optional): Filter from date (YYYY-MM-DD)
- `dateTo` (string, optional): Filter to date (YYYY-MM-DD)

**Response (200):**

```json
{
  "message": "Student attendance statistics retrieved successfully",
  "stats": {
    "totalDays": 20,
    "presentDays": 18,
    "absentDays": 2,
    "holidayDays": 3,
    "attendancePercentage": 90.0
  }
}
```

#### GET /api/v1/student-attendance/date/:date

Get attendance records for a specific date across all centers/projects.

**Headers:**

```
Authorization: Bearer <jwt_token>
```

**Path Parameters:**

- `date` (string): The date in YYYY-MM-DD format

**Query Parameters:**

- `centerId` (string, optional): Filter by center
- `semesterId` (string, optional): Filter by semester
- `projectId` (string, optional): Filter by project

**Response (200):**

```json
{
  "message": "Daily attendance records retrieved successfully",
  "attendance": [
    {
      "id": "attendance_id",
      "studentId": "student_id",
      "date": "2024-01-15T00:00:00.000Z",
      "status": "PRESENT",
      "student": {
        "id": "student_id",
        "name": "John Doe"
      },
      "center": {
        "id": "center_id",
        "name": "Main Center"
      }
    }
  ]
}
```

#### GET /api/v1/student-attendance/missing

Get students who don't have attendance records for a specific date.

**Headers:**

```
Authorization: Bearer <jwt_token>
```

**Query Parameters:**

- `date` (string, required): The date in YYYY-MM-DD format
- `centerId` (string, required): Filter by center
- `semesterId` (string, required): Filter by semester
- `projectId` (string, optional): Filter by project

**Response (200):**

```json
{
  "message": "Students without attendance retrieved successfully",
  "students": [
    {
      "enrollmentId": "enrollment_id",
      "student": {
        "id": "student_id",
        "name": "Jane Smith",
        "profileImageUrl": "https://example.com/student.jpg"
      },
      "level": "LEVEL_3",
      "studentId": "student_id",
      "projectId": "project_id",
      "centerId": "center_id",
      "semesterId": "semester_id"
    }
  ]
}
```

#### PUT /api/v1/student-attendance/:id

Update an existing attendance record (Admin only).

**Headers:**

```
Authorization: Bearer <admin_jwt_token>
```

**Path Parameters:**

- `id` (string): The ID of the attendance record to update

**Body:**

```json
{
  "status": "ABSENT",
  "notes": "Updated: Student was sick",
  "holidayReason": null
}
```

**Response (200):**

```json
{
  "message": "Attendance updated successfully",
  "attendance": {
    "id": "attendance_id",
    "studentId": "student_id",
    "date": "2024-01-15T00:00:00.000Z",
    "status": "ABSENT",
    "notes": "Updated: Student was sick",
    "markedBy": "admin_user_id",
    "markedAt": "2024-01-15T15:30:00.000Z"
  }
}
```

#### DELETE /api/v1/student-attendance/:id

Delete an attendance record (Admin only).

**Headers:**

```
Authorization: Bearer <admin_jwt_token>
```

**Path Parameters:**

- `id` (string): The ID of the attendance record to delete

**Response (200):**

```json
{
  "message": "Attendance record deleted successfully"
}
```

#### Student Attendance Status Values

- `PRESENT`: Student was present for the session
- `ABSENT`: Student was absent from the session
- `HOLIDAY`: It was a holiday (no classes scheduled)

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

### Attendance Routes

_All attendance routes require authentication_

#### GET /api/v1/attendance/active-users

Get active educators and center managers for a specific date, project, center, and semester for attendance marking.

**Headers:**

```
Authorization: Bearer <jwt_token>
```

**Query Parameters:**

- `date` (string, required): Date in YYYY-MM-DD format (must be Saturday or Sunday)
- `projectId` (string, required): The ID of the project
- `centerId` (string, required): The ID of the center
- `semesterId` (string, required): The ID of the semester

**Response (200):**

```json
{
  "message": "Active users retrieved successfully",
  "data": {
    "users": [
      {
        "id": "user_id",
        "name": "John Doe",
        "email": "john@example.com",
        "profileImageUrl": "https://example.com/profile.jpg",
        "roleAssignments": [
          {
            "id": "assignment_id",
            "subRole": "EDUCATOR",
            "level": "LEVEL_1",
            "committedDays": "SATURDAY",
            "projectId": "project_id",
            "centerId": "center_id",
            "semesterId": "semester_id"
          }
        ]
      }
    ],
    "totalUsers": 1
  }
}
```

#### POST /api/v1/attendance/mark

Mark attendance for a single user.

**Headers:**

```
Authorization: Bearer <jwt_token>
```

**Body:**

```json
{
  "userId": "user_id",
  "date": "2024-07-27",
  "status": "PRESENT",
  "roleAssignmentId": "assignment_id",
  "projectId": "project_id",
  "centerId": "center_id",
  "semesterId": "semester_id",
  "notes": "On time",
  "holidayReason": "National Holiday"
}
```

**Field Requirements:**

**Required Fields:**

- `userId` (string): ID of the user
- `date` (string): Date in YYYY-MM-DD format
- `status` (string): PRESENT, ABSENT, NOT_AVAILABLE, or HOLIDAY
- `projectId` (string): ID of the project
- `centerId` (string): ID of the center
- `semesterId` (string): ID of the semester
- `roleAssignmentId` (string): ID of the specific role assignment

**Optional Fields:**

- `notes` (string): Additional notes
- `holidayReason` (string): Required when status is HOLIDAY

**Response (200):**

```json
{
  "message": "Attendance marked successfully",
  "attendance": {
    "id": "attendance_id",
    "userId": "user_id",
    "date": "2024-07-27",
    "status": "PRESENT",
    "projectId": "project_id",
    "centerId": "center_id",
    "semesterId": "semester_id",
    "notes": "On time",
    "markedBy": "marker_user_id",
    "markedAt": "2024-07-27T10:00:00.000Z"
  }
}
```

#### POST /api/v1/attendance/bulk-mark

Mark attendance for multiple users in bulk.

**Headers:**

```
Authorization: Bearer <jwt_token>
```

**Body:**

```json
{
  "date": "2024-07-27",
  "projectId": "project_id",
  "centerId": "center_id",
  "semesterId": "semester_id",
  "attendances": [
    {
      "userId": "user_id_1",
      "status": "PRESENT",
      "roleAssignmentId": "assignment_id_1",
      "notes": "On time"
    },
    {
      "userId": "user_id_2",
      "status": "HOLIDAY",
      "roleAssignmentId": "assignment_id_2",
      "holidayReason": "National Holiday"
    }
  ]
}
```

**Response (200):**

```json
{
  "message": "Bulk attendance marking completed. Processed 2/2 records.",
  "processedCount": 2,
  "errors": []
}
```

#### GET /api/v1/attendance/records

Get attendance records with filtering and pagination.

**Headers:**

```
Authorization: Bearer <jwt_token>
```

**Query Parameters:**

- `startDate` (string, optional): Start date in YYYY-MM-DD format
- `endDate` (string, optional): End date in YYYY-MM-DD format
- `userId` (string, optional): Filter by user ID
- `projectId` (string, optional): Filter by project ID
- `centerId` (string, optional): Filter by center ID
- `semesterId` (string, optional): Filter by semester ID
- `status` (string, optional): Filter by attendance status
- `page` (number, optional): Page number for pagination (default: 1)
- `limit` (number, optional): Records per page (default: 50)

**Response (200):**

```json
{
  "message": "Attendance records retrieved successfully",
  "data": {
    "attendances": [
      {
        "id": "attendance_id",
        "userId": "user_id",
        "userName": "John Doe",
        "userEmail": "john@example.com",
        "date": "2024-07-27",
        "status": "PRESENT",
        "projectId": "project_id",
        "projectName": "Project Alpha",
        "centerId": "center_id",
        "centerName": "Center A",
        "semesterId": "semester_id",
        "semesterName": "Summer 2024",
        "notes": "On time",
        "markedBy": "marker_user_id",
        "markedByName": "Admin User",
        "markedAt": "2024-07-27T10:00:00.000Z",
        "roleAssignment": {
          "id": "assignment_id",
          "subRole": "EDUCATOR",
          "level": "LEVEL_1",
          "committedDays": "SATURDAY"
        }
      }
    ],
    "totalCount": 100,
    "page": 1,
    "limit": 50,
    "totalPages": 2
  }
}
```

#### GET /api/v1/attendance/summary

Get attendance summary/report for users within a date range.

**Headers:**

```
Authorization: Bearer <jwt_token>
```

**Query Parameters:**

- `startDate` (string, required): Start date in YYYY-MM-DD format
- `endDate` (string, required): End date in YYYY-MM-DD format
- `projectId` (string, optional): Filter by project ID
- `centerId` (string, optional): Filter by center ID
- `semesterId` (string, optional): Filter by semester ID
- `userIds` (string, optional): Comma-separated user IDs to filter by

**Response (200):**

```json
{
  "message": "Attendance summary retrieved successfully",
  "data": {
    "summary": [
      {
        "userId": "user_id",
        "userName": "John Doe",
        "userEmail": "john@example.com",
        "totalDays": 8,
        "presentDays": 6,
        "absentDays": 1,
        "notAvailableDays": 0,
        "holidayDays": 1,
        "attendancePercentage": 86
      }
    ],
    "periodInfo": {
      "startDate": "2024-07-01",
      "endDate": "2024-07-31",
      "totalDays": 31,
      "weekendDays": 8
    }
  }
}
```

#### POST /api/v1/attendance/auto-mark

Auto-mark attendance for all eligible users on a specific date (Admin only). This creates NOT_AVAILABLE records for users who haven't been marked present.

**Headers:**

```
Authorization: Bearer <admin_jwt_token>
```

**Body:**

```json
{
  "date": "2024-07-27",
  "projectId": "project_id",
  "centerId": "center_id",
  "semesterId": "semester_id"
}
```

**Response (200):**

```json
{
  "message": "Auto-marked attendance for 5 user assignments",
  "processedCount": 5
}
```

## Attendance Logic

The attendance system follows these rules:

1. **Weekend Only**: Attendance is only tracked for Saturday and Sunday based on users' `committedDays`
2. **Committed Days Matching**: Only users with matching committed days for the requested date are eligible
3. **Status Logic**:

   - **PRESENT**: User explicitly marked as present (client sends entry)
   - **ABSENT**: User was expected but didn't show up on their committed day
   - **NOT_AVAILABLE**: User was not available on a day they weren't committed to, or auto-marked
   - **HOLIDAY**: Marked as holiday with a reason (applies to all users)

4. **Auto-marking**: Admins can auto-mark all eligible users as NOT_AVAILABLE, which can later be updated to PRESENT when users check in

5. **Hierarchy**: Attendance can be tracked at project, center, and semester levels for flexible reporting

## Authentication

The API uses JWT (JSON Web Tokens) for authentication. After logging in, include the token in the Authorization header:

```
Authorization: Bearer <your_jwt_token>
```

## User Roles

- **USER**: Default role for registered users with sub-role assignments
- **ADMIN**: Can create, update, and delete projects, centers, semesters, students, and manage user roles

## User Sub-Roles (for USER role only)

- **TRAINING_DEVELOPMENT**: Training & Development personnel
- **RECRUITMENT**: Recruitment team members
- **GROWTH_DEVELOPMENT**: Growth & Development specialists
- **CURRICULUM_MENTOR**: Curriculum mentors and advisors
- **TECH**: Technical team members
- **CENTER_MANAGER**: Center managers (requires committedDays)
- **EDUCATOR**: Educators and teachers (requires level and committedDays)

## User Status

- **PENDING**: User registration pending approval (default for new registrations)
- **APPROVED**: User approved and can access the system
- **REJECTED**: User registration rejected

## Committed Days (for CENTER_MANAGER and EDUCATOR only)

- **SATURDAY**: Available on Saturdays only
- **SUNDAY**: Available on Sundays only
- **BOTH**: Available on both Saturday and Sunday

## Project Status

- **ACTIVE**: Project is active and available (default)
- **INACTIVE**: Project is temporarily disabled

## Student Levels

- **LEVEL_1**: Level 1 students
- **LEVEL_2**: Level 2 students
- **LEVEL_3**: Level 3 students
- **LEVEL_4**: Level 4 students
- **PRIMARY_A**: Primary A students
- **PRIMARY_B**: Primary B students

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

- **User**: User accounts with roles, status, and profile images
- **UserRoleAssignments**: Flexible role assignment system for USER role with sub-roles, project/center/semester assignments, levels (for educators), and committed days (for center managers and educators)
- **Students**: Student management with levels and contact information
- **StudentEnrollments**: Junction table tracking student enrollments, promotions, and level history across projects, centers, and semesters
- **Projects**: Project management with status and associated centers
- **Centers**: Center/location management linked to projects with level information
- **Semesters**: Academic semester management linked to centers

### User Role Management Features

The system supports comprehensive user role management with:

- **Hierarchical Roles**: ADMIN (full access) and USER (role-based access)
- **Sub-Role System**: 7 different sub-roles for USER accounts with specific permissions
- **Multi-dimensional Assignments**: Users can be assigned to multiple projects, centers, and semesters
- **Business Rule Enforcement**: Level assignments only for educators, committed days only for center managers and educators
- **Flexible Updates**: Bulk update system that intelligently manages role changes
- **Historical Tracking**: Complete audit trail of all role assignments and changes

### User Assignment System

Each user role assignment includes:

- Sub-role (required for all USER accounts)
- Optional project, center, and semester associations
- Level assignment (educators only)
- Committed days (center managers and educators only)
- Active status for easy management
- Assignment timestamps for tracking

### Test Admin Account

After running `npm run seed`, you can use these credentials:

- **Email**: pranganfoundationindia@gmail.com
- **Password**: Prangan@2025
- **Role**: ADMIN
- **Status**: APPROVED

The seed script also creates 10 sample students with Indian names and various levels.

## Scripts

```bash
# Development
npm run dev          # Start development server with watch mode
npm run dev:ts-node  # Start with ts-node (alternative)

# Production
npm run build        # Build the project (includes migrations)
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
