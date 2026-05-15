// Cashfree v3 Checkout helper.
// The deprecated `payments.cashfree.com/forms/{session_id}` URL returns
// "Invalid form" for new sessions. v3 requires the Cashfree JS SDK loaded
// from https://sdk.cashfree.com/js/v3/cashfree.js (included in index.html).

/**
 * Open Cashfree hosted checkout for a payment session.
 *
 * @param {Object} opts
 * @param {string} opts.paymentSessionId  Returned by backend after order creation.
 * @param {'sandbox'|'production'} [opts.mode='production']  Cashfree environment.
 * @param {'_self'|'_blank'|'_modal'} [opts.redirectTarget='_self']  Where checkout opens.
 * @returns {Promise<void>}
 */
export async function openCashfreeCheckout({
  paymentSessionId,
  mode = 'production',
  redirectTarget = '_self',
}) {
  if (!paymentSessionId) {
    throw new Error('paymentSessionId is required');
  }
  if (typeof window === 'undefined' || typeof window.Cashfree !== 'function') {
    throw new Error('Cashfree SDK not loaded. Add the v3 script to index.html.');
  }
  const cashfree = window.Cashfree({ mode });
  return cashfree.checkout({ paymentSessionId, redirectTarget });
}

export default openCashfreeCheckout;
