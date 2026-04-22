// test-otp.mjs
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
    'https://agybrvoookerqtlntsqd.supabase.co',
    'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFneWJydm9vb2tlcnF0bG50c3FkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjM4NTIxOTYsImV4cCI6MjA3OTQyODE5Nn0.5cWPXJI6dHycpKQMqapQfCRcYSbrLBtINelhiAXwXCU'
)

async function testOTP() {
    const { data, error } = await supabase.auth.signInWithOtp({
        phone: '+918102461935'
    })

    if (error) {
        console.error('❌ Failed:', error.message)
    } else {
        console.log('✅ OTP sent! Check your phone.', data)
    }
}

testOTP()