export default function formatError(error: unknown): { message: string; name?: string; details?: any } {
  if (error instanceof Error) {
    const cause = (error as any).cause; // Use type assertion to access 'cause'
    return {
      message: error.message,
      name: error.name,
      details: {
        stack: error.stack,
        ...(cause && { cause }),
      },
    };
  }
  return {
    message: "An unknown error occurred.",
    details: error,
  };
}
