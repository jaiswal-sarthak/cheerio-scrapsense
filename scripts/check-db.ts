import { createClient } from "@supabase/supabase-js";
import dotenv from "dotenv";

dotenv.config();

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
    console.error("Missing Supabase environment variables.");
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

function parseJwt(token: string) {
    try {
        return JSON.parse(atob(token.split('.')[1]));
    } catch (e) {
        return null;
    }
}

const decoded = parseJwt(supabaseKey);
console.log("Supabase URL:", supabaseUrl);
console.log("Key Role:", decoded ? decoded.role : "Invalid JWT");

async function checkTables() {
    console.log("Checking database connection...");

    // Try to select from 'users' table
    const { data: users, error: usersError } = await supabase
        .from("users")
        .select("*");

    if (usersError) {
        console.error("Error accessing 'users' table:", JSON.stringify(usersError, null, 2));
    } else {
        console.log("'users' table found. Count:", users ? users.length : 0);
    }

    // Try to select from 'sessions' table
    const { data: sessions, error: sessionsError } = await supabase
        .from("sessions")
        .select("*")
        .limit(1);

    if (sessionsError) {
        console.error("Error accessing 'sessions' table:", JSON.stringify(sessionsError, null, 2));
    } else {
        console.log("'sessions' table found.");
    }

    // Try to select from 'accounts' table
    const { data: accounts, error: accountsError } = await supabase
        .from("accounts")
        .select("*")
        .limit(1);

    if (accountsError) {
        console.error("Error accessing 'accounts' table:", JSON.stringify(accountsError, null, 2));
    } else {
        console.log("'accounts' table found.");
    }
}

checkTables();
