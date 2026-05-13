# CarLo Backend — API Reference

Complete catalog of every HTTP endpoint exposed by the NestJS application
(`src/main.ts` — default port `3005`, base URL `http://localhost:3005`).
Every controller is listed with its full route signature, request body /
query / path parameters, the auth guard it uses, and the response payload
returned by its underlying service method.

> Conventions
>
> - **Auth** column shows the `@UseGuards(...)` applied. Bearer JWTs go in
>   `Authorization: Bearer <token>`.
>   - `JwtBlacklistGuard` → Admin JWT (`req.user.admin_id`, `admin_email`, `admin_role`).
>   - `FMJwtBlacklistGuard` → Fleet Manager JWT (`req.user.fleet_id`, `fleet_user_id`, `fleet_email`).
>   - `ClientJwtBlacklistGuard` / `JwtGuard` → Client JWT (`req.user.client_id`, `client_email`).
> - All bodies validated with `class-validator` + global `ValidationPipe`
>   (`whitelist: true`, `forbidNonWhitelisted: true`).
> - Pagination responses return `{ data, total|meta, page, limit, totalPages }`
>   where applicable.
> - File-upload endpoints use `multipart/form-data` with the field name
>   `files` (or `profile_pic`) and a sibling `documentTypes[]` form-field
>   that may be repeated or comma-separated.
> - Swagger UI is available at `GET /api`.

## Index

- [Admin / Auth](#admin--auth) — `/admin/auth`
- [Admin / RBAC](#admin--rbac) — `/admin/rbac`
- [Admin / Users](#admin--users) — `/admin/users`
- [Admin / Fleet](#admin--fleet) — `/admin/fleet`
- [Admin / Notifications](#admin--notifications) — `/admin/notifications`
- [Admin / Analytics](#admin--analytics) — `/admin/analytics`
- [Allocation](#allocation) — `/client/allocation`
- [Chatbot](#chatbot) — `/client/chatbot`
- [Client / Auth](#client--auth) — `/client/auth`
- [Client / Profile](#client--profile) — `/client/profile`
- [Client / Bookings](#client--bookings) — `/client/bookings`
- [Client / Host](#client--host) — `/client`
- [Client / Notifications](#client--notifications) — `/client/notifications`
- [Public Catalog](#public-catalog) — `/public`
- [Flutter API](#flutter-api-flutter) — `/flutter`
- [Fleet Manager / Auth](#fleet-manager--auth) — `/fm/auth`
- [Fleet Manager / RBAC](#fleet-manager--rbac) — `/fm/rbac`
- [Fleet Manager / Users](#fleet-manager--users) — `/fm/users`
- [Fleet Manager / Vehicles](#fleet-manager--vehicles) — `/fm/vehicles`
- [Fleet Manager / Vehicle Requests](#fleet-manager--vehicle-requests) — `/vehicle-requests`
- [Fleet Manager / Bookings](#fleet-manager--bookings) — `/fm/bookings`
- [Fleet Manager / Notifications](#fleet-manager--notifications) — `/fm/notifications`
- [Fleet Manager / Analytics](#fleet-manager--analytics) — `/fm/analytics`
- [Dynamic Pricing](#dynamic-pricing) — `/fm/pricing`
- [OCR / Document Verification](#ocr--document-verification) — `/fm/ocr`
- [Firebase / FCM](#firebase--fcm) — `/fcm`

---

## Admin / Auth

Base path: `/admin/auth` — `src/Admin/Auth/auth.controller.ts`

### POST `/admin/auth/seed-super-admin`

Seed the very first super-admin (idempotent helper, intended for dev only).

- **Auth**: none
- **Body**: none
- **Response**: created Admin row (or existing row if already seeded).

### POST `/admin/auth/login`

- **Auth**: none
- **Body** (`LoginDto`):

```json
{ "email": "admin@carlo.com", "password": "Admin@12345" }
```

- **Response**:

```json
{
  "message": "Login successful",
  "access_token": "<JWT>",
  "user": {
    "id": 1,
    "firstName": "Super",
    "lastName": "Admin",
    "email": "admin@carlo.com",
    "role": { "id": 1, "roleName": "SuperAdmin" }
  }
}
```

### POST `/admin/auth/forgot-password`

- **Auth**: none
- **Body** (`ForgotPasswordDto`): `{ "email": "user@example.com" }`
- **Response**: `{ "message": "Reset link sent to email" }`

### PATCH `/admin/auth/reset-password`

- **Auth**: none
- **Body** (`ResetPasswordDto`): `{ "token": "<jwt>", "newPassword": "Aa1@aaaa" }`
- **Response**: `{ "message": "Password has been reset successfully" }`

### POST `/admin/auth/logout`

- **Auth**: `JwtBlacklistGuard`
- **Body**: none (token read from `Authorization` header)
- **Response**: `{ "message": "Logout successful" }`

---

## Admin / RBAC

Base path: `/admin/rbac` — `src/Admin/RBAC/rbac.controller.ts`

### POST `/admin/rbac/add-role`

- **Auth**: `JwtBlacklistGuard`
- **Body** (`AddRoleDto`): `{ "role_name": "finance" }`
- **Response**: created `AdminRole` row.

### GET `/admin/rbac/get-roles`

- **Auth**: `JwtBlacklistGuard`
- **Response**: `AdminRole[]` — list of roles.

### PATCH `/admin/rbac/edit-role/:id`

- **Auth**: `JwtBlacklistGuard`
- **Path**: `id` (number)
- **Body** (`AddRoleDto`): `{ "role_name": "newName" }`
- **Response**: updated `AdminRole`.

### DELETE `/admin/rbac/delete-role/:id`

- **Auth**: `JwtBlacklistGuard`
- **Path**: `id` (number)
- **Response**: `{ "message": "Role deleted successfully", "role": { /* AdminRole */ } }`

### POST `/admin/rbac/assign-permissions`

- **Auth**: `JwtBlacklistGuard` + caller must be SuperAdmin (`admin_role === 1`)
- **Body** (`AssignPermissionDto`):

```json
{ "role_id": 2, "module_id": 5, "is_enable": true }
```

- **Response**: updated `AdminPermissions` row.

### GET `/admin/rbac/sidebar/:roleId`

- **Auth**: none
- **Path**: `roleId` (number)
- **Response**: list of modules enabled for the given role.

### GET `/admin/rbac/permissions-matrix`

- **Auth**: `JwtBlacklistGuard`
- **Response**: matrix `{ roles, modules, permissions }` describing which
  modules each role can access.

---

## Admin / Users

Base path: `/admin/users` — `src/Admin/User/user.controller.ts`

### POST `/admin/users/add-internal-user`

- **Auth**: `JwtBlacklistGuard`
- **Body** (`AddInternalUserDto`):

```json
{
  "FirstName": "Jane",
  "LastName": "Doe",
  "Contact": "0300-1234567",
  "Email": "jane@carlo.com",
  "Role": "finance"
}
```

- **Response**:

```json
{ "message": "Internal user created successfully", "user": { /* Admin row */ } }
```

Also emails the user a password-reset link.

### PATCH `/admin/users/edit-internal-user/:id`

- **Auth**: `JwtBlacklistGuard`
- **Path**: `id` (number)
- **Body** (`EditInternalUserDto`): all fields optional.

```json
{ "FirstName": "Jane", "LastName": "Doe", "Contact": "...", "Role": "marketing", "isActive": true }
```

- **Response**: `{ "message": "Internal user updated successfully", "user": { /* Admin */ } }`

### PATCH `/admin/users/edit-profile`

- **Auth**: `JwtBlacklistGuard` (acts on `req.user.admin_email`)
- **Body** (`EditInternalUserDto`): same shape as above.
- **Response**: `{ "message": "Profile updated successfully" }`

### GET `/admin/users/view-internal-user`

- **Auth**: `JwtBlacklistGuard`
- **Query**: `page`, `limit`, `role`, `status` (`active|inactive`), `search`
- **Response** (paginated):

```json
{
  "data": [ { /* Admin (excluding self) */ } ],
  "total": 0,
  "page": 1,
  "limit": 10,
  "totalPages": 0
}
```

### PATCH `/admin/users/soft-delete-internal-user/:id`

- **Auth**: `JwtBlacklistGuard`
- **Path**: `id` (number)
- **Body** (`DeleteInternalUserDto`): `{ "isdelete": true }`
- **Response**: `{ "message": "User deleted/restored successfully" }` (updated Admin row).

---

## Admin / Fleet

Base path: `/admin/fleet` — `src/Admin/Fleet/fleet.controller.ts`

### POST `/admin/fleet/add`

Create a fleet AND its first FM admin user.

- **Auth**: `JwtBlacklistGuard`
- **Body** (`AddFleetWithUserDto`):

```json
{
  "fleet": {
    "fleet_name": "Acme Rentals",
    "fleet_type": "individual",            
    "fleet_contact": "0300-...",
    "fleet_email": "ops@acme.com",
    "fleet_address": "Block 5",
    "fleet_city": "Karachi",
    "fleet_state": "Sindh",
    "fleet_country": "Pakistan",
    "fleet_registration_number": "REG-001"
  },
  "user": {
    "first_name": "Owner",
    "last_name": "One",
    "Contact": "0300-...",
    "Cnic": "42101-1234567-1",
    "Dob": "1990-01-01",
    "Email": "owner@acme.com",
    "Role": "Admin",
    "Password": "Optional1@"           
  }
}
```

`fleet_type` ∈ `individual | shop`. `Password` is optional — if omitted a
temp password is generated and returned in the response.

- **Response**:

```json
{
  "message": "Fleet created successfully",
  "fleet":   { "id": 1, "name": "...", "email": "...", "type": "individual", "isActive": false },
  "user":    { "id": 1, "first_name": "Owner", "last_name": "One", "email": "owner@acme.com" },
  "tempPassword": "abcd1234"             
}
```

### POST `/admin/fleet/uploadDocuments/:fleetManagerId`  (`multipart/form-data`)

- **Auth**: `JwtBlacklistGuard`
- **Path**: `fleetManagerId`
- **Form fields**:
  - `files` — one or more file blobs.
  - `documentTypes` — array of strings whose length matches `files`.
- **Response**: array of saved `FleetManagersDocuments` rows
  `[{ id, documentType, documentUrl, verificationStatus, ... }]`.

### GET `/admin/fleet/vehicle-requests`

- **Auth**: `JwtBlacklistGuard`
- **Query**: `status`, `type`, `search`, `from` (ISO date), `to` (ISO date),
  `page=1`, `limit=50`
- **Response** (paginated): `{ data: Requests[], total, page, limit, totalPages }`

### PATCH `/admin/fleet/vehicle-requests/:id`

Approve or reject a fleet's `vehicle_approval` / `delete_vehicle` request.

- **Auth**: `JwtBlacklistGuard`
- **Path**: `id` (request id)
- **Body** (`ResolveVehicleRequestDto`):

```json
{ "decision": "approved", "adminNotes": "Optional" }
```

- **Response**:

```json
{ "message": "Request approved successfully", "id": 12, "requestStatus": "approved" }
```

### GET `/admin/fleet/getAllFleet`

- **Auth**: `JwtBlacklistGuard`
- **Query**: `page=1`, `limit=10`, `search`, `status` (`active|inactive`),
  `plan`, `startDate`, `endDate`, `paymentStatus`
- **Response**: `{ data: FleetManagers[], page, limit, total, totalPages }`

### PATCH `/admin/fleet/editFleet/:id`

- **Auth**: `JwtBlacklistGuard`
- **Path**: `id`
- **Body** (`EditFleetDto`): all fields optional.

```json
{
  "fleet_name": "...", "fleet_contact": "...", "fleet_email": "...",
  "fleet_address": "...", "fleet_registration_number": "...",
  "is_active": true, "is_delete": false,
  "fleet_city": "...", "fleet_state": "...", "fleet_country": "..."
}
```

- **Response**: `{ "message": "Fleet updated successfully", "company": FleetManagers }`

### GET `/admin/fleet/getUsersByFleet/:id`

- **Auth**: `JwtBlacklistGuard`
- **Path**: fleet `id`
- **Query**: `page=1`, `limit=10`, `search`, `status`, `role`
- **Response**: `{ data: FleetManagerUsers[], total, page, limit, totalPages }`

### GET `/admin/fleet/getDocsByFleet/:id`

- **Auth**: `JwtBlacklistGuard`
- **Path**: fleet `id`
- **Query**: `page=1`, `limit=10`, `search`
- **Response**: `{ data: FleetManagersDocuments[], total, page, limit, totalPages }`

### GET `/admin/fleet/getVehiclesByFleet/:id`

- **Auth**: `JwtBlacklistGuard`
- **Path**: fleet `id`
- **Query**: `page`, `limit`, `make`, `status`, `isApprovedByAdmin`,
  `driverOption`, `search`, `sortOrder` (`ASC|DESC`)
- **Response** (paginated): list of `FleetManagerVehicles` with cover image
  & ratings join.

### GET `/admin/fleet/getAlldocuments/:FMId/:vehicleId`

- **Auth**: `JwtBlacklistGuard`
- **Path**: `FMId`, `vehicleId`
- **Query**: `page`, `limit`, `verificationStatus`, `search`,
  `sortOrder` (`ASC|DESC`)
- **Response**: paginated `{ data: FleetManagerVehicleDocuments[], total, page, limit, totalPages }`

### POST `/admin/fleet/apply` (public)

Submit a fleet registration application (no auth).

- **Body** (`SubmitApplicationDto`):

```json
{
  "business_name": "Acme",
  "owner_first_name": "Owner",
  "owner_last_name": "One",
  "email": "owner@acme.com",
  "contact": "0300-...",
  "city": "Karachi",
  "state": "Sindh",
  "country": "Pakistan",
  "address": "...",
  "fleet_type": "individual",   
  "cnic": "42101-1234567-1",
  "reg_number": "REG-001"
}
```

- **Response**:

```json
{ "application_id": 7, "message": "Application submitted successfully" }
```

(or `... resubmitted ...` if a previous PENDING/REJECTED app exists).

### POST `/admin/fleet/public/uploadDocuments/:applicationId`  (`multipart/form-data`)

Public endpoint used during fleet application to upload `cnic_front`,
`cnic_back`, and `shop_paper`. When all three are present the backend
calls the OCR microservice to extract & verify.

- **Path**: `applicationId`
- **Form fields**: `files`, `documentTypes` (must include the three doc
  types listed above for verification to run)
- **Response**: array of saved `FleetManagersDocuments` rows (same shape as
  `/admin/fleet/uploadDocuments/...`).

### GET `/admin/fleet/subscriptions`

- **Auth**: none
- **Response**: list of active subscription tiers:

```json
[{
  "id": 1, "name": "Starter", "monthlyPrice": 0,
  "description": "...", "maxUsers": 5, "maxVehicles": 10,
  "isPrioritySupport": false, "allowsAiVerification": false
}]
```

### GET `/admin/fleet/:id/status`

Public — application status lookup.

- **Path**: `id` (application id)
- **Response**: `{ id, businessName, status, rejectionReason, createdAt }`.

### PATCH `/admin/fleet/:id/subscription`

Public — applicant selects a subscription for their pending app.

- **Path**: `id` (application id)
- **Body**: `{ "subscription_id": 2 }`
- **Response**: `{ "message": "Subscription selected successfully" }`

### GET `/admin/fleet/applications`

- **Auth**: `JwtBlacklistGuard`
- **Query**: `page=1`, `limit=20`, `status`, `search`
- **Response**: `{ data: FleetRegistrationApplications[], meta: { total, page, limit, totalPages } }`

### GET `/admin/fleet/applications/:id`

- **Auth**: `JwtBlacklistGuard`
- **Path**: application `id`
- **Response**: `FleetRegistrationApplications` row with `reviewedBy` &
  `fleetManagersDocuments` relations.

---

## Admin / Notifications

Base path: `/admin/notifications` — `src/Admin/notification/notification.controller.ts`

### GET `/admin/notifications`

- **Auth**: `JwtBlacklistGuard`
- **Response**:

```json
{
  "notifications": [{
    "id": 1, "title": "...", "body": "...", "isRead": false,
    "createdAt": "2025-01-01T00:00:00Z", "notiType": "...",
    "redirectUrl": "/...",
    "sender": { "id": 1, "firstName": "...", "lastName": "...", "email": "...", "fleetManager": { "id": 1, "name": "..." } },
    "request":     { "id": 1, "requestType": "vehicle_approval", "requestStatus": "pending", "vehicle": { "id": 1, "make": "...", "model": "...", "year": 2020 } },
    "application": { "id": 1, "businessName": "...", "status": "pending", "email": "...", "contact": "..." }
  }],
  "unreadCount": 1
}
```

### GET `/admin/notifications/:id`

- **Auth**: `JwtBlacklistGuard`
- **Path**: notification `id`
- **Response**: a single `AdminNotifications` (with sender, request, application
  & docs relations). Marks the notification as read as a side-effect.

### PATCH `/admin/notifications/:id/read`

- **Auth**: `JwtBlacklistGuard`
- **Response**: `{ "message": "Marked as read" }` or `{ "message": "Already read" }`.

### PATCH `/admin/notifications/read-all`

- **Auth**: `JwtBlacklistGuard`
- **Response**: `{ "message": "All notifications marked as read" }`

### POST `/admin/notifications/applications/:id/approve`

Approve a fleet registration application — creates a fleet, FM Admin user,
emails the welcome link.

- **Auth**: `JwtBlacklistGuard`
- **Path**: application `id`
- **Response**: `{ "message": "Application approved", "fleet_id": 5, "user_id": 9 }`

### POST `/admin/notifications/applications/:id/reject`

- **Auth**: `JwtBlacklistGuard`
- **Path**: application `id`
- **Body**: `{ "rejection_reason": "Documents incomplete" }` (required)
- **Response**: `{ "message": "Application rejected" }`

### PATCH `/admin/notifications/applications/:id/under-review`

- **Auth**: `JwtBlacklistGuard`
- **Response**: `{ "message": "Application marked as under review" }`

---

## Admin / Analytics

Base path: `/admin/analytics` — `src/Analytics/admin-analytics.controller.ts`

### GET `/admin/analytics/platform`

- **Auth**: `JwtBlacklistGuard`
- **Query**: `period` ∈ `7d | 30d | 90d` (defaults to `30d`)
- **Response** (`PlatformAnalyticsSummary`):

```json
{
  "period": "30d",
  "startDate": "2025-04-13",
  "endDate":   "2025-05-13",
  "revenue": {
    "totalRevenue": 0, "revenueChange": 0,
    "revenueByPeriod": [{ "date": "2025-05-01", "value": 0 }],
    "revenueByCity":   [{ "city": "Karachi", "revenue": 0 }]
  },
  "bookings": {
    "totalBookings": 0, "bookingChange": 0,
    "bookingsByPeriod": [{ "date": "2025-05-01", "value": 0 }],
    "bookingsByStatus": [{ "status": "completed", "count": 0, "percentage": 0 }]
  },
  "vehicles": {
    "totalVehicles": 0, "activeVehicles": 0,
    "topPerformingVehicles": [{
      "vehicleId": 1, "make": "Toyota", "model": "Corolla", "year": 2022,
      "vehicleType": "sedan", "totalBookings": 0, "totalRevenue": 0,
      "utilizationRate": 0
    }],
    "utilizationByType": [{ "vehicleType": "sedan", "count": 0, "avgUtilization": 0 }]
  },
  "totalFleets": 0,
  "activeFleets": 0,
  "newClientsInPeriod": 0,
  "topFleets": [{ "fleetId": 1, "fleetName": "...", "city": "...", "totalRevenue": 0, "totalBookings": 0 }],
  "generatedAt": "2025-05-13T01:00:00Z"
}
```

---

## Allocation

Base path: `/client/allocation` — `src/Allocation/allocation.controller.ts`

### POST `/client/allocation/recommend`

AI-style top-3 vehicle recommendation.

- **Auth**: none
- **Body** (`AllocationRequestDto`):

```json
{
  "city": "Karachi",
  "vehicleType": "sedan",
  "pickupDate": "2025-06-01",
  "returnDate": "2025-06-05",
  "budgetPerDay": 5000,
  "transmissionPreference": "automatic",
  "minSeats": 4
}
```

- **Response** (`AllocationResult`):

```json
{
  "recommendations": [{
    "vehicleId": 12,
    "totalScore": 87,
    "breakdown": { "locationScore": 100, "typeScore": 100, "priceScore": 80, "ratingScore": 92, "reliabilityScore": 70 },
    "reasoning": ["✓ Located in Karachi — exact city match", "..."],
    "vehicle": {
      "id": 12, "make": "Toyota", "model": "Corolla", "year": 2022,
      "vehicleType": "sedan", "color": "white", "seatingCapacity": 5,
      "transmissionType": "automatic", "fuelType": "petrol",
      "selfDriveBaseRate": 4500, "driverIncludedRate": 7000,
      "licensePlate": "ABC-123", "fleetName": "Acme",
      "fleetCity": "Karachi", "fleetCountry": "Pakistan",
      "averageRating": 4.6, "totalRatings": 12
    }
  }],
  "totalCandidates": 30,
  "requestSummary": { "requestedType": "sedan", "requestedCity": "Karachi", "budgetPerDay": 5000, "pickupDate": "2025-06-01", "returnDate": "2025-06-05", "totalDays": 4 },
  "agentExplanation": "Based on 4 day(s) in Karachi, ...",
  "scoredAt": "2025-05-13T01:00:00Z"
}
```

### GET `/client/allocation/stats`

- **Auth**: `JwtBlacklistGuard` (admin)
- **Response** (`AllocationStatsResult`):

```json
{
  "totalAvailable": 10,
  "byCity": [{ "city": "Karachi", "count": 5 }],
  "byType": [{ "type": "sedan", "count": 4 }],
  "lastUpdated": "2025-05-13T01:00:00Z"
}
```

---

## Chatbot

Base path: `/client/chatbot` — `src/Chatbot/chatbot.controller.ts`

### POST `/client/chatbot/message`

- **Auth**: `JwtGuard` (client)
- **Body** (`ChatMessageDto`):

```json
{
  "message": "Find me a sedan in Karachi tomorrow",
  "userEmail": "ignored — taken from JWT",
  "history": [
    { "role": "user", "content": "Hi" },
    { "role": "assistant", "content": "Hello!" }
  ],
  "lat": 24.86,
  "lng": 67.00
}
```

`role` ∈ `user | assistant | model`.

- **Response**:

```json
{ "reply": "Here are 3 great matches...", "timestamp": "2025-05-13T01:00:00Z" }
```

### GET `/client/chatbot/health`

- **Auth**: none
- **Response**: `{ "status": "ok", "service": "chatbot" }`

---

## Client / Auth

Base path: `/client/auth` — `src/Client/Auth/auth.controller.ts`

### POST `/client/auth/login`

- **Body** (`LoginDto`): `{ "email": "...", "password": "..." }`
- **Response**:

```json
{
  "message": "Login successful",
  "access_token": "<JWT 7d>",
  "refresh_token": "<JWT 30d>",
  "user": { /* Users row without password */ }
}
```

### POST `/client/auth/refresh-token`

- **Headers**: `Authorization: Bearer <refresh_token>`
- **Response**: `{ "access_token": "<JWT 7d>" }`

### POST `/client/auth/sign-up`

- **Body** (`SignUpDto`):

```json
{
  "first_name": "Ali",
  "last_name": "Khan",
  "email": "ali@example.com",
  "password": "Strong@1",
  "contact": "0300-..."
}
```

- **Response**: `{ "message": "User registered successfully", "user": { /* Users */ } }`

### POST `/client/auth/forgot-password`

- **Body**: `{ "email": "..." }`
- **Response**: `{ "message": "Reset link sent to email" }`

### PATCH `/client/auth/reset-password`

- **Body** (`ResetPasswordDto`): `{ "token": "...", "newPassword": "Strong@1" }`
- **Response**: `{ "message": "Password has been reset successfully" }`

### POST `/client/auth/logout`

- **Auth**: `ClientJwtBlacklistGuard`
- **Response**: `{ "message": "Logout successful" }`

---

## Client / Profile

Base path: `/client/profile` — `src/Client/User/user.controller.ts`

### PATCH `/client/profile`  (`multipart/form-data`)

Update profile and optionally upload a profile picture (`profile_pic` field).

- **Auth**: `ClientJwtBlacklistGuard`
- **Body** (`UpdateProfileDto`):

```json
{
  "firstName": "Ali",
  "lastName": "Khan",
  "contact": "0300-...",
  "isActive": true,
  "isDelete": false
}
```

- **Response**: `{ "message": "Profile updated successfully", "user": { /* Users */ } }`

### POST `/client/profile/mark-favorite/:vehicleId`

- **Auth**: `ClientJwtBlacklistGuard`
- **Path**: `vehicleId`
- **Response**: created favorite row / `{ message: "Already favorited" }`.

### DELETE `/client/profile/unmark-favorite/:vehicleId`

- **Auth**: `ClientJwtBlacklistGuard`
- **Response**: `{ "message": "Removed from favorites" }`

### GET `/client/profile/analytics`

- **Auth**: `ClientJwtBlacklistGuard`
- **Response**:

```json
{
  "totalBookings": 0,
  "totalSpend": 0,
  "completedTrips": 0,
  "cancelledTrips": 0,
  "averageBookingValue": 0,
  "favoriteVehicleType": "sedan",
  "spendByMonth": [{ "date": "2025-05", "value": 0 }],
  "bookingsByStatus": [{ "status": "completed", "count": 0 }]
}
```

### GET `/client/profile/favorite-vehicles`

- **Auth**: `ClientJwtBlacklistGuard`
- **Query**: `page`, `limit`, `search`, `sortOrder` (`DESC`)
- **Response** (paginated): `{ data: Vehicle[], total, page, limit, totalPages }`

---

## Client / Bookings

Base path: `/client/bookings` — `src/Client/Booking/booking.controller.ts`

### POST `/client/bookings/create`

- **Auth**: `ClientJwtBlacklistGuard`
- **Body** (`CreateBookingDto`):

```json
{
  "vehicleId": 12,
  "Name": "Ali Khan",
  "phone": "0300-...",
  "cnic": "42101-1234567-1",
  "pickupDate": "2025-06-01T08:00:00Z",
  "returnDate": "2025-06-05T08:00:00Z",
  "pickupLocation": "Karachi Airport",
  "returnLocation": "Karachi Airport",
  "serviceType": "self_drive",   
  "priceModel":  "per_day"        
}
```

- **Response**:

```json
{
  "message": "Booking request sent successfully to Fleet Manager for approval.",
  "booking": { /* Bookings row, status=pending, paymentStatus=pending */ }
}
```

### GET `/client/bookings`

- **Auth**: `ClientJwtBlacklistGuard`
- **Response**:

```json
{ "bookings": [
  {
    "id": 1, "bookingCode": "BK-XXXXXX", "status": "...", "paymentStatus": "...",
    "pickupDate": "...", "returnDate": "...",
    "vehicle": {
      "id": 12, "make": "...", "model": "...", "year": 2022,
      "fleetManager": { "name": "Acme" },
      "documents": [{ "id": 1, "name": "image_coverimg", "url": "https://..." }],
      "avgRating": "4.50", "totalReviews": 12
    }
  }
] }
```

### POST `/client/bookings/pay`

- **Auth**: `ClientJwtBlacklistGuard`
- **Body** (`ProcessPaymentDto`):

```json
{ "bookingId": 1, "paymentMethod": "credit_card" }
```

`paymentMethod` ∈ `cash | credit_card`.

- **Response**:

```json
{
  "message": "Payment simulated successfully and booking confirmed.",
  "transaction": {
    "code": "TX-XXXXXXXX",
    "amount": "115.00",
    "method": "credit_card",
    "status": "successful",
    "date":   "2025-05-13T01:00:00Z",
    "platformFee": 15
  }
}
```

### GET `/client/bookings/slip/:bookingId`

- **Auth**: `ClientJwtBlacklistGuard`
- **Path**: `bookingId`
- **Response**:

```json
{
  "isSuccess": true,
  "bookingCode": "BK-XXXXXX",
  "rentalPeriod": "Sun May 11 2025 - Mon May 12 2025",
  "car": "Toyota Corolla",
  "clientName": "Ali Khan",
  "transactionDetail": {
    "transactionId": "TX-...",
    "processedat": "2025-05-13T01:00:00Z",
    "methodUsed": "credit_card",
    "transactionStatus": "successful",
    "extraCharges": 0,
    "baseAmount": "100.00",
    "platformFee": 15,
    "tax": 0,
    "finalTotalAmount": "115.00",
    "paymentNote": "Payment received successfully."
  }
}
```

When no transaction has been processed yet:

```json
{
  "isSuccess": false,
  "bookingCode": "BK-XXXXXX",
  "transactionDetail": {
    "transactionId": "N/A", "methodUsed": "Payment Pending",
    "initialBaseCharge": 0, "extraCharges": 0,
    "finalTotalAmount": null,
    "paymentNote": "Initial payment transaction record not found."
  }
}
```

---

## Client / Host

Base path: `/client` — `src/Client/Host/host.controller.ts`
All host endpoints require `ClientJwtBlacklistGuard`.

### GET `/client/host-status`

- **Response**:

```json
{
  "isHost": true,
  "fleet":  { "id": 1, "name": "Ali Khan (Host)", "type": "individual", "city": "Karachi", "country": "Pakistan", "email": "ali@example.com" },
  "fmUser": { "id": 5, "email": "ali@example.com", "firstName": "Ali", "lastName": "Khan", "roleName": "Admin" }
}
```

When the user is not a host: `{ "isHost": false, "fleet": null, "fmUser": null }`.

### POST `/client/become-host`

- **Body** (`BecomeHostDto`):

```json
{
  "contactNumber": "0300-...",
  "city": "Karachi",
  "country": "Pakistan",
  "address": "Block 5",
  "password": "<same as client account>"
}
```

- **Response**:

```json
{
  "message": "Host fleet created. Sign in to the Fleet Manager portal with the same email and password as your CarLo account.",
  "fleetId": 7,
  "fleetManagerUserId": 12,
  "email": "ali@example.com"
}
```

### POST `/client/host/add-vehicle`

- **Body** (`CreateVehicleDto`): see [Fleet Manager / Vehicles → POST](#post-fmvehicles).
- **Response**: `{ "message": "Vehicle added successfully", "vehicle": FleetManagerVehicles }`

### GET `/client/host/my-vehicles`

- **Response**: `FleetManagerVehicles[]` (host's own vehicles).

### POST `/client/host/vehicles/:vehicleId/upload-docs`  (`multipart/form-data`)

- **Path**: `vehicleId`
- **Form**: `files` + `documentTypes` (must be values from `VehicleDocumentType`).
- **Response**:

```json
{
  "message": "Documents uploaded successfully",
  "details": [{ "id": 1, "docType": "image_exterior_front", "status": "pending", "url": "https://..." }]
}
```

---

## Client / Notifications

Base path: `/client/notifications` — `src/Client/client-notifications/client-notifications.controller.ts`
All endpoints require `ClientJwtBlacklistGuard`.

### GET `/client/notifications`

- **Query**: `page=1`, `limit=20`
- **Response**:

```json
{
  "data": [{
    "id": 1, "title": "...", "body": "...", "notiType": "...",
    "redirectUrl": "/...", "isRead": false, "readAt": null,
    "createdAt": "2025-05-13T01:00:00Z"
  }],
  "meta": { "total": 1, "page": 1, "limit": 20, "totalPages": 1 }
}
```

### PATCH `/client/notifications/:id/read`

- **Path**: notification `id`
- **Response**: `{ "message": "Marked as read" }`

### PATCH `/client/notifications/read-all`

- **Response**: `{ "message": "All notifications marked as read" }`

### GET `/client/notifications/unread-count`

- **Response**: `{ "unreadCount": 0 }`

---

## Public Catalog

Base path: `/public` — `src/Client/Public/public.controller.ts`

### GET `/public/makes`

- **Auth**: none
- **Response**: `string[]` of distinct vehicle makes available in the catalog.

### GET `/public/models?make=Toyota`

- **Auth**: none
- **Query**: `make` (optional) — if present, filters models for that make.
- **Response**: `string[]` of model names.

### GET `/public/colors`

- **Auth**: none
- **Response**: `string[]` of distinct colors.

### GET `/public/vehicles/list`

- **Auth**: none
- **Query**: `page`, `limit`, `make`, `driverServiceOption`, `search`,
  `sortOrder` (`DESC`), `minPrice`, `maxPrice`, `vehicleType`, `color`,
  `seatingCapacity`, `fuelType`, `pricingModel`, `city`, `transmissionType`
- **Response** (paginated):

```json
{
  "data": [{
    "id": 1, "make": "...", "model": "...", "year": 2022,
    "selfDriveBaseRate": 4500, "effectiveRate": 4500,
    "hasDynamicPricing": false, "coverImageUrl": "https://...",
    "fleetManager": { "id": 1, "name": "...", "city": "...", "type": "individual" },
    "averageRating": 4.5, "reviewCount": 12
  }],
  "total": 100, "page": 1, "limit": 10, "totalPages": 10
}
```

### GET `/public/vehicles/details/:vehicleId`

- **Auth**: none
- **Response**: `FleetManagerVehicles` with documents, ratings, fleet
  manager and active dynamic-pricing joined.

### GET `/public/vehicles/reviews/:vehicleId`

- **Auth**: none
- **Response**: `VehicleRatings[]` for the vehicle.

### POST `/public/vehicles/reviews/:vehicleId`

- **Auth**: `ClientJwtBlacklistGuard`
- **Status**: `201 Created`
- **Path**: `vehicleId`
- **Body** (`CreateVehicleReviewDto`):

```json
{ "rating": 5, "review": "Great car!" }
```

`rating` ∈ `[1,5]`. `review` optional, max 500 chars.

- **Response**: created `VehicleRatings` row.

### GET `/public/fleets`

- **Auth**: none
- **Query**: `page=1`, `limit=10`, `search`, `city`, `type` (`individual|shop`)
- **Response**:

```json
{
  "data": [{ "id": 1, "name": "Acme", "type": "individual", "city": "...", "address": "...", "contact": "...", "createdAt": "...", "totalVehicles": 5 }],
  "meta": { "total": 1, "page": 1, "limit": 10, "totalPages": 1 }
}
```

### GET `/public/fleets/:fleetId`

- **Auth**: none
- **Response**: a fleet manager with all approved/available vehicles, each
  enriched with `effectiveRate`, `coverImageUrl`, `exteriorImages`,
  `averageRating`, `reviewCount`.

---

## Fleet Manager / Auth

Base path: `/fm/auth` — `src/FleetManager/Auth/auth.controller.ts`

### POST `/fm/auth/login`

- **Body** (`LoginDto`): `{ "email": "...", "password": "..." }`
- **Response**: `{ "message": "Login successful", "access_token": "<JWT>", "user": { /* FleetManagerUsers */ } }`

### POST `/fm/auth/forgot-password`

- **Body**: `{ "email": "..." }`
- **Response**: `{ "message": "Reset link sent to email" }`

### PATCH `/fm/auth/reset-password`

- **Body** (`ResetPasswordDto`): `{ "token": "...", "newPassword": "Strong@1" }`
- **Response**: `{ "message": "Password has been reset successfully" }`

### POST `/fm/auth/logout`

- **Auth**: `FMJwtBlacklistGuard`
- **Response**: `{ "message": "Logout successful" }`

---

## Fleet Manager / RBAC

Base path: `/fm/rbac` — `src/FleetManager/RBAC/rbac.controller.ts`

### POST `/fm/rbac/add-role`

- **Auth**: `FMJwtBlacklistGuard`
- **Body** (`AddFMRoleDto`): `{ "role_name": "Driver", "fleet_id": 1 }`
- **Response**: created `FleetManagerUsersRole`.

### GET `/fm/rbac/get-roles`

- **Auth**: `FMJwtBlacklistGuard`
- **Response**: roles for the caller's fleet (`req.user.fleet_id`).

### PATCH `/fm/rbac/edit-role/:id`

- **Auth**: `FMJwtBlacklistGuard`
- **Path**: role `id`
- **Body** (`AddFMRoleDto`): `{ "role_name": "...", "fleet_id": 1 }`
- **Response**: updated `FleetManagerUsersRole`.

### DELETE `/fm/rbac/delete-role/:id`

- **Auth**: `FMJwtBlacklistGuard`
- **Response**: `{ "message": "Role deleted successfully", "role": FleetManagerUsersRole }`

### POST `/fm/rbac/assign-permissions`

- **Auth**: `FMJwtBlacklistGuard`
- **Body** (`AssignPermissionDto` — FM variant):

```json
{ "role_id": 2, "module_id": 5, "is_enable": true, "fleet_id": 1 }
```

- **Response**: updated FM permission row.

### GET `/fm/rbac/sidebar/:roleId/:fleetId`

- **Auth**: none
- **Path**: `roleId`, `fleetId`
- **Response**: list of modules visible to that FM role.

### GET `/fm/rbac/permissions-matrix`

- **Auth**: `FMJwtBlacklistGuard`
- **Response**: roles × modules permission matrix.

---

## Fleet Manager / Users

Base path: `/fm/users` — `src/FleetManager/User/user.controller.ts`

### POST `/fm/users/add-internal-user`

- **Auth**: `FMJwtBlacklistGuard`
- **Body** (`AddInternalUserDto`): see Admin variant.
- **Response**: `{ "message": "Internal user created successfully", "user": FleetManagerUsers }`

### PATCH `/fm/users/edit-internal-user/:id`

- **Auth**: `FMJwtBlacklistGuard`
- **Path**: `id`
- **Body** (`FM_EditInternalUserDto`):

```json
{
  "FirstName": "...", "LastName": "...", "Contact": "...",
  "Role": "Driver", "isActive": true, "isdelete": false,
  "cnic": "42101-...", "dob": "1995-01-01"
}
```

- **Response**: `{ "message": "Internal user updated successfully", "user": FleetManagerUsers }`

### PATCH `/fm/users/edit-profile`

- **Auth**: `FMJwtBlacklistGuard` (`req.user.fleet_email`)
- **Body**: same as above.
- **Response**: `{ "message": "Profile updated successfully" }`

### GET `/fm/users/view-internal-user`

- **Auth**: `FMJwtBlacklistGuard`
- **Query**: `page=1`, `limit=10`, `role`, `status`, `search`
- **Response**: paginated `{ data: FleetManagerUsers[], total, page, limit, totalPages }`.

### PATCH `/fm/users/soft-delete-internal-user/:id`

- **Auth**: `FMJwtBlacklistGuard`
- **Body**: boolean (raw) or `{ "isdelete": true }` (depending on client).
- **Response**: updated `FleetManagerUsers`.

---

## Fleet Manager / Vehicles

Base path: `/fm/vehicles` — `src/FleetManager/Vehicle/vehicle.controller.ts`

### POST `/fm/vehicles`  <a id="post-fmvehicles"></a>

- **Auth**: `FMJwtBlacklistGuard`
- **Body** (`CreateVehicleDto`):

```json
{
  "vehicleType": "sedan",                  
  "make": "Toyota",
  "model": "Corolla",
  "year": 2022,
  "licensePlate": "ABC-123",
  "chassisNumber": "CHASSIS123",
  "color": "white",
  "seatingCapacity": 5,
  "transmissionType": "automatic",
  "fuelType": "petrol",                    
  "mileageKm": 25000,
  "driverServiceOption": "self_drive_only",
  "selfDriveBaseRate": 4500,
  "driverIncludedRate": 7000,
  "driverHoursIncluded": 10,
  "pricingModel": "per_day",               
  "lateReturnChargePerHour": 250,
  "fuelChargePerKmIfEmpty": 30,
  "latenightOfferFlatFee": 500,
  "isInsured": true,
  "vehicleStatus": "available"             
}
```

Enums:
- `vehicleType` ∈ `hatchback | sedan | suv | van | bus | coaster | sports_car | other`
- `fuelType` ∈ `petrol | diesel | electric | hybrid | cng`
- `driverServiceOption` ∈ `self_drive_only | driver_included | both`
- `pricingModel` ∈ `per_day | per_km`
- `vehicleStatus` ∈ `available | on_rent | maintenance | decommissioned`

- **Response**: `{ "message": "Vehicle added successfully", "vehicle": FleetManagerVehicles }`

### POST `/fm/vehicles/uploadDocuments/:vehicleId`  (`multipart/form-data`)

- **Auth**: `FMJwtBlacklistGuard`
- **Path**: `vehicleId`
- **Form fields**:
  - `files` — file blobs.
  - `documentTypes[]` — values from `VehicleDocumentType`
    (`image_coverimg`, `image_exterior_front|left|right|back`,
    `registration_paper`, `insurance_paper`, `fitness_certificate`,
    `other_document`).
- **Behaviour**: if all four exterior images and `registration_paper` are
  present, the AI verification microservice is called and the result is
  attached to each saved document (status becomes `ocr_passed` /
  `ocr_flagged`).
- **Response**: array of `[{ id, docType, status, url }]`.

### PATCH `/fm/vehicles/editVehicle/:vehicleId`

- **Auth**: `FMJwtBlacklistGuard`
- **Path**: `vehicleId`
- **Body** (`EditVehicleDto`): same fields as `CreateVehicleDto`, all
  optional, plus `isDeleted?: boolean`.
- **Response**: `{ "message": "Vehicle updated successfully", "updatedVehicle": FleetManagerVehicles }`

### GET `/fm/vehicles/getAllVehicles`

- **Auth**: `FMJwtBlacklistGuard`
- **Query**: `page`, `limit`, `make`, `status`, `isApprovedByAdmin`,
  `approvalStatus`, `driverOption`, `search`, `sortOrder` (`ASC|DESC`)
- **Response** (paginated): `FleetManagerVehicles[]` with cover image &
  ratings.

### GET `/fm/vehicles/getAlldocuments/:vehicleId`

- **Auth**: `FMJwtBlacklistGuard`
- **Path**: `vehicleId`
- **Query**: `page`, `limit`, `verificationStatus`, `search`, `sortOrder`
- **Response**: paginated `{ data: FleetManagerVehicleDocuments[], total, page, limit, totalPages }`.

---

## Fleet Manager / Vehicle Requests

Base path: `/vehicle-requests` — `src/FleetManager/Vehicle_Request/vehicle_request.controller.ts`

### POST `/vehicle-requests/approval`

Request admin approval to publish a vehicle.

- **Auth**: `FMJwtBlacklistGuard`
- **Body** (`CreateVehicleRequestDto`):

```json
{
  "vehicleId": 12,
  "requestType": "vehicle_approval",
  "message": "Please approve, all docs uploaded."
}
```

- **Response**: `{ "message": "Vehicle request created successfully!", "request_id": 99 }`

Sends a Firebase notification to all admins.

### POST `/vehicle-requests/removal`

Request admin approval to remove a vehicle.

- **Auth**: `FMJwtBlacklistGuard`
- **Body** (`CreateVehicleRequestDto`): `{ "vehicleId": 12, "requestType": "delete_vehicle", "message": "..." }`
- **Response**: `{ "message": "Vehicle request created successfully!", "request_id": 100 }`

### GET `/vehicle-requests`

- **Auth**: `FMJwtBlacklistGuard`
- **Query**: `status`, `type`, `search`, `from` (ISO), `to` (ISO),
  `page=1`, `limit=10`
- **Response**: `{ data: Requests[], total, page, limit, totalPages }`

---

## Fleet Manager / Bookings

Base path: `/fm/bookings` — `src/FleetManager/Booking/fm-booking.controller.ts`

### GET `/fm/bookings/stats/summary`

- **Auth**: `FMJwtBlacklistGuard`
- **Response**:

```json
{
  "total": 0, "active": 0, "completed": 0,
  "cancelled": 0, "pending": 0, "totalRevenue": 0
}
```

### GET `/fm/bookings`

- **Auth**: `FMJwtBlacklistGuard`
- **Query**: `status`, `page`, `limit`
- **Response**:

```json
{
  "data": [{
    "id": 1, "bookingCode": "BK-...", "status": "pending",
    "pickupDate": "...", "returnDate": "...", "totalDays": 4,
    "finalAmount": 0, "paymentStatus": "pending",
    "vehicle":  { "id": 12, "make": "Toyota", "model": "Corolla", "year": 2022, "licensePlate": "..." },
    "customer": { "id": 5,  "firstName": "Ali", "lastName": "Khan", "email": "ali@example.com" },
    "createdAt": "2025-05-13T01:00:00Z"
  }],
  "total": 1, "page": 1, "limit": 20, "totalPages": 1
}
```

### GET `/fm/bookings/:bookingId`

- **Auth**: `FMJwtBlacklistGuard`
- **Path**: `bookingId`
- **Response**:

```json
{
  "id": 1, "bookingCode": "BK-...", "status": "...", "paymentStatus": "...",
  "serviceType": "self_drive", "priceModel": "per_day",
  "pickupDate": "...", "returnDate": "...",
  "pickupLocation": "...", "returnLocation": "...", "totalDays": 4,
  "amounts": {
    "baseRatePerDayOrHour": 4500, "initialTotalCharge": 18000,
    "extraChargesApplied": 0, "finalAmountSettled": null,
    "displayTotal": 18000
  },
  "vehicle":  { "id": 12, "make": "...", "model": "...", "year": 2022, "licensePlate": "..." },
  "customer": { "id": 5, "firstName": "...", "lastName": "...", "email": "...", "contact": "..." },
  "transactions": [{ "id": 1, "transactionCode": "TX-...", "method": "credit_card", "status": "successful", "amount": 18015, "processedAt": "..." }],
  "createdAt": "..."
}
```

---

## Fleet Manager / Notifications

Base path: `/fm/notifications` — `src/FleetManager/fleet_notification/fleet_notification.controller.ts`
All endpoints require `FMJwtBlacklistGuard`.

### GET `/fm/notifications`

- **Response**: list of `FleetManagerNotifications` for `req.user.fm_user_id`.

### GET `/fm/notifications/:id`

- **Path**: notification `id`
- **Response**: single `FleetManagerNotifications` row (marks as read).

### PATCH `/fm/notifications/:id/read`

- **Response**: `{ "message": "Marked as read" }` / `{ "message": "Already read" }`.

### PATCH `/fm/notifications/read-all`

- **Response**: `{ "message": "All notifications marked as read" }`

---

## Fleet Manager / Analytics

Base path: `/fm/analytics` — `src/Analytics/fm-analytics.controller.ts`

### GET `/fm/analytics/fleet`

- **Auth**: `FMJwtBlacklistGuard`
- **Query**: `period` ∈ `7d | 30d | 90d` (defaults `30d`)
- **Response** (`FleetAnalyticsSummary`):

```json
{
  "period": "30d",
  "startDate": "2025-04-13",
  "endDate":   "2025-05-13",
  "fleetId": 1,
  "fleetName": "Acme",
  "fleetCity": "Karachi",
  "revenue":  { "totalRevenue": 0, "revenueChange": 0, "revenueByPeriod": [], "revenueByCity": [] },
  "bookings": { "totalBookings": 0, "bookingChange": 0, "bookingsByPeriod": [], "bookingsByStatus": [] },
  "vehicles": { "totalVehicles": 0, "activeVehicles": 0, "topPerformingVehicles": [], "utilizationByType": [] },
  "generatedAt": "2025-05-13T01:00:00Z"
}
```

---

## Dynamic Pricing

Base path: `/fm/pricing` — `src/DynamicPricing/dynamic-pricing.controller.ts`

### GET `/fm/pricing/fleet-summary`

- **Auth**: `FMJwtBlacklistGuard`
- **Response**:

```json
[{
  "vehicleId": 12, "make": "Toyota", "model": "Corolla",
  "baseRate": 4500, "adjustedRate": 4900,
  "multiplierPercent": 9, "dynamicPricingEnabled": true
}]
```

### GET `/fm/pricing/vehicle/:vehicleId`

- **Auth**: `FMJwtBlacklistGuard`
- **Path**: `vehicleId`
- **Response** (`CurrentPricePayload`):

```json
{
  "baseRate": 4500,
  "adjustedRate": 4900,
  "multiplierPercent": 9,
  "reasoning": ["Demand surge in Karachi"],
  "breakdown": { "demand": 1.05, "utilization": 1.0, "competition": 1.04, "weekend": 1.0, "holiday": 1.0, "seasonality": 1.0 },
  "isActive": true
}
```

When inactive: `{ baseRate, adjustedRate=baseRate, multiplierPercent: 0, reasoning: ["No dynamic pricing active — using base rate"], breakdown: null, isActive: false }`.

### GET `/fm/pricing/vehicle/:vehicleId/history`

- **Auth**: `FMJwtBlacklistGuard`
- **Response**: last 30 `VehicleDynamicPricing` rows for the vehicle (DESC).

### PATCH `/fm/pricing/vehicle/:vehicleId/config`

- **Auth**: `FMJwtBlacklistGuard`
- **Body** (`UpdatePricingConfigDto`):

```json
{ "maxAdjustmentPercent": 30, "dynamicPricingEnabled": true }
```

`maxAdjustmentPercent` ∈ `[0, 50]`.

- **Response**: `{ "success": true }`

### GET `/fm/pricing/admin/overview`

- **Auth**: `JwtBlacklistGuard` (admin)
- **Response**:

```json
{
  "totalVehiclesWithDynamicPricing": 0,
  "averageAdjustmentPercent": 0,
  "highestSurgeVehicle":   { "vehicleId": 12, "multiplierPercent": 25, "make": "Toyota", "model": "Corolla" },
  "lowestDiscountVehicle": { "vehicleId": 8,  "multiplierPercent": -10, "make": "Suzuki", "model": "Mehran" },
  "pricingByCity": [{ "city": "Karachi", "count": 3, "avgRate": 4800 }]
}
```

### POST `/fm/pricing/admin/run-cycle`

Manually trigger the pricing cron.

- **Auth**: `JwtBlacklistGuard`
- **Response**:

```json
{
  "message": "Pricing cycle completed",
  "processed": 0, "skipped": 0, "errors": 0,
  "details": [{ "vehicleId": 12, "message": "..." }]
}
```

---

## OCR / Document Verification

Base path: `/fm/ocr` — `src/OCR/ocr.controller.ts`

### GET `/fm/ocr/admin/pending-count`

- **Auth**: `JwtBlacklistGuard` (admin)
- **Response**: `{ "vehicleDocs": 0, "fleetDocs": 0, "total": 0 }`

### GET `/fm/ocr/admin/document-queue`

- **Auth**: `JwtBlacklistGuard`
- **Query**: `page=1`, `limit=40`
- **Response**:

```json
{
  "vehicleDocs": [{
    "source": "vehicle", "id": 1, "docType": "registration_paper",
    "documentUrl": "https://...", "verificationStatus": "ocr_flagged",
    "extractedData": "{...}", "verificationResult": "...",
    "createdAt": "...", "fleetId": 1, "fleetName": "Acme",
    "vehicleId": 12, "vehicleLabel": "Toyota Corolla"
  }],
  "fleetDocs":   [{
    "source": "fleet", "id": 2, "docType": "cnic_front",
    "documentUrl": "https://...", "verificationStatus": "in_review",
    "aiResultJson": "{...}", "rejectionReason": null,
    "createdAt": "...", "fleetId": 1, "fleetName": "Acme",
    "vehicleId": null, "vehicleLabel": null
  }],
  "totals": { "vehicleTotal": 1, "fleetTotal": 1, "combined": 2 }
}
```

### GET `/fm/ocr/admin/document-history`

Same shape as `/document-queue` but for `verified` / `rejected` documents.

### POST `/fm/ocr/process/:documentId`

- **Auth**: `FMJwtBlacklistGuard`
- **Path**: `documentId`
- **Body** (`VerifyDocumentDto`):

```json
{ "documentType": "cnic_front" }
```

`documentType` ∈ `cnic_front | cnic_back | driving_license_front | driving_license_back`.

- **Response**:

```json
{
  "documentId": 1,
  "documentType": "cnic_front",
  "rawText": "first 500 chars of OCR output...",
  "extractedFields": { "name": "...", "cnic": "42101-...", "dob": "..." },
  "validation": { "isValid": true, "confidence": "high", "errors": [], "warnings": [], "checks": [] },
  "apiConfidence": 0.97,
  "processingTimeMs": 850,
  "savedToDb": true
}
```

### POST `/fm/ocr/admin/process/:documentId`

Same as above but using admin JWT (no fleet ownership check).

### PATCH `/fm/ocr/admin/approve/:documentId`

- **Auth**: `JwtBlacklistGuard`
- **Path**: `documentId`
- **Body**: `{ "notes": "Optional notes" }`
- **Response**: `{ "success": true, "message": "Document approved", "scope": "vehicle" | "fleet" }`

### PATCH `/fm/ocr/admin/reject/:documentId`

- **Auth**: `JwtBlacklistGuard`
- **Path**: `documentId`
- **Body**: `{ "reason": "Blurred image" }`
- **Response**: `{ "success": true, "message": "Document rejected", "scope": "vehicle" | "fleet" }`

### POST `/fm/ocr/cross-validate`

Compare OCR results across CNIC + driving license documents already
processed for the calling fleet.

- **Auth**: `FMJwtBlacklistGuard`
- **Body** (`CrossValidateDto`): all optional document IDs

```json
{
  "cnicFrontDocId": 1,
  "cnicBackDocId":  2,
  "dlFrontDocId":   3,
  "dlBackDocId":    4
}
```

- **Response**: validator output + presence flags.

```json
{
  "passed": true,
  "summary": "All cross-checks passed",
  "checks":  [{ "field": "cnic", "expected": "42101-...", "actual": "42101-...", "match": true }],
  "hadData": { "cnicFront": true, "cnicBack": true, "dlFront": true, "dlBack": true }
}
```

If `req.user.fleet_id` is missing the controller short-circuits with
`{ "message": "Missing fleet context" }`.

### GET `/fm/ocr/health`

- **Auth**: none
- **Response**: `{ "ocrEnabled": true, "vision": "Google Cloud Vision via GOOGLE_APPLICATION_CREDENTIALS" }`

---

## Firebase / FCM

Base path: `/fcm` — `src/firebase/firebase.controller.ts`
Used by web/mobile clients to register their FCM device tokens.

### POST `/fcm/saveAdminToken`

- **Auth**: none
- **Body** (`SaveFcmTokenDto`):

```json
{ "user_id": 1, "token": "fcm-token-string", "platform": "web" }
```

`platform` ∈ `web | android | ios`.

- **Response**: persisted `AdminFcmTokens` row.

### POST `/fcm/saveFleetToken`

- **Auth**: none
- **Body**: same `SaveFcmTokenDto` (`user_id` = `fleet_user_id`).
- **Response**: persisted `FleetFcmTokens` row.

### POST `/fcm/saveClientToken`

- **Auth**: none
- **Body**: same `SaveFcmTokenDto` (`user_id` = `client_id`).
- **Response**: persisted `ClientFcmTokens` row.

---

## Flutter API (/flutter)

Base path: `/flutter` — `src/Flutter/flutter.controller.ts`. These routes are
Flutter-friendly wrappers over existing client/public/Fleet Manager services.
Protected routes use `ClientJwtBlacklistGuard`; public vehicle list/detail use an
optional client JWT to populate `isFavorited` when a Bearer token is present.

### Auth

#### POST `/flutter/auth/login`

- **Auth**: none
- **Body**: `{ "email": "user@example.com", "password": "Strong@1" }`
- **Response**:

```json
{
  "accessToken": "<JWT>",
  "refreshToken": "<JWT>",
  "user": {
    "id": 1,
    "firstName": "Ali",
    "lastName": "Khan",
    "email": "ali@example.com",
    "contact": "0300-...",
    "avatarUrl": null
  }
}
```

#### POST `/flutter/auth/sign-up`

- **Auth**: none
- **Body**: `{ "firstName": "Ali", "lastName": "Khan", "email": "ali@example.com", "password": "Strong@1", "contact": "0300-..." }`
- **Response**: same as `/flutter/auth/login`.

#### POST `/flutter/auth/refresh-token`

- **Auth**: none
- **Body**: `{ "refreshToken": "<refresh JWT>" }`
- **Response**: `{ "accessToken": "<JWT>", "refreshToken": "<same refresh JWT>" }`

#### POST `/flutter/auth/forgot-password`

- **Auth**: none
- **Body**: `{ "email": "user@example.com" }`
- **Response**: `{ "message": "Reset link sent to email" }`

#### PATCH `/flutter/auth/reset-password`

- **Auth**: none
- **Body**: `{ "token": "<reset token>", "newPassword": "Strong@1" }`
- **Response**: `{ "message": "Password has been reset successfully" }`

#### POST `/flutter/auth/logout`

- **Auth**: `ClientJwtBlacklistGuard`
- **Body**: none
- **Response**: `{ "message": "Logout successful" }`

### Vehicles and Catalog Helpers

#### GET `/flutter/vehicles`

- **Auth**: optional client Bearer JWT
- **Query**: `make`, `model`, `color`, `city`, `serviceType`, `vehicleType`, `minPrice`, `maxPrice`, `page`, `limit`
- **Response**: `{ "data": [{ "id": 1, "make": "...", "model": "...", "year": 2022, "color": "...", "pricePerDay": 4500, "city": "Karachi", "fleetId": 1, "thumbnailUrl": null, "averageRating": 4.5, "totalReviews": 12, "isFavorited": false }], "total": 1, "page": 1, "limit": 10 }`

#### GET `/flutter/vehicles/:vehicleId`

- **Auth**: optional client Bearer JWT
- **Response**: vehicle detail with fleet summary, `imageUrls`, ratings, favorite state, `features`, `serviceType`, and `vehicleType`.

#### GET `/flutter/vehicles/:vehicleId/reviews`

- **Auth**: none
- **Query**: `page`, `limit`
- **Response**: `{ "data": [{ "id": 1, "rating": 5, "comment": "Great car", "createdAt": "2025-05-13T01:00:00Z", "reviewer": { "firstName": "Ali", "avatarUrl": null } }], "total": 1, "averageRating": 5 }`

#### POST `/flutter/vehicles/:vehicleId/reviews`

- **Auth**: `ClientJwtBlacklistGuard`
- **Body**: `{ "rating": 5, "comment": "Great car" }`
- **Response**: `{ "id": 1, "rating": 5, "comment": "Great car", "createdAt": "2025-05-13T01:00:00Z" }`

#### Catalog helpers

- `GET /flutter/makes` → `{ "data": ["Toyota"] }`
- `GET /flutter/brands` → `{ "data": [{ "make": "Toyota", "logoUrl": null }] }` — Auth: none. Returns distinct makes with logo URLs (null until assets are configured).
- `GET /flutter/models?make=Toyota` → `{ "data": ["Corolla"] }`
- `GET /flutter/colors` → `{ "data": ["White"] }`
- `GET /flutter/fleets` → `{ "data": [{ "id": 1, "name": "Acme", "city": "Karachi", "logoUrl": null, "vehicleCount": 5 }] }`
- `GET /flutter/fleets/:fleetId` → same fleet shape plus `vehicles: []`.

### Profile

All profile routes require `ClientJwtBlacklistGuard`.

- `GET /flutter/profile` → profile object with `isHost`, `totalBookings`, and `totalSpent`.
- `PATCH /flutter/profile` (`multipart/form-data`) → fields `firstName`, `lastName`, `contact`, and optional file field `avatar`; response is the updated profile object.
- `POST /flutter/profile/favorites/:vehicleId` → `{ "message": "Vehicle marked as favorite successfully." }`
- `DELETE /flutter/profile/favorites/:vehicleId` → `{ "message": "Vehicle unmarked as favorite successfully." }`
- `GET /flutter/profile/favorites` → `{ "data": [/* same vehicle list item shape as GET /flutter/vehicles */] }`

### Bookings

All booking routes require `ClientJwtBlacklistGuard`.

#### POST `/flutter/bookings`

- **Body** (`CreateBookingDto`):

```json
{
  "vehicleId": 12,
  "Name": "Ali Khan",
  "phone": "0300-...",
  "cnic": "42101-1234567-1",
  "pickupDate": "2025-06-01T08:00:00Z",
  "returnDate": "2025-06-05T08:00:00Z",
  "pickupLocation": "Karachi Airport",
  "returnLocation": "Karachi Airport",
  "serviceType": "self_drive",
  "priceModel": "per_day"
}
```

`serviceType` is `self_drive | with_driver`; `priceModel` is `per_day | per_hr`.

- **Response**: `{ "id": 1, "status": "pending", "vehicle": { "id": 12, "make": "Toyota", "model": "Corolla", "thumbnailUrl": null }, "startDate": "2025-06-01T08:00:00Z", "endDate": "2025-06-05T08:00:00Z", "totalAmount": 18000, "createdAt": "2025-05-13T01:00:00Z" }`

#### Other booking routes

- `GET /flutter/bookings` → `{ "data": [/* booking shape above */] }`
- `POST /flutter/bookings/:bookingId/pay` with `{ "paymentMethod": "cash" }` → `{ "message": "...", "status": "simulated_cash" }`
- `GET /flutter/bookings/:bookingId/slip` → existing booking slip object from `BookingService.getBookingSlip`; `transactionDetail` includes both `processedAt` and legacy `processedat`.

### Notifications

All notification routes require `ClientJwtBlacklistGuard`.

- `GET /flutter/notifications` → `{ "data": [{ "id": 1, "title": "...", "body": "...", "isRead": false, "createdAt": "2025-05-13T01:00:00Z", "type": "system" }], "unreadCount": 1 }`
- `PATCH /flutter/notifications/:id/read` → `{ "message": "Marked as read" }`
- `PATCH /flutter/notifications/read-all` → `{ "message": "All notifications marked as read" }`

### Chatbot, Recommendations, FCM, and Host

All routes below require `ClientJwtBlacklistGuard`.

- `POST /flutter/chatbot/message` with `{ "message": "...", "history": [{ "role": "user", "content": "Hi" }], "lat": 24.86, "lng": 67.0 }` → `{ "reply": "...", "timestamp": "..." }`
- `POST /flutter/recommendations` with optional `lat`, `lng`, `vehicleType`, `serviceType` → `{ "data": [/* vehicle list items */] }`
- `POST /flutter/fcm/token` with `{ "token": "fcm-token" }` → `{ "message": "FCM token saved successfully" }`
- `GET /flutter/host/status` → `{ "isHost": true, "status": "active" }`
- `POST /flutter/host/apply` with `BecomeHostDto` → `{ "message": "..." }`
- `POST /flutter/host/vehicles` with `CreateVehicleDto` → `{ "id": 12, "message": "Vehicle added successfully" }`
- `GET /flutter/host/vehicles` → `{ "data": [/* vehicle list items */] }`
- `POST /flutter/host/vehicles/:vehicleId/documents` (`multipart/form-data`, fields `files` and `documentTypes`) → `{ "message": "Documents uploaded successfully" }`. OCR is automatically triggered server-side for non-image document types after upload. The client does not need to call any OCR endpoint separately.

---

## Appendix — DTO Quick Reference

| DTO | File |
| --- | ---- |
| `LoginDto` (Admin) | `src/Admin/Auth/dto/login.dto.ts` |
| `LoginDto` (FM) | `src/FleetManager/Auth/dto/login.dto.ts` |
| `ForgotPasswordDto` | `src/Admin/Auth/dto/forgot_password.dto.ts`, `src/FleetManager/Auth/dto/forgot_password.dto.ts` |
| `ResetPasswordDto` | `src/Admin/Auth/dto/reset_password.dto.ts`, `src/FleetManager/Auth/dto/reset_password.dto.ts` |
| `AddInternalUserDto` | `src/Admin/User/dto/add_internal_user.dto.ts` |
| `EditInternalUserDto` | `src/Admin/User/dto/edit_internal_user.dto.ts` |
| `FM_EditInternalUserDto` | `src/FleetManager/User/dto/edit.internal.user.dto.ts` |
| `DeleteInternalUserDto` | `src/Admin/User/dto/delete_internal_user.dto.ts` |
| `AddRoleDto` (Admin) | `src/Admin/RBAC/dto/add_adminRole.dto.ts` |
| `AddFMRoleDto` | `src/FleetManager/RBAC/dto/add_FMRole.dto.ts` |
| `AssignPermissionDto` (Admin) | `src/Admin/RBAC/dto/assign_permission.dto.ts` |
| `AssignPermissionDto` (FM) | `src/FleetManager/RBAC/dto/assign_permission.dto.ts` |
| `AddFleetDto` / `AddFleetUserDto` / `AddFleetWithUserDto` | `src/Admin/Fleet/dto/*` |
| `EditFleetDto` | `src/Admin/Fleet/dto/edit_fleet_.dto.ts` |
| `UploadDocumentsDto` | `src/Admin/Fleet/dto/upload_documents.dto.ts` |
| `ResolveVehicleRequestDto` | `src/Admin/Fleet/dto/resolve_vehicle_request.dto.ts` |
| `SubmitApplicationDto` | `src/Admin/Fleet/dto/submit-application.dto.ts` |
| `AllocationRequestDto` | `src/Allocation/dto/allocation_request.dto.ts` |
| `ChatMessageDto` | `src/Chatbot/dto/chat_message.dto.ts` |
| `SignUpDto` | `src/Client/Auth/dto/sign_up.dto.ts` |
| `CreateBookingDto` / `ProcessPaymentDto` | `src/Client/Booking/dto/*` |
| `BecomeHostDto` | `src/Client/Host/dto/become_host.dto.ts` |
| `CreateVehicleReviewDto` | `src/Client/Public/dto/create_vehicle_review.dto.ts` |
| `UpdateProfileDto` | `src/Client/User/dto/update_profile.dto.ts` |
| `UpdatePricingConfigDto` | `src/DynamicPricing/dto/update-pricing-config.dto.ts` |
| `SaveFcmTokenDto` | `src/firebase/dto/save-fcm-token.dto.ts` |
| `CreateVehicleDto` / `EditVehicleDto` / `UploadVehicleDocumentsDto` | `src/FleetManager/Vehicle/dto/*` |
| `CreateVehicleRequestDto` | `src/FleetManager/Vehicle_Request/dto/vehicle_request.dto.ts` |
| `VerifyDocumentDto` / `CrossValidateDto` | `src/OCR/dto/*` |
