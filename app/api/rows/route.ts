import { NextResponse } from "next/server";
import { query } from "../../lib/db";
import { verifySession } from "../../lib/auth";

/**
 * Core security helper to validate session cookie, resolving candidate active session or returning null
 */
async function getAuthenticatedSession(request: Request) {
    const cookieHeader = request.headers.get("cookie") || "";
    const cookies = Object.fromEntries(
        cookieHeader.split(";").map((cookie) => {
            const [key, ...val] = cookie.trim().split("=");
            return [key, decodeURIComponent(val.join("="))];
        })
    );

    const token = cookies.session;
    if (!token) return null;

    return verifySession(token);
}

export async function GET(request: Request) {
    try {
        const session = await getAuthenticatedSession(request);

        if (!session) {
            return NextResponse.json(
                { success: false, error: "Access denied. Unauthorized session." },
                { status: 401 }
            );
        }

        const { searchParams } = new URL(request.url);
        const search = searchParams.get("search") || "";
        const category = searchParams.get("category") || "";
        const page = parseInt(searchParams.get("page") || "1", 10);
        const limit = parseInt(searchParams.get("limit") || "10", 10);
        const offset = (page - 1) * limit;

        // Build values array and dynamic isolated search query
        const sqlParams: any[] = [session.orgId];
        let paramIndex = 2;

        let filterClause = "WHERE org_id = $1";

        if (search) {
            filterClause += ` AND (record_name ILIKE $${paramIndex} OR custodian_email ILIKE $${paramIndex})`;
            sqlParams.push(`%${search}%`);
            paramIndex++;
        }

        if (category) {
            filterClause += ` AND category = $${paramIndex}`;
            sqlParams.push(category);
            paramIndex++;
        }

        // Append pagination parameters to parameters list
        const selectParams = [...sqlParams, limit, offset];
        const selectQueryStr = `
      SELECT id, record_name, category, metric_value, security_level, status, custodian_email, created_at
      FROM organization_data
      ${filterClause}
      ORDER BY id DESC
      LIMIT $${paramIndex} OFFSET $${paramIndex + 1}
    `;

        // Execute count and paginated rows retrieval concurrently under Neon for zero-latency execution
        const [countResult, selectResult] = await Promise.all([
            query(`SELECT COUNT(*) FROM organization_data ${filterClause}`, sqlParams),
            query(selectQueryStr, selectParams)
        ]);

        const totalRows = parseInt(countResult.rows[0].count, 10);

        return NextResponse.json({
            success: true,
            orgId: session.orgId,
            orgName: session.orgName,
            totalRows,
            totalPages: Math.ceil(totalRows / limit),
            currentPage: page,
            limit,
            rows: selectResult.rows,
        });
    } catch (err: any) {
        console.error("[Rows GET API] Error fetching isolated rows:", err);
        return NextResponse.json(
            { success: false, error: "Failed to load dashboard data." },
            { status: 500 }
        );
    }
}

export async function POST(request: Request) {
    try {
        const session = await getAuthenticatedSession(request);

        if (!session) {
            return NextResponse.json(
                { success: false, error: "Access denied. Unauthorized session." },
                { status: 401 }
            );
        }

        // Insert new record initialized strictly to "unlisted, unlisted, unlisted" as specified by prompt
        const recordName = "unlisted";
        const category = "unlisted";
        const custodianEmail = "unlisted";

        // Auxiliary values default
        const metricValue = 0.00;
        const securityLevel = "Confidential";
        const status = "Active";

        const insertResult = await query(
            `INSERT INTO organization_data (org_id, record_name, category, metric_value, security_level, status, custodian_email)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       RETURNING id, record_name, category, metric_value, security_level, status, custodian_email, created_at`,
            [session.orgId, recordName, category, metricValue, securityLevel, status, custodianEmail]
        );

        console.log(`[Rows POST API] Org ${session.orgId} created new 'unlisted' row ID: ${insertResult.rows[0].id}`);

        return NextResponse.json({
            success: true,
            row: insertResult.rows[0],
            message: "New workspace record successfully generated.",
        });
    } catch (err: any) {
        console.error("[Rows POST API] Error inserting initialized row:", err);
        return NextResponse.json(
            { success: false, error: "Failed to insert new row." },
            { status: 500 }
        );
    }
}
