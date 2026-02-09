
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://aqaqtiwiuesmincehxrg.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFxYXF0aXdpdWVzbWluY2VoeHJnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjY3MTAyODksImV4cCI6MjA4MjI4NjI4OX0.Eo0Cdx9VkqYVMB3JfPG35runqISwh43Wi6z6XQJk_dE';

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkPolicies() {
    console.log('Fetching policies...');
    // Note: Standard Anon users often cannot query pg_policies directly depending on setup.
    // But we can try. If this fails, we might need to use a different approach or assume normal RLS.

    // Actually, we can't query system catalogs via API easily with Anon key usually.
    // But let's try a different approach:
    // We will try to fetch ALL professionals as the admin user.

    const { data: userAuth, error: authError } = await supabase.auth.signInWithPassword({
        email: 'neylor.prof@gmail.com',
        password: '1facil2'
    });

    if (authError) {
        console.error('Auth failed:', authError.message);
        return;
    }

    const userId = userAuth.user.id;
    console.log('Logged in as Admin:', userId);

    // Test 1: Fetch Own Profile (Already done, worked)

    // Test 2: Fetch Escola Settings
    console.log('Test 2: Fetch Escola Settings');
    const { data: escola, error: escolaError } = await supabase.from('Escola').select('*').single();
    if (escolaError) console.error('Escola Fetch Error:', escolaError);
    else console.log('Escola Fetch Success');

    // Test 3: Fetch Other Profiles (to see if Admin has access)
    console.log('Test 3: Fetch All Profissionais (count)');
    const { count, error: countError } = await supabase.from('Profissionais').select('*', { count: 'exact', head: true });
    if (countError) console.error('Profissionais Count Error:', countError);
    else console.log('Profissionais Count:', count);

}

checkPolicies();
