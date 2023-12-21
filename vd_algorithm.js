import cytoscape from "./lib/cytoscape.js";

// Graph Initialization
let cy = cytoscape({
	container: document.getElementById("cy"), // container to render in
	style: [
		// the stylesheet for the graph
		{
			selector: "node",
			style: {
				"background-color": "#F0ECE5",
				color: "#161A30",
				shape: "circle",
				label: "data(id)",
				"text-valign": "center",
				"text-halign": "center",
				"font-size": "30%",
				width: 60,
				height: 60,
			},
		},
		{
			selector: "edge",
			style: {
				width: 3,
				"line-color": "#ccc",
				"curve-style": "bezier",
				label: "data(label)",
				"font-size": "25%",
				"text-background-opacity": 1,
				"text-background-color": "#161A30",
				color: "white",
				"text-background-padding": "10px",
			},
		},
	],

	layout: {
		name: "grid",
		rows: 5,
	},
});

// Network
let nodes = ["A", "B", "C", "D", "E", "F", "G"];
let edges = [
	{
		nodes: ["A", "B"],
		cost: 3,
	},
	{
		nodes: ["A", "C"],
		cost: 1,
	},
	{
		nodes: ["A", "D"],
		cost: 2,
	},
	{
		nodes: ["B", "E"],
		cost: 3,
	},
	{
		nodes: ["B", "F"],
		cost: 1,
	},
	{
		nodes: ["C", "G"],
		cost: 2,
	},
	{
		nodes: ["D", "G"],
		cost: 3,
	},
	{
		nodes: ["E", "G"],
		cost: 1,
	},
	{
		nodes: ["F", "G"],
		cost: 2,
	},
];
let tables = [];

// Graph Network
nodes.forEach((node) => {
	cy.add({ data: { id: node } });
});
edges.forEach((edge) => {
	cy.add({
		data: { id: edge.nodes[0] + "-" + edge.nodes[1], source: edge.nodes[0], target: edge.nodes[1], label: edge.cost },
	});
});
cy.layout({
	name: "breadthfirst",
}).run();

// Fills each node table with the nodes and edges
nodes.forEach((node) => {
	tables[node] = {};
	nodes.forEach((innerNode) => {
		tables[node][innerNode] = node === innerNode ? 0 : "∞";
	});
});

edges.forEach((edge) => {
	const [source, target] = edge.nodes;
	tables[source][target] = edge.cost;
	tables[target][source] = edge.cost; // Include this line for bidirectional edges
});

const tablesDiv = document.getElementById("tables");

nodes.forEach((node) => {
	const table = document.createElement("table");
	const headerRow = table.insertRow();
	const headerCell = headerRow.insertCell();
	headerCell.textContent = node;
	headerCell.style.fontWeight = "bold";
	headerCell.style.backgroundColor = "#31304D";
	headerCell.style.color = "#F0ECE5";

	nodes.forEach((innerNode) => {
		const cell = headerRow.insertCell();
		cell.textContent = innerNode;
	});

	nodes.forEach((innerNode) => {
		const row = table.insertRow();
		const cell = row.insertCell();
		cell.textContent = innerNode;

		nodes.forEach((columnNode) => {
			const cost = tables[innerNode][columnNode];
			const cell = row.insertCell();
			cell.textContent = cost;
		});
	});

	tablesDiv.appendChild(table);
});
