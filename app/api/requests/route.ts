import { NextRequest, NextResponse } from 'next/server';
import { requestService } from '@/lib/services/request-service';
import { createTransportRequestSchema } from '@/lib/validations';
import { verifyToken } from '@/lib/auth';

/**
 * GET /api/requests?status=DRAFT&skip=0&take=10
 * Get all requests for the authenticated user
 */
export async function GET(request: NextRequest) {
  try {
    // Get token from header
    const token = request.headers.get('Authorization')?.split(' ')[1];
    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Verify token
    let decoded: any;
    try {
      decoded = verifyToken(token);
    } catch (error) {
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
    }

    // Get query parameters
    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status') as any;
    const skip = parseInt(searchParams.get('skip') || '0', 10);
    const take = parseInt(searchParams.get('take') || '10', 10);

    // Get requests
    const result = await requestService.getByCustomerId(decoded.userId, {
      status: status || undefined,
      skip,
      take,
    });

    return NextResponse.json(result);
  } catch (error: any) {
    console.error('[GET /api/requests]', error);
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/requests
 * Create a new transport request
 */
export async function POST(request: NextRequest) {
  try {
    // Get token from header
    const token = request.headers.get('Authorization')?.split(' ')[1];
    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Verify token
    let decoded: any;
    try {
      decoded = verifyToken(token);
    } catch (error) {
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
    }

    // Get request body
    const body = await request.json();

    // Validate data
    try {
      createTransportRequestSchema.parse(body);
    } catch (validationError: any) {
      return NextResponse.json(
        {
          error: 'Validation failed',
          details: validationError.errors,
        },
        { status: 400 }
      );
    }

    // Create request
    const result = await requestService.create(decoded.userId, body);

    return NextResponse.json(result, { status: 201 });
  } catch (error: any) {
    console.error('[POST /api/requests]', error);
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}
