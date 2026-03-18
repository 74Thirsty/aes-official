(() => {
  const DIALOG_ID = 'autoGaapPaymentDialog';
  const ACTION_ID = 'paymentDialogAction';
  const OPTION_GRID_ID = 'paymentOptionGrid';
  const CONFIRM_CHECKBOX_ID = 'paymentConfirmation';
  const CONFIRM_BUTTON_ID = 'confirmPaymentAction';
  const PLACEHOLDER_PREFIXES = ['@set-', '$set-', 'SET_'];

  let pendingAction = null;

  const escapeHtml = (value) =>
    String(value ?? '').replace(/[&<>"']/g, (char) => ({
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      '"': '&quot;',
      "'": '&#39;',
    }[char] || char));

  const isPlaceholder = (value) =>
    typeof value === 'string' && PLACEHOLDER_PREFIXES.some((prefix) => value.startsWith(prefix));

  const getDialog = () => document.getElementById(DIALOG_ID);

  const buildOptions = (dialog) => {
    const price = dialog?.dataset.price || '1.00';
    const venmoHandle = dialog?.dataset.venmoHandle || '@set-venmo-handle';
    const paypalUrl = dialog?.dataset.paypalUrl || '';
    const chimeHandle = dialog?.dataset.chimeHandle || '$set-chime-handle';
    const cryptoAddress = dialog?.dataset.cryptoAddress || 'SET_GNOSIS_SAFE_ADDRESS';
    const cryptoNetwork = dialog?.dataset.cryptoNetwork || 'Ethereum / Gnosis Safe';

    return [
      {
        title: 'Venmo',
        detail: venmoHandle,
        note: `Collect $${price} via Venmo.`,
        href: isPlaceholder(venmoHandle) ? '' : `https://account.venmo.com/u/${encodeURIComponent(venmoHandle.replace(/^@/, ''))}`,
      },
      {
        title: 'PayPal',
        detail: paypalUrl || 'Set your PayPal.me URL',
        note: `Collect $${price} via PayPal.`,
        href: paypalUrl && !paypalUrl.includes('set-paypal-handle') ? paypalUrl : '',
      },
      {
        title: 'Chime',
        detail: chimeHandle,
        note: `Collect $${price} via Chime.`,
        href: '',
      },
      {
        title: 'Crypto / Gnosis Safe',
        detail: cryptoAddress,
        note: `Accept stablecoins or native gas assets on ${cryptoNetwork}.`,
        href: '',
        copyValue: isPlaceholder(cryptoAddress) ? '' : cryptoAddress,
      },
    ];
  };

  const renderOptions = () => {
    const dialog = getDialog();
    const container = document.getElementById(OPTION_GRID_ID);
    if (!dialog || !container) return;

    container.innerHTML = buildOptions(dialog)
      .map((option) => {
        const hasLink = Boolean(option.href);
        const hasCopy = Boolean(option.copyValue);
        const actionMarkup = hasLink
          ? `<a class="button outline payment-option-action" href="${escapeHtml(option.href)}" target="_blank" rel="noopener noreferrer">Open</a>`
          : hasCopy
            ? `<button class="button outline payment-option-action" type="button" data-copy-value="${escapeHtml(option.copyValue)}">Copy address</button>`
            : '<button class="button outline payment-option-action" type="button" disabled>Configure destination</button>';

        return `
          <article class="payment-option-card" role="listitem">
            <div class="payment-option-top">
              <h3>${escapeHtml(option.title)}</h3>
              <span class="payment-option-price">$${escapeHtml(dialog.dataset.price || '1.00')}</span>
            </div>
            <p class="payment-option-detail">${escapeHtml(option.detail)}</p>
            <p class="payment-option-note">${escapeHtml(option.note)}</p>
            <div class="payment-option-footer">${actionMarkup}</div>
          </article>
        `;
      })
      .join('');

    container.querySelectorAll('[data-copy-value]').forEach((button) => {
      button.addEventListener('click', async () => {
        const value = button.getAttribute('data-copy-value') || '';
        if (!value) return;
        try {
          await navigator.clipboard.writeText(value);
          button.textContent = 'Copied';
          window.setTimeout(() => {
            button.textContent = 'Copy address';
          }, 1500);
        } catch (error) {
          console.warn('payment_gate.js: clipboard write failed', error);
          window.prompt('Copy this payment destination:', value);
        }
      });
    });
  };

  const closeDialog = () => {
    const dialog = getDialog();
    if (dialog?.open) {
      dialog.close('cancel');
    }
    const checkbox = document.getElementById(CONFIRM_CHECKBOX_ID);
    if (checkbox) {
      checkbox.checked = false;
    }
    pendingAction = null;
  };

  const requestAccess = (actionLabel, callback) => {
    const dialog = getDialog();
    if (!dialog) {
      callback();
      return;
    }

    pendingAction = typeof callback === 'function' ? callback : null;
    const actionTarget = document.getElementById(ACTION_ID);
    if (actionTarget) {
      actionTarget.textContent = actionLabel || 'Export file';
    }
    renderOptions();

    if (typeof dialog.showModal === 'function') {
      dialog.showModal();
    } else {
      dialog.setAttribute('open', 'open');
    }
  };

  document.addEventListener('DOMContentLoaded', () => {
    const dialog = getDialog();
    if (!dialog) return;

    renderOptions();

    dialog.addEventListener('close', () => {
      const checkbox = document.getElementById(CONFIRM_CHECKBOX_ID);
      if (checkbox) {
        checkbox.checked = false;
      }
      pendingAction = null;
    });

    const confirmButton = document.getElementById(CONFIRM_BUTTON_ID);
    const checkbox = document.getElementById(CONFIRM_CHECKBOX_ID);
    if (!confirmButton) return;

    confirmButton.addEventListener('click', () => {
      if (!checkbox?.checked) {
        alert('Confirm the payment checkbox before continuing.');
        return;
      }

      const callback = pendingAction;
      closeDialog();
      if (typeof callback === 'function') {
        callback();
      }
    });
  });

  window.AutoGaapPaymentGate = {
    requestAccess,
    close: closeDialog,
  };
})();
