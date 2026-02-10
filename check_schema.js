
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://aqaqtiwiuesmincehxrg.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFxYXF0aXdpdWVzbWluY2VoeHJnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjY3MTAyODksImV4cCI6MjA4MjI4NjI4OX0.Eo0Cdx9VkqYVMB3JfPG35runqISwh43Wi6z6XQJk_dE';

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

async function run() {
    // Login
    await supabase.auth.signInWithPassword({
        email: 'neylor.prof@gmail.com',
        password: '1facil2'
    });

    console.log("Checking Agendamentos column type...");
    // We can't query information_schema easily via JS client rpc unless we have a function.
    // Ensure we can check by selecting 1 row and seeing format.
    const { data, error } = await supabase.from('Agendamentos').select('horario_id').limit(1);

    if (error) {
        console.error("Error selecting Agendamentos:", error);
    } else {
        if (data.length > 0) {
            console.log("Sample horario_id:", data[0].horario_id);
            console.log("Type:", typeof data[0].horario_id);
        } else {
            console.log("No rows in Agendamentos.");
        }
    }
}
run();
