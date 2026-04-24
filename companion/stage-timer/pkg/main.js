const {
	InstanceBase,
	Regex,
	runEntrypoint,
	InstanceStatus,
	combineRgb,
} = require("@companion-module/base");

class StageTimerInstance extends InstanceBase {
	async init(config) {
		this.config = config;
		this.updateStatus(InstanceStatus.Connecting);

		this.state = {
			time: "10:00",
			running: false,
			msg_active: false,
			raw_seconds: 600,
			over_time: "",
			mode: "countdown",
			blink_state: false,
			messages: [],
		};

		this.initActions();
		this.initVariables();
		this.initFeedbacks();
		this.initPresets();

		if (this.config.host) {
			this.startPolling();
		} else {
			this.updateStatus(InstanceStatus.BadConfig, "Missing IP Address");
		}
	}

	async destroy() {
		if (this.pollTimer) clearInterval(this.pollTimer);
	}

	async configUpdated(config) {
		this.config = config;
		if (this.config.host) this.startPolling();
	}

	getConfigFields() {
		return [
			{
				type: "textinput",
				id: "host",
				label: "Raspberry Pi IP Address",
				width: 8,
				regex: Regex.IP,
			},
		];
	}

	startPolling() {
		if (this.pollTimer) clearInterval(this.pollTimer);

		this.pollTimer = setInterval(async () => {
			try {
				const response = await fetch(
					`http://${this.config.host}:3000/api/companion`,
				);
				if (response.ok) {
					this.updateStatus(InstanceStatus.Ok);
					const data = await response.json();
					this.state = data;

					// Push core variables
					let updates = {
						time: data.time,
						raw_seconds: data.raw_seconds,
						over_time: data.over_time,
						mode: data.mode,
					};

					// Push dynamic message slots (1 through 10)
					for (let i = 0; i < 10; i++) {
						updates[`msg_${i + 1}`] =
							data.messages && data.messages[i]
								? data.messages[i]
								: "(Empty Slot)";
					}

					this.setVariableValues(updates);
					this.checkFeedbacks("timer_state", "msg_state");
				}
			} catch (e) {
				this.updateStatus(
					InstanceStatus.ConnectionFailure,
					"Cannot connect to Pi",
				);
			}
		}, 300);
	}

	initVariables() {
		const vars = [
			{ name: "Current Time (String)", variableId: "time" },
			{ name: "Raw Time in Seconds", variableId: "raw_seconds" },
			{ name: "Over Time (+MM:SS)", variableId: "over_time" },
			{ name: "Current Mode", variableId: "mode" },
		];

		// Define 10 dynamic slots for message bank
		for (let i = 1; i <= 10; i++) {
			vars.push({ name: `Custom Message Slot ${i}`, variableId: `msg_${i}` });
		}

		this.setVariableDefinitions(vars);
	}

	initFeedbacks() {
		this.setFeedbackDefinitions({
			timer_state: {
				name: "Auto-Color Timer Button",
				type: "advanced",
				label: "Timer State Colors",
				options: [],
				callback: () => {
					if (this.state.mode !== "countdown") return {};
					if (!this.state.running && this.state.raw_seconds > 0) return {};

					if (this.state.raw_seconds <= 0) {
						return this.state.blink_state
							? { bgcolor: combineRgb(0, 0, 0), color: combineRgb(255, 0, 0) }
							: {
									bgcolor: combineRgb(255, 0, 0),
									color: combineRgb(255, 255, 255),
							  };
					}
					if (this.state.raw_seconds <= 120)
						return {
							bgcolor: combineRgb(255, 165, 0),
							color: combineRgb(0, 0, 0),
						};
					return {
						bgcolor: combineRgb(0, 150, 0),
						color: combineRgb(255, 255, 255),
					};
				},
			},
			msg_state: {
				name: "Message Active Background",
				type: "boolean",
				label: "Message is active on screen",
				defaultStyle: {
					bgcolor: combineRgb(0, 150, 0),
					color: combineRgb(255, 255, 255),
				},
				options: [],
				callback: () => {
					return this.state.msg_active;
				},
			},
		});
	}

	initActions() {
		const sendCmd = async (cmd) => {
			if (!this.config.host) return;
			try {
				await fetch(`http://${this.config.host}:3000/api/${cmd}`);
			} catch (e) {}
		};

		this.setActionDefinitions({
			toggle_playback: {
				name: "Toggle Start / Pause",
				options: [],
				callback: async () => {
					await sendCmd("toggle_playback");
				},
			},
			start: {
				name: "Start Timer",
				options: [],
				callback: async () => {
					await sendCmd("start");
				},
			},
			pause: {
				name: "Pause Timer",
				options: [],
				callback: async () => {
					await sendCmd("pause");
				},
			},
			toggle_msg: {
				name: "Toggle Message On/Off",
				options: [],
				callback: async () => {
					await sendCmd("message/toggle");
				},
			},

			// New Action for Instant Triggering
			trigger_msg: {
				name: "Trigger Instant Message by Slot Number",
				options: [
					{
						type: "number",
						label: "Slot Number (1-10)",
						id: "slot",
						default: 1,
						min: 1,
						max: 10,
						required: true,
					},
				],
				callback: async (action) => {
					await sendCmd(`message/trigger?index=${action.options.slot - 1}`);
				},
			},

			reset: {
				name: "Reset Timer",
				options: [
					{
						type: "number",
						label: "Seconds (e.g. 600 for 10m)",
						id: "sec",
						default: 600,
						required: true,
					},
				],
				callback: async (action) => {
					await sendCmd(`reset?sec=${action.options.sec}`);
				},
			},
			reset_last: {
				name: "Reset to Last Set Time",
				options: [],
				callback: async () => {
					await sendCmd("reset");
				},
			},
			add: {
				name: "Add/Subtract Time",
				options: [
					{
						type: "number",
						label: "Seconds to add (-60 to subtract)",
						id: "sec",
						default: 60,
						required: true,
					},
				],
				callback: async (action) => {
					await sendCmd(`add?sec=${action.options.sec}`);
				},
			},
			set_mode: {
				name: "Set Display Mode",
				options: [
					{
						type: "dropdown",
						label: "Mode",
						id: "mode",
						default: "countdown",
						choices: [
							{ id: "countdown", label: "Countdown" },
							{ id: "countup", label: "Count-Up" },
							{ id: "timeofday", label: "Time of Day" },
							{ id: "logo", label: "Idle / Logo" },
						],
					},
				],
				callback: async (action) => {
					await sendCmd(`mode?set=${action.options.mode}`);
				},
			},
		});
	}

	initPresets() {
		const presets = {};

		// --- Smart Controls ---
		presets["smart_timer"] = {
			type: "button",
			category: "Smart Controls",
			name: "Smart Timer Button",
			style: {
				text: "⏯\\n$(stagetimer:time)",
				size: "auto",
				color: combineRgb(255, 255, 255),
				bgcolor: combineRgb(0, 0, 0),
				show_topbar: false,
			},
			steps: [{ down: [{ actionId: "toggle_playback", options: {} }], up: [] }],
			feedbacks: [{ feedbackId: "timer_state", options: {} }],
		};

		presets["smart_message"] = {
			type: "button",
			category: "Smart Controls",
			name: "Toggle Message",
			style: {
				text: "💬\\nMSG",
				size: "auto",
				color: combineRgb(255, 255, 255),
				bgcolor: combineRgb(0, 0, 0),
				show_topbar: false,
			},
			steps: [{ down: [{ actionId: "toggle_msg", options: {} }], up: [] }],
			feedbacks: [{ feedbackId: "msg_state", options: {} }],
		};

		presets["reset_last"] = {
			type: "button",
			category: "Smart Controls",
			name: "Reset to Last Time",
			style: {
				text: "🔁",
				size: "auto",
				color: combineRgb(255, 255, 255),
				bgcolor: combineRgb(150, 0, 0),
				show_topbar: false,
			},
			steps: [{ down: [{ actionId: "reset_last", options: {} }], up: [] }],
			feedbacks: [],
		};

		// --- Dynamic Message Triggers ---
		for (let i = 1; i <= 8; i++) {
			presets[`trigger_msg_${i}`] = {
				type: "button",
				category: "Live Messages Bank",
				name: `Trigger Slot ${i}`,
				style: {
					text: `[${i}]\\n$(stagetimer:msg_${i})`,
					size: "14",
					color: combineRgb(255, 255, 255),
					bgcolor: combineRgb(30, 60, 120),
					show_topbar: false,
				},
				steps: [
					{ down: [{ actionId: "trigger_msg", options: { slot: i } }], up: [] },
				],
				feedbacks: [],
			};
		}

		// --- Display Modes ---
		const modes = [
			{ id: "countdown", label: "Countdown" },
			{ id: "countup", label: "Count-Up" },
			{ id: "timeofday", label: "Time of Day" },
			{ id: "logo", label: "Idle / Logo" },
		];
		modes.forEach((mode) => {
			presets[`mode_${mode.id}`] = {
				type: "button",
				category: "Display Modes",
				name: mode.label,
				style: {
					text: `📺\\n${mode.label}`,
					size: "14",
					color: combineRgb(255, 255, 255),
					bgcolor: combineRgb(100, 50, 150),
					show_topbar: false,
				},
				steps: [
					{
						down: [{ actionId: "set_mode", options: { mode: mode.id } }],
						up: [],
					},
				],
				feedbacks: [],
			};
		});

		// --- Quick Times ---
		const quickTimes = [
			{ label: "1m", sec: 60 },
			{ label: "5m", sec: 300 },
			{ label: "10m", sec: 600 },
			{ label: "15m", sec: 900 },
			{ label: "30m", sec: 1800 },
			{ label: "60m", sec: 3600 },
		];

		quickTimes.forEach((t) => {
			presets[`reset_${t.sec}`] = {
				type: "button",
				category: "Quick Times",
				name: `Reset to ${t.label}`,
				style: {
					text: `🔄\\n${t.label}`,
					size: "auto",
					color: combineRgb(255, 255, 255),
					bgcolor: combineRgb(20, 20, 80),
					show_topbar: false,
				},
				steps: [
					{ down: [{ actionId: "reset", options: { sec: t.sec } }], up: [] },
				],
				feedbacks: [],
			};
		});

		// --- Manual Transport ---
		presets["add_min"] = {
			type: "button",
			category: "Manual Adjustments",
			name: "+1 Minute",
			style: {
				text: "➕\\n+1m",
				size: "auto",
				color: combineRgb(255, 255, 255),
				bgcolor: combineRgb(40, 40, 40),
				show_topbar: false,
			},
			steps: [{ down: [{ actionId: "add", options: { sec: 60 } }], up: [] }],
			feedbacks: [],
		};

		presets["sub_min"] = {
			type: "button",
			category: "Manual Adjustments",
			name: "-1 Minute",
			style: {
				text: "➖\\n-1m",
				size: "auto",
				color: combineRgb(255, 255, 255),
				bgcolor: combineRgb(40, 40, 40),
				show_topbar: false,
			},
			steps: [{ down: [{ actionId: "add", options: { sec: -60 } }], up: [] }],
			feedbacks: [],
		};

		this.setPresetDefinitions(presets);
	}
}

runEntrypoint(StageTimerInstance, []);
