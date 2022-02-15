declare global {
  namespace NodeJS {
    interface ProcessEnv {
      CLIENT_HOSTNAME: string;
      NODE_ENV: "production" | "development";
      PORT: number;
    }
  }
}

export {};
