import { execFileSync, spawn, type ChildProcess } from "node:child_process";
import { createWriteStream, existsSync, mkdirSync } from "node:fs";
import { createConnection } from "node:net";
import path from "node:path";

const HOST = "127.0.0.1";
const PORT = 4173;
const APP_NAME = "opencut-classic.exe";

type Browser = {
	name: string;
	executable: string;
};

function installDir(): string {
	return path.dirname(process.execPath);
}

function programRoots(): string[] {
	return [
		process.env.PROGRAMFILES,
		process.env["PROGRAMFILES(X86)"],
		process.env.LOCALAPPDATA,
	].filter((value): value is string => Boolean(value));
}

function firstExisting(candidates: string[]): string | null {
	for (const candidate of candidates) {
		if (existsSync(candidate)) return candidate;
	}
	return null;
}

function fromPath(command: string): string | null {
	try {
		const output = execFileSync("where.exe", [command], {
			encoding: "utf8",
			windowsHide: true,
			stdio: ["ignore", "pipe", "ignore"],
		});
		const found = output
			.split(/\r?\n/)
			.map((line) => line.trim())
			.find((line) => line.length > 0 && existsSync(line));
		return found ?? null;
	} catch {
		return null;
	}
}

function findBrowser(): Browser | null {
	const roots = programRoots();
	const browsers = [
		{
			name: "Google Chrome",
			relative: ["Google", "Chrome", "Application", "chrome.exe"],
			commands: ["chrome.exe", "chrome"],
		},
		{
			name: "Brave",
			relative: ["BraveSoftware", "Brave-Browser", "Application", "brave.exe"],
			commands: ["brave.exe", "brave"],
		},
		{
			name: "Chromium",
			relative: ["Chromium", "Application", "chrome.exe"],
			commands: ["chromium.exe", "chromium"],
		},
		{
			name: "Microsoft Edge",
			relative: ["Microsoft", "Edge", "Application", "msedge.exe"],
			commands: ["msedge.exe", "msedge"],
		},
	];

	for (const browser of browsers) {
		const installed = firstExisting(
			roots.map((root) => path.join(root, ...browser.relative)),
		);
		if (installed) return { name: browser.name, executable: installed };
		for (const command of browser.commands) {
			const onPath = fromPath(command);
			if (onPath) return { name: browser.name, executable: onPath };
		}
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
							`${APP_NAME} did not start. See opencut-classic.log next to the program.`,
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
const logPath = path.join(root, "opencut-classic.log");

if (!existsSync(nodePath) || !existsSync(serverJs)) {
	console.error(
		`${APP_NAME} must stay next to node.exe and the resources folder.`,
	);
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
		console.error(`The editor server exited with code ${code}. See ${logPath}`);
	}
});

const browser = findBrowser();
if (!browser) {
	console.error(
		"Install Chrome, Brave, Chromium, or Edge to open opencut-classic.",
	);
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
	"opencut-classic",
	"webview",
	path.basename(browser.executable, ".exe"),
);
mkdirSync(profile, { recursive: true });

const window = spawn(
	browser.executable,
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
