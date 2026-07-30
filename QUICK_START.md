# 🚀 QUICK START GUIDE - WAGESSE

## Installation & Setup

### 1️⃣ Install Dependencies
```bash
npm install
```

### 2️⃣ Setup Environment
```bash
cp .env.example .env.local
```

Edit `.env.local` with your values:
```env
# Database
DATABASE_URL=postgresql://user:password@localhost:5432/wagesse

# Auth
JWT_SECRET=your-super-secret-jwt-key
JWT_EXPIRATION=7d

# Payments
PAYMENT_PROVIDER=orange_money_sandbox
ORANGE_MONEY_API_KEY=sandbox
ORANGE_MONEY_MERCHANT_ID=demo

# Email (optional)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@gmail.com
SMTP_PASSWORD=your-app-password

# SMS (optional)
TWILIO_ACCOUNT_SID=your-sid
TWILIO_AUTH_TOKEN=your-token
TWILIO_PHONE_NUMBER=+1234567890
```

### 3️⃣ Setup Database

#### Option A: Docker (Recommended)
```bash
docker-compose up -d
```

This starts:
- PostgreSQL on `localhost:5432`
- Redis on `localhost:6379`
- Next.js app on `localhost:3000`
- Adminer on `localhost:8080`

#### Option B: Local PostgreSQL
```bash
# Install PostgreSQL locally, then:
npx prisma migrate dev
```

### 4️⃣ Seed Demo Data
```bash
npx prisma db seed
```

### 5️⃣ Start Development Server
```bash
npm run dev
```

Visit `http://localhost:3000`

---

## 📂 Project Structure Quick Reference

```
app/              → Next.js pages & API routes
├── page.tsx      → Landing page
├── auth/         → Login/signup pages
├── api/          → Backend endpoints
└── dashboard/    → User dashboards

lib/              → Business logic & utilities
├── config.ts     → Configuration
├── types.ts      → TypeScript types
├── auth.ts       → Auth functions
├── services/     → Business logic
└── hooks/        → React hooks

components/       → React components
prisma/           → Database schema
styles/           → CSS (Tailwind)
```

---

## 🔧 Development Commands

```bash
# Start dev server
npm run dev

# Build for production
npm run build

# Run production version
npm start

# Prisma studio (visual DB explorer)
npx prisma studio

# Generate Prisma client
npx prisma generate

# Database migrations
npx prisma migrate dev --name "description"
npx prisma migrate deploy

# Format code
npm run format

# Lint code
npm run lint
```

---

## 🌍 Main Pages

### Public Pages
- **Landing**: `http://localhost:3000/`
- **Signup**: `http://localhost:3000/auth/signup?role=client` or `?role=trucker`

### Protected Pages (Login Required)
- **Client Dashboard**: `http://localhost:3000/dashboard/client`
- **Trucker Dashboard**: `http://localhost:3000/dashboard/trucker`

### Admin Pages
- **Admin Dashboard**: `http://localhost:3000/admin/dashboard`

---

## 🧪 Testing Authentication

### Demo Credentials (After Seeding)

**Client Demo**
- Email: `client@demo.com`
- Password: `Demo@12345`
- Role: Client

**Trucker Demo**
- Email: `trucker@demo.com`
- Password: `Demo@12345`
- Role: Trucker

**Admin Demo**
- Email: `admin@demo.com`
- Password: `Demo@12345`
- Role: Admin

### Manual Signup
1. Go to `http://localhost:3000/auth/signup`
2. Select role (Client or Trucker)
3. Fill form (use `+226 XX XX XX XX` for phone)
4. Submit
5. Check console/logs for OTP
6. Verify with OTP

---

## 💳 Testing Payments

### Orange Money Sandbox

All payments in sandbox mode return mock transactions with format:
```
OM_<timestamp>_<random>
```

Example response:
```json
{
  "status": "success",
  "transactionId": "OM_1699876543_abc123",
  "amount": 50000,
  "currency": "XOF",
  "message": "Paiement simulé avec succès"
}
```

### Real Payment Testing

1. Replace `PAYMENT_PROVIDER` in `.env.local` with `stripe`
2. Add Stripe API keys
3. Update `PaymentProviderFactory` in `lib/payment-provider.ts`

---

## 🗂️ Database Model Quick Reference

### Core Models
- **User** - All platform users
- **CustomerProfile** - Client-specific data
- **TruckerProfile** - Trucker-specific data
- **Vehicle** - Truck information
- **TransportRequest** - Client's transport needs
- **Quote** - Trucker's price offer
- **Mission** - Accepted and ongoing transport
- **Payment** - Payment records
- **Rating** - User ratings/reviews
- **Dispute** - Conflicts between parties

### Run Queries

```bash
# View database with Adminer
http://localhost:8080
# Server: postgres (from docker-compose)
# User: postgres
# Password: (default)
# Database: wagesse

# Or use Prisma Studio
npx prisma studio
```

---

## 🔐 Key Security Features

✅ **Implemented**
- JWT authentication
- OTP verification
- Password hashing (bcrypt)
- TypeScript strict mode
- Input validation (Zod)
- Database prepared statements (Prisma)

🚨 **Add Before Production**
- Rate limiting
- HTTPS/SSL
- CORS configuration
- Email verification
- 2FA optional
- Security headers
- API versioning

---

## 📊 Configuration Guide

All config in `lib/config.ts`:

```typescript
BRAND_CONFIG        // App name, colors, social media
PRICING_CONFIG      // Contact unlock fees
SUBSCRIPTION_TIERS  // Discovery/Professional/Fleet tiers
MATERIAL_TYPES      // 8 materials (sable, ciment, etc.)
TRUCK_TYPES         // 6 truck types by capacity
BF_CITIES           // 8 Burkina Faso cities
QUANTITY_UNITS      // Kg, tonne, m³, etc.
PAYMENT_METHODS     // Orange Money, Stripe, etc.
STATUS_LABELS       // Colors for different statuses
```

### Customize Colors

Edit `lib/config.ts`:
```typescript
export const BRAND_CONFIG = {
  name: 'WAGESSE',
  primary: '#E8714D',      // terracotta
  secondary: '#8B6F47',    // earth
  // ... change colors here
};
```

Then update `styles/globals.css`:
```css
:root {
  --primary: var(--color-terracotta);
  --secondary: var(--color-earth);
  /* ... update CSS variables */
}
```

---

## 🚀 Deployment Checklist

- [ ] Update `.env` with production values
- [ ] Update database to PostgreSQL (production)
- [ ] Update Redis to production instance
- [ ] Setup email provider (Gmail, SendGrid, etc.)
- [ ] Setup SMS provider (Twilio)
- [ ] Setup payment provider (Orange Money API, Stripe)
- [ ] Build: `npm run build`
- [ ] Test build: `npm start`
- [ ] Deploy to hosting (Vercel, AWS, DigitalOcean, etc.)
- [ ] Setup CI/CD (GitHub Actions)
- [ ] Monitor with error tracking (Sentry)
- [ ] Setup SSL certificates
- [ ] Configure CORS
- [ ] Setup backups
- [ ] Monitor performance

---

## 📞 Getting Help

### Common Issues

**Issue**: Port 3000 already in use
```bash
# Kill the process using port 3000 (Windows)
netstat -ano | findstr :3000
taskkill /PID <PID> /F

# Or use different port
npm run dev -- -p 3001
```

**Issue**: Docker PostgreSQL connection fails
```bash
# Check if containers are running
docker ps

# Check logs
docker logs <container_id>

# Restart containers
docker-compose restart
```

**Issue**: Prisma schema conflicts
```bash
# Reset database (development only!)
npx prisma migrate reset

# Then reseed
npx prisma db seed
```

### Resources

- Next.js Docs: https://nextjs.org/docs
- Prisma Docs: https://www.prisma.io/docs
- Tailwind CSS: https://tailwindcss.com/docs
- Framer Motion: https://www.framer.com/motion
- TypeScript: https://www.typescriptlang.org/docs

---

## 📝 Development Tips

1. **Use Prisma Studio** to explore data: `npx prisma studio`
2. **Use Adminer** for SQL queries: `http://localhost:8080`
3. **Check types**: Run `npx tsc --noEmit` for type checking
4. **Format code**: `npm run format` keeps consistency
5. **Use React DevTools** for component debugging
6. **Use Network tab** in DevTools to inspect API calls
7. **Check console** for OTP codes during signup

---

## 🎯 Next Steps

1. ✅ You have the foundation - Next.js, DB schema, auth, UI
2. 🔄 **NOW**: Implement API endpoints (requests, quotes, missions)
3. 🧮 **THEN**: Build matching algorithm
4. 💳 **THEN**: Implement payment webhooks
5. 📢 **THEN**: Add notifications
6. 🛠️ **THEN**: Build admin panel

---

## 📈 Performance Tips

- Images: Use Next.js `<Image>` component
- Code splitting: Pages loaded lazily by default
- Database: Indexes on frequently queried fields
- Caching: Use Redis for sessions, frequently accessed data
- API: Compress responses with gzip

---

**Version**: 1.0
**Last Updated**: $(date)
**Status**: Ready for development
