# 🏗️ ARCHITECTURE & TECHNICAL DECISIONS

## Overall Architecture Pattern

```
Clean Architecture + MVC Pattern + Layered Architecture

┌─────────────────────────────────────────────────────────┐
│                  PRESENTATION LAYER                      │
│  React Components (Landing, Dashboards, Forms)           │
│  Framer Motion Animations                                │
│  Tailwind CSS Styling                                    │
└────────────────────────────┬────────────────────────────┘
                             │
┌────────────────────────────▼────────────────────────────┐
│                    API CLIENT LAYER                     │
│  lib/api-client.ts (Abstraction)                        │
│  Handles HTTP communication                             │
│  Token management, error handling                       │
└────────────────────────────┬────────────────────────────┘
                             │
┌────────────────────────────▼────────────────────────────┐
│                  NEXT.JS API ROUTES                     │
│  app/api/*/route.ts (REST endpoints)                    │
│  Request validation, error handling                     │
└────────────────────────────┬────────────────────────────┘
                             │
┌────────────────────────────▼────────────────────────────┐
│                    SERVICE LAYER                        │
│  lib/services/*.ts (Business Logic)                     │
│  Database queries, calculations, validation             │
└────────────────────────────┬────────────────────────────┘
                             │
┌────────────────────────────▼────────────────────────────┐
│                  PERSISTENCE LAYER                      │
│  Prisma ORM                                              │
│  PostgreSQL Database                                     │
└─────────────────────────────────────────────────────────┘
```

---

## 🔑 Key Architecture Decisions

### 1. **API Client Abstraction** (`lib/api-client.ts`)

**Decision**: Single centralized API client instead of scattered fetch calls

**Benefits**:
- ✅ Consistent error handling
- ✅ Centralized authentication token management
- ✅ Easy to mock for testing
- ✅ Simple to switch base URL (dev/staging/prod)
- ✅ Type-safe with TypeScript

**Pattern**:
```typescript
// Instead of scattered fetch calls...
// ❌ DON'T: fetch('/api/requests', {...})

// ✅ DO: Use abstraction
const response = await apiClient.createTransportRequest({...})
```

**When Adding New Endpoint**:
1. Add method to `apiClient`
2. Use in components via `apiClient.methodName()`
3. No scattered fetch calls

---

### 2. **Payment Provider Factory Pattern** (`lib/payment-provider.ts`)

**Decision**: Abstract payment provider interface with factory pattern

**Benefits**:
- ✅ Switch providers without changing code
- ✅ Multiple providers can coexist
- ✅ Easy to add new providers (Orange Money, Stripe, etc.)
- ✅ Sandbox mode for development

**Pattern**:
```typescript
// Factory creates correct provider based on config
const provider = PaymentProviderFactory.create(
  process.env.PAYMENT_PROVIDER  // 'orange_money_sandbox'
);

// Use same interface for all providers
const response = provider.charge(paymentRequest);
```

**Adding New Provider**:
1. Extend `PaymentProvider` abstract class
2. Implement `charge()`, `verify()`, `refund()`, etc.
3. Add to factory switch statement
4. Change `PAYMENT_PROVIDER` env variable
5. Done! No other code changes needed

---

### 3. **Centralized Configuration** (`lib/config.ts`)

**Decision**: All non-secret config in one file, no hardcoding

**Benefits**:
- ✅ Easy to customize (colors, pricing, cities, etc.)
- ✅ Single source of truth
- ✅ Can be moved to database later
- ✅ No code changes for common updates

**Pattern**:
```typescript
// Colors defined in one place
export const BRAND_CONFIG = {
  primary: '#E8714D',      // Change here, applies everywhere
  secondary: '#8B6F47',
  // ...
}

// Pricing
export const PRICING_CONFIG = {
  contactUnlock: {
    0_50: 500,   // 0-50km: 500 XOF
    50_100: 700,
    // ...
  }
}
```

**To Customize**:
- Edit `lib/config.ts`
- No code changes needed
- Values applied throughout app

---

### 4. **TypeScript Strict Mode**

**Decision**: Enable strict TypeScript checking

```json
{
  "compilerOptions": {
    "strict": true,
    "strictNullChecks": true,
    "strictFunctionTypes": true,
    "strictBindCallApply": true,
    "strictPropertyInitialization": true,
    "noImplicitAny": true,
    "noImplicitThis": true,
    "alwaysStrict": true,
    "noUnusedLocals": true,
    "noUnusedParameters": true,
    "noImplicitReturns": true,
    "noFallthroughCasesInSwitch": true
  }
}
```

**Benefits**:
- ✅ Catches errors at compile time, not runtime
- ✅ Better IDE autocomplete
- ✅ Self-documenting code
- ✅ Easier refactoring
- ✅ Production reliability

---

### 5. **Zod Schema Validation**

**Decision**: Validate inputs at schema level with Zod

**Benefits**:
- ✅ Type inference from schema (DRY principle)
- ✅ Both client and server validation
- ✅ Consistent error messages
- ✅ Extensible with custom validations

**Pattern**:
```typescript
// Define once, get both validation and types
export const signupSchema = z.object({
  firstName: z.string().min(2),
  phone: z.string().regex(/^(\+226)?[67]\d{7}$/),
  password: z.string().min(8),
  confirmPassword: z.string(),
}).refine(data => data.password === data.confirmPassword);

// Automatically typed as:
type SignupInput = z.infer<typeof signupSchema>;
```

**Usage**:
```typescript
// Frontend
const { errors } = await signupSchema.parseAsync(formData);

// Backend  
const validated = signupSchema.parse(req.body);
```

---

### 6. **Service Layer Pattern**

**Decision**: Business logic in services, not in API routes

**Text Structure**:
```
app/api/requests/route.ts (controller)
    ↓
    calls
    ↓
lib/services/request-service.ts (service)
    ↓
    uses
    ↓
prisma (ORM)
```

**Benefits**:
- ✅ Reusable business logic
- ✅ Easy to test
- ✅ Separation of concerns
- ✅ Can be used by multiple endpoints

**Pattern**:
```typescript
// app/api/requests/route.ts
export async function POST(req: Request) {
  const data = await req.json();
  const request = await requestService.create(data);
  return Response.json(request);
}

// lib/services/request-service.ts
export const requestService = {
  create: async (data: CreateRequestInput) => {
    // Validation here too
    // Business logic here
    return await prisma.transportRequest.create({...});
  }
}
```

---

### 7. **React Hooks Pattern for State**

**Decision**: Use custom hooks instead of Redux/Context

**Benefits**:
- ✅ Simpler than Redux for most use cases
- ✅ Built-in React features (no external dependency)
- ✅ Colocated state with components
- ✅ Smaller bundle size

**Pattern**:
```typescript
// lib/hooks/useAuth.ts
export function useAuth() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const login = async (email, password) => {
    // Login logic
  };

  return { user, loading, error, login, logout };
}

// Usage in component
function Dashboard() {
  const { user, loading } = useAuth();
  // ...
}
```

---

### 8. **Role-Based Access Control (RBAC)**

**Decision**: Implement role-based permissions in database

**Database Structure**:
```
User → Role (Client, Trucker, Operator, Admin)
     ↓
Role → Permissions (create, read, update, delete)
```

**Benefits**:
- ✅ Flexible permission system
- ✅ Easy to add roles
- ✅ Audit trail possible
- ✅ Follows principle of least privilege

**Usage**:
```typescript
// Check user role
if (user.role !== 'CLIENT') {
  return Response.json({ error: 'Forbidden' }, { status: 403 });
}

// Or check permission
const hasPermission = await checkPermission(user.id, 'create_request');
```

---

### 9. **Mobile-First Responsive Design**

**Decision**: Tailwind CSS with mobile-first breakpoints

**Breakpoints**:
```css
/* Mobile (320px) - default */
.component { ... }

/* Tablet (768px+) */
@media (min-width: 768px) {
  .component { ... }
}

/* Desktop (1024px+) */
@media (min-width: 1024px) {
  .component { ... }
}
```

**Pattern in Tailwind**:
```jsx
<div className="
  w-full p-4           /* Mobile */
  md:w-1/2 md:p-6      /* Tablet */
  lg:w-1/3 lg:p-8      /* Desktop */
">
```

**Benefits**:
- ✅ Works on all devices
- ✅ Better performance on mobile
- ✅ Touch-friendly by default
- ✅ Scales beautifully

---

### 10. **Framer Motion for Animations**

**Decision**: Framer Motion for library animations, not hand-held CSS

**Benefits**:
- ✅ Smooth, performant animations
- ✅ Gesture support (swipe, drag, hover)
- ✅ Orchestrate animations with variants
- ✅ Easy stagger and timing

**Pattern**:
```typescript
// Reusable animation variants
const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.1 }
  }
};

// Use in component
<motion.div
  variants={containerVariants}
  initial="hidden"
  animate="visible">
  {/* Children animate with stagger */}
</motion.div>
```

---

## 📊 Database Architecture

### Schema Design Principles

1. **Normalization**: Minimize data duplication
2. **Relationships**: Clear one-to-many, many-to-many
3. **Indexes**: On frequently queried fields
4. **Constraints**: Enforce data integrity
5. **Soft Deletes**: Keep audit trail via `deletedAt`
6. **Timestamps**: Track creation/modification

### Example Model Relationships

```
User (1) ──┬──→ (Many) CustomerProfile
           ├──→ (Many) TruckerProfile  
           ├──→ (Many) Role (optional)
           └──→ (Many) AuditLog

TransportRequest (1) ──→ (Many) Quote
TransportRequest (1) ──→ (Many) Match

Quote (1) ──→ (Many) Mission (when accepted)

TruckerProfile (1) ──→ (Many) Vehicle
Vehicle (1) ──→ (Many) VehicleDocument

Mission (1) ──→ (Many) Payment
Payment (1) ──→ (Many) Transaction
Transaction (1) ──→ (Many) LedgerEntry
```

### Audit Trail

All important changes tracked via:
- `AuditLog` model
- `createdAt` / `updatedAt` timestamps
- `deletedAt` for soft deletes
- `createdBy` / `updatedBy` user references

---

## 🔒 Security Layers

### Frontend Security
- ✅ Input validation with Zod
- ✅ XSS prevention (React escapes by default)
- ✅ CSRF tokens (via same-site cookies)
- ✅ Rate limiting on forms

### Backend Security
- ✅ Input validation again (never trust client)
- ✅ JWT verification
- ✅ Role-based access checks
- ✅ SQL injection prevention (Prisma)

### Database Security
- ✅ Prepared statements (Prisma)
- ✅ Least privilege user account
- ✅ Encrypted sensitive fields (passwords)
- ✅ Indexes for performance

### Network Security (Production)
- ✅ HTTPS/SSL certificates
- ✅ CORS headers
- ✅ Security headers (CSP, X-Frame-Options, etc.)
- ⏳ Rate limiting middleware
- ⏳ DDoS protection

---

## 🎯 Design Patterns Used

| Pattern | Where | Purpose |
|---------|-------|---------|
| Factory | PaymentProviderFactory | Instantiate providers |
| Strategy | Payment providers | Different payment methods |
| Repository | Prisma | Data access abstraction |
| Service | lib/services/* | Business logic encapsulation |
| Observer | React hooks | State management |
| Adapter | API client | Unify different APIs |
| Decorator | Higher-order components | Add functionality to components |
| Builder | Prisma queries | Fluent API for queries |

---

## 🔄 Data Flow Examples

### User Signup Flow
```
1. User fills form
2. Frontend validates (Zod)
3. Frontend sends to /api/auth/signup
4. Backend validates again (Zod)
5. Backend calls authService.signup()
6. Service hashes password, creates user
7. Service generates JWT token
8. Backend returns token
9. Frontend stores token (localStorage)
10. Frontend redirects to dashboard
```

### Payment Flow (Future)
```
1. Client selects service, amount
2. Frontend calls /api/payments (POST)
3. Backend validates payment
4. Backend calls paymentProvider.charge()
5. Orange Money processes payment
6. Orange Money calls webhook
7. Backend verifies webhook signature
8. Webhook creates LedgerEntry + Commission
9. Backend returns to frontend
10. Frontend confirms success
```

### Matching Flow (Future)
```
1. Client publishes request
2. Matching cron job runs
3. Job calls matchingService.findMatches()
4. Service queries truckers in same city
5. Service calculates score for each trucker
6. Service returns top 3 matches
7. Backend creates Match records
8. Backend sends notifications
9. UI shows matches to client
10. Client books or unlocks contact
```

---

## 📈 Scalability Considerations

### Current Setup
- ✅ Single Next.js server
- ✅ Single PostgreSQL database
- ✅ Optional Redis for caching
- Suitable for: MVP, initial launch

### Future Scaling
- [ ] Separate frontend from backend (Next.js → separate repos)
- [ ] Database replication (read replicas)
- [ ] Caching layer (Redis, CDN)
- [ ] Message queue (Bull, RabbitMQ)
- [ ] Microservices (if needed)
- [ ] Load balancing
- [ ] Horizontal scaling

**Recommendation**: Start monolithic, split if needed at ~1000 DAU

---

## 🧪 Testing Strategy

### Unit Tests
- Test individual functions (utils, validations)
- Mock external dependencies
- ~80% coverage goal

### Integration Tests
- Test service + database interaction
- Use test database
- ~60% coverage goal

### E2E Tests
- Test user workflows (signup, book, pay)
- Use Cypress or Playwright
- ~20% coverage goal (critical paths only)

### Setup Suggested
```json
{
  "devDependencies": {
    "jest": "^29.0.0",
    "@testing-library/react": "^14.0.0",
    "cypress": "^13.0.0"
  }
}
```

---

## 🚀 Performance Optimizations

### Frontend
- ✅ Next.js Image component (lazy loading, optimization)
- ✅ Code splitting (pages loaded on demand)
- ✅ CSS-in-JS (only necessary CSS loaded)
- ⏳ Service Workers (offline support)

### Backend
- ✅ Database indexes on hot fields
- ✅ Pagination on list endpoints
- ✅ Caching frequently accessed data
- ⏳ Query optimization

### Network
- ✅ Gzip compression
- ✅ CDN for static assets (future)
- ✅ API caching headers (future)

---

## 🔗 Technology Rationale

| Tech | Why Chosen | Alternative |
|------|-----------|-------------|
| Next.js | Full-stack, SSR, excellent DX | Express + React separate |
| Tailwind | Utility-first, no CSS files | Bootstrap, Styled Components |
| Prisma | Type-safe ORM, migrations | TypeORM, Sequelize |
| Zod | Runtime validation, TypeScript | Yup, Joi |
| Framer Motion | Smooth animations, gestures | React Spring, Animate.css |
| PostgreSQL | Reliable, ACID, open-source | MySQL, MongoDB |
| Redis | Fast caching, pub/sub | Memcached |
| Docker | Reproducible environments | Vagrant, dev dependencies |
| TypeScript | Type safety, better DX | JavaScript |

---

## 📋 Code Style & Conventions

### Naming
- **Files**: `kebab-case.ts`
- **Components**: `PascalCase.tsx`
- **Variables**: `camelCase`
- **Constants**: `UPPER_SNAKE_CASE`
- **Interfaces**: `PascalCase` (no `I` prefix)

### File Organization
- One component per file
- Exports at bottom
- Imports at top (organized)
- No circular dependencies

### Code Quality
- ✅ TypeScript strict mode
- ✅ ESLint rules (add later)
- ✅ Prettier formatting (add later)
- ✅ Comment only non-obvious code
- ✅ DRY (Don't Repeat Yourself)

---

## 🎓 Learning from This Architecture

Key takeaways for other projects:

1. **Abstraction is powerful** - API client, payment provider
2. **Configuration over hardcoding** - Easy customization
3. **Validation at multiple layers** - Never trust input
4. **Service layer pattern** - Reusable, testable code
5. **Clear separation of concerns** - Easy to maintain
6. **Type safety** - Catch errors early
7. **Scalable from the start** - Can grow as needed

---

**This architecture is designed to be:**
- ✅ Simple to understand
- ✅ Easy to extend
- ✅ Maintainable long-term
- ✅ Scalable as needed
- ✅ Secure by default
- ✅ Developer-friendly

**Next developer onboarding time**: ~1 hour to understand full architecture
