import { NextRequest, NextResponse } from 'next/server';
import { requestService } from '@/lib/services/request-service';
import { verifyToken } from '@/lib/auth';

/**
 * POST /api/requests/[id]/publish
 * Publish a request (change from DRAFT to PUBLISHED)
 */
export async function POST(
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

    // Publish request
    const result = await requestService.publish(requestId, decoded.userId);

    return NextResponse.json(result);
  } catch (error: any) {
    console.error('[POST /api/requests/[id]/publish]', error);

    if (error.message.includes('not found')) {
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
