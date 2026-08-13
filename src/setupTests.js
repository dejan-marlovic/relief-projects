// jest-dom adds custom jest matchers for asserting on DOM nodes.
// allows you to do things like:
// expect(element).toHaveTextContent(/react/i)
// learn more: https://github.com/testing-library/jest-dom
import '@testing-library/jest-dom';

const { TextDecoder, TextEncoder } = require("util");
global.TextEncoder = TextEncoder;
global.TextDecoder = TextDecoder;

// Jest 27 (bundled with react-scripts 5) cannot resolve React Router 7's
// package-export subpath. Runtime bundling is unaffected; this maps that
// test-only subpath to the same CommonJS DOM export shipped by react-router.
jest.mock(
  "react-router/dom",
  () => require("../node_modules/react-router/dist/development/dom-export.js"),
  { virtual: true },
);
