
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://aqaqtiwiuesmincehxrg.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFxYXF0aXdpdWVzbWluY2VoeHJnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjY3MTAyODksImV4cCI6MjA4MjI4NjI4OX0.Eo0Cdx9VkqYVMB3JfPG35runqISwh43Wi6z6XQJk_dE';

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

async function run() {
    console.log("Iniciando simulação de Pré-Reservas (Autenticado)...");

    // 1. Login
    const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
        email: 'neylor.prof@gmail.com',
        password: '1facil2'
    });

    if (authError) {
        console.error("Erro no Login:", authError);
        return;
    }
    console.log("Login realizado com sucesso. User ID:", authData.user.id);

    // 2. List All Resources
    const { data: allResources, error: listError } = await supabase.from('Recursos').select('id, name');
    if (listError) {
        console.error("Erro ao listar recursos:", listError);
        return;
    }

    // 3. Obter ID do Laboratório de Informática
    let labResource = allResources.find(r => r.name.toLowerCase().includes('informática') || r.name.toLowerCase().includes('informatica'));

    if (!labResource) {
        console.warn("Laboratório de Informática não encontrado. Usando o primeiro recurso disponível.");
        labResource = allResources[0];
    }

    if (!labResource) {
        console.error("Nenhum recurso encontrado no banco de dados.");
        return;
    }

    const labId = labResource.id;
    console.log(`Recurso Selecionado: ${labResource.name} (${labId})`);

    // 4. Obter ID do 1º Horário
    const { data: slots, error: slotError } = await supabase
        .from('Horarios')
        .select('id, label, start_time')
        .order('start_time')
        .limit(1);

    if (slotError || !slots.length) {
        console.error("Erro ao encontrar o horário", slotError);
        return;
    }

    const slotId = slots[0].id;
    console.log(`Horário Encontrado: ${slots[0].label} - ${slots[0].start_time} (${slotId})`);

    // 5. Obter Professores
    const { data: teachers, error: teaError } = await supabase
        .from('Profissionais')
        .select('id, nome')
        .eq('tipo', 'Professor');

    if (teaError || !teachers.length) {
        console.error("Erro ao encontrar professores", teaError);
        return;
    }

    console.log(`Encontrados ${teachers.length} professores.`);

    // 6. Criar Pré-Reservas
    const targetDate = '2026-02-17'; // Terça-feira
    const payloads = [];

    for (let i = 0; i < teachers.length; i++) {
        const teacher = teachers[i];
        // OBS: PreReservas table does NOT have turma_id or disciplina_id columns in the current schema.
        // Simulating only with valid columns.

        payloads.push({
            recurso_id: labId,
            horario_id: slotId,
            profissional_id: teacher.id,
            data: targetDate,
            status: 'pending'
        });
    }

    console.log(`Preparando ${payloads.length} pré-reservas...`);

    // Clean previous pending requests for this slot to avoid constraint errors if running multiple times
    const { error: deleteError } = await supabase
        .from('PreReservas')
        .delete()
        .eq('recurso_id', labId)
        .eq('horario_id', slotId)
        .eq('data', targetDate)
        .eq('status', 'pending');

    if (deleteError) console.warn("Erro ao limpar pré-reservas antigas (pode ser ignorado):", deleteError.message);

    const { error: insertError } = await supabase
        .from('PreReservas')
        .insert(payloads);

    if (insertError) {
        console.error("Erro ao inserir pré-reservas:", insertError);
    } else {
        console.log("Sucesso! Pré-reservas criadas.");
    }
}

run();
