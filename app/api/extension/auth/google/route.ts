import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { sign } from 'jsonwebtoken';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const jwtSecret = process.env.NEXTAUTH_SECRET || 'your-secret-key';

const supabase = createClient(supabaseUrl, supabaseKey);

// Handle OPTIONS request for CORS preflight
export async function OPTIONS(request: Request) {
    return new NextResponse(null, {
        status: 200,
        headers: {
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
            'Access-Control-Allow-Headers': 'Content-Type, Authorization',
        },
    });
}

export async function POST(request: Request) {
    try {
        const body = await request.json();
        const { idToken } = body;

        if (!idToken) {
            return NextResponse.json(
                { error: 'Google ID token required' },
                {
                    status: 400,
                    headers: {
                        'Access-Control-Allow-Origin': '*',
                        'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
                        'Access-Control-Allow-Headers': 'Content-Type, Authorization',
                    },
                }
            );
        }

        // Verify Google Access Token by fetching user info
        const googleUserRes = await fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
            headers: { Authorization: `Bearer ${idToken}` }
        });

        if (!googleUserRes.ok) {
            console.error('Google token verification failed:', await googleUserRes.text());
            return NextResponse.json(
                { error: 'Invalid Google token' },
                {
                    status: 401,
                    headers: {
                        'Access-Control-Allow-Origin': '*',
                        'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
                        'Access-Control-Allow-Headers': 'Content-Type, Authorization',
                    },
                }
            );
        }

        const googleUser = await googleUserRes.json();
        const email = googleUser.email;
        const name = googleUser.name;

        if (!email) {
            return NextResponse.json(
                { error: 'Email not provided by Google' },
                { status: 400, headers: { 'Access-Control-Allow-Origin': '*' } }
            );
        }



        // Get or create user in database
        let { data: userData, error: userError } = await supabase
            .from('users')
            .select('id, email, name')
            .eq('email', email)
            .single();

        // If user doesn't exist, create them
        if (userError || !userData) {
            const { data: newUser, error: createError } = await supabase
                .from('users')
                .insert({
                    email: email,
                    name: name || email.split('@')[0],
                })
                .select('id, email, name')
                .single();

            if (createError || !newUser) {
                console.error('User creation error:', createError);
                return NextResponse.json(
                    { error: 'Failed to create user' },
                    {
                        status: 500,
                        headers: {
                            'Access-Control-Allow-Origin': '*',
                            'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
                            'Access-Control-Allow-Headers': 'Content-Type, Authorization',
                        },
                    }
                );
            }

            userData = newUser;
        }

        // Generate JWT token
        const token = sign(
            {
                userId: userData.id,
                email: userData.email
            },
            jwtSecret,
            { expiresIn: '7d' }
        );

        return NextResponse.json(
            {
                token,
                user: {
                    id: userData.id,
                    email: userData.email,
                    name: userData.name || email.split('@')[0]
                }
            },
            {
                status: 200,
                headers: {
                    'Access-Control-Allow-Origin': '*',
                    'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
                    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
                },
            }
        );
    } catch (error) {
        console.error('OAuth error:', error);
        return NextResponse.json(
            { error: 'Internal server error' },
            {
                status: 500,
                headers: {
                    'Access-Control-Allow-Origin': '*',
                    'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
                    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
                },
            }
        );
    }
}
