
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://aqaqtiwiuesmincehxrg.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFxYXF0aXdpdWVzbWluY2VoeHJnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjY3MTAyODksImV4cCI6MjA4MjI4NjI4OX0.Eo0Cdx9VkqYVMB3JfPG35runqISwh43Wi6z6XQJk_dE';

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

async function run() {
    console.log("Verificando Pré-Reservas...");

    // 1. Login
    const { error: authError } = await supabase.auth.signInWithPassword({
        email: 'neylor.prof@gmail.com',
        password: '1facil2'
    });

    if (authError) {
        console.error("Erro no Login:", authError);
        return;
    }

    // 2. List All Resources (to verify name/id)
    const { data: resources } = await supabase.from('Recursos').select('id, name');
    const lab = resources.find(r => r.name.toLowerCase().includes('informática'));
    console.log("Laboratório ID:", lab?.id, "Nome:", lab?.name);

    // 3. Check PreReservas for 2026-02-17
    const targetDate = '2026-02-17';

    const { data: preReservas, error } = await supabase
        .from('PreReservas')
        .select(`
      id,
      data,
      horario_id,
      status,
      recurso_id,
      profissional_id
    `)
        .eq('data', targetDate)
        .eq('recurso_id', lab.id);

    if (error) {
        console.error("Erro ao buscar pré-reservas:", error);
    } else {
        console.log(`Encontradas ${preReservas.length} pré-reservas para ${targetDate}:`);
        console.log(JSON.stringify(preReservas, null, 2));
    }
}

run();
