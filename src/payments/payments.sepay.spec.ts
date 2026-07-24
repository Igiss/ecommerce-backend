import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { ServiceUnavailableException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PaymentStatus } from '../common/enums/payment-status.enum';
import { OrderStatus } from '../common/enums/order-status.enum';
import { PaymentMethod } from '../database/schemas/order.schema';
import { NotificationsService } from '../notifications/notifications.service';
import { SettingsService } from '../settings/settings.service';
import { PaymentsService } from './payments.service';

const orderId = '507f1f77bcf86cd799439011';

function createOrder() {
  return {
    _id: { toString: () => orderId },
    id: orderId,
    userId: { toString: () => 'user-1' },
    totalAmount: 125000,
    paymentStatus: PaymentStatus.Unpaid,
    orderStatus: OrderStatus.Pending,
    paymentMethod: PaymentMethod.COD,
    transactionCode: '',
    save: async () => undefined,
  };
}

function createService(options: {
  config?: Record<string, string>;
  settings?: {
    bankName: string;
    accountNumber: string;
    accountHolder: string;
  };
}) {
  const order = createOrder();
  const config = options.config || {};
  const paymentUpdates: unknown[] = [];
  const paymentModel = {
    findOneAndUpdate: async (...args: unknown[]) => {
      paymentUpdates.push(args);
      return {};
    },
  };
  const orderModel = {
    findById: () => ({ exec: async () => order }),
    findOne: () => ({ exec: async () => order }),
    find: () => ({ exec: async () => [order] }),
  };
  const configService = {
    get: (key: string) => config[key] || '',
  } as unknown as ConfigService;
  const settingsService = {
    getSepaySettings: async () =>
      options.settings || {
        bankName: '',
        accountNumber: '',
        accountHolder: '',
      },
  } as unknown as SettingsService;

  return {
    order,
    paymentUpdates,
    service: new PaymentsService(
      paymentModel as never,
      orderModel as never,
      configService,
      { create: async () => ({}) } as unknown as NotificationsService,
      settingsService,
    ),
  };
}

describe('PaymentsService SePay integration', () => {
  it('refuses to create a VietQR with missing or legacy recipient details', async () => {
    const { service } = createService({
      settings: {
        bankName: 'MBBank',
        accountNumber: '03888888888',
        accountHolder: 'GIA DUNG 24H',
      },
    });

    await assert.rejects(
      service.createSepayQr('user-1', orderId),
      (error: unknown) =>
        error instanceof ServiceUnavailableException &&
        error.message.includes('bank account'),
    );
  });

  it('creates a VietQR from the resolved linked bank account', async () => {
    const { service } = createService({
      settings: {
        bankName: 'VCB',
        accountNumber: '0071000123456',
        accountHolder: 'NGUYEN VAN A',
      },
    });

    const result = await service.createSepayQr('user-1', orderId);
    const qrUrl = new URL(result.qrUrl);

    assert.equal(result.accountNumber, '0071000123456');
    assert.equal(result.bankName, 'VCB');
    assert.equal(qrUrl.searchParams.get('acc'), '0071000123456');
    assert.equal(qrUrl.searchParams.get('bank'), 'VCB');
    assert.equal(qrUrl.searchParams.get('amount'), '125000');
    assert.equal(qrUrl.searchParams.get('des'), 'DH439011');
  });

  it('uses the official production checkout contract', async () => {
    const { service } = createService({
      config: {
        SEPAY_ENV: 'production',
        SEPAY_MERCHANT_ID: 'TEST_MERCHANT',
        SEPAY_SECRET_KEY: 'TEST_SECRET',
        FRONTEND_URL: 'https://shop.example',
      },
    });

    const result = await service.createSepayCheckout('user-1', orderId);

    assert.equal(result.checkoutURL, 'https://pay.sepay.vn/v1/checkout/init');
    assert.equal(result.checkoutFormfields.merchant, 'TEST_MERCHANT');
    assert.equal(result.checkoutFormfields.operation, 'PURCHASE');
    assert.equal('merchant_id' in result.checkoutFormfields, false);
  });

  it('uses the sandbox checkout host when configured for sandbox', async () => {
    const { service } = createService({
      config: {
        SEPAY_ENV: 'sandbox',
        SEPAY_MERCHANT_ID: 'TEST_MERCHANT',
        SEPAY_SECRET_KEY: 'TEST_SECRET',
        FRONTEND_URL: 'https://shop.example',
      },
    });

    const result = await service.createSepayCheckout('user-1', orderId);

    assert.equal(
      result.checkoutURL,
      'https://pay-sandbox.sepay.vn/v1/checkout/init',
    );
  });

  it('confirms an order from the official Payment Gateway IPN payload', async () => {
    const { order, paymentUpdates, service } = createService({
      config: {
        SEPAY_SECRET_KEY: 'TEST_SECRET',
      },
    });
    const gatewayService = service as unknown as {
      handleSepayIpn(
        payload: Record<string, unknown>,
        secretKeyHeader?: string,
      ): Promise<{ success: boolean; orderId?: string }>;
    };

    const result = await gatewayService.handleSepayIpn(
      {
        timestamp: 1757058220,
        notification_type: 'ORDER_PAID',
        order: {
          order_status: 'CAPTURED',
          order_amount: '125000.00',
          order_invoice_number: 'DH439011',
        },
        transaction: {
          id: 'transaction-id',
          transaction_id: 'provider-transaction-id',
          transaction_status: 'APPROVED',
          transaction_amount: '125000',
          payment_method: 'BANK_TRANSFER',
        },
      },
      'TEST_SECRET',
    );

    assert.equal(result.success, true);
    assert.equal(result.orderId, orderId);
    assert.equal(order.paymentStatus, PaymentStatus.Paid);
    assert.equal(order.orderStatus, OrderStatus.Confirmed);
    assert.equal(paymentUpdates.length, 1);
  });
});
