const applyMouseGlow = () => {
  document.querySelectorAll('.card').forEach((card) => {
    card.addEventListener('mousemove', (event) => {
      const rect = card.getBoundingClientRect();
      card.style.setProperty('--mouse-x', `${event.clientX - rect.left}px`);
      card.style.setProperty('--mouse-y', `${event.clientY - rect.top}px`);
    });

    card.addEventListener('mouseleave', () => {
      card.style.removeProperty('--mouse-x');
      card.style.removeProperty('--mouse-y');
    });

    card.addEventListener(
      'touchmove',
      (event) => {
        const touch = event.touches[0];
        if (!touch) return;
        const rect = card.getBoundingClientRect();
        card.style.setProperty('--mouse-x', `${touch.clientX - rect.left}px`);
        card.style.setProperty('--mouse-y', `${touch.clientY - rect.top}px`);
      },
      { passive: true }
    );
  });
};

applyMouseGlow();

const resumeTabs = document.querySelectorAll('.resume-tab');
const resumePanels = document.querySelectorAll('.resume-panel');

if (resumeTabs.length && resumePanels.length) {
  const activateTab = (tab) => {
    resumeTabs.forEach((button) => {
      const isActive = button === tab;
      button.classList.toggle('is-active', isActive);
      button.setAttribute('aria-selected', isActive ? 'true' : 'false');
      button.setAttribute('tabindex', isActive ? '0' : '-1');
    });

    resumePanels.forEach((panel) => {
      const isActive = panel.id === tab.getAttribute('aria-controls');
      panel.classList.toggle('is-active', isActive);
      panel.toggleAttribute('hidden', !isActive);
    });
  };

  resumeTabs.forEach((tab, index) => {
    tab.addEventListener('click', () => activateTab(tab));
    tab.addEventListener('keydown', (event) => {
      if (event.key === 'ArrowDown' || event.key === 'ArrowRight') {
        event.preventDefault();
        const next = resumeTabs[index + 1] || resumeTabs[0];
        next.focus();
        activateTab(next);
      }
      if (event.key === 'ArrowUp' || event.key === 'ArrowLeft') {
        event.preventDefault();
        const prev = resumeTabs[index - 1] || resumeTabs[resumeTabs.length - 1];
        prev.focus();
        activateTab(prev);
      }
    });
  });

  const activeTab = document.querySelector('.resume-tab.is-active') || resumeTabs[0];
  if (activeTab) {
    activateTab(activeTab);
  }
}

const navItems = document.querySelectorAll('.nav-item');

if (navItems.length) {
  const closeAll = (except) => {
    navItems.forEach((item) => {
      if (item === except) return;
      item.classList.remove('open');
      const trigger = item.querySelector('.nav-button');
      if (trigger) {
        trigger.setAttribute('aria-expanded', 'false');
      }
    });
  };

  navItems.forEach((item) => {
    const trigger = item.querySelector('.nav-button');
    const dropdown = item.querySelector('.nav-dropdown');
    if (!trigger || !dropdown) return;

    trigger.addEventListener('click', (event) => {
      event.preventDefault();
      const willOpen = !item.classList.contains('open');
      closeAll(willOpen ? item : undefined);
      item.classList.toggle('open', willOpen);
      trigger.setAttribute('aria-expanded', willOpen ? 'true' : 'false');
      if (willOpen) {
        const firstLink = dropdown.querySelector('a');
        if (firstLink) {
          firstLink.focus();
        }
      }
    });

    trigger.addEventListener('keydown', (event) => {
      if ((event.key === 'ArrowDown' || event.key === 'Enter' || event.key === ' ') && !item.classList.contains('open')) {
        event.preventDefault();
        trigger.click();
      }
    });

    dropdown.addEventListener('keydown', (event) => {
      if (event.key === 'Escape') {
        item.classList.remove('open');
        trigger.setAttribute('aria-expanded', 'false');
        trigger.focus();
      }
    });

    item.addEventListener('focusout', (event) => {
      const nextTarget = event.relatedTarget;
      if (!nextTarget || !item.contains(nextTarget)) {
        item.classList.remove('open');
        trigger.setAttribute('aria-expanded', 'false');
      }
    });
  });

  document.addEventListener('click', (event) => {
    if (!event.target.closest('.nav-item')) {
      closeAll();
    }
  });
}

if (window.matchMedia('(pointer: fine)').matches) {
  document.body.addEventListener(
    'pointermove',
    (event) => {
      const x = (event.clientX / window.innerWidth) * 100;
      const y = (event.clientY / window.innerHeight) * 100;
      document.body.style.setProperty('--pointer-x', `${x}%`);
      document.body.style.setProperty('--pointer-y', `${y}%`);
    },
    { passive: true }
  );
}

const progressBar = document.querySelector('.scroll-progress span');

if (progressBar) {
  const updateProgress = () => {
    const scrollHeight = document.documentElement.scrollHeight - window.innerHeight;
    const progress = scrollHeight > 0 ? (window.scrollY / scrollHeight) * 100 : 0;
    const clamped = Math.min(100, Math.max(12, progress));
    progressBar.style.width = `${clamped}%`;
  };
  updateProgress();
  window.addEventListener('scroll', updateProgress, { passive: true });
  window.addEventListener('resize', updateProgress);
}

const assistantForm = document.getElementById('assistantForm');
const assistantLog = document.getElementById('assistantLog');

if (assistantForm && assistantLog) {
  const assistantInput = document.getElementById('assistantInput');
  const assistantButton = assistantForm.querySelector('button[type="submit"]');
  const fallbackResponses = [
    "Here’s what we can tackle next:\n• Capture your policy priorities\n• Map the rollout timeline\n• Deliver an integration readiness checklist.",
    "I can assemble a close acceleration plan with milestones, owners, and the Auto GAAP capabilities to activate first.",
    "Share your current tech stack and I’ll outline recommended integrations plus the AES experts who will support you."
  ];
  const patterns = [
    {
      test: /policy|gaap|standard|control|asc|ifrs/,
      response:
        "Auto GAAP encodes GAAP and IFRS guidance in the policy graph. We’ll align your chart of accounts, simulate new standards, and assign owners for every control.",
    },
    {
      test: /close|timeline|calendar|checklist|month[- ]end|quarter/,
      response:
        "Let’s coordinate your close. We build Close Rooms with sequenced tasks, SLAs, and visibility dashboards so every stakeholder knows the next action.",
    },
    {
      test: /integrat|erp|netsuite|oracle|sap|workday|payroll|billing/,
      response:
        "AES manages secure adapters for ERP, billing, and payroll systems. We’ll review your stack, configure the sync cadence, and ensure data quality checkpoints are in place.",
    },
    {
      test: /demo|pricing|cost|quote|rollout|implementation|budget/,
      response:
        "We scope engagements around your entities and compliance goals. Expect a phased rollout plan with investment ranges after a brief discovery call.",
    },
    {
      test: /support|help|contact|partner|talk/,
      response:
        "You can reach the AES team at hello@aesfinancelab.com or submit the contact form. We’ll respond within one business day with next steps.",
    },
  ];
  let responseIndex = 0;
  const appendMessage = (role, text) => {
    const bubble = document.createElement('div');
    bubble.className = `message ${role}`;
    bubble.textContent = text;
    assistantLog.appendChild(bubble);
    assistantLog.scrollTop = assistantLog.scrollHeight;
  };
  const generateResponse = (input) => {
    const normalized = input.toLowerCase();
    for (const pattern of patterns) {
      if (pattern.test(normalized)) {
        return pattern.response;
      }
    }
    const reply = fallbackResponses[responseIndex % fallbackResponses.length];
    responseIndex += 1;
    return reply;
  };
  const defaultLabel = assistantButton ? assistantButton.textContent : '';
  assistantForm.addEventListener('submit', (event) => {
    event.preventDefault();
    const value = assistantInput.value.trim();
    if (!value) return;
    appendMessage('user', value);
    assistantInput.value = '';
    if (assistantButton) {
      assistantButton.disabled = true;
      assistantButton.textContent = 'Thinking…';
    }
    setTimeout(() => {
      appendMessage('bot', generateResponse(value));
      if (assistantButton) {
        assistantButton.disabled = false;
        assistantButton.textContent = defaultLabel;
      }
      assistantInput.focus();
    }, 550 + Math.random() * 450);
  });
}

const contactForm = document.getElementById('contactForm');
const contactStatus = document.getElementById('contactStatus');
if (contactForm && contactStatus) {
  let statusTimeout;
  contactForm.addEventListener('submit', (event) => {
    event.preventDefault();
    const formData = new FormData(contactForm);
    const rawName = (formData.get('name') || '').toString().trim();
    const friendlyName = rawName ? rawName.split(' ')[0] : 'team';
    contactStatus.textContent = `Thanks ${friendlyName}! I’ll follow up within one business day with next steps.`;
    contactStatus.classList.add('visible');
    clearTimeout(statusTimeout);
    statusTimeout = setTimeout(() => {
      contactStatus.classList.remove('visible');
    }, 8000);
    contactForm.reset();
  });
}
