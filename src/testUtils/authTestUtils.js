export const makeUser = (roles = ["VIEWER"], overrides = {}) => ({
  userId: 10,
  employeeId: 2,
  username: "role.test",
  email: "role.test@example.com",
  firstName: "Dario",
  lastName: "Marlovic",
  roles,
  ...overrides,
});

export const jsonResponse = (body, status = 200) =>
  Promise.resolve({
    ok: status >= 200 && status < 300,
    status,
    headers: { get: (name) => name.toLowerCase() === "content-type" ? "application/json" : null },
    json: async () => body,
    text: async () => body == null ? "" : JSON.stringify(body),
  });

export const authValue = (roles = ["VIEWER"], overrides = {}) => ({
  user: makeUser(roles),
  roles,
  isLoading: false,
  clearAuth: jest.fn(),
  refreshUser: jest.fn(),
  hasRole: (role) => roles.includes(role),
  hasAnyRole: (...required) => required.some((role) => roles.includes(role)),
  ...overrides,
});
