// scripts/seed-admin.js
// Run with: node scripts/seed-admin.js [username] [password] [fullname]
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

// 1. Read .env file
function loadEnv() {
  const envPath = path.resolve(__dirname, '../.env');
  if (!fs.existsSync(envPath)) {
    console.error('❌ .env file not found at:', envPath);
    process.exit(1);
  }
  const content = fs.readFileSync(envPath, 'utf-8');
  const env = {};
  for (const line of content.split('\n')) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const [key, ...values] = trimmed.split('=');
    if (key && values.length > 0) {
      env[key.trim()] = values.join('=').trim().replace(/^["']|["']$/g, '');
    }
  }
  return env;
}

const env = loadEnv();
const SUPABASE_URL = env.EXPO_PUBLIC_SUPABASE_URL || process.env.EXPO_PUBLIC_SUPABASE_URL;
const SUPABASE_KEY = env.EXPO_PUBLIC_SUPABASE_KEY || process.env.EXPO_PUBLIC_SUPABASE_KEY;

if (!SUPABASE_URL || !SUPABASE_KEY) {
  console.error('❌ Missing EXPO_PUBLIC_SUPABASE_URL or EXPO_PUBLIC_SUPABASE_KEY in .env');
  process.exit(1);
}

// 2. Hash password consistently (SHA-256 with salt)
function hashPassword(password) {
  return crypto.createHash('sha256').update(password + '_eventdesk_salt_2026').digest('hex');
}

// 3. Supabase REST API helper
async function supabaseRequest(endpoint, method = 'GET', body = null) {
  const url = `${SUPABASE_URL}/rest/v1/${endpoint}`;
  const headers = {
    'apikey': SUPABASE_KEY,
    'Authorization': `Bearer ${SUPABASE_KEY}`,
    'Content-Type': 'application/json',
    'Prefer': 'return=representation',
  };

  const response = await fetch(url, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });

  const text = await response.text();
  let data;
  try {
    data = JSON.parse(text);
  } catch {
    data = text;
  }

  if (!response.ok) {
    throw new Error(`Supabase request failed [${response.status}]: ${JSON.stringify(data)}`);
  }
  return data;
}

async function main() {
  const username = (process.argv[2] || 'admin').trim().toLowerCase();
  const password = process.argv[3] || 'Admin123!';
  const fullName = process.argv[4] || 'Super Administrator';

  console.log('🚀 Seeding Super Admin user into Supabase...');
  console.log(`   Username: ${username}`);
  console.log(`   Password: ${password}`);
  console.log(`   Full Name: ${fullName}`);
  console.log(`   Supabase URL: ${SUPABASE_URL}\n`);

  const passwordHash = hashPassword(password);

  try {
    // Check if user exists
    const existing = await supabaseRequest(`app_users?username=eq.${username}&select=*`);
    
    if (existing && existing.length > 0) {
      console.log(`⚠️ User "${username}" already exists. Updating password and role to superadmin...`);
      const updated = await supabaseRequest(`app_users?username=eq.${username}`, 'PATCH', {
        password_hash: passwordHash,
        role: 'superadmin',
        full_name: fullName,
        is_active: true,
        updated_at: new Date().toISOString()
      });
      console.log('✅ Super Admin user updated successfully!', updated);
    } else {
      console.log(`✨ Creating new Super Admin user "${username}"...`);
      const created = await supabaseRequest('app_users', 'POST', {
        username: username,
        password_hash: passwordHash,
        full_name: fullName,
        role: 'superadmin',
        is_active: true
      });
      console.log('✅ Super Admin user created successfully!', created);
    }

    console.log('\n🎉 Super Admin setup complete! You can now log into Event-Desk with:');
    console.log(`   Username: ${username}`);
    console.log(`   Password: ${password}\n`);
  } catch (err) {
    console.error('❌ Error seeding user:', err.message);
    console.log('\n💡 Tip: If the table "app_users" does not exist yet, please run "supabase-schema.sql" in your Supabase SQL Editor first!');
  }
}

main();
