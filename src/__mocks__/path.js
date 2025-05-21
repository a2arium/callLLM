/**
 * Mock implementation of path module for testing
 */
const path = jest.createMockFromModule('path');

// Mock path functions
path.resolve = jest.fn(filepath => filepath);
path.join = jest.fn((...args) => args.join('/'));
path.basename = jest.fn((path, ext) => {
  const base = path.split('/').pop() || '';
  return ext ? base.replace(ext, '') : base;
});
path.dirname = jest.fn(path => {
  const parts = path.split('/');
  parts.pop();
  return parts.join('/') || '.';
});
path.extname = jest.fn(path => {
  const base = path.split('/').pop() || '';
  const lastDotIdx = base.lastIndexOf('.');
  return lastDotIdx < 0 ? '' : base.slice(lastDotIdx);
});

module.exports = path; 