/** Generate locally; display once to the organization owner and pass to register(). */
export function generateOrganizationCredentials() {
  const bytes = crypto.getRandomValues(new Uint8Array(18));
  return {
    username: `cafe-${crypto.randomUUID().slice(0, 8)}`,
    password: Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join(
      "",
    ),
  };
}
