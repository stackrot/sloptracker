(() => {
	const stackAddr = document.querySelector("#stack-addr");
	const phosphorStatus = document.querySelector("#phosphor-status");
	const phosphorControl = document.querySelector("#cycle-phosphor");
	const phosphors = ["amber", "green", "white"];
	const months = ["jan", "feb", "mar", "apr", "may", "jun", "jul", "aug",
		"sep", "oct", "nov", "dec"];
	let phosphorTimer;

	const setPhosphor = (phosphor, announce = false) => {
		document.documentElement.dataset.phosphor =
			phosphor === "amber" ? "" : phosphor;
		if (phosphorControl) {
			phosphorControl.textContent = `↳ phosphor: ${phosphor}`;
			phosphorControl.setAttribute("aria-label",
				`Colour palette: ${phosphor}. Activate to change palette.`);
		}
		const colours = { amber: "#080806", green: "#060a06", white: "#090909" };
		document.querySelector('meta[name="theme-color"]')
			?.setAttribute("content", colours[phosphor]);

		if (announce && phosphorStatus) {
			phosphorStatus.textContent = `phosphor: ${phosphor}`;
			window.clearTimeout(phosphorTimer);
			phosphorTimer = window.setTimeout(() => {
				phosphorStatus.textContent = "";
			}, 1800);
		}
	};

	let phosphor = "amber";
	try {
		const saved = localStorage.getItem("phosphor");
		if (saved && phosphors.includes(saved))
			phosphor = saved;
	} catch {}
	setPhosphor(phosphor);

	if (phosphorControl) {
		phosphorControl.hidden = false;
		phosphorControl.addEventListener("click", () => {
			const next = (phosphors.indexOf(phosphor) + 1) % phosphors.length;
			phosphor = phosphors[next];
			setPhosphor(phosphor, true);
			try {
				localStorage.setItem("phosphor", phosphor);
			} catch {}
		});
	}

	// The server renders UTC; show the reader's own clock instead.
	for (const time of document.querySelectorAll("time[data-local]")) {
		const date = new Date(time.dateTime);
		if (Number.isNaN(date.getTime()))
			continue;
		const clock = [date.getHours(), date.getMinutes()]
			.map((value) => String(value).padStart(2, "0"))
			.join(":");
		time.textContent =
			`${date.getDate()} ${months[date.getMonth()]} ${clock}`;
	}

	if (stackAddr) {
		const random = new Uint32Array(1);
		crypto.getRandomValues(random);
		const high = 0x7ffd + (random[0] % 3);
		stackAddr.textContent =
			`0x${high.toString(16)}${random[0].toString(16).padStart(8, "0")}`;
	}
})();
