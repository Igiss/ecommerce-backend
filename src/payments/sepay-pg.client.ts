import * as crypto from 'crypto';

export interface SePayPgClientOptions {
  env?: 'sandbox' | 'production';
  merchant_id: string;
  secret_key: string;
}

export interface OneTimePaymentFieldsOptions {
  payment_method?: 'BANK_TRANSFER' | 'CREDIT_CARD' | 'E_WALLET' | string;
  order_invoice_number: string;
  order_amount: number;
  currency?: string;
  order_description?: string;
  success_url: string;
  error_url?: string;
  cancel_url?: string;
}

export class SePayPgClient {
  private env: 'sandbox' | 'production';
  private merchant_id: string;
  private secret_key: string;

  constructor(options: SePayPgClientOptions) {
    this.env = options.env || 'sandbox';
    this.merchant_id = options.merchant_id;
    this.secret_key = options.secret_key;
  }

  public get checkout() {
    return {
      initCheckoutUrl: (): string => {
        return this.env === 'production'
          ? 'https://pg.sepay.vn/checkout'
          : 'https://sandbox.sepay.vn/payment/init';
      },
      initOneTimePaymentFields: (options: OneTimePaymentFieldsOptions): Record<string, string | number> => {
        const fields: Record<string, string | number> = {
          merchant_id: this.merchant_id,
          payment_method: options.payment_method || 'BANK_TRANSFER',
          order_invoice_number: options.order_invoice_number,
          order_amount: options.order_amount,
          currency: options.currency || 'VND',
          order_description: options.order_description || `Thanh toan don hang ${options.order_invoice_number}`,
          success_url: options.success_url,
          error_url: options.error_url || options.success_url,
          cancel_url: options.cancel_url || options.success_url,
        };

        // Generate HMAC SHA256 Signature for security
        const signatureRaw = `${this.merchant_id}${fields.order_invoice_number}${fields.order_amount}${fields.currency}`;
        fields['signature'] = crypto
          .createHmac('sha256', this.secret_key)
          .update(signatureRaw)
          .digest('hex');

        return fields;
      },
    };
  }
}
