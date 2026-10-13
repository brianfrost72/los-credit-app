import { defineConfig } from "vite";
import path, { resolve } from "path";
import fs from "fs";
import os from "os";

const herdCertificates = path.join(
    os.homedir(),
    ".config",
    "herd",
    "config",
    "valet",
    "Certificates",
);
const domain = "los-credit-main.test";

export default defineConfig(({ command }) => {
    const useHttps = command === "serve";

    return {
        server: {
            host: "0.0.0.0",
            port: 3410,
            cors: true,
            strictPort: true,
            origin: `https://${domain}:3410`,
            watch: {
                usePolling: true,
            },
            https: useHttps
                ? {
                      key: fs.readFileSync(path.join(herdCertificates, `${domain}.key`)),
                      cert: fs.readFileSync(path.join(herdCertificates, `${domain}.crt`)),
                  }
                : undefined,
            allowedHosts: [domain],
            hmr: {
                host: domain,
                port: 3410,
                protocol: "wss",
            },
        },
        resolve: {
            alias: {
                "@": resolve(import.meta.dirname, "./src"),
                "@assets": resolve(import.meta.dirname, "./src/assets"),
                "@vendors": resolve(import.meta.dirname, "./src/assets/vendors"),
                "@router": resolve(import.meta.dirname, "./src/apps"),
                "@helpers": resolve(import.meta.dirname, "./src/apps/helpers"),
                "@core": resolve(import.meta.dirname, "./src/apps/core"),
                "@modules": resolve(import.meta.dirname, "./src/modules"),
                "@pages": resolve(import.meta.dirname, "./src/apps/pages"),
            },
        },
    };
});
