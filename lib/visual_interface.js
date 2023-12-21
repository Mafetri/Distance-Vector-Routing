import cytoscape from "./cytoscape.js";

const visual_interface = {};

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

// Graph the graph
visual_interface.graph_network = (nodes, edges) => {
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
};

visual_interface.graph_tables = (tables, nodes) => {
	// Shows each node table
	const tablesDiv = document.getElementById("tables");
	tables.forEach((table) => {
		const table_node = table.table_node;
		const table_data = table.table;

		const table_element = document.createElement("table");
		table_element.id = table_node + "_table";
		const header_row = table_element.insertRow();
		const header_cell = header_row.insertCell();
		header_cell.textContent = table_node;
		header_cell.style.fontWeight = "bold";
		header_cell.style.backgroundColor = "#31304D";
		header_cell.style.color = "#F0ECE5";

		nodes.forEach((innerNode) => {
			const cell = header_row.insertCell();
			cell.textContent = innerNode;
		});

		nodes.forEach((innerNode) => {
			const row = table_element.insertRow();
			row.id = table_node + "_" + innerNode + "_row";
			const cell = row.insertCell();
			if (innerNode == table_node) {
				row.style.backgroundColor = "#31304D";
				row.style.color = "#F0ECE5";
			}
			cell.textContent = innerNode;

			nodes.forEach((columnNode) => {
				const cost = table_data[innerNode][columnNode];
				const cell = row.insertCell();
				cell.textContent = cost;
			});
		});

		tablesDiv.appendChild(table_element);
	});
};

export default visual_interface;
