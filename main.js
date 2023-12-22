import visual_interface from "./lib/visual_interface.js";

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

// Graphs the network
visual_interface.graph_network(nodes, edges);

// Fills each node table with the nodes and edges
nodes.forEach((node) => {
	let table = [];

	nodes.forEach((innerNode) => {
		table[innerNode] = {};
		nodes.forEach((columnNode) => {
			table[innerNode][columnNode] = innerNode === node && columnNode === node ? 0 : Number.POSITIVE_INFINITY;
		});
	});

	let filteredEdges = edges.filter((edge) => edge.nodes.includes(node));
	filteredEdges.forEach((edge) => {
		const [source, target] = edge.nodes;
		if (source == node) {
			table[source][target] = edge.cost;
		} else {
			table[target][source] = edge.cost; // Include this line for bidirectional edges
		}
	});
	tables.push({ table_node: node, table });
});

// Graphs each node table
visual_interface.graph_tables(tables, nodes);

function deep_copy(object) {
	let copy = Array.isArray(object) ? [] : {};
	for (let key in object) {
		let v = object[key];
		if (v) {
			if (typeof v === "object") {
				copy[key] = deep_copy(v);
			} else {
				copy[key] = v;
			}
		} else {
			copy[key] = v;
		}
	}
	return copy;
}

// Send vector to neighbors
function send_vector_to_neighbors(tables, nodes) {
	nodes.forEach((node) => {
		let table = tables.find((table) => table.table_node === node).table;
		let neighbors = edges.filter((edge) => edge.nodes.includes(node));
		neighbors.forEach((neighbor) => {
			let neighborNode = neighbor.nodes.find((neighborNode) => neighborNode !== node);
			let neighborTable = tables.find((table) => table.table_node === neighborNode).table;
			let vector = table[node];
			neighborTable[node] = deep_copy(vector);
		});
	});
	visual_interface.empty_tables();
	visual_interface.graph_tables(tables, nodes);
}

function bellman_ford_equation(table, node) {
	const targets_nodes = Object.keys(table[node]);
	targets_nodes.forEach((target_node) => {
		if (target_node !== node) {
			// Min of the actual cost to the target node and the cost of the minimum other path cost to the target node
			table[node][target_node] = Math.min(
				// Actual cost to target node
				table[node][target_node],
				// Minimum other path cost to target node
				targets_nodes.reduce((accumulative_min_distance, intermediate_node) => {
					// Minimum distance between the last min distance and the sum of the distance from the node to the
					// intermediate node and the distance from the intermediate node to the target node
					return Math.min(
						accumulative_min_distance,
						table[node][intermediate_node] + table[intermediate_node][target_node],
					);
				}, table[node][target_node]),
			);
		}
	});
}

let flag = 0;
document.getElementById("start_dv_algorithm").addEventListener("click", () => {
	if (flag == 0) {
		send_vector_to_neighbors(tables, nodes);
		document.getElementById("start_dv_algorithm").innerText = "Bellman";
		flag = 1;
	} else {
		nodes.forEach((node) => {
			let table = tables.find((table) => table.table_node === node).table;
			bellman_ford_equation(table, node);
		});
		document.getElementById("start_dv_algorithm").innerText = "Send";
		flag = 0;
	}
	visual_interface.empty_tables();
	visual_interface.graph_tables(tables, nodes);
});
