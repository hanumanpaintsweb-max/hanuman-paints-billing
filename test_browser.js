import puppeteer from 'puppeteer';

(async () => {
  const browser = await puppeteer.launch({ headless: "new" });
  const page = await browser.newPage();
  
  page.on('console', msg => console.log('BROWSER LOG:', msg.text()));
  page.on('pageerror', err => console.error('BROWSER ERROR:', err));

  await page.goto('http://localhost:3000/billing', { waitUntil: 'networkidle0' });
  
  // Fill bill form
  await page.type('input[placeholder="Enter name"]', 'Puppeteer Test');
  await page.type('input[placeholder="10 digit number"]', '1234567890');
  
  // Add product
  await page.type('input[placeholder="Search product..."]', 'Primer');
  // Wait for dropdown
  await page.waitForSelector('.product-dropdown li');
  await page.click('.product-dropdown li');
  
  // Enter qty and save
  await page.type('input[type="number"]', '1');
  
  // Click save
  const [saveBtn] = await page.$x("//button[contains(., 'Save Bill')]");
  if (saveBtn) {
    await saveBtn.click();
    console.log("Clicked Save Bill");
  } else {
    console.log("Save Bill button not found");
  }
  
  // Wait a bit for save to complete
  await new Promise(r => setTimeout(r, 3000));
  
  await browser.close();
})();
