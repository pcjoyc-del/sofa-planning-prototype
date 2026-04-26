import { NextRequest, NextResponse } from 'next/server';
import { IdentityStatus, LeadSource, LeadStatus, Prisma } from '@prisma/client';
import { prisma } from '../../../lib/prisma';

type CreateLeadPayload = {
  visitDatetime?: string;
  storeId?: string;
  salesId?: string;
  source?: LeadSource;
  customerName?: string | null;
  phone?: string | null;
  lineId?: string | null;
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
  note?: string | null;
  actorUserId?: string;
};

type Pagination = {
  page: number;
  pageSize: number;
};

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

function isValidLeadSource(value: unknown): value is LeadSource {
  return typeof value === 'string' && Object.values(LeadSource).includes(value as LeadSource);
}

function parsePositiveInt(value: string | null, defaultValue: number, field: string): number | NextResponse {
  if (value == null || value.trim() === '') return defaultValue;
  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed <= 0) {
    return badRequest(`${field} must be a positive integer`);
  }
  return parsed;
}

function parseDateParam(value: string | null, field: string): Date | NextResponse | null {
  if (!value) return null;
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return badRequest(`${field} must be a valid ISO date string`);
  }
  return parsed;
}

export async function GET(request: NextRequest) {
  const requestId = crypto.randomUUID();

  try {
    const { searchParams } = new URL(request.url);
    const pageParsed = parsePositiveInt(searchParams.get('page'), 1, 'page');
    if (pageParsed instanceof NextResponse) return pageParsed;

    const pageSizeParsed = parsePositiveInt(searchParams.get('pageSize'), 20, 'pageSize');
    if (pageSizeParsed instanceof NextResponse) return pageSizeParsed;
    if (pageSizeParsed > 100) {
      return badRequest('pageSize must be <= 100');
    }

    const status = searchParams.get('status');
    if (status && !Object.values(LeadStatus).includes(status as LeadStatus)) {
      return badRequest('status is invalid', { allowed: Object.values(LeadStatus) });
    }

    const identityStatus = searchParams.get('identityStatus');
    if (
      identityStatus &&
      !Object.values(IdentityStatus).includes(identityStatus as IdentityStatus)
    ) {
      return badRequest('identityStatus is invalid', { allowed: Object.values(IdentityStatus) });
    }

    const source = searchParams.get('source');
    if (source && !isValidLeadSource(source)) {
      return badRequest('source is invalid', { allowed: Object.values(LeadSource) });
    }

    const visitDateFrom = parseDateParam(searchParams.get('visitDateFrom'), 'visitDateFrom');
    if (visitDateFrom instanceof NextResponse) return visitDateFrom;
    const visitDateTo = parseDateParam(searchParams.get('visitDateTo'), 'visitDateTo');
    if (visitDateTo instanceof NextResponse) return visitDateTo;
    const createdDateFrom = parseDateParam(searchParams.get('createdDateFrom'), 'createdDateFrom');
    if (createdDateFrom instanceof NextResponse) return createdDateFrom;
    const createdDateTo = parseDateParam(searchParams.get('createdDateTo'), 'createdDateTo');
    if (createdDateTo instanceof NextResponse) return createdDateTo;

    const pageInfo: Pagination = { page: pageParsed, pageSize: pageSizeParsed };
    const skip = (pageInfo.page - 1) * pageInfo.pageSize;

    const where: Prisma.LeadWhereInput = {};
    const storeId = searchParams.get('storeId');
    const salesId = searchParams.get('salesId');
    const phone = searchParams.get('phone');
    const lineId = searchParams.get('lineId');
    const q = searchParams.get('q');

    if (storeId) where.storeId = storeId;
    if (salesId) where.salesId = salesId;
    if (status) where.status = status as LeadStatus;
    if (identityStatus) where.identityStatus = identityStatus as IdentityStatus;
    if (source) where.source = source;
    if (phone) where.phone = phone;
    if (lineId) where.lineId = lineId;
    if (visitDateFrom || visitDateTo) {
      where.visitDatetime = {
        gte: visitDateFrom ?? undefined,
        lte: visitDateTo ?? undefined
      };
    }
    if (createdDateFrom || createdDateTo) {
      where.createdAt = {
        gte: createdDateFrom ?? undefined,
        lte: createdDateTo ?? undefined
      };
    }
    if (q) {
      where.OR = [
        { customerName: { contains: q, mode: 'insensitive' } },
        { phone: { contains: q, mode: 'insensitive' } },
        { lineId: { contains: q, mode: 'insensitive' } }
      ];
    }

    console.info('[GET /api/leads] request received', {
      requestId,
      page: pageInfo.page,
      pageSize: pageInfo.pageSize,
      hasQ: Boolean(q),
      storeId,
      salesId,
      status,
      identityStatus,
      source
    });

    const [data, total] = await prisma.$transaction([
      prisma.lead.findMany({
        where,
        select: {
          id: true,
          visitDatetime: true,
          storeId: true,
          salesId: true,
          customerName: true,
          phone: true,
          lineId: true,
          source: true,
          status: true,
          identityStatus: true,
          createdAt: true,
          updatedAt: true
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: pageInfo.pageSize
      }),
      prisma.lead.count({ where })
    ]);

    return NextResponse.json({
      data,
      pagination: {
        page: pageInfo.page,
        pageSize: pageInfo.pageSize,
        total
      }
    });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError) {
      console.error('[GET /api/leads] prisma error', { requestId, code: error.code, meta: error.meta });
      return NextResponse.json(
        {
          error: {
            code: 'DB_ERROR',
            message: 'Unable to fetch leads due to database constraint'
          }
        },
        { status: 400 }
      );
    }

    console.error('[GET /api/leads] failed', { requestId, error });
    return NextResponse.json(
      {
        error: {
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Failed to fetch leads'
        }
      },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  const requestId = crypto.randomUUID();

  try {
    const body = (await request.json()) as CreateLeadPayload;
    console.info('[POST /api/leads] request received', {
      requestId,
      storeId: body.storeId,
      salesId: body.salesId,
      source: body.source
    });

    const missingFields: string[] = [];
    if (!body.visitDatetime) missingFields.push('visitDatetime');
    if (!body.storeId) missingFields.push('storeId');
    if (!body.salesId) missingFields.push('salesId');
    if (!body.source) missingFields.push('source');

    if (missingFields.length > 0) {
      return badRequest('Missing required fields', { missingFields });
    }

    const visitDatetime = new Date(body.visitDatetime);
    if (Number.isNaN(visitDatetime.getTime())) {
      return badRequest('visitDatetime must be a valid ISO date string');
    }

    if (!isValidLeadSource(body.source)) {
      return badRequest('source is invalid', { allowed: Object.values(LeadSource) });
    }

    const salesUser = await prisma.salesUser.findUnique({
      where: { id: body.salesId },
      select: { id: true, userId: true }
    });

    if (!salesUser) {
      return badRequest('salesId not found');
    }

    const storeExists = await prisma.store.findUnique({
      where: { id: body.storeId },
      select: { id: true }
    });
    if (!storeExists) {
      return badRequest('storeId not found');
    }

    const actorUserId = body.actorUserId ?? request.headers.get('x-user-id') ?? salesUser.userId;
    if (!actorUserId) {
      return badRequest('actorUserId is required when sales user is not linked to auth user');
    }

    const actorExists = await prisma.user.findUnique({
      where: { id: actorUserId },
      select: { id: true }
    });
    if (!actorExists) {
      return badRequest('actorUserId not found');
    }

    const lead = await prisma.$transaction(async (tx) => {
      const createdLead = await tx.lead.create({
        data: {
          visitDatetime,
          storeId: body.storeId,
          salesId: body.salesId,
          source: body.source,
          customerName: body.customerName ?? null,
          phone: body.phone ?? null,
          lineId: body.lineId ?? null,
          interestedModelCode: body.interestedModelCode ?? null,
          priceRangeCode: body.priceRangeCode ?? null,
          usageTimingCode: body.usageTimingCode ?? null,
          residenceTypeCode: body.residenceTypeCode ?? null,
          customerGroupCode: body.customerGroupCode ?? null,
          ageRangeCode: body.ageRangeCode ?? null,
          customerLocation: body.customerLocation ?? null,
          firstQuestion: body.firstQuestion ?? null,
          customerTypeFlagCode: body.customerTypeFlagCode ?? null,
          interestedProductCategoryCode: body.interestedProductCategoryCode ?? null,
          note: body.note ?? null,
          status: 'NEW_LEAD',
          identityStatus: 'UNVERIFIED',
          createdById: actorUserId,
          updatedById: actorUserId
        },
        select: {
          id: true,
          status: true,
          identityStatus: true,
          createdAt: true,
          updatedAt: true
        }
      });

      await tx.auditEvent.create({
        data: {
          entityType: 'LEAD',
          entityId: createdLead.id,
          actionType: 'CREATE',
          actorUserId,
          requestId,
          beforeState: Prisma.JsonNull,
          afterState: {
            event: 'LEAD_CREATED',
            storeId: body.storeId,
            salesId: body.salesId,
            source: body.source
          },
          metadata: {
            endpoint: 'POST /api/leads'
          }
        }
      });

      return createdLead;
    });

    console.info('[POST /api/leads] lead created', { requestId, leadId: lead.id });
    return NextResponse.json(lead, { status: 201 });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError) {
      console.error('[POST /api/leads] prisma error', { requestId, code: error.code, meta: error.meta });
      return NextResponse.json(
        {
          error: {
            code: 'DB_ERROR',
            message: 'Unable to create lead due to database constraint'
          }
        },
        { status: 400 }
      );
    }

    console.error('[POST /api/leads] failed', { requestId, error });
    return NextResponse.json(
      {
        error: {
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Failed to create lead'
        }
      },
      { status: 500 }
    );
  }
}
