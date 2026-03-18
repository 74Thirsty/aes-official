(() => {
  const DIALOG_ID = 'autoGaapPaymentDialog';
  const ACTION_ID = 'paymentDialogAction';
  const OPTION_GRID_ID = 'paymentOptionGrid';
  const RECEIPT_INPUT_ID = 'paymentReceiptReference';
  const RECEIPT_HINT_ID = 'paymentReceiptHint';
  const CONFIRM_BUTTON_ID = 'confirmPaymentAction';
  const STORAGE_KEY = 'autoGaapPaymentReceipts';
  const PLACEHOLDER_PREFIXES = ['@set-', '$set-', 'SET_'];

  let pendingAction = null;
  let selectedMethod = null;

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
  const getReceiptInput = () => document.getElementById(RECEIPT_INPUT_ID);
  const getReceiptHint = () => document.getElementById(RECEIPT_HINT_ID);

  const buildOptions = (dialog) => {
    const price = dialog?.dataset.price || '1.00';
    const venmoHandle = dialog?.dataset.venmoHandle || '@set-venmo-handle';
    const paypalUrl = dialog?.dataset.paypalUrl || '';
    const chimeHandle = dialog?.dataset.chimeHandle || '$set-chime-handle';
    const cryptoAddress = dialog?.dataset.cryptoAddress || 'SET_GNOSIS_SAFE_ADDRESS';
    const cryptoNetwork = dialog?.dataset.cryptoNetwork || 'Ethereum / Gnosis Safe';

    return [
      {
        id: 'venmo',
        title: 'Venmo',
        detail: venmoHandle,
        note: `Collect $${price} via Venmo.`,
        href: isPlaceholder(venmoHandle) ? '' : `https://account.venmo.com/u/${encodeURIComponent(venmoHandle.replace(/^@/, ''))}`,
      },
      {
        id: 'paypal',
        title: 'PayPal',
        detail: paypalUrl || 'Set your PayPal.me URL',
        note: `Collect $${price} via PayPal.`,
        href: paypalUrl && !paypalUrl.includes('set-paypal-handle') ? paypalUrl : '',
      },
      {
        id: 'chime',
        title: 'Chime',
        detail: chimeHandle,
        note: `Collect $${price} via Chime.`,
        href: '',
      },
      {
        id: 'crypto',
        title: 'Crypto / Gnosis Safe',
        detail: cryptoAddress,
        note: `Accept stablecoins or native gas assets on ${cryptoNetwork}.`,
        href: '',
        copyValue: isPlaceholder(cryptoAddress) ? '' : cryptoAddress,
      },
    ];
  };

  const persistReceipt = (receipt) => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      const existing = raw ? JSON.parse(raw) : [];
      const next = Array.isArray(existing) ? existing.slice(-24) : [];
      next.push(receipt);
      localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
    } catch (error) {
      console.warn('payment_gate.js: unable to persist receipt log', error);
    }
  };

  const updateReceiptHint = () => {
    const hint = getReceiptHint();
    if (!hint) return;
    if (!selectedMethod) {
      hint.textContent = 'Select a payment method, then paste the receipt reference or tx hash before continuing.';
      return;
    }
    hint.textContent = selectedMethod.id === 'crypto'
      ? 'Paste the on-chain transaction hash, Safe transaction hash, or payment reference.'
      : `Paste the ${selectedMethod.title} receipt id, payment reference, or transfer note.`;
  };

  const updateActionLabel = () => {
    const target = document.getElementById(ACTION_ID);
    if (!target) return;
    const baseLabel = target.dataset.baseLabel || 'Export file';
    target.textContent = selectedMethod ? `${baseLabel} · ${selectedMethod.title}` : baseLabel;
  };

  const selectMethod = (methodId) => {
    const dialog = getDialog();
    if (!dialog) return;
    selectedMethod = buildOptions(dialog).find((option) => option.id === methodId) || null;
    document.querySelectorAll('.payment-option-card').forEach((card) => {
      card.classList.toggle('selected', card.getAttribute('data-payment-method') === methodId);
    });
    updateReceiptHint();
    updateActionLabel();
  };

  const isValidReceipt = (value) => {
    const trimmed = value.trim();
    if (!selectedMethod) return false;
    if (selectedMethod.id === 'crypto') {
      return /^0x[a-fA-F0-9]{16,}$/.test(trimmed) || trimmed.length >= 12;
    }
    return trimmed.length >= 6;
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
          <article class="payment-option-card${selectedMethod?.id === option.id ? ' selected' : ''}" role="listitem" data-payment-method="${escapeHtml(option.id)}" tabindex="0">
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

    container.querySelectorAll('.payment-option-card').forEach((card) => {
      const methodId = card.getAttribute('data-payment-method') || '';
      card.addEventListener('click', () => {
        selectMethod(methodId);
      });
      card.addEventListener('keydown', (event) => {
        if (event.key === 'Enter' || event.key === ' ') {
          event.preventDefault();
          selectMethod(methodId);
        }
      });
    });

    container.querySelectorAll('[data-copy-value]').forEach((button) => {
      button.addEventListener('click', async () => {
        button.closest('.payment-option-card')?.click();
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
    const receiptInput = getReceiptInput();
    if (receiptInput) {
      receiptInput.value = '';
    }
    pendingAction = null;
    selectedMethod = null;
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
      actionTarget.dataset.baseLabel = actionLabel || 'Export file';
    }
    selectedMethod = null;
    renderOptions();
    updateReceiptHint();
    updateActionLabel();

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
      const receiptInput = getReceiptInput();
      if (receiptInput) {
        receiptInput.value = '';
      }
      pendingAction = null;
      selectedMethod = null;
      updateReceiptHint();
    });

    const confirmButton = document.getElementById(CONFIRM_BUTTON_ID);
    const receiptInput = getReceiptInput();
    if (!confirmButton) return;

    confirmButton.addEventListener('click', () => {
      if (!selectedMethod) {
        alert('Select a payment method before continuing.');
        return;
      }

      const receiptReference = receiptInput?.value || '';
      if (!isValidReceipt(receiptReference)) {
        alert('Enter a receipt reference or transaction hash before continuing.');
        return;
      }

      persistReceipt({
        action: document.getElementById(ACTION_ID)?.dataset.baseLabel || 'Export file',
        method: selectedMethod.title,
        receiptReference: receiptReference.trim(),
        createdAt: new Date().toISOString(),
      });

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
