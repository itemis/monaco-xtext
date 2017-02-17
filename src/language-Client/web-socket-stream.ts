import {PartialMessageInfo, StreamInfo} from "json-rpc"
import {
	WebSocketMessageReader
} from './web-socket-reader';
import {
	WebSocketMessageWriter
} from './web-socket-writer';
import { UIHooks } from '../monaco.contribution';

export {
	WebSocketMessageReader, WebSocketMessageWriter
}

export class WebSocketStream implements StreamInfo {
	writer: any;
	reader: any;

	constructor(private ws: WebSocket, private uiHooks: UIHooks) {
		this.writer = new WebSocketMessageWriter(ws, uiHooks);
		this.reader = new WebSocketMessageReader(ws, uiHooks);
	}

	static getWorkspaceConfig() {
		const CONFIG_KEY = 'monaco.workspace.xtext.langserver';

		let configStr = localStorage.getItem(CONFIG_KEY);
		return JSON.parse(configStr);
	}

	static createUrl() {
		let workspaceConfig = WebSocketStream.getWorkspaceConfig();

		let scheme = `ws`;
		if (workspaceConfig && workspaceConfig.scheme) {
			scheme = workspaceConfig.scheme;
		}

		let host = {
			hostname: 'localhost',
			port: '4389',
		};

		if (workspaceConfig && workspaceConfig.hostname) {
			host.hostname = workspaceConfig.hostname;
		}

		if (workspaceConfig && workspaceConfig.port) {
			host.port = workspaceConfig.port;
		}

		return `${scheme}://${host.hostname}:${host.port}`;
	}

	static create(uiHooks: UIHooks): Promise<StreamInfo> {
		return new Promise((resolve, reject) => {
			let ws: WebSocket;

			try {
				let url = WebSocketStream.createUrl();
				ws = new WebSocket(url);

				ws.onopen = (ev: Event): any => {
					let streamInfo: StreamInfo = new WebSocketStream(ws, uiHooks);
					resolve(streamInfo);
				};
			} catch (err) {
				reject(err);
			}

			ws.onclose = (ev: CloseEvent): any => {
				console.error('WebSocketStream:onclose - CloseEvent: ', ev);
				reject(ev);
			};
			ws.onerror = (ev: ErrorEvent): any => {
				console.error('WebSocketStream:onerror - ErrorEvent: ', ev);
				reject(ev);
			};
			ws.onmessage = (ev: MessageEvent): any => {
				console.info('WebSocketStream:onmessage - MessageEvent: ', ev);
			};
		});
	}
}