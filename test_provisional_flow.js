
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://aqaqtiwiuesmincehxrg.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFxYXF0aXdpdWVzbWluY2VoeHJnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjY3MTAyODksImV4cCI6MjA4MjI4NjI4OX0.Eo0Cdx9VkqYVMB3JfPG35runqISwh43Wi6z6XQJk_dE';

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

async function run() {
    console.log("Verificando Fluxo de Consolidação em 2 Fases...");

    // 1. Login
    const { error: authError } = await supabase.auth.signInWithPassword({
        email: 'neylor.prof@gmail.com',
        password: '1facil2'
    });
    if (authError) {
        console.error("Erro no Login:", authError);
        return;
    }

    // 2. Get Resource and Professionals
    const { data: resources, error: resError } = await supabase.from('Recursos').select('id').limit(1);
    if (resError || !resources || resources.length === 0) {
        console.error("Erro ao buscar recursos:", resError);
        return;
    }
    const resourceId = resources[0].id;

    // We need 2 distinct professionals
    const { data: pros } = await supabase.from('Profissionais').select('id').limit(2);
    if (pros.length < 2) {
        console.error("Need at least 2 professionals to test ranking.");
        return;
    }
    const p1 = pros[0].id;
    const p2 = pros[1].id;

    // 3. Get Valid Slot (UUID)
    let testSlot = null;
    const { data: slots } = await supabase.from('Agendamentos').select('horario_id').limit(1);

    if (slots && slots.length > 0) {
        testSlot = slots[0].horario_id;
        console.log("Usando Slot UUID existente (Agendamentos):", testSlot);
    } else {
        const { data: hSlots } = await supabase.from('Horarios').select('id').limit(1);
        if (hSlots && hSlots.length > 0) {
            testSlot = hSlots[0].id;
            console.log("Usando Slot UUID existente (Horarios):", testSlot);
        } else {
            console.error("Não foi possível encontrar um Slot ID válido (UUID).");
            return;
        }
    }

    // 4. Get Valid Turma and Disciplina
    const { data: turmas } = await supabase.from('Turmas').select('id').limit(1);
    const { data: disciplinas } = await supabase.from('Disciplinas').select('id').limit(1);

    if (!turmas?.length || !disciplinas?.length) {
        console.error("Precisa de Turmas e Disciplinas cadastradas para testar.");
        return;
    }
    const turmaId = turmas[0].id;
    const disciplinaId = disciplinas[0].id;

    const testDate = '2026-06-01'; // Future date
    console.log(`Test Date: ${testDate}, Slot: ${testSlot}, Res: ${resourceId}, Turma: ${turmaId}, Disc: ${disciplinaId}`);

    // 5. Cleanup & Insert
    // Clean up
    await supabase.from('PreReservas').delete().match({ recurso_id: resourceId, data: testDate, horario_id: testSlot });
    await supabase.from('Agendamentos').delete().match({ recurso_id: resourceId, data: testDate, horario_id: testSlot });

    // Insert 2 PreReservas
    console.log("Inserindo 2 Pré-Reservas...");
    const { error: insError } = await supabase.from('PreReservas').insert([
        {
            recurso_id: resourceId,
            horario_id: testSlot,
            data: testDate,
            profissional_id: p1,
            status: 'pending',
            created_at: new Date(Date.now() - 10000),
            turma_id: turmaId,
            disciplina_id: disciplinaId
        },
        {
            recurso_id: resourceId,
            horario_id: testSlot,
            data: testDate,
            profissional_id: p2,
            status: 'pending',
            created_at: new Date(),
            turma_id: turmaId,
            disciplina_id: disciplinaId
        }
    ]);
    if (insError) console.error("Erro ao inserir:", insError);

    // 6. Simulate Friday 5 AM (Calculate Provisional)
    console.log("Simulando Sexta 5:00 AM (calculate_provisional_winners)...");
    const { error: rpcError } = await supabase.rpc('calculate_provisional_winners', {
        p_recurso_id: resourceId,
        p_start_date: testDate,
        p_end_date: testDate
    });
    if (rpcError) console.error("RPC Error:", rpcError);

    // Verify Status
    const { data: results1 } = await supabase.from('PreReservas').select('profissional_id, status').match({ recurso_id: resourceId, data: testDate, horario_id: testSlot });
    console.log("Status após 5AM:", results1);

    const winner = results1.find(r => r.status === 'won_provisional');
    const loser = results1.find(r => r.status === 'lost_provisional');

    if (winner && winner.profissional_id === p1 && loser) {
        console.log("✅ Passo 1 Sucesso: Vencedor definido provisoriamente.");
    } else {
        console.error("❌ Passo 1 Falha: Definição incorreta.", results1);
    }

    // 7. Simulate Cancellation of Winner (Friday 8 AM)
    console.log("Simulando Cancelamento do Vencedor...");
    const { error: delError } = await supabase.from('PreReservas').delete().match({ recurso_id: resourceId, data: testDate, horario_id: testSlot, profissional_id: p1 });
    if (delError) console.error("Erro ao deletar:", delError);

    // Verify Promotion
    const { data: results2 } = await supabase.from('PreReservas').select('profissional_id, status').match({ recurso_id: resourceId, data: testDate, horario_id: testSlot });
    console.log("Status após Cancelamento:", results2);

    if (results2.length === 1 && results2[0].status === 'won_provisional' && results2[0].profissional_id === p2) {
        console.log("✅ Passo 2 Sucesso: Segundo lugar promovido automaticamente.");
    } else {
        console.error("❌ Passo 2 Falha: Promoção não ocorreu.", results2);
    }

    // 8. Simulate Friday 12 PM (Confirm)
    console.log("Simulando Sexta 12:00 PM (confirm_provisional_winners)...");
    const { error: confirmError } = await supabase.rpc('confirm_provisional_winners', { p_recurso_id: resourceId });
    if (confirmError) console.error("Erro confirm_provisional_winners:", confirmError);

    // Verify Agendamentos
    const { data: bookings, error: bookingsError } = await supabase.from('Agendamentos').select('*').match({ recurso_id: resourceId, data: testDate, horario_id: testSlot });

    if (bookingsError) {
        console.error("Erro ao buscar agendamentos:", bookingsError);
    } else {
        console.log("Agendamentos Confirmados:", bookings?.length);

        if (bookings && bookings.length === 1 && bookings[0].profissional_id === p2) {
            console.log("✅ Passo 3 Sucesso: Agendamento confirmado na tabela final.");
        } else {
            console.error("❌ Passo 3 Falha: Agendamento não criado.");
        }
    }

    // Cleanup
    console.log("Limpeza final...");
    await supabase.from('PreReservas').delete().match({ recurso_id: resourceId, data: testDate, horario_id: testSlot });
    await supabase.from('Agendamentos').delete().match({ recurso_id: resourceId, data: testDate, horario_id: testSlot });
}

run();
