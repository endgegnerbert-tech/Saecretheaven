
import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';

// Load env vars manually to avoid dependencies
const envPath = path.resolve(process.cwd(), '.env.local');
if (fs.existsSync(envPath)) {
    const envConfig = fs.readFileSync(envPath, 'utf8');
    envConfig.split('\n').forEach((line) => {
        const [key, value] = line.split('=');
        if (key && value) {
            process.env[key.trim()] = value.trim();
        }
    });
}

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!; // Must use Service Role Key for deletion

if (!supabaseServiceKey) {
    console.error('Error: SUPABASE_SERVICE_ROLE_KEY is required in .env.local to run this script.');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function wipeProject() {
    console.log('⚠️  STARTING CLEAN SLATE PROTOCOL ⚠️');
    console.log('Target:', supabaseUrl);

    // 1. Truncate Tables
    console.log('1. Cleaning Database Tables...');
    const { error: dbError } = await supabase.from('photos_metadata').delete().neq('id', '00000000-0000-0000-0000-000000000000'); // Delete all
    if (dbError) console.error('Error cleaning photos_metadata:', dbError);

    const { error: deviceError } = await supabase.from('devices').delete().neq('id', '00000000-0000-0000-0000-000000000000');
    if (deviceError) console.error('Error cleaning devices:', deviceError);

    // 2. Empty Storage Bucket
    console.log('2. Emptying Storage Bucket "vault"...');
    const { data: files, error: listError } = await supabase.storage.from('vault').list();

    if (listError) {
        console.error('Error listing files:', listError);
    } else if (files && files.length > 0) {
        const paths = files.map(f => f.name);
        // Note: This only deletes root files. For deeper cleaning, this script needs expansion,
        // but for the immediate test case (flat structure or deviceId folders), we attempt root delete.
        // If folders are returned, map them. 
        // Supabase list returns folders as well.

        // Attempt delete
        if (paths.length > 0) {
            const { error: deleteError } = await supabase.storage.from('vault').remove(paths);
            if (deleteError) console.error('Error deleting files:', deleteError);
            else console.log(`Deleted ${paths.length} items from storage.`);
        }
    }

    console.log('✅ Clean Slate Complete. Database should be empty.');
}

wipeProject();
