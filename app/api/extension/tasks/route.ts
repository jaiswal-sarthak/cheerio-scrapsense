import { NextResponse } from 'next/server';
import { verify } from 'jsonwebtoken';
import { db } from '@/lib/supabase/queries';

const jwtSecret = process.env.NEXTAUTH_SECRET || 'your-secret-key';

async function getUserIdFromToken(request: Request): Promise<string | null> {
    const authHeader = request.headers.get('Authorization');

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return null;
    }

    try {
        const token = authHeader.substring(7);
        const decoded = verify(token, jwtSecret) as { userId: string };
        return decoded.userId;
    } catch {
        return null;
    }
}

export async function GET(request: Request) {
    const userId = await getUserIdFromToken(request);

    if (!userId) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    try {
        const tasks = await db.getDashboardData(userId);
        return NextResponse.json({ tasks });
    } catch (error) {
        console.error('Failed to fetch tasks:', error);
        return NextResponse.json({ error: 'Failed to fetch tasks' }, { status: 500 });
    }
}

export async function POST(request: Request) {
    const userId = await getUserIdFromToken(request);

    if (!userId) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    try {
        const body = await request.json();
        const { url, title, selectors, data } = body;

        if (!url || !selectors) {
            return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
        }

        // Create site
        const site = await db.upsertSite({
            url,
            title: title || url,
            userId
        });

        // Create instruction with selectors
        const instruction = await db.createInstruction({
            siteId: site.id,
            instructionText: `Extension scrape: ${title || url}`,
            scheduleIntervalHours: 24,
            aiSchema: selectors,
            userId
        });

        // Insert scraped data as results
        if (data && data.length > 0) {
            await db.insertResults(instruction.id, data.map((item: any) => ({
                title: item.title || item.name || 'Scraped Item',
                description: item.description || '',
                url: item.url || url,
                metadata: item
            })));
        }

        return NextResponse.json({
            id: instruction.id,
            url,
            title,
            selectors,
            status: 'completed',
            createdAt: new Date().toISOString()
        });
    } catch (error) {
        console.error('Failed to create task:', error);
        return NextResponse.json({ error: 'Failed to create task' }, { status: 500 });
    }
}

