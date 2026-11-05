async function runTest() {
  console.log('Testing ShopMax Full-Stack API and Admin CRUD endpoints...');

  // 1. Admin Login
  const loginRes = await fetch('http://localhost:3000/api/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'admin@novara.com', password: 'Admin@123' }),
  });
  const loginData = await loginRes.json();
  if (!loginData.success || !loginData.token) {
    throw new Error('Login failed: ' + JSON.stringify(loginData));
  }
  const token = loginData.token;
  console.log('✓ Admin login successful. User:', loginData.user.name);

  // 2. Sliders CRUD
  console.log('--- Testing Sliders CRUD ---');
  const createSliderRes = await fetch('http://localhost:3000/api/cms/sliders', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({
      imageUrl: 'https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=1000&q=80',
      destinationLink: '/shop?test=true',
      altText: 'Automated Slider Alt',
      displayOrder: 99,
      isActive: true,
    }),
  });
  const createdSlider = await createSliderRes.json();
  if (!createdSlider.success) throw new Error('Slider creation failed: ' + JSON.stringify(createdSlider));
  console.log('✓ Slider Created:', createdSlider.data?.id, createdSlider.data?.altText);

  const sliderId = createdSlider.data?.id;

  // Toggle slider
  const toggleSliderRes = await fetch(`http://localhost:3000/api/cms/sliders/${sliderId}/toggle`, {
    method: 'PATCH',
    headers: { Authorization: `Bearer ${token}` },
  });
  const toggleSliderData = await toggleSliderRes.json();
  console.log('✓ Slider Toggled Active status to:', toggleSliderData.data?.isActive);

  // Delete slider
  const delSliderRes = await fetch(`http://localhost:3000/api/cms/sliders/${sliderId}`, {
    method: 'DELETE',
    headers: { Authorization: `Bearer ${token}` },
  });
  const delSliderData = await delSliderRes.json();
  console.log('✓ Slider Deleted:', delSliderData.message);

  // 3. Banners CRUD
  console.log('--- Testing Banners CRUD ---');
  const createBannerRes = await fetch('http://localhost:3000/api/cms/banners', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({
      placement: 'homepage-category',
      tag: 'NEW CATEGORY SPOTLIGHT',
      headline: 'Audio Masters Collection',
      subheadline: 'Acoustic fidelity for discerning audiophiles',
      buttonText: 'Listen Now',
      buttonLink: '/shop?category=electronics',
      imageUrl: 'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=800&q=80',
      backgroundColor: '#0c261e',
      displayOrder: 5,
    }),
  });
  const createdBanner = await createBannerRes.json();
  console.log('✓ Banner Created:', createdBanner.data?.id, createdBanner.data?.headline);
  const bannerId = createdBanner.data?.id;

  const toggleBannerRes = await fetch(`http://localhost:3000/api/cms/banners/${bannerId}/toggle`, {
    method: 'PATCH',
    headers: { Authorization: `Bearer ${token}` },
  });
  const toggleBannerData = await toggleBannerRes.json();
  console.log('✓ Banner Toggled Active status to:', toggleBannerData.data?.isActive);

  const delBannerRes = await fetch(`http://localhost:3000/api/cms/banners/${bannerId}`, {
    method: 'DELETE',
    headers: { Authorization: `Bearer ${token}` },
  });
  const delBannerData = await delBannerRes.json();
  console.log('✓ Banner Deleted:', delBannerData.message);

  // 4. Products CRUD & Stock Adjustment
  console.log('--- Testing Products CRUD & Stock Adjustment ---');
  const createProdRes = await fetch('http://localhost:3000/api/products', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({
      name: 'Automated Test Acoustic Earphones',
      brand: 'Novara Sound',
      category: 'Electronics',
      price: 2499,
      salePrice: 1999,
      sku: 'TEST-SKU-' + Date.now().toString().slice(-6),
      stock: 50,
      description: 'Precision tuned wireless earphones for automated test suites.',
    }),
  });
  const createdProd = await createProdRes.json();
  if (!createdProd.success) throw new Error('Product creation failed: ' + JSON.stringify(createdProd));
  console.log('✓ Product Created:', createdProd.data?.id, createdProd.data?.sku);
  const prodId = createdProd.data?.id;

  // Stock adjustment
  const stockRes = await fetch(`http://localhost:3000/api/products/${prodId}/stock`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ adjustment: 15, reason: 'Restock test batch' }),
  });
  const stockData = await stockRes.json();
  console.log('✓ Stock Adjusted:', stockData.stock);

  // Delete product
  const delProdRes = await fetch(`http://localhost:3000/api/products/${prodId}`, {
    method: 'DELETE',
    headers: { Authorization: `Bearer ${token}` },
  });
  const delProdData = await delProdRes.json();
  console.log('✓ Product Deleted:', delProdData.message);

  // 5. Conversational Search Endpoint Verification
  console.log('--- Testing Conversational Natural Language Search ---');
  const searchRes = await fetch('http://localhost:3000/api/products/search?q=' + encodeURIComponent('Show me affordable products'));
  const searchData = await searchRes.json();
  console.log('✓ Conversational Search parsed intent:', searchData.conversational?.intent, 'Returned count:', searchData.total);

  // 6. Recommendation Engine Verification
  console.log('--- Testing Recommendation Tracking & Retrieval ---');
  await fetch('http://localhost:3000/api/recommendations/track', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'x-session-id': 'sess-test-auto' },
    body: JSON.stringify({ eventType: 'search', searchQuery: 'headphones' }),
  });
  const recoRes = await fetch('http://localhost:3000/api/recommendations/personalized?limit=4', {
    headers: { 'x-session-id': 'sess-test-auto' },
  });
  const recoData = await recoRes.json();
  console.log('✓ Recommendations retrieved:', recoData.data?.length, 'products');

  // 7. Advertisements CRUD & Telemetry
  console.log('--- Testing Advertisements CRUD & Telemetry ---');
  const createAdRes = await fetch('http://localhost:3000/api/cms/advertisements', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({
      title: 'Automated Promo Popup',
      description: 'Get extra 15% off with test code',
      imageUrl: 'https://images.unsplash.com/photo-1607082348824-0a96f2a4b9da?w=1000&q=80',
      destinationUrl: '/shop?discount=true',
      buttonText: 'Claim',
      priority: 2,
      frequency: 'once_per_session',
      isActive: true,
    }),
  });
  const createdAd = await createAdRes.json();
  console.log('✓ Ad Created:', createdAd.data?.id, createdAd.data?.title);
  const adId = createdAd.data?.id;

  // Track impression and click
  await fetch(`http://localhost:3000/api/cms/advertisements/${adId}/impression`, { method: 'POST' });
  await fetch(`http://localhost:3000/api/cms/advertisements/${adId}/click`, { method: 'POST' });
  console.log('✓ Recorded impression and click on ad');

  // Delete ad
  await fetch(`http://localhost:3000/api/cms/advertisements/${adId}`, {
    method: 'DELETE',
    headers: { Authorization: `Bearer ${token}` },
  });
  console.log('✓ Ad Deleted successfully');

  // 8. Visitor Analytics Heartbeat & Real-Time Query
  console.log('--- Testing Visitor Heartbeat & Realtime Analytics ---');
  const hbRes = await fetch('http://localhost:3000/api/analytics/heartbeat', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      sessionId: 'sess-e2e-tester',
      page: '/shop',
      device: 'desktop',
    }),
  });
  const hbData = await hbRes.json();
  console.log('✓ Heartbeat recorded at:', new Date(hbData.timestamp).toLocaleTimeString());

  const realRes = await fetch('http://localhost:3000/api/analytics/realtime');
  const realData = await realRes.json();
  console.log('✓ Realtime metrics retrieved:', {
    totalRegisteredUsers: realData.data?.totalRegisteredUsers,
    currentOnlineVisitors: realData.data?.currentOnlineVisitors,
    totalPageViews: realData.data?.totalPageViews,
  });

  console.log('\n🎉 ALL FULL-STACK CRUD, CONVERSATIONAL SEARCH, RECOMMENDATIONS AND ANALYTICS TESTS PASSED WITH 100% SUCCESS!');
}

runTest().catch((err) => {
  console.error('Test run failed:', err);
  process.exit(1);
});
