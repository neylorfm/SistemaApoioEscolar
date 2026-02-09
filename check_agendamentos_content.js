
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://aqaqtiwiuesmincehxrg.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFxYXF0aXdpdWVzbWluY2VoeHJnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjY3MTAyODksImV4cCI6MjA4MjI4NjI4OX0.Eo0Cdx9VkqYVMB3JfPG35runqISwh43Wi6z6XQJk_dE';

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkAgendamentosContent() {
    const { data, error } = await supabase
        .from('Agendamentos')
        .select('id, horario_id, data')
        .limit(5);

    if (error) {
        console.error('Error:', error);
    } else {
        console.log('Agendamentos Sample:', JSON.stringify(data, null, 2));
    }
}

checkAgendamentosContent();
