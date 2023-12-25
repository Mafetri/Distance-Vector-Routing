import cytoscape from "./cytoscape.js";

const visual_interface = {};

const white = "#F0ECE5";
const dark = "#161A30";
const gray = "#b6bbc4";
const green = "#186312";

// Graph Initialization
let cy = cytoscape({
	container: document.getElementById("cy"), // container to render in
	style: [
		// the stylesheet for the graph
		{
			selector: "node",
			style: {
				"background-color": white,
				color: dark,
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
				"text-background-color": dark,
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
			row.id = "table_" + table_node + "_row_" + innerNode;
			const cell = row.insertCell();
			if (innerNode == table_node) {
				row.style.backgroundColor = "#31304D";
				row.style.color = "#F0ECE5";
			}
			cell.textContent = innerNode;

			nodes.forEach((columnNode) => {
				const cost =
					table_data[innerNode][columnNode] === Number.POSITIVE_INFINITY ? "∞" : table_data[innerNode][columnNode];
				const cell = row.insertCell();
				cell.textContent = cost;
			});
		});

		tablesDiv.appendChild(table_element);
	});
};

visual_interface.update_vector = (node_table, node_row, vector) => {
	const row = document.getElementById(`table_${node_table}_row_${node_row}`);

	if (row) {
		// Ensure data vector length matches number of existing td elements
		const tds = row.querySelectorAll("td");
		if (Object.keys(vector).length !== tds.length - 1) {
			return;
		}

		const background_color = row.style.backgroundColor;
		const text_color = row.style.color;
		row.style.color = white;
		row.style.backgroundColor = green;
		setTimeout(() => {
			row.style.backgroundColor = background_color;
			row.style.color = text_color;
		}, 1000);

		// Replace content of each td with corresponding data
		Object.keys(vector).forEach((key, index) => {
			tds[index+1].textContent = vector[key] === Number.POSITIVE_INFINITY ? "∞" : vector[key];
		});		
	}
};

visual_interface.empty_tables = () => {
	const tablesDiv = document.getElementById("tables");
	while (tablesDiv.firstChild) {
		tablesDiv.removeChild(tablesDiv.firstChild);
	}
};

visual_interface.edge_color = (node1, node2, base_color) => {
	if (base_color) {
		cy.$("#" + node1 + "-" + node2).animate({
			style: {
				lineColor: white,
			},
		});
	} else {
		cy.$("#" + node1 + "-" + node2).animate({
			style: {
				lineColor: green,
			},
		});
	}
};

export default visual_interface;
