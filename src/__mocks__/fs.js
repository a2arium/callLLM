/**
 * Mock implementation of fs module for testing
 */
const fs = jest.createMockFromModule('fs');

// Mock file system functions
fs.existsSync = jest.fn(() => true);

fs.statSync = jest.fn(() => ({
  isDirectory: jest.fn(() => true),
  isFile: jest.fn(() => true)
}));

fs.readFileSync = jest.fn(() => Buffer.from('mock file content'));
fs.readdirSync = jest.fn(() => ['file1.ts', 'file2.ts', 'tool1.ts', 'tool2.ts']);
fs.mkdirSync = jest.fn();
fs.writeFileSync = jest.fn();
fs.unlinkSync = jest.fn();
fs.rmSync = jest.fn();
fs.createReadStream = jest.fn();
fs.createWriteStream = jest.fn(() => ({
  write: jest.fn(),
  end: jest.fn(),
  on: jest.fn()
}));
fs.accessSync = jest.fn();
fs.copyFileSync = jest.fn();
fs.lstatSync = jest.fn(() => ({
  isDirectory: jest.fn(() => true),
  isFile: jest.fn(() => true),
  isSymbolicLink: jest.fn(() => false)
}));

// Add promises API
fs.promises = {
  readFile: jest.fn().mockResolvedValue(Buffer.from('mock file content')),
  writeFile: jest.fn().mockResolvedValue(undefined),
  mkdir: jest.fn().mockResolvedValue(undefined),
  stat: jest.fn().mockResolvedValue({
    isDirectory: jest.fn().mockReturnValue(true),
    isFile: jest.fn().mockReturnValue(true)
  }),
  readdir: jest.fn().mockResolvedValue(['file1.ts', 'file2.ts', 'tool1.ts', 'tool2.ts']),
  access: jest.fn().mockResolvedValue(undefined),
  unlink: jest.fn().mockResolvedValue(undefined),
  copyFile: jest.fn().mockResolvedValue(undefined),
  rm: jest.fn().mockResolvedValue(undefined),
  lstat: jest.fn().mockResolvedValue({
    isDirectory: jest.fn().mockReturnValue(true),
    isFile: jest.fn().mockReturnValue(true),
    isSymbolicLink: jest.fn().mockReturnValue(false)
  })
};

fs.constants = {
  F_OK: 0,
  R_OK: 4,
  W_OK: 2,
  X_OK: 1
};

module.exports = fs; 