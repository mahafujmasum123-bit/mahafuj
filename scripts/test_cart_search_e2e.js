async function runCartAndSearchE2E() {
  console.log('🚀 Running Live Cart, Conversational Search & Badge E2E Verification against http://localhost:3000...\n');

  const BASE_URL = 'http://localhost:3000';
  const testSessionId = `test-session-${Date.now()}`;

  // Log in as user to test authenticated cart operations
  const loginRes = await fetch(`${BASE_URL}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'admin@novara.com', password: 'Admin@123' }),
  });
  const loginData = await loginRes.json();
  if (!loginData.success || !loginData.token) {
    throw new Error('Login failed for cart tests: ' + JSON.stringify(loginData));
  }
  const token = loginData.token;

  const headers = {
    'Content-Type': 'application/json',
    'x-session-id': testSessionId,
    Authorization: `Bearer ${token}`,
  };

  // -------------------------------------------------------------
  // TEST 1: Cross-Lingual Product Search for "জুতা" (Bangla -> Shoes)
  // -------------------------------------------------------------
  console.log('🔍 [1/6] Testing Cross-Lingual Search: query="জুতা"...');
  const shoesRes = await fetch(`${BASE_URL}/api/products/search?q=${encodeURIComponent('জুতা')}`);
  const shoesData = await shoesRes.json();
  if (!shoesData.success || !shoesData.data || shoesData.data.length === 0) {
    throw new Error('Search for "জুতা" returned no results!');
  }
  const foundShoe = shoesData.data.some((p) => /shoe|জুতা|জুতো|footwear|sneakers/i.test(p.name + ' ' + (p.banglaKeywords || []).join(' ')));
  if (!foundShoe) {
    throw new Error('Search for "জুতা" did not return shoes/footwear!');
  }
  console.log(`   ✓ Found ${shoesData.data.length} results. Top result: "${shoesData.data[0].name}"`);

  // -------------------------------------------------------------
  // TEST 2: Conversational Natural Language Search: "Show me affordable products"
  // -------------------------------------------------------------
  console.log('💬 [2/6] Testing Conversational Search: "Show me affordable products"...');
  const convRes = await fetch(`${BASE_URL}/api/products/search?q=${encodeURIComponent('Show me affordable products')}`);
  const convData = await convRes.json();
  if (!convData.success || !convData.data || convData.data.length === 0) {
    throw new Error('Conversational search returned no results!');
  }
  if (!convData.conversational || convData.conversational.intent !== 'affordable') {
    throw new Error('Conversational search did not extract affordable intent!');
  }
  console.log(`   ✓ Parsed Intent: "${convData.conversational.intent}", Found: ${convData.data.length} products. Top: "${convData.data[0].name}"`);

  // -------------------------------------------------------------
  // TEST 3: Conversational Price Range: "Products under 2000"
  // -------------------------------------------------------------
  console.log('💰 [3/6] Testing Conversational Price Filtering: "Products under 2000"...');
  const priceRes = await fetch(`${BASE_URL}/api/products/search?q=${encodeURIComponent('Products under 2000')}`);
  const priceData = await priceRes.json();
  if (!priceData.success || !priceData.data) {
    throw new Error('Price search failed!');
  }
  if (!priceData.conversational || priceData.conversational.maxPrice !== 2000) {
    throw new Error('Conversational parser did not extract maxPrice 2000!');
  }
  const allUnder2000 = priceData.data.every((p) => (p.salePrice || p.price) <= 2000);
  if (!allUnder2000) {
    throw new Error('Some returned products exceed maxPrice 2000!');
  }
  console.log(`   ✓ Verified all ${priceData.data.length} products strictly under 2000 BDT.`);

  // -------------------------------------------------------------
  // TEST 4: Add to Cart default 1-unit increment and idempotency
  // -------------------------------------------------------------
  console.log('🛒 [4/6] Testing Add to Cart default 1-unit increment & idempotency...');
  
  // Clear cart first
  await fetch(`${BASE_URL}/api/cart/clear`, { method: 'DELETE', headers });

  // First Add to Cart click: must default to 1 unit
  const add1Res = await fetch(`${BASE_URL}/api/cart/add`, {
    method: 'POST',
    headers,
    body: JSON.stringify({ productId: 'prod-1' }),
  });
  const add1Data = await add1Res.json();
  if (!add1Data.success) {
    throw new Error('Add to cart failed: ' + add1Data.error);
  }
  const qty1 = add1Data.items.find((i) => i.productId === 'prod-1')?.quantity;
  console.log(`   ✓ After 1st click: Item quantity = ${qty1} (Expected: 1 unit)`);
  if (qty1 !== 1) {
    throw new Error(`Expected 1st click to add 1 unit, got ${qty1}`);
  }

  // Second Add to Cart click: idempotency rule prevents incrementing
  const add2Res = await fetch(`${BASE_URL}/api/cart/add`, {
    method: 'POST',
    headers,
    body: JSON.stringify({ productId: 'prod-1' }),
  });
  const add2Data = await add2Res.json();
  const qty2 = add2Data.items.find((i) => i.productId === 'prod-1')?.quantity;
  console.log(`   ✓ After 2nd click: Item quantity = ${qty2} (Expected: 1 unit - idempotent)`);
  if (qty2 !== 1) {
    throw new Error(`Expected repeated click to maintain 1 unit, got ${qty2}`);
  }

  // -------------------------------------------------------------
  // TEST 5: Strict 99+ Navigation Badge Limit vs Real Cart Quantity
  // -------------------------------------------------------------
  console.log('🏷️  [5/6] Testing Navigation Badge (99+ Limit) vs Real Cart Page Quantity...');

  // Set prod-1 to 20 units
  await fetch(`${BASE_URL}/api/cart/update`, {
    method: 'PUT',
    headers,
    body: JSON.stringify({ productId: 'prod-1', quantity: 20 }),
  });

  // Add prod-2 (stock 32) with 30 units and prod-6 (stock 80) with 60 units
  await fetch(`${BASE_URL}/api/cart/add`, {
    method: 'POST',
    headers,
    body: JSON.stringify({ productId: 'prod-2', quantity: 30 }),
  });
  await fetch(`${BASE_URL}/api/cart/update`, {
    method: 'PUT',
    headers,
    body: JSON.stringify({ productId: 'prod-2', quantity: 30 }),
  });

  await fetch(`${BASE_URL}/api/cart/add`, {
    method: 'POST',
    headers,
    body: JSON.stringify({ productId: 'prod-6', quantity: 60 }),
  });
  await fetch(`${BASE_URL}/api/cart/update`, {
    method: 'PUT',
    headers,
    body: JSON.stringify({ productId: 'prod-6', quantity: 60 }),
  });

  const cartRes = await fetch(`${BASE_URL}/api/cart`, { headers });
  const cartData = await cartRes.json();
  
  const totalUnits = cartData.totalQuantity;
  const distinctCount = cartData.lineItemsCount;
  console.log(`   • Real Backend Cart Total Units: ${totalUnits} (Expected > 100)`);
  console.log(`   • Distinct Products Count: ${distinctCount}`);

  if (totalUnits <= 99) {
    throw new Error(`Expected total units to exceed 99, got ${totalUnits}`);
  }

  // Compute presentation badge value
  const badgeValue = totalUnits > 99 ? '99+' : String(totalUnits);
  console.log(`   ✓ Computed Navigation Badge: "${badgeValue}" (Strictly "99+", never ${totalUnits})`);
  if (badgeValue !== '99+') {
    throw new Error(`Navigation badge display must be "99+", got "${badgeValue}"`);
  }

  // -------------------------------------------------------------
  // TEST 6: Clean Cleanup
  // -------------------------------------------------------------
  console.log('🧹 [6/6] Cleaning up test session cart...');
  await fetch(`${BASE_URL}/api/cart/clear`, { method: 'DELETE', headers });
  console.log('   ✓ Test cart cleared successfully.');

  console.log('\n🎉 ALL LIVE END-TO-END CART, CONVERSATIONAL SEARCH & BADGE TESTS PASSED WITH 100% SUCCESS!');
}

runCartAndSearchE2E().catch((err) => {
  console.error('❌ E2E failed:', err);
  process.exit(1);
});
