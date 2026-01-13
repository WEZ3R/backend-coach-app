import axios from 'axios';

async function testAPI() {
  try {
    console.log('🧪 Testing API...\n');

    // Login as coach
    console.log('1. Logging in as coach...');
    const loginResponse = await axios.post('http://localhost:5001/api/auth/login', {
      email: 'marcyrius98@gmail.com',
      password: '123456',
    });

    const token = loginResponse.data.data.token;
    console.log('✅ Logged in successfully');
    console.log('Token:', token.substring(0, 20) + '...');

    // Get coach programs
    console.log('\n2. Fetching coach programs...');
    const programsResponse = await axios.get('http://localhost:5001/api/programs/coach', {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    console.log('✅ Programs response:');
    console.log('Status:', programsResponse.status);
    console.log('Programs count:', programsResponse.data.data.length);

    programsResponse.data.data.forEach((program, index) => {
      console.log(`\nProgram ${index + 1}:`);
      console.log('  ID:', program.id);
      console.log('  Title:', program.title);
      console.log('  Client ID:', program.clientId);
      console.log('  Is Active:', program.isActive);
      console.log('  Sessions:', program.sessions?.length || 0);
    });

  } catch (error) {
    console.error('❌ Error:', error.response?.data || error.message);
  }
}

testAPI();
