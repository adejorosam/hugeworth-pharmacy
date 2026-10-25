import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { DataSource } from 'typeorm';
import * as request from 'supertest';
import { AppModule } from '../src/app.module';

describe('Hugeworth PMS (e2e)', () => {
  let app: INestApplication;
  let dataSource: DataSource;

  let adminToken: string;
  let cashierToken: string;
  let pharmacistToken: string;

  const admin = { name: 'Test Admin', email: 'admin@test.hugeworth.local', password: 'AdminPass123' };
  const cashier = { name: 'Test Cashier', email: 'cashier@test.hugeworth.local', password: 'CashierPass123' };
  const pharmacist = { name: 'Test Pharmacist', email: 'pharmacist@test.hugeworth.local', password: 'PharmPass123' };
  const adminPin = '1234';

  function isoDateInDays(days: number): string {
    return new Date(Date.now() + days * 86400000).toISOString().slice(0, 10);
  }
  const nearExpiryDate = isoDateInDays(30); // well within the 1-year block window
  const farExpiryDate = isoDateInDays(365 * 5); // safely outside it

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.useGlobalPipes(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, transform: true }));
    await app.init();

    dataSource = app.get(DataSource);
    // Clean slate every run — this is a disposable test database, never the dev/prod one.
    await dataSource.query(
      'TRUNCATE TABLE staff, product, sale, sale_item, activity_log, customer RESTART IDENTITY CASCADE',
    );

    // Bootstrap the first admin directly via the DB, same as the real seed script would —
    // there is deliberately no public signup endpoint.
    const bcrypt = await import('bcrypt');
    await dataSource.query(
      `INSERT INTO staff (name, email, "passwordHash", "pinHash", role) VALUES ($1, $2, $3, $4, 'admin')`,
      [admin.name, admin.email, await bcrypt.hash(admin.password, 10), await bcrypt.hash(adminPin, 10)],
    );

    const adminLogin = await request(app.getHttpServer())
      .post('/auth/login')
      .send({ email: admin.email, password: admin.password });
    adminToken = adminLogin.body.accessToken;

    await request(app.getHttpServer())
      .post('/staff')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ ...cashier, role: 'cashier' });
    cashierToken = (
      await request(app.getHttpServer()).post('/auth/login').send({ email: cashier.email, password: cashier.password })
    ).body.accessToken;

    await request(app.getHttpServer())
      .post('/staff')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ ...pharmacist, role: 'pharmacist' });
    pharmacistToken = (
      await request(app.getHttpServer())
        .post('/auth/login')
        .send({ email: pharmacist.email, password: pharmacist.password })
    ).body.accessToken;
  });

  afterAll(async () => {
    await app.close();
  });

  async function createProduct(overrides: Record<string, unknown> = {}) {
    const res = await request(app.getHttpServer())
      .post('/inventory')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        name: 'Test Product ' + Math.random().toString(36).slice(2, 8),
        category: 'Analgesics',
        supplier: 'Test Supplier',
        branch: 'ODA Road',
        qty: 100,
        minQty: 10,
        reorderLevel: 20,
        price: 500,
        expiryDate: farExpiryDate,
        ...overrides,
      });
    return res.body;
  }

  describe('Auth', () => {
    it('rejects a wrong password', async () => {
      const res = await request(app.getHttpServer())
        .post('/auth/login')
        .send({ email: admin.email, password: 'wrong-password' });
      expect(res.status).toBe(401);
    });

    it('rejects an unknown email', async () => {
      const res = await request(app.getHttpServer())
        .post('/auth/login')
        .send({ email: 'nobody@test.hugeworth.local', password: 'whatever123' });
      expect(res.status).toBe(401);
    });

    it('issues a working token on correct credentials', async () => {
      const res = await request(app.getHttpServer())
        .post('/auth/login')
        .send({ email: admin.email, password: admin.password });
      expect(res.status).toBe(201);
      expect(res.body.accessToken).toBeTruthy();
      expect(res.body.staff.role).toBe('admin');
    });

    it('rejects requests with no token', async () => {
      const res = await request(app.getHttpServer()).get('/inventory');
      expect(res.status).toBe(401);
    });
  });

  describe('RBAC', () => {
    it('blocks Cashier from Inventory (403)', async () => {
      const res = await request(app.getHttpServer())
        .get('/inventory')
        .set('Authorization', `Bearer ${cashierToken}`);
      expect(res.status).toBe(403);
    });

    it('allows Pharmacist into Inventory', async () => {
      const res = await request(app.getHttpServer())
        .get('/inventory')
        .set('Authorization', `Bearer ${pharmacistToken}`);
      expect(res.status).toBe(200);
    });

    it('blocks Cashier from Staff management', async () => {
      const res = await request(app.getHttpServer())
        .get('/staff')
        .set('Authorization', `Bearer ${cashierToken}`);
      expect(res.status).toBe(403);
    });
  });

  describe('POS: stock protection', () => {
    it('blocks a sale that would oversell stock', async () => {
      const product = await createProduct({ qty: 3 });
      const res = await request(app.getHttpServer())
        .post('/sales')
        .set('Authorization', `Bearer ${cashierToken}`)
        .send({ items: [{ productId: product.id, qty: 5 }] });
      expect(res.status).toBe(400);
      expect(res.body.message).toMatch(/Not enough stock/);
    });

    it('deducts stock exactly on a successful sale', async () => {
      const product = await createProduct({ qty: 20 });
      const res = await request(app.getHttpServer())
        .post('/sales')
        .set('Authorization', `Bearer ${cashierToken}`)
        .send({ items: [{ productId: product.id, qty: 4 }] });
      expect(res.status).toBe(201);

      const after = await request(app.getHttpServer())
        .get(`/inventory/${product.id}`)
        .set('Authorization', `Bearer ${adminToken}`);
      expect(after.body.qty).toBe(16);
    });
  });

  describe('POS: expiry block & override', () => {
    it('blocks a Cashier from selling a near-expiry item, even claiming overrideExpiry', async () => {
      const product = await createProduct({ expiryDate: nearExpiryDate }); // within 1yr of test-run time window
      const res = await request(app.getHttpServer())
        .post('/sales')
        .set('Authorization', `Bearer ${cashierToken}`)
        .send({ items: [{ productId: product.id, qty: 1, overrideExpiry: true }] });
      expect(res.status).toBe(400);
      expect(res.body.message).toMatch(/blocked from sale/);
    });

    it('lets an Admin override the expiry block', async () => {
      const product = await createProduct({ expiryDate: nearExpiryDate });
      const res = await request(app.getHttpServer())
        .post('/sales')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ items: [{ productId: product.id, qty: 1, overrideExpiry: true }] });
      expect(res.status).toBe(201);
    });

    it('still blocks an Admin who does not pass overrideExpiry', async () => {
      const product = await createProduct({ expiryDate: nearExpiryDate });
      const res = await request(app.getHttpServer())
        .post('/sales')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ items: [{ productId: product.id, qty: 1 }] });
      expect(res.status).toBe(400);
    });
  });

  describe('POS: management-controlled discounts', () => {
    it('blocks a Cashier discount with no PIN', async () => {
      const product = await createProduct();
      const res = await request(app.getHttpServer())
        .post('/sales')
        .set('Authorization', `Bearer ${cashierToken}`)
        .send({ items: [{ productId: product.id, qty: 1 }], discountPct: 10 });
      expect(res.status).toBe(400);
      expect(res.body.message).toMatch(/Manager approval/);
    });

    it('blocks a Cashier discount with a wrong PIN', async () => {
      const product = await createProduct();
      const res = await request(app.getHttpServer())
        .post('/sales')
        .set('Authorization', `Bearer ${cashierToken}`)
        .send({ items: [{ productId: product.id, qty: 1 }], discountPct: 10, managerPin: '9999' });
      expect(res.status).toBe(400);
    });

    it('applies the discount when the Cashier supplies a valid Admin PIN', async () => {
      const product = await createProduct({ price: 1000 });
      const res = await request(app.getHttpServer())
        .post('/sales')
        .set('Authorization', `Bearer ${cashierToken}`)
        .send({ items: [{ productId: product.id, qty: 1 }], discountPct: 10, managerPin: adminPin });
      expect(res.status).toBe(201);
      expect(Number(res.body.total)).toBe(900);
      expect(res.body.discountPct).toBe(10);
    });

    it('lets an Admin apply a discount directly, no PIN needed', async () => {
      const product = await createProduct({ price: 1000 });
      const res = await request(app.getHttpServer())
        .post('/sales')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ items: [{ productId: product.id, qty: 1 }], discountPct: 20 });
      expect(res.status).toBe(201);
      expect(Number(res.body.total)).toBe(800);
    });
  });

  describe('Refunds', () => {
    async function makeSale() {
      const product = await createProduct({ qty: 10, price: 500 });
      const sale = await request(app.getHttpServer())
        .post('/sales')
        .set('Authorization', `Bearer ${cashierToken}`)
        .send({ items: [{ productId: product.id, qty: 2 }] });
      return { product, sale: sale.body };
    }

    it('blocks a non-admin refund with no PIN', async () => {
      const { sale } = await makeSale();
      const res = await request(app.getHttpServer())
        .post(`/sales/${sale.invoiceNo}/refund`)
        .set('Authorization', `Bearer ${cashierToken}`)
        .send({});
      expect(res.status).toBe(400);
    });

    it('lets an Admin refund directly and restores stock', async () => {
      const { product, sale } = await makeSale();
      const beforeRefund = await request(app.getHttpServer())
        .get(`/inventory/${product.id}`)
        .set('Authorization', `Bearer ${adminToken}`);
      expect(beforeRefund.body.qty).toBe(8);

      const refund = await request(app.getHttpServer())
        .post(`/sales/${sale.invoiceNo}/refund`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({});
      expect(refund.status).toBe(201);
      expect(refund.body.refunded).toBe(true);

      const afterRefund = await request(app.getHttpServer())
        .get(`/inventory/${product.id}`)
        .set('Authorization', `Bearer ${adminToken}`);
      expect(afterRefund.body.qty).toBe(10);
    });

    it('refuses to refund the same invoice twice', async () => {
      const { sale } = await makeSale();
      await request(app.getHttpServer())
        .post(`/sales/${sale.invoiceNo}/refund`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({});
      const second = await request(app.getHttpServer())
        .post(`/sales/${sale.invoiceNo}/refund`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({});
      expect(second.status).toBe(400);
      expect(second.body.message).toMatch(/already been refunded/);
    });
  });

  describe('Reports: refunded sales must not count as revenue', () => {
    it('excludes a refunded sale from Sales Report revenue/transactions, and counts it as a refund', async () => {
      const product = await createProduct({ qty: 10, price: 500 });
      const sale = await request(app.getHttpServer())
        .post('/sales')
        .set('Authorization', `Bearer ${cashierToken}`)
        .send({ items: [{ productId: product.id, qty: 2 }] });

      const before = await request(app.getHttpServer())
        .get('/reports/sales?period=today')
        .set('Authorization', `Bearer ${adminToken}`);
      const revenueBefore = before.body.revenue;
      const transactionsBefore = before.body.transactions;

      await request(app.getHttpServer())
        .post(`/sales/${sale.body.invoiceNo}/refund`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({});

      const after = await request(app.getHttpServer())
        .get('/reports/sales?period=today')
        .set('Authorization', `Bearer ${adminToken}`);

      // The refunded sale's ₦1000 must drop out of revenue and transactions entirely.
      expect(after.body.revenue).toBe(revenueBefore - 1000);
      expect(after.body.transactions).toBe(transactionsBefore - 1);
      expect(after.body.refundCount).toBeGreaterThanOrEqual(1);
    });

    it('spreads a sale discount proportionally across Top Selling Products so figures reconcile', async () => {
      const product = await createProduct({ qty: 10, price: 1000 });
      const sale = await request(app.getHttpServer())
        .post('/sales')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ items: [{ productId: product.id, qty: 1 }], discountPct: 50 });
      expect(Number(sale.body.total)).toBe(500);

      const report = await request(app.getHttpServer())
        .get('/reports/sales?period=today')
        .set('Authorization', `Bearer ${adminToken}`);
      const line = report.body.topProducts.find((p: { name: string }) => p.name === product.name);
      // At list price this item would show ₦1000 — it must show the discounted ₦500 instead.
      expect(line.revenue).toBe(500);
    });
  });

  describe('Staff safety guards', () => {
    it('refuses to delete the last remaining Admin', async () => {
      // At this point in the suite, `admin` is the only admin account.
      const me = await request(app.getHttpServer())
        .get('/auth/me')
        .set('Authorization', `Bearer ${adminToken}`);

      const res = await request(app.getHttpServer())
        .delete(`/staff/${me.body.id}`)
        .set('Authorization', `Bearer ${adminToken}`);
      expect(res.status).toBe(400);
      expect(res.body.message).toMatch(/at least one/i);
    });

    it('admin-initiated password reset produces a working temp password', async () => {
      const me = await request(app.getHttpServer())
        .get('/auth/me')
        .set('Authorization', `Bearer ${cashierToken}`);

      const reset = await request(app.getHttpServer())
        .patch(`/staff/${me.body.id}/reset-password`)
        .set('Authorization', `Bearer ${adminToken}`);
      expect(reset.status).toBe(200);
      expect(reset.body.tempPassword).toBeTruthy();

      const oldLoginAttempt = await request(app.getHttpServer())
        .post('/auth/login')
        .send({ email: cashier.email, password: cashier.password });
      expect(oldLoginAttempt.status).toBe(401);

      const newLogin = await request(app.getHttpServer())
        .post('/auth/login')
        .send({ email: cashier.email, password: reset.body.tempPassword });
      expect(newLogin.status).toBe(201);
    });
  });

  describe('Customers', () => {
    it('creates a customer and logs a (simulated) reminder', async () => {
      const created = await request(app.getHttpServer())
        .post('/customers')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ name: 'Test Customer', phone: '08000000000', medication: 'Metformin', refillDue: '2026-12-01' });
      expect(created.status).toBe(201);

      const reminded = await request(app.getHttpServer())
        .post(`/customers/${created.body.id}/remind`)
        .set('Authorization', `Bearer ${adminToken}`);
      expect(reminded.status).toBe(201);
      expect(reminded.body.lastReminded).toBeTruthy();
    });
  });
});
