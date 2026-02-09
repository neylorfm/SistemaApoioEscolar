
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://aqaqtiwiuesmincehxrg.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFxYXF0aXdpdWVzbWluY2VoeHJnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjY3MTAyODksImV4cCI6MjA4MjI4NjI4OX0.Eo0Cdx9VkqYVMB3JfPG35runqISwh43Wi6z6XQJk_dE';

const supabase = createClient(supabaseUrl, supabaseKey);

// Use a known existing Horario ID (from previous step) and Resource ID.
const HORARIO_ID = 'd8f15fa9-1b4b-44c5-8d98-0d816bec7a61';

async function reproduceAutoPromotionBug() {
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

    // 1b. Get Turma and Disciplina (Required constraints)
    const { data: turmas } = await supabase.from('Turmas').select('id').limit(1);
    const turmaId = turmas[0].id;

    const { data: disciplinas } = await supabase.from('Disciplinas').select('id').limit(1);
    const disciplinaId = disciplinas[0].id;

    console.log('Using Resource:', resourceId);

    // 2. Setup Scenario:
    // - Booking X exists for NEXT WEEK (owned by User A - me)
    // - Pre-Booking Y exists for same slot (owned by User B? Or me?)
    // - Delete Booking X -> Trigger Auto-Promotion -> Pre-Booking Y becomes Booking Y.

    // Date: Today + 14 days (ensure no conflicts)
    const today = new Date();
    const nextWeek = new Date(today);
    nextWeek.setDate(today.getDate() + 14);
    const targetDateStr = nextWeek.toISOString().split('T')[0];

    console.log(`\n--- Test Case: Delete Booking with Pending Pre-Booking (Date: ${targetDateStr}) ---`);

    // 2.1 Create Booking X
    const { data: bookingX, error: insertErrorX } = await supabase
        .from('Agendamentos')
        .insert([{
            recurso_id: resourceId,
            horario_id: HORARIO_ID,
            data: targetDateStr,
            profissional_id: userId,
            turma_id: turmaId,
            disciplina_id: disciplinaId,
            descricao: 'Booking to be deleted',
            created_at: new Date().toISOString()
        }])
        .select()
        .single();

    if (insertErrorX) {
        console.error('Insert Booking X Failed:', insertErrorX);
        return;
    }
    console.log('Inserted Booking X:', bookingX.id);

    // 2.2 Create Pre-Booking Y (Same user for simplicity, or different if needed)
    // Auto-promotion promotes the highest ranked.
    const { data: preBookingY, error: insertErrorY } = await supabase
        .from('PreReservas')
        .insert([{
            recurso_id: resourceId,
            horario_id: HORARIO_ID,
            data: targetDateStr,
            profissional_id: userId, // Same user
            turma_id: turmaId,
            disciplina_id: disciplinaId,
            status: 'pending'
        }])
        .select()
        .single();

    if (insertErrorY) {
        console.error('Insert Pre-Booking Y Failed:', insertErrorY);
        // Cleanup X
        await supabase.from('Agendamentos').delete().eq('id', bookingX.id);
        return;
    }
    console.log('Inserted Pre-Booking Y:', preBookingY.id);

    // 3. Delete Booking X
    console.log('Attempting to delete Booking X...');
    const { error: deleteErrorX } = await supabase
        .from('Agendamentos')
        .delete()
        .eq('id', bookingX.id);

    if (deleteErrorX) {
        console.error('❌ DELETE FAILED:', deleteErrorX);
    } else {
        console.log('✅ Delete Succeeded');
        // Check if Pre-Booking Y became Booking Y
        const { data: newBooking } = await supabase
            .from('Agendamentos')
            .select('*')
            .eq('recurso_id', resourceId)
            .eq('horario_id', HORARIO_ID)
            .eq('data', targetDateStr)
            .eq('descricao', 'Promovido Automaticamente (Fila de Espera)')
            .single();

        if (newBooking) {
            console.log('✅ Auto-Promotion Verified:', newBooking.id);
            // Cleanup New Booking
            await supabase.from('Agendamentos').delete().eq('id', newBooking.id);
        } else {
            console.error('❌ Auto-Promotion NOT found');
            // Check if pre-booking status changed?
        }
    }

    // Cleanup Pre-Booking Y if still exists (it should be 'won' or deleted? Logic sets status='won')
    if (preBookingY) await supabase.from('PreReservas').delete().eq('id', preBookingY.id);
}

reproduceAutoPromotionBug();
