const crypto = require('crypto');
const cors = require('cors');
const express = require('express');
const { onRequest } = require('firebase-functions/v2/https');
const logger = require('firebase-functions/logger');
const admin = require('firebase-admin');

if (!admin.apps.length) {
  admin.initializeApp();
}

const db = admin.firestore();
const app = express();
const corsHandler = cors({ origin: true });

const LICENSES_COLLECTION = 'licenses';
const ORDERS_COLLECTION = 'license_orders';
const ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';

app.use((req, res, next) => corsHandler(req, res, next));
app.use((req, res, next) => {
  if (req.path === '/webhook/paymongo') {
    next();
    return;
  }
  express.json({ limit: '1mb' })(req, res, next);
});

function safeTrim(value) {
  return String(value || '').trim();
}

function getEnv(name, fallback = '') {
  const value = safeTrim(process.env[name]);
  return value || fallback;
}

function toPositiveInteger(value, fallback) {
  const parsed = Number.parseInt(String(value || ''), 10);
  if (!Number.isFinite(parsed) || parsed <= 0) {
    return fallback;
  }
  return parsed;
}

function toCentavos(amountPhp) {
  const parsed = Number(amountPhp);
  if (!Number.isFinite(parsed) || parsed <= 0) {
    return 0;
  }
  return Math.round(parsed * 100);
}

function hashValue(value) {
  return crypto.createHash('sha256').update(String(value || '')).digest('hex');
}

function randomToken(bytes = 24) {
  return crypto.randomBytes(bytes).toString('hex');
}

function randomChunk(length = 4) {
  const bytes = crypto.randomBytes(length);
  let out = '';
  for (let i = 0; i < length; i += 1) {
    out += ALPHABET[bytes[i] % ALPHABET.length];
  }
  return out;
}

function buildLicenseKey(prefix) {
  return `${prefix}-${randomChunk(4)}-${randomChunk(4)}-${randomChunk(4)}-${randomChunk(4)}`;
}

function buildOrderId() {
  const stamp = Date.now();
  const suffix = crypto.randomBytes(4).toString('hex');
  return `ord_${stamp}_${suffix}`;
}

function maskKey(value) {
  const compact = safeTrim(value).replace(/\s+/g, '');
  if (!compact) return null;
  if (compact.length <= 8) return `${compact.slice(0, 2)}****${compact.slice(-2)}`;
  return `${compact.slice(0, 4)}****${compact.slice(-4)}`;
}

function buildErrorResponse(res, status, code, message, details = null) {
  res.status(status).json({
    ok: false,
    error: {
      code,
      message,
      details,
    },
  });
}

function parsePaymongoSignature(rawHeader) {
  const output = {};
  const parts = String(rawHeader || '')
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean);

  parts.forEach((part) => {
    const [key, value] = part.split('=');
    if (!key || !value) return;
    output[key] = value;
  });

  return output;
}

function timingSafeEqualHex(first, second) {
  const firstBuffer = Buffer.from(String(first || ''), 'hex');
  const secondBuffer = Buffer.from(String(second || ''), 'hex');
  if (firstBuffer.length !== secondBuffer.length) {
    return false;
  }
  return crypto.timingSafeEqual(firstBuffer, secondBuffer);
}

function verifyPaymongoWebhookSignature(rawBody, signatureHeader, webhookSecret) {
  if (!webhookSecret) {
    return {
      ok: true,
      skipped: true,
      reason: 'Webhook secret not configured. Signature verification skipped.',
    };
  }

  const signatureParts = parsePaymongoSignature(signatureHeader);
  const timestamp = signatureParts.t;
  const signatureV1 = signatureParts.v1;

  if (!timestamp || !signatureV1) {
    return {
      ok: false,
      skipped: false,
      reason: 'Missing PayMongo signature parts (t or v1).',
    };
  }

  const payloadToSign = `${timestamp}.${rawBody}`;
  const computed = crypto
    .createHmac('sha256', webhookSecret)
    .update(payloadToSign)
    .digest('hex');

  if (!timingSafeEqualHex(computed, signatureV1)) {
    return {
      ok: false,
      skipped: false,
      reason: 'Webhook signature mismatch.',
    };
  }

  const timestampSeconds = Number.parseInt(timestamp, 10);
  if (Number.isFinite(timestampSeconds)) {
    const nowSeconds = Math.floor(Date.now() / 1000);
    const age = Math.abs(nowSeconds - timestampSeconds);
    if (age > 5 * 60) {
      return {
        ok: false,
        skipped: false,
        reason: 'Webhook signature timestamp is stale.',
      };
    }
  }

  return {
    ok: true,
    skipped: false,
    reason: 'Valid signature.',
  };
}

function extractEventType(payload) {
  return (
    safeTrim(payload?.data?.attributes?.type) ||
    safeTrim(payload?.data?.type) ||
    safeTrim(payload?.type)
  );
}

function extractResource(payload) {
  return (
    payload?.data?.attributes?.data ||
    payload?.data?.attributes?.resource ||
    payload?.data?.attributes?.payload?.data ||
    null
  );
}

function extractMetadata(payload) {
  const resource = extractResource(payload);
  return (
    resource?.attributes?.metadata ||
    payload?.data?.attributes?.metadata ||
    {}
  );
}

function isPaidEvent(payload) {
  const eventType = extractEventType(payload).toLowerCase();
  const resourceStatus = safeTrim(extractResource(payload)?.attributes?.status).toLowerCase();
  return (
    eventType.includes('payment.paid') ||
    eventType.includes('checkout_session.payment.paid') ||
    resourceStatus === 'paid'
  );
}

function isFailureEvent(payload) {
  const eventType = extractEventType(payload).toLowerCase();
  const resourceStatus = safeTrim(extractResource(payload)?.attributes?.status).toLowerCase();
  return (
    eventType.includes('payment.failed') ||
    eventType.includes('payment.canceled') ||
    eventType.includes('payment.cancelled') ||
    resourceStatus === 'failed' ||
    resourceStatus === 'canceled' ||
    resourceStatus === 'cancelled'
  );
}

async function paymongoRequest(path, method, body) {
  const secretKey = getEnv('PAYMONGO_SECRET_KEY');
  if (!secretKey) {
    const error = new Error('PAYMONGO_SECRET_KEY is not configured.');
    error.code = 'missing-secret-key';
    throw error;
  }

  const auth = Buffer.from(`${secretKey}:`).toString('base64');
  const controller = new AbortController();
  const timeoutHandle = setTimeout(() => controller.abort(), 15000);

  try {
    const response = await fetch(`https://api.paymongo.com/v1${path}`, {
      method,
      headers: {
        Authorization: `Basic ${auth}`,
        'Content-Type': 'application/json',
        Accept: 'application/json',
      },
      body: body ? JSON.stringify(body) : undefined,
      signal: controller.signal,
    });

    const json = await response.json().catch(() => ({}));
    if (!response.ok) {
      const description =
        json?.errors?.[0]?.detail ||
        json?.errors?.[0]?.code ||
        json?.message ||
        `PayMongo request failed (${response.status}).`;
      const error = new Error(description);
      error.code = 'paymongo-request-failed';
      error.status = response.status;
      error.payload = json;
      throw error;
    }

    return json;
  } finally {
    clearTimeout(timeoutHandle);
  }
}

async function generateUniqueLicenseKey(prefix) {
  for (let attempt = 0; attempt < 20; attempt += 1) {
    const candidate = buildLicenseKey(prefix);
    const existing = await db
      .collection(LICENSES_COLLECTION)
      .where('license_key', '==', candidate)
      .limit(1)
      .get();
    if (existing.empty) {
      return candidate;
    }
  }

  throw new Error('Unable to generate unique license key. Try again.');
}

function sanitizeVariant(value) {
  const normalized = safeTrim(value).toLowerCase();
  if (['subscriber', 'owner', 'dual', 'dev', 'standalone'].includes(normalized)) {
    return normalized;
  }
  return 'subscriber';
}

app.get('/health', async (_req, res) => {
  res.json({
    ok: true,
    service: 'license-api',
    now: new Date().toISOString(),
  });
});

app.post('/checkout', async (req, res) => {
  try {
    const buyerEmail = safeTrim(req.body?.buyerEmail);
    const variant = sanitizeVariant(req.body?.variant);
    const days = toPositiveInteger(req.body?.days, toPositiveInteger(getEnv('LICENSE_DEFAULT_DAYS', '30'), 30));
    const amountPhp = Number(req.body?.amountPhp || getEnv('LICENSE_PRICE_PHP', '299'));
    const amountCentavos = toCentavos(amountPhp);
    const prefix = safeTrim(getEnv('LICENSE_KEY_PREFIX', 'MFS')).toUpperCase();
    const successUrl = getEnv('LICENSE_SUCCESS_URL', 'https://example.com/license-success');
    const cancelUrl = getEnv('LICENSE_CANCEL_URL', 'https://example.com/license-cancel');

    if (amountCentavos <= 0) {
      buildErrorResponse(res, 400, 'invalid-amount', 'Invalid amount for checkout.');
      return;
    }

    const orderId = buildOrderId();
    const claimToken = randomToken(20);
    const claimTokenHash = hashValue(claimToken);

    const metadata = {
      order_id: orderId,
      variant,
      days: String(days),
      prefix,
    };

    const requestPayload = {
      data: {
        attributes: {
          billing: buyerEmail ? { email: buyerEmail, name: 'Mohon Finder Buyer' } : undefined,
          cancel_url: cancelUrl,
          success_url: successUrl,
          send_email_receipt: Boolean(buyerEmail),
          show_description: true,
          show_line_items: true,
          description: `MF ${variant} premium license`,
          line_items: [
            {
              amount: amountCentavos,
              currency: 'PHP',
              description: `Premium license (${days} days)`,
              name: 'Mohon Finder Premium License',
              quantity: 1,
            },
          ],
          payment_method_types: ['gcash'],
          metadata,
        },
      },
    };

    if (!buyerEmail) {
      delete requestPayload.data.attributes.billing;
      requestPayload.data.attributes.send_email_receipt = false;
    }

    const checkoutResponse = await paymongoRequest('/checkout_sessions', 'POST', requestPayload);
    const checkoutId = safeTrim(checkoutResponse?.data?.id);
    const checkoutUrl = safeTrim(checkoutResponse?.data?.attributes?.checkout_url);

    if (!checkoutId || !checkoutUrl) {
      throw new Error('PayMongo checkout response missing checkout ID or URL.');
    }

    await db.collection(ORDERS_COLLECTION).doc(orderId).set({
      order_id: orderId,
      claim_token_hash: claimTokenHash,
      claim_token_last4: claimToken.slice(-4),
      status: 'pending',
      provider: 'paymongo',
      payment_method: 'gcash',
      variant,
      days,
      amount_php: amountPhp,
      checkout_id: checkoutId,
      checkout_url: checkoutUrl,
      buyer_email: buyerEmail || null,
      license_key_prefix: prefix,
      license_key: null,
      license_doc_id: null,
      created_at: admin.firestore.FieldValue.serverTimestamp(),
      updated_at: admin.firestore.FieldValue.serverTimestamp(),
    });

    res.json({
      ok: true,
      orderId,
      claimToken,
      checkoutId,
      checkoutUrl,
      amountPhp,
      days,
      variant,
    });
  } catch (error) {
    logger.error('Checkout creation failed', {
      error: error?.message || String(error),
      code: error?.code || null,
      status: error?.status || null,
    });

    buildErrorResponse(
      res,
      500,
      error?.code || 'checkout-failed',
      error?.message || 'Unable to create checkout session.',
      error?.payload || null
    );
  }
});

app.get('/order-status', async (req, res) => {
  try {
    const orderId = safeTrim(req.query?.orderId);
    const claimToken = safeTrim(req.query?.claimToken);

    if (!orderId || !claimToken) {
      buildErrorResponse(res, 400, 'missing-params', 'orderId and claimToken are required.');
      return;
    }

    const doc = await db.collection(ORDERS_COLLECTION).doc(orderId).get();
    if (!doc.exists) {
      buildErrorResponse(res, 404, 'order-not-found', 'Order was not found.');
      return;
    }

    const data = doc.data() || {};
    const expectedHash = safeTrim(data.claim_token_hash);
    const incomingHash = hashValue(claimToken);
    if (!expectedHash || expectedHash !== incomingHash) {
      buildErrorResponse(res, 403, 'invalid-claim-token', 'Invalid claim token.');
      return;
    }

    res.json({
      ok: true,
      orderId,
      status: safeTrim(data.status) || 'pending',
      checkoutId: safeTrim(data.checkout_id) || null,
      checkoutUrl: safeTrim(data.checkout_url) || null,
      licenseKey: safeTrim(data.license_key) || null,
      licenseKeyMasked: maskKey(data.license_key),
      paidAt: data.paid_at?.toDate?.()?.toISOString?.() || null,
      expiresAt: data.license_expiry_date?.toDate?.()?.toISOString?.() || null,
      updatedAt: data.updated_at?.toDate?.()?.toISOString?.() || null,
    });
  } catch (error) {
    logger.error('Order status lookup failed', {
      error: error?.message || String(error),
    });
    buildErrorResponse(res, 500, 'order-status-failed', error?.message || 'Unable to load order status.');
  }
});

app.post('/webhook/paymongo', express.raw({ type: '*/*', limit: '1mb' }), async (req, res) => {
  const rawBodyBuffer = Buffer.isBuffer(req.body)
    ? req.body
    : Buffer.from(typeof req.body === 'string' ? req.body : '');
  const rawBodyText = rawBodyBuffer.toString('utf8');
  const signatureHeader = req.get('paymongo-signature') || req.get('Paymongo-Signature') || '';
  const webhookSecret = getEnv('PAYMONGO_WEBHOOK_SECRET');
  const verification = verifyPaymongoWebhookSignature(rawBodyText, signatureHeader, webhookSecret);

  if (!verification.ok) {
    logger.warn('Rejected webhook', { reason: verification.reason });
    buildErrorResponse(res, 401, 'invalid-signature', verification.reason);
    return;
  }

  if (verification.skipped) {
    logger.warn(verification.reason);
  }

  let payload = null;
  try {
    payload = JSON.parse(rawBodyText || '{}');
  } catch (_error) {
    buildErrorResponse(res, 400, 'invalid-json', 'Webhook payload is not valid JSON.');
    return;
  }

  try {
    const eventType = extractEventType(payload);
    const metadata = extractMetadata(payload);
    const resource = extractResource(payload);
    const checkoutId = safeTrim(resource?.id || metadata.checkout_id);
    const orderIdFromMetadata = safeTrim(metadata.order_id);

    let orderRef = null;
    let orderData = null;

    if (orderIdFromMetadata) {
      const directOrder = await db.collection(ORDERS_COLLECTION).doc(orderIdFromMetadata).get();
      if (directOrder.exists) {
        orderRef = directOrder.ref;
        orderData = directOrder.data() || {};
      }
    }

    if (!orderRef && checkoutId) {
      const byCheckout = await db
        .collection(ORDERS_COLLECTION)
        .where('checkout_id', '==', checkoutId)
        .limit(1)
        .get();
      if (!byCheckout.empty) {
        orderRef = byCheckout.docs[0].ref;
        orderData = byCheckout.docs[0].data() || {};
      }
    }

    if (!orderRef) {
      logger.warn('Webhook ignored because no matching order was found.', {
        eventType,
        orderIdFromMetadata,
        checkoutId,
      });
      res.json({ ok: true, ignored: true, reason: 'order-not-found' });
      return;
    }

    if (isFailureEvent(payload)) {
      await orderRef.set(
        {
          status: 'failed',
          webhook_event_type: eventType || null,
          updated_at: admin.firestore.FieldValue.serverTimestamp(),
        },
        { merge: true }
      );
      res.json({ ok: true, updated: true, status: 'failed' });
      return;
    }

    if (!isPaidEvent(payload)) {
      await orderRef.set(
        {
          webhook_event_type: eventType || null,
          updated_at: admin.firestore.FieldValue.serverTimestamp(),
        },
        { merge: true }
      );
      res.json({ ok: true, ignored: true, reason: 'event-not-paid' });
      return;
    }

    if (safeTrim(orderData.status).toLowerCase() === 'paid' && safeTrim(orderData.license_key)) {
      res.json({
        ok: true,
        idempotent: true,
        orderId: safeTrim(orderData.order_id) || orderRef.id,
        licenseKeyMasked: maskKey(orderData.license_key),
      });
      return;
    }

    const prefix = safeTrim(orderData.license_key_prefix || metadata.prefix || getEnv('LICENSE_KEY_PREFIX', 'MFS')).toUpperCase();
    const days = toPositiveInteger(orderData.days || metadata.days, toPositiveInteger(getEnv('LICENSE_DEFAULT_DAYS', '30'), 30));
    const expiryDate = new Date(Date.now() + days * 24 * 60 * 60 * 1000);
    const licenseKey = await generateUniqueLicenseKey(prefix);
    const licenseDocRef = db.collection(LICENSES_COLLECTION).doc();

    const batch = db.batch();
    batch.set(licenseDocRef, {
      license_key: licenseKey,
      status: 'active',
      expiry_date: admin.firestore.Timestamp.fromDate(expiryDate),
      device_id: '',
      created_at: admin.firestore.FieldValue.serverTimestamp(),
      issued_via: 'paymongo-webhook',
      order_id: safeTrim(orderData.order_id) || orderRef.id,
    });

    batch.set(
      orderRef,
      {
        status: 'paid',
        paid_at: admin.firestore.FieldValue.serverTimestamp(),
        updated_at: admin.firestore.FieldValue.serverTimestamp(),
        webhook_event_type: eventType || null,
        checkout_id: checkoutId || safeTrim(orderData.checkout_id) || null,
        license_key: licenseKey,
        license_doc_id: licenseDocRef.id,
        license_expiry_date: admin.firestore.Timestamp.fromDate(expiryDate),
      },
      { merge: true }
    );

    await batch.commit();

    res.json({
      ok: true,
      paid: true,
      orderId: safeTrim(orderData.order_id) || orderRef.id,
      licenseDocId: licenseDocRef.id,
      licenseKeyMasked: maskKey(licenseKey),
    });
  } catch (error) {
    logger.error('Webhook processing failed', {
      error: error?.message || String(error),
    });
    buildErrorResponse(res, 500, 'webhook-processing-failed', error?.message || 'Webhook processing failed.');
  }
});

exports.licenseApi = onRequest(
  {
    region: getEnv('FUNCTION_REGION', 'asia-southeast1'),
    cors: true,
    timeoutSeconds: 60,
    memory: '256MiB',
  },
  app
);
