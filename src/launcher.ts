import { spawn, type ChildProcess } from "node:child_process";
import { createWriteStream, existsSync, mkdirSync } from "node:fs";
import { createConnection } from "node:net";
import path from "node:path";

const HOST = "127.0.0.1";
const PORT = 4173;

function installDir(): string {
	return path.dirname(process.execPath);
}

function findEdge(): string | null {
	const roots = [
		process.env["PROGRAMFILES(X86)"],
		process.env.PROGRAMFILES,
		process.env.LOCALAPPDATA,
	].filter((value): value is string => Boolean(value));

	for (const root of roots) {
		const candidate = path.join(
			root,
			"Microsoft",
			"Edge",
			"Application",
			"msedge.exe",
		);
		if (existsSync(candidate)) return candidate;
	}
	return null;
}

function waitForPort(timeoutMs: number): Promise<void> {
	const started = Date.now();
	return new Promise((resolve, reject) => {
		const attempt = () => {
			const socket = createConnection({ host: HOST, port: PORT });
			const retry = () => {
				socket.destroy();
				if (Date.now() - started > timeoutMs) {
					reject(
						new Error(
							`OpenCut did not start. See opencut.log next to OpenCut.exe.`,
						),
					);
					return;
				}
				setTimeout(attempt, 250);
			};
			socket.once("connect", () => {
				socket.end();
				resolve();
			});
			socket.once("error", retry);
		};
		attempt();
	});
}

function stopProcess(child: ChildProcess) {
	if (!child.pid) return;
	spawn("taskkill", ["/pid", String(child.pid), "/t", "/f"], {
		windowsHide: true,
		stdio: "ignore",
	});
}

const root = installDir();
const nodePath = path.join(root, "node.exe");
const resources = path.join(root, "resources");
const serverJs = path.join(resources, "apps", "web", "server.js");
const logPath = path.join(root, "opencut.log");

if (!existsSync(nodePath) || !existsSync(serverJs)) {
	console.error("OpenCut.exe must stay next to node.exe and the resources folder.");
	process.exit(1);
}

const log = createWriteStream(logPath, { flags: "w" });
const server = spawn(nodePath, [serverJs], {
	cwd: resources,
	windowsHide: true,
	stdio: ["ignore", "pipe", "pipe"],
	env: {
		...process.env,
		NODE_ENV: "production",
		PORT: String(PORT),
		HOSTNAME: HOST,
		DATABASE_URL: "postgresql://opencut:opencut@127.0.0.1:5432/opencut",
		BETTER_AUTH_SECRET: "opencut-desktop",
		UPSTASH_REDIS_REST_URL: "http://127.0.0.1:8079",
		UPSTASH_REDIS_REST_TOKEN: "example_token",
		NEXT_PUBLIC_SITE_URL: `http://${HOST}:${PORT}`,
		NEXT_PUBLIC_MARBLE_API_URL: "https://api.marblecms.com",
		MARBLE_WORKSPACE_KEY: "desktop",
		FREESOUND_CLIENT_ID: "desktop",
		FREESOUND_API_KEY: "desktop",
	},
});

server.stdout?.pipe(log);
server.stderr?.pipe(log);
server.on("exit", (code) => {
	if (code && code !== 0) {
		console.error(`OpenCut server exited with code ${code}. See ${logPath}`);
	}
});

const edge = findEdge();
if (!edge) {
	console.error("Microsoft Edge is required to open the OpenCut window.");
	stopProcess(server);
	process.exit(1);
}

try {
	await waitForPort(120_000);
} catch (error) {
	console.error(error instanceof Error ? error.message : error);
	stopProcess(server);
	process.exit(1);
}

const profile = path.join(
	process.env.LOCALAPPDATA ?? root,
	"OpenCut",
	"webview",
);
mkdirSync(profile, { recursive: true });

const window = spawn(
	edge,
	[
		`--app=http://${HOST}:${PORT}/projects`,
		`--user-data-dir=${profile}`,
		"--no-first-run",
		"--disable-extensions",
		"--new-window",
	],
	{ windowsHide: true, stdio: "ignore" },
);

window.on("exit", () => {
	stopProcess(server);
	process.exit(0);
});
