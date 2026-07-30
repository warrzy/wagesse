import { NextRequest, NextResponse } from 'next/server';
import { quoteService } from '@/lib/services/quote-service';
import { createQuoteSchema } from '@/lib/validations';
import { verifyToken } from '@/lib/auth';

/**
 * GET /api/quotes?requestId=xxx
 * Get quotes for a request or for a trucker
 */
export async function GET(request: NextRequest) {
  try {
    const token = request.headers.get('Authorization')?.split(' ')[1];
    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    let decoded: any;
    try {
      decoded = verifyToken(token);
    } catch (error) {
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const requestId = searchParams.get('requestId');
    const truckerId = searchParams.get('truckerId');
    const skip = parseInt(searchParams.get('skip') || '0', 10);
    const take = parseInt(searchParams.get('take') || '10', 10);

    let result;

    if (requestId) {
      // Get quotes for a specific request
      result = await quoteService.getByRequestId(requestId);
    } else if (truckerId) {
      // Verify user is requesting their own quotes
      if (truckerId !== decoded.userId) {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
      }
      result = await quoteService.getByTruckerId(truckerId, { skip, take });
    } else {
      return NextResponse.json(
        { error: 'Provide either requestId or truckerId' },
        { status: 400 }
      );
    }

    return NextResponse.json(result);
  } catch (error: any) {
    console.error('[GET /api/quotes]', error);
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/quotes
 * Create a new quote
 */
export async function POST(request: NextRequest) {
  try {
    const token = request.headers.get('Authorization')?.split(' ')[1];
    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    let decoded: any;
    try {
      decoded = verifyToken(token);
    } catch (error) {
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
    }

    const body = await request.json();

    // Validate data
    try {
      createQuoteSchema.parse(body);
    } catch (validationError: any) {
      return NextResponse.json(
        {
          error: 'Validation failed',
          details: validationError.errors,
        },
        { status: 400 }
      );
    }

    // Create quote
    const result = await quoteService.create(decoded.userId, body);

    return NextResponse.json(result, { status: 201 });
  } catch (error: any) {
    console.error('[POST /api/quotes]', error);

    if (error.message.includes('not found') || error.message.includes('already quoted')) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}
