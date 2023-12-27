import cytoscape from "./cytoscape.js";

const visual_interface = {};

const white = "#F0ECE5";
const dark = "#161A30";
const gray = "#b6bbc4";
const green = "#53b84b";
const red = "#9F1D1D";

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
				label: "data(id)",
				"text-valign": "center",
				"text-halign": "center",
				"font-size": "30%",
				width: 60,
				height: 60,
				borderWidth: "5px",
				borderColor: "orange",
				borderOpacity: 0,
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

visual_interface.graph_tables = (tables, nodes, routing_tables) => {
	// Shows each node table
	const tablesDiv = document.getElementById("tables");
	
	nodes.forEach((node) => {
		const node_div = document.createElement("div");
		node_div.className = "node_div";
		node_div.id = node + "_div";
		const title = document.createElement("h2");
		title.className = "node_title";
		title.textContent = 'Node: ' + node;
		node_div.appendChild(title);
		
		const node_tables = document.createElement("div");
		node_tables.className = "node_tables"
		node_tables.id = node + "_div_tables";
		node_div.appendChild(node_tables);

		tablesDiv.appendChild(node_div);
	})

	// Vectors Tables
	tables.forEach((table) => {
		const table_node = table.table_node;
		const table_data = table.table;
		const node_tables = document.getElementById(table_node + "_div_tables");

		const table_element = document.createElement("table");
		table_element.id = table_node + "_table";
		table_element.className = "vectors_table";
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
		node_tables.appendChild(table_element);
	});

	// Routing Tables
	routing_tables.forEach((routing_table) => {
        const table_node = routing_table.table_node;
        const node_tables = document.getElementById(table_node + "_div_tables");

        // Best Link
        const best_link = document.createElement("table");
		best_link.id = table_node + "_routing_table";
		best_link.className = "routing_table";
        const tbody = best_link.createTBody();

        Object.keys(routing_table.routing_table).forEach(col => {
            const row = tbody.insertRow();
            const th = document.createElement('th');
            th.textContent = col;
            row.appendChild(th);

            const td = document.createElement('td');
            const value = routing_table.routing_table[col];
            td.textContent = value;
            row.appendChild(td);
        });

        node_tables.appendChild(best_link);
    });
};

visual_interface.update_routing_table = (node, table) => {
	const routing_table = document.getElementById(node + "_routing_table");

	if (routing_table) {
		const rows = routing_table.querySelectorAll("tbody tr");

		// Iterate through the rows and update the second cell of each row
		rows.forEach(row => {
			const nodeName = row.querySelector("th").textContent; // Get the node name from the first cell
			const intermediateNodeValue = table[nodeName]; // Get the corresponding value from the object
			const td = row.querySelector("td:nth-child(2)");
			if (td.textContent !== intermediateNodeValue){
				td.textContent = intermediateNodeValue; // Set the value in the second cell
				const background_color = td.style.backgroundColor
				const text_color = td.style.color
				td.style.color = white;
				td.style.backgroundColor = green;
				setTimeout(() => {
					td.style.backgroundColor = background_color;
					td.style.color = text_color;
				}, 1000);
			}
		});
	}
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
			tds[index + 1].textContent = vector[key] === Number.POSITIVE_INFINITY ? "∞" : vector[key];
		});
	}
};

visual_interface.empty_tables = () => {
	const tablesDiv = document.getElementById("tables");
	while (tablesDiv.firstChild) {
		tablesDiv.removeChild(tablesDiv.firstChild);
	}
};

visual_interface.edge_send = (from, to) => {
	cy.$("#" + from).style("background-color", green);
	cy.$("#" + from).style("color", white);
	cy.$("#" + from + "-" + to).style("line-color", green);
	cy.$("#" + to + "-" + from).style("line-color", green);
	setTimeout(() => {
		cy.$("#" + from).style("background-color", white);
		cy.$("#" + from).style("color", dark);
		cy.$("#" + from + "-" + to).style("line-color", white);
		cy.$("#" + to + "-" + from).style("line-color", white);
	}, 800);
};

visual_interface.focus_table = (node) => {
	document.querySelectorAll(".node_div").forEach((table) => {
		table.style.border = "0";
		table.style.padding = "10px";
	});
	cy.nodes().forEach((node) => node.style("borderOpacity", 0));

	const table = document.getElementById(node + "_div");
	if (table) {
		table.style.border = "5px solid orange";
		table.style.padding = "5px";
	}

	cy.$("#" + node).style("borderOpacity", 1);
};

export default visual_interface;
