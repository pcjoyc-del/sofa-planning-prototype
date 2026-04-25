import { NextRequest, NextResponse } from 'next/server';
import { LeadStatus, Prisma } from '@prisma/client';
import { prisma } from '../../../../lib/prisma';

function badRequest(message: string, details?: Record<string, unknown>) {
  return NextResponse.json(
    {
      error: {
        code: 'VALIDATION_ERROR',
        message,
        details
      }
    },
    { status: 400 }
  );
}

function notFound(message: string) {
  return NextResponse.json(
    {
      error: {
        code: 'NOT_FOUND',
        message
      }
    },
    { status: 404 }
  );
}

function isValidId(value: string): boolean {
  // Basic safe guard for route param quality; schema uses cuid-like ids.
  return /^[a-zA-Z0-9_-]{8,100}$/.test(value);
}

type PatchLeadPayload = {
  status?: LeadStatus;
  note?: string | null;
  phone?: string | null;
  lineId?: string | null;
  customerName?: string | null;
  interestedModelCode?: string | null;
  priceRangeCode?: string | null;
  usageTimingCode?: string | null;
  residenceTypeCode?: string | null;
  customerGroupCode?: string | null;
  ageRangeCode?: string | null;
  customerLocation?: string | null;
  firstQuestion?: string | null;
  customerTypeFlagCode?: string | null;
  interestedProductCategoryCode?: string | null;
  actorUserId?: string;
};

export async function GET(
  _request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const requestId = crypto.randomUUID();

  try {
    const { id } = await context.params;

    if (!id || !isValidId(id)) {
      return badRequest('id is invalid');
    }

    console.info('[GET /api/leads/:id] request received', { requestId, leadId: id });

    const lead = await prisma.lead.findUnique({
      where: { id },
      select: {
        id: true,
        visitDatetime: true,
        storeId: true,
        salesId: true,
        customerName: true,
        phone: true,
        lineId: true,
        source: true,
        interestedModelCode: true,
        priceRangeCode: true,
        usageTimingCode: true,
        residenceTypeCode: true,
        customerGroupCode: true,
        ageRangeCode: true,
        customerLocation: true,
        firstQuestion: true,
        customerTypeFlagCode: true,
        interestedProductCategoryCode: true,
        note: true,
        status: true,
        identityStatus: true,
        createdAt: true,
        updatedAt: true,
        statusHistory: {
          select: {
            id: true,
            fromStatus: true,
            toStatus: true,
            changeReason: true,
            changedAt: true,
            changedById: true
          },
          orderBy: { changedAt: 'desc' }
        },
        leadCustomerMaps: {
          select: {
            id: true,
            customerId: true,
            identityStatus: true,
            confidenceScore: true,
            isPrimaryIdentity: true,
            mappedAt: true,
            mappedByUserId: true
          },
          orderBy: [
            { isPrimaryIdentity: 'desc' },
            { mappedAt: 'desc' }
          ]
        }
      }
    });

    if (!lead) {
      return notFound('Lead not found');
    }

    const { leadCustomerMaps, ...leadCore } = lead;
    return NextResponse.json({
      ...leadCore,
      identityLinks: leadCustomerMaps
    });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError) {
      console.error('[GET /api/leads/:id] prisma error', { requestId, code: error.code, meta: error.meta });
      return NextResponse.json(
        {
          error: {
            code: 'DB_ERROR',
            message: 'Unable to fetch lead due to database constraint'
          }
        },
        { status: 400 }
      );
    }

    console.error('[GET /api/leads/:id] failed', { requestId, error });
    return NextResponse.json(
      {
        error: {
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Failed to fetch lead'
        }
      },
      { status: 500 }
    );
  }
}

export async function PATCH(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const requestId = crypto.randomUUID();

  try {
    const { id } = await context.params;
    if (!id || !isValidId(id)) {
      return badRequest('id is invalid');
    }

    const body = (await request.json()) as PatchLeadPayload;
    const actorUserId = body.actorUserId ?? request.headers.get('x-user-id');
    if (!actorUserId) {
      return badRequest('actorUserId is required');
    }

    const actorExists = await prisma.user.findUnique({
      where: { id: actorUserId },
      select: { id: true }
    });
    if (!actorExists) {
      return badRequest('actorUserId not found');
    }

    if (body.status && !Object.values(LeadStatus).includes(body.status)) {
      return badRequest('status is invalid', { allowed: Object.values(LeadStatus) });
    }

    const allowedFields: Array<keyof PatchLeadPayload> = [
      'status',
      'note',
      'phone',
      'lineId',
      'customerName',
      'interestedModelCode',
      'priceRangeCode',
      'usageTimingCode',
      'residenceTypeCode',
      'customerGroupCode',
      'ageRangeCode',
      'customerLocation',
      'firstQuestion',
      'customerTypeFlagCode',
      'interestedProductCategoryCode'
    ];

    const updateData: Prisma.LeadUpdateInput = {};
    const changedFields: string[] = [];
    for (const field of allowedFields) {
      if (Object.prototype.hasOwnProperty.call(body, field)) {
        const value = body[field];
        if (field === 'status' && (value == null || value === '')) {
          return badRequest('status cannot be null or empty');
        }
        (updateData as Record<string, unknown>)[field] = value ?? null;
        changedFields.push(field);
      }
    }

    if (changedFields.length === 0) {
      return badRequest('No updatable fields provided');
    }
    updateData.updatedBy = { connect: { id: actorUserId } };

    console.info('[PATCH /api/leads/:id] request received', {
      requestId,
      leadId: id,
      actorUserId,
      changedFields
    });

    const existingLead = await prisma.lead.findUnique({
      where: { id },
      select: {
        id: true,
        status: true
      }
    });
    if (!existingLead) {
      return notFound('Lead not found');
    }

    const updatedLead = await prisma.$transaction(async (tx) => {
      const lead = await tx.lead.update({
        where: { id },
        data: updateData,
        select: {
          id: true,
          status: true,
          identityStatus: true,
          createdAt: true,
          updatedAt: true
        }
      });

      if (Object.prototype.hasOwnProperty.call(body, 'status') && body.status && body.status !== existingLead.status) {
        await tx.leadStatusHistory.create({
          data: {
            leadId: id,
            fromStatus: existingLead.status,
            toStatus: body.status,
            changedById: actorUserId,
            changeReason: 'PATCH /api/leads/:id'
          }
        });
      }

      await tx.auditEvent.create({
        data: {
          entityType: 'LEAD',
          entityId: id,
          actionType: 'UPDATE',
          actorUserId,
          requestId,
          beforeState: {
            status: existingLead.status
          },
          afterState: {
            status: lead.status,
            changedFields
          },
          metadata: {
            endpoint: 'PATCH /api/leads/:id'
          }
        }
      });

      return lead;
    });

    console.info('[PATCH /api/leads/:id] lead updated', {
      requestId,
      leadId: id,
      changedFields
    });
    return NextResponse.json(updatedLead);
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError) {
      console.error('[PATCH /api/leads/:id] prisma error', { requestId, code: error.code, meta: error.meta });
      return NextResponse.json(
        {
          error: {
            code: 'DB_ERROR',
            message: 'Unable to update lead due to database constraint'
          }
        },
        { status: 400 }
      );
    }

    console.error('[PATCH /api/leads/:id] failed', { requestId, error });
    return NextResponse.json(
      {
        error: {
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Failed to update lead'
        }
      },
      { status: 500 }
    );
  }
}
