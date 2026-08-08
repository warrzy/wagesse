import { NextRequest, NextResponse } from 'next/server';
import { getAuthContext, unauthorized } from '@/lib/api-auth';
import { updateTruckerProfileSchema } from '@/lib/validations';
import { prisma } from '@/lib/prisma';
import { sanitizeOptionalString } from '@/lib/anti-leak';

/**
 * GET /api/profile/trucker
 */
export async function GET(request: NextRequest) {
  try {
    const auth = getAuthContext(request);
    if (!auth) return unauthorized();

    const profile = await prisma.truckerProfile.findUnique({
      where: { userId: auth.userId },
      include: {
        user: {
          select: { id: true, firstName: true, lastName: true, phone: true, email: true },
        },
        vehicles: true,
        serviceAreas: true,
      },
    });

    if (!profile) {
      return NextResponse.json({ error: 'Trucker profile not found' }, { status: 404 });
    }

    return NextResponse.json({ success: true, data: profile });
  } catch (error: any) {
    console.error('[GET /api/profile/trucker]', error);
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * PUT /api/profile/trucker
 */
export async function PUT(request: NextRequest) {
  try {
    const auth = getAuthContext(request);
    if (!auth) return unauthorized();

    const body = await request.json();
    const validation = updateTruckerProfileSchema.safeParse(body);
    if (!validation.success) {
      return NextResponse.json(
        { error: 'Validation failed', details: validation.error.issues },
        { status: 400 }
      );
    }

    const existing = await prisma.truckerProfile.findUnique({ where: { userId: auth.userId } });
    if (!existing) {
      return NextResponse.json({ error: 'Trucker profile not found' }, { status: 404 });
    }

    const { city, operatingLicense, licenseExpiry, orangeMoneyNumber, serviceAreas } = validation.data;

    const updated = await prisma.$transaction(async (tx) => {
      const profile = await tx.truckerProfile.update({
        where: { userId: auth.userId },
        data: {
          city,
          ...(operatingLicense !== undefined && { operatingLicense: sanitizeOptionalString(operatingLicense) }),
          ...(licenseExpiry !== undefined && { licenseExpiry }),
          ...(orangeMoneyNumber !== undefined && { orangeMoneyNumber }),
        },
      });

      if (serviceAreas !== undefined) {
        await tx.serviceArea.deleteMany({ where: { truckerId: existing.id } });
        if (serviceAreas.length > 0) {
          await tx.serviceArea.createMany({
            data: serviceAreas.map((areaCity) => ({ truckerId: existing.id, city: areaCity })),
          });
        }
      }

      return profile;
    });

    return NextResponse.json({ success: true, data: updated });
  } catch (error: any) {
    console.error('[PUT /api/profile/trucker]', error);
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}
