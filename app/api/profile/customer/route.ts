import { NextRequest, NextResponse } from 'next/server';
import { getAuthContext, unauthorized } from '@/lib/api-auth';
import { updateCustomerProfileSchema } from '@/lib/validations';
import { prisma } from '@/lib/prisma';
import { sanitizeOptionalString } from '@/lib/anti-leak';

/**
 * GET /api/profile/customer
 */
export async function GET(request: NextRequest) {
  try {
    const auth = await getAuthContext(request);
    if (!auth) return unauthorized();

    const profile = await prisma.customerProfile.findUnique({
      where: { userId: auth.userId },
      include: {
        user: {
          select: { id: true, firstName: true, lastName: true, phone: true, email: true },
        },
      },
    });

    if (!profile) {
      return NextResponse.json({ error: 'Customer profile not found' }, { status: 404 });
    }

    return NextResponse.json({ success: true, data: profile });
  } catch (error: any) {
    console.error('[GET /api/profile/customer]', error);
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * PUT /api/profile/customer
 */
export async function PUT(request: NextRequest) {
  try {
    const auth = await getAuthContext(request);
    if (!auth) return unauthorized();

    const body = await request.json();
    const validation = updateCustomerProfileSchema.safeParse(body);
    if (!validation.success) {
      return NextResponse.json(
        { error: 'Validation failed', details: validation.error.issues },
        { status: 400 }
      );
    }

    const existing = await prisma.customerProfile.findUnique({ where: { userId: auth.userId } });
    if (!existing) {
      return NextResponse.json({ error: 'Customer profile not found' }, { status: 404 });
    }

    const { companyName, companyType, city, sector, alternatePhone } = validation.data;

    const updated = await prisma.customerProfile.update({
      where: { userId: auth.userId },
      data: {
        ...(companyName !== undefined && { companyName: sanitizeOptionalString(companyName) }),
        ...(companyType !== undefined && { companyType }),
        city,
        ...(sector !== undefined && { sector: sanitizeOptionalString(sector) }),
        ...(alternatePhone !== undefined && { alternatePhone }),
      },
    });

    return NextResponse.json({ success: true, data: updated });
  } catch (error: any) {
    console.error('[PUT /api/profile/customer]', error);
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}
