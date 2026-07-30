import { NextRequest, NextResponse } from 'next/server';
import { requestService } from '@/lib/services/request-service';
import { createTransportRequestSchema } from '@/lib/validations';
import { verifyToken } from '@/lib/auth';

/**
 * GET /api/requests/[id]
 * Get a single request
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const requestId = params.id;

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

    // Get request
    const result = await requestService.getById(requestId);

    if (!result) {
      return NextResponse.json({ error: 'Request not found' }, { status: 404 });
    }

    // Verify ownership
    if (result.customerId !== decoded.userId) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    return NextResponse.json(result);
  } catch (error: any) {
    console.error('[GET /api/requests/[id]]', error);
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * PUT /api/requests/[id]
 * Update a request (only in DRAFT status)
 */
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const requestId = params.id;

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

    // Validate partial data
    try {
      createTransportRequestSchema.partial().parse(body);
    } catch (validationError: any) {
      return NextResponse.json(
        {
          error: 'Validation failed',
          details: validationError.errors,
        },
        { status: 400 }
      );
    }

    // Update request
    const result = await requestService.update(requestId, decoded.userId, body);

    return NextResponse.json(result);
  } catch (error: any) {
    console.error('[PUT /api/requests/[id]]', error);

    if (error.message.includes('not found') || error.message.includes('unauthorized')) {
      return NextResponse.json({ error: error.message }, { status: 404 });
    }

    if (error.message.includes('DRAFT')) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/requests/[id]
 * Delete (soft delete) a request
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const requestId = params.id;

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

    // Delete request
    await requestService.delete(requestId, decoded.userId);

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('[DELETE /api/requests/[id]]', error);

    if (error.message.includes('not found')) {
      return NextResponse.json({ error: error.message }, { status: 404 });
    }

    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}
