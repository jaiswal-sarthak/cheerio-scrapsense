import { NextResponse } from 'next/server';
import { verify } from 'jsonwebtoken';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const jwtSecret = process.env.NEXTAUTH_SECRET || 'your-secret-key';

const supabase = createClient(supabaseUrl, supabaseKey);

export async function GET(request: Request) {
    try {
        // Get token from Authorization header
        const authHeader = request.headers.get('Authorization');

        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const token = authHeader.substring(7);

        // Verify JWT token
        const decoded = verify(token, jwtSecret) as { userId: string; email: string };

        // Get user from database
        const { data: userData, error } = await supabase
            .from('users')
            .select('id, email, name')
            .eq('id', decoded.userId)
            .single();

        if (error || !userData) {
            return NextResponse.json({ error: 'User not found' }, { status: 404 });
        }

        return NextResponse.json({
            id: userData.id,
            email: userData.email,
            name: userData.name || userData.email.split('@')[0]
        });
    } catch (error) {
        console.error('Token verification error:', error);
        return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
    }
}

