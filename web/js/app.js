// Web app entry point
// Imports the core engine from the build output

import * as core from './lib/index.js';

// Stub: verify core engine loaded
const status = document.getElementById('status');
if (status) {
  if (core && typeof core === 'object') {
    status.textContent = 'Core engine loaded successfully!';
    console.log('Core engine exports:', Object.keys(core));
  } else {
    status.textContent = 'Error: Core engine failed to load';
  }
}
