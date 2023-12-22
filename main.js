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
		table[innerNode] = [];
		nodes.forEach((columnNode) => {
			table[innerNode][columnNode] = innerNode === node && columnNode === node ? 0 : "∞";
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

// Send vector to neighbors
function send_vector_to_neighbors(tables, nodes) {
	nodes.forEach((node) => {
		let table = tables.find((table) => table.table_node === node).table;
		let neighbors = edges.filter((edge) => edge.nodes.includes(node));
		neighbors.forEach((neighbor) => {
			let neighborNode = neighbor.nodes.find((neighborNode) => neighborNode !== node);
			let neighborTable = tables.find((table) => table.table_node === neighborNode).table;
			let vector = table[node];
			neighborTable[node] = vector;
		});
		bellman_ford_equation(table, node);
	});
	visual_interface.empty_tables();
	visual_interface.graph_tables(tables, nodes);
}

function bellman_ford_equation (table, node) {
	console.log(table);
}

// console.log(tables);
document.getElementById("start_dv_algorithm").addEventListener("click", () => {
	send_vector_to_neighbors(tables, nodes);
	document.getElementById("start_dv_algorithm").innerText = "Next";
});