// This file is a fallback wrapper because the project's actual entry point is 'index.js'.
// If you or a tool runs 'node server.js', this will catch it and properly load 'index.js'.
console.warn("\x1b[33m%s\x1b[0m", "Warning: The main entry file for this project is 'index.js'. You ran 'server.js' directly.");
console.warn("\x1b[33m%s\x1b[0m", "Loading './index.js' instead...");

require('./index.js');
