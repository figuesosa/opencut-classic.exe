const { app, BrowserWindow, dialog } = require("electron");
const { spawn } = require("node:child_process");
const { createWriteStream } = require("node:fs");
const { createConnection } = require("node:net");
const path = require("node:path");

const HOST = "127.0.0.1";
const PORT = 4173;

let server;

function editorRoot() {
	return path.join(process.resourcesPath, "editor");
}

function waitForPort(timeoutMs) {
	const started = Date.now();
	return new Promise((resolve, reject) => {
		const attempt = () => {
			const socket = createConnection({ host: HOST, port: PORT });
			const retry = () => {
				socket.destroy();
				if (Date.now() - started > timeoutMs) {
					reject(new Error("The editor server did not start."));
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

function stopServer() {
	if (!server?.pid) return;
	spawn("taskkill", ["/pid", String(server.pid), "/t", "/f"], {
		windowsHide: true,
		stdio: "ignore",
	});
	server = undefined;
}

function startServer() {
	const root = editorRoot();
	const serverJs = path.join(root, "apps", "web", "server.js");
	const log = createWriteStream(
		path.join(app.getPath("userData"), "opencut-classic.log"),
		{ flags: "w" },
	);
	server = spawn(process.execPath, [serverJs], {
		cwd: root,
		windowsHide: true,
		stdio: ["ignore", "pipe", "pipe"],
		env: {
			...process.env,
			ELECTRON_RUN_AS_NODE: "1",
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
}

function createWindow() {
	const window = new BrowserWindow({
		width: 1440,
		height: 900,
		minWidth: 960,
		minHeight: 600,
		title: "opencut-classic",
		backgroundColor: "#0f0f0f",
		autoHideMenuBar: true,
		webPreferences: {
			nodeIntegration: false,
			contextIsolation: true,
			sandbox: true,
			backgroundThrottling: false,
		},
	});
	window.removeMenu();
	window.loadURL(`http://${HOST}:${PORT}/projects`);
}

app.whenReady().then(async () => {
	try {
		startServer();
		await waitForPort(120_000);
		createWindow();
	} catch (error) {
		dialog.showErrorBox(
			"opencut-classic",
			error instanceof Error ? error.message : String(error),
		);
		stopServer();
		app.quit();
	}
});

app.on("before-quit", stopServer);
app.on("window-all-closed", () => {
	stopServer();
	app.quit();
});
