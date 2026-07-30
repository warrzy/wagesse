# 🚀 DATABASE INTEGRATION SETUP GUIDE

## ✅ Phase 1.2 Complete: Database Integration

This guide walks you through setting up and using the newly implemented Request & Quote system.

---

## 📋 What's Been Implemented

### 1. **Request Management System**
- ✅ `lib/services/request-service.ts` - Full service with CRUD operations
- ✅ `app/api/requests/route.ts` - GET all (with pagination), POST create
- ✅ `app/api/requests/[id]/route.ts` - GET one, PUT update, DELETE soft delete
- ✅ `app/api/requests/[id]/publish/route.ts` - Publish request (DRAFT → PUBLISHED)

**Supported Operations**:
- Create transport requests with materials
- List requests with pagination
- Get single request details
- Update draft requests
- Publish requests for matching
- Soft delete requests
- Search with filters (city, distance, material type)

### 2. **Quote Management System**
- ✅ `lib/services/quote-service.ts` - Full service for quotes
- ✅ `app/api/quotes/route.ts` - GET quotes, POST create quote
- ✅ `app/api/quotes/[id]/accept/route.ts` - Accept quote (creates mission)

**Supported Operations**:
- Create quotes on published requests
- List quotes by request or trucker
- Accept quotes (automatically creates mission)
- Reject quotes
- Withdraw quotes
- Update quote prices

### 3. **Prisma Integration**
- ✅ `lib/prisma.ts` - Prisma client singleton
- ✅ All 45+ database models ready
- ✅ Relationships fully configured

---

## 🔧 Setup Instructions

### Step 1: Initialize Prisma

```bash
cd c:\Users\LENOVO-L490\Desktop\wagesse

# Generate Prisma Client
npx prisma generate

# Create/migrate database
npx prisma migrate dev --name init
```

This will:
- Create/update the PostgreSQL database
- Run all migrations
- Generate Prisma Client types

### Step 2: Seed Demo Data

```bash
npx prisma db seed
```

This populates the database with demo customers, truckers, and sample data.

### Step 3: Start Development Server

**Option A: Using Windows Command Prompt** (Recommended - avoids PowerShell execution policy)

```cmd
cd c:\Users\LENOVO-L490\Desktop\wagesse
npm run dev
```

**Option B: Using PowerShell** (Requires execution policy bypass)

```powershell
Set-ExecutionPolicy -ExecutionPolicy Bypass -Scope ProcessUser
npm run dev
```

Or use:
```bash
cmd /c "npm run dev"
```

### Step 4: Verify Setup

Visit in browser:
- Landing page: `http://localhost:3000`
- Prisma Studio: `npx prisma studio` (opens on `http://localhost:5555`)

---

## 🧪 Testing the API

### Prerequisites

You need:
- **Postman**, **Insomnia**, **curl**, or **Thunder Client** (VS Code extension)
- A valid JWT token from signup/login

### 1. Get an Authentication Token

**Signup (POST)**:
```
POST http://localhost:3000/api/auth/signup
Content-Type: application/json

{
  "firstName": "John",
  "lastName": "Doe",
  "phone": "+22612345678",
  "password": "SecurePass123!",
  "confirmPassword": "SecurePass123!",
  "role": "CLIENT"
}
```

**Response:**
```json
{
  "token": "eyJhbGciOiJIUzI1NiIs...",
  "user": { "id": "user_123", "email": "john@example.com", ... }
}
```

**Save the token** - you'll use it for all other requests!

### 2. Create a Transport Request

**Create Request (POST)**:
```
POST http://localhost:3000/api/requests
Authorization: Bearer <YOUR_TOKEN>
Content-Type: application/json

{
  "pickupCity": "Ouagadougou",
  "dropoffCity": "Bobo-Dioulasso",
  "pickupLatitude": 12.3656,
  "pickupLongitude": -1.5197,
  "dropoffLatitude": 12.1628,
  "dropoffLongitude": -4.1913,
  "pickupDate": "2026-07-20T10:00:00Z",
  "estimatedDistance": 380,
  "description": "Urgent cement delivery",
  "totalWeight": 50000,
  "totalVolume": 25,
  "materials": [
    {
      "materialType": "CIMENT",
      "quantity": 2000,
      "unit": "kg",
      "estimatedPrice": 1000000
    }
  ]
}
```

**Response:**
```json
{
  "id": "req_abc123",
  "customerId": "user_123",
  "status": "DRAFT",
  "pickupCity": "Ouagadougou",
  "materials": [...]
}
```

### 3. List Your Requests

**Get Requests (GET)**:
```
GET http://localhost:3000/api/requests?skip=0&take=10&status=DRAFT
Authorization: Bearer <YOUR_TOKEN>
```

**Response:**
```json
{
  "requests": [...],
  "total": 5,
  "page": 1,
  "pages": 1
}
```

### 4. Publish a Request

**Publish (POST)**:
```
POST http://localhost:3000/api/requests/req_abc123/publish
Authorization: Bearer <YOUR_TOKEN>
```

**Response:**
```json
{
  "id": "req_abc123",
  "status": "PUBLISHED",
  "publishedAt": "2026-07-15T12:30:00Z"
}
```

### 5. Create a Quote (as Trucker)

First, signup as a Trucker, then:

**Create Quote (POST)**:
```
POST http://localhost:3000/api/quotes
Authorization: Bearer <TRUCKER_TOKEN>
Content-Type: application/json

{
  "requestId": "req_abc123",
  "totalPrice": 250000,
  "estimatedDays": 2,
  "description": "We can deliver in 2 days with full insurance"
}
```

**Response:**
```json
{
  "id": "quote_xyz789",
  "requestId": "req_abc123",
  "truckerId": "trucker_user_id",
  "totalPrice": 250000,
  "status": "PENDING"
}
```

### 6. View Quotes (as Client)

**Get Quotes for Request (GET)**:
```
GET http://localhost:3000/api/quotes?requestId=req_abc123
Authorization: Bearer <CLIENT_TOKEN>
```

**Response:**
```json
[
  {
    "id": "quote_xyz789",
    "totalPrice": 250000,
    "trucker": { "name": "Ali Transport", "rating": 4.8 },
    "status": "PENDING"
  }
]
```

### 7. Accept a Quote (Creates Mission)

**Accept Quote (POST)**:
```
POST http://localhost:3000/api/quotes/quote_xyz789/accept
Authorization: Bearer <CLIENT_TOKEN>
```

**Response:**
```json
{
  "id": "mission_abc123",
  "requestId": "req_abc123",
  "quoteId": "quote_xyz789",
  "truckerId": "trucker_user_id",
  "totalPrice": 250000,
  "status": "ACCEPTED",
  "startDate": "2026-07-15T...",
  "estimatedEndDate": "2026-07-17T..."
}
```

---

## 📊 API Endpoints Summary

### Requests Endpoints

| Method | Endpoint | Purpose | Auth |
|--------|----------|---------|------|
| GET | `/api/requests` | List user's requests | ✅ |
| POST | `/api/requests` | Create new request | ✅ |
| GET | `/api/requests/[id]` | Get single request | ✅ |
| PUT | `/api/requests/[id]` | Update draft request | ✅ |
| DELETE | `/api/requests/[id]` | Soft delete request | ✅ |
| POST | `/api/requests/[id]/publish` | Publish request | ✅ |

### Quotes Endpoints

| Method | Endpoint | Purpose | Auth |
|--------|----------|---------|------|
| GET | `/api/quotes` | List quotes (by requestId or truckerId) | ✅ |
| POST | `/api/quotes` | Create quote | ✅ |
| POST | `/api/quotes/[id]/accept` | Accept quote (client) | ✅ |
| POST | `/api/quotes/[id]/reject` | Reject quote (client) | ✅ |
| POST | `/api/quotes/[id]/withdraw` | Withdraw quote (trucker) | ✅ |
| PUT | `/api/quotes/[id]` | Update quote price | ✅ |

---

## 🔒 Authentication & Token

All endpoints require a JWT token in the Authorization header:

```
Authorization: Bearer <TOKEN>
```

**Token Format**:
```
eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOiJ1c2VyXzEyMyIsImVtYWlsIjo...
```

**Token Expiration**: 7 days

**Stored in**: `localStorage` as `auth_token`

---

## 🐛 Troubleshooting

### Issue: "Prisma Client not initialized"

**Solution**:
```bash
npx prisma generate
npx prisma migrate dev
```

### Issue: "Database connection failed"

**Check**: 
1. Is PostgreSQL running? `docker-compose ps`
2. Is database URL correct in `.env.local`?
3. Run: `docker-compose up -d`

### Issue: "Unauthorized" on API calls

**Check**:
1. Are you passing the token in the Authorization header?
2. Is the token valid and not expired?
3. Use: `Authorization: Bearer <TOKEN>`

### Issue: "Cannot find module @prisma/client"

**Solution**:
```bash
npm install
npx prisma generate
```

---

## 📈 Next Steps

After verifying the Request & Quote system works:

1. **Implement Matching Algorithm** (Next Priority)
   - Create `/api/matches` endpoint
   - Scoring system for truckers
   - Return top 3-4 matches

2. **Implement Missions** 
   - `/api/missions` endpoints
   - Mission status tracking
   - Delivery proof system

3. **Payment Integration**
   - Verify payment endpoint
   - Webhook handlers
   - Ledger entry creation

---

## 💡 Tips & Tricks

### View Database Visually

```bash
npx prisma studio
```

Opens Prisma Studio at `http://localhost:5555` - see all data visually.

### Reset Database (Development Only!)

```bash
npx prisma migrate reset
```

This will:
- Delete all data
- Re-run migrations
- Re-seed demo data

### View API Logs

Look at terminal running `npm run dev` to see all API requests and errors.

### Test with Docker

```bash
docker-compose up -d              # Start all services
npm run dev                        # Start Next.js
npx prisma studio                 # View database
```

---

## 📝 Development Workflow

```
1. Make code changes
2. Save file (npm run dev auto-reloads)
3. Test with Postman/curl
4. Check logs in terminal
5. View data with Prisma Studio
6. Iterate
```

---

## 🎯 Success Criteria

You'll know everything is working when:

- ✅ `npm run dev` starts without errors
- ✅ You can create a request via API
- ✅ You can view requests in Prisma Studio
- ✅ You can create a quote
- ✅ Accepting a quote creates a mission
- ✅ All API responses have correct status codes
- ✅ Token-based auth is enforced

---

## 📞 Common Endpoints Quick Reference

### Create Request
```bash
curl -X POST http://localhost:3000/api/requests \
  -H "Authorization: Bearer TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"pickupCity":"Ouagadougou",...}'
```

### List Requests
```bash
curl http://localhost:3000/api/requests \
  -H "Authorization: Bearer TOKEN"
```

### Publish Request
```bash
curl -X POST http://localhost:3000/api/requests/REQUEST_ID/publish \
  -H "Authorization: Bearer TOKEN"
```

### Create Quote
```bash
curl -X POST http://localhost:3000/api/quotes \
  -H "Authorization: Bearer TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"requestId":"req_123","totalPrice":250000,...}'
```

### Accept Quote
```bash
curl -X POST http://localhost:3000/api/quotes/QUOTE_ID/accept \
  -H "Authorization: Bearer TOKEN"
```

---

**Phase 1.2 Status**: ✅ Complete - Database Integration Ready
**Next Phase**: Matching Algorithm (Critical Path)
