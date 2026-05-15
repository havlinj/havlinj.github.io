import {
  type ContactStatusCode,
  CONTACT_STATUS_MESSAGES,
  isContactErrorCode,
  resolveContactStatusFromApi,
} from '../lib/contact-status';

const SELECTORS = {
  form: '#contact-form',
  status: '#status',
  submitButton: 'button[type="submit"]',
} as const;

const FIELD_NAMES = ['name', 'email', 'message', 'company'] as const;

function setStatusEl(status: HTMLElement, code: ContactStatusCode): void {
  status.textContent = CONTACT_STATUS_MESSAGES[code];
  status.dataset.statusCode = code;
  status.classList.remove(
    'contact-status--error',
    'contact-status--success',
    'contact-status--pending',
  );

  if (code === 'success') {
    status.classList.add('contact-status--success');
  } else if (code === 'sending') {
    status.classList.add('contact-status--pending');
  } else if (
    isContactErrorCode(code) ||
    code === 'network_error' ||
    code === 'unknown'
  ) {
    status.classList.add('contact-status--error');
  }
}

export function setupContactForm(): void {
  const form = document.querySelector<HTMLFormElement>(SELECTORS.form);
  const status = document.querySelector<HTMLElement>(SELECTORS.status);

  if (!form || !status) return;

  const contactForm = form;
  const sendButton = contactForm.querySelector<HTMLButtonElement>(
    SELECTORS.submitButton,
  );

  function replaceContactFieldsWithFreshElements(): void {
    for (const fieldName of FIELD_NAMES) {
      const oldEl = contactForm.querySelector(`[name="${fieldName}"]`);
      if (!oldEl) continue;
      const tag = oldEl.tagName.toLowerCase();
      if (tag !== 'input' && tag !== 'textarea') continue;
      const fresh = document.createElement(tag);
      for (let i = 0; i < oldEl.attributes.length; i++) {
        const attr = oldEl.attributes[i];
        fresh.setAttribute(attr.name, attr.value);
      }
      oldEl.replaceWith(fresh);
    }
  }

  let isSubmitting = false;

  contactForm.addEventListener('submit', async (event) => {
    event.preventDefault();
    if (isSubmitting) return;
    isSubmitting = true;
    if (sendButton) sendButton.disabled = true;

    setStatusEl(status, 'sending');

    const formData = new FormData(contactForm);

    try {
      const response = await fetch('/api/contact', {
        method: 'POST',
        body: formData,
      });

      const data = (await response.json()) as {
        ok?: boolean;
        code?: string;
        error?: string;
        resetTurnstile?: boolean;
      };

      if (data.ok) {
        setStatusEl(status, 'success');
        if (window.turnstile) {
          window.turnstile.reset();
        }
        contactForm.reset();
        replaceContactFieldsWithFreshElements();
      } else {
        setStatusEl(status, resolveContactStatusFromApi(data));

        if (window.turnstile && data.resetTurnstile) {
          window.turnstile.reset();
        }
      }
    } catch {
      setStatusEl(status, 'network_error');

      if (window.turnstile) {
        window.turnstile.reset();
      }
    } finally {
      isSubmitting = false;
      if (sendButton) sendButton.disabled = false;
    }
  });
}

declare global {
  interface Window {
    turnstile?: { reset: () => void };
  }
}
