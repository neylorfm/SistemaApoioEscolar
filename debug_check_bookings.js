import { createClient } from '@supabase/supabase-js';

// Initialize Supabase client
const supabaseUrl = 'https://aqaqtiwiuesmincehxrg.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFxYXF0aXdpdWVzbWluY2VoeHJnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjY3MTAyODksImV4cCI6MjA4MjI4NjI4OX0.Eo0Cdx9VkqYVMB3JfPG35runqISwh43Wi6z6XQJk_dE';

if (!supabaseUrl || !supabaseKey) {
    console.error("Missing env vars");
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkBookings() {
    const recursoId = 'd06a7a66-2b83-4cc8-9c85-86825635d086'; // From user logs
    const startDate = '2026-02-10';
    const endDate = '2026-02-14';

    console.log(`Checking bookings for Resource ${recursoId} from ${startDate} to ${endDate}...`);

    const { data, error } = await supabase
        .from('Agendamentos')
        .select('*')
        .eq('recurso_id', recursoId)
        .gte('data', startDate)
        .lte('data', endDate);

    if (error) {
        console.error("Error:", error);
    } else {
        console.log(`Found ${data.length} bookings.`);
        data.forEach(b => {
            console.log(`- [${b.data}] Slot: ${b.horario_id} | Prof: ${b.profissional_id} | Fixed: ${b.is_fixed}`);
        });
    }
}

checkBookings();
