import { NextRequest, NextResponse } from 'next/server';
import { getAuthContext, getTruckerProfileId, unauthorized } from '@/lib/api-auth';
import { createVehicleSchema } from '@/lib/validations';
import { prisma } from '@/lib/prisma';

/**
 * GET /api/vehicles
 * List the authenticated trucker's vehicles
 */
export async function GET(request: NextRequest) {
  try {
    const auth = getAuthContext(request);
    if (!auth) return unauthorized();

    const truckerId = await getTruckerProfileId(auth.userId);
    if (!truckerId) {
      return NextResponse.json({ error: 'Trucker profile not found' }, { status: 404 });
    }

    const vehicles = await prisma.vehicle.findMany({
      where: { truckerId, deletedAt: null },
      orderBy: { createdAt: 'desc' },
    });

    return NextResponse.json({ success: true, data: vehicles });
  } catch (error: any) {
    console.error('[GET /api/vehicles]', error);
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/vehicles
 * Register a new vehicle for the authenticated trucker
 */
export async function POST(request: NextRequest) {
  try {
    const auth = getAuthContext(request);
    if (!auth) return unauthorized();

    const truckerId = await getTruckerProfileId(auth.userId);
    if (!truckerId) {
      return NextResponse.json({ error: 'Trucker profile not found' }, { status: 404 });
    }

    const body = await request.json();
    const validation = createVehicleSchema.safeParse(body);
    if (!validation.success) {
      return NextResponse.json(
        { error: 'Validation failed', details: validation.error.issues },
        { status: 400 }
      );
    }

    const data = validation.data;

    const existingPlate = await prisma.vehicle.findUnique({
      where: { licensePlate: data.licensePlate },
    });
    if (existingPlate) {
      return NextResponse.json(
        { error: 'Un véhicule avec cette plaque existe déjà' },
        { status: 409 }
      );
    }

    const vehicle = await prisma.vehicle.create({
      data: {
        truckerId,
        licensePlate: data.licensePlate,
        brand: data.brand,
        model: data.model,
        year: data.year,
        vehicleType: data.vehicleType,
        capacityTonnes: data.capacityTonnes,
        capacityM3: data.capacityM3,
        benneType: data.benneType,
        insuranceExpiry: data.insuranceExpiry,
        inspectionExpiry: data.inspectionExpiry,
      },
    });

    return NextResponse.json({ success: true, data: vehicle }, { status: 201 });
  } catch (error: any) {
    console.error('[POST /api/vehicles]', error);
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}
