// Replace with your Sheet ID
const SHEET_ID = "11VnR70r2tmfSrvNuqnnehlz0br7YrPXVGgpMXa5pBdY";
const SHEET_URL = `https://docs.google.com/spreadsheets/d/${SHEET_ID}/gviz/tq?tqx=out:json`;

// Storage for parsed data
let sheetData = [];
let collegeAbbrs = [];

/**
 * Fetch and normalize Google Sheet data
 */
async function fetchSheetData() {
	try {
		const response = await fetch(SHEET_URL);
		const text = await response.text();

		// Google Sheets returns extra chars before JSON, need to slice
		const json = JSON.parse(text.substr(47).slice(0, -2));
		const rows = json.table.rows;

		sheetData = rows
			.map((r, i) => {
				const cells = r.c;

				const college = cells[0]?.v || "";
				const abbreviation = cells[1]?.v || "";
				const event = cells[2]?.v || "";
				const category = cells[3]?.v || "";
				const points = parseInt(cells[4]?.v) || 0;
				const poster = cells[5]?.v || "";

				// Required field validation
				if (!college || !abbreviation || !event || !category) {
					console.error(`Row ${i + 1} is missing required data`, {
						college,
						abbreviation,
						event,
						category,
					});
					return null; // discard this row
				}

				return {
					college,
					abbreviation,
					event,
					category,
					points,
					poster,
				};
			})
			.filter(Boolean); // remove nulls

		// Build unique list of college abbreviations, sorted
		collegeAbbrs = [
			...new Set(sheetData.map((d) => d.abbreviation)),
		].sort();

		// After every fetch, re-render homepage & scoreboard
		renderOverallScores();
		const categorySelect = document.getElementById("category-select");
		if (categorySelect) {
			renderScoreboard(categorySelect.value);
		}
	} catch (err) {
		console.error("Error fetching sheet data:", err);
	}
}

/**
 * Render homepage total scores
 */
function renderOverallScores() {
	const totals = {};
	sheetData.forEach((row) => {
		if (!totals[row.college]) totals[row.college] = 0;
		totals[row.college] += row.points;
	});

	const sorted = Object.entries(totals)
		.map(([college, points]) => ({ college, points }))
		.sort((a, b) => b.points - a.points);

	const tbody = document.querySelector("#overall-table tbody");
	if (!tbody) return;
	tbody.innerHTML = "";

	sorted.forEach((row, index) => {
		const tr = document.createElement("tr");
		tr.classList.add("table-row");
		if (index === 0) tr.classList.add("first-place");
		if (index === 1) tr.classList.add("second-place");
		if (index === 2) tr.classList.add("third-place");

		tr.innerHTML = `
      <td class="cell-college">${row.college}</td>
      <td class="cell-points">${row.points}</td>
    `;
		tbody.appendChild(tr);
	});
}

/**
 * Render table for a given category
 */
function renderScoreboard(category) {
	const table = document.getElementById("category-table");
	if (!table) return;

	const thead = table.querySelector("thead");
	const tbody = table.querySelector("tbody");

	thead.innerHTML = "";
	tbody.innerHTML = "";

	// Header row
	const headerRow = document.createElement("tr");
	const thEvent = document.createElement("th");
	thEvent.classList.add("col-event");
	thEvent.textContent = "Event";
	headerRow.appendChild(thEvent);

	collegeAbbrs.forEach((col) => {
		const th = document.createElement("th");
		th.textContent = col;
		headerRow.appendChild(th);
	});
	thead.appendChild(headerRow);

	// Filter + sort events for category
	const categoryEvents = sheetData
		.filter((d) => d.category === category)
		.map((d) => d.event);

	const uniqueEvents = [...new Set(categoryEvents)].sort();

	// Build rows
	uniqueEvents.forEach((eventName) => {
		const row = document.createElement("tr");

		const tdEvent = document.createElement("td");
		tdEvent.classList.add("col-event");
		tdEvent.textContent = eventName;
		row.appendChild(tdEvent);

		collegeAbbrs.forEach((col) => {
			const cell = document.createElement("td");
			const entry = sheetData.find(
				(d) =>
					d.abbreviation === col &&
					d.category === category &&
					d.event === eventName
			);
			cell.textContent = entry ? entry.points : 0;
			row.appendChild(cell);
		});

		tbody.appendChild(row);
	});
}

function getDirectDriveLink(url) {
	if (!url) return "";

	let fileId = null;

	// Matches /file/d/FILE_ID/ or /d/FILE_ID/
	let match = url.match(/\/d\/([a-zA-Z0-9_-]+)(\/|$)/);
	if (match && match[1]) fileId = match[1];

	// Matches thumbnail format: ?id=FILE_ID
	if (!fileId) {
		match = url.match(/[?&]id=([a-zA-Z0-9_-]+)/);
		if (match && match[1]) fileId = match[1];
	}

	if (fileId) {
		// Return the thumbnail format recommended by StackOverflow
		return `https://drive.google.com/thumbnail?id=${fileId}&sz=w1000`;
	}

	return url; // fallback to original
}

/**
 * Render Gallery (just posters stacked vertically)
 */
function renderGallery() {
	const galleryContainer = document.getElementById("gallery-container");
	if (!galleryContainer) return;

	galleryContainer.innerHTML = ""; // clear old content

	// Filter only rows that have poster links
	const posters = sheetData.filter(
		(row) => row.poster && row.poster.trim() !== ""
	);

	if (posters.length === 0) {
		galleryContainer.innerHTML = "<p>No posters uploaded yet.</p>";
		return;
	}

	posters.forEach((row) => {
		const img = document.createElement("img");
		img.src = getDirectDriveLink(row.poster); // convert Drive links
		img.alt = "Poster";
		img.classList.add("gallery-img");
		galleryContainer.appendChild(img);
	});
}

/**
 * Initialize dropdown, tabs, and polling
 */
async function initApp() {
	await fetchSheetData();

	// Update every 5 seconds
	setInterval(fetchSheetData, 60 * 1000);

	// Category dropdown logic
	const categorySelect = document.getElementById("category-select");
	if (categorySelect) {
		categorySelect.addEventListener("change", (e) => {
			renderScoreboard(e.target.value);
		});
	}

	// Tab switching logic
	document.querySelectorAll(".nav-btn").forEach((btn) => {
		btn.addEventListener("click", () => {
			document
				.querySelectorAll(".nav-btn")
				.forEach((b) => b.classList.remove("active"));
			btn.classList.add("active");

			document
				.querySelectorAll(".tab")
				.forEach((tab) => tab.classList.remove("active"));
			const target = document.getElementById(btn.dataset.tab);
			if (target) target.classList.add("active");

			// Re-render relevant tab when switched
			if (btn.dataset.tab === "home") renderOverallScores();
			if (btn.dataset.tab === "scoreboard")
				renderScoreboard(categorySelect.value);
			if (btn.dataset.tab === "gallery") renderGallery();
		});
	});
}

// Splash screen logic
window.addEventListener("load", () => {
	const splash = document.getElementById("splash-screen");
	setTimeout(() => {
		splash.classList.add("fade-out");
		setTimeout(() => (splash.style.display = "none"), 500);
	}, 1000);

	// Start app after splash
	initApp();
});
