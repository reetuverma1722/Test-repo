// test-accounts-api.js
const fetch = require('node-fetch');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });

async function testAccountsAPI() {
  try {
    console.log('Testing /api/accounts endpoint...');
    
    // Create a dummy token for testing
    const dummyToken = 'dummy-token';
    
    // Create a dummy user for the X-User-Data header
    const dummyUser = {
      id: 2, // Use the same user ID as the account we're testing
      name: 'Test User'
    };
    
    // Make the API request
    const response = await fetch('http://localhost:5000/api/accounts', {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${dummyToken}`,
        'X-User-Data': JSON.stringify(dummyUser)
      }
    });
    
    if (!response.ok) {
      throw new Error(`API request failed with status ${response.status}`);
    }
    
    const data = await response.json();
    console.log('API Response:', JSON.stringify(data, null, 2));
    
    // Check if the account "@Reetuqss" is in the response
    const reetuqssAccount = data.data.find(account => account.accountId === '@Reetuqss');
    
    if (reetuqssAccount) {
      console.log('\nFound @Reetuqss account:');
      console.log(JSON.stringify(reetuqssAccount, null, 2));
      console.log('\nBoolean values:');
      console.log(`isPremium: ${reetuqssAccount.isPremium} (${typeof reetuqssAccount.isPremium})`);
      console.log(`isDefault: ${reetuqssAccount.isDefault} (${typeof reetuqssAccount.isDefault})`);
      
      // Verify if the values are correct
      if (reetuqssAccount.isPremium === true && reetuqssAccount.isDefault === true) {
        console.log('\n✅ SUCCESS: Both isPremium and isDefault are true as expected!');
      } else {
        console.log('\n❌ ERROR: Values are not as expected!');
        console.log(`Expected: isPremium=true, isDefault=true`);
        console.log(`Actual: isPremium=${reetuqssAccount.isPremium}, isDefault=${reetuqssAccount.isDefault}`);
      }
    } else {
      console.log('\n❌ ERROR: Account @Reetuqss not found in the response!');
    }
    
  } catch (error) {
    console.error('Error testing API:', error);
  }
}

// Run the function
testAccountsAPI();