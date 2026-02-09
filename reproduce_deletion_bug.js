
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://aqaqtiwiuesmincehxrg.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFxYXF0aXdpdWVzbWluY2VoeHJnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjY3MTAyODksImV4cCI6MjA4MjI4NjI4OX0.Eo0Cdx9VkqYVMB3JfPG35runqISwh43Wi6z6XQJk_dE';

const supabase = createClient(supabaseUrl, supabaseKey);

// Use a known existing Horario ID (from previous step) and Resource ID.
const HORARIO_ID = 'd8f15fa9-1b4b-44c5-8d98-0d816bec7a61'; // M1 (07:00) likely? Or check description.
// Actually I don't know the exact time of this ID, which matters for "2 hour" test.
// But valid/future deletions shouldn't fail regardless of time if date is tomorrow.

// I need a valid Resource ID and User ID.
// User: I can use the admin user or any user ID. I'll use a hardcoded one if I can find one, or just try to insert and see.
// RLS might block insertion if I'm not authenticated. 
// The reproduction script runs as 'anon' with the key. 'Agendamentos' allows insert for authenticated.
// I need self-signed JWT or use service_role? I don't have service_role.
// But I have the admin credentials: neylor@gmail.com / 1facil2.
// I can sign in!

async function reproduce() {
    console.log('--- Authenticating ---');
    const { data: { session }, error: authError } = await supabase.auth.signInWithPassword({
        email: 'neylor@gmail.com',
        password: '1facil2'
    });

    if (authError) {
        console.error('Auth Failed:', authError);
        return;
    }

    const userId = session.user.id;
    console.log('Logged in as:', userId);

    // 1. Get a Resource ID
    const { data: resources } = await supabase.from('Recursos').select('id').limit(1);
    const resourceId = resources[0].id;
    console.log('Using Resource:', resourceId);

    // 2. Test Case A: Booking NEXT WEEK (Safe to delete)
    // Date: Today + 7 days
    const today = new Date();
    const nextWeek = new Date(today);
    nextWeek.setDate(today.getDate() + 7);
    const nextWeekStr = nextWeek.toISOString().split('T')[0];

    console.log('\n--- Test Case A: Future Booking (Date: ' + nextWeekStr + ') ---');

    // Insert
    const { data: bookingA, error: insertErrorA } = await supabase
        .from('Agendamentos')
        .insert([{
            recurso_id: resourceId,
            horario_id: HORARIO_ID,
            data: nextWeekStr,
            profissional_id: userId,
            created_at: new Date().toISOString()
        }])
        .select()
        .single();

    if (insertErrorA) {
        console.error('Insert A Failed:', insertErrorA);
    } else {
        console.log('Inserted A:', bookingA.id);

        // Delete
        const { error: deleteErrorA } = await supabase
            .from('Agendamentos')
            .delete()
            .eq('id', bookingA.id);

        if (deleteErrorA) {
            console.error('❌ DELETE A FAILED (Should Succeed):', deleteErrorA.message);
        } else {
            console.log('✅ Delete A Succeeded');
        }
    }

    // 3. Test Case B: Booking TODAY (Might fail if within 2h)
    // Use same HORARIO_ID. If it's morning and now is afternoon, it's past -> Fail.
    // If it's evening, might succeed.

}

reproduce();
