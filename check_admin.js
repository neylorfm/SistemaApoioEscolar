
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://aqaqtiwiuesmincehxrg.supabase.co';
// Using the anon key directly. Note: In real scenarios, use process.env but for this diagnostics we hardcode relevant non-sensitive anon key.
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFxYXF0aXdpdWVzbWluY2VoeHJnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjY3MTAyODksImV4cCI6MjA4MjI4NjI4OX0.Eo0Cdx9VkqYVMB3JfPG35runqISwh43Wi6z6XQJk_dE';

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkLogin() {
    console.log('Attempting login...');
    try {
        const { data, error } = await supabase.auth.signInWithPassword({
            email: 'neylor.prof@gmail.com',
            password: '1facil2'
        });

        if (error) {
            console.error('Login Failed:', error.message);
            return;
        }

        const user = data.user;
        console.log('Login Successful!');
        console.log('User ID:', user.id);
        console.log('User Email:', user.email);

        console.log('Checking Profissionais table...');
        const { data: profile, error: profileError } = await supabase
            .from('Profissionais')
            .select('*')
            .eq('id', user.id)
            .single();

        if (profileError) {
            console.error('Error fetching profile:', profileError.message);
            if (profileError.code === 'PGRST116') {
                console.error('Meaning: The query returned no rows. The user exists in Auth but NOT in Profissionais table.');
            }
        } else {
            console.log('Profile found:', profile);
        }

        console.log('Checking Escola settings (session_timeouts)...');
        const { data: escola, error: escolaError } = await supabase
            .from('Escola')
            .select('*')
            .single();

        if (escolaError) {
            console.error('Error fetching Escola:', escolaError.message);
        } else {
            console.log('Escola found. Session Timeouts:', escola.session_timeouts);
        }
    } catch (err) {
        console.error('Unexpected error:', err);
    }
}

checkLogin();
